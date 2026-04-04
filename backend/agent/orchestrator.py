"""Main agent orchestrator: coordinates the explore→hypothesize→test→dive→narrate cycle."""
from __future__ import annotations

import asyncio
import json
import traceback
from typing import AsyncGenerator

import pandas as pd

from models import Session, Finding
from agent.profiler import profile_dataframe, profile_to_text
from agent.hypothesis import generate_hypotheses
from agent.tester import test_hypothesis
from agent.visualizer import generate_chart
from agent.deep_dive import select_deep_dive, execute_deep_dive
from agent.narrator import generate_report
from llm import chat


async def run_exploration(session: Session) -> AsyncGenerator[str, None]:
    """Run the full exploration pipeline, yielding SSE events."""
    try:
        df = pd.read_csv(session.csv_path)
        # Basic cleaning
        df.columns = df.columns.str.strip()

        # === Step 1: Profile ===
        yield _sse("status", {"step": "profiling", "message": "Profiling data..."})
        await asyncio.sleep(0.1)

        profile = await asyncio.to_thread(profile_dataframe, df)
        session.profile = profile
        profile_text = profile_to_text(profile)

        yield _sse("profile", {
            "rows": profile.rows,
            "columns": profile.columns,
            "column_info": profile.column_info,
            "numeric_stats": profile.numeric_stats,
            "outlier_notes": profile.outlier_notes,
        })

        # === Step 2: Generate Hypotheses ===
        yield _sse("status", {"step": "hypothesizing", "message": "Generating hypotheses..."})
        await asyncio.sleep(0.1)

        hypotheses = await asyncio.to_thread(generate_hypotheses, profile_text)
        session.hypotheses = hypotheses

        for h in hypotheses:
            yield _sse("hypothesis", {"id": h.id, "text": h.text, "test_type": h.test_type, "status": "pending"})

        # === Step 3: Test Hypotheses ===
        yield _sse("status", {"step": "testing", "message": "Testing hypotheses..."})

        for h in hypotheses:
            h.status = "testing"
            yield _sse("hypothesis_update", {"id": h.id, "status": "testing", "text": h.text})
            await asyncio.sleep(0.1)

            finding = await asyncio.to_thread(test_hypothesis, df, h)

            if finding is not None:
                # Generate insight with GLM
                if not finding.insight:
                    finding.insight = await asyncio.to_thread(
                        _generate_insight, finding
                    )

                # Generate chart
                chart_path = await asyncio.to_thread(
                    generate_chart, df, finding, session.id
                )

                session.findings.append(finding)
                h.status = "significant"

                yield _sse("finding", {
                    "id": finding.id,
                    "hypothesis": finding.hypothesis,
                    "test_type": finding.test_type,
                    "p_value": finding.p_value,
                    "effect_summary": finding.effect_summary,
                    "insight": finding.insight,
                    "chart_url": f"/api/charts/{session.id}/{finding.chart_path}",
                    "is_deep_dive": False,
                })
            else:
                h.status = "not_significant"
                yield _sse("hypothesis_update", {"id": h.id, "status": "not_significant", "text": h.text})

        if not session.findings:
            yield _sse("error", {"message": "No significant findings discovered."})
            return

        # === Step 4: Deep Dive ===
        yield _sse("status", {"step": "deep_dive", "message": "Investigating further..."})
        yield _sse("deep_dive_start", {"reason": "Exploring the most surprising finding in depth..."})
        await asyncio.sleep(0.1)

        try:
            dive_plan = await asyncio.to_thread(
                select_deep_dive, session.findings, profile_text
            )
            parent_idx = dive_plan.get("finding_index", 0)
            if parent_idx >= len(session.findings):
                parent_idx = 0
            parent = session.findings[parent_idx]

            yield _sse("deep_dive_start", {
                "reason": dive_plan.get("reason", "This finding warrants deeper investigation"),
                "parent_finding": parent.hypothesis,
            })

            deep_finding = await asyncio.to_thread(
                execute_deep_dive, df, parent, dive_plan
            )

            if deep_finding:
                chart_path = await asyncio.to_thread(
                    generate_chart, df, deep_finding, session.id
                )
                session.findings.append(deep_finding)

                yield _sse("finding", {
                    "id": deep_finding.id,
                    "hypothesis": deep_finding.hypothesis,
                    "test_type": deep_finding.test_type,
                    "p_value": deep_finding.p_value,
                    "effect_summary": deep_finding.effect_summary,
                    "insight": deep_finding.insight,
                    "chart_url": f"/api/charts/{session.id}/{deep_finding.chart_path}",
                    "is_deep_dive": True,
                })
        except Exception as e:
            print(f"Deep dive error: {e}")
            traceback.print_exc()

        # === Step 5: Narrate ===
        yield _sse("status", {"step": "narrating", "message": "Writing data story..."})
        await asyncio.sleep(0.1)

        report = await asyncio.to_thread(
            generate_report, session.profile, session.findings, session.filename
        )
        session.report = report

        yield _sse("report_ready", {
            "title": report.title,
            "executive_summary": report.executive_summary,
            "sections": [
                {"heading": s.heading, "body": s.body, "chart_id": s.chart_id}
                for s in report.sections
            ],
            "methodology": report.methodology,
            "recommendations": report.recommendations,
        })

        yield _sse("status", {"step": "complete", "message": "Exploration complete!"})

    except Exception as e:
        traceback.print_exc()
        yield _sse("error", {"message": str(e)})


def _generate_insight(finding: Finding) -> str:
    """Generate a one-sentence insight for a finding."""
    messages = [
        {
            "role": "system",
            "content": "You are a data journalist. Write ONE clear, specific, insightful sentence about this statistical finding. Use concrete numbers."
        },
        {
            "role": "user",
            "content": f"Finding: {finding.hypothesis}\nTest: {finding.test_type}, p={finding.p_value}\nEffect: {finding.effect_summary}"
        },
    ]
    return chat(messages, temperature=0.6, max_tokens=150).strip()


def _sse(event_type: str, data: dict) -> str:
    """Format an SSE event string."""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
