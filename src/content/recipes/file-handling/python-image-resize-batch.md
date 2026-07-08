---
contentType: recipes
slug: python-image-resize-batch
title: "Batch Resize Images with Python"
description: "How to bulk resize and optimize images using Pillow and Python for web delivery."
metaDescription: "Batch resize images in Python with Pillow. Learn bulk image processing, format conversion, and optimization for web delivery with code examples."
difficulty: beginner
topics:
  - file-handling
tags:
  - images
  - python
  - pillow
  - batch-processing
  - resize
  - optimization
relatedResources:
  - /recipes/compress-decompress-files
  - /recipes/copy-move-files
  - /recipes/generate-temporary-files
  - /recipes/image-optimization
  - /recipes/read-large-files
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Batch resize images in Python with Pillow. Learn bulk image processing, format conversion, and optimization for web delivery with code examples."
  keywords:
    - images
    - python
    - pillow
    - batch-processing
    - resize
    - optimization
---
## Overview

Resizing images in bulk is a common task for web optimization, thumbnail generation, and content pipelines. Python with Pillow (PIL fork) makes this straightforward. Here is how to batch resizing, format conversion, quality optimization, and thumbnail generation.

## When to Use

- You need to generate thumbnails for a gallery or product catalog
- You are optimizing images for web delivery (reducing file size)
- You need to convert images between formats (PNG to WebP, JPEG to PNG)
- You are processing user uploads to a consistent size

## Solution

### Basic resize

```python
from PIL import Image

img = Image.open("photo.jpg")
resized = img.resize((800, 600))
resized.save("photo_small.jpg")
```

### Batch resize all images in a directory

```python
from PIL import Image
from pathlib import Path

input_dir = Path("images")
output_dir = Path("images_resized")
output_dir.mkdir(exist_ok=True)

target_size = (800, 600)

for img_path in input_dir.glob("*"):
    if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
        continue

    img = Image.open(img_path)
    resized = img.resize(target_size, Image.Resampling.LANCZOS)
    resized.save(output_dir / img_path.name)
    print(f"Resized: {img_path.name}")
```

### Resize maintaining aspect ratio

```python
from PIL import Image

def resize_maintain_ratio(img, max_width, max_height):
    width, height = img.size
    ratio = min(max_width / width, max_height / height)
    new_size = (int(width * ratio), int(height * ratio))
    return img.resize(new_size, Image.Resampling.LANCZOS)

img = Image.open("photo.jpg")
resized = resize_maintain_ratio(img, 800, 600)
resized.save("photo_ratio.jpg")
```

### Generate thumbnails

```python
from PIL import Image
from pathlib import Path

img = Image.open("photo.jpg")
img.thumbnail((200, 200), Image.Resampling.LANCZOS)
img.save("thumb_photo.jpg")
```

### Convert format and optimize for web

```python
from PIL import Image
from pathlib import Path

input_dir = Path("images")
output_dir = Path("images_webp")
output_dir.mkdir(exist_ok=True)

for img_path in input_dir.glob("*.png"):
    img = Image.open(img_path)
    img = img.convert("RGB")  # WebP needs RGB
    output_path = output_dir / (img_path.stem + ".webp")
    img.save(output_path, "webp", quality=85, method=6)
    print(f"Converted: {img_path.name} -> {output_path.name}")
```

### Batch process with progress tracking

```python
from PIL import Image
from pathlib import Path
import time

input_dir = Path("photos")
output_dir = Path("photos_optimized")
output_dir.mkdir(exist_ok=True)

files = list(input_dir.glob("*.[jp][pn]g"))
total = len(files)

for i, img_path in enumerate(files, 1):
    img = Image.open(img_path)
    img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)

    output_path = output_dir / (img_path.stem + ".jpg")
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    img.save(output_path, "JPEG", quality=85, optimize=True)

    print(f"[{i}/{total}] {img_path.name} -> {output_path.name}")
```

## Explanation

Pillow provides two resize methods: `resize()` changes dimensions to exact values (may distort), and `thumbnail()` resizes to fit within a box while preserving aspect ratio (in-place modification).

`Image.Resampling.LANCZOS` gives the best quality for downscaling. For upscaling, `BICUBIC` is often better. The default `NEAREST` is fast but produces pixelated results.

For web optimization, convert to WebP format with `quality=85`. WebP produces files 25-35% smaller than JPEG at equivalent quality. Use `method=6` for maximum compression (slower but smaller files).

## Variants

| Approach | Method | Aspect Ratio | Use When |
|----------|--------|--------------|----------|
| resize() | Exact size | Distorted | Fixed dimensions required |
| thumbnail() | Fit within box | Preserved | Gallery thumbnails |
| Custom ratio function | Max width/height | Preserved | Flexible layouts |
| WebP conversion | Format change | Preserved | Web optimization |

## Guidelines

- Use `LANCZOS` for downscaling photos. It produces the sharpest results.
- Convert RGBA/P images to RGB before saving as JPEG. JPEG does not support transparency.
- Use `quality=85` for JPEG. Below 80, artifacts become visible; above 90, file size grows with minimal gain.
- Use WebP for web delivery. It is supported by all modern browsers and produces smaller files.
- Process images in a separate output directory. Never overwrite originals.

## Common Mistakes

- Using `resize()` when you want aspect ratio preservation. Use `thumbnail()` or a custom ratio function instead.
- Forgetting to convert RGBA to RGB before saving as JPEG. This raises an error or produces incorrect colors.
- Using `NEAREST` resampling for photos. It looks pixelated. Always use `LANCZOS` or `BICUBIC`.
- Not setting `optimize=True` for JPEG. It reduces file size with no quality loss.
- Overwriting original files. Always write to a separate directory to avoid data loss.

## Frequently Asked Questions

### How do I resize images without Pillow?

You can use `opencv-python` (`cv2.resize()`) or `imageio` with `skimage.transform.resize`. Pillow is the most common choice because it is lightweight and well-documented.

### How do I batch process images in parallel?

Use `concurrent.futures.ProcessPoolExecutor` to process images across CPU cores:

```python
from concurrent.futures import ProcessPoolExecutor

def process_one(img_path):
    img = Image.open(img_path)
    img.thumbnail((800, 800), Image.Resampling.LANCZOS)
    img.save(f"out/{img_path.name}")

with ProcessPoolExecutor() as pool:
    pool.map(process_one, list(Path("images").glob("*.jpg")))
```

### How do I strip EXIF data for privacy?

Pass `exif=b""` when saving, or use `img.info.pop("exif", None)` before saving. This removes GPS coordinates and camera metadata.

### What is the difference between quality and method in WebP?

`quality` controls the visual fidelity (0-100). `method` controls the compression effort (0-6). Higher `method` means slower encoding but smaller files. Use `quality=85, method=6` for best results.

## Advanced Solutions

### Multiprocessing pipeline for large batches

```python
from PIL import Image, ImageOps
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)


def process_image(
    img_path: str,
    output_dir: str,
    max_size: tuple[int, int] = (1200, 1200),
    quality: int = 85,
    strip_exif: bool = True,
) -> dict:
    """Process a single image: resize, strip EXIF, convert to JPEG/WebP."""
    try:
        img_path = Path(img_path)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        img = Image.open(img_path)
        img = ImageOps.exif_transpose(img)  # Auto-orient from EXIF

        if strip_exif:
            img.info.pop("exif", None)

        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        out_path = output_dir / (img_path.stem + ".webp")
        img.save(out_path, "webp", quality=quality, method=6)

        return {
            "input": str(img_path),
            "output": str(out_path),
            "size": out_path.stat().st_size,
            "status": "ok",
        }
    except Exception as e:
        return {"input": str(img_path), "status": "error", "error": str(e)}


def batch_process(
    input_dir: str,
    output_dir: str,
    max_size: tuple[int, int] = (1200, 1200),
    quality: int = 85,
    workers: int = 4,
) -> list[dict]:
    """Batch process images in parallel."""
    input_dir = Path(input_dir)
    extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
    files = [f for f in input_dir.rglob("*") if f.suffix.lower() in extensions]

    if not files:
        logger.warning("No images found in %s", input_dir)
        return []

    logger.info("Processing %d images with %d workers", len(files), workers)
    results = []
    start = time.time()

    with ProcessPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(process_image, str(f), output_dir, max_size, quality): f
            for f in files
        }

        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            results.append(result)
            if result["status"] == "ok":
                logger.info(
                    "[%d/%d] OK: %s (%d KB)",
                    i, len(files), result["output"], result["size"] // 1024,
                )
            else:
                logger.error("[%d/%d] FAIL: %s - %s", i, len(files), result["input"], result.get("error"))

    elapsed = time.time() - start
    ok = sum(1 for r in results if r["status"] == "ok")
    logger.info("Done: %d/%d succeeded in %.1fs", ok, len(results), elapsed)
    return results


if __name__ == "__main__":
    batch_process("images", "images_optimized", max_size=(1200, 1200), quality=85, workers=4)
```

### Responsive image generation (multiple sizes)

```python
from PIL import Image, ImageOps
from pathlib import Path
import json


def generate_responsive_images(
    input_path: str,
    output_dir: str,
    sizes: list[int] = None,
    quality: int = 82,
    formats: list[str] = None,
) -> dict:
    """Generate responsive images at multiple breakpoints."""
    if sizes is None:
        sizes = [320, 640, 1024, 1920]
    if formats is None:
        formats = ["webp", "jpg"]

    input_path = Path(input_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(input_path)
    img = ImageOps.exif_transpose(img)

    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    original_width = img.width
    manifest = {
        "original": input_path.name,
        "original_width": original_width,
        "variants": [],
    }

    for target_width in sizes:
        if target_width > original_width:
            continue  # Don't upscale

        ratio = target_width / original_width
        new_height = int(img.height * ratio)
        resized = img.resize((target_width, new_height), Image.Resampling.LANCZOS)

        for fmt in formats:
            suffix = f"_{target_width}w"
            out_name = f"{input_path.stem}{suffix}.{fmt}"
            out_path = output_dir / out_name

            if fmt == "webp":
                resized.save(out_path, "webp", quality=quality, method=6)
            elif fmt == "jpg":
                resized.save(out_path, "JPEG", quality=quality, optimize=True)

            manifest["variants"].append({
                "width": target_width,
                "height": new_height,
                "format": fmt,
                "file": out_name,
                "size_bytes": out_path.stat().st_size,
            })

    manifest_path = output_dir / f"{input_path.stem}_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))

    return manifest


if __name__ == "__main__":
    result = generate_responsive_images(
        "photo.jpg",
        "responsive_output",
        sizes=[320, 640, 1024, 1920],
        quality=82,
        formats=["webp", "jpg"],
    )
    print(json.dumps(result, indent=2))
```

### Watermark overlay for batch processing

```python
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path


def add_watermark(
    input_path: str,
    output_path: str,
    text: str = "© StackPractices",
    opacity: int = 128,
    position: str = "bottom-right",
    padding: int = 20,
) -> None:
    """Add a text watermark to an image."""
    img = Image.open(input_path).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
    except (IOError, OSError):
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    if position == "bottom-right":
        x = img.width - text_width - padding
        y = img.height - text_height - padding
    elif position == "bottom-left":
        x = padding
        y = img.height - text_height - padding
    elif position == "top-right":
        x = img.width - text_width - padding
        y = padding
    else:
        x = padding
        y = padding

    draw.text((x, y), text, fill=(255, 255, 255, opacity), font=font)
    watermarked = Image.alpha_composite(img, overlay)

    output_path = Path(output_path)
    if output_path.suffix.lower() in (".jpg", ".jpeg"):
        watermarked = watermarked.convert("RGB")

    watermarked.save(output_path)
    print(f"Watermarked: {input_path} -> {output_path}")


def batch_watermark(input_dir: str, output_dir: str, text: str) -> None:
    """Apply watermark to all images in a directory."""
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)

    for img_path in input_dir.glob("*"):
        if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        add_watermark(str(img_path), str(output_dir / img_path.name), text)


if __name__ == "__main__":
    batch_watermark("images", "images_watermarked", "© 2026 StackPractices")
```

### CLI tool with argparse

```python
import argparse
from pathlib import Path
from PIL import Image, ImageOps


def main():
    parser = argparse.ArgumentParser(description="Batch resize images")
    parser.add_argument("input", help="Input directory or file")
    parser.add_argument("-o", "--output", default="output", help="Output directory")
    parser.add_argument("-w", "--width", type=int, default=1200, help="Max width")
    parser.add_argument("-H", "--height", type=int, default=1200, help="Max height")
    parser.add_argument("-q", "--quality", type=int, default=85, help="JPEG/WebP quality (1-100)")
    parser.add_argument("-f", "--format", choices=["jpg", "webp", "png"], default="webp")
    parser.add_argument("--strip-exif", action="store_true", help="Strip EXIF metadata")
    parser.add_argument("--workers", type=int, default=4, help="Parallel workers")
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(exist_ok=True)

    input_path = Path(args.input)
    if input_path.is_file():
        files = [input_path]
    else:
        exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
        files = [f for f in input_path.rglob("*") if f.suffix.lower() in exts]

    print(f"Processing {len(files)} images -> {args.format} ({args.width}x{args.height})")

    for i, f in enumerate(files, 1):
        try:
            img = Image.open(f)
            img = ImageOps.exif_transpose(img)

            if args.strip_exif:
                img.info.pop("exif", None)

            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")

            img.thumbnail((args.width, args.height), Image.Resampling.LANCZOS)

            out_path = output_dir / f"{f.stem}.{args.format}"
            if args.format == "webp":
                img.save(out_path, "webp", quality=args.quality, method=6)
            elif args.format == "jpg":
                img.save(out_path, "JPEG", quality=args.quality, optimize=True)
            else:
                img.save(out_path, "PNG")

            print(f"[{i}/{len(files)}] {f.name} -> {out_path.name}")
        except Exception as e:
            print(f"[{i}/{len(files)}] ERROR: {f.name} - {e}")


if __name__ == "__main__":
    main()
```

## Additional Best Practices

1. **Use `ImageOps.exif_transpose()` before resizing.** Photos from phones often have EXIF orientation tags. Without auto-orientation, the resized image may appear rotated:

```python
from PIL import Image, ImageOps

img = Image.open("phone_photo.jpg")
img = ImageOps.exif_transpose(img)  # Apply EXIF orientation
img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
img.save("photo_correct.jpg", "JPEG", quality=85)
```

2. **Use `Image.MAX_IMAGE_PIXELS` to prevent decompression bombs.** Pillow has a built-in limit to prevent malicious images from exhausting memory. Adjust it if you process legitimate large images:

```python
from PIL import Image

# Default limit is ~89 million pixels. Raise for panoramas/tiled images.
Image.MAX_IMAGE_PIXELS = 200_000_000  # 200 megapixels
```

3. **Save progressive JPEGs for faster web loading.** Progressive JPEGs load in coarse-to-fine passes, giving users a preview before the full image loads:

```python
from PIL import Image

img = Image.open("photo.jpg")
img.save("photo_progressive.jpg", "JPEG", quality=85, optimize=True, progressive=True)
```

## Additional Common Mistakes

1. **Not handling CMYK color mode.** Some JPEGs from print workflows use CMYK mode. Saving as WebP or RGB JPEG without conversion produces incorrect colors:

```python
from PIL import Image

img = Image.open("print_photo.jpg")
if img.mode == "CMYK":
    img = img.convert("RGB")  # Convert CMYK to RGB for web
img.save("web_photo.jpg", "JPEG", quality=85)
```

2. **Using `resize()` with `thumbnail()` expectations.** `thumbnail()` modifies the image in-place and never upscales. `resize()` creates a new image and can distort. Know the difference:

```python
from PIL import Image

img = Image.open("photo.jpg")
# thumbnail() preserves aspect ratio, modifies in-place, no upscaling
img.thumbnail((800, 800))
# img is now <= 800x800 with original aspect ratio

img2 = Image.open("photo.jpg")
# resize() creates new image, can distort, can upscale
resized = img2.resize((800, 800))  # Exactly 800x800, may distort
```

3. **Ignoring ICC color profiles.** Images with embedded ICC profiles may look different after processing. Preserve or convert the profile:

```python
from PIL import Image, ImageCms

img = Image.open("photo_with_icc.jpg")
icc = img.info.get("icc_profile")

# Convert to sRGB for consistent web display
if icc:
    img = ImageCms.profileToProfile(
        img,
        ImageCms.ImageCmsProfile(ImageCms.getOpenProfileFromString(icc)),
        ImageCms.ImageCmsProfile("sRGB"),
        outputMode="RGB",
    )

img.save("photo_srgb.jpg", "JPEG", quality=85)
```

## Additional FAQ

### How do I generate a sprite sheet from multiple images?

Use Pillow to paste images into a grid:

```python
from PIL import Image
from pathlib import Path

images = sorted(Path("icons").glob("*.png"), key=lambda x: x.name)
if not images:
    raise ValueError("No PNG images found")

first = Image.open(images[0])
tile_w, tile_h = first.size
cols = 10
rows = (len(images) + cols - 1) // cols

sheet = Image.new("RGBA", (cols * tile_w, rows * tile_h), (0, 0, 0, 0))

for i, img_path in enumerate(images):
    img = Image.open(img_path)
    x = (i % cols) * tile_w
    y = (i // cols) * tile_h
    sheet.paste(img, (x, y))

sheet.save("sprite_sheet.png")
print(f"Sprite sheet: {sheet.size} ({len(images)} icons)")
```

### How do I compare image quality before and after resizing?

Use SSIM (Structural Similarity Index) from `scikit-image`:

```python
from PIL import Image
from skimage.metrics import structural_similarity as ssim
import numpy as np

original = np.array(Image.open("photo.jpg").convert("L"))
resized = np.array(Image.open("photo_small.jpg").convert("L"))

# Resize original to match for comparison
if original.shape != resized.shape:
    from PIL import Image as PILImage
    original = np.array(
        PILImage.open("photo.jpg").convert("L").resize(resized.shape[::-1])
    )

score = ssim(original, resized)
print(f"SSIM score: {score:.4f} (1.0 = identical, 0.0 = completely different)")
```

### How do I process images from a ZIP archive without extracting?

Use `zipfile` with `io.BytesIO` to read images directly from archives:

```python
import zipfile
import io
from PIL import Image
from pathlib import Path

output_dir = Path("extracted_images")
output_dir.mkdir(exist_ok=True)

with zipfile.ZipFile("images.zip", "r") as zf:
    for name in zf.namelist():
        if not name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            continue

        with zf.open(name) as f:
            img_data = f.read()

        img = Image.open(io.BytesIO(img_data))
        img.thumbnail((800, 800), Image.Resampling.LANCZOS)

        out_name = Path(name).stem + ".webp"
        img.save(output_dir / out_name, "webp", quality=85)
        print(f"Processed: {name} -> {out_name}")
```
