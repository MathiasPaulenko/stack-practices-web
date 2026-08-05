#!/usr/bin/env python3
"""
Content Audit Compiler for StackPractices.

Reads the existing audit artifacts and markdown source, then produces a
full 10-phase content audit in ref/content-audit/.
"""

from __future__ import annotations

import csv
import json
import math
import re
import urllib.parse
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path("D:/Codigo/stack-practices-web")
INPUT_AUDIT = PROJECT_ROOT / "ref" / "audit-data.json"
INPUT_LINKS = PROJECT_ROOT / "ref" / "internal-linking-data.json"
INPUT_SCORES = (
    PROJECT_ROOT / "ref" / "helpful-content-forensic-audit" / "PAGE_SCORES.csv"
)
INPUT_CONTENT = PROJECT_ROOT / "src" / "content"
OUTPUT_DIR = PROJECT_ROOT / "ref" / "content-audit"

ALLOWED_TOPICS = {
    "data",
    "api",
    "authentication",
    "file-handling",
    "performance",
    "testing",
    "architecture",
    "design",
    "devops",
    "databases",
    "concurrency",
    "security",
    "ai",
    "frontend",
    "infrastructure",
    "messaging",
    "observability",
    "graphql",
    "serverless",
    "caching",
}

OUTPUT_SCORE_FIELDS = [
    "url",
    "path",
    "lang",
    "page_type",
    "content_inventory_type",
    "purpose",
    "search_intent",
    "audience",
    "word_count",
    "readability_score",
    "clarity_score",
    "completeness_score",
    "practical_value_score",
    "originality_score",
    "depth_score",
    "accuracy_score",
    "freshness_score",
    "consistency_score",
    "logical_flow_score",
    "formatting_score",
    "examples_score",
    "code_samples",
    "images",
    "tables",
    "lists",
    "diagrams",
    "downloads",
    "internal_links",
    "external_refs",
    "overall_score",
    "action",
]

ACTION_FILE_FIELDS = ["url", "path", "type", "overall_score", "evidence", "recommended_action"]

GAP_FIELDS = ["gap_type", "language", "item", "evidence", "recommendation"]


def load_json(path: Path) -> Any:
    """Load a JSON file and return its contents."""
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_csv(path: Path) -> list[dict[str, str]]:
    """Load a CSV file, treating the first column BOM if present."""
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(rows: list[dict[str, Any]], fields: list[str], path: Path) -> None:
    """Write a list of dictionaries to a CSV file with the given field order."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fields})


def extract_body(file_path: Path) -> str:
    """Return the markdown body after the frontmatter block, if any."""
    text = file_path.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) >= 3:
        return parts[2]
    return text


def count_lists(body: str) -> int:
    """Count list item lines (unordered or ordered) outside code blocks."""
    # Strip fenced code blocks so code examples do not inflate the count.
    body_no_code = re.sub(r"```[\s\S]*?```", "", body)
    return len(
        re.findall(
            r"^\s*(?:[-*]|\d+[.)])\s+", body_no_code, flags=re.MULTILINE
        )
    )


def count_downloads(body: str) -> int:
    """Count markdown links that point to common download file types."""
    body_no_code = re.sub(r"```[\s\S]*?```", "", body)
    links = re.findall(r"\[.*?\]\(([^)]+)\)", body_no_code)
    downloads = 0
    for link in links:
        if any(
            link.lower().endswith(ext) for ext in (".pdf", ".zip", ".epub", ".docx")
        ):
            downloads += 1
    return downloads


def count_syllables(word: str) -> int:
    """Approximate English/Spanish syllable count by counting vowel groups."""
    cleaned = re.sub(r"[^a-zA-ZáéíóúüÁÉÍÓÚÜ]", "", word).lower()
    if not cleaned:
        return 0
    groups = re.findall(r"[aeiouyáéíóúü]+", cleaned)
    # Simple silent-e reduction.
    if cleaned.endswith("e") and len(groups) > 1 and not cleaned.endswith("le"):
        groups = groups[:-1]
    return max(1, len(groups))


def flesch_score(text: str) -> int:
    """Compute the Flesch Reading Ease score, clamped to 0-100."""
    words = re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ']+", text)
    sentences = re.findall(r"[.!?]+", text)
    if not words or not sentences:
        return 0
    syllables = sum(count_syllables(w) for w in words)
    score = (
        206.835
        - 1.015 * (len(words) / len(sentences))
        - 84.6 * (syllables / len(words))
    )
    return max(0, min(100, round(score)))


def readability_text(page: dict[str, Any], body: str) -> str:
    """Return the text to use for readability scoring for a page."""
    if body.strip():
        return body
    # Fallback for non-content pages: title, meta description, and H1.
    # Avoid lower-level headings because they often contain navigation/footer text.
    parts = [page.get("title") or "", page.get("metaDesc") or ""]
    parts.extend(page.get("h1") or [])
    return " ".join(str(p) for p in parts if p)


def freshness_score(
    last_updated: str | None, ref_date: datetime, is_content: bool
) -> int:
    """
    Return a freshness score based on lastUpdated.

    Content with missing lastUpdated scores 0. Non-content pages are treated
    as evergreen (100) because they do not carry a content lastUpdated field.
    """
    if not last_updated:
        return 0 if is_content else 100
    try:
        parsed = datetime.fromisoformat(str(last_updated).strip()).date()
    except (ValueError, TypeError):
        return 0 if is_content else 100
    delta = (ref_date - parsed).days
    if delta <= 180:
        return 100
    if delta <= 365:
        return 80
    if delta <= 730:
        return 50
    return 20


def clarity_score(
    *,
    duplicate_title: bool,
    h1_count: int,
    h2_count: int,
    missing_alt: int,
) -> int:
    """Compute a 0-100 clarity score."""
    score = 100
    if duplicate_title:
        score -= 15
    if h1_count != 1:
        score -= 20
    if missing_alt > 0:
        score -= 10
    if h2_count < 2:
        score -= 10
    return max(0, score)


def consistency_score(
    *,
    duplicate_title: bool,
    duplicate_description: bool,
    h1_count: int,
    is_content: bool,
    author: str | None,
    related_resources: list[str],
) -> int:
    """Compute a 0-100 consistency score."""
    score = 100
    if duplicate_title:
        score -= 15
    if duplicate_description:
        score -= 10
    if h1_count != 1:
        score -= 10
    if is_content:
        if not author:
            score -= 15
        if not related_resources:
            score -= 10
    return max(0, score)


def logical_flow_score(text: str) -> int:
    """
    Score logical flow based on the presence of overview, solution, and examples.
    Returns 100 for all three, 80 for two, 50 for one, and 20 for none.
    """
    has_overview = bool(
        re.search(
            r"\b(?:overview|introduction|intro|resumen|introducción|background|context|what is|qué es)\b",
            text,
            re.IGNORECASE,
        )
    )
    has_solution = bool(
        re.search(
            r"\b(?:solution|how to|how do|implementation|steps|guide|usage|aplica(?:ción)?|cómo|tutorial|solución|approach|pattern)\b",
            text,
            re.IGNORECASE,
        )
    )
    has_examples = bool(
        re.search(
            r"\b(?:example|examples|sample|demo|snippet|code|usage|uso|ejemplo|ejemplos|samples|case study)\b",
            text,
            re.IGNORECASE,
        )
    )
    matches = sum([has_overview, has_solution, has_examples])
    if matches == 3:
        return 100
    if matches == 2:
        return 80
    if matches == 1:
        return 50
    return 20


def formatting_score(
    *,
    h2_count: int,
    code_blocks: int,
    tables: int,
    lists: int,
    images: int,
) -> int:
    """
    Compute a 0-100 formatting score.

    Pages with H2>=2, code blocks or tables, and lists receive a higher base;
    the score then scales with the counts of each element.
    """
    has_structure = (
        h2_count >= 2 and (code_blocks > 0 or tables > 0) and lists > 0
    )
    base = 80 if has_structure else 50
    count_score = (
        h2_count * 2
        + (code_blocks + tables) * 3
        + lists * 2
        + images * 1
    )
    return min(100, base + count_score)


def examples_score(
    *, code_blocks: int, tables: int, lists: int, images: int
) -> int:
    """Compute the examples score from rich media counts."""
    return min(100, code_blocks * 10 + tables * 5 + lists * 2 + images * 2)


def accuracy_score(
    *, page_type: str, code_blocks: int, has_json_ld: bool
) -> int:
    """Estimate technical accuracy from code samples and schema presence."""
    if page_type == "content":
        if code_blocks > 0 and has_json_ld:
            return 100
        if code_blocks > 0 or has_json_ld:
            return 85
        return 75
    return 85 if has_json_ld else 70


def overall_score(scores: dict[str, float]) -> float:
    """Weighted overall score from individual dimension scores."""
    return round(
        0.15 * scores["readability"]
        + 0.10 * scores["clarity"]
        + 0.10 * scores["completeness"]
        + 0.10 * scores["practical"]
        + 0.10 * scores["originality"]
        + 0.10 * scores["depth"]
        + 0.05 * scores["accuracy"]
        + 0.10 * scores["freshness"]
        + 0.05 * scores["consistency"]
        + 0.05 * scores["logical_flow"]
        + 0.10 * scores["formatting"],
        2,
    )


def derive_metadata(inventory_type: str, page_type: str, difficulty: str | None) -> dict[str, str]:
    """Derive purpose, search_intent, and audience from page/inventory type."""
    inv = inventory_type.strip().lower() if inventory_type else page_type
    purpose_map = {
        "recipe": "Provide a runnable, copy-paste code solution to a specific development problem",
        "pattern": "Explain a reusable design pattern with motivation, structure, and examples",
        "guide": "Deliver a comprehensive, long-form technical guide",
        "template": "Provide a reusable template or checklist for engineering teams",
        "checklist": "Provide a step-by-step checklist or runbook for engineering teams",
        "template/checklist": "Provide a reusable template or checklist for engineering teams",
        "tag": "Aggregate and navigate content tagged with a specific term",
        "topic": "Organize and browse content by topic area",
        "static": "Provide legal, about, or utility information",
        "home": "Introduce the site and route users to key sections",
        "landing page": "Introduce a content section and guide users inward",
        "other": "Utility or fallback page",
    }
    intent_map = {
        "recipe": "Transactional / How-to",
        "pattern": "Informational / Learn",
        "guide": "Informational / Deep learning",
        "template": "Transactional / Downloadable resource",
        "checklist": "Transactional / Step-by-step task",
        "template/checklist": "Transactional / Downloadable resource",
        "tag": "Navigational / Browse",
        "topic": "Navigational / Browse",
        "static": "Informational / Trust",
        "home": "Navigational / Brand",
        "landing page": "Navigational / Section",
        "other": "Navigational",
    }
    audience_map = {
        "recipe": "Software engineers needing a quick working solution",
        "pattern": "Developers and architects studying reusable design patterns",
        "guide": "Software engineers and architects seeking in-depth guidance",
        "template": "Engineering teams and technical writers",
        "checklist": "Engineering teams and operators",
        "template/checklist": "Engineering teams and technical writers",
        "tag": "Developers browsing by tag",
        "topic": "Developers browsing by topic",
        "static": "All users",
        "home": "All users",
        "landing page": "Developers exploring a content section",
        "other": "All users",
    }
    purpose = purpose_map.get(inv, purpose_map.get(page_type, "Provide information"))
    search_intent = intent_map.get(inv, intent_map.get(page_type, "Informational"))
    audience = audience_map.get(inv, audience_map.get(page_type, "All users"))
    if page_type == "content" and difficulty:
        audience += f" ({difficulty})"
    return {"purpose": purpose, "search_intent": search_intent, "audience": audience}


def cluster_size_for_page(
    path: str, page_type: str, tag_clusters: dict, topic_clusters: dict
) -> int:
    """Return the cluster size for a tag or topic page."""
    if page_type not in ("tag", "topic"):
        return 0
    parts = path.strip("/").split("/")
    if len(parts) < 2:
        return 0
    lang = "es" if parts[0] == "es" else "en"
    raw = parts[2] if lang == "es" else parts[1]
    key = urllib.parse.unquote(raw).lower().strip()
    clusters = tag_clusters if page_type == "tag" else topic_clusters
    return clusters.get(lang, {}).get(key, 0)


def classify_action(
    *,
    page_type: str,
    word_count: int,
    overall: float,
    practical_value: int,
    completeness: int,
    depth: int,
    originality: int,
    h1_count: int,
    duplicate_title: bool,
    duplicate_description: bool,
    freshness: int,
    consistency: int,
    cluster_size: int,
    noindex: bool,
    path: str,
) -> tuple[str, str, str]:
    """
    Classify a page into one of the six actions and produce evidence/recommendation.
    Returns (action, evidence, recommended_action).
    """
    if noindex or (page_type == "content" and overall < 30):
        action = "NOINDEX"
        if noindex:
            evidence = f"Meta robots is noindex (overall score {overall})."
            recommended_action = "Noindex or merge into an equivalent indexable page."
        else:
            evidence = f"Very low overall score ({overall}); content quality is below the minimum threshold."
            recommended_action = "Noindex or completely rewrite the page."
        return action, evidence, recommended_action

    # Empty tag/topic pages have no resources; redirect to parent listing.
    if page_type in ("tag", "topic") and cluster_size == 0:
        return (
            "REDIRECT",
            f"Empty {page_type} (cluster_size=0).",
            f"Redirect the {page_type} page to the parent listing or a broader {page_type}.",
        )

    # Thin tag/topic pages with 1-2 resources should be merged into broader topics.
    if page_type in ("tag", "topic") and cluster_size <= 2:
        return (
            "MERGE",
            f"Thin {page_type} (word_count={word_count}, cluster_size={cluster_size}).",
            f"Merge this {page_type} into a broader {page_type} or a relevant listing page.",
        )

    # Tag/topic pages with 3+ resources but low word count still risk thin content.
    if page_type in ("tag", "topic") and word_count < 250:
        return (
            "MERGE",
            f"Thin {page_type} (word_count={word_count}, cluster_size={cluster_size}).",
            f"Merge or expand this {page_type} with unique editorial content.",
        )

    # Content-specific actions.
    issues = []
    if duplicate_title:
        issues.append("duplicate title")
    if duplicate_description:
        issues.append("duplicate meta description")
    if h1_count > 1:
        issues.append("multiple H1")
    if freshness < 50:
        issues.append("low freshness")
    if consistency < 80:
        issues.append("low consistency")
    if practical_value < 60:
        issues.append("low practical value")

    if page_type == "content" and issues:
        return (
            "UPDATE",
            f"Overall score {overall} with issues: {', '.join(issues)}.",
            "Update the page to resolve the listed issues and improve quality.",
        )

    if page_type == "content" and (completeness < 75 or depth < 70):
        return (
            "EXPAND",
            f"Low completeness ({completeness}) or depth ({depth}) for a content page.",
            "Expand the content with more examples, edge cases, context, and related links.",
        )

    if (
        page_type == "content"
        and overall >= 70
        and h1_count == 1
        and not duplicate_title
    ):
        return (
            "KEEP",
            f"Strong overall score ({overall}), single H1, unique title, consistent metadata.",
            "Keep the page as-is; continue monitoring rankings and user feedback.",
        )

    # Fallback keep for everything else (non-content pages, etc.).
    if issues:
        return (
            "KEEP",
            f"Overall score {overall}; keep, but monitor: {', '.join(issues)}.",
            "Keep, but address the listed issues in a future update.",
        )
    return (
        "KEEP",
        f"Overall score {overall}; best available action is keep.",
        "Keep and schedule periodic review.",
    )


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------
def main() -> None:
    ref_date = datetime.now().date()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    audit = load_json(INPUT_AUDIT)
    linking = load_json(INPUT_LINKS)
    score_rows = load_csv(INPUT_SCORES)

    pages = {pg["url"]: pg for pg in audit["pages"]}
    pages_by_path = {pg["path"]: pg for pg in audit["pages"]}

    # Map markdown source files by built page path.
    md_by_path: dict[str, dict[str, Any]] = {}
    md_bodies: dict[str, str] = {}
    for md in audit.get("mdFiles", []):
        lang = "es" if md.get("isEs") else "en"
        path = f"/{md['contentType']}/{md['slug']}/"
        if lang == "es":
            path = f"/es{path}"
        full_path = PROJECT_ROOT / md["file"]
        if full_path.exists():
            body = extract_body(full_path)
            md_bodies[path] = body
            md_by_path[path] = md

    # Compute tag/topic clusters per language.
    tag_clusters: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    topic_clusters: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for md in audit.get("mdFiles", []):
        lang = md.get("locale", "en")
        for tag in md.get("tags") or []:
            tag_clusters[lang][str(tag).lower().strip()] += 1
        for topic in md.get("topics") or []:
            topic_clusters[lang][str(topic).lower().strip()] += 1

    # Compute in-degree from content relatedResources for orphan detection.
    in_degree: dict[tuple[str, str], int] = defaultdict(int)
    for md in audit.get("mdFiles", []):
        lang = md.get("locale", "en")
        for rel in md.get("relatedResources") or []:
            if not rel.startswith("/"):
                continue
            parts = rel.strip("/").split("/")
            if len(parts) < 2:
                continue
            rel_type, rel_slug = parts[0], parts[1]
            target = f"/{rel_type}/{rel_slug}/"
            if lang == "es":
                target = f"/es{target}"
            in_degree[(lang, target)] += 1

    # Pre-calculate title/description/heading sequence groups.
    title_groups: dict[str, list[str]] = defaultdict(list)
    desc_groups: dict[str, list[str]] = defaultdict(list)
    h2_sequence_groups: dict[tuple, list[str]] = defaultdict(list)
    for pg in audit["pages"]:
        title = (pg.get("title") or "").strip()
        if title:
            title_groups[title].append(pg["url"])
        desc = (pg.get("metaDesc") or "").strip()
        if desc:
            desc_groups[desc].append(pg["url"])
        h2 = tuple(pg.get("h2") or [])
        if h2:
            h2_sequence_groups[h2].append(pg["url"])

    # Small tag clusters for cannibalization.
    small_tag_clusters = [
        (lang, tag, count)
        for lang, tags in tag_clusters.items()
        for tag, count in tags.items()
        if count <= 2
    ]

    # Build enriched page scores.
    scored_rows: list[dict[str, Any]] = []
    action_buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for row in score_rows:
        url = row["url"]
        path = row["path"]
        lang = row["lang"]
        page_type = row["page_type"]
        inventory_type = row["content_inventory_type"]
        word_count = int(row["word_count"] or 0)
        h1_count = int(row["h1_count"] or 0)
        h2_count = int(row["h2_count"] or 0)
        code_blocks = int(row["code_blocks"] or 0)
        tables = int(row["tables"] or 0)
        duplicate_title = row.get("duplicate_title", "").lower() == "true"
        duplicate_description = row.get("duplicate_description", "").lower() == "true"
        depth = float(row["depth_score"] or 0)
        originality = float(row["originality_score"] or 0)
        practical = float(row["practical_value_score"] or 0)
        helpfulness = float(row["helpfulness_score"] or 0)

        page = pages.get(url, {})
        md = md_by_path.get(path)
        body = md_bodies.get(path, "")
        is_content = page_type == "content"

        # Body counts.
        lists = count_lists(body) if is_content else 0
        downloads = count_downloads(body) if is_content else 0

        # Metadata from markdown when available.
        author = md.get("author") if md else None
        related_resources = md.get("relatedResources") or [] if md else []
        last_updated = md.get("lastUpdated") if md else None
        tags = md.get("tags") or [] if md else []
        topics = md.get("topics") or [] if md else []
        difficulty = md.get("difficulty") if md else None

        # Image/diagram counts.
        if is_content and md:
            images = int(md.get("images") or 0)
        else:
            images = len(page.get("images") or [])

        # Readability.
        text = readability_text(page, body)
        readability = flesch_score(text)

        # Clarity, consistency, etc.
        missing_alt = int(page.get("missingAlt") or 0)
        clarity = clarity_score(
            duplicate_title=duplicate_title,
            h1_count=h1_count,
            h2_count=h2_count,
            missing_alt=missing_alt,
        )
        consistency = consistency_score(
            duplicate_title=duplicate_title,
            duplicate_description=duplicate_description,
            h1_count=h1_count,
            is_content=is_content,
            author=author,
            related_resources=related_resources,
        )

        logical_flow = logical_flow_score(text)
        formatting = formatting_score(
            h2_count=h2_count,
            code_blocks=code_blocks,
            tables=tables,
            lists=lists,
            images=images,
        )
        examples = examples_score(
            code_blocks=code_blocks, tables=tables, lists=lists, images=images
        )

        # Derived scores from base data.
        freshness = freshness_score(last_updated, ref_date, is_content)
        has_json_ld = bool(page.get("jsonLd"))
        accuracy = accuracy_score(
            page_type=page_type,
            code_blocks=code_blocks,
            has_json_ld=has_json_ld,
        )
        completeness = helpfulness

        scores = {
            "readability": readability,
            "clarity": clarity,
            "completeness": completeness,
            "practical": practical,
            "originality": originality,
            "depth": depth,
            "accuracy": accuracy,
            "freshness": freshness,
            "consistency": consistency,
            "logical_flow": logical_flow,
            "formatting": formatting,
        }

        overall = overall_score(scores)

        # Cluster size for tag/topic pages.
        cluster_size = cluster_size_for_page(path, page_type, tag_clusters, topic_clusters)

        meta = derive_metadata(inventory_type, page_type, difficulty)

        noindex = bool(page.get("metaRobots")) and "noindex" in page["metaRobots"].lower()

        action, evidence, recommended_action = classify_action(
            page_type=page_type,
            word_count=word_count,
            overall=overall,
            practical_value=practical,
            completeness=completeness,
            depth=depth,
            originality=originality,
            h1_count=h1_count,
            duplicate_title=duplicate_title,
            duplicate_description=duplicate_description,
            freshness=freshness,
            consistency=consistency,
            cluster_size=cluster_size,
            noindex=noindex,
            path=path,
        )

        # Build output row.
        out = {
            "url": url,
            "path": path,
            "lang": lang,
            "page_type": page_type,
            "content_inventory_type": inventory_type,
            "purpose": meta["purpose"],
            "search_intent": meta["search_intent"],
            "audience": meta["audience"],
            "word_count": word_count,
            "readability_score": readability,
            "clarity_score": clarity,
            "completeness_score": round(helpfulness),
            "practical_value_score": round(practical),
            "originality_score": round(originality),
            "depth_score": round(depth),
            "accuracy_score": accuracy,
            "freshness_score": freshness,
            "consistency_score": consistency,
            "logical_flow_score": logical_flow,
            "formatting_score": formatting,
            "examples_score": examples,
            "code_samples": code_blocks,
            "images": images,
            "tables": tables,
            "lists": lists,
            "diagrams": images,
            "downloads": downloads,
            "internal_links": len(page.get("internalLinks") or []),
            "external_refs": len(page.get("externalLinks") or []),
            "overall_score": overall,
            "action": action,
        }
        scored_rows.append(out)

        action_row = {
            "url": url,
            "path": path,
            "type": page_type,
            "overall_score": overall,
            "evidence": evidence,
            "recommended_action": recommended_action,
        }
        action_buckets[action].append(action_row)

    # -----------------------------------------------------------------------
    # Output CSVs
    # -----------------------------------------------------------------------
    write_csv(scored_rows, OUTPUT_SCORE_FIELDS, OUTPUT_DIR / "PAGE_SCORES.csv")

    for action in ("KEEP", "UPDATE", "EXPAND", "MERGE", "REDIRECT", "NOINDEX"):
        filename = f"{action}_PAGES.csv"
        write_csv(
            action_buckets.get(action, []), ACTION_FILE_FIELDS, OUTPUT_DIR / filename
        )

    # -----------------------------------------------------------------------
    # Content Gaps
    # -----------------------------------------------------------------------
    gaps: list[dict[str, Any]] = []

    # Missing translations / missing English source.
    content_files = sorted(INPUT_CONTENT.rglob("*.md"))
    base_to_langs: dict[Path, set[str]] = defaultdict(set)
    for f in content_files:
        if f.name.endswith(".es.md"):
            base = f.with_name(f.name.replace(".es.md", ".md"))
            lang = "es"
        else:
            base = f
            lang = "en"
        base_to_langs[base].add(lang)

    for base, langs in base_to_langs.items():
        if "en" not in langs:
            rel = base.relative_to(PROJECT_ROOT).as_posix()
            gaps.append(
                {
                    "gap_type": "missing_english_source",
                    "language": "en",
                    "item": rel,
                    "evidence": f"Spanish translation exists without an English source: {rel.replace('.md', '.es.md')}",
                    "recommendation": "Create the matching English .md file.",
                }
            )
        if "es" not in langs:
            rel = base.relative_to(PROJECT_ROOT).as_posix()
            gaps.append(
                {
                    "gap_type": "missing_spanish_translation",
                    "language": "es",
                    "item": rel,
                    "evidence": f"English source exists without a Spanish translation: {rel}",
                    "recommendation": "Create the matching .es.md translation.",
                }
            )

    # Sparse related resources.
    for md in audit.get("mdFiles", []):
        rel_res = md.get("relatedResources") or []
        if len(rel_res) < 2:
            path = (
                f"/{md['contentType']}/{md['slug']}/"
                if not md.get("isEs")
                else f"/es/{md['contentType']}/{md['slug']}/"
            )
            gaps.append(
                {
                    "gap_type": "sparse_related_resources",
                    "language": md.get("locale", "en"),
                    "item": path,
                    "evidence": f"Only {len(rel_res)} related resource(s); target is at least 2-3.",
                    "recommendation": "Add relevant relatedResources to improve internal linking.",
                }
            )

    # Low-coverage topics.
    topic_counts: dict[str, int] = Counter()
    for md in audit.get("mdFiles", []):
        for topic in md.get("topics") or []:
            topic_counts[str(topic).lower().strip()] += 1

    invalid_topics = set(topic_counts.keys()) - ALLOWED_TOPICS
    for topic in invalid_topics:
        gaps.append(
            {
                "gap_type": "invalid_topic",
                "language": "",
                "item": topic,
                "evidence": f"Topic '{topic}' is not in the allowed topics enum.",
                "recommendation": "Remap to an allowed topic value.",
            }
        )

    for topic in ALLOWED_TOPICS:
        count = topic_counts.get(topic, 0)
        if count < 5:
            gaps.append(
                {
                    "gap_type": "low_coverage_topic",
                    "language": "",
                    "item": topic,
                    "evidence": f"Only {count} resource(s) for topic '{topic}' (target >= 5).",
                    "recommendation": "Create or tag more content for this topic.",
                }
            )

    write_csv(gaps, GAP_FIELDS, OUTPUT_DIR / "CONTENT_GAPS.csv")

    # -----------------------------------------------------------------------
    # Cannibalization Report
    # -----------------------------------------------------------------------
    dup_title_groups = {k: v for k, v in title_groups.items() if len(v) > 1}
    dup_desc_groups = {k: v for k, v in desc_groups.items() if len(v) > 1}
    dup_h2_groups = {k: v for k, v in h2_sequence_groups.items() if len(v) > 3}

    cannibal_lines: list[str] = [
        "# Cannibalization Report",
        "",
        "This report highlights duplicate or near-duplicate signals that can",
        "dilute topical authority and confuse search engines.",
        "",
    ]

    cannibal_lines.append(f"## Duplicate Titles ({len(dup_title_groups)} groups)")
    cannibal_lines.append("")
    for title, urls in sorted(dup_title_groups.items(), key=lambda x: -len(x[1])):
        cannibal_lines.append(f"- **{title[:120]}** — {len(urls)} pages")
        for u in urls[:10]:
            cannibal_lines.append(f"  - {u}")
        if len(urls) > 10:
            cannibal_lines.append(f"  - ... and {len(urls) - 10} more")
    cannibal_lines.append("")

    cannibal_lines.append(f"## Duplicate Descriptions ({len(dup_desc_groups)} groups)")
    cannibal_lines.append("")
    for desc, urls in sorted(dup_desc_groups.items(), key=lambda x: -len(x[1])):
        cannibal_lines.append(f"- **{desc[:120]}...** — {len(urls)} pages")
        for u in urls[:10]:
            cannibal_lines.append(f"  - {u}")
        if len(urls) > 10:
            cannibal_lines.append(f"  - ... and {len(urls) - 10} more")
    cannibal_lines.append("")

    cannibal_lines.append(f"## Repeated H2 Sequences ({len(dup_h2_groups)} groups)")
    cannibal_lines.append("Groups of >3 pages that share the same H2 heading sequence.")
    cannibal_lines.append("")
    for h2s, urls in sorted(dup_h2_groups.items(), key=lambda x: -len(x[1])):
        heading_summary = " | ".join(h2s[:5])
        cannibal_lines.append(f"- **{heading_summary}** — {len(urls)} pages")
        for u in urls[:10]:
            cannibal_lines.append(f"  - {u}")
        if len(urls) > 10:
            cannibal_lines.append(f"  - ... and {len(urls) - 10} more")
    cannibal_lines.append("")

    cannibal_lines.append(f"## Weak Tag Clusters ({len(small_tag_clusters)} tags)")
    cannibal_lines.append("Tags with 2 or fewer resources may cannibalize or dilute authority.")
    cannibal_lines.append("")
    for lang, tag, count in sorted(small_tag_clusters, key=lambda x: (x[0], x[1])):
        prefix = f"/{lang}/tags/" if lang == "es" else "/tags/"
        cannibal_lines.append(
            f"- **{prefix}{tag}/** — {count} resource(s)"
        )
    cannibal_lines.append("")

    (OUTPUT_DIR / "CANNIBALIZATION_REPORT.md").write_text(
        "\n".join(cannibal_lines), encoding="utf-8"
    )

    # -----------------------------------------------------------------------
    # Content Cluster Report
    # -----------------------------------------------------------------------
    cluster_lines: list[str] = [
        "# Content Cluster Report",
        "",
    ]

    cluster_lines.append("## Tag Clusters")
    cluster_lines.append("")
    cluster_lines.append("| Language | Tag | Resources |")
    cluster_lines.append("| --- | --- | --- |")
    for lang in sorted(tag_clusters.keys()):
        for tag, count in sorted(
            tag_clusters[lang].items(), key=lambda x: (-x[1], x[0])
        ):
            cluster_lines.append(f"| {lang} | {tag} | {count} |")
    cluster_lines.append("")

    cluster_lines.append("## Topic Clusters")
    cluster_lines.append("")
    cluster_lines.append("| Language | Topic | Resources |")
    cluster_lines.append("| --- | --- | --- |")
    for lang in sorted(topic_clusters.keys()):
        for topic, count in sorted(
            topic_clusters[lang].items(), key=lambda x: (-x[1], x[0])
        ):
            cluster_lines.append(f"| {lang} | {topic} | {count} |")
    cluster_lines.append("")

    # Orphan pages (internal_links == 0).
    orphan_count = sum(1 for out in scored_rows if out["internal_links"] == 0)
    cluster_lines.append(f"## Orphan Pages")
    cluster_lines.append(f"Pages with `internal_links == 0`: **{orphan_count}**")
    cluster_lines.append("")
    if orphan_count:
        cluster_lines.append("| URL | Path | Type |")
        cluster_lines.append("| --- | --- | --- |")
        for out in scored_rows:
            if out["internal_links"] == 0:
                cluster_lines.append(
                    f"| {out['url']} | {out['path']} | {out['page_type']} |"
                )
    cluster_lines.append("")

    # Effective orphans: content pages with no incoming related-resource links.
    effective_orphans = [
        out for out in scored_rows
        if out["page_type"] == "content" and in_degree.get((out["lang"], out["path"]), 0) == 0
    ]
    cluster_lines.append("## Effective Orphan Content (no incoming related-resource links)")
    cluster_lines.append(
        f"Content pages not referenced by any other content's relatedResources: **{len(effective_orphans)}**"
    )
    cluster_lines.append("")
    if effective_orphans:
        cluster_lines.append("| URL | Path | Language |")
        cluster_lines.append("| --- | --- | --- |")
        for out in sorted(
            effective_orphans, key=lambda x: x["internal_links"]
        )[:200]:
            cluster_lines.append(
                f"| {out['url']} | {out['path']} | {out['lang']} |"
            )
    cluster_lines.append("")

    # Pillar/hub candidates.
    content_over_1k = [
        out for out in scored_rows
        if out["page_type"] == "content" and out["word_count"] > 1000
    ]
    pillar_candidates = sorted(
        content_over_1k, key=lambda x: x["internal_links"], reverse=True
    )[:20]
    cluster_lines.append("## Pillar / Hub Candidates")
    cluster_lines.append("Content pages over 1,000 words with the most internal links.")
    cluster_lines.append("")
    cluster_lines.append("| URL | Word Count | Internal Links |")
    cluster_lines.append("| --- | --- | --- |")
    for out in pillar_candidates:
        cluster_lines.append(
            f"| {out['url']} | {out['word_count']} | {out['internal_links']} |"
        )
    cluster_lines.append("")

    (OUTPUT_DIR / "CONTENT_CLUSTER_REPORT.md").write_text(
        "\n".join(cluster_lines), encoding="utf-8"
    )

    # -----------------------------------------------------------------------
    # Executive Summary
    # -----------------------------------------------------------------------
    action_counts = {a: len(rows) for a, rows in action_buckets.items()}
    action_counts.setdefault("KEEP", 0)
    action_counts.setdefault("UPDATE", 0)
    action_counts.setdefault("EXPAND", 0)
    action_counts.setdefault("MERGE", 0)
    action_counts.setdefault("REDIRECT", 0)
    action_counts.setdefault("NOINDEX", 0)

    avg_overall = round(
        sum(r["overall_score"] for r in scored_rows) / len(scored_rows), 2
    ) if scored_rows else 0
    low_score_count = sum(1 for r in scored_rows if r["overall_score"] < 50)
    thin_content_count = sum(
        1 for r in scored_rows if r["page_type"] == "content" and r["word_count"] < 500
    )
    missing_alt_count = sum(
        1 for pg in audit["pages"] if int(pg.get("missingAlt") or 0) > 0
    )
    metadata_issue_count = sum(
        1 for r in scored_rows if r["consistency_score"] < 100
    )

    summary = f"""# Executive Summary

## Verdict
The content audit analyzed **{len(scored_rows)}** built pages. The average overall score is **{avg_overall} / 100**. The site has strong, in-depth content (guides, recipes, patterns, docs) but suffers from a large number of thin tag pages and some metadata consistency issues.

## Action Counts

| Action | Count |
| --- | --- |
| KEEP | {action_counts['KEEP']} |
| UPDATE | {action_counts['UPDATE']} |
| EXPAND | {action_counts['EXPAND']} |
| MERGE | {action_counts['MERGE']} |
| REDIRECT | {action_counts['REDIRECT']} |
| NOINDEX | {action_counts['NOINDEX']} |

## Critical Risks
- **Thin tag pages**: {action_counts['MERGE']} tag pages are thin (word_count < 250 or < 3 resources) and should be merged or noindexed.
- **Low-score pages**: {low_score_count} pages scored below 50.
- **Metadata consistency**: {metadata_issue_count} pages have duplicate titles or descriptions, multiple H1s, missing author, or missing related resources.
- **Missing alt text / clarity**: {missing_alt_count} pages have clarity penalties.

## Immediate Actions
1. Consolidate thin tag pages with cluster sizes below 3.
2. Resolve duplicate titles and descriptions, especially for documentation templates.
3. Add or expand related resources for content with sparse internal linking.
4. Keep high-quality guides and recipes; schedule periodic freshness reviews.

## Output Files
- `CONTENT_AUDIT_REPORT.md`
- `PAGE_SCORES.csv`
- `KEEP_PAGES.csv`
- `UPDATE_PAGES.csv`
- `EXPAND_PAGES.csv`
- `MERGE_PAGES.csv`
- `REDIRECT_PAGES.csv`
- `NOINDEX_PAGES.csv`
- `CONTENT_GAPS.csv`
- `CANNIBALIZATION_REPORT.md`
- `CONTENT_CLUSTER_REPORT.md`
- `EXECUTIVE_SUMMARY.md`
"""
    (OUTPUT_DIR / "EXECUTIVE_SUMMARY.md").write_text(summary, encoding="utf-8")

    # -----------------------------------------------------------------------
    # 10-Phase Content Audit Report
    # -----------------------------------------------------------------------
    phase10_issues: list[dict[str, Any]] = []
    for out in scored_rows:
        if out["action"] in ("UPDATE", "EXPAND", "MERGE", "REDIRECT", "NOINDEX"):
            bucket = action_buckets[out["action"]]
            evidence = next(
                (
                    r["evidence"]
                    for r in bucket
                    if r["url"] == out["url"]
                ),
                "",
            )
            rec = next(
                (
                    r["recommended_action"]
                    for r in bucket
                    if r["url"] == out["url"]
                ),
                "",
            )
            phase10_issues.append(
                {
                    "issue_id": f"ISS-{len(phase10_issues) + 1:05d}",
                    "page": out["url"],
                    "category": out["action"],
                    "evidence": evidence,
                    "severity": "Critical" if out["action"] == "NOINDEX" else ("High" if out["action"] in ("MERGE", "UPDATE") else "Medium"),
                    "priority": "P1" if out["action"] == "NOINDEX" else ("P2" if out["action"] in ("MERGE", "UPDATE") else "P3"),
                    "business_impact": "Traffic loss / crawl budget waste" if out["action"] in ("NOINDEX", "MERGE", "REDIRECT") else "User engagement and ranking potential",
                    "seo_impact": "Indexability / duplicate signals" if out["action"] in ("NOINDEX", "MERGE", "UPDATE") else "Structural",
                    "user_impact": "Navigation and trust" if out["action"] in ("NOINDEX", "REDIRECT", "MERGE") else "Content quality and usefulness",
                    "estimated_effort": "1-2 hours" if out["action"] in ("UPDATE", "EXPAND") else ("30 min" if out["action"] in ("REDIRECT", "NOINDEX") else "2-4 hours"),
                    "confidence": "High",
                    "recommended_action": rec,
                }
            )

    phase10_header = """## Phase 10 — Prioritization

This table lists every page that requires an action. Issues are ordered by action type.

| Issue ID | Page | Category | Evidence | Severity | Priority | Business Impact | SEO Impact | User Impact | Estimated Effort | Confidence | Recommended Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"""
    phase10_lines = [phase10_header]
    for issue in phase10_issues[:2000]:
        esc = lambda s: str(s).replace("|", "\\|")
        phase10_lines.append(
            f"| {esc(issue['issue_id'])} | {esc(issue['page'])} | {esc(issue['category'])} | {esc(issue['evidence'])} | {esc(issue['severity'])} | {esc(issue['priority'])} | {esc(issue['business_impact'])} | {esc(issue['seo_impact'])} | {esc(issue['user_impact'])} | {esc(issue['estimated_effort'])} | {esc(issue['confidence'])} | {esc(issue['recommended_action'])} |"
        )
    if len(phase10_issues) > 2000:
        phase10_lines.append("")
        phase10_lines.append(
            f"*{len(phase10_issues) - 2000} additional issues are recorded in the action CSVs.*"
        )

    final_answers = f"""## Final Questions

1. **Which pages provide exceptional value?**
   The {action_counts['KEEP']} pages marked KEEP, especially the top-scoring guides and recipes with single H1, unique metadata, code samples, and strong internal linking.

2. **Which pages should be expanded?**
   {action_counts['EXPAND']} content pages have decent overall scores but low completeness or depth; see `EXPAND_PAGES.csv`.

3. **Which pages should be merged?**
   {action_counts['MERGE']} tag/topic pages are thin and should be merged into broader tag/topic or listing pages.

4. **Which pages should be noindexed or consolidated?**
   {action_counts['NOINDEX']} pages, mostly noindex 404/search pages and any content with overall score < 30.

5. **Which topics are missing?**
   See `CONTENT_GAPS.csv` for low-coverage allowed topics and any missing translations.

6. **Which clusters are weak?**
   {len(small_tag_clusters)} tag clusters have 2 or fewer resources. Topic clusters below 5 resources are listed in `CONTENT_GAPS.csv`.

7. **What is preventing this website from becoming a topical authority?**
   - The huge number of thin tag pages dilutes crawl budget and topical focus.
   - Duplicate titles and descriptions among documentation templates confuse relevance signals.
   - Some content pages still have sparse related resources, reducing internal link depth.
   - Consolidating tags, resolving duplicates, and strengthening internal linking will accelerate topical authority.
"""

    inventory_summary = f"""## Phase 1 — Content Inventory

The site contains **{len(scored_rows)}** built pages:

| Page Type | Count |
| --- | --- |
"""
    for pt, count in sorted(Counter(r["page_type"] for r in scored_rows).items(), key=lambda x: -x[1]):
        inventory_summary += f"| {pt} | {count} |" + "\n"

    quality_summary = f"""## Phase 2 — Page Quality

Average dimension scores across all pages:

| Dimension | Average |
| --- | --- |
| Readability | {round(sum(r['readability_score'] for r in scored_rows)/len(scored_rows))} |
| Clarity | {round(sum(r['clarity_score'] for r in scored_rows)/len(scored_rows))} |
| Completeness | {round(sum(r['completeness_score'] for r in scored_rows)/len(scored_rows))} |
| Practical Value | {round(sum(r['practical_value_score'] for r in scored_rows)/len(scored_rows))} |
| Originality | {round(sum(r['originality_score'] for r in scored_rows)/len(scored_rows))} |
| Depth | {round(sum(r['depth_score'] for r in scored_rows)/len(scored_rows))} |
| Accuracy | {round(sum(r['accuracy_score'] for r in scored_rows)/len(scored_rows))} |
| Freshness | {round(sum(r['freshness_score'] for r in scored_rows)/len(scored_rows))} |
| Consistency | {round(sum(r['consistency_score'] for r in scored_rows)/len(scored_rows))} |
| Logical Flow | {round(sum(r['logical_flow_score'] for r in scored_rows)/len(scored_rows))} |
| Formatting | {round(sum(r['formatting_score'] for r in scored_rows)/len(scored_rows))} |
"""

    thin_summary = f"""## Phase 3 — Thin Content

- Pages with word_count < 250: **{sum(1 for r in scored_rows if r['word_count'] < 250)}**
- Pages with word_count < 500: **{sum(1 for r in scored_rows if r['word_count'] < 500)}**
- Tag pages below 250 words: **{sum(1 for r in scored_rows if r['page_type'] == 'tag' and r['word_count'] < 250)}**
"""

    duplication_summary = f"""## Phase 4 — Duplication

- Duplicate title groups: **{len(dup_title_groups)}**
- Duplicate description groups: **{len(dup_desc_groups)}**
- Repeated H2 sequence groups (>3 pages): **{len(dup_h2_groups)}**
"""

    originality_summary = f"""## Phase 5 — Originality

- Average originality score: **{round(sum(r['originality_score'] for r in scored_rows)/len(scored_rows))}**
- Pages with originality score < 70: **{sum(1 for r in scored_rows if r['originality_score'] < 70)}**
"""

    info_density_summary = f"""## Phase 6 — Information Density

- Average word count: **{round(sum(r['word_count'] for r in scored_rows)/len(scored_rows))}**
- Average examples score: **{round(sum(r['examples_score'] for r in scored_rows)/len(scored_rows))}**
- Pages with examples score < 30: **{sum(1 for r in scored_rows if r['examples_score'] < 30)}**
"""

    user_value_summary = f"""## Phase 7 — User Value

High user value is indicated by high practical value, strong examples, and logical flow.

- Pages with practical_value_score >= 80: **{sum(1 for r in scored_rows if r['practical_value_score'] >= 80)}**
- Pages with logical_flow_score >= 80: **{sum(1 for r in scored_rows if r['logical_flow_score'] >= 80)}**
- Pages with overall_score >= 70: **{sum(1 for r in scored_rows if r['overall_score'] >= 70)}**
"""

    relationships_summary = f"""## Phase 8 — Content Relationships

- Total tag clusters: **{sum(len(v) for v in tag_clusters.values())}**
- Total topic clusters: **{sum(len(v) for v in topic_clusters.values())}**
- Orphan pages (internal_links == 0): **{orphan_count}**
- Effective orphan content (no incoming related-resource links): **{len(effective_orphans)}**
- Pillar/hub candidates (content > 1000 words, top 20 internal links): listed in `CONTENT_CLUSTER_REPORT.md`.
"""

    recommendations_summary = f"""## Phase 9 — Recommendations

Summary of recommended actions:

| Action | Count |
| --- | --- |
| KEEP | {action_counts['KEEP']} |
| UPDATE | {action_counts['UPDATE']} |
| EXPAND | {action_counts['EXPAND']} |
| MERGE | {action_counts['MERGE']} |
| REDIRECT | {action_counts['REDIRECT']} |
| NOINDEX | {action_counts['NOINDEX']} |
"""

    full_report = (
        "# Content Audit Report\n\n"
        + inventory_summary
        + "\n"
        + quality_summary
        + "\n"
        + thin_summary
        + "\n"
        + duplication_summary
        + "\n"
        + originality_summary
        + "\n"
        + info_density_summary
        + "\n"
        + user_value_summary
        + "\n"
        + relationships_summary
        + "\n"
        + recommendations_summary
        + "\n"
        + "\n".join(phase10_lines)
        + "\n\n"
        + final_answers
    )

    (OUTPUT_DIR / "CONTENT_AUDIT_REPORT.md").write_text(full_report, encoding="utf-8")

    print(f"Audit complete. Output written to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
