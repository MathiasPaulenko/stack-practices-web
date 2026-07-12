---





contentType: guides
slug: complete-guide-mongodb-indexing
title: "Complete Guide to MongoDB Indexing"
description: "Master MongoDB indexing. Covers single field, compound, text, geospatial, TTL, wildcard, hashed indexes, ESR rule, covered queries, explain plan analysis, index intersection, and partial indexes with practical examples."
metaDescription: "Master MongoDB indexing. Covers single, compound, text, geospatial, TTL, wildcard, hashed indexes, ESR rule, covered queries, explain plans."
difficulty: advanced
topics:
  - databases
  - performance
tags:
  - mongodb
  - databases
  - guide
  - indexing
  - nosql
  - performance
  - compound-index
  - explain-plan
relatedResources:
  - /guides/complete-guide-postgresql-replication
  - /guides/complete-guide-sql-query-optimization
  - /guides/complete-guide-database-sharding
  - /guides/complete-guide-postgresql-tuning
  - /recipes/seed-database
  - /guides/complete-guide-redis-production
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Master MongoDB indexing. Covers single, compound, text, geospatial, TTL, wildcard, hashed indexes, ESR rule, covered queries, explain plans."
  keywords:
    - mongodb indexing
    - compound index
    - text index
    - geospatial index
    - ttl index
    - esr rule
    - covered query
    - explain plan





---

## Introduction

Indexes are the single most important performance optimization in MongoDB. Without indexes, MongoDB performs collection scans — reading every document to find matches. Below is a practical guide to single field, compound, text, geospatial, TTL, wildcard, and hashed indexes, the ESR rule, covered queries, explain plan analysis, and index maintenance.

## Single Field Indexes

```javascript
// Create a single field index
db.users.createIndex({ email: 1 });  // 1 = ascending
db.users.createIndex({ age: -1 });   // -1 = descending

// Create a unique index
db.users.createIndex({ email: 1 }, { unique: true });

// Create a sparse index (only index documents with the field)
db.users.createIndex({ phone: 1 }, { sparse: true });

// List all indexes
db.users.getIndexes();

// Drop an index
db.users.dropIndex("email_1");

// Drop all indexes (except _id)
db.users.dropIndexes();
```

## Compound Indexes

Compound indexes cover multiple fields. They support queries on any prefix of the indexed fields.

```javascript
// Compound index on last name + first name + age
db.users.createIndex({ lastName: 1, firstName: 1, age: -1 });

// This index supports:
// { lastName: "Smith" }
// { lastName: "Smith", firstName: "John" }
// { lastName: "Smith", firstName: "John", age: { $gt: 30 } }

// It does NOT support:
// { firstName: "John" }           — lastName is a prefix, must come first
// { age: { $gt: 30 } }            — age is not a prefix
// { firstName: "John", age: 30 }  — skips lastName
```

### The ESR Rule

The ESR rule determines the optimal order of fields in a compound index: **Equality, Sort, Range**.

```text
ESR Rule:
  E (Equality) — Fields with exact match queries ({ status: "active" })
  S (Sort)     — Fields used for sorting ({ age: 1 })
  R (Range)    — Fields with range queries ({ age: { $gt: 18 } })

Order: Equality first, then Sort, then Range.

Why? Equality fields reduce the result set the most. Sort fields
can use the index to avoid an in-memory sort. Range fields benefit
from index ordering but are less selective than equality.
```

```javascript
// Query: { status: "active", age: { $gt: 18 } }.sort({ name: 1 })
// E: status, S: name, R: age
// Optimal index: { status: 1, name: 1, age: 1 }

db.users.createIndex({ status: 1, name: 1, age: 1 });

// Query: { category: "books", price: { $lt: 50 } }.sort({ price: 1 })
// E: category, S: price, R: price
// When sort and range are on the same field, put it once
// Optimal index: { category: 1, price: 1 }

db.products.createIndex({ category: 1, price: 1 });
```

## Text Indexes

```javascript
// Create a text index on a single field
db.articles.createIndex({ title: "text" });

// Create a text index on multiple fields
db.articles.createIndex({
  title: "text",
  content: "text",
  tags: "text",
});

// Search with text index
db.articles.find({ $text: { $search: "mongodb indexing performance" } });

// Exact phrase search
db.articles.find({ $text: { $search: "\"mongodb indexing\"" } });

// Exclude words
db.articles.find({ $text: { $search: "mongodb -mysql" } });

// Get text search score
db.articles.find(
  { $text: { $search: "mongodb indexing" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });

// Text index with weights
db.articles.createIndex(
  { title: "text", content: "text", tags: "text" },
  { weights: { title: 10, content: 5, tags: 1 } }
);
```

## Geospatial Indexes

```javascript
// 2D sphere index (for GeoJSON points)
db.places.createIndex({ location: "2dsphere" });

// Insert a GeoJSON point
db.places.insertOne({
  name: "Central Park",
  location: {
    type: "Point",
    coordinates: [-73.968285, 40.785091],
  },
});

// Find nearby places (within 5km)
db.places.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-73.968285, 40.785091],
      },
      $maxDistance: 5000,
    },
  },
});

// Find places within a polygon
db.places.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-74.0, 40.7],
          [-73.9, 40.7],
          [-73.9, 40.8],
          [-74.0, 40.8],
          [-74.0, 40.7],
        ]],
      },
    },
  },
});

// 2D index (legacy, for flat coordinates)
db.places.createIndex({ location: "2d" });
db.places.find({ location: { $near: [-73.9, 40.8], $maxDistance: 0.1 } });
```

## TTL Indexes

TTL (Time-To-Live) indexes automatically expire documents after a specified number of seconds.

```javascript
// Expire documents 3600 seconds (1 hour) after the createdAt date
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });

// Expire documents 7 days after the last activity
db.tokens.createIndex({ lastActivity: 1 }, { expireAfterSeconds: 604800 });

// Insert a document that will expire
db.sessions.insertOne({
  userId: "123",
  token: "abc123",
  createdAt: new Date(),
});

// Remove TTL (change expireAfterSeconds to 0 — does NOT delete existing docs)
db.sessions.dropIndex({ createdAt: 1 });
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 0 });
```

```text
TTL caveats:
  - TTL indexes work on date fields only (BSON date)
  - Deletion runs every 60 seconds (not exact timing)
  - TTL indexes are single-field only
  - If the date field is missing, the document never expires
  - TTL does not work on capped collections
  - Use expireAfterSeconds: 0 to expire at the exact date in the field
```

## Wildcard Indexes

```javascript
// Index all fields and subfields
db.products.createIndex({ "$**": 1 });

// Index specific field patterns
db.products.createIndex({ "specs.$**": 1 });

// Index multiple field patterns
db.products.createIndex({
  "attributes.$**": 1,
  "metadata.$**": 1,
});

// Query with wildcard index
db.products.find({ "specs.weight": 1.5 });
db.products.find({ "specs.dimensions.height": 10 });
```

## Hashed Indexes

Hashed indexes support hash-based sharding and equality queries.

```javascript
// Create a hashed index
db.users.createIndex({ userId: "hashed" });

// Used for sharding
sh.shardCollection("mydb.users", { userId: "hashed" });

// Hashed indexes support equality but NOT range queries
db.users.find({ userId: "abc123" });  // Uses index
db.users.find({ userId: { $gt: "abc" } });  // Does NOT use index
```

## Covered Queries

A covered query is fully satisfied by the index — MongoDB does not need to fetch the document.

```javascript
// Index: { email: 1, name: 1 }
db.users.createIndex({ email: 1, name: 1 });

// Covered query — only returns indexed fields
db.users.find(
  { email: "user@example.com" },
  { _id: 0, email: 1, name: 1 }
);
// MongoDB reads the result directly from the index without fetching the document

// NOT covered — needs to fetch the document for the age field
db.users.find(
  { email: "user@example.com" },
  { _id: 0, email: 1, name: 1, age: 1 }
);
```

## Explain Plan Analysis

```javascript
// Run explain on a query
db.users.find({ email: "user@example.com" }).explain("executionStats");

// Key fields in the explain output
const explain = db.users.find({ status: "active", age: { $gt: 18 } }).explain("executionStats");

// Check the winning plan
console.log(explain.queryPlanner.winningPlan.stage);
// "IXSCAN" = index scan (good)
// "COLLSCAN" = collection scan (bad — missing index)
// "FETCH" = fetching documents (expected after IXSCAN)
// "SORT" = in-memory sort (can be slow for large result sets)

// Check execution stats
console.log(explain.executionStats.totalDocsExamined);  // Should be close to nReturned
console.log(explain.executionStats.totalKeysExamined);  // Index keys scanned
console.log(explain.executionStats.nReturned);          // Documents returned
console.log(explain.executionStats.executionTimeMillis);

// Good index: totalDocsExamined ≈ nReturned
// Bad (no index): totalDocsExamined = total documents in collection
```

```javascript
// Compare with and without index
// Without index
db.users.find({ email: "test@example.com" }).explain("executionStats");
// winningPlan.stage: "COLLSCAN"
// totalDocsExamined: 1000000

// With index
db.users.createIndex({ email: 1 });
db.users.find({ email: "test@example.com" }).explain("executionStats");
// winningPlan.stage: "FETCH"
// inputStage.stage: "IXSCAN"
// totalDocsExamined: 1
// totalKeysExamined: 1
```

## Partial Indexes

Partial indexes only index documents that match a filter expression. They are smaller and faster than sparse indexes.

```javascript
// Index only active users
db.users.createIndex(
  { email: 1 },
  { partialFilterExpression: { status: "active" } }
);

// Index only documents with a price field greater than 100
db.products.createIndex(
  { category: 1 },
  { partialFilterExpression: { price: { $gt: 100 } } }
);

// The query must include the filter expression to use the partial index
db.users.find({ status: "active", email: "test@example.com" });  // Uses index
db.users.find({ email: "test@example.com" });  // Does NOT use index
```

## Index Intersection

MongoDB can use multiple indexes for a single query and intersect the results.

```javascript
// Two separate indexes
db.orders.createIndex({ customerId: 1 });
db.orders.createIndex({ status: 1 });

// Query that can use both indexes
db.orders.find({ customerId: 123, status: "shipped" }).explain();
// winningPlan.stage: "FETCH"
// inputStage.stage: "AND"
// inputStages: [
//   { stage: "IXSCAN", indexName: "customerId_1" },
//   { stage: "IXSCAN", indexName: "status_1" }
// ]

// However, a compound index is usually better
db.orders.createIndex({ customerId: 1, status: 1 });
```

## Index Maintenance

```javascript
// Build index in the background (does not block writes)
db.users.createIndex({ email: 1 }, { background: true });

// Check index size
db.users.stats().indexSizes;

// Check index usage
db.users.aggregate([{ $indexStats: {} }]);

// Find unused indexes
db.users.aggregate([
  { $indexStats: {} },
  { $match: { accesses.ops: 0 } },
]);

// Hide an index (test without dropping)
db.users.createIndex({ email: 1 }, { hidden: true });
db.users.unhideIndex("email_1");

// Rebuild all indexes
db.users.reIndex();
```

## FAQ

### How many indexes should I create?

Create indexes for your most frequent and slow queries. Each index adds write overhead — every insert, update, and delete must update all indexes. A good rule is 5-10 indexes per collection for most workloads. Use `$indexStats` to find unused indexes and drop them. Monitor query performance with `explain()` and the MongoDB profiler (`db.setProfilingLevel(1)`).

### What is the ESR rule and why does it matter?

The ESR rule determines the optimal field order for compound indexes: Equality fields first, Sort fields second, Range fields last. Equality fields are the most selective — they reduce the candidate set the most. Sort fields in the index allow MongoDB to return results in order without an in-memory sort. Range fields benefit from index ordering but are less selective. Following ESR ensures your index supports the most query patterns with the least work.

### When should I use a compound index vs multiple single indexes?

Use a compound index when you frequently query multiple fields together. A compound index `{ a: 1, b: 1 }` supports queries on `{ a }` and `{ a, b }` but not `{ b }` alone. Multiple single indexes support any combination via index intersection, but intersection is slower than a single compound index scan. Prefer compound indexes for known query patterns. Use single indexes for ad-hoc queries or when field combinations vary.

### What is the difference between sparse and partial indexes?

A sparse index skips documents that do not have the indexed field. A partial index skips documents that do not match a filter expression. Sparse indexes are simpler but less flexible — they only check for field existence. Partial indexes can use any filter expression (e.g., `{ status: "active" }`) and can be combined with any index type. Prefer partial indexes for most use cases. Use sparse indexes only for optional fields.

### How do I know if my query is using an index?

Run `db.collection.find(query).explain("executionStats")`. Look at `winningPlan.stage` — `IXSCAN` means an index is used, `COLLSCAN` means a full collection scan. Check `totalDocsExamined` vs `nReturned` — if `totalDocsExamined` is much larger than `nReturned`, your index is not selective enough. Check `executionTimeMillis` to measure actual performance. Use `db.collection.aggregate([{ $indexStats: {} }])` to see which indexes are being used over time.

### Can I index arrays in MongoDB?

Yes. MongoDB automatically creates a multikey index when a field contains array values. Each array element gets its own index entry. For example, if a document has `tags: ["mongodb", "indexing", "performance"]`, the index on `tags` will have three entries pointing to the same document. You can query `db.articles.find({ tags: "mongodb" })` and it will use the multikey index. You cannot use a multikey index for a compound index where both fields are arrays.

## See Also

- [Complete Guide to SQL Query Optimization](/guides/complete-guide-sql-query-optimization/)
- [Complete Guide to PostgreSQL Tuning](/guides/complete-guide-postgresql-tuning/)
- [SQL Performance Tuning — Indexes, Queries, and Explain Plans](/guides/sql-performance-tuning-guide/)
- [Complete Guide to Redis Caching Strategies](/guides/complete-guide-redis-caching-strategies/)
- [Full-Text Search — Implement Search That Actually Works](/guides/full-text-search-guide/)

