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
  - uuid
  - databases
  - performance
relatedResources:
  - /recipes/databases/postgres-query-optimization
  - /patterns/design/singleton-pattern-services
  - /guides/clean-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Compare UUID v4, v7, ULID and nanoid for unique identifiers. Different tradeoffs in randomness, sortability, performance and database index locality."
  keywords:
    - uuid generation
    - ulid
    - nanoid
    - unique identifiers
    - database indexing
---

# UUID Generation: v4, v7, and ULID Comparison

Choose the right unique identifier strategy for your application by comparing UUID v4 (random), v7 (time-sortable), ULID (lexicographically sortable), and nanoid (compact URL-safe). This recipe covers generation, database index implications, collision probability, and migration considerations.

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

## FAQ

**Q: Should I use auto-incrementing integers instead?**
A: Use integers for single-node systems where coordination is trivial. Use UUIDs for distributed systems or when identifiers must not reveal sequence information. See [Database Connection Pooling](/recipes/databases/database-connection-pooling) for managing database connections.

**Q: Is UUID v7 officially standardized?**
A: It is in RFC draft status and widely considered stable. Major databases and libraries support it.
