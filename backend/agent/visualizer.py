"""Chart generation with matplotlib using editorial style."""
from __future__ import annotations

import os
import re
import numpy as np
import pandas as pd

import chart_style  # noqa: F401 — applies style on import
import matplotlib.pyplot as plt
from chart_style import CHART_SEQUENCE, COLORS
from models import Finding

CHARTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "charts")
os.makedirs(CHARTS_DIR, exist_ok=True)


def _find_col(df: pd.DataFrame, name: str) -> str | None:
    """Fuzzy match column name."""
    name_lower = name.lower().replace(" ", "_").replace("-", "_")
    for col in df.columns:
        if col.lower().replace(" ", "_") == name_lower:
            return col
    for col in df.columns:
        if name_lower in col.lower().replace(" ", "_") or col.lower().replace(" ", "_") in name_lower:
            return col
    # word overlap
    name_words = set(name_lower.split("_"))
    for col in df.columns:
        col_words = set(col.lower().replace(" ", "_").split("_"))
        if name_words & col_words - {"the", "a", "an", "is", "of", "in", "by"}:
            return col
    return None


def _extract_vars_from_hypothesis(hypothesis: str, df: pd.DataFrame) -> list[str]:
    """Try to extract column names mentioned in the hypothesis text."""
    found = []
    for col in df.columns:
        # Check if column name or parts of it appear in hypothesis
        col_words = col.lower().replace("_", " ")
        if col_words in hypothesis.lower() or col.lower() in hypothesis.lower():
            found.append(col)
    return found


def generate_chart(df: pd.DataFrame, finding: Finding, session_id: str) -> str:
    """Generate a chart for a finding. Returns the chart filename."""
    chart_id = f"{session_id}_{finding.id}"
    filepath = os.path.join(CHARTS_DIR, f"{chart_id}.png")

    # Extract relevant columns from hypothesis
    mentioned_cols = _extract_vars_from_hypothesis(finding.hypothesis, df)

    try:
        if finding.test_type in ("correlation", "regression"):
            _scatter_chart(df, finding, filepath, mentioned_cols)
        elif finding.test_type == "t_test":
            _grouped_bar_chart(df, finding, filepath, mentioned_cols)
        elif finding.test_type == "chi_squared":
            _bar_chart(df, finding, filepath, mentioned_cols)
        elif finding.test_type == "anova":
            _anova_chart(df, finding, filepath, mentioned_cols)
        else:
            _bar_chart(df, finding, filepath, mentioned_cols)
    except Exception as e:
        print(f"Chart generation error: {e}")
        import traceback
        traceback.print_exc()
        _fallback_chart(finding, filepath)

    finding.chart_path = f"{chart_id}.png"
    return finding.chart_path


def _scatter_chart(df: pd.DataFrame, finding: Finding, filepath: str, mentioned_cols: list[str]):
    """Scatter plot with regression line."""
    fig, ax = plt.subplots(figsize=(8, 5))

    # Find the two numeric columns from mentioned_cols or fallback
    num_mentioned = [c for c in mentioned_cols if np.issubdtype(df[c].dtype, np.number)]
    all_num = [c for c in df.columns if np.issubdtype(df[c].dtype, np.number)]

    if len(num_mentioned) >= 2:
        x_col, y_col = num_mentioned[0], num_mentioned[1]
    elif len(all_num) >= 2:
        x_col, y_col = all_num[0], all_num[1]
    else:
        _fallback_chart(finding, filepath)
        return

    clean = df[[x_col, y_col]].dropna()
    sample = clean.sample(min(2000, len(clean)))

    ax.scatter(sample[x_col], sample[y_col],
              alpha=0.35, s=25, color=CHART_SEQUENCE[0], edgecolors="none", zorder=2)

    # Regression line
    z = np.polyfit(clean[x_col], clean[y_col], 1)
    p = np.poly1d(z)
    x_line = np.linspace(clean[x_col].min(), clean[x_col].max(), 100)
    ax.plot(x_line, p(x_line), color=CHART_SEQUENCE[1], linewidth=2.5, linestyle="-", zorder=3)

    # Add effect annotation
    if finding.effect_summary:
        ax.annotate(finding.effect_summary, xy=(0.95, 0.05), xycoords="axes fraction",
                   ha="right", fontsize=12, color=COLORS["coral"],
                   fontfamily="monospace", fontweight="bold")

    ax.set_xlabel(x_col.replace("_", " ").title(), fontsize=12)
    ax.set_ylabel(y_col.replace("_", " ").title(), fontsize=12)
    ax.set_title(finding.hypothesis, fontsize=13, fontweight="bold", pad=15, loc="left")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.savefig(filepath, bbox_inches="tight", facecolor="white", dpi=150)
    plt.close(fig)


def _grouped_bar_chart(df: pd.DataFrame, finding: Finding, filepath: str, mentioned_cols: list[str]):
    """Horizontal bar chart for t-test / group comparison."""
    fig, ax = plt.subplots(figsize=(8, 4.5))

    # Find categorical and numeric columns
    cat_mentioned = [c for c in mentioned_cols if df[c].dtype == "object" or df[c].nunique() <= 10]
    num_mentioned = [c for c in mentioned_cols if np.issubdtype(df[c].dtype, np.number) and df[c].nunique() > 10]

    cat = cat_mentioned[0] if cat_mentioned else next(
        (c for c in df.columns if df[c].dtype == "object" and df[c].nunique() <= 10), None
    )
    num = num_mentioned[0] if num_mentioned else next(
        (c for c in df.columns if np.issubdtype(df[c].dtype, np.number) and c not in ("trip_id", "bike_id", "start_station_id", "end_station_id")), None
    )

    if not cat or not num:
        _fallback_chart(finding, filepath)
        return

    groups = df[cat].value_counts().head(5).index.tolist()
    means = [df[df[cat] == g][num].mean() for g in groups]
    colors = CHART_SEQUENCE[:len(groups)]

    y_pos = range(len(groups))
    bars = ax.barh(y_pos, means, color=colors, height=0.55, zorder=2)

    # Add value labels
    for bar, mean in zip(bars, means):
        ax.text(bar.get_width() + max(means) * 0.02, bar.get_y() + bar.get_height()/2,
               f"{mean:.0f}s", va="center", fontsize=11, color=COLORS["ink"])

    ax.set_yticks(y_pos)
    ax.set_yticklabels([str(g) for g in groups], fontsize=12)
    ax.set_xlabel(num.replace("_", " ").title(), fontsize=12)
    ax.set_title(finding.hypothesis, fontsize=13, fontweight="bold", pad=15, loc="left")

    # Add stat annotation
    if finding.effect_summary:
        ax.annotate(finding.effect_summary, xy=(0.95, 0.05), xycoords="axes fraction",
                   ha="right", fontsize=11, color=COLORS["coral"],
                   fontfamily="monospace", fontweight="bold")

    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.savefig(filepath, bbox_inches="tight", facecolor="white", dpi=150)
    plt.close(fig)


def _bar_chart(df: pd.DataFrame, finding: Finding, filepath: str, mentioned_cols: list[str]):
    """Bar chart for categorical associations."""
    fig, ax = plt.subplots(figsize=(8, 5))

    cat_mentioned = [c for c in mentioned_cols if df[c].dtype == "object" or df[c].nunique() <= 15]

    if len(cat_mentioned) >= 2:
        v1, v2 = cat_mentioned[0], cat_mentioned[1]
    else:
        cats = [c for c in df.columns if df[c].dtype == "object" and df[c].nunique() <= 10]
        if len(cats) >= 2:
            v1, v2 = cats[0], cats[1]
        else:
            _fallback_chart(finding, filepath)
            return

    ct = pd.crosstab(df[v1], df[v2])
    ct.plot(kind="bar", ax=ax, color=CHART_SEQUENCE[:ct.shape[1]], edgecolor="none", width=0.7)

    ax.set_xlabel(v1.replace("_", " ").title(), fontsize=12)
    ax.set_ylabel("Count", fontsize=12)
    ax.set_title(finding.hypothesis, fontsize=13, fontweight="bold", pad=15, loc="left")
    ax.legend(title=v2.replace("_", " ").title(), frameon=False)

    plt.xticks(rotation=0)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.savefig(filepath, bbox_inches="tight", facecolor="white", dpi=150)
    plt.close(fig)


def _anova_chart(df: pd.DataFrame, finding: Finding, filepath: str, mentioned_cols: list[str]):
    """Chart for ANOVA / deep-dive segmentation."""
    fig, ax = plt.subplots(figsize=(9, 5))

    # Deep dive: find the segment variable (usually mentioned in "segmented by X")
    segment_match = re.search(r"segmented by (\w+)", finding.hypothesis, re.IGNORECASE)
    segment_col = segment_match.group(1) if segment_match else None

    if segment_col:
        segment_col = _find_col(df, segment_col)

    if not segment_col:
        cat_cols = [c for c in mentioned_cols if df[c].dtype == "object" or df[c].nunique() <= 20]
        segment_col = cat_cols[0] if cat_cols else next(
            (c for c in df.columns if df[c].dtype == "object" and df[c].nunique() <= 20), None
        )

    num_col = next(
        (c for c in df.columns if np.issubdtype(df[c].dtype, np.number) and c not in ("trip_id", "bike_id", "start_station_id", "end_station_id")),
        None
    )

    if not segment_col or not num_col:
        _fallback_chart(finding, filepath)
        return

    grouped = df.groupby(segment_col)[num_col].agg(["mean", "count"])
    grouped = grouped[grouped["count"] >= 5].sort_values("mean", ascending=True).tail(10)

    colors = [COLORS["gold"] if "university" in str(idx).lower() or "college" in str(idx).lower() or "nyu" in str(idx).lower() or "new school" in str(idx).lower()
              else CHART_SEQUENCE[0] for idx in grouped.index]

    bars = ax.barh(range(len(grouped)), grouped["mean"], color=colors, height=0.6, zorder=2)

    # Shorten station names for readability
    labels = []
    for idx in grouped.index:
        name = str(idx)
        if len(name) > 35:
            name = name[:32] + "…"
        labels.append(name)

    ax.set_yticks(range(len(grouped)))
    ax.set_yticklabels(labels, fontsize=9)
    ax.set_xlabel(num_col.replace("_", " ").title(), fontsize=12)
    ax.set_title(finding.hypothesis, fontsize=12, fontweight="bold", pad=15, loc="left")

    # Add legend for university stations
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor=COLORS["gold"], label="University area"),
        Patch(facecolor=CHART_SEQUENCE[0], label="Downtown/Other"),
    ]
    ax.legend(handles=legend_elements, loc="lower right", frameon=False, fontsize=10)

    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.savefig(filepath, bbox_inches="tight", facecolor="white", dpi=150)
    plt.close(fig)


def _fallback_chart(finding: Finding, filepath: str):
    """Generate a placeholder chart."""
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.text(0.5, 0.5, finding.hypothesis, ha="center", va="center",
            fontsize=14, wrap=True, transform=ax.transAxes, color=COLORS["ink"])
    ax.set_title("Analysis Result", fontsize=14, fontweight="bold")
    ax.axis("off")
    fig.savefig(filepath, bbox_inches="tight", facecolor="white", dpi=150)
    plt.close(fig)
