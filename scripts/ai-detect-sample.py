import re
import json
import ai_detect


def clean_body(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    body = re.sub(r"^---\s*\n.*?\n---\s*\n", "", text, flags=re.S)
    body = re.sub(r"```[\s\S]*?```", "", body)
    body = re.sub(r"`[^`]+`", "", body)
    return body


for label, path in [
    ("en", "src/content/recipes/api/api-documentation-openapi.md"),
    ("es", "src/content/recipes/api/api-documentation-openapi.es.md"),
]:
    body = clean_body(path)
    sample = body[:2500]
    r = ai_detect.classify_text(sample)
    print(f"=== {label} ===")
    print(json.dumps({
        "model_ai_pct": r.get("model_ai_pct"),
        "ai_count": r.get("ai_count"),
        "human_count": r.get("human_count"),
        "total": r.get("total"),
        "pattern_totals": r.get("pattern_totals"),
        "text_metrics": r.get("text_metrics"),
    }, indent=2, default=str))
    print()
