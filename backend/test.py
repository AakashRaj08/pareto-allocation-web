from app.core.allocation_system import AllocationSystem
from app.core.algorithms import random_feasible
from app.core.evaluation import evaluate_allocation
import numpy as np

# Create a tiny synthetic system
system = AllocationSystem.generate_synthetic(n_agents=3, n_resources=2, n_layers=2)
alloc = random_feasible(system)
metrics = evaluate_allocation(alloc, system, np.ones(2, dtype=int))
print(metrics)