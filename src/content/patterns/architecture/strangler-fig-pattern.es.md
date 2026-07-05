---
contentType: patterns
slug: strangler-fig-pattern
title: "Patrón Strangler Fig: Reemplaza Legacy Gradualmente Interceptando Routes"
description: "Cómo reemplazar gradualmente un legacy system interceptando routes y routeando traffic a new services. Cubre strangler fig, incremental migration, y cutover."
metaDescription: "Reemplaza gradualmente un legacy system interceptando routes y routeando traffic a new services. Aprende strangler fig, incremental migration, y cutover strategy."
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
  metaDescription: "Reemplaza gradualmente un legacy system interceptando routes y routeando traffic a new services. Aprende strangler fig, incremental migration, y cutover strategy."
  keywords:
    - architecture
    - migration
    - legacy
    - strangler-fig
    - pattern
---

## Overview

El strangler fig pattern reemplaza gradualmente un legacy system interceptando sus routes y routeando traffic a new services. En vez de un risky big-bang rewrite, buildéas new functionality alongside el old system. Un routing layer (API gateway, reverse proxy) decide qué requests van al new service y cuáles fall through al legacy system. Over time, más y más routes se mueven al new system. Cuando el legacy system handlea no traffic, puede ser safely decommissioned. El pattern se nombra después del strangler fig tree, que crece around un host tree y eventualmente lo replacea.

## When to Use

- Migrando un monolith a microservices incrementalmente
- Reemplazando un legacy system sin un big-bang rewrite
- Modernizando un old codebase mientras continuás deliverando features
- Cuando el legacy system es muy risky de replacear all at once
- Cuando necesitás maintain production stability durante migration

## When NOT to Use

- Greenfield projects sin legacy para replacear
- Systems suficientemente chicos para rewritear en un sprint
- Cuando el legacy system ya está decommissioned
- Cuando el routing layer agrega unacceptable latency

## Solution

### Routing layer con Nginx

```nginx
# nginx.conf — Strangler fig routing: new service para algunos routes, legacy para otros
upstream legacy_app {
    server legacy-app:3000;
}

upstream new_service {
    server new-service:8080;
}

server {
    listen 80;
    server_name api.shop.com;

    # Routes ya migrated al new service
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

    # Todo lo demás va al legacy app
    location / {
        proxy_pass http://legacy_app;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

### Feature flag-based routing

```python
# strangler_router.py — routeá requests basado en feature flags
from flask import Flask, request, Response
import requests
import os

app = Flask(__name__)

LEGACY_URL = os.environ["LEGACY_URL"]
NEW_SERVICE_URL = os.environ["NEW_SERVICE_URL"]

# Routes que han sido migrated al new service
MIGRATED_ROUTES = {
    ("GET", "/api/customers"),
    ("GET", "/api/customers/<id>"),
    ("POST", "/api/customers"),
    ("PUT", "/api/customers/<id>"),
    ("DELETE", "/api/customers/<id>"),
    ("GET", "/api/orders"),
    ("POST", "/api/orders"),
}

# Percentage de traffic para routear al new service (para canary testing)
CANARY_PERCENTAGE = 10

def is_migrated(method, path):
    """Checkeá si un route ha sido fully migrated."""
    normalized = path.rstrip("/")
    for m, p in MIGRATED_ROUTES:
        if method == m and normalized.startswith(p.replace("<id>", "")):
            return True
    return False

def is_canary_eligible():
    """Determiná si este request debería ir al new service para canary."""
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

    # Forwardeá el request
    resp = requests.request(
        method=method,
        url=f"{target_url}{path}",
        headers={k: v for k, v in request.headers if k.lower() != 'host'},
        data=request.get_data(),
        params=request.args,
        allow_redirects=False
    )

    # Agregá strangler header para observability
    response = Response(resp.content, resp.status_code, resp.headers.items())
    response.headers["X-Strangler-Target"] = "new" if target_url == NEW_SERVICE_URL else "legacy"
    return response
```

### Java Spring Cloud Gateway

```java
// StranglerGateway.java — Spring Cloud Gateway para strangler fig routing
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
            // Todo lo demás -> legacy
            .route("legacy-fallback", r -> r
                .path("/**")
                .uri("http://legacy-app:3000"))
            .build();
    }
}
```

### Incremental migration con shadow traffic

```python
# shadow_traffic.py — sendeá traffic a both old y new, compará results
import requests
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class ShadowTrafficRouter:
    """Sendeá requests a both legacy y new service.
    Returneá el legacy response, pero logeá differences con el new service."""

    def __init__(self, legacy_url, new_url):
        self.legacy_url = legacy_url
        self.new_url = new_url

    def route(self, method, path, headers, body, params):
        # Sendeá a legacy (primary)
        legacy_response = requests.request(
            method=method,
            url=f"{self.legacy_url}{path}",
            headers=headers,
            data=body,
            params=params
        )

        # Shadow send al new service (no esperes por it)
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

        # Corré shadow call en background
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
# cutover.py — trackeá migration progress y cutover readiness
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
        """Todos los routes deben ser verified antes de que legacy pueda ser decommissioned."""
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
# branch_by_abstraction.py — swapeá implementations detrás de un common interface
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

# Usage — switcheá por config flag
service = PaymentServiceFactory.create(use_new=True)
result = service.charge("cust_123", 99.99)
```

### Parallel run con comparison

```python
# parallel_run.py — corré both systems y compará results antes de cutover
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

        return legacy_result  # returneá legacy result para safety

    def _results_match(self, a, b):
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return abs(a - b) <= self.tolerance * max(abs(a), abs(b), 1)
        return a == b
```

## Best Practices

- Arrancá con read-only routes — son más safe de migrar que write operations
- Usá shadow traffic antes de cutover — sendeá requests a both systems y compará
- Migrá un route a la vez — pasos chicos, reversible
- Monitoreá latency y error rates — el new service debería matchear o beat al legacy
- Mantené el routing layer simple — es el critical path; no agregues business logic
- Planificá para rollback — si el new service falla, routeá traffic back a legacy
- Trackeá migration progress — maintainé un dashboard de migrated vs legacy routes
- Decommissioná solo cuando todos los routes estén verified — no dejes el legacy corriendo "just in case"

## Common Mistakes

- **Migrar write operations primero**: los writes son más risky que los reads. Arrancá con GET endpoints.
- **No shadow traffic**: cutover sin comparar old y new responses. Las differences pasan unnoticed.
- **Big-bang cutover**: migrar todos los routes a la vez. Si algo breakea, todo breakea.
- **Routing layer complexity**: agregar business logic al gateway. Mantenelo como un pure router.
- **No rollback plan**: si el new service falla, no hay way de routear back a legacy quickly.

## FAQ

### ¿Qué es el strangler fig pattern?

Un migration pattern donde un new system gradualmente replacea un legacy system. Un routing layer intercepta requests y sendea algunos al new system mientras otros fall through al legacy. Over time, más routes se mueven al new system hasta que el legacy puede ser decommissioned.

### ¿En qué se diferencia strangler fig de un big-bang rewrite?

Big-bang replacea el entire system a la vez — high risk, long timeline. Strangler fig replacea un route a la vez — low risk, continuous delivery. Podás parar el migration en cualquier punto y el system todavía funciona.

### ¿Qué es shadow traffic?

Sendear el mismo request a both el legacy y new system, pero solo returnear el legacy response. El new system's response se compara para correctness. Esto valida el new system sin affectar users.

### ¿Cuándo debería usar el strangler fig pattern?

Cuando migrás un legacy system que es muy risky de replacear all at once. Cuando necesitás keep deliverando features durante el migration. Cuando querés validar el new system con real traffic antes de cutover.

### ¿Cómo handleo data migration con strangler fig?

Cada migrated route necesita access al new system's database. Durante transition, o syncéa data entre old y new databases (CDC), o hacé que el new service lea desde el legacy database temporalmente. Planificá el data migration tan cuidadosamente como el code migration.
