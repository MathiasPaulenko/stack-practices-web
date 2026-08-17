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

CSV remains the default format for moving tabular data between systems. For
plain row iteration, Python's built-in `csv` module is enough. When you need
filtering, grouping, joins, or large-file handling, use pandas instead. If your
end goal is JSON, see [Convert CSV to JSON](/recipes/convert-csv-to-json/) once
the data is loaded.

## When to Use

Reach for this recipe when you pull tabular data from a database, a spreadsheet,
or an API and need to filter or reshape it before the next step. It also helps
when a file is too big for memory, or when the CSV has weird quoting, mixed
encodings, or unexpected delimiters.

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

The `csv` module reads one row at a time, so it stays lightweight and
memory-efficient. It's all you need for plain row-by-row iteration.

With pandas, the whole file becomes an in-memory DataFrame. You get vectorized
operations, filtering, grouping, and joins, but memory can grow quickly. When the
file is larger than RAM, process it in batches with `chunksize` and set `dtype`
explicitly. That keeps memory low and avoids type-inference surprises.

The `read_csv` function takes parameters for the delimiter (`sep`), the file
encoding, the column types (`dtype`), date parsing, custom null values, and
which columns to load (`usecols`).

## Variants

Pick the tool that fits the file size and the operations you need.

| Approach | Library | Memory | Use When |
| --- | --- | --- | --- |
| DictReader | `csv` (stdlib) | Low | Simple row iteration |
| pandas read_csv | `pandas` | High | Filtering, grouping, joins |
| Chunked read | `pandas` | Bounded | Files larger than RAM |
| Dask | `dask.dataframe` | Disk | Files > 10GB, parallel processing |
| Polars | `polars` | Low/High | Faster alternative to pandas |
| DuckDB | `duckdb` | Low/High | SQL-like queries over CSV |

## Best Practices

Start by declaring an explicit encoding value instead of relying on platform
defaults, and set the `dtype` option explicitly so pandas doesn't guess the
wrong types on large files. When a CSV is larger than 500MB, set `chunksize` to
keep memory usage under control. Strip whitespace from column names before
you analyze the data; a common pattern is `df.columns = df.columns.str.strip()`.
Before parsing the whole file, look at the headers, the row count, and the file
size. Logging the file name, line number, and message makes debugging parse
errors much easier. For Excel inputs, use a dedicated reader; see
[Read and Write Excel with Python](/recipes/python-excel-read-write/).

## Common Mistakes

On Windows, the `csv` module adds extra blank rows if the `open()` call omits the
`newline=""` argument. You can avoid silent string-to-NaN conversions by
setting the `dtype` option explicitly on mixed columns. Older systems often
produce files in `latin-1` or `cp1252`, so skipping encoding checks is risky.
Loading the entire file into memory when chunked processing would work is a quick
way to waste RAM. If fields contain commas, ignoring quoting will corrupt your data; set the
`csv.QUOTE_ALL` option in that case. Don't treat an Excel spreadsheet as a CSV
file; open spreadsheets with a dedicated reader
instead of parsing them as CSV.

## FAQ

### How do I read a CSV without headers?

When a CSV has no header row, set `header=None` in `read_csv`. Switch from
`csv.DictReader` to `csv.reader` if you prefer a plain tuple for each row.

### How do I handle CSV files with millions of rows?

For millions of rows, split the work with the `chunksize` argument in pandas, or
move to Polars or Dask for out-of-core processing. On large files, Polars is
usually 5-10x faster than pandas.

### How do I read only specific columns?

Loading only the columns you actually need keeps memory low. The `usecols`
argument handles that.

### What is the difference between read_csv and read_table?

The two functions differ only in the default separator: `read_table` starts with
a tab, while `read_csv` starts with a comma.

### How do I optimize memory with pandas?

Use explicit `dtypes`, convert repetitive strings to the `category` type, and try
`pd.to_numeric(..., downcast="integer")`. For very large DataFrames, look at
Polars or Dask. Check memory usage by calling `df.memory_usage(deep=True)`.
