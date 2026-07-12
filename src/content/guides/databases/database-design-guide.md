---




contentType: guides
slug: database-design-guide
title: "Database Design Guide"
description: "A practical guide to designing relational databases with normalization, indexing, and relationship modeling."
metaDescription: "Learn database design principles: normalization forms, primary and foreign keys, indexing strategies, and relationship modeling for scalable applications."
difficulty: intermediate
topics:
  - databases
  - architecture
tags:
  - architecture
  - database
  - database-design
  - indexing
  - sql
relatedResources:
  - /recipes/sql-joins
  - /recipes/database-transactions
  - /patterns/repository-pattern
  - /recipes/acid-transactions-postgres
  - /recipes/database-views-materialized
  - /recipes/elasticsearch-aggregations
  - /recipes/mongodb-crud-mongoose
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn database design principles: normalization forms, primary and foreign keys, indexing strategies, and relationship modeling for scalable applications."
  keywords:
    - database design
    - database normalization
    - indexing
    - relational databases
    - schema design
    - ER diagrams




---

## Introduction

A well-designed database is the foundation of reliable applications. Poor design leads to data inconsistencies, slow queries, and costly migrations. Below is a practical guide to the essential principles for designing relational databases that scale.

## Entity-Relationship Modeling

Start every database design by identifying entities and their relationships.

### Steps

1. **Identify entities**: Users, Orders, Products, Categories
2. **Define attributes**: What data does each entity hold?
3. **Map relationships**: One-to-one, one-to-many, many-to-many
4. **Assign keys**: Primary keys, candidate keys, composite keys

### Relationship Types

| Type | Example | Implementation |
|------|---------|---------------|
| **One-to-One** | User → Profile | Foreign key with unique constraint |
| **One-to-Many** | Category → Products | Foreign key on the "many" side |
| **Many-to-Many** | Students ↔ Courses | Junction table with two foreign keys |

## Normalization

Normalization reduces redundancy and prevents anomalies. Follow these forms progressively.

### First Normal Form (1NF)

- Atomic values: no multi-valued attributes
- Each row is unique (has a primary key)

```sql
-- Violation: multiple phone numbers in one column
CREATE TABLE bad_users (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  phones VARCHAR(500) -- '555-1234,555-5678'
);

-- Fix: separate table for phone numbers
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(255)
);

CREATE TABLE user_phones (
  user_id INT REFERENCES users(id),
  phone VARCHAR(20),
  PRIMARY KEY (user_id, phone)
);
```

### Second Normal Form (2NF)

- Must be in 1NF
- No partial dependency: non-key attributes depend on the full primary key

```sql
-- Violation: order_date depends only on order_id, not on (order_id, product_id)
CREATE TABLE bad_order_items (
  order_id INT,
  product_id INT,
  order_date DATE,  -- depends only on order_id
  quantity INT,
  PRIMARY KEY (order_id, product_id)
);

-- Fix: split into orders and order_items
CREATE TABLE orders (
  id INT PRIMARY KEY,
  order_date DATE
);

CREATE TABLE order_items (
  order_id INT REFERENCES orders(id),
  product_id INT,
  quantity INT,
  PRIMARY KEY (order_id, product_id)
);
```

### Third Normal Form (3NF)

- Must be in 2NF
- No transitive dependency: non-key attributes depend only on the primary key

```sql
-- Violation: city_name depends on zip_code, not on user_id
CREATE TABLE bad_users (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  zip_code VARCHAR(10),
  city_name VARCHAR(100)  -- depends on zip_code
);

-- Fix: separate table for zip → city mapping
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  zip_code VARCHAR(10)
);

CREATE TABLE zip_cities (
  zip_code VARCHAR(10) PRIMARY KEY,
  city_name VARCHAR(100)
);
```

## Indexing Strategies

Indexes speed up reads but slow down writes. Use them strategically.

### When to Index

| Scenario | Index Type |
|----------|-----------|
| Primary lookups | B-Tree on primary key |
| Foreign key columns | B-Tree on FK columns |
| Full-text search | Full-text index |
| Range queries | B-Tree on the column |
| Geospatial data | GiST / SP-GiST |

### Composite Index Ordering

Place columns with the highest selectivity first.

```sql
-- Good: status has fewer distinct values than created_at
CREATE INDEX idx_orders_created ON orders(created_at, status);

-- Better if querying by status + date range
CREATE INDEX idx_orders_status_date ON orders(status, created_at);
```

### Common Mistakes

- Over-indexing: every index slows down INSERT/UPDATE/DELETE
- Indexing low-cardinality columns alone
- Ignoring covering indexes for frequently read queries

## Constraints and Data Integrity

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) CHECK (price >= 0),
  category_id INT REFERENCES categories(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Constraint | Purpose |
|-----------|---------|
| `PRIMARY KEY` | Unique identifier for each row |
| `UNIQUE` | Ensures no duplicate values |
| `NOT NULL` | Prevents missing values |
| `CHECK` | Validates data with expressions |
| `FOREIGN KEY` | Maintains referential integrity |

## What Works

- **Use surrogate keys** (auto-increment integers or UUIDs) instead of natural keys
- **Avoid nullable foreign keys** — use junction tables for optional relationships
- **Choose data types carefully**: `VARCHAR(255)` vs `TEXT`, `DECIMAL` vs `FLOAT`
- **Document your schema** with comments and ER diagrams
- **Plan for growth**: [partition large tables](/guides/databases/database-sharding-partitioning-guide) before they become a problem

## Common Mistakes

- Skipping normalization for "performance" without evidence. See [SQL performance tuning](/guides/databases/sql-performance-tuning-guide).
- Using `ENUM` for values that change frequently
- Missing `ON DELETE` / `ON UPDATE` rules on foreign keys. See [data validation](/recipes/security/data-validation-zod) principles.
- Storing derived/calculated data instead of computing on read

## Frequently Asked Questions

### What database normalization form should I use?

Most applications should normalize to at least Third Normal Form (3NF). This eliminates transitive dependencies and keeps data consistent. Denormalize only when you have proven performance issues.

### When should I use a composite index?

Use composite indexes when queries filter on multiple columns together. Order columns by selectivity (most selective first). Avoid indexing columns that are rarely used in WHERE clauses.

### Should I use UUID or auto-increment for primary keys?

Use auto-increment integers for most OLTP applications — they are smaller, faster to index, and human-readable. Use UUIDs when you need distributed generation or merge replication across databases.



## Advanced Topics

### Scenario: E-commerce Schema Design

```sql
-- System: 10M products, 500K orders/day
-- ACID for orders, fast catalog search, inventory accuracy

CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE addresses (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    line1 VARCHAR(255) NOT NULL, city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL, postal_code VARCHAR(20) NOT NULL,
    country CHAR(2) DEFAULT 'US', is_default BOOLEAN DEFAULT FALSE
);

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL, description TEXT,
    category_id BIGINT REFERENCES categories(id) ON DELETE RESTRICT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    status VARCHAR(20) DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Indexes for common queries
CREATE INDEX idx_orders_customer ON orders(customer_id, created_at DESC);
CREATE INDEX idx_products_category ON products(category_id) WHERE is_active = true;
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || description));
```

### How do I handle inventory without overselling?

Use SELECT ... FOR UPDATE in a transaction, or atomic decrement with a CHECK constraint:
```sql
BEGIN;
UPDATE product_variants SET stock = stock - 1
WHERE id = ? AND stock > 0;
-- If affected rows = 0, out of stock
COMMIT;
```
This is atomic and prevents overselling without explicit locks.
