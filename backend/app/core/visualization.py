"""
visualization.py – Generate Plotly-compatible data from allocation results.
Includes: 2D/3D Pareto front, α‑score bar chart, regret box plot,
average rank per layer, per-agent satisfaction, stability convergence,
pareto vs random baseline, layerwise rank correlation, resource utilization,
alpha sensitivity, parallel coordinates, and sensitivity heatmap.
"""

import numpy as np
from typing import List, Dict, Tuple, Any, Optional


# ----------------------------------------------------------------------
# Dark theme colors palette for consistent styling
# ----------------------------------------------------------------------
COLORS = [
    "#60a5fa", "#a78bfa", "#34d399", "#fb923c",
    "#f472b6", "#22d3ee", "#fbbf24", "#e879f9",
    "#4ade80", "#f87171"
]


# ----------------------------------------------------------------------
# Core graph 1: 2D Pareto Front
# ----------------------------------------------------------------------
def get_pareto_front_2d_data(global_pareto: List[Tuple],
                              x_metric: str = 'avg_rank_selected',
                              y_metric: str = 'stability') -> Dict:
    x_vals = [m[1].get(x_metric, np.nan) for m in global_pareto]
    y_vals = [m[1].get(y_metric, np.nan) for m in global_pareto]
    valid = [(x, y) for x, y in zip(x_vals, y_vals) if not (np.isnan(x) or np.isnan(y))]
    if not valid:
        return {"data": []}
    x_vals, y_vals = zip(*valid)
    trace = {
        "x": list(x_vals),
        "y": list(y_vals),
        "mode": "markers+lines",
        "type": "scatter",
        "marker": {"color": "#60a5fa", "size": 10, "symbol": "diamond"},
        "line": {"color": "rgba(96,165,250,0.3)", "width": 1, "dash": "dot"},
        "name": "Pareto solutions"
    }
    layout = {
        "title": f"2D Pareto Front: {x_metric.replace('_',' ').title()} vs {y_metric.replace('_',' ').title()}",
        "xaxis": {"title": x_metric.replace('_', ' ').title()},
        "yaxis": {"title": y_metric.replace('_', ' ').title()}
    }
    return {"data": [trace], "layout": layout}


# ----------------------------------------------------------------------
# Core graph 2: 3D Pareto Front
# ----------------------------------------------------------------------
def get_pareto_front_3d_data(global_pareto: List[Tuple],
                              x_metric='avg_rank_selected',
                              y_metric='stability',
                              z_metric='alpha_score') -> Dict:
    x_vals = [m[1].get(x_metric, np.nan) for m in global_pareto]
    y_vals = [m[1].get(y_metric, np.nan) for m in global_pareto]
    z_vals = [m[1].get(z_metric, np.nan) for m in global_pareto]
    valid = [(x, y, z) for x, y, z in zip(x_vals, y_vals, z_vals)
             if not (np.isnan(x) or np.isnan(y) or np.isnan(z))]
    if not valid:
        return {"data": []}
    x_vals, y_vals, z_vals = zip(*valid)
    trace = {
        "x": list(x_vals),
        "y": list(y_vals),
        "z": list(z_vals),
        "mode": "markers",
        "type": "scatter3d",
        "marker": {
            "color": list(z_vals),
            "colorscale": "Viridis",
            "size": 6,
            "showscale": True,
            "colorbar": {"title": z_metric.replace('_', ' ').title()}
        },
        "name": "Pareto solutions"
    }
    layout = {
        "title": "3D Pareto Front",
        "scene": {
            "xaxis": {"title": x_metric.replace('_', ' ').title()},
            "yaxis": {"title": y_metric.replace('_', ' ').title()},
            "zaxis": {"title": z_metric.replace('_', ' ').title()}
        }
    }
    return {"data": [trace], "layout": layout}


# ----------------------------------------------------------------------
# Core graph 3: α-Score Distribution
# ----------------------------------------------------------------------
def get_alpha_scores_bar_data(global_pareto: List[Tuple]) -> Dict:
    alphas = [m[1].get('alpha_score', 0) for m in global_pareto]
    labels = [f"Sol{i+1}" for i in range(len(global_pareto))]
    colors = [COLORS[i % len(COLORS)] for i in range(len(global_pareto))]
    trace = {
        "x": labels,
        "y": alphas,
        "type": "bar",
        "marker": {"color": colors},
        "name": "α‑score"
    }
    layout = {
        "title": "α‑Score Distribution across Pareto Solutions",
        "xaxis": {"title": "Pareto Solution"},
        "yaxis": {"title": "α‑score (# Pareto-optimal layers)"}
    }
    return {"data": [trace], "layout": layout}


# ----------------------------------------------------------------------
# Core graph 4: Regret Distribution
# ----------------------------------------------------------------------
def get_regret_distribution_data(global_pareto: List[Tuple], system) -> Dict:
    regret_data = []
    labels = []
    for i, (alloc, met) in enumerate(global_pareto):
        per_agent_regret = []
        for a in range(system.n_agents):
            r = alloc.assignment[a]
            if r >= 0:
                best = np.min(system.rank_matrices[:, a, :], axis=1)
                assigned = system.rank_matrices[:, a, r]
                regret_per_layer = assigned - best
                avg_regret = np.mean(regret_per_layer)
                per_agent_regret.append(avg_regret)
        if per_agent_regret:
            regret_data.append(per_agent_regret)
            labels.append(f"Sol{i+1}")
    if not regret_data:
        return {"data": []}
    traces = []
    for i, data in enumerate(regret_data):
        traces.append({
            "y": data,
            "type": "box",
            "name": labels[i],
            "boxmean": "sd",
            "marker": {"color": COLORS[i % len(COLORS)]}
        })
    layout = {
        "title": "Regret Distribution across Pareto Solutions",
        "yaxis": {"title": "Average per-agent regret"},
        "showlegend": True
    }
    return {"data": traces, "layout": layout}


# ----------------------------------------------------------------------
# New graph 5: Average Rank per Layer (for each Pareto solution)
# ----------------------------------------------------------------------
def get_avg_rank_per_layer_data(global_pareto: List[Tuple], system) -> Dict:
    """
    Grouped bar chart: X = layer names, bars grouped by Pareto solution.
    Shows how well agents are served in each criterion layer.
    """
    if not global_pareto:
        return {"data": []}
    layer_names = system.layer_names
    traces = []
    for i, (alloc, met) in enumerate(global_pareto):
        per_layer = [met.get(f'avg_rank_{name}', np.nan) for name in layer_names]
        traces.append({
            "x": layer_names,
            "y": per_layer,
            "type": "bar",
            "name": f"Sol{i+1}",
            "marker": {"color": COLORS[i % len(COLORS)], "opacity": 0.85}
        })
    layout = {
        "title": "Average Rank per Layer – per Solution Comparison",
        "barmode": "group",
        "xaxis": {"title": "Layer / Criterion"},
        "yaxis": {"title": "Average Rank (lower = better)"}
    }
    return {"data": traces, "layout": layout}


# ----------------------------------------------------------------------
# New graph 6: Per-Agent Satisfaction Distribution
# ----------------------------------------------------------------------
def get_per_agent_satisfaction_data(global_pareto: List[Tuple], system) -> Dict:
    """
    Box plot of per-agent satisfaction (normalized score) for each Pareto solution.
    Satisfaction = 1 - (rank-1)/(n_resources-1) averaged over active layers.
    """
    if not global_pareto:
        return {"data": []}
    traces = []
    for i, (alloc, met) in enumerate(global_pareto):
        scores = []
        for a in range(system.n_agents):
            r = alloc.assignment[a]
            if r >= 0:
                s = float(np.mean(system.score_matrices[:, a, r]))
                scores.append(s)
            else:
                scores.append(0.0)
        traces.append({
            "y": scores,
            "type": "box",
            "name": f"Sol{i+1}",
            "boxmean": True,
            "marker": {"color": COLORS[i % len(COLORS)]}
        })
    layout = {
        "title": "Per-Agent Satisfaction Distribution",
        "yaxis": {"title": "Satisfaction Score (0–1, higher = better)"},
        "showlegend": True
    }
    return {"data": traces, "layout": layout}


# ----------------------------------------------------------------------
# New graph 7: Stability Score Convergence (bar/line across solutions)
# ----------------------------------------------------------------------
def get_stability_convergence_data(global_pareto: List[Tuple]) -> Dict:
    """
    Line + marker chart showing stability score for each Pareto solution.
    Illustrates how stable each solution is across disruption scenarios.
    """
    if not global_pareto:
        return {"data": []}
    labels = [f"Sol{i+1}" for i in range(len(global_pareto))]
    stability_vals = [met.get('stability', np.nan) for _, met in global_pareto]

    trace_line = {
        "x": labels,
        "y": stability_vals,
        "mode": "lines+markers",
        "type": "scatter",
        "line": {"color": "#34d399", "width": 2.5},
        "marker": {"color": "#34d399", "size": 9, "symbol": "circle"},
        "name": "Stability Score",
        "fill": "tozeroy",
        "fillcolor": "rgba(52,211,153,0.1)"
    }
    layout = {
        "title": "Stability Score Convergence across Pareto Solutions",
        "xaxis": {"title": "Pareto Solution"},
        "yaxis": {"title": "Stability (0-1, higher = better)", "range": [0, 1]}
    }
    return {"data": [trace_line], "layout": layout}


# ----------------------------------------------------------------------
# New graph 8: Pareto Solutions vs Random Baseline
# ----------------------------------------------------------------------
def get_pareto_vs_random_data(global_pareto: List[Tuple],
                               random_solutions: Optional[List[Tuple]]) -> Dict:
    """
    Scatter plot: avg_rank_selected vs alpha_score.
    Pareto solutions highlighted separately from random solutions.
    """
    traces = []

    if random_solutions:
        rx = [m[1].get('avg_rank_selected', np.nan) for m in random_solutions]
        ry = [m[1].get('alpha_score', np.nan) for m in random_solutions]
        valid = [(x, y) for x, y in zip(rx, ry) if not (np.isnan(x) or np.isnan(y))]
        if valid:
            rx, ry = zip(*valid)
            traces.append({
                "x": list(rx),
                "y": list(ry),
                "mode": "markers",
                "type": "scatter",
                "marker": {"color": "rgba(148,163,184,0.5)", "size": 8, "symbol": "circle"},
                "name": "Random Baseline"
            })

    if global_pareto:
        px = [m[1].get('avg_rank_selected', np.nan) for m in global_pareto]
        py = [m[1].get('alpha_score', np.nan) for m in global_pareto]
        labels = [f"Sol{i+1}" for i in range(len(global_pareto))]
        valid = [(x, y, l) for x, y, l in zip(px, py, labels)
                 if not (np.isnan(x) or np.isnan(y))]
        if valid:
            px, py, pl = zip(*valid)
            traces.append({
                "x": list(px),
                "y": list(py),
                "mode": "markers+text",
                "type": "scatter",
                "text": list(pl),
                "textposition": "top center",
                "marker": {"color": "#f472b6", "size": 12, "symbol": "star",
                           "line": {"width": 1, "color": "white"}},
                "name": "Pareto Front"
            })

    if not traces:
        return {"data": []}

    layout = {
        "title": "Pareto Solutions vs Random Baseline",
        "xaxis": {"title": "Avg Rank Selected (lower = better)"},
        "yaxis": {"title": "Alpha Score (higher = better)"},
        "showlegend": True
    }
    return {"data": traces, "layout": layout}


# ----------------------------------------------------------------------
# New graph 9: Layerwise Rank Correlation (Heatmap)
# ----------------------------------------------------------------------
def get_layerwise_rank_correlation_data(global_pareto: List[Tuple], system) -> Dict:
    """
    Heatmap: rows = layers, cols = Pareto solutions.
    Values = avg rank per layer (lower = better assignment for that criterion).
    """
    if not global_pareto:
        return {"data": []}

    layer_names = system.layer_names
    sol_labels = [f"Sol{i+1}" for i in range(len(global_pareto))]
    z = []
    for name in layer_names:
        row = [met.get(f'avg_rank_{name}', np.nan) for _, met in global_pareto]
        z.append(row)

    trace = {
        "z": z,
        "x": sol_labels,
        "y": layer_names,
        "type": "heatmap",
        "colorscale": "RdYlGn_r",
        "colorbar": {"title": "Avg Rank"},
        "zsmooth": "best"
    }
    layout = {
        "title": "Layerwise Rank Correlation across Pareto Solutions",
        "xaxis": {"title": "Pareto Solution"},
        "yaxis": {"title": "Layer"}
    }
    return {"data": [trace], "layout": layout}


# ----------------------------------------------------------------------
# New graph 10: Resource Utilization
# ----------------------------------------------------------------------
def get_resource_utilization_data(global_pareto: List[Tuple], system) -> Dict:
    """
    Bar chart showing how many times each resource is selected across all Pareto solutions.
    """
    if not global_pareto:
        return {"data": []}
    usage = np.zeros(system.n_resources)
    for alloc, _ in global_pareto:
        for r in alloc.assignment:
            if r >= 0:
                usage[r] += 1

    resource_labels = [f"R{i}" for i in range(system.n_resources)]
    colors = [COLORS[i % len(COLORS)] for i in range(system.n_resources)]

    trace = {
        "x": resource_labels,
        "y": usage.tolist(),
        "type": "bar",
        "marker": {"color": colors, "opacity": 0.85},
        "name": "Times Used"
    }
    layout = {
        "title": "Resource Utilization across Pareto Solutions",
        "xaxis": {"title": "Resource"},
        "yaxis": {"title": "Times assigned (across all Pareto solutions)"}
    }
    return {"data": [trace], "layout": layout}


# ----------------------------------------------------------------------
# New graph 11: Sensitivity of Alpha Score
# ----------------------------------------------------------------------
def get_alpha_sensitivity_data(global_pareto: List[Tuple]) -> Dict:
    """
    Bar chart of the 'sensitivity' metric (robustness of alpha score to rank noise)
    for each Pareto solution, with stability overlay.
    """
    if not global_pareto:
        return {"data": []}

    labels = [f"Sol{i+1}" for i in range(len(global_pareto))]
    sensitivity_vals = [met.get('sensitivity', np.nan) for _, met in global_pareto]
    stability_vals = [met.get('stability', np.nan) for _, met in global_pareto]

    trace_sens = {
        "x": labels,
        "y": sensitivity_vals,
        "type": "bar",
        "name": "Sensitivity (α robustness)",
        "marker": {"color": "#fbbf24", "opacity": 0.9}
    }
    trace_stab = {
        "x": labels,
        "y": stability_vals,
        "type": "scatter",
        "mode": "lines+markers",
        "name": "Stability",
        "yaxis": "y2",
        "line": {"color": "#60a5fa", "width": 2},
        "marker": {"color": "#60a5fa", "size": 7}
    }
    layout = {
        "title": "Sensitivity of Alpha Score (noise robustness vs stability)",
        "xaxis": {"title": "Pareto Solution"},
        "yaxis": {"title": "Sensitivity (fraction unchanged, 0-1)"},
        "yaxis2": {
            "title": "Stability Score",
            "overlaying": "y",
            "side": "right",
            "range": [0, 1]
        },
        "legend": {"x": 0.01, "y": 1.15, "orientation": "h"},
        "barmode": "overlay"
    }
    return {"data": [trace_sens, trace_stab], "layout": layout}


# ----------------------------------------------------------------------
# New graph 12: Parallel Coordinates (Trade-offs)
# ----------------------------------------------------------------------
def get_parallel_coordinates_data(global_pareto: List[Tuple],
                                   objectives: List[Tuple[str, bool]]) -> Dict:
    """
    Parallel coordinates plot for all objective metrics.
    objectives: list of (metric_name, minimize_flag).
    """
    if not global_pareto:
        return {"data": []}

    # Build dimension for each objective
    metric_names = [obj[0] for obj in objectives]
    # Also enrich with secondary metrics available in first solution
    extra_keys = ['fairness_variance', 'fairness_gini', 'utilization', 'sensitivity', 'efficiency']
    all_metrics = metric_names + [k for k in extra_keys if k not in metric_names]

    dims = []
    alpha_vals = [m[1].get('alpha_score', 0) for m in global_pareto]
    for name in all_metrics:
        vals = [m[1].get(name, np.nan) for m in global_pareto]
        clean_vals = [v for v in vals if not (isinstance(v, float) and np.isnan(v))]
        if not clean_vals:
            continue
        dims.append({
            "label": name.replace('_', ' ').title(),
            "values": vals,
            "range": [min(clean_vals), max(clean_vals)]
        })
    if not dims:
        return {"data": []}

    trace = {
        "type": "parcoords",
        "dimensions": dims,
        "line": {
            "color": alpha_vals,
            "colorscale": "Viridis",
            "showscale": True,
            "colorbar": {"title": "Alpha Score"}
        }
    }
    layout = {"title": "Parallel Coordinates – Metric Trade-offs across Pareto Solutions"}
    return {"data": [trace], "layout": layout}


# ----------------------------------------------------------------------
# New graph 13: Sensitivity Heatmap (solutions × metrics)
# ----------------------------------------------------------------------
def get_sensitivity_heatmap_data(global_pareto: List[Tuple]) -> Dict:
    """
    Heatmap: rows = Pareto solutions, cols = key metrics.
    Values are min-max normalized so all metrics are on [0,1].
    """
    if not global_pareto:
        return {"data": []}

    metrics_to_show = [
        'avg_rank_selected', 'alpha_score', 'stability',
        'sensitivity', 'fairness_variance', 'fairness_gini',
        'utilization', 'efficiency'
    ]
    labels = [m.replace('_', ' ').title() for m in metrics_to_show]
    sol_labels = [f"Sol{i+1}" for i in range(len(global_pareto))]

    # Build matrix (solutions × metrics)
    raw = np.full((len(global_pareto), len(metrics_to_show)), np.nan)
    for i, (_, met) in enumerate(global_pareto):
        for j, m in enumerate(metrics_to_show):
            val = met.get(m, np.nan)
            raw[i, j] = float(val) if val is not None else np.nan

    # Min-max normalize each column
    norm = raw.copy()
    for j in range(raw.shape[1]):
        col = raw[:, j]
        valid = col[~np.isnan(col)]
        if len(valid) == 0:
            continue
        col_min, col_max = valid.min(), valid.max()
        if col_max > col_min:
            norm[:, j] = (col - col_min) / (col_max - col_min)
        else:
            norm[:, j] = 0.5

    z = norm.tolist()
    text = [[f"{raw[i,j]:.3f}" if not np.isnan(raw[i,j]) else "N/A"
             for j in range(len(metrics_to_show))]
            for i in range(len(global_pareto))]

    trace = {
        "z": z,
        "x": labels,
        "y": sol_labels,
        "type": "heatmap",
        "colorscale": "Plasma",
        "text": text,
        "texttemplate": "%{text}",
        "colorbar": {"title": "Normalized Value"},
        "zsmooth": False
    }
    layout = {
        "title": "Sensitivity Heatmap – Normalized Metrics per Pareto Solution",
        "xaxis": {"title": "Metric", "tickangle": -30},
        "yaxis": {"title": "Solution"},
        "margin": {"t": 80, "l": 80, "r": 40, "b": 100}
    }
    return {"data": [trace], "layout": layout}