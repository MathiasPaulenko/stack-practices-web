---
contentType: guides
slug: complete-guide-authentication-patterns
title: "Referencia Detallada de Patrones de Autenticación"
description: "Implementar autenticacion en produccion. Cubre JWT, OAuth2, session-based auth, passkeys, MFA, refresh tokens, token rotation, RBAC, ABAC, SSO con SAML y OpenID Connect, y patrones de logout seguro con ejemplos de codigo."
metaDescription: "Implementar auth en produccion. Cubre JWT, OAuth2, session-based auth, passkeys, MFA, refresh tokens, RBAC, ABAC, SSO, OpenID Connect."
difficulty: advanced
topics:
  - security
  - authentication
  - api
tags:
  - authentication
  - security
  - guia
  - jwt
  - oauth2
  - passkeys
  - mfa
  - sso
relatedResources:
  - /guides/security/complete-guide-owasp-top-10-2025
  - /guides/security/complete-guide-api-security
  - /guides/security/complete-guide-secrets-management
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementar auth en produccion. Cubre JWT, OAuth2, session-based auth, passkeys, MFA, refresh tokens, RBAC, ABAC, SSO, OpenID Connect."
  keywords:
    - patrones de autenticacion
    - jwt
    - oauth2
    - session based auth
    - passkeys
    - multi factor auth
    - refresh tokens
    - rbac abac
---

## Introducción

Autenticacion es la front door de every application. Hacerlo wrong significa data breaches, account takeovers, y compliance violations. Esta guia recorre JWT, OAuth2, session-based auth, passkeys (WebAuthn), MFA, refresh token rotation, RBAC/ABAC, y SSO patterns con production-ready code.

## JWT Authentication

### Estructura del Token

```text
JWT Structure: header.payload.signature

Header: {"alg": "RS256", "typ": "JWT"}
Payload: {"sub": "user123", "email": "user@example.com", "role": "admin", "exp": 1735689600}
Signature: RSA-SHA256(header_b64 + "." + payload_b64, private_key)

Security rules:
  - Nunca pongas secrets en JWT payload (es base64, no encrypted)
  - Siempre setea expiration (exp claim)
  - Usa RS256 (asymmetric) no HS256 (symmetric) para multi-service
  - Validate signature, expiration, issuer, y audience en every request
  - Storea tokens en httpOnly cookies, no localStorage
```

### JWT Implementation

```python
import jwt
from datetime import datetime, timedelta
from dataclasses import dataclass

@dataclass
class JWTConfig:
    private_key: str
    public_key: str
    issuer: str = "https://auth.stackpractices.com"
    audience: str = "stackpractices-api"
    access_token_ttl: int = 900       # 15 minutes
    refresh_token_ttl: int = 86400 * 7  # 7 days

class JWTService:
    def __init__(self, config: JWTConfig):
        self.config = config
    
    def generate_access_token(self, user_id: str, claims: dict) -> str:
        now = datetime.utcnow()
        payload = {
            "sub": user_id,
            "iss": self.config.issuer,
            "aud": self.config.audience,
            "iat": now,
            "exp": now + timedelta(seconds=self.config.access_token_ttl),
            "type": "access",
            **claims
        }
        return jwt.encode(payload, self.config.private_key, algorithm="RS256")
    
    def generate_refresh_token(self, user_id: str) -> str:
        now = datetime.utcnow()
        payload = {
            "sub": user_id,
            "iss": self.config.issuer,
            "aud": self.config.audience,
            "iat": now,
            "exp": now + timedelta(seconds=self.config.refresh_token_ttl),
            "type": "refresh",
            "jti": secrets.token_urlsafe(16)  # Unique token ID para rotation
        }
        return jwt.encode(payload, self.config.private_key, algorithm="RS256")
    
    def verify_token(self, token: str, expected_type: str = "access") -> dict:
        try:
            payload = jwt.decode(
                token,
                self.config.public_key,
                algorithms=["RS256"],
                issuer=self.config.issuer,
                audience=self.config.audience,
                options={"require": ["exp", "iss", "aud", "sub", "type"]}
            )
            
            if payload.get("type") != expected_type:
                raise AuthError(f"Expected {expected_type} token, got {payload.get('type')}")
            
            return payload
        except jwt.ExpiredSignatureError:
            raise AuthError("Token expired")
        except jwt.InvalidTokenError as e:
            raise AuthError(f"Invalid token: {e}")

# Uso
config = JWTConfig(
    private_key=open("private.pem").read(),
    public_key=open("public.pem").read()
)
jwt_service = JWTService(config)

# Generate tokens
access_token = jwt_service.generate_access_token("user123", {"role": "admin", "email": "user@example.com"})
refresh_token = jwt_service.generate_refresh_token("user123")

# Verify token
payload = jwt_service.verify_token(access_token)
print(f"User: {payload['sub']}, Role: {payload['role']}")
```

### Refresh Token Rotation

```python
class TokenRotationManager:
    def __init__(self, jwt_service: JWTService, redis_client):
        self.jwt = jwt_service
        self.redis = redis_client
    
    def refresh_tokens(self, refresh_token: str) -> dict:
        # Verify refresh token
        payload = self.jwt.verify_token(refresh_token, expected_type="refresh")
        
        # Checkear si token esta en revocation list
        jti = payload["jti"]
        if self.redis.get(f"revoked:{jti}"):
            raise AuthError("Refresh token has been revoked")
        
        # Revoke old refresh token (rotation)
        self.redis.setex(f"revoked:{jti}", self.jwt.config.refresh_token_ttl, "1")
        
        # Generate new token pair
        new_access = self.jwt.generate_access_token(payload["sub"], {})
        new_refresh = self.jwt.generate_refresh_token(payload["sub"])
        
        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "expires_in": self.jwt.config.access_token_ttl
        }
    
    def revoke_all_tokens(self, user_id: str):
        """Revoke todos los tokens para un user (logout everywhere)."""
        self.redis.setex(f"revoked_user:{user_id}", self.jwt.config.refresh_token_ttl, "1")
    
    def logout(self, refresh_token: str):
        """Revoke un single refresh token."""
        payload = self.jwt.verify_token(refresh_token, expected_type="refresh")
        self.redis.setex(f"revoked:{payload['jti']}", self.jwt.config.refresh_token_ttl, "1")
```

## Session-Based Authentication

```python
import secrets
from datetime import datetime, timedelta
from fastapi import Request, Response

class SessionManager:
    def __init__(self, db, redis_client):
        self.db = db
        self.redis = redis_client
        self.session_ttl = 3600  # 1 hour
        self.cookie_name = "session_id"
    
    def create_session(self, response: Response, user_id: str) -> str:
        session_id = secrets.token_urlsafe(32)
        
        # Storear session en Redis
        self.redis.hset(f"session:{session_id}", mapping={
            "user_id": user_id,
            "created_at": datetime.now().isoformat(),
            "last_access": datetime.now().isoformat()
        })
        self.redis.expire(f"session:{session_id}", self.session_ttl)
        
        # Setear httpOnly, secure, SameSite cookie
        response.set_cookie(
            key=self.cookie_name,
            value=session_id,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=self.session_ttl,
            path="/"
        )
        
        return session_id
    
    def get_session(self, request: Request) -> dict | None:
        session_id = request.cookies.get(self.cookie_name)
        if not session_id:
            return None
        
        session_data = self.redis.hgetall(f"session:{session_id}")
        if not session_data:
            return None
        
        # Update last access time y extend TTL
        self.redis.hset(f"session:{session_id}", "last_access", datetime.now().isoformat())
        self.redis.expire(f"session:{session_id}", self.session_ttl)
        
        return session_data
    
    def destroy_session(self, request: Request, response: Response):
        session_id = request.cookies.get(self.cookie_name)
        if session_id:
            self.redis.delete(f"session:{session_id}")
        
        response.delete_cookie(self.cookie_name, path="/")
    
    def destroy_all_sessions(self, user_id: str):
        """Destroy todas las sessions para un user."""
        for key in self.redis.scan_iter(f"session:*"):
            session_data = self.redis.hgetall(key)
            if session_data.get("user_id") == user_id:
                self.redis.delete(key)
```

## OAuth2 Authorization Code Flow

```python
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
import httpx

app = FastAPI()

class OAuth2Client:
    def __init__(self, config: dict):
        self.client_id = config["client_id"]
        self.client_secret = config["client_secret"]
        self.redirect_uri = config["redirect_uri"]
        self.auth_url = config["auth_url"]
        self.token_url = config["token_url"]
        self.userinfo_url = config["userinfo_url"]
        self.scopes = config["scopes"]
    
    def get_auth_url(self, state: str) -> str:
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.scopes),
            "state": state
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.auth_url}?{query}"
    
    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(self.token_url, data={
                "grant_type": "authorization_code",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri": self.redirect_uri,
                "code": code
            })
            return response.json()
    
    async def get_user_info(self, access_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            return response.json()

# Google OAuth2 example
google_oauth = OAuth2Client({
    "client_id": os.environ["GOOGLE_CLIENT_ID"],
    "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
    "redirect_uri": "https://stackpractices.com/auth/callback",
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_url": "https://oauth2.googleapis.com/token",
    "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
    "scopes": ["openid", "email", "profile"]
})

@app.get("/auth/login")
async def login(request: Request):
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state
    return RedirectResponse(google_oauth.get_auth_url(state))

@app.get("/auth/callback")
async def callback(request: Request, code: str, state: str):
    # Verify state para prevenir CSRF
    stored_state = request.session.get("oauth_state")
    if state != stored_state:
        raise HTTPException(400, "Invalid state")
    
    # Exchange code por tokens
    tokens = await google_oauth.exchange_code(code)
    
    # Get user info
    user_info = await google_oauth.get_user_info(tokens["access_token"])
    
    # Create session o JWT
    session = SessionManager(db, redis)
    return session.create_session(response, user_info["id"])
```

## Passkeys (WebAuthn)

```python
import secrets
import json
from webauthn import generate_registration_options, verify_registration_response
from webauthn import generate_authentication_options, verify_authentication_response

class PasskeyManager:
    def __init__(self, rp_id: str, rp_name: str, origin: str):
        self.rp_id = rp_id
        self.rp_name = rp_name
        self.origin = origin
    
    def generate_registration(self, user_id: str, username: str) -> dict:
        options = generate_registration_options(
            rp_id=self.rp_id,
            rp_name=self.rp_name,
            user_id=user_id.encode(),
            user_name=username,
            authenticator_selection={
                "authenticatorAttachment": "platform",
                "userVerification": "required"
            }
        )
        
        # Storear challenge para verification
        challenge = options.challenge
        
        return {
            "options": json.dumps(options.to_dict()),
            "challenge": challenge
        }
    
    def verify_registration(self, user_id: str, credential: dict, challenge: bytes) -> bool:
        try:
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=challenge,
                expected_origin=self.origin,
                expected_rp_id=self.rp_id
            )
            
            # Storear credential public key y ID
            # db.store_credential(user_id, verification.credential_id, verification.credential_public_key)
            return True
        except Exception as e:
            print(f"Registration verification failed: {e}")
            return False
    
    def generate_authentication(self, user_id: str) -> dict:
        options = generate_authentication_options(
            rp_id=self.rp_id,
            user_verification="required"
        )
        
        return {
            "options": json.dumps(options.to_dict()),
            "challenge": options.challenge
        }
    
    def verify_authentication(self, credential: dict, challenge: bytes, 
                              stored_credential_id: bytes, 
                              stored_public_key: bytes) -> bool:
        try:
            verification = verify_authentication_response(
                credential=credential,
                expected_challenge=challenge,
                expected_origin=self.origin,
                expected_rp_id=self.rp_id,
                credential_is_discoverable=True,
                credential_public_key=stored_public_key,
                credential_current_sign_count=0
            )
            return True
        except Exception as e:
            print(f"Authentication verification failed: {e}")
            return False

# Uso
passkey = PasskeyManager(
    rp_id="stackpractices.com",
    rp_name="StackPractices",
    origin="https://stackpractices.com"
)

# Registration flow
reg = passkey.generate_registration("user123", "user@example.com")
# Frontend: navigator.credentials.create({ publicKey: reg.options })
# User: Touch fingerprint sensor / Face ID
# Backend: passkey.verify_registration("user123", credential, reg.challenge)

# Authentication flow
auth = passkey.generate_authentication("user123")
# Frontend: navigator.credentials.get({ publicKey: auth.options })
# User: Touch fingerprint sensor / Face ID
# Backend: passkey.verify_authentication(credential, auth.challenge, ...)
```

## Multi-Factor Authentication (MFA)

```python
import pyotp
import secrets

class MFAService:
    def __init__(self, db, redis):
        self.db = db
        self.redis = redis
    
    def generate_totp_secret(self) -> str:
        return pyotp.random_base32()
    
    def get_totp_uri(self, secret: str, email: str, issuer: str = "StackPractices") -> str:
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=issuer)
    
    def verify_totp(self, secret: str, code: str) -> bool:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)  # Allow 1 period drift
    
    def generate_backup_codes(self, count: int = 10) -> list:
        return [secrets.token_hex(4).upper() for _ in range(count)]
    
    def verify_backup_code(self, user_id: str, code: str) -> bool:
        stored_codes = self.redis.smembers(f"backup_codes:{user_id}")
        if code.encode() in stored_codes:
            self.redis.srem(f"backup_codes:{user_id}", code)
            return True
        return False
    
    def send_sms_code(self, phone: str) -> str:
        code = f"{secrets.randbelow(1000000):06d}"
        self.redis.setex(f"sms_code:{phone}", 300, code)  # 5 min TTL
        # Send SMS via provider (Twilio, AWS SNS)
        # sms_service.send(phone, f"Your code: {code}")
        return code
    
    def verify_sms_code(self, phone: str, code: str) -> bool:
        stored = self.redis.get(f"sms_code:{phone}")
        if stored and stored.decode() == code:
            self.redis.delete(f"sms_code:{phone}")
            return True
        return False

# Login flow con MFA
class MFAAuthFlow:
    def __init__(self, mfa_service: MFAService, jwt_service: JWTService):
        self.mfa = mfa_service
        self.jwt = jwt_service
    
    def step1_verify_password(self, username: str, password: str) -> dict:
        user = verify_credentials(username, password)
        if not user:
            raise AuthError("Invalid credentials")
        
        if user.mfa_enabled:
            # Return MFA challenge, no full token
            challenge = secrets.token_urlsafe(32)
            self.redis.setex(f"mfa_challenge:{challenge}", 300, user.id)
            return {
                "requires_mfa": True,
                "challenge": challenge,
                "methods": ["totp", "sms", "backup_code"]
            }
        
        # No MFA — return tokens directly
        return self._generate_tokens(user.id)
    
    def step2_verify_mfa(self, challenge: str, method: str, code: str) -> dict:
        user_id = self.redis.get(f"mfa_challenge:{challenge}")
        if not user_id:
            raise AuthError("Invalid or expired challenge")
        
        user = get_user(user_id.decode())
        
        if method == "totp":
            if not self.mfa.verify_totp(user.totp_secret, code):
                raise AuthError("Invalid TOTP code")
        elif method == "sms":
            if not self.mfa.verify_sms_code(user.phone, code):
                raise AuthError("Invalid SMS code")
        elif method == "backup_code":
            if not self.mfa.verify_backup_code(user.id, code):
                raise AuthError("Invalid backup code")
        else:
            raise AuthError("Unknown MFA method")
        
        self.redis.delete(f"mfa_challenge:{challenge}")
        return self._generate_tokens(user.id)
    
    def _generate_tokens(self, user_id: str) -> dict:
        access = self.jwt.generate_access_token(user_id, {})
        refresh = self.jwt.generate_refresh_token(user_id)
        return {
            "requires_mfa": False,
            "access_token": access,
            "refresh_token": refresh,
            "expires_in": self.jwt.config.access_token_ttl
        }
```

## RBAC y ABAC

```python
from enum import Enum
from functools import wraps

class Permission(Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"

# RBAC: Role-Based Access Control
ROLE_PERMISSIONS = {
    "viewer": {Permission.READ},
    "editor": {Permission.READ, Permission.WRITE},
    "admin": {Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN},
}

def check_rbac(user_role: str, required_permission: Permission) -> bool:
    permissions = ROLE_PERMISSIONS.get(user_role, set())
    return required_permission in permissions

# ABAC: Attribute-Based Access Control
class ABACEvaluator:
    def __init__(self):
        self.policies = []
    
    def add_policy(self, policy: dict):
        self.policies.append(policy)
    
    def evaluate(self, subject: dict, resource: dict, action: str) -> bool:
        for policy in self.policies:
            if self._match(policy, subject, resource, action):
                return policy["effect"] == "allow"
        return False  # Default deny
    
    def _match(self, policy: dict, subject: dict, resource: dict, action: str) -> bool:
        # Checkear action
        if action not in policy.get("actions", []):
            return False
        
        # Checkear subject attributes
        for key, value in policy.get("subject", {}).items():
            if subject.get(key) != value:
                return False
        
        # Checkear resource attributes
        for key, value in policy.get("resource", {}).items():
            if resource.get(key) != value:
                return False
        
        return True

# Uso: ABAC policies
abac = ABACEvaluator()
abac.add_policy({
    "effect": "allow",
    "actions": ["read", "write"],
    "subject": {"role": "editor"},
    "resource": {"type": "article", "owner": "$subject.id"}
})
abac.add_policy({
    "effect": "allow",
    "actions": ["read", "write", "delete"],
    "subject": {"role": "admin"},
    "resource": {"type": "article"}
})

# Check access
user = {"id": "user123", "role": "editor"}
article = {"type": "article", "owner": "user123"}
can_edit = abac.evaluate(user, article, "write")  # True
```

## SSO con OpenID Connect

```python
class OIDCProvider:
    def __init__(self, config: dict):
        self.config = config
        self.jwks = self._load_jwks()
    
    def _load_jwks(self) -> dict:
        """Load JSON Web Key Set para token verification."""
        # Fetch desde discovery endpoint
        discovery_url = f"{self.config['issuer']}/.well-known/openid-configuration"
        response = httpx.get(discovery_url)
        config = response.json()
        
        jwks_uri = config["jwks_uri"]
        jwks_response = httpx.get(jwks_uri)
        return jwks_response.json()
    
    def get_authorization_url(self, state: str, nonce: str) -> str:
        params = {
            "client_id": self.config["client_id"],
            "redirect_uri": self.config["redirect_uri"],
            "response_type": "code",
            "scope": "openid profile email",
            "state": state,
            "nonce": nonce
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.config['auth_url']}?{query}"
    
    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(self.config["token_url"], data={
                "grant_type": "authorization_code",
                "client_id": self.config["client_id"],
                "client_secret": self.config["client_secret"],
                "redirect_uri": self.config["redirect_uri"],
                "code": code
            })
            return response.json()
    
    def verify_id_token(self, id_token: str, nonce: str) -> dict:
        # Verify usando JWKS
        from jose import jwt
        decoded = jwt.decode(
            id_token,
            self.jwks,
            algorithms=["RS256"],
            audience=self.config["client_id"],
            issuer=self.config["issuer"]
        )
        
        # Verify nonce para prevenir replay
        if decoded.get("nonce") != nonce:
            raise AuthError("Nonce mismatch")
        
        return decoded
```

## Preguntas Frecuentes

### ¿Debería usar JWT o session-based authentication?

Usa JWT para stateless APIs y microservices donde queres avoid un session store. Usa session-based auth para server-rendered web applications donde necesitas immediate revocation. JWT no puede ser revoked sin un blocklist (lo cual defeat el stateless benefit). Sessions pueden ser destroyed instantly. Para SPAs con APIs, JWT con short-lived access tokens y refresh token rotation es el standard pattern.

### ¿Qué es refresh token rotation y por qué es importante?

Refresh token rotation issue un new refresh token every time el old one es used. Si un attacker steals un refresh token y lo usa, el legitimate user tambien va a try de usarlo y va a get un error (porque ya fue rotated). Esto detecta token theft. Storea el rotated token's old JTI en un revocation list. Implementa un "reuse window" para handle race conditions donde multiple requests usan el mismo refresh token simultaneamente.

### ¿Son los passkeys mejores que las passwords?

Si. Passkeys (WebAuthn) usan public-key cryptography y biometric authentication (fingerprint, Face ID). Son phishing-resistant (bound a origin), no pueden ser reused across sites, y require no shared secret. Users no necesitan remember nada. Implementa passkeys como el primary auth method con passwords o TOTP como fallback durante el transition period.

### ¿Cómo implemento MFA sin hurt UX?

Usa risk-based MFA: solo prompt para MFA en new devices, new IPs, o sensitive actions. Offer passkey (biometric) como el primary MFA — es mas rapido que typing un TOTP code. Allow "remember this device for 30 days" con un secure cookie. Provide backup codes para cuando el primary MFA device esta unavailable. Nunca require MFA para low-risk read-only operations.

### ¿Cuál es la diferencia entre RBAC y ABAC?

RBAC (Role-Based Access Control) assigna permissions a roles, y users get permissions a traves de su role. Es simple pero coarse-grained. ABAC (Attribute-Based Access Control) evalua policies basado en subject attributes (role, department), resource attributes (owner, type), y action. ABAC es mas fine-grained — podes express "editors can edit articles they own" que RBAC no puede. Usa RBAC para simple systems, ABAC para complex authorization rules.

### ¿Cómo implemento secure logout?

Para JWT: add el token JTI a un revocation list en Redis con TTL equal al token's remaining lifetime. Para sessions: delete la session de Redis y clear el cookie. Siempre call `destroy_all_sessions` para "logout everywhere" functionality. Clear ambos access y refresh tokens en el client. Setea cookie expiration al past. Usa `SameSite=Strict` para prevenir logout CSRF.
