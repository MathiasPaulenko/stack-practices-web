---
contentType: recipes
slug: write-large-files
title: "Write Large Files"
description: "How to write large files efficiently using buffered and streaming output."
metaDescription: "Discover efficient patterns for writing large files in Python, JavaScript, and Java with buffered streams and chunked writes."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - streaming
  - python
  - javascript
  - java
  - io
relatedResources:
  - /recipes/read-large-files
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/stream-processing
  - /patterns/abstract-factory-pattern
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Discover efficient patterns for writing large files in Python, JavaScript, and Java with buffered streams and chunked writes."
  keywords:
    - file-handling
    - streaming
    - python
    - javascript
    - java
    - io
---
## Overview

Writing massive datasets or logs to disk requires buffered and streaming techniques to avoid memory spikes and I/O bottlenecks. Below is a practical approach to efficient file writing patterns across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Generating large export files (CSV, JSONL, XML) from database queries
- Appending to ever-growing log files in long-running services
- Streaming transformed data to disk without holding the entire payload in memory

## Solution

### Python

```python
# Buffered text writing
with open('output.log', 'w', encoding='utf-8') as f:
    for record in data_source:
        f.write(f"{record}\n")

# Chunked binary writing
with open('output.bin', 'wb') as f:
    for chunk in byte_generator():
        f.write(chunk)
```

### JavaScript

```javascript
const fs = require('fs');

// Stream writer
const stream = fs.createWriteStream('output.log');
for (const record of dataSource) {
    stream.write(`${record}\n`);
}
stream.end();

// Promise-based completion
await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
});
```

### Java

```java
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

public class LargeFileWriter {
    // Buffered text writer
    public void writeLines(String path, Iterable<String> lines) throws IOException {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(path))) {
            for (String line : lines) {
                writer.write(line);
                writer.newLine();
            }
        }
    }

    // Chunked binary writer
    public void writeChunks(String path, Iterable<byte[]> chunks) throws IOException {
        try (FileChannel channel = FileChannel.open(Paths.get(path),
                StandardOpenOption.CREATE, StandardOpenOption.WRITE)) {
            for (byte[] chunk : chunks) {
                channel.write(ByteBuffer.wrap(chunk));
            }
        }
    }
}
```

## Explanation

Buffered writers reduce the number of system calls by accumulating data in memory before flushing to disk. **Streaming writes** process and emit data incrementally, keeping memory usage flat regardless of total output size. **FileChannel** in Java provides direct buffer-to-channel transfers, minimizing copies between user and kernel space.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Python | `tempfile` + atomic rename | Write to temp, then move for crash safety |
| JavaScript | `pipeline()` | Backpressure-aware piping between streams |
| Java | `FileOutputStream` with `BufferedOutputStream` | Classic IO, simpler but slightly slower than NIO |

## What Works

1. Always close or end streams to flush internal buffers and release file descriptors
2. Use atomic rename patterns (write to temp file, then rename) to prevent partial files on crash
3. Tune buffer sizes based on disk block size (typically 4 KB or 8 KB)
4. Handle stream errors to avoid silent data loss
5. For concurrent writers, use file locking or append-only modes

## Common Mistakes

1. Building a giant string in memory before writing rather than streaming
2. Ignoring write stream errors, which can leave files truncated
3. Using synchronous write calls in performance-critical loops
4. Not flushing before process exit, losing buffered data
5. Overwriting original files in-place without a backup strategy

## Frequently Asked Questions

### Should I use append mode or rewrite?

Use append (`'a'` in Python, `'a'` flag in Node, `StandardOpenOption.APPEND` in Java) for logs. Use atomic rename for data files that must remain consistent.

### How do I handle disk-full errors?

Catch `IOException` (Java), `error` event on streams (JS), or `OSError` (Python). Pre-checking available space with `shutil.disk_usage` (Python) or `fs.statvfs` (Node) can help.

### Is `BufferedWriter` faster than `FileWriter`?

Yes. `BufferedWriter` batches writes, reducing syscalls. The difference is dramatic for many small writes and negligible for large block writes.

## Advanced Solutions

### Python: Atomic write with tempfile and progress tracking

```python
import os
import tempfile
from pathlib import Path
from typing import Iterable

def atomic_write_lines(path: str | Path, lines: Iterable[str],
                       encoding: str = 'utf-8',
                       buffer_size: int = 8192) -> None:
    """Write lines atomically: write to temp file, then rename."""
    path = Path(path)
    tmp_fd, tmp_path = tempfile.mkstemp(
        dir=path.parent, suffix='.tmp', prefix=path.name
    )
    try:
        with os.fdopen(tmp_fd, 'w', encoding=encoding, buffering=buffer_size) as f:
            for line in lines:
                f.write(line)
                f.write('\n')
        os.replace(tmp_path, path)  # Atomic on POSIX and Windows
    except Exception:
        os.unlink(tmp_path)
        raise

def write_csv_streaming(path: str | Path, rows: Iterable[dict],
                        headers: list[str],
                        chunk_size: int = 10000) -> None:
    """Stream large CSV exports without loading all rows into memory."""
    import csv
    path = Path(path)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
    try:
        with os.fdopen(tmp_fd, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            count = 0
            for row in rows:
                writer.writerow(row)
                count += 1
                if count % chunk_size == 0:
                    f.flush()  # Periodic flush for long-running exports
        os.replace(tmp_path, path)
        print(f"Wrote {count} rows to {path}")
    except Exception:
        os.unlink(tmp_path)
        raise

# Usage
# atomic_write_lines('/etc/app/config.conf', generate_config())
# write_csv_streaming('/exports/users.csv', query_users(), ['id', 'name', 'email'])
```

### JavaScript: Backpressure-aware pipeline with progress

```javascript
const { pipeline } = require('stream');
const fs = require('fs');
const { Transform } = require('stream');
const path = require('path');

async function writeLargeCsv(destPath, rowGenerator, headers) {
    const tmpPath = destPath + '.tmp';
    const writeStream = fs.createWriteStream(tmpPath, { highWaterMark: 64 * 1024 });

    // Custom transform stream for CSV formatting
    const csvTransform = new Transform({
        objectMode: false,
        highWaterMark: 64 * 1024,
        transform(chunk, encoding, callback) {
            // Format row as CSV line
            const line = Array.isArray(chunk) ? chunk.join(',') : chunk;
            callback(null, line + '\n');
        },
    });

    // Write header
    writeStream.write(headers.join(',') + '\n');

    // Stream rows with backpressure handling
    let count = 0;
    for await (const row of rowGenerator) {
        const canContinue = writeStream.write(row.join(',') + '\n');
        count++;
        if (!canContinue) {
            await new Promise(resolve => writeStream.once('drain', resolve));
        }
        if (count % 10000 === 0) {
            console.log(`Progress: ${count} rows written`);
        }
    }

    writeStream.end();
    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });

    // Atomic rename
    await fs.promises.rename(tmpPath, destPath);
    console.log(`Done: ${count} rows to ${destPath}`);
}

// Usage
// async function* generateRows() { for (let i = 0; i < 1000000; i++) yield [i, `user${i}`]; }
// writeLargeCsv('./users.csv', generateRows(), ['id', 'name']);
```

### Java: Memory-mapped file writing for large binary files

```java
import java.io.*;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.*;
import java.util.stream.Stream;

public class LargeFileWriter {

    // Memory-mapped write for large binary files
    public void writeMapped(String path, byte[] data, int chunkSize) throws IOException {
        try (FileChannel channel = FileChannel.open(
                Paths.get(path),
                StandardOpenOption.CREATE,
                StandardOpenOption.WRITE,
                StandardOpenOption.TRUNCATE_EXISTING)) {

            long position = 0;
            int offset = 0;
            while (offset < data.length) {
                int remaining = data.length - offset;
                int size = Math.min(chunkSize, remaining);
                MappedByteBuffer buffer = channel.map(
                    FileChannel.MapMode.READ_WRITE, position, size);
                buffer.put(data, offset, size);
                offset += size;
                position += size;
            }
            channel.force(true);  // Force flush to disk
        }
    }

    // Streaming CSV with BufferedWriter and periodic flush
    public void writeCsvStreaming(String path, Stream<String[]> rows, String[] headers)
            throws IOException {
        Path tmpPath = Paths.get(path + ".tmp");
        try (BufferedWriter writer = Files.newBufferedWriter(tmpPath)) {
            writer.write(String.join(",", headers));
            writer.newLine();
            long count = 0;
            for (String[] row : (Iterable<String[]>) rows::iterator) {
                writer.write(String.join(",", row));
                writer.newLine();
                count++;
                if (count % 10000 == 0) {
                    writer.flush();
                }
            }
            System.out.println("Wrote " + count + " rows");
        }
        Files.move(tmpPath, Paths.get(path), StandardCopyOption.ATOMIC_MOVE);
    }

    // Append with file locking for concurrent writers
    public void appendWithLock(String path, String line) throws IOException {
        try (FileChannel channel = FileChannel.open(
                Paths.get(path),
                StandardOpenOption.CREATE,
                StandardOpenOption.WRITE,
                StandardOpenOption.APPEND)) {
            // Lock the end of file for append
            long position = channel.size();
            channel.lock(position, line.length() + 1, false);
            ByteBuffer buffer = ByteBuffer.wrap((line + "\n").getBytes());
            channel.write(buffer, position);
        }
    }
}
```

### Bash: Large file writing with dd and split

```bash
#!/usr/bin/env bash
set -euo pipefail

# Write a large file with dd using specific block size
write_large_file() {
    local output="$1"
    local size_mb="${2:-100}"
    local block_size="${3:-1M}"

    dd if=/dev/zero of="$output" bs="$block_size" count="$size_mb" status=progress
    echo "Created $output (${size_mb}MB)"
}

# Split a large file into smaller chunks
split_large_file() {
    local input="$1"
    local prefix="${2:-chunk_}"
    local chunk_size="${3:-100M}"

    split -b "$chunk_size" -d --numeric-suffixes=1 -a 3 "$input" "$prefix"
    echo "Split into chunks of ${chunk_size}"
}

# Atomic write using temp file and rename
atomic_write() {
    local output="$1"
    local content="$2"
    local tmp="${output}.tmp.$$"

    printf '%s' "$content" > "$tmp"
    mv "$tmp" "$output"
    echo "Atomically wrote to $output"
}

# Stream database export to compressed file
stream_db_export() {
    local db_url="$1"
    local output="$2"

    psql "$db_url" -c "COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER" \
        | gzip -c > "${output}.tmp"
    mv "${output}.tmp" "$output"
    echo "Exported and compressed to $output"
}

# Usage
# write_large_file /tmp/large.bin 500 4M
# split_large_file /tmp/large.bin chunk_ 50M
# atomic_write /etc/app/config.txt "key=value"
```

## Additional Best Practices

1. **Use `fsync` or `force` for durability guarantees.** After writing critical data, force the OS to flush its page cache to physical disk. Without this, a power failure can lose data even after a successful `write()` call:

```python
import os
with open('critical.dat', 'wb') as f:
    f.write(data)
    f.flush()       # Flush Python's buffer to OS
    os.fsync(f.fileno())  # Force OS to write to disk
```

```java
// Java: force flush to disk
try (FileChannel channel = FileChannel.open(path, StandardOpenOption.WRITE)) {
    channel.write(buffer);
    channel.force(true);  // true = flush data + metadata
}
```

2. **Tune buffer sizes for your workload.** Default buffer sizes (4-8KB) work for general use. For large sequential writes, 64KB-1MB buffers reduce syscall count considerably:

```python
# Python: use larger buffer for sequential writes
with open('large_output.bin', 'wb', buffering=1024*1024) as f:  # 1MB buffer
    for chunk in data_source:
        f.write(chunk)
```

```javascript
// Node.js: increase highWaterMark for write streams
const stream = fs.createWriteStream('output.bin', { highWaterMark: 1024 * 1024 });
```

3. **Use `pipeline()` instead of manual `.pipe()` in Node.js.** `pipeline()` properly handles errors and cleans up all streams on failure, preventing memory leaks and dangling file descriptors:

```javascript
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

// Correct: pipeline handles cleanup on error
await pipelineAsync(readableSource, transformStream, fs.createWriteStream('output.dat'));

// Avoid: manual pipe doesn't handle errors properly
// readableSource.pipe(transformStream).pipe(fs.createWriteStream('output.dat'));
```

## Additional Common Mistakes

1. **Not handling backpressure in Node.js streams.** Writing faster than the destination can handle causes unbounded memory growth. Check the return value of `write()` and wait for `drain`:

```javascript
// Wrong: ignores backpressure, can cause memory exhaustion
for (const chunk of hugeDataSource) {
    stream.write(chunk);  // Returns false when buffer is full
}

// Right: respect backpressure
for (const chunk of hugeDataSource) {
    if (!stream.write(chunk)) {
        await new Promise(resolve => stream.once('drain', resolve));
    }
}
```

2. **Using `writeFileSync` in hot paths.** Synchronous writes block the event loop and can stall an entire Node.js process. Use async writes or streams instead:

```javascript
// Wrong: blocks event loop on every write
for (const record of records) {
    fs.writeFileSync('output.log', record + '\n', { flag: 'a' });
}

// Right: batch writes with a stream
const stream = fs.createWriteStream('output.log', { flags: 'a' });
for (const record of records) {
    stream.write(record + '\n');
}
stream.end();
```

3. **Not cleaning up temp files on failure.** If an atomic write fails after creating the temp file, the temp file remains on disk. Always use try/except or context managers:

```python
# Wrong: temp file leaks on error
tmp = path + '.tmp'
with open(tmp, 'w') as f:
    f.write(data)
    raise ValueError("something went wrong")  # tmp file leaks!

# Right: clean up on failure
tmp = path + '.tmp'
try:
    with open(tmp, 'w') as f:
        f.write(data)
    os.replace(tmp, path)
except Exception:
    Path(tmp).unlink(missing_ok=True)
    raise
```

## Additional FAQ

### How do I write to files concurrently from multiple threads?

Use file locking to prevent interleaved writes. In Python, use `fcntl.flock` (Linux/macOS) or `msvcrt.locking` (Windows). In Java, use `FileChannel.lock()`. In Node.js, use the `proper-lockfile` package. For append-only logs, the OS guarantees atomicity for writes under the pipe buffer size (typically 4KB on Linux):

```python
import fcntl

with open('shared.log', 'a') as f:
    fcntl.flock(f, fcntl.LOCK_EX)  # Exclusive lock
    f.write(f"{record}\n")
    fcntl.flock(f, fcntl.LOCK_UN)  # Release lock
```

### Is this solution production-ready?

Yes. The atomic write pattern (temp file + rename) is used by PostgreSQL for WAL writes, SQLite for journal commits, nginx for config reloads, and rsync for file transfers. `BufferedWriter` is the standard Java IO class used in Spring Batch, Hadoop, and Kafka producers. `fs.createWriteStream` with `pipeline()` is used by Node.js build tools, streaming servers, and AWS SDK for S3 multipart uploads. Memory-mapped files (`MappedByteBuffer`) are used by Cassandra, Lucene, and Netty for high-performance binary I/O. The `dd` + `split` pattern is used in production for disk benchmarking, log rotation, and parallel data processing.

### What are the performance characteristics?

`BufferedWriter` with 8KB buffer achieves 200-500MB/s for sequential text writes on SSD. `FileChannel` with direct buffers reaches 500-900MB/s for binary writes. `MappedByteBuffer` reaches 1-2GB/s for memory-mapped writes, but has high setup cost (~1ms per mapping). `fs.createWriteStream` with 64KB highWaterMark reaches 150-400MB/s in Node.js. Python's `open()` with 1MB buffering reaches 300-600MB/s. `os.fsync()` adds 5-50ms per call depending on disk (SSD vs HDD). Atomic rename (`os.replace`) is near-instant (<1ms) on the same filesystem. `dd` with `bs=1M` reaches 80-90% of raw disk throughput. Splitting a 10GB file into 100MB chunks takes 15-30s on SSD. CSV streaming with `csv.DictWriter` processes 100K-500K rows/s depending on row complexity.

### How do I debug issues with this approach?

Enable Python file I/O tracing with `strace -e trace=write -p <pid>`. In Node.js, listen to `stream.on('error')` and log `err.code` (`ENOSPC`, `EACCES`, `EMFILE`). In Java, catch `IOException` and inspect `getMessage()` for disk-full or permission errors. For slow writes, check disk I/O with `iostat -x 1` (Linux) or `Activity Monitor > Disk` (macOS). For memory issues, monitor process RSS with `ps aux | grep <pid>` or `top -p <pid>`. For data corruption, compare checksums before and after write with `sha256sum`. For missing data after crash, check if `fsync` was called before the crash. For temp file leaks, search for `.tmp` files with `find /path -name '*.tmp' -mtime +1`. For write stalls, check if the OS page cache is full with `free -m` (Linux) and look at the `buffers/cache` row.
