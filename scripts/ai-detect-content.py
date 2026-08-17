#!/usr/bin/env python3
"""ai-detect-content.py — neural + pattern AI-detection for a StackPractices resource.

Cleans Markdown (removes code, headings and list markers) so the detector sees
mostly prose, then runs the ai_detect classifier and pattern diagnostics.

Usage:
    python scripts/ai-detect-content.py src/content/{tipo}/{slug}.md
    python scripts/ai-detect-content.py src/content/{tipo}/{slug}.md --model light
    python scripts/ai-detect-content.py src/content/{tipo}/{slug}.md --es src/content/{tipo}/{slug}.es.md

Output is written to ref/output/ai-detect-{slug}.json.
"""

import re
import json
import os
import sys
import argparse
import ai_detect


OUTPUT_DIR = "ref/output"


def clean_markdown(text):
    """Return prose-only text from a Markdown body (frontmatter + code + headings stripped)."""
    text = re.sub(r"^---\s*\n.*?\n---\s*\n", "", text, flags=re.S)
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"^#{1,6}\s+.*$", "", text, flags=re.M)
    text = re.sub(r"^(\s*[-*]\s+|\s*\d+\.\s+)", "", text, flags=re.M)
    return text


def analyze(path, label, model):
    with open(path, "r", encoding="utf-8") as f:
        body = clean_markdown(f.read())
    result = ai_detect.classify_text(body, model=model)

    # Collect highest AI-probability sentences.
    scored = [
        (s.get("sentence", "")[:180], s.get("ai_prob", 0))
        for s in result.get("sentences", [])
        if s.get("ai_prob", 0) > 0
    ]
    top_ai = sorted(scored, key=lambda x: x[1], reverse=True)[:25]

    # Pattern-based findings already live inside each scored sentence.
    diagnostics = []
    for s in result.get("sentences", []):
        text = s.get("sentence", "")
        if len(text) > 20:
            findings = s.get("diagnostics", [])
            if not findings:
                findings = ai_detect.diagnose_sentence(text)
            if findings:
                diagnostics.append({"sentence": text[:160], "findings": findings})

    return {
        "label": label,
        "model": model,
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


def slugify(name):
    return re.sub(r"[^a-z0-9_-]+", "-", name.lower()).strip("-")


def main():
    parser = argparse.ArgumentParser(
        description="Neural AI-detection for a StackPractices resource.",
    )
    parser.add_argument("file", help="Path to the English Markdown file")
    parser.add_argument("--es", help="Path to the Spanish Markdown file (optional)")
    parser.add_argument("--model", default="desklib", choices=["desklib", "light"],
                        help="Detection model (default: desklib)")
    parser.add_argument("--out-dir", default=OUTPUT_DIR, help="Directory for JSON output")
    args = parser.parse_args()

    if not os.path.isfile(args.file):
        print(f"File not found: {args.file}", file=sys.stderr)
        return 1

    os.makedirs(args.out_dir, exist_ok=True)

    en_label = os.path.basename(args.file).replace(".md", "")
    es_path = args.es or args.file.replace(".md", ".es.md")

    reports = [analyze(args.file, f"{en_label}-en", args.model)]
    if os.path.isfile(es_path):
        reports.append(analyze(es_path, f"{en_label}-es", args.model))
    else:
        print(f"Warning: Spanish file not found: {es_path}", file=sys.stderr)

    out_path = os.path.join(args.out_dir, f"ai-detect-{slugify(en_label)}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(reports, f, indent=2, default=str)

    print(f"Wrote {out_path}")
    for r in reports:
        print(
            f"  {r['label']}: {r['model_ai_pct']}% AI "
            f"({r['ai_count']} AI / {r['human_count']} human / {r['total']} total) "
            f"patterns: {r['pattern_totals']}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
