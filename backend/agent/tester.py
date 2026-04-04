"""Statistical test execution for hypotheses."""
from __future__ import annotations

import traceback
import pandas as pd
import numpy as np
from scipy import stats
from models import Finding, Hypothesis


def test_hypothesis(df: pd.DataFrame, hyp: Hypothesis) -> Finding | None:
    """Execute a statistical test for the given hypothesis. Returns Finding if significant."""
    try:
        if hyp.test_type == "chi_squared":
            return _chi_squared(df, hyp)
        elif hyp.test_type == "t_test":
            return _t_test(df, hyp)
        elif hyp.test_type == "correlation":
            return _correlation(df, hyp)
        elif hyp.test_type == "regression":
            return _correlation(df, hyp)
        else:
            # Try all test types
            for fn in [_correlation, _t_test, _chi_squared]:
                result = fn(df, hyp)
                if result:
                    return result
            return None
    except Exception as e:
        print(f"Test error for '{hyp.text}': {e}")
        traceback.print_exc()
        return None


def _chi_squared(df: pd.DataFrame, hyp: Hypothesis) -> Finding | None:
    """Chi-squared test of independence."""
    # Find two categorical columns
    cat_cols = _find_categorical_cols(df, hyp.variables)
    if len(cat_cols) < 2:
        return None

    v1, v2 = cat_cols[0], cat_cols[1]
    ct = pd.crosstab(df[v1], df[v2])
    if ct.shape[0] < 2 or ct.shape[1] < 2:
        return None

    chi2, p, dof, expected = stats.chi2_contingency(ct)
    if p > 0.05:
        return None

    # Compute a useful effect summary
    if ct.shape[1] == 2:
        col_sums = ct.sum(axis=0)
        ratio = col_sums.iloc[0] / max(col_sums.iloc[1], 1)
        effect = f"χ² = {chi2:.1f}, ratio = {ratio:.1f}:1"
    else:
        effect = f"χ² = {chi2:.1f}, dof = {dof}"

    return Finding(
        hypothesis=hyp.text,
        test_type="chi_squared",
        p_value=round(p, 6),
        effect_summary=effect,
        insight="",
    )


def _t_test(df: pd.DataFrame, hyp: Hypothesis) -> Finding | None:
    """Independent samples t-test."""
    # Find one categorical (binary/few groups) and one numeric
    cat_col, num_col = _find_cat_num_pair(df, hyp.variables)
    if cat_col is None or num_col is None:
        return None

    # Get the two most common groups
    top_groups = df[cat_col].value_counts().head(2).index.tolist()
    if len(top_groups) < 2:
        return None

    g1 = df[df[cat_col] == top_groups[0]][num_col].dropna()
    g2 = df[df[cat_col] == top_groups[1]][num_col].dropna()
    if len(g1) < 5 or len(g2) < 5:
        return None

    t_stat, p = stats.ttest_ind(g1, g2, equal_var=False)
    if p > 0.05:
        return None

    m1, m2 = g1.mean(), g2.mean()
    if m2 > 0:
        ratio = m1 / m2
        effect = f"mean({top_groups[0]})={m1:.1f} vs mean({top_groups[1]})={m2:.1f} ({ratio:.1f}×)"
    else:
        effect = f"mean({top_groups[0]})={m1:.1f} vs mean({top_groups[1]})={m2:.1f}"

    return Finding(
        hypothesis=hyp.text,
        test_type="t_test",
        p_value=round(p, 6),
        effect_summary=effect,
        insight="",
    )


def _correlation(df: pd.DataFrame, hyp: Hypothesis) -> Finding | None:
    """Pearson correlation test."""
    num_cols = _find_numeric_cols(df, hyp.variables)
    if len(num_cols) < 2:
        return None

    c1, c2 = num_cols[0], num_cols[1]
    clean = df[[c1, c2]].dropna()
    if len(clean) < 10:
        return None

    r, p = stats.pearsonr(clean[c1], clean[c2])
    if p > 0.05 or abs(r) < 0.08:
        return None

    effect = f"r = {r:.2f}"
    return Finding(
        hypothesis=hyp.text,
        test_type="correlation",
        p_value=round(p, 6),
        effect_summary=effect,
        insight="",
    )


# ─── Column resolution helpers ─────────────────────────────────────

def _find_col(df: pd.DataFrame, name: str) -> str | None:
    """Fuzzy match a column name."""
    name_lower = name.lower().replace(" ", "_").replace("-", "_")
    # Exact match
    for col in df.columns:
        if col.lower().replace(" ", "_").replace("-", "_") == name_lower:
            return col
    # Substring match
    for col in df.columns:
        col_lower = col.lower().replace(" ", "_").replace("-", "_")
        if name_lower in col_lower or col_lower in name_lower:
            return col
    # Partial word match
    name_words = set(name_lower.split("_"))
    for col in df.columns:
        col_words = set(col.lower().replace(" ", "_").replace("-", "_").split("_"))
        if name_words & col_words:
            return col
    return None


def _find_categorical_cols(df: pd.DataFrame, variables: list[str]) -> list[str]:
    """Find categorical columns from variable names."""
    resolved = []
    for v in variables:
        matched = _find_col(df, v)
        if matched and (df[matched].dtype == "object" or df[matched].nunique() <= 15):
            resolved.append(matched)

    # If not enough, find any categorical columns in the dataframe
    if len(resolved) < 2:
        for col in df.columns:
            if col not in resolved and (df[col].dtype == "object" or df[col].nunique() <= 10):
                resolved.append(col)
                if len(resolved) >= 2:
                    break
    return resolved[:2]


def _find_numeric_cols(df: pd.DataFrame, variables: list[str]) -> list[str]:
    """Find numeric columns from variable names."""
    resolved = []
    for v in variables:
        matched = _find_col(df, v)
        if matched and np.issubdtype(df[matched].dtype, np.number):
            resolved.append(matched)

    if len(resolved) < 2:
        for col in df.columns:
            if col not in resolved and np.issubdtype(df[col].dtype, np.number):
                resolved.append(col)
                if len(resolved) >= 2:
                    break
    return resolved[:2]


def _find_cat_num_pair(df: pd.DataFrame, variables: list[str]) -> tuple[str | None, str | None]:
    """Find a categorical + numeric column pair."""
    cat_col = None
    num_col = None

    for v in variables:
        matched = _find_col(df, v)
        if matched is None:
            continue
        if df[matched].dtype == "object" or df[matched].nunique() <= 10:
            if cat_col is None:
                cat_col = matched
        elif np.issubdtype(df[matched].dtype, np.number):
            if num_col is None:
                num_col = matched

    # Fill in missing
    if cat_col is None:
        for col in df.columns:
            if (df[col].dtype == "object" or df[col].nunique() <= 10) and col != num_col:
                cat_col = col
                break

    if num_col is None:
        for col in df.columns:
            if np.issubdtype(df[col].dtype, np.number) and col != cat_col:
                num_col = col
                break

    return cat_col, num_col
