---



contentType: recipes
slug: read-large-files
title: "Read Large Files"
description: "How to read large files efficiently without running out of memory."
metaDescription: "Learn memory-efficient techniques to read large files in Python, JavaScript, and Java using streaming and chunked processing."
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
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/stream-processing
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /recipes/compress-decompress-files
  - /recipes/copy-move-files
  - /recipes/generate-temporary-files
  - /recipes/python-image-resize-batch
  - /recipes/rotate-log-files
  - /recipes/watch-file-changes
  - /recipes/write-large-files
lastUpdated: "2026-06-20"
publishedAt: "2026-06-21"
author: Mathias Paulenko
seo:
  metaDescription: "Learn memory-efficient techniques to read large files in Python, JavaScript, and Java using streaming and chunked processing."
  keywords:
    - file-handling
    - streaming
    - python
    - javascript
    - java
    - io



---
## Overview

Reading multi-gigabyte files into memory at once can crash applications or cause severe performance degradation. The following demonstrates memory-efficient techniques to process large files line by line or in chunks across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Processing log files, CSV dumps, or datasets larger than available RAM
- Building ETL pipelines that ingest massive files
- Streaming file contents to avoid blocking the event loop or heap

## Solution

### Python

```python
# Line-by-line streaming (memory-efficient)
with open('large-file.log', 'r', encoding='utf-8') as f:
    for line in f:
        process(line)

# Chunked binary reading
chunk_size = 1024 * 1024  # 1 MB
with open('large-file.bin', 'rb') as f:
    while chunk := f.read(chunk_size):
        process(chunk)
```

### JavaScript

```javascript
const fs = require('fs');
const readline = require('readline');

// Line-by-line with readline (Node.js)
const stream = fs.createReadStream('large-file.log');
const rl = readline.createInterface({ input: stream });

for await (const line of rl) {
    console.log(line);
}

// Chunked reading
const readable = fs.createReadStream('large-file.bin', { highWaterMark: 1024 * 1024 });
readable.on('data', chunk => process(chunk));
```

### Java

```java
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

public class LargeFileReader {
    // Line-by-line
    public void readLines(String path) throws IOException {
        try (BufferedReader reader = new BufferedReader(new FileReader(path))) {
            String line;
            while ((line = reader.readLine()) != null) {
                process(line);
            }
        }
    }

    // Memory-mapped chunk reading
    public void readChunks(String path) throws IOException {
        try (FileChannel channel = FileChannel.open(Paths.get(path), StandardOpenOption.READ)) {
            ByteBuffer buffer = ByteBuffer.allocateDirect(1024 * 1024);
            while (channel.read(buffer) > 0) {
                buffer.flip();
                process(buffer);
                buffer.clear();
            }
        }
    }

    private void process(Object data) {}
}
```

## Explanation

**Line-by-line streaming** keeps only one line in memory at a time, making it ideal for text logs and CSV files. **Chunked reading** processes fixed-size byte blocks, suitable for binary data or when you need to control buffer size precisely. **Memory-mapped files** (Java) let the OS handle paging directly, often faster for random access but uses virtual address space.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Python | `mmap` module | Maps file to memory; OS handles paging |
| JavaScript | Web Streams API | `ReadableStream.getReader()` in browsers |
| Java | `Files.lines()` | Lazy Stream<String>; auto-closes |

## What Works

1. Always use `with` (Python), `try-with-resources` (Java), or pipe error handling (JS) to prevent file descriptor leaks
2. Choose buffer sizes based on average line length; 1 MB is a sane default
3. For CSV/JSONL, parse incrementally rather than loading the entire structure
4. Monitor memory usage with OS tools to verify streaming behavior
5. Use `mmap` when you need random access without loading the whole file

## Common Mistakes

1. Calling `read()` or `readFileSync()` on large files loads everything into RAM
2. Forgetting to handle encoding errors, which crash streams mid-file
3. Using too small a chunk size, causing excessive system call overhead
4. Not closing file handles, leading to "too many open files" errors
5. Ignoring backpressure when piping to slow consumers

## FAQ

### How large is "large"?

Any file approaching or exceeding your process heap/RAM (e.g., >500 MB on a 2 GB container). Streaming is cheap; always prefer it for files over a few megabytes.

### Does line-by-line work for binary files?

No. Binary files should use chunked byte reading. Line-based approaches assume newline delimiters and text encoding.

### Is memory-mapped faster than streaming?

For sequential access, usually not dramatically. Memory mapping shines for random access patterns or when multiple processes share the same file.

## Advanced Solutions

### Python: Generators for lazy processing with progress tracking

```python
import os
from pathlib import Path
from typing import Iterator

def read_lines_lazy(path: str, encoding: str = 'utf-8') -> Iterator[str]:
    """Yield lines one at a time. Memory usage is O(1) regardless of file size."""
    with open(path, 'r', encoding=encoding) as f:
        for line in f:
            yield line.rstrip('\n\r')

def read_chunks(path: str, chunk_size: int = 1024 * 1024) -> Iterator[bytes]:
    """Yield binary chunks. Memory usage is O(chunk_size)."""
    with open(path, 'rb') as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            yield chunk

def process_with_progress(path: str, process_fn, encoding: str = 'utf-8') -> int:
    """Process file line by line with progress tracking. Returns line count."""
    file_size = os.path.getsize(path)
    bytes_read = 0
    line_count = 0

    with open(path, 'r', encoding=encoding) as f:
        for line in f:
            process_fn(line.rstrip('\n\r'))
            bytes_read += len(line.encode(encoding))
            line_count += 1
            if line_count % 10000 == 0:
                pct = (bytes_read / file_size) * 100 if file_size > 0 else 0
                print(f"Progress: {pct:.1f}% ({line_count} lines)")
    return line_count

def read_csv_streaming(path: str, encoding: str = 'utf-8'):
    """Stream CSV rows without loading entire file. Returns iterator of dicts."""
    import csv
    with open(path, 'r', encoding=encoding, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield row

def read_jsonl_streaming(path: str, encoding: str = 'utf-8'):
    """Stream JSONL (one JSON object per line) without loading entire file."""
    import json
    for line in read_lines_lazy(path, encoding):
        if line.strip():
            yield json.loads(line)

# Usage
# for line in read_lines_lazy('10gb.log'):
#     if 'ERROR' in line:
#         print(line)
# count = process_with_progress('large.log', lambda l: None)
# for row in read_csv_streaming('data.csv'):
#     process_row(row)
```

### Node.js: Streaming with backpressure and error recovery

```javascript
const fs = require('fs');
const readline = require('readline');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipe = promisify(pipeline);

async function readLinesProcess(path, processFn) {
    const stream = fs.createReadStream(path, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let count = 0;
    for await (const line of rl) {
        await processFn(line);
        count++;
    }
    return count;
}

async function readChunksProcess(path, processFn, chunkSize = 1024 * 1024) {
    const stream = fs.createReadStream(path, { highWaterMark: chunkSize });
    let totalBytes = 0;

    for await (const chunk of stream) {
        await processFn(chunk);
        totalBytes += chunk.length;
    }
    return totalBytes;
}

async function streamToTransform(srcPath, destPath, transformFn) {
    const src = fs.createReadStream(srcPath, { encoding: 'utf-8' });
    const dest = fs.createWriteStream(destPath, { encoding: 'utf-8' });

    const { Transform } = require('stream');
    let lineBuffer = '';

    const transform = new Transform({
        transform(chunk, encoding, callback) {
            lineBuffer += chunk;
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop();
            for (const line of lines) {
                const result = transformFn(line);
                if (result !== null) this.push(result + '\n');
            }
            callback();
        },
        flush(callback) {
            if (lineBuffer) {
                const result = transformFn(lineBuffer);
                if (result !== null) this.push(result + '\n');
            }
            callback();
        },
    });

    await pipe(src, transform, dest);
}

// Usage
// const count = await readLinesProcess('large.log', async (line) => {
//     if (line.includes('ERROR')) console.error(line);
// });
// console.log(`Processed ${count} lines`);
// await streamToTransform('input.log', 'output.log', line => line.toUpperCase());
```

### Java: NIO memory-mapped files and parallel line processing

```java
import java.io.*;
import java.nio.*;
import java.nio.channels.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.stream.Stream;

public class AdvancedFileReader {

    // Memory-mapped file reading for random access
    public static void readMapped(String path, long chunkSize) throws IOException {
        try (FileChannel channel = FileChannel.open(Paths.get(path), StandardOpenOption.READ)) {
            long fileSize = channel.size();
            long position = 0;
            while (position < fileSize) {
                long remaining = fileSize - position;
                long mapSize = Math.min(chunkSize, remaining);
                MappedByteBuffer buffer = channel.map(
                    FileChannel.MapMode.READ_ONLY, position, mapSize
                );
                processBuffer(buffer);
                position += mapSize;
            }
        }
    }

    private static void processBuffer(MappedByteBuffer buffer) {
        buffer.load();
        while (buffer.hasRemaining()) {
            byte b = buffer.get();
            // Process byte
        }
    }

    // Parallel line processing with Files.lines()
    public static long processLinesParallel(String path,
                                            java.util.function.Consumer<String> processor)
            throws IOException {
        try (Stream<String> lines = Files.lines(Paths.get(path), StandardCharsets.UTF_8)) {
            return lines.parallel()
                .peek(processor)
                .count();
        }
    }

    // Buffered reading with configurable buffer size
    public static int readBuffered(String path, int bufferSize,
                                   java.util.function.Consumer<String> lineHandler)
            throws IOException {
        int count = 0;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                    new FileInputStream(path), StandardCharsets.UTF_8), bufferSize)) {
            String line;
            while ((line = reader.readLine()) != null) {
                lineHandler.accept(line);
                count++;
            }
        }
        return count;
    }

    // Read file in chunks using NIO
    public static long readChunksNIO(String path, int chunkSize) throws IOException {
        long totalBytes = 0;
        try (SeekableByteChannel channel = Files.newByteChannel(
                Paths.get(path), StandardOpenOption.READ)) {
            ByteBuffer buffer = ByteBuffer.allocateDirect(chunkSize);
            while (channel.read(buffer) > 0) {
                buffer.flip();
                totalBytes += buffer.remaining();
                buffer.clear();
            }
        }
        return totalBytes;
    }
}

// Usage
// AdvancedFileReader.readMapped("large.bin", 1024 * 1024 * 100); // 100MB chunks
// long count = AdvancedFileReader.processLinesParallel("large.log",
//     line -> { if (line.contains("ERROR")) System.err.println(line); });
// int lines = AdvancedFileReader.readBuffered("data.csv", 65536, System.out::println);
```

### Bash: Efficient file reading with while-read and awk

```bash
#!/usr/bin/env bash
set -euo pipefail

# Read line by line (memory-efficient, handles special chars)
read_lines() {
    local file="$1"
    while IFS= read -r line || [[ -n "$line" ]]; do
        echo "$line"
    done < "$file"
}

# Process with awk (fastest for text processing)
process_with_awk() {
    local file="$1"
    local pattern="${2:-ERROR}"
    awk -v pat="$pattern" '$0 ~ pat { count++ } END { print count " matches" }' "$file"
}

# Read in chunks using dd (for binary files)
read_chunks_dd() {
    local file="$1"
    local chunk_size="${2:-1048576}"  # 1MB default
    local offset=0
    local file_size
    file_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
    while (( offset < file_size )); do
        dd if="$file" bs="$chunk_size" skip=$((offset / chunk_size)) count=1 2>/dev/null
        offset=$((offset + chunk_size))
    done
}

# Count lines efficiently (wc -l is faster than while-read)
count_lines() {
    local file="$1"
    wc -l < "$file" | tr -d ' '
}

# Filter and count in one pass (avoid multiple reads)
filter_and_count() {
    local file="$1"
    local pattern="$2"
    grep -c "$pattern" "$file"
}

# Read specific line range (sed for small ranges, tail+head for large)
read_line_range() {
    local file="$1"
    local start="$2"
    local end="$3"
    sed -n "${start},${end}p" "$file"
}

# Usage
# read_lines large.log | head -100
# process_with_awk large.log ERROR
# count_lines large.log
# read_line_range large.log 1000 1010
```



