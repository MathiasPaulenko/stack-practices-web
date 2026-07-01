---
contentType: recipes
slug: python-excel-read-write
title: "Read and Write Excel Files with Python"
description: "How to read, write, and format Excel spreadsheets using openpyxl and pandas in Python."
metaDescription: "Read and write Excel files in Python with openpyxl and pandas. Create, format, and manipulate spreadsheets with practical code examples."
difficulty: intermediate
topics:
  - data
tags:
  - excel
  - python
  - openpyxl
  - pandas
  - data-processing
  - spreadsheets
relatedResources:
  - /recipes/parse-csv-python-pandas
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/generate-pdf-report-python
  - /recipes/merge-json-files
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Read and write Excel files in Python with openpyxl and pandas. Create, format, and manipulate spreadsheets with practical code examples."
  keywords:
    - excel
    - python
    - openpyxl
    - pandas
    - data-processing
    - spreadsheets
---
## Overview

Excel files (.xlsx) are everywhere in business. Python can read, write, and format them programmatically using openpyxl (cell-level control) and pandas (data-frame operations). This recipe covers both approaches for common tasks like reading sheets, writing data, applying formatting, and handling multi-sheet workbooks.

## When to Use

- You need to read data from Excel files exported by business tools
- You are generating Excel reports from a database or API
- You need to format cells (colors, borders, number formats) programmatically
- You are automating a workflow that involves multiple Excel sheets

## Solution

### Reading Excel with pandas

```python
import pandas as pd

# Read a single sheet
df = pd.read_excel("data.xlsx", sheet_name="Sheet1")
print(df.head())
print(df.columns)

# Read all sheets into a dict of DataFrames
sheets = pd.read_excel("data.xlsx", sheet_name=None)
for name, df in sheets.items():
    print(f"Sheet: {name}, rows: {len(df)}")
```

### Writing Excel with pandas

```python
import pandas as pd

df = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie"],
    "score": [85, 92, 78],
})

# Basic write
df.to_excel("output.xlsx", index=False, sheet_name="Results")

# Multiple sheets
with pd.ExcelWriter("report.xlsx") as writer:
    df.to_excel(writer, sheet_name="Summary", index=False)
    df[df["score"] > 80].to_excel(writer, sheet_name="High Scores", index=False)
```

### Cell-level control with openpyxl

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

wb = Workbook()
ws = wb.active
ws.title = "Report"

# Header row with styling
headers = ["Name", "Score", "Grade"]
header_fill = PatternFill(start_color="1a56db", end_color="1a56db", fill_type="solid")
header_font = Font(color="FFFFFF", bold=True)

for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center")

# Data rows
data = [("Alice", 85, "B"), ("Bob", 92, "A"), ("Charlie", 78, "C")]
for row_idx, (name, score, grade) in enumerate(data, 2):
    ws.cell(row=row_idx, column=1, value=name)
    ws.cell(row=row_idx, column=2, value=score)
    ws.cell(row=row_idx, column=3, value=grade)

# Auto-size columns
for col in ws.columns:
    max_length = max(len(str(cell.value or "")) for cell in col)
    ws.column_dimensions[col[0].column_letter].width = max_length + 2

wb.save("formatted_report.xlsx")
```

### Reading with openpyxl

```python
from openpyxl import load_workbook

wb = load_workbook("data.xlsx", data_only=True)  # data_only reads computed values
ws = wb["Sheet1"]

for row in ws.iter_rows(min_row=1, max_row=5, values_only=True):
    print(row)

# Access a specific cell
print(ws["A1"].value)
```

### Adding formulas

```python
from openpyxl import Workbook

wb = Workbook()
ws = wb.active

ws["A1"] = 10
ws["A2"] = 20
ws["A3"] = 30
ws["A4"] = "=SUM(A1:A3)"
ws["A5"] = "=AVERAGE(A1:A3)"

wb.save("formulas.xlsx")
```

## Explanation

pandas wraps openpyxl under the hood when reading and writing .xlsx files. Use pandas for data-centric operations (filtering, grouping, joining) and openpyxl when you need cell-level control (formatting, formulas, merged cells, charts).

Key differences:
- `pd.read_excel` returns a DataFrame. Good for analysis but loses formatting.
- `openpyxl.load_workbook` preserves formatting and gives you cell objects. Slower for large files.
- `pd.ExcelWriter` with `engine="openpyxl"` lets you write DataFrames while preserving an existing workbook's formatting.

## Variants

| Library | Level | Best For | Dependencies |
|---------|-------|----------|--------------|
| pandas | DataFrame | Data analysis, bulk read/write | `pandas`, `openpyxl` |
| openpyxl | Cell | Formatting, formulas, charts | `openpyxl` |
| xlsxwriter | Cell | Writing only, charts, conditional formatting | `xlsxwriter` |
| xlrd | Read-only | Legacy .xls files | `xlrd` |

## Guidelines

- Use pandas for reading and writing data. Use openpyxl for formatting and formulas.
- Always pass `index=False` to `to_excel` unless you need the index column.
- Use `data_only=True` with `load_workbook` to read computed values instead of formula strings.
- Set column widths explicitly. openpyxl does not auto-fit columns.
- Use `pd.ExcelWriter` context manager to write multiple sheets in one file.

## Common Mistakes

- Forgetting to install openpyxl. pandas needs it as an engine for .xlsx files.
- Using `openpyxl` for large files (10k+ rows). It is slow; use pandas for bulk operations.
- Not passing `data_only=True` when reading formulas. You get the formula string instead of the result.
- Overwriting an existing workbook with `to_excel`. It replaces the file; use `ExcelWriter` with `mode="a"` to append.
- Ignoring number formats. Excel may display dates and numbers differently than Python expects.

## Frequently Asked Questions

### How do I read a specific range of cells?

With openpyxl, use `ws.iter_rows(min_row=2, max_row=10, min_col=1, max_col=3, values_only=True)`. With pandas, use `usecols` and `skiprows` parameters.

### How do I add conditional formatting?

Use `openpyxl.formatting.rule` or `xlsxwriter`. For example, color scales and data bars are supported via `ColorScaleRule` and `DataBarRule`.

### How do I handle .xls (legacy) files?

Use `xlrd` for reading and `xlwt` for writing. pandas supports them with `engine="xlrd"` and `engine="xlwt"`. Note that xlrd dropped .xlsx support in version 2.0.

### Can I create charts in Excel with Python?

Yes. `openpyxl.chart` supports bar, line, and pie charts. `xlsxwriter` also supports charts with a similar API.
