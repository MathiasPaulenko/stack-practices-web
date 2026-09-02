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
  - /recipes/handle-errors
  - /recipes/rate-limiting
  - /recipes/rest-api-design
  - /recipes/api-versioning
  - /recipes/traffic-mirroring
lastUpdated: "2026-08-19"
publishedAt: "2026-06-11"
author: Mathias Paulenko
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

La idempotencia garantiza que hacer el mismo request a una API varias veces
produzca el mismo resultado que hacerlo una vez, sin efectos secundarios
duplicados. Esto es clave en sistemas distribuidos donde fallas de red, timeouts
y retries son comunes.

Esta receta muestra cómo diseñar endpoints idempotentes usando idempotency keys,
restricciones de clave natural y verificaciones de estado en Python, JavaScript y
Java.

## Cuándo Usar

- Construir APIs de pagos o pedidos donde deben evitarse cargos duplicados.
  Consultá el [Checklist de Seguridad de APIs](/es/guides/api-security-checklist-guide/)
  para patrones seguros de pagos.
- Diseñar APIs consumidas por apps móviles con conectividad poco confiable.
  Consultá [Llamar REST API](/es/recipes/call-rest-api/) para patrones de retry
  en cliente.
- Implementar lógica de retry donde el mismo request puede enviarse varias veces.
- Crear receptores de webhooks que pueden entregar el mismo evento más de una
  vez.

### Cuándo evitarlo

- Los endpoints de solo lectura (`GET`, `HEAD`, `OPTIONS`) ya son idempotentes por
  la especificación HTTP — no necesitan manejo extra.
- Operaciones sin efectos secundarios o sin riesgo de retry rara vez justifican
  el almacenamiento y la lógica adicional.

## Solución

### Python (FastAPI)

```python
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import uuid
import time
from typing import Optional

app = FastAPI()

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

    try:
        uuid.UUID(idempotency_key)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Idempotency-Key format")

    now = time.time()

    expired = [k for k, v in idempotency_store.items() if now - v["timestamp"] > IDEMPOTENCY_TTL]
    for k in expired:
        del idempotency_store[k]

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

    idempotency_store[idempotency_key] = {
        "status": "processing",
        "timestamp": now,
        "order_id": None
    }

    try:
        order_id = str(uuid.uuid4())
        # ... guardar en base de datos ...

        idempotency_store[idempotency_key] = {
            "status": "completed",
            "timestamp": now,
            "order_id": order_id
        }

        return {"id": order_id, "status": "completed", "cached": False}
    except Exception:
        del idempotency_store[idempotency_key]
        raise
```

### JavaScript (Express)

```javascript
import express from "express";
import { v4 as uuidv4, validate as validateUuid } from "uuid";

const app = express();
app.use(express.json());

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

  idempotencyStore.set(idempotencyKey, {
    status: "processing",
    timestamp: Date.now(),
    orderId: null
  });

  try {
    const orderId = uuidv4();
    // ... guardar en base de datos ...

    idempotencyStore.set(idempotencyKey, {
      status: "completed",
      timestamp: Date.now(),
      orderId
    });

    res.json({ id: orderId, status: "completed", cached: false });
  } catch (err) {
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

    store.put(keyStr, new IdempotencyRecord("processing", now, null));

    try {
      UUID orderId = UUID.randomUUID();
      // ... guardar en base de datos ...

      store.put(keyStr, new IdempotencyRecord("completed", now, orderId));
      return new OrderResponse(orderId, "completed", false);
    } catch (Exception e) {
      store.remove(keyStr);
      throw e;
    }
  }
}
```

## Explicación

Una **idempotency key** es un identificador generado por el cliente y enviado en
el header `Idempotency-Key`. El servidor la usa para detectar requests duplicados
y devolver la misma respuesta.

El estado **processing** evita que dos requests concurrentes ejecuten la misma
operación dos veces. Un segundo request que llega mientras el primero aún corre
recibe `409 Conflict`.

La **limpieza TTL** es necesaria porque los stores de idempotencia crecen sin
límite. Usá Redis con TTL o programá limpieza periódica. Un TTL de 24 horas es
común para operaciones financieras.

El **manejo de errores** debe remover el marcador `processing` ante una falla
para que el cliente pueda reintentar. Consultá
[Manejo de Errores](/es/recipes/handle-errors/) para patrones de retry. De lo
contrario, la clave queda bloqueada.

La **idempotencia natural** con `PUT /orders/{id}` sigue la semántica HTTP —
actualizaciones repetidas con el mismo body dejan el recurso en el mismo estado.
Consultá [Llamar REST API](/es/recipes/call-rest-api/) para semántica de métodos
HTTP.

## Variantes

| Estrategia | Implementación | Ideal para |
| --- | --- | --- |
| Idempotency key header | UUID en header `Idempotency-Key` | Endpoints POST creando recursos |
| Restricción de clave natural | Constraint único de base de datos sobre clave de negocio | Operaciones UPSERT, registro de usuario |
| Verificación de state machine | Verificar estado actual antes de transición | Motores de workflow, procesamiento de pagos |
| ETag / If-Match | Requests condicionales con versión | Concurrencia optimista, updates |

## Mejores Prácticas

- Requerir idempotency keys en endpoints POST/PUT/PATCH que cambian estado.
- Usar UUID v4 para las claves; evitar enteros autoincrementales o timestamps que
  puedan colisionar entre clientes.
- Almacenar la respuesta completa, no solo un flag de estado, para que los
  duplicados devuelvan datos idénticos.
- Setear un TTL que coincida con la ventana de retry y documentarlo. Veinticuatro
  horas es común para pagos.
- Hacer que `DELETE /resources/{id}` devuelva `204` o `404`; ambos significan que
  el recurso ya no existe.
- Validar el formato de la clave y rechazar claves ausentes o malformadas con
  `400 Bad Request`.

## Errores Comunes

- Verificar la idempotency key sin bloqueo atómico, lo que permite que dos
  requests paralelos ambos ejecuten.
- Setear TTL infinito, eventualmente agotando el almacenamiento y degradando
  performance.
- Devolver respuestas diferentes para la misma idempotency key, rompiendo el
  contrato.
- Usar idempotency keys en requests GET, que ya son idempotentes.
- No remover el marcador `processing` ante falla, bloqueando retries
  permanentemente.

## Preguntas Frecuentes

### ¿Cuáles métodos HTTP son naturalmente idempotentes?

GET, HEAD, PUT, DELETE y OPTIONS son naturalmente idempotentes. POST no lo es —
POSTs repetidos suelen crear múltiples recursos. La idempotencia de PATCH
depende de la semántica del patch.

### ¿Cómo debería generar el cliente las idempotency keys?

Generá un UUID v4 antes del primer intento y reusá la misma clave para cada
reintento de la misma operación lógica. Nunca reusés una clave para una
operación diferente.

### ¿Puedo implementar idempotencia sin un store dedicado?

Sí, con constraints de base de datos. Por ejemplo, una tabla `payments` con un
constraint único sobre `(idempotency_key, merchant_id)` previene duplicados
atómicamente. Funciona cuando la clave mapea directamente a un registro. Para
operaciones multi-paso, un store dedicado es más claro.

### ¿Cómo se relaciona con rate limiting?

La idempotencia evita efectos secundarios duplicados. El rate limiting evita
muchos requests. Trabajan juntos. Consultá [Rate Limiting](/es/recipes/rate-limiting/)
para límites de cliente y servidor.
