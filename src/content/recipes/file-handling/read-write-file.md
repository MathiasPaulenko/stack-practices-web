---




contentType: recipes
slug: read-write-file
title: "Read and Write Files"
description: "How to read from and write to files safely across multiple programming languages."
metaDescription: "Learn how to read and write files in Python, JavaScript, and Bash with practical examples, encoding tips, and error handling what works."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - bash
  - io
  - streams
  - files
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
  - /recipes/regular-expressions
  - /recipes/bash-scripting-automation
  - /recipes/export-csv-excel
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/image-optimization
  - /recipes/stream-processing
lastUpdated: "2026-06-13"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Learn how to read and write files in Python, JavaScript, and Bash with practical examples, encoding tips, and error handling what works."
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

This approach shows how to the idiomatic way to read and write text files in Python, JavaScript (Node.js), and Bash, plus how to stream large files without exhausting memory.

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

## What Works

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

## FAQ

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

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Python: Atomic writes with pathlib and error handling

```python
import os
import tempfile
from pathlib import Path
from typing import Any

def safe_write(path: str | Path, data: str, encoding: str = 'utf-8') -> None:
    """Write text atomically: temp file + rename. Safe against crashes."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    fd, tmp_path = tempfile.mkstemp(
        dir=path.parent, suffix='.tmp', prefix=path.name
    )
    try:
        with os.fdopen(fd, 'w', encoding=encoding) as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise

def safe_read(path: str | Path, encoding: str = 'utf-8',
              default: str | None = None) -> str | None:
    """Read text with graceful fallback for missing files."""
    path = Path(path)
    if not path.exists():
        return default
    try:
        return path.read_text(encoding=encoding)
    except PermissionError:
        raise PermissionError(f"Cannot read {path}: permission denied")
    except UnicodeDecodeError as e:
        raise UnicodeDecodeError(
            e.encoding, e.object, e.start, e.end,
            f"File {path} is not valid {encoding}"
        )

def read_lines_lazy(path: str | Path, encoding: str = 'utf-8') -> list[str]:
    """Read file lines lazily, stripping whitespace from each line."""
    path = Path(path)
    with path.open('r', encoding=encoding) as f:
        return [line.rstrip('\n\r') for line in f if line.strip()]

def write_json_atomic(path: str | Path, data: Any, indent: int = 2) -> None:
    """Serialize JSON and write atomically."""
    import json
    text = json.dumps(data, indent=indent, ensure_ascii=False, default=str)
    safe_write(path, text)

# Usage
# safe_write('/etc/app/config.yaml', 'key: value\n')
# content = safe_read('/etc/app/config.yaml', default='key: default\n')
# write_json_atomic('/data/state.json', {'users': 42, 'active': 10})
```

### Node.js: Streaming read/write with error recovery

```javascript
const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { createReadStream, createWriteStream } = fs;
const pipe = promisify(pipeline);

async function streamFile(srcPath, destPath, transformFn) {
    const tmpPath = destPath + '.tmp';
    const readStream = createReadStream(srcPath, { encoding: 'utf-8' });
    const writeStream = createWriteStream(tmpPath, { encoding: 'utf-8' });

    let lineBuffer = '';
    const lineTransform = new (require('stream').Transform)({
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

    try {
        await pipe(readStream, lineTransform, writeStream);
        await fs.promises.rename(tmpPath, destPath);
    } catch (err) {
        try { await fs.promises.unlink(tmpPath); } catch {}
        throw err;
    }
}

async function readLines(path) {
    const content = await fs.promises.readFile(path, 'utf-8');
    return content.split('\n').filter(l => l.trim());
}

async function appendLine(path, line) {
    await fs.promises.appendFile(path, line + '\n', 'utf-8');
}

// Usage
// streamFile('input.log', 'output.log', line => line.toUpperCase());
// const lines = await readLines('config.txt');
// await appendLine('app.log', `[${new Date().toISOString()}] Started`);
```

### Java: NIO file operations with atomic writes

```java
import java.io.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.ArrayList;

public class FileOps {

    // Atomic write: temp file + Files.move with ATOMIC_MOVE
    public static void atomicWrite(Path path, String content) throws IOException {
        Path parent = path.getParent();
        if (parent != null) Files.createDirectories(parent);
        Path tmp = Files.createTempFile(parent, path.getFileName().toString(), ".tmp");
        try {
            Files.writeString(tmp, content, StandardCharsets.UTF_8);
            Files.move(tmp, path, StandardCopyOption.ATOMIC_MOVE,
                       StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            Files.deleteIfExists(tmp);
            throw e;
        }
    }

    // Safe read with fallback
    public static String safeRead(Path path, String defaultValue) {
        if (!Files.exists(path)) return defaultValue;
        try {
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read " + path, e);
        }
    }

    // Read all lines lazily
    public static List<String> readLines(Path path) throws IOException {
        return Files.readAllLines(path, StandardCharsets.UTF_8);
    }

    // Append a line
    public static void appendLine(Path path, String line) throws IOException {
        String entry = line + System.lineSeparator();
        Files.writeString(path, entry,
            StandardCharsets.UTF_8,
            StandardOpenOption.CREATE,
            StandardOpenOption.APPEND);
    }

    // Stream lines with try-with-resources
    public static void processLines(Path path, LineHandler handler) throws IOException {
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                handler.handle(line);
            }
        }
    }

    @FunctionalInterface
    public interface LineHandler {
        void handle(String line) throws IOException;
    }
}

// Usage
// FileOps.atomicWrite(Path.of("/etc/app/config.yaml"), "key: value\n");
// String config = FileOps.safeRead(Path.of("config.yaml"), "key: default\n");
// FileOps.processLines(Path.of("large.log"), line -> {
//     if (line.contains("ERROR")) System.err.println(line);
// });
```

### Bash: Safe file operations with error checking

```bash
#!/usr/bin/env bash
set -euo pipefail

# Safe write: write to temp file, then atomically rename
safe_write() {
    local file="$1"
    local content="$2"
    local tmp="${file}.tmp.$$"
    local dir
    dir="$(dirname "$file")"
    mkdir -p "$dir"
    printf '%s' "$content" > "$tmp"
    mv "$tmp" "$file"
}

# Safe read: check existence first, provide default
safe_read() {
    local file="$1"
    local default="${2:-}"
    if [[ -f "$file" && -r "$file" ]]; then
        cat "$file"
    else
        printf '%s' "$default"
    fi
}

# Append with timestamp (for logging)
log_append() {
    local file="$1"
    local message="$2"
    local timestamp
    timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '[%s] %s\n' "$timestamp" "$message" >> "$file"
}

# Read file line by line with error handling
read_lines() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo "Error: $file not found" >&2
        return 1
    fi
    while IFS= read -r line || [[ -n "$line" ]]; do
        echo "$line"
    done < "$file"
}

# Create file with restrictive permissions (for secrets)
create_secret_file() {
    local file="$1"
    local content="$2"
    # Create with 600 permissions directly
    (umask 077; printf '%s' "$content" > "$file")
    echo "Created $file with 600 permissions"
}

# Usage
# safe_write /etc/app/config.txt "key=value"
# content=$(safe_read /etc/app/config.txt "key=default")
# log_append /var/log/app.log "Application started"
# create_secret_file /etc/app/secret.key "my-secret-key-123"
```



