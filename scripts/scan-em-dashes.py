#!/usr/bin/env python3
"""Scan all EN resources for em-dash overuse.

Threshold from site-wide audit: >3 em-dashes per 100 words = AI pattern signal.
Also flags resources with absolute count >= 5.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"
TYPES = ["recipes", "patterns", "guides", "docs"]
EM_DASH = "\u2014"  # —


def find_md_files() -> list[Path]:
    files = []
    for t in TYPES:
        files.extend(sorted((CONTENT_DIR / t).rglob("*.md")))
    return [f for f in files if not f.name.endswith(".es.md") and f.name not in ("AGENTS.md", "README.md")]


def count_words(text: str) -> int:
    parts = text.split("---", 2)
    body = parts[2] if len(parts) > 2 else text
    return len(re.findall(r"\b[\w]+\b", body))


def count_em_dashes(text: str) -> int:
    parts = text.split("---", 2)
    body = parts[2] if len(parts) > 2 else text
    return body.count(EM_DASH)


def main() -> None:
    files = find_md_files()
    results = []
    for f in files:
        text = f.read_text(encoding="utf-8")
        words = count_words(text)
        em = count_em_dashes(text)
        if words == 0:
            continue
        density = (em / words) * 100
        rel = f.relative_to(CONTENT_DIR).as_posix()
        results.append({
            "file": rel,
            "words": words,
            "em_dashes": em,
            "density": round(density, 2),
        })

    # Filter: density > 3 per 100 words OR absolute >= 5
    flagged = [r for r in results if r["density"] > 3 or r["em_dashes"] >= 5]
    flagged.sort(key=lambda x: (-x["em_dashes"], -x["density"]))

    print(f"Total EN resources scanned: {len(results)}")
    print(f"Resources flagged (density > 3/100w OR em-dashes >= 5): {len(flagged)}")
    print()
    print(f"{'Em-dashes':>10} {'Density':>8} {'Words':>6}  File")
    print("-" * 80)
    for r in flagged[:50]:
        print(f"{r['em_dashes']:>10} {r['density']:>7}% {r['words']:>6}  {r['file']}")
    if len(flagged) > 50:
        print(f"  ... and {len(flagged) - 50} more")

    # Summary by type
    print()
    print("Flagged by content type:")
    by_type = {}
    for r in flagged:
        ct = r["file"].split("/")[0]
        by_type[ct] = by_type.get(ct, 0) + 1
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"  {t}: {c}")


if __name__ == "__main__":
    main()
