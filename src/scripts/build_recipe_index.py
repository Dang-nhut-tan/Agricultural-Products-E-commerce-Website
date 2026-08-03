"""OCR the scanned cookbook with Gemini, then build a local FAISS index.

The script checkpoints after every PDF batch. Re-running continues from the last
page. Use --reset to rebuild and --max-pages for a low-cost smoke test.
"""
import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import faiss
import numpy as np
from pypdf import PdfReader

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "recipes"
CHECKPOINT = DATA / "ocr-checkpoint.json"
METADATA = DATA / "recipes.json"
INDEX = DATA / "recipes.faiss"


def load_env():
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for raw in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def api(endpoint, payload, attempts=8):
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("Gemini_key")
    if not key:
        raise RuntimeError("Thiếu GEMINI_API_KEY trong .env")
    request = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/{endpoint}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")
            if error.code not in (429, 500, 502, 503) or attempt == attempts - 1:
                raise RuntimeError(f"Gemini HTTP {error.code}: {detail[:500]}") from error
            retry_match = re.search(r"retry in ([0-9.]+)s", detail, re.IGNORECASE)
            retry_after = float(retry_match.group(1)) + 2 if retry_match else 0
            time.sleep(min(max(retry_after, 2 ** attempt * 3), 60))


def extract_batch(reader, start, end, model):
    parts = [{"text": """Các ảnh sau là các trang liên tiếp của sách món Việt. OCR và trích tất cả công thức nhìn thấy. Ghép nội dung bị nối qua trang. Bỏ mục lục, lời nói đầu và quảng cáo. Không tự bịa phần không đọc được. Trả JSON gồm recipes; mỗi công thức có name, aliases, ingredients (mảng chuỗi), steps (mảng chuỗi), safetyNotes (mảng chuỗi), sourcePages (mảng số trang)."""}]
    for page_index in range(start, end):
        images = reader.pages[page_index].images
        if not images:
            continue
        image = images[0]
        mime = "image/jpeg" if image.name.lower().endswith(("jpg", "jpeg")) else "image/png"
        parts.extend([
            {"text": f"Trang PDF {page_index + 1}:"},
            {"inlineData": {"mimeType": mime, "data": base64.b64encode(image.data).decode()}},
        ])
    schema = {"type": "object", "properties": {"recipes": {"type": "array", "items": {"type": "object", "properties": {
        "name": {"type": "string"}, "aliases": {"type": "array", "items": {"type": "string"}},
        "ingredients": {"type": "array", "items": {"type": "string"}},
        "steps": {"type": "array", "items": {"type": "string"}},
        "safetyNotes": {"type": "array", "items": {"type": "string"}},
        "sourcePages": {"type": "array", "items": {"type": "integer"}},
    }, "required": ["name", "aliases", "ingredients", "steps", "safetyNotes", "sourcePages"]}}}, "required": ["recipes"]}
    response = api(f"models/{model}:generateContent", {"contents": [{"parts": parts}], "generationConfig": {
        "temperature": 0, "responseMimeType": "application/json", "responseSchema": schema,
    }})
    candidate = (response.get("candidates") or [{}])[0]
    parts_out = candidate.get("content", {}).get("parts", [])
    text = next((part["text"] for part in parts_out if "text" in part), None)
    if not text:
        raise RuntimeError(f"Gemini không trả OCR (finishReason={candidate.get('finishReason', 'unknown')})")
    return json.loads(text)["recipes"]


def dedupe(recipes):
    result = {}
    for recipe in recipes:
        key = " ".join(recipe.get("name", "").lower().split())
        if not key or not recipe.get("ingredients") or not recipe.get("steps"):
            continue
        current = result.get(key)
        if not current or len(json.dumps(recipe, ensure_ascii=False)) > len(json.dumps(current, ensure_ascii=False)):
            result[key] = recipe
    return list(result.values())


def embed(recipes, model):
    vectors = []
    for offset in range(0, len(recipes), 40):
        chunk = recipes[offset:offset + 40]
        requests = []
        for recipe in chunk:
            text = f"{recipe['name']}\n" + "\n".join(recipe.get("aliases", []) + recipe["ingredients"] + recipe["steps"])
            requests.append({"model": f"models/{model}", "content": {"parts": [{"text": text}]}, "taskType": "RETRIEVAL_DOCUMENT", "outputDimensionality": 768})
        response = api(f"models/{model}:batchEmbedContents", {"requests": requests})
        vectors.extend(item["values"] for item in response["embeddings"])
        print(f"Embedding {min(offset + len(chunk), len(recipes))}/{len(recipes)}", flush=True)
    matrix = np.asarray(vectors, dtype="float32")
    faiss.normalize_L2(matrix)
    index = faiss.IndexFlatIP(matrix.shape[1])
    index.add(matrix)
    return index


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=6)
    parser.add_argument("--max-pages", type=int)
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()
    load_env()
    DATA.mkdir(parents=True, exist_ok=True)
    pdfs = list((ROOT / "src" / "pdf").glob("*.pdf"))
    if not pdfs:
        raise RuntimeError("Không tìm thấy PDF trong src/pdf")
    reader = PdfReader(str(pdfs[0]))
    end_page = min(len(reader.pages), args.max_pages or len(reader.pages))
    checkpoint = {"nextPage": 0, "recipes": []}
    if CHECKPOINT.exists() and not args.reset:
        checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    text_model = os.environ.get("GEMINI_TEXT_MODEL", "gemini-3.5-flash")
    for start in range(checkpoint["nextPage"], end_page, args.batch_size):
        end = min(start + args.batch_size, end_page)
        while True:
            try:
                found = extract_batch(reader, start, end, text_model)
                break
            except Exception as rate_error:
                if "HTTP 429" not in str(rate_error):
                    batch_error = rate_error
                    break
                print(f"Đang chờ quota Gemini cho trang {start + 1}-{end}…", flush=True)
                time.sleep(60)
        if 'batch_error' in locals():
            print(f"Batch trang {start + 1}-{end} lỗi ({batch_error}); thử từng trang.", flush=True)
            found = []
            for page in range(start, end):
                while True:
                    try:
                        found.extend(extract_batch(reader, page, page + 1, text_model))
                        break
                    except Exception as page_error:
                        if "HTTP 429" in str(page_error):
                            print(f"Đang chờ quota Gemini cho trang {page + 1}…", flush=True)
                            time.sleep(60)
                            continue
                        print(f"Bỏ qua trang {page + 1}: {page_error}", file=sys.stderr, flush=True)
                        break
            del batch_error
        checkpoint["recipes"].extend(found)
        checkpoint["nextPage"] = end
        CHECKPOINT.write_text(json.dumps(checkpoint, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"OCR trang {start + 1}-{end}: +{len(found)} công thức", flush=True)
    recipes = dedupe(checkpoint["recipes"])
    if not recipes:
        raise RuntimeError("Chưa tìm thấy công thức trong phạm vi trang đã quét; hãy tăng --max-pages.")
    METADATA.write_text(json.dumps(recipes, ensure_ascii=False, indent=2), encoding="utf-8")
    index = embed(recipes, os.environ.get("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"))
    faiss.write_index(index, str(INDEX))
    print(f"Hoàn tất: {len(recipes)} công thức, index={INDEX}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        raise SystemExit(1)
