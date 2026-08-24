#!/usr/bin/env python3
"""Fix pages with low incoming links (< 3).

For each target page, find 2-3 related resources in the same topic cluster
that don't currently link to it, and add a single contextual body link.

Tracks which files already received a "See also" line to avoid duplicates.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"

TARGETS = [
    "/recipes/nodejs-caching-redis",
    "/recipes/server-sent-events-node",
    "/recipes/http-cache-control-headers",
    "/recipes/deep-clone-structured",
    "/recipes/nodejs-file-upload-validation",
    "/recipes/debounce-throttle",
    "/patterns/llm-fallback-pattern",
    "/patterns/specification-pattern",
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


def get_topics(file_path: Path) -> list[str]:
    text = file_path.read_text(encoding="utf-8")
    lines = text.split("\n")
    in_topics = False
    topics = []
    for i, line in enumerate(lines):
        if line.strip() == "---" and i > 0:
            break
        if line.strip().startswith("topics:"):
            in_topics = True
            continue
        if in_topics:
            m = re.match(r"^\s+-\s+(.+)$", line)
            if m:
                topics.append(m.group(1).strip())
            elif line.strip() and not line.strip().startswith("-"):
                in_topics = False
    return topics


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


def find_linkers_for_target(target_slug: str, target_topics: list[str], already_modified: set[str]) -> list[Path]:
    candidates = []
    for topic in target_topics:
        for ctype in ("recipes", "patterns", "guides", "docs"):
            ctype_dir = CONTENT_DIR / ctype
            if not ctype_dir.exists():
                continue
            for md_file in ctype_dir.rglob("*.md"):
                if md_file.name.endswith(".es.md"):
                    continue
                if md_file.name in ("AGENTS.md", "README.md"):
                    continue
                file_topics = get_topics(md_file)
                if topic in file_topics:
                    candidates.append(md_file)

    seen = set()
    unique = []
    for c in candidates:
        key = str(c)
        if key not in seen:
            seen.add(key)
            unique.append(c)

    target_file = find_content_file(target_slug)
    target_path_str = str(target_file) if target_file else ""
    result = []
    for c in unique:
        if str(c) == target_path_str:
            continue
        if str(c) in already_modified:
            continue
        text = c.read_text(encoding="utf-8")
        if not has_link_to(text, target_slug):
            result.append(c)

    return result


def add_body_link(file_path: Path, target_slug: str, target_title: str) -> bool:
    text = file_path.read_text(encoding="utf-8")
    lines = text.split("\n")
    is_es = file_path.name.endswith(".es.md")

    overview_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith("## "):
            overview_idx = i
            break

    if overview_idx is None:
        return False

    overview_end = len(lines)
    for i in range(overview_idx + 1, len(lines)):
        if lines[i].strip().startswith("## "):
            overview_end = i
            break

    last_idx = overview_end - 1
    while last_idx > overview_idx and lines[last_idx].strip() == "":
        last_idx -= 1

    if last_idx <= overview_idx:
        return False

    last_line = lines[last_idx]
    if is_es:
        sentence = f" Ver también [{target_title}]({target_slug})."
    else:
        sentence = f" See also [{target_title}]({target_slug})."

    lines[last_idx] = last_line + sentence
    file_path.write_text("\n".join(lines), encoding="utf-8")
    return True


def main():
    total_changes = 0
    already_modified: set[str] = set()

    for target in TARGETS:
        print(f"\n{target}")
        target_file = find_content_file(target)
        if not target_file:
            print(f"  NOT FOUND")
            continue

        target_topics = get_topics(target_file)
        target_title = get_title(target_file)
        es_target_file = target_file.parent / f"{target_file.stem}.es.md"
        es_target_title = get_title(es_target_file) if es_target_file.exists() else target_title

        candidates = find_linkers_for_target(target, target_topics, already_modified)
        print(f"  Candidates: {len(candidates)}")

        # Pick up to 3 candidates
        selected = candidates[:3]
        for cand in selected:
            es_cand = cand.parent / f"{cand.stem}.es.md"
            for f, title in [(cand, target_title), (es_cand, es_target_title)]:
                if f.exists():
                    text = f.read_text(encoding="utf-8")
                    if not has_link_to(text, target):
                        changed = add_body_link(f, target, title)
                        if changed:
                            total_changes += 1
                            already_modified.add(str(f))
                            print(f"  + {target} -> {f.relative_to(ROOT)}")

    print(f"\nTotal links added: {total_changes}")


if __name__ == "__main__":
    main()
