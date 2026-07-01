---
contentType: recipes
slug: stream-processing
title: "Process Large Files with Streams"
description: "How to read, transform, and write large files efficiently using streams without loading entire files into memory in Python, Node.js, and Java."
metaDescription: "Learn stream processing for large files. Read, transform, and write files efficiently without loading them into memory using Python, Node.js, and Java streams."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - python
relatedResources:
  - /recipes/read-write-file
  - /recipes/import-csv-excel
  - /recipes/image-optimization
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn stream processing for large files. Read, transform, and write files efficiently without loading them into memory using Python, Node.js, and Java streams."
  keywords:
    - stream processing
    - large file processing
    - memory efficient
    - python streams
    - nodejs streams
    - java streams
---

## Overview

Loading a 10 GB log file into memory crashes most applications. Streams solve this by processing data in small, manageable chunks — reading a few kilobytes at a time, transforming them, and writing results incrementally. The memory footprint stays constant regardless of file size.

Streaming is not just for files. It applies to network responses, database query results, and real-time data pipelines. Any time you process data that does not fit in RAM or arrives continuously, streams are the right abstraction.

## When to Use

Use this recipe when:

- Processing files larger than available RAM (logs, CSVs, video, backups). See [Compression Gzip](/recipes/file-handling/compression-gzip) for pre-processing large files.
- Building ETL pipelines that transform data between formats. See [Import CSV Excel](/recipes/file-handling/import-csv-excel) for tabular ETL patterns.
- Handling real-time data feeds (sensor data, financial ticks, clickstreams). See [Kafka Event Streaming](/recipes/messaging/kafka-event-streaming) for pub-sub streaming.
- Compressing or encrypting files without loading them entirely. See [Image Optimization](/recipes/file-handling/image-optimization) for media pipeline processing.
- Implementing progress bars and resumable processing for long-running tasks. See [Background Jobs](/recipes/devops/background-jobs) for job queue management.

## Solution

### Python (Generators + open)

```python
import csv

def process_large_csv(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as infile, \
         open(output_path, 'w', encoding='utf-8') as outfile:
        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        writer.writerow(next(reader))
        for row in reader:
            writer.writerow([cell.upper() for cell in row])
```

### Node.js (Transform Stream)

```javascript
const fs = require('fs');
const { Transform } = require('stream');

const upperCase = new Transform({
  transform(chunk, enc, cb) { this.push(chunk.toString().toUpperCase()); cb(); }
});
fs.createReadStream('input.txt')
  .pipe(upperCase)
  .pipe(fs.createWriteStream('output.txt'));
```

### Java (BufferedReader)

```java
import java.io.*;
import java.nio.file.*;

public class StreamProcessor {
    public static void process(String input, String output) throws IOException {
        try (BufferedReader r = Files.newBufferedReader(Path.of(input));
             BufferedWriter w = Files.newBufferedWriter(Path.of(output))) {
            String line;
            while ((line = r.readLine()) != null) {
                w.write(line.toUpperCase());
                w.newLine();
            }
        }
    }
}
```

## Explanation

- **Lazy evaluation**: Streams do not read the entire file upfront. They pull data on demand — a few kilobytes or lines at a time. This keeps memory usage flat even for terabyte-scale files.
- **Backpressure**: In Node.js, streams automatically handle cases where the writer is slower than the reader. The reader pauses until the writer catches up, preventing memory from filling with unprocessed chunks.
- **Composable pipelines**: Multiple transformations (decode CSV, filter rows, aggregate, encode JSON) chain together as a pipeline. Each stage processes chunks independently.
- **Error handling**: Stream errors can occur at any stage. Centralized error handlers catch failures without leaking resources or leaving partial output files.

## Variants

| Approach | Memory Usage | Complexity | Best For |
|----------|--------------|------------|----------|
| Full file load | O(file size) | Low | Small files (< RAM) |
| Line-by-line stream | O(line size) | Low | Text files, CSV, logs |
| Chunk stream | O(buffer size) | Medium | Binary files, compression |
| Parallel stream | O(buffer × workers) | High | CPU-intensive transforms |

## What Works

- **Use buffered I/O**: unbuffered reads and writes issue a system call per byte. Buffers (8KB default) amortize this overhead.
- **Handle encoding explicitly**: default encodings vary by platform. Specify `utf-8` to avoid corruption.
- **Validate input early**: malformed data in a stream can cause downstream errors. Sanitize or skip bad records.
- **Implement progress reporting**: for long-running streams, emit progress events or log processed byte counts.
- **Close resources properly**: use `with` (Python), `try-with-resources` (Java), or `pipeline` (Node.js) to ensure file handles are released.

## Common Mistakes

- **Loading entire files into arrays**: `readlines()` or `readFile()` reads everything into memory. For large files, use streaming equivalents.
- **Ignoring backpressure**: in Node.js, writing to a slow consumer without handling `drain` events causes memory to grow unbounded.
- **Not handling partial multibyte characters**: a chunk boundary may split a UTF-8 multibyte character. Buffer incomplete characters across chunks.
- **Writing to the same file you read from**: overwriting a file while streaming from it corrupts data. Write to a temporary file and rename atomically.

## Frequently Asked Questions

**Q: How do I process a file that does not fit on disk either?**
A: Use network streaming or process chunks from cloud storage (S3 GetObject with Range headers) without downloading the entire file.

**Q: Can I resume an interrupted stream?**
A: Yes. Track the last successfully processed byte offset and seek to that position on restart. Include checksums to verify continuity.

**Q: Are streams always faster than loading the whole file?**
A: Not always. For small files, the overhead of stream management may exceed the cost of a single read. Profile with your actual file sizes.

**Q: How do I stream-process ZIP or GZIP files?**
A: Use streaming compression libraries like `zlib` (Node.js), `gzip` (Python), or `GZIPInputStream` (Java) as intermediate pipeline stages.

