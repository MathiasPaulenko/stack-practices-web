#!/usr/bin/env python3
"""ai-detect-patterns.py — rule-based AI pattern checker for StackPractices content.

Runs only the pattern diagnostics from the ai_detect package (no neural model),
so it is fast and gives concrete rewrites: vague abstractions, formal verbs,
missing contractions, AI slop, etc.

Usage:
    python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.md
    python scripts/ai-detect-patterns.py --all

Output is written to ref/output/ai-detect-patterns-{slug}.json.
"""

import re
import json
import os
import sys
import argparse

try:
    import ai_detect
except ImportError:
    print(
        "Error: the 'ai_detect' module is not installed.\n"
        "Install it with: pip install ai-detect\n"
        "Or clone it from: https://github.com/your-org/ai-detect",
        file=sys.stderr,
    )
    sys.exit(2)


CONTENT_DIR = "src/content"
OUTPUT_DIR = "ref/output"


def clean_markdown(text):
    """Return prose-only text from a Markdown body (frontmatter + code + headings stripped)."""
    # Strip YAML frontmatter.
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


def slugify(name):
    return re.sub(r"[^a-z0-9_-]+", "-", name.lower()).strip("-")


def main():
    parser = argparse.ArgumentParser(
        description="Rule-based AI-pattern checker for StackPractices content.",
    )
    parser.add_argument("path", nargs="?", help="Path to a single Markdown file")
    parser.add_argument("--all", action="store_true", help="Check all .md files in src/content")
    parser.add_argument("--out-dir", default=OUTPUT_DIR, help="Directory for JSON output")
    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    if args.all:
        reports = []
        for root, _, files in os.walk(CONTENT_DIR):
            for name in files:
                if not name.endswith(".md"):
                    continue
                full = os.path.join(root, name)
                rel = os.path.relpath(full, CONTENT_DIR)
                reports.append(find_patterns(full, rel))
        out_path = os.path.join(args.out_dir, "ai-detect-patterns-all.json")
    elif args.path:
        if not os.path.isfile(args.path):
            print(f"File not found: {args.path}", file=sys.stderr)
            return 1
        label = os.path.basename(args.path).replace(".md", "")
        report = find_patterns(args.path, label)
        out_path = os.path.join(args.out_dir, f"ai-detect-patterns-{slugify(label)}.json")
        reports = [report]
    else:
        parser.print_help()
        return 1

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(reports, f, indent=2, default=str)

    print(f"Wrote {out_path}")
    for r in reports:
        totals = r.get("pattern_totals", {})
        if totals:
            print(f"  {r['label']}: {sum(totals.values())} findings ({totals})")
        else:
            print(f"  {r['label']}: 0 findings")
    return 0


if __name__ == "__main__":
    sys.exit(main())
