---
contentType: recipes
slug: compress-decompress-files
title: "Compress and Decompress Files"
description: "How to handle ZIP, GZIP, and TAR archives programmatically."
metaDescription: "Learn to compress and decompress ZIP, GZIP, and TAR files in Python, JavaScript, and Java with practical code examples and what works."
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
  metaDescription: "Learn to compress and decompress ZIP, GZIP, and TAR files in Python, JavaScript, and Java with practical code examples and what works."
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

Archiving and compressing files reduces storage and transfer costs. Programmatically handling ZIP, GZIP, and TAR is essential for backup scripts, data exports, and artifact packaging. Below is a practical approach to all three formats in Python, JavaScript, and Java.

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

## What Works

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

## Advanced Solutions

### Python: Streaming compression with progress and zip-slip protection

```python
import zipfile
import gzip
import tarfile
import os
from pathlib import Path

def compress_directory_streaming(src_dir: str, dest_zip: str,
                                 compression: int = zipfile.ZIP_DEFLATED,
                                 level: int = 6) -> int:
    """Compress a directory to ZIP with streaming. Returns file count."""
    src_path = Path(src_dir)
    file_count = 0
    with zipfile.ZipFile(dest_zip, 'w', compression, compresslevel=level) as zf:
        for file_path in sorted(src_path.rglob('*')):
            if file_path.is_file():
                arcname = file_path.relative_to(src_path)
                zf.write(file_path, arcname)
                file_count += 1
    return file_count

def decompress_zip_safe(zip_path: str, dest_dir: str) -> int:
    """Extract ZIP with zip-slip protection. Returns file count."""
    dest_path = Path(dest_dir).resolve()
    dest_path.mkdir(parents=True, exist_ok=True)
    file_count = 0

    with zipfile.ZipFile(zip_path, 'r') as zf:
        for member in zf.namelist():
            member_path = (dest_path / member).resolve()
            # Prevent zip-slip: ensure resolved path is under dest
            if not str(member_path).startswith(str(dest_path)):
                raise ValueError(f"Unsafe path detected: {member}")
            zf.extract(member, dest_path)
            file_count += 1
    return file_count

def gzip_file_streaming(src: str, dest: str, level: int = 6) -> None:
    """GZIP a single file with streaming and configurable level."""
    with open(src, 'rb') as f_in, gzip.open(dest, 'wb', compresslevel=level) as f_out:
        while True:
            chunk = f_in.read(65536)
            if not chunk:
                break
            f_out.write(chunk)

def tar_directory_streaming(src_dir: str, dest: str,
                            mode: str = 'w:gz', level: int = 6) -> None:
    """Create a TAR.GZ archive with streaming."""
    with tarfile.open(dest, mode, compresslevel=level) as tar:
        tar.add(src_dir, arcname=Path(src_dir).name)

def list_archive_contents(archive_path: str) -> list[str]:
    """List contents of ZIP or TAR archive."""
    if archive_path.endswith('.zip'):
        with zipfile.ZipFile(archive_path, 'r') as zf:
            return zf.namelist()
    elif archive_path.endswith(('.tar.gz', '.tgz', '.tar')):
        with tarfile.open(archive_path, 'r:*') as tar:
            return tar.getnames()
    raise ValueError(f"Unsupported archive format: {archive_path}")

# Usage
# count = compress_directory_streaming('logs/', 'logs.zip', level=6)
# print(f"Compressed {count} files")
# extracted = decompress_zip_safe('upload.zip', 'extracted/')
# print(f"Extracted {extracted} files safely")
```

### Node.js: Streaming compression pipeline with zlib

```javascript
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipe = promisify(pipeline);

async function gzipFile(srcPath, destPath, level = 6) {
    const src = fs.createReadStream(srcPath);
    const gzip = zlib.createGzip({ level });
    const dest = fs.createWriteStream(destPath);
    await pipe(src, gzip, dest);
}

async function gunzipFile(srcPath, destPath) {
    const src = fs.createReadStream(srcPath);
    const gunzip = zlib.createGunzip();
    const dest = fs.createWriteStream(destPath);
    await pipe(src, gunzip, dest);
}

async function gzipDirectory(srcDir, destZip) {
    const archiver = require('archiver');
    const output = fs.createWriteStream(destZip);
    const archive = archiver('zip', { zlib: { level: 6 } });

    const done = new Promise((resolve, reject) => {
        output.on('close', () => resolve(archive.pointer()));
        output.on('error', reject);
        archive.on('error', reject);
    });

    archive.pipe(output);
    archive.directory(srcDir, false);
    archive.finalize();

    const bytes = await done;
    return bytes;
}

async function extractZipSafe(zipPath, destDir) {
    const extract = require('extract-zip');
    const path = require('path');

    await extract(zipPath, {
        dir: path.resolve(destDir),
        onEntry: (entry, zipfile) => {
            // Prevent zip-slip: reject paths escaping destDir
            const dest = path.resolve(destDir, entry.fileName);
            if (!dest.startsWith(path.resolve(destDir))) {
                throw new Error(`Unsafe path in archive: ${entry.fileName}`);
            }
        },
    });
}

// Usage
// gzipFile('large.log', 'large.log.gz', 9);
// const bytes = await gzipDirectory('logs/', 'logs.zip');
// console.log(`Archive size: ${bytes} bytes`);
// await extractZipSafe('upload.zip', 'extracted/');
```

### Java: Batch compression with try-with-resources

```java
import java.io.*;
import java.nio.file.*;
import java.util.zip.*;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Stream;

public class BatchCompressor {

    // GZIP a single file
    public static void gzipFile(Path src, Path dest, int bufferSize) throws IOException {
        try (InputStream fis = Files.newInputStream(src);
             OutputStream fos = Files.newOutputStream(dest);
             GZIPOutputStream gzos = new GZIPOutputStream(fos, bufferSize)) {
            fis.transferTo(gzos);
        }
    }

    // ZIP multiple files with streaming
    public static int zipFiles(List<Path> sources, Path destZip) throws IOException {
        int count = 0;
        try (OutputStream fos = Files.newOutputStream(destZip);
             ZipOutputStream zos = new ZipOutputStream(fos)) {
            for (Path src : sources) {
                ZipEntry entry = new ZipEntry(src.getFileName().toString());
                zos.putNextEntry(entry);
                try (InputStream fis = Files.newInputStream(src)) {
                    fis.transferTo(zos);
                }
                zos.closeEntry();
                count++;
            }
        }
        return count;
    }

    // Extract ZIP with zip-slip protection
    public static int extractZipSafe(Path zipPath, Path destDir) throws IOException {
        Files.createDirectories(destDir);
        int count = 0;
        try (InputStream fis = Files.newInputStream(zipPath);
             ZipInputStream zis = new ZipInputStream(fis)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                Path destFile = destDir.resolve(entry.getName()).normalize();
                // Prevent zip-slip
                if (!destFile.startsWith(destDir)) {
                    throw new IOException("Unsafe zip entry: " + entry.getName());
                }
                if (entry.isDirectory()) {
                    Files.createDirectories(destFile);
                } else {
                    Files.createDirectories(destFile.getParent());
                    Files.copy(zis, destFile, StandardCopyOption.REPLACE_EXISTING);
                }
                count++;
            }
        }
        return count;
    }

    // Compress all files in a directory
    public static int compressDirectory(Path srcDir, Path destZip) throws IOException {
        List<Path> files = new ArrayList<>();
        try (Stream<Path> stream = Files.walk(srcDir)) {
            stream.filter(Files::isRegularFile).forEach(files::add);
        }
        return zipFiles(files, destZip);
    }
}

// Usage
// BatchCompressor.gzipFile(Path.of("large.log"), Path.of("large.log.gz"), 8192);
// int count = BatchCompressor.compressDirectory(Path.of("logs/"), Path.of("logs.zip"));
// System.out.println("Compressed " + count + " files");
// int extracted = BatchCompressor.extractZipSafe(Path.of("upload.zip"), Path.of("extracted/"));
```

### Bash: tar/gzip with progress and parallel compression

```bash
#!/usr/bin/env bash
set -euo pipefail

# Compress directory to tar.gz with progress
compress_tarball() {
    local src="$1"
    local dest="$2"
    local level="${3:-6}"
    tar -c -C "$(dirname "$src")" "$(basename "$src")" \
        | gzip -"$level" -c > "$dest"
    echo "Created $dest ($(du -h "$dest" | cut -f1))"
}

# Extract tarball safely (prevent path traversal)
extract_tarball_safe() {
    local archive="$1"
    local dest="$2"
    mkdir -p "$dest"
    # List contents first, verify no absolute paths or ../ escapes
    if tar -tf "$archive" | grep -E '^/|\.\.'; then
        echo "Error: unsafe paths detected in $archive" >&2
        return 1
    fi
    tar -xzf "$archive" -C "$dest"
    echo "Extracted to $dest"
}

# Parallel gzip compression using pigz (3-5x faster than gzip)
compress_parallel() {
    local src="$1"
    local dest="$2"
    if command -v pigz &>/dev/null; then
        tar -c -C "$(dirname "$src")" "$(basename "$src")" | pigz -p 4 > "$dest"
    else
        tar -czf "$dest" -C "$(dirname "$src")" "$(basename "$src")"
    fi
    echo "Created $dest"
}

# Batch compress individual files
batch_gzip() {
    local dir="$1"
    local count=0
    for file in "$dir"/*; do
        [[ -f "$file" ]] || continue
        gzip -c "$file" > "${file}.gz"
        ((count++))
    done
    echo "Compressed $count files in $dir"
}

# Usage
# compress_tarball logs/ logs.tar.gz 6
# extract_tarball_safe archive.tar.gz extracted/
# compress_parallel data/ data.tar.gz
# batch_gzip /var/log/app/
```

## Additional Best Practices

1. **Choose the right compression level per use case.** Level 1 is fastest with minimal compression; level 9 is slowest with maximum compression. Level 6 (the default for most tools) offers the best balance:

```python
# Fast: level 1 for real-time compression (logs, streaming)
with gzip.open('log.txt.gz', 'wb', compresslevel=1) as f:
    f.write(data)

# Balanced: level 6 for general use (backups, archives)
with gzip.open('backup.tar.gz', 'wb', compresslevel=6) as f:
    f.write(data)

# Max: level 9 for cold storage (rarely accessed archives)
with gzip.open('cold_archive.tar.gz', 'wb', compresslevel=9) as f:
    f.write(data)
```

2. **Use `pigz` or `zstd` for parallel compression in Bash.** `pigz` uses multiple cores for GZIP, and `zstd` offers better ratios with similar speed:

```bash
# pigz: parallel gzip (4 threads)
tar -c logs/ | pigz -p 4 > logs.tar.gz

# zstd: better compression ratio, faster decompression
tar -c logs/ | zstd -19 -T4 -o logs.tar.zst

# Decompress zstd
zstd -d logs.tar.zst -o logs.tar
```

3. **Verify archive integrity after creation.** Always test archives before relying on them for backups:

```python
import zipfile

def verify_zip(path: str) -> bool:
    """Verify ZIP archive integrity. Returns True if valid."""
    try:
        with zipfile.ZipFile(path, 'r') as zf:
            bad = zf.testzip()
            if bad is not None:
                print(f"Corrupt file in archive: {bad}")
                return False
        return True
    except zipfile.BadZipFile:
        return False

# verify_zip('backup.zip')
```

```bash
# Bash: verify gzip and tar integrity
gzip -t archive.gz && echo "GZIP OK"
tar -tzf archive.tar.gz > /dev/null && echo "TAR OK"
```

## Additional Common Mistakes

1. **Compressing already-compressed files.** JPEG, PNG, MP4, and ZIP files are already compressed. Running them through GZIP wastes CPU and may even increase file size:

```python
import os

def should_compress(file_path: str) -> bool:
    """Check if file benefits from compression."""
    already_compressed = {'.jpg', '.jpeg', '.png', '.mp4', '.zip', '.gz', '.bz2', '.xz', '.zst'}
    ext = os.path.splitext(file_path)[1].lower()
    return ext not in already_compressed

# Skip compression for already-compressed formats
# if should_compress(file_path):
#     gzip_file(file_path, file_path + '.gz')
```

2. **Not handling partial writes during extraction.** If extraction fails midway, you are left with incomplete files. Write to a temp directory and rename on success:

```python
import tempfile
import shutil
from pathlib import Path

def safe_extract(zip_path: str, dest_dir: str) -> None:
    """Extract to temp dir, then atomically move to dest."""
    dest = Path(dest_dir)
    with tempfile.TemporaryDirectory(dir=dest.parent) as tmp:
        tmp_path = Path(tmp)
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(tmp_path)
        # Only move if extraction succeeded
        if dest.exists():
            shutil.rmtree(dest)
        shutil.move(str(tmp_path), str(dest))
```

3. **Ignoring file permissions in archives.** ZIP files store Unix permissions. When extracting on a different platform, permissions may not be preserved correctly. Use `tar` for Unix-to-Unix transfers to preserve permissions, ownership, and symlinks:

```bash
# tar preserves Unix permissions and symlinks
tar -czpf backup.tar.gz --owner=1000 --group=1000 data/

# ZIP does not reliably preserve Unix permissions
# Avoid for backups on Unix systems
```

## Additional FAQ

### How do I compress files in parallel for faster throughput?

Use `pigz` (parallel GZIP) in Bash, `concurrent.futures.ProcessPoolExecutor` in Python, or `ExecutorService` in Java. Each file is compressed independently, so parallelism scales linearly with CPU cores:

```python
import gzip
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

def parallel_gzip(files: list[str], level: int = 6, workers: int = 4) -> int:
    """GZIP multiple files in parallel. Returns count."""
    def compress_one(src: str) -> str:
        with open(src, 'rb') as f_in, gzip.open(f"{src}.gz", 'wb', compresslevel=level) as f_out:
            f_out.writelines(f_in)
        return src

    count = 0
    with ProcessPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(compress_one, f) for f in files]
        for future in as_completed(futures):
            future.result()  # Raise if failed
            count += 1
    return count

# files = [str(p) for p in Path('logs/').glob('*.log')]
# compressed = parallel_gzip(files, level=6, workers=4)
```

### Is this solution production-ready?

Yes. Python's `zipfile` and `gzip` modules are used by pip, setuptools, and Django for package distribution. Node.js `zlib` with `pipeline()` is used by Express.js for response compression and by npm for package tarballs. Java `ZipOutputStream` and `GZIPOutputStream` are used by Spring Boot for static resource compression, Gradle for JAR packaging, and Kafka for message compression. Bash `tar`/`gzip` is the standard for Linux package managers (apt, yum, pacman), log rotation (logrotate), and CI/CD artifact storage. The zip-slip protection pattern is recommended by OWASP and SANS Institute for all archive extraction code.

### What are the performance characteristics?

Python `gzip.open()` compresses at 30-80MB/s with level 6 on a single core. Node.js `zlib.createGzip()` reaches 50-120MB/s. Java `GZIPOutputStream` achieves 60-150MB/s with an 8KB buffer. Bash `gzip` processes 40-100MB/s; `pigz -p 4` scales to 150-400MB/s. `zstd -19` compresses at 10-30MB/s but decompresses at 500-1500MB/s, making it ideal for write-once-read-many archives. ZIP compression of many small files is slower than TAR.GZ due to per-file overhead (~100 bytes per entry). Compression ratio for text files: 3:1 to 10:1 with DEFLATE level 6. For binary files (images, videos): 1:1 to 1.1:1 — compression is not effective. Memory usage for streaming compression is O(buffer_size), typically 8-64KB per stream. `pipeline()` in Node.js adds <1ms overhead for stream setup and error propagation.

### How do I debug issues with this approach?

For corrupt archives, verify integrity with `gzip -t file.gz` (Bash) or `zipfile.testzip()` (Python). For extraction failures, check file permissions with `ls -la archive.zip` and ensure the extracting process has write access to the destination. For compression ratio issues, check if input is already compressed — run `file input.dat` to detect binary formats. For slow compression, profile with `time gzip -6 file` (Bash) or `timeit` (Python) and try lower levels. For zip-slip vulnerabilities, audit extraction code with `grep -r "extractall\|extract(" src/` and verify all paths are validated. For memory issues during compression, check that you are using streaming APIs (`createReadStream`, `GZIPOutputStream`) rather than buffering entire files. For cross-platform issues, verify encoding with `file -i archive.tar.gz` and use `tar` (not `zip`) for Unix-to-Unix transfers to preserve permissions. For parallel compression issues, monitor CPU usage with `top` or `htop` — if not all cores are utilized, check that `pigz -p N` or `ProcessPoolExecutor(max_workers=N)` is configured correctly.
