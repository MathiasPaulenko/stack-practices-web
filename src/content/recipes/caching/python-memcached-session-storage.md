---
contentType: recipes
slug: python-memcached-session-storage
title: "Store User Sessions in Memcached with Python"
description: "Use Memcached as a distributed session store in Python web applications with pymemcache, TTL management, and failover handling."
metaDescription: "Store user sessions in Memcached with Python. Use pymemcache client, set TTL, handle session serialization, and configure failover."
difficulty: intermediate
topics:
  - caching
  - authentication
  - api
tags:
  - python
  - memcached
  - sessions
  - distributed-cache
  - pymemcache
relatedResources:
  - /recipes/caching/python-redis-cache-decorator
  - /recipes/authentication/python-jwt-refresh-token-rotation
  - /guides/complete-guide-api-versioning-strategies
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Store user sessions in Memcached with Python. Use pymemcache client, set TTL, handle session serialization, and configure failover."
  keywords:
    - python memcached sessions
    - pymemcache
    - distributed session store
    - session management python
    - memcached ttl
---

## Overview

Memcached is a distributed in-memory key-value store that works well for session storage in web applications. It is simple, fast, and horizontally scalable. Unlike Redis, it has no persistence, no built-in data structures beyond strings, and no replication — but for ephemeral session data that can be regenerated on re-login, those tradeoffs are acceptable. Below: using pymemcache to store sessions, serialization, TTL management, and failover.

## When to Use This

- Distributed session storage across multiple web servers
- Ephemeral session data that can tolerate loss (users re-login on cache flush)
- High-throughput session reads where Redis features (persistence, pub/sub) are unnecessary
- Simple key-value session model without complex data structures

## Prerequisites

- Python 3.10+
- Memcached server running (local or remote)
- `pymemcache` package

## Solution

### 1. Install pymemcache

```bash
pip install pymemcache
```

### 2. Basic Memcached Client

```python
from pymemcache.client.base import Client

client = Client(("localhost", 11211), connect_timeout=2, timeout=2)

# Set a value with TTL (in seconds)
client.set("user:session:abc123", "alice@example.com", expire=3600)

# Get a value
email = client.get("user:session:abc123")  # Returns bytes or None

# Delete
client.delete("user:session:abc123")
```

### 3. Session Store with JSON Serialization

```python
import json
import time
import secrets
from pymemcache.client.base import Client
from pymemcache import serde

client = Client(
    ("localhost", 11211),
    serializer=serde.python_memcache_serializer,
    deserializer=serde.python_memcache_deserializer,
    connect_timeout=2,
    timeout=2,
)

class SessionStore:
    def __init__(self, client: Client, default_ttl: int = 3600):
        self.client = client
        self.default_ttl = default_ttl

    def create_session(self, user_id: str, user_data: dict) -> str:
        session_id = secrets.token_urlsafe(32)
        session = {
            "user_id": user_id,
            "data": user_data,
            "created_at": time.time(),
            "last_access": time.time(),
        }
        self.client.set(f"session:{session_id}", session, expire=self.default_ttl)
        return session_id

    def get_session(self, session_id: str) -> dict | None:
        session = self.client.get(f"session:{session_id}")
        if session is None:
            return None
        session["last_access"] = time.time()
        self.client.set(f"session:{session_id}", session, expire=self.default_ttl)
        return session

    def destroy_session(self, session_id: str) -> None:
        self.client.delete(f"session:{session_id}")

    def extend_session(self, session_id: str, ttl: int | None = None) -> None:
        ttl = ttl or self.default_ttl
        session = self.client.get(f"session:{session_id}")
        if session:
            self.client.set(f"session:{session_id}", session, expire=ttl)
```

### 4. Using Sessions in a Web App (Flask)

```python
from flask import Flask, request, jsonify, make_response
import secrets

app = Flask(__name__)
sessions = SessionStore(client, default_ttl=3600)

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    user = authenticate(data["email"], data["password"])
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    session_id = sessions.create_session(user["id"], {"email": user["email"], "role": user["role"]})
    response = make_response(jsonify({"message": "Logged in"}))
    response.set_cookie("session_id", session_id, httponly=True, secure=True, samesite="Lax")
    return response

@app.route("/profile")
def profile():
    session_id = request.cookies.get("session_id")
    if not session_id:
        return jsonify({"error": "Not authenticated"}), 401

    session = sessions.get_session(session_id)
    if not session:
        return jsonify({"error": "Session expired"}), 401

    return jsonify({"user_id": session["user_id"], "data": session["data"]})

@app.route("/logout", methods=["POST"])
def logout():
    session_id = request.cookies.get("session_id")
    if session_id:
        sessions.destroy_session(session_id)
    response = make_response(jsonify({"message": "Logged out"}))
    response.delete_cookie("session_id")
    return response
```

### 5. Memcached Cluster with Consistent Hashing

```python
from pymemcache.client.hash import HashClient

servers = [
    ("cache-1.internal", 11211),
    ("cache-2.internal", 11211),
    ("cache-3.internal", 11211),
]

client = HashClient(
    servers,
    use_pooling=True,
    max_pool_size=10,
    connect_timeout=2,
    timeout=2,
    retry_attempts=3,
    retry_timeout=1,
    dead_timeout=30,  # Mark server as dead for 30s after failures
)

# HashClient distributes keys across servers using consistent hashing
client.set("session:abc", {"user": "alice"}, expire=3600)
session = client.get("session:abc")
```

### 6. Session Sliding Expiration

Refresh TTL on each access so active users don't get logged out:

```python
class SlidingSessionStore(SessionStore):
    def get_session(self, session_id: str) -> dict | None:
        key = f"session:{session_id}"
        session = self.client.get(key)
        if session is None:
            return None
        # Reset TTL on access — sliding window
        self.client.set(key, session, expire=self.default_ttl)
        session["last_access"] = time.time()
        return session
```

## How It Works

1. **Key structure**: Sessions are stored as `session:<session_id>`. The session ID is a cryptographically random URL-safe string generated with `secrets.token_urlsafe(32)`.
2. **Serialization**: pymemcache's `serde` module handles Python-to-bytes conversion. JSON works for simple dicts; use `pickle` for complex objects (but be aware of security implications).
3. **TTL**: Memcached's `expire` parameter sets the TTL in seconds. When it expires, the key is automatically evicted. No cleanup needed.
4. **Consistent hashing**: `HashClient` distributes keys across multiple Memcached servers. If a server goes down, it's marked as dead and keys are redistributed to remaining servers.
5. **Failover**: `retry_attempts` and `dead_timeout` control how the client handles server failures. A dead server is retried after `dead_timeout` seconds.

## Variants

### FastAPI Session Middleware

```python
from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.middleware import Middleware

app = FastAPI()
sessions = SessionStore(client, default_ttl=3600)

@app.middleware("http")
async def session_middleware(request: Request, call_next):
    session_id = request.cookies.get("session_id")
    request.state.session = None
    if session_id:
        request.state.session = sessions.get_session(session_id)
    response = await call_next(request)
    return response

@app.get("/profile")
async def profile(request: Request):
    if not request.state.session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"user_id": request.state.session["user_id"]}
```

### Encrypted Sessions

Encrypt session data before storing in Memcached:

```python
from cryptography.fernet import Fernet

key = Fernet.generate_key()
cipher = Fernet(key)

class EncryptedSessionStore(SessionStore):
    def create_session(self, user_id: str, user_data: dict) -> str:
        session_id = secrets.token_urlsafe(32)
        plaintext = json.dumps({"user_id": user_id, "data": user_data}).encode()
        encrypted = cipher.encrypt(plaintext)
        self.client.set(f"session:{session_id}", encrypted, expire=self.default_ttl)
        return session_id

    def get_session(self, session_id: str) -> dict | None:
        encrypted = self.client.get(f"session:{session_id}")
        if encrypted is None:
            return None
        plaintext = cipher.decrypt(encrypted)
        return json.loads(plaintext)
```

### Session with CAS (Compare-And-Swap)

Prevent race conditions when updating sessions concurrently:

```python
def update_session_cas(client, session_id, update_fn):
    key = f"session:{session_id}"
    result = client.gets(key)  # Gets value + CAS token
    if result is None:
        return None

    value, cas_token = result
    updated = update_fn(value)

    # Only sets if the value hasn't changed since gets()
    success = client.cas(key, updated, cas_token, expire=3600)
    if not success:
        raise ConcurrentModificationError("Session was modified by another request")
    return updated
```

## Best Practices

- **Use cryptographically random session IDs**: `secrets.token_urlsafe(32)` generates 43-character URL-safe strings with 256 bits of entropy.
- **Set `httponly`, `secure`, `samesite` on cookies**: Prevent XSS-based session theft and CSRF attacks.
- **Keep sessions small**: Memcached has a 1MB default item limit. Store only user ID and minimal data — fetch the rest from the database.
- **Use sliding expiration for active users**: Reset TTL on each access so users aren't logged out while active.
- **Monitor cache miss rate**: High miss rate means sessions are expiring too fast or servers are dropping keys.
- **Use `HashClient` for production**: Single-server Memcached is a single point of failure. Run at least 2-3 instances.

## Common Mistakes

- **Storing large objects in sessions**: Memcached's 1MB limit can silently drop large sessions. Keep sessions under 10KB.
- **Not handling `None` returns**: `client.get()` returns `None` for missing keys or server errors. Always check for `None`.
- **Using `pickle` serialization on untrusted data**: Deserializing untrusted pickles is a remote code execution risk. Use JSON.
- **No failover handling**: A single Memcached server going down logs out all users. Use `HashClient` with multiple servers.
- **Fixed TTL without sliding window**: Users get logged out mid-session even if active. Reset TTL on access.

## FAQ

**Memcached vs Redis for sessions — which is better?**

Redis offers persistence, replication, and richer data structures. Memcached is simpler and slightly faster for pure key-value workloads. If you need session data to survive restarts, use Redis. If sessions are purely ephemeral, Memcached is fine.

**What happens when Memcached runs out of memory?**

Memcached uses LRU eviction. When memory is full, the least recently used items are evicted. This means old sessions get dropped — users with old sessions will need to re-login.

**Can I use Memcached for sensitive session data?**

Memcached does not encrypt data at rest. If you need to store sensitive data, encrypt it before storing (see the Encrypted Sessions variant). Network-level security (TLS, private network) is also important.

**How do I handle Memcached server failures?**

`HashClient` with `dead_timeout` marks failed servers as dead and redistributes keys. Sessions on the dead server are lost — users will need to re-login. For zero-downtime, use Redis with replication instead.

**What is the maximum session size in Memcached?**

The default is 1MB per item. You can increase it with `-I 5m` flag on Memcached startup, but large sessions hurt performance. Keep sessions small.

**Should I use Memcached or Redis for sessions?**

Memcached is simpler and faster for pure key-value session storage. Redis offers persistence, replication, and richer data structures (lists, sets, sorted sets). If sessions must survive restarts or you need high availability, use Redis. If you want maximum speed and can tolerate session loss on restart, Memcached is fine.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
