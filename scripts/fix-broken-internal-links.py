#!/usr/bin/env python3
"""Fix broken internal links that use the old /tipo/categoria/slug pattern.

The content files live at src/content/{tipo}/{topic}/{slug}.md but the
published URL is /{tipo}/{slug}/.  Links inside the markdown that point to
/tipo/topic/slug are therefore broken and must be rewritten to /tipo/slug.

The script:
  1. Builds a set of all valid slugs per content type from the filesystem.
  2. Scans every .md / .es.md under src/content/ for markdown links and
     bare URLs that match /tipo/segment1/segment2...
  3. If segment1 is a topic folder and segment2 (or segment2/segment3...) is
     a known slug, rewrites the link to /tipo/slug.
  4. Reports every change.

Usage:
    python scripts/fix-broken-internal-links.py [--dry-run]
"""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"
CONTENT_TYPES = ("recipes", "patterns", "guides", "docs")

# Build a map: content_type -> set of slugs (basename without .md / .es.md)
slugs_by_type: dict[str, set[str]] = {t: set() for t in CONTENT_TYPES}

for ctype in CONTENT_TYPES:
    ctype_dir = CONTENT_DIR / ctype
    if not ctype_dir.exists():
        continue
    for md_file in ctype_dir.rglob("*.md"):
        name = md_file.name
        # Strip .es.md or .md
        if name.endswith(".es.md"):
            slug = name[:-6]
        elif name.endswith(".md"):
            slug = name[:-3]
        else:
            continue
        # Skip AGENTS.md, README.md, etc.
        if slug in ("AGENTS", "README"):
            continue
        slugs_by_type[ctype].add(slug)

# Also build a set of topic folders per content type
topics_by_type: dict[str, set[str]] = {t: set() for t in CONTENT_TYPES}
for ctype in CONTENT_TYPES:
    ctype_dir = CONTENT_DIR / ctype
    if not ctype_dir.exists():
        continue
    for child in ctype_dir.iterdir():
        if child.is_dir():
            topics_by_type[ctype].add(child.name)

# Regex for markdown links: [text](/tipo/...)
# Also matches bare paths in frontmatter relatedResources? No — those are
# just slugs, not paths. We only fix markdown links in the body.
MD_LINK_RE = re.compile(
    r"\]\((/(?:recipes|patterns|guides|docs)/[^)\s]+)\)",
    re.IGNORECASE,
)

# Also fix bare URLs in plain text like /recipes/databases/foo (no markdown
# link wrapper). These are rarer but appear in code comments.
BARE_URL_RE = re.compile(
    r"(?<![\w/\]])(/(?:recipes|patterns|guides|docs)/[a-z0-9-]+/[a-z0-9-]+(?:/[a-z0-9-]+)*)",
    re.IGNORECASE,
)


def try_fix_path(path: str) -> str | None:
    """If path matches /tipo/topic/slug[/...], return /tipo/slug[/...] or None."""
    parts = path.strip("/").split("/")
    if len(parts) < 3:
        return None
    ctype = parts[0]
    if ctype not in CONTENT_TYPES:
        return None
    topic = parts[1]
    rest = parts[2:]  # may be ["slug"] or ["slug", ""] or ["slug", "extra"]

    # If the topic is actually a known slug (not a topic folder), the link
    # might already be correct — skip.
    if topic in slugs_by_type.get(ctype, set()):
        return None

    # If topic is not a known topic folder and not a known slug, skip.
    if topic not in topics_by_type.get(ctype, set()):
        return None

    # The slug is the next segment (or the remaining path joined).
    # Common case: /tipo/topic/slug -> /tipo/slug
    # Rare case:   /tipo/topic/slug/ -> /tipo/slug/
    if len(rest) == 1:
        slug = rest[0]
    elif len(rest) == 2 and rest[1] == "":
        slug = rest[0]
    else:
        # More complex — skip for safety.
        return None

    if slug not in slugs_by_type.get(ctype, set()):
        return None

    # Preserve trailing slash if present.
    trailing = "/" if path.endswith("/") else ""
    return f"/{ctype}/{slug}{trailing}"


def process_file(md_path: Path, dry_run: bool) -> int:
    """Process a single markdown file. Returns number of replacements made."""
    text = md_path.read_text(encoding="utf-8")
    original = text
    changes = 0

    # 1. Fix markdown links [text](/tipo/topic/slug)
    def replace_md_link(m: re.Match) -> str:
        nonlocal changes
        old = m.group(1)
        new = try_fix_path(old)
        if new and new != old:
            changes += 1
            return f"]({new})"
        return m.group(0)

    text = MD_LINK_RE.sub(replace_md_link, text)

    # 2. Fix bare URLs in code comments / plain text
    def replace_bare_url(m: re.Match) -> str:
        nonlocal changes
        old = m.group(1)
        new = try_fix_path(old)
        if new and new != old:
            changes += 1
            return new
        return m.group(0)

    text = BARE_URL_RE.sub(replace_bare_url, text)

    if changes > 0 and not dry_run and text != original:
        md_path.write_text(text, encoding="utf-8")

    return changes


def main() -> int:
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        print("DRY RUN — no files will be modified.\n")

    total_changes = 0
    files_changed = 0
    changes_by_type: Counter[str] = Counter()

    for ctype in CONTENT_TYPES:
        ctype_dir = CONTENT_DIR / ctype
        if not ctype_dir.exists():
            continue
        for md_file in sorted(ctype_dir.rglob("*.md")):
            if md_file.name in ("AGENTS.md", "README.md"):
                continue
            n = process_file(md_file, dry_run)
            if n > 0:
                files_changed += 1
                total_changes += n
                changes_by_type[ctype] += n
                rel = md_file.relative_to(ROOT)
                print(f"  {rel}: {n} link(s) fixed")

    print(f"\nFiles changed: {files_changed}")
    print(f"Total links fixed: {total_changes}")
    for ctype, n in sorted(changes_by_type.items()):
        print(f"  {ctype}: {n}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
