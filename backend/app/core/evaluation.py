import time
import numpy as np
import networkx as nx
from typing import Dict, List, Any, Tuple
from .allocation_system import Allocation, AllocationSystem

# --- Evaluation metrics ---
def avg_rank_per_layer(allocation: Allocation, system: AllocationSystem) -> np.ndarray:
    assigned = allocation.assignment >= 0
    if not np.any(assigned):
        return np.full(system.n_layers, np.nan)
    ranks = system.rank_matrices[:, assigned, allocation.assignment[assigned]]
    return np.mean(ranks, axis=1)

def fairness_metrics(allocation: Allocation, system: AllocationSystem, mask: np.ndarray) -> Dict:
    assigned = allocation.assignment >= 0
    if not np.any(assigned):
        return {'variance': np.nan, 'gini': np.nan, 'max_regret': np.nan, 'expected_regret': np.nan}
    if mask.sum() == 0:
        return {'variance': 0.0, 'gini': 0.0, 'max_regret': 0.0, 'expected_regret': 0.0}
    selected = np.where(mask)[0]
    agent_avg_ranks = np.mean(system.rank_matrices[selected, :, :][:, np.arange(system.n_agents), allocation.assignment], axis=0)
    variance = np.var(agent_avg_ranks[assigned])
    scores = 1 - (agent_avg_ranks - 1) / (system.n_resources - 1)
    scores_sorted = np.sort(scores[assigned])
    n = len(scores_sorted)
    if n == 0:
        gini = np.nan
    else:
        gini = (2 * np.sum((np.arange(1, n+1) * scores_sorted)) / (n * np.sum(scores_sorted)) - (n+1)/n)
    best_possible = np.min(system.rank_matrices[selected, :, :], axis=2)
    assigned_ranks = system.rank_matrices[selected, :, :][:, np.arange(system.n_agents), allocation.assignment]
    regrets = assigned_ranks - best_possible
    max_regret = np.max(regrets[:, assigned]) if np.any(assigned) else 0
    expected_regret = np.mean(regrets[:, assigned]) if np.any(assigned) else 0
    return {'variance': variance, 'gini': gini, 'max_regret': max_regret, 'expected_regret': expected_regret}

def utilization(allocation: Allocation, system: AllocationSystem) -> float:
    assigned_resources = allocation.assignment[allocation.assignment >= 0]
    return len(np.unique(assigned_resources)) / system.n_resources

def alpha_score(allocation: Allocation, system: AllocationSystem, mask: np.ndarray) -> int:
    if mask.sum() == 0:
        return 0
    alpha = 0
    for layer in np.where(mask)[0]:
        if is_pareto_optimal_layer(allocation, system, layer):
            alpha += 1
    return alpha

def is_pareto_optimal_layer(allocation: Allocation, system: AllocationSystem, layer: int) -> bool:
    assign = allocation.assignment
    if np.any(assign < 0):
        return False
    G = nx.DiGraph()
    G.add_nodes_from(range(system.n_agents))
    for i in range(system.n_agents):
        r_i = assign[i]
        for j in range(system.n_agents):
            if i == j:
                continue
            r_j = assign[j]
            if system.rank_matrices[layer, i, r_j] < system.rank_matrices[layer, i, r_i]:
                G.add_edge(i, j)
    try:
        cycles = list(nx.simple_cycles(G))
        return len(cycles) == 0
    except nx.NetworkXNoCycle:
        return True

def stability_score(allocation: Allocation, system: AllocationSystem, mask: np.ndarray,
                    samples: int = 50, repair_strategy: str = 'greedy') -> float:
    total_changes = 0
    n_agents = system.n_agents
    for _ in range(samples):
        withdraw = np.random.random(n_agents) > system.reliability
        new_assign = allocation.assignment.copy()
        freed = new_assign[withdraw].copy()
        new_assign[withdraw] = -1
        unassigned = np.where(new_assign == -1)[0]
        available = freed[freed >= 0].tolist()
        used = set(new_assign[new_assign >= 0])
        if repair_strategy == 'greedy' and mask.sum() > 0:
            scores = np.mean(system.score_matrices[mask == 1, :, :], axis=0)
            for a in unassigned:
                feasible = [r for r in available if system.compatibility[a, r] and r not in used]
                if not feasible:
                    continue
                best = feasible[np.argmax(scores[a, feasible])]
                new_assign[a] = best
                used.add(best)
                available.remove(best)
        changes = np.sum(new_assign != allocation.assignment)
        total_changes += changes
    expected_cost = total_changes / samples / n_agents
    stability = 1 - expected_cost
    return stability

def sensitivity_to_noise(allocation: Allocation, system: AllocationSystem, mask: np.ndarray,
                         noise_level: float = 0.1, samples: int = 20) -> float:
    original_alpha = alpha_score(allocation, system, mask)
    count_same = 0
    for s in range(samples):
        noisy_ranks = system.rank_matrices.copy()
        for layer in range(system.n_layers):
            n_swaps = int(noise_level * system.n_agents * system.n_resources)
            for _ in range(n_swaps):
                a = np.random.randint(system.n_agents)
                r1, r2 = np.random.choice(system.n_resources, 2, replace=False)
                noisy_ranks[layer, a, r1], noisy_ranks[layer, a, r2] = noisy_ranks[layer, a, r2], noisy_ranks[layer, a, r1]
        temp_sys = AllocationSystem(system.n_agents, system.n_resources, system.n_layers,
                                    noisy_ranks, system.compatibility, system.capacities,
                                    system.reliability, system.layer_names)
        new_alpha = alpha_score(allocation, temp_sys, mask)
        if new_alpha == original_alpha:
            count_same += 1
    return count_same / samples

def diversity_among_allocations(allocations: List[Allocation]) -> float:
    if len(allocations) < 2:
        return 0.0
    n = len(allocations)
    n_agents = allocations[0].system.n_agents
    dist_sum = 0.0
    count = 0
    for i in range(n):
        for j in range(i+1, n):
            dist = np.sum(allocations[i].assignment != allocations[j].assignment)
            dist_sum += dist
            count += 1
    if count == 0:
        return 0.0
    return dist_sum / (count * n_agents)

def efficiency_score(avg_rank_selected: float, utilization: float) -> float:
    if avg_rank_selected == 0:
        return utilization
    return utilization / avg_rank_selected

def evaluate_allocation(allocation: Allocation, system: AllocationSystem, mask: np.ndarray,
                        timing: bool = False) -> Dict[str, Any]:
    start_time = time.time()
    metrics = {}
    metrics['feasible'] = allocation.is_feasible()
    if not metrics['feasible']:
        metrics['valid'] = False
        return metrics
    metrics['valid'] = True

    per_layer_avg = avg_rank_per_layer(allocation, system)
    for i, name in enumerate(system.layer_names):
        metrics[f'avg_rank_{name}'] = per_layer_avg[i]
    if mask.sum() > 0:
        metrics['avg_rank_selected'] = np.mean(per_layer_avg[mask == 1])
    else:
        metrics['avg_rank_selected'] = np.mean(per_layer_avg)

    fair = fairness_metrics(allocation, system, mask)
    metrics.update({f'fairness_{k}': v for k, v in fair.items()})
    metrics['utilization'] = utilization(allocation, system)
    metrics['alpha_score'] = alpha_score(allocation, system, mask)
    metrics['stability'] = stability_score(allocation, system, mask, samples=30)
    metrics['sensitivity'] = sensitivity_to_noise(allocation, system, mask, samples=10)
    metrics['efficiency'] = efficiency_score(metrics['avg_rank_selected'], metrics['utilization'])
    metrics['constraint_violations'] = 0 if metrics['feasible'] else 1
    if timing:
        metrics['eval_time'] = time.time() - start_time

    return metrics