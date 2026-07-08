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
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
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
- Users upload spreadsheets to bulk-create or bulk-update records. See [File Upload Validation](/recipes/file-handling/file-upload-validation) for secure upload handling.
- Migrating data from legacy systems or external vendors. See [Export CSV Excel](/recipes/file-handling/export-csv-excel) for the reverse migration workflow.
- Building ETL pipelines that process scheduled file drops. See [Stream Processing](/recipes/file-handling/stream-processing) for memory-efficient pipelines.
- Admin panels need a "upload and import" capability. See [Background Jobs](/recipes/devops/background-jobs) for async import processing.

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

## Frequently Asked Questions

### How do I handle a 1GB CSV file?

Never load it entirely into memory. Use **streaming parsers** (`csv.reader` in Python, `csv-parser` in Node.js, Apache Commons CSV in Java). Process one row at a time, validate it, and insert it in batches of 1,000-10,000 rows. If the import takes too long, offload it to a background job.

### Should I import directly to the database or stage first?

**Stage first** for anything non-trivial. Import into a temporary "staging" table, validate everything, then run a single `INSERT INTO ... SELECT` to move clean data to the production table. This lets you preview errors, rollback easily, and avoid locking production tables during validation.

### How do I handle duplicate rows?

Define a business-key (e.g., email or SKU) and use `INSERT ... ON CONFLICT` (PostgreSQL), `INSERT IGNORE` (MySQL), or `MERGE` (SQL Server, Oracle). Alternatively, deduplicate in-memory using a `Set` of hashes before inserting. Always tell the user how many duplicates were found and skipped.

## Advanced Solutions

### Streaming CSV import with chunked batch insert

```python
import csv
import sqlite3
from typing import Iterator, Any


def stream_csv_to_db(
    file_path: str,
    db_path: str,
    table: str,
    batch_size: int = 1000,
    encoding: str = "utf-8",
) -> dict:
    """Stream a CSV file into a database in batches with validation."""
    stats = {"inserted": 0, "errors": 0, "batches": 0}

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    with open(file_path, newline="", encoding=encoding) as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames

        if not headers:
            raise ValueError("CSV file has no header row")

        # Create table if not exists
        cols = ", ".join(f'"{h}" TEXT' for h in headers)
        cursor.execute(f'CREATE TABLE IF NOT EXISTS {table} ({cols})')

        batch: list[tuple] = []
        placeholders = ", ".join("?" * len(headers))
        insert_sql = f'INSERT INTO {table} VALUES ({placeholders})'

        for row_num, row in enumerate(reader, start=2):
            try:
                values = tuple(row.get(h, "") for h in headers)
                batch.append(values)
            except Exception as e:
                stats["errors"] += 1
                print(f"Row {row_num} error: {e}")
                continue

            if len(batch) >= batch_size:
                cursor.executemany(insert_sql, batch)
                conn.commit()
                stats["inserted"] += len(batch)
                stats["batches"] += 1
                batch.clear()

        # Insert remaining rows
        if batch:
            cursor.executemany(insert_sql, batch)
            conn.commit()
            stats["inserted"] += len(batch)
            stats["batches"] += 1

    conn.close()
    return stats


# Usage
result = stream_csv_to_db("large_data.csv", "app.db", "users", batch_size=5000)
print(f"Inserted {result['inserted']} rows in {result['batches']} batches")
```

### Excel streaming with Apache POI event model

For very large Excel files (.xlsx), use POI's event-based SAX parser to avoid loading the entire workbook into memory:

```java
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFReader.SheetIterator;
import org.apache.poi.xssf.model.SharedStringsTable;
import org.apache.poi.xssf.usermodel.XSSFRichTextString;
import org.xml.sax.*;
import org.xml.sax.helpers.DefaultHandler;
import org.xml.sax.helpers.XMLReaderFactory;

import java.io.InputStream;
import java.util.*;

public class StreamingExcelImporter {

    public List<Map<String, String>> importLargeExcel(String filePath) throws Exception {
        List<Map<String, String>> rows = new ArrayList<>();
        OPCPackage pkg = OPCPackage.open(filePath);
        XSSFReader reader = new XSSFReader(pkg);
        SharedStringsTable sst = new SharedStringsTable();

        SheetIterator sheetIterator = (SheetIterator) reader.getSheetsData();
        while (sheetIterator.hasNext()) {
            try (InputStream sheetStream = sheetIterator.next()) {
                XMLReader parser = XMLReaderFactory.createXMLReader();
                SheetHandler handler = new SheetHandler(sst, rows);
                parser.setContentHandler(handler);
                parser.parse(new InputSource(sheetStream));
            }
        }
        pkg.close();
        return rows;
    }

    static class SheetHandler extends DefaultHandler {
        private final SharedStringsTable sst;
        private final List<Map<String, String>> rows;
        private List<String> headers;
        private Map<String, String> currentRow;
        private String lastCellValue;
        private int currentCol;
        private boolean isHeaderRow;

        SheetHandler(SharedStringsTable sst, List<Map<String, String>> rows) {
            this.sst = sst;
            this.rows = rows;
            this.headers = new ArrayList<>();
            this.currentRow = new LinkedHashMap<>();
            this.currentCol = 0;
            this.isHeaderRow = true;
        }

        @Override
        public void startElement(String uri, String localName, String qName, Attributes attrs) {
            if (qName.equals("c")) {
                String ref = attrs.getValue("r");
                currentCol = 0;
                lastCellValue = "";
            }
        }

        @Override
        public void endElement(String uri, String localName, String qName) {
            if (qName.equals("v")) {
                if (isHeaderRow) {
                    headers.add(lastCellValue);
                } else {
                    currentRow.put(
                        headers.size() > currentCol ? headers.get(currentCol) : "col" + currentCol,
                        lastCellValue
                    );
                }
                currentCol++;
            } else if (qName.equals("row")) {
                if (!isHeaderRow && !currentRow.isEmpty()) {
                    rows.add(new LinkedHashMap<>(currentRow));
                }
                currentRow.clear();
                isHeaderRow = false;
            }
        }

        @Override
        public void characters(char[] ch, int start, int length) {
            lastCellValue = new String(ch, start, length);
        }
    }
}
```

### Encoding detection and fallback

```python
import csv
from pathlib import Path


def read_csv_with_encoding_detection(file_path: str) -> list[dict]:
    """Try multiple encodings and return parsed rows."""
    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "iso-8859-1"]
    path = Path(file_path)

    for enc in encodings:
        try:
            with open(path, newline="", encoding=enc) as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                print(f"Successfully read with encoding: {enc}")
                return rows
        except UnicodeDecodeError:
            continue

    raise ValueError(f"Could not decode {file_path} with any known encoding")


# Usage: handles files from Windows, macOS, and Linux
rows = read_csv_with_encoding_detection("data_from_windows.csv")
```

### Column mapping and data transformation

```python
import csv
from datetime import datetime
from typing import Any, Callable


class ColumnMapper:
    """Map source CSV columns to target schema with transformations."""

    def __init__(self):
        self.mappings: dict[str, tuple[str, Callable]] = {}

    def add_mapping(self, source_col: str, target_col: str, transform: Callable = None):
        self.mappings[source_col] = (target_col, transform or (lambda x: x))

    def transform_row(self, row: dict) -> dict:
        result = {}
        for source_col, (target_col, transform) in self.mappings.items():
            value = row.get(source_col, "")
            try:
                result[target_col] = transform(value)
            except (ValueError, TypeError) as e:
                result[target_col] = None
                result[f"_error_{target_col}"] = str(e)
        return result


# Usage: map and transform columns from a vendor CSV
mapper = ColumnMapper()
mapper.add_mapping("First Name", "first_name", str.strip)
mapper.add_mapping("Last Name", "last_name", str.strip)
mapper.add_mapping("Email Address", "email", str.lower)
mapper.add_mapping("Phone", "phone", lambda x: x.replace("-", "").replace(" ", ""))
mapper.add_mapping("Birth Date", "birth_date", lambda x: datetime.strptime(x, "%m/%d/%Y").date())
mapper.add_mapping("Salary", "salary", lambda x: float(x.replace("$", "").replace(",", "")))

with open("vendor_export.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        transformed = mapper.transform_row(row)
        print(transformed)
```

### Node.js: Streaming CSV with batch database insert

```javascript
import csv from 'csv-parser';
import fs from 'fs';
import { Database } from 'better-sqlite3';


async function streamCsvToDb(filePath, dbPath, tableName, batchSize = 1000) {
    const db = new Database(dbPath);
    const stats = { inserted: 0, errors: 0, batches: 0 };
    let batch = [];
    let headers = null;
    let insertStmt = null;

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('headers', (hdrs) => {
                headers = hdrs;
                const cols = hdrs.map(h => `"${h}" TEXT`).join(', ');
                db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${cols})`);
                const placeholders = hdrs.map(() => '?').join(', ');
                insertStmt = db.prepare(
                    `INSERT INTO ${tableName} VALUES (${placeholders})`
                );
            })
            .on('data', (row) => {
                try {
                    const values = headers.map(h => row[h] || '');
                    batch.push(values);

                    if (batch.length >= batchSize) {
                        const tx = db.transaction((rows) => {
                            for (const r of rows) insertStmt.run(...r);
                        });
                        tx(batch);
                        stats.inserted += batch.length;
                        stats.batches++;
                        batch = [];
                    }
                } catch (err) {
                    stats.errors++;
                    console.error(`Row error: ${err.message}`);
                }
            })
            .on('end', () => {
                if (batch.length > 0 && insertStmt) {
                    const tx = db.transaction((rows) => {
                        for (const r of rows) insertStmt.run(...r);
                    });
                    tx(batch);
                    stats.inserted += batch.length;
                    stats.batches++;
                }
                db.close();
                resolve(stats);
            })
            .on('error', reject);
    });
}

// Usage
const result = await streamCsvToDb('large.csv', 'app.db', 'users', 5000);
console.log(`Inserted ${result.inserted} rows in ${result.batches} batches`);
```

## Additional Best Practices

1. **Use a staging table for validation before production insert.** Import into a temporary table, validate all rows, then move clean data in a single transaction:

```sql
-- Step 1: Import to staging
CREATE TABLE staging_users (LIKE users);

-- Step 2: Validate and report
SELECT * FROM staging_users WHERE email NOT LIKE '%@%.%';
SELECT COUNT(*) FROM staging_users WHERE name IS NULL OR name = '';

-- Step 3: Move clean data
INSERT INTO users (name, email, age)
SELECT name, email, age FROM staging_users
WHERE email LIKE '%@%.%' AND name IS NOT NULL AND name != '';

-- Step 4: Report and cleanup
SELECT COUNT(*) AS imported FROM users;
DROP TABLE staging_users;
```

2. **Provide downloadable templates.** Give users a template with exact headers, sample rows, and data validation rules:

```python
import csv
from io import StringIO


def generate_csv_template() -> str:
    """Generate a CSV template with headers and example rows."""
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "email", "age", "department"])
    writer.writerow(["Jane Doe", "jane@example.com", "30", "Engineering"])
    writer.writerow(["John Smith", "john@example.com", "25", "Marketing"])
    return output.getvalue()


# Serve as a download in a web framework
# return Response(generate_csv_template(), mimetype="text/csv",
#                 headers={"Content-Disposition": "attachment; filename=template.csv"})
```

## Additional Common Mistakes

1. **Not validating header names.** Users often rename columns or change capitalization. Normalize headers before processing:

```python
import csv


def normalize_headers(headers: list[str]) -> dict[str, str]:
    """Map user headers to expected headers, case-insensitive."""
    expected = {"name", "email", "age", "department"}
    mapping = {}
    for h in headers:
        normalized = h.strip().lower().replace(" ", "_")
        if normalized in expected:
            mapping[h] = normalized
    return mapping


with open("user_upload.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    header_map = normalize_headers(reader.fieldnames)

    if len(header_map) < len(expected):
        missing = expected - set(header_map.values())
        raise ValueError(f"Missing required columns: {missing}")

    for row in reader:
        normalized_row = {header_map[k]: v for k, v in row.items() if k in header_map}
        # Process normalized_row...
```

2. **Truncating data without warning.** When inserting into a `VARCHAR(255)` column, strings longer than 255 chars are silently truncated by some databases. Validate length before inserting:

```python
MAX_LENGTHS = {
    "name": 100,
    "email": 255,
    "department": 50,
}

def validate_lengths(row: dict) -> list[str]:
    """Check for fields that exceed max length."""
    warnings = []
    for field, max_len in MAX_LENGTHS.items():
        value = row.get(field, "")
        if len(value) > max_len:
            warnings.append(f"{field} exceeds {max_len} chars (got {len(value)})")
    return warnings
```

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
