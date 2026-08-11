import re
import json
import os
import ai_detect


def extract_body(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    # Strip YAML frontmatter.
    text = re.sub(r"^---\s*\n.*?\n---\s*\n", "", text, flags=re.S)
    # Remove fenced code blocks so the detector only sees prose.
    text = re.sub(r"```[\s\S]*?```", "", text)
    return text


def analyze(path, label):
    body = extract_body(path)
    result = ai_detect.classify_text(body, model="desklib")

    sentences = result.get("sentences", [])

    # Collect highest AI-probability sentences.
    scored = [
        (s.get("sentence", "")[:180], s.get("ai_prob", 0))
        for s in sentences
        if s.get("ai_prob", 0) > 0
    ]
    top_ai = sorted(scored, key=lambda x: x[1], reverse=True)[:25]

    # Pattern-based findings already live inside each scored sentence.
    diagnostics = []
    for s in sentences:
        text = s.get("sentence", "")
        if len(text) > 20:
            findings = s.get("diagnostics", [])
            if not findings:
                findings = ai_detect.diagnose_sentence(text)
            if findings:
                diagnostics.append({"sentence": text[:160], "findings": findings})

    summary = {
        "label": label,
        "model_ai_pct": result.get("model_ai_pct"),
        "ai_count": result.get("ai_count"),
        "human_count": result.get("human_count"),
        "skipped_count": result.get("skipped_count"),
        "total": result.get("total"),
        "pattern_totals": result.get("pattern_totals"),
        "text_metrics": result.get("text_metrics"),
        "top_ai_sentences": top_ai,
        "diagnostics_sample": diagnostics[:50],
    }
    return summary


def main():
    reports = [
        analyze(
            "src/content/recipes/api/api-documentation-openapi.md",
            "api-documentation-openapi-en",
        ),
        analyze(
            "src/content/recipes/api/api-documentation-openapi.es.md",
            "api-documentation-openapi-es",
        ),
    ]

    out_dir = "ref/output"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "ai-detect-api-documentation-openapi.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(reports, f, indent=2, default=str)

    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
