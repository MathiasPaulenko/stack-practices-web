---
contentType: recipes
slug: rate-limiting
title: "Implementar Rate Limiting para APIs y Aplicaciones Web"
description: "Cómo proteger APIs y endpoints web del abuso usando estrategias de rate limiting token bucket, sliding window y fixed window con implementaciones en Redis y memoria."
metaDescription: "Aprende estrategias de rate limiting para APIs. Protege endpoints del abuso usando token bucket, sliding window y fixed window con Redis y memoria."
difficulty: intermediate
topics:
  - security
tags:
  - rate-limiting
  - api-gateway
  - redis
  - token-bucket
  - sliding-window
  - throttling
  - ddos-protection
  - security
relatedResources:
  - /recipes/api-security-headers
  - /recipes/csrf-protection
  - /recipes/api-contract-testing
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende estrategias de rate limiting para APIs. Protege endpoints del abuso usando token bucket, sliding window y fixed window con Redis y memoria."
  keywords:
    - rate limiting
    - api throttling
    - token bucket
    - sliding window
    - redis rate limit
---

## Visión general

El rate limiting es una técnica defensiva que controla cuántas peticiones puede realizar un cliente a una API o endpoint web dentro de una ventana de tiempo determinada. Sin rate limiting, un solo cliente que se comporta mal — ya sea malicioso o accidentalmente con bugs — puede agotar recursos del backend, privar a usuarios legítimos y desencadenar fallos en cascada a través de sistemas distribuidos.

El rate limiting efectivo se implementa en múltiples capas: API gateway (edge), middleware de aplicación (servicio) y base de datos (throttling de queries). Cada capa usa diferentes algoritmos adecuados a diferentes trade-offs. Token bucket permite ráfagas, sliding window proporciona precisión, y fixed window es simple pero vulnerable a avalanchas en los límites de la ventana. Esta receta cubre implementaciones desde in-memory de nodo único hasta limitación distribuida respaldada por Redis.

## Cuándo usarlo

Usa esta receta cuando:

- Protegiendo APIs públicas del abuso, scraping o ataques de fuerza bruta
- Limitando operaciones costosas para prevenir sobrecarga del backend
- Haciendo cumplir límites de uso por tier para usuarios gratuitos vs pagados
- Previniendo fallos en cascada durante picos de tráfico o eventos DDoS
- Cumpliendo con requisitos de SLA para asignación justa de recursos

## Solución

### Token Bucket (Python / Redis)

```python
import time
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def is_allowed(key: str, capacity: int, refill_rate: float) -> bool:
    now = time.time()
    pipe = r.pipeline()
    pipe.hmget(key, ['tokens', 'last_refill'])
    pipe.expire(key, 60)
    result = pipe.execute()

    tokens = float(result[0][0]) if result[0][0] else capacity
    last_refill = float(result[0][1]) if result[0][1] else now

    elapsed = now - last_refill
    tokens = min(capacity, tokens + elapsed * refill_rate)

    if tokens >= 1:
        tokens -= 1
        r.hmset(key, {'tokens': tokens, 'last_refill': now})
        r.expire(key, 60)
        return True
    else:
        r.hmset(key, {'tokens': tokens, 'last_refill': last_refill})
        r.expire(key, 60)
        return False

# Uso
if not is_allowed('user:123', capacity=10, refill_rate=1):
    return Response(status=429, body=b"Rate limit exceeded")
```

### Sliding Window Log (Node.js / En memoria)

```javascript
const requests = new Map(); // userId -> [timestamps]

function isAllowed(key, limit, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!requests.has(key)) {
    requests.set(key, [now]);
    return true;
  }

  const timestamps = requests.get(key).filter(t => t > windowStart);
  timestamps.push(now);
  requests.set(key, timestamps);

  return timestamps.length <= limit;
}

// Middleware Express
function rateLimitMiddleware(req, res, next) {
  const key = req.ip;
  if (!isAllowed(key, 100, 60000)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}
```

### Fixed Window (Nginx)

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
  location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://backend;
  }
}
```

## Explicación

- **Token bucket**: un bucket contiene un número fijo de tokens. Cada petición consume un token. Los tokens se recargan a tasa constante. Esto permite ráfagas controladas mientras se hace cumplir una tasa promedio a lo largo del tiempo. Ideal para APIs que toleran picos cortos.
- **Sliding window log**: almacena un log de timestamps de peticiones por cliente. En cada petición, poda entradas fuera de la ventana actual y cuenta el restante. El más preciso pero intensivo en memoria a gran escala.
- **Fixed window**: divide el tiempo en ventanas discretas (por ejemplo, buckets de 1 minuto). Un contador se incrementa por ventana. Simple y eficiente en memoria, pero una ráfaga en el límite de la ventana cuenta dos veces.
- **Limitación distribuida**: los contadores en memoria son rápidos pero fallan entre múltiples instancias de servidor. Redis proporciona estado compartido con operaciones atómicas (`INCR`, `EXPIRE`, scripts Lua) para rate limiting distribuido.

## Variantes

| Algoritmo | Tolerancia a ráfagas | Uso de memoria | Distribuido | Mejor para |
|-----------|---------------------|----------------|-------------|------------|
| Token bucket | Sí | Bajo | Redis | APIs con tolerancia a ráfagas |
| Sliding window | No | Alto | Redis | Límites estrictos por segundo |
| Fixed window | No | Muy bajo | Redis | Techos de tasa simples |
| Leaky bucket | Sí (suavizado) | Bajo | Difícil | Shaping de tráfico |

## Mejores prácticas

- **Retorna 429 con `Retry-After`**: cuando un cliente alcanza un límite, responde con HTTP 429 e incluye un header `Retry-After` indicando cuándo puede reintentar. Esto ayuda a clientes bien comportados a retroceder automáticamente.
- **Usa diferentes límites por endpoint**: los endpoints de autenticación deberían ser más estrictos (5 intentos/minuto) que los endpoints de datos de solo lectura (100 peticiones/minuto). Adapta los límites al costo y sensibilidad de cada operación.
- **Identifica clientes correctamente**: limita por ID de usuario autenticado cuando esté disponible, no solo por dirección IP. Los NATs compartidos y VPNs pueden causar falsos positivos al limitar solo por IP.
- **Implementa límites por tier**: los usuarios gratuitos obtienen 100 peticiones/hora, los pagados 10,000. Almacena la configuración de tier junto a los perfiles de usuario y aplícala dinámicamente en middleware.
- **Monitorea peticiones rechazadas**: un pico repentino en respuestas 429 puede indicar un ataque o un bug de cliente. Alerta sobre eventos de rate limiting vía tu stack de monitoreo.

## Errores comunes

- **No manejar skew de reloj**: los sistemas distribuidos con desviación de reloj pueden calcular mal los límites de ventana. Usa relojes monotónicos cuando estén disponibles y tolera pequeños offsets.
- **Rate limiting solo en el edge**: los gateways edge capturan la mayoría de abusos, pero un servicio interno comprometido puede aún saturar bases de datos downstream. Aplica límites en múltiples capas.
- **Bloquear usuarios legítimos después de una ráfaga**: un usuario que legítimamente dispara una ráfaga (por ejemplo, paginando resultados) no debería ser bloqueado permanentemente. Usa token bucket o sliding window, no cortes duros.
- **Olvidar limpiar claves Redis**: en implementaciones de sliding window, los timestamps antiguos se acumulan indefinidamente. Establece TTLs en claves Redis para auto-expirar datos obsoletos.

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre rate limiting y throttling?**
R: El rate limiting rechaza peticiones que exceden un umbral (HTTP 429). El throttling ralentiza el procesamiento de peticiones en lugar de rechazarlas. Ambos controlan el tráfico pero con diferentes experiencias de usuario.

**P: ¿Cómo hago rate limiting entre múltiples servidores?**
R: Usa un almacén de datos compartido como Redis con operaciones de incremento atómico. Evita contadores en memoria en despliegues multi-nodo porque cada nodo mantiene su propio conteo independiente.

**P: ¿Puede el rate limiting prevenir ataques DDoS?**
R: El rate limiting básico ayuda contra DDoS de capa de aplicación (L7) pero no puede detener inundaciones de red volumétricas (L3/L4). Combina rate limiting con protección DDoS de CDN y reglas de WAF.

**P: ¿Debería limitar usuarios autenticados y no autenticados de forma diferente?**
R: Sí. Los usuarios autenticados deberían ser limitados por ID de usuario con cuotas más altas. Los usuarios no autenticados deberían ser limitados por IP con umbrales más estrictos para prevenir abuso anónimo.

