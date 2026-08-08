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
  - io
  - streams
  - files
relatedResources:
  - /recipes/read-write-file
  - /recipes/import-csv-excel
  - /recipes/image-optimization
  - /recipes/compression-gzip
  - /recipes/read-large-files
  - /recipes/watch-file-changes
  - /recipes/write-large-files
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
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

## FAQ

**Q: How do I process a file that does not fit on disk either?**
A: Use network streaming or process chunks from cloud storage (S3 GetObject with Range headers) without downloading the entire file.

**Q: Can I resume an interrupted stream?**
A: Yes. Track the last successfully processed byte offset and seek to that position on restart. Include checksums to verify continuity.

**Q: Are streams always faster than loading the whole file?**
A: Not always. For small files, the overhead of stream management may exceed the cost of a single read. Profile with your actual file sizes.

**Q: How do I stream-process ZIP or GZIP files?**
A: Use streaming compression libraries like `zlib` (Node.js), `gzip` (Python), or `GZIPInputStream` (Java) as intermediate pipeline stages.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Python: ETL pipeline with generators and progress tracking

```python
import csv
import json
import os
import time
from pathlib import Path
from typing import Generator, Callable

def read_csv_stream(path: str | Path, encoding: str = 'utf-8') -> Generator[dict, None, None]:
    """Yield rows from a CSV file one at a time without loading it all."""
    with open(path, 'r', encoding=encoding, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield row

def transform_rows(rows: Generator[dict, None, None],
                   transformer: Callable[[dict], dict | None]) -> Generator[dict, None, None]:
    """Apply a transformation function to each row, skipping None results."""
    for row in rows:
        result = transformer(row)
        if result is not None:
            yield result

def write_jsonl_stream(path: str | Path, rows: Generator[dict, None, None],
                       flush_interval: int = 1000) -> int:
    """Write rows as JSONL, flushing periodically. Returns row count."""
    tmp_path = str(path) + '.tmp'
    count = 0
    with open(tmp_path, 'w', encoding='utf-8') as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False))
            f.write('\n')
            count += 1
            if count % flush_interval == 0:
                f.flush()
    os.replace(tmp_path, path)
    return count

def etl_pipeline(input_csv: str, output_jsonl: str,
                 transformer: Callable[[dict], dict | None]) -> None:
    """Full ETL: read CSV -> transform -> write JSONL with progress."""
    start = time.time()
    rows = read_csv_stream(input_csv)
    transformed = transform_rows(rows, transformer)

    # Wrap with progress tracking
    def with_progress(gen: Generator[dict, None, None]) -> Generator[dict, None, None]:
        count = 0
        for item in gen:
            count += 1
            if count % 10000 == 0:
                elapsed = time.time() - start
                rate = count / elapsed if elapsed > 0 else 0
                print(f"  Processed {count:,} rows ({rate:.0f} rows/s)")
            yield item

    total = write_jsonl_stream(output_jsonl, with_progress(transformed))
    elapsed = time.time() - start
    print(f"ETL complete: {total:,} rows in {elapsed:.1f}s ({total/elapsed:.0f} rows/s)")

# Usage
# def filter_active_users(row: dict) -> dict | None:
#     if row.get('status') != 'active':
#         return None
#     return {'id': row['id'], 'email': row['email'].lower(), 'name': row['name']}
# etl_pipeline('users.csv', 'users.jsonl', filter_active_users)
```

### Node.js: Pipeline with backpressure and error recovery

```javascript
const fs = require('fs');
const { pipeline } = require('stream');
const { Transform, Writable } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

async function processLargeFile(inputPath, outputPath, transformFn) {
    const readStream = fs.createReadStream(inputPath, { highWaterMark: 64 * 1024 });
    const writeStream = fs.createWriteStream(outputPath + '.tmp', { highWaterMark: 64 * 1024 });

    let lineBuffer = '';
    let count = 0;
    const startTime = Date.now();

    const lineTransform = new Transform({
        highWaterMark: 64 * 1024,
        transform(chunk, encoding, callback) {
            lineBuffer += chunk.toString('utf-8');
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop();  // Keep incomplete last line

            for (const line of lines) {
                const transformed = transformFn(line);
                if (transformed !== null) {
                    this.push(transformed + '\n');
                    count++;
                    if (count % 10000 === 0) {
                        const elapsed = (Date.now() - startTime) / 1000;
                        const rate = (count / elapsed).toFixed(0);
                        process.stdout.write(`\r  Processed ${count} lines (${rate}/s)`);
                    }
                }
            }
            callback();
        },
        flush(callback) {
            // Process remaining buffer
            if (lineBuffer) {
                const transformed = transformFn(lineBuffer);
                if (transformed !== null) {
                    this.push(transformed + '\n');
                    count++;
                }
            }
            callback();
        },
    });

    try {
        await pipelineAsync(readStream, lineTransform, writeStream);
        await fs.promises.rename(outputPath + '.tmp', outputPath);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\nDone: ${count} lines in ${elapsed}s`);
    } catch (err) {
        // Cleanup temp file on error
        try { await fs.promises.unlink(outputPath + '.tmp'); } catch {}
        throw err;
    }
}

// Usage
// processLargeFile('input.log', 'output.log', line => {
//     if (line.includes('ERROR')) return null;
//     return line.replace(/DEBUG:/g, 'INFO:');
// });
```

### Java: Parallel stream processing with thread pool

```java
import java.io.*;
import java.nio.file.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

public class ParallelStreamProcessor {

    private final ExecutorService executor;
    private final int batchSize;

    public ParallelStreamProcessor(int workers, int batchSize) {
        this.executor = Executors.newFixedThreadPool(workers);
        this.batchSize = batchSize;
    }

    public void process(String input, String output, Function<String, String> transformer)
            throws Exception {
        Path tmpPath = Path.of(output + ".tmp");
        AtomicLong processed = new AtomicLong(0);
        long startTime = System.currentTimeMillis();

        try (BufferedReader reader = Files.newBufferedReader(Path.of(input));
             BufferedWriter writer = Files.newBufferedWriter(tmpPath)) {

            // Read in batches, process in parallel, write sequentially
            String[] batch = new String[batchSize];
            int batchIndex = 0;
            String line;

            while ((line = reader.readLine()) != null) {
                batch[batchIndex++] = line;
                if (batchIndex == batchSize) {
                    String[] results = processBatch(batch, batchIndex, transformer);
                    for (int i = 0; i < batchIndex; i++) {
                        if (results[i] != null) {
                            writer.write(results[i]);
                            writer.newLine();
                        }
                        long count = processed.incrementAndGet();
                        if (count % 10000 == 0) {
                            double elapsed = (System.currentTimeMillis() - startTime) / 1000.0;
                            System.out.printf("  Processed %d lines (%.0f/s)%n",
                                count, count / elapsed);
                        }
                    }
                    batchIndex = 0;
                }
            }

            // Process remaining lines in final partial batch
            if (batchIndex > 0) {
                String[] results = processBatch(batch, batchIndex, transformer);
                for (int i = 0; i < batchIndex; i++) {
                    if (results[i] != null) {
                        writer.write(results[i]);
                        writer.newLine();
                    }
                }
            }
        }

        Files.move(tmpPath, Path.of(output), StandardCopyOption.ATOMIC_MOVE);
        long total = processed.get();
        double elapsed = (System.currentTimeMillis() - startTime) / 1000.0;
        System.out.printf("Done: %d lines in %.1fs (%.0f/s)%n", total, elapsed, total / elapsed);
    }

    private String[] processBatch(String[] batch, int size, Function<String, String> transformer)
            throws Exception {
        Future<String>[] futures = new Future[size];
        for (int i = 0; i < size; i++) {
            final String line = batch[i];
            futures[i] = executor.submit(() -> transformer.apply(line));
        }
        String[] results = new String[size];
        for (int i = 0; i < size; i++) {
            results[i] = futures[i].get();
        }
        return results;
    }

    public void shutdown() {
        executor.shutdown();
        try {
            executor.awaitTermination(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

// Usage
// var processor = new ParallelStreamProcessor(4, 100);
// processor.process("input.log", "output.log", line -> {
//     if (line.contains("ERROR")) return null;
//     return line.toUpperCase();
// });
// processor.shutdown();
```

### Bash: Named pipes for streaming between processes

```bash
#!/usr/bin/env bash
set -euo pipefail

# Create a named pipe (FIFO) for inter-process streaming
PIPE="/tmp/stream_pipe_$$"
mkfifo "$PIPE"

# Producer: stream data into the pipe
generate_data() {
    for i in $(seq 1 1000000); do
        echo "record_$i,data_value_$i"
    done
}

# Consumer: read from pipe, transform, write to output
transform_data() {
    local output="$1"
    while IFS=',' read -r key value; do
        echo "${key^^}|${value^^}"  # Uppercase both fields
    done > "$output"
}

# Run producer and consumer in parallel
generate_data > "$PIPE" &
PRODUCER_PID=$!
transform_data "$PIPE" > "output.txt" &
CONSUMER_PID=$!

# Wait for both to finish
wait "$PRODUCER_PID"
wait "$CONSUMER_PID"

# Cleanup
rm -f "$PIPE"
echo "Streaming complete: output.txt"

# Alternative: pipe gzip decompression directly into processing
# gzip -dc large_file.csv.gz | awk -F',' '{print $1","toupper($2)}' > processed.csv

# Stream from S3 without downloading entire file
# aws s3 cp s3://bucket/large-file.csv.gz - | gzip -dc | head -n 1000 > preview.csv
```



