---
contentType: recipes
slug: python-web-scraping-beautifulsoup
title: "Extract Data from HTML Pages with Python and BeautifulSoup"
description: "Parse HTML and extract data using BeautifulSoup. Covers CSS selectors, navigation, tables, pagination, and respectful scraping with rate limiting."
metaDescription: "Extract data from HTML with Python BeautifulSoup. CSS selectors, DOM navigation, table parsing, pagination crawling and rate-limited scraping."
difficulty: intermediate
topics:
  - data
  - api
tags:
  - python
  - beautifulsoup
  - web-scraping
  - html-parsing
  - requests
  - data-extraction
relatedResources:
  - /recipes/concurrency/python-async-http-requests
  - /recipes/file-handling/nodejs-read-large-file-stream
  - /guides/data-lake-guide
  - /patterns/circuit-breaker-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Extract data from HTML with Python BeautifulSoup. CSS selectors, DOM navigation, table parsing, pagination crawling and rate-limited scraping."
  keywords:
    - python web scraping
    - beautifulsoup html parsing
    - python extract data html
    - beautifulsoup css selectors
    - python scrape table html
    - python pagination scraping
---

## Overview

BeautifulSoup is a Python library for parsing HTML and XML documents. It creates a parse tree from page source that you can navigate, search, and modify. Combined with `requests` for fetching pages, it is the standard tool for web scraping in Python. The solution below covers CSS selectors, DOM navigation, table extraction, pagination crawling, and respectful scraping practices.

## When to Use

- You need to extract data from static HTML pages (no JavaScript rendering)
- You parse tables, lists, or structured content from web pages
- You build a data pipeline that scrapes multiple pages
- You need to monitor a page for changes (price tracking, availability)

## Solution

### Install dependencies

```bash
pip install beautifulsoup4 requests
```

### Basic page parsing

```python
import requests
from bs4 import BeautifulSoup

def fetch_page(url: str) -> BeautifulSoup:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; MyScraper/1.0)"}
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")

soup = fetch_page("https://example.com")
print(soup.title.string)
print(soup.find("h1").text)
```

### CSS selectors with select

```python
# Find by CSS selector — returns list
articles = soup.select("div.article-list article")

for article in articles:
    title = article.select_one("h2 a").text
    link = article.select_one("h2 a")["href"]
    summary = article.select_one("p.summary").text.strip()
    print(f"{title}: {link}")

# Select with classes and IDs
main_content = soup.select_one("#main-content")
posts = soup.select(".post-list .post-item")

# Attribute selectors
links = soup.select('a[href^="https://"]')
data_items = soup.select("[data-category='tech']")
```

### find and find_all

```python
# find_all — returns list of matching tags
paragraphs = soup.find_all("p", class_="lead")
links = soup.find_all("a", limit=5)  # First 5 links

# find — returns first match
first_image = soup.find("img")
author = soup.find("span", class_="author")

# Find with multiple attributes
post = soup.find("div", {"class": "post", "data-id": "123"})

# Find by text content
import re
prices = soup.find_all(string=re.compile(r"\$\d+\.\d{2}"))
```

### Navigating the DOM tree

```python
article = soup.find("article")

# Parent
parent_div = article.parent

# Children (direct only)
for child in article.children:
    print(child.name)

# Descendants (all levels)
for desc in article.descendants:
    if desc.name:
        print(desc.name)

# Siblings
next_article = article.find_next_sibling()
prev_article = article.find_previous_sibling()

# Next/previous elements
next_heading = article.find_next("h2")
prev_paragraph = article.find_previous("p")
```

### Extracting table data

```python
def parse_table(soup: BeautifulSoup, table_selector: str = "table") -> list[dict]:
    table = soup.select_one(table_selector)
    if not table:
        return []

    headers = [th.text.strip() for th in table.select("thead th")]
    rows = []

    for tr in table.select("tbody tr"):
        cells = [td.text.strip() for td in tr.select("td")]
        if headers and len(cells) == len(headers):
            rows.append(dict(zip(headers, cells)))
        else:
            rows.append(cells)

    return rows

# Usage
table_data = parse_table(soup, "table.data-table")
for row in table_data:
    print(row)
```

### Scraping with pagination

```python
import time
import requests
from bs4 import BeautifulSoup

def scrape_paginated(base_url: str, max_pages: int = 10, delay: float = 1.0) -> list[dict]:
    all_items = []
    headers = {"User-Agent": "Mozilla/5.0 (compatible; MyScraper/1.0)"}

    for page in range(1, max_pages + 1):
        url = f"{base_url}?page={page}"
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 404:
            print(f"Page {page} not found, stopping")
            break

        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        items = soup.select(".item-list .item")
        if not items:
            print(f"No items on page {page}, stopping")
            break

        for item in items:
            all_items.append({
                "title": item.select_one(".title").text.strip(),
                "price": item.select_one(".price").text.strip(),
                "link": item.select_one("a")["href"],
            })

        print(f"Scraped page {page}: {len(items)} items")
        time.sleep(delay)  # Respect rate limiting

    return all_items

results = scrape_paginated("https://example.com/products", max_pages=5, delay=2.0)
```

### Extracting links and images

```python
def extract_all_links(soup: BeautifulSoup, base_url: str = "") -> list[dict]:
    from urllib.parse import urljoin
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        full_url = urljoin(base_url, href) if base_url else href
        links.append({"text": a.text.strip(), "url": full_url})
    return links

def extract_all_images(soup: BeautifulSoup, base_url: str = "") -> list[dict]:
    from urllib.parse import urljoin
    images = []
    for img in soup.find_all("img"):
        src = img.get("src", img.get("data-src", ""))
        if src:
            full_url = urljoin(base_url, src) if base_url else src
            images.append({
                "url": full_url,
                "alt": img.get("alt", ""),
                "width": img.get("width", ""),
                "height": img.get("height", ""),
            })
    return images
```

### Exporting to CSV and JSON

```python
import csv
import json

def export_csv(data: list[dict], filename: str) -> None:
    if not data:
        return
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)

def export_json(data: list[dict], filename: str) -> None:
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# Usage
export_csv(results, "products.csv")
export_json(results, "products.json")
```

### Rate-limited scraper with retries

```python
import time
import requests
from bs4 import BeautifulSoup

class Scraper:
    def __init__(self, delay: float = 1.0, max_retries: int = 3):
        self.delay = delay
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (compatible; MyScraper/1.0)"
        })
        self._last_request = 0

    def fetch(self, url: str) -> BeautifulSoup:
        # Enforce delay between requests
        elapsed = time.time() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

        for attempt in range(self.max_retries):
            try:
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
                self._last_request = time.time()
                return BeautifulSoup(response.text, "html.parser")
            except requests.RequestException as e:
                if attempt == self.max_retries - 1:
                    raise
                wait = 2 ** attempt
                print(f"Retry {attempt + 1} in {wait}s: {e}")
                time.sleep(wait)

scraper = Scraper(delay=2.0)
soup = scraper.fetch("https://example.com")
```

## Explanation

BeautifulSoup parses HTML into a tree of Python objects. You navigate this tree to extract data.

Key concepts:

- **Parser**: `html.parser` (built-in), `lxml` (faster), `html5lib` (most browser-like). Use `html.parser` for simplicity, `lxml` for speed.
- **Tag objects**: Represent HTML elements. Have `.name`, `.text`, `.attrs`, `.children`, `.parent`, `.contents`.
- **select()**: CSS selector queries. Returns a list. Use `select_one()` for first match.
- **find() / find_all()**: Search by tag name, attributes, class, text. More flexible than CSS selectors for complex queries.
- **Navigation**: `.parent`, `.children`, `.descendants`, `.find_next_sibling()`, `.find_previous()`. Walk the tree in any direction.
- **Rate limiting**: Always delay between requests. 1-2 seconds is a good default. Check the site's `robots.txt` before scraping.

## Variants

| Tool | Type | JavaScript | Use When |
|------|------|-----------|----------|
| BeautifulSoup + requests | Static | No | Simple HTML scraping |
| Scrapy | Framework | No | Large-scale crawling |
| Selenium | Browser | Yes | JS-rendered pages |
| Playwright | Browser | Yes | Modern JS pages |
| httpx + selectolax | Static | No | Fast HTML parsing |

## Guidelines

- Always set a descriptive `User-Agent` header. Sites block requests without one.
- Check `robots.txt` before scraping. Respect `Disallow` rules.
- Add delays between requests. 1-2 seconds is respectful. Use a session for connection reuse.
- Use `html.parser` for general use. Switch to `lxml` for performance on large pages.
- Handle 404 and 403 gracefully. Sites may block scrapers or pages may not exist.
- Use `urljoin()` to resolve relative URLs. Never concatenate strings manually.
- Export to CSV or JSON for downstream processing. Use `ensure_ascii=False` for non-English text.
- Use a `Session` object for connection pooling across multiple requests.
- Store raw HTML for debugging. Re-parse without re-fetching if selectors break.

## Common Mistakes

- Not setting a User-Agent. Many sites return 403 to requests without one.
- Scraping too fast. Rapid requests can trigger IP bans. Always add delays.
- Not checking robots.txt. Scraping disallowed pages is unethical and potentially illegal.
- Using string concatenation for URLs. Use `urljoin()` to handle relative paths correctly.
- Not handling missing elements. `soup.select_one()` returns `None` if not found. Always check.
- Forgetting `.strip()` on text. HTML whitespace creates messy data.
- Not encoding output properly. Use `encoding="utf-8"` for CSV and JSON with non-English text.
- Parsing JavaScript-rendered content with BeautifulSoup. BeautifulSoup does not execute JS. Use Selenium or Playwright.

## Frequently Asked Questions

### Can BeautifulSoup scrape JavaScript-rendered pages?

No. BeautifulSoup only parses the HTML source. If content is loaded by JavaScript, use Selenium, Playwright, or check if the site has a JSON API you can call directly.

### What is the difference between find_all and select?

`find_all()` searches by tag name, attributes, and text content. `select()` uses CSS selectors. CSS selectors are more concise for complex queries. `find_all()` is more flexible for attribute-based searches.

### How do I handle authentication-protected pages?

Pass cookies or authentication headers with `requests`:

```python
session = requests.Session()
session.post("https://example.com/login", data={"username": "...", "password": "..."})
soup = BeautifulSoup(session.get("https://example.com/protected").text, "html.parser")
```

### Is web scraping legal?

It depends on the site and jurisdiction. Check the site's Terms of Service and robots.txt. Scraping public data is generally acceptable. Scraping behind authentication or personal data may violate laws. Always consult legal advice for commercial scraping.
