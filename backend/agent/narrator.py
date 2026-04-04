"""Report generation: GLM 5.1 writes a publishable data story."""
from __future__ import annotations

from models import Finding, Report, ReportSection, ProfileSummary
from llm import chat_json, chat


def generate_report(
    profile: ProfileSummary,
    findings: list[Finding],
    filename: str,
) -> Report:
    """Ask GLM 5.1 to write a complete data story report."""
    findings_text = ""
    for i, f in enumerate(findings, 1):
        prefix = "🔍 DEEP DIVE — " if f.is_deep_dive else ""
        findings_text += (
            f"\n{prefix}Finding {i}: {f.hypothesis}\n"
            f"  Test: {f.test_type}, p-value: {f.p_value}, effect: {f.effect_summary}\n"
            f"  Insight: {f.insight}\n"
            f"  Chart: {f.chart_path}\n"
        )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a data journalist writing for The Pudding or FiveThirtyEight. "
                "Write a compelling, publishable data story based on the statistical findings below.\n\n"
                "The story MUST include:\n"
                "1. A compelling, specific title (not generic)\n"
                "2. An executive summary (2-3 sentences capturing the key insight)\n"
                "3. Numbered findings (each as a section with a subheading, 2-3 paragraph narrative, "
                "reference to the chart, and the statistical evidence)\n"
                "4. A methodology section (1 paragraph listing tests used)\n"
                "5. Recommendations (2-3 actionable items based on the findings)\n\n"
                "Write in a journalistic, engaging tone. Use specific numbers. "
                "Make each finding tell part of a larger story.\n\n"
                "Return JSON:\n"
                "{\n"
                '  "title": "...",\n'
                '  "executive_summary": "...",\n'
                '  "sections": [{"heading": "...", "body": "...", "chart_ref": "finding_id"}],\n'
                '  "methodology": "...",\n'
                '  "recommendations": "..."\n'
                "}"
            ),
        },
        {
            "role": "user",
            "content": (
                f"Dataset: {filename} ({profile.rows:,} rows, {profile.columns} columns)\n\n"
                f"Findings:\n{findings_text}\n\n"
                "Write the data story."
            ),
        },
    ]

    result = chat_json(messages, temperature=0.7, max_tokens=4096)

    sections = []
    for s in result.get("sections", []):
        sections.append(ReportSection(
            heading=s.get("heading", ""),
            body=s.get("body", ""),
            chart_id=s.get("chart_ref", None),
        ))

    return Report(
        title=result.get("title", "Data Story"),
        executive_summary=result.get("executive_summary", ""),
        sections=sections,
        methodology=result.get("methodology", ""),
        recommendations=result.get("recommendations", ""),
    )
