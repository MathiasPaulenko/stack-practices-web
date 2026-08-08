---
contentType: recipes
slug: uuid-generation-strategies
title: "UUID Generation: v4, v7, and ULID Comparison"
description: "Compare UUID v4, v7, ULID, and nanoid for generating unique identifiers with different tradeoffs in randomness, sortability, performance, and database index locality"
metaDescription: "Compare UUID v4, v7, ULID and nanoid for unique identifiers. Different tradeoffs in randomness, sortability, performance and database index locality."
difficulty: beginner
topics:
  - data
  - databases
tags:
  - guid
  - data
  - database
  - performance
relatedResources:
  - /recipes/postgres-query-optimization
  - /recipes/batch-processing-patterns
  - /recipes/database-replication
  - /recipes/schema-evolution
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Compare UUID v4, v7, ULID and nanoid for unique identifiers. Different tradeoffs in randomness, sortability, performance and database index locality."
  keywords:
    - uuid generation
    - ulid
    - nanoid
    - unique identifiers
    - database indexing



---
Choose the right unique identifier strategy for your application by comparing UUID v4 (random), v7 (time-sortable), ULID (lexicographically sortable), and nanoid (compact URL-safe). The solution below covers generation, database index implications, collision probability, and migration considerations.

## When to Use This

- [Database](/recipes/databases/database-transactions) primary keys need to be globally unique across distributed systems
- Identifier sortability affects query performance and index fragmentation
- URL-safe, short identifiers are needed for public-facing resources

## Solution

### 1. UUID v4 (Random)

```typescript
// ids/uuid4.ts
import { v4 as uuidv4 } from 'uuid';

const id = uuidv4(); // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

// Characteristics
// - Fully random (122 bits of randomness)
// - Not sortable by time
// - Causes index fragmentation in B-trees
// - Standard format with hyphens
```

### 2. UUID v7 (Time-Sortable)

```typescript
// ids/uuid7.ts
import { v7 as uuidv7 } from 'uuid';

const id = uuidv7(); // '018f3bda-7c58-7e8a-8b5e-4f3e8c9d2a1b'

// Characteristics
// - First 48 bits = Unix timestamp in milliseconds
// - Remaining 74 bits = random
// - Sortable by creation time
// - Better index locality than v4
// - RFC draft standard (stable enough for production)
```

### 3. ULID (Lexicographically Sortable)

```typescript
// ids/ulid.ts
import { ulid } from 'ulid';

const id = ulid(); // '01HV8J3K2M4N5P6Q7R8S9T0UV'

// Characteristics
// - 26 characters, Crockford's base32
// - First 10 chars = timestamp (sortable)
// - Last 16 chars = randomness
// - Lexicographically sortable as string
// - No hyphens, URL-safe
```

### 4. NanoID (Compact and Fast)

```typescript
// ids/nanoid.ts
import { nanoid } from 'nanoid';

const id = nanoid();       // default 21 chars
const short = nanoid(10);  // configurable length

// Characteristics
// - 21 chars by default (similar collision resistance to UUID v4)
// - Custom alphabet support
// - Fast generation (~50% faster than UUID)
// - URL-safe by default (no hyphens)
```

### 5. Comparison Matrix

```typescript
// ids/comparison.ts
const comparison = {
  uuidv4: {
    length: 36,
    sortable: false,
    indexLocality: 'poor',
    standard: 'RFC 4122',
    collisionRisk: 'negligible (2^122)',
  },
  uuidv7: {
    length: 36,
    sortable: true,
    indexLocality: 'good',
    standard: 'RFC draft',
    collisionRisk: 'negligible (2^74)',
  },
  ulid: {
    length: 26,
    sortable: true,
    indexLocality: 'good',
    standard: 'Community',
    collisionRisk: 'negligible (2^80)',
  },
  nanoid: {
    length: 21,
    sortable: false,
    indexLocality: 'poor',
    standard: 'Community',
    collisionRisk: 'negligible (2^126)',
  },
};
```

### 6. PostgreSQL with UUID v7

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table with UUID v7 primary key
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,  -- use v7 in application
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For sortable UUIDs, generate in application and insert
INSERT INTO events (id, name) VALUES ('018f3bda-7c58-7e8a-8b5e-4f3e8c9d2a1b', 'signup');

-- Index locality benefits: sequential inserts fill pages contiguously
```

## How It Works

- **UUID v4** uses randomness for uniqueness but scatters index inserts
- **UUID v7** embeds a timestamp prefix, making inserts roughly sequential
- **ULID** uses base32 encoding for shorter, still sortable identifiers
- **NanoID** prioritizes speed and compactness with configurable length

## Production Considerations

- Use UUID v7 for new applications needing time-sortable keys. See [Database Migrations](/recipes/databases/database-migrations) for evolving schemas.
- Keep UUID v4 for existing systems unless migration is justified
- Use ULID when identifier length and lexicographic sorting matter
- Use nanoid for short-lived tokens, short URLs, or when size is critical

## Common Mistakes

- Generating UUIDs in the database instead of the application layer
- Using v4 in high-insert systems without monitoring index fragmentation
- Not handling the rare but possible UUID collision in distributed systems

## When Not to Use This Approach

- **Locale-aware formatting in distributed systems**: if servers span multiple timezones, formatting dates locally per-server causes inconsistencies.
- **High-frequency formatting calls**: if formatting is called millions of times per second, the overhead of strftime or Intl. DateTimeFormat becomes significant.
- **Financial calculations requiring exact precision**: floating-point arithmetic causes rounding errors in money calculations (0. 1 + 0. 2 ! = 0. 3).
- **URL encoding of already-encoded strings**: double-encoding %20 produces %2520.
- **UUID generation in performance-critical paths**: UUIDv4 generation uses CSPRNG which is 10-100x slower than sequential IDs.
- **CLI argument parsing for simple scripts**: if a script needs 2-3 flags, rgparse or commander is overkill.

## Performance Benchmarks

- **Date formatting**: strftime in Python formats 1M dates in 200-500ms.  Intl. DateTimeFormat in JavaScript formats 1M dates in 100-300ms.
- **URL encoding**: encodeURIComponent in JavaScript encodes 1M strings in 50-200ms.  Python urllib. parse. quote encodes 1M strings in 100-400ms.
- **UUID generation**: uuid. uuid4() in Python generates 1M UUIDs in 500ms-2s.  crypto. randomUUID() in Node. js generates 1M UUIDs in 100-300ms.
- **Text truncation**: slicing 1M strings to 100 chars takes 50-150ms in Python and 20-80ms in JavaScript.
- **Phone number formatting**: phonenumbers library in Python formats 100K phone numbers in 500ms-2s.
- **QR code generation**: qrcode library in Python generates a 100x100 QR code in 5-20ms.  qrcode-terminal is faster but produces lower-quality output.

## Testing Strategy

- **Test timezone handling**: verify that date formatting produces correct output across timezones (UTC, PST, JST, AEDT).
- **Test with invalid input**: verify that invalid phone numbers, malformed URLs, and out-of-range dates are rejected with clear errors.
- **Test locale-specific formatting**: verify that currency formatting uses the correct symbol, decimal separator, and grouping for each locale (,234. 56 vs 1.
- **Test Unicode edge cases**: verify that truncation does not break multi-byte characters (emoji, CJK).
- **Test UUID uniqueness**: generate 10M UUIDs and verify no collisions.  UUIDv4 has a 50% collision chance after 2.
- **Test CLI argument edge cases**: test with missing required arguments, duplicate flags, negative numbers as values, and -- separator.

## Cost Estimation

- **Date library bundle size**: moment. js is 67KB minified.  date-fns with tree-shaking is 5-15KB.  luxon is 25KB.  Native Intl. DateTimeFormat is 0KB (built into the runtime).
- **Phone number validation**: libphonenumber-js is 45KB minified.  Server-side validation with Google's library is free but requires a C++ dependency.
- **QR code generation cost**: generating 1M QR codes server-side costs . 50-2. 00 in compute.
- **UUID generation infrastructure**: UUIDv4 requires no coordination but causes random I/O patterns in databases.  UUIDv7 or Snowflake IDs improve write throughput 2-5x by clustering inserts.
- **CLI tool distribution**: packaging a CLI tool with pip or 
pm is free. Distributing as a standalone binary (PyInstaller, pkg) adds 10-50MB but removes the runtime dependency. Choose based on user audience

## Monitoring and Observability

- **Format error rate**: track the percentage of formatting operations that fail.
- **Formatting latency**: monitor time spent in date/phone/URL formatting.
- **Timezone configuration drift**: log the server timezone on startup.  Alert if it changes from UTC.
- **UUID generation rate**: monitor the rate of UUID generation.
- **CLI usage patterns**: log which CLI flags are used most frequently.

## Deployment Checklist

- [ ] Set the server timezone to UTC: TZ=UTC environment variable. Never rely on the system default timezone in production code
- [ ] Configure locale defaults: set LANG and LC_ALL environment variables. Use Intl.DateTimeFormat with explicit locale in JavaScript
- [ ] Set maximum input length: reject strings longer than the configured maximum before formatting. Prevents memory exhaustion from oversized inputs
- [ ] Configure QR code error correction level: use level M (15% recovery) for general use, level H (30% recovery) for industrial environments. Higher levels produce denser codes
- [ ] Set CLI argument limits: limit the number of arguments and their total size. getopt and rgparse have built-in limits, but custom parsers need explicit limits
- [ ] Pin library versions: date and phone libraries change frequently. Pin versions to avoid breaking changes from timezone database updates or locale format changes

## Security Considerations

- **Timezone-based access control bypass**: if access control checks use local time, a server timezone change can bypass time-based restrictions.
- **URL encoding bypass**: double-encoding or mixed encoding can bypass URL-based security filters.
- **Phone number spoofing**: caller ID spoofing means phone number validation does not verify identity.
- **QR code phishing**: QR codes can encode malicious URLs.
- **UUID predictability**: UUIDv1 contains the MAC address and timestamp, which leaks hardware info and allows prediction.
- **Date parsing injection**: some date parsers execute arbitrary code via format strings (e. g. , strftime with user-controlled format).
- **Truncation-based XSS bypass**: truncating HTML at a fixed character count can split tags and create invalid HTML that bypasses XSS filters.
- **CLI argument injection**: if CLI arguments are passed to subprocess without proper escaping, an attacker can inject shell commands.
- **Money formatting precision loss**: converting between currencies using floating-point can lose precision.
- **Phone number metadata leakage**: libphonenumber can reveal the carrier and region of a phone number.
- **QR code content injection**: if QR codes are rendered from user-supplied URLs without validation, an attacker can encode javascript: or data: URIs.
- **Date format string DoS**: some date formatting libraries support complex format strings that can cause excessive CPU usage.
## Variants and Alternatives

- **Native Intl vs libraries**: Intl. DateTimeFormat, Intl. NumberFormat, and Intl. ListFormat are built into modern JS runtimes.  They are 0KB and 2-5x faster than moment. js or date-fns.
- **UUIDv4 vs UUIDv7 vs ULID vs Snowflake**: UUIDv4 is random (good for security, bad for DB indexes).  UUIDv7 is time-ordered (good for DB locality).  ULID is lexicographically sortable.
- **Decimal vs integer cents vs floating-point**: Decimal is exact but slow.  Integer cents (store 199 instead of 1. 99) is exact and fast but requires conversion at boundaries.
- **Template literals vs string concatenation**: template literals (` Hello  `) are more readable and slightly faster in V8.  String concatenation ("Hello " + name) is compatible with older runtimes.
- **Native URL API vs regex parsing**: 
ew URL(string) parses URLs correctly including edge cases (IPv6, userinfo, encoded characters). Regex-based parsing misses edge cases. Always use the native URL API for URL manipulation
- **CLI frameworks comparison**: rgparse (Python, stdlib, verbose), click (Python, decorators, clean), 	yper (Python, type hints, modern), commander (Node. js, widely used), yargs (Node. js, feature-rich).

## Common Pitfalls in Production

- **Timezone offset vs timezone name**: +02:00 is an offset that changes with DST.  Europe/Paris is a timezone name that handles DST automatically.
- **Locale code confusion**: en-US vs en_US vs en â€” different libraries expect different formats.  ICU uses en-US, POSIX uses en_US.
- **Currency rounding modes**: ROUND_HALF_UP (banker's rounding) differs from ROUND_HALF_EVEN (Python default).  Financial systems require specific rounding modes.
- **UUID collision in practice**: UUIDv4 collision probability is negligible (1 in 2. 7x10^36 for 50% chance).  But UUIDv1 collision can happen if the MAC address is reused or the clock is set backward.
- **URL encoding of special characters**: , ', (, ) are technically safe in URLs but some servers reject them.  encodeURIComponent encodes them; encodeURI does not.
- **Truncation with HTML**: truncating HTML by character count can break tags.
## Integration Patterns

- **Internationalization (i18n) pipeline**: extract user-facing strings -> format with locale-specific functions -> render in UI.
- **Date/time pipeline**: parse input date (ISO 8601) -> convert to UTC -> store as ISO string or timestamp -> format for display using user locale.  Never store localized date strings in databases.
- **Money pipeline**: parse amount (string to Decimal) -> validate currency code (ISO 4217) -> convert currency if needed (using daily exchange rates) -> format for display using locale.
- **URL building pipeline**: validate base URL -> append path segments (URL-encoded) -> append query parameters (URL-encoded) -> append fragment.
- **UUID generation pipeline**: generate UUID -> validate format -> store as string (not UUID type for portability) -> use as primary key.
- **CLI integration with config files**: CLI flags override config file values, which override environment variables, which override defaults.  This hierarchy is standard in 12-factor apps.

## Error Handling and Recovery

- **Graceful locale fallback**: if a translation is missing for r-CA, fall back to r, then en.  Log missing translations for later addition.
- **Date parsing fallback chain**: try ISO 8601 first, then locale-specific formats, then common formats (MM/DD/YYYY, DD/MM/YYYY).  If all fail, return null and let the caller decide.
- **Currency conversion error handling**: if exchange rate API is down, use the last cached rate.  Log a warning.  If no cached rate exists, reject the conversion with a clear error.
- **URL normalization errors**: if URL parsing fails, log the original URL and the error.  Do not attempt to fix the URL automatically â€” malformed URLs may be intentional (e. g. , for testing).
- **UUID collision handling**: if a UUID collision occurs (extremely rare with v4/v7), regenerate with a new random component.  Log the collision for investigation.
- **CLI argument error recovery**: if a required argument is missing, print the help text and exit with code 2.  If an argument has an invalid value, print the error, the expected format, and exit with code 2.

## Troubleshooting

- **Pipeline output does not match expectations**: validate input schemas, intermediate states, and row counts at each step.
- **Data quality degrades over time**: add data validation checks and anomaly detection.  Define SLIs for freshness, completeness, and accuracy.
- **Job fails intermittently**: look for race conditions, external dependencies, and resource contention.  Retry with idempotency and bounded backoff.
- **Schema changes break consumers**: use schema registries and backward-compatible evolution.
- **Storage costs grow unexpectedly**: audit partition retention, compression, and duplicate copies.  Archive cold data and set lifecycle policies.





## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the guid and data guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply uuid generation: v4, v7, and ulid comparison** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: Should I use auto-incrementing integers instead?**
A: Use integers for single-node systems where coordination is trivial. Use UUIDs for distributed systems or when identifiers must not reveal sequence information. See [Database Connection Pooling](/recipes/databases/database-connection-pooling) for managing database connections.

**Q: Is UUID v7 officially standardized?**
A: It is in RFC draft status and widely considered stable. Major databases and libraries support it.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
