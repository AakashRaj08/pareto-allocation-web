import numpy as np
from typing import List, Tuple, Dict

# --- Pareto dominance and front ---
def dominates(metrics_a: Dict, metrics_b: Dict, objectives: List[Tuple[str, bool]]) -> bool:
    better_or_equal = True
    strictly_better = False
    for name, minimize in objectives:
        if name not in metrics_a or name not in metrics_b:
            continue
        val_a = metrics_a[name]
        val_b = metrics_b[name]
        if np.isnan(val_a) or np.isnan(val_b):
            continue
        if minimize:
            if val_a > val_b:
                better_or_equal = False
            elif val_a < val_b:
                strictly_better = True
        else:
            if val_a < val_b:
                better_or_equal = False
            elif val_a > val_b:
                strictly_better = True
    return better_or_equal and strictly_better

def pareto_frontier(candidates: List[Tuple[Allocation, Dict]], objectives: List[Tuple[str, bool]]) -> List[Tuple[Allocation, Dict]]:
    nondominated = []
    n = len(candidates)
    for i in range(n):
        dominated = False
        for j in range(n):
            if i == j:
                continue
            if dominates(candidates[j][1], candidates[i][1], objectives):
                dominated = True
                break
        if not dominated:
            nondominated.append(candidates[i])
    return nondominated

# --- Strategy generation ---
def generate_all_masks(n_layers: int) -> List[np.ndarray]:
    masks = []
    for bits in range(1, 1 << n_layers):
        mask = np.array([(bits >> i) & 1 for i in range(n_layers)], dtype=int)
        masks.append(mask)
    return masks