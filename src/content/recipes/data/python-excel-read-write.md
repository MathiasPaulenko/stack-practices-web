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

Excel files (.xlsx) are everywhere in business. Python can read, write, and format them programmatically using openpyxl (cell-level control) and pandas (data-frame operations). Here is how to both approaches for common tasks like reading sheets, writing data, applying formatting, and handling multi-sheet workbooks.

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

## When Not to Use This Approach

- **Real-time streaming data**: if data arrives continuously in small chunks, batch parsing is the wrong model. Use stream processing frameworks (Kafka Streams, Flink, RxJS) instead of loading entire files into memory
- **Files larger than available RAM**: parsing a 50GB CSV with pandas.read_csv() crashes with MemoryError. Use chunked reading (chunksize), Dask, or database bulk import for files exceeding 50% of available RAM
- **Structured database queries**: if the data source is a database, extracting to CSV/JSON first and then parsing is wasteful. Query the database directly with SQL and process results in-memory
- **Simple key-value lookups**: for reading a small config file (10-20 keys), a full parser is overkill. Use json.loads() or csv.DictReader on the raw string directly
- **Binary formats with dedicated libraries**: if the file is Parquet, Avro, or ORC, do not parse as CSV/JSON. Use format-specific readers (pyarrow, fastavro) that handle compression and schema natively
- **Regulatory compliance requiring audit trails**: if the data processing must produce an audit trail, ad-hoc parsing scripts lack traceability. Use ETL tools (Airflow, dbt, Prefect) that log every transformation step

## Performance Benchmarks

- **CSV parsing throughput**: Python csv module processes 100-500 MB/s for simple rows. pandas.read_csv() achieves 200-800 MB/s with engine='c'. Rust csv crate hits 1-3 GB/s
- **JSON parsing latency**: json.loads() in Python parses 10MB JSON in 50-200ms. orjson parses the same file in 10-30ms. JavaScript JSON.parse() handles 10MB in 20-80ms
- **Excel parsing**: openpyxl reads a 10,000-row Excel file in 2-5 seconds. pandas.read_excel() with openpyxl engine takes 3-8 seconds. xlrd (legacy .xls) is 2-3x faster but limited to old formats
- **XML parsing**: ElementTree parses 1MB XML in 10-50ms. lxml (C-based) parses the same file in 2-10ms. SAX streaming handles 1GB+ files with constant memory
- **Memory usage**: pandas.read_csv() uses 5-10x the file size in memory. A 100MB CSV becomes 500MB-1GB in a DataFrame. Use dtype specification to reduce memory by 50-80%
- **Parallel parsing**: reading 4 CSV files in parallel with concurrent.futures.ThreadPoolExecutor achieves 3x throughput on 4-core machines. I/O-bound parsing scales well with threads

## Testing Strategy

- **Test with malformed input**: verify the parser handles broken rows, missing columns, encoding errors (BOM, UTF-16), and empty files without crashing. Use property-based testing (Hypothesis) to generate edge cases
- **Test round-trip fidelity**: parse a file, serialize back, and compare. Round-trip testing catches data loss from type coercion, encoding issues, or floating-point precision loss
- **Test with large files**: create a synthetic 1GB+ file and verify the parser completes within memory limits. Use head -n 1000000 to generate test data from real files
- **Test encoding handling**: verify the parser handles UTF-8, UTF-16, Latin-1, and files with BOM. Test with files containing emoji, CJK characters, and null bytes
- **Test delimiter inference**: for CSV parsing, test with comma, semicolon, tab, and pipe delimiters. Verify csv.Sniffer or equivalent detects the correct delimiter
- **Test concurrent access**: if multiple processes parse the same file, verify no race conditions. Use file locking or atomic reads for shared file access

## Cost Estimation

- **Compute cost**: parsing 1TB of CSV files on a cloud VM costs -10 in compute (depending on instance type). Using a managed service like AWS Glue costs -15 per TB including I/O
- **Memory cost**: in-memory parsing of large files requires high-memory instances. A 10GB CSV needs a 32GB+ RAM instance (.50-2.00/hour on AWS). Chunked reading reduces this to 4GB instances (.10-0.30/hour)
- **Storage cost**: intermediate JSON files are 2-5x larger than CSV. Converting 1TB CSV to JSON requires 2-5TB storage (-50/month on S3). Consider Parquet (10-20% of CSV size) for storage efficiency
- **Development time**: writing a robust parser with error handling, encoding detection, and type inference takes 4-8 hours. Using pandas or dedicated libraries reduces this to 1-2 hours
- **Infrastructure for batch jobs**: scheduled parsing jobs need a compute instance, job scheduler, and error alerting. Total infrastructure: -200/month for a small pipeline processing daily files

## Monitoring and Observability

- **Parse error rate**: track the percentage of rows/files that fail parsing. Alert when error rate exceeds 1% of total. Common causes: encoding changes, schema drift, corrupted files
- **Parse duration**: monitor time to parse each file. A 3x increase from baseline indicates either larger files or performance degradation. Log file size alongside parse duration for correlation
- **Memory usage during parsing**: monitor peak memory during file parsing. If peak memory exceeds 80% of available RAM, switch to chunked reading or streaming
- **Row count validation**: compare row counts before and after parsing. A significant drop indicates silent data loss. Log input rows, output rows, and skipped rows separately
- **Schema drift detection**: log column names and types on each parse. Alert when columns appear, disappear, or change type. Schema drift breaks downstream consumers silently

## Deployment Checklist

- [ ] Set file size limits: reject files larger than the configured maximum (e.g., 10GB) to prevent OOM. Return HTTP 413 for API-based uploads
- [ ] Configure encoding detection: use chardet or cchardet for automatic encoding detection. Default to UTF-8 but fall back to Latin-1 for legacy files
- [ ] Set memory limits: use chunked reading for files >500MB. Configure chunksize in pandas or stream line-by-line for CSV
- [ ] Implement retry logic: transient I/O errors (network storage, S3) require exponential backoff. Set max 3 retries with 5-30 second delays
- [ ] Configure error handling: decide whether to skip bad rows (log and continue) or fail fast. For data pipelines, skipping with logging is usually preferred
- [ ] Set timeouts: parsing should have a maximum duration. Kill processes that exceed 2x the expected parse time to prevent resource exhaustion

## Security Considerations

- **Zip bomb via compressed files**: a 10MB ZIP can decompress to 100GB. Set decompressed size limits before extracting. Use zipfile.infolist() to check ile_size before extraction
- **XML external entity (XXE) injection**: XML parsers that resolve external entities can leak local files or perform SSRF. Disable DTD processing with XMLParser(resolve_entities=False) in lxml or orbid_dtd=True in defusedxml
- **CSV injection via formula injection**: Excel and CSV files can contain formulas starting with =, +, -, or @. When opened in Excel, these execute arbitrary formulas. Prefix dangerous cells with a single quote or strip formula characters
- **Path traversal via filenames**: if filenames come from user input, ../../etc/passwd can escape the intended directory. Use os.path.basename() or pathlib.Path.name to sanitize filenames
- **Memory exhaustion via large files**: an attacker can upload a 100GB file to crash the parser. Enforce file size limits at the web server (nginx client_max_body_size) before the parser sees the file
- **Code injection via eval in parsed data**: if parsed data is passed to eval(), exec(), or Function(), an attacker can inject arbitrary code. Never eval parsed data. Use safe deserializers
- **Encoding-based bypass**: UTF-7 or UTF-16 encoding can bypass security filters that expect UTF-8. Normalize encoding to UTF-8 before security checks
- **Malicious PDF content**: PDF files can contain JavaScript, embedded files, or launch actions. Use PyPDF2 with strict mode or run PDF parsing in a sandboxed container
- **Log injection via newline in parsed data**: if parsed data is written to log files, embedded newlines can forge log entries. Strip or escape newline characters before logging
- **Resource exhaustion via deeply nested structures**: JSON or XML with 10,000+ nesting levels causes stack overflow in recursive parsers. Set recursion depth limits before parsing
## Variants and Alternatives

- **Streaming parsers vs batch parsers**: streaming parsers (SAX, StAX, ijson) process data element-by-element with O(1) memory. Batch parsers (DOM, ElementTree, json.loads) load everything into memory. Choose streaming for files >100MB
- **Columnar formats vs row-based**: Parquet and ORC store data column-by-column, enabling column pruning and 10-50x better compression for analytical queries. CSV and JSON are row-based and require full-row scans
- **Binary formats vs text formats**: Protocol Buffers, Avro, and MessagePack are 3-10x smaller than JSON/CSV and parse 2-5x faster. The tradeoff is human readability and debugging complexity
- **Memory-mapped I/O vs buffered I/O**: mmap maps files directly into the process address space, avoiding copy overhead. For read-heavy workloads on large files, mmap is 2-3x faster than buffered reads
- **Parallel parsing strategies**: split large files by byte ranges and parse chunks in parallel. For CSV, find newline boundaries before splitting. For JSON, use JSON Lines (one object per line) for natural parallelism
- **Hybrid approaches**: use a fast scanner to extract metadata (headers, row count, schema) before full parsing. This enables early rejection of invalid files and optimized memory allocation

## Common Pitfalls in Production

- **Encoding detection failures**: chardet misidentifies short strings. For files <1KB, default to UTF-8 instead of relying on detection. For mixed-content files, BOM detection is more reliable than statistical methods
- **Delimiter inconsistency**: European CSV files often use semicolons. US files use commas. Tab-delimited files from Excel use tabs. Always detect the delimiter with csv.Sniffer or accept it as a parameter
- **Quoted field handling**: CSV fields containing the delimiter must be quoted. Embedded quotes must be doubled. Parsers that do not handle quoting produce incorrect output on fields with commas or newlines
- **Date format ambiguity**:  1/02/2024 is January 2 in the US and February 1 in Europe. Always parse dates with explicit format strings. ISO 8601 (YYYY-MM-DD) is unambiguous
- **Floating-point precision in CSV**: writing  .1 to CSV and reading it back may produce  .10000000000000001. Use string representation for exact values or Decimal for financial data
- **Memory pressure from large Excel files**: openpyxl loads the entire workbook into memory. A 50MB Excel file can use 500MB+ of RAM. Use 
ead_only=True mode or openpyxl's streaming API for large workbooks
## Integration Patterns

- **ETL pipeline integration**: use file parsers as extractors in ETL pipelines. Read from files (extract), transform with pandas/Polars (transform), write to database or data warehouse (load). Schedule with Airflow or Prefect
- **API-backed file processing**: accept file uploads via REST API, store in object storage (S3), trigger async processing with a message queue. Return a job ID for status polling. This pattern handles large files without blocking the API
- **Batch vs micro-batch processing**: batch processing runs nightly on all files. Micro-batch processes files every 15-30 minutes. Micro-batch reduces latency but increases infrastructure cost. Choose based on downstream dependency timing
- **Schema registry integration**: register file schemas in a schema registry (Confluent, Apicurio). Validate files against the registry before processing. This ensures all consumers use compatible schemas
- **Data lake pattern**: store raw files in a data lake (S3, Azure Data Lake). Process with Spark or Dask. Write results to a data warehouse (Snowflake, BigQuery). The data lake preserves raw data for reprocessing
- **Event-driven file processing**: when a file lands in S3, S3 Event Notifications trigger a Lambda function. The function parses the file and writes results to a database. This pattern scales to thousands of files per second

## Error Handling and Recovery

- **Partial file processing**: if a file has 10,000 rows and row 5,000 is malformed, process rows 1-4,999, log the error, skip row 5,000, and continue with rows 5,001-10,000. Never fail an entire batch for one bad row
- **Dead letter queue for files**: files that fail processing go to a dead letter queue (S3 bucket, message queue). A separate process retries them with exponential backoff. After 3 failures, alert a human for manual inspection
- **Checkpointing for large files**: record the last successfully processed byte offset. If processing crashes, resume from the checkpoint instead of reprocessing the entire file. This is critical for files that take hours to process
- **Idempotent file processing**: processing the same file twice should produce the same result. Use file hash + processing timestamp as a unique key. Skip files that have already been processed successfully
- **Circuit breaker for external dependencies**: if the file source (FTP, S3, API) is down, open a circuit breaker after 5 consecutive failures. Stop attempting reads for 5 minutes, then try again. This prevents cascading failures
- **Graceful degradation**: if a non-critical parser fails (e.g., metadata extraction), continue processing with the core data. Log the failure but do not block the pipeline. Only block on critical parsing failures
## Frequently Asked Questions

### How do I read a specific range of cells?

With openpyxl, use `ws.iter_rows(min_row=2, max_row=10, min_col=1, max_col=3, values_only=True)`. With pandas, use `usecols` and `skiprows` parameters.

### How do I add conditional formatting?

Use `openpyxl.formatting.rule` or `xlsxwriter`. For example, color scales and data bars are supported via `ColorScaleRule` and `DataBarRule`.

### How do I handle .xls (legacy) files?

Use `xlrd` for reading and `xlwt` for writing. pandas supports them with `engine="xlrd"` and `engine="xlwt"`. Note that xlrd dropped .xlsx support in version 2.0.

### Can I create charts in Excel with Python?

Yes. `openpyxl.chart` supports bar, line, and pie charts. `xlsxwriter` also supports charts with a similar API.