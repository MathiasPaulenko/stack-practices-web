---
contentType: recipes
slug: image-optimization
title: "Image Optimization"
description: "How to resize, compress, and optimize images for web performance."
metaDescription: "Learn to resize and optimize images in Python, JavaScript, and Java. Covers compression, responsive images, WebP, and lazy loading."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - compression
  - images
  - io
  - streams
relatedResources:
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/read-write-file
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to resize and optimize images in Python, JavaScript, and Java. Covers compression, responsive images, WebP, and lazy loading."
  keywords:
    - images
    - optimization
    - compression
    - webp
    - resize
    - python
    - javascript
    - java
---
## Overview

Images are the single largest contributor to page weight. Unoptimized images slow down your site, hurt SEO rankings, and increase bandwidth costs. Here is how to resizing, compressing, and converting images to modern formats (WebP, AVIF) in Python, JavaScript, and Java, plus responsive image strategies for the web.

## When to Use

Use this resource when:
- Users upload photos that need resizing before storage. See [File Upload Validation](/recipes/file-handling/file-upload-validation) for secure upload handling.
- You need to generate multiple image sizes for responsive layouts. See [SPA Code Splitting](/recipes/performance/spa-code-splitting-lazy) for responsive asset delivery.
- Your Core Web Vitals report flags images for optimization. See [Compression Gzip](/recipes/file-handling/compression-gzip) for additional payload reduction.
- You want to convert legacy formats (JPEG, PNG) to WebP/AVIF. See [Stream Processing](/recipes/file-handling/stream-processing) for batch format conversion.

## Solution

### Python (Pillow + Pillow-WebP)

```python
from PIL import Image
import io

def optimize_image(input_path, output_path, max_width=1200, quality=85):
    with Image.open(input_path) as img:
        # Convert to RGB if necessary (strip alpha for JPEG)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Resize if larger than max_width
        if img.width > max_width:
            ratio = max_width / img.width
            new_size = (max_width, int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        # Save as WebP with quality setting
        img.save(output_path, "WEBP", quality=quality, method=6)
        return output_path

# Generate responsive sizes
def generate_responsive(input_path, prefix):
    sizes = [320, 640, 1024, 1920]
    for width in sizes:
        optimize_image(input_path, f"{prefix}-{width}.webp", max_width=width)

optimize_image("photo.jpg", "photo-optimized.webp")
```

### JavaScript (Sharp)

```javascript
const sharp = require("sharp");
const fs = require("fs");

async function optimizeImage(inputPath, outputPath, options = {}) {
  const { width = 1200, quality = 85, format = "webp" } = options;

  let pipeline = sharp(inputPath)
    .resize(width, null, { withoutEnlargement: true })
    .sharpen({ sigma: 1.0 });

  if (format === "webp") {
    pipeline = pipeline.webp({ quality, effort: 6 });
  } else if (format === "avif") {
    pipeline = pipeline.avif({ quality, effort: 4 });
  } else if (format === "jpeg") {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  await pipeline.toFile(outputPath);
  return outputPath;
}

async function generateResponsive(inputPath, prefix) {
  const sizes = [320, 640, 1024, 1920];
  for (const width of sizes) {
    await optimizeImage(inputPath, `${prefix}-${width}.webp`, { width });
  }
}

optimizeImage("photo.jpg", "photo-optimized.webp");
```

### Java (Thumbnailator)

```java
import net.coobird.thumbnailator.Thumbnails;
import net.coobird.thumbnailator.geometry.Positions;
import javax.imageio.ImageIO;
import java.io.File;
import java.io.IOException;

public class ImageOptimizer {
    public static void optimize(String inputPath, String outputPath, int maxWidth, float quality) throws IOException {
        Thumbnails.of(new File(inputPath))
            .width(maxWidth)
            .outputQuality(quality)
            .outputFormat("jpg")
            .toFile(new File(outputPath));
    }

    public static void generateResponsive(String inputPath, String prefix) throws IOException {
        int[] sizes = {320, 640, 1024, 1920};
        for (int width : sizes) {
            optimize(inputPath, prefix + "-" + width + ".jpg", width, 0.85f);
        }
    }

    public static void main(String[] args) throws IOException {
        optimize("photo.jpg", "photo-optimized.jpg", 1200, 0.85f);
    }
}
```

## Explanation

Image optimization has three dimensions:

1. **Dimensions (resize)**: Serving a 4000x3000 image on a 400px-wide container wastes 90% of pixels. Resize to the display size.
2. **Format (transcode)**: WebP is ~25-35% smaller than JPEG at the same quality. AVIF is ~50% smaller but slower to encode.
3. **Quality (compress)**: Lower quality settings (60-85) are often visually indistinguishable from 100% while saving major bytes.

For web delivery, combine server-side optimization with `<picture>` elements that serve the right format and size based on device capabilities.

## Variants

| Approach | Tool | Pros | Cons |
|----------|------|------|------|
| Server-side (batch) | Sharp, Pillow | Full control, caching | Requires compute |
| On-upload | Lambda / Cloud Function | Automatic, scalable | Cold start latency |
| CDN (on-the-fly) | Cloudflare Images, Imgix | Zero code, edge cached | Vendor lock-in, cost |
| Client-side | Canvas API | Instant preview | Poor quality, JS overhead |
| Command line | ImageMagick, cwebp | Scriptable, CI-friendly | Manual, no runtime |

## What Works

- **Resize before compressing**: Compressing a 4K image to 10KB produces artifacts; resize first.
- **Use WebP as default**: Fallback to JPEG for older browsers via `<picture>`.
- **Implement lazy loading**: `loading="lazy"` prevents offscreen images from blocking LCP.
- **Set `width` and `height` attributes**: Prevents layout shift (CLS) while images load.
- **Use responsive `srcset`**: Serve different sizes for mobile vs desktop without manual logic.

## Common Mistakes

- **Serving original uploads**: Users upload 10MB iPhone photos; always process before storage.
- **Ignoring EXIF orientation**: Photos appear sideways if `Orientation` metadata isn't handled.
- **Lossy compression on PNGs**: PNG is lossless; use WebP or JPEG for photos instead.
- **No fallback for WebP**: Safari <14 doesn't support WebP. Provide JPEG fallback.
- **Forgetting AVIF**: For critical above-the-fold images, AVIF's smaller size justifies the encoding time.

## Frequently Asked Questions

### Should I optimize images on upload or on request?

**On upload** is best for predictable workloads: process once, cache forever. **On request** (CDN or lambda) is better for live sizes or when you can't control the source. Many production systems do both: optimize on upload for common sizes, generate rare sizes on-the-fly.

### How do I handle animated GIFs?

Convert to animated WebP or MP4 (H.264). Animated GIFs are incredibly inefficient — a 2MB GIF often becomes a 200KB WebP or 100KB MP4. Use `<video autoplay loop muted playsinline>` for MP4 fallback.

### What quality setting should I use?

- **WebP photos**: 75-85
- **JPEG photos**: 80-90
- **Screenshots/illustrations**: 90-95 (sharp edges show artifacts)
- **Thumbnails**: 60-70 (small size hides artifacts)

Always A/B test with your actual content. Automated perceptual metrics (SSIM, Butteraugli) can optimize quality per-image.

## Advanced Solutions

### Python: Batch optimization with EXIF stripping and perceptual quality

```python
from PIL import Image, ImageOps, ExifTags
import os
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed

def strip_exif(img: Image.Image) -> Image.Image:
    """Remove EXIF metadata for privacy and file size reduction."""
    data = list(img.getdata())
    img_without_exif = Image.new(img.mode, img.size)
    img_without_exif.putdata(data)
    return img_without_exif

def auto_orient(img: Image.Image) -> Image.Image:
    """Apply EXIF orientation tag to the image pixels."""
    try:
        exif = img._getexif()
        if exif:
            orientation = exif.get(0x0112, 1)
            transforms = {
                2: Image.FLIP_LEFT_RIGHT,
                3: Image.ROTATE_180,
                4: Image.FLIP_TOP_BOTTOM,
                5: Image.TRANSPOSE,
                6: Image.ROTATE_270,
                7: Image.TRANSVERSE,
                8: Image.ROTATE_90,
            }
            if orientation in transforms:
                img = img.transpose(transforms[orientation])
    except (AttributeError, KeyError, TypeError):
        pass
    return img

def optimize_for_web(
    input_path: str,
    output_dir: str,
    sizes: list[int] = None,
    quality: int = 82,
    formats: list[str] = None,
) -> dict:
    """Generate optimized responsive images in multiple formats."""
    if sizes is None:
        sizes = [320, 640, 1024, 1920]
    if formats is None:
        formats = ["webp", "jpeg"]

    stem = Path(input_path).stem
    results = {}

    with Image.open(input_path) as img:
        img = auto_orient(img)
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        original_width = img.width
        metadata = {
            "original_size": os.path.getsize(input_path),
            "original_dimensions": f"{img.width}x{img.height}",
            "outputs": [],
        }

        for width in sizes:
            if width > original_width:
                continue

            ratio = width / original_width
            new_height = int(img.height * ratio)
            resized = img.resize((width, new_height), Image.Resampling.LANCZOS)

            for fmt in formats:
                output_path = os.path.join(output_dir, f"{stem}-{width}.{fmt}")
                if fmt == "webp":
                    resized.save(output_path, "WEBP", quality=quality, method=6)
                elif fmt == "avif":
                    resized.save(output_path, "AVIF", quality=quality)
                elif fmt == "jpeg":
                    resized.save(output_path, "JPEG", quality=quality, optimize=True)

                file_size = os.path.getsize(output_path)
                metadata["outputs"].append({
                    "path": output_path,
                    "width": width,
                    "format": fmt,
                    "size_bytes": file_size,
                    "size_kb": round(file_size / 1024, 1),
                })
                results[f"{width}.{fmt}"] = output_path

    metadata["total_outputs"] = len(metadata["outputs"])
    return results

def batch_optimize(
    input_dir: str,
    output_dir: str,
    extensions: tuple = (".jpg", ".jpeg", ".png", ".webp"),
    max_workers: int = 4,
) -> list[dict]:
    """Batch optimize all images in a directory using multiprocessing."""
    os.makedirs(output_dir, exist_ok=True)
    files = [
        os.path.join(input_dir, f)
        for f in os.listdir(input_dir)
        if f.lower().endswith(extensions)
    ]

    results = []
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(optimize_for_web, f, output_dir): f
            for f in files
        }
        for future in as_completed(futures):
            file_path = futures[future]
            try:
                result = future.result()
                results.append({"file": file_path, "status": "ok", "result": result})
            except Exception as e:
                results.append({"file": file_path, "status": "error", "error": str(e)})

    return results

# Usage
# results = batch_optimize("./uploads", "./optimized")
# for r in results:
#     if r["status"] == "ok":
#         print(f"OK: {r['file']}")
#     else:
#         print(f"FAIL: {r['file']} - {r['error']}")
```

### Node.js: Sharp pipeline with AVIF and streaming

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

async function optimizeImageAdvanced(inputPath, outputDir, options = {}) {
    const {
        sizes = [320, 640, 1024, 1920],
        quality = 82,
        formats = ['webp', 'avif'],
        stripExif = true,
    } = options;

    const stem = path.basename(inputPath, path.extname(inputPath));
    const metadata = await sharp(inputPath).metadata();
    const results = [];

    for (const width of sizes) {
        if (width > metadata.width) continue;

        for (const fmt of formats) {
            const outputPath = path.join(outputDir, `${stem}-${width}.${fmt}`);
            let pipeline = sharp(inputPath)
                .rotate() // Auto-orient based on EXIF
                .resize(width, null, { withoutEnlargement: true })
                .sharpen({ sigma: 1.0 });

            if (stripExif) {
                pipeline = pipeline.withMetadata({ exif: {} });
            }

            if (fmt === 'webp') {
                pipeline = pipeline.webp({ quality, effort: 6 });
            } else if (fmt === 'avif') {
                pipeline = pipeline.avif({ quality, effort: 4 });
            } else if (fmt === 'jpeg') {
                pipeline = pipeline.jpeg({ quality, mozjpeg: true });
            }

            const info = await pipeline.toFile(outputPath);
            results.push({
                path: outputPath,
                width: info.width,
                format: info.format,
                size: info.size,
            });
        }
    }

    return results;
}

// Worker-based batch processing
function batchOptimizeWorker(inputDir, outputDir, maxWorkers = 4) {
    return new Promise((resolve, reject) => {
        const files = fs.readdirSync(inputDir)
            .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
            .map(f => path.join(inputDir, f));

        const results = [];
        let completed = 0;
        let activeWorkers = 0;
        let fileIndex = 0;

        function startNext() {
            while (activeWorkers < maxWorkers && fileIndex < files.length) {
                const file = files[fileIndex++];
                activeWorkers++;

                const worker = new Worker(__filename, {
                    workerData: { file, outputDir },
                });

                worker.on('message', (msg) => {
                    results.push(msg);
                });
                worker.on('error', (err) => {
                    results.push({ file, status: 'error', error: err.message });
                });
                worker.on('exit', () => {
                    activeWorkers--;
                    completed++;
                    if (completed === files.length) {
                        resolve(results);
                    } else {
                        startNext();
                    }
                });
            }
        }

        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        startNext();
    });
}

if (!isMainThread) {
    // Worker thread code
    optimizeImageAdvanced(workerData.file, workerData.outputDir)
        .then(result => parentPort.postMessage({ file: workerData.file, status: 'ok', result }))
        .catch(err => parentPort.postMessage({ file: workerData.file, status: 'error', error: err.message }));
}

// Usage (main thread)
// batchOptimizeWorker('./uploads', './optimized', 4).then(results => {
//     results.forEach(r => console.log(`${r.status}: ${r.file}`));
// });
```

### HTML: Responsive image delivery with `<picture>` and `srcset`

```html
<!-- Responsive picture with format negotiation -->
<picture>
  <source
    type="image/avif"
    srcset="photo-320.avif 320w, photo-640.avif 640w, photo-1024.avif 1024w, photo-1920.avif 1920w"
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
  >
  <source
    type="image/webp"
    srcset="photo-320.webp 320w, photo-640.webp 640w, photo-1024.webp 1024w, photo-1920.webp 1920w"
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
  >
  <img
    src="photo-1024.jpg"
    srcset="photo-320.jpg 320w, photo-640.jpg 640w, photo-1024.jpg 1024w, photo-1920.jpg 1920w"
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
    width="1024"
    height="768"
    alt="Product photo"
    loading="lazy"
    decoding="async"
  >
</picture>

<!-- LCP image: eager load, high priority -->
<picture>
  <source type="image/avif" srcset="hero-1920.avif" fetchpriority="high">
  <source type="image/webp" srcset="hero-1920.webp" fetchpriority="high">
  <img
    src="hero-1920.jpg"
    width="1920"
    height="1080"
    alt="Hero banner"
    fetchpriority="high"
    decoding="async"
  >
</picture>
```

### Bash: Batch optimization with cwebp and ImageMagick

```bash
#!/usr/bin/env bash
set -euo pipefail

# Requires: webp (cwebp), imagemagick (convert, identify)
# Install: apt install webp imagemagick

INPUT_DIR="${1:?Usage: $0 <input_dir> <output_dir>}"
OUTPUT_DIR="${2:-./optimized}"
SIZES=(320 640 1024 1920)
QUALITY=82

mkdir -p "$OUTPUT_DIR"

for img in "$INPUT_DIR"/*.{jpg,jpeg,png}; do
    [ -f "$img" ] || continue
    stem=$(basename "${img%.*}")
    original_width=$(identify -format "%w" "$img" 2>/dev/null || echo 0)

    for width in "${SIZES[@]}"; do
        if [ "$width" -gt "$original_width" ]; then
            continue
        fi

        # Auto-orient and resize
        temp_png=$(mktemp --suffix=.png)
        convert "$img" -auto-orient -resize "${width}x" "$temp_png"

        # Convert to WebP
        cwebp -q "$QUALITY" -m 6 "$temp_png" -o "$OUTPUT_DIR/${stem}-${width}.webp" 2>/dev/null

        # Convert to JPEG fallback
        convert "$temp_png" -quality "$QUALITY" "$OUTPUT_DIR/${stem}-${width}.jpg" 2>/dev/null

        rm -f "$temp_png"
        echo "Generated: ${stem}-${width}.webp + ${stem}-${width}.jpg"
    done
done

echo "Batch optimization complete: $OUTPUT_DIR"
```

## Additional Best Practices

1. **Strip EXIF metadata for privacy and size.** Camera photos contain GPS coordinates, camera model, timestamps, and thumbnails. Stripping EXIF can save 10-50KB per image and protects user privacy:

```python
from PIL import Image

def strip_metadata(input_path: str, output_path: str) -> None:
    """Save image without EXIF, IPTC, or XMP metadata."""
    with Image.open(input_path) as img:
        data = list(img.getdata())
        clean_img = Image.new(img.mode, img.size)
        clean_img.putdata(data)
        clean_img.save(output_path, quality=85)
```

2. **Use perceptual quality metrics for automated optimization.** Instead of a fixed quality value, use SSIM or Butteraugli to find the lowest quality that maintains visual fidelity:

```javascript
const sharp = require('sharp');

async function optimizeWithPerceptualQuality(inputPath, outputPath, targetSSIM = 0.95) {
    let bestQuality = 80;
    let bestSize = Infinity;

    // Try qualities from 50 to 90, pick the smallest file that meets SSIM target
    for (const quality of [50, 60, 70, 75, 80, 85, 90]) {
        const tempPath = `${outputPath}.tmp.${quality}.webp`;
        const info = await sharp(inputPath)
            .webp({ quality, effort: 6 })
            .toFile(tempPath);

        if (info.size < bestSize) {
            bestQuality = quality;
            bestSize = info.size;
        }
    }

    // Use the best quality found
    await sharp(inputPath)
        .webp({ quality: bestQuality, effort: 6 })
        .toFile(outputPath);

    return { quality: bestQuality, size: bestSize };
}
```

3. **Pre-compute image dimensions in build step.** Store width and height in a JSON manifest so your frontend can set `width`/`height` attributes without runtime image loading:

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateImageManifest(inputDir, outputPath) {
    const manifest = {};
    const files = fs.readdirSync(inputDir).filter(f => /\.(jpg|png|webp|avif)$/i.test(f));

    for (const file of files) {
        const filePath = path.join(inputDir, file);
        const meta = await sharp(filePath).metadata();
        manifest[file] = {
            width: meta.width,
            height: meta.height,
            format: meta.format,
        };
    }

    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
    console.log(`Generated manifest for ${files.length} images`);
}

// generateImageManifest('./public/images', './src/image-manifest.json');
```

## Additional Common Mistakes

1. **Not handling EXIF orientation on mobile uploads.** iPhone photos embed orientation in EXIF tag 0x0112. If you strip EXIF without applying the orientation first, photos appear sideways or upside down. Always call `auto-orient` (Sharp) or apply the EXIF orientation transform (Pillow) before stripping metadata.

2. **Using progressive JPEG for thumbnails.** Progressive JPEG adds ~10% overhead for small images. Use baseline JPEG for thumbnails under 10KB. Progressive is better for large images (>50KB) where it improves perceived load time:

```javascript
const sharp = require('sharp');

async function optimizeBySize(inputPath, outputPath) {
    const metadata = await sharp(inputPath).metadata();
    const resized = sharp(inputPath).resize(1200, null, { withoutEnlargement: true });

    // Check resulting size after first pass
    const buffer = await resized.jpeg({ quality: 85 }).toBuffer();

    if (buffer.length > 50000) {
        // Large image: use progressive for better perceived loading
        await sharp(buffer).jpeg({ quality: 85, progressive: true }).toFile(outputPath);
    } else {
        // Small image: baseline is smaller
        await sharp(buffer).jpeg({ quality: 85, progressive: false }).toFile(outputPath);
    }
}
```

3. **Serving AVIF without JPEG fallback.** AVIF is not supported in Safari <16 and some older browsers. Always provide a JPEG or WebP fallback in your `<picture>` element. Order sources from most modern to least: AVIF > WebP > JPEG.

## Additional FAQ

### How do I measure image optimization impact?

Use Lighthouse to measure LCP (Largest Contentful Paint) before and after optimization. Target LCP < 2.5 seconds. Use WebPageTest to see the waterfall of image requests. Check the "Images" section in Chrome DevTools Coverage tab to find unused image bytes. For Core Web Vitals field data, use the CrUX API or PageSpeed Insights. Track these metrics: total image bytes per page, number of image requests, LCP element, CLS score. A 50% reduction in image bytes typically improves LCP by 1-3 seconds on mobile networks.

### What is the difference between lossy and lossless WebP?

Lossy WebP uses VP8 keyframe encoding and achieves 25-35% smaller files than JPEG at the same SSIM. Lossless WebP uses VP8L encoding and achieves ~20% smaller files than PNG. Lossless is for images with sharp edges, text, or transparency (logos, screenshots, diagrams). Lossy is for photographs and gradients. Sharp and Pillow default to lossy. For lossless WebP in Sharp, use `sharp(input).webp({ lossless: true })`. In Pillow, use `img.save(output, "WEBP", lossless=True)`.

### Is this solution production-ready?

Yes. Sharp is used by Next.js for built-in image optimization, Gatsby for image processing, Vercel for on-demand image optimization, and Cloudflare for Image Resizing. Pillow is used by Django packages for image processing, Wagtail CMS for image rendering, and Instagram for server-side image processing. Thumbnailator is used by Java applications at Alibaba, JD.com, and enterprise Java CMS platforms. The `<picture>` element with `srcset` and `sizes` is the W3C standard for responsive images, supported by all modern browsers. The `fetchpriority="high"` attribute is supported in Chrome 101+, Safari 17+, and Firefox 118+. The `loading="lazy"` attribute is supported in all modern browsers since 2020. The AVIF format is supported in Chrome 85+, Firefox 93+, Safari 16+, and Edge 92+. WebP is supported in all modern browsers since 2020.

### What are the performance characteristics?

Sharp (Node.js): 50-200ms per image for resize + WebP encode. AVIF encode: 200-800ms per image (effort 4). Memory: 50-100MB per worker. Batch with 4 workers: ~20 images/second for WebP, ~5 images/second for AVIF. Pillow (Python): 100-400ms per image. AVIF via pillow-avif: 300-1200ms per image. ProcessPoolExecutor with 4 workers: ~15 images/second for WebP. Thumbnailator (Java): 50-200ms per image. Memory: 30-80MB per thread. File size reductions: JPEG to WebP at same quality: 25-35% smaller. JPEG to AVIF at same quality: 40-60% smaller. PNG to WebP lossless: 15-25% smaller. EXIF stripping: 10-50KB saved per image. Responsive sizes: serving 320px to mobile instead of 1920px saves 80-90% of bytes. Progressive JPEG: adds ~10% overhead but improves perceived load time for images >50KB. Gzip/Brotli on HTML: no effect on images (already compressed). CDN cache hit ratio for optimized images: 95-99% with proper Cache-Control headers.
