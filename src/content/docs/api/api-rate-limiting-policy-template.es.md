---






contentType: docs
slug: api-rate-limiting-policy-template
title: "Plantilla de Politica de Rate Limiting de API"
description: "Plantilla para definir limites de tasa de API por tier de consumidor, incluyendo allowances de burst, periodos de cuota y rutas de escalamiento."
metaDescription: "Define limites de tasa de API por tier con esta plantilla. Cubre limites de burst, ventanas de cuota, headers y escalamiento para consumidores."
difficulty: intermediate
topics:
  - api
  - architecture
  - performance
tags:
  - api
  - rate-limiting
  - throttling
  - politica
  - plantilla
  - rendimiento
relatedResources:
  - /docs/api-performance-budget-template
  - /docs/escalation-policy-template
  - /docs/api-security-review-template
  - /guides/api-rate-limiting-guide
  - /docs/api-changelog-template
  - /patterns/throttling-pattern
  - /guides/graphql-vs-rest-guide
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Define limites de tasa de API por tier con esta plantilla. Cubre limites de burst, ventanas de cuota, headers y escalamiento para consumidores."
  keywords:
    - rate limiting
    - throttling api
    - politica de cuotas
    - limites de burst
    - tiers de api
    - headers de rate limit






---

## Resumen

El acceso ilimitado a API es una receta para abuso, DDoS accidental y costos impredecibles. El rate limiting protege tu infraestructura mientras da a los consumidores acceso predecible. Sin una politica documentada, los consumidores descubren los limites solo cuando sus solicitudes comienzan a fallar con `429 Too Many Requests`. Esta plantilla define limites de tasa por tier, los comunica transparentemente y proporciona una ruta de escalamiento para quienes necesitan mas.

## Cuando Usar


- For alternatives, see [Throttling Pattern](/es/patterns/throttling-pattern/).

Usa este recurso cuando:
- Lances una API publica o de partners
- Definas tiers de precios para acceso a API
- Experimentes picos de trafico que degraden el servicio para otros
- Negocies SLAs con clientes enterprise que necesitan limites mas altos

## Solucion

```markdown
# Politica de Rate Limiting de API

## Tiers y Limites

| Tier | Solicitudes / Minuto | Solicitudes / Hora | Burst | Costo |
|------|----------------------|--------------------|-------|-------|
| Gratis | 60 | 1,000 | 10 | $0 |
| Starter | 300 | 10,000 | 50 | $49/mes |
| Pro | 1,000 | 100,000 | 200 | $199/mes |
| Enterprise | 10,000 | 1,000,000 | 2,000 | Personalizado |

## Alcance del Limite

Los limites se aplican por **API key** en los siguientes alcances:
- **Global:** Todos los endpoints combinados cuentan hacia el mismo limite
- **Por endpoint:** `POST /orders` tiene su propio limite separado de `GET /products`
- **Por IP (solo tier Gratis):** Aplicacion de respaldo cuando la API key esta ausente

## Periodos de Cuota

- **Limite por minuto:** Se reinicia al inicio de cada minuto (UTC)
- **Limite por hora:** Se reinicia al inicio de cada hora (UTC)
- **Ventana deslizante:** Una ventana deslizante de 60 segundos (mas precisa pero computacionalmente costosa)

## Headers de Respuesta

Cada respuesta de API incluye los siguientes headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1719398400
X-RateLimit-Policy: pro;w=3600
```

| Header | Descripcion |
|--------|-------------|
| `X-RateLimit-Limit` | Maximo de solicitudes permitidas en la ventana actual |
| `X-RateLimit-Remaining` | Solicitudes restantes en la ventana actual |
| `X-RateLimit-Reset` | Timestamp Unix cuando se reinicia la ventana actual |
| `X-RateLimit-Policy` | Identificador de tier y tamano de ventana |

## Respuesta de Limite Excedido

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Has excedido tu limite de tasa. Por favor reintenta despues de 2026-06-26T11:00:00Z.",
    "retryAfter": 3600,
    "documentationUrl": "https://docs.ejemplo.com/rate-limits"
  }
}
```

Estado HTTP: `429 Too Many Requests`
Header Requerido: `Retry-After: 3600`

## Comportamiento de Burst

Los limites de burst permiten picos cortos por encima de la tasa sostenida:
- **Tier Pro:** 200 solicitudes en 1 segundo, luego limitado a 1,000/hora promedio
- **Algoritmo:** Token bucket con tasa de recarga = limite sostenido / tamano de ventana
- **Penalizacion:** Sin penalizacion por uso de burst dentro de los limites configurados

## Aumentar Limites

1. **Actualizar tier:** Cambia tu plan en el panel de desarrollador
2. **Solicitar excepcion:** Contactar api-soporte@ejemplo.com con:
   - Patrones de uso actuales (solicitudes por endpoint, horas pico)
   - Justificacion de negocio (lanzamiento de producto, partner de integracion)
   - Cronograma esperado y volumen
3. **Negociacion enterprise:** Capacidad dedicada, SLA personalizado, endpoints privados

## Monitoreo y Alertas

| Alerta | Condicion | Accion |
|--------|-----------|--------|
| Cercano al Limite | 80% de cuota horaria consumida | Notificacion por email al admin |
| Limite Excedido | Respuestas 429 > 1% del trafico | Alerta PagerDuty al de guardia |
| Patron de Abuso | 10x volumen normal desde una sola key | Auto-throttle + revision manual |

## Politica de Uso Justo

- **Sin evasion automatizada:** Usar multiples API keys para evadir limites viola los terminos
- **Cachear agresivamente:** Las respuestas marcadas `Cache-Control: public` deben ser cacheadas
- **Operaciones batch:** Usar endpoints bulk en lugar de llamadas individuales
- **Preferir webhooks:** Suscribirse a webhooks en lugar de hacer polling por cambios de estado
```

## Explicacion

La politica separa los **limites sostenidos** (promedio en el tiempo) de los **limites de burst** (picos a corto plazo). El algoritmo de token bucket es el estandar de la industria porque permite rafagas mientras impone promedios a largo plazo. Los headers de respuesta dan a los consumidores retroalimentacion en tiempo real para que puedan retroceder antes de alcanzar los limites. La ruta de escalamiento previene tickets de soporte de consumidores que simplemente necesitan un tier mas alto.

## Implementacion de Token Bucket

El algoritmo de token bucket es el enfoque mas comun para rate limiting. Aqui hay una implementacion basada en Redis:

### Token Bucket en Redis con Node.js

```javascript
const redis = require("redis");

async function rateLimit(redisClient, key, options) {
  const { capacity, refillRate, refillIntervalSec } = options;
  const now = Date.now();
  const bucketKey = `ratelimit:${key}`;

  const result = await redisClient
    .multi()
    .hGetAll(bucketKey)
    .hSet(bucketKey, {
      tokens: capacity,
      lastRefill: now,
    })
    .expire(bucketKey, refillIntervalSec * 2)
    .exec();

  const bucket = result[0];
  let tokens = parseFloat(bucket.tokens) || capacity;
  let lastRefill = parseInt(bucket.lastRefill) || now;

  const elapsed = (now - lastRefill) / 1000;
  const refillAmount = elapsed * (capacity / refillIntervalSec);
  tokens = Math.min(capacity, tokens + refillAmount);

  if (tokens >= 1) {
    tokens -= 1;
    await redisClient.hSet(bucketKey, {
      tokens: tokens.toString(),
      lastRefill: now.toString(),
    });
    return { allowed: true, remaining: Math.floor(tokens) };
  } else {
    const retryAfter = Math.ceil((1 - tokens) / (capacity / refillIntervalSec));
    await redisClient.hSet(bucketKey, {
      tokens: tokens.toString(),
      lastRefill: now.toString(),
    });
    return { allowed: false, remaining: 0, retryAfter };
  }
}
```

### Middleware en Express.js

```javascript
const TIERS = {
  free: { capacity: 10, refillRate: 60, refillIntervalSec: 60 },
  starter: { capacity: 50, refillRate: 300, refillIntervalSec: 60 },
  pro: { capacity: 200, refillRate: 1000, refillIntervalSec: 60 },
  enterprise: { capacity: 2000, refillRate: 10000, refillIntervalSec: 60 },
};

async function rateLimitMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const tier = await getTierForApiKey(apiKey);
  const options = TIERS[tier] || TIERS.free;

  const result = await rateLimit(redisClient, apiKey, options);

  res.setHeader("X-RateLimit-Limit", options.refillRate);
  res.setHeader("X-RateLimit-Remaining", result.remaining);
  res.setHeader("X-RateLimit-Policy", `${tier};w=${options.refillIntervalSec}`);

  if (!result.allowed) {
    res.setHeader("Retry-After", result.retryAfter);
    return res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Limite de tasa excedido. Reintenta despues del retraso indicado.",
        retryAfter: result.retryAfter,
      },
    });
  }

  next();
}
```

### Implementacion en Python con Redis

```python
import time
import redis

def rate_limit(redis_client, key, capacity, refill_rate, interval_sec):
    bucket_key = f"ratelimit:{key}"
    now = time.time()

    pipe = redis_client.pipeline()
    pipe.hgetall(bucketKey)
    pipe.hset(bucketKey, tokens=capacity, lastRefill=now)
    pipe.expire(bucketKey, interval_sec * 2)
    results = pipe.execute()

    bucket = results[0]
    tokens = float(bucket.get(b"tokens", capacity))
    last_refill = float(bucket.get(b"lastRefill", now))

    elapsed = now - last_refill
    refill_amount = elapsed * (capacity / interval_sec)
    tokens = min(capacity, tokens + refill_amount)

    if tokens >= 1:
        tokens -= 1
        redis_client.hset(bucketKey, tokens=tokens, lastRefill=now)
        return {"allowed": True, "remaining": int(tokens)}
    else:
        retry_after = int((1 - tokens) / (capacity / interval_sec)) + 1
        redis_client.hset(bucketKey, tokens=tokens, lastRefill=now)
        return {"allowed": False, "remaining": 0, "retryAfter": retry_after}
```

## Patron de Reintento del Lado del Cliente

Los consumidores deberian implementar backoff exponencial con jitter al recibir respuestas 429:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    const retryAfter = parseInt(response.headers.get("Retry-After") || "1");
    const jitter = Math.random() * 0.5;
    const delay = (retryAfter + jitter) * 1000;

    console.warn(`Limitado. Reintentando en ${delay}ms (intento ${attempt + 1})`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    attempt++;
  }

  throw new Error(`Maximos reintentos (${maxRetries}) excedidos`);
}
```

## Rate Limiting Distribuido

Para despliegues multi-instancia, usa un almacen compartido (Redis, Memcached) en lugar de contadores en memoria:

| Enfoque | Pros | Contras |
|---------|------|---------|
| En memoria | Mas rapido, sin dependencia externa | No compartido entre instancias |
| Redis | Estado compartido, operaciones atomicas | Latencia de red, dependencia de Redis |
| Memcached | Simple, rapido | Sin persistencia, menos flexible |
| Base de datos | Persistente, consultable | Lento, no apto para alto throughput |

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| SaaS Publico | Precios por tier con tier gratis | Orientado a conversion, los limites impulsan upgrades |
| Plataforma interna | Cuotas por equipo con pool compartido | Previene que un equipo ahogue a otros |
| API de Partners | Limites negociados por contrato | Definidos en acuerdos legales |
| API GraphQL | Limites por complejidad de query | Costo = numero de campos, profundidad y peso de resolvers |

## Lo que funciona

1. **Retornar headers en cada respuesta** — no solo cuando los limites estan cerca
2. **Usar un algoritmo estandar** (token bucket o leaky bucket) — la logica personalizada confunde a los consumidores
3. **Documentar el comportamiento de reinicio** — los consumidores necesitan saber cuando reintentar
4. **Proporcionar endpoints bulk** — un `POST /orders/bulk` es mejor que 100 `POST /orders`
5. **Monitorear tasas de 429** — tasas altas de 429 indican limites mal configurados o abuso de consumidores
6. **Usar Redis para despliegues distribuidos** — los limites en memoria son inexactos con multiples instancias
7. **Separar limites de lectura y escritura** — las escrituras son mas costosas y deberian tener limites mas estrictos

## Errores Comunes

1. **Retornar 403 en lugar de 429** — los consumidores no pueden distinguir falla de auth de rate limiting
2. **No documentar el algoritmo** — los consumidores no pueden predecir cuando seran limitados
3. **Limites inconsistentes entre endpoints** — misma key, diferentes reglas, confusion del consumidor
4. **Sin allowance de burst** — picos de trafico legitimos son bloqueados
5. **Limites estrictos sin escalamiento** — los clientes enterprise no pueden negociar mayor capacidad
6. **Usar contadores en memoria con multiples instancias** — cada instancia rastrea por separado, permitiendo N x el limite
7. **No retornar el header Retry-After** — los consumidores adivinan cuando reintentar, causando thundering herd
8. **Rate limiting solo por IP** — NAT y proxies hacen los limites por IP poco confiables para tiers pagos

## Preguntas Frecuentes

### Que pasa si excedo tanto el limite por minuto como por hora?

Se aplica el limite mas restrictivo. Si excedes el limite por minuto, recibes 429 inmediatamente aunque la cuota horal permanezca. Si excedes el limite por hora, todas las solicitudes son bloqueadas hasta que se reinicie la hora.

### Deberian los limites de tasa ser los mismos para operaciones de lectura y escritura?

No. Las operaciones de escritura son mas costosas y deberian tener limites mas bajos. Limites separados para `GET` (mayor), `POST/PUT/PATCH` (medio) y `DELETE` (menor) son practica estandar.

### Como pruebo mi integracion sin alcanzar los limites?

Usa un entorno sandbox dedicado con limites mas altos o ilimitados. Alternativamente, simula las respuestas de API en tu suite de pruebas y verifica que parses los headers de rate limit correctamente.

### Deberia usar ventana fija o ventana deslizante?

Las ventanas fijas son mas simples y baratas de implementar pero permiten 2x de trafico en los limites de ventana (un burst al final de una ventana mas un burst al inicio de la siguiente). Las ventanas deslizantes son mas precisas pero requieren mas memoria. Para la mayoria de APIs, ventanas fijas con un allowance de burst son suficientes.

### Como manejo el rate limiting para GraphQL?

Usa analisis de complejidad de query en lugar de conteo de solicitudes. Asigna un costo a cada campo basado en la complejidad del resolver, luego limita el costo total por solicitud. Herramientas como `graphql-cost-analysis` pueden aplicar esto.

### Cual es la diferencia entre rate limiting y throttling?

Rate limiting aplica un maximo de solicitudes por ventana de tiempo. Throttling ralentiza o retrasa solicitudes que exceden el limite (encolandolas). Rate limiting rechaza solicitudes excesivas con 429; throttling las hace esperar. La mayoria de APIs usan rate limiting porque es mas simple y da a los consumidores retroalimentacion clara.

### Deberia limitar solicitudes autenticadas y no autenticadas de forma diferente?

Si. Las solicitudes no autenticadas deberian tener limites mas bajos (o ser rechazadas) para prevenir abuso. Las solicitudes autenticadas pueden vincularse al tier del consumidor y facturarse en consecuencia.
