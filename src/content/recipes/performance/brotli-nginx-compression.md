---
contentType: recipes
slug: brotli-nginx-compression
title: "Enable Brotli Compression in Nginx for Static Assets"
description: "Configure Brotli compression in Nginx to shrink JavaScript, CSS, and HTML assets with better ratios than Gzip for faster page loads."
metaDescription: "Configure Brotli compression in Nginx. Reduce JavaScript, CSS, and HTML transfer sizes with better ratios than Gzip for faster static asset delivery."
difficulty: beginner
topics:
  - performance
  - frontend
  - infrastructure
tags:
  - brotli
  - nginx
  - compression
  - performance
  - static-assets
  - optimization
relatedResources:
  - /recipes/compression-gzip
  - /recipes/cdn-edge-caching
  - /recipes/web-performance
  - /recipes/cache-invalidation
  - /recipes/lazy-loading
  - /guides/performance-optimization-guide
lastUpdated: "2026-08-22"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Configure Brotli compression in Nginx. Reduce JavaScript, CSS, and HTML transfer sizes with better ratios than Gzip for faster static asset delivery."
  keywords:
    - brotli
    - nginx
    - compression
    - performance
    - static assets
    - gzip
---

Brotli is a modern compression algorithm that usually gives you JavaScript and CSS files 15-25 %
smaller than Gzip. When you enable it in Nginx, text assets travel faster to the browser and pages
start rendering sooner.

## When to Use

- You serve static text assets through Nginx.
- Most of your users run modern browsers that support Brotli.
- You want to cut bandwidth costs without changing the application code.

## When NOT to Use

- The server is already CPU-bound at peak traffic — dynamic Brotli compression adds load.
- You only serve media files such as JPEG, PNG, or MP4, which are already compressed.
- You're behind a CDN that handles compression itself and ignores origin encoding.

## Solution

### Install the Brotli module

Most packaged Nginx builds don't include Brotli by default. On Ubuntu, `nginx-extras` may already
have it. Otherwise, compile it as a dynamic module.

```bash
# Ubuntu/Debian
sudo apt install nginx-extras

# Compile from source
./configure --with-compat --add-dynamic-module=/path/to/ngx_brotli
make && sudo make install
```

### Configure Nginx

Load the dynamic modules if you compiled them, then turn Brotli on and set the MIME types you want
to compress.

```nginx
# /etc/nginx/nginx.conf
http {
  load_module modules/ngx_http_brotli_filter_module.so;
  load_module modules/ngx_http_brotli_static_module.so;

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

  # Serve pre-built .br files when they exist
  brotli_static on;
}
```

A compression level of 6 is a good default. Levels 10-11 give smaller files but use far more CPU, so
they're better suited for pre-compressed static assets.

### Pre-compress static assets at build time

Avoid compressing the same files on every request by generating `.br` files during your build.

```bash
for file in dist/**/*.{js,css,html,svg}; do
  if [ -f "$file" ]; then
    brotli --quality=11 --output="${file}.br" "$file"
  fi
done
```

For a Vite-based project, you can add a small plugin:

```javascript
// vite-plugin-brotli.js
import { brotliCompressSync } from 'zlib';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, extname } from 'path';

export default function brotliPlugin() {
  return {
    name: 'brotli',
    closeBundle() {
      const dist = resolve('dist');
      const exts = ['.js', '.css', '.html', '.svg'];

      function compressDir(dir) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = resolve(dir, entry.name);
          if (entry.isDirectory()) {
            compressDir(full);
          } else if (exts.includes(extname(entry.name))) {
            const compressed = brotliCompressSync(readFileSync(full));
            writeFileSync(`${full}.br`, compressed);
          }
        }
      }

      compressDir(dist);
    },
  };
}
```

### Verify the response

Request an asset with `br` in `Accept-Encoding` and confirm the header.

```bash
curl -H "Accept-Encoding: br" -I https://example.com/app.js

HTTP/2 200
content-encoding: br
content-type: application/javascript
```

### Keep Gzip as a fallback

Nginx picks the best encoding the client accepts, so leave Gzip enabled for older browsers.

```nginx
server {
  gzip on;
  gzip_types text/plain text/css application/javascript;
  gzip_vary on;
}
```

## Explanation

1. **Dictionary-based compression** — Brotli uses a large built-in dictionary of common web terms,
    which makes text files smaller than Gzip at similar speeds.
2. **Content negotiation** — The browser sends an `Accept-Encoding: br, gzip` header and Nginx
    replies with whichever format it supports first.
3. **Static vs dynamic compression** — `brotli_static` serves pre-built `.br` files with no runtime
    cost. `brotli on` compresses uncached responses on the fly.
4. **CPU trade-off** — Higher compression levels shrink files more but take longer. Use level 11 for
    one-shot build compression and 4-6 for live responses.

## Variants

### Using a CDN with Brotli

If you use Cloudflare, Fastly, or a similar CDN, Brotli may already be enabled at the edge. In that
case, keep Brotli on at the origin as a fallback and set long `Cache-Control` headers so the edge
caches both `br` and `gzip` variants. See [CDN Edge Caching](/recipes/cdn-edge-caching/) for more.

### Pre-compress in a CI/CD pipeline

Add the build step to your deployment pipeline and assert that the `.br` files exist before
uploading.

```yaml
- name: Pre-compress assets
  run: |
    find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) \
      -exec brotli --best {} \;
```

## Best Practices

- Use Brotli level 4-6 for dynamic content and level 11 for pre-compressed files.
- Add `font/woff2` and `image/svg+xml` to `brotli_types` — they compress well.
- Don't include already compressed formats such as JPEG, PNG, WebP, or MP4.
- Enable `brotli_vary on` so caches handle encoding variants correctly.
- Test with Lighthouse or `curl` after every config change.

## Common Mistakes

- Forgetting to install or load `ngx_brotli` and assuming `brotli on` works out of the box.
- Using level 11 for dynamic compression, which adds latency under load.
- Compressing WOFF2 fonts and then serving them with the wrong `Content-Type`.
- Not adding `br` to the CDN cache key, causing mixed encoding responses.

## FAQ

### Should I replace Gzip with Brotli?

No. Serve Brotli to browsers that support it and keep Gzip for older clients. Nginx handles this
automatically through `Accept-Encoding`.

### Which assets benefit most from Brotli?

JavaScript, CSS, HTML, SVG, JSON, and plain text. Images and video already have their own
compression, so Brotli barely helps.

### How much smaller is Brotli than Gzip?

Typically 15-25 % smaller for JavaScript and CSS, and 10-15 % for HTML. Your results depend on how
repetitive the text is.

### Can I use Brotli for dynamic responses?

Yes, but use a lower level such as 4 to avoid CPU spikes. Pre-compress static files at build time
and serve them with `brotli_static`.

### How do I test compression effectiveness?

Run `curl -H "Accept-Encoding: br" --compressed -I` and compare `Content-Length` against the
uncompressed and Gzip versions. Lighthouse also reports transfer sizes.
