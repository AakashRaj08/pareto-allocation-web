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
from app.core.visualization import (
    get_pareto_front_2d_data,
    get_pareto_front_3d_data,
    get_alpha_scores_bar_data,
    get_regret_distribution_data,
    get_resource_utilization_data
)

app = FastAPI(title="Pareto Allocation API")

import os
from fastapi.middleware.cors import CORSMiddleware

# ... after creating app ...

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
    else:
        return obj

# ------------------------------------------------------------------------------
# Endpoint: Run allocation and return Pareto front
# ------------------------------------------------------------------------------
@app.post("/allocate")
async def allocate(request: AllocationRequest):
    # Convert to numpy
    rank_matrices = np.array(request.rank_matrices)
    compatibility = np.array(request.compatibility)
    reliability = np.array(request.reliability)
    mask = np.array(request.mask) if request.mask else np.ones(request.n_layers, dtype=int)

    # Debug prints (optional – you can remove them later)
    print("rank_matrices shape:", rank_matrices.shape)
    print("compatibility shape:", compatibility.shape)
    print("reliability length:", len(reliability))
    print("n_agents from request:", request.n_agents)

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

    # Generate candidates (simplified – you can expand this)
    candidates = []
    for _ in range(3):
        candidates.append(serial_dictatorship(system, mask))
    candidates.append(greedy_aggregated(system, mask))
    candidates.append(rank_maximal_matching(system, mask))
    for _ in range(2):
        candidates.append(random_feasible(system))

    # Evaluate
    evaluated = []
    for alloc in candidates:
        metrics = evaluate_allocation(alloc, system, mask)
        if metrics.get('valid'):
            evaluated.append((alloc, metrics))

    # Pareto front
    objectives = [('avg_rank_selected', True), ('alpha_score', False), ('stability', False)]
    pareto = pareto_frontier(evaluated, objectives)

    # Format response with numpy conversion
    result = []
    for alloc, met in pareto:
        alloc_dict = convert_numpy(alloc.to_dict())
        met_dict = convert_numpy({k: v for k, v in met.items() if k not in ['valid', 'feasible']})
        result.append({
            "allocation": alloc_dict,
            "metrics": met_dict
        })

    return {"pareto_front": result}

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

    # Generate candidates (same as in /allocate)
    candidates = []
    for _ in range(3):
        candidates.append(serial_dictatorship(system, mask))
    candidates.append(greedy_aggregated(system, mask))
    candidates.append(rank_maximal_matching(system, mask))
    for _ in range(2):
        candidates.append(random_feasible(system))

    # Evaluate
    evaluated = []
    for alloc in candidates:
        metrics = evaluate_allocation(alloc, system, mask)
        if metrics.get('valid'):
            evaluated.append((alloc, metrics))

    # Pareto front
    objectives = [('avg_rank_selected', True), ('alpha_score', False), ('stability', False)]
    global_pareto = pareto_frontier(evaluated, objectives)

    # Generate plot data using the visualization functions
    plot_data = {
        "pareto_2d": get_pareto_front_2d_data(global_pareto),
        "pareto_3d": get_pareto_front_3d_data(global_pareto),
        "alpha_scores": get_alpha_scores_bar_data(global_pareto),
        "regret_distribution": get_regret_distribution_data(global_pareto, system),
        # "resource_utilization": get_resource_utilization_data(all_mask_champions, system) # requires all_mask_champions – we omit for now
    }

    return plot_data