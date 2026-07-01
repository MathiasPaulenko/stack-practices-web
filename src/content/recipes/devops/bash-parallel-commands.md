---
contentType: recipes
slug: bash-parallel-commands
title: "Run Shell Commands in Parallel with Bash"
description: "Execute multiple shell commands concurrently using xargs, GNU parallel, and background jobs."
metaDescription: "Run shell commands in parallel with bash. Use xargs, GNU parallel, and background jobs to speed up batch processing with code examples."
difficulty: intermediate
topics:
  - devops
tags:
  - bash
  - parallel
  - xargs
  - gnu-parallel
  - concurrency
  - shell
relatedResources:
  - /recipes/bash-parallel-job-execution
  - /recipes/bash-parallel-execution
  - /recipes/bash-backup-rotation
  - /recipes/bash-scripting-automation
  - /recipes/bash-loop-over-files
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Run shell commands in parallel with bash. Use xargs, GNU parallel, and background jobs to speed up batch processing with code examples."
  keywords:
    - bash
    - parallel
    - xargs
    - gnu-parallel
    - concurrency
    - shell
---
## Overview

Running commands sequentially is slow when tasks are independent. Bash has three built-in approaches for parallelism: background jobs with `&`, `xargs -P`, and `GNU parallel`. This recipe covers all three with practical examples for batch file processing, image conversion, and API calls.

## When to Use

- You need to process hundreds of files (resize, convert, compress)
- You are making API calls to multiple endpoints
- You want to speed up batch operations that are I/O bound
- You need to run independent shell commands concurrently

## Solution

### Background jobs with wait

```bash
#!/bin/bash

process_file() {
    local file="$1"
    gzip "$file"
    echo "Done: $file"
}

for file in *.log; do
    process_file "$file" &
done

wait
echo "All files processed"
```

### Limit concurrency with xargs

```bash
# Compress 4 files at a time
find . -name "*.log" -print0 | xargs -0 -P4 -I{} gzip {}

# Resize images 8 at a time
ls *.jpg | xargs -P8 -I{} convert {} -resize 50% small_{}
```

### GNU parallel

```bash
# Install if needed
# apt install parallel

# Process files in parallel with progress bar
ls *.jpg | parallel -j 8 convert {} -resize 50% small_{}

# Process with progress and ETA
ls *.jpg | parallel --progress -j 8 convert {} -resize 50% small_{}

# Keep output ordered
ls *.txt | parallel -k grep "error" {}
```

### Parallel with custom function

```bash
#!/bin/bash

process_url() {
    local url="$1"
    local output=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    echo "$url: $output"
}

export -f process_url

urls=(
    "https://api.example.com/users"
    "https://api.example.com/posts"
    "https://api.example.com/comments"
)

printf '%s\n' "${urls[@]}" | parallel -j 4 process_url {}
```

### Collect results from parallel jobs

```bash
#!/bin/bash

# Run commands in background and collect exit codes
declare -a pids
declare -a results

for i in 1 2 3 4 5; do
    (sleep $((RANDOM % 5)); echo "Task $i done") &
    pids+=($!)
done

for pid in "${pids[@]}"; do
    wait "$pid"
    results+=("PID $pid exited with $?")
done

for result in "${results[@]}"; do
    echo "$result"
done
```

### Parallel file downloads

```bash
#!/bin/bash

urls_file="downloads.txt"
# downloads.txt contains one URL per line

cat "$urls_file" | xargs -P4 -I{} wget -q {}

# Or with GNU parallel
cat "$urls_file" | parallel -j 4 wget -q {}
```

### Parallel with output to separate files

```bash
# Each command writes to its own log file
ls *.txt | parallel 'grep "error" {} > {.}.errors'

# {.} removes the extension, so file.txt becomes file.errors
```

## Explanation

Background jobs (`&`) send a process to the background and return immediately. `wait` blocks until all background jobs finish. This is the simplest approach but has no built-in concurrency limit. If you start 1000 jobs, you get 1000 simultaneous processes.

`xargs -P N` runs up to N commands in parallel. It reads items from stdin and passes each to the command. `-0` handles filenames with spaces. `-I{}` lets you position the argument precisely.

`GNU parallel` is the most capable tool. It supports:
- **`-j N`**: Limit concurrent jobs to N.
- **`-k`**: Keep output in order of input (not completion order).
- **`--progress`**: Show a progress bar.
- **`{}`**: Placeholder for the input item.
- **`{.}`**: Input item without extension.
- **`--eta`**: Show estimated time of completion.

## Variants

| Approach | Concurrency Control | Ordering | Use When |
|----------|-------------------|----------|----------|
| `&` + `wait` | None | None | Few jobs, simple scripts |
| `xargs -P` | Fixed (-P N) | None | Batch file processing |
| GNU parallel | Fixed (-j N) | Optional (-k) | Complex parallel workflows |
| `coproc` | Single | None | Bidirectional communication |

## Guidelines

- Limit concurrency to the number of CPU cores for CPU-bound tasks. Use `-j $(nproc)`.
- For I/O-bound tasks (downloads, API calls), higher concurrency (8-16) is fine.
- Use `xargs -0` or `parallel` to handle filenames with spaces correctly.
- Export functions with `export -f` before using them in `xargs` or `parallel`.
- Use `--dry-run` with `parallel` to preview commands before running them.

## Common Mistakes

- Starting too many background jobs without a limit. This can exhaust memory or file descriptors.
- Not using `wait` after background jobs. The script exits before jobs finish.
- Forgetting `-0` with `xargs` when filenames contain spaces. Files get split on spaces.
- Not exporting functions when using them with `parallel`. The function is not available in subshells.
- Mixing output from parallel jobs without `-k`. Output interleaves and becomes unreadable.

## Frequently Asked Questions

### How do I limit parallelism to the number of CPU cores?

```bash
find . -name "*.jpg" | parallel -j $(nproc) convert {} -resize 50% small_{}
```

### How do I retry failed commands with GNU parallel?

Use `--retries N`:

```bash
cat urls.txt | parallel --retries 3 wget -q {}
```

### Can I use parallel with SSH?

Yes. GNU parallel can run commands on remote machines:

```bash
parallel --sshlogin server1,server2 -j 2 --transfer --return {}.out --cleanup "process.sh {}" ::: file1 file2
```

### How do I show a progress bar with xargs?

`xargs` does not have a built-in progress bar. Use `parallel --progress` instead, or pipe through `pv`:

```bash
cat urls.txt | pv -l | xargs -P4 -I{} wget -q {}
```
