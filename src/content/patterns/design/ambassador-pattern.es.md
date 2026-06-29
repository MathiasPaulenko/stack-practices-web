---
contentType: patterns
slug: ambassador-pattern
title: "Patrón Ambassador"
description: "Despliega un proxy del lado del cliente que maneja preocupaciones transversales para llamadas a servicios salientes. Un patrón de microservicios para networking inteligente del lado del cliente."
metaDescription: "Aprende el Patrón Ambassador en Python, Java y JavaScript. Proxy del lado del cliente con reintentos, circuit breaking y descubrimiento."
difficulty: intermediate
topics:
  - design
tags:
  - ambassador
  - patron
  - patron-de-diseno
  - microservicios
  - proxy-lado-cliente
  - descubrimiento-servicios
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/sidecar-pattern
  - /patterns/design/proxy-pattern
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Ambassador en Python, Java y JavaScript. Proxy del lado del cliente con reintentos, circuit breaking y descubrimiento."
  keywords:
    - patron ambassador
    - patron de diseno
    - patron microservicios
    - proxy lado cliente
    - descubrimiento servicios
    - python ambassador
    - java ambassador
    - javascript ambassador
---

# Patrón Ambassador

## Resumen

El Patrón Ambassador despliega un [proxy](/patterns/design/proxy-pattern) del lado del cliente junto a una aplicación para manejar preocupaciones transversales en llamadas a servicios salientes. El ambassador gestiona reintentos, circuit breaking, balanceo de carga, descubrimiento de servicios y terminación TLS — liberando a la aplicación principal de la complejidad de networking.

## Cuándo usarlo

Usa el Patrón Ambassador cuando:
- La aplicación principal no debería contener lógica de networking (reintentos, timeouts, TLS)
- Múltiples servicios comparten las mismas preocupaciones salientes y quieres centralizarlas
- Necesitas capacidades de networking agnósticas de lenguaje a través de servicios políglotas
- Quieres actualizar lógica de networking sin cambiar la aplicación principal
- Ejemplos: sidecars de service mesh (Envoy/Istio), clientes de API gateway, proxies inteligentes

## Solución

### Python

```python
import time
import random
from typing import Callable, Any

class AmbassadorProxy:
    def __init__(self, target_host: str, max_retries: int = 3, timeout: float = 2.0):
        self.target = target_host
        self.max_retries = max_retries
        self.timeout = timeout

    def call(self, fn: Callable, *args, **kwargs) -> Any:
        for attempt in range(1, self.max_retries + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                if attempt == self.max_retries:
                    raise
                wait = 2 ** attempt
                print(f"[Ambassador] Reintento {attempt} después de {wait}s: {e}")
                time.sleep(wait)
        return None

# App principal — sin lógica de networking
class PaymentService:
    def __init__(self):
        self.ambassador = AmbassadorProxy("payment-api.example.com")

    def charge(self, amount: float):
        return self.ambassador.call(self._do_charge, amount)

    def _do_charge(self, amount: float):
        if random.random() < 0.6:
            raise ConnectionError("API de pago inaccesible")
        return {"status": "cobrado", "amount": amount}

# Uso
service = PaymentService()
try:
    result = service.charge(99.99)
    print(result)
except ConnectionError as e:
    print(f"Todos los reintentos fallaron: {e}")
```

### JavaScript

```javascript
class AmbassadorProxy {
  constructor(targetHost, { maxRetries = 3, timeoutMs = 2000 } = {}) {
    this.target = targetHost;
    this.maxRetries = maxRetries;
    this.timeoutMs = timeoutMs;
  }

  async call(fn, ...args) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (e) {
        if (attempt === this.maxRetries) throw e;
        const wait = 2 ** attempt * 1000;
        console.log(`[Ambassador] Reintento ${attempt} después de ${wait}ms: ${e.message}`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
}

// App principal
class PaymentService {
  constructor() {
    this.ambassador = new AmbassadorProxy("payment-api.example.com");
  }

  async charge(amount) {
    return this.ambassador.call(this._doCharge.bind(this), amount);
  }

  async _doCharge(amount) {
    if (Math.random() < 0.6) throw new Error("API de pago inaccesible");
    return { status: "cobrado", amount };
  }
}

// Uso
const service = new PaymentService();
service.charge(99.99)
  .then(console.log)
  .catch(e => console.log("Todos los reintentos fallaron:", e.message));
```

### Java

```java
import java.util.function.Function;

public class AmbassadorProxy {
    private final String target;
    private final int maxRetries;
    private final long timeoutMs;

    public AmbassadorProxy(String target, int maxRetries, long timeoutMs) {
        this.target = target;
        this.maxRetries = maxRetries;
        this.timeoutMs = timeoutMs;
    }

    public <T> T call(Function<Void, T> fn) {
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return fn.apply(null);
            } catch (Exception e) {
                if (attempt == maxRetries) throw new RuntimeException("Todos los reintentos fallaron", e);
                long wait = (long) Math.pow(2, attempt) * 1000;
                System.out.println("[Ambassador] Reintento " + attempt + " después de " + wait + "ms");
                try {
                    Thread.sleep(wait);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrumpido durante reintento", ie);
                }
            }
        }
        throw new IllegalStateException("Inalcanzable");
    }
}

// App principal
class PaymentService {
    private final AmbassadorProxy ambassador;

    PaymentService() {
        this.ambassador = new AmbassadorProxy("payment-api.example.com", 3, 2000);
    }

    String charge(double amount) {
        return ambassador.call(v -> {
            if (Math.random() < 0.6) throw new RuntimeException("API de pago inaccesible");
            return "cobrado: " + amount;
        });
    }
}

// Uso
PaymentService service = new PaymentService();
try {
    System.out.println(service.charge(99.99));
} catch (Exception e) {
    System.out.println("Todos los reintentos fallaron: " + e.getMessage());
}
```

## Explicación

El Patrón Ambassador actúa como un **proxy inteligente del lado del cliente**:

- **Proxy**: Intercepta llamadas salientes de la aplicación principal
- **Reintentos**: Reintenta automáticamente peticiones transitorias fallidas
- **Circuit Breaking**: Deja de enviar peticiones a servicios fallidos
- **Balanceo de Carga**: Distribuye peticiones entre instancias de servicios
- **Descubrimiento de Servicios**: Resuelve nombres de servicios a endpoints reales
- **TLS/Auth**: Maneja encriptación y autenticación transparentemente

La aplicación principal hace llamadas simples; el ambassador maneja toda la resiliencia de networking.

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **Ambassador Sidecar** | Corre como contenedor co-ubicado (Envoy) | Kubernetes, service mesh |
| **Ambassador Biblioteca** | Biblioteca de cliente embebida (Resilience4j) | Cuando sidecars no están disponibles |
| **Ambassador Inverso** | Proxy del lado del servidor para llamadas entrantes | API gateway, ingress controller |
| **Ambassador Multi-Tenant** | Enruta por tenant a diferentes backends | Aplicaciones SaaS |

## Lo que funciona

- **Mantén la aplicación principal ingenua en networking** — debería solo llamar métodos
- **Configura reintentos con backoff exponencial y jitter** para evitar thundering herd
- **Incluye lógica de [circuit breaker](/patterns/design/circuit-breaker-pattern)** en el ambassador, no en la app principal
- **Registra y métrica todas las llamadas salientes** desde el ambassador para observabilidad
- **Mantén la lógica del ambassador stateless** para que pueda reutilizarse entre servicios

## Errores comunes

- Embeber lógica de reintento/circuit breaker directamente en la aplicación principal
- Hacer el ambassador demasiado complejo, convirtiéndolo en un punto único de fallo
- No configurar timeouts, permitiendo que las llamadas cuelguen indefinidamente
- Usar ambassador para apps simples de un solo servicio donde las llamadas directas bastan
- No monitorear la salud del ambassador independientemente de la app principal

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Ambassador y API Gateway?**
R: Ambassador es un proxy del lado del cliente (por servicio). [API Gateway](/recipes/serverless/serverless-api-gateway) es un proxy del lado del servidor (por clúster/ingress). Ambos manejan preocupaciones transversales pero en capas diferentes.

**P: ¿Debería usar un sidecar de service mesh o una biblioteca embebida?**
R: Los sidecars de [service mesh](/guides/architecture/microservices-architecture-guide) (Envoy) te dan capacidades agnósticas de lenguaje a nivel de infraestructura sin cambios de código. Las bibliotecas embebidas (Resilience4j, Polly) tienen menor latencia pero requieren implementación por lenguaje.
