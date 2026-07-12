---


contentType: patterns
slug: timeout-pattern
title: "Patrón Timeout"
description: "Previene que las operaciones se cuelguen indefinidamente imponiendo un tiempo máximo de ejecución. Un patrón de resiliencia para tiempos de respuesta predecibles."
metaDescription: "Aprende el Patrón Timeout en Python, Java y JavaScript. Patrón de resiliencia para evitar operaciones colgadas con límites de tiempo forzados."
difficulty: beginner
topics:
  - design
tags:
  - timeout
  - patron
  - patron-de-diseno
  - resiliencia
  - deadlines
  - operaciones-colgadas
  - python
  - javascript
  - java
relatedResources:
  - /patterns/retry-pattern
  - /patterns/circuit-breaker-pattern
  - /patterns/bulkhead-pattern
  - /patterns/graceful-degradation-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Timeout en Python, Java y JavaScript. Patrón de resiliencia para evitar operaciones colgadas con límites de tiempo forzados."
  keywords:
    - patron timeout
    - patron de diseno
    - patron de resiliencia
    - deadlines
    - operaciones colgadas
    - python timeout
    - java timeout
    - javascript timeout


---

# Patrón Timeout

## Resumen

El Patrón Timeout es un patrón de resiliencia que previene que las operaciones se cuelguen indefinidamente imponiendo un tiempo máximo de ejecución. Sin timeouts, un único servicio descendiente lento puede retener hilos, conexiones y peticiones de usuarios indefinidamente, causando fallas en cascada a través del sistema.

## Cuándo usarlo

Usa el Patrón Timeout cuando:
- Llames a servicios externos, bases de datos o APIs que pueden volverse no responsivos
- Necesites garantizar tiempos de respuesta máximos a usuarios o llamadores upstream
- Las operaciones colgadas podrían agotar pools de hilos, conexiones o memoria
- Quieras fallar rápidamente en lugar de esperar indefinidamente por una respuesta
- Siempre combínalo con [Retry](/patterns/design/retry-pattern) para problemas transitorios, y [Circuit Breaker](/patterns/design/circuit-breaker-pattern) para fallas crónicas

## Solución

### Python

```python
import signal
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

def with_timeout(seconds: float):
    def decorator(func):
        def wrapper(*args, **kwargs):
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(func, *args, **kwargs)
                try:
                    return future.result(timeout=seconds)
                except FutureTimeout:
                    raise TimeoutError(f"Operación timed out después de {seconds}s")
        return wrapper
    return decorator

@with_timeout(seconds=2.0)
def fetch_slow_data():
    import time
    time.sleep(5)
    return "data"

# Uso
try:
    result = fetch_slow_data()
    print(result)
except TimeoutError as e:
    print(f"Falló: {e}")
```

### JavaScript

```javascript
function withTimeout(fn, timeoutMs) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operación timed out después de ${timeoutMs}ms`));
      }, timeoutMs);

      Promise.resolve(fn(...args))
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  };
}

async function fetchSlowData() {
  await new Promise(r => setTimeout(r, 5000));
  return "data";
}

const timedFetch = withTimeout(fetchSlowData, 2000);

// Uso
timedFetch()
  .then(console.log)
  .catch(e => console.log("Falló:", e.message));
```

### Java

```java
import java.util.concurrent.*;

public class Timeout {
    public static <T> T execute(Callable<T> task, long timeoutMs) throws Exception {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            Future<T> future = executor.submit(task);
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            throw new RuntimeException("Operación timed out después de " + timeoutMs + "ms");
        } finally {
            executor.shutdownNow();
        }
    }

    public static void main(String[] args) {
        try {
            String result = execute(() -> {
                Thread.sleep(5000);
                return "data";
            }, 2000);
            System.out.println(result);
        } catch (Exception e) {
            System.out.println("Falló: " + e.getMessage());
        }
    }
}
```

## Explicación

El Patrón Timeout impone un deadline duro en las operaciones:

- **Deadline**: El tiempo máximo que una operación puede ejecutarse
- **Cancelación**: Cuando el deadline expira, la operación se interrumpe o abandona
- **Propagación**: Los timeouts deberían propagarse a través de la cadena de llamadas — si una llamada API tiene 5s, y llama a una DB que toma 4s, la llamada a la DB debería usar un timeout más corto (ej. 3s) para dejar margen

Esto previene el agotamiento de pools de hilos, fugas de conexiones y mala experiencia de usuario por dependencias no responsivas.

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **Timeout Fijo** | Mismo timeout para todas las llamadas | Comportamiento simple y predecible |
| **Timeout Adaptativo** | Timeout basado en latencias históricas (P99) | Respuesta dinámica a la salud del servicio |
| **Propagación de Deadlines** | Pasa el tiempo restante a través de la cadena de llamadas | Budgets de latencia end-to-end |
| **Resultados Parciales** | Devuelve lo que se obtuvo antes del timeout | Streaming, búsqueda, agregación |

## Lo que Funciona

- **Siempre establece timeouts en llamadas externas** — I/O de red, consultas a base de datos, peticiones HTTP
- **Propaga deadlines** a través de tu cadena de llamadas (ej. contexto gRPC, headers HTTP)
- **Establece timeouts más cortos en niveles inferiores** — deja margen para reintentos y fallbacks
- **Registra eventos de timeout** con el nombre del servicio objetivo para depuración
- **Combina con [Circuit Breaker](/patterns/design/circuit-breaker-pattern)** — si los timeouts son frecuentes, deja de llamar al servicio fallido
- **Usa `Promise.race` en JavaScript** y `Future.get(timeout)` en Java para cancelación limpia

## Errores comunes

- No establecer ningún timeout, permitiendo que las operaciones se cuelguen para siempre
- Establecer timeouts demasiado largos, derrotando el propósito de fallar rápido
- Establecer timeouts demasiado cortos, causando fallas innecesarias durante picos normales
- No cancelar la operación subyacente cuando el timeout se dispara (fugas de recursos)
- Ignorar la propagación de deadlines, causando misses de deadline en cascada

## Preguntas frecuentes

**P: ¿Qué valor de timeout debería usar?**
R: Basalo en tu SLA y en la latencia P99 del servicio descendiente. Si tu API promete 500ms de tiempo de respuesta, y una llamada a DB toma 100ms en P99, establece el timeout de la DB en ~150ms para dejar margen para reintentos y procesamiento.

**P: ¿El timeout cancela la operación subyacente?**
R: Depende de la implementación. La interrupción de hilos señala cancelación pero no la fuerza. Con frameworks async (Java CompletableFuture, JavaScript AbortController), puedes cancelar apropiadamente el I/O subyacente.

**P: ¿Debería reintentar después de un timeout?**
R: Sí, si la operación es idempotente y el timeout podría haber sido causado por un problema transitorio de red. Pero si los timeouts son frecuentes, combínalo con [Circuit Breaker](/patterns/design/circuit-breaker-pattern) para evitar reintentos desperdiciados en un servicio crónicamente lento.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Timeout en Llamadas a APIs Externas

```typescript
// Timeout pattern con AbortController (Node.js 18+)
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// Uso: llamar API externa con timeout de 5s
try {
  const res = await fetchWithTimeout("https://api.stripe.com/v1/charges", 5000);
  const data = await res.json();
} catch (err) {
  if (err.message.includes("timeout")) {
    // Manejar timeout: retry, fallback, o error al usuario
    console.error("Stripe API timeout, using fallback");
  }
}

// Timeout con retry y backoff
async function fetchWithRetry(
  url: string,
  timeoutMs: number,
  maxRetries: number
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url, timeoutMs);
    } catch (err) {
      if (attempt < maxRetries - 1) {
        const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// Configuracion de timeouts por servicio
  | Servicio | Timeout | Retries | Backoff |
  |----------|---------|---------|---------|
  | Stripe API | 5s | 3 | Exponencial |
  | DB query | 10s | 0 | N/A |
  | Redis | 1s | 2 | Fijo 500ms |
  | S3 upload | 30s | 2 | Exponencial |
  | Internal API | 3s | 2 | Exponencial |
  | Email service | 10s | 3 | Exponencial |
```

Lecciones:
  - AbortController es el estandar moderno para timeout en fetch
  - Siempre configura timeout: una request sin timeout puede colgar para siempre
  - Timeout + retry + backoff es el patron completo
  - Diferentes servicios necesitan diferentes timeouts
  - Mide el p99 de latencia para configurar timeouts realistas
```

### Como elijo el valor de timeout correcto?

Mide el p99 de latencia del servicio. Configura el timeout en 2-3x el p99. Si el p99 de Stripe es 2s, timeout de 5s es razonable. Para DB queries, mide el p99 de la query mas lenta y agrega 50%. Nunca uses un timeout menor al p99: causaras fallos en condiciones normales. Revisa los timeouts quarterly: si la latencia mejora, puedes bajar el timeout.















End of document. Review and update quarterly.