---
contentType: recipes
slug: copy-move-files
title: "Copy and Move Files Safely in Python, JS, Java, and Bash"
description: "Learn to copy and move files across platforms with Python, JavaScript, Java, and Bash. Includes atomic moves, checksums, symlinks, and batch patterns."
metaDescription: "Copy and move files safely in Python, JavaScript, Java, and Bash. Use shutil, fs, NIO, and shell with checksums, atomic moves, and batch patterns."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - filesystem
  - python
  - javascript
  - java
  - bash
relatedResources:
  - /recipes/watch-file-changes
  - /recipes/read-large-files
  - /recipes/write-large-files
  - /recipes/file-upload-validation
  - /recipes/compress-decompress-files
  - /recipes/rotate-log-files
lastUpdated: "2026-08-23"
publishedAt: "2026-06-21"
author: Mathias Paulenko
seo:
  metaDescription: "Copy and move files safely in Python, JavaScript, Java, and Bash. Use shutil, fs, NIO, and shell with checksums, atomic moves, and batch patterns."
  keywords:
    - file copy
    - file move
    - shutil
    - filesystem
    - batch copy
    - checksum
    - cross-platform
---

## Overview

Copying and moving files looks simple until a partial transfer, permission error, or cross-device
rename corrupts data. This recipe shows ready-to-use patterns in Python, JavaScript, Java, and Bash
that cover overwrites, checksums, symlinks, and atomic moves.

## When to Use

- You need to duplicate configuration files during [deployments](/recipes/watch-file-changes/).
- You're moving uploaded files from temp directories to permanent storage and want to validate them
  first (see [file upload validation](/recipes/file-upload-validation/)).
- You want to [rotate or archive log files](/recipes/rotate-log-files/) automatically.
- You're batch-copying files before [compressing them](/recipes/compress-decompress-files/).

## When to Avoid

- You need real-time replication between servers; in that case, reach for `rsync` or a dedicated sync
  tool.
- You're moving large objects into cloud storage; the provider's SDK or CLI handles multipart uploads
  better.
- End users need a graphical file manager; this is a scripting recipe.

## Solution

### Python

```python
import shutil
from pathlib import Path
import hashlib

def safe_copy(src, dest, *, overwrite=False, verify=True, follow_symlinks=False):
    """Copy a file, preserving metadata and optionally verifying integrity."""
    src, dest = Path(src), Path(dest)
    if not src.exists():
        raise FileNotFoundError(f"Source not found: {src}")
    if dest.exists() and not overwrite:
        raise FileExistsError(f"Destination exists: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)

    if src.is_symlink() and not follow_symlinks:
        dest.symlink_to(Path(src).readlink())
    else:
        shutil.copy2(src, dest)

    if verify and not src.is_symlink():
        src_hash = hashlib.sha256(src.read_bytes()).hexdigest()
        dest_hash = hashlib.sha256(dest.read_bytes()).hexdigest()
        if src_hash != dest_hash:
            dest.unlink()
            raise IOError(f"Checksum mismatch: {src} -> {dest}")
    return dest

def safe_move(src, dest, *, overwrite=False):
    """Move a file, falling back to copy+delete across filesystems."""
    src, dest = Path(src), Path(dest)
    if not src.exists():
        raise FileNotFoundError(f"Source not found: {src}")
    if dest.exists() and not overwrite:
        raise FileExistsError(f"Destination exists: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)

    try:
        shutil.move(str(src), str(dest))
    except shutil.Error:
        safe_copy(src, dest, overwrite=overwrite, verify=True)
        src.unlink()
    return dest

def batch_copy(src_dir, dest_dir, pattern="*", *, overwrite=False):
    """Copy all files matching a pattern from src_dir to dest_dir."""
    src_dir, dest_dir = Path(src_dir), Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    copied = []
    for file in src_dir.glob(pattern):
        if file.is_file():
            copied.append(safe_copy(file, dest_dir / file.name, overwrite=overwrite))
    return copied
```

### JavaScript

```javascript
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function sha256(file) {
  const data = await fs.readFile(file);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function copyWithChecksum(src, dest) {
  // COPYFILE_FICLONE attempts a copy-on-write clone when supported
  await fs.copyFile(src, dest, fs.constants.COPYFILE_FICLONE);
  if (await sha256(src) !== await sha256(dest)) {
    await fs.unlink(dest);
    throw new Error(`Checksum mismatch: ${src} -> ${dest}`);
  }
}

async function moveWithFallback(src, dest) {
  try {
    await fs.rename(src, dest);  // atomic when same filesystem
  } catch (err) {
    if (err.code === 'EXDEV') {
      const stat = await fs.stat(src);
      if (stat.isDirectory()) {
        await fs.cp(src, dest, { recursive: true });  // Node 16.7+
        await fs.rm(src, { recursive: true });
      } else {
        await copyWithChecksum(src, dest);
        await fs.unlink(src);
      }
    } else {
      throw err;
    }
  }
}
```

### Java

```java
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

public class FileCopier {

    public static void copyWithAttributes(Path src, Path dest, boolean overwrite) throws Exception {
        List<CopyOption> options = new ArrayList<>();
        options.add(StandardCopyOption.COPY_ATTRIBUTES);
        if (overwrite) options.add(StandardCopyOption.REPLACE_EXISTING);
        Files.copy(src, dest, options.toArray(new CopyOption[0]));
    }

    public static void moveWithFallback(Path src, Path dest, boolean overwrite) throws Exception {
        List<CopyOption> options = new ArrayList<>();
        if (overwrite) options.add(StandardCopyOption.REPLACE_EXISTING);

        try {
            // ATOMIC_MOVE only works within the same filesystem
            options.add(StandardCopyOption.ATOMIC_MOVE);
            Files.move(src, dest, options.toArray(new CopyOption[0]));
        } catch (AtomicMoveNotSupportedException e) {
            options.remove(StandardCopyOption.ATOMIC_MOVE);
            copyWithAttributes(src, dest, overwrite);
            Files.deleteIfExists(src);
        }
    }

    public static String sha256(Path file) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(Files.readAllBytes(file));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
```

### Bash

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
```

## Explanation

A copy duplicates content and optionally metadata. A move on the same filesystem is usually a quick,
atomic rename of the inode. Cross-device moves have to copy the bytes first and then delete the
source; if something fails in the middle, you can end up with a partial file or a duplicate.

The Java `ATOMIC_MOVE` flag and Node's `fs.rename` only guarantee atomicity when the source and
destination live on the same filesystem. For critical writes, write a temp file in the destination
directory and rename it over the target.

## Variants

| Technology | Approach | Best For |
| ------------ | ---------- | ---------- |
| **Python** | `shutil` + `pathlib` | Cross-platform scripts and data pipelines |
| **JavaScript** | `fs.promises` / `fs.cp` | Node.js tooling and CI scripts |
| **Java** | `java.nio.file.Files` | Production services that need typed options |
| **Bash** | `cp`, `mv`, `sha256sum` | Quick sysadmin tasks and cron jobs |

Other useful variants include `sendfile`/`copy_file_range` for kernel-level copies on Linux,
`fs-extra` for filtered recursive copies in Node.js, and Apache Commons IO `FileUtils` for
higher-level Java batch helpers.

## Best Practices

- Check overwrites with `COPYFILE_EXCL` or an explicit overwrite flag so you don't replace data
  silently.
- For critical files, write a temp file in the same directory and then move it over the final name.
- Verify checksums on large files, network copies, or anything where corruption would cost you.
- Create parent directories before you write, or you'll hit a "No such file or directory" error.
- Decide your symlink policy up front: follow links for backups, copy the link itself to preserve the
  structure.
- Handle `EXDEV`/cross-device moves with a copy-and-delete fallback.

## Common Mistakes

- Overwriting existing files before you confirm or make a backup.
- Assuming a `move` is atomic when the source and destination live on different filesystems or
  partitions.
- Building a path by joining strings instead of letting `pathlib`, `path.join`, or `Path.resolve` handle it.
- Ignoring symbolic links so a backup captures the link instead of the content, or the content
  instead of the link.
- Moving files that another process is still writing to.
- Forgetting to create the destination directory and getting a cryptic "No such file or directory"
  error.

## FAQ

### Is `move` always atomic?

A move is only atomic on the same filesystem. Cross-device moves are copy-then-delete and can be
interrupted. When readers need an all-or-nothing update, write a temp file and rename it into place.

### How do I copy directories recursively?

In Python, use `shutil.copytree()`. In JavaScript, use `fs.cp(src, dest, { recursive: true })`
(Node 16.7+) or `fs-extra.copy()`. In Java, use `Files.walkFileTree()` or Apache Commons IO
`FileUtils.copyDirectory()`. In Bash, `cp -r` is fine for quick copies, but `rsync -a` preserves
permissions and can resume interrupted transfers.

### Should I follow symlinks when copying?

Which option you choose depends on the job. If you're backing up, follow symlinks so you copy the
actual content. If you want to preserve the exact directory structure, copy the symlink itself.
Python, Java, and Node expose flags that let you decide.

### What should I do if a checksum fails?

Delete the destination copy, check the source for corruption, and retry. Don't keep a file if its
hash doesn't match the original.
