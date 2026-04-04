"""Custom matplotlib style for publication-quality charts."""
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# DataStory color palette
COLORS = {
    "ink": "#1A1A2E",
    "paper": "#FAF8F5",
    "accent": "#0D7377",
    "coral": "#D4634A",
    "gold": "#C49A3C",
    "muted": "#8A8578",
    "surface": "#F0EDE8",
    "chart_bg": "#FFFFFF",
}

CHART_SEQUENCE = ["#0D7377", "#D4634A", "#C49A3C", "#5B7B8A", "#8E6B4A"]


def apply_datastory_style():
    """Apply DataStory editorial chart style globally."""
    plt.rcParams.update({
        # Figure
        "figure.facecolor": COLORS["chart_bg"],
        "figure.figsize": (8, 5),
        "figure.dpi": 150,
        # Axes
        "axes.facecolor": COLORS["chart_bg"],
        "axes.edgecolor": "#E8E4DF",
        "axes.linewidth": 0.8,
        "axes.titlesize": 16,
        "axes.titleweight": "bold",
        "axes.titlepad": 16,
        "axes.labelsize": 12,
        "axes.labelcolor": COLORS["ink"],
        "axes.prop_cycle": plt.cycler("color", CHART_SEQUENCE),
        # Grid
        "axes.grid": True,
        "grid.color": "#E8E4DF",
        "grid.linewidth": 0.5,
        "grid.linestyle": ":",
        "grid.alpha": 0.7,
        # Ticks
        "xtick.color": COLORS["muted"],
        "ytick.color": COLORS["muted"],
        "xtick.labelsize": 11,
        "ytick.labelsize": 11,
        # Text
        "text.color": COLORS["ink"],
        "font.size": 12,
        # Legend
        "legend.frameon": False,
        "legend.fontsize": 11,
        # Spacing
        "figure.constrained_layout.use": True,
    })


# Apply on import
apply_datastory_style()
