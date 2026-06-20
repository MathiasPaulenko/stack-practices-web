---
contentType: recipes
slug: read-write-file
title: "Read and Write Files"
description: "How to read from and write to files safely across multiple programming languages."
metaDescription: "Learn how to read and write files in Python, JavaScript, and Bash with practical examples, encoding tips, and error handling best practices."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - bash
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
  - /recipes/regular-expressions
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn how to read and write files in Python, JavaScript, and Bash with practical examples, encoding tips, and error handling best practices."
  keywords:
    - files
    - io
    - python
    - javascript
    - bash
---
## Overview

Reading and writing files is one of the most common I/O tasks: loading configuration, processing logs, exporting reports, or persisting state. Doing it safely means handling encoding correctly and always closing the file handle.

Files are the universal interface between programs and persistent storage. Whether you are saving user preferences, reading server logs, or generating a CSV export, the same principles apply: open the file, perform the operation, and ensure the resource is released even when errors occur. Modern runtimes provide high-level abstractions that handle buffering, encoding, and cleanup automatically, but understanding the underlying mechanics helps you debug performance issues and avoid data corruption.

This recipe shows the idiomatic way to read and write text files in Python, JavaScript (Node.js), and Bash, plus how to stream large files without exhausting memory.

## When to Use

Use this recipe when:

- Loading configuration or data files at startup. See [Parse JSON](/recipes/data/parse-json) for structured config files.
- Generating reports, exports, or logs for audit and analytics
- Processing text line by line (CSV, logs, fixtures)
- Persisting small amounts of state without a database
- Reading and writing JSON or YAML configuration files
- Streaming large log files without loading them entirely into memory
- Creating temporary files for intermediate processing in data pipelines. See [Call REST API](/recipes/api/call-rest-api) for downloading remote data.

## Solution

### Python

Python's `with` statement creates a context manager that automatically closes the file, even if an exception is raised inside the block. Always specify `encoding="utf-8"` to avoid platform-dependent defaults.

```python
# Write
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("Hello, file!\n")

# Read
with open("notes.txt", "r", encoding="utf-8") as f:
    content = f.read()
print(content)
```

### JavaScript

Node.js provides a promise-based API under `node:fs/promises` that avoids blocking the event loop. This is essential for server applications that handle concurrent requests.

```javascript
import { readFile, writeFile } from "node:fs/promises";

await writeFile("notes.txt", "Hello, file!\n", "utf-8");

const content = await readFile("notes.txt", "utf-8");
console.log(content);
```

### Bash

Bash uses shell redirection for file operations. The `>` operator overwrites the target file, while `>>` appends. These are the fastest way to write small amounts of data from scripts.

```bash
# Write (overwrite) and append
echo "Hello, file!" > notes.txt
echo "Another line" >> notes.txt

# Read
cat notes.txt
```

## Explanation

- **Python** uses the `with` statement (context manager) so the file is always closed, even on error. The `open()` function accepts a mode string: `"r"` for read, `"w"` for write (truncate), `"a"` for append, and `"x"` for exclusive creation. Always specify `encoding="utf-8"`.
- **JavaScript** uses the promise-based `fs/promises` API. Prefer it over the synchronous `readFileSync`/`writeFileSync`, which block the event loop. For large files, use `createReadStream()` to process data in chunks.
- **Bash** uses redirection: `>` overwrites, `>>` appends. `cat` prints the contents. For structured parsing, combine `cat` with `jq` for JSON or `awk` for CSV.

To turn file contents into structured data, see [Parse JSON](/recipes/data/parse-json).

## Variants

| Language | Read | Write | Append |
|----------|------|-------|--------|
| Python | `open(p).read()` | `open(p, "w")` | `open(p, "a")` |
| JavaScript | `readFile(p)` | `writeFile(p, data)` | `appendFile(p, data)` |
| Bash | `cat p` | `> p` | `>> p` |

## Best Practices

- **Always set encoding**: explicit `utf-8` avoids platform-dependent defaults that can corrupt non-ASCII characters on Windows or macOS.
- **Use context managers / async APIs**: `with` in Python, `fs/promises` in Node, to avoid descriptor leaks and event-loop blocking. These abstractions guarantee cleanup even when exceptions occur.
- **Check the path exists**: handle missing files gracefully rather than crashing. In Python, use `pathlib.Path.exists()`; in Node, use `fs.access()` or `fs.stat()`.
- **Stream large files**: read line by line instead of loading gigabytes into memory. Python provides `for line in f`; Node provides `readline` or `createReadStream`; Bash provides `while read line`.
- **Write atomically**: write to a temp file then rename, to avoid corrupting data on crash. If the process dies mid-write, the original file remains intact.
- **Use absolute paths in scripts**: relative paths break when the working directory changes. Resolve paths with `pathlib` (Python) or `path.resolve()` (Node) before opening files.
- **Set restrictive permissions on sensitive files**: config files containing secrets should be readable only by the owner (`chmod 600`).

## Common Mistakes

- **Forgetting to close the handle**: leaks file descriptors and eventually exhausts the process limit; always use `with` or `try/finally`.
- **Blocking the event loop in Node**: avoid `readFileSync` in request handlers. A single synchronous read can freeze your entire server for all concurrent users.
- **Wrong encoding**: reading UTF-8 as ASCII corrupts non-English characters and can produce mojibake in logs or user-facing output.
- **Overwriting with `>`**: using `>` instead of `>>` in Bash silently erases the file with no undo or confirmation.
- **Ignoring errors**: a missing file or permission error should be handled, not swallowed with an empty catch. Log the error and fail gracefully.
- **Reading entire files into memory**: loading a 10 GB log file into a string will crash your process. Always check the file size or use streaming for anything over a few megabytes.
- **Writing to the same file you are reading**: overwriting an input file in-place can truncate it before you finish reading, resulting in data loss.

## Frequently Asked Questions

**Q: How do I append instead of overwrite?**
A: Open in append mode: `open(p, "a")` in Python, `appendFile` in Node, or `>>` in Bash. This preserves existing content and adds new data at the end.

**Q: Why should I avoid `readFileSync` in Node.js?**
A: It blocks the single-threaded event loop, freezing all other requests until the read completes. Use `fs/promises` instead for any production server code.

**Q: How do I read a large file without running out of memory?**
A: Stream it line by line — `for line in f` in Python, `createReadStream` in Node, or `while read line` in Bash. This keeps memory usage constant regardless of file size.

**Q: How do I safely write to a file that other processes might be reading?**
A: Write to a temporary file on the same filesystem, then atomically rename it over the target. Readers will see either the old complete file or the new complete file, never a partially written one.

**Q: What is the difference between text and binary mode?**
A: Text mode applies platform-specific newline translation (`\r\n` on Windows) and encoding. Binary mode reads raw bytes without transformation. Use binary mode for images, archives, or when you need exact byte-for-byte fidelity.
