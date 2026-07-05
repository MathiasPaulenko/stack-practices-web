---
contentType: patterns
slug: message-queue-load-leveling-pattern
title: "Patrón Message Queue Load Leveling"
description: "Suavizar picos de trafico colocando una cola entre el productor y el consumidor. El productor escribe mensajes a cualquier ritmo; el consumidor los procesa a un ritmo constante."
metaDescription: "Suavizar picos de trafico con una cola entre productor y consumidor. Los productores escriben a cualquier ritmo; los consumidores procesan a ritmo controlado."
difficulty: intermediate
topics:
  - messaging
  - architecture
tags:
  - load-leveling
  - patron
  - patron-diseno
  - message-queue
  - traffic-smoothing
  - async-processing
  - backpressure
relatedResources:
  - /patterns/design/priority-queue-pattern
  - /patterns/design/publish-subscribe-pattern
  - /patterns/design/dead-letter-channel-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Suavizar picos de trafico con una cola entre productor y consumidor. Los productores escriben a cualquier ritmo; los consumidores procesan a ritmo controlado."
  keywords:
    - message queue load leveling
    - cola suavizado trafico
    - patron async processing
    - patron diseno
---

## Descripción General

Cuando un servicio recibe trafico irregular, puede saturar sistemas descendentes que no estan disenados para picos. Una base de datos puede manejar 50 consultas por segundo de forma constante pero fallar a 500 consultas por segundo en un pico. El patron Message Queue Load Leveling coloca una cola entre el productor y el consumidor para que el productor escriba mensajes a cualquier ritmo mientras el consumidor los procesa a un ritmo controlado y constante.

## Cuándo Usar

- El trafico hacia un sistema descendente es irregular y el sistema no maneja picos
- Necesitas desacoplar la tasa de peticiones de la tasa de procesamiento
- Las tareas no son sensibles al tiempo (los usuarios no necesitan respuestas inmediatas)
- Quieres escalar consumidores independientemente de los productores

## Solución

### Python (Celery + Redis)

```python
from celery import Celery
import time

app = Celery("tasks", broker="redis://localhost:6379", backend="redis://localhost:6379")

# El consumidor procesa una tarea a la vez a su propio ritmo
@app.task(bind=True, max_retries=3)
def process_order(self, order_id):
    try:
        # Simular procesamiento lento (escrituras DB, llamadas API)
        time.sleep(2)
        print(f"Processed order {order_id}")
        return {"status": "done", "order_id": order_id}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=5)

# El productor encola a cualquier ritmo
def submit_orders(order_ids):
    for order_id in order_ids:
        process_order.delay(order_id)
    print(f"Enqueued {len(order_ids)} orders")

# Pico: 1000 ordenes enviadas al instante
# El consumidor las procesa 1 a la vez cada 2 segundos
submit_orders(range(1000))
```

### JavaScript (BullMQ + Redis)

```javascript
import { Queue, Worker } from "bullmq";

const orderQueue = new Queue("orders", {
  connection: { host: "localhost", port: 6379 },
});

// Productor: encolar a cualquier ritmo
async function submitOrders(orderIds) {
  const jobs = orderIds.map((id) => ({
    name: "process-order",
    data: { orderId: id },
  }));
  await orderQueue.addBulk(jobs);
  console.log(`Enqueued ${orderIds.length} orders`);
}

// Consumidor: procesar a ritmo controlado
const worker = new Worker(
  "orders",
  async (job) => {
    // Simular procesamiento lento
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(`Processed order ${job.data.orderId}`);
    return { status: "done", orderId: job.data.orderId };
  },
  {
    connection: { host: "localhost", port: 6379 },
    concurrency: 1, // Procesar una a la vez
    limiter: { max: 1, duration: 2000 }, // Max 1 job cada 2 segundos
  }
);

// Pico: 1000 ordenes enviadas al instante
await submitOrders(Array.from({ length: 1000 }, (_, i) => i));
```

### Java (RabbitMQ + Spring AMQP)

```java
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class OrderProcessor {

    private final RabbitTemplate rabbitTemplate;

    public OrderProcessor(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    // Productor: enviar a cualquier ritmo
    public void submitOrders(List<Integer> orderIds) {
        for (Integer orderId : orderIds) {
            rabbitTemplate.convertAndSend("orders", "order." + orderId, orderId);
        }
        System.out.println("Enqueued " + orderIds.size() + " orders");
    }

    // Consumidor: procesar una a la vez
    @RabbitListener(queues = "orders", concurrency = "1")
    public void processOrder(Integer orderId) {
        try {
            Thread.sleep(2000); // Simular procesamiento lento
            System.out.println("Processed order " + orderId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

## Explicación

La cola actua como buffer entre productor y consumidor. El productor empuja mensajes a la cola tan rapido como puede. El consumidor extrae mensajes a un ritmo que puede manejar. Si el productor envia 1000 mensajes en un segundo pero el consumidor procesa 1 cada 2 segundos, la cola crece a 1000 mensajes y se vacia lentamente en 2000 segundos.

Esto protege al sistema descendente de saturarse. La contrapartida es latencia: los mensajes esperan en la cola hasta que el consumidor puede procesarlos. Para cargas sensibles al tiempo, aumenta la concurrencia del consumidor o usa el patron Priority Queue.

## Variantes

| Variante | Tipo de Cola | Caso de Uso | Compromiso |
|----------|-------------|-------------|------------|
| **Consumidor Unico** | Cola FIFO | Orden estricto, simple | Throughput lento |
| **Multiples Consumidores** | Cola FIFO | Mayor throughput | Sin garantia de orden |
| **Cola de Prioridad** | Cola prioritaria | Algunos mensajes son urgentes | Complejidad en logica de prioridad |
| **Retardo Programado** | Cola con delay | Procesar en momentos especificos | Los mensajes esperan hasta el horario |
| **Procesamiento por Lotes** | Consumidor batch | Agrupar mensajes para eficiencia | Mayor latencia por mensaje |

## Qué Funciona

- Dimensiona la cola segun el volumen de pico esperado y la tasa de procesamiento del consumidor
- Monitorea la profundidad de cola y alerta cuando crece mas alla de un umbral
- Escala consumidores horizontalmente cuando la profundidad es consistentemente alta
- Usa dead-letter queues para mensajes que fallan tras maximos reintentos
- Establece visibility timeouts para evitar doble procesamiento si un consumidor cae
- Usa consumidores idempotentes para manejar entregas duplicadas de forma segura

## Errores Comunes

- **Sin monitoreo de profundidad de cola**: Una cola creciente significa que los consumidores no dan abasto. Sin monitoreo, te enteras cuando la cola se queda sin almacenamiento.
- **Consumidor muy lento para trafico sostenido**: Load leveling maneja picos, no sobrecarga sostenida. Si la tasa promedio de produccion excede la de consumo, la cola crece infinitamente.
- **No manejar mensajes venenosos**: Un mensaje que siempre falla bloquea al consumidor. Usa una dead-letter queue despues de N reintentos.
- **Productor sincrono esperando al consumidor**: Derrota el proposito. El productor debe fire-and-forget.
- **Ignorar el orden de mensajes**: Si el orden importa, se necesita un consumidor unico o estrategia de particion. Multiples consumidores rompen el orden.

## Preguntas Frecuentes

### ¿En qué se diferencia del patrón Producer-Consumer?

Load Leveling se centra en suavizar picos de trafico mediante buffer en cola. Producer-Consumer es un patron general de concurrencia para dividir trabajo. Load Leveling es una aplicacion especifica con enfasis en desacoplamiento de tasas.

### ¿Qué pasa si la cola crece demasiado?

Necesitas escalar consumidores, shed load (descartar mensajes de baja prioridad) o implementar backpressure para ralentizar al productor. Monitorea la profundidad y configura alertas.

### ¿Debería usar un servicio de cola administrado o auto-alojado?

Servicios administrados (SQS, Azure Service Bus, Cloud Pub/Sub) manejan escalado, durabilidad y monitoreo. Auto-alojado (RabbitMQ, Redis) da mas control pero requiere ops. Para la mayoria, administrado es la opcion correcta.

### ¿Puedo usar esto con funciones serverless?

Si. SQS dispara Lambda, que actua como consumidor. Lambda escala automaticamente segun la profundidad de cola, pero puedes controlar la concurrencia para proteger sistemas descendentes.
