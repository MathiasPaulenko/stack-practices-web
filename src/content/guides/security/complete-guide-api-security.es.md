---





contentType: guides
slug: complete-guide-api-security
title: "Referencia Detallada de API Security"
description: "Asegurar tus APIs end-to-end. Cubre rate limiting, autenticacion, input validation, CORS, prevencion de SQL injection, API gateway patterns, limites de request size, pagination security, mass assignment, versioning, audit logging y API security testing con ejemplos de codigo."
metaDescription: "Asegurar APIs end-to-end. Cubre rate limiting, auth, input validation, CORS, SQL injection, API gateway, mass assignment, audit logging, testing."
difficulty: advanced
topics:
  - security
  - api
  - architecture
tags:
  - api-security
  - security
  - guia
  - rate-limiting
  - cors
  - input-validation
  - api-gateway
  - audit-logging
relatedResources:
  - /guides/complete-guide-owasp-top-10-2025
  - /guides/complete-guide-authentication-patterns
  - /guides/complete-guide-secrets-management
  - /patterns/gatekeeper-pattern
  - /recipes/rate-limiting-security
  - /guides/complete-guide-supply-chain-security
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Asegurar APIs end-to-end. Cubre rate limiting, auth, input validation, CORS, SQL injection, API gateway, mass assignment, audit logging, testing."
  keywords:
    - api security
    - rate limiting
    - input validation
    - cors
    - sql injection prevention
    - api gateway
    - mass assignment
    - audit logging





---

## Introducción

APIs son el primary attack surface para modern applications. Every endpoint es un potential entry point para attackers. Aqui se presenta una guia sobre rate limiting, authentication, input validation, CORS, injection prevention, API gateway patterns, mass assignment protection, audit logging, y security testing con production-ready code examples.

## Rate Limiting

### Token Bucket Rate Limiter

```python
import time
from collections import defaultdict
from threading import Lock

class TokenBucketRateLimiter:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.buckets: dict[str, dict] = defaultdict(lambda: {
            "tokens": capacity,
            "last_refill": time.time()
        })
        self.lock = Lock()
    
    def allow_request(self, key: str) -> bool:
        with self.lock:
            bucket = self.buckets[key]
            now = time.time()
            
            # Refill tokens
            elapsed = now - bucket["last_refill"]
            bucket["tokens"] = min(
                self.capacity,
                bucket["tokens"] + elapsed * self.refill_rate
            )
            bucket["last_refill"] = now
            
            if bucket["tokens"] >= 1:
                bucket["tokens"] -= 1
                return True
            return False

# Uso: 100 requests por minuto per IP
rate_limiter = TokenBucketRateLimiter(capacity=100, refill_rate=100/60)

from fastapi import Request, HTTPException

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    if not rate_limiter.allow_request(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={"Retry-After": "60"}
        )
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = "100"
    response.headers["X-RateLimit-Remaining"] = str(int(rate_limiter.buckets[client_ip]["tokens"]))
    return response
```

### Redis-Based Distributed Rate Limiter

```python
import redis
import time

class RedisRateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    def sliding_window(self, key: str, limit: int, window: int) -> bool:
        """Sliding window rate limiter usando Redis sorted sets."""
        now = time.time()
        window_start = now - window
        
        pipe = self.redis.pipeline()
        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)
        # Add current request
        pipe.zadd(key, {str(now): now})
        # Count current window
        pipe.zcard(key)
        # Set expiry on key
        pipe.expire(key, window)
        
        results = pipe.execute()
        count = results[2]
        
        return count <= limit

# Uso: 1000 requests por hora per API key
redis_limiter = RedisRateLimiter(redis_client)

def check_rate_limit(api_key: str) -> bool:
    return redis_limiter.sliding_window(
        key=f"rate_limit:{api_key}",
        limit=1000,
        window=3600
    )
```

### Tiered Rate Limiting

```python
class TieredRateLimiter:
    TIERS = {
        "free": {"limit": 100, "window": 3600},       # 100/hour
        "pro": {"limit": 10000, "window": 3600},      # 10k/hour
        "enterprise": {"limit": 100000, "window": 3600}  # 100k/hour
    }
    
    def __init__(self, redis_limiter: RedisRateLimiter):
        self.limiter = redis_limiter
    
    def check(self, api_key: str, tier: str) -> dict:
        config = self.TIERS.get(tier, self.TIERS["free"])
        allowed = self.limiter.sliding_window(
            key=f"rate_limit:{tier}:{api_key}",
            limit=config["limit"],
            window=config["window"]
        )
        
        return {
            "allowed": allowed,
            "limit": config["limit"],
            "window": config["window"],
            "tier": tier
        }
```

## Input Validation

### Schema-Based Validation

```python
from pydantic import BaseModel, validator, Field, conint, constr
from typing import Optional

class CreateUserRequest(BaseModel):
    username: constr(min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')
    email: constr(min_length=5, max_length=255, pattern=r'^[^@]+@[^@]+\.[^@]+$')
    password: constr(min_length=12, max_length=128)
    age: conint(ge=13, le=120)
    bio: Optional[constr(max_length=500)] = None
    
    @validator("password")
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain uppercase")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain lowercase")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain digits")
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v):
            raise ValueError("Password must contain special characters")
        return v

@app.post("/api/users")
async def create_user(request: CreateUserRequest):
    # Pydantic validates automaticamente — invalid data raises 422
    user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        age=request.age,
        bio=request.bio
    )
    db.add(user)
    db.commit()
    return {"id": user.id, "username": user.username}
```

### File Upload Validation

```python
import magic
import os

ALLOWED_MIME_TYPES = {
    "image/jpeg": {"jpg", "jpeg"},
    "image/png": {"png"},
    "image/webp": {"webp"},
    "application/pdf": {"pdf"},
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

def validate_file_upload(file_bytes: bytes, filename: str) -> str:
    # Checkear file size
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"File exceeds {MAX_FILE_SIZE // 1024 // 1024}MB limit")
    
    # Checkear file extension
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    # Detect actual MIME type desde content (no desde extension)
    mime = magic.from_buffer(file_bytes, mime=True)
    
    if mime not in ALLOWED_MIME_TYPES:
        raise ValueError(f"File type {mime} not allowed")
    
    if ext not in ALLOWED_MIME_TYPES[mime]:
        raise ValueError(f"Extension .{ext} does not match MIME type {mime}")
    
    # Checkear embedded scripts en images
    if mime.startswith("image/"):
        if b"<script" in file_bytes.lower() or b"<?php" in file_bytes.lower():
            raise ValueError("File contains embedded scripts")
    
    return mime

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    mime_type = validate_file_upload(content, file.filename)
    
    safe_filename = secure_filename(file.filename)
    filepath = f"/uploads/{safe_filename}"
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    return {"filename": safe_filename, "mime_type": mime_type}
```

## CORS Configuration

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Strict CORS — solo allow specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://stackpractices.com",
        "https://www.stackpractices.com",
        "https://app.stackpractices.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "X-CSRF-Token"
    ],
    expose_headers=["X-Request-ID", "X-RateLimit-Remaining"],
    max_age=3600  # Cache preflight por 1 hour
)

# Nunca uses allow_origins=["*"] con allow_credentials=True
# Esto es un security vulnerability — browsers lo van a reject
```

## SQL Injection Prevention

```python
# VULNERABLE: String concatenation
def get_user_vulnerable(name: str):
    query = f"SELECT * FROM users WHERE name = '{name}'"
    # Attack: name = "'; DROP TABLE users; --"
    return db.execute(query)

# SAFE: Parameterized queries
def get_user_safe(name: str):
    query = "SELECT * FROM users WHERE name = :name"
    return db.execute(query, {"name": name})

# SAFE: ORM con parameterized queries
def get_user_orm(name: str):
    return db.query(User).filter(User.name == name).first()

# SAFE: SQLAlchemy con explicit parameters
from sqlalchemy import text

def search_users(search_term: str):
    query = text("""
        SELECT id, username, email 
        FROM users 
        WHERE username ILIKE :pattern 
        ORDER BY created_at DESC
        LIMIT 50
    """)
    return db.execute(query, {"pattern": f"%{search_term}%"})

# SAFE: Input sanitization para dynamic queries
import re

def safe_order_by(column: str, allowed_columns: set) -> str:
    """Validate column name para ORDER BY clause."""
    if column not in allowed_columns:
        raise ValueError(f"Invalid sort column: {column}")
    return column

# Uso
allowed = {"username", "email", "created_at", "updated_at"}
sort_column = safe_order_by(request.args.get("sort", "created_at"), allowed)
query = f"SELECT * FROM users ORDER BY {sort_column} DESC"
```

## Mass Assignment Protection

```python
# VULNERABLE: Mass assignment
@app.put("/api/users/{user_id}")
async def update_user(user_id: int, body: dict = Body(...)):
    user = db.query(User).filter(User.id == user_id).first()
    for key, value in body.items():
        setattr(user, key, value)  # Attacker puede set role=admin!
    db.commit()
    return user

# SAFE: Explicit field mapping con Pydantic
class UpdateUserRequest(BaseModel):
    username: Optional[constr(min_length=3, max_length=50)] = None
    email: Optional[constr(max_length=255)] = None
    bio: Optional[constr(max_length=500)] = None
    # Note: 'role', 'is_admin', 'password_hash' NO estan included

@app.put("/api/users/{user_id}")
async def update_user(
    user_id: int,
    request: UpdateUserRequest,
    current_user: User = Depends(get_current_user)
):
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(403, "Access denied")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    # Solo update allowed fields
    update_data = request.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    return {"id": user.id, "username": user.username}
```

## API Gateway Security

```python
class APIGatewayMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, request: Request, call_next):
        # 1. Request size limit
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 10 * 1024 * 1024:  # 10MB
            return JSONResponse(413, {"detail": "Request too large"})
        
        # 2. API key validation
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return JSONResponse(401, {"detail": "Missing API key"})
        
        key_info = self.validate_api_key(api_key)
        if not key_info:
            return JSONResponse(401, {"detail": "Invalid API key"})
        
        # 3. Rate limiting
        rate_check = self.check_rate_limit(api_key, key_info["tier"])
        if not rate_check["allowed"]:
            return JSONResponse(
                429,
                {"detail": "Rate limit exceeded"},
                headers={
                    "Retry-After": str(rate_check["window"]),
                    "X-RateLimit-Limit": str(rate_check["limit"])
                }
            )
        
        # 4. Request ID para tracing
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        
        # 5. Process request
        response = await call_next(request)
        
        # 6. Add security headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
        
        # 7. Remove sensitive headers del response
        if "Server" in response.headers:
            del response.headers["Server"]
        if "X-Powered-By" in response.headers:
            del response.headers["X-Powered-By"]
        
        return response
    
    def validate_api_key(self, api_key: str) -> dict | None:
        # Look up API key en database
        key_record = db.query(APIKey).filter(
            APIKey.key_hash == hash_api_key(api_key),
            APIKey.is_active == True
        ).first()
        if key_record:
            return {"tier": key_record.tier, "user_id": key_record.user_id}
        return None
```

## Pagination Security

```python
# VULNERABLE: No limit en page size
@app.get("/api/users")
async def list_users(page: int = 1, size: int = 1000):
    # Attacker puede request size=1000000 y overwhelm el server
    offset = (page - 1) * size
    return db.query(User).offset(offset).limit(size).all()

# SAFE: Enforce maximum page size
MAX_PAGE_SIZE = 100

@app.get("/api/users")
async def list_users(
    page: int = Query(ge=1, default=1),
    size: int = Query(ge=1, le=MAX_PAGE_SIZE, default=20)
):
    offset = (page - 1) * size
    users = db.query(User).offset(offset).limit(size).all()
    total = db.query(User).count()
    
    return {
        "data": [user_to_dict(u) for u in users],
        "pagination": {
            "page": page,
            "size": size,
            "total": total,
            "total_pages": (total + size - 1) // size
        }
    }

# SAFE: Cursor-based pagination (mejor para large datasets)
@app.get("/api/users/cursor")
async def list_users_cursor(
    cursor: str | None = Query(default=None),
    size: int = Query(ge=1, le=MAX_PAGE_SIZE, default=20)
):
    query = db.query(User).order_by(User.id.desc())
    
    if cursor:
        # Decode cursor (base64 encoded ID)
        import base64
        last_id = int(base64.b64decode(cursor).decode())
        query = query.filter(User.id < last_id)
    
    users = query.limit(size + 1).all()  # Fetch one extra para check has_more
    has_more = len(users) > size
    users = users[:size]
    
    next_cursor = None
    if has_more and users:
        next_cursor = base64.b64encode(str(users[-1].id).encode()).decode()
    
    return {
        "data": [user_to_dict(u) for u in users],
        "next_cursor": next_cursor,
        "has_more": has_more
    }
```

## Audit Logging

```python
import json
import logging
from datetime import datetime

class AuditLogger:
    def __init__(self):
        self.logger = logging.getLogger("audit")
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(message)s'))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def log_api_call(self, request: Request, response, user_id: str | None):
        self.logger.info(json.dumps({
            "timestamp": datetime.now().isoformat(),
            "request_id": getattr(request.state, "request_id", None),
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "user_id": user_id,
            "ip": request.client.host,
            "user_agent": request.headers.get("user-agent", ""),
            "api_key": request.headers.get("x-api-key", "")[:8] + "..." if request.headers.get("x-api-key") else None,
            "response_time_ms": getattr(request.state, "response_time", None)
        }))
    
    def log_security_event(self, event: str, details: dict):
        self.logger.warning(json.dumps({
            "timestamp": datetime.now().isoformat(),
            "event": event,
            "details": details
        }))

audit = AuditLogger()

@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed_ms = (time.time() - start) * 1000
    
    request.state.response_time = round(elapsed_ms, 2)
    
    # Get user desde JWT si present
    user_id = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            payload = jwt_service.verify_token(auth_header[7:])
            user_id = payload["sub"]
        except:
            pass
    
    audit.log_api_call(request, response, user_id)
    
    # Log suspicious activity
    if response.status_code == 401:
        audit.log_security_event("auth_failure", {
            "ip": request.client.host,
            "path": request.url.path,
            "method": request.method
        })
    elif response.status_code == 403:
        audit.log_security_event("access_denied", {
            "ip": request.client.host,
            "path": request.url.path,
            "user_id": user_id
        })
    
    return response
```

## API Security Testing

```python
import pytest
import httpx

class TestAPISecurity:
    def test_sql_injection_in_login(self, client):
        # Test SQL injection en login
        response = client.post("/api/login", json={
            "username": "admin' OR '1'='1",
            "password": "anything"
        })
        assert response.status_code == 401
        assert "token" not in response.json()
    
    def test_mass_assignment(self, client, auth_headers):
        # Test mass assignment protection
        response = client.put("/api/users/me", json={
            "username": "newname",
            "role": "admin",  # Should ser ignored
            "is_admin": True   # Should ser ignored
        }, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["role"] != "admin"
    
    def test_rate_limiting(self, client):
        # Test rate limiting
        for i in range(101):
            response = client.get("/api/data")
            if i < 100:
                assert response.status_code == 200
            else:
                assert response.status_code == 429
    
    def test_cors_headers(self, client):
        # Test CORS configuration
        response = client.options(
            "/api/data",
            headers={
                "Origin": "https://evil.com",
                "Access-Control-Request-Method": "GET"
            }
        )
        # Should no allow evil.com
        assert "access-control-allow-origin" not in response.headers or \
               response.headers["access-control-allow-origin"] != "https://evil.com"
    
    def test_authentication_required(self, client):
        # Test que protected endpoints require auth
        response = client.get("/api/users/me")
        assert response.status_code == 401
    
    def test_invalid_token_rejected(self, client):
        # Test invalid JWT
        response = client.get(
            "/api/users/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert response.status_code == 401
    
    def test_expired_token_rejected(self, client):
        # Test expired JWT
        expired_token = generate_expired_token()
        response = client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert response.status_code == 401
    
    def test_pagination_limit_enforced(self, client, auth_headers):
        # Test que page size esta capped
        response = client.get(
            "/api/users?size=10000",
            headers=auth_headers
        )
        data = response.json()
        assert len(data["data"]) <= 100  # MAX_PAGE_SIZE
```

## Security Checklist

```text
API Security Checklist:

Authentication:
  [ ] Todos los endpoints require authentication (except public ones)
  [ ] JWT validated (signature, expiration, issuer, audience)
  [ ] API keys hashed en database (nunca stored plaintext)
  [ ] Failed auth attempts logged y monitored
  [ ] Token expiration enforced

Authorization:
  [ ] Role-based access control en every endpoint
  [ ] Resource ownership checked (user solo puede access own data)
  [ ] Admin endpoints require admin role
  [ ] Mass assignment prevented (explicit field mapping)

Input Validation:
  [ ] Todos los inputs validated con schema (Pydantic, Zod, Joi)
  [ ] File uploads validated (MIME type, size, content)
  [ ] SQL queries parameterized (no string concatenation)
  [ ] URL parameters validated
  [ ] Request body size limited

Rate Limiting:
  [ ] Rate limiting en todos los endpoints
  [ ] Tiered limits basado en API plan
  [ ] 429 response con Retry-After header
  [ ] Distributed rate limiting (Redis) para multi-instance

CORS:
  [ ] Specific origins allowed (no wildcard con credentials)
  [ ] Allowed methods restricted
  [ ] Allowed headers restricted
  [ ] Preflight cache configured

Logging:
  [ ] Todos los API calls logged con request ID
  [ ] Auth failures logged
  [ ] Access violations logged
  [ ] Response times tracked
  [ ] Sensitive data redacted en logs

Headers:
  [ ] X-Content-Type-Options: nosniff
  [ ] X-Frame-Options: DENY
  [ ] Strict-Transport-Security
  [ ] Server header removed
  [ ] X-Powered-By removed
```

## Preguntas Frecuentes

### ¿Cómo elijo entre API keys y JWT para autenticacion?

Usa API keys para server-to-server communication y long-lived access (service accounts, CI/CD pipelines). Usa JWT para user-facing applications donde tokens expiran y pueden ser refreshed. API keys son simpler pero no pueden encode claims o expire automaticamente. JWTs carry user context (roles, permissions) y expiran, pero require refresh token management. Para public APIs, offer ambos: API keys para developers y OAuth2/JWT para end-user auth.

### ¿Cuál es el mejor rate limiting algorithm?

Token bucket es el mas flexible — allows bursts hasta el bucket capacity mientras maintaining un average rate. Sliding window provee el mas accurate counting pero require mas memory. Fixed window es simplest pero allows bursts en window boundaries. Usa token bucket para user-facing APIs (allows short bursts), sliding window para strict limits (payment APIs), y Redis para distributed rate limiting across multiple instances.

### ¿Cómo prevengo mass assignment vulnerabilities?

Nunca uses `setattr` o `Object.assign` con raw user input. Define explicit request schemas (Pydantic, DTOs) que solo incluyen fields que el user esta allowed de update. Exclude sensitive fields como `role`, `is_admin`, `password_hash`, `balance` de update schemas. Usa `dict(exclude_unset=True)` para solo update fields que fueron explicitly provided. Test mass assignment enviando extra fields en requests y verificando que son ignored.

### ¿Debería usar cursor-based o offset-based pagination?

Usa cursor-based pagination para large datasets y real-time feeds. Es mas rapido (no COUNT query) y avoids skipping items cuando new data es inserted. Usa offset-based pagination para small datasets donde necesitas total page count y random page access. Siempre enforce un maximum page size (e.g., 100 items) regardless del pagination method para prevenir denial of service.

### ¿Cómo aseguro file uploads?

Validate el actual MIME type usando content inspection (python-magic, file command), no el file extension. Limit file size (e.g., 10MB). Storea uploads outside del web root o en object storage (S3, GCS). Generate new filenames — nunca uses el user-supplied filename. Scanear para embedded scripts en images. Usa un dedicated upload service si procesas files (virus scan, image resize). Setea `Content-Disposition: attachment` en download para prevenir inline execution.

### ¿Qué security headers deberia return mi API?

Setea `X-Content-Type-Options: nosniff` para prevenir MIME sniffing. Setea `Strict-Transport-Security` para enforce HTTPS. Setea `X-Frame-Options: DENY` si tu API sirve HTML. Remove `Server` y `X-Powered-By` headers para avoid fingerprinting. Add `Cache-Control: no-store` para authenticated responses. Add `X-Request-ID` para tracing. No setees `Access-Control-Allow-Origin: *` con credentials.

## See Also

- [Complete Guide to OWASP Top 10 2025](/es/guides/complete-guide-owasp-top-10-2025/)
- [API Gateway Design: Resilience, Routing, and Security](/es/guides/api-gateway-design-guide/)
- [API Security Checklist — Authentication to Encryption](/es/guides/api-security-checklist-guide/)
- [Complete Guide to GraphQL Security](/es/guides/complete-guide-graphql-security/)
- [Complete Guide to Authentication Patterns](/es/guides/complete-guide-authentication-patterns/)

