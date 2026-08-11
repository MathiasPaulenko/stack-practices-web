import re
import json
import os
import ai_detect


def clean_markdown(text):
    # Strip frontmatter.
    text = re.sub(r"^---\s*\n.*?\n---\s*\n", "", text, flags=re.S)
    # Remove fenced code blocks.
    text = re.sub(r"```[\s\S]*?```", "", text)
    # Remove inline code.
    text = re.sub(r"`[^`]+`", "", text)
    # Remove headings.
    text = re.sub(r"^#{1,6}\s+.*$", "", text, flags=re.M)
    # Remove bullet/numbered list markers.
    text = re.sub(r"^(\s*[-*]\s+|\s*\d+\.\s+)", "", text, flags=re.M)
    return text


def find_patterns(path, label):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    text = clean_markdown(text)
    sentences = ai_detect.patterns.sent_tokenize(text)

    findings = []
    for s in sentences:
        if len(s.split()) < ai_detect.detector.MIN_WORDS:
            continue
        diag = ai_detect.diagnose_sentence(s)
        if diag:
            findings.append({"sentence": s, "findings": diag})

    totals = {}
    for f in findings:
        for d in f["findings"]:
            p = d["pattern"]
            totals[p] = totals.get(p, 0) + 1

    return {
        "label": label,
        "total_sentences": len(sentences),
        "pattern_totals": totals,
        "findings": findings,
    }


def main():
    reports = [
        find_patterns(
            "src/content/recipes/api/api-documentation-openapi.md",
            "api-documentation-openapi-en",
        ),
        find_patterns(
            "src/content/recipes/api/api-documentation-openapi.es.md",
            "api-documentation-openapi-es",
        ),
    ]

    out_dir = "ref/output"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "ai-detect-patterns-api-documentation-openapi.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(reports, f, indent=2, default=str)

    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
