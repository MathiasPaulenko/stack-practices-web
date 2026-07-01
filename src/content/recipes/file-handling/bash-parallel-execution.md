---
contentType: recipes
slug: bash-parallel-execution
title: "Bash Parallel Execution"
description: "How to run shell commands in parallel with xargs, GNU parallel, and Bash background jobs while controlling concurrency and collecting results."
metaDescription: "Run shell commands in parallel with xargs, GNU parallel, and Bash background jobs while controlling concurrency and resource usage."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - bash
  - parallel
  - xargs
  - concurrency
  - performance
  - recipe
relatedResources:
  - /recipes/file-handling/bash-loop-over-files
  - /recipes/file-handling/bash-text-processing
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Run shell commands in parallel with xargs, GNU parallel, and Bash background jobs while controlling concurrency and resource usage."
  keywords:
    - file-handling
    - bash
    - parallel
    - xargs
    - concurrency
    - performance
    - recipe
---

## Overview

Modern machines have multiple CPU cores, yet many shell scripts run sequentially, leaving most cores idle. Parallel execution can reduce batch processing time by 4-10x, but uncontrolled parallelism exhausts memory, overwhelms APIs, or triggers rate limits. This recipe shows safe patterns for parallel execution in Bash.

## When to Use

- Processing thousands of files with a CPU-bound tool (image conversion, compression)
- Running tests across multiple directories or configurations
- Bulk API calls where the remote service supports concurrency
- Downloading multiple files simultaneously with curl or wget
- Encoding video or audio files in batch

## When NOT to Use

- The task is I/O-bound on a single disk — parallel reads may saturate the disk and slow everything down
- The remote API has strict rate limits — parallel calls trigger 429 errors
- Tasks depend on each other’s output — use a DAG tool (Make, Airflow) instead
- You need result ordering preserved — xargs and background jobs reorder by completion time

## Step-by-Step Implementation

### xargs (POSIX, No Extra Dependencies)

```bash
#!/bin/bash
set -euo pipefail

# Process 4 files at a time
find images/ -name '*.png' -print0 | \
    xargs -0 -n 1 -P 4 convert '{}' '{}.jpg'

# Limit concurrency to CPU count
CPU_COUNT=$(nproc)
find images/ -name '*.png' -print0 | \
    xargs -0 -n 1 -P "$CPU_COUNT" convert '{}' '{}.jpg'

# Run a script per file, preserving exit codes
find data/ -name '*.json' -print0 | \
    xargs -0 -n 1 -P 4 -I {} sh -c 'validate_json "{}" || echo "FAIL: {}"'

# Copy files to multiple hosts in parallel
for host in host1 host2 host3; do
    echo "$host"
done | xargs -n 1 -P 3 -I {} rsync -avz ./deploy/ {}:/var/app/
```

### GNU Parallel (More Powerful)

```bash
#!/bin/bash
set -euo pipefail

# Basic parallel execution with progress bar
find images/ -name '*.png' | \
    parallel --bar convert '{}' '{.}.jpg'

# Control concurrency and preserve order
find logs/ -name '*.log' | \
    parallel -j 8 --keep-order gzip '{}'

# Run different commands per input
parallel -j 4 'echo "Processing {} on job {#}"' ::: file1 file2 file3 file4

# Parallel SSH across fleet
parallel -j 10 --tag ssh {} uptime ::: server1 server2 server3

# Resume failed jobs with --joblog
find videos/ -name '*.mov' | \
    parallel --joblog parallel.log --resume-failed \
    ffmpeg -i '{}' -c:v libx264 '{.}.mp4'

# Group output by job (--group) or interleave (--ungroup)
parallel --ungroup -j 4 'ping -c 2 {}' ::: 8.8.8.8 1.1.1.1 9.9.9.9
```

### Bash Background Jobs

```bash
#!/bin/bash
set -euo pipefail

# Simple background jobs with wait
MAX_JOBS=4
for file in *.mp4; do
    # Wait until a slot is free
    while (( $(jobs -r | wc -l) >= MAX_JOBS )); do
        sleep 0.1
    done

    ffmpeg -i "$file" "${file%.mp4}.webm" &
done

# Wait for all background jobs
wait

# Collect exit codes
EXIT_CODES=()
for job in $(jobs -p); do
    if wait "$job"; then
        EXIT_CODES+=(0)
    else
        EXIT_CODES+=("$?")
    fi
done

# Check for failures
for code in "${EXIT_CODES[@]}"; do
    if [ "$code" -ne 0 ]; then
        echo "One or more jobs failed" >&2
        exit 1
    fi
done
```

### Semaphore Pattern for Rate-Limited APIs

```bash
#!/bin/bash
set -euo pipefail

# GNU parallel semaphore for rate-limited API calls
API_LIMIT=10  # calls per second

for id in $(cat ids.txt); do
    # Acquire semaphore slot (limit concurrent calls)
    sem --id api_calls -j "$API_LIMIT" \
        curl -s "https://api.example.com/items/$id" > "results/$id.json" &
done

wait
sem --id api_calls --wait
```

## What Works

- **Always set `-P` or `-j` explicitly.** Unlimited parallelism exhausts file descriptors, memory, or remote quotas.
- **Use `-print0 | xargs -0` or GNU parallel's default line handling.** Filenames with spaces break naive pipelines.
- **Prefer `xargs` when available** for simplicity and POSIX compatibility. Use GNU parallel when you need resume, remote execution, or complex grouping.
- **Capture output per job to avoid interleaving.** Redirect each job to its own log file, or use GNU parallel's `--files` option.
- **Test with a small subset first.** `head -n 10` your input list and verify that parallel execution produces the same results as sequential.

## Common Mistakes

- **Running without `-P` limit.** Default `xargs` is sequential (`-P 1`); forgetting to set it is safe but slow. GNU parallel defaults to the number of CPU cores, which may still be too high for I/O-bound work.
- **Interleaved output.** Multiple jobs writing to stdout simultaneously produce garbled lines. Use `--group` (GNU parallel) or redirect to individual files.
- **Ignoring exit codes.** `xargs` with `-P` exits 123 if any child fails, but you must check it. Background jobs require `wait` loops to detect failures.
- **Passing shell variables into xargs incorrectly.** Single quotes in `sh -c` prevent variable expansion. Use double quotes and escape carefully, or pass variables as positional arguments.
- **Using GNU parallel without citation notice acceptance.** It prints a citation reminder on first use; use `--will-cite` or `--cite` to silence it in CI.

## Frequently Asked Questions

**Q: What is the risk of running too many jobs in parallel?**
A: You can exhaust CPU, memory, or file descriptors, and overwhelm downstream services or APIs. Always cap concurrency to a tested limit.

**Q: How do I limit parallelism with GNU parallel?**
A: Use `parallel -j 4` to run at most four jobs simultaneously. Tune the number based on your CPU cores and I/O constraints.

**Q: How do I handle failures in parallel jobs?**
A: Use `parallel --halt soon,fail=1` to stop at the first failure, or capture exit codes separately and aggregate them at the end.
