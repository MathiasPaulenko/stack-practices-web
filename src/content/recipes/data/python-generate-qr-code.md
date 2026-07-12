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


- For alternatives, see [Convert CSV to JSON](/recipes/convert-csv-to-json/).

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

## When Not to Use This Approach

- **Locale-aware formatting in distributed systems**: if servers span multiple timezones, formatting dates locally per-server causes inconsistencies. Always format in UTC on the server and convert in the presentation layer using the user's locale
- **High-frequency formatting calls**: if formatting is called millions of times per second, the overhead of strftime or Intl.DateTimeFormat becomes significant. Pre-format static values and cache the result
- **Financial calculations requiring exact precision**: floating-point arithmetic causes rounding errors in money calculations (0.1 + 0.2 != 0.3). Use decimal.Decimal (Python), BigDecimal (Java), or integer cents representation
- **URL encoding of already-encoded strings**: double-encoding %20 produces %2520. Check if the string is already encoded before applying encodeURIComponent. Use decodeURIComponent first to normalize
- **UUID generation in performance-critical paths**: UUIDv4 generation uses CSPRNG which is 10-100x slower than sequential IDs. For internal systems, use UUIDv7 (time-ordered) or Snowflake IDs for better database index locality
- **CLI argument parsing for simple scripts**: if a script needs 2-3 flags, rgparse or commander is overkill. Use sys.argv or positional arguments directly

## Performance Benchmarks

- **Date formatting**: strftime in Python formats 1M dates in 200-500ms. Intl.DateTimeFormat in JavaScript formats 1M dates in 100-300ms. ISO 8601 formatting (	oISOString) is 2-5x faster than locale-aware formatting
- **URL encoding**: encodeURIComponent in JavaScript encodes 1M strings in 50-200ms. Python urllib.parse.quote encodes 1M strings in 100-400ms. Pre-computed encoding tables can achieve 10-50ms for the same volume
- **UUID generation**: uuid.uuid4() in Python generates 1M UUIDs in 500ms-2s. crypto.randomUUID() in Node.js generates 1M UUIDs in 100-300ms. UUIDv7 generation is similar to v4 but produces time-ordered IDs
- **Text truncation**: slicing 1M strings to 100 chars takes 50-150ms in Python and 20-80ms in JavaScript. Unicode-aware truncation (not breaking multi-byte characters) adds 2-3x overhead
- **Phone number formatting**: phonenumbers library in Python formats 100K phone numbers in 500ms-2s. Google's libphonenumber (C++) formats the same volume in 50-100ms
- **QR code generation**: qrcode library in Python generates a 100x100 QR code in 5-20ms. qrcode-terminal is faster but produces lower-quality output. Batch generation of 10,000 QR codes takes 50-200ms

## Testing Strategy

- **Test timezone handling**: verify that date formatting produces correct output across timezones (UTC, PST, JST, AEDT). Test DST transitions (spring forward, fall back) and historical timezone changes
- **Test with invalid input**: verify that invalid phone numbers, malformed URLs, and out-of-range dates are rejected with clear errors. Test with empty strings, null, and undefined
- **Test locale-specific formatting**: verify that currency formatting uses the correct symbol, decimal separator, and grouping for each locale (,234.56 vs 1.234,56 EUR)
- **Test Unicode edge cases**: verify that truncation does not break multi-byte characters (emoji, CJK). Test URL encoding with Unicode paths (IRI). Test date formatting with non-Gregorian calendars
- **Test UUID uniqueness**: generate 10M UUIDs and verify no collisions. Use a set or bloom filter for collision detection. UUIDv4 has a 50% collision chance after 2.7x10^36 IDs
- **Test CLI argument edge cases**: test with missing required arguments, duplicate flags, negative numbers as values, and -- separator. Verify help text is accurate and complete

## Cost Estimation

- **Date library bundle size**: moment.js is 67KB minified. date-fns with tree-shaking is 5-15KB. luxon is 25KB. Native Intl.DateTimeFormat is 0KB (built into the runtime). Choose native APIs when possible
- **Phone number validation**: libphonenumber-js is 45KB minified. Server-side validation with Google's library is free but requires a C++ dependency. For web-only validation, use a lightweight regex for format checking
- **QR code generation cost**: generating 1M QR codes server-side costs .50-2.00 in compute. Pre-generating and storing as PNG files costs -20/month in storage but eliminates per-request compute
- **UUID generation infrastructure**: UUIDv4 requires no coordination but causes random I/O patterns in databases. UUIDv7 or Snowflake IDs improve write throughput 2-5x by clustering inserts. The cost is a time-source dependency
- **CLI tool distribution**: packaging a CLI tool with pip or 
pm is free. Distributing as a standalone binary (PyInstaller, pkg) adds 10-50MB but removes the runtime dependency. Choose based on user audience

## Monitoring and Observability

- **Format error rate**: track the percentage of formatting operations that fail. High error rates indicate either bad input data or locale configuration issues
- **Formatting latency**: monitor time spent in date/phone/URL formatting. If formatting exceeds 5% of request time, cache formatted values or switch to faster libraries
- **Timezone configuration drift**: log the server timezone on startup. Alert if it changes from UTC. Non-UTC server timezones are a common source of date bugs in distributed systems
- **UUID generation rate**: monitor the rate of UUID generation. A sudden spike may indicate a bug causing excessive ID creation or a retry loop
- **CLI usage patterns**: log which CLI flags are used most frequently. This informs documentation priorities and deprecation decisions

## Deployment Checklist

- [ ] Set the server timezone to UTC: TZ=UTC environment variable. Never rely on the system default timezone in production code
- [ ] Configure locale defaults: set LANG and LC_ALL environment variables. Use Intl.DateTimeFormat with explicit locale in JavaScript
- [ ] Set maximum input length: reject strings longer than the configured maximum before formatting. Prevents memory exhaustion from oversized inputs
- [ ] Configure QR code error correction level: use level M (15% recovery) for general use, level H (30% recovery) for industrial environments. Higher levels produce denser codes
- [ ] Set CLI argument limits: limit the number of arguments and their total size. getopt and rgparse have built-in limits, but custom parsers need explicit limits
- [ ] Pin library versions: date and phone libraries change frequently. Pin versions to avoid breaking changes from timezone database updates or locale format changes

## Security Considerations

- **Timezone-based access control bypass**: if access control checks use local time, a server timezone change can bypass time-based restrictions. Always use UTC for security-relevant time comparisons
- **URL encoding bypass**: double-encoding or mixed encoding can bypass URL-based security filters. Normalize URLs with decodeURIComponent then re-encode before security checks
- **Phone number spoofing**: caller ID spoofing means phone number validation does not verify identity. Do not use phone number format validation as the sole authentication factor
- **QR code phishing**: QR codes can encode malicious URLs. If generating QR codes from user input, validate the target URL against a blocklist before encoding
- **UUID predictability**: UUIDv1 contains the MAC address and timestamp, which leaks hardware info and allows prediction. Use UUIDv4 (random) or UUIDv7 (time-ordered without MAC) for security-sensitive contexts
- **Date parsing injection**: some date parsers execute arbitrary code via format strings (e.g., strftime with user-controlled format). Never pass user input directly as a format string
- **Truncation-based XSS bypass**: truncating HTML at a fixed character count can split tags and create invalid HTML that bypasses XSS filters. Truncate at tag boundaries or use a proper HTML parser
- **CLI argument injection**: if CLI arguments are passed to subprocess without proper escaping, an attacker can inject shell commands. Use subprocess.run(args_list) instead of shell=True
- **Money formatting precision loss**: converting between currencies using floating-point can lose precision. Use Decimal with explicit rounding modes. Log all currency conversions for audit
- **Phone number metadata leakage**: libphonenumber can reveal the carrier and region of a phone number. Do not expose this metadata to untrusted clients
- **QR code content injection**: if QR codes are rendered from user-supplied URLs without validation, an attacker can encode javascript: or data: URIs. Validate the URL scheme before QR generation
- **Date format string DoS**: some date formatting libraries support complex format strings that can cause excessive CPU usage. Limit format string length and complexity in user-facing APIs
## Variants and Alternatives

- **Native Intl vs libraries**: Intl.DateTimeFormat, Intl.NumberFormat, and Intl.ListFormat are built into modern JS runtimes. They are 0KB and 2-5x faster than moment.js or date-fns. Use libraries only for complex timezone math
- **UUIDv4 vs UUIDv7 vs ULID vs Snowflake**: UUIDv4 is random (good for security, bad for DB indexes). UUIDv7 is time-ordered (good for DB locality). ULID is lexicographically sortable. Snowflake is distributed and requires coordination
- **Decimal vs integer cents vs floating-point**: Decimal is exact but slow. Integer cents (store 199 instead of 1.99) is exact and fast but requires conversion at boundaries. Floating-point is fast but lossy (never use for money)
- **Template literals vs string concatenation**: template literals (` Hello  `) are more readable and slightly faster in V8. String concatenation ("Hello " + name) is compatible with older runtimes. Choose based on target environment
- **Native URL API vs regex parsing**: 
ew URL(string) parses URLs correctly including edge cases (IPv6, userinfo, encoded characters). Regex-based parsing misses edge cases. Always use the native URL API for URL manipulation
- **CLI frameworks comparison**: rgparse (Python, stdlib, verbose), click (Python, decorators, clean), 	yper (Python, type hints, modern), commander (Node.js, widely used), yargs (Node.js, feature-rich). Choose based on complexity

## Common Pitfalls in Production

- **Timezone offset vs timezone name**: +02:00 is an offset that changes with DST. Europe/Paris is a timezone name that handles DST automatically. Always store timezone names, not offsets, for recurring events
- **Locale code confusion**: en-US vs en_US vs en â€” different libraries expect different formats. ICU uses en-US, POSIX uses en_US. Normalize locale codes at the application boundary
- **Currency rounding modes**: ROUND_HALF_UP (banker's rounding) differs from ROUND_HALF_EVEN (Python default). Financial systems require specific rounding modes. Document and test the rounding mode explicitly
- **UUID collision in practice**: UUIDv4 collision probability is negligible (1 in 2.7x10^36 for 50% chance). But UUIDv1 collision can happen if the MAC address is reused or the clock is set backward. Use v4 or v7 for safety
- **URL encoding of special characters**: !, ', (, ) are technically safe in URLs but some servers reject them. encodeURIComponent encodes them; encodeURI does not. Use encodeURIComponent for query parameter values
- **Truncation with HTML**: truncating HTML by character count can break tags. Use a proper HTML parser to truncate at tag boundaries. Alternatively, strip HTML tags before truncating for plain-text previews
## Integration Patterns

- **Internationalization (i18n) pipeline**: extract user-facing strings -> format with locale-specific functions -> render in UI. Use ICU MessageFormat for pluralization and gender. Store translations in JSON or XLIFF files. Load translations lazily by locale
- **Date/time pipeline**: parse input date (ISO 8601) -> convert to UTC -> store as ISO string or timestamp -> format for display using user locale. Never store localized date strings in databases. Always convert to UTC before storage
- **Money pipeline**: parse amount (string to Decimal) -> validate currency code (ISO 4217) -> convert currency if needed (using daily exchange rates) -> format for display using locale. Store as integer cents or Decimal, never floating-point
- **URL building pipeline**: validate base URL -> append path segments (URL-encoded) -> append query parameters (URL-encoded) -> append fragment. Use URL and URLSearchParams APIs. Never build URLs with string concatenation
- **UUID generation pipeline**: generate UUID -> validate format -> store as string (not UUID type for portability) -> use as primary key. For distributed systems, use UUIDv7 for time-ordered IDs that work well with B-tree indexes
- **CLI integration with config files**: CLI flags override config file values, which override environment variables, which override defaults. This hierarchy is standard in 12-factor apps. Use python-dotenv or dotenv for environment variable loading

## Error Handling and Recovery

- **Graceful locale fallback**: if a translation is missing for r-CA, fall back to r, then en. Log missing translations for later addition. Never show raw translation keys to users
- **Date parsing fallback chain**: try ISO 8601 first, then locale-specific formats, then common formats (MM/DD/YYYY, DD/MM/YYYY). If all fail, return null and let the caller decide. Never guess the format silently
- **Currency conversion error handling**: if exchange rate API is down, use the last cached rate. Log a warning. If no cached rate exists, reject the conversion with a clear error. Never use stale rates older than 24 hours without warning
- **URL normalization errors**: if URL parsing fails, log the original URL and the error. Do not attempt to fix the URL automatically â€” malformed URLs may be intentional (e.g., for testing). Return a clear error to the caller
- **UUID collision handling**: if a UUID collision occurs (extremely rare with v4/v7), regenerate with a new random component. Log the collision for investigation. UUIDv1 collisions indicate a clock or MAC address problem
- **CLI argument error recovery**: if a required argument is missing, print the help text and exit with code 2. If an argument has an invalid value, print the error, the expected format, and exit with code 2. Never proceed with invalid arguments
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