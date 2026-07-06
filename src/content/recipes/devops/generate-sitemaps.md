---
contentType: recipes
slug: generate-sitemaps
title: "Generate Sitemaps Live"
description: "How to build and serve live XML sitemaps from your application data, with multi-language support, pagination, and automatic lastmod dates."
metaDescription: "Learn live sitemap generation in Python, JavaScript, and Java. Covers XML structure, URL pagination, lastmod dates, and multi-language hreflang support for SEO."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - ci-cd
  - automation
  - deployment
  - infrastructure
relatedResources:
  - /recipes/background-jobs
  - /recipes/cli-tool-argument-parsing
  - /recipes/environment-variables
  - /recipes/feature-flags
  - /recipes/health-check-endpoint
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn live sitemap generation in Python, JavaScript, and Java. Covers XML structure, URL pagination, lastmod dates, and multi-language hreflang support for SEO."
  keywords:
    - sitemap
    - xml
    - seo
    - live
    - generation
    - python
    - javascript
    - java
---
## Overview

XML sitemaps tell search engines which pages exist on your site, how often they change, and their relative priority. While static sitemaps work for small sites, live sitemaps are essential for large or frequently changing content (blogs, e-commerce, user-generated content). The solution below covers generating sitemap XML from database queries or content APIs, handling pagination when URLs exceed the 50,000 limit per file, and adding multi-language `hreflang` annotations for international SEO.

## When to Use

Use this resource when:
- Your site has thousands of pages that change regularly and a static sitemap is unmaintainable. See [Background Jobs](/recipes/devops/background-jobs) for scheduled regeneration.
- You run a multi-language site and need `xhtml:link` annotations in sitemaps for hreflang. See [Environment Variables](/recipes/devops/environment-variables) for per-locale configuration.
- You want to include `lastmod`, `changefreq`, and `priority` metadata derived from content timestamps. See [Cron Jobs](/recipes/devops/cron-jobs) for scheduled updates.
- You need a sitemap index file that references multiple paginated sitemap files for very large sites. See [Compression Gzip](/recipes/file-handling/compression-gzip) for reducing sitemap transfer size.

## Solution

### Python (Flask)

```python
from flask import Flask, Response
from datetime import datetime
import xml.etree.ElementTree as ET

app = Flask(__name__)

def generate_sitemap(urls):
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

    for url_data in urls:
        url_elem = ET.SubElement(urlset, "url")
        ET.SubElement(url_elem, "loc").text = url_data["loc"]
        ET.SubElement(url_elem, "lastmod").text = url_data["lastmod"]
        ET.SubElement(url_elem, "changefreq").text = url_data.get("changefreq", "weekly")
        ET.SubElement(url_elem, "priority").text = str(url_data.get("priority", "0.5"))

    return ET.tostring(urlset, encoding="unicode")

@app.route("/sitemap.xml")
def sitemap():
    # In production, query your database or CMS
    urls = [
        {"loc": "https://example.com/", "lastmod": "2024-06-01", "priority": "1.0"},
        {"loc": "https://example.com/blog/post-1", "lastmod": "2024-06-10", "priority": "0.8"},
        {"loc": "https://example.com/products/item-1", "lastmod": "2024-06-05", "priority": "0.6"},
    ]

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += generate_sitemap(urls)

    return Response(xml, mimetype="application/xml")

# Sitemap index for large sites
@app.route("/sitemap-index.xml")
def sitemap_index():
    sitemap_count = 3  # Query your DB for total pages / 50000
    sitemapindex = ET.Element("sitemapindex", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

    for i in range(1, sitemap_count + 1):
        sitemap_elem = ET.SubElement(sitemapindex, "sitemap")
        ET.SubElement(sitemap_elem, "loc").text = f"https://example.com/sitemap-{i}.xml"
        ET.SubElement(sitemap_elem, "lastmod").text = datetime.now().strftime("%Y-%m-%d")

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += ET.tostring(sitemapindex, encoding="unicode")
    return Response(xml, mimetype="application/xml")
```

### JavaScript (Express)

```javascript
const express = require("express");
const app = express();

function buildSitemap(urls) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];

  for (const url of urls) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(url.loc)}</loc>`);
    lines.push(`    <lastmod>${url.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${url.changefreq || "weekly"}</changefreq>`);
    lines.push(`    <priority>${url.priority || "0.5"}</priority>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  return lines.join("\n");
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
}

app.get("/sitemap.xml", (req, res) => {
  const urls = [
    { loc: "https://example.com/", lastmod: "2024-06-01", priority: "1.0" },
    { loc: "https://example.com/blog/post-1", lastmod: "2024-06-10", priority: "0.8" }
  ];

  res.set("Content-Type", "application/xml");
  res.send(buildSitemap(urls));
});

// Paginated sitemap with hreflang
app.get("/sitemap-products.xml", (req, res) => {
  const products = getProducts(); // From DB
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">'
  ];

  for (const product of products) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(product.url)}</loc>`);
    lines.push(`    <lastmod>${product.updatedAt}</lastmod>`);

    // hreflang annotations
    for (const lang of ["en", "es", "de"]) {
      lines.push(`    <xhtml:link rel="alternate" hreflang="${lang}"`);
      lines.push(`                href="${escapeXml(product.url)}?lang=${lang}" />`);
    }

    lines.push("  </url>");
  }

  lines.push("</urlset>");
  res.set("Content-Type", "application/xml");
  res.send(lines.join("\n"));
});
```

### Java (Spring Boot)

```java
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.StringWriter;
import java.time.LocalDate;
import java.util.List;

@RestController
public class SitemapController {

  record UrlEntry(String loc, String lastmod, String changefreq, String priority) {}

  @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
  public String sitemap() {
    List<UrlEntry> urls = List.of(
      new UrlEntry("https://example.com/", "2024-06-01", "daily", "1.0"),
      new UrlEntry("https://example.com/blog/post-1", "2024-06-10", "weekly", "0.8"),
      new UrlEntry("https://example.com/products/item-1", "2024-06-05", "weekly", "0.6")
    );

    return buildSitemap(urls);
  }

  private String buildSitemap(List<UrlEntry> urls) {
    try {
      DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
      Document doc = builder.newDocument();

      Element urlset = doc.createElement("urlset");
      urlset.setAttribute("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9");
      doc.appendChild(urlset);

      for (UrlEntry entry : urls) {
        Element url = doc.createElement("url");
        urlset.appendChild(url);

        Element loc = doc.createElement("loc");
        loc.setTextContent(entry.loc());
        url.appendChild(loc);

        Element lastmod = doc.createElement("lastmod");
        lastmod.setTextContent(entry.lastmod());
        url.appendChild(lastmod);

        Element changefreq = doc.createElement("changefreq");
        changefreq.setTextContent(entry.changefreq());
        url.appendChild(changefreq);

        Element priority = doc.createElement("priority");
        priority.setTextContent(entry.priority());
        url.appendChild(priority);
      }

      Transformer transformer = TransformerFactory.newInstance().newTransformer();
      transformer.setOutputProperty(OutputKeys.INDENT, "yes");
      transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "2");

      StringWriter writer = new StringWriter();
      transformer.transform(new DOMSource(doc), new StreamResult(writer));
      return writer.toString();
    } catch (Exception e) {
      throw new RuntimeException("Failed to generate sitemap", e);
    }
  }
}
```

## Explanation

- **XML structure** follows the [sitemaps.org protocol](https://www.sitemaps.org/protocol.html): a `<urlset>` root containing `<url>` entries, each with `<loc>`, `<lastmod>`, `<changefreq>`, and `<priority>` child elements. Valid sitemaps must be UTF-8 encoded and escaped properly.
- **Live generation** queries your database, CMS, or file system at request time to produce fresh sitemaps. For high-traffic sites, cache the generated XML for a few hours instead of rebuilding on every request.
- **Pagination via sitemap index** — each sitemap file can contain at most 50,000 URLs and must be under 50MB uncompressed. For larger sites, create a sitemap index file that references multiple paginated sitemaps (`sitemap-1.xml`, `sitemap-2.xml`, etc.).
- **Hreflang annotations** use `<xhtml:link>` elements inside each `<url>` to declare language variants. Every URL must list itself and all alternates, including the canonical version. This is critical for multilingual SEO.

## Variants

| Approach | Source | Hreflang | Best For |
|----------|--------|----------|----------|
| Database query | SQL/ORM | Manual | Content-heavy sites (blogs, CMS) |
| Static build | File system | Pre-generated | JAMstack/SSG sites (Astro, Next.js) |
| API-driven | REST/GraphQL | From API metadata | Headless CMS (Contentful, Strapi) |
| Cached file | Redis/disk | Static after first request | High-traffic sites with stable content |

## What Works

1. **Always escape XML** — URLs must XML-escape `&`, `<`, `>`, `"`, and `'`. An unescaped ampersand in a query string breaks the sitemap parser.
2. **Set accurate `lastmod`** — use the actual content modification date, not the current date. Google ignores inaccurate `lastmod` values and may stop trusting your sitemap.
3. **Paginate before hitting limits** — start generating a sitemap index when you approach 40,000 URLs to leave headroom for growth. Each referenced sitemap must be under 50MB.
4. **Include canonical URLs only** — exclude parameterized variants, session IDs, and 404 pages. Sitemaps should only list canonical, indexable pages.
5. **Submit to search engines** — register your sitemap in Google Search Console and Bing Webmaster Tools. For very large sites, use the Search Console API to push sitemap updates programmatically.

## Common Mistakes

1. Generating sitemaps with `http://` URLs when the site uses HTTPS — search engines treat these as separate sites and may ignore the HTTP version.
2. Forgetting to XML-escape URLs with query parameters, causing parser errors in search engine crawlers.
3. Listing noindex pages or redirect chains in the sitemap, which wastes crawl budget and confuses search engines.
4. Using the current date for all `lastmod` values, making the attribute meaningless and potentially ignored by crawlers.
5. Omitting the sitemap index for sites with 100,000+ URLs, resulting in oversized individual sitemap files that violate the 50,000 URL / 50MB limit.

## Frequently Asked Questions

### How often should I regenerate the sitemap?

For content that changes daily, regenerate at least once per day. For static sites, rebuild the sitemap as part of your deployment pipeline. For highly live sites (forums, marketplaces), generate on-demand with a short cache (e.g., 1 hour) to balance freshness and performance.

### Can I include images and videos in the sitemap?

Yes. Use [Google's Image Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps) and [Video Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps) extensions by adding `<image:image>` and `<video:video>` elements inside each `<url>`. This helps Google discover media content that might not be linked via standard HTML.

### Do I need a separate sitemap for each language?

Not necessarily. You can include all language variants in a single sitemap using `<xhtml:link rel="alternate" hreflang="...">` annotations. However, for very large multi-language sites, splitting by language can make sitemaps more manageable and allow language-specific lastmod tracking.
