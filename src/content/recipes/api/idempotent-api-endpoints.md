---
contentType: recipes
slug: idempotent-api-endpoints
title: "Idempotent API Endpoints"
description: "How to design and implement idempotent API endpoints that safely handle retries, duplicate requests, and network failures without side effects."
metaDescription: "Learn idempotent API design in Python, JavaScript, and Java. Covers idempotency keys, HTTP methods, and safe retry patterns for distributed systems."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - distributed-systems
  - http
  - rest
  - backend
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/rate-limiting
  - /recipes/rest-api-design
  - /recipes/api-versioning
  - /recipes/traffic-mirroring
lastUpdated: "2026-08-19"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Learn idempotent API design in Python, JavaScript, and Java. Covers idempotency keys, HTTP methods, and safe retry patterns for distributed systems."
  keywords:
    - idempotency
    - api
    - http
    - distributed-systems
    - retry
    - safety
    - python
    - javascript
    - java
---

## Overview

Idempotency guarantees that making the same API request several times produces the
same result as making it once, with no duplicate side effects. This matters in
distributed systems where network failures, timeouts, and retries are common.

This recipe shows how to design idempotent endpoints using idempotency keys,
natural key constraints, and state checks in Python, JavaScript, and Java.

## When to Use

- Building payment or order APIs where duplicate charges must be prevented. See
  the [API Security Checklist](/guides/api-security-checklist-guide/) for secure
  payment patterns.
- Designing APIs consumed by mobile apps with unreliable network connectivity.
  See [Call REST API](/recipes/call-rest-api/) for client retry patterns.
- Implementing retry logic where the same request may be sent several times.
- Creating webhook receivers that may deliver the same event more than once.

### When to avoid

- Read-only endpoints (`GET`, `HEAD`, `OPTIONS`) are already idempotent by the
  HTTP spec — they don't need extra handling.
- Operations with no side effects or no retry risk rarely justify the added
  storage and logic.

## Solution

### Python (FastAPI)

```python
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import uuid
import time
from typing import Optional

app = FastAPI()

idempotency_store = {}
IDEMPOTENCY_TTL = 86400  # 24 hours

class CreateOrderRequest(BaseModel):
    customer_id: str
    amount: float
    currency: str = "USD"

@app.post("/orders")
def create_order(
    request: CreateOrderRequest,
    idempotency_key: Optional[str] = Header(None)
):
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header required")

    try:
        uuid.UUID(idempotency_key)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Idempotency-Key format")

    now = time.time()

    expired = [k for k, v in idempotency_store.items() if now - v["timestamp"] > IDEMPOTENCY_TTL]
    for k in expired:
        del idempotency_store[k]

    if idempotency_key in idempotency_store:
        stored = idempotency_store[idempotency_key]
        if stored["status"] == "completed":
            return {
                "id": stored["order_id"],
                "status": "completed",
                "cached": True
            }
        elif stored["status"] == "processing":
            raise HTTPException(status_code=409, detail="Request already in progress")

    idempotency_store[idempotency_key] = {
        "status": "processing",
        "timestamp": now,
        "order_id": None
    }

    try:
        order_id = str(uuid.uuid4())
        # ... save to database ...

        idempotency_store[idempotency_key] = {
            "status": "completed",
            "timestamp": now,
            "order_id": order_id
        }

        return {"id": order_id, "status": "completed", "cached": False}
    except Exception:
        del idempotency_store[idempotency_key]
        raise
```

### JavaScript (Express)

```javascript
import express from "express";
import { v4 as uuidv4, validate as validateUuid } from "uuid";

const app = express();
app.use(express.json());

const idempotencyStore = new Map();
const IDEMPOTENCY_TTL = 86400 * 1000; // 24 hours

function isExpired(timestamp) {
  return Date.now() - timestamp > IDEMPOTENCY_TTL;
}

app.post("/orders", (req, res) => {
  const idempotencyKey = req.headers["idempotency-key"];

  if (!idempotencyKey) {
    return res.status(400).json({ error: "Idempotency-Key header required" });
  }
  if (!validateUuid(idempotencyKey)) {
    return res.status(400).json({ error: "Invalid Idempotency-Key format" });
  }

  for (const [key, entry] of idempotencyStore) {
    if (isExpired(entry.timestamp)) {
      idempotencyStore.delete(key);
    }
  }

  const existing = idempotencyStore.get(idempotencyKey);

  if (existing) {
    if (existing.status === "completed") {
      return res.json({
        id: existing.orderId,
        status: "completed",
        cached: true
      });
    }
    if (existing.status === "processing") {
      return res.status(409).json({ error: "Request already in progress" });
    }
  }

  idempotencyStore.set(idempotencyKey, {
    status: "processing",
    timestamp: Date.now(),
    orderId: null
  });

  try {
    const orderId = uuidv4();
    // ... save to database ...

    idempotencyStore.set(idempotencyKey, {
      status: "completed",
      timestamp: Date.now(),
      orderId
    });

    res.json({ id: orderId, status: "completed", cached: false });
  } catch (err) {
    idempotencyStore.delete(idempotencyKey);
    throw err;
  }
});
```

### Java (Spring Boot)

```java
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/orders")
public class OrderController {

  private final ConcurrentHashMap<String, IdempotencyRecord> store = new ConcurrentHashMap<>();
  private static final long IDEMPOTENCY_TTL_MS = 86400_000; // 24 hours

  record CreateOrderRequest(String customerId, double amount, String currency) {}
  record OrderResponse(UUID id, String status, boolean cached) {}
  record IdempotencyRecord(String status, long timestamp, UUID orderId) {}

  @PostMapping
  public OrderResponse createOrder(
      @RequestBody CreateOrderRequest request,
      @RequestHeader("Idempotency-Key") String idempotencyKey) {

    UUID key;
    try {
      key = UUID.fromString(idempotencyKey);
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Idempotency-Key format");
    }

    String keyStr = key.toString();
    long now = System.currentTimeMillis();

    store.entrySet().removeIf(entry -> now - entry.getValue().timestamp() > IDEMPOTENCY_TTL_MS);

    IdempotencyRecord existing = store.get(keyStr);
    if (existing != null) {
      if ("completed".equals(existing.status())) {
        return new OrderResponse(existing.orderId(), "completed", true);
      }
      if ("processing".equals(existing.status())) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Request already in progress");
      }
    }

    store.put(keyStr, new IdempotencyRecord("processing", now, null));

    try {
      UUID orderId = UUID.randomUUID();
      // ... save to database ...

      store.put(keyStr, new IdempotencyRecord("completed", now, orderId));
      return new OrderResponse(orderId, "completed", false);
    } catch (Exception e) {
      store.remove(keyStr);
      throw e;
    }
  }
}
```

## Explanation

An **idempotency key** is a client-generated identifier sent in the
`Idempotency-Key` header. The server uses it to detect duplicate requests and
return the same response.

The **processing** state stops two concurrent requests from executing the same
operation twice. A second request that arrives while the first is still running
gets `409 Conflict`.

**TTL cleanup** is necessary because idempotency stores grow unbounded. Use Redis
with TTL or schedule periodic cleanup. A 24-hour TTL is common for financial
operations.

**Error handling** must remove the `processing` marker on failure so the client
can retry. See [Error Handling](/recipes/handle-errors/) for retry patterns.
Otherwise the key stays blocked.

**Natural idempotency** with `PUT /orders/{id}` follows HTTP semantics — repeated
updates with the same body leave the resource in the same state. See
[Call REST API](/recipes/call-rest-api/) for HTTP method semantics.

## Variants

| Strategy | Implementation | Best for |
| --- | --- | --- |
| Idempotency key header | UUID in `Idempotency-Key` header | POST endpoints creating resources |
| Natural key constraint | Database unique constraint on a business key | UPSERT operations, user registration |
| State machine check | Verify current state before transition | Workflow engines, payment processing |
| ETag / If-Match | Conditional requests with version | Optimistic concurrency, updates |

## Best Practices

- Require idempotency keys for state-changing POST/PUT/PATCH endpoints.
- Use UUID v4 for keys; avoid incrementing integers or timestamps that can
  collide across clients.
- Store the full response, not just a status flag, so duplicates return identical
  data.
- Set a TTL that matches your retry window and document it. Twenty-four hours is
  common for payments.
- Make `DELETE /resources/{id}` return `204` or `404`; both mean the resource no
  longer exists.
- Validate key format and reject missing or malformed keys with `400 Bad Request`.

## Common Mistakes

- Checking the idempotency key without atomic locking, which lets two parallel
  requests both execute.
- Setting an infinite TTL, eventually exhausting storage and degrading
  performance.
- Returning different responses for the same idempotency key, breaking the
  contract.
- Using idempotency keys on GET requests, which are already idempotent.
- Not removing the `processing` marker on failure, permanently blocking retries.

## FAQ

### Which HTTP methods are naturally idempotent?

GET, HEAD, PUT, DELETE, and OPTIONS are naturally idempotent. POST isn't —
repeated POSTs usually create several resources. PATCH idempotency depends on
the patch semantics.

### How should the client generate idempotency keys?

Generate a UUID v4 before the first attempt and reuse it for every retry of the
same logical operation. Never reuse a key for a different operation.

### Can I implement idempotency without a dedicated store?

Yes, with database constraints. For example, a `payments` table with a unique
constraint on `(idempotency_key, merchant_id)` prevents duplicates atomically.
This works when the key maps directly to a record. For multi-step operations, a
dedicated store is clearer.

### How does this relate to rate limiting?

Idempotency prevents duplicate side effects. Rate limiting prevents too many
requests. They work together. See [Rate Limiting](/recipes/rate-limiting/) for
client-side and server-side limits.
