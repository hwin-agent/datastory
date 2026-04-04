"""FastAPI server for DataStory backend."""
from __future__ import annotations

import os
import sys
import uuid
import tempfile
import time
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse

# Add backend dir to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from models import Session, sessions
from agent.orchestrator import run_exploration

app = FastAPI(title="DataStory API", version="1.0.0")

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB
MAX_SESSIONS = 50  # Cap in-memory sessions

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

CHARTS_DIR = os.path.join(os.path.dirname(__file__), "charts")
UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "datastory_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHARTS_DIR, exist_ok=True)


DEMO_CSV = os.path.join(os.path.dirname(__file__), "..", "demo", "citybike_sample.csv")


def _cleanup_sessions():
    """Evict oldest sessions when at capacity."""
    if len(sessions) >= MAX_SESSIONS:
        oldest = sorted(sessions.values(), key=lambda s: s.created_at)
        for s in oldest[: len(sessions) - MAX_SESSIONS + 1]:
            # Remove uploaded CSV
            if s.csv_path and os.path.exists(s.csv_path):
                try:
                    os.remove(s.csv_path)
                except OSError:
                    pass
            sessions.pop(s.id, None)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "datastory"}


@app.post("/api/upload-demo")
async def upload_demo():
    """Use the built-in demo dataset."""
    import pandas as pd
    import shutil

    if not os.path.exists(DEMO_CSV):
        raise HTTPException(404, "Demo dataset not found")

    session_id = str(uuid.uuid4())
    filepath = os.path.join(UPLOAD_DIR, f"{session_id}.csv")
    shutil.copy2(DEMO_CSV, filepath)

    df = pd.read_csv(filepath, nrows=5)
    rows_count = sum(1 for _ in open(filepath)) - 1
    cols = list(df.columns)

    session = Session(
        id=session_id,
        csv_path=filepath,
        filename="citybike_sample.csv",
    )
    sessions[session_id] = session

    return {
        "session_id": session_id,
        "filename": "citybike_sample.csv",
        "rows": rows_count,
        "columns": len(cols),
        "column_names": cols,
    }


@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    """Accept a CSV upload, create a session, return session info."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are accepted")

    session_id = str(uuid.uuid4())
    filepath = os.path.join(UPLOAD_DIR, f"{session_id}.csv")

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(413, "File too large (max 50 MB)")
    with open(filepath, "wb") as f:
        f.write(content)

    # Evict oldest sessions if at capacity
    _cleanup_sessions()

    # Quick peek at the file
    import pandas as pd
    try:
        df = pd.read_csv(filepath, nrows=5)
        rows_count = sum(1 for _ in open(filepath)) - 1  # minus header
        cols = list(df.columns)
    except Exception as e:
        raise HTTPException(400, f"Failed to parse CSV: {str(e)}")

    session = Session(
        id=session_id,
        csv_path=filepath,
        filename=file.filename,
    )
    sessions[session_id] = session

    return {
        "session_id": session_id,
        "filename": file.filename,
        "rows": rows_count,
        "columns": len(cols),
        "column_names": cols,
    }


@app.get("/api/explore/{session_id}")
async def explore(session_id: str):
    """SSE endpoint: run the agent exploration loop and stream events."""
    if session_id not in sessions:
        raise HTTPException(404, "Session not found")

    session = sessions[session_id]

    async def event_stream():
        async for event in run_exploration(session):
            yield event

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/report/{session_id}")
async def get_report(session_id: str):
    """Return the generated report as JSON."""
    if session_id not in sessions:
        raise HTTPException(404, "Session not found")

    session = sessions[session_id]
    if session.report is None:
        raise HTTPException(404, "Report not yet generated")

    report = session.report
    findings = []
    for f in session.findings:
        findings.append({
            "id": f.id,
            "hypothesis": f.hypothesis,
            "test_type": f.test_type,
            "p_value": f.p_value,
            "effect_summary": f.effect_summary,
            "insight": f.insight,
            "chart_url": f"/api/charts/{session_id}/{f.chart_path}" if f.chart_path else None,
            "is_deep_dive": f.is_deep_dive,
        })

    return {
        "title": report.title,
        "executive_summary": report.executive_summary,
        "sections": [
            {"heading": s.heading, "body": s.body, "chart_id": s.chart_id}
            for s in report.sections
        ],
        "methodology": report.methodology,
        "recommendations": report.recommendations,
        "findings": findings,
        "profile": {
            "rows": session.profile.rows if session.profile else 0,
            "columns": session.profile.columns if session.profile else 0,
        },
    }


@app.get("/api/charts/{session_id}/{chart_filename}")
async def get_chart(session_id: str, chart_filename: str):
    """Serve a generated chart image."""
    # Security: ensure filename doesn't have path traversal
    if ".." in chart_filename or "/" in chart_filename:
        raise HTTPException(400, "Invalid chart filename")

    filepath = os.path.join(CHARTS_DIR, chart_filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Chart not found")

    return FileResponse(filepath, media_type="image/png")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
