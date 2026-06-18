---
contentType: recipes
slug: compression-gzip
title: "Compress and Decompress Files with Gzip and Brotli"
description: "How to reduce file sizes for APIs, static assets, and log files using Gzip, Brotli, and zlib with streaming compression, content negotiation, and best practices."
metaDescription: "Learn file compression with Gzip and Brotli. Reduce file sizes for APIs, static assets, and logs using streaming compression and content negotiation."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - bandwidth
  - brotli
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

The key insight is that compression should happen transparently at the right layer. Web servers (Nginx, Apache) can compress responses on the fly. Build pipelines (Webpack, Vite) can pre-compress static assets during deployment. APIs can stream compressed JSON directly to clients that advertise support via the `Accept-Encoding` header. This recipe covers Gzip, Brotli, and streaming compression across Python, Node.js, and web server configurations.

## When to use it

Use this recipe when:

- Serving large JavaScript bundles, CSS stylesheets, or HTML documents
- Reducing API response sizes for mobile clients on metered connections
- Compressing log files before archiving them to cold storage
- Uploading large payloads to object storage or transferring files between services
- Complying with performance budgets that mandate maximum transfer sizes

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
| Gzip | Good | Fast | Universal | Dynamic responses, legacy support |
| Brotli | Excellent | Medium | Modern browsers | Static assets, pre-compressed files |
| Zstandard | Very good | Very fast | Limited | Internal APIs, microservices |
| LZ4 | Low | Extremely fast | Tools | Real-time logs, speed-critical paths |

## Best practices

- **Pre-compress static assets during build**: instead of compressing on every request, run `brotli -q 11` and `gzip -k` during your CI/CD pipeline. Store `.br` and `.gz` variants alongside originals. Nginx can serve these directly with `brotli_static on`.
- **Do not compress already-compressed formats**: images (JPEG, PNG, WebP), videos (MP4), and archives (ZIP) are already compressed. Running Gzip on them wastes CPU and may increase file size. Skip compression for these MIME types.
- **Use threshold filters**: compressing a 200-byte JSON response adds more overhead (headers, framing) than it saves. Set a minimum size threshold of 1KB and only compress `text/*`, `application/json`, and `image/svg+xml`.
- **Enable `Vary: Accept-Encoding`**: caches and CDNs must store separate variants for compressed and uncompressed responses. The `Vary` header tells intermediaries to key the cache on the `Accept-Encoding` header, preventing serving gzip to clients that cannot decompress.
- **Monitor CPU overhead**: compression is CPU-intensive. On high-traffic APIs, pre-compression or dedicated compression appliances (CDNs) offload work from application servers. Profile your application to ensure compression does not starve request handling.

## Common mistakes

- **Double compression**: applying Gzip to a response that is already Brotli-compressed, or vice versa, corrupts the data. Ensure your middleware stack does not apply multiple compression layers.
- **Compressing on every request**: dynamic compression for static assets is wasteful. Pre-compress once at build time and serve the pre-compressed file directly. Dynamic compression should only apply to truly dynamic responses.
- **Forgetting to decompress on the client**: API clients must explicitly decompress responses or use libraries that handle `Content-Encoding` transparently. Raw Gzip bytes passed to a JSON parser will throw syntax errors.
- **Ignoring memory limits**: decompressing untrusted user input can trigger zip bomb attacks (a small compressed file that expands to terabytes). Limit decompression buffer sizes and use streaming APIs that process chunks incrementally.

## FAQ

**Q: Should I use Gzip or Brotli for my application?**
A: Use both. Brotli for static assets (pre-compressed at build time), Gzip for dynamic responses and legacy browser support. Modern CDNs automatically select the best algorithm based on the client's `Accept-Encoding` header.

**Q: Does compression affect caching?**
A: Yes. A cache must store separate copies for each `Content-Encoding` variant. Configure your CDN or cache to vary on `Accept-Encoding`. Otherwise, a cached gzip response may be served to a client that only supports Brotli.

**Q: Can I compress WebSocket messages?**
A: WebSocket per-message deflate is supported in RFC 7692. However, compression is disabled for security reasons when TLS is not used (CRIME/BREACH attacks). Use TLS with WebSockets if enabling compression.

**Q: How do I measure compression effectiveness?**
A: Compare the `Content-Length` of compressed vs uncompressed responses. A compression ratio of 70-85% is typical for JSON and HTML. If your ratio is below 50%, check that you are not compressing already-compressed formats or that your data is genuinely incompressible.

