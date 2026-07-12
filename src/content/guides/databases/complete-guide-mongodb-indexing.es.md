---





contentType: guides
slug: complete-guide-mongodb-indexing
title: "Referencia Detallada de MongoDB Indexing"
description: "MongoDB indexing. Cubre single field, compound, text, geospatial, TTL, wildcard, hashed indexes, ESR rule, covered queries, explain plan analysis, index intersection y partial indexes con ejemplos practicos."
metaDescription: "Master MongoDB indexing. Covers single, compound, text, geospatial, TTL, wildcard, hashed indexes, ESR rule, covered queries, explain plans."
difficulty: advanced
topics:
  - databases
  - performance
tags:
  - mongodb
  - databases
  - guia
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

## Introducción

Indexes son el single most important performance optimization en MongoDB. Sin indexes, MongoDB performa collection scans — leeyendo cada document para findar matches. Lo siguiente es una guia practica para single field, compound, text, geospatial, TTL, wildcard, y hashed indexes, el ESR rule, covered queries, explain plan analysis, y index maintenance.

## Single Field Indexes

```javascript
// Crear un single field index
db.users.createIndex({ email: 1 });  // 1 = ascending
db.users.createIndex({ age: -1 });   // -1 = descending

// Crear un unique index
db.users.createIndex({ email: 1 }, { unique: true });

// Crear un sparse index (solo indexa documents con el field)
db.users.createIndex({ phone: 1 }, { sparse: true });

// Listar all indexes
db.users.getIndexes();

// Drop un index
db.users.dropIndex("email_1");

// Drop all indexes (except _id)
db.users.dropIndexes();
```

## Compound Indexes

Compound indexes cubren multiple fields. Soportan queries en cualquier prefix del indexed fields.

```javascript
// Compound index en last name + first name + age
db.users.createIndex({ lastName: 1, firstName: 1, age: -1 });

// Este index soporta:
// { lastName: "Smith" }
// { lastName: "Smith", firstName: "John" }
// { lastName: "Smith", firstName: "John", age: { $gt: 30 } }

// NO soporta:
// { firstName: "John" }           — lastName es un prefix, debe venir first
// { age: { $gt: 30 } }            — age no es un prefix
// { firstName: "John", age: 30 }  — skipea lastName
```

### The ESR Rule

El ESR rule determina el optimal order de fields en un compound index: **Equality, Sort, Range**.

```text
ESR Rule:
  E (Equality) — Fields con exact match queries ({ status: "active" })
  S (Sort)     — Fields usados para sorting ({ age: 1 })
  R (Range)    — Fields con range queries ({ age: { $gt: 18 } })

Order: Equality first, luego Sort, luego Range.

Por que? Equality fields reducen el result set the most. Sort fields
pueden usar el index para avoid un in-memory sort. Range fields benefit
de index ordering pero son less selective que equality.
```

```javascript
// Query: { status: "active", age: { $gt: 18 } }.sort({ name: 1 })
// E: status, S: name, R: age
// Optimal index: { status: 1, name: 1, age: 1 }

db.users.createIndex({ status: 1, name: 1, age: 1 });

// Query: { category: "books", price: { $lt: 50 } }.sort({ price: 1 })
// E: category, S: price, R: price
// Cuando sort y range son en el same field, poni uno solo
// Optimal index: { category: 1, price: 1 }

db.products.createIndex({ category: 1, price: 1 });
```

## Text Indexes

```javascript
// Crear un text index en un single field
db.articles.createIndex({ title: "text" });

// Crear un text index en multiple fields
db.articles.createIndex({
  title: "text",
  content: "text",
  tags: "text",
});

// Search con text index
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

// Text index con weights
db.articles.createIndex(
  { title: "text", content: "text", tags: "text" },
  { weights: { title: 10, content: 5, tags: 1 } }
);
```

## Geospatial Indexes

```javascript
// 2D sphere index (para GeoJSON points)
db.places.createIndex({ location: "2dsphere" });

// Insertar un GeoJSON point
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

// Find places dentro de un polygon
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

// 2D index (legacy, para flat coordinates)
db.places.createIndex({ location: "2d" });
db.places.find({ location: { $near: [-73.9, 40.8], $maxDistance: 0.1 } });
```

## TTL Indexes

TTL (Time-To-Live) indexes automaticamente expiren documents despues de un specified number de seconds.

```javascript
// Expire documents 3600 seconds (1 hour) despues del createdAt date
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });

// Expire documents 7 days despues del last activity
db.tokens.createIndex({ lastActivity: 1 }, { expireAfterSeconds: 604800 });

// Insertar un document que va a expire
db.sessions.insertOne({
  userId: "123",
  token: "abc123",
  createdAt: new Date(),
});

// Remove TTL (change expireAfterSeconds a 0 — NO deletea existing docs)
db.sessions.dropIndex({ createdAt: 1 });
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 0 });
```

```text
TTL caveats:
  - TTL indexes funcionan en date fields only (BSON date)
  - Deletion corre every 60 seconds (no exact timing)
  - TTL indexes son single-field only
  - Si el date field falta, el document nunca expirea
  - TTL no funciona en capped collections
  - Usa expireAfterSeconds: 0 para expirear en el exact date del field
```

## Wildcard Indexes

```javascript
// Indexar all fields y subfields
db.products.createIndex({ "$**": 1 });

// Indexar specific field patterns
db.products.createIndex({ "specs.$**": 1 });

// Indexar multiple field patterns
db.products.createIndex({
  "attributes.$**": 1,
  "metadata.$**": 1,
});

// Query con wildcard index
db.products.find({ "specs.weight": 1.5 });
db.products.find({ "specs.dimensions.height": 10 });
```

## Hashed Indexes

Hashed indexes soportan hash-based sharding y equality queries.

```javascript
// Crear un hashed index
db.users.createIndex({ userId: "hashed" });

// Usado para sharding
sh.shardCollection("mydb.users", { userId: "hashed" });

// Hashed indexes soportan equality pero NO range queries
db.users.find({ userId: "abc123" });  // Usa index
db.users.find({ userId: { $gt: "abc" } });  // NO usa index
```

## Covered Queries

Un covered query es fully satisfied por el index — MongoDB no necesita fetchar el document.

```javascript
// Index: { email: 1, name: 1 }
db.users.createIndex({ email: 1, name: 1 });

// Covered query — solo returnea indexed fields
db.users.find(
  { email: "user@example.com" },
  { _id: 0, email: 1, name: 1 }
);
// MongoDB lee el result directamente del index sin fetchar el document

// NO covered — necesita fetchar el document para el age field
db.users.find(
  { email: "user@example.com" },
  { _id: 0, email: 1, name: 1, age: 1 }
);
```

## Explain Plan Analysis

```javascript
// Correr explain en un query
db.users.find({ email: "user@example.com" }).explain("executionStats");

// Key fields en el explain output
const explain = db.users.find({ status: "active", age: { $gt: 18 } }).explain("executionStats");

// Check el winning plan
console.log(explain.queryPlanner.winningPlan.stage);
// "IXSCAN" = index scan (good)
// "COLLSCAN" = collection scan (bad — missing index)
// "FETCH" = fetcheando documents (expected despues de IXSCAN)
// "SORT" = in-memory sort (puede ser slow para large result sets)

// Check execution stats
console.log(explain.executionStats.totalDocsExamined);  // Deberia ser close a nReturned
console.log(explain.executionStats.totalKeysExamined);  // Index keys scanned
console.log(explain.executionStats.nReturned);          // Documents returned
console.log(explain.executionStats.executionTimeMillis);

// Good index: totalDocsExamined ≈ nReturned
// Bad (no index): totalDocsExamined = total documents en collection
```

```javascript
// Comparar con y sin index
// Sin index
db.users.find({ email: "test@example.com" }).explain("executionStats");
// winningPlan.stage: "COLLSCAN"
// totalDocsExamined: 1000000

// Con index
db.users.createIndex({ email: 1 });
db.users.find({ email: "test@example.com" }).explain("executionStats");
// winningPlan.stage: "FETCH"
// inputStage.stage: "IXSCAN"
// totalDocsExamined: 1
// totalKeysExamined: 1
```

## Partial Indexes

Partial indexes solo indexan documents que matchean un filter expression. Son smaller y faster que sparse indexes.

```javascript
// Indexar solo active users
db.users.createIndex(
  { email: 1 },
  { partialFilterExpression: { status: "active" } }
);

// Indexar solo documents con un price field greater que 100
db.products.createIndex(
  { category: 1 },
  { partialFilterExpression: { price: { $gt: 100 } } }
);

// El query debe incluir el filter expression para usar el partial index
db.users.find({ status: "active", email: "test@example.com" });  // Usa index
db.users.find({ email: "test@example.com" });  // NO usa index
```

## Index Intersection

MongoDB puede usar multiple indexes para un single query e intersectar los results.

```javascript
// Two separate indexes
db.orders.createIndex({ customerId: 1 });
db.orders.createIndex({ status: 1 });

// Query que puede usar ambos indexes
db.orders.find({ customerId: 123, status: "shipped" }).explain();
// winningPlan.stage: "FETCH"
// inputStage.stage: "AND"
// inputStages: [
//   { stage: "IXSCAN", indexName: "customerId_1" },
//   { stage: "IXSCAN", indexName: "status_1" }
// ]

// Sin embargo, un compound index es usualmente better
db.orders.createIndex({ customerId: 1, status: 1 });
```

## Index Maintenance

```javascript
// Build index en el background (no bloquea writes)
db.users.createIndex({ email: 1 }, { background: true });

// Check index size
db.users.stats().indexSizes;

// Check index usage
db.users.aggregate([{ $indexStats: {} }]);

// Findar unused indexes
db.users.aggregate([
  { $indexStats: {} },
  { $match: { accesses.ops: 0 } },
]);

// Hide un index (test sin dropear)
db.users.createIndex({ email: 1 }, { hidden: true });
db.users.unhideIndex("email_1");

// Rebuild all indexes
db.users.reIndex();
```

## Preguntas Frecuentes

### ¿Cuántos indexes deberia crear?

Crea indexes para tus most frequent y slow queries. Cada index add write overhead — cada insert, update, y delete debe updatear all indexes. Una good rule es 5-10 indexes por collection para most workloads. Usa `$indexStats` para findar unused indexes y dropearlos. Monitor query performance con `explain()` y el MongoDB profiler (`db.setProfilingLevel(1)`).

### ¿Qué es el ESR rule y por que importa?

El ESR rule determina el optimal field order para compound indexes: Equality fields first, Sort fields second, Range fields last. Equality fields son los most selective — reducen el candidate set the most. Sort fields en el index allow MongoDB para returnear results en order sin un in-memory sort. Range fields benefit de index ordering pero son less selective. Seguir ESR asegura que tu index soporta los most query patterns con el least work.

### ¿Cuándo deberia usar un compound index vs multiple single indexes?

Usa un compound index cuando frecuentemente querieas multiple fields juntos. Un compound index `{ a: 1, b: 1 }` soporta queries en `{ a }` y `{ a, b }` pero no `{ b }` solo. Multiple single indexes soportan cualquier combination via index intersection, pero intersection es slower que un single compound index scan. Preferi compound indexes para known query patterns. Usa single indexes para ad-hoc queries o cuando field combinations varian.

### ¿Cuál es la diferencia entre sparse y partial indexes?

Un sparse index skipea documents que no tienen el indexed field. Un partial index skipea documents que no matchean un filter expression. Sparse indexes son simpler pero less flexible — solo checkean field existence. Partial indexes pueden usar cualquier filter expression (e.g., `{ status: "active" }`) y pueden ser combined con cualquier index type. Preferi partial indexes para most use cases. Usa sparse indexes solo para optional fields.

### ¿Cómo se si mi query esta usando un index?

Corre `db.collection.find(query).explain("executionStats")`. Mira `winningPlan.stage` — `IXSCAN` significa que un index es used, `COLLSCAN` significa un full collection scan. Checkea `totalDocsExamined` vs `nReturned` — si `totalDocsExamined` es much larger que `nReturned`, tu index no es selective enough. Checkea `executionTimeMillis` para medir actual performance. Usa `db.collection.aggregate([{ $indexStats: {} }])` para ver que indexes estan siendo used over time.

### ¿Puedo indexar arrays en MongoDB?

Si. MongoDB automaticamente crea un multikey index cuando un field contiene array values. Cada array element gets su own index entry. Por ejemplo, si un document tiene `tags: ["mongodb", "indexing", "performance"]`, el index en `tags` va a tener three entries apuntando al same document. Podes query `db.articles.find({ tags: "mongodb" })` y va a usar el multikey index. No podes usar un multikey index para un compound index donde ambos fields son arrays.

## See Also

- [Complete Guide to SQL Query Optimization](/es/guides/complete-guide-sql-query-optimization/)
- [Complete Guide to PostgreSQL Tuning](/es/guides/complete-guide-postgresql-tuning/)
- [SQL Performance Tuning — Indexes, Queries, and Explain Plans](/es/guides/sql-performance-tuning-guide/)
- [Complete Guide to Redis Caching Strategies](/es/guides/complete-guide-redis-caching-strategies/)
- [Full-Text Search — Implement Search That Actually Works](/es/guides/full-text-search-guide/)

