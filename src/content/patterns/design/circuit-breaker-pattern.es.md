---
contentType: patterns
slug: circuit-breaker-pattern
title: "Patrón Circuit Breaker"
description: "Previene fallos en cascada deteniendo solicitudes a servicios que están fallando. Un patrón arquitectural para sistemas distribuidos resilientes."
metaDescription: "Aprende el Patrón Circuit Breaker en Python, Java y JavaScript. Patrón arquitectural para microservicios resilientes y tolerancia a fallos."
difficulty: intermediate
topics:
  - design
tags:
  - circuit-breaker
  - patron
  - patron-arquitectural
  - resiliencia
  - microservicios
  - tolerancia-a-fallos
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/proxy-pattern
  - /patterns/design/observer-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Circuit Breaker en Python, Java y JavaScript. Patrón arquitectural para microservicios resilientes y tolerancia a fallos."
  keywords:
    - circuit breaker
    - patron arquitectural
    - patron de resiliencia
    - microservicios
    - tolerancia a fallos
    - python circuit breaker
    - java resilience4j
    - javascript circuit breaker
---

# Patrón Circuit Breaker

## Visión General

El Patrón Circuit Breaker es un patrón arquitectural que previene que una aplicación intente repetidamente ejecutar una operación que probablemente fallará. Cuando un servicio está caído o luchando, el circuit breaker "salta" y deja de enviar solicitudes, dándole tiempo al servicio para recuperarse. Esto previene agotamiento de recursos y fallos en cascada en sistemas distribuidos.

## Cuándo Usarlo

Usa el Patrón Circuit Breaker cuando:
- Una llamada a un servicio remoto puede fallar o timeout
- Quieres prevenir fallos en cascada entre servicios
- Necesitas degradar con gracia cuando un servicio no está disponible
- Quieres evitar saturar un servicio fallido con reintentos
- Necesitas fallo rápido para llamadas a servicios descendentes no saludables

## Solución

### Python

```python
import time
from enum import Enum, auto

class CircuitState(Enum):
    CLOSED = auto()      # Operación normal
    OPEN = auto()        # Fallo rápido
    HALF_OPEN = auto()   # Probando recuperación

class CircuitBreaker:
    def __init__(self, failure_threshold=3, recovery_timeout=5):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.state = CircuitState.CLOSED
        self.failures = 0
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker está OPEN")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failures = 0
        self.state = CircuitState.CLOSED

    def _on_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            self.state = CircuitState.OPEN

# Uso
def fetch_data():
    import random
    if random.random() < 0.7:
        raise Exception("Error de servicio")
    return "Datos"

breaker = CircuitBreaker(failure_threshold=2, recovery_timeout=3)

for i in range(5):
    try:
        print(breaker.call(fetch_data))
    except Exception as e:
        print(f"Llamada {i+1}: {e}")
```

### JavaScript

```javascript
class CircuitBreaker {
  constructor(failureThreshold = 3, recoveryTimeout = 5000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker está OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (e) {
      this.onFailure();
      throw e;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// Uso
async function fetchData() {
  if (Math.random() < 0.7) throw new Error('Error de servicio');
  return 'Datos';
}

const breaker = new CircuitBreaker(2, 3000);

(async () => {
  for (let i = 0; i < 5; i++) {
    try {
      const result = await breaker.call(fetchData);
      console.log(`Llamada ${i + 1}:`, result);
    } catch (e) {
      console.log(`Llamada ${i + 1}:`, e.message);
    }
  }
})();
```

### Java

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

public class CircuitBreaker {
    private enum State { CLOSED, OPEN, HALF_OPEN }

    private final int failureThreshold;
    private final long recoveryTimeoutMs;
    private State state = State.CLOSED;
    private final AtomicInteger failures = new AtomicInteger(0);
    private volatile long lastFailureTime = 0;

    public CircuitBreaker(int failureThreshold, long recoveryTimeoutMs) {
        this.failureThreshold = failureThreshold;
        this.recoveryTimeoutMs = recoveryTimeoutMs;
    }

    public <T> T call(Supplier<T> supplier) throws Exception {
        if (state == State.OPEN) {
            if (System.currentTimeMillis() - lastFailureTime >= recoveryTimeoutMs) {
                state = State.HALF_OPEN;
            } else {
                throw new Exception("Circuit breaker está OPEN");
            }
        }

        try {
            T result = supplier.get();
            onSuccess();
            return result;
        } catch (Exception e) {
            onFailure();
            throw e;
        }
    }

    private void onSuccess() {
        failures.set(0);
        state = State.CLOSED;
    }

    private void onFailure() {
        int count = failures.incrementAndGet();
        lastFailureTime = System.currentTimeMillis();
        if (count >= failureThreshold) {
            state = State.OPEN;
        }
    }
}

// Uso
public class Main {
    public static void main(String[] args) {
        CircuitBreaker breaker = new CircuitBreaker(2, 3000);

        for (int i = 0; i < 5; i++) {
            try {
                String result = breaker.call(() -> {
                    if (Math.random() < 0.7) throw new RuntimeException("Error de servicio");
                    return "Datos";
                });
                System.out.println("Llamada " + (i + 1) + ": " + result);
            } catch (Exception e) {
                System.out.println("Llamada " + (i + 1) + ": " + e.getMessage());
            }
        }
    }
}
```

## Explicación

El Patrón Circuit Breaker tiene tres estados:

- **Cerrado (Closed)** — Operación normal. Las solicitudes pasan al servicio. Los fallos se cuentan.
- **Abierto (Open)** — El servicio se considera no saludable. Todas las solicitudes fallan rápidamente sin llamar al servicio.
- **Semi-abierto (Half-Open)** — Después de un timeout, se permiten un número limitado de solicitudes de prueba para verificar si el servicio se recuperó.

Esto previene agotamiento de recursos por llamadas fallidas repetidas y da tiempo a los servicios fallidos para recuperarse. Esencial en [sistemas distribuidos](/guides/architecture/microservices-architecture-guide).

## Variantes

| Variante | Comportamiento | Caso de Uso |
|----------|----------------|-------------|
| **Basado en Conteo** | Salta después de N fallos | Comportamiento simple y predecible |
| **Basado en Tiempo** | Salta si la tasa de fallo excede umbral en ventana de tiempo | Se adapta a carga variable |
| **Ponderado** | Umbrales diferentes para distintos tipos de excepción | Distinguir fallos transitorios vs. permanentes |
| **[Fallback Personalizado](/patterns/design/cache-aside-pattern)** | Retorna valor por defecto cuando está abierto | Degradación elegante (cache, respuesta por defecto) |

## Lo que funciona

- **Configura timeouts de recuperación** basados en el tiempo típico de reinicio del servicio
- **Registra transiciones de estado** para observabilidad y alertas
- **Proporciona comportamiento de fallback** cuando el circuito está abierto (datos cacheados, respuesta por defecto)
- **Usa circuit breakers separados** para diferentes servicios descendentes
- **Evita compartir estado del circuit breaker** entre operaciones no relacionadas

## Errores Comunes

- Configurar el umbral de fallo demasiado bajo, causando falsos positivos frecuentes
- Configurar el timeout de recuperación demasiado corto, sin dar tiempo al servicio para recuperarse
- Usar un solo circuit breaker para todas las operaciones, causando cortes innecesariamente amplios
- No proporcionar comportamiento de fallback, llevando a mala experiencia de usuario cuando los circuitos están abiertos
- Ignorar el estado semi-abierto, nunca permitiendo pruebas de recuperación después de un fallo

## Preguntas Frecuentes

**P: ¿Cómo se diferencia Circuit Breaker de Retry?**
R: [Retry](/patterns/design/retry-pattern) intenta la misma operación múltiples veces. Circuit Breaker deja de llamar a un servicio fallido por completo. Funcionan bien juntos: retry para fallos transitorios, circuit breaker para cortes persistentes.

**P: ¿Debería usar una librería o implementar el mío?**
R: Para sistemas de producción, usa librerías establecidas: Resilience4j (Java), Polly (.NET), Opossum (JavaScript/Node). Consulta también [Ambassador](/patterns/design/ambassador-pattern) para resiliencia del lado del cliente. Implementa el tuyo solo para aprender o en entornos muy restringidos.

**P: ¿Cómo monitoreo la salud del circuit breaker?**
R: Expón métricas para transiciones de estado, tasas de fallo y duración en estado abierto. Integra con tu stack de monitoreo (Prometheus, Grafana) para alertar sobre saltos frecuentes del circuito.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
