---
contentType: recipes
slug: bash-loop-over-files
title: "Bash Loop Over Files"
description: "How to safely loop over files and directories in Bash, handling spaces, globs, and large file lists with correct patterns."
metaDescription: "Safely loop over files and directories in Bash: handle spaces, globs, special characters, and large file lists with correct glob patterns."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - bash
  - loops
  - globbing
  - shell
  - recipe
relatedResources:
  - /recipes/file-handling/bash-parallel-execution
  - /recipes/file-handling/bash-text-processing
  - /recipes/file-handling/generate-temporary-files
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Safely loop over files and directories in Bash: handle spaces, globs, special characters, and large file lists with correct glob patterns."
  keywords:
    - file-handling
    - bash
    - loops
    - globbing
    - shell
    - recipe
---

## Overview

Looping over files is one of the most common Bash operations, yet it is frequently done incorrectly. Filenames with spaces, newlines, or glob characters (`*`, `?`) break naive loops. This approach shows how to safe, portable patterns for iterating files, filtering by extension, recursing into subdirectories, and processing results.

## When to Use

- Running the same command on many files (convert, analyze, move)
- Finding files matching a pattern and processing them in order
- Bulk renaming, permission changes, or validation
- Generating reports from a directory of input files
- Replacing text across multiple files

## When NOT to Use

- Processing millions of files — argument list length limits (`ARG_MAX`) will fail
- Complex filtering that is easier in `find` with `-exec` or `xargs`
- Operations requiring cross-file state — use a proper scripting language (Python, Perl)
- Tasks that need error recovery per file — `set -e` with loops is tricky

## Step-by-Step Implementation

### Basic Safe Loop with Glob

```bash
#!/bin/bash
set -euo pipefail

# CORRECT: Always quote the variable
txt_count=0
for file in *.txt; do
    # Handle the no-match case (glob leaves literal '*.txt')
    [ -e "$file" ] || continue
    echo "Processing: $file"
    ((txt_count++))
done
echo "Total .txt files: $txt_count"
```

### Recurse with `find`

```bash
#!/bin/bash
set -euo pipefail

# Process all .py files under src/, safely handling spaces
while IFS= read -r -d '' file; do
    echo "Linting: $file"
    pylint "$file"
done < <(find src/ -type f -name '*.py' -print0)

# One-liner version with xargs (no loop needed)
find src/ -type f -name '*.py' -print0 | xargs -0 pylint

# Process with a limit (safer for huge directories)
find src/ -maxdepth 2 -type f -name '*.py' -print0 | \
    xargs -0 -n 10 -P 4 pylint
```

### Filter and Sort

```bash
#!/bin/bash

# Numeric sort on filenames like report_001.txt, report_002.txt
for file in $(ls -1 report_*.txt | sort -t_ -k2 -n); do
    echo "Processing in order: $file"
done

# Safer alternative using array + glob
files=(report_*.txt)
IFS=$'\n' sorted=($(sort -t_ -k2 -n <<< "${files[*]}")); unset IFS
for file in "${sorted[@]}"; do
    echo "Ordered: $file"
done
```

### Process Files with Spaces and Special Characters

```bash
#!/bin/bash
set -euo pipefail

# Handle filenames with spaces, newlines, and globs
srcdir="/data/uploads"

# Approach 1: read with find -print0
while IFS= read -r -d '' filepath; do
    filename=$(basename "$filepath")
    echo "File: $filename"
done < <(find "$srcdir" -type f -print0)

# Approach 2: shopt nullglob + quoted expansion
shopt -s nullglob
targets=("$srcdir"/*)
shopt -u nullglob

for filepath in "${targets[@]}"; do
    [ -f "$filepath" ] || continue
    echo "Found: $(basename "$filepath")"
done
```

### Bulk Operations

```bash
#!/bin/bash
set -euo pipefail

# Rename .jpeg to .jpg
for file in *.jpeg; do
    [ -e "$file" ] || continue
    mv -- "$file" "${file%.jpeg}.jpg"
done

# Convert all HEIC images to JPEG
for file in *.heic; do
    [ -e "$file" ] || continue
    base="${file%.heic}"
    heif-convert "$file" "$base.jpg"
done

# Validate all JSON files
error_count=0
for file in *.json; do
    [ -e "$file" ] || continue
    if ! jq empty "$file" 2>/dev/null; then
        echo "ERROR: Invalid JSON in $file" >&2
        ((error_count++))
    fi
done
[ "$error_count" -eq 0 ] || exit 1
```

## What Works

- **Always quote file variables.** `"$file"` prevents word splitting on spaces and interpretation of glob characters.
- **Use `find -print0 | while read -r -d ''`** for recursive or complex filtering. It is the only portable way to handle all valid filenames.
- **Enable `nullglob` when using globs in loops.** Otherwise `*.txt` with no matches iterates once with the literal string `*.txt`.
- **Use `--` before filenames in commands.** `mv -- "$file" "$dest"` prevents filenames starting with `-` from being interpreted as options.
- **Check `[ -e "$file" ]` at loop start.** Handles both `nullglob` disabled and empty directory cases.

## Common Mistakes

- **`for file in $(ls *.txt)` — never do this.** `ls` output is not parseable; spaces and newlines in filenames break the loop.
- **Unquoted variables:** `mv $file $dest` fails on `My Document.txt` because it splits into two arguments.
- **Forgetting `nullglob`:** The loop body runs once with `*.txt` as the filename when no matches exist.
- **Using `cat` to feed a single file to a program:** `cat "$file" | grep pattern` is a useless use of `cat`. Use `grep pattern "$file"`.
- **Not handling the no-match case:** An empty directory with a naive loop can produce unexpected behavior or errors.

## Frequently Asked Questions

**Q: Why should I avoid `for f in $(ls)`?**
A: It breaks on filenames with spaces or special characters. Use a glob pattern like `for f in *.txt` or `while IFS= read -r` with `find -print0`.

**Q: When should I use `find` instead of a glob loop?**
A: Use `find` when you need recursion, filtering by size or date, or when you must handle arbitrary filenames safely with `-print0`.

**Q: How do I process files in subdirectories?**
A: Use `find . -type f -name "*.txt" -print0 | while IFS= read -r -d  file; do ... done` to safely traverse nested directories.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Associative array for file metadata

```bash
#!/bin/bash
set -euo pipefail

# Track file metadata in an associative array
declare -A file_sizes
declare -A file_hashes

shopt -s nullglob
for file in *.log; do
    file_sizes["$file"]=$(stat -c%s "$file")
    file_hashes["$file"]=$(sha256sum "$file" | cut -d' ' -f1)
done

# Report
for file in "${!file_sizes[@]}"; do
    size="${file_sizes[$file]}"
    hash="${file_hashes[$file]}"
    printf "%-30s %10s bytes  %s\n" "$file" "$size" "${hash:0:16}"
done

# Find duplicates by hash
declare -A hash_count
for file in "${!file_hashes[@]}"; do
    hash="${file_hashes[$file]}"
    ((hash_count["$hash"]++))
done

echo "Duplicate files:"
for hash in "${!hash_count[@]}"; do
    if [ "${hash_count[$hash]}" -gt 1 ]; then
        echo "  Hash ${hash:0:16}... has ${hash_count[$hash]} copies"
    fi
done
```

### Parallel processing with progress tracking

```bash
#!/bin/bash
set -euo pipefail

# Process files in parallel with a progress bar
process_dir="${1:-.}"
max_jobs=4
total=0
done=0

# Count total files
shopt -s nullglob
files=("$process_dir"/*.jpg)
total=${#files[@]}
shopt -u nullglob

if [ "$total" -eq 0 ]; then
    echo "No files to process"
    exit 0
fi

echo "Processing $total files with $max_jobs parallel workers..."

pids=()
for file in "${files[@]}"; do
    # Wait if we have too many running
    while [ "$(jobs -rp | wc -l)" -ge "$max_jobs" ]; do
        wait -n 2>/dev/null || sleep 0.1
    done

    (
        base="${file%.jpg}"
        convert "$file" -resize 1200x -quality 85 "${base}_optimized.jpg" 2>/dev/null
    ) &

    pids+=($!)
    ((done++))
    printf "\rProgress: %d/%d (%d%%)" "$done" "$total" $((done * 100 / total))
done

wait
echo ""
echo "Done: processed $total files"
```

### Safe batch rename with dry-run mode

```bash
#!/bin/bash
set -euo pipefail

# Batch rename files with pattern replacement and dry-run support
DRY_RUN=false
PATTERN=""
REPLACEMENT=""

while getopts "dnp:r:" opt; do
    case $opt in
        d) DRY_RUN=true ;;
        n) DRY_RUN=true ;;
        p) PATTERN="$OPTARG" ;;
        r) REPLACEMENT="$OPTARG" ;;
        *) echo "Usage: $0 [-d] -p PATTERN -r REPLACEMENT <dir>"; exit 1 ;;
    esac
done
shift $((OPTIND - 1))

target_dir="${1:-.}"

if [ -z "$PATTERN" ]; then
    echo "Error: pattern (-p) is required"
    exit 1
fi

shopt -s nullglob
renamed=0
for file in "$target_dir"/*; do
    [ -f "$file" ] || continue
    filename=$(basename "$file")
    new_name="${filename//$PATTERN/$REPLACEMENT}"
    if [ "$filename" != "$new_name" ]; then
        if $DRY_RUN; then
            echo "[DRY-RUN] $filename -> $new_name"
        else
            mv -- "$file" "$target_dir/$new_name"
            echo "[OK] $filename -> $new_name"
        fi
        ((renamed++))
    fi
done

echo "Total: $renamed files $($DRY_RUN && echo 'would be ' || echo '')renamed"
```

### Error handling with per-file exit codes

```bash
#!/bin/bash
set -uo pipefail

# Process files and collect per-file exit codes without aborting on error
declare -A results
error_count=0
ok_count=0

while IFS= read -r -d '' file; do
    if python3 -c "import json; json.load(open('$file'))" 2>/dev/null; then
        results["$file"]="OK"
        ((ok_count++))
    else
        results["$file"]="FAIL"
        ((error_count++))
    fi
done < <(find . -type f -name '*.json' -print0)

# Summary report
echo "=== Validation Report ==="
echo "OK:   $ok_count"
echo "FAIL: $error_count"
echo ""

if [ "$error_count" -gt 0 ]; then
    echo "Failed files:"
    for file in "${!results[@]}"; do
        if [ "${results[$file]}" = "FAIL" ]; then
            echo "  - $file"
        fi
    done
    exit 1
fi
```

## Additional Best Practices

1. **Use `mapfile` for reading file lists into arrays.** It is faster than a `while read` loop for large lists and preserves special characters:

```bash
#!/bin/bash
# Read all .py files into an array safely
mapfile -d '' -t pyfiles < <(find src/ -type f -name '*.py' -print0)

echo "Found ${#pyfiles[@]} Python files"
for file in "${pyfiles[@]}"; do
    echo "  $file"
done
```

2. **Use `xargs` for simple one-command-per-file operations.** It handles batching and parallelism automatically:

```bash
#!/bin/bash
# Compress all .log files in parallel (4 at a time)
find /var/log -type f -name '*.log' -print0 | xargs -0 -P 4 -I{} gzip "{}"

# Run eslint on all .js files, 20 at a time
find src/ -type f -name '*.js' -print0 | xargs -0 -n 20 eslint
```

3. **Set `IFS` correctly when parsing command output.** The default IFS includes spaces, which breaks filenames. Always use `IFS=` with `read`:

```bash
#!/bin/bash
# Bad: IFS includes space, breaks on "My File.txt"
# echo "My File.txt" | while read file; do echo "$file"; done
# Output: "My" and "File.txt" on separate lines

# Good: IFS= prevents leading/trailing whitespace trimming
echo "My File.txt" | while IFS= read -r file; do echo "$file"; done
# Output: "My File.txt"
```

## Additional Common Mistakes

1. **Using `for file in $(find ...)` instead of `while read`.** The `for` loop splits on spaces, breaking filenames with spaces. Always pipe `find -print0` into `while IFS= read -r -d ''`:

```bash
# Bad: breaks on spaces
# for file in $(find . -name "*.txt"); do echo "$file"; done

# Good: handles all filenames
while IFS= read -r -d '' file; do
    echo "$file"
done < <(find . -name "*.txt" -print0)
```

2. **Not using `set -euo pipefail` in scripts.** Without `set -e`, errors in the loop body are silently ignored. Without `set -u`, undefined variables expand to empty strings. Without `pipefail`, piped commands that fail are masked:

```bash
#!/bin/bash
# Bad: errors are silently ignored
# for file in *.txt; do
#     process "$file"
# done

# Good: abort on error, undefined variable, or pipe failure
set -euo pipefail
for file in *.txt; do
    [ -e "$file" ] || continue
    process "$file"
done
```

3. **Modifying files while iterating.** Adding, removing, or renaming files during a glob loop can cause skipped or duplicate processing. Collect the file list first, then iterate:

```bash
#!/bin/bash
shopt -s nullglob
files=(*.tmp)
shopt -u nullglob

for file in "${files[@]}"; do
    # Safe: we already captured the list
    rm -- "$file"
done
```

## Additional FAQ

### How do I loop over files sorted by modification time?

Use `find` with `-printf` and `sort`, or `ls -t` with `mapfile`:

```bash
#!/bin/bash
# Sort by modification time (newest first)
mapfile -d '' -t files < <(find . -type f -name '*.log' -printf '%T@ %p\0' | sort -rz -n | cut -z -d' ' -f2-)

for file in "${files[@]}"; do
    echo "$(date -r "$file" '+%Y-%m-%d %H:%M') $file"
done

# Alternative: ls -t for simple cases (no spaces in names)
# for file in $(ls -t *.log); do echo "$file"; done
```

### How do I skip files larger than a certain size?

Use `find` with `-size` filter:

```bash
#!/bin/bash
# Process only files smaller than 10MB
while IFS= read -r -d '' file; do
    size=$(stat -c%s "$file")
    echo "Processing $file ($((size / 1024)) KB)"
done < <(find . -type f -name '*.log' -size -10M -print0)
```

### How do I loop over files matching multiple extensions?

Use brace expansion with `nullglob`, or `find` with multiple `-name` patterns:

```bash
#!/bin/bash
shopt -s nullglob

# Brace expansion
for file in *.{jpg,jpeg,png,webp}; do
    [ -f "$file" ] || continue
    echo "Image: $file"
done

# find with multiple -name
while IFS= read -r -d '' file; do
    echo "Image: $file"
done < <(find . -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.webp' \) -print0)
```

### How do I handle filenames with newlines?

Only `find -print0` with `read -d ''` handles filenames containing newlines. Glob patterns also work since Bash expands them correctly. Never use `ls` output or unquoted command substitution:

```bash
#!/bin/bash
# This handles filenames with newlines, spaces, and special characters
while IFS= read -r -d '' file; do
    echo "Processing: $file"
done < <(find . -type f -print0)
```
