---

contentType: recipes
slug: uuid-generation
title: "UUID Generation"
description: "How to generate universally unique identifiers (UUIDs) for database keys, session tokens, and resource naming across Python, JavaScript, and Java."
metaDescription: "Practical UUID generation examples in Python, JavaScript, and Java. Learn UUID v4, v7, ULID, and when to use each for database keys and distributed systems."
difficulty: beginner
topics:
  - data
tags:
  - data
  - database
  - guid
  - parsing
  - json
relatedResources:
  - /recipes/parse-json
  - /recipes/caching
  - /patterns/singleton-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical UUID generation examples in Python, JavaScript, and Java. Learn UUID v4, v7, ULID, and when to use each for database keys and distributed systems."
  keywords:
    - uuid generation
    - guid
    - uuid v4
    - uuid v7
    - ulid
    - unique identifiers
    - database primary keys
    - python uuid
    - javascript uuid
    - java uuid

---

## Overview

UUIDs (Universally Unique Identifiers) are 128-bit values designed to be unique across both space and time. They are the standard for database primary keys in distributed systems, session tokens, file names, and any scenario where auto-incrementing integers are insufficient.

Modern systems increasingly prefer UUID v7 or ULID over v4 because they are sortable by time, improving database index performance.

## When to Use

Use this recipe when:

- Generating primary keys in distributed databases. See [Connection Pooling](/recipes/databases/database-connection-pooling) for database access patterns.
- Creating session or API tokens. See [JWT Authentication](/recipes/authentication/jwt-authentication) for secure token handling.
- Naming files, images, or uploads to prevent collisions. See [File Upload Validation](/recipes/file-handling/file-upload-validation) for secure upload handling.
- Merging data from multiple sources where IDs must not clash. See [Parse JSON](/recipes/data/parse-json) for structured data merging.
- Building systems where clients generate IDs before sending to the server. See [Call REST API](/recipes/api/call-rest-api) for client-server communication.

## Solution

### Python

```python
import uuid
import ulid

# UUID v4 (random) — most common
id_v4 = uuid.uuid4()
print(id_v4)  # e.g., 550e8400-e29b-41d4-a716-446655440000

# UUID v7 (time-ordered) — sortable, better for DB indexes
id_v7 = uuid.uuid7()  # Python 3.13+
print(id_v7)

# ULID (time-ordered, lexicographically sortable)
id_ulid = ulid.new()
print(id_ulid)  # 01ARZ3NDEKTSV4RRFFQ69G5FAV

# As string for JSON or DB
str_id = str(uuid.uuid4())
```

### JavaScript

```javascript
import { v4, v7 } from 'uuid';
import { ulid } from 'ulid';

// UUID v4 (random)
console.log(v4()); // 550e8400-e29b-41d4-a716-446655440000

// UUID v7 (time-ordered) — requires uuid@10+
console.log(v7()); // 018f3d7e-8... (starts with timestamp)

// ULID (time-ordered, lexicographically sortable)
console.log(ulid()); // 01ARZ3NDEKTSV4RRFFQ69G5FAV

// Crypto random UUID (browser native)
console.log(crypto.randomUUID()); // Available in Node 19+ and modern browsers
```

### Java

```java
import java.util.UUID;

// UUID v4 (random)
UUID idV4 = UUID.randomUUID();
System.out.println(idV4); // 550e8400-e29b-41d4-a716-446655440000

// UUID v7 (time-ordered) — use java-uuid-generator or JDK 23+
// For older JDKs, use a library like java-uuid-generator

// ULID via external library (e.g., ulid-java)
// String ulid = Ulid.generate();
```

## UUID Versions Compared

| Version | Format | Sortable | Use Case |
|---------|--------|----------|----------|
| **v4** | Random | No | General purpose, most widely supported |
| **v7** | Time-ordered | Yes | Database keys, event logs (better index locality) |
| **v8** | Custom | Configurable | Vendor-specific extensions |
| **ULID** | Time + random | Yes | URL-safe, lexicographically sortable |

## What Works

- **Prefer UUID v7 or ULID for database keys**: Time-ordered IDs improve B-tree index performance
- **Store as `UUID` type in databases** when available (PostgreSQL, SQL Server) instead of strings
- **Use `BINARY(16)` in MySQL** to save space compared to `CHAR(36)`
- **Generate IDs client-side** for offline-first or optimistic UI patterns
- **Don't expose sequential IDs** to users for security (use UUIDs instead of auto-increment)
- **Validate UUID format** when parsing external input

## Common Mistakes

- Using UUID v4 as a database primary key without understanding the random insert penalty
- Storing UUIDs as strings instead of native binary types, wasting space and index efficiency
- Using UUIDs for small, non-distributed tables where auto-increment integers are sufficient
- Not indexing UUID columns properly in databases
- Generating UUIDs in a hot loop without caching the generator instance

## Migrating from Auto-Increment to UUID

Switching an existing table from auto-increment integers to UUIDs requires planning:

### Step 1: Add UUID Column

```sql
-- PostgreSQL
ALTER TABLE users ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX idx_users_uuid ON users(uuid);
```

### Step 2: Backfill Existing Rows

Run a one-time migration script to generate UUIDs for existing records:

```python
import uuid
for user in User.query.filter(User.uuid.is_(None)):
    user.uuid = uuid.uuid7()
    db.session.commit()
```

### Step 3: Update Application Code

Modify your ORM models and API endpoints to read/write the UUID column instead of the integer ID.

### Step 4: Update Foreign Keys

If other tables reference `users.id`, add a `user_uuid` column to those tables and migrate the relationships.

### Step 5: Deprecate Integer ID

After confirming everything works, mark the integer `id` column as deprecated. Do not drop it immediately — give yourself a rollback path.

## UUIDs in Distributed Systems

In microservices or event-driven architectures, UUIDs shine because they can be generated independently by any node:

- **Event sourcing**: Each event gets a UUID, enabling idempotent consumers
- **Offline-first apps**: Client generates UUID before syncing to the server
- **Database sharding**: No central ID allocator needed; each shard generates its own keys
- **CQRS**: Read and write models can generate IDs without coordination

| Approach | Pros | Cons |
|----------|------|------|
| **Auto-increment** | Simple, compact, ordered | Central bottleneck, hard to shard |
| **UUID v4** | Decentralized, standard | Random insert penalty, not sortable |
| **UUID v7** | Decentralized, sortable | Requires newer language/library versions |
| **Snowflake IDs** | Sortable, compact (64-bit) | Requires central coordinator |

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
## Frequently Asked Questions

**Q: Should I use UUID v4 or v7 for new projects?**
A: Use v7 (or ULID) for database keys. They are time-ordered, reducing index fragmentation. Use v4 only for non-sortable identifiers like session tokens.

**Q: Are UUIDs truly unique?**
A: The probability of collision is astronomically low (1 in 2^122 for v4). For practical purposes, they are unique enough for all but the most extreme scale.

**Q: Can I use UUIDs in URLs?**
A: Yes, but ULIDs are shorter and URL-safe. If using v4/v7, encode them without hyphens (32 chars) for shorter URLs.

**Q: Do UUIDs affect database performance?**
A: UUID v4 causes random B-tree inserts, which hurts write performance on large tables. UUID v7 and ULID are time-ordered, giving performance similar to auto-increment integers.

**Q: Can I combine UUIDs with auto-increment IDs?**
A: Yes. Use an auto-increment integer as the internal primary key (for clustering/performance) and a UUID as the external-facing identifier (for APIs and URLs). This gives you the best of both worlds.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.