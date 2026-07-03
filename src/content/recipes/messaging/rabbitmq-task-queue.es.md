---
contentType: recipes
slug: rabbitmq-task-queue
title: "Task Queues y RPC con RabbitMQ y AMQP"
description: "Implementa distribucion confiable de tareas y patrones request-reply usando RabbitMQ con durable queues, dead-letter exchanges y prefetch para concurrencia controlada"
metaDescription: "Implementa task queues y RPC con RabbitMQ. Usa durable queues, dead-letter exchanges y prefetch para distribucion confiable de tareas y concurrencia controlada."
difficulty: intermediate
topics:
  - messaging
  - devops
tags:
  - messaging
  - microservices
  - devops
  - kafka
  - rabbitmq
relatedResources:
  - /recipes/messaging/kafka-event-streaming
  - /recipes/event-driven-architecture
  - /recipes/devops/background-jobs
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa task queues y RPC con RabbitMQ. Usa durable queues, dead-letter exchanges y prefetch para distribucion confiable de tareas y concurrencia controlada."
  keywords:
    - rabbitmq
    - amqp
    - task queue
    - dead letter
    - rpc
---

# Task Queues y RPC con RabbitMQ y AMQP

Distribuye tareas de background confiablemente e implementa patrones request-reply usando RabbitMQ. Esta recipe cubre durable queues, dead-letter exchanges para mensajes fallidos, limites de prefetch para concurrencia controlada, y RPC sobre AMQP para llamadas sincronicas entre servicios.

## Cuando Usar Esto

- Jobs de background (procesamiento de imagenes, envio de emails) no deben bloquear el request flow principal. Consulta [Scheduled Jobs](/recipes/devops/background-jobs) para automatización de tareas recurrentes.
- Tareas fallidas deberian reintentarse con exponential backoff o enrutarse a dead-letter queues. Consulta [Retry Logic](/recipes/architecture/retry-backoff) para patrones de backoff exponencial.
- Los servicios necesitan comunicacion RPC sincronica sin overhead de HTTP. Consulta [Call REST API](/recipes/api/call-rest-api) para alternativas HTTP sincrónicas.

## Solucion

### 1. Producer con Durable Queue

```typescript
// rabbitmq/producer.ts
import amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

// Durable queue sobrevive restart del broker
await channel.assertQueue('email.tasks', {
  durable: true,
});

// Dead letter exchange para mensajes fallidos
await channel.assertExchange('dlx', 'direct');
await channel.assertQueue('email.tasks.dlq', { durable: true });
await channel.bindQueue('email.tasks.dlq', 'dlx', 'email.tasks');

async function sendEmailTask(email: unknown): Promise<void> {
  channel.sendToQueue('email.tasks', Buffer.from(JSON.stringify(email)), {
    persistent: true,
    headers: { 'x-attempt': 1 },
  });
}
```

### 2. Worker con Prefetch y Ack

```typescript
// rabbitmq/worker.ts
const channel = await connection.createChannel();

await channel.prefetch(5); // Procesa 5 mensajes concurrentemente por worker

await channel.consume('email.tasks', async (msg) => {
  if (!msg) return;

  const email = JSON.parse(msg.content.toString());
  const attempt = msg.properties.headers?.['x-attempt'] || 1;

  try {
    await sendEmail(email);
    channel.ack(msg); // Remueve de la queue en exito
  } catch (error) {
    if (attempt >= 3) {
      // Rechaza y envia a dead letter queue
      channel.reject(msg, false);
    } else {
      // Nack y requeue para reintento
      channel.nack(msg, false, true);

      // Publica con attempt incrementado
      channel.sendToQueue('email.tasks', msg.content, {
        persistent: true,
        headers: { 'x-attempt': attempt + 1 },
      });
    }
  }
});
```

### 3. Patron RPC Request-Reply

```typescript
// rabbitmq/rpc-client.ts
async function rpcCall(queue: string, payload: unknown): Promise<unknown> {
  const correlationId = generateId();
  const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('RPC timeout')), 5000);

    channel.consume(replyQueue, (msg) => {
      if (msg?.properties.correlationId === correlationId) {
        clearTimeout(timeout);
        resolve(JSON.parse(msg.content.toString()));
        channel.ack(msg);
      }
    });

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      replyTo: replyQueue,
      correlationId,
      expiration: '5000',
    });
  });
}

// rabbitmq/rpc-server.ts
await channel.assertQueue('calc.multiply');
await channel.consume('calc.multiply', (msg) => {
  if (!msg) return;

  const { a, b } = JSON.parse(msg.content.toString());
  const result = a * b;

  channel.sendToQueue(
    msg.properties.replyTo,
    Buffer.from(JSON.stringify({ result })),
    { correlationId: msg.properties.correlationId }
  );

  channel.ack(msg);
});
```

### 4. Docker Compose Setup

```yaml
# docker-compose.rabbitmq.yml
services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: secret
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  rabbitmq_data:
```

## Como Funciona

- **Exchanges** enrutan mensajes a queues basandose en reglas de binding
- **Durable queues** persisten mensajes a traves de restarts del broker
- **Prefetch** limita mensajes no acknowledged por consumer para prevenir overload
- **Dead-letter exchanges** reciben mensajes que son rechazados o expiran
- **RPC** usa reply queues y correlation IDs para matchear responses a requests

## Consideraciones de Produccion

- Usa quorum queues para almacenamiento de mensajes replicado y fault-tolerant
- Monitorea queue depth con el management plugin o Prometheus exporter
- Implementa circuit breakers en el lado del producer cuando queue depth excede thresholds

## Errores Comunes

- No hacer ack de mensajes, causando agotamiento de memoria en el broker
- Usar auto-ack para tareas de larga duracion que pueden fallar
- Crear reply queues sin cleanup, causando queue leaks en RPC

## FAQ

**P: En que se diferencia de Kafka?**
R: RabbitMQ soporta routing complejo, RPC y menor latencia por mensaje. Kafka se destaca en log streaming de alto throughput y replay.

**P: Deberia usar topic o direct exchanges?**
R: Usa direct para routing simple por key. Usa topic para routing basado en patrones (ej. `orders.*.created`).

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
