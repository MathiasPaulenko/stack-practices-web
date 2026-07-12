---



contentType: patterns
slug: shed-load-pattern
title: "Patrón Shed Load"
description: "Rechazar requests proactivamente bajo carga extrema para proteger el sistema. Descartar trafico excesivo antes de que consuma recursos y cause fallos en cascada."
metaDescription: "Rechazar requests proactivamente bajo carga extrema para proteger el sistema. Descartar trafico excesivo antes de que consuma recursos y cause fallos en cascada."
difficulty: intermediate
topics:
  - architecture
  - performance
tags:
  - shed-load
  - patron
  - patron-diseno
  - resiliencia
  - load-shedding
  - backpressure
  - proteccion-sobrecarga
relatedResources:
  - /patterns/throttling-pattern
  - /patterns/circuit-breaker-pattern
  - /patterns/graceful-degradation-pattern
  - /patterns/geode-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Rechazar requests proactivamente bajo carga extrema para proteger el sistema. Descartar trafico excesivo antes de que consuma recursos y cause fallos en cascada."
  keywords:
    - patron shed load
    - load shedding
    - patron diseno
    - patron resiliencia
    - proteccion sobrecarga
    - backpressure
    - descartar requests



---

# Patrón Shed Load

## Descripción general

Cuando un sistema recibe mas trafico del que puede procesar, entra en una espiral de muerte: las colas crecen, la latencia sube, la memoria se agota y el sistema colapsa. Load shedding detiene esta espiral rechazando proactivamente requests excesivos antes de que consuman recursos. En lugar de aceptar todo y fallar lentamente, el sistema acepta solo lo que puede manejar y rechaza el resto inmediatamente con un error claro (tipicamente HTTP 503).

El patrón monitorea una metrica de carga (profundidad de cola, uso de CPU, memoria, conexiones activas). Cuando la metrica cruza un umbral, los nuevos requests se rechazan en el borde antes de entrar al pipeline de procesamiento. Los requests existentes continuan procesandose. Cuando la carga baja del umbral, el sistema resume la aceptacion de nuevos requests.

## Cuándo usarlo


- For alternatives, see [Back-Pressure Pattern](/es/patterns/back-pressure-pattern/).

Usa el patrón Shed Load cuando:
- Los picos de trafico pueden exceder la capacidad de tu sistema (flash sales, eventos virales, DDoS)
- Procesar un request consume recursos significativos (CPU, memoria, conexiones a BD)
- Fallar lentamente es peor que fallar rapido (cascadas de timeout, agotamiento de recursos)
- Necesitas proteger paths criticos durante sobrecarga
- Ejemplos: API gateways, procesadores de pago, sistemas de streaming en tiempo real, colas de jobs batch

## Solución

### Python

```python
from dataclasses import dataclass
from typing import Callable
from enum import Enum
import time
import threading

class LoadStatus(Enum):
    ACCEPTED = "accepted"
    SHED = "shed"

class LoadShedder:
    def __init__(self, max_concurrent: int = 100, cpu_threshold: float = 0.85,
                 memory_threshold: float = 0.90, queue_threshold: int = 500):
        self.max_concurrent = max_concurrent
        self.cpu_threshold = cpu_threshold
        self.memory_threshold = memory_threshold
        self.queue_threshold = queue_threshold
        self._active = 0
        self._lock = threading.Lock()
        self._shed_count = 0
        self._accept_count = 0

    def should_shed(self) -> bool:
        if self._active >= self.max_concurrent:
            return True
        cpu_load = self._active / self.max_concurrent
        if cpu_load >= self.cpu_threshold:
            return True
        if self._active * 10 >= self.queue_threshold:
            return True
        return False

    def execute(self, request_id: str, handler: Callable) -> dict:
        with self._lock:
            if self.should_shed():
                self._shed_count += 1
                return {"request_id": request_id, "status": LoadStatus.SHED.value,
                        "message": "Service overloaded", "http_status": 503}
            self._active += 1
            self._accept_count += 1
        try:
            result = handler(request_id)
            return {"request_id": request_id, "status": LoadStatus.ACCEPTED.value,
                    "result": result, "http_status": 200}
        finally:
            with self._lock:
                self._active -= 1

    def stats(self) -> dict:
        total = self._accept_count + self._shed_count
        return {"accepted": self._accept_count, "shed": self._shed_count,
                "active": self._active, "shed_rate": self._shed_count / max(total, 1)}

# Uso
shedder = LoadShedder(max_concurrent=3, cpu_threshold=0.95, memory_threshold=0.95, queue_threshold=10000)

def mock_handler(req_id: str) -> str:
    time.sleep(0.1)
    return f"processed-{req_id}"

import concurrent.futures

with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
    results = list(pool.map(lambda i: shedder.execute(f"req-{i}", mock_handler), range(10)))

for r in results:
    print(f"  {r['request_id']}: {r['status']} (HTTP {r.get('http_status', 500)})")
print(f"\nStats: {shedder.stats()}")
```

### JavaScript

```javascript
class LoadShedder {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 100;
    this.cpuThreshold = options.cpuThreshold ?? 0.85;
    this.queueThreshold = options.queueThreshold ?? 500;
    this.active = 0;
    this.shedCount = 0;
    this.acceptCount = 0;
  }

  shouldShed() {
    if (this.active >= this.maxConcurrent) return true;
    if (this.active / this.maxConcurrent >= this.cpuThreshold) return true;
    if (this.active * 10 >= this.queueThreshold) return true;
    return false;
  }

  async execute(requestId, handler) {
    if (this.shouldShed()) {
      this.shedCount++;
      return { requestId, status: "shed", message: "Service overloaded", httpStatus: 503 };
    }
    this.active++;
    this.acceptCount++;
    try {
      const result = await handler(requestId);
      return { requestId, status: "accepted", result, httpStatus: 200 };
    } finally {
      this.active--;
    }
  }

  stats() {
    const total = this.acceptCount + this.shedCount;
    return { accepted: this.acceptCount, shed: this.shedCount,
             active: this.active, shedRate: this.shedCount / Math.max(total, 1) };
  }
}

// Uso
const shedder = new LoadShedder({ maxConcurrent: 3, cpuThreshold: 0.95, queueThreshold: 10000 });

async function mockHandler(reqId) {
  await new Promise(r => setTimeout(r, 100));
  return `processed-${reqId}`;
}

(async () => {
  const requests = Array.from({ length: 10 }, (_, i) => shedder.execute(`req-${i}`, mockHandler));
  const results = await Promise.all(requests);
  for (const r of results) console.log(`  ${r.requestId}: ${r.status} (HTTP ${r.httpStatus})`);
  console.log(`\nStats:`, shedder.stats());
})();
```

### Java

```java
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class LoadShedder {

    private final int maxConcurrent;
    private final double cpuThreshold;
    private final int queueThreshold;
    private final AtomicInteger active = new AtomicInteger(0);
    private final AtomicInteger shedCount = new AtomicInteger(0);
    private final AtomicInteger acceptCount = new AtomicInteger(0);

    public LoadShedder(int maxConcurrent, double cpuThreshold, int queueThreshold) {
        this.maxConcurrent = maxConcurrent;
        this.cpuThreshold = cpuThreshold;
        this.queueThreshold = queueThreshold;
    }

    private boolean shouldShed() {
        if (active.get() >= maxConcurrent) return true;
        if ((double) active.get() / maxConcurrent >= cpuThreshold) return true;
        if (active.get() * 10 >= queueThreshold) return true;
        return false;
    }

    public String execute(String requestId, java.util.function.Function<String, String> handler) {
        if (shouldShed()) {
            shedCount.incrementAndGet();
            return String.format("{\"requestId\":\"%s\",\"status\":\"shed\",\"httpStatus\":503}", requestId);
        }
        active.incrementAndGet();
        acceptCount.incrementAndGet();
        try {
            String result = handler.apply(requestId);
            return String.format("{\"requestId\":\"%s\",\"status\":\"accepted\",\"result\":\"%s\",\"httpStatus\":200}",
                requestId, result);
        } finally {
            active.decrementAndGet();
        }
    }

    public String stats() {
        int total = acceptCount.get() + shedCount.get();
        return String.format("accepted=%d, shed=%d, active=%d, shedRate=%.2f",
            acceptCount.get(), shedCount.get(), active.get(), (double) shedCount.get() / Math.max(total, 1));
    }

    public static void main(String[] args) throws Exception {
        var shedder = new LoadShedder(3, 0.95, 10000);
        var executor = Executors.newFixedThreadPool(10);
        var futures = new java.util.ArrayList<Future<String>>();

        for (int i = 0; i < 10; i++) {
            final int idx = i;
            futures.add(executor.submit(() -> shedder.execute("req-" + idx, req -> {
                try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                return "processed-" + req;
            })));
        }
        for (Future<String> f : futures) System.out.println("  " + f.get());
        System.out.println("\nStats: " + shedder.stats());
        executor.shutdown();
    }
}
```

## Explicación

El shedder se sienta en el punto de entrada del sistema y toma una decision de aceptar/rechazar para cada request:

1. **Recoleccion de metricas**: Antes de aceptar un request, el shedder verifica las metricas de carga actuales. Incluyen conteo de requests activos, uso de CPU, presion de memoria y profundidad de cola.
2. **Verificacion de umbral**: Si alguna metrica excede su umbral, el request se descarta inmediatamente. El llamador recibe un 503 con un header Retry-After, no un timeout despues de 30 segundos de espera.
3. **Aceptar y rastrear**: Si el sistema tiene capacidad, el request se acepta y el contador activo se incrementa. El contador se decrementa cuando el request completa, liberando capacidad para el siguiente.

El insight clave es que el shedding es proactivo, no reactivo. El sistema no espera hasta colapsar para empezar a rechazar. Rechaza antes del agotamiento de recursos, manteniendo el sistema responsivo para los requests aceptados.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Shedding por prioridad** | Descartar requests de baja prioridad primero, mantener usuarios premium | SLAs por niveles, APIs freemium |
| **Shedding gradual** | Descartar un porcentaje de requests conforme aumenta la carga | Degradacion mas suave que un corte duro |
| **Shedding por cola** | Descartar cuando la cola de requests excede un limite de profundidad | Sistemas de colas de workers, procesadores de mensajes |
| **Shedding por tiempo** | Descartar durante horas pico predecidas | Patrones de trafico conocidos (ventas, eventos) |

## Buenas prácticas

- **Descarta en el borde** (API gateway, load balancer) antes de que los requests entren a servicios internos
- **Devuelve 503 con Retry-After** para que los clientes sepan hacer backoff temporal
- **Monitorea el shed rate** como metrica clave; shed rate alto significa que necesitas mas capacidad
- **Descarta trafico de baja prioridad primero** para proteger paths criticos
- **Mantén la logica de shed rapida** para que el shedder mismo no se vuelva un cuello de botella
- **Combina con autoscaling** para que el shedding sea temporal mientras la capacidad alcanza

## Errores comunes

- Descartar demasiado tarde, despues de que los recursos ya se agotaron
- No rastrear requests activos, asi el shedder no conoce la carga actual
- Descartar sin devolver un error util, dejando a los clientes confundidos
- Logica de shed demasiado cara, anadiendo latencia a cada request
- No diferenciar entre niveles de prioridad, descartando trafico critico y no critico por igual
- Descartar en la capa de aplicacion en lugar del borde, desperdiciando recursos de red y procesamiento

## Preguntas frecuentes

**Q: Como se diferencia load shedding de rate limiting (throttling)?**
A: Rate limiting limita requests por cliente en el tiempo (100 req/min). Load shedding limita la carga total del sistema basado en metricas de salud (CPU, profundidad de cola). Rate limiting protege contra clientes individuales. Load shedding protege al sistema como un todo.

**Q: Que status HTTP deben devolver los requests descartados?**
A: 503 Service Unavailable con un header `Retry-After`. Esto dice a los clientes que el fallo es temporal y cuando reintentar. No devuelvas 500, que implica un bug.

**Q: Debo descartar sincrono o asincrono?**
A: Sincrono en el borde. La verificacion de shed deberia tomar microsegundos. Si la verificacion misma es lenta, tienes un problema diferente.

**Q: Como calculo los umbrales correctos?**
A: Haz load testing de tu sistema para encontrar su punto de quiebre. Define umbrales al 80-90% de ese punto. Por ejemplo, si el sistema maneja 1000 requests concurrentes antes de degradarse, define `max_concurrent` en 850.
