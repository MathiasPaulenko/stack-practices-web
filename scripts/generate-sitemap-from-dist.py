"""Generate a comprehensive sitemap.xml from the dist/ build output.

Walks dist/, finds every index.html, emits one <loc> per canonical URL,
adds hreflang alternates where an ES counterpart exists, and URL-encodes
special characters (spaces, etc.) so the XML remains valid.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
import re
import sys
import xml.etree.ElementTree as ET

try:
    import yaml
except ImportError:
    print(
        "Error: PyYAML is not installed.\n"
        "Install it with: pip install pyyaml",
        file=sys.stderr,
    )
    sys.exit(2)

BASE_URL = "https://stackpractices.com"
DIST_DIR = Path(__file__).resolve().parents[1] / "dist"
PUBLIC_DIR = Path(__file__).resolve().parents[1] / "public"

# Paths that should never appear in a sitemap.
EXCLUDED_SEGMENTS = {"pagefind", "_astro", "assets", "404"}
EXCLUDED_FILES = {"404.html", "sitemap.xml", "rss.xml"}

CONTENT_DIR = Path(__file__).resolve().parents[1] / "src" / "content"
COLLECTIONS = {"recipes", "patterns", "docs", "guides"}


def parse_frontmatter_dates() -> dict[tuple[str, str, str], datetime]:
    """Build a lookup of (locale, content_type, slug) -> lastUpdated/publishedAt."""
    dates: dict[tuple[str, str, str], datetime] = {}
    for md_file in CONTENT_DIR.rglob("*.md"):
        # Locale is determined by file extension: .es.md vs .md
        locale = "es" if md_file.name.endswith(".es.md") else "en"
        try:
            text = md_file.read_text(encoding="utf-8")
        except Exception:
            continue
        if not text.startswith("---"):
            continue
        end = text.find("\n---", 3)
        if end == -1:
            continue
        try:
            frontmatter = yaml.safe_load(text[3:end])
        except Exception:
            continue
        if not frontmatter or "contentType" not in frontmatter or "slug" not in frontmatter:
            continue
        content_type = frontmatter["contentType"]
        slug = frontmatter["slug"]
        date_str = frontmatter.get("lastUpdated") or frontmatter.get("publishedAt")
        if not date_str:
            continue
        try:
            dt = datetime.fromisoformat(date_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            dates[(locale, content_type, slug)] = dt
        except Exception:
            continue
    return dates


def content_key_from_path(path: str) -> tuple[str, str, str] | None:
    """Map a canonical path like /recipes/slug/ or /es/recipes/slug/ to a content key.

    Paginated listing paths such as /recipes/2/ are ignored because their slug is numeric.
    """
    parts = [p for p in path.split("/") if p]
    if len(parts) == 2 and parts[0] in COLLECTIONS and not parts[1].isdigit():
        return ("en", parts[0], parts[1])
    if len(parts) == 3 and parts[0] == "es" and parts[1] in COLLECTIONS and not parts[2].isdigit():
        return ("es", parts[1], parts[2])
    return None


def priority_for_path(path: str) -> str:
    if path == "/":
        return "1.0"
    if path in {"/es/"}:
        return "1.0"
    if re.search(r"^(/es)?/(recipes|patterns|docs|guides)/", path):
        return "0.8"
    if path.startswith("/topics/"):
        return "0.7"
    if path.startswith("/tags/"):
        return "0.6"
    if path in {"/all-resources/", "/es/all-resources/"}:
        return "0.9"
    return "0.5"


def url_encode_path(path: str) -> str:
    """Percent-encode path segments while keeping slashes and the trailing slash."""
    if path == "/":
        return path
    if not path.endswith("/"):
        path += "/"
    parts = path.split("/")
    encoded = [quote(part, safe="") for part in parts]
    return "/".join(encoded)


def is_noindex(html_file: Path) -> bool:
    with html_file.open("r", encoding="utf-8") as f:
        head = f.read(2048)
    return 'name="robots"' in head and 'noindex' in head


def lastmod_for(path: str, html_file: Path, content_dates: dict[tuple[str, str, str], datetime]) -> datetime:
    """Return the content lastUpdated/publishedAt for known content pages, else the build mtime."""
    key = content_key_from_path(path)
    if key and key in content_dates:
        return content_dates[key]
    return datetime.fromtimestamp(html_file.stat().st_mtime, tz=timezone.utc)


def collect_urls() -> list[tuple[str, datetime]]:
    content_dates = parse_frontmatter_dates()
    urls: list[tuple[str, datetime]] = []
    for html_file in DIST_DIR.rglob("index.html"):
        rel = html_file.relative_to(DIST_DIR).as_posix()
        parts = rel.split("/")
        # Drop the trailing index.html
        if parts[-1] != "index.html":
            continue
        dir_parts = parts[:-1]

        # Exclude generated/utility directories and 404 pages.
        if any(seg in EXCLUDED_SEGMENTS for seg in dir_parts):
            continue

        # Exclude pages marked noindex
        if is_noindex(html_file):
            continue

        if len(dir_parts) == 0:
            path = "/"
        elif dir_parts[0] == "es":
            path = "/es/" + "/".join(dir_parts[1:]) if len(dir_parts) > 1 else "/es/"
        else:
            path = "/" + "/".join(dir_parts)

        urls.append((url_encode_path(path), lastmod_for(path, html_file, content_dates)))

    # Also include root-level HTML files if any (e.g. 404.html is excluded explicitly).
    for html_file in DIST_DIR.glob("*.html"):
        if html_file.name in EXCLUDED_FILES:
            continue
        if html_file.name == "index.html":
            continue
        slug = html_file.stem
        path = f"/{slug}/"
        urls.append((url_encode_path(path), lastmod_for(path, html_file, content_dates)))

    # Sort deterministically.
    return sorted(urls, key=lambda x: x[0])


def build_sitemap(urls: list[tuple[str, datetime]]) -> str:
    urlset = ET.Element(
        "urlset",
        {
            "xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
            "xmlns:xhtml": "http://www.w3.org/1999/xhtml",
        },
    )

    path_set = {u for u, _ in urls}

    for path, mtime in urls:
        en_path = path if not path.startswith("/es/") else path
        es_path = None
        if path.startswith("/es/"):
            es_path = path
            en_path = path.replace("/es/", "/", 1) if path != "/es/" else "/"
        else:
            es_candidate = f"/es{path}" if path != "/" else "/es/"
            if es_candidate in path_set:
                es_path = es_candidate

        has_es = es_path is not None and es_path in path_set

        url_el = ET.SubElement(urlset, "url")

        loc = ET.SubElement(url_el, "loc")
        loc.text = f"{BASE_URL}{path}"

        lastmod = ET.SubElement(url_el, "lastmod")
        lastmod.text = mtime.strftime("%Y-%m-%d")

        changefreq = ET.SubElement(url_el, "changefreq")
        changefreq.text = "weekly"

        priority = ET.SubElement(url_el, "priority")
        priority.text = priority_for_path(path)

        if has_es:
            en_loc = f"{BASE_URL}{en_path}"
            es_loc = f"{BASE_URL}{es_path}"

            alt1 = ET.SubElement(url_el, "xhtml:link", {"rel": "alternate", "hreflang": "en", "href": en_loc})
            alt2 = ET.SubElement(url_el, "xhtml:link", {"rel": "alternate", "hreflang": "es", "href": es_loc})
            alt3 = ET.SubElement(url_el, "xhtml:link", {"rel": "alternate", "hreflang": "x-default", "href": en_loc})

    ET.indent(urlset, space="  ")
    xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + ET.tostring(urlset, encoding="unicode")
    return xml


def main() -> None:
    urls = collect_urls()
    sitemap = build_sitemap(urls)

    (PUBLIC_DIR / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    (DIST_DIR / "sitemap.xml").write_text(sitemap, encoding="utf-8")

    print(f"Generated sitemap.xml with {len(urls)} URLs")
    print(f"  Written to: {PUBLIC_DIR / 'sitemap.xml'}")
    print(f"  Written to: {DIST_DIR / 'sitemap.xml'}")


if __name__ == "__main__":
    main()
