---
contentType: recipes
slug: nodejs-read-large-file-stream
title: "Stream Process Large Files in Node.js Without Memory Issues"
description: "Process GB-sized files in Node.js using streams. Covers readline, transform streams, pipeline, backpressure, and chunk processing."
metaDescription: "Process large files in Node.js with streams. Readline, transform streams, pipeline, backpressure handling, chunk processing and memory-efficient parsing."
difficulty: intermediate
topics:
  - file-handling
  - performance
tags:
  - nodejs
  - streams
  - files
  - performance
  - readline
  - backpressure
relatedResources:
  - /recipes/file-handling/javascript-drag-drop-file-upload
  - /recipes/frontend/javascript-service-worker-offline
  - /guides/performance-optimization-guide
  - /patterns/stream-processing-guide
  - /patterns/voucher-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Process large files in Node.js with streams. Readline, transform streams, pipeline, backpressure handling, chunk processing and memory-efficient parsing."
  keywords:
    - nodejs read large file
    - nodejs stream file processing
    - nodejs readline large file
    - nodejs transform stream
    - nodejs pipeline backpressure
    - memory efficient file processing nodejs
---

## Overview

Reading a large file with `fs.readFile()` loads the entire file into memory. For multi-GB files, this causes out-of-memory crashes. Streams process data in chunks, keeping memory usage constant regardless of file size. The solution below covers reading, transforming, and writing large files using Node.js streams.

## When to Use

- You process files larger than available RAM (logs, CSV, JSON, datasets)
- You need to transform data while reading (filter, map, convert)
- You want constant memory usage regardless of file size
- You parse line-by-line or in fixed-size chunks

## Solution

### Read file line by line with readline

```javascript
const fs = require("fs");
const readline = require("readline");

async function processLineByLine(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    let lineCount = 0;
    for await (const line of rl) {
        lineCount++;
        if (lineCount % 100_000 === 0) {
            console.log(`Processed ${lineCount} lines`);
        }
    }

    console.log(`Total lines: ${lineCount}`);
}

processLineByCSV("large_file.log");
```

### Process CSV with transform stream

```javascript
const fs = require("fs");
const { Transform } = require("stream");

function createCsvParser() {
    return new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            const lines = chunk.toString().split("\n");
            for (const line of lines) {
                if (line.trim()) {
                    const columns = line.split(",");
                    this.push(columns);
                }
            }
            callback();
        },
    });
}

function createFilter(filterFn) {
    return new Transform({
        objectMode: true,
        transform(row, encoding, callback) {
            if (filterFn(row)) {
                this.push(row);
            }
            callback();
        },
    });
}

function createJsonStringifier() {
    return new Transform({
        objectMode: true,
        transform(row, encoding, callback) {
            this.push(JSON.stringify(row) + "\n");
            callback();
        },
    });
}

// Pipeline: read CSV -> parse -> filter -> convert to JSON -> write
fs.createReadStream("data.csv")
    .pipe(createCsvParser())
    .pipe(createFilter(row => row[2] === "active"))
    .pipe(createJsonStringifier())
    .pipe(fs.createWriteStream("active_users.jsonl"));
```

### Using pipeline for error handling

```javascript
const fs = require("fs");
const { pipeline } = require("stream");

function processFile(inputPath, outputPath) {
    pipeline(
        fs.createReadStream(inputPath),
        createCsvParser(),
        createFilter(row => row[2] === "active"),
        createJsonStringifier(),
        fs.createWriteStream(outputPath),
        (err) => {
            if (err) {
                console.error("Pipeline failed:", err);
            } else {
                console.log("Pipeline succeeded");
            }
        }
    );
}

// pipeline properly cleans up all streams on error
processFile("data.csv", "output.jsonl");
```

### Processing in batches with async

```javascript
const fs = require("fs");
const readline = require("readline");

async function processInBatches(filePath, batchSize = 1000) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream });

    let batch = [];

    for await (const line of rl) {
        batch.push(line);

        if (batch.length >= batchSize) {
            await processBatch(batch);
            batch = [];
        }
    }

    if (batch.length > 0) {
        await processBatch(batch);
    }
}

async function processBatch(lines) {
    // e.g., insert into database, call API, etc.
    console.log(`Processing batch of ${lines.length} lines`);
    await new Promise(resolve => setTimeout(resolve, 10));
}

processInBatches("large_file.log", 500);
```

### Transform stream with async processing

```javascript
const { Transform } = require("stream");

function createAsyncTransform(processFn, concurrency = 10) {
    let pending = 0;
    let doneCallback = null;

    return new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            pending++;
            processFn(chunk)
                .then(result => {
                    if (result) this.push(result);
                })
                .catch(err => this.emit("error", err))
                .finally(() => {
                    pending--;
                    if (pending < concurrency) {
                        callback();
                    }
                    if (pending === 0 && doneCallback) {
                        doneCallback();
                    }
                });

            if (pending >= concurrency) {
                // Wait — backpressure
            } else {
                callback();
            }
        },
        flush(callback) {
            if (pending === 0) {
                callback();
            } else {
                doneCallback = callback;
            }
        },
    });
}

// Usage — async API calls per line with concurrency limit
async function enrichRow(row) {
    const response = await fetch(`https://api.example.com/user/${row[0]}`);
    const data = await response.json();
    return [...row, data.name];
}

fs.createReadStream("users.csv")
    .pipe(createCsvParser())
    .pipe(createAsyncTransform(enrichRow, 5))
    .pipe(createJsonStringifier())
    .pipe(fs.createWriteStream("enriched_users.jsonl"));
```

### Count lines in a huge file

```javascript
const fs = require("fs");
const readline = require("readline");

function countLines(filePath) {
    return new Promise((resolve, reject) => {
        let count = 0;
        const stream = fs.createReadStream(filePath);
        const rl = readline.createInterface({ input: stream });

        rl.on("line", () => count++);
        rl.on("close", () => resolve(count));
        rl.on("error", reject);
    });
}

countLines("huge_file.log").then(count => console.log(`Lines: ${count}`));
```

### Gzip decompression while reading

```javascript
const fs = require("fs");
const zlib = require("zlib");
const { pipeline } = require("stream");
const readline = require("readline");

async function processGzippedFile(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();
    const rl = readline.createInterface({ input: gunzip });

    // Handle decompression errors
    gunzip.on("error", (err) => console.error("Gunzip error:", err));

    let count = 0;
    for await (const line of rl) {
        count++;
    }
    console.log(`Total lines: ${count}`);
}

processGzippedFile("large_file.log.gz");
```

### Memory usage comparison

```javascript
// BAD — loads entire file into memory
// 5GB file = 5GB RAM usage, likely crash
fs.readFile("huge.log", (err, data) => {
    const lines = data.toString().split("\n");
    console.log(lines.length);
});

// GOOD — constant memory, processes in chunks
// 5GB file = ~64KB RAM at any time
const stream = fs.createReadStream("huge.log", { highWaterMark: 64 * 1024 });
const rl = readline.createInterface({ input: stream });
let count = 0;
rl.on("line", () => count++);
rl.on("close", () => console.log(count));
```

## Explanation

Node.js streams process data in chunks rather than loading everything into memory. The stream API has four types: Readable, Writable, Duplex, and Transform.

Key concepts:

- **Readable stream**: Produces data (file read stream, HTTP response). Emits `data` events or can be consumed with `for await...of`.
- **Writable stream**: Consumes data (file write stream, HTTP request). Has `write()` and `end()` methods.
- **Transform stream**: Readable + Writable. Transforms data as it passes through.
- **pipeline**: Connects multiple streams and handles cleanup on error. Always prefer `pipeline()` over manual `.pipe()` chains.
- **Backpressure**: When a downstream stream cannot keep up, it signals the upstream to slow down. Streams handle this automatically via `.pipe()` and `pipeline()`.
- **highWaterMark**: Internal buffer size. Default is 64KB for byte streams, 16 objects for objectMode streams. Larger buffers use more memory but reduce system calls.
- **objectMode**: Streams that push objects instead of bytes. Useful for parsed records (CSV rows, JSON objects).

## Variants

| Approach | Memory | Speed | Use When |
|----------|--------|-------|----------|
| fs.readFile | O(file size) | Fast | Files < 100MB |
| readline + createReadStream | O(buffer) | Medium | Line-based files |
| Transform stream pipeline | O(buffer) | Medium | Transform while reading |
| Readable.from + async generator | O(buffer) | Flexible | Custom data sources |
| mmap (third-party) | O(page cache) | Fast | Random access in huge files |

## Guidelines

- Always use streams for files larger than 100MB. `fs.readFile` will crash on multi-GB files.
- Use `pipeline()` instead of `.pipe()` chains. `pipeline` properly destroys streams on error.
- Use `readline` for line-based formats (logs, CSV, JSONL). It handles line endings correctly.
- Set `highWaterMark` to control buffer size. Larger buffers improve throughput but use more memory.
- Use `objectMode` transform streams for parsed records (CSV rows, JSON objects).
- Process in batches when calling external APIs. Accumulate rows and flush in groups.
- Handle stream errors with `error` event or `pipeline` callback. Unhandled errors crash the process.
- Use `for await...of` for modern async iteration over readable streams.
- Release file handles by properly closing streams. `pipeline` handles this automatically.

## Common Mistakes

- Using `fs.readFile()` for large files. Loads entire file into memory, causes OOM crashes.
- Using `.pipe()` without error handling. If a stream errors, other streams leak resources. Use `pipeline()`.
- Not handling `error` events on streams. Unhandled errors crash the process.
- Pushing too fast in a Transform stream. Check `this.push()` return value for backpressure.
- Using `readline` for binary files. `readline` is designed for text. Use raw chunks for binary data.
- Not setting `objectMode` when pushing objects. Streams default to byte mode and stringify objects.
- Forgetting to call `callback()` in Transform. The stream hangs waiting for the callback.
- Not closing file descriptors on error. Use `pipeline()` or `stream.destroy()` to clean up.

## Frequently Asked Questions

### What is the maximum file size I can process with streams?

There is no practical limit. Streams process data in chunks, so memory usage is constant regardless of file size. You can process files larger than available RAM.

### Should I use .pipe() or pipeline()?

Always use `pipeline()`. It properly destroys all streams when an error occurs, preventing resource leaks. `.pipe()` does not forward errors and can leave streams open.

### How do I handle backpressure in a custom Transform stream?

Call `callback()` only when you are ready for more data. If `this.push()` returns `false`, the destination is overwhelmed. Stop calling `callback()` until the destination drains. The stream framework handles this automatically in most cases.

### Can I process binary files with readline?

No. `readline` is designed for text files with line endings. For binary files, use raw `createReadStream` chunks and process them manually with Buffer operations.
