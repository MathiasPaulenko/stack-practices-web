---
contentType: patterns
slug: message-deduplication-pattern
title: "Patrón Message Deduplication"
description: "Prevenir procesamiento duplicado rastreando IDs de mensaje con claves de idempotencia. Los consumidores verifican un almacen antes de procesar para saltar mensajes ya manejados."
metaDescription: "Prevenir procesamiento duplicado con claves de idempotencia. Rastrear IDs de mensaje en un almacen y saltar mensajes ya procesados en los consumidores."
difficulty: intermediate
topics:
  - messaging
  - architecture
tags:
  - message-deduplication
  - patron
  - patron-diseno
  - idempotency
  - exactly-once
  - deduplication
  - message-queue
relatedResources:
  - /patterns/design/message-queue-load-leveling-pattern
  - /patterns/design/dead-letter-channel-pattern
  - /patterns/design/publish-subscribe-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Prevenir procesamiento duplicado con claves de idempotencia. Rastrear IDs de mensaje en un almacen y saltar mensajes ya procesados en los consumidores."
  keywords:
    - patron message deduplication
    - clave idempotencia
    - procesamiento exactly once
    - patron diseno
---

## Descripción General

Los brokers de mensajes garantizan entrega at-least-once, lo que significa que los consumidores pueden recibir el mismo mensaje mas de una vez. Reintentos de red, caidas del consumidor durante el procesamiento y reentregas del broker causan duplicados. Sin deduplicacion, un pago puede procesarse dos veces o una notificacion enviarse multiples veces.

El patron Message Deduplication rastrea IDs de mensaje en un almacen. Antes de procesar, el consumidor verifica si el ID ya fue manejado. Si si, salta el procesamiento. Si no, procesa el mensaje y registra el ID.

## Cuándo Usar

- Tu broker de mensajes proporciona entrega at-least-once (la mayoria: SQS, RabbitMQ, Kafka)
- Procesar un mensaje dos veces causa efectos secundarios (pagos, emails, cambios de inventario)
- Necesitas semantica exactly-once sin un broker que la soporte nativamente
- Los consumidores caen y los mensajes se reentregan

## Solución

### Python (Redis + SQS)

```python
import redis
import json
import hashlib

r = redis.Redis(host="localhost", port=6379, db=0)
DEDUP_TTL = 86400  # 24 horas

def process_message(message_id, payload):
    # Verificar si ya fue procesado
    dedup_key = f"dedup:{message_id}"
    if r.exists(dedup_key):
        print(f"Skipping duplicate message {message_id}")
        return

    # Procesar el mensaje
    result = handle_order(payload)

    # Marcar como procesado con TTL
    r.setex(dedup_key, DEDUP_TTL, "1")
    print(f"Processed message {message_id}")

def handle_order(payload):
    order = json.loads(payload)
    print(f"Charging payment for order {order['order_id']}")
    return {"status": "charged"}

# Simular entrega duplicada
process_message("msg-001", '{"order_id": 42}')
process_message("msg-001", '{"order_id": 42}')  # Saltado
```

### JavaScript (Redis + BullMQ)

```javascript
import Redis from "ioredis";
import { Worker } from "bullmq";

const redis = new Redis({ host: "localhost", port: 6379 });
const DEDUP_TTL = 86400; // 24 horas

async function isDuplicate(messageId) {
  const key = `dedup:${messageId}`;
  const result = await redis.set(key, "1", "EX", DEDUP_TTL, "NX");
  // result es "OK" si la clave fue establecida (primera vez), null si ya existia
  return result === null;
}

const worker = new Worker(
  "orders",
  async (job) => {
    const messageId = job.data.messageId;
    const payload = job.data.payload;

    if (await isDuplicate(messageId)) {
      console.log(`Skipping duplicate message ${messageId}`);
      return { status: "skipped" };
    }

    // Procesar el mensaje
    console.log(`Charging payment for order ${payload.orderId}`);
    return { status: "processed" };
  },
  { connection: { host: "localhost", port: 6379 } }
);
```

### Java (Redis + Spring)

```java
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import java.util.concurrent.TimeUnit;

@Component
public class DeduplicatingConsumer {

    private final StringRedisTemplate redis;
    private static final int DEDUP_TTL = 86400; // 24 horas

    public DeduplicatingConsumer(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void processMessage(String messageId, String payload) {
        String dedupKey = "dedup:" + messageId;

        // Check-and-set atomico: retorna true si la clave fue establecida (primera vez)
        Boolean wasSet = redis.opsForValue()
            .setIfAbsent(dedupKey, "1", DEDUP_TTL, TimeUnit.SECONDS);

        if (Boolean.FALSE.equals(wasSet)) {
            System.out.println("Skipping duplicate message " + messageId);
            return;
        }

        // Procesar el mensaje
        System.out.println("Processing message " + messageId + ": " + payload);
        handleOrder(payload);
    }

    private void handleOrder(String payload) {
        // Logica de negocio aqui
    }
}
```

## Explicación

El patron usa una operacion atomica check-and-set (Redis `SET NX EX`) para determinar si un mensaje fue procesado. La operacion es atomica: solo un consumidor puede establecer la clave, por lo que consumidores concurrentes procesando el mismo mensaje no procederan ambos.

El TTL en la clave de deduplicacion evita que el almacen crezca indefinidamente. Tras expirar el TTL, el mismo ID de mensaje podria procesarse de nuevo. Elige un TTL mayor que tu ventana maxima de reentrega (tipicamente 24 horas para SQS, o el periodo de retencion de la cola).

Para que la deduplicacion funcione, cada mensaje debe llevar un identificador unico. Puede ser un hash de contenido (para deduplicacion basada en payload) o un ID asignado por el productor (para deduplicacion basada en identidad).

## Variantes

| Variante | Almacen | Caso de Uso | Compromiso |
|----------|---------|-------------|------------|
| **Redis SET NX** | Redis | Rapido, compartido entre consumidores | Dependencia externa, expiracion por TTL |
| **Restriccion Unica DB** | SQL DB | Durable, transaccional | Mas lento, anade carga a DB |
| **Hash de Contenido** | Cualquier almacen | Dedup por contenido de payload | Mismo payload siempre se dedup, incluso si diferente intencion |
| **Nativo del Broker** | SQS FIFO | Dedup integrado | Solo colas FIFO, throughput limitado |
| **Set en Memoria** | Memoria del proceso | Consumidor unico, rapido | Se pierde al reiniciar, no compartido entre instancias |

## Qué Funciona

- Usa check-and-set atomico (Redis `SET NX EX`) para evitar race conditions entre consumidores concurrentes
- Establece TTL mayor que la ventana de reentrega del broker
- Usa hashes de contenido cuando los mensajes carecen de IDs explicitos
- Haz consumidores idempotentes como segunda capa de defensa: incluso si dedup falla, procesar dos veces no debe causar dano
- Registra duplicados saltados para debugging y monitoreo
- Usa colas FIFO con deduplicacion basada en contenido cuando el broker lo soporta (SQS FIFO)

## Errores Comunes

- **Check-then-set sin atomicidad**: Dos consumidores verifican simultaneamente, ambos ven que no hay clave, ambos procesan. Siempre usa `SET NX` atomico.
- **TTL demasiado corto**: Si el TTL expira antes de que el broker deje de reentregar, los duplicados pasan. Establece TTL al menos 2x la ventana de reentrega.
- **Usar memoria del proceso para dedup**: Se pierde al reiniciar, no se comparte entre instancias. Usa un almacen externo.
- **No manejar fallos del almacen de dedup**: Si Redis cae, dedup falla. Decide si procesar (riesgo de duplicados) o rechazar (perder mensajes).
- **Clave de dedup basada en campos mutables**: Si la clave incluye campos que cambian, el mismo mensaje logico obtiene claves diferentes y se procesa dos veces.

## Preguntas Frecuentes

### ¿La deduplicación es lo mismo que idempotencia?

No. La deduplicacion previene que un mensaje se procese dos veces. La idempotencia significa que procesar un mensaje dos veces tiene el mismo efecto que una vez. Ambas son necesarias: deduplicacion como primera linea, idempotencia como red de seguridad.

### ¿Debería usar hash de contenido o IDs asignados por el productor?

IDs asignados por el productor son mejores cuando el mismo mensaje logico siempre debe dedup. El hash de contenido dedup payloads identicos, lo cual puede ser incorrecto si el mismo payload se envia para operaciones logicas diferentes.

### ¿Qué pasa si Redis se cae?

Tu consumidor no puede verificar duplicados. Opciones: (1) fallar rapido y reintentar despues, (2) procesar de todos modos y confiar en idempotencia, (3) usar un almacen de respaldo. La mayoria elige opcion 2 con consumidores idempotentes.

### ¿Kafka soporta deduplicación nativamente?

Kafka soporta productores idempotentes (previene mensajes duplicados a nivel productor) y transacciones (semantica exactly-once dentro de Kafka). Para exactly-once entre sistemas, sigue necesitando deduplicacion del lado del consumidor.
