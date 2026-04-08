"""
visualization.py – Generate Plotly-compatible data from allocation results.
Includes: 2D/3D Pareto front, α‑score bar chart, regret box plot,
average rank per layer, fairness distribution, parallel coordinates,
and resource utilization.
"""

import numpy as np
from typing import List, Dict, Tuple, Any


# ----------------------------------------------------------------------
# Existing functions (kept as is)
# ----------------------------------------------------------------------
def get_pareto_front_2d_data(global_pareto: List[Tuple], x_metric: str = 'avg_rank_selected', y_metric: str = 'stability') -> Dict:
    x_vals = [m[1].get(x_metric, np.nan) for m in global_pareto]
    y_vals = [m[1].get(y_metric, np.nan) for m in global_pareto]
    valid = [(x, y) for x, y in zip(x_vals, y_vals) if not (np.isnan(x) or np.isnan(y))]
    if not valid:
        return {"data": []}
    x_vals, y_vals = zip(*valid)
    trace = {
        "x": list(x_vals),
        "y": list(y_vals),
        "mode": "markers",
        "type": "scatter",
        "marker": {"color": "red", "size": 10},
        "name": "Pareto solutions"
    }
    layout = {
        "title": f"Pareto Front: {x_metric} vs {y_metric}",
        "xaxis": {"title": x_metric.replace('_', ' ').title()},
        "yaxis": {"title": y_metric.replace('_', ' ').title()}
    }
    return {"data": [trace], "layout": layout}


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
        "marker": {"color": "red", "size": 5},
        "name": "Pareto solutions"
    }
    layout = {
        "title": "Pareto Front (3D)",
        "scene": {
            "xaxis": {"title": x_metric.replace('_', ' ').title()},
            "yaxis": {"title": y_metric.replace('_', ' ').title()},
            "zaxis": {"title": z_metric.replace('_', ' ').title()}
        }
    }
    return {"data": [trace], "layout": layout}


def get_alpha_scores_bar_data(global_pareto: List[Tuple]) -> Dict:
    alphas = [m[1].get('alpha_score', 0) for m in global_pareto]
    labels = [f"Sol{i+1}" for i in range(len(global_pareto))]
    trace = {
        "x": labels,
        "y": alphas,
        "type": "bar",
        "marker": {"color": "skyblue"},
        "name": "α‑score"
    }
    layout = {
        "title": "α‑score across Pareto Solutions",
        "xaxis": {"title": "Pareto Solution"},
        "yaxis": {"title": "α‑score"}
    }
    return {"data": [trace], "layout": layout}


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
            "boxmean": "sd"
        })
    layout = {
        "title": "Regret Distribution across Pareto Solutions",
        "yaxis": {"title": "Average per‑agent regret"},
        "showlegend": False
    }
    return {"data": traces, "layout": layout}


# ----------------------------------------------------------------------
# New functions for missing graphs
# ----------------------------------------------------------------------
def get_avg_rank_per_layer_data(global_pareto: List[Tuple], system) -> Dict:
    """
    Bar chart showing average rank per layer for each Pareto solution.
    Uses the per‑layer average rank stored in metrics (avg_rank_Layer0, etc.).
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
            "marker": {"color": f"hsl({i * 360 / len(global_pareto)}, 70%, 50%)"}
        })
    layout = {
        "title": "Average Rank per Layer",
        "barmode": "group",
        "xaxis": {"title": "Layer"},
        "yaxis": {"title": "Average Rank (lower is better)"}
    }
    return {"data": traces, "layout": layout}


def get_fairness_distribution_data(global_pareto: List[Tuple], system) -> Dict:
    """
    Box plot of per‑agent satisfaction scores (normalized) for each Pareto solution.
    """
    if not global_pareto:
        return {"data": []}
    scores_list = []
    labels = []
    for i, (alloc, met) in enumerate(global_pareto):
        scores = []
        for a in range(system.n_agents):
            r = alloc.assignment[a]
            if r >= 0:
                s = np.mean(system.score_matrices[:, a, r])
                scores.append(s)
            else:
                scores.append(0)
        scores_list.append(scores)
        labels.append(f"Sol{i+1}")
    traces = [{"y": scores, "type": "box", "name": labels[i]} for i, scores in enumerate(scores_list)]
    layout = {
        "title": "Per‑Agent Satisfaction Distribution",
        "yaxis": {"title": "Satisfaction Score (higher is better)"},
        "showlegend": False
    }
    return {"data": traces, "layout": layout}


def get_parallel_coordinates_data(global_pareto: List[Tuple], objectives: List[Tuple[str, bool]]) -> Dict:
    """
    Parallel coordinates plot for all objective metrics.
    objectives: list of (metric_name, minimize_flag) – only metric_name is used.
    """
    if not global_pareto:
        return {"data": []}
    metric_names = [obj[0] for obj in objectives]
    dims = []
    for name in metric_names:
        vals = [m[1].get(name, np.nan) for m in global_pareto]
        # Filter out NaN
        clean_vals = [v for v in vals if not np.isnan(v)]
        if not clean_vals:
            continue
        dims.append({
            "label": name.replace('_', ' ').title(),
            "values": vals,
            "range": [min(clean_vals), max(clean_vals)]
        })
    if not dims:
        return {"data": []}
    trace = {"type": "parcoords", "dimensions": dims}
    layout = {"title": "Parallel Coordinates (Trade‑offs)"}
    return {"data": [trace], "layout": layout}


def get_resource_utilization_data(global_pareto: List[Tuple], system) -> Dict:
    """
    Bar chart showing how many times each resource appears across all Pareto solutions.
    """
    if not global_pareto:
        return {"data": []}
    usage = np.zeros(system.n_resources)
    for alloc, _ in global_pareto:
        for r in alloc.assignment:
            if r >= 0:
                usage[r] += 1
    trace = {
        "x": [f"R{i}" for i in range(system.n_resources)],
        "y": usage.tolist(),
        "type": "bar",
        "marker": {"color": "lightgreen"}
    }
    layout = {
        "title": "Resource Utilization (across Pareto solutions)",
        "xaxis": {"title": "Resource ID"},
        "yaxis": {"title": "Number of times used"}
    }
    return {"data": [trace], "layout": layout}