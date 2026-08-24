#!/usr/bin/env python3
"""Fix bidirectional link gaps by adding contextual body links.

For each pair (A, B) where A links to B but B doesn't link back to A,
adds a contextual body link in B's Overview section.

Only adds links that are missing. Preserves existing content.
"""

from __future__ import annotations

import re
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

# Map slug -> display title for natural link text
# We'll read the actual title from frontmatter at runtime.


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
    """Check if text contains a link to slug_path (with or without trailing slash)."""
    # Check markdown links
    patterns = [
        re.escape(slug_path) + r"/?\)",
        re.escape(slug_path) + r"/?",
    ]
    for p in patterns:
        if re.search(p, text):
            return True
    # Also check relatedResources
    rr_pattern = r"^\s*-\s+" + re.escape(slug_path) + r"\s*$"
    if re.search(rr_pattern, text, re.MULTILINE):
        return True
    return False


def add_body_link(file_path: Path, target_slug: str, target_title: str) -> bool:
    """Add a contextual body link near the end of the first paragraph after Overview.

    Returns True if modified.
    """
    text = file_path.read_text(encoding="utf-8")
    lines = text.split("\n")

    # Find the first ## heading (usually Overview)
    overview_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith("## "):
            overview_idx = i
            break

    if overview_idx is None:
        print(f"  SKIP (no H2): {file_path.relative_to(ROOT)}")
        return False

    # Find the end of the Overview section (next ## or end of file)
    overview_end = len(lines)
    for i in range(overview_idx + 1, len(lines)):
        if lines[i].strip().startswith("## "):
            overview_end = i
            break

    # Find the last non-empty paragraph line in Overview
    last_para_idx = overview_end - 1
    while last_para_idx > overview_idx and lines[last_para_idx].strip() == "":
        last_para_idx -= 1

    if last_para_idx <= overview_idx:
        # Empty overview — add after the heading
        last_para_idx = overview_idx

    # Build the link sentence
    is_es = file_path.name.endswith(".es.md")
    link_text = target_title
    # Shorten link text if too long
    if len(link_text) > 50:
        link_text = link_text[:50]

    if is_es:
        sentence = f" Para casos de uso relacionados, ver [{link_text}]({target_slug})."
    else:
        sentence = f" For related use cases, see [{link_text}]({target_slug})."

    # Check if the last line already ends with a sentence
    last_line = lines[last_para_idx]
    if last_line.strip() == "":
        lines.insert(last_para_idx + 1, sentence.strip())
    else:
        lines[last_para_idx] = last_line + sentence

    file_path.write_text("\n".join(lines), encoding="utf-8")
    return True


def main():
    total_changes = 0

    for slug_a, slug_b in PAIRS:
        file_a = find_content_file(slug_a)
        file_b = find_content_file(slug_b)

        if not file_a or not file_b:
            missing = slug_a if not file_a else slug_b
            print(f"SKIP {slug_a} <-> {slug_b}: {missing} not found")
            continue

        # Check direction A -> B
        text_a = file_a.read_text(encoding="utf-8")
        a_links_b = has_link_to(text_a, slug_b)

        # Check direction B -> A
        text_b = file_b.read_text(encoding="utf-8")
        b_links_a = has_link_to(text_b, slug_a)

        if a_links_b and b_links_a:
            continue  # Already bidirectional

        title_a = get_title(file_a)
        title_b = get_title(file_b)

        if a_links_b and not b_links_a:
            # Add link to A in B
            es_b = file_b.parent / f"{file_b.stem}.es.md"
            for f in [file_b, es_b]:
                if f.exists():
                    title = get_title(f) if f == file_b else get_title(file_a)
                    # Use the EN title for link text in both
                    link_title = title_a if f == es_b else title_a
                    if not has_link_to(f.read_text(encoding="utf-8"), slug_a):
                        changed = add_body_link(f, slug_a, link_title)
                        if changed:
                            total_changes += 1
                            print(f"  + {slug_a} -> {f.relative_to(ROOT)}")

        if b_links_a and not a_links_b:
            # Add link to B in A
            es_a = file_a.parent / f"{file_a.stem}.es.md"
            for f in [file_a, es_a]:
                if f.exists():
                    link_title = title_b
                    if not has_link_to(f.read_text(encoding="utf-8"), slug_b):
                        changed = add_body_link(f, slug_b, link_title)
                        if changed:
                            total_changes += 1
                            print(f"  + {slug_b} -> {f.relative_to(ROOT)}")

        if not a_links_b and not b_links_a:
            # Neither links the other — add both
            for f, target_slug, target_title in [
                (file_a, slug_b, title_b),
                (file_b, slug_a, title_a),
            ]:
                es_f = f.parent / f"{f.stem}.es.md"
                for ff in [f, es_f]:
                    if ff.exists():
                        if not has_link_to(ff.read_text(encoding="utf-8"), target_slug):
                            changed = add_body_link(ff, target_slug, target_title)
                            if changed:
                                total_changes += 1
                                print(f"  + {target_slug} -> {ff.relative_to(ROOT)}")

    print(f"\nTotal body links added: {total_changes}")


if __name__ == "__main__":
    main()
