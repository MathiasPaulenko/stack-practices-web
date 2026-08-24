#!/usr/bin/env python3
"""Find broken body links in markdown content.

Scans every .md / .es.md under src/content/ for markdown links of the form
[text](/tipo/slug) and reports any whose /tipo/slug does not correspond to
an actual content file. Also reports links with the old /tipo/topic/slug
pattern that were missed by the fixer.
"""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"
CONTENT_TYPES = ("recipes", "patterns", "guides", "docs")

# Build set of valid URL paths: /tipo/slug
valid_paths: set[str] = set()
for ctype in CONTENT_TYPES:
    ctype_dir = CONTENT_DIR / ctype
    if not ctype_dir.exists():
        continue
    for md_file in ctype_dir.rglob("*.md"):
        name = md_file.name
        if name.endswith(".es.md"):
            slug = name[:-6]
        elif name.endswith(".md"):
            slug = name[:-3]
        else:
            continue
        if slug in ("AGENTS", "README"):
            continue
        valid_paths.add(f"/{ctype}/{slug}")

# Regex for markdown links to internal pages
LINK_RE = re.compile(r"\]\((/(?:recipes|patterns|guides|docs)/[^)\s]+)\)")

broken: list[tuple[Path, str, str]] = []
placeholder_links: list[tuple[Path, str]] = []

for ctype in CONTENT_TYPES:
    ctype_dir = CONTENT_DIR / ctype
    if not ctype_dir.exists():
        continue
    for md_file in sorted(ctype_dir.rglob("*.md")):
        if md_file.name in ("AGENTS.md", "README.md"):
            continue
        text = md_file.read_text(encoding="utf-8")
        for m in LINK_RE.finditer(text):
            link = m.group(1)
            # Strip trailing slash for comparison
            normalized = link.rstrip("/")
            # Skip anchors on valid paths
            base = normalized.split("#")[0]
            if base not in valid_paths:
                broken.append((md_file, link, md_file.relative_to(ROOT).as_posix()))

print(f"Valid internal paths: {len(valid_paths)}")
print(f"Broken body links: {len(broken)}")
print()

# Group by link target
by_target: Counter[str] = Counter()
for _, link, _ in broken:
    by_target[link] += 1

print("Top 30 broken link targets:")
for target, count in by_target.most_common(30):
    print(f"  {count:4d}  {target}")

print()
print("Sample broken links (first 30):")
for md_file, link, rel in broken[:30]:
    print(f"  {rel}: {link}")
