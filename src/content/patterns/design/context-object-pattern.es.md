---







contentType: patterns
slug: context-object-pattern
title: "Patrón Context Object"
description: "Encapsula estado y servicios necesitados por múltiples componentes en un único objeto de contexto, reduciendo el bloat de firmas de métodos y desacoplando código de detalles del entorno."
metaDescription: "Aprende el Patrón Context Object para reducir bloat de parámetros. Ejemplos en Python, Java y JavaScript con request contexts, contenedores DI y scoping."
difficulty: intermediate
topics:
  - design
  - architecture
tags:
  - context-object
  - pattern
  - design-pattern
  - behavioral
  - architecture
  - decoupling
  - state
relatedResources:
  - /patterns/dependency-injection-pattern
  - /patterns/facade-pattern
  - /patterns/blackboard-pattern
  - /patterns/business-delegate-pattern
  - /patterns/intercepting-filter-pattern
  - /patterns/manager-pattern
  - /patterns/role-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Context Object para reducir bloat de parámetros. Ejemplos en Python, Java y JavaScript con request contexts, contenedores DI y scoping."
  keywords:
    - context object
    - design pattern
    - architecture
    - decoupling
    - state







---

# Patrón Context Object

## Descripción General

El Patrón Context Object encapsula estado y servicios necesitados por múltiples componentes en un único objeto de contexto que se pasa a través de la cadena de llamadas. En lugar de pasar diez parámetros a través de cada firma de método, los componentes reciben un único objeto de contexto que provee acceso a datos de request, sesiones de usuario, configuración, logging y servicios.

Este patrón es ubicuo en frameworks modernos. Los contextos de request HTTP en web frameworks, la Context API de React, y la clase `Context` de Android son todas implementaciones. El beneficio clave es reducir el bloat de firmas de métodos manteniendo componentes desacoplados del entorno específico en el que corren.

## Cuándo Usar


- For alternatives, see [Business Delegate Pattern](/es/patterns/business-delegate-pattern/).

Usa el Patrón Context Object cuando:
- Múltiples métodos necesitan acceso al mismo set de cross-cutting concerns
- Las firmas de métodos crecen inmanejables con parámetros repetidos (request, user, config, logger)
- Necesitas pasar datos implícitos a través de capas sin variables globales
- Los componentes deberían estar desacoplados del entorno de ejecución específico

## Cuándo Evitar

- Métodos simples que solo necesitan uno o dos parámetros (over-engineering)
- Cuando el contexto se convierte en God object conteniendo concerns no relacionados
- Contextos profundamente anidados donde mutaciones en un nivel afectan callers distantes
- Situaciones donde el paso explícito de parámetros hace dependencias más claras

## Solución

### Python

```python
from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from datetime import datetime
import uuid

@dataclass
class RequestContext:
    """Objeto de contexto llevando estado scopado por request y servicios"""
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=datetime.now)
    user_id: Optional[str] = None
    correlation_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    logger = None
    config = None

    def with_user(self, user_id: str) -> 'RequestContext':
        """Copia inmutable con usuario seteado"""
        new_ctx = RequestContext(
            request_id=self.request_id,
            timestamp=self.timestamp,
            user_id=user_id,
            correlation_id=self.correlation_id,
            metadata=self.metadata.copy()
        )
        return new_ctx

    def add_metadata(self, key: str, value: Any) -> 'RequestContext':
        new_ctx = self.with_user(self.user_id)
        new_ctx.metadata[key] = value
        return new_ctx


class ServiceLayer:
    """Lógica de negocio que usa contexto en lugar de muchos parámetros"""
    def process_order(self, ctx: RequestContext, order_data: dict) -> dict:
        print(f"[{ctx.request_id}] Procesando orden para usuario {ctx.user_id}")

        validated = self._validate(ctx, order_data)
        saved = self._persist(ctx, validated)
        return self._notify(ctx, saved)

    def _validate(self, ctx: RequestContext, data: dict) -> dict:
        print(f"[{ctx.request_id}] Validando datos de orden")
        return {**data, "validated": True}

    def _persist(self, ctx: RequestContext, data: dict) -> dict:
        print(f"[{ctx.request_id}] Persistiendo en base de datos")
        return {**data, "order_id": "ORD-123"}

    def _notify(self, ctx: RequestContext, data: dict) -> dict:
        print(f"[{ctx.request_id}] Enviando notificación")
        return {**data, "notified": True}


class RequestHandler:
    def __init__(self, service: ServiceLayer):
        self.service = service

    def handle_request(self, raw_request: dict) -> dict:
        ctx = RequestContext(
            user_id=raw_request.get("user_id"),
            correlation_id=raw_request.get("correlation_id")
        )

        return self.service.process_order(ctx, raw_request.get("order_data", {}))


# Uso
handler = RequestHandler(ServiceLayer())
result = handler.handle_request({
    "user_id": "user-42",
    "correlation_id": "corr-abc",
    "order_data": {"items": ["book", "pen"]}
})
print(result)
```

### Java

```java
import java.time.Instant;
import java.util.*;
import java.util.UUID;

public class RequestContext {
    private final String requestId;
    private final Instant timestamp;
    private final String userId;
    private final String correlationId;
    private final Map<String, Object> metadata;

    private RequestContext(Builder builder) {
        this.requestId = builder.requestId;
        this.timestamp = builder.timestamp;
        this.userId = builder.userId;
        this.correlationId = builder.correlationId;
        this.metadata = Collections.unmodifiableMap(new HashMap<>(builder.metadata));
    }

    public String getRequestId() { return requestId; }
    public String getUserId() { return userId; }
    public String getCorrelationId() { return correlationId; }
    public Map<String, Object> getMetadata() { return metadata; }

    public static class Builder {
        private String requestId = UUID.randomUUID().toString();
        private Instant timestamp = Instant.now();
        private String userId;
        private String correlationId;
        private Map<String, Object> metadata = new HashMap<>();

        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder correlationId(String id) { this.correlationId = id; return this; }
        public Builder metadata(String key, Object value) { this.metadata.put(key, value); return this; }
        public RequestContext build() { return new RequestContext(this); }
    }
}

class OrderService {
    public Map<String, Object> processOrder(RequestContext ctx, Map<String, Object> orderData) {
        System.out.println("[" + ctx.getRequestId() + "] Procesando orden para usuario " + ctx.getUserId());
        Map<String, Object> result = new HashMap<>(orderData);
        result.put("order_id", "ORD-123");
        return result;
    }
}

class RequestHandler {
    private final OrderService service;
    public RequestHandler(OrderService service) { this.service = service; }

    public Map<String, Object> handleRequest(Map<String, Object> rawRequest) {
        RequestContext ctx = new RequestContext.Builder()
            .userId((String) rawRequest.get("user_id"))
            .correlationId((String) rawRequest.get("correlation_id"))
            .build();

        return service.processOrder(ctx, (Map<String, Object>) rawRequest.get("order_data"));
    }
}

// Uso
RequestHandler handler = new RequestHandler(new OrderService());
Map<String, Object> request = new HashMap<>();
request.put("user_id", "user-42");
request.put("order_data", Map.of("items", List.of("book", "pen")));
System.out.println(handler.handleRequest(request));
```

### JavaScript

```javascript
class RequestContext {
  constructor(options = {}) {
    this.requestId = options.requestId || crypto.randomUUID();
    this.timestamp = options.timestamp || new Date();
    this.userId = options.userId || null;
    this.correlationId = options.correlationId || null;
    this.metadata = new Map(options.metadata || []);
  }

  withUser(userId) {
    return new RequestContext({
      ...this,
      userId,
      metadata: new Map(this.metadata),
    });
  }

  withMetadata(key, value) {
    const ctx = this.withUser(this.userId);
    ctx.metadata.set(key, value);
    return ctx;
  }
}

class OrderService {
  processOrder(ctx, orderData) {
    console.log(`[${ctx.requestId}] Procesando orden para usuario ${ctx.userId}`);
    return { ...orderData, orderId: 'ORD-123' };
  }
}

class RequestHandler {
  constructor(service) {
    this.service = service;
  }

  handleRequest(rawRequest) {
    const ctx = new RequestContext({
      userId: rawRequest.user_id,
      correlationId: rawRequest.correlation_id,
    });

    return this.service.processOrder(ctx, rawRequest.order_data || {});
  }
}

// Uso
const handler = new RequestHandler(new OrderService());
const result = handler.handleRequest({
  user_id: 'user-42',
  correlation_id: 'corr-abc',
  order_data: { items: ['book', 'pen'] },
});
console.log(result);
```

## Explicación

El Patrón Context Object reemplaza parámetros dispersos con un único carrier object:

- **Antes**: `process(userId, requestId, logger, config, db, cache, data)`
- **Después**: `process(ctx, data)` donde `ctx` contiene todo lo demás

Esto mantiene las firmas de métodos enfocadas en parámetros de negocio mientras que aún da capas profundas acceso a cross-cutting concerns. El contexto es típicamente creado en boundaries del sistema (requests HTTP, message handlers) y fluye hacia abajo a través de service layers.

## Variantes

| Variante | Scope | Caso de Uso |
|----------|-------|-------------|
| **Request-scoped** | Un contexto por request HTTP | Web frameworks, tracing |
| **Thread-local** | Almacenado en thread-local storage | Java, C# async contexts |
| **Async context** | Propagado a través de llamadas async | Node.js AsyncLocalStorage |
| **Global/singleton** | Un único contexto por app | CLI tools, desktop apps |

## Lo que funciona

- **Mantén contextos inmutables.** Crea nuevas instancias en lugar de mutar estado compartido.
- **Scopea contextos estrechamente.** Request-scoped, no global. Evita contextos singleton.
- **No pongas lógica de negocio en el contexto.** Solo debería llevar estado y referencias.
- **Provee factory methods.** `withUser()`, `withMetadata()` hacen la inmutabilidad ergonómica.
- **Usa genéricos de TypeScript/Java.** Los contextos type-safe previenen errores en runtime.

## Errores Comunes

- **El contexto se convierte en God object.** Si tiene 50 campos, splitea en contextos enfocados.
- **Mutar contexto a mitad de request.** Los side effects leak entre componentes de forma impredecible.
- **Usar contexto para esconder dependencias.** Los parámetros explícitos son más claros para args core de negocio.
- **No propagar a través de boundaries async.** El contexto perdido rompe tracing y asociación de usuario.
- **Almacenar objetos grandes en contexto.** Objetos pesados aumentan presión de memoria y overhead de GC.

## Ejemplos del Mundo Real

### Contextos de Request HTTP

Los objetos request de Django, Express.js `req` y `context.Context` de Go llevan datos scopados por request a través de middleware y handlers.

### React Context API

El `createContext` / `useContext` de React pasa datos a través del component tree sin prop drilling, resolviendo el mismo problema en jerarquías UI.

### Android Context

La clase `Context` de Android provee acceso a recursos, preferencias y servicios del sistema a través del app lifecycle.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Context Object e Inyección de Dependencias?**
A: DI cablea servicios en objetos en tiempo de construcción. Context Object pasa estado runtime a través de la cadena de llamadas. A menudo trabajan juntos.

**Q: Es Context Object un anti-patrón?**
A: Se vuelve anti-patrón cuando se abusa como variable global o God object. Usado bien, es esencial para arquitectura limpia.

**Q: Cómo propago contexto en código async?**
A: Usa mecanismos específicos del lenguaje: `AsyncLocalStorage` en Node.js, `ThreadLocal` en Java, o paso explícito en Python asyncio.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
