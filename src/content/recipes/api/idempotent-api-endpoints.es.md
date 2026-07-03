---
contentType: recipes
slug: idempotent-api-endpoints
title: "Endpoints de API Idempotentes"
description: "Cómo diseñar e implementar endpoints de API idempotentes que manejen retries, requests duplicados y fallas de red sin efectos secundarios."
metaDescription: "Aprende diseño de APIs idempotentes en Python, JavaScript y Java. Cubre idempotency keys, métodos HTTP y patrones de retry seguros para sistemas distribuidos."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - distributed-systems
  - http
  - rest
  - backend
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-cors
  - /recipes/api-versioning
  - /recipes/handle-errors
  - /recipes/rate-limiting
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende diseño de APIs idempotentes en Python, JavaScript y Java. Cubre idempotency keys, métodos HTTP y patrones de retry seguros para sistemas distribuidos."
  keywords:
    - idempotencia
    - api
    - http
    - sistemas-distribuidos
    - retry
    - seguridad
    - python
    - javascript
    - java
---
## Visión General

La idempotencia garantiza que hacer el mismo request a una API múltiples veces produce el mismo resultado que hacerlo una vez, sin crear efectos secundarios duplicados. Esto es esencial en sistemas distribuidos donde fallas de red, timeouts y retries son inevitables. Esta receta cubre el diseño de endpoints idempotentes usando idempotency keys, restricciones de clave natural y verificaciones de máquina de estados en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Construyas APIs de pagos o pedidos donde deben evitarse cargos duplicados. Consulta [Checklist de Seguridad de APIs](/guides/security/api-security-checklist-guide) para patrones seguros de pagos.
- Diseñes APIs consumidas por apps móviles con conectividad de red poco confiable. Consulta [Llamar REST API](/recipes/api/call-rest-api) para patrones de retry en cliente.
- Implementes lógica de retry donde el mismo request puede enviarse múltiples veces
- Crees receptores de webhooks que pueden entregar el mismo evento más de una vez

## Solución

### Python (FastAPI)

```python
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import uuid
import time
from typing import Optional

app = FastAPI()

# Store en memoria; usa [Redis](/recipes/api/api-rate-limiting-redis) en producción
idempotency_store = {}
IDEMPOTENCY_TTL = 86400  # 24 horas

class CreateOrderRequest(BaseModel):
    customer_id: str
    amount: float
    currency: str = "USD"

@app.post("/orders")
def create_order(
    request: CreateOrderRequest,
    idempotency_key: Optional[str] = Header(None)
):
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header required")

    # Validar formato de clave
    try:
        uuid.UUID(idempotency_key)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Idempotency-Key format")

    now = time.time()

    # Limpieza de entradas expiradas (simplificado; usa TTL en producción)
    expired = [k for k, v in idempotency_store.items() if now - v["timestamp"] > IDEMPOTENCY_TTL]
    for k in expired:
        del idempotency_store[k]

    # Verificar si ya vimos esta clave
    if idempotency_key in idempotency_store:
        stored = idempotency_store[idempotency_key]
        if stored["status"] == "completed":
            return {
                "id": stored["order_id"],
                "status": "completed",
                "cached": True
            }
        elif stored["status"] == "processing":
            raise HTTPException(status_code=409, detail="Request already in progress")

    # Marcar como processing
    idempotency_store[idempotency_key] = {
        "status": "processing",
        "timestamp": now,
        "order_id": None
    }

    try:
        # Ejecutar la lógica de negocio real
        order_id = str(uuid.uuid4())
        # ... guardar en base de datos ...

        # Marcar como completado
        idempotency_store[idempotency_key] = {
            "status": "completed",
            "timestamp": now,
            "order_id": order_id
        }

        return {"id": order_id, "status": "completed", "cached": False}
    except Exception:
        # Remover marcador de processing para que el cliente pueda reintentar
        del idempotency_store[idempotency_key]
        raise
```

### JavaScript (Express)

```javascript
import express from "express";
import { v4 as uuidv4, validate as validateUuid } from "uuid";

const app = express();
app.use(express.json());

// Usa Redis en producción
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL = 86400 * 1000; // 24 horas

function isExpired(timestamp) {
  return Date.now() - timestamp > IDEMPOTENCY_TTL;
}

app.post("/orders", (req, res) => {
  const idempotencyKey = req.headers["idempotency-key"];

  if (!idempotencyKey) {
    return res.status(400).json({ error: "Idempotency-Key header required" });
  }
  if (!validateUuid(idempotencyKey)) {
    return res.status(400).json({ error: "Invalid Idempotency-Key format" });
  }

  // Limpieza de entradas expiradas
  for (const [key, entry] of idempotencyStore) {
    if (isExpired(entry.timestamp)) {
      idempotencyStore.delete(key);
    }
  }

  const existing = idempotencyStore.get(idempotencyKey);

  if (existing) {
    if (existing.status === "completed") {
      return res.json({
        id: existing.orderId,
        status: "completed",
        cached: true
      });
    }
    if (existing.status === "processing") {
      return res.status(409).json({ error: "Request already in progress" });
    }
  }

  // Marcar como processing
  idempotencyStore.set(idempotencyKey, {
    status: "processing",
    timestamp: Date.now(),
    orderId: null
  });

  try {
    // Ejecutar lógica de negocio
    const orderId = uuidv4();
    // ... guardar en base de datos ...

    idempotencyStore.set(idempotencyKey, {
      status: "completed",
      timestamp: Date.now(),
      orderId
    });

    res.json({ id: orderId, status: "completed", cached: false });
  } catch (err) {
    // Permitir retry removiendo el marcador de processing
    idempotencyStore.delete(idempotencyKey);
    throw err;
  }
});
```

### Java (Spring Boot)

```java
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/orders")
public class OrderController {

  private final ConcurrentHashMap<String, IdempotencyRecord> store = new ConcurrentHashMap<>();
  private static final long IDEMPOTENCY_TTL_MS = 86400_000; // 24 horas

  record CreateOrderRequest(String customerId, double amount, String currency) {}
  record OrderResponse(UUID id, String status, boolean cached) {}
  record IdempotencyRecord(String status, long timestamp, UUID orderId) {}

  @PostMapping
  public OrderResponse createOrder(
      @RequestBody CreateOrderRequest request,
      @RequestHeader("Idempotency-Key") String idempotencyKey) {

    UUID key;
    try {
      key = UUID.fromString(idempotencyKey);
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Idempotency-Key format");
    }

    String keyStr = key.toString();
    long now = System.currentTimeMillis();

    // Limpieza de entradas expiradas
    store.entrySet().removeIf(entry -> now - entry.getValue().timestamp() > IDEMPOTENCY_TTL_MS);

    IdempotencyRecord existing = store.get(keyStr);
    if (existing != null) {
      if ("completed".equals(existing.status())) {
        return new OrderResponse(existing.orderId(), "completed", true);
      }
      if ("processing".equals(existing.status())) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Request already in progress");
      }
    }

    // Marcar como processing
    store.put(keyStr, new IdempotencyRecord("processing", now, null));

    try {
      // Ejecutar lógica de negocio
      UUID orderId = UUID.randomUUID();
      // ... guardar en base de datos ...

      store.put(keyStr, new IdempotencyRecord("completed", now, orderId));
      return new OrderResponse(orderId, "completed", false);
    } catch (Exception e) {
      store.remove(keyStr); // Permitir retry
      throw e;
    }
  }
}
```

## Explicación

- **Idempotency key** es un identificador único generado por el cliente (UUID recomendado) enviado en un header. El servidor usa esta clave para detectar requests duplicados y retornar la respuesta cacheada.
- **Estado processing** previene que requests duplicados concurrentes ejecuten la misma operación dos veces. Si un segundo request llega mientras el primero aún está en proceso, retorna `409 Conflict`.
- **Limpieza TTL** es necesaria porque los stores de idempotencia crecen sin límite. Usa Redis con TTL o programa limpieza periódica. El TTL típico es 24 horas.
- **Manejo de errores** ante falla debe remover el marcador de "processing" para que el cliente pueda reintentar de forma segura. Consulta [Manejo de Errores](/recipes/api/handle-errors) para patrones de retry. De lo contrario, un request fallado quedaría bloqueado permanentemente.
- **Idempotencia natural** vía PUT con path de recurso (ej. `PUT /orders/{id}`) es idempotente por semántica HTTP — actualizaciones repetidas con el mismo body producen el mismo estado. Consulta [Llamar REST API](/recipes/api/call-rest-api) para semántica de métodos HTTP.

## Variantes

| Estrategia | Implementación | Ideal Para |
|------------|---------------|------------|
| Idempotency key header | UUID en header `Idempotency-Key` | Endpoints POST creando recursos |
| Restricción de clave natural | Constraint único de base de datos sobre clave de negocio | Operaciones UPSERT, registro de usuario |
| Verificación de state machine | Verificar estado actual antes de transición | Motores de workflow, procesamiento de pagos |
| ETag / If-Match | Requests condicionales con versión | Concurrencia optimista, updates |
| Idempotency-Key: * | No recomendado | Nunca usar; siempre usa claves únicas |

## Lo que funciona

1. **Requiere idempotency keys para operaciones que cambian estado** — todos los endpoints POST/PUT/PATCH que crean o modifican recursos deberían aceptar un header `Idempotency-Key`.
2. **Usa UUID v4 para las claves** — los clientes deben generar UUIDs criptográficamente aleatorios. Evita enteros autoincrementales o timestamps que podrían colisionar entre clientes.
3. **Almacena respuestas, no solo estado** — cuando un request se completa, cachea la respuesta completa para que requests duplicados retornen datos idénticos, no solo un acknowledgement de éxito.
4. **Setea TTLs apropiados** — 24 horas es estándar para operaciones financieras; TTLs más cortos (1 hora) funcionan para flujos menos críticos. Documenta tu TTL para que los clientes conozcan la ventana de retry.
5. **Haz DELETE naturalmente idempotente** — `DELETE /resources/{id}` debería retornar `204` o `404` en llamadas repetidas, ambos indicando que el recurso no existe.

## Errores Comunes

1. Implementar idempotency keys pero no verificarlas atómicamente, causando condiciones de carrera donde dos requests paralelos ambos ejecutan.
2. Setear TTL infinito en registros de idempotencia, eventualmente agotando el almacenamiento y degradando performance.
3. Retornar respuestas diferentes para la misma idempotency key (ej. diferentes order IDs), rompiendo el contrato de idempotencia.
4. Usar idempotency keys en requests GET, que ya son idempotentes por especificación HTTP y no necesitan claves.
5. No remover el marcador de "processing" ante falla, bloqueando permanentemente retries para esa clave.

## Preguntas Frecuentes

### ¿Cuáles métodos HTTP son naturalmente idempotentes?

GET, HEAD, PUT, DELETE y OPTIONS son naturalmente idempotentes por especificación HTTP. POST no es idempotente por defecto — POSTs repetidos crean múltiples recursos. La idempotencia de PATCH depende de la semántica del patch (JSON Merge Patch vs JSON Patch).

### ¿Cómo debería generar el cliente las idempotency keys?

Genera un UUID v4 en el lado del cliente antes del primer intento de request. Reusa la misma clave para todos los retries de la misma operación lógica. Nunca reuses una clave para una operación diferente (diferente monto, diferente cliente, etc.). Almacena la clave localmente hasta recibir una respuesta definitiva de éxito o falla.

### ¿Puedo implementar idempotencia sin un store dedicado?

Sí, usando constraints de base de datos. Por ejemplo, una tabla `payments` con un constraint único sobre `(idempotency_key, merchant_id)` previene duplicados naturalmente. La transacción de base de datos aplica atomicidad sin un cache separado. Sin embargo, esto solo funciona cuando la clave mapea directamente a un registro de base de datos; para operaciones multi-paso complejas, un store dedicado es más claro.
