#!/usr/bin/env python3
"""Compile the 20-phase website forensic audit deliverables for StackPractices."""
import csv
import json
import re
import textwrap
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

ROOT = Path("D:/Codigo/stack-practices-web")
REF = ROOT / "ref"
OUT = REF / "forensic-audit"
OUT.mkdir(parents=True, exist_ok=True)

def load_json(name):
    with open(REF / name, "r", encoding="utf-8") as f:
        return json.load(f)

def load_txt(name):
    return (REF / name).read_text(encoding="utf-8")

DATA = load_json("audit-data.json")
LINKS = load_json("internal-linking-data.json")
THIN = (REF / "thin-content-report.txt").exists() and (REF / "thin-content-report.txt").read_text(encoding="utf-8") or ""

pages = DATA["pages"]
md_files = DATA["mdFiles"]
sitemap = {u["path"]: u for u in DATA["sitemap"]}
robots = DATA.get("robots", {})
issues = DATA["issues"]
content = DATA["content"]
schema = DATA["schema"]

SITE_URL = DATA["site"]["url"]
ALL_PATHS = {p["path"] for p in pages}
ALL_URLS = {p["url"] for p in pages}

def url_to_path(url):
    parsed = urlparse(url)
    return parsed.path or "/"

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

PAGE_TYPES = defaultdict(list)
for p in pages:
    lang, pt = classify_path(p["path"])
    PAGE_TYPES[(lang, pt)].append(p)

# ---------------------------------------------------------------------------
# Core forensic findings
# ---------------------------------------------------------------------------

# Sitemap vs dist
# Use the actual public sitemap and normalise percent-encoded spaces so tag URLs match dist folders
_public_sitemap_xml = (ROOT / "public" / "sitemap.xml").read_text(encoding="utf-8")
_public_locs = re.findall(r"<loc>([^<]+)</loc>", _public_sitemap_xml)
sitemap_paths = {unquote(urlparse(u).path) for u in _public_locs}
dist_paths = {p["path"] for p in pages}

missing_en = []
missing_es = []
for p in pages:
    lang, _ = classify_path(p["path"])
    if p["path"] not in sitemap_paths:
        if lang == "en":
            missing_en.append(p["path"])
        else:
            missing_es.append(p["path"])

missing_by_prefix = Counter()
for p in missing_en:
    m = re.match(r"^/(\w+)/", p)
    missing_by_prefix[m.group(1) if m else "other"] += 1

# Metadata
title_long = issues["titleTooLong"]
desc_long = issues["descTooLong"]
desc_short = issues["descTooShort"]
dup_titles = issues["duplicateTitles"]
dup_descs = issues["duplicateDescs"]
multiple_h1 = issues["multipleH1"]
missing_hreflang = issues["missingHreflang"]
canonical_mismatch = issues["canonicalMismatch"]
missing_alt = issues["missingAltPages"]
thin_pages = issues["thinPages"]

# H1 / heading helpers
h1_by_type = defaultdict(list)
for h in multiple_h1:
    path = url_to_path(h["url"])
    lang, pt = classify_path(path)
    h1_by_type[pt].append(h)

# Thin pages by type
thin_by_type = defaultdict(int)
for t in thin_pages:
    path = url_to_path(t["url"])
    lang, pt = classify_path(path)
    thin_by_type[pt] += 1

# Missing hreflang by type
hreflang_by_type = defaultdict(list)
for url in missing_hreflang:
    path = url_to_path(url)
    lang, pt = classify_path(path)
    hreflang_by_type[pt].append(url)

# Canonical mismatch details
canonical_issues = [f"{cm['url']} -> canonical {cm['canonical']}" for cm in canonical_mismatch]

# Missing alt pages details
missing_alt_details = [p for p in pages if p.get("missingAlt", 0) > 0]

# Build asset sizes
ba = DATA["summary"]["buildAssets"]

# ---------------------------------------------------------------------------
# Internal link graph
# ---------------------------------------------------------------------------

# Global / navigation targets present on > 90 % of pages
all_targets = Counter()
edge_counts = Counter()
for p in pages:
    for href in p.get("internalLinks", []):
        full_target = urljoin(SITE_URL, href)
        all_targets[full_target] += 1
        edge_counts[(p["url"], full_target)] += 1

GLOBAL_THRESHOLD = int(0.9 * len(pages))
global_targets = {t for t, c in all_targets.items() if c >= GLOBAL_THRESHOLD}

# Non-global edge list with source/target/type
edge_rows = []
for (src, target), count in edge_counts.items():
    if target in global_targets:
        continue
    src_path = url_to_path(src)
    tgt_path = url_to_path(target)
    lang, src_type = classify_path(src_path)
    _, tgt_type = classify_path(tgt_path)
    broken = tgt_path not in dist_paths
    noindex = tgt_path in ("/search/", "/es/search/", "/404/", "/es/404/")
    edge_rows.append({
        "source_url": src,
        "target_url": target,
        "source_type": src_type,
        "target_type": tgt_type,
        "edge_count": count,
        "is_broken": broken,
        "is_noindex": noindex,
        "rel": "",
        "anchor_text": "",
    })

# Incoming links per target
incoming = defaultdict(list)
for row in edge_rows:
    incoming[row["target_url"]].append(row["source_url"])

# Total incoming links per target (including global navigation/footer)
all_target_urls = {t for t in all_targets if t.startswith(SITE_URL) or t.startswith("/")}

# Orphan pages: no incoming links at all (global or non-global)
orphan_nodes = [p["url"] for p in pages if p["url"] not in all_target_urls and p["path"] not in ("/", "/es/")]

# Node graph for CSV
node_rows = []
for p in pages:
    path = p["path"]
    lang, pt = classify_path(path)
    url = p["url"]
    inlinks = incoming.get(url, [])
    inlink_total = all_targets.get(url, 0)
    inlink_global = inlink_total - len(inlinks)
    is_orphan = url in orphan_nodes
    is_broken = False
    is_noindex = path in ("/search/", "/es/search/", "/404/", "/es/404/")
    # deep page if > 3 segments after language
    depth = len([s for s in path.split("/") if s])
    if lang == "es":
        depth -= 1
    is_deep = depth > 3
    top_sources = "; ".join(sorted(set(inlinks))[:5])
    node_rows.append({
        "target_url": url,
        "target_path": path,
        "lang": lang,
        "target_type": pt,
        "inlink_count_total": inlink_total,
        "inlink_count_non_global": len(inlinks),
        "inlink_count_global": inlink_global,
        "top_sources_non_global": top_sources,
        "is_orphan": is_orphan,
        "is_noindex": is_noindex,
        "is_broken": is_broken,
        "is_deep": is_deep,
        "crawl_depth": depth,
    })

# ---------------------------------------------------------------------------
# Issue definitions
# ---------------------------------------------------------------------------

def samples(items, n=3):
    return "\n".join(str(x) for x in items[:n])

def issue_fields(issue_id, title, category, description, evidence, affected, severity, priority, confidence,
                 business, seo, technical, complexity, fix_time, dependencies, solution, validation):
    return {
        "issue_id": issue_id,
        "title": title,
        "category": category,
        "description": description,
        "evidence": evidence,
        "affected_urls_or_count": affected,
        "severity": severity,
        "priority": priority,
        "confidence": confidence,
        "business_impact": business,
        "seo_impact": seo,
        "technical_impact": technical,
        "estimated_fix_complexity": complexity,
        "estimated_fix_time": fix_time,
        "dependencies": dependencies,
        "recommended_solution": solution,
        "validation_method": validation,
    }

today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

TECHNICAL_ISSUES = []

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-001", "Sitemap coverage gap – ~3,221 pages not in public sitemap", "Crawlability / Indexability",
    "Only 2,521 URLs are present in public/sitemap.xml and dist/sitemap.xml, but the build emits 5,742 HTML pages. 324 English pages (105 recipes, 139 tag pages, 48 docs, 20 guides, 7 patterns) and the corresponding Spanish alternates are not submitted in the sitemap, plus many Spanish pages are only represented through xhtml:link alternates rather than <loc> entries.",
    f"dist pages: {len(pages)}; sitemap <loc> entries: {len(sitemap)}; inDistNotSitemap: {len(missing_en) + len(missing_es)} (from audit-data.json). Missing EN breakdown: {dict(missing_by_prefix)}.",
    f"{len(missing_en)} EN pages + {len(missing_es)} ES/noindex pages. Samples: {samples(missing_en, 3)}",
    "Critical", "P0", "High",
    "Lost organic discoverability; search engines may never crawl large parts of the catalogue.",
    "Severe – uncatalogued pages cannot rank.",
    "Sitemap generator only emits one <loc> per content page and omits many tags/resources.",
    "Medium", "1-2 days",
    "scripts/generate-sitemap.cjs, public/sitemap.xml, CI build",
    "Regenerate sitemap to include one <loc> per canonical language variant, URL-encode spaces, and submit both EN and ES URLs. Rebuild and verify with python -c \"...\".",
    "Run forensic-data-generator.cjs and confirm inDistNotSitemap == 0 and sitemap count == dist page count - noindex pages.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-002", "Canonical trailing slash mismatch on home page and /es/", "Canonicalization",
    "The canonical URL on the home page omits the trailing slash while the live URL and Astro config enforce trailing slash. This creates a canonical mismatch for the two most important pages.",
    f"Canonical mismatch rows: {canonical_mismatch}",
    f"2 pages: {', '.join(canonical_issues)}",
    "High", "P1", "High",
    "Dilutes homepage ranking signals; search engine may treat canonical and live URL as duplicates.",
    "High – homepage is the primary entry point.",
    "Seo.astro sets path='/' -> canonical base without trailing slash.",
    "Low", "5 min",
    "src/components/Seo.astro, src/layouts/BaseLayout.astro",
    "For path === '/' keep canonical as https://stackpractices.com/ (with trailing slash) and for /es/ as https://stackpractices.com/es/.",
    "Re-audit home page; canonical should match live URL exactly.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-003", "Multiple H1 elements on 564 pages", "Headings / HTML",
    "564 rendered HTML pages contain more than one <h1>. In most cases this is caused by markdown files that start with a # heading while the RecipeArticle component also injects an H1 title, producing two H1 tags.",
    f"Total pages with multiple H1: {len(multiple_h1)}. Distribution by page type: {dict({k: len(v) for k, v in h1_by_type.items()})}.",
    f"Samples: {samples([h['url'] for h in multiple_h1], 3)}",
    "High", "P1", "High",
    "Confuses screen readers and search engines about the primary topic of the page.",
    "High – improper heading hierarchy may reduce featured snippet eligibility.",
    "Markdown source files include H1 and component adds another H1.",
    "Medium", "1-2 weeks",
    "src/content/**/*.md, RecipeArticle.astro, PatternArticle.astro, GuideArticle.astro, DocArticle.astro",
    "Remove H1 from markdown body and rely on the component title; or make component use h2 and style it.",
    "Re-run forensic-data-generator; multipleH1 count should drop to 0.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-004", "Meta description too long on 3,930 pages", "Metadata / SERP",
    "3,930 of 5,742 pages have meta descriptions longer than 160 characters. Most are tag/topic/listing pages whose descriptions repeat template text and are not optimised for snippets.",
    f"descTooLong: {len(desc_long)}; listing/tag pages dominate.",
    f"{len(desc_long)} pages. Samples: {samples([d['url'] for d in desc_long], 2)}",
    "High", "P1", "High",
    "Descriptions may be truncated in SERP, lowering click-through rate.",
    "High – poor snippet display harms CTR.",
    "Tag/listing pages use auto-generated long descriptions.",
    "Medium", "1 week",
    "src/pages/tags/[tag].astro, src/pages/topics/[topic].astro, listing pages",
    "Create concise, unique meta descriptions per tag/topic (<=160 chars) or derive from the most relevant content card.",
    "Sample 20 URLs; ensure descriptions <=160 chars.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-005", "Title too long on 781 pages", "Metadata / SERP",
    "781 titles exceed 60 characters, primarily Spanish pages whose title includes 'Plantilla de... | StackPractices'.",
    f"titleTooLong: {len(title_long)}; content pages: {DATA['summary'].get('contentTitleTooLong', 'N/A')}.",
    f"{len(title_long)} pages. Samples: {samples([t['url'] for t in title_long], 2)}",
    "Medium", "P2", "High",
    "Truncated titles reduce readability and CTR.",
    "Medium – truncated SERP titles.",
    "Pipe suffix ' | StackPractices' adds 17 chars; Spanish prefixes are verbose.",
    "Low", "1 week",
    "src/components/Seo.astro, content frontmatter",
    "Trim brand suffix or shorten translated prefixes. Keep title <=60 chars.",
    "Re-audit; titleTooLong should be <1%.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-006", "Duplicate titles and descriptions across multiple pages", "Metadata",
    f"{len(dup_titles)} duplicate title values and {len(dup_descs)} duplicate meta description values exist across pages. Tag and listing pages reuse identical template text.",
    f"duplicateTitles: {len(dup_titles)}; duplicateDescs: {len(dup_descs)}.",
    f"Duplicate titles: {dup_titles[:3]}; Duplicate descs: {dup_descs[:3] if dup_descs else 'N/A'}",
    "High", "P1", "High",
    "Duplicate metadata cannibalises ranking potential and lowers perceived uniqueness.",
    "High – duplicate meta can trigger soft 404 or filtered ranking.",
    "Template-generated title/description use generic strings.",
    "Medium", "1-2 weeks",
    "src/pages/tags/[tag].astro, listing pages",
    "Inject unique tag/topic name and item count into title and description templates.",
    "Re-audit duplicateTitles and duplicateDescs.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-007", "Missing hreflang on 306 pages", "Internationalization",
    "306 pages have no hreflang annotations. These are mainly /es/tags/<tag>/ pages where no English equivalent exists, plus /es/search/ and 404. While noindex on 404/search is correct, Spanish tag pages should still carry a self-referencing hreflang.",
    f"missingHreflang: {len(missing_hreflang)}. Distribution by page type: {dict({k: len(v) for k, v in hreflang_by_type.items()})}.",
    f"{len(missing_hreflang)} pages. Samples: {samples(missing_hreflang, 3)}",
    "High", "P1", "High",
    "Google may not correctly identify language targeting for Spanish tag pages.",
    "High – hreflang errors weaken multilingual targeting.",
    "hasAlternate=false when ES tag lacks EN equivalent; component does not emit self hreflang.",
    "Low", "1 day",
    "src/pages/es/tags/[tag].astro, src/components/Seo.astro",
    "Always emit at least a self-referencing hreflang (e.g. es alone) on non-noindex pages.",
    "Re-audit; missingHreflang should only include 404/search/noindex.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-008", "Sitemap URLs contain unencoded spaces", "Sitemap / URL",
    "Tag URLs in the sitemap (and in links) include literal spaces such as /tags/api design/. XML <loc> values must be URL-escaped and spaces should be encoded as %20 or replaced with hyphens.",
    "public/sitemap.xml contains <loc>https://stackpractices.com/tags/api design/</loc>.",
    "All 1,635 tag URLs in the sitemap plus alternates.",
    "Medium", "P2", "High",
    "Invalid sitemap URLs may cause validators and search engines to reject or ignore URLs.",
    "Medium – sitemap validity risk.",
    "Tag values are stored and rendered with spaces.",
    "Medium", "1 day",
    "scripts/generate-sitemap.cjs, src/lib/content.ts tag generation",
    "Generate slugs for tags by replacing spaces with hyphens, or encode spaces as %20 in sitemap and hreflang.",
    "Validate sitemap with an XML/sitemap validator; no warnings for spaces.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-009", "No primary mobile navigation menu", "Mobile UX / Accessibility",
    "The sticky header nav uses `hidden md:flex`, meaning on mobile viewports (<768px) the entire main navigation is hidden and no hamburger icon is present. Mobile users can only use search or footer links.",
    "src/components/layout/Header.astro line: <nav aria-label='Main navigation' class='hidden items-center gap-1 md:flex'>.",
    "All 5,742 pages (global header).",
    "Critical", "P0", "High",
    "Mobile users lose access to primary category navigation, directly hurting engagement and crawlability signals.",
    "Medium – mobile UX affects mobile-first indexing.",
    "Tailwind class `hidden` hides nav below `md` breakpoint with no fallback.",
    "Medium", "2-3 days",
    "src/components/layout/Header.astro",
    "Implement a hamburger menu with disclosure pattern (button aria-expanded, mobile nav panel, focus trap) or keep nav visible on mobile.",
    "Manual check on 375px viewport; nav must be operable with screen reader.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-010", "Form/search inputs lack visible labels", "Accessibility",
    "Search inputs on the home page, tags index, and listing pages rely on `placeholder` alone and do not have associated <label> elements. This fails WCAG 3.3.2 and 1.3.1.",
    "Search inputs use placeholder='Search recipes...' or 'Filter tags...' without a <label for='...'>.",
    "Global search input and tag filter (all listing pages).",
    "Medium", "P2", "High",
    "Screen-reader users may not understand the purpose of the inputs; placeholders disappear on typing.",
    "Low – a11y only, but can affect compliance.",
    "Inputs implemented with only placeholder attribute.",
    "Low", "2 hours",
    "src/pages/index.astro, src/pages/tags/index.astro, src/pages/[type]/index.astro",
    "Add explicit <label> for every input or `aria-label` when a visual label cannot be shown.",
    " axe-core / Lighthouse accessibility scan should show 0 label issues.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-011", "Missing security headers on GitHub Pages", "Security",
    "Live HTTP headers for stackpractices.com do not include Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, or Referrer-Policy. Cache-Control is only 600s.",
    "Live HEAD response captured 2026-08-04: Cache-Control: max-age=600; no CSP/HSTS/X-Frame-Options/X-Content-Type-Options/Referrer-Policy.",
    "All pages served by GitHub Pages.",
    "Medium", "P2", "High",
    "Increased XSS, clickjacking and MIME sniffing risk; no HTTPS upgrade enforcement.",
    "Low – static content reduces exploit impact, but trust signal is missing.",
    "GitHub Pages static host does not add these headers by default; configurable via front-end meta tags.",
    "Medium", "1 day",
    "Astro config / hosting layer",
    "Add CSP <meta> tags, HSTS via hosting/CDN, X-Frame-Options meta tag, and referrer meta tag; consider Cloudflare in front of GitHub Pages.",
    "Run securityheaders.com or curl -I; grades should improve.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-012", "Third-party scripts lack Subresource Integrity (SRI)", "Security",
    "Google Tag Manager (googletagmanager.com), gtag and AdSense scripts are loaded from external domains without `integrity` or fallback. A compromise of those CDNs executes arbitrary code.",
    "Header scripts in src/components/Seo.astro load https://www.googletagmanager.com/gtm.js and ads scripts without SRI.",
    "All pages.",
    "Medium", "P2", "Medium",
    "Supply-chain / XSS risk; ad/tracking script integrity not verifiable.",
    "Low – no direct SEO impact.",
    "SRI hashes not generated for GTM/AdSense; these scripts can change.",
    "Low", "1 hour",
    "src/components/Seo.astro",
    "Host third-party scripts locally with SRI, or use `integrity`/`crossorigin` when static hashes are feasible; for GTM this may require a proxy.",
    "Inspect page source; third-party scripts should have integrity attribute.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-013", "HTML build output extremely large", "Performance",
    f"The build emits {len(pages)} HTML pages totalling {ba['htmlSize']:,} bytes ({ba['htmlSize'] / 1024 / 1024:.1f} MB). The Astro build takes ~16 minutes and the Pagefind index takes 76s.",
    f"htmlSize={ba['htmlSize']}; distHtmlPages={len(pages)}; Astro build time ~16m; Pagefind index time 76s.",
    "Every page; average ~50KB HTML.",
    "High", "P1", "High",
    "Slower deploys, longer CI, larger repo, larger Pagefind index, higher bandwidth.",
    "Medium – page weight affects Core Web Vitals.",
    "Every page inlines FAQ JSON-LD, related resources, and pagefind metadata.",
    "High", "1-2 weeks",
    "Astro build, Pagefind, templates",
    "Reduce page weight by lazy-loading FAQ schema, paginating listings, moving Pagefind data to chunks, and pruning redundant JSON-LD.",
    "Re-build and compare htmlSize / build time; target <150MB.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-014", "Short cache headers for static assets", "Performance",
    "Live CSS/JS assets on GitHub Pages are served with Cache-Control: max-age=600 (10 minutes), negating the benefit of hashed filenames and forcing revalidation.",
    "HEAD /_astro/BaseLayout.Dm6ii21Q.css: Cache-Control: max-age=600.",
    "All _astro/ hashed assets and pagefind/ assets.",
    "Medium", "P2", "High",
    "Repeat visitors re-download unchanged assets, wasting bandwidth and slowing repeat LCP.",
    "Low – static assets but short cache hurts repeat load.",
    "GitHub Pages Cache-Control policy is 10 minutes for HTML and assets.",
    "Low", "2 hours",
    "Hosting / CDN",
    "Place Cloudflare or another CDN in front with a page rule for _astro/* and pagefind/* to cache 1 year.",
    "Verify Cache-Control: max-age=31536000 on hashed assets.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-015", "Tag and listing pages classified as thin", "Content / Indexability",
    f"{len(thin_pages)} pages have fewer than 200 visible words. {thin_by_type.get('tag', 0)} are tag pages and {thin_by_type.get('listing', 0)} are listing pages.",
    f"thinPages: {len(thin_pages)}; by type: {dict(thin_by_type)}.",
    f"Tag and listing pages. Samples: {samples([t['url'] for t in thin_pages if 'tag' in t['url']], 2)}",
    "Medium", "P2", "High",
    "Search engines may demote thin listing/tag pages; weak topical authority.",
    "Medium – thin content can be filtered.",
    "Tag/listing pages only show cards and boilerplate text.",
    "Medium", "2 weeks",
    "src/pages/tags/[tag].astro, src/pages/topics/[topic].astro, src/pages/[type]/index.astro",
    "Add unique editorial introductions to each tag and topic page (tagIntros already exists, ensure full coverage) and listing page copy.",
    "Tag pages should have >200 words in visible body text.",
))

TECHNICAL_ISSUES.append(issue_fields(
    "TECH-016", "Images missing alt text on 3 pages", "Accessibility",
    "3 pages contain  with no alt attribute, breaking WCAG 1.1.1 for non-text content.",
    f"missingAltPages: {len(missing_alt)}.",
    f"{samples([m['url'] for m in missing_alt], 3) if missing_alt else 'N/A'}. Missing alt count: {sum(m['missing'] for m in missing_alt)}",
    "Low", "P2", "High",
    "Screen readers cannot describe images; possible SEO image-search loss.",
    "Low – affects image indexing and a11y.",
    "Content images inserted without alt text.",
    "Low", "30 min",
    "src/content/**/*.md, components rendering markdown",
    "Add alt text to every image; use empty alt only for decorative images.",
    "Re-audit missingAltPages count == 0.",
))

# ---------------------------------------------------------------------------
# Content issues
# ---------------------------------------------------------------------------

CONTENT_ISSUES = []

# AI phrase counts
ai_counts = content.get("aiPhraseCounts", {})
overall = ai_counts.get("overall", 0)
vital = ai_counts.get("vital", 0)

CONTENT_ISSUES.append(issue_fields(
    "CONT-001", "AI-style empty qualifiers detected", "Content quality",
    f"The phrase 'overall' appears {overall} times and 'vital' appears {vital} times across markdown files. Such generic adjectives weaken perceived expertise.",
    f"aiPhrases overall: {overall}; vital: {vital}.",
    "Across all recipe/pattern/guide/doc content.",
    "Medium", "P2", "Medium",
    "Erodes EEAT trust and makes content feel templated.",
    "Medium – search quality may penalise generic, unhelpful phrasing.",
    "Content templates or editorial style overuse these words.",
    "Low", "1-2 weeks",
    "src/content/**/*.md",
    "Replace empty qualifiers with concrete, technical language (e.g. 'reduces latency by 40%' rather than 'vital').",
    "Re-run thin-content-check or search for 'overall'/'vital' counts; reduce by 80%.",
))

# Template heading counts
th = content.get("templateHeadingCounts", {})
CONTENT_ISSUES.append(issue_fields(
    "CONT-002", "Repetitive heading structures across pages", "Content structure",
    f"Many pages share the same H2 headings: {th.get('common mistakes', 0)} 'common mistakes', {th.get('overview', 0)} 'overview', {th.get('when to use', 0)} 'when to use'. While this helps consistency, it can signal templated, thin content if the sections are not substantiated.",
    f"templateHeadingCounts: {dict(list(th.items())[:10])}.",
    f"All {len(md_files)} content pages.",
    "Medium", "P2", "High",
    "Templated sections can appear to search engines as duplicate or low-value content.",
    "Medium – over-templating may limit featured snippets.",
    "Article components inject the same section headings for every content page.",
    "Low", "1-2 weeks",
    "src/components/RecipeArticle.astro, PatternArticle.astro, GuideArticle.astro, DocArticle.astro",
    "Keep section headings where they add value, but ensure body copy is genuinely distinct per page; consider collapsing empty sections.",
    "Manually review 10 pages for repeated empty sections.",
))

# Markdown H1 duplication
CONTENT_ISSUES.append(issue_fields(
    "CONT-003", "Markdown source files contain a level-1 heading", "Content structure",
    "564 content pages end up with two H1 tags because the markdown starts with # Title while the Astro article component also renders the title as an H1.",
    f"multipleH1: {len(multiple_h1)}.",
    f"Samples: {samples([h['url'] for h in multiple_h1], 3)}",
    "High", "P1", "High",
    "Hurts heading hierarchy and accessibility.",
    "High – two H1s dilute topical focus.",
    "Content authors write # Title; component renders title H1.",
    "Medium", "1-2 weeks",
    "src/content/**/*.md, article components",
    "Remove # headings from markdown body or configure components to render the first H1 and downgrade the injected title.",
    "Re-audit multipleH1 == 0.",
))

# Author inconsistency
author_counts = content.get("authorCounts", {})
CONTENT_ISSUES.append(issue_fields(
    "CONT-004", "Author name inconsistent across site and schema", "EEAT",
    f"Content authors vary between 'Mathias Paulenko' ({author_counts.get('Mathias Paulenko', 0)}) and 'StackPractices' ({author_counts.get('StackPractices', 0)}). The author page hard-codes 'Mathias Vladimir Paulenko Echeverz' while the Person schema uses a different (incorrect) LinkedIn URL.",
    f"authorCounts: {dict(author_counts)}; src/pages/authors/mathias-paulenko.astro and src/lib/schema.ts.",
    f"All content with author metadata.",
    "High", "P1", "High",
    "Weakens E-E-A-T and entity recognition; search engines cannot consolidate author identity.",
    "High – author expertise is a ranking factor for YMYL/technical topics.",
    "No central author configuration; Person schema sameAs uses https://cn.linkedin.com/in/mathias-paulenko-echeverz.",
    "Low", "1 day",
    "src/config/site.ts, src/lib/schema.ts, src/pages/authors/*.astro",
    "Create a single authors.json data source, normalise to one name, fix LinkedIn sameAs to https://www.linkedin.com/in/mathias-paulenko-echeverz (or verify), and consistently consume it.",
    "Validate all byline and schema author values are identical and LinkedIn returns a 200/redirect.",
))

# Low internal body links
CONTENT_ISSUES.append(issue_fields(
    "CONT-005", "623 content files have fewer than 3 body/internal links", "Internal linking",
    "The audit-all-internal-links.cjs report flags 623 markdown files with only 1 or 2 internal links. Internal linking within the body is a key EEAT and crawlability signal.",
    "ref/shell output from audit-all-internal-links.cjs: 'Total files needing more links: 623'.",
    "623 markdown files (en+es).",
    "High", "P1", "High",
    "Low internal linking limits PageRank distribution and topical clustering.",
    "High – poor internal linking depresses rankings across the whole catalogue.",
    "Many templates and docs have relatedResources but no body links.",
    "Medium", "3-4 weeks",
    "src/content/**/*.md",
    "Editorial process: require 3-5 contextual internal links in each resource; add an internal-link review step.",
    "Re-run audit-all-internal-links.cjs; reduce 'files needing more links' to <50.",
))

# Bidirectional gaps
bi_gaps = LINKS.get("biGaps", [])
CONTENT_ISSUES.append(issue_fields(
    "CONT-006", f"{len(bi_gaps)} bidirectional link gaps between related resources", "Internal linking",
    "A page links to another resource, but that resource does not link back. This creates one-way topical associations and weakens cluster cohesion.",
    f"internal-linking-data.json totalBiGaps: {len(bi_gaps)}.",
    f"{len(bi_gaps)} pairs. Samples: {samples([str(g['from']) + ' -> ' + str(g['to']) for g in bi_gaps], 3)}",
    "Medium", "P2", "Medium",
    "Asymmetric PageRank flow; content clusters are not fully connected.",
    "Medium – reduces authority per cluster.",
    "relatedResources are manually curated and not normalised.",
    "Medium", "1-2 weeks",
    "src/content/**/*.md, internal-linking-audit.cjs",
    "Use the internal-linking-audit suggestions to add reverse links, or build a symmetric link graph.",
    "Re-run internal-linking-audit.cjs; biGaps <10.",
))

# Spanish related resources display English metadata
CONTENT_ISSUES.append(issue_fields(
    "CONT-007", "Spanish content 'related resources' cards show English titles", "Internationalization",
    "The resource index used for 'Recursos Relacionados' on /es/* pages is built from English content only. The card title and description are in English even though the href points to /es/.",
    "src/lib/content.ts buildResourceIndex() indexes only non-Spanish entries; src/lib/content.ts resolveRelated() for 'es' reuses that index.",
    "All 1,021 Spanish content pages with related resources.",
    "High", "P1", "High",
    "Spanish readers see mixed-language cards, hurting trust and click-through.",
    "Medium – bilingual UX inconsistency.",
    "No Spanish resource index is built.",
    "Medium", "1-2 days",
    "src/lib/content.ts, src/pages/es/**/*.astro",
    "Build a Spanish resource index and use it when resolving related resources for /es/ pages.",
    "Inspect an /es/ content page; related cards must be in Spanish.",
))

# Thin by line count
thin_warn = re.findall(r"(\d+) lines: (src/content/.+\.md)", THIN)
CONTENT_ISSUES.append(issue_fields(
    "CONT-008", f"{len(thin_warn)} content files are close to the 300-line threshold", "Content depth",
    "thin-content-check.cjs flags 798 files between 300-349 lines. None are below 300, but a large portion sits just above the threshold, suggesting many articles may be too brief for competitive SERPs.",
    f"thin-content-report.txt: 0 FAIL (<300), 798 WARN (300-349), {len(md_files)-len(thin_warn)} OK.",
    f"{len(thin_warn)} markdown files. Samples: {samples([f[1] for f in thin_warn], 3)}",
    "Medium", "P2", "Medium",
    "Thin content may fail to satisfy search intent, especially for technical guides.",
    "Medium – depth correlates with ranking.",
    "Template-driven content or early articles.",
    "High", "4-6 weeks",
    "src/content/**/*.md",
    "Expand the 300-349 line files with concrete examples, troubleshooting sections, or real-world caveats.",
    "Re-run thin-content-check.cjs; <5% files in WARN band.",
))

# Date published == date modified
CONTENT_ISSUES.append(issue_fields(
    "CONT-009", "datePublished and dateModified are identical", "Structured data / EEAT",
    "TechArticle schema uses the content `lastUpdated` date for both datePublished and dateModified. Google may not understand the original publication history.",
    "src/lib/schema.ts TechArticle schema sets datePublished and dateModified both from opts.lastUpdated.",
    f"All {schema['types'].get('TechArticle', 0)} TechArticle pages.",
    "Low", "P3", "Medium",
    "Reduces freshness signal accuracy.",
    "Low – dates are still valid.",
    "Frontmatter lacks a publishedAt field.",
    "Low", "1-2 days",
    "src/lib/schema.ts, src/content.config.ts",
    "Add `publishedAt` to the content schema and use it for datePublished while lastUpdated remains for dateModified.",
    "Validate structured data with Schema Markup Validator.",
))

# Topic / tag authority
CONTENT_ISSUES.append(issue_fields(
    "CONT-010", "Tags are numerous and uncurated, risking keyword cannibalisation", "Topical authority",
    f"The site has {len(PAGE_TYPES[('en','tag')])} English tag pages and {len(PAGE_TYPES[('es','tag')])} Spanish tag pages, some with overlapping meaning (e.g. 'api design' vs 'api-design'?). Many tags have only 1-2 resources.",
    f"Tag counts EN: {len(PAGE_TYPES[('en','tag')])}; ES: {len(PAGE_TYPES[('es','tag')])}. Dist has 1,739 en and 1,883 es tag folders.",
    f"Tag pages with 1-2 resources: ... (see INTERNAL_LINKS.csv).",
    "Medium", "P2", "Medium",
    "Dilutes topical clusters and creates low-value pages that compete with each other.",
    "Medium – tag cannibalisation and thin pages.",
    "Tags come from unnormalised frontmatter values.",
    "High", "2-4 weeks",
    "src/content.config.ts, src/lib/content.ts",
    "Normalise tag slugs, merge near-duplicates, add a minimum resource threshold (e.g. 3 items) before creating a public tag page, and noindex thin tags.",
    "Reduce tag count by 30% and ensure each tag has >=3 resources.",
))

# ---------------------------------------------------------------------------
# CSV writers
# ---------------------------------------------------------------------------

def write_csv(filename, rows, fieldnames):
    with open(OUT / filename, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})

TECH_FIELDS = [
    "issue_id", "title", "category", "description", "evidence", "affected_urls_or_count",
    "severity", "priority", "confidence", "business_impact", "seo_impact", "technical_impact",
    "estimated_fix_complexity", "estimated_fix_time", "dependencies", "recommended_solution", "validation_method",
]

write_csv("TECHNICAL_ISSUES.csv", TECHNICAL_ISSUES, TECH_FIELDS)
write_csv("CONTENT_ISSUES.csv", CONTENT_ISSUES, TECH_FIELDS)

# Internal links node graph
LINK_FIELDS = [
    "target_url", "target_path", "lang", "target_type", "inlink_count_total",
    "inlink_count_non_global", "inlink_count_global", "top_sources_non_global",
    "is_orphan", "is_noindex", "is_broken", "is_deep", "crawl_depth",
]
node_rows.sort(key=lambda r: r["inlink_count_total"], reverse=True)
write_csv("INTERNAL_LINKS.csv", node_rows, LINK_FIELDS)

# ---------------------------------------------------------------------------
# Markdown reports
# ---------------------------------------------------------------------------

def md_table(rows, fieldnames):
    if not rows:
        return "\n\n_no data_\n"
    header = "| " + " | ".join(fieldnames) + " |"
    sep = "|" + "|".join([" --- " for _ in fieldnames]) + "|"
    lines = [header, sep]
    for r in rows:
        vals = [str(r.get(k, "")).replace("\n", " ").replace("|", "\\|")[:200] for k in fieldnames]
        lines.append("| " + " | ".join(vals) + " |")
    return "\n".join(lines)

# Executive summary
exec_lines = [
    "# StackPractices Website Forensic Audit — Executive Summary",
    "",
    f"""**Site:** https://stackpractices.com  
**Audit date:** {today}  
**Build pages:** {len(pages):,}  
**Markdown sources:** {len(md_files):,}  
**Sitemap URLs:** {len(sitemap):,}""",
    "",
    "## Critical & High-priority issues",
    "",
]

for sev in ["Critical", "High"]:
    for issue in TECHNICAL_ISSUES + CONTENT_ISSUES:
        if issue["severity"] == sev:
            exec_lines.append(f"- **{issue['issue_id']}** — {issue['title']} ({issue['priority']})")

exec_lines += [
    "",
    "## Immediate actions (next 7 days)",
    "1. Regenerate `public/sitemap.xml` to include every canonical page and both language variants; validate with an XML linter.",
    "2. Fix the home page `/` and `/es/` canonical to include the trailing slash.",
    "3. Add a mobile hamburger navigation; do not hide primary nav on small viewports.",
    "4. Remove duplicate H1 from markdown (or from article components).",
    "5. Shorten meta descriptions on tag/listing pages and eliminate duplicate titles/descriptions.",
    "",
    "## Notable false positives",
    "- `missingHreflang` includes `/search/` and `/404/` which are correctly `noindex`; this is expected.",
    "- `thinPages` is dominated by listing/tag pages with <200 words; this is common for index pages but should still be improved with introductions.",
    "- Spanish and English pages are near-duplicates by design; they are correctly linked by hreflang alternates.",
    "",
    "## Health score (rough)",
    f"- Sitemap coverage: {len(sitemap)/len(pages)*100:.1f}% of dist pages are in sitemap.",
    f"- Metadata health: {len(title_long)} title warnings, {len(desc_long)} description warnings.",
    f"- Heading health: {len(multiple_h1)} pages with multiple H1.",
    f"- Internal linking: {len(orphan_nodes)} orphan pages (excluding home), {len(bi_gaps)} bi-directional gaps.",
    f"- Structured data: {sum(schema['types'].values())} schema objects across {len(pages)} pages.",
    "",
    "## Files generated",
    "- WEBSITE_FORENSIC_REPORT.md",
    "- TECHNICAL_ISSUES.csv",
    "- CONTENT_ISSUES.csv",
    "- INTERNAL_LINKS.csv",
    "- ARCHITECTURE_REPORT.md",
    "- EEAT_REPORT.md",
    "- PERFORMANCE_REPORT.md",
    "- ACCESSIBILITY_REPORT.md",
    "- EXECUTIVE_SUMMARY.md (this file)",
]

(OUT / "EXECUTIVE_SUMMARY.md").write_text("\n".join(exec_lines), encoding="utf-8")

# Architecture report
arch_lines = [
    "# Architecture & Information Architecture Report",
    "",
    f"**Site:** https://stackpractices.com — static Astro 5 + GitHub Pages. **Pages:** {len(pages):,}.",
    "",
    "## 1. URL structure",
    "- Lower-case slugs, trailing-slash canonical enforced by Astro config.",
    "- Two-level content hierarchy: /{type}/{slug}/ with type = recipes, patterns, docs, guides.",
    "- Topic pages: /topics/{topic}/; Tag pages: /tags/{tag}/ (tag values contain spaces, should be slugified).",
    "- Spanish locale prefix: /es/.",
    "",
    "## 2. Crawlability",
    md_table([
        {"item": "robots.txt", "status": "OK", "evidence": "Allows all; points to sitemap"},
        {"item": "sitemap.xml", "status": "CRITICAL", "evidence": f"{len(sitemap):,} URLs vs {len(pages):,} dist pages ({len(missing_en)} missing EN)"},
        {"item": "noindex pages", "status": "OK", "evidence": "4 pages: 404 + search (en/es)"},
    ], ["item", "status", "evidence"]),
    "",
    "## 3. Indexability",
    f"- {len(thin_pages):,} thin pages (wordCount < 200), mostly tags/listings.",
    f"- Canonical mismatch: {len(canonical_mismatch)} pages.",
    f"- Missing hreflang: {len(missing_hreflang)} pages.",
    "",
    "## 4. Canonical & hreflang",
    "Canonical is self-referencing for all content pages. Home page canonical lacks trailing slash. Hreflang alternates use `en`, `es`, `x-default` and are valid for pages where `hasAlternate=true`.",
    "",
    "## 5. Sitemap gaps",
    "The public sitemap is missing English content pages and tag pages:",
    md_table([{"type": k, "missing_en": v} for k, v in missing_by_prefix.most_common()], ["type", "missing_en"]),
    "",
    "## 6. Taxonomy",
    f"- {len(PAGE_TYPES[('en','tag')])} EN tags, {len(PAGE_TYPES[('es','tag')])} ES tags; {len(PAGE_TYPES[('en','topic')])} topics.",
    "- Topic schema is controlled by enum; tag values are free-form and contain spaces/duplicates.",
    "",
    "## 7. Internal link clusters",
    f"- {len(node_rows):,} nodes, {len(edge_rows):,} non-global edges.",
    f"- {len(orphan_nodes)} pages have no non-global incoming links (orphans).",
    f"- {len(bi_gaps)} bidirectional gaps weaken clusters.",
    "",
    "## Recommendations",
    "1. Slugify tags and merge near-duplicates.",
    "2. Add breadcrumbs to listing pages if not already present.",
    "3. Include every canonical page in the sitemap.",
    "4. Build a Spanish resource index for /es/ pages.",
]

(OUT / "ARCHITECTURE_REPORT.md").write_text("\n".join(arch_lines), encoding="utf-8")

# EEAT report
about_paths = [p for p in pages if p["path"] in ("/about/", "/es/about/", "/authors/", "/es/authors/", "/authors/mathias-paulenko/", "/es/authors/mathias-paulenko/")]
about_summary = f"About/author pages found: {len(about_paths)}. " + ", ".join([p["path"] for p in about_paths])

eeat_lines = [
    "# Experience, Expertise, Authoritativeness & Trust (EEAT) Report",
    "",
    f"**Audit date:** {today}.",
    "",
    "## Author identity",
    f"- Markdown author counts: {dict(author_counts)}.",
    "- `src/pages/authors/mathias-paulenko.astro` hard-codes author details and only lists English works.",
    "- Person schema `sameAs` LinkedIn uses `https://cn.linkedin.com/in/mathias-paulenko-echeverz`, which is likely incorrect and returns a 999/blocked response.",
    "",
    "## About / editorial / legal pages",
    about_summary,
    "- About page exists and describes the mission, but `datePublished` uses `lastUpdated` only.",
    "- Privacy, Terms, Cookies, Legal Notice and Affiliate Disclosure pages exist.",
    "- No dedicated editorial policy / content methodology page.",
    "",
    "## Trust signals",
    "- Cookie consent banner present with essential/analytics/advertising toggles.",
    "- ads.txt is present with pub-9762280383707953.",
    "- No visible byline date on article pages? RecipeArticle shows `lastUpdated`.",
    "",
    "## Structured data",
    f"- Schema types: {dict(schema['types'])}.",
    "- Every article gets TechArticle + BreadcrumbList + FAQPage (when applicable).",
    "- Author/Person schema is present on author pages.",
    "",
    "## Issues",
    "1. Author name inconsistent across byline, author page, and schema.",
    "2. LinkedIn sameAs URL domain is questionable.",
    "3. Spanish author page does not list Spanish works.",
    "4. No evidence of peer-review or citations on article pages.",
    "",
    "## Recommendations",
    "1. Consolidate author data into a single `authors.json`.",
    "2. Fix or remove the LinkedIn sameAs URL.",
    "3. Add `publishedAt` to frontmatter and schema.",
    "4. Add an 'Editorial process' page and link it from the footer.",
]

(OUT / "EEAT_REPORT.md").write_text("\n".join(eeat_lines), encoding="utf-8")

# Performance report
perf_lines = [
    "# Performance & Core Web Vitals Risk Report",
    "",
    f"**Build:** {DATA['summary'].get('distHtmlPages', len(pages))} pages, HTML {ba['htmlSize']/1024/1024:.1f} MB, JS {ba['jsSize']/1024:.1f} KB, CSS {ba['cssSize']/1024:.1f} KB, images {ba['imgSize']/1024:.1f} KB.",
    f"**Build time:** ~16 minutes (Astro) + 76s (Pagefind).",
    "",
    "## Asset delivery",
    "- Live headers (GitHub Pages): `Cache-Control: max-age=600` for HTML, CSS and JS.",
    "- No `Content-Encoding: gzip/br` observed in HEAD response; assets may be served uncompressed.",
    "- No long-term cache for hashed `_astro/*` bundles.",
    "",
    "## HTML bloat",
    f"- Average HTML per page: {ba['htmlSize']/len(pages)/1024:.1f} KB.",
    "- Each page inlines a full `<script is:inline>` FAQ transformer, related resources, BreadcrumbList JSON-LD, WebPage JSON-LD, and language toggle logic.",
    "- Pagefind search index is built and loaded on `/search/` only, but `/pagefind/` assets are copied to dist.",
    "",
    "## CWV risk assessment",
    "| Metric | Risk | Reason |",
    "| --- | --- | --- |",
    "| LCP | Medium | CSS and inline scripts may block rendering; large HTML for mobile. |",
    "| INP | Low | Minimal interactive JS except cookie banner and search. |",
    "| CLS | Low | Layouts use Tailwind container classes; hero + nav are predictable. |",
    "",
    "## Recommendations",
    "1. Move long cache headers to a CDN (Cloudflare/Vercel).",
    "2. Verify Brotli/gzip delivery; use a host that supports compression.",
    "3. Remove redundant inline scripts where not needed (e.g. FAQ transformer when no FAQ).",
    "4. Lazy-load below-the-fold JSON-LD or split into smaller chunks.",
    "5. Optimise build pipeline; 16m is excessive and hinders iteration.",
]

(OUT / "PERFORMANCE_REPORT.md").write_text("\n".join(perf_lines), encoding="utf-8")

# Accessibility report
a11y_lines = [
    "# Accessibility Report",
    "",
    f"**Audit scope:** {len(pages):,} rendered HTML pages.",
    "",
    "## Findings",
    f"- **Images missing alt text:** {len(missing_alt)} pages, {sum(m.get('missing',0) for m in missing_alt)} images.",
    f"- **Multiple H1:** {len(multiple_h1)} pages (heading parsing error for AT users).",
    "- **Main navigation hidden on mobile:** `hidden md:flex` with no toggle menu.",
    "- **Search/filter inputs** lack `<label>` associations; only `placeholder` is used.",
    "- **Cookie banner:** checkboxes for consent toggles are not programmatically associated with their labels.",
    "- **Focus management:** cookie manage modal is not focus-trapped and does not return focus to trigger on close.",
    "",
    "## WCAG mapping",
    "| Issue | WCAG criterion |",
    "| --- | --- |",
    "| Missing alt | 1.1.1 Non-text Content |",
    "| Missing form labels | 3.3.2 Labels or Instructions, 1.3.1 Info and Relationships |",
    "| Multiple H1 | 1.3.1 Info and Relationships |",
    "| Hidden mobile nav | 2.1.1 Keyboard, 1.3.2 Meaningful Sequence |",
    "| Checkbox labels | 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value |",
    "",
    "## Recommendations",
    "1. Add `aria-label` or visible `<label>` for every input.",
    "2. Implement a responsive disclosure navigation with `aria-expanded` and focus trap.",
    "3. Fix heading structure (one H1 per page).",
    "4. Add `for`/`id` associations or `aria-labelledby` to cookie consent checkboxes.",
    "5. Run automated scans (axe, Lighthouse, WAVE) and re-test.",
]

(OUT / "ACCESSIBILITY_REPORT.md").write_text("\n".join(a11y_lines), encoding="utf-8")

# Main forensic report
main_report = [
    "# StackPractices Website Forensic Audit",
    "",
    f"""**Site:** https://stackpractices.com  
**Domain:** stackpractices.com  
**Audit date (UTC):** {today}  
**Tooling:** Astro 5 static build, `forensic-data-generator.cjs`, `internal-linking-audit.cjs`, live HTTP headers, source-code review.""",
    "",
    "## Executive Summary",
    f"The build produces {len(pages):,} HTML pages from {len(md_files):,} Markdown files. The site is well-structured (Astro + Pagefind, two-language, schema-rich) but has a **critical sitemap coverage gap** ({len(missing_en)} missing English pages and their alternates), **canonical issues on the home page**, **mobile navigation missing**, and a high volume of **thin or template-driven tag/listing pages**. Content quality is generally good, but templated headings and AI-style qualifiers appear frequently. Internal linking is technically intact but many content files have very few body links and hundreds of bidirectional gaps.",
    "",
    "## Phase 1 — Discovery",
    md_table([
        {"metric": "dist HTML pages", "value": len(pages)},
        {"metric": "Markdown sources", "value": len(md_files)},
        {"metric": "Sitemap <loc> entries", "value": len(sitemap)},
        {"metric": "Build HTML size", "value": f"{ba['htmlSize']/1024/1024:.1f} MB"},
        {"metric": "Build JS size", "value": f"{ba['jsSize']/1024:.1f} KB"},
        {"metric": "Build CSS size", "value": f"{ba['cssSize']/1024:.1f} KB"},
        {"metric": "Astro build time", "value": "~16m"},
    ], ["metric", "value"]),
    "",
    "## Phase 2 — URL Structure",
    "- Trailing slash enforced by Astro (`trailingSlash: 'always'`).",
    "- All slugs lower-case; tag URLs contain literal spaces (e.g. `/tags/api design/`).",
    "- Spanish locale uses `/es/` prefix consistently.",
    f"- Page type distribution: {dict({(k[0]+'_'+k[1]): len(v) for k,v in PAGE_TYPES.items()})}.",
    "",
    "## Phase 3 — Crawlability",
    "- `robots.txt` allows all user-agents and references the sitemap.",
    f"- `sitemap.xml` has {len(sitemap):,} URLs but the build has {len(pages):,} pages — {len(missing_en) + len(missing_es)} pages not submitted.",
    f"- Missing English pages by type: {dict(missing_by_prefix.most_common())}.",
    "- `/404/` and `/search/` are correctly `noindex`.",
    "",
    "## Phase 4 — Indexability",
    f"- {len(thin_pages):,} pages have <200 words (mostly tags/listings).",
    f"- {len(canonical_mismatch)} canonical mismatch: {canonical_issues}.",
    f"- {len(missing_hreflang)} pages lack hreflang.",
    "",
    "## Phase 5 — Canonical Analysis",
    "Canonical tags are self-referencing except for home pages (trailing slash mismatch). Every content detail page points to its own URL with trailing slash.",
    "",
    "## Phase 6 — Hreflang",
    "- `Seo.astro` renders `en`, `es`, `x-default` alternates when `hasAlternate=true`.",
    f"- {len(missing_hreflang)} pages have no alternates, mainly `/es/tags/<tag>/` without an English equivalent and the noindex 404/search pages.",
    "",
    "## Phase 7 — Metadata",
    md_table([
        {"metric": "titleTooLong", "count": len(title_long)},
        {"metric": "descTooLong", "count": len(desc_long)},
        {"metric": "descTooShort", "count": len(desc_short)},
        {"metric": "duplicateTitles", "count": len(dup_titles)},
        {"metric": "duplicateDescs", "count": len(dup_descs)},
    ], ["metric", "count"]),
    "",
    "## Phase 8 — Headings",
    f"- {len(multiple_h1):,} pages have more than one H1 (markdown # + component title).",
    f"- Multiple H1 by page type: {dict({k: len(v) for k,v in h1_by_type.items()})}.",
    "",
    "## Phase 9 — Content Structure",
    f"- Total body words across markdown: {content['totalBodyWords']:,}.",
    f"- Code blocks: {content['totalCodeBlocks']:,}.",
    f"- AI phrase counts: {dict(ai_counts)}.",
    f"- Template heading counts: {dict(list(th.items())[:10])}.",
    "",
    "## Phase 10 — Internal Linking",
    f"- Total non-global edges: {len(edge_rows):,}; total nodes: {len(node_rows):,}.",
    f"- Orphan pages (no non-global incoming links): {len(orphan_nodes)}.",
    f"- Bidirectional gaps: {len(bi_gaps)}.",
    f"- Files needing more body links: 623.",
    "",
    "## Phase 11 — Structured Data",
    md_table([{"type": k, "count": v} for k, v in sorted(schema["types"].items(), key=lambda x: -x[1])], ["type", "count"]),
    "",
    "## Phase 12 — Performance",
    f"- HTML build size: {ba['htmlSize']/1024/1024:.1f} MB.",
    f"- JS: {ba['jsSize']/1024:.1f} KB; CSS: {ba['cssSize']/1024:.1f} KB.",
    "- Cache-Control: max-age=600 for all assets; no compression headers observed.",
    "",
    "## Phase 13 — Accessibility",
    f"- {len(missing_alt)} pages missing alt text.",
    "- Mobile nav is hidden and inaccessible.",
    "- Form inputs lack labels.",
    "- Cookie banner checkboxes lack label associations.",
    "",
    "## Phase 14 — Mobile",
    "- Responsive layout via Tailwind containers; text sizes scale.",
    "- **Primary navigation disappears below the `md` breakpoint with no mobile menu.**",
    "- Search and footer links remain reachable.",
    "",
    "## Phase 15 — Security",
    "- No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy headers.",
    "- Third-party GTM/gtag/AdSense scripts loaded without SRI.",
    "- Cookie consent banner present (essential/analytics/advertising toggles).",
    "",
    "## Phase 16 — Content Quality",
    f"- AI-style qualifiers 'overall' ({overall}) and 'vital' ({vital}) present.",
    f"- {len(thin_warn)} content files are 300-349 lines (thin-content-check warning).",
    "- Template headings are repeated across many pages.",
    "- Bilingual content is consistent, but Spanish related-resources cards display English metadata.",
    "",
    "## Phase 17 — EEAT",
    "- Author page exists but only lists English works.",
    "- Person schema sameAs LinkedIn domain is questionable.",
    "- Author name is inconsistent between byline and schema.",
    "- No dedicated editorial methodology page.",
    "",
    "## Phase 18 — Information Architecture",
    f"- {len(PAGE_TYPES[('en','topic')])} topics (controlled) and {len(PAGE_TYPES[('en','tag')])} EN / {len(PAGE_TYPES[('es','tag')])} ES tags (free-form).",
    "- Tag values contain spaces and likely duplicates/typos.",
    "- Internal link clusters are weak due to one-way links and orphaned low-resource tags.",
    "",
    "## Phase 19 — Prioritised Issue Register",
    md_table(TECHNICAL_ISSUES + CONTENT_ISSUES, ["issue_id", "title", "severity", "priority", "category"]),
    "",
    "## Phase 20 — Root Cause Summary",
    "The largest issues stem from **three root causes**:",
    "1. **Sitemap generator** is not aware of all canonical pages and does not emit per-language `<loc>` entries.",
    "2. **Template reuse** produces duplicate metadata, multiple H1s and thin tag/listing pages.",
    "3. **Mobile & accessibility patterns** in the header and cookie banner were not implemented for small viewports or assistive technology.",
    "",
    "## Final Verdict",
    "The site is technically sound at the static-build level, but several SEO-critical surfaces (sitemap, canonical home, mobile navigation, metadata duplication) need immediate attention before it can compete for high-intent technical keywords. Content is the biggest asset; protecting and expanding it through better taxonomy, internal linking and EEAT signals will drive the strongest gains.",
    "",
    "## Appendices",
    "- All data: `ref/audit-data.json`, `ref/internal-linking-data.json`",
    "- Thin content report: `ref/thin-content-report.txt`",
    "- Output files: `ref/forensic-audit/`",
]

(OUT / "WEBSITE_FORENSIC_REPORT.md").write_text("\n".join(main_report), encoding="utf-8")

print(f"Generated {len(list(OUT.glob('*')))} forensic audit files in {OUT}")
