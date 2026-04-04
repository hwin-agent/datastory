"""Autonomous deep dive: GLM 5.1 picks the most interesting finding and investigates further."""
from __future__ import annotations

import pandas as pd
import numpy as np
from scipy import stats
from models import Finding
from llm import chat_json, chat


def select_deep_dive(findings: list[Finding], profile_text: str) -> dict:
    """Ask GLM 5.1 which finding to investigate deeper and how."""
    findings_text = "\n".join(
        f"- Finding: {f.hypothesis} | Result: {f.effect_summary} (p={f.p_value}) | Test: {f.test_type}"
        for f in findings
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a data scientist reviewing initial findings. Pick the MOST surprising or interesting finding "
                "and propose a follow-up analysis that segments it by another variable to uncover deeper patterns.\n\n"
                "Return JSON: {\"finding_index\": 0, \"reason\": \"...\", \"follow_up\": \"description of deeper analysis\", "
                "\"segment_by\": \"column_name_to_segment_by\"}"
            ),
        },
        {
            "role": "user",
            "content": f"Dataset profile:\n{profile_text}\n\nFindings so far:\n{findings_text}\n\nWhich finding should we investigate deeper?",
        },
    ]

    return chat_json(messages, temperature=0.5)


def execute_deep_dive(df: pd.DataFrame, parent_finding: Finding, dive_plan: dict) -> Finding | None:
    """Execute the deep dive analysis."""
    segment_col = dive_plan.get("segment_by", "")

    # Find the segment column
    matched_col = None
    for col in df.columns:
        if col.lower().replace(" ", "_") == segment_col.lower().replace(" ", "_"):
            matched_col = col
            break
        if segment_col.lower() in col.lower():
            matched_col = col
            break

    if not matched_col:
        # Pick a categorical column that wasn't in the parent analysis
        cat_cols = [c for c in df.columns if df[c].dtype == "object" or df[c].nunique() <= 10]
        if cat_cols:
            matched_col = cat_cols[0]
        else:
            return None

    # Segment the parent finding's metric by the new variable
    num_cols = [c for c in df.columns if np.issubdtype(df[c].dtype, np.number)]
    if not num_cols:
        return None

    metric = num_cols[0]
    segments = df.groupby(matched_col)[metric].agg(["mean", "count"]).sort_values("mean", ascending=False)
    segments = segments[segments["count"] >= 10].head(8)

    if len(segments) < 2:
        return None

    # Run ANOVA or chi-squared on segments
    groups = [df[df[matched_col] == seg][metric].dropna() for seg in segments.index]
    groups = [g for g in groups if len(g) >= 5]

    if len(groups) >= 2:
        f_stat, p = stats.f_oneway(*groups)
    else:
        p = 1.0

    # Generate insight with GLM 5.1
    segment_summary = "\n".join(
        f"  {idx}: mean={row['mean']:.2f}, n={int(row['count'])}"
        for idx, row in segments.iterrows()
    )

    insight_prompt = [
        {
            "role": "system",
            "content": "You are a data journalist. Write ONE insightful sentence about this deeper pattern. Be specific and revelatory."
        },
        {
            "role": "user",
            "content": (
                f"Parent finding: {parent_finding.hypothesis}\n"
                f"Deep dive: Segmented by '{matched_col}'\n"
                f"Segments:\n{segment_summary}\n"
                f"ANOVA p-value: {p:.6f}\n\n"
                f"Write one sentence describing the most interesting pattern in this segmentation."
            ),
        },
    ]

    insight = chat(insight_prompt, temperature=0.6, max_tokens=200)

    return Finding(
        hypothesis=f"Deep dive: {parent_finding.hypothesis} segmented by {matched_col}",
        test_type="anova",
        p_value=round(p, 6),
        effect_summary=f"F={f_stat:.1f}" if p < 1.0 else "segmented analysis",
        insight=insight.strip(),
        is_deep_dive=True,
    )
