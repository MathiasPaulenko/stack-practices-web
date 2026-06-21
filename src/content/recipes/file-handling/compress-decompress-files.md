---
contentType: recipes
slug: compress-decompress-files
title: "Compress and Decompress Files"
description: "How to handle ZIP, GZIP, and TAR archives programmatically."
metaDescription: "Learn to compress and decompress ZIP, GZIP, and TAR files in Python, JavaScript, and Java with practical code examples and best practices."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - compression
  - zip
  - gzip
  - python
  - javascript
  - java
relatedResources:
  - /recipes/copy-move-files
  - /recipes/read-large-files
  - /recipes/watch-file-changes
  - /recipes/write-large-files
  - /recipes/file-upload-validation
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn to compress and decompress ZIP, GZIP, and TAR files in Python, JavaScript, and Java with practical code examples and best practices."
  keywords:
    - file-handling
    - compression
    - zip
    - gzip
    - python
    - javascript
    - java
---
## Overview

Archiving and compressing files reduces storage and transfer costs. Programmatically handling ZIP, GZIP, and TAR is essential for backup scripts, data exports, and artifact packaging. This recipe covers all three formats in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Packaging log bundles or report exports for download
- Compressing HTTP responses to reduce bandwidth
- Extracting uploaded archives in web applications

## Solution

### Python

```python
import zipfile
import gzip
import tarfile

# ZIP archive
with zipfile.ZipFile('archive.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('file.txt')

# GZIP single file
with open('file.txt', 'rb') as f_in:
    with gzip.open('file.txt.gz', 'wb') as f_out:
        f_out.writelines(f_in)

# TAR archive
with tarfile.open('archive.tar.gz', 'w:gz') as tar:
    tar.add('data/')
```

### JavaScript

```javascript
const fs = require('fs');
const zlib = require('zlib');
const archiver = require('archiver');

// GZIP compress
const input = fs.createReadStream('file.txt');
const output = fs.createWriteStream('file.txt.gz');
input.pipe(zlib.createGzip()).pipe(output);

// ZIP archive
const archive = archiver('zip', { zlib: { level: 9 } });
archive.pipe(fs.createWriteStream('archive.zip'));
archive.file('file.txt', { name: 'file.txt' });
archive.finalize();
```

### Java

```java
import java.io.*;
import java.util.zip.*;

public class Compressor {
    // GZIP compress
    public void gzip(String src, String dest) throws IOException {
        try (FileInputStream fis = new FileInputStream(src);
             FileOutputStream fos = new FileOutputStream(dest);
             GZIPOutputStream gzos = new GZIPOutputStream(fos)) {
            fis.transferTo(gzos);
        }
    }

    // ZIP archive
    public void zip(String src, String dest) throws IOException {
        try (FileOutputStream fos = new FileOutputStream(dest);
             ZipOutputStream zos = new ZipOutputStream(fos);
             FileInputStream fis = new FileInputStream(src)) {
            zos.putNextEntry(new ZipEntry(new File(src).getName()));
            fis.transferTo(zos);
            zos.closeEntry();
        }
    }
}
```

## Explanation

**ZIP** stores multiple files with optional per-file compression, preserving directory structure. **GZIP** compresses a single file or stream, commonly used for HTTP content encoding and log rotation. **TAR** archives multiple files without compression; paired with GZIP it becomes a `.tar.gz` (or `.tgz`). All three use DEFLATE under the hood, offering excellent compression for text data.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Python | `shutil.make_archive()` | One-liner for ZIP/TAR creation |
| JavaScript | `adm-zip` | In-memory ZIP manipulation, no streams |
| Java | Apache Commons Compress | Supports BZIP2, LZMA, and 7Z formats |

## Best Practices

1. Stream large files rather than buffering entire archives in memory
2. Use compression level 6 as a balanced default; level 9 is slower with diminishing returns
3. Validate extracted paths to prevent zip-slip directory traversal attacks
4. Prefer GZIP for single-file compression; ZIP/TAR for multi-file bundles
5. Close streams in try-with-resources / `with` blocks to avoid file descriptor leaks

## Common Mistakes

1. Loading entire archives into memory instead of streaming
2. Not validating extracted entry paths, allowing directory traversal exploits
3. Forgetting to `finalize()` or `closeEntry()`, producing corrupt archives
4. Applying compression to already-compressed formats (e.g., JPEG, MP4)
5. Ignoring encoding when compressing text files across platforms

## Frequently Asked Questions

### Which format should I use?

Use **GZIP** for single files and HTTP compression. Use **ZIP** for multi-file bundles on Windows. Use **TAR.GZ** for multi-file archives on Unix/Linux systems.

### How do I handle very large archives?

Stream the process: read one file, compress, write to archive, then discard from memory. Python's `zipfile`, Node's `archiver`, and Java's `ZipOutputStream` all support streaming.

### Is ZIP compression secure?

ZIP itself is not encrypted. Use AES-encrypted ZIP (Python `pyminizip`, Java `Zip4j`) or encrypt the archive externally with GPG or similar tools.
