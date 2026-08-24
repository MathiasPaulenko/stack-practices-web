#!/usr/bin/env python3
"""Add body links to docs with 0-1 links in the body.

For each doc template listed in ALL_PROBLEMS_CHECKLIST.md section 4.3,
adds 2-3 contextual body links to related resources in the same topic cluster.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"

# Docs with 0-1 body links from ALL_PROBLEMS_CHECKLIST.md section 4.3
DOCS_TO_FIX = [
    "src/content/docs/api/api-changelog-template.md",
    "src/content/docs/api/api-deprecation-notice-template.md",
    "src/content/docs/api/api-error-handling-guideline.md",
    "src/content/docs/api/api-rate-limiting-policy-template.md",
    "src/content/docs/api/sla-definition-template.md",
    "src/content/docs/architecture/api-lifecycle-management-template.md",
    "src/content/docs/architecture/api-monitoring-alerting-template.md",
    "src/content/docs/architecture/api-performance-budget-template.md",
    "src/content/docs/architecture/microservice-contract-template.md",
    "src/content/docs/architecture/service-dependency-map-template.md",
    "src/content/docs/architecture/system-diagram-template.md",
    "src/content/docs/architecture/technical-spec-template.md",
    "src/content/docs/data-engineering/data-governance-policy-template.md",
    "src/content/docs/data-engineering/data-pipeline-design-document-template.md",
    "src/content/docs/data-engineering/data-quality-rules-template.md",
    "src/content/docs/data-engineering/etl-job-runbook-template.md",
    "src/content/docs/devops/access-control-review-template.md",
    "src/content/docs/devops/architecture-decision-record-adr-template.md",
    "src/content/docs/devops/auto-scaling-policy-template.md",
    "src/content/docs/devops/backup-and-restore-template.md",
    "src/content/docs/devops/backup-verification-test-template.md",
    "src/content/docs/devops/bug-triage-template.md",
    "src/content/docs/devops/capacity-planning-forecast-template.md",
    "src/content/docs/devops/change-management-template.md",
    "src/content/docs/devops/ci-cd-pipeline-design-template.md",
    "src/content/docs/devops/ci-cd-pipeline-security-template.md",
    "src/content/docs/devops/cloud-cost-allocation-template.md",
    "src/content/docs/devops/cloud-resource-tagging-policy-template.md",
    "src/content/docs/devops/code-review-checklist-template.md",
    "src/content/docs/devops/compliance-gap-analysis-template.md",
]


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


def count_body_links(text: str) -> int:
    # Count markdown links to internal pages in the body (after frontmatter)
    parts = text.split("---", 2)
    if len(parts) < 3:
        return 0
    body = parts[2]
    return len(re.findall(r"\]\((/(?:recipes|patterns|guides|docs)/[^)]+)\)", body))


def find_candidates_for_doc(doc_file: Path, topics: list[str], exclude: set[str]) -> list[Path]:
    """Find resources in the same topic cluster to link to."""
    candidates = []
    for topic in topics:
        for ctype in ("recipes", "patterns", "guides"):
            ctype_dir = CONTENT_DIR / ctype
            if not ctype_dir.exists():
                continue
            for md_file in ctype_dir.rglob("*.md"):
                if md_file.name.endswith(".es.md"):
                    continue
                if md_file.name in ("AGENTS.md", "README.md"):
                    continue
                if str(md_file) in exclude:
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

    return unique


def add_related_section(file_path: Path, links: list[tuple[str, str]]) -> bool:
    """Add contextual links at the end of the Overview section."""
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
        return False

    # Build a single sentence with all links
    link_strs = [f"[{title}]({slug})" for slug, title in links]
    if is_es:
        if len(link_strs) == 1:
            sentence = f" Documentos relacionados: {link_strs[0]}."
        elif len(link_strs) == 2:
            sentence = f" Documentos relacionados: {link_strs[0]} y {link_strs[1]}."
        else:
            sentence = f" Documentos relacionados: {', '.join(link_strs[:-1])} y {link_strs[-1]}."
    else:
        if len(link_strs) == 1:
            sentence = f" Related resources: {link_strs[0]}."
        elif len(link_strs) == 2:
            sentence = f" Related resources: {link_strs[0]} and {link_strs[1]}."
        else:
            sentence = f" Related resources: {', '.join(link_strs[:-1])}, and {link_strs[-1]}."

    lines[last_idx] = lines[last_idx] + sentence
    file_path.write_text("\n".join(lines), encoding="utf-8")
    return True


def main():
    total_changes = 0
    for doc_rel_path in DOCS_TO_FIX:
        doc_file = ROOT / doc_rel_path
        if not doc_file.exists():
            print(f"  NOT FOUND: {doc_rel_path}")
            continue

        es_doc_file = doc_file.parent / f"{doc_file.stem}.es.md"

        for f in [doc_file, es_doc_file]:
            if not f.exists():
                continue

            text = f.read_text(encoding="utf-8")
            current_links = count_body_links(text)
            if current_links >= 2:
                continue  # Already has enough

            topics = get_topics(f)
            if not topics:
                print(f"  SKIP (no topics): {f.relative_to(ROOT)}")
                continue

            # Find candidates
            exclude = {str(f)}
            candidates = find_candidates_for_doc(f, topics, exclude)
            if not candidates:
                print(f"  SKIP (no candidates): {f.relative_to(ROOT)}")
                continue

            # Pick 3 candidates
            selected = candidates[:3]
            links = []
            for cand in selected:
                cand_text = cand.read_text(encoding="utf-8")
                slug_m = re.search(r'^slug:\s*"?(.+?)"?\s*$', cand_text, re.MULTILINE)
                if slug_m:
                    raw_slug = slug_m.group(1).strip('"').strip("'")
                else:
                    raw_slug = cand.stem
                ctype = cand.parent.parent.name
                slug = f"/{ctype}/{raw_slug}"
                title = get_title(cand)
                links.append((slug, title))

            # For ES files, get ES titles
            if f == es_doc_file:
                es_links = []
                for cand in selected:
                    es_cand = cand.parent / f"{cand.stem}.es.md"
                    title = get_title(es_cand) if es_cand.exists() else get_title(cand)
                    cand_text = cand.read_text(encoding="utf-8")
                    slug_m = re.search(r'^slug:\s*"?(.+?)"?\s*$', cand_text, re.MULTILINE)
                    if slug_m:
                        raw_slug = slug_m.group(1).strip('"').strip("'")
                    else:
                        raw_slug = cand.stem
                    ctype = cand.parent.parent.name
                    slug = f"/{ctype}/{raw_slug}"
                    es_links.append((slug, title))
                links = es_links

            changed = add_related_section(f, links)
            if changed:
                total_changes += 1
                print(f"  + {f.relative_to(ROOT)}: {len(links)} links")

    print(f"\nFiles modified: {total_changes}")


if __name__ == "__main__":
    main()
