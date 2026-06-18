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
  - idempotency
  - java
  - javascript
  - python
  - retry
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-cors
  - /recipes/api-versioning
  - /recipes/handle-errors
  - /recipes/rate-limiting
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
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

Idempotency guarantees that making the same API request multiple times produces the same result as making it once, without creating duplicate side effects. This is essential in distributed systems where network failures, timeouts, and retries are unavoidable. This recipe covers designing idempotent endpoints using idempotency keys, natural key constraints, and state machine checks in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Building payment or order APIs where duplicate charges must be prevented
- Designing APIs consumed by mobile apps with unreliable network connectivity
- Implementing retry logic where the same request may be sent multiple times
- Creating webhook receivers that may deliver the same event more than once

## Solution

### Python (FastAPI)

```python
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import uuid
import time
from typing import Optional

app = FastAPI()

# In-memory store; use Redis in production
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

    # Validate key format
    try:
        uuid.UUID(idempotency_key)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Idempotency-Key format")

    now = time.time()

    # Cleanup expired entries (simplified; use TTL in production)
    expired = [k for k, v in idempotency_store.items() if now - v["timestamp"] > IDEMPOTENCY_TTL]
    for k in expired:
        del idempotency_store[k]

    # Check if we've seen this key
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

    # Mark as processing
    idempotency_store[idempotency_key] = {
        "status": "processing",
        "timestamp": now,
        "order_id": None
    }

    try:
        # Execute the actual business logic
        order_id = str(uuid.uuid4())
        # ... save to database ...

        # Mark as completed
        idempotency_store[idempotency_key] = {
            "status": "completed",
            "timestamp": now,
            "order_id": order_id
        }

        return {"id": order_id, "status": "completed", "cached": False}
    except Exception:
        # Remove processing marker so client can retry
        del idempotency_store[idempotency_key]
        raise
```

### JavaScript (Express)

```javascript
import express from "express";
import { v4 as uuidv4, validate as validateUuid } from "uuid";

const app = express();
app.use(express.json());

// Use Redis in production
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

  // Cleanup expired entries
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

  // Mark as processing
  idempotencyStore.set(idempotencyKey, {
    status: "processing",
    timestamp: Date.now(),
    orderId: null
  });

  try {
    // Execute business logic
    const orderId = uuidv4();
    // ... save to database ...

    idempotencyStore.set(idempotencyKey, {
      status: "completed",
      timestamp: Date.now(),
      orderId
    });

    res.json({ id: orderId, status: "completed", cached: false });
  } catch (err) {
    // Allow retry by removing processing marker
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

    // Cleanup expired entries
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

    // Mark as processing
    store.put(keyStr, new IdempotencyRecord("processing", now, null));

    try {
      // Execute business logic
      UUID orderId = UUID.randomUUID();
      // ... save to database ...

      store.put(keyStr, new IdempotencyRecord("completed", now, orderId));
      return new OrderResponse(orderId, "completed", false);
    } catch (Exception e) {
      store.remove(keyStr); // Allow retry
      throw e;
    }
  }
}
```

## Explanation

- **Idempotency key** is a unique client-generated identifier (UUID recommended) sent in a header. The server uses this key to detect duplicate requests and return the cached response.
- **Processing state** prevents concurrent duplicate requests from executing the same operation twice. If a second request arrives while the first is still processing, return `409 Conflict`.
- **TTL cleanup** is necessary because idempotency stores grow unbounded. Use Redis with TTL or schedule periodic cleanup. Typical TTL is 24 hours.
- **Error handling** on failure must remove the "processing" marker so the client can safely retry. Otherwise, a failed request would be permanently blocked.
- **Natural idempotency** via PUT with resource path (e.g., `PUT /orders/{id}`) is idempotent by HTTP semantics — repeated updates with the same body produce the same state.

## Variants

| Strategy | Implementation | Best For |
|----------|---------------|----------|
| Idempotency key header | UUID in `Idempotency-Key` header | POST endpoints creating resources |
| Natural key constraint | Database unique constraint on business key | UPSERT operations, user registration |
| State machine check | Verify current state before transition | Workflow engines, payment processing |
| ETag / If-Match | Conditional requests with version | Optimistic concurrency, updates |
|empotency-Key: * | Not recommended | Never use; always use unique keys |

## Best Practices

1. **Require idempotency keys for state-changing operations** — all POST/PUT/PATCH endpoints that create or modify resources should accept an `Idempotency-Key` header.
2. **Use UUID v4 for keys** — clients should generate cryptographically random UUIDs. Avoid simple incrementing integers or timestamps that could collide across clients.
3. **Store responses, not just state** — when a request completes, cache the full response so duplicate requests return identical data, not just a success acknowledgement.
4. **Set appropriate TTLs** — 24 hours is standard for financial operations; shorter TTLs (1 hour) work for less critical flows. Document your TTL so clients know the retry window.
5. **Make DELETE naturally idempotent** — `DELETE /resources/{id}` should return `204` or `404` on repeat calls, both indicating the resource does not exist.

## Common Mistakes

1. Implementing idempotency keys but not checking them atomically, causing race conditions where two parallel requests both execute.
2. Setting infinite TTL on idempotency records, eventually exhausting storage and degrading performance.
3. Returning different responses for the same idempotency key (e.g., different order IDs), breaking the idempotency contract.
4. Using idempotency keys on GET requests, which are already idempotent by HTTP specification and don't need keys.
5. Not removing the "processing" marker on failure, permanently blocking retries for that key.

## Frequently Asked Questions

### Which HTTP methods are naturally idempotent?

GET, HEAD, PUT, DELETE, and OPTIONS are naturally idempotent by HTTP specification. POST is not idempotent by default — repeated POSTs create multiple resources. PATCH idempotency depends on the patch semantics (JSON Merge Patch vs JSON Patch).

### How should the client generate idempotency keys?

Generate a UUID v4 on the client side before the first request attempt. Reuse the same key for all retries of the same logical operation. Never reuse a key for a different operation (different amount, different customer, etc.). Store the key locally until you receive a definitive success or failure response.

### Can I implement idempotency without a dedicated store?

Yes, using database constraints. For example, a `payments` table with a unique constraint on `(idempotency_key, merchant_id)` naturally prevents duplicates. The database transaction enforces atomicity without a separate cache. However, this only works when the key maps directly to a database record; for complex multi-step operations, a dedicated store is clearer.
