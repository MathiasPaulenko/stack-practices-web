---
contentType: recipes
slug: generate-pdf-report-python
title: "Generate PDF Reports with Python"
description: "Create styled PDF documents from data using ReportLab and fpdf2 in Python."
metaDescription: "Generate PDF reports in Python with ReportLab and fpdf2. Create styled documents, tables, and charts from data with practical code examples."
difficulty: intermediate
topics:
  - data
tags:
  - pdf
  - python
  - reportlab
  - fpdf
  - data-processing
  - reports
relatedResources:
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/merge-json-files
  - /recipes/parse-csv-files
  - /recipes/parse-csv-python-pandas
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Generate PDF reports in Python with ReportLab and fpdf2. Create styled documents, tables, and charts from data with practical code examples."
  keywords:
    - pdf
    - python
    - reportlab
    - fpdf
    - data-processing
    - reports
---
## Overview

Generating PDF reports from data is a common requirement for invoices, analytics dashboards, and automated reporting. Python has two main libraries for this: ReportLab (full-featured, low-level control) and fpdf2 (lightweight, simpler API). This recipe covers both approaches with practical examples.

## When to Use

- You need to generate invoices, receipts, or financial reports
- You are building automated reporting pipelines (daily/weekly summaries)
- You need to export data tables with formatting to PDF
- You want to create printable certificates or documents from templates

## Solution

### Basic PDF with fpdf2

```python
from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Helvetica", size=12)

pdf.cell(200, 10, text="Sales Report", new_x="LMARGIN", new_y="NEXT", align="C")
pdf.ln(10)

pdf.cell(200, 10, text="Total Revenue: $15,430", new_x="LMARGIN", new_y="NEXT")
pdf.cell(200, 10, text="Orders: 247", new_x="LMARGIN", new_y="NEXT")

pdf.output("report.pdf")
```

### Styled PDF with ReportLab

```python
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib import colors

doc = SimpleDocTemplate("report.pdf", pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)

styles = getSampleStyleSheet()
title_style = ParagraphStyle("CustomTitle", parent=styles["Title"], fontSize=18, textColor=colors.HexColor("#1a56db"))
body_style = ParagraphStyle("CustomBody", parent=styles["Normal"], fontSize=10, leading=14)

elements = []
elements.append(Paragraph("Monthly Sales Report", title_style))
elements.append(Spacer(1, 0.5 * cm))
elements.append(Paragraph("Generated on 2026-07-01", body_style))
elements.append(Spacer(1, 1 * cm))

# Data table
data = [
    ["Region", "Orders", "Revenue"],
    ["North", "82", "$5,210"],
    ["South", "65", "$4,180"],
    ["East", "100", "$6,040"],
]

table = Table(data, colWidths=[5*cm, 3*cm, 4*cm])
table.setStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a56db")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 10),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
])
elements.append(table)

doc.build(elements)
```

### PDF from a pandas DataFrame

```python
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors

df = pd.read_csv("sales.csv")
df_summary = df.groupby("region")[["orders", "revenue"]].sum().reset_index()

# Convert DataFrame to list of lists for ReportLab
table_data = [df_summary.columns.tolist()] + df_summary.values.tolist()

doc = SimpleDocTemplate("sales_summary.pdf", pagesize=A4)
table = Table(table_data)
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a56db")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
]))
doc.build([table])
```

### Adding headers and footers

```python
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.units import cm

def add_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2 * cm, 1 * cm, "StackPractices Report")
    canvas.drawRightString(A4[0] - 2 * cm, 1 * cm, f"Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate("report.pdf", pagesize=A4)
doc.build([Paragraph("Content here", getSampleStyleSheet()["Normal"])], onFirstPage=add_header_footer, onLaterPages=add_header_footer)
```

## Explanation

fpdf2 is simpler and good for text-heavy documents without complex layouts. It uses a cell-based approach similar to writing text into a grid.

ReportLab uses a flowable-based system. You build a list of elements (Paragraphs, Tables, Spacers) and the engine handles page breaks, wrapping, and layout. This gives you more control but has a steeper learning curve.

For data-driven reports, the pattern is: load data with pandas, aggregate it, convert to a list of lists, and feed into a ReportLab Table. This lets you go from CSV to PDF in under 30 lines of code.

## Variants

| Library | Complexity | Best For | Dependencies |
|---------|-----------|----------|--------------|
| fpdf2 | Low | Simple text documents | `pip install fpdf2` |
| ReportLab | Medium | Tables, charts, styled reports | `pip install reportlab` |
| WeasyPrint | Medium | HTML/CSS to PDF | `pip install weasyprint` |
| matplotlib | High | Chart-only PDFs | `pip install matplotlib` |

## Guidelines

- Use fpdf2 for simple invoices or text reports. Less overhead, faster to write.
- Use ReportLab when you need tables, headers/footers, or multi-page layouts.
- Convert DataFrames to lists before passing to ReportLab Tables for clean rendering.
- Set explicit font sizes and margins. Default ReportLab margins are tight.
- Use `SimpleDocTemplate` for most cases. Only use `BaseDocTemplate` if you need custom page templates.

## Common Mistakes

- Forgetting to call `pdf.output()` or `doc.build()`. The file is not written until you do.
- Using fpdf2 for complex tables. It lacks table styling; switch to ReportLab.
- Not handling Unicode. fpdf2 needs `pdf.set_font("Helvetica")` and may need `pdf.add_page()` with encoding hints for non-Latin text.
- Hardcoding data instead of reading from a source. Build reports from data files or APIs.
- Ignoring page size. A4 and Letter have different dimensions; pick one explicitly.

## Frequently Asked Questions

### How do I add images to a PDF?

With ReportLab, use `from reportlab.platypus import Image` and add `Image("chart.png", width=15*cm, height=8*cm)` to your elements list.

### Can I generate PDFs from HTML in Python?

Yes. WeasyPrint converts HTML/CSS to PDF with good fidelity. It is heavier than fpdf2 but handles complex layouts well.

### How do I add page numbers?

Use the `onFirstPage` and `onLaterPages` callbacks in `doc.build()` as shown in the header/footer example above.

### How do I create a multi-column layout?

ReportLab supports frames and templates via `BaseDocTemplate`. Define multiple frames on a page and assign flowables to each. This is more complex but gives magazine-style layouts.
