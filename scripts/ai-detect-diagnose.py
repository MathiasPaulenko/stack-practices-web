import re
import json
import ai_detect


def clean_body(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    body = re.sub(r"^---\s*\n.*?\n---\s*\n", "", text, flags=re.S)
    # Strip code blocks and inline code spans so we only analyze prose.
    body = re.sub(r"```[\s\S]*?```", "", body)
    body = re.sub(r"`[^`]+`", "", body)
    return body


def sentences(text):
    # Simple sentence split on . ! ? followed by space or newline.
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in parts if len(s.strip()) > 20]


def analyze(path, label):
    body = clean_body(path)
    sents = sentences(body)
    findings = []
    pattern_counts = {}

    for s in sents[:400]:
        d = ai_detect.diagnose_sentence(s)
        if d:
            findings.append({"sentence": s[:200], "patterns": d})
            for p in d:
                pattern_counts[p.get("pattern")] = pattern_counts.get(p.get("pattern"), 0) + 1

    return {
        "label": label,
        "sentences_analyzed": len(sents),
        "pattern_counts": pattern_counts,
        "findings": findings[:100],
    }


reports = [
    analyze("src/content/recipes/api/api-documentation-openapi.md", "en"),
    analyze("src/content/recipes/api/api-documentation-openapi.es.md", "es"),
]

with open("output/ai-detect-diagnose-api-documentation-openapi.json", "w", encoding="utf-8") as f:
    json.dump(reports, f, indent=2, default=str)

for r in reports:
    print(f"{r['label']}: {r['sentences_analyzed']} sentences, {len(r['findings'])} flagged")
    print("Pattern counts:", r["pattern_counts"])
