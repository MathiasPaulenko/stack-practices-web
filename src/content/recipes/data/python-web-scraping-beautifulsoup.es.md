---
contentType: recipes
slug: python-web-scraping-beautifulsoup
title: "Extrae Datos de Páginas HTML con Python y BeautifulSoup"
description: "Parsea HTML y extrae datos usando BeautifulSoup. Cubre selectores CSS, navegación DOM, tablas, paginación y scraping respetuoso con rate limiting."
metaDescription: "Extrae datos de HTML con Python BeautifulSoup. Selectores CSS, navegación DOM, parseo de tablas, crawling con paginación y scraping con rate limiting."
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
  metaDescription: "Extrae datos de HTML con Python BeautifulSoup. Selectores CSS, navegación DOM, parseo de tablas, crawling con paginación y scraping con rate limiting."
  keywords:
    - python web scraping
    - beautifulsoup html parsing
    - python extract data html
    - beautifulsoup css selectors
    - python scrape table html
    - python pagination scraping
---

## Visión General

BeautifulSoup es una librería de Python para parsear documentos HTML y XML. Crea un árbol de parseo desde el código fuente de la página que puedes navegar, buscar y modificar. Combinado con `requests` para obtener páginas, es la herramienta estándar para web scraping en Python. Esta recipe cubre selectores CSS, navegación DOM, extracción de tablas, crawling con paginación y prácticas de scraping respetuoso.

## Cuándo Usar

- Necesitas extraer datos de páginas HTML estáticas (sin rendering de JavaScript)
- Parseas tablas, listas o contenido estructurado de páginas web
- Construyes un pipeline de datos que scrapea múltiples páginas
- Necesitas monitorear una página por cambios (price tracking, disponibilidad)

## Solución

### Instalar dependencias

```bash
pip install beautifulsoup4 requests
```

### Parseo básico de página

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

### Selectores CSS con select

```python
# Buscar por selector CSS — retorna lista
articles = soup.select("div.article-list article")

for article in articles:
    title = article.select_one("h2 a").text
    link = article.select_one("h2 a")["href"]
    summary = article.select_one("p.summary").text.strip()
    print(f"{title}: {link}")

# Seleccionar con classes e IDs
main_content = soup.select_one("#main-content")
posts = soup.select(".post-list .post-item")

# Selectores de atributos
links = soup.select('a[href^="https://"]')
data_items = soup.select("[data-category='tech']")
```

### find y find_all

```python
# find_all — retorna lista de tags que coinciden
paragraphs = soup.find_all("p", class_="lead")
links = soup.find_all("a", limit=5)  # Primeros 5 links

# find — retorna primer match
first_image = soup.find("img")
author = soup.find("span", class_="author")

# Find con múltiples atributos
post = soup.find("div", {"class": "post", "data-id": "123"})

# Find por contenido de texto
import re
prices = soup.find_all(string=re.compile(r"\$\d+\.\d{2}"))
```

### Navegar el árbol DOM

```python
article = soup.find("article")

# Parent
parent_div = article.parent

# Children (directos solo)
for child in article.children:
    print(child.name)

# Descendants (todos los niveles)
for desc in article.descendants:
    if desc.name:
        print(desc.name)

# Siblings
next_article = article.find_next_sibling()
prev_article = article.find_previous_sibling()

# Elementos next/previous
next_heading = article.find_next("h2")
prev_paragraph = article.find_previous("p")
```

### Extraer datos de tablas

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

# Uso
table_data = parse_table(soup, "table.data-table")
for row in table_data:
    print(row)
```

### Scraping con paginación

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
        time.sleep(delay)  # Respetar rate limiting

    return all_items

results = scrape_paginated("https://example.com/products", max_pages=5, delay=2.0)
```

### Extraer links e imágenes

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

### Exportar a CSV y JSON

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

# Uso
export_csv(results, "products.csv")
export_json(results, "products.json")
```

### Scraper con rate limiting y reintentos

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

## Explicación

BeautifulSoup parsea HTML en un árbol de objetos Python. Navegas este árbol para extraer datos.

Conceptos clave:

- **Parser**: `html.parser` (built-in), `lxml` (más rápido), `html5lib` (más browser-like). Usar `html.parser` para simplicidad, `lxml` para velocidad.
- **Tag objects**: Representan elementos HTML. Tienen `.name`, `.text`, `.attrs`, `.children`, `.parent`, `.contents`.
- **select()**: Queries de selectores CSS. Retorna una lista. Usar `select_one()` para primer match.
- **find() / find_all()**: Buscar por tag name, atributos, class, text. Más flexible que selectores CSS para queries complejas.
- **Navigation**: `.parent`, `.children`, `.descendants`, `.find_next_sibling()`, `.find_previous()`. Caminar el árbol en cualquier dirección.
- **Rate limiting**: Siempre delay entre peticiones. 1-2 segundos es un buen default. Revisar `robots.txt` antes de scrapear.

## Variantes

| Herramienta | Tipo | JavaScript | Usar Cuando |
|------|------|-----------|----------|
| BeautifulSoup + requests | Estático | No | Scraping HTML simple |
| Scrapy | Framework | No | Crawling a gran escala |
| Selenium | Browser | Sí | Páginas con JS rendering |
| Playwright | Browser | Sí | Páginas JS modernas |
| httpx + selectolax | Estático | No | Parseo HTML rápido |

## Pautas

- Siempre establecer un `User-Agent` descriptivo. Los sitios bloquean peticiones sin uno.
- Revisar `robots.txt` antes de scrapear. Respetar reglas `Disallow`.
- Añadir delays entre peticiones. 1-2 segundos es respetuoso. Usar session para reuso de conexiones.
- Usar `html.parser` para uso general. Cambiar a `lxml` para performance en páginas grandes.
- Manejar 404 y 403 gracefulmente. Los sitios pueden bloquear scrapers o las páginas pueden no existir.
- Usar `urljoin()` para resolver URLs relativas. Nunca concatenar strings manualmente.
- Exportar a CSV o JSON para procesamiento downstream. Usar `ensure_ascii=False` para texto no-English.
- Usar un objeto `Session` para connection pooling entre múltiples peticiones.
- Almacenar HTML raw para debugging. Re-parsear sin re-fetch si los selectores se rompen.

## Errores Comunes

- No establecer un User-Agent. Muchos sitios retornan 403 a peticiones sin uno.
- Scrapear muy rápido. Peticiones rápidas pueden trigger IP bans. Siempre añadir delays.
- No revisar robots.txt. Scrapear páginas disallowed es antiético y potencialmente ilegal.
- Usar concatenación de strings para URLs. Usar `urljoin()` para manejar paths relativos correctamente.
- No manejar elementos faltantes. `soup.select_one()` retorna `None` si no encuentra. Siempre verificar.
- Olvidar `.strip()` en texto. Whitespace de HTML crea datos sucios.
- No encodear output correctamente. Usar `encoding="utf-8"` para CSV y JSON con texto no-English.
- Parsear contenido renderizado por JavaScript con BeautifulSoup. BeautifulSoup no ejecuta JS. Usar Selenium o Playwright.

## Preguntas Frecuentes

### ¿Puede BeautifulSoup scrapear páginas renderizadas con JavaScript?

No. BeautifulSoup solo parsea el código fuente HTML. Si el contenido se carga por JavaScript, usar Selenium, Playwright, o revisar si el sitio tiene una JSON API que puedas llamar directamente.

### ¿Cuál es la diferencia entre find_all y select?

`find_all()` busca por tag name, atributos y contenido de texto. `select()` usa selectores CSS. Los selectores CSS son más concisos para queries complejas. `find_all()` es más flexible para búsquedas basadas en atributos.

### ¿Cómo manejo páginas protegidas con autenticación?

Passar cookies o headers de autenticación con `requests`:

```python
session = requests.Session()
session.post("https://example.com/login", data={"username": "...", "password": "..."})
soup = BeautifulSoup(session.get("https://example.com/protected").text, "html.parser")
```

### ¿Es legal el web scraping?

Depende del sitio y jurisdicción. Revisar los Terms of Service del sitio y robots.txt. Scrapear datos públicos es generalmente aceptable. Scrapear detrás de autenticación o datos personales puede violar leyes. Siempre consultar asesoría legal para scraping comercial.
