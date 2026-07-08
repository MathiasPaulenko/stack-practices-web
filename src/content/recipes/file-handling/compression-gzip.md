---
contentType: recipes
slug: compression-gzip
title: "Compress and Decompress Files with Gzip and Brotli"
description: "How to reduce file sizes for APIs, static assets, and log files using Gzip, Brotli, and zlib with streaming compression, content negotiation, and what works."
metaDescription: "Learn file compression with Gzip and Brotli. Reduce file sizes for APIs, static assets, and logs using streaming compression and content negotiation."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - brotli
  - io
  - streams
  - files
relatedResources:
  - /recipes/cdn-edge-caching
  - /recipes/lazy-loading
  - /recipes/image-optimization
  - /recipes/stream-processing
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn file compression with Gzip and Brotli. Reduce file sizes for APIs, static assets, and logs using streaming compression and content negotiation."
  keywords:
    - gzip compression
    - brotli compression
    - file compression
    - zlib streaming
    - compress assets
---

## Overview

Network bandwidth is often the slowest component in web application delivery. A 500KB JavaScript bundle may take 2 seconds to download on a 3G connection, but only 50 milliseconds for the server to generate. Compression bridges this gap by reducing payload sizes before transmission. Modern algorithms like Gzip and Brotli can shrink text-based assets — HTML, CSS, JavaScript, JSON, and SVG — by 60-85% without any loss of data.

The key insight is that compression should happen transparently at the right layer. Web servers (Nginx, Apache) can compress responses on the fly. Build pipelines (Webpack, Vite) can pre-compress static assets during deployment. APIs can stream compressed JSON directly to clients that advertise support via the `Accept-Encoding` header. The following demonstrates how to Gzip, Brotli, and streaming compression across Python, Node.js, and web server configurations.

## When to use it

Use this recipe when:

- Serving large JavaScript bundles, CSS stylesheets, or HTML documents. See [SPA Code Splitting](/recipes/performance/spa-code-splitting-lazy) for reducing bundle sizes.
- Reducing API response sizes for mobile clients on metered connections. See [Call REST API](/recipes/api/call-rest-api) for efficient API design.
- Compressing log files before archiving them to cold storage. See [Stream Processing](/recipes/file-handling/stream-processing) for log pipeline processing.
- Uploading large payloads to object storage or transferring files between services. See [Image Optimization](/recipes/file-handling/image-optimization) for media compression.
- Complying with performance budgets that mandate maximum transfer sizes. See [Lazy Loading Images](/recipes/performance/lazy-loading) for transfer reduction.

## Solution

### Gzip Streaming Compression (Node.js / zlib)

```javascript
const zlib = require('zlib');
const fs = require('fs');
const { pipeline } = require('stream');

function compressFile(inputPath, outputPath) {
  const gzip = zlib.createGzip({ level: 6 });
  const source = fs.createReadStream(inputPath);
  const destination = fs.createWriteStream(outputPath);

  pipeline(source, gzip, destination, (err) => {
    if (err) console.error('Compression failed:', err);
    else console.log('File compressed successfully');
  });
}

compressFile('data.json', 'data.json.gz');
```

### Brotli Compression (Python)

```python
import brotli
import gzip

def compress_with_brotli(data: bytes) -> bytes:
    return brotli.compress(data, quality=4)

def compress_with_gzip(data: bytes) -> bytes:
    return gzip.compress(data, compresslevel=6)

# Example: compress a JSON response
json_data = b'{"users": [...]}' * 1000
brotli_compressed = compress_with_brotli(json_data)
gzip_compressed = compress_with_gzip(json_data)

print(f"Original: {len(json_data)} bytes")
print(f"Brotli: {len(brotli_compressed)} bytes ({len(brotli_compressed)/len(json_data)*100:.1f}%)")
print(f"Gzip: {len(gzip_compressed)} bytes ({len(gzip_compressed)/len(json_data)*100:.1f}%)")
```

### Express Middleware with Content Negotiation

```javascript
const express = require('express');
const compression = require('compression');

const app = express();

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
}));

app.get('/api/data', (req, res) => {
  res.json(largeDataset);
});
```

### Nginx Static Asset Pre-compression

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

# Serve pre-compressed Brotli files
brotli on;
brotli_static on;
brotli_comp_level 4;
brotli_types text/plain text/css application/javascript application/json image/svg+xml;
```

## Explanation

- **Gzip (DEFLATE)**: the universal compression standard supported by every browser and HTTP client since 1998. It uses LZ77 and Huffman coding to eliminate redundancy. Compression level 6 provides the best balance between CPU cost and size reduction.
- **Brotli**: developed by Google, Brotli achieves 15-25% better compression than Gzip for text assets. It uses a predefined dictionary of common web terms (HTML tags, CSS properties, JavaScript keywords) to improve ratios. Supported in all modern browsers.
- **Streaming compression**: instead of loading an entire file into memory, streaming reads chunks from disk, compresses them, and writes to the output. This handles multi-gigabyte files without exhausting RAM.
- **Content negotiation**: browsers send `Accept-Encoding: gzip, deflate, br` to indicate supported algorithms. Servers respond with `Content-Encoding: br` and the compressed payload. If the client does not support compression, the server returns uncompressed data.

## Variants

| Algorithm | Compression ratio | Speed | Browser support | Best for |
|-----------|-------------------|-------|-----------------|----------|
| Gzip | Good | Fast | Universal | Live responses, legacy support |
| Brotli | Excellent | Medium | Modern browsers | Static assets, pre-compressed files |
| Zstandard | Very good | Very fast | Limited | Internal APIs, microservices |
| LZ4 | Low | Extremely fast | Tools | Real-time logs, speed-critical paths |

## What Works

- **Pre-compress static assets during build**: instead of compressing on every request, run `brotli -q 11` and `gzip -k` during your CI/CD pipeline. Store `.br` and `.gz` variants alongside originals. Nginx can serve these directly with `brotli_static on`.
- **Do not compress already-compressed formats**: images (JPEG, PNG, WebP), videos (MP4), and archives (ZIP) are already compressed. Running Gzip on them wastes CPU and may increase file size. Skip compression for these MIME types.
- **Use threshold filters**: compressing a 200-byte JSON response adds more overhead (headers, framing) than it saves. Set a minimum size threshold of 1KB and only compress `text/*`, `application/json`, and `image/svg+xml`.
- **Enable `Vary: Accept-Encoding`**: caches and CDNs must store separate variants for compressed and uncompressed responses. The `Vary` header tells intermediaries to key the cache on the `Accept-Encoding` header, preventing serving gzip to clients that cannot decompress.
- **Monitor CPU overhead**: compression is CPU-intensive. On high-traffic APIs, pre-compression or dedicated compression appliances (CDNs) offload work from application servers. Profile your application to ensure compression does not starve request handling.

## Common mistakes

- **Double compression**: applying Gzip to a response that is already Brotli-compressed, or vice versa, corrupts the data. Ensure your middleware stack does not apply multiple compression layers.
- **Compressing on every request**: live compression for static assets is wasteful. Pre-compress once at build time and serve the pre-compressed file directly. Live compression should only apply to truly live responses.
- **Forgetting to decompress on the client**: API clients must explicitly decompress responses or use libraries that handle `Content-Encoding` transparently. Raw Gzip bytes passed to a JSON parser will throw syntax errors.
- **Ignoring memory limits**: decompressing untrusted user input can trigger zip bomb attacks (a small compressed file that expands to terabytes). Limit decompression buffer sizes and use streaming APIs that process chunks incrementally.

## FAQ

**Q: Should I use Gzip or Brotli for my application?**
A: Use both. Brotli for static assets (pre-compressed at build time), Gzip for live responses and legacy browser support. Modern CDNs automatically select the best algorithm based on the client's `Accept-Encoding` header.

**Q: Does compression affect caching?**
A: Yes. A cache must store separate copies for each `Content-Encoding` variant. Configure your CDN or cache to vary on `Accept-Encoding`. Otherwise, a cached gzip response may be served to a client that only supports Brotli.

**Q: Can I compress WebSocket messages?**
A: WebSocket per-message deflate is supported in RFC 7692. However, compression is disabled for security reasons when TLS is not used (CRIME/BREACH attacks). Use TLS with WebSockets if enabling compression.

**Q: How do I measure compression effectiveness?**
A: Compare the `Content-Length` of compressed vs uncompressed responses. A compression ratio of 70-85% is typical for JSON and HTML. If your ratio is below 50%, check that you are not compressing already-compressed formats or that your data is genuinely incompressible.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Python: Streaming Gzip with configurable levels and integrity checks

```python
import gzip
import hashlib
from pathlib import Path

def gzip_streaming(src: str, dest: str, level: int = 6) -> str:
    """GZIP a file with streaming. Returns SHA256 of original for integrity."""
    hasher = hashlib.sha256()
    with open(src, 'rb') as f_in, gzip.open(dest, 'wb', compresslevel=level) as f_out:
        while True:
            chunk = f_in.read(65536)
            if not chunk:
                break
            hasher.update(chunk)
            f_out.write(chunk)
    return hasher.hexdigest()

def gunzip_streaming(src: str, dest: str, expected_sha256: str = None) -> bool:
    """Decompress GZIP with optional integrity verification. Returns True if valid."""
    hasher = hashlib.sha256()
    with gzip.open(src, 'rb') as f_in, open(dest, 'wb') as f_out:
        while True:
            chunk = f_in.read(65536)
            if not chunk:
                break
            hasher.update(chunk)
            f_out.write(chunk)
    if expected_sha256:
        return hasher.hexdigest() == expected_sha256
    return True

def gzip_batch(files: list[str], level: int = 6) -> dict[str, str]:
    """GZIP multiple files. Returns mapping of original path to SHA256."""
    results = {}
    for file_path in files:
        dest = f"{file_path}.gz"
        sha = gzip_streaming(file_path, dest, level)
        results[file_path] = sha
    return results

# Usage
# sha = gzip_streaming('large.log', 'large.log.gz', level=6)
# print(f"Original SHA256: {sha}")
# valid = gunzip_streaming('large.log.gz', 'large_restored.log', expected_sha256=sha)
# print(f"Integrity check: {'PASS' if valid else 'FAIL'}")
```

### Node.js: Brotli streaming with content negotiation middleware

```javascript
const zlib = require('zlib');
const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipe = promisify(pipeline);

async function compressBrotli(srcPath, destPath, quality = 11) {
    const src = fs.createReadStream(srcPath);
    const brotli = zlib.createBrotliCompress({
        params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: quality,
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        },
    });
    const dest = fs.createWriteStream(destPath);
    await pipe(src, brotli, dest);
}

async function compressGzip(srcPath, destPath, level = 6) {
    const src = fs.createReadStream(srcPath);
    const gzip = zlib.createGzip({ level });
    const dest = fs.createWriteStream(destPath);
    await pipe(src, gzip, dest);
}

// Express middleware: negotiate best encoding
function smartCompression() {
    return (req, res, next) => {
        const acceptEncoding = req.headers['accept-encoding'] || '';
        const originalSend = res.send.bind(res);

        res.send = function (body) {
            if (typeof body === 'string' && body.length > 1024) {
                if (acceptEncoding.includes('br')) {
                    res.setHeader('Content-Encoding', 'br');
                    res.setHeader('Vary', 'Accept-Encoding');
                    body = zlib.brotliCompressSync(body, {
                        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
                    });
                } else if (acceptEncoding.includes('gzip')) {
                    res.setHeader('Content-Encoding', 'gzip');
                    res.setHeader('Vary', 'Accept-Encoding');
                    body = zlib.gzipSync(body, { level: 6 });
                }
            }
            originalSend(body);
        };
        next();
    };
}

// Usage
// await compressBrotli('app.js', 'app.js.br', 11);
// await compressGzip('app.js', 'app.js.gz', 6);
// app.use(smartCompression());
```

### Java: GZIP and Brotli compression with configurable buffers

```java
import java.io.*;
import java.nio.file.*;
import java.util.zip.*;

public class CompressionUtils {

    // GZIP a file with streaming
    public static long gzipFile(Path src, Path dest, int bufferSize) throws IOException {
        long bytesWritten = 0;
        try (InputStream fis = Files.newInputStream(src);
             OutputStream fos = Files.newOutputStream(dest);
             GZIPOutputStream gzos = new GZIPOutputStream(fos, bufferSize) {{
                 def.setLevel(6); // Set compression level
             }}) {
            byte[] buffer = new byte[bufferSize];
            int read;
            while ((read = fis.read(buffer)) != -1) {
                gzos.write(buffer, 0, read);
                bytesWritten += read;
            }
        }
        return bytesWritten;
    }

    // Decompress GZIP with streaming
    public static long gunzipFile(Path src, Path dest, int bufferSize) throws IOException {
        long bytesWritten = 0;
        try (InputStream fis = Files.newInputStream(src);
             GZIPInputStream gzis = new GZIPInputStream(fis, bufferSize);
             OutputStream fos = Files.newOutputStream(dest)) {
            byte[] buffer = new byte[bufferSize];
            int read;
            while ((read = gzis.read(buffer)) != -1) {
                fos.write(buffer, 0, read);
                bytesWritten += read;
            }
        }
        return bytesWritten;
    }

    // Verify GZIP integrity without extracting
    public static boolean verifyGzip(Path gzPath) {
        try (InputStream fis = Files.newInputStream(gzPath);
             GZIPInputStream gzis = new GZIPInputStream(fis)) {
            byte[] buffer = new byte[8192];
            while (gzis.read(buffer) != -1) {
                // Read through entire file to verify integrity
            }
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    // Batch compress files in a directory
    public static int gzipDirectory(Path srcDir, Path destDir, int bufferSize) throws IOException {
        Files.createDirectories(destDir);
        int count = 0;
        try (var files = Files.walk(srcDir)) {
            for (Path file : files.filter(Files::isRegularFile).toList()) {
                Path relative = srcDir.relativize(file);
                Path dest = destDir.resolve(relative.toString() + ".gz");
                Files.createDirectories(dest.getParent());
                gzipFile(file, dest, bufferSize);
                count++;
            }
        }
        return count;
    }
}

// Usage
// long bytes = CompressionUtils.gzipFile(Path.of("data.json"), Path.of("data.json.gz"), 8192);
// boolean valid = CompressionUtils.verifyGzip(Path.of("data.json.gz"));
// int count = CompressionUtils.gzipDirectory(Path.of("logs/"), Path.of("logs-gz/"), 16384);
```

### Bash: Pre-compression pipeline for static assets

```bash
#!/usr/bin/env bash
set -euo pipefail

# Pre-compress static assets with both Gzip and Brotli
precompress_assets() {
    local dir="$1"
    local count=0

    for file in "$dir""/"*.{js,css,html,json,svg,xml,txt}; do
        [[ -f "$file" ]] || continue

        # Skip if already compressed
        [[ "$file" == *.gz || "$file" == *.br ]] && continue

        # Gzip compression (level 9 for static assets)
        if [[ ! -f "${file}.gz" || "$file" -nt "${file}.gz" ]]; then
            gzip -9 -k -f "$file"
            ((count++))
        fi

        # Brotli compression (quality 11 for static assets)
        if command -v brotli &>/dev/null; then
            if [[ ! -f "${file}.br" || "$file" -nt "${file}.br" ]]; then
                brotli -q 11 -k -f "$file"
                ((count++))
            fi
        fi
    done

    echo "Pre-compressed $count files in $dir"
}

# Compare compression ratios
compare_ratios() {
    local file="$1"
    local original_size
    local gzip_size
    local brotli_size

    original_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
    gzip -c -9 "$file" > /tmp/compare.gz
    brotli -c -q 11 "$file" > /tmp/compare.br 2>/dev/null || true

    gzip_size=$(stat -c%s /tmp/compare.gz 2>/dev/null || stat -f%z /tmp/compare.gz)
    brotli_size=$(stat -c%s /tmp/compare.br 2>/dev/null || stat -f%z /tmp/compare.br)

    echo "File: $file"
    echo "  Original: $original_size bytes"
    echo "  Gzip:     $gzip_size bytes ($(awk "BEGIN{printf \"%.1f\", ($gzip_size/$original_size)*100}")%)"
    echo "  Brotli:   $brotli_size bytes ($(awk "BEGIN{printf \"%.1f\", ($brotli_size/$original_size)*100}")%)"

    rm -f /tmp/compare.gz /tmp/compare.br
}

# Verify gzip integrity
verify_gzip() {
    local file="$1"
    if gzip -t "$file" 2>/dev/null; then
        echo "OK: $file is valid"
    else
        echo "FAIL: $file is corrupted"
        return 1
    fi
}

# Usage
# precompress_assets /var/www/static
# compare_ratios /var/www/static/app.js
# verify_gzip /var/www/static/app.js.gz
```

## Additional Best Practices

1. **Use Brotli quality 11 for static assets, quality 4 for dynamic.** Quality 11 is 10-50x slower than quality 4 but produces 5-10% smaller files. For pre-compression at build time, the extra time is irrelevant. For live responses, quality 4 keeps latency under 10ms:

```bash
# Static assets: quality 11 (build time, max compression)
brotli -q 11 -k app.js

# Dynamic responses: quality 4 (runtime, fast compression)
# In Node.js: zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } })
```

2. **Cache pre-compressed files with content-based filenames.** Use hash-based filenames (e.g., `app.a3f5b2c.js`) so CDN caches the compressed variant indefinitely:

```nginx
# Nginx: serve pre-compressed files with far-future cache headers
location ~* \.(js|css|html|svg)$ {
    brotli_static on;
    gzip_static on;
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}
```

3. **Benchmark compression ratios before committing to an algorithm.** Different data types compress differently. JSON with repeated keys compresses well with Brotli's dictionary. CSV with numeric data may compress better with Gzip:

```python
import gzip
import time

def benchmark_compression(data: bytes, algorithm: str = 'gzip', level: int = 6) -> dict:
    """Benchmark compression ratio and speed."""
    start = time.perf_counter()
    if algorithm == 'gzip':
        compressed = gzip.compress(data, compresslevel=level)
    elif algorithm == 'brotli':
        import brotli
        compressed = brotli.compress(data, quality=level)
    else:
        raise ValueError(f"Unknown algorithm: {algorithm}")
    elapsed = time.perf_counter() - start

    return {
        'algorithm': algorithm,
        'level': level,
        'original_size': len(data),
        'compressed_size': len(compressed),
        'ratio': f"{len(compressed)/len(data)*100:.1f}%",
        'time_ms': f"{elapsed*1000:.2f}",
        'speed_mbs': f"{len(data)/elapsed/1024/1024:.1f}",
    }

# data = open('large.json', 'rb').read()
# print(benchmark_compression(data, 'gzip', 6))
# print(benchmark_compression(data, 'brotli', 4))
```

## Additional Common Mistakes

1. **Serving Brotli to clients that do not support it.** Brotli is supported in all modern browsers but not in older HTTP clients, curl (without `--compressed`), or some proxies. Always check `Accept-Encoding` before sending Brotli:

```javascript
// Bad: always sends Brotli
// res.setHeader('Content-Encoding', 'br');

// Good: check client support first
const acceptEncoding = req.headers['accept-encoding'] || '';
if (acceptEncoding.includes('br')) {
    res.setHeader('Content-Encoding', 'br');
} else if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
}
```

2. **Using compression level 9 for live API responses.** Level 9 is 3-5x slower than level 6 for marginal size improvement (1-3%). For live responses where latency matters, use level 4-6:

```python
# Bad: level 9 for live API response (too slow)
# compressed = gzip.compress(data, compresslevel=9)

# Good: level 6 for live responses (balanced)
compressed = gzip.compress(data, compresslevel=6)

# Good: level 9 for cold storage (size matters more than speed)
compressed = gzip.compress(data, compresslevel=9)
```

3. **Not setting `Vary: Accept-Encoding` on compressed responses.** Without this header, a CDN may cache a Brotli response and serve it to a client that only supports Gzip:

```nginx
# Bad: no Vary header, CDN serves wrong encoding
# gzip on;
# gzip_comp_level 6;

# Good: Vary header prevents cache poisoning
gzip on;
gzip_comp_level 6;
gzip_vary on;
add_header Vary "Accept-Encoding";
```

## Additional FAQ

### How do I handle compression in a microservices architecture?

Use a compression gateway or sidecar proxy. Application services return uncompressed responses, and the gateway handles `Accept-Encoding` negotiation. This centralizes compression config and avoids CPU overhead on application servers. Envoy, Nginx, and HAProxy all support this pattern:

```nginx
# Nginx as API gateway: compress responses from upstream services
location /api/ {
    proxy_pass http://backend;
    gzip on;
    gzip_comp_level 6;
    gzip_types application/json;
    gzip_vary on;
    proxy_set_header Accept-Encoding $http_accept_encoding;
}
```

### Is this solution production-ready?

Yes. `zlib` of Node.js is used by Express.js, Next.js, and the AWS SDK for response compression. `gzip` of Python is used by Django's `GZipMiddleware`, Flask-Compress, and pip for package distribution. `GZIPOutputStream` of Java is used by Spring Boot's `GzipFilter`, Gradle for artifact compression, and Kafka for message compression. Nginx's `gzip` and `brotli` modules are used by Cloudflare, Fastly, and every major CDN for edge compression. Brotli is used by Google Search, YouTube, and Facebook for static asset delivery. The `compression` middleware of Express is used by thousands of production APIs. Pre-compression with `brotli -q 11` is the standard build step in Webpack, Vite, and Astro for static asset optimization.

### What are the performance characteristics?

Gzip level 6 compresses text at 30-80MB/s in Python, 50-120MB/s in Node.js, and 60-150MB/s in Java with 8KB buffer. Brotli quality 4 compresses at 20-60MB/s; quality 11 at 2-10MB/s but produces 5-10% smaller output. Decompression is 5-10x faster than compression: Gzip decompresses at 200-500MB/s, Brotli at 100-400MB/s. Nginx `gzip_static` serves pre-compressed files at disk I/O speed (500-2000MB/s on SSD). Compression ratio for text: Gzip level 6 achieves 70-85% reduction, Brotli quality 11 achieves 75-90% reduction. For JSON with repeated keys, Brotli's dictionary adds 3-8% additional reduction over Gzip. For binary data (images, videos), compression ratio is 0-5% — skip compression. Memory usage: streaming compression uses O(buffer_size), typically 8-64KB per stream. Brotli quality 11 uses 16MB dictionary, requiring 16-32MB RAM per concurrent compression. CPU cost: Gzip level 6 uses 1-3ms per 100KB on a modern CPU; Brotli quality 11 uses 50-200ms per 100KB.

### How do I debug compression issues?

For wrong `Content-Encoding`, verify headers with `curl -v -H "Accept-Encoding: gzip, br" https://example.com/api` — check `Content-Encoding` and `Vary` in the response. For corrupted compressed data, verify integrity with `gzip -t file.gz` (Bash) or `GZIPInputStream` read-through (Java). For poor compression ratios, check if data is already compressed with `file --mime-type input.dat` — if it returns `application/zip` or `image/jpeg`, skip compression. For slow responses, profile compression time with `time curl -s -o /dev/null https://example.com/api` and compare with and without `Accept-Encoding: gzip`. For cache issues, verify `Vary: Accept-Encoding` is present with `curl -I https://example.com/api` and test with different `Accept-Encoding` values. For Brotli not being served, verify the `ngx_brotli` module is loaded with `nginx -V 2>&1 | grep brotli` and check `brotli_types` includes the response MIME type. For double compression, inspect response headers — if `Content-Encoding` appears twice or the response is larger than the original, check middleware ordering. For memory issues during batch compression, monitor with `top` or `htop` and reduce buffer size or use streaming APIs instead of in-memory compression.
