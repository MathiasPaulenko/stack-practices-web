#!/usr/bin/env python3
"""Fix the remaining 58 broken body links by mapping old slugs to real slugs."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"

# Old slug -> real slug (no /tipo/ prefix; we keep the original content type)
SLUG_MAP = {
    "circuit-breaker-pattern-recipe": "circuit-breaker-pattern",
    "saga-pattern-recipe": "saga-pattern",
    "factory-pattern-recipe": "factory-pattern",
    "adapter-pattern-recipe": "adapter-pattern",
    "strategy-pattern-recipe": "strategy-pattern",
    "singleton-pattern-recipe": "singleton-pattern",
    "cqrs-pattern-recipe": "cqrs-pattern",
    "graphql-n-1-query-detection": "graphql-n+1-query-detection",
}

# Old /tipo/old -> /tipo/new (full path rewrites where the type or slug
# changed entirely).
PATH_MAP = {
    "/recipes/file-handling/csv-parsing": "/recipes/parse-csv-files",
    "/recipes/api/streaming-responses": "/recipes/python-llm-streaming-responses",
    "/docs/csv-export": "/recipes/export-csv-excel",
}

LINK_RE = re.compile(r"\]\((/(?:recipes|patterns|guides|docs)/[^)\s]+)\)")


def fix_link(link: str) -> str | None:
    # Strip trailing slash for lookup, preserve it for output.
    trailing = "/" if link.endswith("/") else ""
    base = link.rstrip("/")
    # 1. Direct path map
    if base in PATH_MAP:
        return f"{PATH_MAP[base]}{trailing}"
    # 2. Slug rename: /tipo/old-slug -> /tipo/new-slug
    parts = base.split("/")
    if len(parts) == 3 and parts[2] in SLUG_MAP:
        return f"/{parts[1]}/{SLUG_MAP[parts[2]]}{trailing}"
    return None


def process_file(md_path: Path) -> int:
    text = md_path.read_text(encoding="utf-8")
    changes = 0

    def replace(m: re.Match) -> str:
        nonlocal changes
        old = m.group(1)
        new = fix_link(old)
        if new and new != old:
            changes += 1
            return f"]({new})"
        return m.group(0)

    text = LINK_RE.sub(replace, text)
    if changes > 0:
        md_path.write_text(text, encoding="utf-8")
    return changes


total = 0
files = 0
for md_file in sorted(CONTENT_DIR.rglob("*.md")):
    if md_file.name in ("AGENTS.md", "README.md"):
        continue
    n = process_file(md_file)
    if n > 0:
        files += 1
        total += n
        print(f"  {md_file.relative_to(ROOT)}: {n} link(s) fixed")

print(f"\nFiles changed: {files}")
print(f"Total links fixed: {total}")
