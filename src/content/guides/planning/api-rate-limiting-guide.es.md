---




contentType: guides
slug: api-rate-limiting-guide
title: "Rate Limiting de APIs — Diseña Throttling Justo y Útil"
description: "Guía práctica para rate limiting de APIs: algoritmos de token bucket, leaky bucket, ventana deslizante, elección de límites e implementación de throttling resiliente para APIs."
metaDescription: "Aprende diseño de rate limiting para APIs: token bucket, leaky bucket, ventana deslizante y elección de límites justos para APIs resilientes."
difficulty: intermediate
topics:
  - api
  - performance
  - devops
tags:
  - rate-limiting
  - throttling
  - api-gateway
  - token-bucket
  - sliding-window
  - leaky-bucket
  - resiliencia
  - guia
relatedResources:
  - /guides/rest-api-design-guide
  - /guides/api-gateway-design-guide
  - /guides/api-security-checklist-guide
  - /guides/performance-optimization-guide
  - /guides/sre-practices-guide
  - /docs/api-rate-limiting-policy-template
  - /guides/complete-guide-openai-api-mastery
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende diseño de rate limiting para APIs: token bucket, leaky bucket, ventana deslizante y elección de límites justos para APIs resilientes."
  keywords:
    - rate-limiting
    - throttling
    - api-gateway
    - token-bucket
    - sliding-window
    - leaky-bucket
    - resiliencia
    - guia




---

## Overview

El rate limiting controla la cantidad de requests de API que un cliente puede hacer en un período de tiempo determinado. Protege tu backend de sobrecarga, asegura compartición justa de recursos y previene abuso. Límites bien diseñados equilibran experiencia de usuario con protección del sistema.

A continuación: algoritmos de rate limiting, estrategias de implementación y elección de límites apropiados.

## When to Use


- For alternatives, see [API Rate Limiting Policy Template](/es/docs/api-rate-limiting-policy-template/).

- Tu API es pública y podría ser abusada por actores maliciosos
- Tienes capacidad de backend limitada y necesitas prevenir sobrecarga
- Ofreces niveles de servicio escalonados (gratis, pro, enterprise)
- Quieres prevenir fallas en cascada durante picos de tráfico
- Necesitas cumplir con acuerdos de consumo de APIs de socios

## Core Concepts

| Concepto | Descripción |
|----------|-------------|
| **Límite de Tasa** | Requests máximas permitidas por ventana de tiempo |
| **Cuota** | Asignación total sobre un período más largo (ej. llamadas API mensuales) |
| **Throttling** | Retrasar o rechazar requests que exceden límites |
| **Ráfaga** | Permiso temporal por encima de la tasa estable |
| **Ventana** | Período de tiempo sobre el cual se aplican límites |
| **Identidad de Cliente** | Cómo se identifican llamadores (IP, API key, user ID, org ID) |

## Rate Limiting Algorithms

### Token Bucket

Permite ráfagas hasta la capacidad del bucket manteniendo tasa promedio:

```python
import time
from threading import Lock

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity      # Tamaño máximo de ráfaga
        self.tokens = capacity        # Tokens disponibles actualmente
        self.refill_rate = refill_rate  # Tokens añadidos por segundo
        self.last_refill = time.time()
        self.lock = Lock()

    def allow_request(self, tokens: int = 1) -> bool:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_refill
            self.tokens = min(
                self.capacity,
                self.tokens + elapsed * self.refill_rate
            )
            self.last_refill = now

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

# Ejemplo: 10 requests/segundo con ráfaga de 20
bucket = TokenBucket(capacity=20, refill_rate=10)
```

**Mejor para:** APIs que necesitan tolerancia a ráfagas (ej. APIs orientadas a usuarios con tráfico esporádico).

### Leaky Bucket

Suaviza ráfagas en una tasa de flujo estable:

```python
import time
from collections import deque
from threading import Lock

class LeakyBucket:
    def __init__(self, capacity: int, leak_rate: float):
        self.capacity = capacity    # Tamaño máximo de cola
        self.leak_rate = leak_rate  # Requests procesados por segundo
        self.queue = deque()
        self.last_leak = time.time()
        self.lock = Lock()

    def allow_request(self) -> bool:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_leak
            # Remover requests procesados de la cola
            to_leak = int(elapsed * self.leak_rate)
            for _ in range(min(to_leak, len(self.queue))):
                self.queue.popleft()
            self.last_leak = now

            if len(self.queue) < self.capacity:
                self.queue.append(now)
                return True
            return False
```

**Mejor para:** Webhooks, pipelines de procesamiento y situaciones que requieren limitación de tasa estricta.

### Sliding Window Log

El más preciso pero intensivo en memoria:

```python
import time
from collections import deque
from threading import Lock

class SlidingWindowLog:
    def __init__(self, window_size: int, max_requests: int):
        self.window_size = window_size  # Segundos
        self.max_requests = max_requests
        self.requests = deque()
        self.lock = Lock()

    def allow_request(self) -> bool:
        with self.lock:
            now = time.time()
            cutoff = now - self.window_size

            # Remover requests fuera de la ventana
            while self.requests and self.requests[0] < cutoff:
                self.requests.popleft()

            if len(self.requests) < self.max_requests:
                self.requests.append(now)
                return True
            return False
```

**Mejor para:** Requerimientos de cumplimiento estricto donde la aplicación exacta importa.

### Sliding Window Counter

Aproximación con mejor eficiencia de memoria:

```python
import math
import time
from threading import Lock

class SlidingWindowCounter:
    def __init__(self, window_size: int, max_requests: int):
        self.window_size = window_size
        self.max_requests = max_requests
        self.current_window = int(time.time() // window_size)
        self.current_count = 0
        self.previous_count = 0
        self.lock = Lock()

    def allow_request(self) -> bool:
        with self.lock:
            now = int(time.time())
            window = now // self.window_size

            if window != self.current_window:
                self.previous_count = self.current_count
                self.current_count = 0
                self.current_window = window

            # Estimar requests en ventana deslizante
            elapsed = now % self.window_size
            weight = 1 - (elapsed / self.window_size)
            estimated = (self.previous_count * weight) + self.current_count

            if estimated < self.max_requests:
                self.current_count += 1
                return True
            return False
```

**Mejor para:** APIs de alto tráfico donde la eficiencia de memoria es importante.

## Choosing Rate Limits

### Factores a Considerar

| Factor | Guía |
|--------|------|
| **Costo de endpoint** | Endpoints caros (ML, reportes) obtienen límites más bajos |
| **Nivel de usuario** | Gratis: 100/hr, Pro: 10,000/hr, Enterprise: custom |
| **Restricciones de recursos** | Limitar basado en capacidad backend, no números arbitrarios |
| **Justicia** | Límites por usuario previenen que un cliente sature a otros |
| **Valor de negocio** | Proteger endpoints generadores de ingresos más estrictamente |

### Ejemplo de Límites por Nivel

```yaml
# Ejemplo: Límites de tasa escalonados para API SaaS
tiers:
  free:
    requests_per_minute: 60
    requests_per_hour: 1000
    requests_per_day: 10000
    burst: 10
  pro:
    requests_per_minute: 600
    requests_per_hour: 10000
    requests_per_day: 100000
    burst: 100
  enterprise:
    requests_per_minute: 6000
    requests_per_hour: 100000
    requests_per_day: 1000000
    burst: 1000
```

## Implementation Strategies

### Rate Limiting a Nivel de Gateway

Aplicar límites en el API gateway para control centralizado:

```nginx
# Ejemplo: Rate limiting de NGINX
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $api_key zone=pro:10m rate=100r/s;

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
    }
}
```

### Rate Limiting a Nivel de Aplicación

Control fino dentro de tu aplicación:

```python
from fastapi import FastAPI, HTTPException, Request
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis

app = FastAPI()

@app.on_event("startup")
async def startup():
    app.state.redis = await redis.from_url("redis://localhost")
    await FastAPILimiter.init(app.state.redis)

@app.get("/api/data")
async def get_data(request: Request):
    # Límite de tasa: 100 requests por minuto por API key
    key = request.headers.get("X-API-Key", request.client.host)
    if not await check_rate_limit(key, max_requests=100, window=60):
        raise HTTPException(
            status_code=429,
            detail="Límite de tasa excedido. Intenta más tarde."
        )
    return {"data": "..."}
```

### Rate Limiting Distribuido

Compartir estado entre múltiples instancias:

```python
# Token bucket distribuido basado en Redis
import redis

class RedisTokenBucket:
    def __init__(self, redis_client: redis.Redis, key: str, capacity: int, refill_rate: float):
        self.redis = redis_client
        self.key = key
        self.capacity = capacity
        self.refill_rate = refill_rate

    def allow_request(self, tokens: int = 1) -> bool:
        lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local tokens_requested = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])

        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local current_tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now

        local elapsed = now - last_refill
        local new_tokens = math.min(capacity, current_tokens + elapsed * refill_rate)

        if new_tokens >= tokens_requested then
            new_tokens = new_tokens - tokens_requested
            redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
            redis.call('EXPIRE', key, 60)
            return 1
        else
            redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
            redis.call('EXPIRE', key, 60)
            return 0
        end
        """
        return self.redis.eval(
            lua_script, 1, self.key,
            self.capacity, self.refill_rate, tokens, time.time()
        ) == 1
```

## HTTP Response Headers

Comunicar límites claramente a clientes:

| Header | Descripción | Ejemplo |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Requests máximas permitidas | `100` |
| `X-RateLimit-Remaining` | Requests restantes en ventana | `42` |
| `X-RateLimit-Reset` | Timestamp Unix cuando el límite resetea | `1704067200` |
| `Retry-After` | Segundos para esperar antes de reintentar | `60` |

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200
Retry-After: 60

{
  "error": "Límite de tasa excedido",
  "message": "Has excedido 100 requests por minuto. Reintenta después de 60 segundos.",
  "retry_after": 60
}
```

## Lo que funciona

- **Retorna mensajes de error informativos.** Dile a clientes exactamente qué límite golpearon y cuándo pueden reintentar.
- **Usa diferentes límites por endpoint.** Endpoints de búsqueda pueden tolerar límites más altos que endpoints de escritura.
- **Implementa backoff exponencial en clientes.** Respuestas 429 deberían activar backoff, no reintentos inmediatos.
- **Monitorea golpes de límite de tasa.** Picos repentinos en 429s pueden indicar ataques o problemas de integración.
- **Permite períodos de gracia para clientes nuevos.** Empieza con límites generosos y ajusta basado en patrones de uso.
- **Documenta límites claramente.** Publica límites de tasa en tu documentación de API.

## Common Mistakes

- **Usar direcciones IP como único identificador.** NAT y redes móviles comparten IPs; usa API keys o user IDs.
- **Problemas de vecino ruidoso.** Un usuario pesado no debería impactar a otros; aplica límites por cliente.
- **Ignorar tráfico de ráfaga.** Usuarios legítimos pueden hacer ráfagas durante carga de página; permite ráfagas cortas.
- **Límites inconsistentes entre servicios.** Estandariza límites por nivel y tipo de endpoint.
- **Olvidar manejar casos edge.** ¿Qué pasa cuando el almacén de límite de tasa (Redis) está caído?

## Variants

- **Limitación de concurrencia:** Limitar requests en vuelo simultáneos en lugar de tasa por tiempo.
- **Rate limiting adaptativo:** Ajustar límites dinámicamente basado en salud de backend (límites más bajos cuando está sobrecargado).
- **Rate limiting geográfico:** Aplicar diferentes límites basados en ubicación del cliente o requerimientos regulatorios.
- **Throttling basado en costo:** Limitar operaciones caras (inferencia ML, generación de reportes) más estrictamente.

## FAQ

**Q: ¿Cuál es un buen límite de tasa por defecto para una API pública?**
Empieza con 100 requests por minuto por usuario, luego ajusta basado en uso real y capacidad de backend.

**Q: ¿Cómo manejo rate limiting en una arquitectura de microservicios?**
Aplica en el API gateway para tráfico externo y usa service mesh (Istio, Linkerd) para límites internos.

**Q: ¿Debería limitar tráfico autenticado y no autenticado diferentemente?**
Sí. Usuarios autenticados obtienen límites más altos y personalizados. Tráfico no autenticado obtiene límites más estrictos basados en IP.

**Q: ¿Cómo prevengo abuso sin impactar usuarios legítimos?**
Usa penalizaciones progresivas (advertencias → bloqueos temporales → bloqueos permanentes) y permite apelación/revisión.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.

## Conclusion

El rate limiting adecuado protege tu infraestructura, asegura justicia y mantiene confiabilidad de API. Elige el algoritmo correcto, establece límites sensatos, comunica claramente con clientes y monitorea continuamente.
