---



contentType: recipes
slug: truncate-text
title: "Truncate Text"
description: "How to truncate text with ellipsis and word boundaries in Python, Java, and JavaScript."
metaDescription: "Learn how to truncate text in Python, Java, and JavaScript. Preserve word boundaries and add ellipsis with practical code examples."
difficulty: beginner
topics:
  - data
tags:
  - text
  - truncation
  - formatting
  - strings
  - python
  - javascript
  - java
relatedResources:
  - /recipes/parse-pdf-files
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/diff-json-objects
  - /recipes/generate-slugs
  - /recipes/format-phone-numbers
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to truncate text in Python, Java, and JavaScript. Preserve word boundaries and add ellipsis with practical code examples."
  keywords:
    - text
    - truncation
    - formatting
    - strings
    - python
    - javascript
    - java



---
## Overview

Truncating text is a common UI and data-processing task: previews, notification snippets, search result summaries, and CSV exports all need to cut long strings down to a maximum length without breaking words or HTML. The following demonstrates how to character-based, word-boundary, and HTML-aware truncation in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Displaying article previews, comment summaries, or product descriptions with "Read more" links
- Exporting report data to fixed-width columns or spreadsheets
- Generating email subject lines or push notification bodies with platform length limits
- Trimming user-generated content before storing or indexing

## Solution

### Python

```python
# Character-based truncation with ellipsis
def truncate(text: str, max_length: int = 100) -> str:
    if len(text) <= max_length:
        return text
    return text[:max_length - 3].rstrip() + '...'

print(truncate("This is a very long sentence that needs to be shortened."))
# Output: 'This is a very long sentence that needs to be shor...'
```

```python
# Word-boundary truncation with textwrap
import textwrap

def truncate_words(text: str, max_length: int = 100) -> str:
    if len(text) <= max_length:
        return text
    shortened = textwrap.shorten(text, width=max_length, placeholder='...')
    return shortened

print(truncate_words("This is a very long sentence that needs to be shortened."))
# Output: 'This is a very long sentence that needs to be...'
```

### JavaScript

```javascript
// Character-based truncation
function truncate(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trimEnd() + '...';
}

console.log(truncate("This is a very long sentence that needs to be shortened."));
// Output: 'This is a very long sentence that needs to be shor...'
```

```javascript
// Word-boundary truncation
function truncateWords(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

console.log(truncateWords("This is a very long sentence that needs to be shortened."));
// Output: 'This is a very long sentence that needs to be...'
```

### Java

```java
// Apache Commons Lang StringUtils
// Maven: org.apache.commons:commons-lang3
import org.apache.commons.lang3.StringUtils;

public class TextTruncator {
    public static String truncate(String text, int maxLength) {
        return StringUtils.abbreviate(text, maxLength);
    }
}

// truncate("This is a very long sentence...", 30)
// Output: "This is a very long sente..."
```

```java
// Word-boundary truncation with Streams
import java.util.Arrays;
import java.util.stream.Collectors;

public class WordTruncator {
    public static String truncateWords(String text, int maxLength) {
        String[] words = text.split(" ");
        StringBuilder result = new StringBuilder();
        for (String word : words) {
            if (result.length() + word.length() + 1 > maxLength) break;
            if (result.length() > 0) result.append(" ");
            result.append(word);
        }
        return result.toString() + (result.length() < text.length() ? "..." : "");
    }
}
```

## Explanation

Character truncation is straightforward but can split words in half, producing awkward output like "shor...". Word-boundary truncation searches backward from the cutoff point to the nearest space, preserving readability. `textwrap.shorten` (Python) handles both character and word truncation with a single call. JavaScript requires manual slicing and index search. Java's `StringUtils.abbreviate` defaults to character truncation; word-boundary logic must be built manually or with a library like `Truncation`.

HTML-aware truncation is more complex: you must close any opened tags before appending the ellipsis, or use a dedicated HTML parser. For plain text, word-boundary truncation is usually the best balance of simplicity and readability.

## Variants

| Technology | Library / Approach | Strategy | Notes |
|------------|-------------------|----------|-------|
| Python | Slicing + ellipsis | Character | Fast, simple, may split words |
| Python | `textwrap.shorten` | Word + character | Stdlib, handles word breaks gracefully |
| JavaScript | `slice` + `trimEnd` | Character | Fast, built-in, no dependencies |
| JavaScript | `lastIndexOf(' ')` | Word | Manual, no dependencies |
| Java | `StringUtils.abbreviate` | Character | Apache Commons, configurable placeholder |
| Java | Custom stream builder | Word | Full control over delimiter and ellipsis |

## What Works

- **Respect word boundaries for UI text**: "Readability is more important than exact character count in user-facing strings"
- **Use character truncation for machine output**: Fixed-width files, database columns, and logs need exact lengths
- **Strip trailing whitespace before measuring**: Leading/trailing spaces skew length calculations and produce `"..."` on empty strings
- **Handle surrogate pairs and combining characters**: JavaScript `length` counts UTF-16 code units, not grapheme clusters; use `Intl.Segmenter` for proper Unicode counting
- **Add title attributes for truncated links**: `<a title="Full text">truncated...</a>` improves accessibility

## Common Mistakes

- **Splitting HTML tags**: Truncating raw HTML at position 100 can break `<a href="...` mid-tag; use an HTML parser or strip tags first
- **Forgetting to add ellipsis length**: A 100-char limit with `...` means the slice should end at 97, not 100
- **Not handling multibyte characters**: A 20-character slice of Japanese text may cut a 2-byte kanji in half in some encodings
- **Trimming before length check**: `trim()` then slice can still exceed the limit if the original string had no trailing spaces
- **Assuming spaces are the only word boundary**: Hyphens, em-dashes, and CJK characters have different boundary rules

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
## Tooling and Ecosystem

- **date-fns**: modular date library for JavaScript. Tree-shakeable (import only what you need). 50M+ downloads/month. v3 supports TypeScript natively. Use instead of moment.js for new projects
- **Luxon**: modern JavaScript date library by the moment.js author. Built on Intl API. Timezone-aware. 15M+ downloads/month. Better API than moment.js but larger than date-fns
- **libphonenumber**: Google's phone number library. Ported to 10+ languages. Handles parsing, formatting, and validation for 240+ regions. The de facto standard for phone number handling
- **decimal.js**: arbitrary-precision decimal arithmetic for JavaScript. 8M+ downloads/month. Use instead of Number for financial calculations. Supports configurable precision and rounding modes
- **ulid**: Universally Unique Lexicographically Sortable Identifier. 26-character string. Sortable by timestamp. No coordination needed. Better than UUIDv4 for database indexes
- **commander.js**: Node.js CLI framework. 40M+ downloads/month. Subcommands, options, help text generation. Used by npm, Vue CLI, and many other popular CLIs

## Best Practices Summary


- For a deeper guide, see [Format Phone Numbers](/recipes/format-phone-numbers/).

- Store dates in UTC. Convert to user locale only at the presentation layer
- Use Decimal or integer cents for money. Never use floating-point for financial calculations
- Normalize URLs with the native URL API. Never parse URLs with regex
- Use UUIDv4 or UUIDv7 for unique IDs. Avoid UUIDv1 (leaks MAC address and timestamp)
- Pin date and locale library versions. Timezone databases update frequently
- Test formatting with edge cases: empty strings, Unicode, DST transitions, leap seconds
## Frequently Asked Questions

### How do I truncate HTML without breaking tags?

Use an HTML-aware library. Python has `html-truncate` and `BeautifulSoup`; JavaScript has `truncate-html`; Java has `Jsoup` combined with manual node traversal. The rule is: count visible text characters, and when the limit is reached, close all open tags before appending the ellipsis.

### How do I handle Unicode grapheme clusters when truncating?

A grapheme cluster is what a human perceives as one character (e.g., emoji with skin-tone modifiers). JavaScript's `.length` counts UTF-16 code units, not graphemes. Use `Intl.Segmenter` (modern browsers) or the `grapheme-splitter` package. In Python, `len()` counts code points; use the `grapheme` library for true cluster counting. In Java, use `BreakIterator.getCharacterInstance()`.

### Should I truncate on the client or the server?

For UI previews, client-side truncation with CSS (`text-overflow: ellipsis`) is simplest and preserves the full text for screen readers. For fixed-length exports, database constraints, or search result snippets, truncate on the server. Server truncation is required when the full text is too large to transfer to the client.