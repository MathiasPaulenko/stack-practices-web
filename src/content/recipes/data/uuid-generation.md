---
contentType: recipes
slug: uuid-generation
title: "UUID Generation in Python, JavaScript, and Java"
description: "Generate universally unique identifiers (UUIDs) for database keys, session tokens, and resource naming across Python, JavaScript, and Java."
metaDescription: "Practical UUID generation examples in Python, JavaScript, and Java. Learn UUID v4, v7, ULID, and when to use each for database keys and distributed systems."
difficulty: beginner
topics:
  - data
  - databases
tags:
  - data
  - database
  - uuid
  - guid
  - primary-keys
  - distributed-systems
  - python
  - javascript
  - java
relatedResources:
  - /recipes/database-connection-pooling
  - /recipes/parse-json
  - /recipes/data-validation
  - /recipes/caching
  - /recipes/merge-json-files
  - /patterns/singleton-pattern
lastUpdated: "2026-08-19"
publishedAt: "2026-06-10"
author: Mathias Paulenko
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

UUIDs (Universally Unique Identifiers) are 128-bit values designed to be unique across space
and time. They're the standard for database primary keys in distributed systems, session
tokens, file names, and any scenario where auto-incrementing integers are insufficient.

Modern systems increasingly prefer UUID v7 or ULID over v4 because they're sortable by time,
which improves database index performance.

## When to Use

- Generating primary keys in distributed databases.
- Creating session or API tokens.
- Naming files, images, or uploads to prevent collisions.
- Merging data from several sources where IDs must not clash.
- Building systems where clients generate IDs before sending to the server.

## When NOT to Use

- Small, single-node tables where auto-increment integers are simpler and faster.
- Performance-critical paths that can't tolerate CSPRNG overhead.
- Public IDs where short, human-readable slugs are preferred.

## Solution

### Python

```python
import uuid
import ulid

# UUID v4 (random) — most common
id_v4 = uuid.uuid4()
print(id_v4)  # 550e8400-e29b-41d4-a716-446655440000

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

// Crypto random UUID (Node 19+ and modern browsers)
console.log(crypto.randomUUID());
```

### Java

```java
import java.util.UUID;

// UUID v4 (random)
UUID idV4 = UUID.randomUUID();
System.out.println(idV4); // 550e8400-e29b-41d4-a716-446655440000

// UUID v7 (time-ordered) — use java-uuid-generator or JDK 23+
// For older JDKs, add the java-uuid-generator library.

// ULID via external library such as ulid-java
// String id = Ulid.generate();
```

## UUID Versions Compared

|Version|Format|Sortable|Best For|
|-------|------|--------|--------|
|v4|Random|No|General purpose, session tokens, widest support|
|v7|Time-ordered|Yes|Database keys, event logs, better index locality|
|v8|Custom|Configurable|Vendor-specific extensions|
|ULID|Time + random|Yes|URL-safe, lexicographically sortable IDs|

## Explanation

UUIDs solve the coordination problem: every node can generate an ID without talking to a central
allocator. v4 uses randomness from a cryptographically secure source, so it's unpredictable but
not sortable. v7 encodes a Unix timestamp in the most significant bits, giving you roughly
time-ordered values while keeping randomness in the rest. ULID is similar but uses a 26-character
crockford-base32 string that's shorter and URL-safe.

When used as database primary keys, sortable IDs keep related inserts close together in B-tree
indexes, which improves write throughput and cache locality compared to purely random v4 values.

## Variants

### UUID as binary storage

```python
import uuid

# Convert a UUID to its 16-byte representation for compact storage
uid = uuid.uuid7()
binary = uid.bytes  # 16 bytes
uid_back = uuid.UUID(bytes=binary)
```

### ULID string for URLs

```javascript
import { ulid } from 'ulid';

// 26 chars, URL-safe, lexicographically sortable
const id = ulid();
console.log(`https://api.example.com/items/${id}`);
```

### Snowflake-style IDs

For systems that need sortable 64-bit IDs, consider Twitter Snowflake, which uses a central
coordinator or a machine ID to avoid collisions.

## Best Practices

- Prefer UUID v7 or ULID for database keys to improve B-tree index performance.
- Store UUIDs as native `UUID` or `BINARY(16)` types instead of `CHAR(36)` strings.
- Use `BINARY(16)` in MySQL to save space compared to `CHAR(36)`.
- Generate IDs client-side only when the client needs them before the server responds.
- Validate UUID format when parsing external input.
- Avoid exposing sequential IDs publicly; use UUIDs for external-facing identifiers.

## Common Mistakes

- Using UUID v4 as a primary key without understanding the random insert penalty.
- Storing UUIDs as strings instead of native binary types, wasting space and index efficiency.
- Using UUIDs for small, non-distributed tables where auto-increment integers are sufficient.
- Generating UUIDs in a hot loop without caching the generator instance.
- Forgetting that UUID v1 embeds the MAC and timestamp — avoid it for public IDs.

## FAQ

### Should I use UUID v4 or v7 for new projects?

Use v7 or ULID for database keys. They're time-ordered and reduce index fragmentation. Use v4
for non-sortable identifiers such as session tokens.

### Are UUIDs truly unique?

The probability of collision for v4 is astronomically low (1 in 2^122). For practical purposes,
they're unique enough for all but the most extreme scale.

### Can I use UUIDs in URLs?

Yes. ULIDs are shorter and URL-safe. If using v4 or v7, remove hyphens for a 32-character string.

### Do UUIDs affect database performance?

UUID v4 causes random B-tree inserts, which hurts write performance on large tables. UUID v7 and
ULID are time-ordered, giving performance similar to auto-increment integers.

### Can I combine UUIDs with auto-increment IDs?

Yes. Use an auto-increment integer as the internal primary key for clustering performance and a
UUID as the external-facing identifier for APIs and URLs.
