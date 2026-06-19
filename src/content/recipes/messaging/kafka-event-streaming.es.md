---
contentType: recipes
slug: kafka-event-streaming
title: "Event Streaming con Apache Kafka y Node.js"
description: "Construye sistemas event-driven escalables usando Apache Kafka con producers, consumers, consumer groups y semantica exactly-once para messaging asincrono confiable"
metaDescription: "Construye sistemas event-driven con Apache Kafka. Implementa producers, consumers, consumer groups y semantica exactly-once para messaging asincrono confiable."
difficulty: intermediate
topics:
  - messaging
  - devops
tags:
  - event-driven
  - messaging
  - microservices
relatedResources:
  - /recipes/devops/docker-compose-local-dev
  - /patterns/design/event-driven-architecture
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye sistemas event-driven con Apache Kafka. Implementa producers, consumers, consumer groups y semantica exactly-once para messaging asincrono confiable."
  keywords:
    - apache kafka
    - event streaming
    - message broker
    - consumer groups
    - exactly once
---

# Event Streaming con Apache Kafka y Node.js

Construye sistemas event-driven resilientes y escalables usando Apache Kafka. Esta recipe cubre configuracion de producer, consumer groups con auto-rebalancing, manejo de offsets y semantica exactly-once para comunicacion asincrona confiable entre microservicios.

## Cuando Usar Esto

- Los servicios necesitan comunicarse asincronamente sin acoplamiento fuerte
- El historial de eventos debe ser replayable para debugging o onboarding de nuevos consumers
- El procesamiento de mensajes de alto throughput requiere scaling horizontal de consumers

## Solucion

### 1. Kafka Producer

```typescript
// kafka/producer.ts
import { Kafka, Partitioners } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka-1:9092', 'kafka-2:9092'],
});

const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
  retry: {
    retries: 5,
    initialRetryTime: 300,
  },
});

await producer.connect();

async function publishOrderCreated(order: unknown): Promise<void> {
  await producer.send({
    topic: 'orders.created',
    messages: [
      {
        key: order.userId,
        value: JSON.stringify(order),
        headers: {
          'content-type': 'application/json',
          'trace-id': generateTraceId(),
        },
      },
    ],
  });
}
```

### 2. Consumer con Consumer Group

```typescript
// kafka/consumer.ts
const consumer = kafka.consumer({
  groupId: 'notification-service',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

await consumer.connect();
await consumer.subscribe({ topic: 'orders.created', fromBeginning: false });

await consumer.run({
  autoCommit: true,
  autoCommitInterval: 5000,
  eachMessage: async ({ topic, partition, message }) => {
    const order = JSON.parse(message.value!.toString());
    console.log(`Processing order from partition ${partition}:`, order.id);

    try {
      await sendEmailNotification(order);
    } catch (error) {
      // Dead letter handling
      await publishToDeadLetter(topic, message, error);
    }
  },
});
```

### 3. Exactly-Once Processing

```typescript
// kafka/exactly-once.ts
const producer = kafka.producer({
  transactionalId: 'order-processor',
  maxInFlightRequests: 1,
  idempotent: true,
});

await producer.connect();

async function processOrderWithIdempotency(orderId: string): Promise<void> {
  const transaction = await producer.transaction();

  try {
    // Procesar orden
    const result = await processPayment(orderId);

    // Enviar resultado
    await transaction.send({
      topic: 'orders.completed',
      messages: [{ key: orderId, value: JSON.stringify(result) }],
    });

    // Commit offsets y mensajes atomicamente
    await transaction.commit();
  } catch (error) {
    await transaction.abort();
    throw error;
  }
}
```

### 4. Partitioner Custom para Ordering

```typescript
// kafka/partitioner.ts
function userIdPartitioner(userId: string, numPartitions: number): number {
  // Asegura que todos los eventos de un usuario vayan a la misma particion
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % numPartitions;
}

await producer.send({
  topic: 'user.events',
  messages: [
    {
      key: userId,
      value: JSON.stringify(event),
      partition: userIdPartitioner(userId, 12),
    },
  ],
});
```

### 5. Docker Compose Setup

```yaml
# docker-compose.kafka.yml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

## Como Funciona

- **Producers** publican mensajes a topics particionados entre brokers
- **Consumer groups** distribuyen particiones entre instancias para procesamiento paralelo
- **Offsets** trackean progreso del consumer; auto-commit persiste posicion periodicamente
- **Exactly-once** usa transacciones para commitear offsets y mensajes de salida atomicamente

## Consideraciones de Produccion

- Corre al menos 3 brokers de Kafka con replication factor 3 para tolerancia a fallos
- Monitorea consumer lag con herramientas como Kafka Lag Exporter
- Usa schema registry (Confluent) para enforcear schemas Avro/Protobuf en topics

## Errores Comunes

- No manejar rebalances de consumer, causando procesamiento duplicado
- Usar auto-commit con procesos de larga duracion que pueden fallar mid-batch
- Crear demasiadas particiones por topic, incrementando overhead de coordinacion

## FAQ

**P: En que se diferencia de RabbitMQ?**
R: Kafka es un log distribuido optimizado para alto throughput y replay. RabbitMQ es un message broker de proposito general con routing complejo y menor latencia.

**P: Cuando deberia usar un schema registry?**
R: Cuando multiples equipos producen y consumen de topics compartidos, enforcear schemas previene mismatches de serializacion.
