"""
step_logger.py
Generates a detailed trace of every step in the allocation pipeline,
including algorithm iterations, evaluation formulas, and Pareto comparisons.
"""
import numpy as np
from typing import List, Dict, Any, Tuple
from .allocation_system import AllocationSystem, Allocation
from .evaluation import (
    avg_rank_per_layer, fairness_metrics, utilization,
    alpha_score, is_pareto_optimal_layer, stability_score,
    sensitivity_to_noise, efficiency_score
)
from .pareto import dominates


def _fmt(v, decimals=4):
    """Format a number for display."""
    if isinstance(v, (float, np.floating)):
        if np.isnan(v):
            return "NaN"
        return round(float(v), decimals)
    if isinstance(v, (int, np.integer)):
        return int(v)
    return v


def _mat_to_list(m):
    """Convert a 2D numpy array to a list-of-lists of native ints/floats."""
    return [[_fmt(m[i, j]) for j in range(m.shape[1])] for i in range(m.shape[0])]


# ─── Step 1: System Setup ─────────────────────────────────────────────────────
def log_system_setup(system: AllocationSystem, mask: np.ndarray) -> Dict:
    score_matrices = []
    for l in range(system.n_layers):
        score_matrices.append({
            "layer": system.layer_names[l],
            "scores": _mat_to_list(system.score_matrices[l])
        })
    return {
        "title": "System Initialization",
        "type": "setup",
        "details": {
            "n_agents": system.n_agents,
            "n_resources": system.n_resources,
            "n_layers": system.n_layers,
            "layer_names": system.layer_names,
            "mask": mask.tolist(),
            "active_layers": [system.layer_names[i] for i in range(system.n_layers) if mask[i]],
            "rank_matrices": [
                {"layer": system.layer_names[l], "ranks": _mat_to_list(system.rank_matrices[l])}
                for l in range(system.n_layers)
            ],
            "score_formula": "score[a,r] = 1 − (rank[a,r] − 1) / (n_resources − 1)",
            "score_matrices": score_matrices,
            "compatibility": _mat_to_list(system.compatibility.astype(int)),
            "reliability": [_fmt(r) for r in system.reliability],
        }
    }


# ─── Step 2: Algorithm Traces ──────────────────────────────────────────────────
def log_serial_dictatorship(system: AllocationSystem, mask: np.ndarray) -> Tuple[Allocation, Dict]:
    """Run Serial Dictatorship with full iteration logging."""
    agent_order = np.random.permutation(system.n_agents).tolist()

    if mask.sum() == 0:
        scores = np.random.rand(system.n_agents, system.n_resources)
    else:
        scores = np.mean(system.score_matrices[mask == 1, :, :], axis=0)

    scores_copy = scores.copy()
    scores_copy[~system.compatibility] = -np.inf

    assigned = np.full(system.n_resources, False, dtype=bool)
    assignment = np.full(system.n_agents, -1, dtype=int)
    iterations = []

    for step_idx, a in enumerate(agent_order):
        feasible = np.where(~assigned & (scores_copy[a] > -np.inf))[0]
        iter_info = {
            "step": step_idx + 1,
            "agent": f"A{a}",
            "scores": {f"R{r}": _fmt(scores_copy[a, r]) for r in range(system.n_resources) if scores_copy[a, r] > -np.inf},
            "feasible_resources": [f"R{r}" for r in feasible],
        }
        if len(feasible) == 0:
            iter_info["action"] = "No feasible resource → skipped"
            iter_info["assigned"] = None
        else:
            best = feasible[np.argmax(scores_copy[a, feasible])]
            assignment[a] = best
            assigned[best] = True
            iter_info["best_score"] = _fmt(scores_copy[a, best])
            iter_info["action"] = f"Assign A{a} → R{best} (score={_fmt(scores_copy[a, best])})"
            iter_info["assigned"] = f"R{best}"
        iterations.append(iter_info)

    alloc = Allocation(assignment, system)
    log = {
        "title": "Serial Dictatorship",
        "type": "algorithm",
        "details": {
            "description": "Agents pick their best available resource in a random priority order.",
            "formula": "score(a,r) = mean of score_matrices over active layers",
            "agent_order": [f"A{a}" for a in agent_order],
            "aggregated_scores": _mat_to_list(scores),
            "iterations": iterations,
            "final_assignment": {f"A{i}": f"R{assignment[i]}" if assignment[i] >= 0 else "—" for i in range(system.n_agents)},
        }
    }
    return alloc, log


def log_greedy_aggregated(system: AllocationSystem, mask: np.ndarray) -> Tuple[Allocation, Dict]:
    """Run Greedy Aggregated with full tuple-sort logging."""
    if mask.sum() == 0:
        scores = np.random.rand(system.n_agents, system.n_resources)
        weights = None
    else:
        weights = np.ones(int(mask.sum())) / mask.sum()
        selected = np.where(mask)[0]
        scores = np.zeros((system.n_agents, system.n_resources))
        for idx, lay in enumerate(selected):
            scores += weights[idx] * system.score_matrices[lay]

    scores[~system.compatibility] = -np.inf
    assignment = np.full(system.n_agents, -1, dtype=int)
    used = np.full(system.n_resources, False, dtype=bool)

    candidates = []
    for a in range(system.n_agents):
        for r in range(system.n_resources):
            if scores[a, r] > -np.inf:
                candidates.append((_fmt(scores[a, r]), a, r))
    candidates.sort(reverse=True)

    iterations = []
    for step_idx, (score, a, r) in enumerate(candidates):
        iter_info = {
            "step": step_idx + 1,
            "tuple": f"(score={score}, A{a}, R{r})",
        }
        if assignment[a] == -1 and not used[r]:
            assignment[a] = r
            used[r] = True
            iter_info["action"] = f"Assign A{a} → R{r}"
            iter_info["accepted"] = True
        else:
            reasons = []
            if assignment[a] != -1:
                reasons.append(f"A{a} already assigned")
            if used[r]:
                reasons.append(f"R{r} already used")
            iter_info["action"] = f"Skip ({', '.join(reasons)})"
            iter_info["accepted"] = False
        iterations.append(iter_info)
        # Stop logging after all assigned
        if np.all(assignment >= 0):
            iterations.append({"step": step_idx + 2, "action": "All agents assigned — stopping early", "accepted": None})
            break

    alloc = Allocation(assignment, system)
    log = {
        "title": "Greedy Aggregated",
        "type": "algorithm",
        "details": {
            "description": "Build all (score, agent, resource) tuples, sort by score descending, and greedily assign.",
            "formula": "score(a,r) = Σ w_l × score_l(a,r) over active layers",
            "weights": [_fmt(w) for w in weights] if weights is not None else "uniform random",
            "aggregated_scores": _mat_to_list(scores),
            "total_tuples": len(candidates),
            "iterations": iterations[:30],  # cap display at 30 steps
            "final_assignment": {f"A{i}": f"R{assignment[i]}" if assignment[i] >= 0 else "—" for i in range(system.n_agents)},
        }
    }
    return alloc, log


def log_rank_maximal(system: AllocationSystem, mask: np.ndarray) -> Tuple[Allocation, Dict]:
    """Run Rank-Maximal Matching with logging."""
    if mask.sum() == 0:
        alloc, glog = log_greedy_aggregated(system, mask)
        glog["title"] = "Rank-Maximal Matching (fallback to Greedy)"
        return alloc, glog

    agg_rank = np.sum(system.rank_matrices[mask == 1, :, :], axis=0)
    agg_rank_display = agg_rank.copy()
    agg_rank[~system.compatibility] = 1e9

    assignment = np.full(system.n_agents, -1, dtype=int)
    used = np.full(system.n_resources, False, dtype=bool)
    pairs = []
    for a in range(system.n_agents):
        for r in range(system.n_resources):
            if system.compatibility[a, r]:
                pairs.append((_fmt(agg_rank[a, r]), a, r))
    pairs.sort()

    iterations = []
    for step_idx, (rank_val, a, r) in enumerate(pairs):
        iter_info = {
            "step": step_idx + 1,
            "tuple": f"(agg_rank={rank_val}, A{a}, R{r})",
        }
        if assignment[a] == -1 and not used[r]:
            assignment[a] = r
            used[r] = True
            iter_info["action"] = f"Assign A{a} → R{r}"
            iter_info["accepted"] = True
        else:
            reasons = []
            if assignment[a] != -1:
                reasons.append(f"A{a} already assigned")
            if used[r]:
                reasons.append(f"R{r} already used")
            iter_info["action"] = f"Skip ({', '.join(reasons)})"
            iter_info["accepted"] = False
        iterations.append(iter_info)
        if np.all(assignment >= 0):
            iterations.append({"step": step_idx + 2, "action": "All agents assigned", "accepted": None})
            break

    alloc = Allocation(assignment, system)
    log = {
        "title": "Rank-Maximal Matching",
        "type": "algorithm",
        "details": {
            "description": "Aggregate ranks across active layers, sort ascending, greedily matching to minimise total rank.",
            "formula": "agg_rank(a,r) = Σ rank_l(a,r) for l in active layers",
            "aggregated_ranks": _mat_to_list(agg_rank_display),
            "total_pairs": len(pairs),
            "iterations": iterations[:30],
            "final_assignment": {f"A{i}": f"R{assignment[i]}" if assignment[i] >= 0 else "—" for i in range(system.n_agents)},
        }
    }
    return alloc, log


def log_random_feasible(system: AllocationSystem, run_idx: int) -> Tuple[Allocation, Dict]:
    """Run Random Feasible with logging."""
    agents = list(range(system.n_agents))
    np.random.shuffle(agents)
    assignment = np.full(system.n_agents, -1, dtype=int)
    used = np.full(system.n_resources, False, dtype=bool)
    iterations = []

    for step_idx, a in enumerate(agents):
        feasible = np.where(system.compatibility[a] & ~used)[0]
        iter_info = {
            "step": step_idx + 1,
            "agent": f"A{a}",
            "feasible": [f"R{r}" for r in feasible],
        }
        if len(feasible) > 0:
            r = np.random.choice(feasible)
            assignment[a] = r
            used[r] = True
            iter_info["action"] = f"Random pick → A{a} → R{int(r)}"
            iter_info["assigned"] = f"R{int(r)}"
        else:
            iter_info["action"] = "No feasible resource"
            iter_info["assigned"] = None
        iterations.append(iter_info)

    alloc = Allocation(assignment, system)
    log = {
        "title": f"Random Feasible (run {run_idx})",
        "type": "algorithm",
        "details": {
            "description": "Agents in random order; each picks uniformly at random from compatible & unused resources.",
            "agent_order": [f"A{a}" for a in agents],
            "iterations": iterations,
            "final_assignment": {f"A{i}": f"R{assignment[i]}" if assignment[i] >= 0 else "—" for i in range(system.n_agents)},
        }
    }
    return alloc, log


# ─── Step 3: Evaluation Trace ─────────────────────────────────────────────────
def log_evaluation(alloc: Allocation, system: AllocationSystem, mask: np.ndarray, label: str) -> Tuple[Dict, Dict]:
    """Evaluate an allocation and produce a detailed calculation trace."""
    steps = []

    # Feasibility
    is_feas = alloc.is_feasible()
    steps.append({
        "metric": "Feasibility Check",
        "formula": "No duplicate resources; all assignments compatible",
        "result": is_feas,
    })
    if not is_feas:
        return {"valid": False}, {
            "title": f"Evaluation — {label}",
            "type": "evaluation",
            "details": {"steps": steps, "verdict": "INVALID — not feasible"}
        }

    assign = alloc.assignment
    assigned_mask = assign >= 0

    # Per-layer average rank
    per_layer = avg_rank_per_layer(alloc, system)
    steps.append({
        "metric": "Per-Layer Avg Rank",
        "formula": "avg_rank_l = mean(rank_l[a, assignment[a]] for assigned agents)",
        "values": {system.layer_names[l]: _fmt(per_layer[l]) for l in range(system.n_layers)},
    })

    # Avg rank selected
    if mask.sum() > 0:
        avg_sel = float(np.mean(per_layer[mask == 1]))
    else:
        avg_sel = float(np.mean(per_layer))
    steps.append({
        "metric": "Avg Rank (Selected Layers)",
        "formula": "mean of per-layer avg ranks over active layers",
        "calculation": f"mean({[_fmt(per_layer[l]) for l in range(system.n_layers) if mask[l]]}) = {_fmt(avg_sel)}",
        "result": _fmt(avg_sel),
    })

    # Fairness
    fair = fairness_metrics(alloc, system, mask)
    steps.append({
        "metric": "Fairness Metrics",
        "formulas": {
            "variance": "Var(agent_avg_ranks)",
            "gini": "Gini coefficient of normalized scores",
            "max_regret": "max(assigned_rank − best_possible_rank)",
            "expected_regret": "mean(assigned_rank − best_possible_rank)",
        },
        "results": {k: _fmt(v) for k, v in fair.items()},
    })

    # Utilization
    util = utilization(alloc, system)
    n_unique = len(np.unique(assign[assigned_mask]))
    steps.append({
        "metric": "Utilization",
        "formula": "unique_resources_assigned / total_resources",
        "calculation": f"{n_unique} / {system.n_resources} = {_fmt(util)}",
        "result": _fmt(util),
    })

    # Alpha score
    a_score = alpha_score(alloc, system, mask)
    alpha_details = []
    for layer_idx in np.where(mask)[0]:
        is_opt = is_pareto_optimal_layer(alloc, system, layer_idx)
        alpha_details.append({
            "layer": system.layer_names[layer_idx],
            "pareto_optimal": is_opt,
        })
    steps.append({
        "metric": "α-Score (Alpha Score)",
        "formula": "Count of active layers where allocation is Pareto-optimal (no improving exchange cycles)",
        "per_layer": alpha_details,
        "result": a_score,
    })

    # Stability
    stab = stability_score(alloc, system, mask, samples=30)
    steps.append({
        "metric": "Stability Score",
        "formula": "1 − (avg_reassignments / n_agents) over 30 Monte Carlo disruption simulations",
        "result": _fmt(stab),
    })

    # Sensitivity
    sens = sensitivity_to_noise(alloc, system, mask, samples=10)
    steps.append({
        "metric": "Sensitivity to Noise",
        "formula": "Fraction of 10 perturbed rank samples where α-score stays unchanged",
        "result": _fmt(sens),
    })

    # Efficiency
    eff = efficiency_score(avg_sel, util)
    steps.append({
        "metric": "Efficiency",
        "formula": "utilization / avg_rank_selected",
        "calculation": f"{_fmt(util)} / {_fmt(avg_sel)} = {_fmt(eff)}",
        "result": _fmt(eff),
    })

    # Collect metrics dict (matches evaluate_allocation output)
    metrics = {
        "valid": True, "feasible": True,
        "avg_rank_selected": avg_sel,
        "alpha_score": a_score,
        "stability": stab,
        "utilization": util,
        "sensitivity": sens,
        "efficiency": eff,
        "fairness_variance": fair["variance"],
        "fairness_gini": fair["gini"],
        "fairness_max_regret": fair["max_regret"],
        "fairness_expected_regret": fair["expected_regret"],
    }
    for i, name in enumerate(system.layer_names):
        metrics[f"avg_rank_{name}"] = per_layer[i]

    log_entry = {
        "title": f"Evaluation — {label}",
        "type": "evaluation",
        "details": {
            "allocation": {f"A{i}": f"R{assign[i]}" if assign[i] >= 0 else "—" for i in range(system.n_agents)},
            "steps": steps,
        }
    }
    return metrics, log_entry


# ─── Step 4: Pareto Dominance Trace ────────────────────────────────────────────
def log_pareto_filtering(evaluated: List[Tuple[int, Dict]], objectives) -> Tuple[List[int], Dict]:
    """
    Log the Pareto dominance comparison.
    `evaluated` = list of (index, metrics) pairs.
    Returns surviving indices + log entry.
    """
    n = len(evaluated)
    comparisons = []
    dominated_set = set()

    for i in range(n):
        idx_i, met_i = evaluated[i]
        for j in range(n):
            if i == j:
                continue
            idx_j, met_j = evaluated[j]
            if dominates(met_j, met_i, objectives):
                dominated_set.add(idx_i)
                obj_vals_i = {name: _fmt(met_i.get(name, None)) for name, _ in objectives}
                obj_vals_j = {name: _fmt(met_j.get(name, None)) for name, _ in objectives}
                comparisons.append({
                    "dominated": f"C{idx_i + 1}",
                    "by": f"C{idx_j + 1}",
                    "values_dominated": obj_vals_i,
                    "values_dominator": obj_vals_j,
                })
                break  # already dominated, skip rest

    survivors = [idx for idx, _ in evaluated if idx not in dominated_set]

    log_entry = {
        "title": "Pareto Dominance Filtering",
        "type": "pareto",
        "details": {
            "objectives": [
                {"name": name, "direction": "minimize" if minimize else "maximize"}
                for name, minimize in objectives
            ],
            "total_candidates": n,
            "dominated_count": len(dominated_set),
            "survivor_count": len(survivors),
            "survivors": [f"C{s + 1}" for s in survivors],
            "comparisons": comparisons,
        }
    }
    return survivors, log_entry


# ─── Master: Build Full Trace ──────────────────────────────────────────────────
def build_full_trace(system: AllocationSystem, mask: np.ndarray) -> Tuple[List, List]:
    """
    Run the entire pipeline with step-by-step logging.
    Returns (pareto_result, steps_log).
    """
    steps = []

    # ── Step 1: System setup
    steps.append(log_system_setup(system, mask))

    # ── Step 2: Run algorithms with logging
    allocations = []
    labels = []

    for run in range(3):
        alloc, log = log_serial_dictatorship(system, mask)
        log["title"] = f"Serial Dictatorship (run {run + 1})"
        steps.append(log)
        allocations.append(alloc)
        labels.append(f"SD-{run + 1}")

    alloc, log = log_greedy_aggregated(system, mask)
    steps.append(log)
    allocations.append(alloc)
    labels.append("Greedy")

    alloc, log = log_rank_maximal(system, mask)
    steps.append(log)
    allocations.append(alloc)
    labels.append("RankMax")

    for run in range(2):
        alloc, log = log_random_feasible(system, run + 1)
        steps.append(log)
        allocations.append(alloc)
        labels.append(f"Rand-{run + 1}")

    # ── Step 3: Evaluate each
    evaluated = []
    for i, (alloc, label) in enumerate(zip(allocations, labels)):
        metrics, eval_log = log_evaluation(alloc, system, mask, f"C{i + 1} ({label})")
        steps.append(eval_log)
        if metrics.get("valid"):
            evaluated.append((i, metrics, alloc))

    # ── Step 4: Pareto filtering
    objectives = [('avg_rank_selected', True), ('alpha_score', False), ('stability', False)]
    eval_pairs = [(idx, met) for idx, met, _ in evaluated]
    survivors, pareto_log = log_pareto_filtering(eval_pairs, objectives)
    steps.append(pareto_log)

    # ── Step 5: Final result summary
    pareto_result = []
    for idx, met, alloc in evaluated:
        if idx in survivors:
            pareto_result.append((alloc, met))

    summary_solutions = []
    for sol_idx, (alloc, met) in enumerate(pareto_result):
        summary_solutions.append({
            "solution": f"Sol {sol_idx + 1}",
            "assignment": {f"A{i}": f"R{alloc.assignment[i]}" if alloc.assignment[i] >= 0 else "—" for i in range(system.n_agents)},
            "key_metrics": {
                "avg_rank_selected": _fmt(met.get("avg_rank_selected")),
                "alpha_score": _fmt(met.get("alpha_score")),
                "stability": _fmt(met.get("stability")),
                "utilization": _fmt(met.get("utilization")),
                "efficiency": _fmt(met.get("efficiency")),
            }
        })

    steps.append({
        "title": "Final Pareto Front",
        "type": "result",
        "details": {
            "n_solutions": len(pareto_result),
            "solutions": summary_solutions,
        }
    })

    return pareto_result, steps
