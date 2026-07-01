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
lastUpdated: "2026-06-20"
author: "StackPractices"
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

Reading multi-gigabyte files into memory at once can crash applications or cause severe performance degradation. This recipe shows memory-efficient techniques to process large files line by line or in chunks across Python, JavaScript, and Java.

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

## Frequently Asked Questions

### How large is "large"?

Any file approaching or exceeding your process heap/RAM (e.g., >500 MB on a 2 GB container). Streaming is cheap; always prefer it for files over a few megabytes.

### Does line-by-line work for binary files?

No. Binary files should use chunked byte reading. Line-based approaches assume newline delimiters and text encoding.

### Is memory-mapped faster than streaming?

For sequential access, usually not dramatically. Memory mapping shines for random access patterns or when multiple processes share the same file.
