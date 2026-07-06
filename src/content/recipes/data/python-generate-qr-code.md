---
contentType: recipes
slug: python-generate-qr-code
title: "Generate QR Codes with Python"
description: "Create QR codes for URLs, text, and contact cards using the qrcode library in Python."
metaDescription: "Generate QR codes in Python with the qrcode library. Create custom QR codes for URLs, text, and vCards with styling and error correction examples."
difficulty: beginner
topics:
  - data
tags:
  - qr-code
  - python
  - qrcode
  - generation
  - images
relatedResources:
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/diff-json-objects
  - /recipes/format-phone-numbers
  - /recipes/generate-pdf-report-python
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Generate QR codes in Python with the qrcode library. Create custom QR codes for URLs, text, and vCards with styling and error correction examples."
  keywords:
    - qr-code
    - python
    - qrcode
    - generation
    - images
---
## Overview

QR codes bridge physical and digital. Python's `qrcode` library generates them from any string: URLs, contact info, WiFi credentials, payment links. Below is a practical approach to basic generation, styling, error correction levels, and batch creation.

## When to Use

- You need to generate QR codes for URLs or product pages
- You are creating vCard contact cards for print or email
- You want to encode WiFi credentials for guest access
- You need to batch-generate hundreds of QR codes from a CSV

## Solution

### Basic QR code

```python
import qrcode

img = qrcode.make("https://example.com")
img.save("qr_basic.png")
```

### Custom size and error correction

```python
import qrcode

qr = qrcode.QRCode(
    version=1,  # 1 = 21x21, increases with more data
    error_correction=qrcode.constants.ERROR_CORRECT_H,  # High = 30% recovery
    box_size=10,  # pixel size of each box
    border=4,  # minimum border (quiet zone)
)
qr.add_data("https://example.com/long-url-here")
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save("qr_custom.png")
```

### Generate vCard QR code

```python
import qrcode

vcard = """BEGIN:VCARD
VERSION:3.0
FN:Jane Smith
ORG:Acme Corp
TITLE:Software Engineer
TEL:+15551234567
EMAIL:jane@example.com
URL:https://example.com
END:VCARD"""

qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M)
qr.add_data(vcard)
qr.make(fit=True)
img = qr.make_image(fill_color="#1a56db", back_color="white")
img.save("qr_vcard.png")
```

### WiFi credentials QR code

```python
import qrcode

wifi = "WIFI:T:WPA;S:MyNetwork;P:MyPassword;;"
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H)
qr.add_data(wifi)
qr.make(fit=True)
img = qr.make_image()
img.save("qr_wifi.png")
```

### Batch generate from CSV

```python
import qrcode
import csv
from pathlib import Path

output_dir = Path("qr_codes")
output_dir.mkdir(exist_ok=True)

with open("urls.csv", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        url = row["url"]
        name = row["name"]
        img = qrcode.make(url)
        img.save(output_dir / f"{name}.png")
        print(f"Generated: {name}.png")
```

### Generate as SVG

```python
import qrcode
import qrcode.image.svg

qr = qrcode.QRCode(image_factory=qrcode.image.svg.SvgImage)
qr.add_data("https://example.com")
qr.make(fit=True)
img = qr.make_image()
img.save("qr_vector.svg")
```

## Explanation

QR codes encode data in a 2D matrix of black and white squares. The `version` parameter controls the matrix size (1 = 21x21, up to 40 = 177x177). Higher versions hold more data but produce larger images.

Error correction has four levels:
- **L (Low)**: 7% recovery. Smallest QR code for the data.
- **M (Medium)**: 15% recovery. Good default for most uses.
- **Q (Quartile)**: 25% recovery. Use when the code might get partially obscured.
- **H (High)**: 30% recovery. Use for print where ink spread or damage is possible.

The `box_size` controls pixel dimensions. `border` (quiet zone) must be at least 4 modules for scanners to detect the QR code reliably.

## Variants

| Format | Library | Output | Use When |
|--------|---------|--------|----------|
| PNG | qrcode + Pillow | Raster image | Web, print |
| SVG | qrcode.image.svg | Vector image | Print, scaling |
| PNG with logo | qrcode + Pillow | Branded QR | Marketing |

## Guidelines

- Use error correction H for print materials. Ink spread can damage the code.
- Keep the quiet zone at 4 or more modules. Scanners need clear borders.
- Test QR codes with multiple scanner apps before printing.
- Use SVG for print. It scales without pixelation at any size.
- Keep URLs short. Use a URL shortener if the encoded string is too long for version 10+.

## Common Mistakes

- Using error correction L for print. Ink spread damages low-correction codes.
- Setting border to 0. Scanners cannot detect the QR code without a quiet zone.
- Encoding too much data. URLs over 100 characters push the version high and make the code hard to scan.
- Not testing on physical prints. Screen previews do not reflect scanning conditions.
- Using colored fills with low contrast. Scanners need dark modules on light backgrounds.

## Frequently Asked Questions

### Can I add a logo in the center of a QR code?

Yes, but only with error correction H. The logo covers part of the data, and the 30% recovery compensates. Use Pillow to paste the logo image onto the center of the QR code.

### How much data can a QR code hold?

Up to 2,953 bytes (alphanumeric) or 4,296 digits at version 40 with error correction L. Practical limits are lower because high-density codes are hard to scan with phone cameras.

### How do I decode a QR code from an image?

Use `pyzbar` with Pillow:

```python
from pyzbar.pyzbar import decode
from PIL import Image

results = decode(Image.open("qr_code.png"))
for r in results:
    print(r.data.decode())
```

### Is the qrcode library free for commercial use?

Yes. The `qrcode` library is BSD-licensed. You can use it in commercial projects without restrictions.
