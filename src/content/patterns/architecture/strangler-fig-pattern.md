---
contentType: patterns
slug: strangler-fig-pattern
title: "Strangler Fig Pattern: Gradually Replace Legacy by Intercepting Routes"
description: "How to gradually replace a legacy system by intercepting routes and routing traffic to new services. Covers strangler fig, incremental migration, and cutover."
metaDescription: "Gradually replace a legacy system by intercepting routes and routing traffic to new services. Learn strangler fig, incremental migration, and cutover strategy."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - migration
  - legacy
  - strangler-fig
  - pattern
category: architectural
relatedResources:
  - /patterns/modular-monolith-pattern
  - /patterns/anti-corruption-layer-pattern
  - /patterns/backends-for-frontends-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Gradually replace a legacy system by intercepting routes and routing traffic to new services. Learn strangler fig, incremental migration, and cutover strategy."
  keywords:
    - architecture
    - migration
    - legacy
    - strangler-fig
    - pattern
---

## Overview

The strangler fig pattern gradually replaces a legacy system by intercepting its routes and routing traffic to new services. Instead of a risky big-bang rewrite, you build new functionality alongside the old system. A routing layer (API gateway, reverse proxy) decides which requests go to the new service and which fall through to the legacy system. Over time, more and more routes move to the new system. When the legacy system handles no traffic, it can be safely decommissioned. The pattern is named after the strangler fig tree, which grows around a host tree and eventually replaces it.

## When to Use

- Migrating a monolith to microservices incrementally
- Replacing a legacy system without a big-bang rewrite
- Modernizing an old codebase while continuing to deliver features
- When the legacy system is too risky to replace all at once
- When you need to maintain production stability during migration

## When NOT to Use

- Greenfield projects with no legacy to replace
- Systems small enough to rewrite in one sprint
- When the legacy system is already decommissioned
- When the routing layer adds unacceptable latency

## Solution

### Routing layer with Nginx

```nginx
# nginx.conf — Strangler fig routing: new service for some routes, legacy for others
upstream legacy_app {
    server legacy-app:3000;
}

upstream new_service {
    server new-service:8080;
}

server {
    listen 80;
    server_name api.shop.com;

    # Routes already migrated to the new service
    location /api/v2/customers {
        proxy_pass http://new_service;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    location /api/v2/orders {
        proxy_pass http://new_service;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    # Everything else goes to the legacy app
    location / {
        proxy_pass http://legacy_app;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

### Feature flag-based routing

```python
# strangler_router.py — route requests based on feature flags
from flask import Flask, request, Response
import requests
import os

app = Flask(__name__)

LEGACY_URL = os.environ["LEGACY_URL"]
NEW_SERVICE_URL = os.environ["NEW_SERVICE_URL"]

# Routes that have been migrated to the new service
MIGRATED_ROUTES = {
    ("GET", "/api/customers"),
    ("GET", "/api/customers/<id>"),
    ("POST", "/api/customers"),
    ("PUT", "/api/customers/<id>"),
    ("DELETE", "/api/customers/<id>"),
    ("GET", "/api/orders"),
    ("POST", "/api/orders"),
}

# Percentage of traffic to route to new service (for canary testing)
CANARY_PERCENTAGE = 10

def is_migrated(method, path):
    """Check if a route has been fully migrated."""
    # Normalize path (remove trailing slashes, extract pattern)
    normalized = path.rstrip("/")
    for m, p in MIGRATED_ROUTES:
        if method == m and normalized.startswith(p.replace("<id>", "")):
            return True
    return False

def is_canary_eligible():
    """Determine if this request should go to the new service for canary."""
    import random
    return random.randint(1, 100) <= CANARY_PERCENTAGE

@app.route("/api/<path:route>", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
def strangler_route(route):
    method = request.method
    path = f"/api/{route}"

    target_url = None

    if is_migrated(method, path):
        target_url = NEW_SERVICE_URL
    elif is_canary_eligible():
        target_url = NEW_SERVICE_URL
    else:
        target_url = LEGACY_URL

    # Forward the request
    resp = requests.request(
        method=method,
        url=f"{target_url}{path}",
        headers={k: v for k, v in request.headers if k.lower() != 'host'},
        data=request.get_data(),
        params=request.args,
        allow_redirects=False
    )

    # Add strangler header for observability
    response = Response(resp.content, resp.status_code, resp.headers.items())
    response.headers["X-Strangler-Target"] = "new" if target_url == NEW_SERVICE_URL else "legacy"
    return response
```

### Java Spring Cloud Gateway

```java
// StranglerGateway.java — Spring Cloud Gateway for strangler fig routing
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StranglerGateway {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
            // Migrated routes -> new service
            .route("customers-new", r -> r
                .path("/api/customers/**")
                .uri("http://new-service:8080"))
            .route("orders-new", r -> r
                .path("/api/orders/**")
                .uri("http://new-service:8080"))
            .route("products-new", r -> r
                .path("/api/products/**")
                .uri("http://new-service:8080"))
            // Everything else -> legacy
            .route("legacy-fallback", r -> r
                .path("/**")
                .uri("http://legacy-app:3000"))
            .build();
    }
}
```

### Incremental migration with shadow traffic

```python
# shadow_traffic.py — send traffic to both old and new, compare results
import requests
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class ShadowTrafficRouter:
    """Send requests to both legacy and new service.
    Return the legacy response, but log differences with the new service."""

    def __init__(self, legacy_url, new_url):
        self.legacy_url = legacy_url
        self.new_url = new_url

    def route(self, method, path, headers, body, params):
        # Send to legacy (primary)
        legacy_response = requests.request(
            method=method,
            url=f"{self.legacy_url}{path}",
            headers=headers,
            data=body,
            params=params
        )

        # Shadow send to new service (don't wait for it)
        def shadow_call():
            try:
                new_response = requests.request(
                    method=method,
                    url=f"{self.new_url}{path}",
                    headers=headers,
                    data=body,
                    params=params,
                    timeout=5
                )
                self._compare(legacy_response, new_response, path)
            except Exception as e:
                logger.warning(f"Shadow call failed for {path}: {e}")

        # Run shadow call in background
        with ThreadPoolExecutor(max_workers=1) as executor:
            executor.submit(shadow_call)

        return legacy_response

    def _compare(self, legacy_resp, new_resp, path):
        if legacy_resp.status_code != new_resp.status_code:
            logger.warning(
                f"Status mismatch for {path}: "
                f"legacy={legacy_resp.status_code}, new={new_resp.status_code}"
            )

        if legacy_resp.json() != new_resp.json():
            logger.info(f"Response body differs for {path} — investigating")
```

### Cutover checklist

```python
# cutover.py — track migration progress and cutover readiness
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class RouteMigration:
    method: str
    path: str
    status: str  # "legacy", "shadow", "canary", "migrated", "verified"
    legacy_latency_ms: float
    new_latency_ms: float
    error_rate_legacy: float
    error_rate_new: float

class CutoverTracker:
    def __init__(self):
        self.routes: List[RouteMigration] = []

    def add_route(self, route: RouteMigration):
        self.routes.append(route)

    def migration_progress(self) -> dict:
        total = len(self.routes)
        migrated = sum(1 for r in self.routes if r.status == "migrated")
        verified = sum(1 for r in self.routes if r.status == "verified")
        in_progress = sum(1 for r in self.routes if r.status in ("shadow", "canary"))

        return {
            "total_routes": total,
            "migrated": migrated,
            "verified": verified,
            "in_progress": in_progress,
            "still_legacy": total - migrated - verified - in_progress,
            "progress_pct": (migrated + verified) / total * 100 if total else 0
        }

    def ready_for_cutover(self) -> bool:
        """All routes must be verified before legacy can be decommissioned."""
        return all(r.status == "verified" for r in self.routes)

    def cutover_report(self) -> str:
        progress = self.migration_progress()
        report = f"""
        === Strangler Fig Cutover Report ===
        Total routes: {progress['total_routes']}
        Migrated:     {progress['migrated']}
        Verified:     {progress['verified']}
        In progress:  {progress['in_progress']}
        Still legacy: {progress['still_legacy']}
        Progress:     {progress['progress_pct']:.1f}%
        Ready for cutover: {'YES' if self.ready_for_cutover() else 'NO'}
        """
        return report
```

## Variants

### Branch by abstraction

```python
# branch_by_abstraction.py — swap implementations behind a common interface
from abc import ABC, abstractmethod

class PaymentService(ABC):
    @abstractmethod
    def charge(self, customer_id: str, amount: float) -> dict:
        pass

class LegacyPaymentService(PaymentService):
    def charge(self, customer_id: str, amount: float) -> dict:
        # Legacy implementation
        return {"processor": "legacy", "status": "charged", "amount": amount}

class NewPaymentService(PaymentService):
    def charge(self, customer_id: str, amount: float) -> dict:
        # New implementation
        return {"processor": "stripe", "status": "charged", "amount": amount}

class PaymentServiceFactory:
    @staticmethod
    def create(use_new: bool = False) -> PaymentService:
        if use_new:
            return NewPaymentService()
        return LegacyPaymentService()

# Usage — switch by config flag
service = PaymentServiceFactory.create(use_new=True)
result = service.charge("cust_123", 99.99)
```

### Parallel run with comparison

```python
# parallel_run.py — run both systems and compare results before cutover
class ParallelRun:
    def __init__(self, legacy, new, tolerance=0.01):
        self.legacy = legacy
        self.new = new
        self.tolerance = tolerance  # acceptable difference
        self.mismatches = []

    def execute(self, operation, *args, **kwargs):
        legacy_result = operation(self.legacy, *args, **kwargs)
        new_result = operation(self.new, *args, **kwargs)

        if not self._results_match(legacy_result, new_result):
            self.mismatches.append({
                "operation": operation.__name__,
                "legacy": legacy_result,
                "new": new_result
            })

        return legacy_result  # return legacy result for safety

    def _results_match(self, a, b):
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return abs(a - b) <= self.tolerance * max(abs(a), abs(b), 1)
        return a == b
```

## Best Practices

- Start with read-only routes — they're safer to migrate than write operations
- Use shadow traffic before cutover — send requests to both systems and compare
- Migrate one route at a time — small, reversible steps
- Monitor latency and error rates — the new service should match or beat the legacy
- Keep the routing layer simple — it's the critical path; don't add business logic
- Plan for rollback — if the new service fails, route traffic back to legacy
- Track migration progress — maintain a dashboard of migrated vs legacy routes
- Decommission only when all routes are verified — don't leave the legacy running "just in case"

## Common Mistakes

- **Migrating write operations first**: writes are riskier than reads. Start with GET endpoints.
- **No shadow traffic**: cutover without comparing old and new responses. Differences go unnoticed.
- **Big-bang cutover**: migrating all routes at once. If something breaks, everything breaks.
- **Routing layer complexity**: adding business logic to the gateway. Keep it as a pure router.
- **No rollback plan**: if the new service fails, there's no way to route back to legacy quickly.

## FAQ

### What is the strangler fig pattern?

A migration pattern where a new system gradually replaces a legacy system. A routing layer intercepts requests and sends some to the new system while others fall through to the legacy. Over time, more routes move to the new system until the legacy can be decommissioned.

### How is strangler fig different from a big-bang rewrite?

Big-bang replaces the entire system at once — high risk, long timeline. Strangler fig replaces one route at a time — low risk, continuous delivery. You can stop the migration at any point and the system still works.

### What is shadow traffic?

Sending the same request to both the legacy and new system, but only returning the legacy response. The new system's response is compared for correctness. This validates the new system without affecting users.

### When should I use the strangler fig pattern?

When migrating a legacy system that's too risky to replace all at once. When you need to keep delivering features during the migration. When you want to validate the new system with real traffic before cutover.

### How do I handle data migration with strangler fig?

Each migrated route needs access to the new system's database. During transition, either sync data between old and new databases (CDC), or have the new service read from the legacy database temporarily. Plan the data migration as carefully as the code migration.
