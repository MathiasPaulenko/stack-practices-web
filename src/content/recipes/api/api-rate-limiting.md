---
contentType: recipes
slug: api-rate-limiting
title: "API Rate Limiting"
description: "Protect APIs from abuse and ensure fair resource usage with token bucket, sliding window, and leaky bucket rate limiting."
metaDescription: "API rate limiting strategies: token bucket, sliding window, leaky bucket algorithms, Redis-based rate limiters, and distributed rate limiting."
difficulty: intermediate
topics:
  - api
tags:
  - rate-limiting
  - api
  - redis
  - security
relatedResources:
  - /guides/api-security-checklist-guide
  - /recipes/api-rate-limiting-redis
  - /guides/web-application-security-guide
  - /recipes/rate-limiting
  - /docs/api-deprecation-notice-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "API rate limiting strategies: token bucket, sliding window, leaky bucket algorithms, Redis-based rate limiters, and distributed rate limiting."
  keywords:
    - rate-limiting
    - api
    - redis
    - security
---
## Overview

Rate limiting protects APIs from abuse and ensures fair resource distribution. See [API Rate Limiting with Redis](/recipes/api/api-rate-limiting-redis) for a complete Redis-based implementation and [API Security Checklist](/guides/security/api-security-checklist-guide) for broader security practices.

## When to Use

Use this resource when:
- Public APIs need protection against brute force and scraping
- Different user tiers require different rate limits
- Multiple API nodes must share rate limit state consistently

## Solution

### Python

```python
# Add your Python solution here
```

### JavaScript

```javascript
// Add your JavaScript solution here
```

### Java

```java
// Add your Java solution here
```

## Explanation

[Explain how it works, edge cases, and trade-offs.]

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| [Technology] | [Approach] | [Notes] |

## Best Practices

1. Use token bucket for controlled bursts and sliding window for strict limits
2. Return `Retry-After` headers with 429 responses so clients know when to retry
3. Rate limit by user ID, not just IP, to avoid blocking legitimate users behind NAT
4. Log rate limit violations for security monitoring and abuse detection
5. Implement [circuit breaker](/patterns/design/circuit-breaker-pattern) around Redis to fail open if the cache is down

## Common Mistakes

1. Rate limiting only by IP, which blocks legitimate users behind NAT
2. Not handling Redis failures gracefully, causing API outages
3. Returning 429 without `Retry-After` headers, leaving clients guessing
4. Using the same rate limit for all endpoints regardless of cost or sensitivity
5. Ignoring rate limit violations instead of logging them for security analysis

## Frequently Asked Questions

### Question 1?

Answer 1.

### Question 2?

Answer 2.

### Question 3?

Answer 3.
