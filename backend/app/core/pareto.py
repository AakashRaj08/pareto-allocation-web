import numpy as np
from typing import List, Dict, Tuple, Any, Callable, Optional
from .allocation_system import Allocation
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
    # ── Deduplicate by assignment first ──────────────────────────────
    # Multiple algorithms can produce the exact same allocation.
    # Allocation.__eq__ / __hash__ are defined by assignment tuple,
    # so a dict keyed on the Allocation object collapses duplicates.
    seen: dict = {}
    for alloc, met in candidates:
        if alloc not in seen:
            seen[alloc] = (alloc, met)
    unique_candidates = list(seen.values())

    # ── Standard Pareto dominance filter ────────────────────────────
    nondominated = []
    n = len(unique_candidates)
    for i in range(n):
        dominated = False
        for j in range(n):
            if i == j:
                continue
            if dominates(unique_candidates[j][1], unique_candidates[i][1], objectives):
                dominated = True
                break
        if not dominated:
            nondominated.append(unique_candidates[i])
    return nondominated


# --- Strategy generation ---
def generate_all_masks(n_layers: int) -> List[np.ndarray]:
    masks = []
    for bits in range(1, 1 << n_layers):
        mask = np.array([(bits >> i) & 1 for i in range(n_layers)], dtype=int)
        masks.append(mask)
    return masks