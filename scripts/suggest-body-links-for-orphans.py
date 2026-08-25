#!/usr/bin/env python3
"""Suggest body links to reduce body-link orphans.

An orphan is an EN resource with 0 incoming body links from other EN resources.
For each orphan, find the best source pages in the same topic/tag cluster
and suggest a contextual body link to insert.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"
TYPES = ["recipes", "patterns", "guides", "docs"]


def find_md_files() -> list[Path]:
    files = []
    for t in TYPES:
        files.extend(sorted((CONTENT_DIR / t).rglob("*.md")))
    return [f for f in files if f.name not in ("AGENTS.md", "README.md")]


def parse_simple_list(block: str) -> list[str]:
    items = []
    for line in block.split("\n"):
        line = line.strip()
        if line.startswith("-"):
            items.append(line[1:].strip().strip('"').strip("'"))
    return items


def parse_frontmatter(text: str) -> dict:
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    fm_text = parts[1].strip()
    body = parts[2].strip()
    fm = {"_body": body}

    # extract fields with regex
    def get(field: str) -> str | None:
        m = re.search(rf"^{re.escape(field)}:\s*(.+?)$", fm_text, re.MULTILINE)
        if not m:
            return None
        return m.group(1).strip().strip('"').strip("'")

    def get_list(field: str) -> list[str]:
        m = re.search(rf"^{re.escape(field)}:\s*\n((?:\s*-\s*[^\n]+\n?)+)", fm_text, re.MULTILINE)
        if not m:
            return []
        return parse_simple_list(m.group(1))

    fm["slug"] = get("slug") or ""
    fm["title"] = get("title") or ""
    fm["contentType"] = get("contentType") or ""
    fm["topics"] = get_list("topics")
    fm["tags"] = get_list("tags")
    fm["relatedResources"] = get_list("relatedResources")
    return fm


def extract_body_links(body: str) -> list[str]:
    return re.findall(r"\]\((/[^)]+)\)", body)


def main() -> None:
    entries = []
    url_map = {}
    for f in find_md_files():
        if f.name.endswith(".es.md"):
            continue
        text = f.read_text(encoding="utf-8")
        fm = parse_frontmatter(text)
        if not fm or not fm["slug"]:
            continue
        rel = f.relative_to(CONTENT_DIR).as_posix()
        ctype = rel.split("/")[0]
        content_type = fm.get("contentType") or ctype
        slug = fm["slug"]
        url = f"/{content_type}/{slug}"
        body = fm.get("_body", "")
        body_links = extract_body_links(body)
        entries.append({
            "file": f,
            "rel": rel,
            "contentType": content_type,
            "slug": slug,
            "url": url,
            "topics": [t.strip() for t in fm.get("topics", [])],
            "tags": [t.strip() for t in fm.get("tags", [])],
            "title": fm.get("title", ""),
            "bodyLinks": body_links,
        })
        url_map[url] = entries[-1]

    # Count incoming body links
    incoming = defaultdict(int)
    for e in entries:
        for link in e["bodyLinks"]:
            normalized = link.rstrip("/")
            if normalized.startswith("/es/"):
                normalized = normalized[3:]
            if normalized in url_map:
                incoming[normalized] += 1

    orphans = [e for e in entries if incoming.get(e["url"], 0) == 0]

    by_topic = defaultdict(list)
    for e in entries:
        for t in e["topics"]:
            by_topic[t].append(e)

    by_tag = defaultdict(list)
    for e in entries:
        for t in e["tags"]:
            by_tag[t].append(e)

    suggestions = []
    for orphan in orphans:
        candidates = []
        for topic in orphan["topics"]:
            for src in by_topic[topic]:
                if src["url"] == orphan["url"]:
                    continue
                candidates.append(src)
        for tag in orphan["tags"]:
            for src in by_tag[tag]:
                if src["url"] == orphan["url"]:
                    continue
                candidates.append(src)

        # Score and dedupe
        scored = {}
        for src in candidates:
            su = src["url"]
            if su in scored:
                continue
            out_count = len(src["bodyLinks"])
            if out_count >= 5:
                continue
            shared_topics = set(src["topics"]) & set(orphan["topics"])
            shared_tags = set(src["tags"]) & set(orphan["tags"])
            if not shared_topics and not shared_tags:
                continue
            score = len(shared_topics) * 4 + len(shared_tags) * 2
            # cross-type bonus
            if src["contentType"] != orphan["contentType"]:
                score += 2
            # prefer sources with few body links
            score += max(0, 4 - out_count)
            # prefer longer / more comprehensive sources
            score += min(2, len(src["bodyLinks"]))
            scored[su] = {
                "source": src,
                "score": score,
                "sharedTopics": sorted(shared_topics),
                "sharedTags": sorted(shared_tags),
            }

        top = sorted(scored.values(), key=lambda x: -x["score"])[:5]
        if top:
            suggestions.append({
                "orphan": {
                    "file": orphan["rel"],
                    "url": orphan["url"],
                    "title": orphan["title"],
                    "contentType": orphan["contentType"],
                    "topics": orphan["topics"],
                    "tags": orphan["tags"],
                },
                "sources": [
                    {
                        "file": s["source"]["rel"],
                        "url": s["source"]["url"],
                        "title": s["source"]["title"],
                        "contentType": s["source"]["contentType"],
                        "score": s["score"],
                        "sharedTopics": s["sharedTopics"],
                        "sharedTags": s["sharedTags"],
                        "currentBodyLinks": len(s["source"]["bodyLinks"]),
                    }
                    for s in top
                ],
            })

    out_file = ROOT / "ref" / "internal-linking-suggestions.json"
    out_file.write_text(
        json.dumps(
            {
                "totalEn": len(entries),
                "bodyLinkOrphans": len(orphans),
                "suggestionsCount": len(suggestions),
                "suggestions": suggestions,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    print(f"Total EN resources: {len(entries)}")
    print(f"Body-link orphans (0 incoming body links): {len(orphans)}")
    print(f"Orphans with suggestions: {len(suggestions)}")
    print(f"Suggestions written to: {out_file}")

    by_type = defaultdict(int)
    for o in orphans:
        by_type[o["contentType"]] += 1
    print("\nOrphans by content type:")
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"  {t}: {c}")

    # Top source-orphan pairs
    print("\nTop 20 suggestions:")
    for s in suggestions[:20]:
        o = s["orphan"]
        src = s["sources"][0]
        print(f"  {o['contentType']:8s} {o['url']:50s} <- {src['contentType']:8s} {src['url']} (score {src['score']})")


if __name__ == "__main__":
    main()
