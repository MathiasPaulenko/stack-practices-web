---
contentType: recipes
slug: bash-loop-over-files
title: "Bash Loop Over Files"
description: "How to safely loop over files and directories in Bash, handling spaces, globs, and large file lists with correct patterns."
metaDescription: "Safely loop over files and directories in Bash handling spaces, globs, and large file lists with correct patterns."
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
  metaDescription: "Safely loop over files and directories in Bash handling spaces, globs, and large file lists with correct patterns."
  keywords:
    - file-handling
    - bash
    - loops
    - globbing
    - shell
    - recipe
---

## Overview

Looping over files is one of the most common Bash operations, yet it is frequently done incorrectly. Filenames with spaces, newlines, or glob characters (`*`, `?`) break naive loops. This recipe shows safe, portable patterns for iterating files, filtering by extension, recursing into subdirectories, and processing results.

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

## Best Practices

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

## Related Resources

- [Bash Parallel Execution](/recipes/file-handling/bash-parallel-execution)
- [Bash Text Processing](/recipes/file-handling/bash-text-processing)
- [Generate Temporary Files](/recipes/file-handling/generate-temporary-files)
