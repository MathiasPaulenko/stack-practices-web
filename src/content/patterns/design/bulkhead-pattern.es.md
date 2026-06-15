---
contentType: patterns
slug: bulkhead-pattern
title: "Patrón Bulkhead"
description: "Aísla diferentes partes de una aplicación en pools para que una falla en una no se propague a las demás. Un patrón de resiliencia para contención de fallas."
metaDescription: "Aprende el Patrón Bulkhead en Python, Java y JavaScript. Patrón de resiliencia para aislar componentes fallidos y prevenir fallas en cascada."
difficulty: intermediate
topics:
  - design
tags:
  - bulkhead
  - patron
  - patron-de-diseno
  - resiliencia
  - aislamiento
  - contencion-de-fallas
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/retry-pattern
  - /patterns/design/timeout-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Bulkhead en Python, Java y JavaScript. Patrón de resiliencia para aislar componentes fallidos y prevenir fallas en cascada."
  keywords:
    - patron bulkhead
    - patron de diseno
    - patron de resiliencia
    - aislamiento
    - contencion de fallas
    - python bulkhead
    - java bulkhead
    - javascript bulkhead
---

# Patrón Bulkhead

## Resumen

El Patrón Bulkhead es un patrón de resiliencia que aísla diferentes partes de una aplicación en pools separados, asegurando que una falla en una parte no se propague a las demás. Nombrado después de los compartimentos estancos (bulkheads) en los barcos, este patrón limita el alcance de las fallas asignando recursos dedicados a diferentes componentes o clientes.

## Cuándo usarlo

Usa el Patrón Bulkhead cuando:
- Tengas múltiples componentes independientes que comparten un pool de hilos o conexiones
- Un componente lento o fallido no debería consumir todos los recursos disponibles
- Necesites asegurar que las operaciones críticas siempre tengan capacidad dedicada
- Quieras degradar gracefulmente aislando fallas a subsistemas específicos
- Ejemplos: microservicios con diferentes SLAs, API gateways, sistemas multi-tenant

## Solución

### Python

```python
import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from queue import Queue

class Bulkhead:
    def __init__(self, name: str, max_workers: int, queue_size: int = 10):
        self.name = name
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.queue = Queue(maxsize=queue_size)

    def execute(self, func, timeout: float = 5.0):
        if self.queue.full():
            raise RuntimeError(f"Bulkhead '{self.name}' cola llena — rechazando petición")
        self.queue.put(1)
        try:
            future = self.executor.submit(func)
            return future.result(timeout=timeout)
        finally:
            self.queue.get()

# Uso: bulkheads separados para operaciones críticas y en segundo plano
critical = Bulkhead("critical", max_workers=4)
background = Bulkhead("background", max_workers=2)

def slow_operation():
    time.sleep(3)
    return "done"

# Las operaciones críticas siempre tienen capacidad
try:
    result = critical.execute(slow_operation, timeout=5)
    print(result)
except FutureTimeout:
    print("Operación crítica timed out")

# Las operaciones en segundo plano están limitadas — no saturan el pool crítico
try:
    result = background.execute(slow_operation, timeout=5)
    print(result)
except RuntimeError as e:
    print(e)
```

### JavaScript

```javascript
class Bulkhead {
  constructor(name, maxConcurrent) {
    this.name = name;
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
  }

  async execute(fn, timeoutMs = 5000) {
    if (this.running >= this.maxConcurrent) {
      throw new Error(`Bulkhead '${this.name}' al máximo — rechazando petición`);
    }

    this.running++;
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), timeoutMs)
      );
      return await Promise.race([fn(), timeout]);
    } finally {
      this.running--;
    }
  }
}

// Uso
const critical = new Bulkhead("critical", 4);
const background = new Bulkhead("background", 2);

async function slowOperation() {
  await new Promise(r => setTimeout(r, 3000));
  return "done";
}

// Operaciones críticas
async function runCritical() {
  try {
    const result = await critical.execute(slowOperation, 5000);
    console.log(result);
  } catch (e) {
    console.log("Crítica falló:", e.message);
  }
}

runCritical();
```

### Java

```java
import java.util.concurrent.*;

public class Bulkhead {
    private final String name;
    private final Semaphore semaphore;

    public Bulkhead(String name, int maxConcurrent) {
        this.name = name;
        this.semaphore = new Semaphore(maxConcurrent);
    }

    public <T> T execute(Callable<T> task, long timeoutMs) throws Exception {
        if (!semaphore.tryAcquire(timeoutMs, TimeUnit.MILLISECONDS)) {
            throw new RuntimeException("Bulkhead '" + name + "' al máximo — rechazando petición");
        }
        try {
            return task.call();
        } finally {
            semaphore.release();
        }
    }
}

// Uso
Bulkhead critical = new Bulkhead("critical", 4);
Bulkhead background = new Bulkhead("background", 2);

String result = critical.execute(() -> {
    Thread.sleep(3000);
    return "done";
}, 5000);
```

## Explicación

El Patrón Bulkhead separa los recursos en pools aislados:

- **Pools de Hilos/Conexiones**: Cada componente obtiene su propio pool en lugar de compartir uno solo
- **Semáforos/Colas**: Limitan las operaciones concurrentes por componente
- **Rechazo**: Cuando un pool se agota, las nuevas peticiones son rechazadas en lugar de encolarse indefinidamente

Esto asegura que un consumidor descontrolado (ej. un job en segundo plano) no pueda consumir todos los hilos, dejando nada para operaciones críticas (ej. llamadas API orientadas al usuario).

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **Aislamiento de Pool de Hilos** | Pools de hilos separados por componente | Aislamiento de comandos al estilo Hystrix |
| **Aislamiento de Pool de Conexiones** | Conexiones DB/cache separadas por servicio | Bases de datos multi-tenant |
| **Aislamiento por Semáforo** | Aislamiento ligero, mismo hilo | Cuando la creación de hilos es costosa o limitada |
| **Aislamiento por Proceso** | Procesos del SO o contenedores separados | Máxima contención de fallas |

## Mejores prácticas

- **Siempre reserva capacidad para rutas críticas** — no dejes que los jobs en segundo plano mueran de hambre las peticiones de usuarios
- **Monitorea la saturación de pools** — rastrea con qué frecuencia cada bulkhead rechaza o hace timeout
- **Combina con Circuit Breaker** — si un bulkhead está constantemente saturado, el breaker debería dispararse
- **Usa semáforos en lugar de pools de hilos** cuando la creación de hilos es costosa o limitada
- **Documenta y haz cumplir SLAs** por bulkhead para que los equipos conozcan los límites de capacidad

## Errores comunes

- Usar un único pool compartido para todo, permitiendo que un componente lento congele la aplicación
- Configurar tamaños de pool demasiado pequeños, causando rechazos innecesarios bajo carga normal
- No monitorear o alertar sobre la saturación de bulkheads
- Aislar demasiado granularmente, creando fragmentación de recursos
- Olvidar que encolar también consume memoria — las colas acotadas son esenciales

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Bulkhead y Circuit Breaker?**
R: Bulkhead aísla recursos para prevenir que una falla afecte a otras. Circuit Breaker detiene el envío de peticiones a un servicio fallido. Se complementan: Bulkhead contiene el radio de explosión, Circuit Breaker detiene el sangrado.

**P: ¿Debería usar pools de hilos o semáforos para bulkheads?**
R: Los pools de hilos proporcionan el aislamiento más fuerte pero tienen mayor overhead. Los semáforos son más ligeros y ejecutan en el hilo llamador — úsalos cuando necesites muchos bulkheads concurrentes o quieras evitar la inanición de hilos.
