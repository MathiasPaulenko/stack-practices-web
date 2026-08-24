#!/usr/bin/env python3
"""Audit thin content against new word-count targets.

Targets:
  recipes: 1300 words
  patterns: 1500 words
  guides:  3000 words
  docs:    3000 words
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"

TARGETS = {
    "recipes": 1300,
    "patterns": 1500,
    "guides": 3000,
    "docs": 3000,
}


def count_words(text: str) -> int:
    # Strip frontmatter
    parts = text.split("---", 2)
    if len(parts) < 3:
        return 0
    body = parts[2]
    # Strip code blocks (don't count code as prose)
    body = re.sub(r"```[\s\S]*?```", "", body)
    # Count words
    words = body.split()
    return len(words)


def get_frontmatter_field(text: str, field: str) -> str | None:
    m = re.search(rf'^{field}:\s*"?(.+?)"?\s*$', text, re.MULTILINE)
    if m:
        return m.group(1).strip('"').strip("'")
    return None


def main():
    results = []
    for ctype, target in TARGETS.items():
        ctype_dir = CONTENT_DIR / ctype
        if not ctype_dir.exists():
            continue
        for md_file in sorted(ctype_dir.rglob("*.md")):
            if md_file.name in ("AGENTS.md", "README.md"):
                continue
            text = md_file.read_text(encoding="utf-8")
            words = count_words(text)
            if words < target:
                is_es = md_file.name.endswith(".es.md")
                slug = get_frontmatter_field(text, "slug") or md_file.stem
                results.append((ctype, slug, words, target, is_es, md_file.relative_to(ROOT)))

    # Sort by gap (worst first)
    results.sort(key=lambda r: r[2])

    print(f"Thin content report (new targets: recipes=1300, patterns=1500, guides=3000, docs=3000)")
    print(f"Total files below target: {len(results)}")
    print()

    # Group by content type
    by_type = {}
    for r in results:
        by_type.setdefault(r[0], []).append(r)

    for ctype in ("recipes", "patterns", "guides", "docs"):
        if ctype not in by_type:
            continue
        items = by_type[ctype]
        target = TARGETS[ctype]
        print(f"\n=== {ctype} (target: {target} words) — {len(items)} files below ===")
        for _, slug, words, tgt, is_es, rel in items:
            lang = "ES" if is_es else "EN"
            gap = tgt - words
            pct = (words / tgt) * 100
            print(f"  {words:5d} words ({pct:5.1f}%) gap={gap:5d}  {lang}  {rel}")


if __name__ == "__main__":
    main()
