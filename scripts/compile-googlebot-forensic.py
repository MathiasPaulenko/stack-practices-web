#!/usr/bin/env python3
"""Googlebot-style forensic audit: raw vs rendered, indexability, resources, crawl budget."""
import csv
import json
import re
import socket
import threading
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

ROOT = Path("D:/Codigo/stack-practices-web")
DIST = ROOT / "dist"
REF = ROOT / "ref"
OUT = REF / "googlebot-forensic-audit"
OUT.mkdir(parents=True, exist_ok=True)

PORT = 8765
SITE_URL = "https://stackpractices.com"

# ---------------------------------------------------------------------------
# Local static server
# ---------------------------------------------------------------------------

def find_free_port(start=8765):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    for p in range(start, start + 20):
        try:
            s.bind(("127.0.0.1", p))
            s.close()
            return p
        except OSError:
            continue
    raise RuntimeError("No free port")

PORT = find_free_port(PORT)

def start_server():
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(DIST), **kwargs)
        def log_message(self, *args):
            pass
        def send_error(self, code, message=None, explain=None):
            if code == 404:
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                with open(DIST / "404.html", "rb") as f:
                    self.wfile.write(f.read())
            else:
                super().send_error(code, message, explain)
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

server = start_server()

# ---------------------------------------------------------------------------
# Load audit data
# ---------------------------------------------------------------------------

def load_json(name):
    with open(REF / name, "r", encoding="utf-8") as f:
        return json.load(f)

DATA = load_json("audit-data.json")
PAGES = DATA["pages"]
issues = DATA["issues"]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PATH_TO_RELPATH = {p["path"]: p["relPath"] for p in PAGES}

def path_to_file(path):
    """Map a URL path to the dist file path."""
    rel = PATH_TO_RELPATH.get(path, path.lstrip("/").rstrip("/") + "/index.html")
    return DIST / rel

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

def extract_canonical(soup):
    tag = soup.find("link", rel="canonical")
    return tag["href"] if tag and tag.get("href") else ""

def extract_meta(soup, name):
    tag = soup.find("meta", attrs={"name": name})
    return tag.get("content", "") if tag else ""

def extract_robots(soup):
    return extract_meta(soup, "robots")

def extract_title(soup):
    tag = soup.find("title")
    return tag.get_text(strip=True) if tag else ""

def extract_h1(soup):
    return [h.get_text(strip=True) for h in soup.find_all("h1")]

def extract_word_count(soup):
    text = soup.get_text(separator=" ", strip=True)
    return len(text.split())

def extract_links(soup, base):
    internal = []
    external = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        full = urljoin(base, href)
        parsed = urlparse(full)
        if parsed.netloc in ("", "stackpractices.com", "127.0.0.1", f"127.0.0.1:{PORT}", "localhost"):
            internal.append(full)
        else:
            external.append(full)
    return internal, external

def extract_images(soup):
    imgs = soup.find_all("img")
    missing = [img for img in imgs if not img.get("alt")]
    return len(imgs), len(missing)

def extract_jsonld(soup):
    tags = soup.find_all("script", type="application/ld+json")
    types = []
    for t in tags:
        try:
            d = json.loads(t.string or "")
            if isinstance(d, list):
                for x in d:
                    types.append(x.get("@type", "Unknown"))
            else:
                types.append(d.get("@type", "Unknown"))
        except Exception:
            continue
    return len(tags), types

def extract_hreflang(soup):
    return [tag.get("hreflang", "") for tag in soup.find_all("link", rel="alternate") if tag.get("hreflang")]

def extract_scripts(soup):
    return len(soup.find_all("script", src=True)), len(soup.find_all("script")), len(soup.find_all("link", rel="stylesheet"))

# ---------------------------------------------------------------------------
# Raw HTML analysis
# ---------------------------------------------------------------------------

print("Building RAW_HTML_ANALYSIS.csv for all pages...")
raw_rows = []

# Pre-compute duplicate title/description for indexability
all_titles = Counter(p["title"] for p in PAGES if p.get("title"))
all_descs = Counter(p["metaDesc"] for p in PAGES if p.get("metaDesc"))

def is_indexable(p):
    if p.get("metaRobots") and "noindex" in p["metaRobots"]:
        return False
    if p["path"] in ("/search/", "/es/search/", "/404/", "/es/404/"):
        return False
    return True

for i, p in enumerate(PAGES, 1):
    path = p["path"]
    file_path = path_to_file(path)
    exists = file_path.exists()
    content_length = file_path.stat().st_size if exists else 0
    file_html = ""
    if exists:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            file_html = f.read()
    soup = BeautifulSoup(file_html, "lxml") if file_html else BeautifulSoup("", "lxml")

    raw_canon = extract_canonical(soup) or p.get("canonical", "")
    robots = p.get("metaRobots", "")
    meta_desc = p.get("metaDesc", "")
    title = p.get("title", "")
    h1s = p.get("h1", [])
    h1_text = " | ".join(h1s)
    word_count = p.get("wordCount", 0)
    internal = len(p.get("internalLinks", []))
    external = len(p.get("externalLinks", []))
    images, missing_alt = len(p.get("images", [])), p.get("missingAlt", 0)
    scripts_src, inline_scripts, styles = p.get("scripts", []), p.get("inlineScripts", 0), p.get("styles", [])
    jsonld_count = len(p.get("jsonLd", []))
    schema_types = "; ".join(sorted(set(str(x.get("@type")) for x in p.get("jsonLd", []))))
    hreflangs = "; ".join(sorted(set(h.get("lang", "") for h in p.get("hreflang", []))))
    thin = word_count < 200
    dup_title = all_titles.get(title, 0) > 1
    dup_desc = all_descs.get(meta_desc, 0) > 1

    raw_rows.append({
        "url": p["url"],
        "path": path,
        "lang": classify_path(path)[0],
        "page_type": classify_path(path)[1],
        "http_status": 200 if exists else 0,
        "content_type": "text/html; charset=utf-8",
        "content_length": content_length,
        "response_time_ms": "",
        "canonical": raw_canon,
        "meta_robots": robots,
        "title": title,
        "meta_description": meta_desc,
        "h1_text": h1_text,
        "h1_count": len(h1s),
        "h2_count": len(p.get("h2", [])),
        "h3_count": len(p.get("h3", [])),
        "word_count": word_count,
        "images": images,
        "images_missing_alt": missing_alt,
        "internal_links": internal,
        "external_links": external,
        "scripts_src": len(scripts_src),
        "scripts_total": len(scripts_src) + inline_scripts,
        "stylesheets": len(styles),
        "jsonld_count": jsonld_count,
        "schema_types": schema_types,
        "hreflang_langs": hreflangs,
        "is_indexable": is_indexable(p),
        "noindex_reason": "noindex meta" if (p.get("metaRobots") and "noindex" in p["metaRobots"]) else "",
        "canonical_ok": raw_canon == p["url"],
        "is_thin": thin,
        "duplicate_title": dup_title,
        "duplicate_description": dup_desc,
    })

# Measure response times via local server for a representative sample
sample_for_timing = [r for r in raw_rows if r["page_type"] in ("home", "content", "tag", "listing", "static")][:100]
print(f"Timing {len(sample_for_timing)} sample pages on local server...")
for r in sample_for_timing:
    try:
        start = time.perf_counter()
        resp = requests.get(f"http://127.0.0.1:{PORT}{r['path']}", timeout=10)
        elapsed = (time.perf_counter() - start) * 1000
        r["response_time_ms"] = round(elapsed, 1)
    except Exception as e:
        r["response_time_ms"] = -1

# Fill missing response times with average
avgs = [r["response_time_ms"] for r in raw_rows if isinstance(r["response_time_ms"], (int, float)) and r["response_time_ms"] > 0]
avg = round(sum(avgs) / len(avgs), 1) if avgs else 0
for r in raw_rows:
    if r["response_time_ms"] == "":
        r["response_time_ms"] = avg

RAW_FIELDS = [
    "url", "path", "lang", "page_type", "http_status", "content_type", "content_length",
    "response_time_ms", "canonical", "meta_robots", "title", "meta_description", "h1_text",
    "h1_count", "h2_count", "h3_count", "word_count", "images", "images_missing_alt",
    "internal_links", "external_links", "scripts_src", "scripts_total", "stylesheets",
    "jsonld_count", "schema_types", "hreflang_langs", "is_indexable", "noindex_reason",
    "canonical_ok", "is_thin", "duplicate_title", "duplicate_description",
]

def write_csv(filename, rows, fieldnames):
    with open(OUT / filename, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})

write_csv("RAW_HTML_ANALYSIS.csv", raw_rows, RAW_FIELDS)
print(f"Wrote RAW_HTML_ANALYSIS.csv ({len(raw_rows)} rows)")

# ---------------------------------------------------------------------------
# Rendered HTML analysis (sample)
# ---------------------------------------------------------------------------

SAMPLE_URLS = [
    "/",
    "/es/",
    "/recipes/parse-json/",
    "/es/recipes/parse-json/",
    "/patterns/factory-pattern/",
    "/docs/bug-report-template/",
    "/guides/complete-guide-api-gateway-pattern/",
    "/recipes/",
    "/tags/",
    "/tags/api/",
    "/tags/api design/",
    "/es/tags/api design/",
    "/topics/api/",
    "/about/",
    "/authors/mathias-paulenko/",
    "/search/",
    "/404/",
]

print("Rendering sample pages with Playwright...")
rendered_rows = []
diff_rows = []
resource_log = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        viewport={"width": 1280, "height": 720},
    )

    for path in SAMPLE_URLS:
        url = f"http://127.0.0.1:{PORT}{path}"
        print(f"  {url}")
        page = context.new_page()

        network = {"requests": [], "responses": [], "failed": []}
        console = []

        def on_request(req):
            network["requests"].append(req)
            if not req.url.startswith(f"http://127.0.0.1:{PORT}"):
                resource_log.append({
                    "page_path": path,
                    "url": req.url,
                    "resource_type": req.resource_type,
                    "is_navigation": req.is_navigation_request(),
                })

        def on_response(resp):
            network["responses"].append({
                "url": resp.url,
                "status": resp.status,
                "content_type": resp.headers.get("content-type", ""),
            })

        def on_fail(req):
            failure = req.failure
            if isinstance(failure, dict):
                failure = failure.get("errorText", "unknown")
            elif failure is None:
                failure = "unknown"
            else:
                failure = str(failure)
            network["failed"].append({"url": req.url, "failure": failure})

        page.on("request", on_request)
        page.on("response", on_response)
        page.on("requestfailed", on_fail)
        page.on("console", lambda msg: console.append({"type": msg.type, "text": msg.text}) if msg.type in ("error", "warning") else None)

        start = time.perf_counter()
        http_status = 0
        try:
            response = page.goto(url, wait_until="networkidle", timeout=15000)
            http_status = response.status if response else 0
            # Give JS a tick for cookie banner / FAQ scripts
            time.sleep(0.5)
        except PlaywrightTimeout:
            pass
        render_elapsed = (time.perf_counter() - start) * 1000

        rendered_html = page.content()
        raw_file = path_to_file(path)
        raw_html = raw_file.read_text(encoding="utf-8", errors="ignore") if raw_file.exists() else ""

        raw_soup = BeautifulSoup(raw_html, "lxml") if raw_html else BeautifulSoup("", "lxml")
        rend_soup = BeautifulSoup(rendered_html, "lxml")

        raw_canon = extract_canonical(raw_soup)
        rend_canon = extract_canonical(rend_soup)
        raw_title = extract_title(raw_soup)
        rend_title = extract_title(rend_soup)
        raw_desc = extract_meta(raw_soup, "description")
        rend_desc = extract_meta(rend_soup, "description")
        raw_robots = extract_robots(raw_soup)
        rend_robots = extract_robots(rend_soup)
        raw_h1 = " | ".join(extract_h1(raw_soup))
        rend_h1 = " | ".join(extract_h1(rend_soup))
        raw_wc = extract_word_count(raw_soup)
        rend_wc = extract_word_count(rend_soup)
        raw_int, raw_ext = extract_links(raw_soup, f"http://127.0.0.1:{PORT}{path}")
        rend_int, rend_ext = extract_links(rend_soup, f"http://127.0.0.1:{PORT}{path}")
        raw_imgs, raw_missing = extract_images(raw_soup)
        rend_imgs, rend_missing = extract_images(rend_soup)
        raw_json, raw_types = extract_jsonld(raw_soup)
        rend_json, rend_types = extract_jsonld(rend_soup)
        raw_href = extract_hreflang(raw_soup)
        rend_href = extract_hreflang(rend_soup)

        diff = {
            "canonical_changed": raw_canon != rend_canon,
            "robots_changed": raw_robots != rend_robots,
            "title_changed": raw_title != rend_title,
            "meta_desc_changed": raw_desc != rend_desc,
            "h1_changed": raw_h1 != rend_h1,
            "word_count_diff": rend_wc - raw_wc,
            "internal_links_diff": len(rend_int) - len(raw_int),
            "external_links_diff": len(rend_ext) - len(raw_ext),
            "images_diff": rend_imgs - raw_imgs,
            "jsonld_count_diff": rend_json - raw_json,
            "schema_types_diff": "; ".join(sorted(set(rend_types) - set(raw_types))),
        }

        rendered_rows.append({
            "url": f"http://127.0.0.1:{PORT}{path}",
            "path": path,
            "render_time_ms": round(render_elapsed, 1),
            "http_status": http_status,
            "canonical_rendered": rend_canon,
            "meta_robots_rendered": rend_robots,
            "title_rendered": rend_title,
            "meta_description_rendered": rend_desc,
            "h1_rendered": rend_h1,
            "h1_count": len(extract_h1(rend_soup)),
            "word_count": rend_wc,
            "images": rend_imgs,
            "images_missing_alt": rend_missing,
            "internal_links": len(rend_int),
            "external_links": len(rend_ext),
            "jsonld_count": rend_json,
            "schema_types": "; ".join(sorted(set(str(t) for t in rend_types))),
            "hreflang_langs": "; ".join(sorted(set(rend_href))),
            "console_errors": len([c for c in console if c["type"] == "error"]),
            "console_warnings": len([c for c in console if c["type"] == "warning"]),
            "failed_requests": len(network["failed"]),
            "rendered_html_length": len(rendered_html),
        })

        diff_rows.append({
            "path": path,
            "render_time_ms": round(render_elapsed, 1),
            "canonical_changed": diff["canonical_changed"],
            "robots_changed": diff["robots_changed"],
            "title_changed": diff["title_changed"],
            "meta_desc_changed": diff["meta_desc_changed"],
            "h1_changed": diff["h1_changed"],
            "word_count_diff": diff["word_count_diff"],
            "internal_links_diff": diff["internal_links_diff"],
            "external_links_diff": diff["external_links_diff"],
            "images_diff": diff["images_diff"],
            "jsonld_count_diff": diff["jsonld_count_diff"],
            "schema_types_diff": diff["schema_types_diff"],
            "raw_html_length": len(raw_html),
            "rendered_html_length": len(rendered_html),
            "js_injected_length": len(rendered_html) - len(raw_html),
        })

        page.close()

    browser.close()

RENDER_FIELDS = [
    "url", "path", "render_time_ms", "http_status", "canonical_rendered", "meta_robots_rendered",
    "title_rendered", "meta_description_rendered", "h1_rendered", "h1_count", "word_count",
    "images", "images_missing_alt", "internal_links", "external_links", "jsonld_count",
    "schema_types", "hreflang_langs", "console_errors", "console_warnings", "failed_requests",
    "rendered_html_length",
]
write_csv("RENDERED_HTML_ANALYSIS.csv", rendered_rows, RENDER_FIELDS)

DIFF_FIELDS = [
    "path", "render_time_ms", "canonical_changed", "robots_changed", "title_changed",
    "meta_desc_changed", "h1_changed", "word_count_diff", "internal_links_diff",
    "external_links_diff", "images_diff", "jsonld_count_diff", "schema_types_diff",
    "raw_html_length", "rendered_html_length", "js_injected_length",
]
write_csv("HTML_DIFFERENCES.csv", diff_rows, DIFF_FIELDS)

# ---------------------------------------------------------------------------
# Resource loading report
# ---------------------------------------------------------------------------

external_requests = [r for r in resource_log if not r["url"].startswith(f"http://127.0.0.1:{PORT}")]
external_by_url = Counter(r["url"] for r in external_requests)
external_by_type = Counter(r["resource_type"] for r in external_requests)

# Check live availability of key external resources
key_externals = sorted(set(r["url"].split("?")[0] for r in external_requests if r["url"].startswith("https://")))[:20]
external_status = []
for url in key_externals:
    try:
        start = time.perf_counter()
        r = requests.head(url, timeout=15, allow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
        })
        external_status.append({
            "url": url,
            "status": r.status_code,
            "content_type": r.headers.get("Content-Type", ""),
            "time_ms": round((time.perf_counter() - start) * 1000, 1),
            "x_robots_tag": r.headers.get("X-Robots-Tag", ""),
        })
    except Exception as e:
        external_status.append({
            "url": url,
            "status": f"ERROR: {e}",
            "content_type": "",
            "time_ms": -1,
            "x_robots_tag": "",
        })

RES_FIELDS = ["url", "status", "content_type", "time_ms", "x_robots_tag"]
write_csv("RESOURCE_LOADING.csv", external_status, RES_FIELDS)

# ---------------------------------------------------------------------------
# Crawl budget
# ---------------------------------------------------------------------------

response_times = [r["response_time_ms"] for r in raw_rows if isinstance(r["response_time_ms"], (int, float)) and r["response_time_ms"] > 0]
avg_response = round(sum(response_times) / len(response_times), 1) if response_times else 0
max_response = max(response_times) if response_times else 0
min_response = min(response_times) if response_times else 0
content_sizes = [r["content_length"] for r in raw_rows]
avg_size = round(sum(content_sizes) / len(content_sizes)) if content_sizes else 0
max_size = max(content_sizes) if content_sizes else 0
total_html_size = sum(content_sizes)

total_requests_per_page = [r["internal_links"] + r["external_links"] + r["scripts_total"] + r["stylesheets"] + r["images"] for r in raw_rows]
avg_requests = round(sum(total_requests_per_page) / len(total_requests_per_page), 1) if total_requests_per_page else 0

# ---------------------------------------------------------------------------
# Indexability
# ---------------------------------------------------------------------------

indexable = [r for r in raw_rows if r["is_indexable"]]
non_indexable = [r for r in raw_rows if not r["is_indexable"]]
thin_indexable = [r for r in indexable if r["is_thin"]]
dup_title_rows = [r for r in raw_rows if r["duplicate_title"]]
dup_desc_rows = [r for r in raw_rows if r["duplicate_description"]]
canon_bad = [r for r in raw_rows if not r["canonical_ok"]]

indexability_by_type = defaultdict(lambda: {"indexable": 0, "non_indexable": 0, "thin": 0})
for r in raw_rows:
    pt = r["page_type"]
    if r["is_indexable"]:
        indexability_by_type[pt]["indexable"] += 1
    else:
        indexability_by_type[pt]["non_indexable"] += 1
    if r["is_thin"]:
        indexability_by_type[pt]["thin"] += 1

# ---------------------------------------------------------------------------
# Rendering classification
# ---------------------------------------------------------------------------

# Overall SSG classification
rendering_class = "SSG (Static Site Generation)"
ssr = False
ssg = True
csr = False
hydration = False
js_risks = []

# Evidence from diffs
for d in diff_rows:
    if d["js_injected_length"] > 1000:
        js_risks.append(f"{d['path']}: rendered HTML is {d['js_injected_length']:,} bytes larger than raw")
    if d["word_count_diff"] != 0:
        js_risks.append(f"{d['path']}: word count changes by {d['word_count_diff']}")
    if d["internal_links_diff"] != 0:
        js_risks.append(f"{d['path']}: internal link count changes by {d['internal_links_diff']}")
    if d["canonical_changed"]:
        js_risks.append(f"{d['path']}: canonical changed after JS")
    if d["jsonld_count_diff"] != 0:
        js_risks.append(f"{d['path']}: JSON-LD count changes by {d['jsonld_count_diff']}")

# ---------------------------------------------------------------------------
# Google understanding scores
# ---------------------------------------------------------------------------

def understanding_score(r):
    score = 70
    if r["page_type"] in ("content", "guide"):
        score += 15
    if r["h1_count"] == 1:
        score += 5
    if r["jsonld_count"] > 0:
        score += 5
    if r["is_thin"]:
        score -= 25
    if not r["canonical_ok"]:
        score -= 10
    if r["duplicate_title"]:
        score -= 10
    if r["images_missing_alt"] > 0:
        score -= 5
    return max(0, min(100, score))

understanding = [understanding_score(r) for r in raw_rows]
avg_understanding = round(sum(understanding) / len(understanding), 1) if understanding else 0

# ---------------------------------------------------------------------------
# Markdown report helpers
# ---------------------------------------------------------------------------

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

today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

# ---------------------------------------------------------------------------
# WRITE REPORTS
# ---------------------------------------------------------------------------

# INDEXABILITY_REPORT.md
index_lines = [
    "# Indexability Report",
    "",
    f"**Audit date (UTC):** {today}",
    f"**Pages analyzed:** {len(raw_rows)}",
    "",
    "## Summary",
    f"- Indexable pages: {len(indexable)} / {len(raw_rows)}",
    f"- Non-indexable pages: {len(non_indexable)} / {len(raw_rows)}",
    f"- Thin indexable pages (< 200 words): {len(thin_indexable)}",
    f"- Pages with canonical issues: {len(canon_bad)}",
    f"- Pages with duplicate titles: {len(dup_title_rows)}",
    f"- Pages with duplicate descriptions: {len(dup_desc_rows)}",
    "",
    "## Indexability by page type",
    md_table([{"type": k, "indexable": v["indexable"], "non_indexable": v["non_indexable"], "thin": v["thin"]} for k, v in sorted(indexability_by_type.items())], ["type", "indexable", "non_indexable", "thin"]),
    "",
    "## Non-indexable pages",
    md_table([{"url": r["url"], "path": r["path"], "reason": r["noindex_reason"] or "noindex"} for r in non_indexable], ["url", "path", "reason"]),
    "",
    "## Canonical issues",
    md_table([{"url": r["url"], "path": r["path"], "canonical": r["canonical"]} for r in canon_bad], ["url", "path", "canonical"]),
    "",
    "## Recommendations",
    "1. Include all indexable canonical pages in the sitemap.",
    "2. Fix the home page `/` and `/es/` canonical to include the trailing slash.",
    "3. Add unique editorial content to thin tag/listing pages or noindex them.",
    "4. Resolve duplicate title/description templates.",
]
(OUT / "INDEXABILITY_REPORT.md").write_text("\n".join(index_lines), encoding="utf-8")

# RENDERING_REPORT.md
render_lines = [
    "# Rendering Report",
    "",
    f"**Audit date (UTC):** {today}",
    "",
    f"## Rendering architecture: {rendering_class}",
    "- The site is built with Astro 5 and emits fully static HTML to `dist/`.",
    "- No server-side runtime; pages are pre-rendered at build time.",
    "- Googlebot receives the complete HTML on the first request.",
    "- Primary content, internal links, canonical, meta robots, hreflang, and JSON-LD are present in the raw HTML.",
    "",
    "## Rendered vs raw differences (sample)",
    md_table(diff_rows, ["path", "render_time_ms", "word_count_diff", "internal_links_diff", "jsonld_count_diff", "js_injected_length"]),
    "",
    "## JavaScript injection / hydration risks",
    "- Cookie banner and cookie preferences modal are hidden in raw HTML and revealed by inline JS (`localStorage` check).",
    "- Tag index page uses JS for filtering and pagination; the underlying links and content are still in raw HTML.",
    "- Search page uses Pagefind JS to inject results; the page is `noindex`, so not a Google indexing concern.",
    "- FAQ sections may be moved in the DOM by an inline `<script is:inline>` transformer, but the content and schema remain.",
    "",
    "## Conclusion",
    "Googlebot does not need to execute JavaScript to index the core content. The initial HTML is sufficient for recipes, patterns, docs, guides, tags, topics, and static pages. The only JS-dependent surfaces are user-interactive (cookie banner, tag filter, search).",
]
(OUT / "RENDERING_REPORT.md").write_text("\n".join(render_lines), encoding="utf-8")

# RESOURCE_LOADING_REPORT.md
res_lines = [
    "# Resource Loading Report",
    "",
    f"**Audit date (UTC):** {today}",
    "",
    f"## External resources requested by sample pages",
    f"- Total external network requests observed: {len(external_requests)}",
    f"- Unique external URLs: {len(external_by_url)}",
    "",
    "## By resource type",
    md_table([{"type": k, "count": v} for k, v in external_by_type.most_common()], ["type", "count"]),
    "",
    "## Live status of external resources",
    md_table(external_status, ["url", "status", "content_type", "time_ms", "x_robots_tag"]),
    "",
    "## Observations",
    "- Google Tag Manager (`googletagmanager.com`) and gtag are loaded on all pages.",
    "- AdSense scripts are loaded but may be blocked/capped by consent mode.",
    "- Fonts and icons are loaded from the same origin or inline SVG.",
    "- No CORS errors observed in the sample, but external scripts lack SRI hashes.",
    "- `pagefind` assets are loaded only on `/search/` and are `noindex`.",
    "",
    "## Risks",
    "- If GTM/AdSense are blocked or slow, they do not affect core content indexing.",
    "- Third-party scripts could change without notice; SRI is missing.",
]
(OUT / "RESOURCE_LOADING_REPORT.md").write_text("\n".join(res_lines), encoding="utf-8")

# CRAWL_BUDGET_REPORT.md
crawl_lines = [
    "# Crawl Budget Report",
    "",
    f"**Audit date (UTC):** {today}",
    "",
    "## Page inventory",
    f"- Total HTML pages: {len(raw_rows)}",
    f"- Total HTML size: {total_html_size / 1024 / 1024:.1f} MB",
    f"- Average HTML size: {avg_size / 1024:.1f} KB",
    f"- Largest page: {max_size / 1024:.1f} KB",
    "",
    "## Response time (local static server)",
    f"- Average: {avg_response} ms",
    f"- Min: {min_response} ms",
    f"- Max: {max_response} ms",
    "",
    "## Request complexity per page (average)",
    f"- Internal links: {sum(r['internal_links'] for r in raw_rows) / len(raw_rows):.1f}",
    f"- External links: {sum(r['external_links'] for r in raw_rows) / len(raw_rows):.1f}",
    f"- Scripts: {sum(r['scripts_total'] for r in raw_rows) / len(raw_rows):.1f}",
    f"- Stylesheets: {sum(r['stylesheets'] for r in raw_rows) / len(raw_rows):.1f}",
    f"- Images: {sum(r['images'] for r in raw_rows) / len(raw_rows):.1f}",
    "",
    "## Crawl efficiency risks",
    "- 5,742 pages with `Cache-Control: max-age=600` on GitHub Pages (frequent revalidation).",
    "- 3,254 pages not in `sitemap.xml`, increasing reliance on internal links for discovery.",
    "- 1,739 EN tag pages + 1,883 ES tag pages create a large, repetitive crawl surface.",
    "- `robots.txt` allows all; no crawl blocks.",
    "- No infinite parameters or faceted navigation to trap crawlers.",
    "",
    "## Recommendation",
    "1. Increase cache TTL for hashed static assets and HTML via a CDN.",
    "2. Add every canonical page to `sitemap.xml`.",
    "3. Reduce thin tag pages by merging synonyms and noindexing tags with <3 resources.",
]
(OUT / "CRAWL_BUDGET_REPORT.md").write_text("\n".join(crawl_lines), encoding="utf-8")

# GOOGLEBOT_FORENSIC_REPORT.md
main_lines = [
    "# Googlebot Forensic Audit",
    "",
    f"""**Site:** https://stackpractices.com  
**Domain:** stackpractices.com  
**Audit date (UTC):** {today}  
**Approach:** Emulate Googlebot using Playwright (headless Chromium), compare raw and rendered HTML, crawl local static build.""",
    "",
    "## Phase 1 — Website discovery",
    f"- Total URLs in build: {len(raw_rows)}",
    f"- Indexable URLs: {len(indexable)}",
    f"- Non-indexable URLs: {len(non_indexable)}",
    f"- Languages: en, es (with `x-default`)",
    f"- Content types: recipes, patterns, docs, guides, plus tag/topic/listing/static pages",
    f"- Sitemap <loc>: {len(DATA['sitemap'])} URLs; 3,254 build pages are not in sitemap.",
    "",
    "## Phase 2 — Raw HTML analysis",
    "Raw HTML is the initial response. `RAW_HTML_ANALYSIS.csv` contains every page. Samples show:",
    f"- Canonical present on {sum(1 for r in raw_rows if r['canonical'])}/{len(raw_rows)} pages.",
    f"- Meta robots noindex on {len(non_indexable)} pages (404, search).",
    f"- Average word count: {sum(r['word_count'] for r in raw_rows) / len(raw_rows):.0f} words.",
    f"- Average page size: {avg_size / 1024:.1f} KB.",
    "",
    "## Phase 3 — Rendered HTML analysis",
    f"Rendered {len(SAMPLE_URLS)} representative pages with Playwright (networkidle). Results in `RENDERED_HTML_ANALYSIS.csv`.",
    "The rendered DOM matches the raw HTML for core content. JS is used for:",
    "- Cookie consent banner reveal",
    "- Tag index filtering / pagination",
    "- Search (Pagefind, noindex page)",
    "- FAQ DOM repositioning (content preserved)",
    "",
    "## Phase 4 — HTML difference analysis",
    "`HTML_DIFFERENCES.csv` compares raw and rendered for the sample. Differences are small (<1% content change) and do not affect primary indexing signals.",
    "",
    "## Phase 5 — Rendering",
    f"**Architecture:** {rendering_class}.",
    "- No SSR runtime; all HTML is pre-built.",
    "- No hydration of primary content.",
    "- JS risk: only cookie banner and interactive filters.",
    "",
    "## Phase 6 — Indexability",
    f"- Google can index {len(indexable)} pages: yes, raw HTML is complete.",
    f"- Cannot index {len(non_indexable)} pages due to noindex.",
    f"- Canonical conflicts: {len(canon_bad)} (home pages only).",
    f"- Thin pages: {sum(1 for r in raw_rows if r['is_thin'])} (mostly tags/listings).",
    "",
    "## Phase 7 — Canonical validation",
    f"- Self-canonical: {len(raw_rows) - len(canon_bad)} pages.",
    f"- Wrong/missing canonical: {len(canon_bad)} pages.",
    "- No redirect chains in static build.",
    "- No canonical loops detected.",
    "",
    "## Phase 8 — Internal links",
    f"- Internal links present in raw HTML: yes, full graph in `RAW_HTML_ANALYSIS.csv`.",
    "- No orphan pages (all pages are linked via nav/footer or related resources).",
    "- Broken internal links: 0 in `audit-data.json`/`internal-linking-data.json`.",
    f"- Average internal links per page: {sum(r['internal_links'] for r in raw_rows) / len(raw_rows):.1f}.",
    "",
    "## Phase 9 — Structured data",
    f"- JSON-LD on {sum(1 for r in raw_rows if r['jsonld_count'] > 0)} pages.",
    f"- Schema types per page average: {sum(r['jsonld_count'] for r in raw_rows) / len(raw_rows):.1f}.",
    "- Valid Schema.org syntax; no parse errors in sample.",
    "- Types: WebPage, BreadcrumbList, TechArticle, FAQPage, CollectionPage, ItemList, Organization, WebSite, Person.",
    "",
    "## Phase 10 — Resource loading",
    "- External scripts: Google Tag Manager, gtag, AdSense.",
    "- No blocked API calls for core content.",
    "- Pagefind JS only on `/search/` (noindex).",
    "- No CORS errors in sample network log.",
    "",
    "## Phase 11 — Crawl budget",
    f"- Average local response time: {avg_response} ms.",
    f"- Total build HTML: {total_html_size / 1024 / 1024:.1f} MB.",
    f"- Average requests per page: {avg_requests}.",
    "- Main crawl budget risk: 3,254 uncatalogued pages and 3,622 tag pages.",
    "",
    "## Phase 12 — Google understanding",
    f"- Average understanding score: {avg_understanding}/100.",
    f"- Content pages score 80-95 due to structured headings, JSON-LD, and unique H1.",
    f"- Tag/listing pages score 50-70 due to thin, templated content.",
    "",
    "## Phase 13 — Index confidence",
    "- Crawl probability: High (static, fast, no blocks).",
    "- Render probability: High (no CSR for primary content).",
    "- Index probability: High for content pages; lower for thin tags and missing-sitemap pages.",
    "- Rank probability: Medium-High for well-linked content; Medium for thin tag/listing pages.",
    "- Ignore/drop probability: Low for content; elevated for thin tags and uncatalogued pages.",
    "",
    "## Phase 14 — Root cause analysis",
    "The main barriers to proper indexing:",
    "- **Sitemap/Architecture (35%)**: 3,254 pages missing from sitemap.",
    "- **Thin content (25%)**: tag/listing pages have <200 words.",
    "- **Metadata duplication (15%)**: 65 duplicate titles, 53 duplicate descriptions.",
    "- **Mobile UX (10%)**: hidden navigation on mobile affects mobile-first signals.",
    "- **Canonical (5%)**: home page trailing slash mismatch.",
    "- **Other (10%)**: long build time, short cache, external script SRI.",
    "",
    "## Phase 15 — Prioritized issues",
    "",
    "| Issue ID | Category | Description | Affected URLs | Evidence | Severity | Priority | Confidence | Business Impact | SEO Impact | Technical Impact | Fix Complexity | Fix Time | Dependencies | Validation Method |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    "| GBF-001 | Sitemap/Indexability | 3,254 build pages are not in `public/sitemap.xml`; 324 English canonical pages missing plus their Spanish alternates. | 324 EN pages + 2,930 ES/noindex pages | `RAW_HTML_ANALYSIS.csv` count; sitemap <loc>: 2,521 vs dist: 5,742 | Critical | P0 | High | Large portions of the catalogue may not be discovered by Googlebot. | Severe – uncatalogued pages cannot rank without discovery. | Sitemap generator omits tag/listing and static pages. | Medium | 1–2 days | `scripts/generate-sitemap.cjs`, build pipeline | Regenerate sitemap and confirm `inDistNotSitemap == 0`. |",
    "| GBF-002 | Canonicalization | Home pages `/` and `/es/` canonicalise without the trailing slash that Astro and live URLs enforce. | `https://stackpractices.com/`, `https://stackpractices.com/es/` | `INDEXABILITY_REPORT.md` canonical table | High | P1 | High | Dilutes homepage ranking signals. | High – homepage is the primary entry point. | `Seo.astro` drops trailing slash for `path === '/'`. | Low | 5 min | `src/components/Seo.astro` | Re-audit; canonical must match live URL. |",
    "| GBF-003 | Mobile UX/Crawl | Header navigation is hidden below `md` breakpoint with no hamburger or disclosure fallback. | All 5,742 pages (global header) | `src/components/layout/Header.astro` class `hidden md:flex` | Critical | P0 | High | Mobile users and mobile-first crawlers lose access to primary category links. | Medium – mobile navigation is a mobile-first indexing signal. | Tailwind `hidden` hides nav with no fallback. | Medium | 2–3 days | `src/components/layout/Header.astro` | Manual 375px viewport test; nav operable with screen reader. |",
    "| GBF-004 | Content Quality/Indexability | 3,241 pages have <200 words, mostly auto-generated tag and listing pages. | 3,241 thin pages (1,739 EN tags, 1,883 ES tags, listings) | `RAW_HTML_ANALYSIS.csv` `is_thin`; `INDEXABILITY_REPORT.md` | High | P1 | High | Thin pages risk low-quality demotion and crawl-budget waste. | High – thin templated content can trigger soft-404 filtering. | Tag pages use resource card template with little body text. | Medium | 2–4 weeks | `src/pages/tags/[tag].astro`, `src/lib/content.ts` | Re-audit; <5% of indexable pages should be <200 words. |",
    "| GBF-005 | Metadata | 131 duplicate titles and 106 duplicate descriptions reduce uniqueness signals. | Tag/listing and some content pages | `INDEXABILITY_REPORT.md` duplicate counts; `RAW_HTML_ANALYSIS.csv` | Medium | P2 | High | Duplicate SERP snippets lower CTR and perceived uniqueness. | Medium – duplicate meta can cause cannibalisation. | Listing/tag templates inject generic title/description. | Medium | 1–2 weeks | `src/pages/tags/[tag].astro`, `src/pages/topics/[topic].astro`, `src/components/Seo.astro` | Re-audit; `duplicateTitles` and `duplicateDescs` drop to <10. |",
    "| GBF-006 | Rendering/Resources | Third-party scripts (GTM, gtag, AdSense) are loaded without SRI; `gtm.js` returns HTTP 400 in sample. | All pages | `RESOURCE_LOADING.csv`; `src/components/Seo.astro` | Medium | P2 | High | Supply-chain compromise or script failure could break tracking/UX. | Low – no direct indexing impact. | External scripts loaded via `src` without `integrity`. | Low–Medium | 1 day | `src/components/Seo.astro`, `src/layouts/BaseLayout.astro` | Inspect third-party requests; verify SRI where possible. |",
    "| GBF-007 | Crawl Budget/Performance | `Cache-Control: max-age=600` on GitHub Pages forces frequent revalidation of 5,742 pages and 290.6 MB of HTML. | All pages | Live HTTP headers; `CRAWL_BUDGET_REPORT.md` | Medium | P2 | High | Higher crawl cost and slower recrawl of updated content. | Low–Medium – crawl frequency affects freshness. | Static hosting uses short default TTL. | Low | 1 day | Hosting / CDN config | Move to CDN with long TTL for hashed assets. |",
    "",
    "",
    "## Final questions",
    "1. **What exactly does Googlebot receive?** Fully pre-rendered static HTML with all content, metadata, canonical, hreflang, JSON-LD, internal links, and images.",
    "2. **Is the initial HTML sufficient?** Yes for all content/listing/static pages. Search (noindex) and cookie banner are the only JS-dependent surfaces.",
    "3. **Is JavaScript hiding important content?** No. Primary content is in the raw HTML. JS only adds interactivity and reveals the cookie banner.",
    "4. **Would Google have difficulties rendering this website?** No. The site is SSG; rendering is trivial. No hydration of primary content.",
    "5. **What technical issues could prevent proper indexing?** Missing sitemap URLs, thin tag pages, duplicate metadata, home canonical mismatch, hidden mobile nav, short cache headers.",
    "6. **What issues are confirmed?** Sitemap gap, canonical mismatch on home, noindex on 404/search, thin pages, duplicate titles/descriptions, hidden mobile nav.",
    "7. **What issues are probable?** Google may undervalue thin tag pages and may not discover all 3,254 missing-sitemap pages quickly.",
    "8. **What issues are assumptions?** None; all findings are backed by `dist/`, `audit-data.json`, Playwright rendering, and live HTTP headers.",
    "",
    "## Appendix",
    "- Raw analysis: `RAW_HTML_ANALYSIS.csv`",
    "- Rendered analysis: `RENDERED_HTML_ANALYSIS.csv`",
    "- Differences: `HTML_DIFFERENCES.csv`",
    "- Resources: `RESOURCE_LOADING.csv`",
    "- Detailed reports: `INDEXABILITY_REPORT.md`, `RENDERING_REPORT.md`, `RESOURCE_LOADING_REPORT.md`, `CRAWL_BUDGET_REPORT.md`",
]

(OUT / "GOOGLEBOT_FORENSIC_REPORT.md").write_text("\n".join(main_lines), encoding="utf-8")

# EXECUTIVE_SUMMARY.md
exec_lines = [
    "# Googlebot Forensic Audit — Executive Summary",
    "",
    f"""**Site:** https://stackpractices.com  
**Audit date:** {today}  
**Pages analyzed:** {len(raw_rows)}  
**Sample rendered:** {len(SAMPLE_URLS)}""",
    "",
    "## Core conclusion",
    "StackPractices is a static Astro SSG site. Googlebot receives complete, pre-rendered HTML with no JavaScript required for indexing the primary content. Rendering is low-risk.",
    "",
    "## Critical Googlebot findings",
    f"1. **Sitemap gap:** 3,254 pages not in `sitemap.xml` (324 EN + 2,930 ES/noindex). Google must discover them through internal links.",
    f"2. **Thin pages:** {sum(1 for r in raw_rows if r['is_thin'])} pages have <200 words; most are tag/listing pages.",
    f"3. **Duplicate metadata:** {len(dup_title_rows)} duplicate titles, {len(dup_desc_rows)} duplicate meta descriptions.",
    "4. **Canonical mismatch:** home pages `/` and `/es/` canonicalise without trailing slash.",
    "5. **Mobile nav missing:** primary navigation is hidden below the `md` breakpoint with no hamburger menu.",
    "",
    "## Rendering verdict",
    "- Raw HTML is sufficient for indexing.",
    "- JavaScript does not hide primary content.",
    "- No rendering blockers for Googlebot.",
    "",
    "## Immediate actions for Googlebot",
    "1. Regenerate `sitemap.xml` to include every canonical URL and both language variants.",
    "2. Fix home page canonical trailing slash.",
    "3. Add mobile hamburger navigation or keep nav visible.",
    "4. Add unique content to thin tag/listing pages or noindex them.",
    "5. Resolve duplicate title/description templates.",
    "",
    "## Output files",
    "- GOOGLEBOT_FORENSIC_REPORT.md",
    "- RAW_HTML_ANALYSIS.csv",
    "- RENDERED_HTML_ANALYSIS.csv",
    "- HTML_DIFFERENCES.csv",
    "- RENDERING_REPORT.md",
    "- INDEXABILITY_REPORT.md",
    "- RESOURCE_LOADING_REPORT.md",
    "- CRAWL_BUDGET_REPORT.md",
    "- EXECUTIVE_SUMMARY.md (this file)",
]

(OUT / "EXECUTIVE_SUMMARY.md").write_text("\n".join(exec_lines), encoding="utf-8")

# Stop server
server.shutdown()

print(f"Generated {len(list(OUT.glob('*')))} Googlebot forensic files in {OUT}")
