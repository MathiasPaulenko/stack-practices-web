---
contentType: recipes
slug: python-memcached-session-storage
title: "Almacenar Sesiones de Usuario en Memcached con Python"
description: "Usa Memcached como almacen de sesiones distribuido en aplicaciones web Python con pymemcache, gestion de TTL y manejo de failover."
metaDescription: "Almacena sesiones de usuario en Memcached con Python. Usa el cliente pymemcache, configura TTL, serializa sesiones y maneja failover."
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
  metaDescription: "Almacena sesiones de usuario en Memcached con Python. Usa el cliente pymemcache, configura TTL, serializa sesiones y maneja failover."
  keywords:
    - python memcached sessions
    - pymemcache
    - distributed session store
    - session management python
    - memcached ttl
---

## Descripcion general

Memcached es un almacen key-value en memoria distribuido que funciona bien para almacenamiento de sesiones en aplicaciones web. Es simple, rapido y escalable horizontalmente. A diferencia de Redis, no tiene persistencia, estructuras de datos integradas mas alla de strings, ni replicacion — pero para datos de sesion efimeros que pueden regenerarse al re-iniciar sesion, esos tradeoffs son aceptables. A continuacion: usar pymemcache para almacenar sesiones, serializacion, gestion de TTL y failover.

## Cuando Usar Esto

- Almacenamiento de sesiones distribuido entre multiples servidores web
- Datos de sesion efimeros que toleran perdida (usuarios re-inician sesion al vaciar cache)
- Lecturas de sesion de alto throughput donde las features de Redis (persistencia, pub/sub) son innecesarias
- Modelo de sesion key-value simple sin estructuras de datos complejas

## Prerrequisitos

- Python 3.10+
- Servidor Memcached ejecutandose (local o remoto)
- Paquete `pymemcache`

## Solucion

### 1. Instalar pymemcache

```bash
pip install pymemcache
```

### 2. Cliente Basico de Memcached

```python
from pymemcache.client.base import Client

client = Client(("localhost", 11211), connect_timeout=2, timeout=2)

# Establecer un valor con TTL (en segundos)
client.set("user:session:abc123", "alice@example.com", expire=3600)

# Obtener un valor
email = client.get("user:session:abc123")  # Retorna bytes o None

# Eliminar
client.delete("user:session:abc123")
```

### 3. Session Store con Serializacion JSON

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

### 4. Usar Sesiones en una Web App (Flask)

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

### 5. Cluster Memcached con Hashing Consistente

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
    dead_timeout=30,  # Marcar servidor como muerto por 30s despues de fallos
)

# HashClient distribuye claves entre servidores usando hashing consistente
client.set("session:abc", {"user": "alice"}, expire=3600)
session = client.get("session:abc")
```

### 6. Expiracion Deslizante de Sesion

Refrescar el TTL en cada acceso para que los usuarios activos no sean desconectados:

```python
class SlidingSessionStore(SessionStore):
    def get_session(self, session_id: str) -> dict | None:
        key = f"session:{session_id}"
        session = self.client.get(key)
        if session is None:
            return None
        # Resetear TTL en acceso — ventana deslizante
        self.client.set(key, session, expire=self.default_ttl)
        session["last_access"] = time.time()
        return session
```

## Como Funciona

1. **Estructura de claves**: Las sesiones se almacenan como `session:<session_id>`. El ID de sesion es un string URL-safe criptograficamente aleatorio generado con `secrets.token_urlsafe(32)`.
2. **Serializacion**: El modulo `serde` de pymemcache maneja la conversion Python-to-bytes. JSON funciona para dicts simples; usa `pickle` para objetos complejos (pero ten en cuenta las implicaciones de seguridad).
3. **TTL**: El parametro `expire` de Memcached establece el TTL en segundos. Cuando expira, la clave se evicta automaticamente. No se necesita limpieza.
4. **Hashing consistente**: `HashClient` distribuye claves entre multiples servidores Memcached. Si un servidor cae, se marca como muerto y las claves se redistribuyen a los servidores restantes.
5. **Failover**: `retry_attempts` y `dead_timeout` controlan como el cliente maneja fallos de servidor. Un servidor muerto se reintenta despues de `dead_timeout` segundos.

## Variantes

### Middleware de Sesion para FastAPI

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

### Sesiones Encriptadas

Encriptar datos de sesion antes de almacenar en Memcached:

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

### Sesion con CAS (Compare-And-Swap)

Prevenir race conditions al actualizar sesiones concurrentemente:

```python
def update_session_cas(client, session_id, update_fn):
    key = f"session:{session_id}"
    result = client.gets(key)  # Obtiene valor + token CAS
    if result is None:
        return None

    value, cas_token = result
    updated = update_fn(value)

    # Solo establece si el valor no ha cambiado desde gets()
    success = client.cas(key, updated, cas_token, expire=3600)
    if not success:
        raise ConcurrentModificationError("Session was modified by another request")
    return updated
```

## Mejores Practicas

- **Usar IDs de sesion criptograficamente aleatorios**: `secrets.token_urlsafe(32)` genera strings URL-safe de 43 caracteres con 256 bits de entropia.
- **Establecer `httponly`, `secure`, `samesite` en cookies**: Previene robo de sesion por XSS y ataques CSRF.
- **Mantener sesiones pequenas**: Memcached tiene un limite de item de 1MB por defecto. Almacena solo user ID y datos minimos — obtiene el resto de la base de datos.
- **Usar expiracion deslizante para usuarios activos**: Resetear TTL en cada acceso para que los usuarios no sean desconectados mientras estan activos.
- **Monitorear tasa de cache miss**: Alta tasa de miss significa que las sesiones expiran muy rapido o los servidores estan descartando claves.
- **Usar `HashClient` en produccion**: Memcached de un solo servidor es un single point of failure. Ejecuta al menos 2-3 instancias.

## Errores Comunes

- **Almacenar objetos grandes en sesiones**: El limite de 1MB de Memcached puede descartar sesiones grandes silenciosamente. Manten las sesiones bajo 10KB.
- **No manejar retornos `None`**: `client.get()` retorna `None` para claves faltantes o errores de servidor. Siempre verifica `None`.
- **Usar serializacion `pickle` en datos no confiables**: Deserializar pickles no confiables es un riesgo de ejecucion remota de codigo. Usa JSON.
- **Sin manejo de failover**: Un solo servidor Memcached cayendo desconecta a todos los usuarios. Usa `HashClient` con multiples servidores.
- **TTL fijo sin ventana deslizante**: Los usuarios son desconectados a mitad de sesion incluso si estan activos. Resetear TTL en acceso.

## FAQ

**Memcached vs Redis para sesiones — cual es mejor?**

Redis ofrece persistencia, replicacion y estructuras de datos mas ricas. Memcached es mas simple y ligeramente mas rapido para workloads puros key-value. Si necesitas que los datos de sesion sobrevivan reinicios, usa Redis. Si las sesiones son puramente efimeras, Memcached esta bien.

**Que pasa cuando Memcached se queda sin memoria?**

Memcached usa eviction LRU. Cuando la memoria esta llena, los items menos recientemente usados se evictan. Esto significa que las sesiones viejas se descartan — los usuarios con sesiones viejas tendran que re-iniciar sesion.

**Puedo usar Memcached para datos de sesion sensibles?**

Memcached no encripta datos en reposo. Si necesitas almacenar datos sensibles, encriptalos antes de almacenar (ver la variante de Sesiones Encriptadas). La seguridad a nivel red (TLS, red privada) tambien es importante.

**Como manejo fallos de servidor Memcached?**

`HashClient` con `dead_timeout` marca servidores fallidos como muertos y redistribuye claves. Las sesiones en el servidor muerto se pierden — los usuarios tendran que re-iniciar sesion. Para zero-downtime, usa Redis con replicacion en su lugar.

**Cual es el tamano maximo de sesion en Memcached?**

El limite por defecto es 1MB por item. Puedes aumentarlo con el flag `-I 5m` al iniciar Memcached, pero las sesiones grandes afectan el rendimiento. Manten las sesiones pequenas.
