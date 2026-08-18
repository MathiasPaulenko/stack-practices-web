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
  - fpdf2
  - data-processing
  - report
  - pandas
relatedResources:
  - /recipes/parse-csv-python-pandas
  - /recipes/python-excel-read-write
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/python-generate-qr-code
  - /recipes/parse-csv-files
lastUpdated: "2026-08-18"
publishedAt: "2026-07-01"
author: Mathias Paulenko
seo:
  metaDescription: "Generate PDF reports in Python with ReportLab and fpdf2. Create styled documents, tables, and charts from data with practical code examples."
  keywords:
    - pdf
    - python
    - reportlab
    - fpdf2
    - data-processing
    - reports
    - pandas
---

## Overview

Most teams eventually need to turn data into a PDF: an invoice, a weekly sales
summary, or a certificate. Python handles this well with two main libraries:
ReportLab, which gives full control over layout, and fpdf2, which is lighter and
faster to get started. This recipe covers both with working examples.

## When to Use

Reach for these libraries when you need to generate invoices, receipts, or
financial reports; build automated reporting pipelines such as daily or weekly
summaries; export formatted data tables to PDF; or create printable certificates
and documents from templates.

## Solution

### Basic PDF with fpdf2

```python
from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Helvetica", size=12)

pdf.cell(200, 10, txt="Sales Report", new_x="LMARGIN", new_y="NEXT", align="C")
pdf.ln(10)

pdf.cell(200, 10, txt="Total Revenue: $15,430", new_x="LMARGIN", new_y="NEXT")
pdf.cell(200, 10, txt="Orders: 247", new_x="LMARGIN", new_y="NEXT")

pdf.output("report.pdf")
```

### Styled PDF with ReportLab

```python
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib import colors

doc = SimpleDocTemplate(
    "report.pdf",
    pagesize=A4,
    topMargin=2 * cm,
    bottomMargin=2 * cm
)

styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    "CustomTitle",
    parent=styles["Title"],
    fontSize=18,
    textColor=colors.HexColor("#1a56db")
)
body_style = ParagraphStyle(
    "CustomBody",
    parent=styles["Normal"],
    fontSize=10,
    leading=14
)

elements = [
    Paragraph("Monthly Sales Report", title_style),
    Spacer(1, 0.5 * cm),
    Paragraph("Generated on 2026-07-01", body_style),
    Spacer(1, 1 * cm),
]

data = [
    ["Region", "Orders", "Revenue"],
    ["North", "82", "$5,210"],
    ["South", "65", "$4,180"],
    ["East", "100", "$6,040"],
]

table = Table(data, colWidths=[5 * cm, 3 * cm, 4 * cm])
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

# Convert DataFrame to a list of lists for ReportLab
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
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm

def add_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2 * cm, 1 * cm, "StackPractices Report")
    canvas.drawRightString(
        A4[0] - 2 * cm,
        1 * cm,
        f"Page {doc.page}"
    )
    canvas.restoreState()

doc = SimpleDocTemplate("report.pdf", pagesize=A4)
content = Paragraph("Content here", getSampleStyleSheet()["Normal"])
doc.build(
    [content],
    onFirstPage=add_header_footer,
    onLaterPages=add_header_footer
)
```

### Adding a chart

```python
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Image, Spacer
from reportlab.lib.units import cm

# Render the chart to a PNG file
fig, ax = plt.subplots(figsize=(6, 3))
ax.bar(["North", "South", "East"], [5210, 4180, 6040])
ax.set_title("Revenue by Region")
fig.savefig("chart.png", format="png", bbox_inches="tight")
plt.close(fig)

doc = SimpleDocTemplate("report_with_chart.pdf", pagesize=A4)
img = Image("chart.png", width=15 * cm, height=7 * cm)
doc.build([img, Spacer(1, 1 * cm)])
```

## Explanation

fpdf2 is smaller and fits text-heavy documents without complex layouts. It lays
out content through cells, similar to writing text into a grid.

ReportLab uses a flowable-based system. You build a list of elements —
Paragraphs, Tables, Spacers, Images — and the engine takes care of page breaks,
wrapping, and layout. That extra power also makes the learning curve steeper.

For data-driven reports, the pattern is usually: load data with pandas,
aggregate it, convert it to a list of lists, and feed it into a ReportLab Table.
If the source data comes from a spreadsheet, see
[Python Excel Read Write](/recipes/python-excel-read-write/) for the extraction
step. For chart-heavy reports, render the chart with matplotlib and embed the
image into the PDF.

## Variants

Choose the library by document complexity. For invoices or single-page text,
fpdf2 (`pip install fpdf2`) is usually enough. For tables, headers, footers, or
styled multi-page reports, pick ReportLab (`pip install reportlab`). To embed
charts rendered with matplotlib, combine the two (`pip install matplotlib
reportlab`). If the report is already built as HTML and CSS, WeasyPrint (`pip
install weasyprint`) renders it directly to PDF.

## Best Practices

- For simple invoices or text reports, fpdf2 is usually enough. It needs less code
  and fewer dependencies than ReportLab.
- Use ReportLab when you need tables, headers, footers, or multi-page layouts.
- Convert DataFrames to lists before passing them to ReportLab Tables for clean
  rendering.
- Set explicit font sizes and margins. Default ReportLab margins are tight.
- Use `SimpleDocTemplate` for most cases. Only reach for `BaseDocTemplate` if
  you need custom page templates.
- Embed charts as images when you need visualizations; rendering directly inside
  the PDF canvas is harder to maintain.

## Common Mistakes

- Forgetting to call `pdf.output()` or `doc.build()`. Nothing is written until
  you do.
- Using fpdf2 for complex tables. It lacks table styling; switch to ReportLab.
- Not handling Unicode. fpdf2 needs a font that actually contains the characters you use.
  For non-Latin text, load a TrueType font through `pdf.add_font()` and activate
  it with `pdf.set_font()`.
- Hardcoding data instead of reading from a source. Build reports from data
  files or APIs.
- Ignoring page size. A4 and Letter have different dimensions; pick one
  explicitly.
- Forgetting to close or seek the matplotlib buffer before embedding the image.

## FAQ

### How do I add images to a PDF?

In ReportLab, import `Image` and append `Image("chart.png", width=15*cm,
height=8*cm)` to your elements list. In fpdf2, call `pdf.image("chart.png",
x=10, y=20, w=100)` to place the image.

### Can I generate PDFs from HTML in Python?

Yes. WeasyPrint converts HTML and CSS to PDF with good fidelity. It's bigger
than fpdf2 but handles complex layouts well.

### How do I add page numbers?

Use the `onFirstPage` and `onLaterPages` callbacks in `doc.build()`, as shown in
the header-and-footer example above.

### How do I create a multi-column layout?

ReportLab supports frames and templates through `BaseDocTemplate`. Define two or
more frames on a page and assign flowables to each. This is more complex but
gives magazine-style layouts.

### Can I use a custom font with fpdf2?

Yes. Download a TTF file, call `pdf.add_font("DejaVu", "", "DejaVuSans.ttf")`,
 then `pdf.set_font("DejaVu", size=12)`. This is the simplest way to support
Unicode and non-Latin scripts.

### How do I repeat a header on every page?

Use a `PageTemplate` with a `Frame` and draw the header in the `onPage` callback
of `doc.build()`. Alternatively, use `SimpleDocTemplate` with `onFirstPage` and
`onLaterPages` as a lightweight solution.
