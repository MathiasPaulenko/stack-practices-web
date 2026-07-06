---
contentType: recipes
slug: generate-sitemaps
title: "Generar Sitemaps en Vivo"
description: "Cómo construir y servir sitemaps XML en vivo desde los datos de tu aplicación, con soporte multi-idioma, paginación y fechas lastmod automáticas."
metaDescription: "Aprende generación en vivo de sitemaps en Python, JavaScript y Java. Cubre estructura XML, paginación de URLs, fechas lastmod y soporte hreflang multi-idioma para SEO."
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
  metaDescription: "Aprende generación en vivo de sitemaps en Python, JavaScript y Java. Cubre estructura XML, paginación de URLs, fechas lastmod y soporte hreflang multi-idioma para SEO."
  keywords:
    - sitemap
    - xml
    - seo
    - en vivo
    - generacion
    - python
    - javascript
    - java
---
## Visión General

Los sitemaps XML informan a los motores de búsqueda qué páginas existen en tu sitio, cuán a menudo cambian, y su prioridad relativa. Mientras que los sitemaps estáticos funcionan para sitios pequeños, los sitemaps en vivo son esenciales para contenido grande o que cambia frecuentemente (blogs, e-commerce, contenido generado por usuarios). El siguiente enfoque cubre la generación de sitemap XML desde consultas de base de datos o APIs de contenido, el manejo de paginación cuando las URLs exceden el límite de 50.000 por archivo, y la adición de anotaciones multi-idioma `hreflang` para SEO internacional.

## Cuándo Usar

Usa este recurso cuando:
- Tu sitio tiene miles de páginas que cambian regularmente y un sitemap estático es inmantenible. Consulta [Background Jobs](/recipes/devops/background-jobs) para regeneración programada.
- Ejecutas un sitio multi-idioma y necesitas anotaciones `xhtml:link` en sitemaps para hreflang. Consulta [Environment Variables](/recipes/devops/environment-variables) para configuración por locale.
- Quieres incluir metadatos `lastmod`, `changefreq` y `priority` derivados de timestamps de contenido. Consulta [Cron Jobs](/recipes/devops/cron-jobs) para actualizaciones programadas.
- Necesitas un archivo de índice de sitemap que referencie múltiples archivos de sitemap paginados para sitios muy grandes. Consulta [Compression Gzip](/recipes/file-handling/compression-gzip) para reducir tamaño de transferencia de sitemaps.

## Solución

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
    urls = [
        {"loc": "https://example.com/", "lastmod": "2024-06-01", "priority": "1.0"},
        {"loc": "https://example.com/blog/post-1", "lastmod": "2024-06-10", "priority": "0.8"},
        {"loc": "https://example.com/products/item-1", "lastmod": "2024-06-05", "priority": "0.6"},
    ]

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += generate_sitemap(urls)

    return Response(xml, mimetype="application/xml")

# Índice de sitemap para sitios grandes
@app.route("/sitemap-index.xml")
def sitemap_index():
    sitemap_count = 3  # Consulta tu DB para total de páginas / 50000
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

// Sitemap paginado con hreflang
app.get("/sitemap-products.xml", (req, res) => {
  const products = getProducts(); // Desde DB
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">'
  ];

  for (const product of products) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(product.url)}</loc>`);
    lines.push(`    <lastmod>${product.updatedAt}</lastmod>`);

    // Anotaciones hreflang
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

## Explicación

- **Estructura XML** sigue el [protocolo sitemaps.org](https://www.sitemaps.org/protocol.html): una raíz `<urlset>` conteniendo entradas `<url>`, cada una con elementos hijos `<loc>`, `<lastmod>`, `<changefreq>` y `<priority>`. Los sitemaps válidos deben estar codificados en UTF-8 y escapados correctamente.
- **Generación en vivo** consulta tu base de datos, CMS o sistema de archivos en tiempo de request para producir sitemaps frescos. Para sitios de alto tráfico, cachea el XML generado por unas horas en lugar de reconstruir en cada request.
- **Paginación vía índice de sitemap** — cada archivo de sitemap puede contener como máximo 50.000 URLs y debe estar bajo 50MB sin comprimir. Para sitios más grandes, crea un archivo de índice de sitemap que referencie múltiples sitemaps paginados (`sitemap-1.xml`, `sitemap-2.xml`, etc.).
- **Anotaciones hreflang** usan elementos `<xhtml:link>` dentro de cada `<url>` para declarar variantes de idioma. Cada URL debe listarse a sí misma y todas sus alternativas, incluyendo la versión canónica. Esto es crítico para SEO multilingüe.

## Variantes

| Enfoque | Fuente | Hreflang | Mejor Para |
|---------|--------|----------|------------|
| Consulta a base de datos | SQL/ORM | Manual | Sitios con mucho contenido (blogs, CMS) |
| Build estático | Sistema de archivos | Pre-generado | Sitios JAMstack/SSG (Astro, Next.js) |
| API-driven | REST/GraphQL | Desde metadata de API | CMS headless (Contentful, Strapi) |
| Archivo cacheado | Redis/disco | Estático después del primer request | Sitios de alto tráfico con contenido estable |

## Lo que funciona

1. **Siempre escapa XML** — las URLs deben escapar XML para `&`, `<`, `>`, `"` y `'`. Un ampersand sin escapar en un query string rompe el parser del sitemap.
2. **Establece `lastmod` preciso** — usa la fecha real de modificación del contenido, no la fecha actual. Google ignora valores `lastmod` imprecisos y puede dejar de confiar en tu sitemap.
3. **Pagina antes de alcanzar límites** — comienza a generar un índice de sitemap cuando te acerques a 40.000 URLs para dejar margen de crecimiento. Cada sitemap referenciado debe estar bajo 50MB.
4. **Incluye solo URLs canónicas** — excluye variantes parametrizadas, IDs de sesión y páginas 404. Los sitemaps solo deben listar páginas canónicas e indexables.
5. **Envía a motores de búsqueda** — registra tu sitemap en Google Search Console y Bing Webmaster Tools. Para sitios muy grandes, usa la API de Search Console para enviar updates de sitemap programáticamente.

## Errores Comunes

1. Generar sitemaps con URLs `http://` cuando el sitio usa HTTPS — los motores de búsqueda tratan estos como sitios separados y pueden ignorar la versión HTTP.
2. Olvidar escapar XML en URLs con parámetros de query, causando errores de parser en crawlers de motores de búsqueda.
3. Listar páginas noindex o cadenas de redirección en el sitemap, desperdiciando presupuesto de crawl y confundiendo a los motores de búsqueda.
4. Usar la fecha actual para todos los valores `lastmod`, haciendo el atributo sin sentido y potencialmente ignorado por los crawlers.
5. Omitir el índice de sitemap para sitios con 100.000+ URLs, resultando en archivos de sitemap individuales que violan el límite de 50.000 URLs / 50MB.

## Preguntas Frecuentes

### ¿Con qué frecuencia debo regenerar el sitemap?

Para contenido que cambia diariamente, regenera al menos una vez al día. Para sitios estáticos, reconstruye el sitemap como parte de tu pipeline de deployment. Para sitios altamente en vivo (foros, marketplaces), genera on-demand con un cache corto (ej. 1 hora) para balancear frescura y performance.

### ¿Puedo incluir imágenes y videos en el sitemap?

Sí. Usa las extensiones de [Image Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps) y [Video Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps) de Google agregando elementos `<image:image>` y `<video:video>` dentro de cada `<url>`. Esto ayuda a Google a descubrir contenido multimedia que podría no estar enlazado vía HTML estándar.

### ¿Necesito un sitemap separado para cada idioma?

No necesariamente. Puedes incluir todas las variantes de idioma en un solo sitemap usando anotaciones `<xhtml:link rel="alternate" hreflang="...">`. Sin embargo, para sitios multi-idioma muy grandes, dividir por idioma puede hacer los sitemaps más manejables y permitir tracking de lastmod específico por idioma.
