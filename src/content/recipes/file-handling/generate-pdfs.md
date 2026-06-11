---
contentType: recipes
slug: generate-pdfs
title: "Generate PDFs"
description: "How to generate PDF documents programmatically from HTML, templates, or raw data."
metaDescription: "Learn to generate PDFs in Python, JavaScript, and Java. Includes HTML-to-PDF, templates, headers, footers, and digital signatures."
difficulty: intermediate
topics:
  - file-handling
tags:
  - pdf
  - reporting
  - html-to-pdf
  - templates
  - python
  - javascript
  - java
relatedResources:
  - /recipes/file-upload-validation
  - /recipes/send-emails-smtp
  - /recipes/read-write-file
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
lastUpdated: "2026-06-11"
author: "StackPractices"
seo:
  metaDescription: "Learn to generate PDFs in Python, JavaScript, and Java. Includes HTML-to-PDF, templates, headers, footers, and digital signatures."
  keywords:
    - pdf
    - reporting
    - html-to-pdf
    - templates
    - python
    - javascript
    - java
---
## Overview

PDF generation is a common requirement for invoices, reports, certificates, and legal documents. Modern libraries let you create PDFs from HTML templates, which means your design team can style documents with CSS while your backend fills in dynamic data. This recipe covers the most reliable approaches in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- You need to generate invoices, receipts, or order confirmations
- Users request downloadable reports or analytics exports
- You must produce legally compliant documents (contracts, certificates)
- You want to reuse existing HTML/CSS designs for print output

## Solution

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
  <h1>Invoice #{{ invoice_id }}</h1>
  <p>Customer: {{ customer }}</p>
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
    <h1>Invoice #{{invoiceId}}</h1>
    <p>Customer: {{customer}}</p>
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
        // Thymeleaf HTML template
        TemplateEngine engine = new TemplateEngine();
        Context ctx = new Context();
        ctx.setVariable("customer", customer);
        ctx.setVariable("total", total);
        String html = engine.process("invoice-template", ctx);

        // Convert HTML to PDF with OpenPDF + flying-saucer
        Document document = new Document();
        PdfWriter.getInstance(document, new FileOutputStream(outputPath));
        document.open();
        document.add(new Paragraph("Invoice for " + customer));
        document.add(new Paragraph("Total: " + total));
        document.close();
    }
}
```

## Explanation

There are two primary approaches to PDF generation:

1. **HTML-to-PDF**: Render HTML+CSS into PDF (WeasyPrint, Puppeteer, wkhtmltopdf). Best for complex layouts and reuse of web designs.
2. **Native API**: Build PDFs programmatically with low-level libraries (iText, OpenPDF, PDFBox). Best for fine-grained control and small file sizes.

HTML-to-PDF is the dominant approach today because it separates presentation (CSS) from data (template variables), enabling non-developers to tweak designs.

## Variants

| Approach | Library | Pros | Cons |
|----------|---------|------|------|
| HTML-to-PDF | WeasyPrint | Pure Python, good CSS | No JS, limited fonts |
| HTML-to-PDF | Puppeteer | Full Chrome engine | Heavy (~100 MB), slower |
| HTML-to-PDF | Playwright | Modern, maintained | Similar weight to Puppeteer |
| Native API | iText / OpenPDF | Fast, small files | Verbose code, no CSS |
| Native API | PDFBox | Apache license, mature | Complex for simple docs |

## Best Practices

- **Use HTML templates for complex layouts**: Designers can edit CSS without touching code.
- **Embed fonts**: System fonts vary across OSs. Embed a web font for consistency.
- **Set page margins and headers/footers**: Use `@page` CSS rules for print-friendly layouts.
- **Generate asynchronously**: PDF creation is CPU-intensive. Use a queue for large batches.
- **Validate input before rendering**: Sanitize HTML to prevent injection attacks in templates.

## Common Mistakes

- **Using headless Chrome for every single PDF**: Startup overhead is ~1s. Reuse browser instances or use a pool.
- **Not embedding images as base64**: External image URLs fail when the PDF is viewed offline.
- **Ignoring page breaks**: Long tables overflow awkwardly without `page-break-inside: avoid`.
- **Hardcoding paths**: Use temp directories or streams, not `/tmp/output.pdf`.
- **Forgetting to close the browser / document**: Leaks memory and file handles.

## Frequently Asked Questions

### Can I generate a PDF from a React/Vue component?

Yes, with Puppeteer or Playwright. Render the component to HTML on the server (SSR), then pass the HTML string to the PDF engine. Some frameworks (Next.js) offer built-in PDF export APIs.

### How do I add digital signatures to PDFs?

Use iText (Java) or PyPDF2 + a crypto library (Python). You need an X.509 certificate and private key. For production, use a hardware security module (HSM) or cloud signing service (AWS CloudHSM, Azure Key Vault).

### Why is my PDF much larger than expected?

Embedded fonts and uncompressed images are the usual culprits. Subset fonts (only include used glyphs) and compress images before embedding. WeasyPrint and Puppeteer both support font subsetting.
