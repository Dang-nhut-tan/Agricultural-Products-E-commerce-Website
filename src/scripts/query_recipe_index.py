import json
import sys
from pathlib import Path

import faiss
import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

root = Path(__file__).resolve().parents[2]
data_dir = root / "data" / "recipes"
index_path = data_dir / "recipes.faiss"
metadata_path = data_dir / "recipes.json"

if not index_path.exists() or not metadata_path.exists():
    print("Hãy chạy `npm run recipes:index` để tạo chỉ mục FAISS.", file=sys.stderr)
    raise SystemExit(2)

vector = np.asarray(json.load(sys.stdin), dtype="float32").reshape(1, -1)
faiss.normalize_L2(vector)
index = faiss.read_index(str(index_path))
if vector.shape[1] != index.d:
    print(f"Embedding có {vector.shape[1]} chiều nhưng index có {index.d} chiều.", file=sys.stderr)
    raise SystemExit(3)

metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
limit = min(max(int(sys.argv[1]) if len(sys.argv) > 1 else 5, 1), 10)
scores, ids = index.search(vector, limit)
results = []
for score, item_id in zip(scores[0], ids[0]):
    if 0 <= item_id < len(metadata):
        results.append({**metadata[item_id], "score": float(score)})
print(json.dumps(results, ensure_ascii=False))
