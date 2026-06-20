---
contentType: guides
slug: api-security-checklist-guide
title: "Checklist de Seguridad de APIs"
description: "Una checklist de seguridad integral para APIs: autenticación, autorización, validación de entrada, rate limiting, encriptación, logging y endurecimiento de despliegue."
metaDescription: "Checklist de seguridad de APIs: autenticación, autorización, rate limiting, encriptación, validación de entrada, logging. Asegura APIs REST y GraphQL paso a paso."
difficulty: intermediate
topics:
  - security
  - api
tags:
  - api
  - autenticacion
  - autorizacion
  - encriptacion
  - guia
  - owasp
  - rate-limiting
  - security
  - seguridad-api
relatedResources:
  - /guides/security/security-best-practices-guide
  - /guides/security/web-application-security-guide
  - /guides/api/rest-api-design-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Checklist de seguridad de APIs: autenticación, autorización, rate limiting, encriptación, validación de entrada, logging. Asegura APIs REST y GraphQL paso a paso."
  keywords:
    - checklist seguridad api
    - api rest segura
    - autenticacion api
    - autorizacion api
    - rate limiting api
    - encriptacion api
---

# Checklist de Seguridad de APIs

## Introducción

Las APIs son la columna vertebral de las aplicaciones modernas — y una superficie de ataque primaria. Esta checklist cubre los controles de seguridad esenciales que toda API debe implementar, desde autenticación hasta endurecimiento de despliegue.

## 1. Autenticación

### Usa Autenticación Basada en Tokens Fuertes

```python
# Malo: API keys pasadas en query strings (logueadas por proxies)
GET /data?api_key=abc123

# Bueno: Bearer tokens en header Authorization
GET /data
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Implementa JWT de Forma Segura

```python
import jwt
from datetime import datetime, timedelta

def create_access_token(user_id, secret, algorithm="HS256"):
    payload = {
        "sub": str(user_id),
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "jti": str(uuid.uuid4())  # ID único de token para revocación
    }
    return jwt.encode(payload, secret, algorithm=algorithm)
```

### Checklist de Requisitos

- [ ] Usa HTTPS en todas partes (sin fallback HTTP)
- [ ] Los tokens expiran en **15 minutos o menos** (access tokens)
- [ ] Refresh tokens expiran en **7-30 días** con rotación
- [ ] Almacena tokens de forma segura (cookies HttpOnly para clientes browser)
- [ ] Rechaza tokens con firmas débiles (none, none256)

## 2. Autorización

### Aplica el Principio de Mínimo Privilegio

```python
# Malo: falta verificación de admin
def delete_user(user_id):
    db.execute("DELETE FROM users WHERE id = %s", user_id)

# Bueno: verificar autorización antes de actuar
def delete_user(requesting_user, target_user_id):
    if not requesting_user.has_role("admin"):
        raise Forbidden("Rol admin requerido")
    if requesting_user.id == target_user_id:
        raise BadRequest("No puedes eliminarte a ti mismo")
    db.execute("DELETE FROM users WHERE id = %s", target_user_id)
```

### Checklist

- [ ] Autentica **antes** de autorizar (sin bypass de auth)
- [ ] Valida propiedad del recurso (usuario A no puede acceder datos de usuario B)
- [ ] Control de acceso basado en roles (RBAC) o atributos (ABAC)
- [ ] Denegar por defecto — permitir explícitamente, no confiar implícitamente

## 3. Validación de Entrada

### Valida Todo

```python
from pydantic import BaseModel, Field, validator

class CreateUserRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=12, max_length=128)

    @validator("email")
    def validate_email(cls, v):
        if "@" not in v:
            raise ValueError("Formato de email inválido")
        return v.lower().strip()
```

### Checklist

- [ ] Valida **tipo, longitud, formato y rango** para cada entrada
- [ ] Rechaza campos inesperados (validación de esquema estricta)
- [ ] Sanitiza [subidas de archivos](/recipes/file-handling/file-upload-validation) (extensión, tipo MIME, límites de tamaño)
- [ ] Usa [consultas parametrizadas](/recipes/security/sql-injection-prevention) (previene inyección SQL)
- [ ] Codifica salida para prevenir [XSS](/recipes/security/xss-prevention)

## 4. Rate Limiting

### Previene Abuso

```python
from flask_limiter import Limiter

limiter = Limiter(
    key_func=lambda: request.headers.get("Authorization"),
    default_limits=["100 per minute"]
)

@app.route("/api/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    ...
```

### Checklist

- [ ] [Límites diferentes por endpoint](/recipes/api/rate-limiting) (más estricto para auth, más laxo para lectura)
- [ ] Límites por usuario y por IP
- [ ] Retorna `429 Too Many Requests` con header `Retry-After`
- [ ] Loggea y alerta sobre violaciones repetidas

## 5. Encriptación

### Datos en Tránsito

- TLS 1.2+ solamente
- Suites de cifrado fuertes (sin RC4, DES, MD5)
- Header HSTS para prevenir ataques de downgrade
- Certificate pinning para clientes móviles

### Datos en Reposo

```python
from cryptography.fernet import Fernet

key = Fernet.generate_key()
cipher = Fernet(key)

# Encriptar campos sensibles
ssn_encrypted = cipher.encrypt(b"123-45-6789")
decrypted = cipher.decrypt(ssn_encrypted)
```

### Checklist

- [ ] TLS 1.2+ para toda comunicación de API
- [ ] Encripta datos sensibles en reposo (PII, credenciales, tokens)
- [ ] Hashea contraseñas con bcrypt/Argon2 (nunca MD5 o SHA1)
- [ ] Gestión segura de claves (KMS, HSM, o [vault](/recipes/security/vault-dynamic-credentials) — no en código)

## 6. Manejo de Errores

### No Filtrues Información

```python
# Malo: expone detalles internos
except DatabaseError as e:
    return {"error": str(e)}  # revela esquema, estructura de queries

# Bueno: mensaje genérico al cliente, log detallado server-side
except DatabaseError as e:
    logger.error("Error de base de datos", exc_info=e, extra={"request_id": request.id})
    return {"error": "Error interno del servidor"}, 500
```

### Checklist

- [ ] Mensajes de error genéricos a clientes
- [ ] Logs detallados server-side (con IDs de correlación)
- [ ] Formato de error consistente (RFC 7807 Problem Details)
- [ ] No expongas stack traces, rutas de archivos ni info del sistema

## 7. Logging y Monitoreo

### Qué Loggear

| Evento | Datos a Loggear | Datos a Evitar |
|--------|-----------------|---------------|
| Autenticación | Éxito/fallo, timestamp, IP | Contraseñas, tokens |
| Fallas de autorización | Recurso, acción, usuario | Payload sensible |
| Hits de rate limit | Usuario/IP, endpoint | Cuerpo completo de request |
| Errores | Tipo de error, ID de request, endpoint | Stack traces en logs de cliente |

### Checklist

- [ ] Loggea todos los intentos de autenticación (éxito y fallo)
- [ ] Alerta sobre patrones anómalos (IPs inusuales, picos de volumen)
- [ ] Retén logs para investigación de incidentes (30-90 días)
- [ ] Agregación centralizada de logs (SIEM o equivalente)

## 8. CORS y Headers

```python
# Política CORS estricta
from flask_cors import CORS

CORS(app, origins=["https://app.example.com"], supports_credentials=True)

# Headers de seguridad
@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response
```

### Checklist

- [ ] Restringe CORS a orígenes conocidos (no `*` con credentials)
- [ ] Establece headers de seguridad en todas las respuestas
- [ ] Desactiva banners de versión del servidor (nginx, Apache, framework)

## 9. Endurecimiento de Despliegue

- [ ] Ejecuta API en red aislada (VPC, subnets privadas)
- [ ] Usa un Web Application Firewall (WAF)
- [ ] Mantén dependencias actualizadas (escaneo automatizado de vulnerabilidades)
- [ ] Desactiva endpoints y métodos HTTP no usados
- [ ] Ejecuta con usuario de sistema de mínimo privilegio (no root)

## Errores Comunes

- Confiar en validación del lado del cliente (siempre valida server-side)
- Almacenar secretos en variables de entorno sin rotación
- Usar IDs predecibles (`/user/1`, `/user/2`) sin verificaciones de autorización
- Faltar límites de paginación (DoS vía `?limit=999999`)
- CORS configurado a `*` en producción

## Preguntas Frecuentes

**P: ¿Debería usar OAuth 2.0 o API keys para mi API?**
R: OAuth 2.0 para APIs orientadas a usuarios con integraciones de terceros. API keys son adecuadas para server-to-server donde la clave se mantiene secreta.

**P: ¿Con qué frecuencia debo rotar las claves de firma?**
R: Al menos anualmente, o inmediatamente si hay compromiso. Usa versionado de claves para rotar sin downtime.

**P: ¿Es GraphQL menos seguro que REST?**
R: No inherentemente, pero requiere controles diferentes: límites de profundidad de query, análisis de complejidad, y autorización a nivel de campo para prevenir agotamiento de recursos.
