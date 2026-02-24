import numpy as np
# (other imports like ortools if needed)
class AllocationSystem:
    def __init__(self, n_agents: int, n_resources: int, n_layers: int,
                 rank_matrices: np.ndarray,
                 compatibility: np.ndarray,
                 capacities: np.ndarray,
                 reliability: np.ndarray,
                 layer_names: List[str] = None):
        self.n_agents = n_agents
        self.n_resources = n_resources
        self.n_layers = n_layers
        self.rank_matrices = rank_matrices
        self.compatibility = compatibility
        self.capacities = capacities
        self.reliability = reliability
        self.layer_names = layer_names if layer_names else [f"Layer{i}" for i in range(n_layers)]
        self.score_matrices = 1 - (rank_matrices - 1) / (n_resources - 1)

    @classmethod
    def generate_synthetic(cls, n_agents=20, n_resources=10, n_layers=3, seed=42):
        np.random.seed(seed)
        rank_mats = []
        for _ in range(n_layers):
            layer_ranks = np.array([np.random.permutation(n_resources) + 1 for _ in range(n_agents)])
            rank_mats.append(layer_ranks)
        rank_mats = np.array(rank_mats)
        compat = np.zeros((n_agents, n_resources), dtype=bool)
        for a in range(n_agents):
            feasible = np.random.choice(n_resources, size=max(1, n_resources//2), replace=False)
            compat[a, feasible] = True
        capacities = np.ones(n_resources, dtype=int)
        reliability = np.random.uniform(0.7, 1.0, size=n_agents)
        return cls(n_agents, n_resources, n_layers, rank_mats, compat, capacities, reliability)

class Allocation:
    def __init__(self, assignment: np.ndarray, system: AllocationSystem):
        self.assignment = assignment.copy()
        self.system = system
        self._hash = None

    def __hash__(self):
        if self._hash is None:
            self._hash = hash(tuple(self.assignment))
        return self._hash

    def __eq__(self, other):
        return np.array_equal(self.assignment, other.assignment)

    def is_feasible(self) -> bool:
        if np.any(self.assignment < -1) or np.any(self.assignment >= self.system.n_resources):
            return False
        assigned_resources = self.assignment[self.assignment >= 0]
        if len(set(assigned_resources)) != len(assigned_resources):
            return False
        for a, r in enumerate(self.assignment):
            if r >= 0 and not self.system.compatibility[a, r]:
                return False
        return True

    def to_dict(self) -> Dict:
        return {f"A{i}": f"R{self.assignment[i]}" if self.assignment[i] >= 0 else None
                for i in range(len(self.assignment))}