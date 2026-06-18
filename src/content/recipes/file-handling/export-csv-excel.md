---
contentType: recipes
slug: export-csv-excel
title: "Export Data to CSV/Excel"
description: "How to export structured data to CSV and Excel files efficiently."
metaDescription: "Learn to export data to CSV and Excel in Python, JavaScript, and Java. Covers pandas, xlsx, Apache POI, and streaming large datasets."
difficulty: beginner
topics:
  - file-handling
tags:
  - csv
  - data
  - excel
  - export
  - file-handling
  - java
  - javascript
  - pandas
  - python
  - streaming
  - xlsx
relatedResources:
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/image-optimization
  - /recipes/read-write-file
  - /patterns/abstract-factory-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to export data to CSV and Excel in Python, JavaScript, and Java. Covers pandas, xlsx, Apache POI, and streaming large datasets."
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

Exporting data to CSV or Excel is a common requirement for admin dashboards, reporting tools, and data migration workflows. The challenge is handling large datasets (millions of rows) without running out of memory. This recipe covers memory-efficient CSV/Excel generation in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Users need to download reports or filtered data from a web app
- Migrating data between systems requires an intermediate file format
- Building an admin panel with bulk export functionality
- Processing data for external tools (spreadsheets, BI tools)

## Solution

### Python (pandas + openpyxl)

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

# Large dataset: streaming CSV with generator (memory-safe)
def generate_rows(cursor):
    for row in cursor:
        yield row

with open("export.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["id", "name", "email"])
    for row in generate_rows(db_cursor):
        writer.writerow(row)

# Excel with multiple sheets
with pd.ExcelWriter("report.xlsx", engine="openpyxl") as writer:
    df_users.to_excel(writer, sheet_name="Users", index=False)
    df_orders.to_excel(writer, sheet_name="Orders", index=False)
```

### JavaScript (fast-csv + xlsx)

```javascript
const { writeToStream } = require("fast-csv");
const XLSX = require("xlsx");

// Small dataset: in-memory CSV
const rows = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

writeToStream(process.stdout, rows, { headers: true });

// Large dataset: streaming to HTTP response
async function streamCsv(res, dbQuery) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=export.csv");
  const stream = dbQuery.stream();
  stream.pipe(csv.format({ headers: true })).pipe(res);
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

The key design decision is **memory vs. convenience**:

- **In-memory** (pandas, XLSX.js, Apache POI): Load all data, format it, write to disk. Simple and fast for datasets under ~100K rows. Risk: OutOfMemoryError for large datasets.
- **Streaming** (csv writer, fast-csv streaming, JDBC ResultSet): Process one row at a time, write directly to output. Constant memory usage regardless of dataset size. Slightly more code but essential for production.

For Excel specifically, `.xlsx` files are ZIP archives of XML. Libraries like `openpyxl` (Python) and Apache POI (Java) handle the complexity. For very large Excel files, consider SXSSF (streaming XSSF) in Apache POI or writing CSV instead.

## Variants

| Format | Library | Streaming? | Best For |
|--------|---------|------------|----------|
| CSV | Python `csv` | Yes | Universal, lightweight, any size |
| CSV | `fast-csv` (JS) | Yes | Node.js streaming exports |
| CSV | Apache Commons CSV | Yes | Java enterprise |
| Excel | `openpyxl` (Python) | No (use `write_only`) | Multi-sheet reports |
| Excel | `xlsx` (JS) | No | Client-side generation |
| Excel | Apache POI SXSSF | Yes | Large Excel files (>100K rows) |

## Best Practices

- **Stream for anything over 10K rows**: Holding millions of objects in memory will crash your server.
- **Set `Content-Disposition` headers**: Name the file meaningfully (`report-2024-01-users.csv`) so users know what they downloaded.
- **Use CSV for data interchange**: Excel is proprietary and slower. CSV opens in any spreadsheet tool.
- **Escape special characters**: CSV injection is real. Prefix cells starting with `=`, `+`, `-`, `@` with a tab or single quote to prevent formula execution.
- **Format dates and numbers explicitly**: Don't rely on default string representations. Use ISO 8601 for dates.

## Common Mistakes

- **Loading millions of rows into memory**: `SELECT * FROM huge_table` into a DataFrame will crash. Always paginate or stream.
- **Not handling BOM for Excel**: Excel on Windows needs a UTF-8 BOM (`\ufeff`) at the start of CSV files to display special characters correctly.
- **Ignoring CSV injection**: A malicious user named `=cmd|' /C calc'!A0` can execute formulas when the CSV is opened in Excel. Sanitize cell values.
- **Blocking the event loop**: In Node.js, generating large files synchronously blocks all requests. Use streams or offload to a worker.
- **Forgetting to close file handles**: In Java, not closing `Workbook` or `OutputStream` leaks memory and locks the file.

## Frequently Asked Questions

### How do I export a million rows without crashing?

Use **streaming**. In Python, write row-by-row with `csv.writer` instead of `pandas.to_csv`. In Java, use Apache POI's `SXSSFWorkbook` with a sliding window of rows kept in memory. In JavaScript, pipe a database cursor stream directly to the HTTP response.

### Should I export CSV or Excel?

**CSV** for raw data exchange, large files, or when users will import into another system. **Excel** when you need formatting, multiple sheets, formulas, or when non-technical users expect a "real spreadsheet." For most backend exports, CSV is simpler and safer.

### How do I handle special characters and encoding?

Always write UTF-8. Add a BOM (`\ufeff`) at the start of the file for Excel compatibility on Windows. Escape double quotes inside CSV fields by doubling them (`"He said ""hello"""`). For Excel, POI and openpyxl handle Unicode natively.
