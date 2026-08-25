---
contentType: recipes
slug: convert-csv-to-json
title: "Convert CSV to JSON"
description: "Turn CSV files into structured JSON using Python, JavaScript, and Java. Pick the right library for quick one-off conversions or large streaming pipelines."
metaDescription: "Convert CSV to JSON in Python, JavaScript, and Java. Use standard-library, pandas, csv-parse, papaparse, and Jackson examples for reliable data conversion."
difficulty: beginner
topics:
  - data
tags:
  - csv
  - json
  - conversion
  - python
  - javascript
  - java
  - data-processing
relatedResources:
  - /recipes/parse-csv-files
  - /recipes/convert-json-to-csv
  - /recipes/parse-csv-python-pandas
  - /recipes/serialize-deserialize-data
  - /recipes/validate-json-schema
  - /recipes/python-excel-read-write
lastUpdated: "2026-08-19"
publishedAt: "2026-06-20"
author: Mathias Paulenko
seo:
  metaDescription: "Convert CSV to JSON in Python, JavaScript, and Java. Use standard-library, pandas, csv-parse, papaparse, and Jackson examples for reliable data conversion."
  keywords:
    - csv
    - json
    - conversion
    - python
    - javascript
    - java
    - data-processing
---

## Overview

CSV is the default export format for spreadsheets and databases, yet it only
stores flat text. JSON gives you numbers, booleans, nested objects, and arrays —
the shape that most APIs and document stores actually want.

The examples below run in Python, JavaScript, and Java. Use the quick
standard-library version for small files, and the streaming version for anything
that won't fit in RAM. See also [Deep Clone Objects in JavaScript: Beyond JSON.parse](/recipes/deep-clone-structured/).

## When to Use

This recipe fits when:

- You need to bring spreadsheet exports into a web app or API.
- You want to push flat data into MongoDB, Elasticsearch, or a similar document
  store.
- You want to feed CSV data to a charting or visualization library on the client.
- The CSV is too big to load as a single object.

### When to avoid

- When the data already lives in a database, query it directly with SQL. Exporting
  to CSV and parsing it again only adds an unnecessary middle step.
- If the file is Parquet, Avro, or ORC, use the parser built for that format.
- You need to process live records as they arrive. Then batch conversion by file
  doesn't make sense.

## Solution

### Python (standard library)

```python
# csv + json from the standard library
import csv
import json

with open('data.csv', newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(rows, f, indent=2)
```

### Python (pandas)

```python
# pip install pandas
import pandas as pd

df = pd.read_csv('data.csv')
df['date'] = pd.to_datetime(df['date'])
json_data = df.to_json(orient='records', date_format='iso')
print(json_data)
```

### JavaScript (Node with csv-parse)

```javascript
// npm install csv-parse
import { parse } from 'csv-parse';
import fs from 'fs';

const parser = fs.createReadStream('data.csv').pipe(
  parse({ columns: true, cast: true })
);

const rows = [];
for await (const row of parser) {
  rows.push(row);
}
console.log(JSON.stringify(rows, null, 2));
```

### JavaScript (browser with PapaParse)

```javascript
// npm install papaparse
import Papa from 'papaparse';

const csv = 'name,age\nAlice,30\nBob,25';
const result = Papa.parse(csv, { header: true });
console.log(JSON.stringify(result.data, null, 2));
```

### Java (Jackson)

```java
// Maven: com.fasterxml.jackson.dataformat:jackson-dataformat-csv
import java.io.File;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.csv.CsvMapper;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;

public class CsvToJson {
    public static void main(String[] args) throws Exception {
        CsvSchema schema = CsvSchema.builder()
            .setUseHeader(true)
            .build();
        CsvMapper csvMapper = new CsvMapper();
        ObjectMapper jsonMapper = new ObjectMapper();

        List<Map<String, String>> rows = csvMapper
            .readerFor(Map.class)
            .with(schema)
            .readValues(new File("data.csv"))
            .readAll();

        jsonMapper.writerWithDefaultPrettyPrinter()
            .writeValue(new File("data.json"), rows);
    }
}
```

## Explanation

CSV only stores text, so it's got no idea whether a value is a number, a
boolean, or a date. JSON can hold numbers, booleans, null, arrays, and objects — not just
text. You're the one deciding how each value maps to a JSON type: `age` becomes a
number, `active` a boolean, `tags` an array. Python's
`csv.DictReader` and Node's `csv-parse` return strings by default, so you either
cast manually or define a schema.

A streaming parser reads one row at a time, so the whole file never has to live
in memory. If you need nested JSON, use dotted
column names like `user.name` and a flattening utility, or build the object in
code.

## Variants

| Technology | Library | Approach | Notes |
| --- | --- | --- | --- |
| Python | `csv` + `json` | `DictReader` + `json.dump` | Standard library, no dependencies |
| Python | `pandas` | `read_csv` + `to_json` | Type inference, handles dates, large files |
| JavaScript | `csv-parse` | `parse({ columns: true })` | Streaming, async iterables, Node focused |
| JavaScript | `papaparse` | `Papa.parse(csv, { header: true })` | Browser + Node, forgiving with malformed CSV |
| Java | `Jackson CSV` | `CsvMapper` + `ObjectMapper` | Streaming, schema-driven |
| Java | `Apache Commons CSV` | `CSVFormat.DEFAULT.parse()` | Lightweight, manual JSON serialization |

## Best Practices

- Map CSV headers directly to JSON keys with `columns: true` or `DictReader`;
  don't rely on column positions.
- Cast types explicitly. CSV has no booleans or dates, so either define a schema
  or post-process rows.
- For files over 100 MB, stream the conversion. Write JSON out in chunks, or
  send rows straight to a database.
- Check the JSON against a schema when the output structure has to be exact.
- Keep UTF-8 encoding explicit and handle BOMs, especially with Excel exports.

## Common Mistakes

- Loading a multi-gigabyte CSV entirely into memory and hitting an out-of-memory
  error.
- A quoted comma or newline will trip up any `line.split(',')` shortcut.
- Referencing columns by index when headers can change.
- Ignoring a UTF-8 BOM that corrupts the first header.
- Forgetting that JSON has no native date type. Use ISO 8601 strings.

## FAQ

### Why do all values come out as strings?

CSV doesn't store types. Add a small schema or cast each value manually, so numbers, booleans, and dates
end up as the right JSON types.

### Can I convert a CSV without loading it all into memory?

Yes. Use `csv-parse` with async iteration in Node, Jackson's streaming reader in
Java, or `pd.read_csv(chunksize=...)` in Python.

### How do I create nested JSON objects from flat CSV columns?

Use dotted column names like `user.name` and `user.email`, then expand them in
code or with a library such as `flat` or `pandas.json_normalize`.

### What should I do if the CSV has a different delimiter?

Set the parser to the delimiter the file actually uses. `csv.Sniffer` in Python, `csv-parse`'s
`delimiter` option, and Excel's "CSV (semicolon)" export are common fixes.

### How do I handle malformed CSV?

Use a forgiving parser like `papaparse` with `skipEmptyLines` and `error`
callbacks, or configure `csv-parse` to skip blank lines and continue on bad
records.
