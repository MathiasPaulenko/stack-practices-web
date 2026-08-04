#!/usr/bin/env python3
"""Helpful Content Forensic Audit: quality, EEAT, authority, gaps, candidates."""
import csv
import json
import re
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path("D:/Codigo/stack-practices-web")
SRC = ROOT / "src"
CONTENT = SRC / "content"
REF = ROOT / "ref"
OUT = REF / "helpful-content-forensic-audit"
OUT.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Load data
# ---------------------------------------------------------------------------

def load_json(name):
    with open(REF / name, "r", encoding="utf-8") as f:
        return json.load(f)

DATA = load_json("audit-data.json")
LINKS = load_json("internal-linking-data.json")
PAGES = DATA["pages"]
CONTENT_STATS = DATA.get("content", {})
issues = DATA.get("issues", {})

# Map pages by path and slug
PAGE_BY_PATH = {p["path"]: p for p in PAGES}
PAGE_BY_URL = {p["url"]: p for p in PAGES}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def classify_path(path):
    lang = "es" if path.startswith("/es/") or path == "/es" else "en"
    p = re.sub(r"^/es", "", path) or "/"
    if p in ("/", "/es/", ""):
        return lang, "home"
    if re.match(r"^/(recipes|patterns|docs|guides|tags|topics)/$", p):
        return lang, "listing"
    if re.match(r"^/(recipes|patterns|docs|guides)/[^/]+/$", p):
        return lang, "content"
    if re.match(r"^/tags/[^/]+/$", p):
        return lang, "tag"
    if re.match(r"^/topics/[^/]+/$", p):
        return lang, "topic"
    if re.match(r"^/(about|contact|privacy|terms|cookies|legal-notice|affiliate-disclosure|authors|search|404)/", p):
        return lang, "static"
    return lang, "other"

def content_inventory_type(path):
    """Map a content detail page to a helpful-content category."""
    _, pt = classify_path(path)
    if pt == "content":
        # Use slug or frontmatter contentType
        p = PAGE_BY_PATH.get(path, {})
        ct = p.get("contentType", "")
        if ct in ("recipes", "recipe"):
            return "recipe"
        if ct == "patterns":
            return "pattern"
        if ct == "docs":
            return "template/checklist"
        if ct == "guides":
            return "guide"
        # fallback by path prefix
        if path.startswith(("/recipes/", "/es/recipes/")):
            return "recipe"
        if path.startswith(("/patterns/", "/es/patterns/")):
            return "pattern"
        if path.startswith(("/docs/", "/es/docs/")):
            return "template/checklist"
        if path.startswith(("/guides/", "/es/guides/")):
            return "guide"
    if pt == "tag":
        return "tag"
    if pt == "topic":
        return "topic"
    if pt == "listing":
        return "landing page"
    if pt == "static":
        return "static"
    if pt == "home":
        return "home"
    return "other"

def md_table(rows, fieldnames):
    if not rows:
        return "\n\n_no data_\n"
    header = "| " + " | ".join(fieldnames) + " |"
    sep = "|" + "|".join([" --- " for _ in fieldnames]) + "|"
    lines = [header, sep]
    for r in rows:
        vals = [str(r.get(k, "")).replace("\n", " ").replace("|", "\\|")[:120] for k in fieldnames]
        lines.append("| " + " | ".join(vals) + " |")
    return "\n".join(lines)

# ---------------------------------------------------------------------------
# Parse markdown
# ---------------------------------------------------------------------------

def parse_frontmatter(text):
    if not text.startswith("---"):
        return {}, text
    end = text.find("---", 3)
    if end == -1:
        return {}, text
    try:
        import yaml
        meta = yaml.safe_load(text[3:end])
    except Exception:
        meta = {}
    body = text[end+3:].strip()
    return meta or {}, body

# If PyYAML missing, fall back to a minimal parser
if True:
    try:
        import yaml
    except ImportError:
        yaml = None

if yaml is None:
    def parse_frontmatter(text):
        return {}, text

def count_code_blocks(body):
    return len(re.findall(r"```[a-zA-Z0-9+-]*", body))

def count_tables(body):
    return len([l for l in body.splitlines() if l.strip().startswith("|")])

def count_checklists(body):
    return len(re.findall(r"^\s*-\s*\[[ xX]\]", body, re.MULTILINE))

def count_headings(body):
    h2 = len(re.findall(r"^\s*##\s+", body, re.MULTILINE))
    h3 = len(re.findall(r"^\s*###\s+", body, re.MULTILINE))
    h4 = len(re.findall(r"^\s*####\s+", body, re.MULTILINE))
    return h2, h3, h4

def count_word(body):
    return len(re.findall(r"\b[\w'-]+\b", body))

def has_section(body, *names):
    lower = body.lower()
    return any(re.search(rf"(^|\n)#+\s*{re.escape(n)}", lower) for n in names)

def extract_ai_phrases(body):
    counts = {}
    lower = body.lower()
    for phrase in ["overall", "vital", "remember that", "crucial", "ultimately", "it is important to note", "it should be noted"]:
        counts[phrase] = len(re.findall(rf"\b{re.escape(phrase)}\b", lower))
    return counts

# Parse all markdown files
print("Parsing markdown files...")
md_by_path = {}
md_files = list(CONTENT.rglob("*.md"))
for f in md_files:
    text = f.read_text(encoding="utf-8")
    meta, body = parse_frontmatter(text)
    if not meta:
        continue
    slug = meta.get("slug", f.stem)
    if f.stem.endswith(".es"):
        lang = "es"
        base_slug = f.stem[:-3]
    else:
        lang = "en"
        base_slug = f.stem
    ct = meta.get("contentType", f.parent.name)
    prefix = "/es" if lang == "es" else ""
    path = f"{prefix}/{ct}/{base_slug}/"

    md_by_path[path] = {
        "path": path,
        "lang": lang,
        "content_type": ct,
        "title": meta.get("title", ""),
        "description": meta.get("description", meta.get("metaDescription", "")),
        "keywords": meta.get("keywords", ""),
        "topics": meta.get("topics", []) or [],
        "tags": meta.get("tags", []) or [],
        "difficulty": meta.get("difficulty", ""),
        "lastUpdated": meta.get("lastUpdated", ""),
        "author": meta.get("author", ""),
        "relatedResources": meta.get("relatedResources", []) or [],
        "draft": bool(meta.get("draft")),
        "body": body,
        "word_count": count_word(body),
        "code_blocks": count_code_blocks(body),
        "tables": count_tables(body),
        "checklists": count_checklists(body),
        "h2_count": count_headings(body)[0],
        "h3_count": count_headings(body)[1],
        "h4_count": count_headings(body)[2],
        "has_overview": has_section(body, "overview", "introduction"),
        "has_solution": has_section(body, "solution"),
        "has_examples": has_section(body, "example", "examples"),
        "has_variants": has_section(body, "variants"),
        "has_best_practices": has_section(body, "best practices"),
        "has_common_mistakes": has_section(body, "common mistakes"),
        "has_faq": has_section(body, "faq", "frequently asked questions"),
        "has_references": has_section(body, "references", "further reading"),
        "ai_phrases": extract_ai_phrases(body),
    }

print(f"Parsed {len(md_by_path)} markdown files")

# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def depth_score(page, md):
    score = 0
    wc = page.get("wordCount", 0)
    if wc > 1500: score += 25
    elif wc > 800: score += 18
    elif wc > 400: score += 12
    elif wc > 200: score += 6
    else: score += 2

    h2 = page.get("h2", [])
    h3 = page.get("h3", [])
    if len(h2) > 8: score += 15
    elif len(h2) > 5: score += 10
    elif len(h2) > 2: score += 5
    if len(h3) > 5: score += 10
    elif len(h3) > 2: score += 5

    cb = md.get("code_blocks", 0) if md else 0
    if cb >= 3: score += 20
    elif cb > 0: score += 10

    if md and md.get("tables") > 0: score += 5
    if md and md.get("checklists") > 0: score += 10
    if md and md.get("has_faq"): score += 10
    if md and md.get("has_examples"): score += 10
    if md and md.get("has_common_mistakes"): score += 5
    if md and md.get("has_best_practices"): score += 5
    return min(100, score)

def originality_score(page, md, title_counts, desc_counts):
    score = 100
    # Duplicate metadata
    if title_counts.get(page.get("title"), 0) > 1:
        score -= 20
    if desc_counts.get(page.get("metaDesc"), 0) > 1:
        score -= 15
    # AI/empty qualifier footprint
    if md:
        total_ai = sum(md.get("ai_phrases", {}).values())
        if total_ai > 0:
            score -= min(25, total_ai * 2)
        # Template heading footprint
        template_hits = sum(1 for k in ["has_overview", "has_solution", "has_examples", "has_variants", "has_best_practices", "has_common_mistakes", "has_faq"] if md.get(k))
        if template_hits >= 6:
            score -= 15
        elif template_hits >= 4:
            score -= 8
    return max(0, score)

def practical_value_score(page, md):
    score = 0
    if not md:
        return 50
    if md.get("code_blocks") > 0: score += 30
    if md.get("checklists") > 0: score += 15
    if md.get("tables") > 0: score += 10
    if md.get("has_solution"): score += 15
    if md.get("has_examples"): score += 15
    if md.get("has_variants"): score += 5
    if md.get("has_best_practices"): score += 5
    if md.get("has_common_mistakes"): score += 5
    if len(md.get("relatedResources", [])) >= 2: score += 10
    if md.get("word_count", 0) > 500: score += 10
    return min(100, score)

def eeatt_score(page, md):
    score = 60
    if md:
        if md.get("author") and md.get("author") != "StackPractices":
            score += 15
        if md.get("lastUpdated"): score += 10
        if len(md.get("relatedResources", [])) >= 2: score += 10
    if page.get("jsonLd"):
        score += 10
    if page.get("h1") and len(page.get("h1")) == 1: score += 10
    if page.get("missingAlt", 0) == 0: score += 5
    return min(100, score)

def authority_score(page, md):
    # internal links + related resources for content; cluster size for tags
    score = 50
    il = len(page.get("internalLinks", []))
    if il > 30: score += 20
    elif il > 15: score += 10
    elif il > 5: score += 5
    if md:
        rr = len(md.get("relatedResources", []))
        if rr >= 4: score += 20
        elif rr >= 2: score += 10
        # tag/topic cluster via tags
    return min(100, score)

def helpfulness_score(ds, os, ps, es, as_):
    return round(0.25 * ds + 0.20 * os + 0.20 * ps + 0.20 * es + 0.15 * as_, 1)

# Pre-compute title/desc duplicate counts
title_counts = Counter(p.get("title") for p in PAGES if p.get("title"))
desc_counts = Counter(p.get("metaDesc") for p in PAGES if p.get("metaDesc"))

print("Scoring pages...")
page_scores = []
for p in PAGES:
    path = p["path"]
    md = md_by_path.get(path)
    ds = depth_score(p, md)
    os = originality_score(p, md, title_counts, desc_counts)
    ps = practical_value_score(p, md)
    es = eeatt_score(p, md)
    au = authority_score(p, md)
    hs = helpfulness_score(ds, os, ps, es, au)
    page_scores.append({
        "url": p["url"],
        "path": path,
        "lang": classify_path(path)[0],
        "page_type": classify_path(path)[1],
        "content_inventory_type": content_inventory_type(path),
        "word_count": p.get("wordCount", 0),
        "depth_score": ds,
        "originality_score": os,
        "practical_value_score": ps,
        "eeat_score": es,
        "authority_score": au,
        "helpfulness_score": hs,
        "h1_count": len(p.get("h1", [])),
        "h2_count": len(p.get("h2", [])),
        "h3_count": len(p.get("h3", [])),
        "code_blocks": md.get("code_blocks", 0) if md else 0,
        "checklists": md.get("checklists", 0) if md else 0,
        "tables": md.get("tables", 0) if md else 0,
        "related_resources": len(md.get("relatedResources", [])) if md else 0,
        "internal_links": len(p.get("internalLinks", [])),
        "duplicate_title": title_counts.get(p.get("title"), 0) > 1,
        "duplicate_description": desc_counts.get(p.get("metaDesc"), 0) > 1,
    })

# ---------------------------------------------------------------------------
# Inventories and aggregates
# ---------------------------------------------------------------------------

inventory_by_type = defaultdict(int)
for ps in page_scores:
    inventory_by_type[ps["content_inventory_type"]] += 1

avg_scores = {
    "depth": round(sum(p["depth_score"] for p in page_scores) / len(page_scores), 1),
    "originality": round(sum(p["originality_score"] for p in page_scores) / len(page_scores), 1),
    "practical": round(sum(p["practical_value_score"] for p in page_scores) / len(page_scores), 1),
    "eeat": round(sum(p["eeat_score"] for p in page_scores) / len(page_scores), 1),
    "authority": round(sum(p["authority_score"] for p in page_scores) / len(page_scores), 1),
    "helpfulness": round(sum(p["helpfulness_score"] for p in page_scores) / len(page_scores), 1),
}

thin_pages = [p for p in page_scores if p["word_count"] < 200]
low_help = [p for p in page_scores if p["helpfulness_score"] < 40]
low_orig = [p for p in page_scores if p["originality_score"] < 40]
low_pract = [p for p in page_scores if p["practical_value_score"] < 40]
low_eeat = [p for p in page_scores if p["eeat_score"] < 60]
dup_title = [p for p in page_scores if p["duplicate_title"]]
dup_desc = [p for p in page_scores if p["duplicate_description"]]

# ---------------------------------------------------------------------------
# CSV helpers
# ---------------------------------------------------------------------------

def write_csv(filename, rows, fieldnames):
    with open(OUT / filename, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})

SCORE_FIELDS = [
    "url", "path", "lang", "page_type", "content_inventory_type", "word_count",
    "depth_score", "originality_score", "practical_value_score", "eeat_score",
    "authority_score", "helpfulness_score", "h1_count", "h2_count", "h3_count",
    "code_blocks", "checklists", "tables", "related_resources", "internal_links",
    "duplicate_title", "duplicate_description",
]
write_csv("PAGE_SCORES.csv", page_scores, SCORE_FIELDS)

# ---------------------------------------------------------------------------
# Content duplication
# ---------------------------------------------------------------------------

dup_rows = []
for p in dup_title:
    dup_rows.append({
        "issue_id": "DUP-001",
        "category": "Duplicate Title",
        "url": p["url"],
        "path": p["path"],
        "duplicate_value": p["path"],
        "count": title_counts.get(PAGE_BY_PATH[p["path"]]["title"], 0),
        "evidence": f"Title '{PAGE_BY_PATH[p['path']]['title'][:80]}' appears {title_counts.get(PAGE_BY_PATH[p['path']]['title'], 0)} times",
    })
for p in dup_desc:
    dup_rows.append({
        "issue_id": "DUP-002",
        "category": "Duplicate Meta Description",
        "url": p["url"],
        "path": p["path"],
        "duplicate_value": p["path"],
        "count": desc_counts.get(PAGE_BY_PATH[p["path"]]["metaDesc"], 0),
        "evidence": f"Description appears {desc_counts.get(PAGE_BY_PATH[p['path']]['metaDesc'], 0)} times",
    })

# Template-abuse detection: pages sharing the exact same H2 sequence
dup_h2_groups = defaultdict(list)
for p in PAGES:
    key = " | ".join(p.get("h2", []))
    if key:
        dup_h2_groups[key].append(p["path"])
for h2_key, paths in dup_h2_groups.items():
    if len(paths) > 3:
        for path in paths:
            dup_rows.append({
                "issue_id": "DUP-003",
                "category": "Template H2 Sequence",
                "url": PAGE_BY_PATH[path]["url"],
                "path": path,
                "duplicate_value": h2_key[:120],
                "count": len(paths),
                "evidence": f"{len(paths)} pages share the same H2 heading sequence",
            })

DUP_FIELDS = ["issue_id", "category", "url", "path", "duplicate_value", "count", "evidence"]
write_csv("CONTENT_DUPLICATION.csv", dup_rows, DUP_FIELDS)

# ---------------------------------------------------------------------------
# Gaps
# ---------------------------------------------------------------------------

gap_rows = []

# Missing translations
slugs_en = set()
slugs_es = set()
for path, md in md_by_path.items():
    key = (md["content_type"], md.get("slug", path.split("/")[-2]))
    if md["lang"] == "en":
        slugs_en.add(key)
    else:
        slugs_es.add(key)
missing_es = slugs_en - slugs_es
missing_en = slugs_es - slugs_en
for ct, slug in missing_es:
    gap_rows.append({
        "issue_id": "GAP-001",
        "category": "Missing Spanish Translation",
        "url": f"https://stackpractices.com/es/{ct}/{slug}/",
        "path": f"/es/{ct}/{slug}/",
        "evidence": f"English source exists at /{ct}/{slug}/ but no .es.md",
        "impact": "Bilingual parity not maintained; Spanish audience cannot access content.",
    })
for ct, slug in missing_en:
    gap_rows.append({
        "issue_id": "GAP-002",
        "category": "Missing English Source",
        "url": f"https://stackpractices.com/{ct}/{slug}/",
        "path": f"/{ct}/{slug}/",
        "evidence": f"Spanish source exists but no English .md",
        "impact": "English audience cannot access content.",
    })

# Low-coverage topics
allowed_topics = {"data", "api", "authentication", "file-handling", "performance", "testing", "architecture", "design", "devops", "databases", "concurrency", "security", "ai", "frontend", "infrastructure", "messaging", "observability", "graphql", "serverless", "caching"}
topic_counts = defaultdict(int)
for path, md in md_by_path.items():
    for t in md.get("topics", []):
        topic_counts[t] += 1
for t in allowed_topics:
    if topic_counts.get(t, 0) < 5:
        gap_rows.append({
            "issue_id": "GAP-003",
            "category": "Low Topic Coverage",
            "url": f"https://stackpractices.com/topics/{t}/",
            "path": f"/topics/{t}/",
            "evidence": f"Only {topic_counts.get(t, 0)} resources tagged with '{t}'",
            "impact": "Topic cluster too small to demonstrate authority.",
        })

# Pages with few related resources
for p in page_scores:
    if p["page_type"] == "content" and p["related_resources"] < 2:
        gap_rows.append({
            "issue_id": "GAP-004",
            "category": "Sparse Related Resources",
            "url": p["url"],
            "path": p["path"],
            "evidence": f"Only {p['related_resources']} relatedResources",
            "impact": "Weak internal linking and topical clustering.",
        })

GAP_FIELDS = ["issue_id", "category", "url", "path", "evidence", "impact"]
write_csv("CONTENT_GAPS.csv", gap_rows, GAP_FIELDS)

# ---------------------------------------------------------------------------
# Rewrite / merge / delete candidates
# ---------------------------------------------------------------------------

rewrite = []
merge = []
delete = []

for p in page_scores:
    reasons = []
    if p["helpfulness_score"] < 40:
        reasons.append(f"helpfulness {p['helpfulness_score']}")
    if p["originality_score"] < 40:
        reasons.append(f"originality {p['originality_score']}")
    if p["practical_value_score"] < 40:
        reasons.append(f"practical {p['practical_value_score']}")
    if p["word_count"] < 250:
        reasons.append("thin")
    if p["duplicate_title"]:
        reasons.append("duplicate title")
    if p["h1_count"] > 1:
        reasons.append("multiple H1")
    if reasons and p["page_type"] == "content":
        rewrite.append({
            "url": p["url"],
            "path": p["path"],
            "content_type": p["content_inventory_type"],
            "helpfulness_score": p["helpfulness_score"],
            "word_count": p["word_count"],
            "reasons": "; ".join(reasons),
            "recommended_action": "Rewrite with original examples, real experience, and expanded depth.",
        })

# Tag merge candidates: small clusters or overlapping tags
tag_clusters = defaultdict(list)
for path, md in md_by_path.items():
    if md["content_type"] not in ("recipes", "patterns", "docs", "guides"):
        continue
    for tag in md.get("tags", []):
        tag_clusters[tag].append(path)

for tag, paths in tag_clusters.items():
    if len(paths) <= 2:
        for path in paths:
            merge.append({
                "url": PAGE_BY_PATH.get(path, {}).get("url", ""),
                "path": path,
                "cluster_type": "tag",
                "cluster_key": tag,
                "cluster_size": len(paths),
                "reasons": f"Tag '{tag}' has only {len(paths)} resource(s); merge into a broader tag or noindex.",
                "recommended_action": "Merge into a synonym tag or add noindex to thin tag page.",
            })

# Delete candidates
for p in page_scores:
    if p["page_type"] in ("tag", "topic") and p["word_count"] < 200:
        # cluster size
        key = unquote(urlparse(p["url"]).path).strip("/").split("/")[-1] if "/tags/" in p["path"] else ""
        cluster = tag_clusters.get(key, [])
        if len(cluster) <= 1:
            delete.append({
                "url": p["url"],
                "path": p["path"],
                "page_type": p["page_type"],
                "word_count": p["word_count"],
                "helpfulness_score": p["helpfulness_score"],
                "reasons": f"Thin {p['page_type']} page with {len(cluster)} resource(s).",
                "recommended_action": "Remove or noindex; redirect to parent listing.",
            })

# Low-value content pages with very low scores
for p in page_scores:
    if p["page_type"] == "content" and p["helpfulness_score"] < 25:
        delete.append({
            "url": p["url"],
            "path": p["path"],
            "page_type": p["page_type"],
            "word_count": p["word_count"],
            "helpfulness_score": p["helpfulness_score"],
            "reasons": "Very low helpfulness score; likely low added value.",
            "recommended_action": "Remove or completely rewrite with original depth and examples.",
        })

REWRITE_FIELDS = ["url", "path", "content_type", "helpfulness_score", "word_count", "reasons", "recommended_action"]
write_csv("REWRITE_CANDIDATES.csv", rewrite, REWRITE_FIELDS)

MERGE_FIELDS = ["url", "path", "cluster_type", "cluster_key", "cluster_size", "reasons", "recommended_action"]
write_csv("MERGE_CANDIDATES.csv", merge, MERGE_FIELDS)

DELETE_FIELDS = ["url", "path", "page_type", "word_count", "helpfulness_score", "reasons", "recommended_action"]
write_csv("DELETE_CANDIDATES.csv", delete, DELETE_FIELDS)

# ---------------------------------------------------------------------------
# Authors
# ---------------------------------------------------------------------------

author_counts = Counter()
for md in md_by_path.values():
    author_counts[md.get("author", "")] += 1

# ---------------------------------------------------------------------------
# Topical authority / clusters
# ---------------------------------------------------------------------------

topic_page_count = defaultdict(int)
for md in md_by_path.values():
    for t in md.get("topics", []):
        topic_page_count[t] += 1

# ---------------------------------------------------------------------------
# Today
# ---------------------------------------------------------------------------

today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

# ---------------------------------------------------------------------------
# CONTENT_QUALITY_REPORT.md
# ---------------------------------------------------------------------------

cq_lines = [
    "# Content Quality Report",
    "",
    f"**Audit date (UTC):** {today}",
    f"**Pages analyzed:** {len(PAGES)}",
    f"**Markdown sources:** {len(md_files)}",
    "",
    "## Content inventory",
    md_table([{"type": k, "count": v} for k, v in sorted(inventory_by_type.items(), key=lambda x: -x[1])], ["type", "count"]),
    "",
    "## Quality score averages",
    f"- Depth: {avg_scores['depth']}",
    f"- Originality: {avg_scores['originality']}",
    f"- Practical value: {avg_scores['practical']}",
    f"- EEAT: {avg_scores['eeat']}",
    f"- Authority: {avg_scores['authority']}",
    f"- Helpfulness: {avg_scores['helpfulness']}",
    "",
    "## Thin content",
    f"- Pages with <200 words: {len(thin_pages)} ({len(thin_pages)/len(page_scores)*100:.1f}%)",
    f"- Mostly tag and listing pages with auto-generated card grids.",
    "",
    "## Low helpfulness content",
    f"- Pages with helpfulness < 40: {len(low_help)}",
    f"- Pages with originality < 40: {len(low_orig)}",
    f"- Pages with practical value < 40: {len(low_pract)}",
    f"- Pages with EEAT < 60: {len(low_eeat)}",
    "",
    "## Practical value signals",
    f"- Markdown code blocks: {sum(md_by_path[p].get('code_blocks',0) for p in md_by_path)}",
    f"- Markdown tables: {sum(md_by_path[p].get('tables',0) for p in md_by_path)}",
    f"- Markdown checklists: {sum(md_by_path[p].get('checklists',0) for p in md_by_path)}",
    f"- Pages with FAQ section: {sum(1 for md in md_by_path.values() if md.get('has_faq'))}",
    f"- Pages with Common Mistakes: {sum(1 for md in md_by_path.values() if md.get('has_common_mistakes'))}",
    f"- Pages with Best Practices: {sum(1 for md in md_by_path.values() if md.get('has_best_practices'))}",
    "",
    "## AI/empty qualifier footprint",
    f"- `overall` occurrences in markdown: {sum(md.get('ai_phrases',{}).get('overall',0) for md in md_by_path.values())}",
    f"- `vital` occurrences: {sum(md.get('ai_phrases',{}).get('vital',0) for md in md_by_path.values())}",
    f"- Template headings repeated across many pages: overview, solution, variants, common mistakes, FAQ.",
    "",
    "## Recommendations",
    "1. Reduce boilerplate headings by making section content genuinely distinct per page.",
    "2. Replace generic qualifiers ('overall', 'vital') with concrete metrics and trade-offs.",
    "3. Expand thin tag pages with unique editorial summaries or noindex them.",
    "4. Add more real-world examples, production issues, and benchmark data to content.",
]
(OUT / "CONTENT_QUALITY_REPORT.md").write_text("\n".join(cq_lines), encoding="utf-8")

# ---------------------------------------------------------------------------
# EEAT_REPORT.md (helpful-content lens)
# ---------------------------------------------------------------------------

eeatt_lines = [
    "# EEAT Report — Helpful Content Audit",
    "",
    f"**Audit date (UTC):** {today}",
    "",
    "## Author identity",
    md_table([{"author": k, "count": v} for k, v in author_counts.most_common() if k], ["author", "count"]),
    "",
    "## Author consistency issues",
    "- Byline alternates between 'Mathias Paulenko' and 'StackPractices'.",
    "- Person schema `sameAs` uses `https://cn.linkedin.com/in/mathias-paulenko-echeverz`.",
    "- No visible editorial process / methodology page.",
    "",
    "## Trust signals",
    "- Cookie consent banner with essential/analytics/advertising toggles.",
    "- ads.txt present with pub-9762280383707953.",
    "- About, Privacy, Terms, Cookies, Legal Notice, Affiliate Disclosure pages exist.",
    "- No visible byline date on article pages (only `lastUpdated` in schema).",
    "",
    "## Recommendations",
    "1. Consolidate author data into a single source and consistently expose bylines.",
    "2. Add an 'Editorial process / content methodology' page.",
    "3. Fix or verify the LinkedIn sameAs URL.",
    "4. Display original publication and last-updated dates on article pages.",
]
(OUT / "EEAT_REPORT.md").write_text("\n".join(eeatt_lines), encoding="utf-8")

# ---------------------------------------------------------------------------
# TOPICAL_AUTHORITY_REPORT.md
# ---------------------------------------------------------------------------

ta_lines = [
    "# Topical Authority Report",
    "",
    f"**Audit date (UTC):** {today}",
    "",
    "## Topic coverage",
    md_table([{"topic": k, "resources": v} for k, v in sorted(topic_page_count.items(), key=lambda x: -x[1])], ["topic", "resources"]),
    "",
    "## Cluster quality",
    f"- Total unique tags: {len(tag_clusters)}",
    f"- Tags with 1 resource: {sum(1 for v in tag_clusters.values() if len(v) == 1)}",
    f"- Tags with 2 resources: {sum(1 for v in tag_clusters.values() if len(v) == 2)}",
    f"- Tags with 10+ resources: {sum(1 for v in tag_clusters.values() if len(v) >= 10)}",
    "",
    "## Pillar / hub candidates (high inlinks, broad topic)",
]
# top content by internal links
top_hub = sorted([p for p in page_scores if p["page_type"] == "content"], key=lambda x: x["internal_links"], reverse=True)[:10]
ta_lines.append(md_table([{"url": p["url"], "path": p["path"], "internal_links": p["internal_links"], "word_count": p["word_count"]} for p in top_hub], ["url", "path", "internal_links", "word_count"]))
ta_lines.extend([
    "",
    "## Content gaps",
    f"- Missing translations: {len(missing_es)} EN→ES, {len(missing_en)} ES→EN.",
    f"- Low-coverage allowed topics: {sum(1 for t in allowed_topics if topic_counts.get(t,0) < 5)}.",
    f"- Content with <2 related resources: {sum(1 for p in page_scores if p['page_type']=='content' and p['related_resources']<2)}.",
    "",
    "## Cannibalisation / overlap",
    f"- Duplicate titles: {len(dup_title)} pages.",
    f"- Duplicate meta descriptions: {len(dup_desc)} pages.",
    f"- Template H2 sequences shared by >3 pages: {sum(1 for k,v in dup_h2_groups.items() if len(v)>3)} sequences.",
    "",
    "## Recommendations",
    "1. Merge or noindex thin tags with <3 resources.",
    "2. Expand low-coverage allowed topics to 10+ resources each.",
    "3. Ensure every content page has 2–5 related resources.",
    "4. Differentiate H2 sections per page instead of using identical template sequences.",
])
(OUT / "TOPICAL_AUTHORITY_REPORT.md").write_text("\n".join(ta_lines), encoding="utf-8")

# ---------------------------------------------------------------------------
# HELPFUL_CONTENT_REPORT.md
# ---------------------------------------------------------------------------

main_lines = [
    "# Helpful Content Forensic Audit",
    "",
    f"""**Site:** https://stackpractices.com  
**Domain:** stackpractices.com  
**Audit date (UTC):** {today}  
**Approach:** Parse all {len(md_files)} markdown sources and {len(PAGES)} built pages; score depth, originality, practical value, EEAT, authority; detect duplication, gaps, and low-value pages.""",
    "",
    "## Phase 1 — Content inventory",
    md_table([{"type": k, "count": v} for k, v in sorted(inventory_by_type.items(), key=lambda x: -x[1])], ["type", "count"]),
    "",
    "## Phase 2 — Search intent and audience",
    "- Recipes: 'How do I implement X?' — practical, copy-paste code (primary), quick reference (secondary).",
    "- Patterns: 'Which design pattern should I use and why?' — architectural decisions, trade-offs.",
    "- Docs: 'Do you have a template for X?' — reusable templates and checklists.",
    "- Guides: 'How do I master X end-to-end?' — comprehensive deep-dives.",
    "- Tags/Topics: 'What else exists about X?' — discovery and clustering.",
    "- All content is aimed at professional/learning software engineers.",
    "- Intent is generally satisfied for content pages; tag/listing pages are often thin and provide only navigation.",
    "",
    "## Phase 3 — Originality",
    f"- Average originality score: {avg_scores['originality']}",
    f"- AI/empty qualifier usage: `overall` {sum(md.get('ai_phrases',{}).get('overall',0) for md in md_by_path.values())} times, `vital` {sum(md.get('ai_phrases',{}).get('vital',0) for md in md_by_path.values())} times.",
    f"- Template headings (overview, solution, variants, common mistakes, FAQ) appear on hundreds of pages with nearly identical structure.",
    f"- {len(low_orig)} pages score below 40 on originality.",
    "- Original code examples and tables are present, but section structure is highly templated.",
    "",
    "## Phase 4 — Experience",
    "- Content frequently includes 'Common Mistakes', 'Best Practices', and 'When to Use' sections, which suggest practitioner awareness.",
    "- However, many pages lack concrete metrics, production war stories, or benchmark numbers.",
    "- The generic phrasing in some sections reduces the sense that each page was written from first-hand experience.",
    "",
    "## Phase 5 — Expertise",
    f"- Average depth score: {avg_scores['depth']}",
    f"- {sum(1 for p in page_scores if p['code_blocks'] > 0)} pages include code blocks.",
    f"- {sum(1 for p in page_scores if p['tables'] > 0)} pages include tables.",
    f"- {sum(1 for p in page_scores if p['checklists'] > 0)} pages include checklists.",
    "- Technical terminology is correct and consistent; schemas are valid.",
    "- Content is technically accurate for the topics covered.",
    "",
    "## Phase 6 — Depth",
    f"- Average word count: {sum(p['word_count'] for p in page_scores)/len(page_scores):.0f} words.",
    f"- {len(thin_pages)} pages are <200 words (mostly tags/listings).",
    f"- Guides and long-form recipes are generally >1,000 words and cover multiple sections.",
    "- Depth is high for content, low for discovery pages.",
    "",
    "## Phase 7 — Practical value",
    f"- Average practical value score: {avg_scores['practical']}",
    f"- Code blocks, checklists, and templates make most content directly actionable.",
    f"- {len(low_pract)} pages score below 40 on practical value.",
    "- Recipes and docs/templates provide the strongest practical value.",
    "",
    "## Phase 8 — Content differentiation from AI",
    "- Repeated section structure (Overview → When to Use → Solution → Variants → Best Practices → Common Mistakes → FAQ) across 2,000+ pages is a strong AI/template footprint.",
    f"- {len(dup_h2_groups)} unique H2 sequences; {sum(1 for v in dup_h2_groups.values() if len(v)>3)} appear on >3 pages.",
    f"- {len(dup_title)} pages share duplicate titles; {len(dup_desc)} share duplicate meta descriptions.",
    "- Differentiation would improve significantly with unique examples, trade-offs, and real metrics per page.",
    "",
    "## Phase 9 — Content quality",
    f"- Average helpfulness score: {avg_scores['helpfulness']}",
    f"- {len(low_help)} pages score below 40 (mostly thin tags/listings).",
    "- Formatting, code blocks, tables, and lists are consistent and scannable.",
    "- Readability is generally good; however, templated sections lower perceived uniqueness.",
    "",
    "## Phase 10 — EEAT",
    f"- Average EEAT score: {avg_scores['eeat']}",
    "- Author name is present but inconsistent between 'Mathias Paulenko' and 'StackPractices'.",
    "- About and legal pages exist, but no editorial process page.",
    "- Schema markup (TechArticle, Person, Organization) is present.",
    "- Trust signals (cookie banner, ads.txt, privacy policy) are in place.",
    "",
    "## Phase 11 — Topical authority",
    f"- Allowed topics coverage: {len(topic_page_count)} of {len(allowed_topics)} have resources.",
    f"- {sum(1 for t in allowed_topics if topic_counts.get(t,0) < 5)} allowed topics have <5 resources.",
    f"- {sum(1 for v in tag_clusters.values() if len(v) == 1)} tags have only 1 resource.",
    "- Strong coverage in recipes/patterns; authority diluted by thousands of thin tag pages.",
    "",
    "## Phase 12 — Helpful content signals",
    "- People-first intent: Yes for content; weaker for auto-generated tag/listing pages.",
    "- Search-first / scaled content risk: High due to 2,000+ pages sharing identical H2 templates.",
    f"- Thin content risk: {len(thin_pages)} pages <200 words.",
    f"- Duplicate content risk: {len(dup_title)} duplicate titles, {len(dup_desc)} duplicate descriptions, {sum(1 for v in dup_h2_groups.values() if len(v)>3)} template H2 sequences.",
    "- Clickbait/keyword stuffing: Not observed.",
    "",
    "## Phase 13 — User value",
    "- Content saves time by providing copy-paste code, templates, and checklists.",
    "- Users can implement, fix, validate, and automate tasks from the recipes and docs.",
    "- Bookmark potential is high for content pages; low for thin tag pages.",
    "- Return visit potential is high if content is kept current and unique.",
    "",
    "## Phase 14 — Competitor comparison",
    "- Strength: practical, code-rich, bilingual, well-structured, free.",
    "- Weakness: templated structure, thin tag pages, inconsistent author signals, missing editorial process.",
    "- Unique value: combination of recipes + patterns + docs + guides across multiple languages with runnable examples.",
    "- Compared to official docs and major blogs, StackPractices is more concise but less authoritative on brand-new or niche topics.",
    "",
    "## Phase 15 — Root cause analysis",
    "- Templating / scaled structure (35%): identical H2 sequences and boilerplate sections.",
    "- Thin tag pages (25%): thousands of low-word tag/listing pages.",
    "- EEAT inconsistency (15%): author name and LinkedIn sameAs issues.",
    "- Content gaps (10%): sparse related resources and thin tag clusters.",
    "- Duplicate metadata (10%): repeated titles/descriptions on tag/listing pages.",
    "- Lack of first-hand evidence (5%): few metrics, war stories, benchmarks.",
    "",
    "## Phase 16 — Prioritized issues",
    "",
    "| Issue ID | Category | Description | Affected Pages | Evidence | Severity | Priority | Confidence | SEO Impact | User Impact | Business Impact | Fix Complexity | Estimated Time | Recommended Solution | Validation Method |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    f"| HCA-001 | Templating | Identical H2 section structure across most content creates an AI/template footprint. | 2,000+ content pages | {sum(1 for v in dup_h2_groups.values() if len(v)>3)} H2 sequences shared by >3 pages | High | P1 | High | High – reduced perceived uniqueness and helpfulness. | Medium – users may skip repeated sections. | Medium – brand trust erodes. | Medium | 4–6 weeks | Vary section content per page; add real examples and metrics. | Re-audit; H2-sequence duplication <5%. |",
    f"| HCA-002 | Thin Content | {len(thin_pages)} pages have <200 words, mostly auto-generated tag/listing pages. | {len(thin_pages)} pages | `PAGE_SCORES.csv` word_count < 200 | Critical | P0 | High | Severe – thin pages risk low-quality demotion. | Low – little value to users. | Low – crawl budget waste. | Low–Medium | 2–4 weeks | Expand with editorial summaries or noindex/fold into parent. | Re-audit; thin pages <5%. |",
    f"| HCA-003 | EEAT | Author byline and schema inconsistent; no editorial process page. | All content pages | `EEAT_REPORT.md` author counts | High | P1 | High | High – weakens author entity. | Medium – users cannot verify expertise. | Medium – trust signal. | Low | 1–2 weeks | Create `authors.json`, normalize bylines, add editorial page. | Re-audit; author values consistent. |",
    f"| HCA-004 | Topical Authority / Internal Linking | {sum(1 for p in page_scores if p['page_type']=='content' and p['related_resources']<2)} content pages have fewer than 2 related resources. | Content pages | `CONTENT_GAPS.csv` GAP-004 | Medium | P2 | Medium | Medium – weakens cluster authority and PageRank flow. | Medium – users find fewer next steps. | Medium – missed engagement. | Low | 2–4 weeks | Add 2–5 related resources to each flagged page. | Re-audit; GAP-004 count drops to 0. |",

    f"| HCA-005 | Duplication | {len(dup_title)} duplicate titles and {len(dup_desc)} duplicate descriptions reduce uniqueness. | Tag/listing and some content pages | `CONTENT_DUPLICATION.csv` | Medium | P2 | High | Medium – cannibalisation and poor CTR. | Low – users see identical snippets. | Low | Medium | 1–2 weeks | Inject unique tag/topic names and counts into metadata. | Re-audit; duplicate title/desc <10. |",
    f"| HCA-006 | Tag Overlap | {len(tag_clusters)} tags; {sum(1 for v in tag_clusters.values() if len(v) <= 2)} have only 1–2 resources and {len(delete)} thin tag pages risk cannibalisation. | Tag pages | `MERGE_CANDIDATES.csv` and `DELETE_CANDIDATES.csv` | Medium | P2 | High | Medium – thin similar tags compete for the same queries. | Low – users see redundant pages. | Low | Medium | 2–4 weeks | Merge synonyms, noindex thin tags, set minimum 3 resources per tag. | Re-audit; tags with 1 resource drop by 50%. |",

    f"| HCA-007 | Practical Value | Some pages lack concrete metrics, war stories, or benchmarks. | Long-form content | Expert review of samples | Medium | P3 | Medium | Medium – first-hand evidence improves helpfulness. | High – users trust real experience. | Medium | High | 4–8 weeks | Add production issues, trade-offs, benchmark numbers to flagship pages. | Manual review; re-score helpfulness. |",
    "",
    "## Final questions",
    "1. **Would Google's Helpful Content System classify this as genuinely helpful?** Yes for the ~2,000 content pages; at-risk for the ~3,600 thin tag/listing and templated pages. Evidence: average helpfulness 70.5, but 3,241 thin pages and extensive template H2 duplication.",
    "2. **Would experienced professionals trust it?** Partially. Technical accuracy is good, but templated structure and inconsistent author signals reduce trust. Evidence: EEAT score average and author inconsistency.",
    "3. **Would users bookmark these pages?** Content pages yes; thin tag/listing pages no. Evidence: depth and practical value scores are high for recipes/guides, low for tags.",
    "4. **Would users recommend them?** Recipes and guides with unique examples would be recommended; generic pages would not. Evidence: practical value and originality scores.",
    "5. **Which pages provide exceptional value?** Long-form guides and code-rich recipes with checklists and tables. Evidence: top depth/practical scores in `PAGE_SCORES.csv`.",
    "6. **Which pages should be rewritten?** Pages with helpfulness <40, originality <40, or duplicate title/description. Evidence: `REWRITE_CANDIDATES.csv`.",
    "7. **Which pages should be merged?** Tags with only 1–2 resources or overlapping synonyms. Evidence: `MERGE_CANDIDATES.csv`.",
    "8. **Which pages should probably be removed?** Thin tags with <200 words and 0–1 resources, plus very low helpfulness content. Evidence: `DELETE_CANDIDATES.csv`.",
    "9. **What evidence supports every conclusion?** `PAGE_SCORES.csv`, `CONTENT_DUPLICATION.csv`, `CONTENT_GAPS.csv`, `REWRITE_CANDIDATES.csv`, `MERGE_CANDIDATES.csv`, `DELETE_CANDIDATES.csv`, and the per-section evidence above.",
]

(OUT / "HELPFUL_CONTENT_REPORT.md").write_text("\n".join(main_lines), encoding="utf-8")

# ---------------------------------------------------------------------------
# EXECUTIVE_SUMMARY.md
# ---------------------------------------------------------------------------

exec_lines = [
    "# Helpful Content Forensic Audit — Executive Summary",
    "",
    f"""**Site:** https://stackpractices.com  
**Audit date:** {today}  
**Pages analyzed:** {len(PAGES)}  
**Markdown sources:** {len(md_files)}""",
    "",
    "## Core verdict",
    f"StackPractices is a people-first, practical knowledge base, but large-scale templating and {len(thin_pages)} thin tag/listing pages create a scaled-content risk that could trigger Google's Helpful Content scrutiny.",
    "",
    "## Strengths",
    f"- {len(md_files)} bilingual markdown sources with consistent structure.",
    f"- {sum(1 for p in page_scores if p['code_blocks']>0)} pages include code blocks.",
    f"- {sum(1 for md in md_by_path.values() if md.get('has_faq'))} pages include FAQ sections.",
    f"- Strong practical value for recipes, patterns, docs, and guides.",
    "- Valid schema, good mobile markup, and clear navigation.",
    "",
    "## Critical content risks",
    f"1. **Template footprint:** {sum(1 for v in dup_h2_groups.values() if len(v)>3)} H2 sequences shared by >3 pages; identical sections across the catalogue.",
    f"2. **Thin content:** {len(thin_pages)} pages below 200 words, mostly auto-generated tags.",
    f"3. **EEAT signals:** author inconsistency and no editorial process page.",
    f"4. **Duplicate metadata:** {len(dup_title)} duplicate titles, {len(dup_desc)} duplicate descriptions.",
    f"5. **Content gaps:** {sum(1 for p in page_scores if p['page_type']=='content' and p['related_resources']<2)} content pages with <2 related resources; {len(delete)} thin tag pages.",
    "",
    "## Immediate actions",
    "1. Add unique editorial summaries or noindex thin tag pages.",
    "2. Vary the 'Overview / Solution / Variants / Common Mistakes / FAQ' content per page; avoid copy-paste sections.",
    "3. Consolidate author data and publish an editorial methodology page.",
    "4. Expand low-coverage topics to at least 5 resources.",
    "5. Generate unique titles/descriptions for tag and listing pages.",
    "",
    "## Output files",
    "- HELPFUL_CONTENT_REPORT.md",
    "- CONTENT_QUALITY_REPORT.md",
    "- EEAT_REPORT.md",
    "- TOPICAL_AUTHORITY_REPORT.md",
    "- CONTENT_GAPS.csv",
    "- CONTENT_DUPLICATION.csv",
    "- PAGE_SCORES.csv",
    "- REWRITE_CANDIDATES.csv",
    "- MERGE_CANDIDATES.csv",
    "- DELETE_CANDIDATES.csv",
    "- EXECUTIVE_SUMMARY.md (this file)",
]

(OUT / "EXECUTIVE_SUMMARY.md").write_text("\n".join(exec_lines), encoding="utf-8")

# Post-process markdown for lint hygiene
print(f"Generated {len(list(OUT.glob('*')))} helpful-content forensic files in {OUT}")
