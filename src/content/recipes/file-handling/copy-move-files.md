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
  - /recipes/python-image-resize-batch
  - /recipes/compress-decompress-files
  - /recipes/python-zip-file-extraction
  - /recipes/rotate-log-files
lastUpdated: "2026-06-20"
publishedAt: "2026-06-21"
author: Mathias Paulenko
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

## Advanced Solutions

### Python: Advanced copy with validation

```python
import shutil
import hashlib
import os
from pathlib import Path
from typing import Optional

def safe_copy(src: str | Path, dest: str | Path,
              overwrite: bool = False,
              verify: bool = True,
              follow_symlinks: bool = False) -> Path:
    """Copy a file with optional checksum verification and overwrite protection."""
    src = Path(src)
    dest = Path(dest)

    if not src.exists():
        raise FileNotFoundError(f"Source not found: {src}")
    if dest.exists() and not overwrite:
        raise FileExistsError(f"Destination exists: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Copy with metadata preservation
    if src.is_symlink() and not follow_symlinks:
        dest.symlink_to(os.readlink(src))
    else:
        shutil.copy2(src, dest)

    # Verify checksums match
    if verify and not src.is_symlink():
        src_hash = hashlib.sha256(src.read_bytes()).hexdigest()
        dest_hash = hashlib.sha256(dest.read_bytes()).hexdigest()
        if src_hash != dest_hash:
            dest.unlink()
            raise IOError(f"Checksum mismatch after copy: {src} -> {dest}")

    return dest

def safe_move(src: str | Path, dest: str | Path,
              overwrite: bool = False) -> Path:
    """Move a file with atomic rename on same filesystem, copy+delete otherwise."""
    src = Path(src)
    dest = Path(dest)

    if not src.exists():
        raise FileNotFoundError(f"Source not found: {src}")
    if dest.exists() and not overwrite:
        raise FileExistsError(f"Destination exists: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)

    try:
        shutil.move(str(src), str(dest))
    except shutil.Error:
        # Cross-filesystem: copy then delete
        shutil.copy2(src, dest)
        src.unlink()
    return dest

def batch_copy(src_dir: str | Path, dest_dir: str | Path,
               pattern: str = "*",
               overwrite: bool = False) -> list[Path]:
    """Copy all files matching a pattern from src_dir to dest_dir."""
    src_dir = Path(src_dir)
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)

    copied = []
    for file in src_dir.glob(pattern):
        if file.is_file():
            dest = safe_copy(file, dest_dir / file.name, overwrite=overwrite)
            copied.append(dest)
    return copied

# Usage
# safe_copy('config.yaml', '/etc/app/config.yaml', overwrite=True)
# batch_copy('/data/incoming', '/data/processed', '*.csv')
```

### JavaScript: Recursive copy with progress

```javascript
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function copyWithChecksum(src, dest) {
    await fs.copyFile(src, dest);

    const srcHash = crypto.createHash('sha256');
    const destHash = crypto.createHash('sha256');

    const srcData = await fs.readFile(src);
    const destData = await fs.readFile(dest);

    srcHash.update(srcData);
    destHash.update(destData);

    if (srcHash.digest('hex') !== destHash.digest('hex')) {
        await fs.unlink(dest);
        throw new Error(`Checksum mismatch: ${src} -> ${dest}`);
    }
}

async function copyDirectory(src, dest, { recursive = true, filter = null } = {}) {
    const entries = await fs.readdir(src, { withFileTypes: true });
    await fs.mkdir(dest, { recursive: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (filter && !filter(entry.name)) continue;

        if (entry.isDirectory() && recursive) {
            await copyDirectory(srcPath, destPath, { recursive, filter });
        } else if (entry.isFile()) {
            await fs.copyFile(srcPath, destPath);
        } else if (entry.isSymbolicLink()) {
            const linkTarget = await fs.readlink(srcPath);
            await fs.symlink(linkTarget, destPath);
        }
    }
}

async function moveWithFallback(src, dest) {
    try {
        await fs.rename(src, dest);
    } catch (err) {
        if (err.code === 'EXDEV') {
            // Cross-device: copy then delete
            const stat = await fs.stat(src);
            if (stat.isDirectory()) {
                await copyDirectory(src, dest);
                await fs.rm(src, { recursive: true });
            } else {
                await fs.copyFile(src, dest);
                await fs.unlink(src);
            }
        } else {
            throw err;
        }
    }
}

// Usage
// copyWithChecksum('data.csv', '/backup/data.csv');
// copyDirectory('./src', './dist', { filter: name => name.endsWith('.js') });
```

### Java: NIO batch copy with progress callback

```java
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

public class FileOperations {

    public static List<Path> batchCopy(Path srcDir, Path destDir,
                                        String glob, boolean overwrite) throws Exception {
        List<Path> copied = new ArrayList<>();
        PathMatcher matcher = srcDir.getFileSystem().getPathMatcher("glob:" + glob);

        Files.walkFileTree(srcDir, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                if (matcher.matches(file.getFileName())) {
                    try {
                        Path dest = destDir.resolve(srcDir.relativize(file));
                        Files.createDirectories(dest.getParent());
                        var options = new java.util.ArrayList<CopyOption>();
                        options.add(StandardCopyOption.COPY_ATTRIBUTES);
                        if (overwrite) options.add(StandardCopyOption.REPLACE_EXISTING);
                        Files.copy(file, dest, options.toArray(new CopyOption[0]));
                        copied.add(dest);
                    } catch (Exception e) {
                        throw new RuntimeException("Copy failed: " + file, e);
                    }
                }
                return FileVisitResult.CONTINUE;
            }
        });
        return copied;
    }

    public static String checksum(Path file) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] data = Files.readAllBytes(file);
        byte[] hash = md.digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    public static void verifyCopy(Path src, Path dest) throws Exception {
        if (!checksum(src).equals(checksum(dest))) {
            Files.deleteIfExists(dest);
            throw new IOException("Checksum mismatch: " + src + " -> " + dest);
        }
    }
}

// Usage
// FileOperations.batchCopy(Path.of("./incoming"), Path.of("./processed"), "*.csv", true);
```

### Bash: Safe copy with checksum verification

```bash
#!/usr/bin/env bash
set -euo pipefail

safe_copy() {
    local src="$1"
    local dest="$2"
    local overwrite="${3:-false}"

    [[ -f "$src" ]] || { echo "ERROR: Source not found: $src"; return 1; }

    if [[ -f "$dest" && "$overwrite" != "true" ]]; then
        echo "ERROR: Destination exists: $dest"
        return 1
    fi

    mkdir -p "$(dirname "$dest")"
    cp -p "$src" "$dest"

    # Verify checksums
    local src_sum dest_sum
    src_sum=$(sha256sum "$src" | cut -d' ' -f1)
    dest_sum=$(sha256sum "$dest" | cut -d' ' -f1)

    if [[ "$src_sum" != "$dest_sum" ]]; then
        rm -f "$dest"
        echo "ERROR: Checksum mismatch after copy"
        return 1
    fi

    echo "OK: $src -> $dest (verified)"
}

# Batch copy with pattern matching
batch_copy() {
    local src_dir="$1"
    local dest_dir="$2"
    local pattern="${3:-*}"

    mkdir -p "$dest_dir"
    local count=0
    for file in "$src_dir"/$pattern; do
        [[ -f "$file" ]] || continue
        safe_copy "$file" "$dest_dir/$(basename "$file")" true && count=$((count + 1))
    done
    echo "Copied $count files"
}

# Usage
# safe_copy config.yaml /etc/app/config.yaml true
# batch_copy /data/incoming /data/processed "*.csv"
```



## FAQ

### Is `move` always atomic?

Only within the same filesystem. Cross-device moves require copy-then-delete and are inherently non-atomic. Use transactions or temp-file rename patterns for critical operations.

### How do I copy directories recursively?

Python: `shutil.copytree()`. JavaScript: `fs.cp()` (Node 16.7+) or `fs-extra.copy()`. Java: Apache Commons IO `FileUtils.copyDirectory()`.

### Should I follow symlinks when copying?

It depends. For backups, follow symlinks to capture content. For preserving structure, copy the symlink itself. All three languages offer flags to control this behavior.

