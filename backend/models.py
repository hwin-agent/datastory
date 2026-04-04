"""Data models for DataStory sessions."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid


@dataclass
class ProfileSummary:
    rows: int
    columns: int
    column_info: list[dict]  # name, dtype, nunique, missing, sample_values
    numeric_stats: list[dict]  # name, mean, std, min, max, q25, q50, q75
    outlier_notes: list[str]


@dataclass
class Hypothesis:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    text: str = ""
    test_type: str = ""  # chi_squared, t_test, correlation, regression
    variables: list[str] = field(default_factory=list)
    status: str = "pending"  # pending, testing, significant, not_significant, error


@dataclass
class Finding:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    hypothesis: str = ""
    test_type: str = ""
    p_value: float = 0.0
    effect_summary: str = ""
    insight: str = ""
    chart_path: str = ""
    is_deep_dive: bool = False


@dataclass
class ReportSection:
    heading: str
    body: str
    chart_id: str | None = None


@dataclass
class Report:
    title: str = ""
    executive_summary: str = ""
    sections: list[ReportSection] = field(default_factory=list)
    methodology: str = ""
    recommendations: str = ""


@dataclass
class Session:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    csv_path: str = ""
    filename: str = ""
    profile: ProfileSummary | None = None
    hypotheses: list[Hypothesis] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    report: Report | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    # Exploration state tracking
    exploration_status: str = "idle"  # idle, running, complete, error
    event_buffer: list[str] = field(default_factory=list)  # Buffered SSE events
    exploration_error: str = ""


# In-memory session store
sessions: dict[str, Session] = {}
