import numpy as np
from typing import List, Optional
from .allocation_system import Allocation, AllocationSystem
import networkx as nx
# --- Candidate generation ---
def serial_dictatorship(system: AllocationSystem, mask: np.ndarray,
                        agent_order: List[int] = None) -> Allocation:
    if agent_order is None:
        agent_order = np.random.permutation(system.n_agents).tolist()
    if mask.sum() == 0:
        scores = np.random.rand(system.n_agents, system.n_resources)
    else:
        scores = np.mean(system.score_matrices[mask == 1, :, :], axis=0)
    scores[~system.compatibility] = -np.inf
    assigned = np.full(system.n_resources, False, dtype=bool)
    assignment = np.full(system.n_agents, -1, dtype=int)
    for a in agent_order:
        feasible = np.where(~assigned & (scores[a] > -np.inf))[0]
        if len(feasible) == 0:
            continue
        best = feasible[np.argmax(scores[a, feasible])]
        assignment[a] = best
        assigned[best] = True
    return Allocation(assignment, system)

def greedy_aggregated(system: AllocationSystem, mask: np.ndarray,
                      weights: np.ndarray = None) -> Allocation:
    if mask.sum() == 0:
        scores = np.random.rand(system.n_agents, system.n_resources)
    else:
        if weights is None:
            weights = np.ones(mask.sum()) / mask.sum()
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
                candidates.append((scores[a, r], a, r))
    candidates.sort(reverse=True)
    for _, a, r in candidates:
        if assignment[a] == -1 and not used[r]:
            assignment[a] = r
            used[r] = True
    return Allocation(assignment, system)

def mincost_flow_allocation(system: AllocationSystem, mask: np.ndarray,
                            cost_type: str = 'rank') -> Allocation:
    if not ORTOOLS_AVAILABLE:
        return greedy_aggregated(system, mask)
    A = system.n_agents
    R = system.n_resources
    start_nodes = []
    end_nodes = []
    capacities = []
    costs = []
    for a in range(A):
        start_nodes.append(0)
        end_nodes.append(1 + a)
        capacities.append(1)
        costs.append(0)
    if mask.sum() == 0:
        cost_matrix = np.zeros((A, R))
    else:
        if cost_type == 'rank':
            cost_matrix = np.mean(system.rank_matrices[mask == 1, :, :], axis=0)
        else:
            score_matrix = np.mean(system.score_matrices[mask == 1, :, :], axis=0)
            cost_matrix = 1 - score_matrix
    for a in range(A):
        for r in range(R):
            if system.compatibility[a, r]:
                start_nodes.append(1 + a)
                end_nodes.append(1 + A + r)
                capacities.append(1)
                costs.append(int(cost_matrix[a, r] * 100))
    for r in range(R):
        start_nodes.append(1 + A + r)
        end_nodes.append(1 + A + R)
        capacities.append(system.capacities[r])
        costs.append(0)
    min_cost_flow = pywrapgraph.SimpleMinCostFlow()
    for i in range(len(start_nodes)):
        min_cost_flow.AddArcWithCapacityAndUnitCost(start_nodes[i], end_nodes[i],
                                                    capacities[i], costs[i])
    min_cost_flow.SetNodeSupply(0, A)
    for a in range(A):
        min_cost_flow.SetNodeSupply(1 + a, 0)
    for r in range(R):
        min_cost_flow.SetNodeSupply(1 + A + r, 0)
    min_cost_flow.SetNodeSupply(1 + A + R, -A)
    status = min_cost_flow.Solve()
    if status != min_cost_flow.OPTIMAL:
        return greedy_aggregated(system, mask)
    assignment = np.full(A, -1, dtype=int)
    for arc in range(min_cost_flow.NumArcs()):
        if min_cost_flow.Tail(arc) > 0 and min_cost_flow.Tail(arc) <= A and min_cost_flow.Flow(arc) > 0:
            agent = min_cost_flow.Tail(arc) - 1
            resource = min_cost_flow.Head(arc) - 1 - A
            assignment[agent] = resource
    return Allocation(assignment, system)

def rank_maximal_matching(system: AllocationSystem, mask: np.ndarray) -> Allocation:
    if mask.sum() == 0:
        return greedy_aggregated(system, mask)
    agg_rank = np.sum(system.rank_matrices[mask == 1, :, :], axis=0)
    agg_rank[~system.compatibility] = 1e9
    assignment = np.full(system.n_agents, -1, dtype=int)
    used = np.full(system.n_resources, False, dtype=bool)
    pairs = []
    for a in range(system.n_agents):
        for r in range(system.n_resources):
            if system.compatibility[a, r]:
                pairs.append((agg_rank[a, r], a, r))
    pairs.sort()
    for _, a, r in pairs:
        if assignment[a] == -1 and not used[r]:
            assignment[a] = r
            used[r] = True
    return Allocation(assignment, system)

def random_feasible(system: AllocationSystem) -> Allocation:
    agents = list(range(system.n_agents))
    np.random.shuffle(agents)
    assignment = np.full(system.n_agents, -1, dtype=int)
    used = np.full(system.n_resources, False, dtype=bool)
    for a in agents:
        feasible = np.where(system.compatibility[a] & ~used)[0]
        if len(feasible) > 0:
            r = np.random.choice(feasible)
            assignment[a] = r
            used[r] = True
    return Allocation(assignment, system)