#!/usr/bin/env python3
"""find-resources-by-topic.py — list StackPractices resources by topic.

Usage:
    python scripts/find-resources-by-topic.py <topic>
    python scripts/find-resources-by-topic.py --all

Output:
    /recipes/<slug>    <title>    <difficulty>
"""

import glob
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print(
        "Error: PyYAML is not installed.\n"
        "Install it with: pip install pyyaml",
        file=sys.stderr,
    )
    sys.exit(2)


FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def parse_frontmatter(text: str):
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None
    try:
        return yaml.safe_load(m.group(1))
    except Exception:
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/find-resources-by-topic.py <topic>")
        print("       python scripts/find-resources-by-topic.py --all")
        sys.exit(1)

    topic_arg = sys.argv[1]
    list_all = topic_arg == "--all"

    content_dir = Path("src/content")
    rows = []

    for md in sorted(content_dir.rglob("*.md")):
        if md.name.endswith(".es.md"):
            continue
        text = md.read_text(encoding="utf-8")
        meta = parse_frontmatter(text)
        if not meta:
            continue

        topics = meta.get("topics", [])
        slug = meta.get("slug")
        title = meta.get("title", "")
        difficulty = meta.get("difficulty", "")
        content_type = meta.get("contentType", "")

        if list_all:
            for t in topics:
                rows.append((t, f"/{content_type}/{slug}", title, difficulty))
        elif any(t == topic_arg for t in topics):
            rows.append((f"/{content_type}/{slug}", title, difficulty))

    if not rows:
        print(f"No resources found for topic: {topic_arg}")
        sys.exit(0)

    if list_all:
        print(f"{'Topic':<20} {'Slug':<40} {'Title':<60} Difficulty")
        print("-" * 120)
        for topic, slug, title, diff in sorted(rows, key=lambda x: (x[0], x[1])):
            print(f"{topic:<20} {slug:<40} {title[:58]:<60} {diff}")
    else:
        print(f"{'Slug':<40} {'Title':<60} Difficulty")
        print("-" * 100)
        for slug, title, diff in sorted(rows, key=lambda x: x[0]):
            print(f"{slug:<40} {title[:58]:<60} {diff}")


if __name__ == "__main__":
    main()
