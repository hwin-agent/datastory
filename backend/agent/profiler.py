"""Data profiling: compute column stats, distributions, outliers."""
from __future__ import annotations

import pandas as pd
import numpy as np
from models import ProfileSummary


def profile_dataframe(df: pd.DataFrame) -> ProfileSummary:
    """Profile a DataFrame and return a structured summary."""
    column_info = []
    for col in df.columns:
        info = {
            "name": col,
            "dtype": str(df[col].dtype),
            "nunique": int(df[col].nunique()),
            "missing": int(df[col].isna().sum()),
            "missing_pct": round(float(df[col].isna().mean()) * 100, 1),
        }
        # Sample values
        non_null = df[col].dropna()
        if len(non_null) > 0:
            info["sample_values"] = [str(v) for v in non_null.sample(min(5, len(non_null))).tolist()]
        else:
            info["sample_values"] = []
        column_info.append(info)

    # Numeric stats
    numeric_stats = []
    for col in df.select_dtypes(include=[np.number]).columns:
        desc = df[col].describe()
        q1, q3 = desc["25%"], desc["75%"]
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        n_outliers = int(((df[col] < lower) | (df[col] > upper)).sum())
        numeric_stats.append({
            "name": col,
            "mean": round(float(desc["mean"]), 2),
            "std": round(float(desc["std"]), 2),
            "min": round(float(desc["min"]), 2),
            "max": round(float(desc["max"]), 2),
            "q25": round(float(q1), 2),
            "q50": round(float(desc["50%"]), 2),
            "q75": round(float(q3), 2),
            "n_outliers": n_outliers,
        })

    # Outlier notes
    outlier_notes = []
    for stat in numeric_stats:
        if stat["n_outliers"] > 0:
            pct = round(stat["n_outliers"] / len(df) * 100, 1)
            outlier_notes.append(
                f"{stat['name']}: {stat['n_outliers']} outliers ({pct}%), "
                f"range [{stat['min']}, {stat['max']}], "
                f"99th percentile likely far above Q75 ({stat['q75']})"
            )

    return ProfileSummary(
        rows=len(df),
        columns=len(df.columns),
        column_info=column_info,
        numeric_stats=numeric_stats,
        outlier_notes=outlier_notes,
    )


def profile_to_text(profile: ProfileSummary) -> str:
    """Convert profile to text for LLM context."""
    lines = [f"Dataset: {profile.rows} rows, {profile.columns} columns\n"]
    lines.append("COLUMNS:")
    for c in profile.column_info:
        lines.append(f"  - {c['name']} ({c['dtype']}): {c['nunique']} unique, {c['missing']} missing ({c['missing_pct']}%)")
        if c["sample_values"]:
            lines.append(f"    samples: {', '.join(c['sample_values'][:3])}")

    lines.append("\nNUMERIC STATISTICS:")
    for s in profile.numeric_stats:
        lines.append(f"  - {s['name']}: mean={s['mean']}, std={s['std']}, range=[{s['min']}, {s['max']}], outliers={s['n_outliers']}")

    if profile.outlier_notes:
        lines.append("\nOUTLIER NOTES:")
        for note in profile.outlier_notes:
            lines.append(f"  ⚠ {note}")

    return "\n".join(lines)
