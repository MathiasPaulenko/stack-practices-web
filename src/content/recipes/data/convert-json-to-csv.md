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
  - /recipes/data/parse-csv-files
  - /recipes/data/parse-json
  - /recipes/data/serialize-deserialize-data
  - /recipes/data/validate-json-schema
  - /recipes/data/parse-xml-files
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
| Python | `pandas` | `json_normalize()` | Handles nesting, powerful but heavy dependency |
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

## Frequently Asked Questions

### How do I convert deeply nested JSON to CSV?

Use `pandas.json_normalize` with `sep='_'` or `@json2csv`'s `unwind` option for arrays. For deeply nested objects, consider whether CSV is the right format — parquet or JSON Lines may be better alternatives. If CSV is required, flatten keys into dot-notation columns.

### Can I convert JSON to CSV in the browser?

Yes. Load `@json2csv` via CDN or bundle it with your frontend application. For very large files, use Web Workers to avoid blocking the main thread, and stream chunks to a download using the Streams API or `Blob`/`URL.createObjectURL`.

### How do I handle arrays inside JSON objects when converting to CSV?

Option 1: Unwind the array so each element becomes a separate row (duplicating parent fields). Option 2: Serialize the array to a JSON string inside the CSV cell. Option 3: Create a separate related CSV file and use an ID column to link them, similar to database normalization.
