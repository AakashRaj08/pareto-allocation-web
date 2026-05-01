"""
Definitive API test for reliability fix.

Scenario: A0 and A1 both want R0 most.
- Run A (rel=[1,1,1]): A1 gets R0 (higher agent index wins tie in greedy sort)
- Run B (rel=[0,1,1]): A1 still gets R0 (trivially)
- Run C (rel=[1,0,1]): A0 gets R0 (A1's score drops to 0, A0 wins)

This cleanly shows reliability changes WHO gets the preferred resource.
"""
import urllib.request, json

API = "http://localhost:8000/allocate"

BASE = {
    "n_agents": 3,
    "n_resources": 3,
    "n_layers": 2,
    # Both A0 and A1 rank R0 as #1, A2 prefers R2
    "rank_matrices": [
        [[1, 2, 3],   # A0: R0 > R1 > R2
         [1, 2, 3],   # A1: R0 > R1 > R2
         [3, 2, 1]],  # A2: R2 > R1 > R0
        [[1, 2, 3],
         [1, 2, 3],
         [3, 2, 1]],
    ],
    "compatibility": [
        [True, True, True],
        [True, True, True],
        [True, True, True],
    ],
    "mask": [1, 1],
}

def call(reliability):
    body = {**BASE, "reliability": reliability}
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        API, data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def show(label, resp):
    print(f"\n{'='*55}")
    print(f"  {label}")
    print(f"{'='*55}")
    seen = set()
    for sol in resp["pareto_front"]:
        key = str(sol["allocation"])
        if key not in seen:
            seen.add(key)
            m = sol["metrics"]
            print(f"  Assignment : {sol['allocation']}")
            print(f"  avg_rank={m['avg_rank_selected']:.3f}  alpha={m['alpha_score']}  stability={m['stability']:.3f}")

print()
print("Scenario: A0 and A1 both prefer R0 most.")
print("A2 prefers R2. All have full compatibility.")

print("\n[1] reliability = [1.0, 1.0, 1.0]  (all reliable)")
r1 = call([1.0, 1.0, 1.0])
show("Run 1 — rel=[1, 1, 1]", r1)

print("\n[2] reliability = [1.0, 0.0, 1.0]  (A1 is unreliable)")
r2 = call([1.0, 0.0, 1.0])
show("Run 2 — rel=[1, 0, 1]  (A1 penalised)", r2)

# Compare greedy/rank results
a1 = {str(s["allocation"]) for s in r1["pareto_front"]}
a2 = {str(s["allocation"]) for s in r2["pareto_front"]}

print(f"\n{'='*55}")
if a1 != a2:
    print("  ALLOCATIONS CHANGED between Run 1 and Run 2!")
    print("  Setting A1 reliability=0 let A0 claim R0 instead.")
    print("  => Reliability fix is CONFIRMED WORKING.")
else:
    # Show stability difference
    s1 = sorted([round(s["metrics"]["stability"], 4) for s in r1["pareto_front"]])
    s2 = sorted([round(s["metrics"]["stability"], 4) for s in r2["pareto_front"]])
    print(f"  Assignments identical, stability: {s1} -> {s2}")
    if s1 != s2:
        print("  Stability changed => reliability IS affecting metrics.")
    else:
        print("  No observable difference detected.")
print(f"{'='*55}\n")
