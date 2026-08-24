#!/usr/bin/env python3
"""check-related-resources-coherence.py — check whether relatedResources belong
to the same topic cluster as the source resource.

Usage:
    python scripts/check-related-resources-coherence.py src/content/<tipo>/<slug>.md

Output:
    For each relatedResource that does not share a topic with the source:
        WARN: /recipes/<target>  topics: [<target topics>]  (source topics: [<source topics>])
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


def load_all_resources():
    resources = {}
    for md in glob.glob("src/content/**/*.md", recursive=True):
        if md.endswith(".es.md"):
            continue
        text = Path(md).read_text(encoding="utf-8")
        meta = parse_frontmatter(text)
        if not meta:
            continue
        content_type = meta.get("contentType", "")
        slug = meta.get("slug", "")
        if not content_type or not slug:
            continue
        # URL path used in relatedResources: /<contentType>/<slug>
        key = f"/{content_type}/{slug}"
        resources[key] = {
            "file": md,
            "topics": set(meta.get("topics", [])),
            "title": meta.get("title", ""),
            "difficulty": meta.get("difficulty", ""),
        }
    return resources


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/check-related-resources-coherence.py src/content/<tipo>/<slug>.md")
        sys.exit(1)

    source_path = Path(sys.argv[1])
    if not source_path.exists():
        print(f"File not found: {source_path}")
        sys.exit(1)

    source_text = source_path.read_text(encoding="utf-8")
    source_meta = parse_frontmatter(source_text)
    if not source_meta:
        print(f"Could not parse frontmatter: {source_path}")
        sys.exit(1)

    source_topics = set(source_meta.get("topics", []))
    related = source_meta.get("relatedResources", [])

    if not related:
        print("No relatedResources found.")
        sys.exit(0)

    all_resources = load_all_resources()
    warnings = 0
    missing = []

    for ref in related:
        if not ref.startswith("/"):
            ref = "/" + ref
        target = all_resources.get(ref)
        if not target:
            missing.append(ref)
            continue
        target_topics = target["topics"]
        if not source_topics.intersection(target_topics):
            warnings += 1
            print(
                f"WARN: {ref:<45} topics: {sorted(target_topics)}  "
                f"(source topics: {sorted(source_topics)})"
            )

    if missing:
        for ref in missing:
            print(f"MISSING: {ref}")

    if warnings == 0 and not missing:
        print("All relatedResources share at least one topic with the source.")
    else:
        print(f"\n{warnings} incoherent, {len(missing)} missing out of {len(related)} related resources.")


if __name__ == "__main__":
    main()
