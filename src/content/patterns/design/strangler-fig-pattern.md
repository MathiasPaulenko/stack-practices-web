---
contentType: patterns
slug: strangler-fig-pattern
title: "Strangler Fig Pattern"
description: "Incrementally migrate functionality from a legacy system to a new system by intercepting calls and routing them, eventually replacing the old system entirely."
metaDescription: "Learn the Strangler Fig Pattern for incremental legacy migration. Examples in Python, Java, and JavaScript with API gateways, proxies, and feature toggles."
difficulty: intermediate
topics:
  - design
  - architecture
  - devops
tags:
  - strangler-fig
  - pattern
  - design-pattern
  - legacy-migration
  - refactoring
  - microservices
  - api-gateway
relatedResources:
  - /patterns/design/anti-corruption-layer-pattern
  - /patterns/design/database-per-service-pattern
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Learn the Strangler Fig Pattern for incremental legacy migration. Examples in Python, Java, and JavaScript with API gateways, proxies, and feature toggles."
  keywords:
    - strangler fig
    - design pattern
    - legacy migration
    - refactoring
    - microservices
    - api gateway
    - incremental migration
---

# Strangler Fig Pattern

## Overview

The Strangler Fig Pattern enables incremental migration from a legacy system to a new system by gradually replacing pieces of functionality rather than performing a risky big-bang rewrite. An intermediary layer intercepts requests and routes them to either the legacy system or the new system.

Over time, as more capabilities migrate to the new system, the legacy system shrinks until it can be fully decommissioned. This minimizes risk by allowing teams to validate each component in production before moving on.

## When to Use

- Migrating from a monolithic legacy application to microservices
- Replacing an old technology stack without a risky rewrite
- Modernizing a system where requirements are still evolving
- Need to deliver new capabilities in the new system while maintaining the legacy one

## When to Avoid

- The legacy system is small enough for direct replacement
- The team lacks capacity to maintain both systems in parallel
- Network latency from a routing layer is unacceptable

## Solution

### Python (Flask Proxy)

```python
from flask import Flask, request, jsonify
import requests
import os

class StranglerRouter:
    def __init__(self):
        self.legacy = os.getenv('LEGACY_API', 'http://legacy:8080')
        self.new = os.getenv('NEW_API', 'http://new-service:8080')
        self.routes = {
            '/api/users': 'new',
            '/api/orders': 'new',
            '/api/inventory': 'legacy',
        }

    def route(self, path, method, data=None, headers=None):
        target = self.routes.get(path, 'legacy')
        base = self.new if target == 'new' else self.legacy
        url = f"{base}{path}"
        response = requests.request(method, url, json=data, headers=headers)
        return response.json(), response.status_code

app = Flask(__name__)
router = StranglerRouter()

@app.route('/api/<path:path>')
def api_gateway(path):
    data = request.get_json() if request.is_json else None
    body, status = router.route(f"/api/{path}", request.method, data)
    return jsonify(body), status
```

### Java (Spring Cloud Gateway)

```java
@Configuration
public class StranglerGatewayConfig {
    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("users", r -> r.path("/api/users/**")
                .uri("http://new-users-service:8080"))
            .route("legacy", r -> r.path("/**")
                .uri("http://legacy-system:8080"))
            .build();
    }
}
```

### JavaScript (Express Proxy)

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Migrated routes
app.use('/api/users', createProxyMiddleware({
    target: 'http://new-users-service:8080',
    changeOrigin: true
}));

// Everything else goes to legacy
app.use('/', createProxyMiddleware({
    target: 'http://legacy-system:8080',
    changeOrigin: true
}));

app.listen(3000);
```

## Explanation

The intermediary layer (gateway/proxy) routes requests:

1. **Identify a bounded context** within the legacy system to migrate
2. **Build the new service** with equivalent functionality
3. **Update the router** to send traffic for that context to the new service
4. **Validate** the new service handles production traffic correctly
5. **Repeat** until the legacy system is fully replaced
6. **Decommission** the legacy system

## Variants

| Variant | Approach | Best For |
|---------|----------|----------|
| API Gateway | Route by path prefix | Microservices migration |
| Proxy server | NGINX/Apache rewrite rules | Simple URL-based routing |
| Feature toggle | Live routing per request | Gradual user migration |
| Database sync | Dual-write during transition | Data layer migration |

## What Works

- Start with low-risk, read-only endpoints
- Implement shadow traffic to compare responses
- Maintain backward compatibility in APIs
- Monitor both old and new systems during transition
- Keep rollback capability until the new system is proven

## Common Mistakes

- Migrating too much at once without validation
- Not monitoring the new system under production load
- Breaking data contracts between old and new systems
- Removing the legacy system before the new one is fully operational

## Real-World Examples

### Amazon

Amazon famously migrated from a monolithic C++ application to service-oriented architecture incrementally using proxies and wrappers around legacy functionality.

### UK Government Digital Service

The GOV.UK platform was built alongside the existing government websites, gradually replacing them domain by domain until the old sites could be shut down.

## Frequently Asked Questions

**Q: How long does a strangler fig migration take?**
A: Months to years depending on system size. The key is that the system is functional and improving throughout the process.

**Q: What if the legacy and new systems use different databases?**
A: Implement an anti-corruption layer and consider dual-write strategies during the transition period.

**Q: Can I use this for frontend migration?**
A: Yes — route pages or components to new implementations while keeping the old app shell.
