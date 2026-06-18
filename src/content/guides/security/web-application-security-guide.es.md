---
contentType: guides
slug: web-application-security-guide
title: "Seguridad de Aplicaciones Web (OWASP Top 10)"
description: "Una guía enfocada en desarrolladores sobre el OWASP Top 10: inyección, control de acceso roto, XSS, diseño inseguro, y cómo prevenir cada vulnerabilidad con ejemplos de código."
metaDescription: "Guía OWASP Top 10 para desarrolladores. Previene inyección, XSS, control de acceso roto, diseño inseguro con ejemplos prácticos de código y checklists."
difficulty: intermediate
topics:
  - security
  - api
tags:
  - api
  - control-de-acceso
  - guia
  - inyeccion
  - owasp-top-10
  - security
  - seguridad-web
  - xss
relatedResources:
  - /guides/security/api-security-checklist-guide
  - /guides/security/security-best-practices-guide
  - /recipes/authentication/jwt-authentication
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía OWASP Top 10 para desarrolladores. Previene inyección, XSS, control de acceso roto, diseño inseguro con ejemplos prácticos de código y checklists."
  keywords:
    - owasp top 10
    - seguridad aplicaciones web
    - prevenir xss
    - prevencion inyeccion sql
    - control de acceso roto
    - codificacion segura
---

# Seguridad de Aplicaciones Web (OWASP Top 10)

## Introducción

El OWASP Top 10 es un documento estándar de concientización sobre riesgos de seguridad en aplicaciones web. Esta guía traduce cada riesgo en técnicas prácticas de prevención con ejemplos de código.

## 1. Control de Acceso Roto

**Riesgo:** Los usuarios acceden a recursos o realizan acciones fuera de sus permisos.

### Prevención

```python
# Malo: confiando en un user ID proporcionado por el cliente
@app.route("/api/orders/<order_id>")
def get_order(order_id):
    order = db.query(f"SELECT * FROM orders WHERE id = {order_id}")
    return jsonify(order)  # ¡cualquier usuario puede ver cualquier orden!

# Bueno: verificar que el usuario autenticado es dueño del recurso
@app.route("/api/orders/<order_id>")
@login_required
def get_order(order_id):
    order = Order.query.filter_by(
        id=order_id,
        user_id=current_user.id  # forzar propiedad
    ).first_or_404()
    return jsonify(order.to_dict())
```

### Checklist

- [ ] Denegar por defecto — retorna 403 a menos que se permita explícitamente
- [ ] Valida propiedad del recurso en cada request
- [ ] Desactiva listado de directorios y path traversal server-side
- [ ] Rate limiting en acceso a API para prevenir enumeración automatizada

## 2. Fallas Criptográficas

**Riesgo:** Datos sensibles expuestos a través de encriptación débil o ausente.

### Prevención

```python
# Malo: almacenamiento en texto plano
user = {"ssn": "123-45-6789", "password": "abc123"}

# Bueno: hashear contraseñas, encriptar PII
from bcrypt import hashpw, gensalt
from cryptography.fernet import Fernet

hashed_password = hashpw("user_password".encode(), gensalt())

cipher = Fernet(ENCRYPTION_KEY)
encrypted_ssn = cipher.encrypt("123-45-6789".encode())
```

### Checklist

- [ ] Hashea contraseñas con bcrypt, Argon2, o PBKDF2
- [ ] Encripta datos sensibles en reposo (PII, datos de salud, financieros)
- [ ] Usa TLS 1.2+ para todos los datos en tránsito
- [ ] No almacenes datos sensibles en storage del cliente (localStorage para tokens)

## 3. Inyección

**Riesgo:** Datos no confiables son enviados a un intérprete como parte de un comando o query.

### Prevención de Inyección SQL

```python
# Malo: interpolación de strings
query = f"SELECT * FROM users WHERE name = '{user_input}'"

# Bueno: consultas parametrizadas
cursor.execute("SELECT * FROM users WHERE name = %s", (user_input,))
```

### Prevención de Inyección de Comandos

```python
# Malo
os.system(f"convert {user_filename} output.png")

# Bueno: validar y whitelist
import subprocess
allowed_extensions = {".png", ".jpg", ".jpeg"}
if not any(user_filename.endswith(ext) for ext in allowed_extensions):
    raise ValueError("Tipo de archivo inválido")
subprocess.run(["convert", user_filename, "output.png"], check=True)
```

### Checklist

- [ ] Usa consultas parametrizadas para todo acceso a base de datos
- [ ] Escapa caracteres especiales en LDAP, XML y comandos del OS
- [ ] Valida y whitelistea entrada de usuario antes de usarla en comandos

## 4. Diseño Inseguro

**Riesgo:** Controles de seguridad ausentes o inefectivos en la arquitectura de la aplicación.

### Prevención

- Modela con threat modeling desde el inicio
- Valida lógica de negocio, no solo sintaxis
- Implementa anti-automatización para flujos sensibles (registro, reset de contraseña)
- Mantén un ciclo de desarrollo seguro

```python
# Anti-automatización en reset de contraseña
def request_password_reset(email):
    if rate_limiter.is_limited(f"reset:{email}"):
        raise TooManyRequests("Intenta más tarde")
    send_reset_email(email)
    rate_limiter.increment(f"reset:{email}")
```

## 5. Configuración de Seguridad Incorrecta

**Riesgo:** Configuraciones incompletas o ad-hoc, cuentas por defecto, características innecesarias.

### Checklist de Prevención

- [ ] Elimina cuentas y credenciales por defecto
- [ ] Desactiva características, puertos y métodos HTTP no necesarios
- [ ] Envía headers de seguridad (HSTS, X-Frame-Options, CSP)
- [ ] Mantén frameworks, bibliotecas y parches del OS actualizados
- [ ] Ejecuta en modo de mínimo privilegio (no root)

## 6. Componentes Vulnerables y Desactualizados

**Riesgo:** Usar componentes con vulnerabilidades conocidas.

### Prevención

```bash
# Escanear dependencias por CVEs conocidos
npm audit
pip-audit
snyk test

# Fijar versiones y automatizar actualizaciones
# package.json
"dependencies": {
  "express": "4.19.2"  // versión exacta, no ^4.0.0
}
```

### Checklist

- [ ] Mantén un software bill of materials (SBOM)
- [ ] Suscríbete a avisos de seguridad para dependencias críticas
- [ ] Elimina dependencias no usadas (reduce superficie de ataque)
- [ ] Prueba actualizaciones en staging antes de producción

## 7. Fallas de Identificación y Autenticación

**Riesgo:** Debilidades de autenticación permiten credential stuffing, fuerza bruta o secuestro de sesión.

### Prevención

```python
# Autenticación multi-factor
@app.route("/login", methods=["POST"])
def login():
    user = authenticate(request.json)
    if not user:
        # Error genérico para prevenir enumeración de usuarios
        raise Unauthorized("Credenciales inválidas")

    if user.mfa_enabled:
        session["pending_user_id"] = user.id
        return {"mfa_required": True}

    create_session(user)
    return {"token": generate_jwt(user)}
```

### Checklist

- [ ] Implementa autenticación multi-factor (MFA)
- [ ] Aplica políticas de contraseñas fuertes (longitud > 12)
- [ ] Rate limiting en intentos de login
- [ ] Usa tokens de sesión seguros (aleatorios, largos, cookies HttpOnly)
- [ ] Invalida sesiones al cambiar contraseña

## 8. Fallas de Integridad de Software y Datos

**Riesgo:** Deserialización insegura, pipelines CI/CD no confiables, auto-actualizaciones sin verificación.

### Prevención

```python
# Malo: deserializar datos no confiables con pickle
import pickle
data = pickle.loads(user_input)  # ¡ejecución de código arbitrario!

# Bueno: usa JSON con validación de esquema
import json
from marshmallow import Schema, fields

data = json.loads(user_input)
schema = UserSchema()
result = schema.load(data)  # valida estructura
```

### Checklist

- [ ] Firma y verifica integridad de datos serializados
- [ ] Verifica integridad del pipeline CI/CD (commits firmados, tags inmutables)
- [ ] No auto-actualices sin verificación criptográfica

## 9. Fallas de Logging y Monitoreo de Seguridad

**Riesgo:** Logging insuficiente permite que atacantes permanezcan no detectados.

### Prevención

```python
import logging
import structlog

logger = structlog.get_logger()

# Loggear eventos de seguridad con contexto
logger.info(
    "user_login",
    user_id=user.id,
    ip_address=request.remote_addr,
    user_agent=request.headers.get("User-Agent"),
    success=True
)
```

### Checklist

- [ ] Loggea todos los eventos de autenticación (éxito y fallo)
- [ ] Loggea fallas de control de acceso
- [ ] Loggea errores de validación de entrada
- [ ] Envía alertas sobre patrones sospechosos
- [ ] Asegura que los logs sean resistentes a manipulación (append-only, centralizados)

## 10. Server-Side Request Forgery (SSRF)

**Riesgo:** El servidor hace requests a destinos no intencionados basados en entrada de usuario.

### Prevención

```python
# Malo: usuario controla la URL
url = request.json.get("webhook_url")
requests.post(url, data=sensitive_data)

# Bueno: validar URL contra allowlist
from urllib.parse import urlparse

ALLOWED_HOSTS = {"api.example.com", "hooks.slack.com"}

def safe_webhook_call(user_url, data):
    parsed = urlparse(user_url)
    if parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("URL no está en allowlist")
    return requests.post(user_url, json=data)
```

### Checklist

- [ ] Valida y whitelistea destinos de requests salientes
- [ ] Desactiva esquemas de URL que no necesitas (file://, ftp://, gopher://)
- [ ] Usa resolvers DNS internos que no expongan servicios internos

## Errores Comunes

- Pensar que la seguridad está "lista" después de una única auditoría — requiere esfuerzo continuo
- Confiar en entrada de usuario para construcción de URLs o rutas de archivos
- Almacenar secretos en código fuente o logs
- Ignorar headers de seguridad porque "solo son headers"
- No loggear fallas de autenticación (pérdida de detección de fuerza bruta)

## Preguntas Frecuentes

**P: ¿Debería corregir todos los items del OWASP Top 10 antes de lanzar?**
R: Ata items críticos (Control de Acceso, Inyección, Fallas Criptográficas) antes del lanzamiento. Otros pueden incorporarse por fases basado en evaluación de riesgo.

**P: ¿Con qué frecuencia debo revisar el OWASP Top 10?**
R: La lista se actualiza cada 3-4 años, pero las amenazas evolucionan continuamente. Revisa tu postura de seguridad trimestralmente.

**P: ¿Es el OWASP Top 10 suficiente para compliance?**
R: Es un punto de partida, no un programa de seguridad completo. Agrega threat modeling, penetration testing y entrenamiento de codificación segura.
