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
  - uuid
  - guid
  - ulid
  - identifiers
  - database
  - python
  - javascript
  - java
relatedResources:
  - /recipes/parse-json
  - /recipes/caching
  - /patterns/design/singleton-pattern
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

- Generating primary keys in distributed databases
- Creating session or API tokens
- Naming files, images, or uploads to prevent collisions
- Merging data from multiple sources where IDs must not clash
- Building systems where clients generate IDs before sending to the server

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

## Best Practices

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

## Frequently Asked Questions

**Q: Should I use UUID v4 or v7 for new projects?**
A: Use v7 (or ULID) for database keys. They are time-ordered, reducing index fragmentation. Use v4 only for non-sortable identifiers like session tokens.

**Q: Are UUIDs truly unique?**
A: The probability of collision is astronomically low (1 in 2^122 for v4). For practical purposes, they are unique enough for all but the most extreme scale.

**Q: Can I use UUIDs in URLs?**
A: Yes, but ULIDs are shorter and URL-safe. If using v4/v7, encode them without hyphens (32 chars) for shorter URLs.
