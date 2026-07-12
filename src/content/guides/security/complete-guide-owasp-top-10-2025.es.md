---



contentType: guides
slug: complete-guide-owasp-top-10-2025
title: "Referencia Detallada de OWASP Top 10 2025"
description: "Mitigar cada riesgo del OWASP Top 10 2025 con ejemplos de codigo practicos. Cubre broken access control, fallas criptograficas, injection, insecure design, security misconfiguration, componentes vulnerables, fallas de auth, integridad de software, fallas de logging y SSRF."
metaDescription: "Mitigar riesgos OWASP Top 10 2025 con codigo. Cubre broken access control, crypto failures, injection, SSRF, insecure design, misconfiguration."
difficulty: advanced
topics:
  - security
  - architecture
  - api
tags:
  - owasp
  - security
  - guia
  - owasp-top-10
  - vulnerability
  - mitigation
  - web-security
  - injection
relatedResources:
  - /guides/complete-guide-authentication-patterns
  - /guides/complete-guide-api-security
  - /guides/complete-guide-secrets-management
  - /guides/complete-guide-supply-chain-security
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Mitigar riesgos OWASP Top 10 2025 con codigo. Cubre broken access control, crypto failures, injection, SSRF, insecure design, misconfiguration."
  keywords:
    - owasp top 10 2025
    - broken access control
    - fallas criptograficas
    - injection attacks
    - insecure design
    - security misconfiguration
    - componentes vulnerables
    - ssrf



---

## Introducción

El OWASP Top 10 es el documento de awareness estandar para seguridad de aplicaciones web. La edicion 2025 refleja el evolving threat landscape, con shifts en como las aplicaciones son construidas y desplegadas. Lo siguiente recorre cada risk con practical mitigation code examples en Python, JavaScript, y Java.

## A01: Broken Access Control

### El Problema

Access control falla cuando users pueden acceder a resources o perform actions fuera de sus intended permissions. Esto incluye horizontal privilege escalation (acceder a data de otros users) y vertical privilege escalation (acceder a admin functions como regular user).

### Codigo Vulnerable

```python
# VULNERABLE: No access control check
@app.get("/api/users/{user_id}")
def get_user(user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    return user

# VULNERABLE: Trusting client-side role
@app.put("/api/users/{user_id}/role")
def update_role(user_id: int, role: str):
    user = db.query(User).filter(User.id == user_id).first()
    user.role = role  # Anyone can set any role!
    db.commit()
```

### Mitigacion

```python
from fastapi import Depends, HTTPException, status

def get_current_user(token: str = Depends(oauth2_scheme)):
    # Validate token y return user
    user = decode_jwt(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

def require_role(required_role: str):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

@app.get("/api/users/{user_id}")
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user)
):
    # Horizontal access control: users solo pueden acceder a su propia data
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/users/{user_id}/role")
def update_role(
    user_id: int,
    role: str,
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    user.role = role
    db.commit()
    return {"status": "updated"}
```

### Mitigacion en JavaScript

```javascript
// Express middleware para access control
function requireOwnership(paramName = 'userId') {
    return (req, res, next) => {
        const resourceId = parseInt(req.params[paramName]);
        if (req.user.id !== resourceId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
}

function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

// Aplicar middleware
app.get('/api/users/:userId', authenticate, requireOwnership(), getUser);
app.put('/api/users/:userId/role', authenticate, requireRole('admin'), updateRole);
```

## A02: Cryptographic Failures

### El Problema

Sensitive data exposure a traves de weak encryption, hardcoded keys, insecure protocols, o plaintext storage de passwords y tokens.

### Codigo Vulnerable

```python
# VULNERABLE: Storear passwords en plaintext
def register_user(username, password):
    user = User(username=username, password=password)  # Plaintext!
    db.add(user)
    db.commit()

# VULNERABLE: Weak encryption
import hashlib
def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()  # MD5 is broken!

# VULNERABLE: Hardcoded encryption key
ENCRYPTION_KEY = "my_secret_key_123"
```

### Mitigacion

```python
import bcrypt
import secrets
from cryptography.fernet import Fernet
import os

# Secure password hashing con bcrypt
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def register_user(username: str, password: str):
    hashed = hash_password(password)
    user = User(username=username, password_hash=hashed)
    db.add(user)
    db.commit()

# Secure encryption con environment-based keys
def get_encryption_key() -> bytes:
    key = os.environ.get("ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("ENCRYPTION_KEY not set")
    return key.encode()

def encrypt_data(plaintext: str) -> str:
    f = Fernet(get_encryption_key())
    return f.encrypt(plaintext.encode()).decode()

def decrypt_data(ciphertext: str) -> str:
    f = Fernet(get_encryption_key())
    return f.decrypt(ciphertext.encode()).decode()

# Secure token generation
def generate_api_token() -> str:
    return secrets.token_urlsafe(32)  # 256-bit token
```

## A03: Injection

### El Problema

Injection ocurre cuando untrusted data es enviada a un interpreter como parte de un command o query. Esto incluye SQL injection, NoSQL injection, command injection, y LDAP injection.

### Codigo Vulnerable

```python
# VULNERABLE: SQL injection
def get_user_by_email(email):
    query = f"SELECT * FROM users WHERE email = '{email}'"
    return db.execute(query)
    # Attack: email = "' OR 1=1 --" returns all users

# VULNERABLE: Command injection
import subprocess
def ping_host(host):
    result = subprocess.run(f"ping -c 1 {host}", shell=True)
    return result.stdout
    # Attack: host = "localhost; rm -rf /"
```

### Mitigacion

```python
# SAFE: Parameterized queries
def get_user_by_email(email: str):
    query = "SELECT * FROM users WHERE email = :email"
    return db.execute(query, {"email": email})

# SAFE: ORM con built-in parameterization
def get_user_by_email(email: str):
    return db.query(User).filter(User.email == email).first()

# SAFE: Command execution sin shell
import subprocess
def ping_host(host: str):
    # Validate input
    import re
    if not re.match(r'^[a-zA-Z0-9.\-]+$', host):
        raise ValueError("Invalid hostname")
    
    result = subprocess.run(
        ["ping", "-c", "1", host],
        capture_output=True,
        text=True,
        shell=False  # Nunca usar shell=True con user input
    )
    return result.stdout

# SAFE: NoSQL injection prevention
def find_user(query_dict: dict):
    # Sanitize input — reject operators
    sanitized = {}
    for key, value in query_dict.items():
        if isinstance(value, dict) and any(k.startswith('$') for k in value):
            raise ValueError("Operators not allowed")
        sanitized[key] = value
    return db.users.find_one(sanitized)
```

## A04: Insecure Design

### El Problema

Insecure design se refiere a missing o ineffective security controls by design. Esto no es sobre implementation bugs sino sobre architectural decisions que fail to account for threats.

### Mitigacion: Threat Modeling

```python
# Design pattern: Rate limiting para registration endpoint
from datetime import datetime, timedelta
from collections import defaultdict

class RegistrationRateLimiter:
    def __init__(self):
        self.attempts: dict[str, list[datetime]] = defaultdict(list)
        self.max_attempts = 3
        self.window_hours = 24
    
    def can_register(self, ip: str, email: str) -> bool:
        now = datetime.now()
        cutoff = now - timedelta(hours=self.window_hours)
        
        # Clean old attempts
        key = f"{ip}:{email}"
        self.attempts[key] = [t for t in self.attempts[key] if t > cutoff]
        
        if len(self.attempts[key]) >= self.max_attempts:
            return False
        
        self.attempts[key].append(now)
        return True

# Design pattern: Secure defaults
class UserAccount:
    def __init__(self, username: str, email: str):
        self.username = username
        self.email = email
        self.is_verified = False  # Default: unverified
        self.is_active = False    # Default: inactive until verified
        self.mfa_enabled = False
        self.failed_login_count = 0
        self.locked_until = None
    
    def verify_email(self, token: str) -> bool:
        if self._validate_token(token):
            self.is_verified = True
            self.is_active = True
            return True
        return False

# Design pattern: Principle of least privilege
class Permission:
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"

class Role:
    VIEWER = {Permission.READ}
    EDITOR = {Permission.READ, Permission.WRITE}
    ADMIN = {Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN}

def check_permission(user_role: set, required: str) -> bool:
    return required in user_role
```

## A05: Security Misconfiguration

### El Problema

Security misconfiguration incluye default credentials, open cloud storage, verbose error messages, unnecessary features enabled, y missing security headers.

### Mitigacion

```python
# Secure FastAPI configuration
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

app = FastAPI(
    docs_url=None,        # Disable docs en production
    redoc_url=None,       # Disable redoc en production
    openapi_url=None      # Disable OpenAPI schema en production
)

# Strict CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://stackpractices.com"],  # Specific origins only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# HTTPS redirect
app.add_middleware(HTTPSRedirectMiddleware)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

# Generic error handler — no stack traces
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}  # No stack trace
    )
```

### Docker Security Configuration

```dockerfile
# Secure Dockerfile
FROM python:3.12-slim AS base

# Run as non-root user
RUN useradd -m -u 1001 appuser
USER appuser

# Set working directory
WORKDIR /app

# Copy only necessary files
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

# No shell, read-only filesystem
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8000/health || exit 1
```

## A06: Vulnerable and Outdated Components

### Mitigacion

```bash
# Python: Checkear vulnerabilities
pip install pip-audit
pip-audit

# Node.js: Checkear vulnerabilities
npm audit
npm audit fix

# Java: Checkear dependencies
./gradlew dependencyCheck
```

```python
# Automated dependency scanning en CI/CD
# .github/workflows/security.yml
"""
name: Security Scanning
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Python dependency check
        run: |
          pip install pip-audit
          pip-audit --strict
      - name: npm audit
        run: |
          npm audit --audit-level=high
      - name: Trivy filesystem scan
        run: |
          trivy fs --severity HIGH,CRITICAL .
"""
```

## A07: Identification and Authentication Failures

### Mitigacion

```python
import bcrypt
import secrets
from datetime import datetime, timedelta

class AuthService:
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=15)
    
    def __init__(self, db, email_service):
        self.db = db
        self.email_service = email_service
    
    def login(self, username: str, password: str) -> dict:
        user = self.db.query(User).filter(User.username == username).first()
        
        # Always run bcrypt para prevenir timing attacks
        if not user:
            bcrypt.checkpw(password.encode(), b"$2b$12$dummyhash")
            raise AuthError("Invalid credentials")
        
        # Checkear account lockout
        if user.locked_until and user.locked_until > datetime.now():
            raise AuthError(f"Account locked until {user.locked_until}")
        
        # Verify password
        if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
            user.failed_login_count += 1
            if user.failed_login_count >= self.MAX_LOGIN_ATTEMPTS:
                user.locked_until = datetime.now() + self.LOCKOUT_DURATION
                user.failed_login_count = 0
            self.db.commit()
            raise AuthError("Invalid credentials")
        
        # Reset on successful login
        user.failed_login_count = 0
        user.locked_until = None
        
        # Generate session token
        token = secrets.token_urlsafe(32)
        user.session_token = token
        user.session_expires = datetime.now() + timedelta(hours=1)
        self.db.commit()
        
        return {"token": token, "expires_in": 3600}
    
    def logout(self, token: str):
        user = self.db.query(User).filter(User.session_token == token).first()
        if user:
            user.session_token = None
            user.session_expires = None
            self.db.commit()
    
    def initiate_password_reset(self, email: str):
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            # No revelar si email existe
            return
        
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_expires = datetime.now() + timedelta(hours=1)
        self.db.commit()
        
        self.email_service.send(user.email, "Password Reset", f"Token: {reset_token}")
```

## A08: Software and Data Integrity Failures

### Mitigacion

```python
import hashlib
import hmac

# Verify webhook signatures
def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    # Use constant-time comparison
    return hmac.compare_digest(expected, signature)

# Verify downloaded dependencies
def verify_download(content: bytes, expected_sha256: str) -> bool:
    actual = hashlib.sha256(content).hexdigest()
    return hmac.compare_digest(actual, expected_sha256)

# Signed JWT verification
import jwt

def verify_jwt(token: str, public_key: str) -> dict:
    try:
        # Verify signature, expiration, y issuer
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],  # Specify allowed algorithms
            issuer="https://auth.stackpractices.com",
            audience="stackpractices-api"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthError("Token expired")
    except jwt.InvalidTokenError:
        raise AuthError("Invalid token")
```

## A09: Security Logging and Monitoring Failures

### Mitigacion

```python
import logging
import json
from datetime import datetime

class SecurityLogger:
    def __init__(self):
        self.logger = logging.getLogger("security")
        handler = logging.FileHandler("/var/log/app/security.log")
        handler.setFormatter(logging.Formatter('%(message)s'))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def log_auth_event(self, event_type: str, user_id: str, ip: str, success: bool):
        self.logger.info(json.dumps({
            "timestamp": datetime.now().isoformat(),
            "event": event_type,
            "user_id": user_id,
            "ip": ip,
            "success": success,
            "type": "authentication"
        }))
    
    def log_access_denied(self, user_id: str, resource: str, ip: str):
        self.logger.warning(json.dumps({
            "timestamp": datetime.now().isoformat(),
            "event": "access_denied",
            "user_id": user_id,
            "resource": resource,
            "ip": ip,
            "type": "authorization"
        }))
    
    def log_security_event(self, event: str, details: dict):
        self.logger.warning(json.dumps({
            "timestamp": datetime.now().isoformat(),
            "event": event,
            "details": details,
            "type": "security"
        }))

# Uso
sec_logger = SecurityLogger()

# Log login attempts
sec_logger.log_auth_event("login", user.id, request.client.host, True)
sec_logger.log_auth_event("login_failed", username, request.client.host, False)

# Log access violations
sec_logger.log_access_denied(user.id, f"/api/users/{target_id}", request.client.host)

# Log suspicious activity
sec_logger.log_security_event("sql_injection_attempt", {
    "ip": request.client.host,
    "input": user_input[:200]  # Truncate
})
```

## A10: Server-Side Request Forgery (SSRF)

### El Problema

SSRF ocurre cuando un server fetcha un remote resource basado en user-supplied URL sin proper validation. Attackers pueden usar esto para acceder a internal services, cloud metadata endpoints, o scanear internal networks.

### Codigo Vulnerable

```python
# VULNERABLE: Fetching user-supplied URL
import requests

def fetch_url(url: str) -> str:
    response = requests.get(url)  # No validation!
    return response.text
    # Attack: url = "http://169.254.169.254/latest/meta-data/" (AWS metadata)
    # Attack: url = "http://localhost:8080/admin"
    # Attack: url = "http://10.0.0.1/internal-service"
```

### Mitigacion

```python
import ipaddress
import socket
import requests
from urllib.parse import urlparse

class SSRFProtector:
    BLOCKED_IP_RANGES = [
        ipaddress.ip_network("10.0.0.0/8"),
        ipaddress.ip_network("172.16.0.0/12"),
        ipaddress.ip_network("192.168.0.0/16"),
        ipaddress.ip_network("169.254.0.0/16"),  # Link-local / cloud metadata
        ipaddress.ip_network("127.0.0.0/8"),     # Loopback
        ipaddress.ip_network("0.0.0.0/8"),       # Current network
        ipaddress.ip_network("::1/128"),         # IPv6 loopback
        ipaddress.ip_network("fc00::/7"),        # IPv6 ULA
    ]
    
    ALLOWED_SCHEMES = {"http", "https"}
    ALLOWED_PORTS = {80, 443, 8080, 8443}
    
    def validate_url(self, url: str) -> bool:
        parsed = urlparse(url)
        
        # Checkear scheme
        if parsed.scheme not in self.ALLOWED_SCHEMES:
            return False
        
        # Checkear port
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        if port not in self.ALLOWED_PORTS:
            return False
        
        # Resolve hostname y checkear IP
        try:
            ips = socket.getaddrinfo(parsed.hostname, port)
            for ip_info in ips:
                ip = ipaddress.ip_address(ip_info[4][0])
                for blocked in self.BLOCKED_IP_RANGES:
                    if ip in blocked:
                        return False
        except socket.gaierror:
            return False
        
        return True
    
    def safe_fetch(self, url: str, timeout: int = 10) -> str:
        if not self.validate_url(url):
            raise ValueError("URL validation failed")
        
        response = requests.get(url, timeout=timeout, allow_redirects=False)
        
        # Checkear redirect no apunta a internal IP
        if response.status_code in (301, 302, 307, 308):
            location = response.headers.get("Location", "")
            if not self.validate_url(location):
                raise ValueError("Redirect target validation failed")
        
        return response.text

protector = SSRFProtector()

def fetch_url(url: str) -> str:
    return protector.safe_fetch(url)
```

## Preguntas Frecuentes

### ¿Con qué frecuencia debería checkear mi aplicacion contra el OWASP Top 10?

Run security audits contra el OWASP Top 10 al menos quarterly. Usa automated tools (OWASP ZAP, Burp Suite) para continuous scanning. Conduce manual penetration testing anualmente. Review despues de major architecture changes. Integra SAST y DAST tools en CI/CD para every pull request.

### ¿Cuál es la diferencia entre SAST y DAST?

SAST (Static Application Security Testing) analiza source code sin running it. Encuentra vulnerabilities como SQL injection patterns, hardcoded secrets, y insecure crypto. DAST (Dynamic Application Security Testing) testea la running application desde afuera, simulando attacks. Usa ambos: SAST catches issues early en development, DAST catches runtime vulnerabilities.

### ¿Cómo implemento security headers correctamente?

Setea estos headers en todas las HTTP responses: `Strict-Transport-Security` (enforce HTTPS), `X-Content-Type-Options: nosniff` (prevenir MIME sniffing), `X-Frame-Options: DENY` (prevenir clickjacking), `Content-Security-Policy` (controlar resource loading), `Referrer-Policy` (limitar referrer leakage), `Permissions-Policy` (restrict browser APIs). Usa middleware para aplicarlas globalmente.

### ¿Cuál es la OWASP vulnerability mas comun en produccion?

Broken access control (A01) es consistentemente la vulnerability mas comun e impactful. Account for la mayoria de real-world breaches. Implementa server-side access control checks en every request. Nunca confies en client-side authorization. Usa middleware o decorators para enforce permissions consistentemente.

### ¿Cómo prevengo SSRF attacks?

Valida todas las user-supplied URLs antes de fetching. Blockea requests a private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x). Blockea cloud metadata endpoints. Restrict allowed schemes (http, https only). Follow redirects manualmente con validation. Usa una dedicated SSRF protection library. Considera usar un egress proxy que enforce estas rules.

### ¿Debería usar un WAF (Web Application Firewall)?

Si, un WAF provee una additional defense layer filtrando malicious requests. Blockea SQL injection, XSS, y otros common attacks antes de que lleguen a tu aplicacion. Usa cloud WAFs (AWS WAF, Cloudflare, Azure Front Door) para ease of setup. Pero un WAF no es substitute para fixear vulnerabilities en tu codigo — es defense in depth.

## See Also

- [Complete Guide to API Security](/es/guides/complete-guide-api-security/)
- [Web Application Security (OWASP Top 10)](/es/guides/web-application-security-guide/)
- [API Security Checklist — Authentication to Encryption](/es/guides/api-security-checklist-guide/)
- [Complete Guide to GraphQL Security](/es/guides/complete-guide-graphql-security/)
- [API Gateway Design: Resilience, Routing, and Security](/es/guides/api-gateway-design-guide/)

