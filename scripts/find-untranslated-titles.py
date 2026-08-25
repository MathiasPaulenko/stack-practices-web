#!/usr/bin/env python3
"""Find ES resources whose title is identical to the EN version (untranslated)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"
TYPES = ["recipes", "patterns", "guides", "docs"]


def get_title(text: str) -> str | None:
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None
    fm = parts[1]
    m = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', fm, re.MULTILINE)
    if not m:
        return None
    return m.group(1).strip().strip('"').strip("'")


def main() -> None:
    untranslated = []
    for t in TYPES:
        type_dir = CONTENT_DIR / t
        if not type_dir.exists():
            continue
        for en_file in sorted(type_dir.rglob("*.md")):
            if en_file.name.endswith(".es.md") or en_file.name in ("AGENTS.md", "README.md"):
                continue
            es_file = en_file.with_suffix(".es.md")
            if not es_file.exists():
                continue
            en_title = get_title(en_file.read_text(encoding="utf-8"))
            es_title = get_title(es_file.read_text(encoding="utf-8"))
            if en_title and es_title and en_title == es_title:
                rel = en_file.relative_to(CONTENT_DIR).as_posix()
                untranslated.append({
                    "file": rel,
                    "title": en_title,
                })

    print(f"Untranslated ES titles: {len(untranslated)}")
    print()
    for i, item in enumerate(untranslated, 1):
        print(f"{i:>3}. {item['file']}")
        print(f"     title: {item['title']!r}")


if __name__ == "__main__":
    main()
