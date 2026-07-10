---
contentType: recipes
slug: money-currency
title: "Money and Currency Handling"
description: "How to represent, parse, format, and calculate monetary values accurately across currencies."
metaDescription: "Learn to handle money and currency in Python, JavaScript, and Java. Covers decimal arithmetic, formatting, exchange rates, and common pitfalls with floating-point."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - parsing
  - json
  - csv
  - processing
relatedResources:
  - /recipes/date-formatting
  - /recipes/caching
  - /recipes/parse-json
  - /recipes/regular-expressions
  - /recipes/sort-array
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to handle money and currency in Python, JavaScript, and Java. Covers decimal arithmetic, formatting, exchange rates, and common pitfalls with floating-point."
  keywords:
    - money
    - currency
    - decimal
    - finance
    - formatting
    - python
    - javascript
    - java
---
## Overview

Financial calculations demand precision. Floating-point numbers (`float`, `double`) cannot accurately represent most decimal fractions, leading to rounding errors that compound in billing, invoicing, and trading systems. This approach handles representing money as exact decimal values, formatting with locale-aware currency symbols, performing arithmetic without precision loss, and handling exchange rate conversions in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Building e-commerce carts, checkout flows, or invoicing systems. See [Input Validation](/recipes/api/input-validation) for sanitizing order data.
- Aggregating financial transactions where penny-level accuracy matters
- Displaying prices in multiple currencies with correct rounding rules
- Converting between currencies using external [exchange rate APIs](/recipes/api/call-rest-api)

## Solution

### Python

```python
from decimal import Decimal, ROUND_HALF_UP, getcontext
import locale

# Set precision for all Decimal operations
getcontext().prec = 28

class Money:
    def __init__(self, amount: str | Decimal, currency: str = "USD"):
        self.amount = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        self.currency = currency.upper()

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies without conversion")
        return Money(self.amount + other.amount, self.currency)

    def __mul__(self, factor: Decimal) -> "Money":
        return Money(self.amount * Decimal(str(factor)), self.currency)

    def format(self, locale_name: str = "en_US") -> str:
        symbol = {"USD": "$", "EUR": "€", "GBP": "£"}.get(self.currency, self.currency)
        return f"{symbol}{self.amount:,}"

    @staticmethod
    def convert(amount: "Money", rate: Decimal, target_currency: str) -> "Money":
        converted = amount.amount * Decimal(str(rate))
        return Money(converted, target_currency)

# Usage
price = Money("19.99")
tax = Money("1.70")
total = price + tax
converted = Money.convert(total, Decimal("0.85"), "EUR")
print(total.format())   # $21.69
print(converted.format())  # €21.69
```

### JavaScript

```javascript
import Dinero from "dinero.js";
import { USD, EUR } from "@dinero.js/currencies";

const price = Dinero({ amount: 1999, currency: USD });
const tax = Dinero({ amount: 170, currency: USD });
const total = price.add(tax);

// Formatting
function formatMoney(dineroObject, locale = "en-US") {
  return dineroObject.toFormattedString(locale, {
    style: "currency",
    currency: dineroObject.toJSON().currency.code,
  });
}

// Conversion (static rate for demo)
const rate = { amount: 85, scale: 2 }; // 0.85
const converted = total.convert(EUR, { amount: 8500n, scale: 4 });

console.log(formatMoney(total));      // $21.69
console.log(formatMoney(converted));  // €18.44
```

### Java

```java
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Currency;
import java.util.Locale;

public class Money {
  private final BigDecimal amount;
  private final Currency currency;

  public Money(BigDecimal amount, String currencyCode) {
    this.amount = amount.setScale(2, RoundingMode.HALF_UP);
    this.currency = Currency.getInstance(currencyCode);
  }

  public Money add(Money other) {
    if (!this.currency.equals(other.currency)) {
      throw new IllegalArgumentException("Currency mismatch");
    }
    return new Money(this.amount.add(other.amount), currency.getCurrencyCode());
  }

  public Money multiply(BigDecimal factor) {
    return new Money(this.amount.multiply(factor), currency.getCurrencyCode());
  }

  public String format(Locale locale) {
    NumberFormat formatter = NumberFormat.getCurrencyInstance(locale);
    formatter.setCurrency(currency);
    return formatter.format(amount);
  }

  public static Money convert(Money source, BigDecimal rate, String targetCurrency) {
    BigDecimal converted = source.amount.multiply(rate);
    return new Money(converted, targetCurrency);
  }

  // Usage
  public static void main(String[] args) {
    Money price = new Money(new BigDecimal("19.99"), "USD");
    Money tax = new Money(new BigDecimal("1.70"), "USD");
    Money total = price.add(tax);
    Money eur = Money.convert(total, new BigDecimal("0.85"), "EUR");

    System.out.println(total.format(Locale.US));   // $21.69
    System.out.println(eur.format(Locale.GERMANY)); // 18,44 €
  }
}
```

## Explanation

- **Never use `float` or `double` for money** — binary floating-point cannot exactly represent values like `0.1`, causing `0.1 + 0.2 != 0.3` errors that accumulate in financial systems.
- **Use integer minor units** (cents) or arbitrary-precision decimals (`Decimal`, `BigDecimal`, Dinero.js) to keep exact values throughout calculations.
- **Rounding** must happen explicitly at defined boundaries (per-line item, per-tax, and per-total), never implicitly through floating-point error.
- **Currency conversion** should use a fetched exchange rate, apply it with exact arithmetic, then round to the target currency's minor units.
- **Locale formatting** separates display logic from storage: store raw numeric values and format with `NumberFormat` or ICU libraries for symbols, separators, and placement.

## Variants

| Approach | Library / Type | Best For |
|----------|---------------|----------|
| Integer cents | `long` / `bigint` | High-frequency trading, smallest memory footprint |
| Arbitrary precision | `Decimal` (Python), `BigDecimal` (Java) | General-purpose exact decimal math |
| Money library | Dinero.js, Money PHP, JSR-354 (Java) | Rich formatting, allocation, and comparison APIs |
| Database storage | `DECIMAL(19,4)` (SQL), `NUMERIC` (PostgreSQL) | Persistent exact values with 4-decimal precision for rates |

## What Works

1. **Store amounts in minor units** (cents) or exact decimal types; never store money as floating-point in databases.
2. **Round at the right boundary** — calculate line items with full precision, round per-line, then sum rounded values for the total.
3. **Separate money from display** — keep raw `Decimal` / `BigDecimal` / cents internally and format only at the UI/API layer.
4. **Use banker's rounding (HALF_UP)** for most currencies; some jurisdictions require HALF_EVEN — know your domain.
5. **[Cache exchange rates](/recipes/data/caching)** with TTL and timestamp; always convert using the rate that applied at the transaction time.

## Common Mistakes

1. Using `float` or `double` for prices, leading to `0.30000000000000004`-style errors.
2. Rounding only at the very end of a long calculation chain, propagating sub-penny errors.
3. Storing money as strings and parsing with locale-dependent commas/dots, causing regional bugs.
4. Adding different currencies directly without conversion, producing meaningless totals.
5. Ignoring currency subunits — some currencies (JPY, KRW) have no decimal places; others (BHD, IQD) have 3.

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

### Why can't I just use `float` or `double` for money?

Binary floating-point represents fractions as sums of inverse powers of 2. Decimals like `0.1` are infinite repeating sequences in binary, so they get rounded. These tiny errors accumulate in multiplication and division, causing invoices to be off by pennies or worse.

### How should I store money in a database?

Use `DECIMAL(19,4)` (or `NUMERIC` in PostgreSQL) to preserve 4 decimal places of precision. This handles sub-penny calculations (tax rates, exchange rates) while keeping the final 2-decimal value exact. Avoid `FLOAT`, `DOUBLE`, and `REAL` columns.

### What rounding mode should I use?

`HALF_UP` (round 0.5 away from zero) is standard for most commercial applications. `HALF_EVEN` (banker's rounding) is used in some financial standards (IEEE 754, accounting). Always round consistently within your domain and document the mode for auditors.