---
contentType: recipes
slug: generate-pdf-report-python
title: "Generate PDF Reports in Python: ReportLab & fpdf2 Guide"
description: "Create styled PDF documents from data using ReportLab and fpdf2 in Python."
metaDescription: "Generate PDF reports in Python with ReportLab and fpdf2. Tables, charts, styled documents from pandas DataFrames, headers, footers, and batch generation."
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
lastUpdated: "2026-08-28"
publishedAt: "2026-07-01"
author: Mathias Paulenko
seo:
  metaDescription: "Generate PDF reports in Python with ReportLab and fpdf2. Tables, charts, styled documents from pandas DataFrames, headers, footers, and batch generation."
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

Most teams eventually need to turn data into a PDF. I have built invoices for a
payment processor, weekly sales summaries for a marketplace, and certificates for
an online course platform, and Python has been my default tool for all of them.
The two libraries I reach for are ReportLab and fpdf2.

fpdf2 is small, quick to learn, and ideal for the text-heavy documents I write
when I just need a page, some cells, and an output path. ReportLab is larger and more
powerful: it gives you a full layout engine with tables, paragraph styles,
images, headers, footers, and custom page templates. This recipe covers both
libraries with working examples you can run today.

## When to Use

Use these libraries when you need to:

- generate invoices, receipts, or financial reports from database rows;
- build automated reporting pipelines, such as daily or weekly summaries I send by
  email;
- export formatted data tables to PDF from a web dashboard or CLI tool;
- create printable certificates, labels, or documents from templates;
- produce batch reports for hundreds of customers without opening a word
  processor.

I used fpdf2 for a simple certificate generator and ReportLab for a multi-page
sales dashboard that needed styled tables and embedded charts. Picking the right
library for the job keeps the code small and the output predictable.

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

### Batch report generation

```python
import pandas as pd
from fpdf import FPDF

invoices = [
    {"customer": "Acme", "amount": 1200, "id": 101},
    {"customer": "Globex", "amount": 850, "id": 102},
    {"customer": "Soylent", "amount": 2300, "id": 103},
]

for inv in invoices:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    pdf.cell(200, 10, txt=f"Invoice #{inv['id']}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(10)
    pdf.cell(200, 10, txt=f"Customer: {inv['customer']}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(200, 10, txt=f"Amount: ${inv['amount']}", new_x="LMARGIN", new_y="NEXT")
    pdf.output(f"invoice_{inv['id']}.pdf")
```

## Explanation

The diagram below shows the typical flow I use when building a PDF report: start
with a data source, prepare and possibly aggregate it, pick a template or layout,
render the document, and write the file.

```mermaid
flowchart LR
    A[Data source: CSV, DB, API] --> B[pandas aggregation]
    B --> C[Template or layout]
    C --> D[fpdf2 or ReportLab render]
    D --> E[Output PDF]
```

fpdf2 works like a grid of cells. You add pages, set fonts, and place text by
specifying x and y positions. I find it perfect for simple documents, but it
doesn't handle automatic wrapping or multi-page tables well.

ReportLab uses a flowable-based system. You build a list of elements, such as
Paragraphs, Tables, Spacers, and Images, and the engine handles page breaks,
wrapping, and layout. That extra power also makes the learning curve steeper, so I reserve it for
reports that need tables, custom styles, or several pages.

For data-driven reports, the pattern is usually: load data with pandas, aggregate
it, convert it to a list of lists, and feed it into a ReportLab Table. If the
source data comes from a spreadsheet, see
[Python Excel Read Write](/recipes/python-excel-read-write/) for the extraction
step. For chart-heavy reports, render the chart with matplotlib and embed the
image into the PDF. For HTML-first reports, WeasyPrint renders the page directly.

## When Not to Use

- Don't use these libraries when the document must be collaboratively edited
  after generation. In that case, generate DOCX or keep the report in HTML.
- Don't use ReportLab for a one-page receipt with plain text. fpdf2 or even a
  simple HTML to PDF tool will be faster.
- Don't embed high-resolution photos without resizing them first. ReportLab and
  fpdf2 don't optimize images for PDF size; large PNGs can create multi-megabyte
  files.
- Don't use fpdf2 for complex table layouts. It's got no built-in table styling
  engine, and calculating row heights manually is error-prone.

## Variants

Choose the library by document complexity. For invoices or single-page text,
fpdf2 (`pip install fpdf2`) is usually enough. For tables, headers, footers, or
styled multi-page reports, pick ReportLab (`pip install reportlab`). To embed
charts rendered with matplotlib, combine the two (`pip install matplotlib
reportlab`). If the report is already built as HTML and CSS, WeasyPrint (`pip
install weasyprint`) renders it directly to PDF. For PDF forms with fillable
fields, use pikepdf or a dedicated forms library.

## Best Practices

- For simple invoices or text reports, fpdf2 is usually enough. It needs less code
  and fewer dependencies than ReportLab. I use it when the output is mostly
  labels and short paragraphs.
- Use ReportLab when you need tables, headers, footers, or multi-page layouts.
  I reach for it as soon as the report needs a styled header or alternating row
  colors.
- Convert DataFrames to lists before passing them to ReportLab Tables for clean
  rendering. ReportLab doesn't understand pandas objects natively.
- Set explicit font sizes and margins. I find the default ReportLab margins tight,
  and the default font can look too small for client-facing reports.
- Use `SimpleDocTemplate` for most cases. I only reach for `BaseDocTemplate` if I
  need custom page templates or multi-column layouts.
- Embed charts as images when you need visualizations. Rendering directly inside
  the PDF canvas is harder to maintain and easier to break when the data changes.
- Add page numbers and dates to client-facing reports. They make the document
  look finished and help the reader track versions.
- Test the generated PDF on the target platform. Fonts, page sizes, and image
  handling can differ between viewers.

## Common Mistakes

- Forgetting to call `pdf.output()` or `doc.build()`. Nothing is written until you
  do. I have spent more than one debugging session chasing a missing `build()`
  call.
- Using fpdf2 for complex tables. It lacks table styling; switch to ReportLab when
  rows need colors, borders, or automatic wrapping.
- Not handling Unicode. fpdf2 needs a font that contains the characters you use.
  For non-Latin text, load a TrueType font through `pdf.add_font()` and activate
  it with `pdf.set_font()`.
- Hardcoding data instead of reading from a source. I build reports from data files
  or APIs so the same script works tomorrow.
- Ignoring page size. A4 and Letter have different dimensions; pick one
  explicitly and test with real printers.
- Forgetting to close or seek the matplotlib buffer before embedding the image.
  Save to a file or a BytesIO, then rewind it before passing it to ReportLab.
- Including raw HTML strings in fpdf2 output. It doesn't interpret HTML; use
  `pdf.write_html()` only in the limited mode that fpdf2 supports.
- Generating reports without a timestamp or version. A stale PDF can lead to arguments about which data version it reflects.

## FAQ

### How do I add images to a PDF?

In ReportLab, import `Image` and append `Image("chart.png", width=15*cm,
height=8*cm)` to your elements list. In fpdf2, call `pdf.image("chart.png",
x=10, y=20, w=100)` to place the image. I always resize images before embedding; ReportLab doesn't optimize them for PDF size.

### Can I generate PDFs from HTML in Python?

Yes. WeasyPrint converts HTML and CSS to PDF with good fidelity. It's bigger
than fpdf2 but handles complex layouts well. I use it when the report already
exists as a styled web page.

### How do I add page numbers?

Use the `onFirstPage` and `onLaterPages` callbacks in `doc.build()`, as shown in
the header-and-footer example above. The `doc.page` attribute gives you the
number for the footer.

### How do I create a multi-column layout?

ReportLab supports frames and templates through `BaseDocTemplate`. Define two or
more frames on a page and assign flowables to each. I only needed this once, for a product catalog.

### Can I use a custom font with fpdf2?

Yes. Download a TTF file, call `pdf.add_font("DejaVu", "", "DejaVuSans.ttf")`,
then `pdf.set_font("DejaVu", size=12)`. This is the simplest way I've found to support Unicode and non-Latin scripts. I keep a folder of TTFs in my project templates.

### How do I repeat a header on every page?

Use a `PageTemplate` with a `Frame` and draw the header in the `onPage` callback
of `doc.build()`. Alternatively, use `SimpleDocTemplate` with `onFirstPage` and
`onLaterPages` as a lightweight solution.

### What is the easiest way to batch-generate hundreds of PDFs?

Load the data with pandas, loop over the rows, and render one PDF per record
with fpdf2 or a pre-defined ReportLab template. I usually render to a temporary
folder, then zip the results or attach them to an email.

## Key Takeaways

- fpdf2 is my first choice for simple, text-heavy PDFs with minimal layout.
- ReportLab is what I use once a report needs tables, headers, footers, or
  several pages with custom styles.
- I combine pandas, matplotlib, and WeasyPrint depending on whether the input is
  data, charts, or existing HTML.
- Always set explicit fonts, page sizes, and margins before sending a PDF to
  clients.
- Unicode handling and image sizing are the two issues that surprise me most
  often.
- Call `pdf.output()` or `doc.build()` last, and always include a timestamp or
  version.

## See Also

- [fpdf2 Documentation](https://py-pdf.github.io/fpdf2/): official docs for the
  fpdf2 library.
- [ReportLab User Guide](https://www.reportlab.com/docs/reportlab-userguide.pdf):
  the full ReportLab reference.
- [pandas to_html](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_html.html):
  an alternative route for HTML-first PDFs.
- [matplotlib savefig](https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.savefig.html):
  how to render charts for embedding.
- [WeasyPrint](https://weasyprint.org/): HTML and CSS to PDF converter.
- [Python Excel Read Write](/recipes/python-excel-read-write/): how to read
  spreadsheet data before turning it into a PDF.
- [Parse CSV with pandas](/recipes/parse-csv-python-pandas/): prepare data for
  ReportLab tables.
