---
contentType: recipes
slug: format-phone-numbers
title: "Format Phone Numbers"
description: "How to format and validate phone numbers in Python, Java, and JavaScript."
metaDescription: "Learn how to format phone numbers in Python, Java, and JavaScript. Validate international numbers and apply regional formats with code examples."
difficulty: beginner
topics:
  - data
tags:
  - phone
  - formatting
  - validation
  - international
  - libphonenumber
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/truncate-text
  - /recipes/data/validate-json-schema
  - /recipes/data/convert-csv-to-json
  - /recipes/data/convert-json-to-csv
  - /recipes/data/diff-json-objects
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to format phone numbers in Python, Java, and JavaScript. Validate international numbers and apply regional formats with code examples."
  keywords:
    - phone
    - formatting
    - validation
    - international
    - libphonenumber
    - python
    - javascript
    - java
---
## Overview

Phone numbers are deceptively complex: country codes, area codes, extensions, mobile vs landline prefixes, and regional formatting rules vary across 200+ territories. Storing raw strings leads to duplicates, failed SMS deliveries, and broken click-to-call links. The solution below covers parsing, validation, formatting, and extraction with Google's libphonenumber across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Accepting phone numbers from user registration or checkout forms
- Normalizing international numbers before storing in a database
- Formatting numbers for display in regional or E.164 formats
- Validating numbers before sending SMS or making voice API calls

## Solution

### Python

```python
# phonenumbers library (Google libphonenumber port)
# pip install phonenumbers
import phonenumbers

number = phonenumbers.parse("+1 415-555-2671", None)
print(phonenumbers.is_valid_number(number))
# Output: True

formatted = phonenumbers.format_number(number, phonenumbers.PhoneNumberFormat.INTERNATIONAL)
print(formatted)
# Output: '+1 415-555-2671'
```

```python
# Normalizing to E.164 for storage
def normalize_phone(raw: str, country_hint: str = "US") -> str | None:
    try:
        parsed = phonenumbers.parse(raw, country_hint)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        pass
    return None

print(normalize_phone("(415) 555-2671"))
# Output: '+14155552671'
```

### JavaScript

```javascript
// libphonenumber-js lightweight port
// npm install libphonenumber-js
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const phone = parsePhoneNumberFromString('+1 415-555-2671');
console.log(phone.isValid());
// Output: true

console.log(phone.formatInternational());
// Output: '+1 415 555 2671'

console.log(phone.formatNational());
// Output: '(415) 555-2671'
```

```javascript
// As-you-type formatter for input fields
import { AsYouType } from 'libphonenumber-js';

const formatter = new AsYouType('US');
console.log(formatter.input('4155552671'));
// Output: '(415) 555-2671'
```

### Java

```java
// Google libphonenumber
// Maven: com.googlecode.libphonenumber:libphonenumber
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;

public class PhoneFormatter {
    private static final PhoneNumberUtil util = PhoneNumberUtil.getInstance();

    public static String formatE164(String raw, String region) throws Exception {
        Phonenumber.PhoneNumber number = util.parse(raw, region);
        if (!util.isValidNumber(number)) throw new IllegalArgumentException("Invalid number");
        return util.format(number, PhoneNumberUtil.PhoneNumberFormat.E164);
    }
}
```

```java
// As-you-type formatting
import com.google.i18n.phonenumbers.AsYouTypeFormatter;

public class AsYouTypeFormat {
    public static String formatInput(String input, String region) {
        AsYouTypeFormatter formatter = util.getAsYouTypeFormatter(region);
        StringBuilder result = new StringBuilder();
        for (char c : input.toCharArray()) {
            result = new StringBuilder(formatter.inputDigit(c));
        }
        return result.toString();
    }
}
```

## Explanation

Google's libphonenumber is the industry standard for phone number handling. It maintains a metadata database of numbering plans for every region, including which prefixes are valid, minimum and maximum lengths, and national formatting templates. The library can distinguish between a fixed-line and mobile number in most countries, detect possible numbers (syntactically valid but unassigned), and format in E.164, national, or RFC3966 (tel: URI) formats.

E.164 (`+14155552671`) is the canonical storage format: it is unambiguous, sorts correctly, and works with Twilio, AWS SNS, and most telecom APIs. National formats (`(415) 555-2671`) are for display. International formats (`+1 415 555 2671`) work for mixed-audience pages. Never store user input raw; always parse and normalize to E.164.

## Variants

| Technology | Library | Feature | Notes |
|------------|---------|---------|-------|
| Python | `phonenumbers` | Parse, validate, format | Full port of libphonenumber, includes geocoder |
| JavaScript | `libphonenumber-js` | Parse, validate, format | Lightweight, tree-shakeable, modern JS |
| JavaScript | `libphonenumber-js` `AsYouType` | Real-time formatting | Ideal for input masking |
| Java | `libphonenumber` | Parse, validate, format | Google's original, most complete metadata |
| Java | `AsYouTypeFormatter` | Real-time formatting | Character-by-character formatting |

## What Works

- **Store E.164, display national**: E.164 removes ambiguity; national format improves readability
- **Parse with a default region hint**: `parse("4155552671", "US")` resolves correctly; without a hint, require a `+` prefix
- **Validate before sending SMS**: Invalid numbers fail silently or cost money; always check `isValidNumber()`
- **Use AsYouType formatting for inputs**: Real-time formatting reduces user errors and improves completion rates
- **Never rely on regex alone**: Phone rules change; libphonenumber updates its metadata regularly

## Common Mistakes

- **Storing formatted strings**: `(415) 555-2671` is useless for dialing; store E.164 and format on read
- **Forgetting the country hint**: Parsing `020 7946 0958` without a region is ambiguous (UK, Nigeria, etc.)
- **Validating with a fixed-length regex**: Some countries have 7-digit numbers, others have 13; length varies by prefix
- **Exposing raw input in tel: links**: A tel link with spaces or parentheses may fail on some devices; use E.164 in `href`
- **Ignoring extension handling**: `+1 555-1234 ext 42` should store the extension separately; libphonenumber can extract it

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

- Store dates in UTC. Convert to user locale only at the presentation layer
- Use Decimal or integer cents for money. Never use floating-point for financial calculations
- Normalize URLs with the native URL API. Never parse URLs with regex
- Use UUIDv4 or UUIDv7 for unique IDs. Avoid UUIDv1 (leaks MAC address and timestamp)
- Pin date and locale library versions. Timezone databases update frequently
- Test formatting with edge cases: empty strings, Unicode, DST transitions, leap seconds
## Frequently Asked Questions

### How do I handle phone numbers without a country code?

Require a country selection in the UI, or geolocate the user and use that as the default region hint. If the user enters a number starting with `+`, parse it as an international number. If not, parse with the selected/default region. Never guess based on IP alone, as VPNs and travelers break the assumption.

### What is E.164 and why should I use it?

E.164 is the ITU-T recommendation for international phone numbers: a `+` prefix, country code, and national significant digits without any formatting characters. It is unambiguous, globally unique, and supported by every telecom API. Store in E.164; format for display.

### Can I detect the carrier or number type?

Yes. libphonenumber returns the number type (`MOBILE`, `FIXED_LINE`, `TOLL_FREE`, etc.) and, in some countries, the carrier name. In Python: `phonenumbers.number_type(parsed)`. In JavaScript: `phone.getType()`. In Java: `util.getNumberType(number)`. Note that carrier data is not available for all regions.