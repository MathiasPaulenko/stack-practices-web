---




contentType: recipes
slug: convert-json-to-csv
title: "Convert JSON to CSV"
description: "How to convert JSON data to CSV format in Python, Java, and JavaScript."
metaDescription: "Learn how to convert JSON to CSV in Python, Java, and JavaScript. Transform API responses and data exports with practical code examples."
difficulty: beginner
topics:
  - data
tags:
  - json
  - csv
  - conversion
  - python
  - javascript
  - java
  - data-processing
relatedResources:
  - /recipes/parse-csv-files
  - /recipes/parse-json
  - /recipes/serialize-deserialize-data
  - /recipes/validate-json-schema
  - /recipes/parse-xml-files
  - /recipes/merge-json-files-javascript
  - /recipes/python-excel-read-write
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to convert JSON to CSV in Python, Java, and JavaScript. Transform API responses and data exports with practical code examples."
  keywords:
    - json
    - csv
    - conversion
    - python
    - javascript
    - java
    - data-processing




---

## Overview

Converting JSON to CSV bridges structured API responses with spreadsheet-friendly formats. This transformation is essential for data exports, business intelligence pipelines, and interoperability with Excel-based workflows. JSON's nested structure must be flattened into rows and columns, handling arrays and nested objects carefully.

## When to Use

Use this resource when:
- Exporting API response data to Excel or Google Sheets
- Building ETL pipelines that feed into BI tools or data warehouses
- Generating reports from NoSQL databases that store JSON documents
- Converting web analytics or telemetry data for non-technical stakeholders

## Solution

### Python

```python
import json
import csv

# Simple flat JSON array
json_data = '[{"name":"Alice","age":30},{"name":"Bob","age":25}]'
records = json.loads(json_data)

with open('output.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=records[0].keys())
    writer.writeheader()
    writer.writerows(records)
```

```python
# Flatten nested JSON with pandas
# pip install pandas
import pandas as pd

nested = '[{"user":{"name":"Alice"},"orders":[{"id":1}]}]'
df = pd.json_normalize(json.loads(nested), sep='.')
df.to_csv('output.csv', index=False)
```

### JavaScript

```javascript
// Manual conversion for flat arrays
const records = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
const headers = Object.keys(records[0]);
const rows = records.map(r => headers.map(h => JSON.stringify(r[h])).join(','));
const csv = [headers.join(','), ...rows].join('\n');
console.log(csv);
```

```javascript
// Using json2csv for reliable conversion
// npm install @json2csv/plainjs
import { Parser } from '@json2csv/plainjs';

const parser = new Parser();
const csv = parser.parse(records);
console.log(csv);
```

### Java

```java
// Jackson + commons-csv
// Maven: com.fasterxml.jackson.core:jackson-databind, org.apache.commons:commons-csv
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import java.io.StringWriter;
import java.util.List;
import java.util.Map;

public class JsonToCsv {
    public static void main(String[] args) throws Exception {
        String json = "[{\"name\":\"Alice\",\"age\":30},{\"name\":\"Bob\",\"age\":25}]";
        ObjectMapper mapper = new ObjectMapper();
        List<Map<String, Object>> records = mapper.readValue(json, List.class);

        StringWriter sw = new StringWriter();
        try (CSVPrinter printer = new CSVPrinter(sw, CSVFormat.DEFAULT.withHeader("name", "age"))) {
            for (Map<String, Object> record : records) {
                printer.printRecord(record.get("name"), record.get("age"));
            }
        }
        System.out.println(sw.toString());
    }
}
```

## Explanation

The core challenge in JSON-to-CSV conversion is flattening hierarchical data into a two-dimensional table. Flat JSON arrays map directly to rows. Nested objects require strategies: either flatten keys (`user.name` -> `user_name`) or explode into multiple CSV files with foreign-key relationships.

`pandas.json_normalize` (Python) handles flattening automatically with configurable separators. `@json2csv` (JS) supports custom fields, transforms, and unwind operations for arrays. Java requires manual iteration because standard libraries do not include a JSON-to-CSV converter.

## Variants

| Technology | Library | Approach | Notes |
|------------|---------|----------|-------|
| Python | `csv` (stdlib) | `DictWriter` | Zero deps, requires flat JSON |
| Python | `pandas` | `json_normalize()` | Handles nesting, capable but heavy dependency |
| JavaScript | `@json2csv` | `Parser` | Custom fields, transforms, async streams |
| JavaScript | Manual | `Object.keys()` + `join()` | Zero deps, brittle for complex data |
| Java | `Jackson` + `commons-csv` | Manual iteration | Enterprise-grade, verbose boilerplate |
| Java | `univocity-parsers` | `CsvWriter` | High-performance alternative to commons-csv |

## What Works

- **Sanitize headers** to remove spaces and special characters that break downstream parsers
- **Handle missing fields gracefully**: Use default values or empty strings instead of omitting columns
- **Escape commas and quotes** in string values to produce RFC 4180-compliant CSV
- **Unwind arrays before conversion** or keep them as JSON strings in cells to preserve data integrity
- **Add a BOM (`\ufeff`)** when writing CSV for Excel compatibility with non-ASCII characters

## Common Mistakes

- **Assuming all records have identical keys**: Missing fields cause misaligned columns; normalize the schema first
- **Not handling nested objects**: Results in `[object Object]` in JS or `LinkedHashMap` in Java output
- **Forgetting to quote values containing commas**: Breaks CSV parsers that expect simple split-by-comma
- **Writing large files to memory**: Stream conversion for datasets > 10k rows to avoid OOM errors
- **Using default Excel delimiter in non-English locales**: Some regions use semicolons; explicitly set delimiter if needed

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
- **Development time**: writing a solid parser with error handling, encoding detection, and type inference takes 4-8 hours. Using pandas or dedicated libraries reduces this to 1-2 hours
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
## Tooling and Ecosystem

- **pandas**: the standard Python library for tabular data. 50M+ downloads/month. Handles CSV, Excel, JSON, SQL, Parquet. Memory overhead is 5-10x file size. Use dtype parameter to reduce memory
- **Polars**: 2-10x faster than pandas with lazy evaluation. Written in Rust. Lower memory usage. Drop-in replacement for most pandas operations. Growing ecosystem with 5M+ downloads/month
- **DuckDB**: in-process analytical database. Queries CSV/Parquet/JSON directly with SQL. No server needed. 2-5x faster than pandas for aggregation queries. Embedded like SQLite but for analytics
- **Apache Arrow**: columnar in-memory format. Zero-copy reads from Parquet. Language-agnostic (Python, R, Java, JS). Foundation for modern data tools (pandas 2.0, Polars, DuckDB)
- **jq**: command-line JSON processor. Filter, transform, and query JSON with a compact DSL. Essential for shell pipelines and debugging API responses. Install with pt install jq or rew install jq
- **csvkit**: command-line tools for CSV files. csvstat shows statistics, csvcut selects columns, csvjoin merges files. Useful for quick exploration without writing Python scripts

## Best Practices Summary


- For a deeper guide, see [Convert CSV to JSON](/recipes/convert-csv-to-json/).

- Always specify encoding explicitly (encoding='utf-8'). Never rely on system defaults
- Use chunked reading for files >500MB. Set chunksize in pandas or iterate line-by-line
- Validate file structure before full parsing. Check headers, row count, and file size
- Log parse errors with file name, line number, and error message for debugging
- Use streaming parsers (SAX, ijson) for files >1GB to maintain constant memory
- Compress intermediate files with gzip or zstd. Parquet is 10-20x smaller than CSV
## Performance Optimization Tips

- Use pandas.read_csv(dtype=...) to specify column types. Avoids auto-inference overhead and reduces memory by 50-80%
- For repeated reads of the same file, cache the parsed result with unctools.lru_cache or Redis
- Use csv.field_size_limit() to increase the max field size if you encounter _csv.Error: field larger than field limit
- For XML, prefer lxml over xml.etree.ElementTree. lxml is 5-10x faster for large files
- For Excel, use openpyxl in ead_only=True mode for files >10MB. It streams rows instead of loading the entire workbook
- For PDF text extraction, pdfplumber is more accurate than PyPDF2 for complex layouts but 3-5x slower
- For log files, use e.compile() to pre-compile regex patterns. Compiled regex is 2-5x faster than e.search() with string patterns
- For CSV-to-JSON conversion, use orjson instead of json for 5-10x faster serialization
- For large CSV processing, use pandas.read_csv(chunksize=10000) and process chunks in parallel with concurrent.futures
- For Excel writing, xlsxwriter is 2-3x faster than openpyxl for large output files but does not support reading
## Frequently Asked Questions

### How do I convert deeply nested JSON to CSV?

Use `pandas.json_normalize` with `sep='_'` or `@json2csv`'s `unwind` option for arrays. For deeply nested objects, consider whether CSV is the right format — parquet or JSON Lines may be better alternatives. If CSV is required, flatten keys into dot-notation columns.

### Can I convert JSON to CSV in the browser?

Yes. Load `@json2csv` via CDN or bundle it with your frontend application. For very large files, use Web Workers to avoid blocking the main thread, and stream chunks to a download using the Streams API or `Blob`/`URL.createObjectURL`.

### How do I handle arrays inside JSON objects when converting to CSV?

Option 1: Unwind the array so each element becomes a separate row (duplicating parent fields). Option 2: Serialize the array to a JSON string inside the CSV cell. Option 3: Create a separate related CSV file and use an ID column to link them, similar to database normalization.