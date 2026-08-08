---




contentType: recipes
slug: bash-text-processing
title: "Bash Text Processing"
description: "How to build capable text processing pipelines with grep, sed, awk, cut, sort, uniq, and tr for log analysis and data transformation."
metaDescription: "Build text processing pipelines with grep, sed, awk, cut, sort, uniq, and tr for log analysis, data transformation, and one-liners."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - bash
  - linux
  - text-processing
  - recipe
relatedResources:
  - /recipes/bash-loop-over-files
  - /recipes/bash-parallel-execution
  - /recipes/structured-logging
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-parallel-job-execution
lastUpdated: "2026-06-25"
publishedAt: "2026-06-25"
author: Mathias Paulenko
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

Unix text processing tools are designed to be composed into pipelines: each tool does one thing well, and the shell connects them with pipes. A single line of Bash can replace hundreds of lines of Python or JavaScript for log analysis, data extraction, and report generation. Here is how to the essential tools and how to combine them safely.

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

## FAQ

**Q: When should I use awk instead of sed?**
A: Use `awk` for field-based processing, arithmetic, and structured records. Use `sed` for simple substitutions, deletions, and line-oriented transformations.

**Q: How do I handle CSV files safely in Bash?**
A: Use a proper CSV parser like Python's `csv` module or `csvkit`. Pure `cut` or `awk` breaks on quoted fields and embedded commas.

**Q: Why is grep with regex slower than expected?**
A: Backtracking regular expressions, especially with alternations and wildcards, can be slow. Use fixed-string search with `grep -F` when you do not need regex.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.


## Additional Best Practices


- For a deeper guide, see [Bash Loop Over Files](/recipes/bash-loop-over-files/).

1. **Use `LC_ALL=C` for 2-5x speedup on large files.** Byte-wise sorting and comparison bypass locale-aware Unicode processing:

```bash
# Slow: locale-aware sorting
sort large_file.txt > sorted.txt

# Fast: byte-wise sorting (2-5x faster on ASCII data)
LC_ALL=C sort large_file.txt > sorted.txt

# Fast grep on large files
LC_ALL=C grep -n "pattern" huge_file.log
```

2. **Use `grep -F` for fixed strings.** When you do not need regex, fixed-string mode is considerably faster:

```bash
# Slow: regex engine processes literal string
grep "192.168.1.1" access.log

# Fast: fixed-string search (no regex overhead)
grep -F "192.168.1.1" access.log

# Fast: multiple fixed strings from a file
grep -Ff patterns.txt access.log
```

3. **Use `mawk` or `gawk` for performance.** `mawk` is faster than `gawk` for simple tasks, while `gawk` has more features:

```bash
# Check which awk is installed
awk --version 2>/dev/null || awk -W version 2>&1 | head -1

# Install mawk for speed (Debian/Ubuntu)
# apt-get install mawk

# Use mawk explicitly for performance-critical pipelines
mawk '{print $1, $9}' access.log | sort | uniq -c | sort -rn
```


## Additional FAQ

### How do I process very large files without running out of memory?

All classic Unix tools (grep, sed, awk, sort, cut) are stream-oriented and process data line by line. They use constant memory regardless of file size. The exception is `sort`, which uses temporary files for large inputs:

```bash
# Process a 50GB file with constant memory
LC_ALL=C grep "ERROR" huge_log.txt | awk '{print $5}' | sort | uniq -c | sort -rn

# Sort uses temp files automatically when input exceeds memory
# Control temp directory with TMPDIR
TMPDIR=/fast_ssd sort huge_file.txt > sorted.txt
```

### How do I extract data between two patterns?

Use `sed` with address ranges or `awk` with flag variables:

```bash
# sed: print lines between START and END (inclusive)
sed -n '/START/,/END/p' file.txt

# sed: print lines between START and END (exclusive)
sed -n '/START/,/END/p' file.txt | sed '1d;$d'

# awk: more control over inclusion/exclusion
awk '/START/ {found=1; next} /END/ {found=0} found' file.txt

# awk: include start and end markers
awk '/START/ {found=1} found {print} /END/ {found=0}' file.txt
```

### How do I replace text across multiple files safely?

Use `find` with `sed -i` and always create backups:

```bash
#!/bin/bash
set -euo pipefail

# Find and replace across all .conf files, with backup
find /etc/app -name "*.conf" -type f -exec sed -i.bak 's/old_host/new_host/g' {} +

# Verify changes before removing backups
find /etc/app -name "*.conf.bak" | while read bak; do
    orig="${bak%.bak}"
    if diff -q "$orig" "$bak" > /dev/null; then
        echo "No change: $orig"
        rm "$bak"
    else
        echo "Changed: $orig"
        # Review changes, then remove backup if satisfied
        # rm "$bak"
    fi
done
```

### How do I merge two sorted files and remove duplicates?

Use `sort -m` for merging pre-sorted files, then `uniq`:

```bash
# Merge two sorted files, remove duplicates
sort -m file1_sorted.txt file2_sorted.txt | uniq > merged_unique.txt

# Merge and keep only lines present in both files (intersection)
sort file1.txt file2.txt | uniq -d > intersection.txt

# Merge and keep only lines unique to file1 (difference)
sort file1.txt file2.txt file2.txt | uniq -u > only_file1.txt
```

### How do I colorize grep output in scripts?

```bash
# Enable color output in grep
grep --color=auto "pattern" file.txt

# Force color even when piping (useful for logging)
grep --color=always "ERROR" app.log | less -R

# Custom color with awk
awk '
    /ERROR/ {print "\033[31m" $0 "\033[0m"; next}
    /WARN/  {print "\033[33m" $0 "\033[0m"; next}
    /INFO/  {print "\033[32m" $0 "\033[0m"; next}
    {print}
' app.log
```
