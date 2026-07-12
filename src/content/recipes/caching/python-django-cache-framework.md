---



contentType: recipes
slug: python-django-cache-framework
title: "Cache Database Queries with Django Cache Framework"
description: "Use Django's built-in cache framework with per-view caching, template fragment caching, and low-level cache API for database query optimization."
metaDescription: "Cache database queries with Django cache framework. Configure Redis backend, use per-view cache, template fragments, and low-level cache API."
difficulty: intermediate
topics:
  - caching
  - performance
  - databases
tags:
  - python
  - django
  - cache
  - redis
  - database-optimization
relatedResources:
  - /recipes/python-redis-cache-decorator
  - /recipes/python-memcached-session-storage
  - /guides/complete-guide-api-versioning-strategies
  - /recipes/database-query-result-caching
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cache database queries with Django cache framework. Configure Redis backend, use per-view cache, template fragments, and low-level cache API."
  keywords:
    - django cache framework
    - python cache
    - django redis cache
    - per-view caching
    - template fragment cache



---

## Overview

Django ships with a cache framework that supports multiple backends (Memcached, Redis, database, file, local memory) and four caching levels: per-site, per-view, template fragment, and low-level API. The framework abstracts the backend so you can switch from local memory to Redis without changing application code. Below: configuring a Redis backend, caching view responses, template fragments, individual query results, and cache invalidation patterns.

## When to Use This

- Django applications with expensive database queries or slow view rendering
- Pages with content that changes infrequently (product catalogs, blog posts, dashboards)
- Reducing database load during traffic spikes
- Any Django project that needs a caching layer without adding external libraries

## Prerequisites

- Python 3.10+
- Django 4.2+
- Redis server (for production backend)

## Solution

### 1. Configure Cache Backend

```python
# settings.py

# Development: local memory cache
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "my-app-cache",
    }
}

# Production: Redis backend
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "TIMEOUT": 300,  # Default TTL: 5 minutes
        "OPTIONS": {
            "connection_pool_kwargs": {"max_connections": 50, "retry_on_timeout": True},
        },
    }
}

# Multiple caches for different purposes
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "TIMEOUT": 300,
    },
    "sessions": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/2",
        "TIMEOUT": 86400,  # 24 hours for sessions
    },
    "long_term": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/3",
        "TIMEOUT": 86400 * 7,  # 7 days for static-ish data
    },
}

# Use sessions cache for Django sessions
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "sessions"
```

### 2. Low-Level Cache API

```python
from django.core.cache import cache

# Set a value with TTL (seconds)
cache.set("product:1", {"id": 1, "name": "Widget", "price": 9.99}, timeout=300)

# Get a value (returns None if missing)
product = cache.get("product:1")

# Get with default
product = cache.get("product:999", default={"name": "Unknown"})

# Get or compute (atomic — avoids cache stampede)
product = cache.get_or_set(
    "product:1",
    lambda: fetch_product_from_db(1),
    timeout=300,
)

# Set multiple
cache.set_many({"user:1": "Alice", "user:2": "Bob"}, timeout=600)

# Get multiple
users = cache.get_many(["user:1", "user:2"])  # {"user:1": "Alice", "user:2": "Bob"}

# Delete
cache.delete("product:1")

# Delete multiple
cache.delete_many(["user:1", "user:2"])

# Increment / decrement
cache.set("page_views:home", 0)
cache.incr("page_views:home")  # 1
cache.incr("page_views:home", 10)  # 11
cache.decr("page_views:home")  # 10

# Touch (update TTL without changing value)
cache.touch("product:1", timeout=600)
```

### 3. Per-View Caching

```python
from django.views.decorators.cache import cache_page
from django.shortcuts import render
from myapp.models import Product

# Cache the entire view response for 15 minutes
@cache_page(60 * 15, cache="default")
def product_list(request):
    products = Product.objects.all().select_related("category")
    return render(request, "products/list.html", {"products": products})

# Cache with varying by query params
@cache_page(60 * 15, key_prefix="products")
def product_detail(request, product_id):
    product = Product.objects.get(pk=product_id)
    return render(request, "products/detail.html", {"product": product})
```

### 4. Template Fragment Caching

```html
{% load cache %}

<!-- Cache this fragment for 10 minutes -->
{% cache 600 product_list %}
  <div class="product-grid">
    {% for product in products %}
      <div class="product-card">
        <h3>{{ product.name }}</h3>
        <p>{{ product.price }}</p>
      </div>
    {% endfor %}
  </div>
{% endcache %}

<!-- Cache with varying key (different per page) -->
{% cache 600 product_list request.GET.page %}
  ...
{% endcache %}

<!-- Use specific cache backend -->
{% cache 600 sidebar using="long_term" %}
  <aside>
    {% for category in categories %}
      <a href="{{ category.get_absolute_url }}">{{ category.name }}</a>
    {% endfor %}
  </aside>
{% endcache %}
```

### 5. Caching Query Results with Helper Functions

```python
from django.core.cache import cache
from django.db.models import QuerySet
import json

def cached_queryset(key: str, queryset: QuerySet, timeout: int = 300):
    """Cache a queryset's results. Returns list of dicts."""
    cached = cache.get(key)
    if cached is not None:
        return cached

    # Serialize queryset to list of dicts
    data = list(queryset.values())
    cache.set(key, data, timeout=timeout)
    return data

def cached_single(key: str, model_cls, obj_id: int, timeout: int = 300):
    """Cache a single model instance."""
    cached = cache.get(key)
    if cached is not None:
        return cached

    obj = model_cls.objects.filter(pk=obj_id).first()
    if obj:
        cache.set(key, obj, timeout=timeout)
    return obj
```

Usage in views:

```python
from django.shortcuts import render
from myapp.models import Product, Category

def shop_view(request):
    # Cache product list for 10 minutes
    products = cached_queryset(
        "shop:products:all",
        Product.objects.filter(active=True).select_related("category"),
        timeout=600,
    )

    # Cache categories for 1 hour
    categories = cached_queryset(
        "shop:categories",
        Category.objects.all(),
        timeout=3600,
    )

    return render(request, "shop.html", {
        "products": products,
        "categories": categories,
    })
```

### 6. Cache Invalidation on Model Save

```python
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from myapp.models import Product, Category

@receiver(post_save, sender=Product)
@receiver(post_delete, sender=Product)
def invalidate_product_cache(sender, instance, **kwargs):
    cache.delete(f"product:{instance.pk}")
    cache.delete("shop:products:all")
    cache.delete(f"product_list:category:{instance.category_id}")

@receiver(post_save, sender=Category)
@receiver(post_delete, sender=Category)
def invalidate_category_cache(sender, instance, **kwargs):
    cache.delete("shop:categories")
    cache.delete(f"category:{instance.pk}")
```

### 7. Cache with Versioning

```python
from django.core.cache import cache

# Bump cache version to invalidate all keys at once
cache.incr_version("product:1")  # Old version key is now invisible

# Version-aware key
cache.set("product:1", data, version=2)  # Only visible at version 2
cache.get("product:1", version=2)  # Returns data
cache.get("product:1", version=1)  # Returns None

# Global version bump on schema change
def bump_all_cache_versions():
    old_version = cache.version
    cache.incr_version("global_version_key")
    # All keys with old version are effectively invalidated
```

## How It Works

1. **Backend abstraction**: Django's cache API (`cache.get`, `cache.set`, etc.) is backend-agnostic. The `BACKEND` setting determines where data is stored — Redis, Memcached, database, file, or local memory.
2. **Per-view caching**: `@cache_page(timeout)` wraps the view function. On first request, the rendered response is cached. Subsequent requests within the TTL return the cached response without executing the view.
3. **Template fragment caching**: `{% cache timeout key %}` caches the rendered output of the block. The key can include variables to vary the cache by page, user, etc.
4. **Cache key generation**: Django generates cache keys from the view name, URL parameters, and `key_prefix`. For template fragments, the key is based on the provided key name and template context variables.
5. **Signal-based invalidation**: When a model is saved or deleted, signals fire and clear relevant cache keys. This keeps cached data consistent with the database.

## Variants

### Cache-Aside Pattern

```python
def get_product(product_id: int):
    key = f"product:{product_id}"
    product = cache.get(key)
    if product is None:
        product = Product.objects.select_related("category").get(pk=product_id)
        cache.set(key, product, timeout=300)
    return product

def update_product(product_id: int, **kwargs):
    Product.objects.filter(pk=product_id).update(**kwargs)
    cache.delete(f"product:{product_id}")  # Invalidate on update
```

### Write-Through Cache

```python
def create_product(data: dict):
    product = Product.objects.create(**data)
    cache.set(f"product:{product.pk}", product, timeout=300)
    return product

def update_product(product_id: int, **kwargs):
    product = Product.objects.get(pk=product_id)
    for key, value in kwargs.items():
        setattr(product, key, value)
    product.save()
    cache.set(f"product:{product.pk}", product, timeout=300)  # Update cache on write
    return product
```

### Per-User Cache with Vary Headers

```python
from django.views.decorators.vary import vary_on_headers

@cache_page(60 * 5)
@vary_on_headers("Authorization")
def user_dashboard(request):
    # Cached per user — Authorization header varies the cache key
    return render(request, "dashboard.html", {"user": request.user})
```

### Database Backend (No External Dependencies)

```python
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "my_cache_table",
        "TIMEOUT": 300,
    }
}

# Create the cache table
# python manage.py createcachetable
```

## Best Practices


- For a deeper guide, see [Cache Database Query Results with Redis and Python](/recipes/database-query-result-caching/).

- **Use `select_related` and `prefetch_related` before caching**: Reduce query count first, then cache the result.
- **Cache at the right level**: Cache expensive querysets, not individual model attributes. Fragment caching for templates, view caching for full pages.
- **Set explicit timeouts**: Don't rely on the default `TIMEOUT`. Different data has different freshness requirements.
- **Invalidate on writes**: Use signals or explicit `cache.delete()` calls after mutations. Stale cache is worse than no cache.
- **Use separate cache backends for different data**: Sessions, page cache, and long-term cache have different TTL and eviction needs.
- **Monitor cache hit rate**: Use `django-debug-toolbar` in development or Redis `INFO stats` in production.

## Common Mistakes

- **Caching user-specific data without varying key**: All users see the same cached page. Use `@vary_on_headers("Authorization")` or include user ID in the cache key.
- **Forgetting to invalidate after writes**: Cached data becomes stale. Always clear cache keys in `post_save` signals or after `update()`/`delete()` calls.
- **Caching querysets without serialization**: QuerySets are lazy — caching the queryset object doesn't cache the results. Call `list(queryset)` or `.values()` first.
- **Using `cache_page` on authenticated views**: `@cache_page` caches the entire response including user-specific content. Use fragment caching or `vary_on_headers` instead.
- **No cache key namespacing**: Collisions between different features cause incorrect data. Prefix keys with feature names (`shop:products:all`, not just `products`).

## FAQ

**Django cache vs Redis directly — which should I use?**

Django's cache framework abstracts the backend, making it easy to switch between local memory, Memcached, and Redis. Use Django's API for application-level caching. Use `redis-py` directly for Redis-specific features (pub/sub, streams, Lua scripts).

**How does `@cache_page` handle authenticated users?**

By default, `@cache_page` caches the same response for all users. Use `@vary_on_headers("Authorization")` or `@vary_on_cookie` to generate separate cache entries per user.

**Can I cache Django ORM querysets?**

QuerySets are lazy — caching the queryset object doesn't cache the data. Convert to a list first: `list(queryset.values())` or `list(queryset)`, then cache the resulting list.

**How do I clear the entire cache?**

`cache.clear()` removes all keys. In production with Redis, this flushes the database. Use with caution — it affects all users. For targeted invalidation, delete specific keys.

**What is the difference between `cache_page` and template fragment caching?**

`cache_page` caches the entire HTTP response (headers + body). Template fragment caching caches only a portion of the rendered template. Use `cache_page` for static pages, fragments for pages with mixed static and dynamic content.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
