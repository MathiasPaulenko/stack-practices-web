#!/usr/bin/env python3
"""Fix bidirectional link gaps by adding consolidated body links.

Groups all missing reciprocal links per file and adds a single natural
sentence at the end of the Overview section.
"""

from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"

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
    ("/recipes/python-coverage-pytest-cov", "/recipes/setup-test-fixtures"),
]


def find_content_file(slug_path: str) -> Path | None:
    parts = slug_path.strip("/").split("/")
    if len(parts) != 2:
        return None
    ctype, slug = parts
    base_dir = CONTENT_DIR / ctype
    if not base_dir.exists():
        return None
    for md_file in base_dir.rglob(f"{slug}.md"):
        if md_file.name == f"{slug}.md":
            return md_file
    return None


def get_title(file_path: Path) -> str:
    text = file_path.read_text(encoding="utf-8")
    m = re.search(r'^title:\s*"?(.+?)"?\s*$', text, re.MULTILINE)
    if m:
        return m.group(1).strip('"').strip("'")
    return file_path.stem.replace("-", " ").title()


def has_link_to(text: str, slug_path: str) -> bool:
    patterns = [
        re.escape(slug_path) + r"/?\)",
        re.escape(slug_path) + r"\s*$",
    ]
    for p in patterns:
        if re.search(p, text, re.MULTILINE):
            return True
    rr_pattern = r"^\s*-\s+" + re.escape(slug_path) + r"\s*$"
    if re.search(rr_pattern, text, re.MULTILINE):
        return True
    return False


def format_link_list(items: list[tuple[str, str]]) -> str:
    """Format a list of (slug, title) as a natural English link list."""
    links = [f"[{title}]({slug})" for slug, title in items]
    if len(links) == 1:
        return links[0]
    elif len(links) == 2:
        return f"{links[0]} and {links[1]}"
    else:
        return ", ".join(links[:-1]) + f", and {links[-1]}"


def format_link_list_es(items: list[tuple[str, str]]) -> str:
    """Format a list of (slug, title) as a natural Spanish link list."""
    links = [f"[{title}]({slug})" for slug, title in items]
    if len(links) == 1:
        return links[0]
    elif len(links) == 2:
        return f"{links[0]} y {links[1]}"
    else:
        return ", ".join(links[:-1]) + f" y {links[-1]}"


def add_consolidated_body_link(
    file_path: Path,
    links_to_add: list[tuple[str, str]],
) -> bool:
    """Add a single sentence with all links at the end of Overview."""
    text = file_path.read_text(encoding="utf-8")
    lines = text.split("\n")

    is_es = file_path.name.endswith(".es.md")

    # Find the first ## heading (usually Overview)
    overview_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith("## "):
            overview_idx = i
            break

    if overview_idx is None:
        return False

    # Find the end of the Overview section
    overview_end = len(lines)
    for i in range(overview_idx + 1, len(lines)):
        if lines[i].strip().startswith("## "):
            overview_end = i
            break

    # Find the last non-empty line in Overview
    last_idx = overview_end - 1
    while last_idx > overview_idx and lines[last_idx].strip() == "":
        last_idx -= 1

    if last_idx <= overview_idx:
        last_idx = overview_idx + 1
        if last_idx >= len(lines):
            lines.insert(last_idx, "")
        last_line = ""
    else:
        last_line = lines[last_idx]

    # Build the sentence
    link_str = format_link_list_es(links_to_add) if is_es else format_link_list(links_to_add)
    if is_es:
        sentence = f" Recursos relacionados: {link_str}."
    else:
        sentence = f" Related recipes: {link_str}."

    lines[last_idx] = last_line + sentence
    file_path.write_text("\n".join(lines), encoding="utf-8")
    return True


def main():
    # Build a map: file_that_needs_links -> [(slug_to_add, title), ...]
    needs_links: dict[Path, list[tuple[str, str]]] = defaultdict(list)

    for slug_a, slug_b in PAIRS:
        file_a = find_content_file(slug_a)
        file_b = find_content_file(slug_b)

        if not file_a or not file_b:
            continue

        text_a = file_a.read_text(encoding="utf-8")
        text_b = file_b.read_text(encoding="utf-8")

        a_links_b = has_link_to(text_a, slug_b)
        b_links_a = has_link_to(text_b, slug_a)

        title_a = get_title(file_a)
        title_b = get_title(file_b)

        if a_links_b and not b_links_a:
            # B needs a link to A
            needs_links[file_b].append((slug_a, title_a))
            es_b = file_b.parent / f"{file_b.stem}.es.md"
            if es_b.exists():
                es_title_a = get_title(file_a.parent / f"{file_a.stem}.es.md") if (file_a.parent / f"{file_a.stem}.es.md").exists() else title_a
                needs_links[es_b].append((slug_a, es_title_a))

        if b_links_a and not a_links_b:
            # A needs a link to B
            needs_links[file_a].append((slug_b, title_b))
            es_a = file_a.parent / f"{file_a.stem}.es.md"
            if es_a.exists():
                es_title_b = get_title(file_b.parent / f"{file_b.stem}.es.md") if (file_b.parent / f"{file_b.stem}.es.md").exists() else title_b
                needs_links[es_a].append((slug_b, es_title_b))

        if not a_links_b and not b_links_a:
            # Both need links
            needs_links[file_a].append((slug_b, title_b))
            needs_links[file_b].append((slug_a, title_a))
            es_a = file_a.parent / f"{file_a.stem}.es.md"
            es_b = file_b.parent / f"{file_b.stem}.es.md"
            if es_a.exists():
                es_title_b = get_title(file_b.parent / f"{file_b.stem}.es.md") if (file_b.parent / f"{file_b.stem}.es.md").exists() else title_b
                needs_links[es_a].append((slug_b, es_title_b))
            if es_b.exists():
                es_title_a = get_title(file_a.parent / f"{file_a.stem}.es.md") if (file_a.parent / f"{file_a.stem}.es.md").exists() else title_a
                needs_links[es_b].append((slug_a, es_title_a))

    total = 0
    for file_path, links in sorted(needs_links.items()):
        # Deduplicate
        seen = set()
        unique = []
        for slug, title in links:
            if slug not in seen:
                seen.add(slug)
                unique.append((slug, title))

        changed = add_consolidated_body_link(file_path, unique)
        if changed:
            total += 1
            print(f"  + {file_path.relative_to(ROOT)}: {len(unique)} link(s)")

    print(f"\nFiles modified: {total}")


if __name__ == "__main__":
    main()
