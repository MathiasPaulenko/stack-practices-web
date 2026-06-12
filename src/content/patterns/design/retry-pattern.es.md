---
contentType: patterns
slug: retry-pattern
title: "Patrón Retry"
description: "Reintenta una operación que ha fallado con errores transitorios, usando estrategias configurables como delay fijo, backoff exponencial o integración con circuit breaker."
metaDescription: "Aprende el Patrón Retry en Python, Java y JavaScript. Patrón de resiliencia para manejar fallas transitorias con estrategias de backoff."
difficulty: intermediate
topics:
  - design
tags:
  - retry
  - patron
  - patron-de-diseno
  - resiliencia
  - fallas-transitorias
  - backoff-exponencial
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/timeout-pattern
  - /patterns/design/bulkhead-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Retry en Python, Java y JavaScript. Patrón de resiliencia para manejar fallas transitorias con estrategias de backoff."
  keywords:
    - patron retry
    - patron de diseno
    - patron de resiliencia
    - fallas transitorias
    - backoff exponencial
    - python retry
    - java retry
    - javascript retry
---

# Patrón Retry

## Resumen

El Patrón Retry es un patrón de resiliencia que maneja fallas transitorias reintentando una operación fallida. Las fallas transitorias son típicamente causadas por condiciones temporales como congestión de red, indisponibilidad temporal de servicios o timeouts. El patrón usa estrategias configurables — delay fijo, lineal o backoff exponencial — para evitar saturar el sistema objetivo.

## Cuándo usarlo

Usa el Patrón Retry cuando:
- Los errores sean transitorios y probablemente se resuelvan al reintentar (timeouts de red, 503 Service Unavailable)
- La operación sea idempotente o pueda repetirse de forma segura
- Quieras mejorar la confiabilidad percibida sin intervención del usuario
- Necesites backoff configurable para evitar problemas de thundering herd
- Combínalo con Circuit Breaker para evitar reintentos cuando un servicio está claramente caído

## Solución

### Python

```python
import time
from functools import wraps

def retry(max_attempts=3, delay=1, backoff=2, exceptions=(Exception,)):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempt = 1
            current_delay = delay
            while attempt <= max_attempts:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        raise
                    print(f"Intento {attempt} falló: {e}. Reintentando en {current_delay}s...")
                    time.sleep(current_delay)
                    current_delay *= backoff
                    attempt += 1
            return None
        return wrapper
    return decorator

@retry(max_attempts=3, delay=1, backoff=2, exceptions=(ConnectionError,))
def fetch_data(url: str):
    import random
    if random.random() < 0.7:
        raise ConnectionError("Error de red")
    return f"Data from {url}"

# Uso
try:
    result = fetch_data("https://api.ejemplo.com")
    print(result)
except ConnectionError:
    print("Todos los intentos de reintento agotados")
```

### JavaScript

```javascript
function retry(fn, { maxAttempts = 3, delay = 1000, backoff = 2, exceptions = [Error] } = {}) {
  return async function(...args) {
    let attempt = 1;
    let currentDelay = delay;

    while (attempt <= maxAttempts) {
      try {
        return await fn(...args);
      } catch (e) {
        const isRetryable = exceptions.some(ex => e instanceof ex);
        if (!isRetryable || attempt === maxAttempts) throw e;

        console.log(`Intento ${attempt} falló: ${e.message}. Reintentando en ${currentDelay}ms...`);
        await new Promise(r => setTimeout(r, currentDelay));
        currentDelay *= backoff;
        attempt++;
      }
    }
  };
}

async function fetchData(url) {
  if (Math.random() < 0.7) throw new Error("Error de red");
  return `Data from ${url}`;
}

const retryFetch = retry(fetchData, { maxAttempts: 3, delay: 1000, backoff: 2 });

// Uso
retryFetch("https://api.ejemplo.com")
  .then(console.log)
  .catch(e => console.log("Todos los intentos agotados:", e.message));
```

### Java

```java
import java.util.function.Supplier;

public class Retry {
    public static <T> T execute(Supplier<T> action, int maxAttempts, long delayMs, double backoff) {
        int attempt = 1;
        long currentDelay = delayMs;

        while (attempt <= maxAttempts) {
            try {
                return action.get();
            } catch (Exception e) {
                if (attempt == maxAttempts) throw new RuntimeException("Todos los reintentos agotados", e);
                System.out.println("Intento " + attempt + " falló. Reintentando en " + currentDelay + "ms...");
                try {
                    Thread.sleep(currentDelay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrumpido durante delay de reintento", ie);
                }
                currentDelay = (long)(currentDelay * backoff);
                attempt++;
            }
        }
        throw new IllegalStateException("Inalcanzable");
    }
}

// Uso
String result = Retry.execute(() -> {
    if (Math.random() < 0.7) throw new RuntimeException("Error de red");
    return "Data fetched";
}, 3, 1000, 2.0);
```

## Explicación

El Patrón Retry tiene tres dimensiones configurables:

- **Máximo de Intentos**: Cuántas veces intentar antes de rendirse (incluyendo el intento inicial)
- **Delay**: El tiempo de espera inicial entre reintentos
- **Estrategia de Backoff**: Cómo crece el delay:
  - **Fijo**: Mismo delay cada vez
  - **Lineal**: El delay aumenta en una cantidad fija
  - **Exponencial**: El delay se duplica (o multiplica) cada vez — mejor para la mayoría de escenarios
- **Filtro de Excepciones**: Qué excepciones se consideran reintentables

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **Delay Fijo** | Espera constante entre reintentos | Carga predecible en el objetivo |
| **Backoff Exponencial** | El delay se duplica en cada reintento | Evita saturar servicios en recuperación |
| **Jitter** | Agrega aleatoriedad al backoff | Previene thundering herd tras recuperación |
| **Circuit Breaker + Retry** | Omite reintentos cuando el breaker está abierto | Previene reintentos desperdiciados |

## Mejores prácticas

- **Haz las operaciones idempotentes** antes de aplicar reintentos — los reintentos pueden causar efectos secundarios duplicados
- **Usa backoff exponencial con jitter** para sistemas distribuidos para evitar reintentos sincronizados
- **Establece una duración máxima total** (deadline) además de un máximo de intentos
- **Registra cada intento de reintento** con contexto para depuración
- **Combina con Circuit Breaker** — no reintentes cuando el objetivo está claramente caído

## Errores comunes

- Reintentar operaciones no idempotentes sin mecanismos de deduplicación
- Usar backoff lineal o ausente, saturando un servicio en recuperación
- No establecer un límite máximo de reintentos, causando bucles infinitos
- Reintentar en errores no transitorios (ej. 400 Bad Request, fallas de autenticación)
- Ignorar tormentas de reintentos — muchos clientes reintentando simultáneamente tras una breve interrupción

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Retry y Circuit Breaker?**
R: Retry maneja fallas transitorias individuales. Circuit Breaker previene fallas en cascada deteniendo peticiones a un servicio fallido. Funcionan mejor juntos: Retry maneja errores temporales, Circuit Breaker maneja interrupciones prolongadas.

**P: ¿Debería reintentar errores 500 Internal Server Error?**
R: Depende. El 500 puede indicar un problema transitorio del servidor que vale la pena reintentar, pero 502/503/504 son más claramente transitorios. Nunca reintentes errores 4xx del cliente (400, 401, 403, 404) sin corregir la petición primero.
