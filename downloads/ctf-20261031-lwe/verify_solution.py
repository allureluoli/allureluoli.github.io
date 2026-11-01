from pathlib import Path
import json

root = Path(__file__).resolve().parent
data = json.loads((root / "samples.json").read_text(encoding="utf-8"))
solution = json.loads((root / "lwe_solution.json").read_text(encoding="utf-8"))
q, n, m = data["q"], data["n"], data["m"]
s, e = solution["s"], solution["e"]
assert len(s) == n and len(e) == m
assert len(data["A"]) == len(data["b"]) == m
assert all(len(row) == n for row in data["A"])
assert set(s) <= {0, 1} and set(e) <= {-1, 0, 1}
residuals = [(sum(a * x for a, x in zip(row, s)) + err - target) % q
             for row, err, target in zip(data["A"], e, data["b"])]
assert all(r == 0 for r in residuals), residuals
print(f"Verified {m}/{m} equations; s weight={sum(s)}")
print("s=" + "".join(map(str, s)))
print("masked_update remains unsolved; no final flag is asserted.")
