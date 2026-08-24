#!/usr/bin/env python3
"""Fix bidirectional link gaps in relatedResources.

For each pair (A, B), ensures that A lists B in relatedResources and
B lists A. Only adds missing entries; never removes existing ones.
Preserves EN/ES parity by editing both .md and .es.md.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"

# 24 pairs from ALL_PROBLEMS_CHECKLIST.md section 4.1
# Each tuple: (resourceA_slug_path, resourceB_slug_path)
# Slug paths are /tipo/slug
PAIRS = [
    ("/recipes/image-generation", "/recipes/chatbot-openai"),
    ("/recipes/python-sentiment-analysis-nltk", "/recipes/chatbot-openai"),
    ("/recipes/api-logging-audit", "/recipes/api-documentation-openapi"),
    ("/recipes/api-rate-limiting-redis", "/recipes/api-documentation-openapi"),
    ("/recipes/call-rest-api", "/recipes/api-documentation-openapi"),
    ("/recipes/cursor-pagination-postgresql", "/recipes/api-documentation-openapi"),
    ("/recipes/graphql-api", "/recipes/api-documentation-openapi"),
    ("/recipes/real-time-notifications", "/recipes/api-documentation-openapi"),
    ("/recipes/concurrent-data-structures", "/recipes/python-thread-pool-executor"),
    ("/recipes/concurrent-data-structures", "/recipes/race-condition-prevention"),
    ("/recipes/date-formatting", "/recipes/flatten-unflatten-objects"),
    ("/recipes/flatten-unflatten-objects", "/recipes/deep-clone-javascript"),
    ("/recipes/money-currency", "/recipes/flatten-unflatten-objects"),
    ("/recipes/parse-excel-files", "/recipes/parse-log-files"),
    ("/recipes/parse-log-files", "/recipes/log-aggregation"),
    ("/recipes/parse-log-files", "/recipes/parse-json"),
    ("/recipes/parse-log-files", "/recipes/regular-expressions"),
    ("/recipes/parse-xml-files", "/recipes/parse-log-files"),
    ("/recipes/validate-json-schema", "/recipes/parse-log-files"),
    ("/recipes/database-migrations-safely", "/recipes/optimistic-locking"),
    ("/recipes/database-migrations", "/recipes/optimistic-locking"),
    ("/recipes/database-views-materialized", "/recipes/optimistic-locking"),
    ("/recipes/python-coverage-pytest-cov", "/recipes/implement-mutation-testing"),
    ("/recipes/python-coverage-pytest-cov", "/recipes/setup-test-fixtures"),
]


def find_content_file(slug_path: str) -> Path | None:
    """Find the .md file for a /tipo/slug path."""
    parts = slug_path.strip("/").split("/")
    if len(parts) != 2:
        return None
    ctype, slug = parts
    base_dir = CONTENT_DIR / ctype
    if not base_dir.exists():
        return None
    # Search recursively for {slug}.md
    for md_file in base_dir.rglob(f"{slug}.md"):
        if md_file.name == f"{slug}.md":
            return md_file
    return None


def parse_related_resources(text: str) -> tuple[int, list[str], int, int]:
    """Find the relatedResources block in frontmatter.

    Returns (start_line_index, entries, insert_line_index, end_line_index).
    """
    lines = text.split("\n")
    # Find frontmatter bounds
    if not lines[0].strip() == "---":
        return (0, [], 0, 0)
    fm_end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            fm_end = i
            break
    if fm_end is None:
        return (0, [], 0, 0)

    # Find relatedResources key
    rr_start = None
    for i in range(1, fm_end):
        if lines[i].strip().startswith("relatedResources:"):
            rr_start = i
            break

    if rr_start is None:
        # No relatedResources block; we'd need to add one — skip for safety.
        return (0, [], 0, 0)

    # Collect existing entries (lines like "  - /tipo/slug")
    entries = []
    rr_end = rr_start + 1
    for i in range(rr_start + 1, fm_end):
        line = lines[i]
        if re.match(r"^\s+-\s+", line):
            slug = re.sub(r"^\s+-\s+", "", line).strip().strip('"').strip("'")
            entries.append(slug)
            rr_end = i + 1
        elif line.strip() == "":
            # Empty line might be end of block or between entries
            # Check if next non-empty line is another entry or a new key
            continue
        else:
            # New key — end of relatedResources
            break

    return (rr_start, entries, rr_end, fm_end)


def add_to_related_resources(file_path: Path, slug_to_add: str) -> bool:
    """Add slug_to_add to relatedResources in the file if missing.
    Returns True if modified.
    """
    text = file_path.read_text(encoding="utf-8")
    rr_start, entries, rr_end, fm_end = parse_related_resources(text)
    if rr_start == 0 and rr_end == 0:
        print(f"  SKIP (no relatedResources): {file_path.relative_to(ROOT)}")
        return False

    # Check if already present
    for e in entries:
        if e.rstrip("/") == slug_to_add.rstrip("/"):
            return False  # Already present

    # Don't exceed 6 entries
    if len(entries) >= 6:
        print(f"  SKIP (already 6): {file_path.relative_to(ROOT)}")
        return False

    # Insert after the last entry
    lines = text.split("\n")
    # Find the insertion point: after the last entry line
    insert_idx = rr_end
    # Walk back to find the actual last entry line
    last_entry_idx = rr_end - 1
    while last_entry_idx > rr_start and not re.match(r"^\s+-\s+", lines[last_entry_idx]):
        last_entry_idx -= 1
    insert_idx = last_entry_idx + 1

    new_line = f"  - {slug_to_add}"
    lines.insert(insert_idx, new_line)
    file_path.write_text("\n".join(lines), encoding="utf-8")
    return True


def main():
    total_changes = 0
    for slug_a, slug_b in PAIRS:
        print(f"\n{slug_a} <-> {slug_b}")
        file_a = find_content_file(slug_a)
        file_b = find_content_file(slug_b)

        if file_a is None:
            print(f"  NOT FOUND: {slug_a}")
            continue
        if file_b is None:
            print(f"  NOT FOUND: {slug_b}")
            continue

        # A should list B
        es_a = file_a.with_suffix("").as_posix().replace(".md", ".es.md")
        es_a_path = file_a.parent / f"{file_a.stem}.es.md"

        es_b_path = file_b.parent / f"{file_b.stem}.es.md"

        for f, slug_to_add in [(file_a, slug_b), (file_b, slug_a)]:
            es_f = f.parent / f"{f.stem}.es.md"
            for ff in [f, es_f]:
                if ff.exists():
                    changed = add_to_related_resources(ff, slug_to_add)
                    if changed:
                        total_changes += 1
                        print(f"  + {slug_to_add} -> {ff.relative_to(ROOT)}")

    print(f"\nTotal additions: {total_changes}")


if __name__ == "__main__":
    main()
