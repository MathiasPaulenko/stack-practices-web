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

Running commands sequentially is slow when tasks are independent. Bash has three built-in approaches for parallelism: background jobs with `&`, `xargs -P`, and `GNU parallel`. The following demonstrates how to all three with practical examples for batch file processing, image conversion, and API calls.

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

### Semaphore Pattern for Controlled Concurrency

```bash
#!/bin/bash
# semaphore.sh — limit background jobs with a semaphore

MAX_JOBS=4
open_semaphores() {
    for i in $(seq 1 $MAX_JOBS); do
        echo
    done
}

run_with_semaphore() {
    read -r line <&3
    (
        "$@"
    ) 3>&1
}

# Open semaphore
exec 3< <(open_semaphores)

for file in *.log; do
    run_with_semaphore process_file "$file" &
done

wait
echo "All done with max $MAX_JOBS concurrent jobs"
```

### Error Handling in Parallel Jobs

```bash
#!/bin/bash
# parallel-with-errors.sh

process_with_error() {
    local file="$1"
    if gzip "$file" 2>/dev/null; then
        echo "OK: $file"
    else
        echo "FAIL: $file" >&2
        return 1
    fi
}

export -f process_with_error

# Capture exit codes
find . -name "*.log" | parallel -j 4 process_with_error {}
EXIT_CODES=$?

if [ $EXIT_CODES -ne 0 ]; then
    echo "Some jobs failed. Exit code: $EXIT_CODES"
    exit 1
fi
```

### Timeout per Job

```bash
#!/bin/bash
# timeout-parallel.sh

# Each job has a 30-second timeout
cat urls.txt | parallel -j 8 --timeout 30 wget -q {}

# With GNU timeout command for custom functions
process_with_timeout() {
    local url="$1"
    timeout 30 curl -s -o /dev/null -w "%{http_code}" "$url" || echo "TIMEOUT: $url"
}

export -f process_with_timeout
cat urls.txt | parallel -j 8 process_with_timeout {}
```

### Parallel with Logging

```bash
#!/bin/bash
# parallel-logging.sh

LOGDIR="./logs"
mkdir -p "$LOGDIR"

process_and_log() {
    local file="$1"
    local logfile="$LOGDIR/$(basename "$file").log"
    {
        echo "Start: $(date -Iseconds)"
        gzip "$file"
        echo "End: $(date -Iseconds) exit=$?"
    } > "$logfile" 2>&1
}

export -f process_and_log

find . -name "*.log" -not -path "./logs/*" | parallel -j 4 process_and_log {}
```

## Additional Best Practices

1. **Use `--joblog` to track results.** GNU parallel can write a structured log of all jobs:

```bash
parallel --joblog results.txt -j 4 process.sh ::: file1 file2 file3

# results.txt format:
# Seq Host Starttime JobRuntime Send Receive Exitval Signal Command
```

2. **Dry-run before executing.** Always preview what parallel will run:

```bash
# Show commands without executing
parallel --dry-run -j 4 gzip {} ::: *.log
```

3. **Use `--bar` for simple progress.** Cleaner than `--progress` for terminals:

```bash
ls *.jpg | parallel --bar -j 8 convert {} -resize 50% small_{}
```

## Additional Common Mistakes

1. **Not handling filenames with newlines.** Use `-0` with xargs and `-print0` with find:

```bash
# Bad: breaks on filenames with spaces or newlines
find . -name "*.txt" | xargs -P4 grep "error"

# Good: null-delimited
find . -name "*.txt" -print0 | xargs -0 -P4 grep "error"
```

2. **Forgetting to export variables.** Subshells don't inherit non-exported variables:

```bash
# Bad: CONFIG_FILE is empty in subshell
CONFIG_FILE="/etc/app.conf"
parallel -j 4 process.sh {} ::: *.txt

# Good: export it
export CONFIG_FILE="/etc/app.conf"
parallel -j 4 process.sh {} ::: *.txt
```

3. **Not setting `ulimit` for large batches.** Too many file handles can crash:

```bash
# Increase file descriptor limit before running large batches
ulimit -n 4096
find . -name "*.log" | parallel -j 32 gzip {}
```

## Additional FAQ

### How do I run parallel jobs across multiple servers?

Use `--sshlogin` with a server list file:

```bash
# servers.txt:
# server1
# server2
# server3
parallel --sshloginfile servers.txt -j 2 "uptime" ::: 1 2 3
```

### What is the difference between `xargs -P` and `parallel -j`?

`xargs -P` is simpler and available on all Unix systems. `parallel -j` offers more features: ordered output (`-k`), progress bars, retries, job logging, SSH distribution, and structured argument replacement. Use `xargs` for quick one-liners, `parallel` for complex workflows.

### How do I kill all parallel jobs if one fails?

Use `--halt` to stop all jobs on first failure:

```bash
# Stop all jobs immediately on first error
parallel --halt now,fail=1 -j 4 process.sh {} ::: *.txt

# Stop after 3 failures
parallel --halt soon,fail=3 -j 4 process.sh {} ::: *.txt
```

## Performance Tips

1. **Benchmark different concurrency levels.** The optimal `-j` value depends on your workload:

```bash
# Test with different concurrency
for j in 1 2 4 8 16; do
    time find . -name "*.log" | parallel -j $j gzip {}
done
```

2. **Use `--round-robin` for uneven workloads.** Distributes work more evenly when jobs vary in size:

```bash
# Group files by size, then distribute
find . -name "*.log" -exec du -b {} + | sort -n | parallel --round-robin -j 4 gzip {2}
```

3. **Pin jobs to CPU cores with `taskset`.** For CPU-bound work, avoid context switching:

```bash
# Assign each parallel job to a specific core
parallel -j $(nproc) 'taskset -c %{} gzip {}' ::: *.log
```
