---
contentType: recipes
slug: bash-text-processing
title: "Bash Text Processing"
description: "How to build powerful text processing pipelines with grep, sed, awk, cut, sort, uniq, and tr for log analysis and data transformation."
metaDescription: "Build text processing pipelines with grep, sed, awk, cut, sort, uniq, and tr for log analysis, data transformation, and one-liners."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - bash
  - grep
  - sed
  - awk
  - text-processing
  - recipe
relatedResources:
  - /recipes/file-handling/bash-loop-over-files
  - /recipes/file-handling/bash-parallel-execution
  - /recipes/observability/structured-logging
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Build text processing pipelines with grep, sed, awk, cut, sort, uniq, and tr for log analysis, data transformation, and one-liners."
  keywords:
    - file-handling
    - bash
    - grep
    - sed
    - awk
    - text-processing
    - recipe
---

## Overview

Unix text processing tools are designed to be composed into pipelines: each tool does one thing well, and the shell connects them with pipes. A single line of Bash can replace hundreds of lines of Python or JavaScript for log analysis, data extraction, and report generation. This recipe covers the essential tools and how to combine them safely.

## When to Use

- Extracting and filtering log lines by pattern, time, or status code
- Transforming CSV or tabular data (sorting, deduplication, aggregation)
- Searching codebases for patterns across thousands of files
- Generating quick reports from structured text output
- Pre-processing data before feeding it to a database or API

## When NOT to Use

- Parsing nested or irregular formats (JSON, XML, HTML) — use `jq`, `xq`, or a proper parser
- Tasks requiring complex state across lines — awk can do it, but Python is more maintainable
- Multi-step transformations where error handling matters — scripting languages have better debugging
- Unicode edge cases — classic tools are byte-oriented and may mangle multibyte characters

## Step-by-Step Implementation

### grep — Pattern Matching

```bash
# Search recursively, show line numbers, ignore binary files
grep -rn "ERROR" logs/

# Invert match, count occurrences
grep -vc "^#" config.ini

# Multiple patterns with extended regex
grep -E "(ERROR|FATAL|CRITICAL)" app.log

# Context lines: 2 before, 3 after
grep -B 2 -A 3 "Exception" app.log

# Only filenames containing match (useful for batch operations)
grep -rl "TODO" src/

# Perl-compatible regex (PCRE) for lookaheads
grep -P "(?<=user_id=)\d+" access.log
```

### sed — Stream Editing

```bash
# Replace first occurrence per line
sed 's/foo/bar/' file.txt

# Replace all occurrences globally
sed 's/foo/bar/g' file.txt

# Replace in-place with backup
sed -i.bak 's/old_domain/new_domain/g' config.conf

# Delete lines matching pattern
sed '/^#/d' config.ini        # Remove comments
sed '/^$/d' file.txt          # Remove empty lines

# Extract specific lines
sed -n '10,20p' file.txt      # Print lines 10-20
sed -n '50,$p' file.txt       # Print from line 50 to end

# Multi-line replacement (append after match)
sed '/pattern/a\\New line after match' file.txt
```

### awk — Field Processing and Aggregation

```bash
# Print specific columns (space/tab delimited)
awk '{print $1, $3}' access.log

# Sum a column
awk '{sum += $2} END {print sum}' sales.txt

# Average with count
awk '{sum += $2; count++} END {if (count) print sum/count}' data.txt

# Filter rows by condition
awk '$3 > 100 {print $1, $3}' orders.csv

# Process CSV with custom delimiter
awk -F',' '{print $2, $5}' customers.csv

# Group by and count (like SQL GROUP BY)
awk '{count[$1]++} END {for (k in count) print k, count[k]}' status.log

# Format output with headers
awk 'BEGIN {print "IP", "Requests"} {count[$1]++} END {for (ip in count) print ip, count[ip]}' access.log
```

### cut, sort, uniq — Column Extraction and Deduplication

```bash
# Extract columns by position or delimiter
cut -d',' -f1,3,5 data.csv
cut -c1-10 file.txt           # First 10 characters

# Sort numerically, reverse, by specific column
sort -t',' -k3 -n sales.csv   # Sort by 3rd column numerically
sort -u file.txt               # Sort and remove duplicates

# Count unique occurrences
sort file.txt | uniq -c | sort -rn   # Most frequent first

# Show only duplicate or unique lines
sort file.txt | uniq -d       # Only duplicates
sort file.txt | uniq -u       # Only unique lines
```

### tr — Character Translation

```bash
# Convert to uppercase
cat file.txt | tr 'a-z' 'A-Z'

# Squeeze repeated characters
tr -s ' ' < file.txt           # Collapse multiple spaces to one

# Delete characters
tr -d '\r' < file.txt          # Remove carriage returns

# Replace line endings
tr '\n' ',' < lines.txt > comma-separated.txt
```

### Complex Pipelines

```bash
# Top 10 most frequent error types in a log
awk '$0 ~ /ERROR|FATAL/ {print $5}' app.log | \
    sort | uniq -c | sort -rn | head -10

# Extract unique client IPs with request count, sorted
awk '{print $1}' access.log | sort | uniq -c | sort -rn | \
    awk '{print $2 "," $1}' > ip_counts.csv

# Find slow queries (>1s) and group by table
awk '$NF > 1 {print}' slow_query.log | \
    grep -oP 'FROM \K\w+' | sort | uniq -c | sort -rn

# Convert log timestamps to ISO format and filter a date range
sed -n '/2024-06-01/,/2024-06-07/p' app.log | \
    awk '{gsub(/\//, "-", $1); print $1 "T" $2}'

# Generate a report: status code distribution
awk '{print $9}' access.log | sort | uniq -c | \
    awk '{printf "%s: %d requests (%.1f%%)\n", $2, $1, $1*100/total}' \
    total=$(wc -l < access.log)
```

## What Works

- **Always quote regex patterns with special characters.** `grep "$pattern"` prevents the shell from expanding `*` or `?` before grep sees them.
- **Use `awk` for columnar data instead of `cut` when fields vary in width.** `cut` fails on variable spacing; `awk` splits on any whitespace by default.
- **Prefer `jq` for JSON, `xq` for XML, `csvkit` for CSV.** Classic tools treat these formats as plain text and will break on quoted fields or nested structures.
- **Chain tools left to right in order of filtering.** Put `grep` early to reduce data volume before expensive `awk` or `sort` operations.
- **Use `LC_ALL=C` for consistent sorting and performance.** It forces byte-wise sorting and avoids locale-dependent behavior.

## Common Mistakes

- **Parsing JSON/HTML with grep/sed/awk.** These are not structured formats — use `jq`, `python -m json.tool`, or a DOM parser.
- **Forgetting that `sed` and `awk` operate line by line by default.** Multi-line patterns require special flags (`sed -z`, `awk` RS manipulation) that are non-obvious.
- **Assuming `sort` is stable by default.** `sort` stability varies by implementation; use `sort -s` if you need it.
- **Using `cat` unnecessarily.** `cat file | grep pattern` is a useless use of `cat`. Use `grep pattern file`.
- **Not handling empty input.** Many pipelines fail silently on empty files — add `| cat` at the end or check file size first.

## Frequently Asked Questions

**Q: When should I use awk instead of sed?**
A: Use `awk` for field-based processing, arithmetic, and structured records. Use `sed` for simple substitutions, deletions, and line-oriented transformations.

**Q: How do I handle CSV files safely in Bash?**
A: Use a proper CSV parser like Python's `csv` module or `csvkit`. Pure `cut` or `awk` breaks on quoted fields and embedded commas.

**Q: Why is grep with regex slower than expected?**
A: Backtracking regular expressions, especially with alternations and wildcards, can be slow. Use fixed-string search with `grep -F` when you do not need regex.
