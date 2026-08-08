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
publishedAt: "2026-07-01"
author: Mathias Paulenko
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

## FAQ

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


## Additional Best Practices


- For a deeper guide, see [Compress and Decompress Files](/recipes/compress-decompress-files/).

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
