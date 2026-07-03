---
contentType: patterns
slug: graceful-degradation-pattern
title: "Graceful Degradation Pattern"
description: "Degrade functionality instead of failing when dependencies are unavailable. Serve partial results, cached data, or fallback features to keep users running."
metaDescription: "Degrade functionality instead of failing when dependencies go down. Serve partial results, cached data, or fallback features to keep users running."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - graceful-degradation
  - pattern
  - design-pattern
  - resilience
  - fault-tolerance
  - fallback
  - partial-failure
relatedResources:
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/timeout-pattern
  - /patterns/design/bulkhead-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Degrade functionality instead of failing when dependencies go down. Serve partial results, cached data, or fallback features to keep users running."
  keywords:
    - graceful degradation pattern
    - design pattern
    - resilience pattern
    - fault tolerance
    - partial failure
    - fallback features
    - degrade functionality
---

# Graceful Degradation Pattern

## Overview

When a downstream dependency fails, the default behavior is to return an error to the user. Graceful degradation does the opposite: it detects the failure and serves a reduced-but-functional experience instead. If the recommendation service is down, show products without recommendations. If the search API times out, show cached results. If the payment gateway is unavailable, let users keep shopping and queue the payment for later.

The pattern wraps each external dependency with a fallback strategy. When the primary call fails (timeout, circuit breaker open, 5xx), the fallback kicks in. Fallbacks can be cached data, default values, a simplified version of the feature, or skipping the feature entirely while keeping the rest of the page working.

## When to Use

Use the Graceful Degradation Pattern when:
- Your application has optional features that enhance but are not critical to the core experience
- A single dependency failure should not take down the entire page or API response
- You serve different importance levels of data (critical vs nice-to-have)
- Examples: e-commerce product pages, news feeds, dashboards with multiple widgets, search interfaces

## Solution

### Python

```python
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Any
from enum import Enum
import time
import json

class ServiceStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"

@dataclass
class ServiceResult:
    data: Any
    status: ServiceStatus
    source: str
    degraded: bool = False
    error: Optional[str] = None

class GracefulDegradation:
    def __init__(self):
        self._cache: Dict[str, tuple] = {}

    def _cache_get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            data, timestamp = self._cache[key]
            if time.time() - timestamp < 300:
                return data
        return None

    def _cache_set(self, key: str, data: Any) -> None:
        self._cache[key] = (data, time.time())

    def call_with_fallback(
        self,
        service_name: str,
        primary_fn: Callable,
        fallback_fn: Optional[Callable] = None,
        default: Any = None,
        cache_key: Optional[str] = None,
    ) -> ServiceResult:
        try:
            result = primary_fn()
            if cache_key:
                self._cache_set(cache_key, result)
            return ServiceResult(data=result, status=ServiceStatus.HEALTHY, source=service_name)

        except Exception as e:
            if cache_key:
                cached = self._cache_get(cache_key)
                if cached is not None:
                    return ServiceResult(
                        data=cached, status=ServiceStatus.DEGRADED,
                        source=f"{service_name}:cache", degraded=True, error=str(e),
                    )

            if fallback_fn:
                try:
                    result = fallback_fn()
                    return ServiceResult(
                        data=result, status=ServiceStatus.DEGRADED,
                        source=f"{service_name}:fallback", degraded=True, error=str(e),
                    )
                except Exception as fe:
                    pass

            return ServiceResult(
                data=default, status=ServiceStatus.DOWN,
                source=f"{service_name}:default", degraded=True, error=str(e),
            )

    def aggregate(
        self,
        calls: Dict[str, Callable],
        defaults: Dict[str, Any] = None,
    ) -> Dict[str, ServiceResult]:
        defaults = defaults or {}
        results = {}
        for name, fn in calls.items():
            results[name] = self.call_with_fallback(
                service_name=name,
                primary_fn=fn,
                default=defaults.get(name),
                cache_key=name,
            )
        return results

# Usage
deg = GracefulDegradation()

def fetch_recommendations():
    raise ConnectionError("Recommendation service down")

def fetch_reviews():
    return [{"user": "alice", "rating": 5, "text": "Great product"}]

def fetch_inventory():
    raise TimeoutError("Inventory API timed out")

def fetch_product_details():
    return {"id": "P100", "name": "Wireless Headphones", "price": 99.99}

results = deg.aggregate(
    calls={
        "product_details": fetch_product_details,
        "recommendations": fetch_recommendations,
        "reviews": fetch_reviews,
        "inventory": fetch_inventory,
    },
    defaults={
        "recommendations": [],
        "inventory": {"in_stock": None, "message": "Check back later"},
    },
)

print("=== Page Assembly ===")
for name, result in results.items():
    status_icon = "OK" if not result.degraded else "DEGRADED"
    print(f"  [{status_icon}] {name}: source={result.source}")
    if result.error:
        print(f"         error: {result.error}")
    print(f"         data: {result.data}")
```

### JavaScript

```javascript
class ServiceResult {
  constructor(data, status, source, degraded = false, error = null) {
    this.data = data;
    this.status = status;
    this.source = source;
    this.degraded = degraded;
    this.error = error;
  }
}

class GracefulDegradation {
  constructor() {
    this.cache = new Map();
  }

  _cacheGet(key) {
    if (this.cache.has(key)) {
      const { data, timestamp } = this.cache.get(key);
      if (Date.now() / 1000 - timestamp < 300) return data;
    }
    return null;
  }

  _cacheSet(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() / 1000 });
  }

  callWithFallback(serviceName, primaryFn, fallbackFn = null, defaultVal = null, cacheKey = null) {
    try {
      const result = primaryFn();
      if (cacheKey) this._cacheSet(cacheKey, result);
      return new ServiceResult(result, "healthy", serviceName);
    } catch (e) {
      if (cacheKey) {
        const cached = this._cacheGet(cacheKey);
        if (cached !== null) {
          return new ServiceResult(cached, "degraded", `${serviceName}:cache`, true, e.message);
        }
      }
      if (fallbackFn) {
        try {
          const result = fallbackFn();
          return new ServiceResult(result, "degraded", `${serviceName}:fallback`, true, e.message);
        } catch (fe) {}
      }
      return new ServiceResult(defaultVal, "down", `${serviceName}:default`, true, e.message);
    }
  }

  aggregate(calls, defaults = {}) {
    const results = {};
    for (const [name, fn] of Object.entries(calls)) {
      results[name] = this.callWithFallback(name, fn, null, defaults[name] ?? null, name);
    }
    return results;
  }
}

// Usage
const deg = new GracefulDegradation();

const results = deg.aggregate(
  {
    product_details: () => ({ id: "P100", name: "Headphones", price: 99.99 }),
    recommendations: () => { throw new Error("Recommendation service down"); },
    reviews: () => [{ user: "alice", rating: 5, text: "Great" }],
    inventory: () => { throw new Error("Inventory API timed out"); },
  },
  {
    recommendations: [],
    inventory: { inStock: null, message: "Check back later" },
  }
);

console.log("=== Page Assembly ===");
for (const [name, result] of Object.entries(results)) {
  const icon = result.degraded ? "DEGRADED" : "OK";
  console.log(`  [${icon}] ${name}: source=${result.source}, data=${JSON.stringify(result.data)}`);
}
```

### Java

```java
import java.util.*;

public class GracefulDegradation {

    enum Status { HEALTHY, DEGRADED, DOWN }

    record ServiceResult(Object data, Status status, String source, boolean degraded, String error) {
        static ServiceResult healthy(Object data, String source) {
            return new ServiceResult(data, Status.HEALTHY, source, false, null);
        }
        static ServiceResult degraded(Object data, String source, String error) {
            return new ServiceResult(data, Status.DEGRADED, source, true, error);
        }
        static ServiceResult down(Object data, String source, String error) {
            return new ServiceResult(data, Status.DOWN, source, true, error);
        }
    }

    private final Map<String, long[]> cacheTimestamps = new HashMap<>();
    private final Map<String, Object> cacheData = new HashMap<>();

    Object cacheGet(String key) {
        if (cacheData.containsKey(key)) {
            if (System.currentTimeMillis() / 1000 - cacheTimestamps.get(key)[0] < 300) {
                return cacheData.get(key);
            }
        }
        return null;
    }

    void cacheSet(String key, Object data) {
        cacheData.put(key, data);
        cacheTimestamps.put(key, new long[]{System.currentTimeMillis() / 1000});
    }

    ServiceResult callWithFallback(String serviceName, java.util.function.Supplier<Object> primaryFn,
                                    Object defaultVal, String cacheKey) {
        try {
            Object result = primaryFn.get();
            if (cacheKey != null) cacheSet(cacheKey, result);
            return ServiceResult.healthy(result, serviceName);
        } catch (Exception e) {
            if (cacheKey != null) {
                Object cached = cacheGet(cacheKey);
                if (cached != null) {
                    return ServiceResult.degraded(cached, serviceName + ":cache", e.getMessage());
                }
            }
            return ServiceResult.down(defaultVal, serviceName + ":default", e.getMessage());
        }
    }

    public static void main(String[] args) {
        var deg = new GracefulDegradation();

        var results = new LinkedHashMap<String, ServiceResult>();
        results.put("product_details", deg.callWithFallback("product_details",
            () -> Map.of("id", "P100", "name", "Headphones", "price", 99.99), null, "product_details"));
        results.put("recommendations", deg.callWithFallback("recommendations",
            () -> { throw new RuntimeException("Recommendation service down"); }, List.of(), "recommendations"));
        results.put("reviews", deg.callWithFallback("reviews",
            () -> List.of(Map.of("user", "alice", "rating", 5)), null, "reviews"));
        results.put("inventory", deg.callWithFallback("inventory",
            () -> { throw new RuntimeException("Inventory API timed out"); },
            Map.of("inStock", "unknown", "message", "Check back later"), "inventory"));

        System.out.println("=== Page Assembly ===");
        results.forEach((name, result) -> {
            String icon = result.degraded() ? "DEGRADED" : "OK";
            System.out.printf("  [%s] %s: source=%s, data=%s%n", icon, name, result.source(), result.data());
        });
    }
}
```

## Explanation

The pattern works in three layers:

1. **Primary call**: Attempt the normal operation. If it succeeds, cache the result (if applicable) and return it as healthy.
2. **Cache fallback**: If the primary fails, check the cache for a recent result. If found, return it marked as degraded. The user gets slightly stale data instead of an error.
3. **Default fallback**: If there is no cache or the cache is expired, return a default value. This could be an empty list, a static message, or a simplified version of the feature.

The `aggregate` method runs multiple service calls independently. Each call degrades on its own without affecting the others. A product page where recommendations fail but reviews and details still load is a degraded but useful experience.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Feature flags** | Disable a feature entirely via flag when its backend is down | Controlled degradation without code changes |
| **Queue and defer** | Queue user actions for later processing when a dependency is down | Payments, email sends, notifications |
| **Simplified UI** | Hide broken widgets and rearrange the page | Dashboards, portals with many widgets |
| **Read-only mode** | Allow reading but block writes when the database is unavailable | CMS, collaboration tools during outages |

## What Works

- **Cache successful results** so you have fallback data when the service fails
- **Mark degraded responses** so the UI can show a banner or indicator
- **Degrade per-feature** not per-page; one failing service should not break the whole page
- **Set cache TTLs** so stale data does not persist indefinitely
- **Log degradation events** to track which services fail most often
- **Test fallback paths** in staging by deliberately breaking dependencies

## Common Mistakes

- Treating all features as critical, so any failure returns a full error page
- Not caching successful results, leaving no fallback data available
- Showing errors to users instead of silently degrading non-critical features
- Not setting cache TTLs, serving indefinitely stale data
- Fallback functions that themselves call another failing dependency
- Not logging degradation events, making it hard to identify weak services

## Frequently Asked Questions

**Q: How do I decide which features are degradable?**
A: Ask: if this feature is missing, can the user still complete their primary task? If yes, it is degradable. Product details and cart are critical. Recommendations and related articles are degradable.

**Q: Should I tell the user that data is stale?**
A: For non-critical features, silent degradation is fine. For data that affects decisions (pricing, inventory, availability), show a subtle indicator like "Showing cached data, some info may be outdated."

**Q: What is the difference between graceful degradation and circuit breaker?**
A: Circuit breaker prevents calls to a failing service to avoid cascading failures. Graceful degradation defines what to serve instead when the call fails. They work together: the circuit breaker trips, and the degradation fallback serves cached or default data.

**Q: How long should I cache fallback data?**
A: Match the cache TTL to how stale the data can be without causing problems. Product recommendations can be cached for hours. Pricing data maybe only minutes. Set the TTL based on business requirements, not technical convenience.
