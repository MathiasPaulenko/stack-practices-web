#!/usr/bin/env python3
"""Find titles that appear in more than one content type (recipes, patterns, guides, docs)."""

from __future__ import annotations

import re
from collections import defaultdict
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
    # title -> list of (type, file)
    by_title: dict[str, list[tuple[str, Path]]] = defaultdict(list)
    for t in TYPES:
        type_dir = CONTENT_DIR / t
        if not type_dir.exists():
            continue
        for en_file in sorted(type_dir.rglob("*.md")):
            if en_file.name.endswith(".es.md") or en_file.name in ("AGENTS.md", "README.md"):
                continue
            title = get_title(en_file.read_text(encoding="utf-8"))
            if title:
                by_title[title].append((t, en_file))

    collisions = {t: v for t, v in by_title.items() if len({x[0] for x in v}) > 1}
    print(f"Cross-type title collisions: {len(collisions)}")
    print()
    for title, entries in sorted(collisions.items()):
        print(f"  Title: {title!r}")
        for typ, fp in entries:
            rel = fp.relative_to(CONTENT_DIR).as_posix()
            print(f"    [{typ}] {rel}")
        print()


if __name__ == "__main__":
    main()
