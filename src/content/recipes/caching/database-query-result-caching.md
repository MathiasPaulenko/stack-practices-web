---
contentType: recipes
slug: database-query-result-caching
title: "Cache Database Query Results with Redis and Python"
description: "Cache expensive database query results in Redis with cache-aside pattern, TTL management, and invalidation on writes for Python applications."
metaDescription: "Cache database query results in Redis with Python. Use cache-aside pattern, set TTL, invalidate on writes, and handle cache stampedes."
difficulty: intermediate
topics:
  - caching
  - databases
  - performance
tags:
  - python
  - redis
  - database-cache
  - cache-aside
  - query-optimization
relatedResources:
  - /recipes/caching/python-redis-cache-decorator
  - /recipes/caching/python-django-cache-framework
  - /guides/complete-guide-api-versioning-strategies
  - /guides/complete-guide-react-performance-optimization
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cache database query results in Redis with Python. Use cache-aside pattern, set TTL, invalidate on writes, and handle cache stampedes."
  keywords:
    - database query caching
    - redis cache aside
    - python query cache
    - cache invalidation database
    - query result cache redis
---

## Overview

Database query result caching stores the result of expensive queries in Redis so subsequent requests skip the database entirely. The cache-aside pattern — check cache, fetch from DB on miss, populate cache — is the most common approach. Below: implementing cache-aside in Python with Redis, handling serialization, invalidation on writes, cache stampede prevention, and multi-query caching.

## When to Use This

- Expensive queries (aggregations, joins, full-text search) that run frequently
- Read-heavy workloads where data changes infrequently
- Reducing database load during traffic spikes
- Dashboard or reporting queries with acceptable staleness

## Prerequisites

- Python 3.10+
- Redis server
- `redis` (redis-py) and `sqlalchemy` packages

## Solution

### 1. Install Dependencies

```bash
pip install redis sqlalchemy
```

### 2. Cache-Aside Pattern

```python
import json
import redis
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://user:pass@localhost/mydb")
redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

def get_product(product_id: int) -> dict:
    cache_key = f"product:{product_id}"

    # 1. Check cache
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # 2. Fetch from database on miss
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, name, price FROM products WHERE id = :id"),
            {"id": product_id}
        )
        row = result.fetchone()

    if row is None:
        return None

    product = {"id": row.id, "name": row.name, "price": float(row.price)}

    # 3. Populate cache with TTL
    redis_client.setex(cache_key, 300, json.dumps(product))

    return product
```

### 3. Cache Invalidation on Writes

```python
def update_product(product_id: int, name: str, price: float) -> dict:
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE products SET name = :name, price = :price WHERE id = :id"),
            {"id": product_id, "name": name, "price": price}
        )

    # Invalidate cache — next read will fetch fresh data
    redis_client.delete(f"product:{product_id}")

    return {"id": product_id, "name": name, "price": price}

def delete_product(product_id: int) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM products WHERE id = :id"),
            {"id": product_id}
        )

    redis_client.delete(f"product:{product_id}")
```

### 4. Caching List Queries

```python
def get_products_by_category(category_id: int, page: int = 1, per_page: int = 20) -> list:
    cache_key = f"products:category:{category_id}:page:{page}:size:{per_page}"

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    offset = (page - 1) * per_page
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT id, name, price FROM products
                WHERE category_id = :cat
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            {"cat": category_id, "limit": per_page, "offset": offset}
        )
        products = [
            {"id": row.id, "name": row.name, "price": float(row.price)}
            for row in result
        ]

    redis_client.setex(cache_key, 300, json.dumps(products))
    return products

def invalidate_category_cache(category_id: int) -> None:
    # Delete all paginated cache entries for this category
    pattern = f"products:category:{category_id}:*"
    keys = list(redis_client.scan_iter(match=pattern, count=100))
    if keys:
        redis_client.delete(*keys)
```

### 5. Cache Stampede Prevention with Lock

```python
import time
import uuid

def get_product_with_lock(product_id: int) -> dict:
    cache_key = f"product:{product_id}"
    lock_key = f"lock:{cache_key}"

    # Check cache
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Try to acquire lock
    lock_token = str(uuid.uuid4())
    lock_acquired = redis_client.set(lock_key, lock_token, nx=True, ex=10)

    if lock_acquired:
        try:
            # Fetch from DB
            product = fetch_product_from_db(product_id)
            if product:
                redis_client.setex(cache_key, 300, json.dumps(product))
            return product
        finally:
            # Release lock (only if we still own it)
            lua_script = """
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
            """
            redis_client.eval(lua_script, 1, lock_key, lock_token)
    else:
        # Wait and retry
        time.sleep(0.1)
        return get_product_with_lock(product_id)
```

### 6. Caching Aggregation Queries

```python
def get_sales_summary(start_date: str, end_date: str) -> dict:
    cache_key = f"sales:summary:{start_date}:{end_date}"

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    COUNT(*) as total_orders,
                    SUM(total) as revenue,
                    AVG(total) as avg_order_value
                FROM orders
                WHERE created_at BETWEEN :start AND :end
            """),
            {"start": start_date, "end": end_date}
        )
        row = result.fetchone()

    summary = {
        "total_orders": row.total_orders,
        "revenue": float(row.revenue) if row.revenue else 0,
        "avg_order_value": float(row.avg_order_value) if row.avg_order_value else 0,
    }

    # Cache for 5 minutes — aggregations don't need real-time freshness
    redis_client.setex(cache_key, 300, json.dumps(summary))
    return summary
```

### 7. Write-Through Cache

```python
def create_product_write_through(name: str, price: float, category_id: int) -> dict:
    with engine.begin() as conn:
        result = conn.execute(
            text("""
                INSERT INTO products (name, price, category_id)
                VALUES (:name, :price, :cat)
                RETURNING id, name, price
            """),
            {"name": name, "price": price, "cat": category_id}
        )
        row = result.fetchone()

    product = {"id": row.id, "name": row.name, "price": float(row.price)}

    # Populate cache immediately — no stale window
    redis_client.setex(f"product:{row.id}", 300, json.dumps(product))

    # Invalidate list caches that would include this product
    invalidate_category_cache(category_id)

    return product
```

### 8. Batch Cache Loading

```python
def get_products_batch(product_ids: list) -> dict:
    # Use MGET for batch cache lookup
    cache_keys = [f"product:{pid}" for pid in product_ids]
    cached_values = redis_client.mget(cache_keys)

    results = {}
    missing_ids = []

    for pid, cached in zip(product_ids, cached_values):
        if cached:
            results[pid] = json.loads(cached)
        else:
            missing_ids.append(pid)

    # Fetch missing from DB in a single query
    if missing_ids:
        with engine.connect() as conn:
            placeholders = ",".join(f":id{i}" for i in range(len(missing_ids)))
            params = {f"id{i}": pid for i, pid in enumerate(missing_ids)}
            result = conn.execute(
                text(f"SELECT id, name, price FROM products WHERE id IN ({placeholders})"),
                params
            )
            for row in result:
                product = {"id": row.id, "name": row.name, "price": float(row.price)}
                results[row.id] = product
                redis_client.setex(f"product:{row.id}", 300, json.dumps(product))

    return results
```

## How It Works

1. **Cache-aside**: The application checks the cache before querying the database. On a cache hit, the cached value is returned. On a miss, the database is queried, and the result is stored in the cache with a TTL.
2. **Invalidation**: When data changes (INSERT, UPDATE, DELETE), the application explicitly deletes the corresponding cache key. The next read fetches fresh data from the database and repopulates the cache.
3. **Cache stampede**: When a popular cache entry expires, many concurrent requests simultaneously hit the database. A Redis lock (`SET NX EX`) ensures only one request fetches from the database while others wait.
4. **Batch loading**: `MGET` fetches multiple cache entries in a single Redis command. Missing entries are fetched from the database in a single `WHERE id IN (...)` query.
5. **TTL as safety net**: Even with explicit invalidation, a TTL ensures stale data self-heals if an invalidation is missed (e.g., due to a bug or exception).

## Variants

### Cache with TTL Jitter

```python
import random

def set_with_jitter(key: str, value: str, base_ttl: int = 300):
    jitter = random.randint(0, 60)
    redis_client.setex(key, base_ttl + jitter, value)
```

### Read-Through Cache (Transparent)

```python
class ReadThroughCache:
    def __init__(self, redis_client, db_fetch_fn, ttl=300):
        self.redis = redis_client
        self.fetch_fn = db_fetch_fn
        self.ttl = ttl

    def get(self, key: str, *args, **kwargs):
        cached = self.redis.get(key)
        if cached:
            return json.loads(cached)

        value = self.fetch_fn(*args, **kwargs)
        if value is not None:
            self.redis.setex(key, self.ttl, json.dumps(value))
        return value

# Usage
product_cache = ReadThroughCache(
    redis_client,
    lambda pid: fetch_product_from_db(pid),
    ttl=300
)
product = product_cache.get(f"product:42", 42)
```

### Multi-Level Cache (L1 Memory + L2 Redis)

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_product_l1(product_id: int) -> dict:
    # L1: in-memory cache (per-process)
    cached = redis_client.get(f"product:{product_id}")
    if cached:
        return json.loads(cached)

    product = fetch_product_from_db(product_id)
    if product:
        redis_client.setex(f"product:{product_id}", 300, json.dumps(product))
    return product

# L1 hit: instant. L1 miss -> L2 (Redis) check -> L2 miss -> DB
```

### Cache with Stale-While-Revalidate

```python
def get_product_swr(product_id: int) -> dict:
    cache_key = f"product:{product_id}"
    stale_key = f"stale:{cache_key}"

    cached = redis_client.get(cache_key)
    if cached:
        # Check if stale (past TTL but still available)
        is_stale = redis_client.exists(stale_key)
        if is_stale:
            # Return stale data and trigger background refresh
            # In production, use a task queue (Celery, RQ) for the refresh
            pass
        return json.loads(cached)

    # Cache miss — fetch from DB
    product = fetch_product_from_db(product_id)
    if product:
        redis_client.setex(cache_key, 300, json.dumps(product))
        redis_client.setex(stale_key, 600, "1")  # Stale window: 5 extra minutes
    return product
```

## Best Practices

- **Cache at the right granularity**: Cache complete query results, not individual rows. One cache key per query + parameters.
- **Set TTL even with explicit invalidation**: TTL is a safety net. If invalidation fails, stale data self-heals.
- **Use `SETEX` instead of `SET` + `EXPIRE`**: `SETEX` is atomic — the key and TTL are set in one operation.
- **Invalidate list caches on writes**: When a product is created or deleted, invalidate category-level cache keys, not just the individual product key.
- **Use `MGET` for batch reads**: Fetching 100 products one by one is 100 Redis round-trips. `MGET` does it in one.
- **Monitor cache hit rate**: Below 50% means the cache is misconfigured or the workload isn't cacheable.

## Common Mistakes

- **Caching without a TTL**: If invalidation fails, stale data persists forever. Always set a TTL.
- **Invalidating too broadly**: Deleting `product:*` when one product changes clears the entire cache. Delete specific keys.
- **Not handling `None` results**: If the database returns `None`, caching it prevents repeated DB hits for non-existent keys. Use a sentinel value or short TTL for negative caching.
- **Cache key collisions**: Use descriptive, namespaced keys (`product:42`, not just `42`). Different queries with the same ID will collide.
- **Forgetting to invalidate after bulk operations**: `UPDATE products SET price = price * 1.1` changes all products but doesn't trigger per-key invalidation. Clear the pattern or bump a version.

## FAQ

**Cache-aside vs read-through — what's the difference?**

In cache-aside, the application code explicitly checks the cache and fetches from the database. In read-through, a cache layer transparently fetches from the database on miss. Cache-aside gives more control; read-through simplifies application code.

**How do I cache paginated queries?**

Include page number and page size in the cache key: `products:category:1:page:3:size:20`. When a product in the category changes, invalidate all pages with a pattern: `products:category:1:*`.

**Should I cache JOINs?**

Yes, if the JOIN is expensive and the result is consumed frequently. Cache the denormalized result. Invalidate when any of the joined tables change.

**What is negative caching?**

Caching the fact that a key doesn't exist (e.g., `product:999` returns `None`). This prevents repeated database queries for non-existent keys. Use a short TTL (30-60 seconds) to avoid caching non-existence for too long.

**How do I measure cache effectiveness?**

Track cache hits and misses. In Redis, use the `INFO stats` command to see `keyspace_hits` and `keyspace_misses`. Calculate hit rate: `hits / (hits + misses)`. A good hit rate is above 80%.
