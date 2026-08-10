---

contentType: recipes
slug: import-csv-excel
title: "Import Data from CSV/Excel"
description: "How to parse and import data from CSV and Excel files with validation."
metaDescription: "Learn to import data from CSV and Excel in Python, JavaScript, and Java. Covers pandas, csv-parser, Apache POI, and validation strategies."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - csv
  - io
  - streams
  - files
relatedResources:
  - /recipes/export-csv-excel
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/image-optimization
  - /recipes/input-validation
  - /recipes/stream-processing
lastUpdated: "2026-06-11"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Learn to import data from CSV and Excel in Python, JavaScript, and Java. Covers pandas, csv-parser, Apache POI, and validation strategies."
  keywords:
    - csv
    - excel
    - import
    - parse
    - validation
    - pandas
    - python
    - javascript
    - java

---
## Overview

Importing data from CSV or Excel is a staple of admin panels, data migration tools, and bulk-update capabilities. The challenge is not just parsing the file, but validating every row, handling malformed data gracefully, and importing large files without blocking the server. Below is a practical approach to reliable CSV/Excel import in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Users upload spreadsheets to bulk-create or bulk-update records. See [File Upload Validation](/recipes/file-upload-validation/) for secure upload handling.
- Migrating data from legacy systems or external vendors. See [Export CSV Excel](/recipes/export-csv-excel/) for the reverse migration workflow.
- Building ETL pipelines that process scheduled file drops. See [Stream Processing](/recipes/stream-processing/) for memory-efficient pipelines.
- Admin panels need a "upload and import" capability. See [Background Jobs](/recipes/background-jobs/) for async import processing.

## Solution

### Python (pandas + csv)

```python
import csv
import pandas as pd
from pydantic import BaseModel, ValidationError

# Streaming CSV import with validation
class UserImport(BaseModel):
    name: str
    email: str
    age: int

def import_users_csv(file_path):
    valid, errors = [], []
    with open(file_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            try:
                user = UserImport(name=row["name"], email=row["email"], age=int(row["age"]))
                valid.append(user.dict())
            except (ValueError, KeyError, ValidationError) as e:
                errors.append({"row": row_num, "error": str(e)})
    return valid, errors

# Excel import with pandas
def import_users_excel(file_path):
    df = pd.read_excel(file_path, sheet_name="Users")
    df = df.dropna()  # Remove empty rows
    records = df.to_dict("records")
    return records
```

### JavaScript (csv-parser + xlsx)

```javascript
const csv = require("csv-parser");
const fs = require("fs");
const XLSX = require("xlsx");

function importCsv(filePath) {
  return new Promise((resolve, reject) => {
    const valid = [], errors = [];
    let rowNum = 1;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        rowNum++;
        if (!row.name || !row.email) {
          errors.push({ row: rowNum, error: "Missing required field" });
        } else {
          valid.push(row);
        }
      })
      .on("end", () => resolve({ valid, errors }))
      .on("error", reject);
  });
}

function importExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
}
```

### Java (Apache Commons CSV + Apache POI)

```java
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.*;
import java.nio.file.*;
import java.util.*;

public class Importer {

    public List<Map<String, String>> importCsv(Path path) throws IOException {
        List<Map<String, String>> rows = new ArrayList<>();
        try (Reader reader = Files.newBufferedReader(path);
             CSVParser parser = new CSVParser(reader, CSVFormat.DEFAULT.withFirstRecordAsHeader())) {
            for (CSVRecord record : parser) {
                Map<String, String> row = new HashMap<>();
                record.toMap().forEach(row::put);
                rows.add(row);
            }
        }
        return rows;
    }

    public List<Map<String, String>> importExcel(Path path) throws IOException {
        List<Map<String, String>> rows = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(Files.newInputStream(path))) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                headers.add(cell.getStringCellValue());
            }
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                Map<String, String> map = new HashMap<>();
                for (int j = 0; j < headers.size(); j++) {
                    Cell cell = row.getCell(j);
                    map.put(headers.get(j), cell != null ? cell.toString() : "");
                }
                rows.add(map);
            }
        }
        return rows;
    }
}
```

## Explanation

Importing is harder than exporting because **you don't control the input**. Users will upload files with:
- Missing headers or renamed columns
- Wrong data types (text in a numeric column)
- Extra blank rows or columns
- Wrong encoding (Windows-1252 instead of UTF-8)

The reliable pattern is:
1. **Parse**: Read the file row by row (streaming for large files)
2. **Validate**: Check each row against a schema (required fields, data types, ranges)
3. **Collect errors**: Don't fail on the first bad row; collect all errors and report them
4. **Insert in batches**: For database imports, insert in chunks of 1,000 rows inside a transaction

## Variants

| Format | Library | Streaming? | Best For |
|--------|---------|------------|----------|
| CSV | Python `csv` | Yes | Small to medium files with custom validation |
| CSV | `csv-parser` (JS) | Yes | Node.js streaming pipeline |
| CSV | Apache Commons CSV | Yes | Java enterprise parsing |
| Excel | `pandas.read_excel` | No | Quick imports, data exploration |
| Excel | `xlsx` (JS) | No | Client-side or small server imports |
| Excel | Apache POI | Yes (event model) | Very large Excel files |

## What Works

- **Validate before inserting**: Never trust user-uploaded files. Validate every cell against expected types and ranges.
- **Report all errors, not just the first**: Users need to fix everything at once, not trial-and-error one row at a time.
- **Use transactions for database imports**: If any row fails validation, roll back the entire batch to avoid partial imports.
- **Support multiple encodings**: Try UTF-8 first, then fall back to `latin-1` or `cp1252` for legacy Windows files.
- **Provide a template file**: Give users a downloadable template with the exact headers and format you expect.

## Common Mistakes

- **Inserting row by row**: Individual `INSERT` statements are 100x slower than batch inserts. Use `executemany` (Python), `bulkCreate` (Sequelize), or JDBC batch inserts.
- **Ignoring encoding issues**: A file with Spanish characters saved on Windows will fail if you force UTF-8. Detect or allow specifying the encoding.
- **Not handling blank rows**: Excel files often have hundreds of empty rows at the end. Filter out rows where all cells are empty.
- **No rate limiting on uploads**: A 500MB Excel file will crash most import processes. Enforce max file sizes and use background jobs for large imports.
- **Silent data loss**: Truncating `VARCHAR(255)` columns without warning loses data. Validate length constraints explicitly.

## FAQ

### How do I handle a 1GB CSV file?

Never load it entirely into memory. Use **streaming parsers** (`csv.reader` in Python, `csv-parser` in Node.js, Apache Commons CSV in Java). Process one row at a time, validate it, and insert it in batches of 1,000-10,000 rows. If the import takes too long, offload it to a background job.

### Should I import directly to the database or stage first?

**Stage first** for anything non-trivial. Import into a temporary "staging" table, validate everything, then run a single `INSERT INTO ... SELECT` to move clean data to the production table. This lets you preview errors, rollback easily, and avoid locking production tables during validation.

### How do I handle duplicate rows?

Define a business-key (e.g., email or SKU) and use `INSERT ... ON CONFLICT` (PostgreSQL), `INSERT IGNORE` (MySQL), or `MERGE` (SQL Server, Oracle). Alternatively, deduplicate in-memory using a `Set` of hashes before inserting. Always tell the user how many duplicates were found and skipped.




## Additional FAQ

### How do I handle CSV files with different delimiters?

Detect the delimiter automatically or let the user specify it:

```python
import csv


def detect_delimiter(file_path: str) -> str:
    """Detect the most likely delimiter in a CSV file."""
    with open(file_path, "r", newline="", encoding="utf-8") as f:
        sample = f.read(1024)
        sniffer = csv.Sniffer()
        dialect = sniffer.sniff(sample, delimiters=",;\t|")
        return dialect.delimiter


# Usage
delim = detect_delimiter("data.csv")
print(f"Detected delimiter: '{delim}'")

with open("data.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f, delimiter=delim)
    for row in reader:
        print(row)
```

### How do I import Excel files with multiple sheets?

```python
import pandas as pd


def import_multi_sheet_excel(file_path: str) -> dict[str, list[dict]]:
    """Import all sheets from an Excel file."""
    xl = pd.ExcelFile(file_path)
    result = {}
    for sheet_name in xl.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        df = df.dropna(how="all")  # Remove fully empty rows
        result[sheet_name] = df.to_dict("records")
    return result


# Usage
sheets = import_multi_sheet_excel("workbook.xlsx")
for sheet_name, rows in sheets.items():
    print(f"Sheet '{sheet_name}': {len(rows)} rows")
```

### How do I handle date parsing from Excel?

Excel stores dates as serial numbers. Use `pandas` with explicit date parsing:

```python
import pandas as pd


def import_excel_with_dates(file_path: str) -> list[dict]:
    """Import Excel with proper date parsing."""
    df = pd.read_excel(
        file_path,
        parse_dates=["birth_date", "hire_date", "last_login"],
        date_format="%Y-%m-%d",
    )

    # Handle mixed date formats
    for col in ["birth_date", "hire_date"]:
        df[col] = pd.to_datetime(df[col], errors="coerce", format="mixed")

    # Filter out rows with invalid dates
    df = df.dropna(subset=["birth_date", "hire_date"])

    return df.to_dict("records")
```

### How do I resume an interrupted import?

Track progress with a checkpoint file so you can resume from the last successful batch:

```python
import csv
import json
from pathlib import Path


def resumable_import(file_path: str, checkpoint_path: str, batch_size: int = 1000):
    """Import CSV with checkpointing for resume capability."""
    checkpoint = {"last_row": 0, "inserted": 0}

    if Path(checkpoint_path).exists():
        with open(checkpoint_path) as f:
            checkpoint = json.load(f)
        print(f"Resuming from row {checkpoint['last_row']}")

    with open(file_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        batch = []

        for row_num, row in enumerate(reader, start=2):
            if row_num <= checkpoint["last_row"]:
                continue  # Skip already processed rows

            batch.append(row)

            if len(batch) >= batch_size:
                # Insert batch to database...
                checkpoint["last_row"] = row_num
                checkpoint["inserted"] += len(batch)

                with open(checkpoint_path, "w") as f:
                    json.dump(checkpoint, f)

                batch.clear()

        # Process remaining rows
        if batch:
            checkpoint["last_row"] = row_num
            checkpoint["inserted"] += len(batch)
            with open(checkpoint_path, "w") as f:
                json.dump(checkpoint, f)

    return checkpoint


# Usage
result = resumable_import("large.csv", ".import_checkpoint.json")
print(f"Imported {result['inserted']} rows, last row: {result['last_row']}")
```
