---
contentType: recipes
slug: export-csv-excel
title: "Export Data to CSV and Excel Files"
description: "How to export structured data to CSV and Excel files efficiently."
metaDescription: "Learn to export data to CSV and Excel in Python, JavaScript, and Java. Covers pandas, xlsx, Apache POI, and streaming for large datasets."
difficulty: beginner
topics:
  - file-handling
  - data
tags:
  - file-handling
  - csv
  - excel
  - data
  - python
  - javascript
  - java
  - export
  - streaming
relatedResources:
  - /recipes/import-csv-excel
  - /recipes/parse-csv-files
  - /recipes/file-upload-validation
  - /recipes/background-jobs
  - /recipes/stream-processing
  - /recipes/read-write-file
lastUpdated: "2026-08-19"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Learn to export data to CSV and Excel in Python, JavaScript, and Java. Covers pandas, xlsx, Apache POI, and streaming for large datasets."
  keywords:
    - csv
    - excel
    - export
    - data
    - pandas
    - xlsx
    - streaming
    - python
    - javascript
    - java
---

## Overview

Exporting to CSV or Excel is something almost every admin dashboard or reporting
tool needs. The tricky part is handling large datasets without running out of
memory. This recipe covers memory-efficient CSV/Excel generation in Python,
JavaScript, and Java.

## When to Use

- Users need to download reports or filtered data from a web app.
- Migrating data between systems requires an intermediate file format.
- Building an admin panel with bulk export functionality.
- You're processing data for spreadsheets, BI tools, or other external apps.

### When to avoid

- You need a real-time API response. Streaming files blocks or complicates the
  request.
- The dataset fits in memory and you only need a one-off export. A simple script
  is all you need.
- You need a formatted report with charts and visuals. Use a reporting library
  instead.

## Solution

### Python (pandas and csv)

```python
import csv
import pandas as pd

# Small dataset: pandas to CSV
users = [
    {"id": 1, "name": "Alice", "email": "alice@example.com"},
    {"id": 2, "name": "Bob", "email": "bob@example.com"},
]
df = pd.DataFrame(users)
df.to_csv("users.csv", index=False)

# Large dataset: streaming CSV with a generator
def generate_rows(cursor):
    for row in cursor:
        yield row

with open("export.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["id", "name", "email"])
    for row in generate_rows(db_cursor):
        writer.writerow(row)

# Excel with multiple sheets
with pd.ExcelWriter("report.xlsx", engine="openpyxl") as writer:
    df.to_excel(writer, sheet_name="Users", index=False)
```

### JavaScript (fast-csv and xlsx)

```javascript
const { format } = require("fast-csv");
const XLSX = require("xlsx");

const rows = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

// Small dataset: in-memory CSV
format.write(rows, { headers: true }).pipe(process.stdout);

// Large dataset: streaming to HTTP response
async function streamCsv(res, dbQuery) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=export.csv");
  const stream = dbQuery.stream();
  stream.pipe(format({ headers: true })).pipe(res);
}

// Excel generation
const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Users");
XLSX.writeFile(wb, "users.xlsx");
```

### Java (Apache Commons CSV + Apache POI)

```java
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.*;
import java.nio.file.*;

public class Exporter {

    public void exportCsv(Iterable<Iterable<String>> rows, Path path) throws IOException {
        try (BufferedWriter writer = Files.newBufferedWriter(path);
             CSVPrinter printer = new CSVPrinter(writer, CSVFormat.DEFAULT.withHeader("id", "name", "email"))) {
            for (Iterable<String> row : rows) {
                printer.printRecord(row);
            }
        }
    }

    public void exportExcel(Iterable<Iterable<String>> rows, Path path) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Users");
            int rowNum = 0;
            for (Iterable<String> rowData : rows) {
                Row row = sheet.createRow(rowNum++);
                int colNum = 0;
                for (String cellData : rowData) {
                    row.createCell(colNum++).setCellValue(cellData);
                }
            }
            workbook.write(Files.newOutputStream(path));
        }
    }
}
```

## Explanation

The core trade-off is **memory vs. convenience**:

| Approach | How it works | Best for |
| --- | --- | --- |
| **In-memory** | Load all data, format it, write to disk | Datasets under ~100K rows |
| **Streaming** | Process one row at a time and write directly | Large or unbounded datasets |

CSV is plain text and easy to stream. Excel `.xlsx` files are ZIP archives of
XML, so libraries like `openpyxl` and Apache POI build them in memory or with a
sliding window. For very large Excel files, use Apache POI `SXSSF` or write CSV
and let users open it in Excel.

## Variants

| Format | Library | Streaming | Best For |
| --- | --- | --- | --- |
| CSV | Python `csv` | Yes | Universal, lightweight, any size |
| CSV | `fast-csv` (JS) | Yes | Node.js streaming exports |
| CSV | Apache Commons CSV | Yes | Java enterprise |
| Excel | `openpyxl` (Python) | Partial (`write_only`) | Multi-sheet reports |
| Excel | `xlsx` (JS) | No | Client-side generation |
| Excel | Apache POI SXSSF | Yes | Large Excel files (>100K rows) |

## Best Practices

- Stream anything over 10K rows. Holding millions of objects in memory will
  crash the server.
- Set a meaningful filename in `Content-Disposition`, like
  `report-2024-01-users.csv`.
- Pick CSV when you need data interchange. Excel is proprietary and slower.
- Sanitize cells that start with `=`, `+`, `-`, or `@` to prevent CSV
  injection. Prefix them with a tab or a single quote.
- Format dates and numbers explicitly. Use ISO 8601 for date values.
- Add a UTF-8 BOM (`\ufeff`) at the start of CSV files for Excel on Windows.
- Close file handles and dispose of `SXSSFWorkbook` temp files in Java.

## Common Mistakes

- Loading millions of rows into memory at once. `SELECT * FROM huge_table` into
  a DataFrame will crash. Stream or paginate instead.
- Forgetting a BOM for Excel on Windows. Special characters may look wrong.
- Ignoring CSV injection. A value like `=cmd|' /C calc'!A0` may run a formula
  in Excel.
- Blocking the Node.js event loop. Generate large files asynchronously or in a
  worker.
- Not closing `Workbook` or `OutputStream` handles in Java, which leaks memory
  and locks files.

## FAQ

### How do I export a million rows without crashing?

Use streaming. In Python, write one row at a time with `csv.writer`. In Java,
use Apache POI `SXSSFWorkbook` with a sliding window. In JavaScript, pipe a
database cursor stream directly to the HTTP response.

### Should I export CSV or Excel?

Use CSV for raw data exchange, large files, or when users will import the data
into another system. Use Excel when you need formatting, several sheets,
formulas, or non-technical users expect a spreadsheet.

### How do I handle special characters and encoding?

Always write UTF-8. Add a BOM (`\ufeff`) at the start for Excel on Windows.
Double any double quotes inside CSV fields. For Excel, `openpyxl` and POI
handle Unicode natively.

### How do I export multiple CSV files as a ZIP?

```python
import zipfile
import csv
import io

def export_csv_zip(datasets, output_path):
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, rows in datasets.items():
            buffer = io.StringIO()
            if rows:
                writer = csv.DictWriter(buffer, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
            zf.writestr(f"{filename}.csv", buffer.getvalue())
```

### How do I export to Excel with formulas?

Use `openpyxl` (Python) or Apache POI (Java) to write formula strings directly
into cells. In Python:

```python
from openpyxl import Workbook

wb = Workbook()
ws = wb.active
ws["A1"] = 10
ws["A2"] = 20
ws["A3"] = "=SUM(A1:A2)"
wb.calculation.calcMode = "auto"
wb.save("formulas.xlsx")
```

### What are the performance characteristics?

Python `csv.writer` with a cursor: ~50K-100K rows/second and constant memory.
pandas `to_csv`: ~200K rows/second but needs all data in RAM. Apache POI
`SXSSFWorkbook`: ~10K rows/second and ~50 MB constant memory. `fast-csv` in
Node.js: ~100K rows/second and ~20 MB constant memory. CSV files are usually
3-4x smaller than XLSX.
