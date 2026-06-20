---
contentType: recipes
slug: brotli-nginx-compression
title: "Enable Brotli Compression in Nginx for Faster Asset Delivery"
description: "How to configure Brotli compression in Nginx to reduce transfer sizes for JavaScript, CSS, and HTML assets with better ratios than Gzip"
metaDescription: "Enable Brotli compression in Nginx. Reduce asset transfer sizes with better compression ratios than Gzip for JavaScript, CSS, and HTML delivery."
difficulty: beginner
topics:
  - performance
  - frontend
tags:
  - brotli
  - performance
  - nginx
  - compression
relatedResources:
  - /recipes/compression-gzip
  - /recipes/cdn-edge-caching
  - /guides/performance-optimization-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Enable Brotli compression in Nginx. Reduce asset transfer sizes with better compression ratios than Gzip for JavaScript, CSS, and HTML delivery."
  keywords:
    - brotli compression
    - nginx
    - web performance
    - asset compression
    - gzip alternative
---

# Enable Brotli Compression in Nginx for Faster Asset Delivery

Brotli is a modern compression algorithm developed by Google that consistently achieves 15-25% smaller file sizes than Gzip for text-based assets. See [performance optimization](/guides/performance/performance-optimization-guide) for more web performance techniques. When combined with Nginx and proper content-type configuration, it reduces bandwidth usage and improves page load times for all users.

## When to Use This

- You serve static assets through Nginx and want maximum compression
- Your users are on modern browsers that support Brotli (95%+ coverage)
- Bandwidth costs are a significant factor in infrastructure spend

## Prerequisites

- Nginx compiled with the `ngx_brotli` module or using the `nginx-full` package
- SSL/TLS certificate (Brotli is only effective over HTTPS in practice)

## Solution

### 1. Install the Brotli Module

```bash
# Ubuntu/Debian with precompiled module
sudo apt install nginx-extras

# Or compile from source
./configure \
  --with-compat \
  --add-dynamic-module=/path/to/ngx_brotli
make && sudo make install
```

### 2. Configure Brotli in Nginx

```nginx
# /etc/nginx/nginx.conf
http {
  # Load the dynamic module if compiled dynamically
  load_module modules/ngx_http_brotli_filter_module.so;
  load_module modules/ngx_http_brotli_static_module.so;

  # Enable dynamic Brotli compression
  brotli on;
  brotli_comp_level 6;
  brotli_types
    text/plain
    text/css
    text/xml
    application/javascript
    application/json
    application/xml
    image/svg+xml
    font/woff2;

  # Pre-compressed static files (optional)
  brotli_static on;
}
```

### 3. Pre-Compress Static Assets at Build Time

```bash
# Build script for CI/CD
for file in dist/**/*.{js,css,html,svg}; do
  if [ -f "$file" ]; then
    brotli --quality=11 --output="${file}.br" "$file"
  fi
done
```

```javascript
// vite-plugin-brotli.js
import { brotliCompressSync } from 'zlib';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export default function brotliPlugin() {
  return {
    name: 'brotli',
    closeBundle() {
      const dist = resolve('dist');
      const files = ['.js', '.css', '.html', '.svg'];
      
      files.forEach(ext => {
        const file = resolve(dist, `index${ext}`);
        try {
          const compressed = brotliCompressSync(readFileSync(file));
          writeFileSync(`${file}.br`, compressed);
        } catch { /* file does not exist */ }
      });
    }
  };
}
```

### 4. Verify Compression is Working

```bash
# Check response headers
curl -H "Accept-Encoding: br" -I https://example.com/app.js

# Expected output
HTTP/2 200
content-encoding: br
content-type: application/javascript
```

### 5. Fallback to Gzip for Older Clients

```nginx
server {
  location ~ \.(js|css|html|svg)$ {
    # Nginx automatically negotiates encoding based on Accept-Encoding header
    # Brotli takes priority when both are supported
    gzip on;
    gzip_types text/plain text/css application/javascript;
    gzip_vary on;
  }
}
```

## How It Works

1. **Brotli Algorithm** uses a dictionary-based approach optimized for web content
2. **Dynamic Compression** compresses responses on-the-fly for uncached content
3. **Static Pre-Compression** serves pre-built `.br` files to avoid CPU overhead
4. **Content Negotiation** Nginx selects Brotli or Gzip based on the `Accept-Encoding` header

## Production Considerations

- Use **compression level 4-6** for dynamic content; level 11 for pre-compressed static assets
- Monitor **CPU usage**; Brotli at high levels can be CPU-intensive
- Combine with a **[CDN](/recipes/data/caching)** that supports Brotli caching for maximum benefit
- Test with **WebPageTest** or Lighthouse to verify transfer size reductions and [Core Web Vitals](/guides/performance/performance-optimization-guide)

## Common Mistakes

- Forgetting to add `font/woff2` to `brotli_types`; WOFF2 fonts compress well
- Using `brotli_comp_level 11` for dynamic content, causing high latency
- Not enabling `brotli_static` and compressing the same files on every request

## FAQ

**Q: Should I replace Gzip entirely with Brotli?**
A: No. Serve Brotli to modern browsers and Gzip as a fallback for older clients.

**Q: Does Brotli help with images?**
A: Minimal benefit for already-compressed formats like JPEG and PNG. Use it for SVG, JSON, and JavaScript.

**Q: How much smaller is Brotli compared to Gzip?**
A: Typically 15-25% smaller for JavaScript and CSS. HTML sees 10-15% improvement.
