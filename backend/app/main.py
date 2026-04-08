from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from typing import List, Optional

# Import your core modules
from app.core.allocation_system import AllocationSystem
from app.core.algorithms import serial_dictatorship, greedy_aggregated, rank_maximal_matching, random_feasible
from app.core.evaluation import evaluate_allocation
from app.core.pareto import pareto_frontier
from app.core.step_logger import build_full_trace
from app.core.visualization import (
    get_pareto_front_2d_data,
    get_pareto_front_3d_data,
    get_alpha_scores_bar_data,
    get_regret_distribution_data,
    get_avg_rank_per_layer_data,
    get_per_agent_satisfaction_data,
    get_stability_convergence_data,
    get_pareto_vs_random_data,
    get_layerwise_rank_correlation_data,
    get_resource_utilization_data,
    get_alpha_sensitivity_data,
    get_parallel_coordinates_data,
    get_sensitivity_heatmap_data,
)

app = FastAPI(title="Pareto Allocation API")

import os
from fastapi.middleware.cors import CORSMiddleware

# CORS setup – allow origins from environment variable
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Endpoint: Get available domains
# ------------------------------------------------------------------------------
@app.get("/domains")
def get_domains():
    """Return the list of supported domains and their configurations."""
    return {
        "disaster": {
            "name": "Disaster Management",
            "layers": [
                {"name": "urgency", "description": "Urgency level (1-5, 1=most urgent)"},
                {"name": "accessibility", "description": "Accessibility score (1-5, 1=easiest)"},
                {"name": "compatibility", "description": "Equipment compatibility"},
                {"name": "population_density", "description": "Affected population"}
            ],
            "resources": ["Medical Kits", "Rescue Gear", "Water Purification", "Food Supplies", "Emergency Shelters"],
            "default_reliability": 0.85
        },
        "renewable": {
            "name": "Renewable Energy Planning",
            "layers": [
                {"name": "solar_potential", "description": "Solar irradiance (kWh/m²/day)"},
                {"name": "compatibility", "description": "Technology compatibility"},
                {"name": "environmental", "description": "Environmental sensitivity"},
                {"name": "cost", "description": "Installation cost"}
            ],
            "resources": ["Fixed-Tilt", "Single-Axis Tracking", "Bifacial Panels"],
            "default_reliability": 0.9
        }
    }

# ------------------------------------------------------------------------------
# Pydantic model for allocation request
# ------------------------------------------------------------------------------
class AllocationRequest(BaseModel):
    n_agents: int
    n_resources: int
    n_layers: int
    rank_matrices: List[List[List[int]]]
    compatibility: List[List[bool]]
    reliability: List[float]
    mask: Optional[List[int]] = None

# ------------------------------------------------------------------------------
# Helper to convert numpy types to Python native types (for JSON serialization)
# ------------------------------------------------------------------------------
def convert_numpy(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_numpy(v) for v in obj]
    elif isinstance(obj, bool):
        return bool(obj)
    else:
        return obj

# ------------------------------------------------------------------------------
# Endpoint: Run allocation and return Pareto front + detailed steps
# ------------------------------------------------------------------------------
@app.post("/allocate")
async def allocate(request: AllocationRequest):
    # Convert to numpy
    rank_matrices = np.array(request.rank_matrices)
    compatibility = np.array(request.compatibility)
    reliability = np.array(request.reliability)
    mask = np.array(request.mask) if request.mask else np.ones(request.n_layers, dtype=int)

    # Create system
    system = AllocationSystem(
        n_agents=request.n_agents,
        n_resources=request.n_resources,
        n_layers=request.n_layers,
        rank_matrices=rank_matrices,
        compatibility=compatibility,
        capacities=np.ones(request.n_resources, dtype=int),
        reliability=reliability,
        layer_names=[f"Layer{i}" for i in range(request.n_layers)]
    )

    # Run the full pipeline with step-by-step logging
    pareto_result, steps = build_full_trace(system, mask)

    # Format pareto front for JSON
    result = []
    for alloc, met in pareto_result:
        alloc_dict = convert_numpy(alloc.to_dict())
        met_dict = convert_numpy({k: v for k, v in met.items() if k not in ['valid', 'feasible']})
        result.append({
            "allocation": alloc_dict,
            "metrics": met_dict
        })

    return {
        "pareto_front": result,
        "steps": convert_numpy(steps),
    }

# ------------------------------------------------------------------------------
# Endpoint: Generate plot data for visualizations
# ------------------------------------------------------------------------------
@app.post("/visualize")
async def visualize(request: AllocationRequest):
    # Convert to numpy
    rank_matrices = np.array(request.rank_matrices)
    compatibility = np.array(request.compatibility)
    reliability = np.array(request.reliability)
    mask = np.array(request.mask) if request.mask else np.ones(request.n_layers, dtype=int)

    # Create system
    system = AllocationSystem(
        n_agents=request.n_agents,
        n_resources=request.n_resources,
        n_layers=request.n_layers,
        rank_matrices=rank_matrices,
        compatibility=compatibility,
        capacities=np.ones(request.n_resources, dtype=int),
        reliability=reliability,
        layer_names=[f"Layer{i}" for i in range(request.n_layers)]
    )

    # --- Generate deterministic algorithm candidates ---
    det_candidates = []
    for _ in range(3):
        det_candidates.append(serial_dictatorship(system, mask))
    det_candidates.append(greedy_aggregated(system, mask))
    det_candidates.append(rank_maximal_matching(system, mask))

    # --- Generate random baseline candidates (kept separate for comparison graph) ---
    random_candidates = []
    for _ in range(5):
        random_candidates.append(random_feasible(system))

    all_candidates = det_candidates + random_candidates

    # --- Evaluate all candidates ---
    evaluated = []         # all valid solutions
    random_eval = []       # only random solutions (for baseline comparison)

    for i, alloc in enumerate(all_candidates):
        metrics = evaluate_allocation(alloc, system, mask)
        if metrics.get('valid'):
            evaluated.append((alloc, metrics))
            if i >= len(det_candidates):     # random candidates
                random_eval.append((alloc, metrics))

    # --- Pareto front from all evaluated ---
    objectives = [('avg_rank_selected', True), ('alpha_score', False), ('stability', False)]
    global_pareto = pareto_frontier(evaluated, objectives)

    # --- Build all plot data ---
    plot_data = {
        # Existing 4 graphs
        "pareto_2d":             convert_numpy(get_pareto_front_2d_data(global_pareto)),
        "pareto_3d":             convert_numpy(get_pareto_front_3d_data(global_pareto)),
        "alpha_scores":          convert_numpy(get_alpha_scores_bar_data(global_pareto)),
        "regret_distribution":   convert_numpy(get_regret_distribution_data(global_pareto, system)),
        # 9 New graphs
        "avg_rank_per_layer":         convert_numpy(get_avg_rank_per_layer_data(global_pareto, system)),
        "per_agent_satisfaction":     convert_numpy(get_per_agent_satisfaction_data(global_pareto, system)),
        "stability_convergence":      convert_numpy(get_stability_convergence_data(global_pareto)),
        "pareto_vs_random":           convert_numpy(get_pareto_vs_random_data(global_pareto, random_eval)),
        "layerwise_rank_correlation": convert_numpy(get_layerwise_rank_correlation_data(global_pareto, system)),
        "resource_utilization":       convert_numpy(get_resource_utilization_data(global_pareto, system)),
        "alpha_sensitivity":          convert_numpy(get_alpha_sensitivity_data(global_pareto)),
        "parallel_coordinates":       convert_numpy(get_parallel_coordinates_data(global_pareto, objectives)),
        "sensitivity_heatmap":        convert_numpy(get_sensitivity_heatmap_data(global_pareto)),
    }

    return plot_data