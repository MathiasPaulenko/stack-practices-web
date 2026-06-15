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
  - images
  - optimization
  - compression
  - webp
  - resize
  - python
  - javascript
  - java
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

Images are the single largest contributor to page weight. Unoptimized images slow down your site, hurt SEO rankings, and increase bandwidth costs. This recipe covers resizing, compressing, and converting images to modern formats (WebP, AVIF) in Python, JavaScript, and Java, plus responsive image strategies for the web.

## When to Use

Use this resource when:
- Users upload photos that need resizing before storage
- You need to generate multiple image sizes for responsive layouts
- Your Core Web Vitals report flags images for optimization
- You want to convert legacy formats (JPEG, PNG) to WebP/AVIF

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
3. **Quality (compress)**: Lower quality settings (60-85) are often visually indistinguishable from 100% while saving significant bytes.

For web delivery, combine server-side optimization with `<picture>` elements that serve the right format and size based on device capabilities.

## Variants

| Approach | Tool | Pros | Cons |
|----------|------|------|------|
| Server-side (batch) | Sharp, Pillow | Full control, caching | Requires compute |
| On-upload | Lambda / Cloud Function | Automatic, scalable | Cold start latency |
| CDN (on-the-fly) | Cloudflare Images, Imgix | Zero code, edge cached | Vendor lock-in, cost |
| Client-side | Canvas API | Instant preview | Poor quality, JS overhead |
| Command line | ImageMagick, cwebp | Scriptable, CI-friendly | Manual, no runtime |

## Best Practices

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

**On upload** is best for predictable workloads: process once, cache forever. **On request** (CDN or lambda) is better for dynamic sizes or when you can't control the source. Many production systems do both: optimize on upload for common sizes, generate rare sizes on-the-fly.

### How do I handle animated GIFs?

Convert to animated WebP or MP4 (H.264). Animated GIFs are incredibly inefficient — a 2MB GIF often becomes a 200KB WebP or 100KB MP4. Use `<video autoplay loop muted playsinline>` for MP4 fallback.

### What quality setting should I use?

- **WebP photos**: 75-85
- **JPEG photos**: 80-90
- **Screenshots/illustrations**: 90-95 (sharp edges show artifacts)
- **Thumbnails**: 60-70 (small size hides artifacts)

Always A/B test with your actual content. Automated perceptual metrics (SSIM, Butteraugli) can optimize quality per-image.
