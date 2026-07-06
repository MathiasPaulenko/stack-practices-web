---
contentType: recipes
slug: generate-pdfs
title: "Generar PDFs"
description: "Cómo generar documentos PDF programáticamente desde HTML, plantillas o datos crudos."
metaDescription: "Aprende a generar PDFs en Python, JavaScript y Java. Incluye HTML-to-PDF, plantillas, headers, footers y firmas digitales."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - java
  - io
  - streams
  - files
relatedResources:
  - /recipes/file-upload-validation
  - /recipes/send-emails-smtp
  - /recipes/read-write-file
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a generar PDFs en Python, JavaScript y Java. Incluye HTML-to-PDF, plantillas, headers, footers y firmas digitales."
  keywords:
    - generar pdf
    - pdf python
    - puppeteer pdf
    - plantillas pdf
    - weasyprint
---
## Visión General

La generación de PDFs es un requisito común para facturas, reportes, certificados y documentos legales. Las librerías modernas permiten crear PDFs desde plantillas HTML, lo que significa que tu equipo de diseño puede estilizar documentos con CSS mientras tu backend llena datos en vivo. Aqui se explica como los enfoques más confiables en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Necesites generar facturas, recibos o confirmaciones de orden. Consulta [Export CSV Excel](/recipes/file-handling/export-csv-excel) para exportación de datos tabulares.
- Los usuarios soliciten reportes o exports de analíticas descargables. Consulta [Background Jobs](/recipes/devops/background-jobs) para generación asíncrona de PDFs.
- Debas producir documentos legalmente compliant (contratos, certificados). Consulta [Email Templates MJML](/recipes/frontend/email-templates-mjml) para entrega profesional por email.
- Quieras reutilizar diseños HTML/CSS existentes para salida impresa. Consulta [Image Optimization](/recipes/file-handling/image-optimization) para optimización de imágenes embebidas.

## Solución

### Python (WeasyPrint)

```python
from weasyprint import HTML, CSS
from jinja2 import Template

html_template = """
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial; margin: 40px; }
  h1 { color: #333; }
  .total { font-weight: bold; font-size: 1.2em; }
</style></head>
<body>
  <h1>Factura #{{ invoice_id }}</h1>
  <p>Cliente: {{ customer }}</p>
  <p class="total">Total: ${{ total }}</p>
</body>
</html>
"""

def generate_invoice(invoice_id, customer, total):
    template = Template(html_template)
    html_out = template.render(invoice_id=invoice_id, customer=customer, total=total)
    HTML(string=html_out).write_pdf(f"invoice_{invoice_id}.pdf")

generate_invoice("12345", "Acme Corp", "1,250.00")
```

### JavaScript (Puppeteer)

```javascript
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");

const template = handlebars.compile(`
  <html>
  <head><style>
    body { font-family: Arial; margin: 40px; }
    h1 { color: #333; }
    .total { font-weight: bold; font-size: 1.2em; }
  </style></head>
  <body>
    <h1>Factura #{{invoiceId}}</h1>
    <p>Cliente: {{customer}}</p>
    <p class="total">Total: ${{total}}</p>
  </body>
  </html>
`);

async function generatePDF(data, outputPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const html = template(data);
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({ path: outputPath, format: "A4", printBackground: true });
  await browser.close();
}

generatePDF(
  { invoiceId: "12345", customer: "Acme Corp", total: "1,250.00" },
  "invoice_12345.pdf"
);
```

### Java (OpenPDF + Thymeleaf)

```java
import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.FileOutputStream;

public class PdfGenerator {
    public static void generate(String outputPath, String customer, String total) throws Exception {
        TemplateEngine engine = new TemplateEngine();
        Context ctx = new Context();
        ctx.setVariable("customer", customer);
        ctx.setVariable("total", total);
        String html = engine.process("invoice-template", ctx);

        Document document = new Document();
        PdfWriter.getInstance(document, new FileOutputStream(outputPath));
        document.open();
        document.add(new Paragraph("Factura para " + customer));
        document.add(new Paragraph("Total: " + total));
        document.close();
    }
}
```

## Explicación

Hay dos enfoques principales para generar PDFs:

1. **HTML-to-PDF**: Renderiza HTML+CSS a PDF (WeasyPrint, Puppeteer, wkhtmltopdf). Ideal para layouts complejos y reutilizar diseños web.
2. **API Nativa**: Construye PDFs programáticamente con librerías de bajo nivel (iText, OpenPDF, PDFBox). Ideal para control fino y archivos pequeños.

HTML-to-PDF es el enfoque dominante hoy porque separa presentación (CSS) de datos (variables de plantilla), permitiendo que no-desarrolladores ajusten diseños.

## Variantes

| Enfoque | Librería | Pros | Contras |
|---------|----------|------|---------|
| HTML-to-PDF | WeasyPrint | Puro Python, buen CSS | Sin JS, fuentes limitadas |
| HTML-to-PDF | Puppeteer | Motor Chrome completo | Pesado (~100 MB), más lento |
| HTML-to-PDF | Playwright | Moderno, mantenido | Peso similar a Puppeteer |
| API Nativa | iText / OpenPDF | Rápido, archivos pequeños | Código verboso, sin CSS |
| API Nativa | PDFBox | Licencia Apache, maduro | Complejo para docs simples |

## Lo que funciona

- **Usa plantillas HTML para layouts complejos**: Los diseñadores pueden editar CSS sin tocar código.
- **Incrusta fuentes**: Las fuentes del sistema varían entre SOs. Incrusta una web font para consistencia.
- **Configura márgenes y headers/footers**: Usa reglas CSS `@page` para layouts print-friendly.
- **Genera asíncronamente**: La creación de PDFs es intensiva en CPU. Usa una cola para batches grandes.
- **Valida input antes de renderizar**: Sanitiza HTML para prevenir ataques de inyección en plantillas.

## Errores Comunes

- **Usar headless Chrome para cada PDF individual**: El overhead de inicio es ~1s. Reusa instancias de navegador o usa un pool.
- **No incrustar imágenes como base64**: URLs de imágenes externas fallan cuando el PDF se ve offline.
- **Ignorar saltos de página**: Tablas largas se desbordan sin `page-break-inside: avoid`.
- **Hardcodear rutas**: Usa directorios temporales o streams, no `/tmp/output.pdf`.
- **Olvidar cerrar el navegador / documento**: Fuga memoria y handles de archivo.

## Preguntas Frecuentes

### Puedo generar un PDF desde un componente React/Vue?

Sí, con Puppeteer o Playwright. Renderiza el componente a HTML en el servidor (SSR), luego pasa el string HTML al motor de PDF. Algunos frameworks (Next.js) ofrecen APIs de exportación a PDF integradas.

### Cómo agrego firmas digitales a PDFs?

Usa iText (Java) o PyPDF2 + una librería crypto (Python). Necesitas un certificado X.509 y clave privada. Para producción, usa un hardware security module (HSM) o servicio de firma en la nube (AWS CloudHSM, Azure Key Vault).

### Por qué mi PDF es mucho más grande de lo esperado?

Las fuentes incrustadas y las imágenes sin comprimir son los culpables usuales. Usa font subsetting (solo glifos usados) y comprime imágenes antes de incrustar. WeasyPrint y Puppeteer soportan font subsetting.
