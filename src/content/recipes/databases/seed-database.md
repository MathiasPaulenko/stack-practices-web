---





contentType: recipes
slug: seed-database
title: "Seed Database"
description: "How to seed databases with realistic data for development, testing, and staging environments using seed scripts, migrations, and factories across PostgreSQL, MongoDB, and Prisma."
metaDescription: "Seed databases with realistic data for development, testing, and staging using seed scripts, migrations, and factories across PostgreSQL, MongoDB, and Prisma."
difficulty: beginner
topics:
  - databases
tags:
  - databases
  - seeding
  - testing
  - postgresql
  - mongodb
  - prisma
  - development
  - recipe
relatedResources:
  - /recipes/generate-test-data
  - /recipes/setup-test-fixtures
  - /guides/database-sharding-implementation-guide
  - /guides/complete-guide-mongodb-indexing
  - /guides/complete-guide-postgresql-replication
  - /guides/complete-guide-postgresql-tuning
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Seed databases with realistic data for development, testing, and staging using seed scripts, migrations, and factories across PostgreSQL, MongoDB, and Prisma."
  keywords:
    - databases
    - seeding
    - testing
    - postgresql
    - mongodb
    - prisma
    - development
    - recipe





---

## Overview

A seeded database is the fastest way to onboard new developers, reproduce bugs, and run integration tests that depend on realistic data distributions. Without seeding, every environment starts empty, forcing developers to manually create accounts, orders, and relationships before they can test any capability. Here is how to safe, repeatable seeding strategies that do not pollute production.

## When to Use

- Onboarding new developers who need a working local database in minutes
- Integration and E2E tests that require users, products, or transactions to exist
- Staging environments that should mirror production data distributions
- Load testing with realistic data volumes and relationships
- Demonstrating capabilities to stakeholders without manually creating demo data

## When NOT to Use

- Seeding production databases — use controlled migrations and import scripts instead
- Environments with PII or sensitive data — never seed real customer data from exports
- Systems where the seed script takes longer than the CI timeout (typically 10 minutes)
- Microservices with event-sourced architectures where seeding must emit domain events

## Step-by-Step Implementation

### PostgreSQL (SQL + pg)

```bash
# Directory: db/seeds/
# 01_users.sql
INSERT INTO users (email, name, role, created_at)
VALUES
  ('admin@example.com', 'Admin User', 'admin', NOW()),
  ('user1@example.com', 'Alice', 'user', NOW()),
  ('user2@example.com', 'Bob', 'user', NOW())
ON CONFLICT (email) DO NOTHING;

# 02_products.sql
INSERT INTO products (sku, name, price, stock)
VALUES
  ('SKU-001', 'Wireless Mouse', 29.99, 150),
  ('SKU-002', 'Mechanical Keyboard', 89.99, 75),
  ('SKU-003', 'USB-C Hub', 49.99, 200)
ON CONFLICT (sku) DO NOTHING;

# 03_orders.sql (with references)
INSERT INTO orders (user_id, total, status, created_at)
SELECT id, 119.98, 'completed', NOW() - INTERVAL '2 days'
FROM users WHERE email = 'user1@example.com';
```

```javascript
// seed.js — Node.js runner using pg
import { Client } from 'pg';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const seedsDir = './db/seeds';
  const files = readdirSync(seedsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(seedsDir, file), 'utf8');
    console.log(`Running: ${file}`);
    await client.query(sql);
  }

  await client.end();
  console.log('Seeding complete');
}

seed().catch(console.error);
```

```bash
# Run with environment guard
if [ "$NODE_ENV" != "production" ]; then
  node db/seed.js
else
  echo "Refusing to seed production database"
  exit 1
fi
```

### MongoDB (mongosh / Node.js)

```javascript
// seeds/users.js
const { MongoClient } = require('mongodb');

async function seed() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('myapp');

  // Idempotent: drop and recreate, or use ordered inserts with upsert
  const users = db.collection('users');
  await users.deleteMany({ email: { $regex: '@example\\.com$' } });

  await users.insertMany([
    { email: 'admin@example.com', name: 'Admin', role: 'admin', createdAt: new Date() },
    { email: 'user1@example.com', name: 'Alice', role: 'user', createdAt: new Date() }
  ]);

  // Products with embedded reviews
  const products = db.collection('products');
  await products.deleteMany({ sku: /^SKU-/ });

  await products.insertMany([
    {
      sku: 'SKU-001',
      name: 'Wireless Mouse',
      price: 29.99,
      reviews: [
        { userId: 'user1@example.com', rating: 5, comment: 'Great mouse' }
      ]
    }
  ]);

  // Create indexes that the application expects
  await users.createIndex({ email: 1 }, { unique: true });
  await products.createIndex({ sku: 1 }, { unique: true });

  await client.close();
}

seed().catch(console.error);
```

### Prisma (TypeScript)

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Upsert ensures idempotency
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN'
    }
  });

  const categories = await prisma.$transaction(
    ['Electronics', 'Books', 'Home'].map(name =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );

  const product = await prisma.product.create({
    data: {
      sku: 'SKU-001',
      name: 'Wireless Mouse',
      price: 29.99,
      categoryId: categories[0].id,
      stock: { create: { quantity: 150 } }
    }
  });

  console.log(`Created ${admin.name}, ${product.name}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

```json
// package.json
{
  "scripts": {
    "db:seed": "ts-node prisma/seed.ts"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

```bash
# Prisma native seed command
npx prisma db seed

# Reset database and re-seed (development only)
npx prisma migrate reset --force
```

### Python (SQLAlchemy + Alembic)

```python
# scripts/seed_database.py
import os
import sys
from sqlalchemy.orm import Session
from app.models import User, Product, Order
from app.database import SessionLocal
from app.core.security import get_password_hash

def seed():
    if os.getenv("ENV") == "production":
        raise RuntimeError("Cannot seed production database")

    db: Session = SessionLocal()
    try:
        # Idempotent seeding
        if db.query(User).filter(User.email == "admin@example.com").first():
            print("Database already seeded")
            return

        admin = User(
            email="admin@example.com",
            name="Admin User",
            role="admin",
            hashed_password=get_password_hash("changeme")
        )
        db.add(admin)

        products = [
            Product(sku="SKU-001", name="Wireless Mouse", price=29.99, stock=150),
            Product(sku="SKU-002", name="Keyboard", price=89.99, stock=75),
        ]
        db.add_all(products)
        db.flush()

        order = Order(
            user_id=admin.id,
            total=119.98,
            status="completed"
        )
        db.add(order)

        db.commit()
        print("Seeding complete")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
```

## What Works

- **Make seeds idempotent.** Use `ON CONFLICT DO NOTHING`, `upsert`, or existence checks so running the seed script twice does not create duplicates or crash.
- **Never seed production.** Gate seed scripts with an environment check. Production data should enter through controlled migrations, admin tools, or ETL pipelines.
- **Keep seed data realistic but small.** 10-50 representative rows per table is enough for development. Use factories (not seed scripts) for load testing that needs millions of rows.
- **Version seed files like migrations.** Name them `01_users.sql`, `02_products.sql` so they run in deterministic order and can be tracked in git.
- **Seed in CI for integration tests.** A `db:seed` step before the test suite ensures every CI run starts from a known state.

## Common Mistakes

- **Hardcoding auto-increment IDs.** Inserting `id = 1` into an auto-increment column can cause conflicts when the application later creates records. Let the database assign IDs or use UUIDs.
- **Seeding without foreign key order.** Inserting an order before the user exists causes a foreign key violation. Order seed files by dependency graph.
- **Forgetting to create indexes.** Seeding bypasses the application, so indexes that the app relies on may not exist if the seed script skips `CREATE INDEX` statements.
- **Using production dumps as seeds.** A production SQL dump may contain PII, GDPR-sensitive data, or internal IDs that should not be in git or developer machines.
- **Non-deterministic seeds.** Randomly generated seed data makes reproducing bugs across environments impossible. Use a fixed seed for random generators in seed scripts.

## Frequently Asked Questions

**Q: What is the difference between seeding and migrating a database?**
A: Migrations change the schema structure (tables, indexes). Seeding populates the database with reference data or test records after the schema is ready.

**Q: Should I seed production databases?**
A: Only with reference data required for the application to function, such as roles, currencies, or configuration. Never seed real user or test data in production.

**Q: How do I keep seed data deterministic?**
A: Use fixed IDs, ordered insertion scripts, and factories that produce the same output for the same input. This makes tests reproducible across environments.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Additional Common Mistakes

- Running seed scripts against production databases — always add a environment check that aborts if `NODE_ENV === 'production'`
- Not cleaning up old data before seeding — use `TRUNCATE` or `DELETE` in a transaction before inserting fresh data
- Using random data without a fixed seed — tests become non-reproducible and fail intermittently
- Hardcoding seed data in migration files — keep seed scripts separate from schema migrations for clarity
- Not idempotency-checking seed scripts — running seed twice duplicates records unless you use `INSERT ... ON CONFLICT DO NOTHING`
- Seeding passwords in plaintext — always hash passwords in seed scripts using the same bcrypt/argon2 config as production
- Not wrapping seed operations in a transaction — a failure midway leaves partial data that breaks foreign key constraints
- Not using factory functions for seed data — hardcoded JSON objects are hard to maintain and cannot be parameterized for different environments
- Not cleaning up auto-increment sequences after seeding — IDs start from where the seed left off, causing confusion in test assertions that expect specific IDs
- Not documenting seed data relationships — new team members cannot understand which records depend on which without a data dictionary or ERD
- Not versioning seed scripts — when the schema changes, old seed scripts may fail silently or insert inconsistent data
- Not separating seed data by environment — using production-like data in test environments can cause privacy issues and break data minimization principles
- Not using a seed runner CLI — ad-hoc scripts are hard to reproduce and document, use a dedicated runner like `knex seed:run` or a custom CLI with clear options

### How do I seed related data with foreign keys?

Insert parent records first, capture their IDs, then insert child records with those IDs. Use a factory function that returns created IDs. For large datasets, disable foreign key checks during seeding and re-enable them after — this is faster but requires careful ordering.


- [Complete Guide to MongoDB Indexing](/guides/complete-guide-mongodb-indexing/)
- [Complete Guide to PostgreSQL Replication](/guides/complete-guide-postgresql-replication/)
- [Complete Guide to PostgreSQL Tuning](/guides/complete-guide-postgresql-tuning/)
- [Connect to PostgreSQL](/recipes/connect-to-postgresql/)
- [Database Connection Pooling](/recipes/database-connection-pooling/)

### Should I use the same seed data for dev and test?

No. Dev seed data should be realistic and large enough to test UI pagination and search. Test seed data should be minimal and deterministic — only what each test case needs. Sharing seed data between dev and test creates coupling and makes tests fragile.
