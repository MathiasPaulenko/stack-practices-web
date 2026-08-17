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

CSV remains the most widely used format for exchanging tabular data. Python gives you two main approaches: the built-in `csv` module for simple row iteration and pandas for filtering, aggregation, or large datasets. If your end goal is JSON, see [Convert CSV to JSON](/recipes/convert-csv-to-json/) once the data is loaded.

## When to Use

- Read CSV files exported from databases, spreadsheets, or APIs
- Filter or transform tabular data before loading it elsewhere
- Work with files too large to fit in memory and need chunked processing
- Handle messy CSV files with inconsistent quoting or encoding

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

The `csv` module is lightweight and memory-efficient because it reads one row at a time. It's a good fit for simple row-by-row iteration.

pandas reads the whole file into a DataFrame in memory. That means you can run vectorized operations, filtering, grouping, and joins. When a file is larger than available RAM, process it with `chunksize` in batches. Set `dtype` to cut memory usage and avoid type-inference surprises.

The most useful `read_csv` parameters are `sep` for the delimiter (`,` by default, or `\t` for TSV), `encoding` for the file encoding, `dtype` to set column types explicitly, `parse_dates` to parse date columns, `na_values` for custom null strings, and `usecols` to read only the columns you need.

## Variants

| Approach | Library | Memory | Use When |
|----------|---------|--------|----------|
| DictReader | `csv` (stdlib) | Low | Simple row iteration |
| pandas read_csv | `pandas` | High | Filtering, grouping, joins |
| Chunked read | `pandas` | Bounded | Files larger than RAM |
| Dask | `dask.dataframe` | Disk | Files > 10GB, parallel processing |
| Polars | `polars` | Low/High | Faster alternative to pandas |
| DuckDB | `duckdb` | Low/High | SQL-like queries over CSV |

## Best Practices

- Specify `encoding="utf-8"` explicitly and avoid relying on platform defaults.
- Set `dtype` so pandas doesn't infer the wrong types on large files.
- For files over 500MB, set `chunksize` to keep memory usage under control.
- Strip whitespace from column names with `df.columns = df.columns.str.strip()`.
- Before parsing the whole file, check its headers, row count, and size.
- Log each parse error with the file name, line number, and message for debugging.
- For Excel files, use a dedicated reader; see [Read and Write Excel with Python](/recipes/python-excel-read-write/).

## Common Mistakes

- Forgetting `newline=""` in `open()` with the `csv` module on Windows. That produces extra blank rows.
- Letting pandas infer dtypes on mixed columns. It may silently convert strings to NaN.
- Not handling encoding. Older systems often produce files in `latin-1` or `cp1252`.
- Loading entire files into memory when chunked processing would work.
- Ignoring quoting issues. If fields contain commas, set `quoting=csv.QUOTE_ALL`.
- Confusing CSV with Excel. If the source is an `.xlsx` file, use a dedicated reader rather than treating it as CSV.

## FAQ

### How do I read a CSV without headers?

Use `header=None` with `read_csv`, or switch to `csv.reader` instead of `csv.DictReader`.

### How do I handle CSV files with millions of rows?

Use `chunksize` in pandas, or move to Polars or Dask for out-of-core processing. On large files, Polars is typically 5-10x faster than pandas.

### How do I read only specific columns?

Use `usecols=["name", "email"]` with `read_csv`. This keeps memory low when the file contains columns you don't need.

### What is the difference between `read_csv` and `read_table`?

`read_table` defaults to `sep="\t"`, while `read_csv` uses `sep=","`. In other words, they behave the same.

### How do I optimize memory with pandas?

Set explicit dtypes, use `category` for repetitive strings, and try `pd.to_numeric(..., downcast="integer")`. For very large DataFrames, look at Polars or Dask. Monitor with `df.memory_usage(deep=True)`.
