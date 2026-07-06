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
