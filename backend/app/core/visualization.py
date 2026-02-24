"""
visualization.py – Generate Plotly-compatible data from allocation results.
"""

import numpy as np
from typing import List, Dict, Any, Tuple

def get_pareto_front_2d_data(global_pareto: List[Tuple], x_metric: str = 'avg_rank_selected', y_metric: str = 'stability') -> Dict:
    """
    Return data for a 2D scatter plot of the Pareto front.
    """
    x_vals = [m[1].get(x_metric, np.nan) for m in global_pareto]
    y_vals = [m[1].get(y_metric, np.nan) for m in global_pareto]
    # Filter out NaN
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
    """Return data for a 3D scatter plot."""
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
    """Bar chart of α‑scores for each Pareto solution."""
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
    """Box plot of per‑agent regret for each Pareto solution."""
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
    # Plotly box traces require data in a specific format: one trace per box, or a list of y values.
    # We'll create one trace with multiple boxes using 'y' and 'name'.
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

def get_resource_utilization_data(all_mask_champions, system) -> Dict:
    """Bar chart of resource usage counts across mask champions."""
    if not all_mask_champions:
        return {"data": []}
    usage = np.zeros(system.n_resources)
    for mask, alloc, met in all_mask_champions:
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
        "title": "Resource Utilization across Mask Champions",
        "xaxis": {"title": "Resource"},
        "yaxis": {"title": "Usage count"}
    }
    return {"data": [trace], "layout": layout}

# Additional plot functions can be added similarly (parallel coordinates, sensitivity, etc.)