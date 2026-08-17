---
contentType: recipes
slug: parse-csv-python-pandas
title: "Parse CSV Files with Python and Pandas"
description: "How to read, filter, and transform large CSV files efficiently using Python pandas and the csv module."
metaDescription: "Learn CSV parsing in Python with pandas and the csv module. Read, filter, and transform large CSV files efficiently with practical code examples."
difficulty: beginner
topics:
  - data
tags:
  - csv
  - pandas
  - python
  - data-processing
  - file-handling
relatedResources:
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/parse-csv-files
  - /recipes/merge-json-files
  - /recipes/parse-xml-files
  - /recipes/python-excel-read-write
lastUpdated: "2026-08-17"
publishedAt: "2026-07-01"
author: Mathias Paulenko
seo:
  metaDescription: "Learn CSV parsing in Python with pandas and the csv module. Read, filter, and transform large CSV files efficiently with practical code examples."
  keywords:
    - csv
    - pandas
    - python
    - data-processing
    - file-handling
---
## Overview

CSV is still the most common way to exchange tabular data. Python has two main approaches: the built-in csv module for simple row iteration, and pandas for filtering, aggregation, or large datasets. If your end goal is JSON, see [Convert CSV to JSON](/recipes/convert-csv-to-json/) once the data is loaded.

## When to Use

- Read CSV files exported from databases, spreadsheets, or APIs.
- Filter or transform tabular data before loading it elsewhere.
- Work with files too large to fit in memory and need chunked processing.
- Handle messy CSV files with inconsistent quoting or encoding.

## Solution

### Basic CSV parsing with the csv module

```python
import csv

with open("data.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["email"])
```

### Reading CSV with pandas

```python
import pandas as pd

df = pd.read_csv("data.csv")
print(df.head())
print(df.columns)
print(df.shape)
```

### Filtering and transforming

```python
import pandas as pd

df = pd.read_csv("sales.csv")

# Filter rows where revenue > 1000
high_value = df[df["revenue"] > 1000]

# Group by region and sum
by_region = df.groupby("region")["revenue"].sum().reset_index()

# Add a calculated column
df["margin"] = df["revenue"] - df["cost"]

# Export back to CSV
df.to_csv("sales_processed.csv", index=False)
```

### Chunked processing for large files

```python
import pandas as pd

chunk_size = 10000
total = 0

for chunk in pd.read_csv("large_file.csv", chunksize=chunk_size):
    total += chunk["revenue"].sum()

print(f"Total revenue: {total}")
```

### Handling encoding issues

```python
import pandas as pd

# Try common encodings if UTF-8 fails
for encoding in ["utf-8", "latin-1", "cp1252"]:
    try:
        df = pd.read_csv("data.csv", encoding=encoding)
        break
    except UnicodeDecodeError:
        continue
```

### Larger file with explicit types

```python
import pandas as pd

dtypes = {
    "id": "int32",
    "name": "string",
    "price": "float32",
    "quantity": "int16",
    "date": "string",
}

df = pd.read_csv(
    "sales.csv",
    dtype=dtypes,
    parse_dates=["date"],
    encoding="utf-8",
    na_values=["", "NULL", "N/A"],
)

# Filter and aggregate
df["total"] = df["price"] * df["quantity"]
summary = df.groupby("category")["total"].agg(["sum", "mean", "count"]).round(2)
```

## Explanation

The The csv module is lightweight and memory-efficient because it reads one row at a time, which makes it a good fit when you only need to read one row at a time.

pandas loads the entire file into an in-memory DataFrame, which unlocks vectorized operations as well as filtering, grouping, and joins. When a file exceeds available RAM, process it in batches using chunksize, and set dtype explicitly to cut memory usage and avoid type-inference surprises.

read_csv gives you parameters for the delimiter (sep), the file encoding, the column types (dtype), date parsing, null values, and which columns to load (usecols).

## Variants

Different tools trade memory, API style, and speed. Here is how they compare:

| Approach | Library | Memory | Use When |
|----------|---------|--------|----------|
| DictReader | `csv` (stdlib) | Low | Simple row iteration |
| pandas read_csv | `pandas` | High | Filtering, grouping, joins |
| Chunked read | `pandas` | Bounded | Files larger than RAM |
| Dask | `dask.dataframe` | Disk | Files > 10GB, parallel processing |
| Polars | `polars` | Low/High | Faster alternative to pandas |
| DuckDB | `duckdb` | Low/High | SQL-like queries over CSV |

## Best Practices

- Always declare an explicit encoding value instead of relying on platform defaults, and set dtype explicitly so pandas doesn't guess the wrong types on large files.
- For files over 500MB, chunksize keeps memory usage under control.
- Strip whitespace from column names before you analyze the data; a common pattern is `df.columns = df.columns.str.strip()`.
- Always inspect the headers, the number of rows, and the file size before you parse the whole file.
- Logging the file name, line number, and message makes debugging parse errors much easier.
- For Excel inputs, use a dedicated reader; see [Read and Write Excel with Python](/recipes/python-excel-read-write/).

## Common Mistakes

- On Windows, the csv module produces extra blank rows if the open() call omits the newline="" argument, and you can avoid silent string-to-NaN conversions by setting dtype explicitly on mixed columns.
- Skipping encoding handling is risky because older systems often produce files in latin-1 or cp1252.
- Loading entire files into memory when chunked processing would work wastes RAM.
- Ignoring quoting issues can corrupt fields with commas, so use the quoting mode csv.QUOTE_ALL when fields contain commas.
- Confusing CSV with Excel is a common mistake: spreadsheet files should be opened with a dedicated reader instead of parsing them as CSV.

## FAQ

### How do I read a CSV without headers?

When the file has no headers, set header=None inside read_csv, or fall back to csv.reader instead of csv.DictReader.

### How do I handle CSV files with millions of rows?

For millions of rows, split the work with chunksize in pandas, or move to Polars or Dask for out-of-core processing. Polars is usually 5-10x faster than pandas on large files.

### How do I read only specific columns?

You can keep memory low by loading only the columns you actually need, which is exactly what usecols is for.

### What is the difference between read_csv and read_table?

read_table and read_csv are the same function except for the default separator, where the former starts with a tab and the latter starts with a comma.

### How do I optimize memory with pandas?

Use explicit dtypes, convert repetitive strings to the category type, and try pd.to_numeric(..., downcast="integer"). For very large DataFrames, look at Polars or Dask. You can check memory usage with df.memory_usage(deep=True).
