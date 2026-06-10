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
  - files
  - io
  - python
  - javascript
  - bash
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
lastUpdated: "2026-06-09"
author: "StackPractices"
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

This recipe shows the idiomatic way to read and write text files in Python, JavaScript (Node.js), and Bash.

## When to Use

Use this recipe when:

- Loading configuration or data files at startup
- Generating reports, exports, or logs
- Processing text line by line (CSV, logs, fixtures)
- Persisting small amounts of state without a database

## Solution

### Python

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

```javascript
import { readFile, writeFile } from "node:fs/promises";

await writeFile("notes.txt", "Hello, file!\n", "utf-8");

const content = await readFile("notes.txt", "utf-8");
console.log(content);
```

### Bash

```bash
# Write (overwrite) and append
echo "Hello, file!" > notes.txt
echo "Another line" >> notes.txt

# Read
cat notes.txt
```

## Explanation

- **Python** uses the `with` statement (context manager) so the file is always closed, even on error. Always specify `encoding="utf-8"`.
- **JavaScript** uses the promise-based `fs/promises` API. Prefer it over the synchronous `readFileSync`/`writeFileSync`, which block the event loop.
- **Bash** uses redirection: `>` overwrites, `>>` appends. `cat` prints the contents.

To turn file contents into structured data, see [Parse JSON](/recipes/parse-json).

## Variants

| Language | Read | Write | Append |
|----------|------|-------|--------|
| Python | `open(p).read()` | `open(p, "w")` | `open(p, "a")` |
| JavaScript | `readFile(p)` | `writeFile(p, data)` | `appendFile(p, data)` |
| Bash | `cat p` | `> p` | `>> p` |

## Best Practices

- **Always set encoding**: explicit `utf-8` avoids platform-dependent defaults.
- **Use context managers / async APIs**: `with` in Python, `fs/promises` in Node, to avoid leaks and blocking.
- **Check the path exists**: handle missing files gracefully rather than crashing.
- **Stream large files**: read line by line instead of loading gigabytes into memory.
- **Write atomically**: write to a temp file then rename, to avoid corrupting data on crash.

## Common Mistakes

- **Forgetting to close the handle**: leaks file descriptors; use `with` or `try/finally`.
- **Blocking the event loop in Node**: avoid `readFileSync` in request handlers.
- **Wrong encoding**: reading UTF-8 as ASCII corrupts non-English characters.
- **Overwriting with `>`**: using `>` instead of `>>` in Bash silently erases the file.
- **Ignoring errors**: a missing file or permission error should be handled, not swallowed.

## Frequently Asked Questions

**Q: How do I append instead of overwrite?**
A: Open in append mode: `open(p, "a")` in Python, `appendFile` in Node, or `>>` in Bash.

**Q: Why should I avoid `readFileSync` in Node.js?**
A: It blocks the single-threaded event loop, freezing all other requests until the read completes. Use `fs/promises` instead.

**Q: How do I read a large file without running out of memory?**
A: Stream it line by line — `for line in f` in Python, a readable stream in Node, or `while read line` in Bash.
