---
contentType: recipes
slug: parse-pdf-files
title: "Parse PDF Files"
description: "How to extract text and metadata from PDF files in Python, Java, and JavaScript."
metaDescription: "Learn how to parse PDF files in Python, Java, and JavaScript. Extract text, metadata, and tables with practical code examples."
difficulty: beginner
topics:
  - data
tags:
  - pdf
  - parsing
  - extraction
  - text
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-csv-files
  - /recipes/data/parse-excel-files
  - /recipes/data/parse-xml-files
  - /recipes/data/convert-json-to-csv
  - /recipes/data/serialize-deserialize-data
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to parse PDF files in Python, Java, and JavaScript. Extract text, metadata, and tables with practical code examples."
  keywords:
    - pdf
    - parsing
    - extraction
    - text
    - python
    - javascript
    - java
---
## Overview

PDFs are the de facto standard for document exchange but are notoriously difficult to parse programmatically. Extracting text, tables, and metadata from PDFs enables automated document processing, invoice parsing, resume screening, and compliance auditing. This recipe covers text extraction and metadata retrieval across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Ingesting invoices, receipts, or forms received as PDF attachments
- Building search indexes over a corpus of PDF documents
- Extracting tabular data from financial reports or research papers
- Converting PDF content into structured formats for downstream ML pipelines

## Solution

### Python

```python
# PyPDF2 for text extraction and metadata
# pip install PyPDF2
import PyPDF2

with open('document.pdf', 'rb') as f:
    reader = PyPDF2.PdfReader(f)
    print(f"Pages: {len(reader.pages)}")
    for page in reader.pages:
        print(page.extract_text())
```

```python
# pdfplumber for tables and structured extraction
# pip install pdfplumber
import pdfplumber

with pdfplumber.open('document.pdf') as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            print(table)
```

### JavaScript

```javascript
// pdf-parse extracts text from PDF buffers
// npm install pdf-parse
import pdfParse from 'pdf-parse';
import fs from 'fs';

const dataBuffer = fs.readFileSync('document.pdf');
const data = await pdfParse(dataBuffer);
console.log(data.text);
console.log(`Pages: ${data.numpages}`);
```

```javascript
// pdf-lib for reading metadata and modifying PDFs
// npm install pdf-lib
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

const existingPdfBytes = fs.readFileSync('document.pdf');
const pdfDoc = await PDFDocument.load(existingPdfBytes);
console.log(`Pages: ${pdfDoc.getPageCount()}`);
```

### Java

```java
// Apache PDFBox is the standard for PDF in Java
// Maven: org.apache.pdfbox:pdfbox
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

public class PdfParser {
    public static void main(String[] args) throws Exception {
        try (PDDocument doc = PDDocument.load(new java.io.File("document.pdf"))) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(doc);
            System.out.println(text);
            System.out.println("Pages: " + doc.getNumberOfPages());
        }
    }
}
```

## Explanation

PDF is a page-description language where text is positioned absolutely via coordinate systems. Unlike markup formats, PDFs do not guarantee reading order or semantic structure. Extracted text may appear jumbled if the content stream stores words in an order optimized for rendering rather than reading.

`PyPDF2` provides basic text extraction and metadata access. `pdfplumber` extends this with table detection using horizontal and vertical ruling lines. `pdf-parse` (JS) is a thin wrapper around Mozilla's PDF.js. Apache PDFBox (Java) offers low-level access to PDF objects, fonts, and streams for custom extraction logic.

## Variants

| Technology | Library | Approach | Notes |
|------------|---------|----------|-------|
| Python | `PyPDF2` | `extract_text()` | Simple text extraction, lightweight |
| Python | `pdfplumber` | `extract_tables()` | Best for table extraction, built on pdfminer |
| Python | `pymupdf` (fitz) | `get_text()` | Fast C-based engine, supports images and annotations |
| JavaScript | `pdf-parse` | `pdfParse(buffer)` | Async wrapper around PDF.js |
| JavaScript | `pdf-lib` | `PDFDocument.load()` | Read/write/modify PDFs, not just extract |
| Java | `Apache PDFBox` | `PDFTextStripper` | Enterprise standard, supports form filling and signing |

## What Works

- **Prefer `pdfplumber` or `pymupdf` for tables**: PyPDF2 cannot detect tabular structures
- **Validate extracted text quality**: Run a sampling check because extraction accuracy varies by PDF generator
- **Handle password-protected PDFs**: Check `is_encrypted` before extraction and decrypt with the owner password
- **Use `with` statements or try-with-resources**: PDF parsers hold file locks and memory buffers
- **Cache extracted text**: For repeated access, store extracted content in a database or search index

## Common Mistakes

- **Expecting perfect extraction from scanned PDFs**: Image-based PDFs require OCR (Tesseract, AWS Textract) before text extraction
- **Not handling missing fonts**: Substituted fonts may cause garbled Unicode output
- **Assuming reading order matches visual order**: Multi-column layouts often extract out of sequence
- **Extracting images as text**: Some PDFs embed images of text that appear as blank or garbled characters
- **Ignoring metadata**: Document properties (author, creation date) are valuable for indexing and auditing

## Frequently Asked Questions

### How do I extract tables from PDFs accurately?

Use `pdfplumber` in Python with `page.extract_tables()` which uses line detection heuristics. For complex layouts, manually define vertical and horizontal ruling lines with `page.debug_tablefinder()`. In Java, PDFBox has `SpreadsheetExtractionAlgorithm` as part of Tabula integration.

### Can I parse PDFs in the browser?

Yes. Mozilla's PDF.js runs in the browser and can render pages to canvas and extract text. `pdf-lib` also works in browsers for reading and modifying PDFs. For large-scale processing, offload parsing to a Web Worker to avoid blocking the UI thread.

### How do I handle scanned PDFs that contain no text layer?

Run OCR first. Use `pytesseract` + `pdf2image` in Python, or Tesseract.js in the browser, to convert image pages into searchable PDFs. Cloud alternatives include AWS Textract, Google Document AI, and Azure Form Recognizer for higher accuracy on forms and invoices.
