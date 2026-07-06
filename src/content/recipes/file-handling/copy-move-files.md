---
contentType: recipes
slug: copy-move-files
title: "Copy and Move Files"
description: "How to copy and move files across platforms safely and efficiently."
metaDescription: "Learn cross-platform file copy and move operations in Python, JavaScript, and Java with safety checks and error handling."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - filesystem
  - python
  - javascript
  - java
  - operations
relatedResources:
  - /recipes/watch-file-changes
  - /recipes/read-large-files
  - /recipes/write-large-files
  - /patterns/visitor-pattern
  - /recipes/file-upload-validation
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn cross-platform file copy and move operations in Python, JavaScript, and Java with safety checks and error handling."
  keywords:
    - file-handling
    - filesystem
    - python
    - javascript
    - java
    - operations
---
## Overview

Copying and moving files is a staple operation in automation, deployment, and data pipelines. Doing it safely across platforms requires attention to path separators, permissions, and atomicity. Below is the idiomatic way to reliable patterns in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Duplicating configuration files during deployments
- Moving uploaded files from temp directories to permanent storage
- Archiving or rotating log files programmatically

## Solution

### Python

```python
import shutil
from pathlib import Path

# Copy file with metadata
shutil.copy2('source.txt', 'dest.txt')

# Move (rename) atomically within same filesystem
shutil.move('temp.txt', 'final.txt')

# Recursive directory copy
shutil.copytree('src_dir', 'dst_dir')
```

### JavaScript

```javascript
const fs = require('fs').promises;
const path = require('path');

async function copyFile(src, dest) {
    await fs.copyFile(src, dest, fs.constants.COPYFILE_EXCL);
}

async function moveFile(src, dest) {
    // Atomic rename if same device; fallback to copy+delete
    try {
        await fs.rename(src, dest);
    } catch {
        await fs.copyFile(src, dest);
        await fs.unlink(src);
    }
}
```

### Java

```java
import java.nio.file.*;

public class FileMover {
    public void copy(String src, String dest) throws Exception {
        Files.copy(Path.of(src), Path.of(dest),
                StandardCopyOption.COPY_ATTRIBUTES,
                StandardCopyOption.REPLACE_EXISTING);
    }

    public void move(String src, String dest) throws Exception {
        Files.move(Path.of(src), Path.of(dest),
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING);
    }
}
```

## Explanation

**Copying** duplicates file content and optionally metadata. **Moving** within the same filesystem is typically atomic (a metadata update). Cross-device moves require copy-then-delete, which is non-atomic and can leave duplicates on failure. The `ATOMIC_MOVE` flag in Java and `rename` in Node.js attempt atomicity, falling back gracefully.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Python | `pathlib.Path` methods | Modern, object-oriented path handling |
| JavaScript | `ncp` or `fs-extra` | Recursive directory copy with filters |
| Java | Apache Commons IO `FileUtils` | Higher-level helpers for batch operations |

## What Works

1. Use `COPYFILE_EXCL` / `COPY_ATTRIBUTES` to preserve permissions and timestamps
2. Prefer atomic moves when possible to avoid partial files
3. Verify source exists and destination is writable before copying
4. Handle `EACCES` / `EPERM` errors gracefully with informative messages
5. For large files, verify integrity with checksums after copy

## Common Mistakes

1. Overwriting existing files without confirmation or backups
2. Ignoring cross-filesystem move semantics, causing data loss on interruption
3. Using string concatenation for paths instead of path APIs, breaking on Windows
4. Not handling symbolic links correctly (follow vs. copy link)
5. Moving open files, which may cause corruption or locks

## Frequently Asked Questions

### Is `move` always atomic?

Only within the same filesystem. Cross-device moves require copy-then-delete and are inherently non-atomic. Use transactions or temp-file rename patterns for critical operations.

### How do I copy directories recursively?

Python: `shutil.copytree()`. JavaScript: `fs.cp()` (Node 16.7+) or `fs-extra.copy()`. Java: Apache Commons IO `FileUtils.copyDirectory()`.

### Should I follow symlinks when copying?

It depends. For backups, follow symlinks to capture content. For preserving structure, copy the symlink itself. All three languages offer flags to control this behavior.
