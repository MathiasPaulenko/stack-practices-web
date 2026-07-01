---
contentType: recipes
slug: python-zip-file-extraction
title: "Safely Extract Zip Files with Python"
description: "How to extract and validate zip archives securely using Python zipfile and shutil."
metaDescription: "Extract zip files safely in Python with zipfile module. Validate archives, prevent path traversal, and handle large extractions with code examples."
difficulty: beginner
topics:
  - file-handling
tags:
  - zip
  - python
  - zipfile
  - extraction
  - security
  - archives
relatedResources:
  - /recipes/compress-decompress-files
  - /recipes/bash-iptables-firewall-rules
  - /recipes/bash-ssh-key-management
  - /recipes/copy-move-files
  - /recipes/generate-temporary-files
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Extract zip files safely in Python with zipfile module. Validate archives, prevent path traversal, and handle large extractions with code examples."
  keywords:
    - zip
    - python
    - zipfile
    - extraction
    - security
    - archives
---
## Overview

Extracting zip files is a routine task, but doing it safely requires validation. Malicious archives can contain path traversal entries (`../../etc/passwd`) or zip bombs that exhaust disk space. Python's `zipfile` module gives you the tools to extract safely if you check entries before writing.

## When to Use

- You need to extract user-uploaded zip files
- You are processing archives from untrusted sources
- You want to validate zip contents before extraction (file count, total size)
- You need to extract specific files from an archive without unpacking everything

## Solution

### Basic extraction

```python
import zipfile

with zipfile.ZipFile("archive.zip", "r") as zf:
    zf.extractall("output_dir")
```

### Safe extraction with path traversal protection

```python
import zipfile
import os

def safe_extract(zip_path, extract_to):
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.namelist():
            # Resolve the target path
            target = os.path.realpath(os.path.join(extract_to, member))

            # Ensure the target is inside the extraction directory
            if not target.startswith(os.path.realpath(extract_to) + os.sep):
                raise ValueError(f"Path traversal detected: {member}")

        # Only extract after validation passes
        zf.extractall(extract_to)

safe_extract("archive.zip", "output_dir")
```

### Validate before extracting

```python
import zipfile

def validate_zip(zip_path, max_files=1000, max_total_size_mb=500):
    with zipfile.ZipFile(zip_path, "r") as zf:
        files = zf.namelist()
        if len(files) > max_files:
            raise ValueError(f"Too many files: {len(files)} (max {max_files})")

        total_size = sum(info.file_size for info in zf.infolist())
        if total_size > max_total_size_mb * 1024 * 1024:
            raise ValueError(f"Archive too large: {total_size / 1024 / 1024:.1f}MB")

        # Check for suspicious entries
        for member in files:
            if member.startswith("/") or ".." in member:
                raise ValueError(f"Unsafe path in archive: {member}")

    return True

if validate_zip("archive.zip"):
    with zipfile.ZipFile("archive.zip", "r") as zf:
        zf.extractall("output_dir")
```

### Extract specific files only

```python
import zipfile

with zipfile.ZipFile("archive.zip", "r") as zf:
    # List all files
    for name in zf.namelist():
        print(name)

    # Extract only .csv files
    csv_files = [f for f in zf.namelist() if f.endswith(".csv")]
    for f in csv_files:
        zf.extract(f, "csv_output/")
```

### Extract to memory without writing to disk

```python
import zipfile

with zipfile.ZipFile("archive.zip", "r") as zf:
    with zf.open("data.json") as f:
        content = f.read()
        # Process content directly without writing to disk
        print(content[:200])
```

## Explanation

The `zipfile` module reads archive metadata (file names, sizes, compression) without extracting. Use this to validate before writing anything to disk.

Path traversal attacks work by including entries like `../../etc/passwd` in the archive. If you call `extractall()` without validation, Python writes files to those paths. The safe extraction function checks that every resolved path stays inside the target directory.

Zip bombs are archives that decompress to enormous sizes (e.g., 42KB file that expands to 4.5PB). Check `file_size` for each entry and sum them before extracting.

## Variants

| Approach | Safety | Use When |
|----------|--------|----------|
| extractall() | None | Trusted archives only |
| Safe extract with path check | High | User uploads |
| Validate + extract | Highest | Untrusted sources |
| Extract to memory | High | Processing without disk I/O |

## Guidelines

- Never call `extractall()` on untrusted archives without validation.
- Check total uncompressed size before extracting to avoid zip bombs.
- Resolve paths with `os.path.realpath()` to catch symlink-based traversal.
- Use `zf.open()` to read files into memory when you do not need them on disk.
- Set a file count limit. Legitimate archives rarely contain 10,000 files.

## Common Mistakes

- Calling `extractall()` directly on user uploads. This is the most common zip extraction vulnerability.
- Not checking `file_size` (uncompressed). A 1MB zip can contain entries that expand to GBs.
- Trusting `member.startswith("..")` checks alone. Symlinks and absolute paths can bypass simple string checks.
- Forgetting to handle password-protected archives. `zf.extractall(pwd=b"secret")` raises `RuntimeError` on wrong passwords.
- Not closing the ZipFile context. Use `with` to ensure the file handle is released.

## Frequently Asked Questions

### How do I extract a password-protected zip?

Pass the password as bytes: `zf.extractall("output", pwd=b"mypassword")`. For AES-encrypted zips, install `pyzipper` instead of using the stdlib `zipfile`.

### How do I detect a zip bomb?

Check the compression ratio. If uncompressed size is more than 100x the compressed size, treat it as suspicious. Also set a hard limit on total uncompressed size (e.g., 500MB).

### Can I extract .tar.gz files with zipfile?

No. Use the `tarfile` module for tar archives. It has a similar API: `tarfile.open("file.tar.gz", "r:gz")`.

### How do I create a zip file in Python?

```python
import zipfile

with zipfile.ZipFile("output.zip", "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write("file1.txt")
    zf.write("file2.txt")
```
