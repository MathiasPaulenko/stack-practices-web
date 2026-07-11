---
contentType: patterns
slug: throttling-pattern
title: "Patron de Throttling"
description: "Limita la tasa a la que un sistema procesa solicitudes o consume recursos para prevenir sobrecarga, asegurar uso justo y mantener rendimiento predecible."
metaDescription: "Aprende el Patron de Throttling para limitar tasa de consumo de recursos. Ejemplos en Python, Java y JavaScript con token bucket, leaky bucket y ventanas fijas."
difficulty: intermediate
topics:
  - design
  - architecture
  - performance
tags:
  - throttling
  - patron
  - patron-de-diseno
  - rate-limiting
  - rendimiento
  - token-bucket
  - leaky-bucket
  - escalabilidad
relatedResources:
  - /patterns/design/priority-queue-pattern
  - /patterns/design/queue-based-load-leveling-pattern
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patron de Throttling para limitar tasa de consumo de recursos. Ejemplos en Python, Java y JavaScript con token bucket, leaky bucket y ventanas fijas."
  keywords:
    - throttling
    - patron de diseno
    - rate limiting
    - rendimiento
    - token bucket
    - leaky bucket
    - escalabilidad
---

# Patron de Throttling

## Resumen

El Patron de Throttling controla la tasa a la que un sistema procesa solicitudes o consume recursos para prevenir sobrecarga y asegurar asignacion justa. En lugar de aceptar todas las solicitudes inmediatamente, el sistema limita la tasa segun capacidad, tiers de usuario o disponibilidad de recursos.

Previene fallos en cascada asegurando que servicios downstream y recursos compartidos no sean abrumados.

## Cuando Usar

- Proteger servicios downstream de picos de trafico
- Aplicar rate limits en APIs
- Controlar agotamiento de pool de conexiones a base de datos
- Gestionar costos con APIs de terceros por uso
- Asegurar asignacion justa en sistemas multi-tenant
- Prevenir DDoS o abuso accidental

## Cuando Evitar

- Servicios internos con carga predecible dentro del mismo dominio
- Sistemas donde rechazar solicitudes viola requisitos de negocio
- Cuando el cuello de botella es tamano de datos, no tasa

## Solucion

### Python (Token Bucket)

```python
import time
import threading

class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = time.time()
        self.lock = threading.Lock()

    def acquire(self, tokens=1):
        with self.lock:
            now = time.time()
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

bucket = TokenBucket(capacity=10, refill_rate=2)
if not bucket.acquire():
    raise Exception("Rate limit exceeded")
```

### Java (Guava RateLimiter)

```java
import com.google.common.util.concurrent.RateLimiter;

public class ThrottledService {
    private final RateLimiter limiter = RateLimiter.create(10.0);
    public String process(String request) {
        limiter.acquire();
        return "Processed: " + request;
    }
}
```

### JavaScript (Ventana Deslizante)

```javascript
class SlidingWindowThrottle {
    constructor(windowMs, maxRequests) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.requests = new Map();
    }
    isAllowed(clientId) {
        const now = Date.now();
        const start = now - this.windowMs;
        const recent = (this.requests.get(clientId) || [])
            .filter(t => t > start);
        if (recent.length < this.maxRequests) {
            recent.push(now);
            this.requests.set(clientId, recent);
            return true;
        }
        return false;
    }
}
```

## Explicacion

Los algoritmos de throttling balancean justicia y eficiencia:

- **Token bucket:** Tokens se agregan a tasa fija. Las solicitudes consumen tokens. Permite rafagas cortas manteniendo tasa promedio.
- **Leaky bucket:** Solicitudes entran en cola fija y gotean a tasa constante. Suaviza trafico pero descarte overflow.
- **Ventana fija:** Cuenta solicitudes en intervalos de tiempo. Simple pero permite rafagas en limites de ventana.
- **Ventana deslizante:** Mas precisa rastreando timestamps exactos dentro de una ventana rodante.

## Variantes

| Variante | Comportamiento | Ideal Para |
|----------|----------------|------------|
| Token bucket | Rafagas permitidas hasta capacidad | APIs que necesitan tolerancia a rafagas |
| Leaky bucket | Tasa de salida constante | Suavizado de trafico hacia downstream |
| Ventana fija | Contador reseteado por intervalo | Implementaciones simples |
| Ventana deslizante | Ventana de tiempo rodante | Rate limits precisos por cliente |

## Lo que funciona

- Retornar `429 Too Many Requests` con header `Retry-After`
- Diferenciar tiers de usuario con limites distintos
- Monitorear tasas de rechazo como senal temprana
- Implementar backoff para clientes que reciben throttling
- Considerar rate limiting distribuido para despliegues multi-instancia

## Errores Comunes

- Throttling sin comunicar limites a clientes
- Mismos limites para todos los usuarios sin importar tier
- No manejar desviacion de reloj en sistemas distribuidos
- Olvidar limpiar entradas expiradas en algoritmos basados en ventana

## Ejemplos del Mundo Real

- **GitHub API:** Rate limits por usuario autenticado (5000/hora) y por IP (60/hora). Exceder limites retorna `403` con `X-RateLimit-Reset`.
- **AWS API Gateway:** Throttling a nivel de cuenta, stage y metodo usando token bucket, con capacidad de rafaga.

## Preguntas Frecuentes

**P: ¿Cual es la diferencia entre throttling y backpressure?**
R: Throttling rechaza o retrasa solicitudes en el punto de entrada. Backpressure senala upstream para reducir produccion.

**P: ¿Como hago throttling entre multiples servidores?**
R: Usar un store compartido (Redis) para mantener conteos de tokens o logs de solicitudes entre instancias.

**P: ¿Deberia encolar o rechazar solicitudes throttled?**
R: Para APIs orientadas a usuarios, rechazar con 429. Para procesamiento background, encolar con delay visible.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Throttling para API de Geolocalizacion

```typescript
// Throttling pattern: max 10 requests por segundo
class Throttle {
  private requests: number[] = [];
  constructor(private maxRequests: number, private windowMs: number) {}

  canProceed(): boolean {
    const now = Date.now();
    // Eliminar requests fuera de la ventana
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }
  timeUntilNextSlot(): number {
    if (this.requests.length < this.maxRequests) return 0;
    const oldest = this.requests[0];
    return this.windowMs - (Date.now() - oldest);
  }
}

// Uso: API de Google Maps (limit 10 req/s)
const throttle = new Throttle(10, 1000);

async function geocode(address: string): Promise<LatLng> {
  if (!throttle.canProceed()) {
    const wait = throttle.timeUntilNextSlot();
    await new Promise(resolve => setTimeout(resolve, wait));
  }
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}`);
  return response.json();
}

// Comparacion: Throttle vs Rate Limit vs Debounce
  | Patron | Proposito | Ejemplo |
  |--------|-----------|---------|
  | Throttle | Max N requests por ventana | 10 req/s |
  | Rate Limit | Rechazar si excede | 429 Too Many Requests |
  | Debounce | Esperar a que pare el input | Search autocomplete |
  | Token Bucket | Tokens se reponen over time | Burst + sustained |
  | Leaky Bucket | Cola con salida constante | Suavizar picos |
```

Lecciones:
  - Throttle limita la tasa de requests: no rechaza, espera
  - Rate limit rechaza: 429 con Retry-After header
  - Debounce agrupa llamadas: espera inactividad
  - Token bucket permite burst: util para APIs con quotas
  - Mide el throughput real: no asumas que el limite es exacto
```

### Como elijo entre throttle y rate limit?

Usa throttle cuando el cliente debe esperar (ej: llamar API externa con limite). Usa rate limit cuando el cliente debe ser rechazado (ej: proteger tu API de abuso). Throttle es cooperativo: el cliente se auto-limita. Rate limit es impuesto: el servidor rechaza. Para APIs publicas, usa rate limit (429 + Retry-After). Para integraciones internas, throttle es suficiente.
















































End of document. Review and update quarterly.