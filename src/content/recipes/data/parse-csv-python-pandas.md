---
contentType: recipes
slug: parse-csv-python-pandas
title: "Parse CSV Files with Python and Pandas"
description: "How to read, filter, and transform large CSV files efficiently using Python pandas and the csv module."
metaDescription: "Learn CSV parsing in Python with pandas and csv module. Read, filter, and transform large CSV files efficiently with practical code examples."
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
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Learn CSV parsing in Python with pandas and csv module. Read, filter, and transform large CSV files efficiently with practical code examples."
  keywords:
    - csv
    - pandas
    - python
    - data-processing
    - file-handling
---
## Overview

CSV is the most common format for tabular data exchange. Python has two main approaches for parsing CSV: the built-in `csv` module for simple tasks and pandas for anything involving filtering, aggregation, or large datasets. Here is how to both, with guidance on when to use each.

## When to Use

- You need to read CSV files exported from databases, spreadsheets, or APIs
- You are filtering or transforming tabular data before loading it elsewhere
- You are working with files too large to fit in memory and need chunked processing
- You need to handle messy CSV files with inconsistent quoting or encoding

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

## Explanation

The `csv` module is lightweight and memory-efficient because it reads one row at a time. Use it for simple tasks where you just need to iterate over rows.

pandas loads the entire file into a DataFrame (in-memory). This gives you vectorized operations, filtering, grouping, and joins. For files larger than RAM, use `chunksize` to process in batches.

Key parameters in `read_csv`:
- `sep` — delimiter (default `,`, but `\t` for TSV)
- `encoding` — file encoding (try `latin-1` if UTF-8 fails)
- `dtype` — specify column types to avoid pandas guessing wrong
- `parse_dates` — auto-parse date columns
- `na_values` — custom strings to treat as NaN

## Variants

| Approach | Library | Memory | Use When |
|----------|---------|--------|----------|
| DictReader | `csv` (stdlib) | Low | Simple row iteration |
| pandas read_csv | `pandas` | High | Filtering, grouping, joins |
| Chunked read | `pandas` | Bounded | Files larger than RAM |
| Dask | `dask.dataframe` | Disk | Files > 10GB, parallel processing |

## Guidelines

- Specify `encoding="utf-8"` explicitly. Do not rely on platform defaults.
- Use `dtype` to prevent pandas from inferring wrong types on large files.
- Set `low_memory=False` if you get dtype warnings on mixed-type columns.
- Use `chunksize` for files above 500MB to avoid memory pressure.
- Strip whitespace from column names with `df.columns = df.columns.str.strip()`.

## Common Mistakes

- Forgetting `newline=""` in `open()` with the `csv` module on Windows. This causes extra blank rows.
- Letting pandas infer dtypes on mixed columns. It may silently convert strings to NaN.
- Not handling encoding. Files from older systems often use `latin-1` or `cp1252`.
- Loading entire files into memory when chunked processing would work.
- Ignoring quoting issues. Use `quoting=csv.QUOTE_ALL` if fields contain commas.

## Frequently Asked Questions

### How do I read a CSV without headers?

Pass `header=None` to `read_csv`, or use `csv.reader` instead of `csv.DictReader`.

### How do I handle CSV files with millions of rows?

Use `chunksize` in pandas, or switch to `polars` or `dask` for out-of-core processing. Polars is often 5-10x faster than pandas on large files.

### How do I read only specific columns?

Pass `usecols=["name", "email"]` to `read_csv`. This saves memory when the file has many columns you do not need.

### What is the difference between read_csv and read_table?

Nothing meaningful. `read_table` uses `sep="\t"` by default; `read_csv` uses `sep=","`. They are aliases otherwise.
