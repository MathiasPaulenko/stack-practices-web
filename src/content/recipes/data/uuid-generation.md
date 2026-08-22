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
lastUpdated: "2026-08-22"
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

You've probably run into IDs like `550e8400-e29b-41d4-a716-446655440000`. Those are UUIDs: 128-bit
labels that are designed to be unique across space and time. People use them for database primary
keys in distributed systems, session tokens, uploaded file names, and anywhere an auto-incrementing
integer isn't enough.

There's been a quiet shift toward UUID v7 and ULID. Both are roughly sorted by time, so inserts
don't scatter all over a B-tree index the way v4 does. For high-write tables, that matters.

## When to Use

The usual suspects are distributed database primary keys, session or API tokens, file and upload
names, and merging data from several sources where IDs must not collide. Client-side generation is
another common case: the client can create an ID before it ever calls the server.

## When NOT to Use

Don't bother with UUIDs in small, single-node tables where auto-increment integers are simpler and
faster. Avoid them in hot paths that can't pay the CSPRNG tax, and don’t use them when you want
short, human-readable public slugs.

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

| Version | Format | Sortable | Best for |
| --- | --- | --- | --- |
| v4 | Random | No | General purpose, session tokens, widest support |
| v7 | Time-ordered | Yes | Database keys, event logs, better index locality |
| v8 | Custom | Configurable | Vendor-specific extensions |
| ULID | Time + random | Yes | URL-safe, lexicographically sortable IDs |

## Explanation

The main reason UUIDs exist is coordination. Every node can mint its own ID without phoning a
central allocator.

v4 is built from cryptographically secure randomness. It's unpredictable, which is what you want for
secrets, but it's got no ordering.

v7 places a Unix timestamp in the most significant bits and fills the rest with randomness. You end
up with values that are roughly sorted by time while still being unique.

ULID does the same thing but packs the value into a 26-character crockford-base32 string. A ULID is
shorter than a UUID string and safe to use in URLs.

As database primary keys, sortable IDs keep related inserts near each other in B-tree indexes. That
improves write throughput and cache locality compared to purely random v4 values.

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

If you need sortable 64-bit IDs, look at Twitter Snowflake. It relies on a central coordinator or a
machine ID to avoid collisions.

## Best Practices

- Reach for v7 or ULID when the ID is a database primary key. The time ordering keeps B-tree indexes
    from fragmenting.
- Store UUIDs as native `UUID` or `BINARY(16)` types, not `CHAR(36)` strings. In MySQL, `BINARY(16)`
    saves a lot of space.
- Generate IDs client-side only when the client needs them before the server responds.
- Validate UUID format when parsing external input.
- Keep sequential IDs internal and expose UUIDs for public-facing identifiers.

## Common Mistakes

- Reaching for UUID v4 as a primary key without realizing the random insert penalty.
- Storing UUIDs as strings instead of compact binary types, which wastes both space and index
    efficiency.
- Using UUIDs in small, non-distributed tables where auto-increment integers are good enough.
- Generating UUIDs in a hot loop without caching the generator instance.
- Forgetting that UUID v1 leaks MAC and timestamp data, so it shouldn't be used for public IDs.

## FAQ

### Should I use UUID v4 or v7 for new projects?

For database keys, go with v7 or ULID. The time ordering reduces index fragmentation. v4 is still
fine for things like session tokens that don't need sorting.

### Are UUIDs truly unique?

For v4, the chance of collision is about 1 in 2^122. In most real workloads, you can stop worrying
about it.

### Can I use UUIDs in URLs?

Yes. ULIDs are shorter and URL-safe. If you're using v4 or v7, you can strip the hyphens for a
32-character string.

### Do UUIDs affect database performance?

UUID v4 causes random B-tree inserts, which hurts write performance on large tables. UUID v7 and
ULID are time-ordered, so their write performance is much closer to auto-increment integers.

### Can I combine UUIDs with auto-increment IDs?

Yes. One common pattern is an auto-increment integer as the internal primary key for clustering
performance, plus a UUID as the external-facing identifier for APIs and URLs.
