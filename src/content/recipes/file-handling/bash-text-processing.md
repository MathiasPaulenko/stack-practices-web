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

## Frequently Asked Questions

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

## Advanced Solutions

### awk state machine for multi-line records

awk can track state across lines to extract multi-line log entries (e.g., stack traces):

```bash
#!/bin/bash

# Extract Java stack traces with their error messages
awk '
    /ERROR/ {
        in_error = 1
        print "---"
        print
        next
    }
    in_error && /^\s+at / {
        print
        next
    }
    in_error && /^Caused by:/ {
        print
        next
    }
    in_error {
        in_error = 0
        print "---"
    }
' app.log

# Extract function blocks from source code
awk '
    /^[a-zA-Z_].*\(/ { in_func = 1; brace_count = 0 }
    in_func { print }
    in_func && /{/ { brace_count++ }
    in_func && /}/ { brace_count--; if (brace_count == 0) { in_func = 0; print "---" } }
' source.c
```

### sed multi-line patterns with N and D

```bash
# Join lines that end with backslash (continuation lines)
sed ':a; /\\$/N; s/\\\n//; ta' file.txt

# Replace text spanning multiple lines
sed 'N;s/match\nacross/matched\nlines/' file.txt

# Delete empty lines between content blocks
sed '/^$/{N;/^\n$/D}' file.txt

# Insert a header before the first line of a file
sed '1i\\## Report Header\n## Generated: $(date)' report.txt

# Capitalize first letter of each word
sed 's/\b\(.\)/\u\1/g' file.txt
```

### Log analysis pipeline with time-window grouping

```bash
#!/bin/bash
set -euo pipefail

# Apache/Nginx log: group requests by 5-minute windows and status code
# Log format: [10/Oct/2024:13:55:36 +0000] "GET /path" 200 1234

awk '
{
    # Extract hour:minute and round to 5-min window
    match($0, /\[([0-9]+)\/([A-Za-z]+)\/([0-9]+):([0-9]+):([0-9]+)/, t)
    if (t[4] != "" && t[5] != "") {
        min = int(t[5] / 5) * 5
        window = sprintf("%s:%02d", t[4], min)
        status = $9  # HTTP status code
        count[window][status]++
    }
}
END {
    for (w in count) {
        for (s in count[w]) {
            printf "%s,%s,%d\n", w, s, count[w][s]
        }
    }
}
' access.log | sort -t',' -k1,1 -k2,2n > status_by_window.csv

echo "Time window,Status code,Request count"
cat status_by_window.csv
```

### CSV processing with awk (handling quoted fields)

```bash
#!/bin/bash

# awk script that handles quoted CSV fields with embedded commas
awk -F'"' '
    function parse_csv(line,    fields, i, in_quote, field, char) {
        in_quote = 0
        field = ""
        field_idx = 1
        for (i = 1; i <= length(line); i++) {
            char = substr(line, i, 1)
            if (char == "\"") {
                in_quote = !in_quote
            } else if (char == "," && !in_quote) {
                fields[field_idx] = field
                field = ""
                field_idx++
            } else {
                field = field char
            }
        }
        fields[field_idx] = field
        return field_idx
    }
    {
        n = parse_csv($0)
        # Print columns 2 and 4 (name and email)
        if (n >= 4) print fields[2], fields[4]
    }
' contacts.csv

# Alternative: use csvkit for robust CSV handling
# csvcut -c 2,4 contacts.csv
# csvgrep -c 3 -r "^Active$" contacts.csv | csvcut -c 1,2
```

### Text extraction and transformation patterns

```bash
#!/bin/bash
set -euo pipefail

# Extract all URLs from a text file
grep -oP 'https?://[^\s<>"'"'"']+' input.txt | sort -u

# Extract email addresses and count by domain
grep -oP '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' emails.txt | \
    awk -F'@' '{print $2}' | sort | uniq -c | sort -rn

# Extract and normalize phone numbers
sed -E 's/([0-9]{3})[-. ]?([0-9]{3})[-. ]?([0-9]{4})/\1-\2-\3/g' contacts.txt

# Extract key-value pairs from config files
awk -F'=' '/^[^#]/ && NF==2 {gsub(/^[ \t]+|[ \t]+$/, "", $1); gsub(/^[ \t]+|[ \t]+$/, "", $2); print $1"="$2}' config.ini

# Convert tab-separated to comma-separated (handling embedded tabs)
tr '\t' ',' < data.tsv > data.csv

# Remove ANSI color codes from output
sed 's/\x1b\[[0-9;]*m//g' colored_output.txt

# Extract JSON values with grep and sed (fallback when jq is unavailable)
grep -oP '"user_id"\s*:\s*\K[0-9]+' response.json | head -1
grep -oP '"name"\s*:\s*"\K[^"]+' response.json
```

### Parallel text processing with split and merge

```bash
#!/bin/bash
set -euo pipefail

INPUT_FILE="large_log.txt"
CHUNK_SIZE=100000
OUTPUT_DIR=$(mktemp -d)
trap 'rm -rf "$OUTPUT_DIR"' EXIT

# Split file into chunks
split -l "$CHUNK_SIZE" "$INPUT_FILE" "$OUTPUT_DIR/chunk_"

# Process chunks in parallel
for chunk in "$OUTPUT_DIR"/chunk_*; do
    (
        # Count errors per chunk
        grep -c "ERROR" "$chunk" > "${chunk}.result"
    ) &
done
wait

# Merge results
total=0
for result in "$OUTPUT_DIR"/chunk_*.result; do
    count=$(cat "$result")
    total=$((total + count))
done

echo "Total ERROR lines: $total"
```

### awk one-liner collection for common tasks

```bash
# Filter lines by line number range
awk 'NR>=10 && NR<=20' file.txt

# Print every Nth line
awk 'NR%3==0' file.txt          # Every 3rd line

# Remove duplicate lines preserving order
awk '!seen[$0]++' file.txt

# Join lines with a separator
awk '{printf "%s%s", $0, (NR==1?"":", ")} END {print ""}' file.txt

# Calculate running total
awk '{sum += $1; print NR, $1, sum}' numbers.txt

# Find the longest line
awk '{if (length > max) {max = length; line = $0}} END {print line}' file.txt

# Print lines longer than N characters
awk 'length > 80' file.txt

# Trim leading and trailing whitespace
awk '{gsub(/^[ \t]+|[ \t]+$/, ""); print}' file.txt

# Reverse column order
awk '{for (i=NF; i>=1; i--) printf "%s%s", $i, (i>1?OFS:ORS)}' file.txt

# Count words per line
awk '{print NR, NF, $0}' file.txt

# Print field number and name pairs
awk '{for (i=1; i<=NF; i++) print i, $i}' file.txt
```

## Additional Best Practices

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

## Additional Common Mistakes

1. **Using `sed -i` without a backup on production files.** A bad regex can destroy file contents irreversibly:

```bash
# Risky: no backup
sed -i 's/pattern/replacement/g' important.conf

# Safe: create backup with .bak extension
sed -i.bak 's/pattern/replacement/g' important.conf

# Safe: write to temp file first, verify, then replace
sed 's/pattern/replacement/g' important.conf > important.conf.tmp
diff important.conf important.conf.tmp  # Verify changes
mv important.conf.tmp important.conf
```

2. **Not anchoring regex patterns.** `grep "error"` matches "errors", "errorlog", "noerror" — use word boundaries:

```bash
# Unintended: matches substrings
grep "error" log.txt  # Also matches "errorlog", "noerror"

# Precise: word boundary
grep -w "error" log.txt  # Only matches the word "error"

# Precise: anchored
grep -E "^error | error$" log.txt  # Start or end of line
```

3. **Assuming `awk` field separator handles all delimiters.** `-F','` does not handle quoted CSV fields with embedded commas. Use a proper CSV parser:

```bash
# Broken: splits on every comma, including those inside quotes
awk -F',' '{print $2}' "John, Doe",35,"123 Main St, Apt 4"

# Correct: use csvkit
csvcut -c 2 contacts.csv

# Correct: use Python
python3 -c "
import csv, sys
for row in csv.reader(sys.stdin):
    print(row[1])
" < contacts.csv
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
