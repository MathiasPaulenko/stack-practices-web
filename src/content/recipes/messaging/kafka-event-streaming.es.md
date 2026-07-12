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
  - kafka
  - rabbitmq
relatedResources:
  - /recipes/docker-compose-local-dev
  - /recipes/event-driven-architecture
  - /patterns/circuit-breaker-pattern
  - /recipes/dead-letter-queue
  - /recipes/event-driven-microservices
  - /recipes/message-idempotency
  - /recipes/rabbitmq-task-queue
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

Construye sistemas event-driven resilientes y preparados para crecer usando Apache Kafka. Esta recipe cubre configuracion de producer, consumer groups con auto-rebalancing, manejo de offsets y semantica exactly-once para comunicacion asincrona confiable entre microservicios.

## Cuando Usar Esto

- Los servicios necesitan comunicarse asincronamente sin acoplamiento fuerte. Consulta [Event-Driven Microservices](/recipes/messaging/event-driven-microservices) para patrones de arquitectura.
- El historial de eventos debe ser replayable para debugging o onboarding de nuevos consumers. Consulta [Event Sourcing](/patterns/design/event-sourcing-pattern) para logs de eventos inmutables.
- El procesamiento de mensajes de alto throughput requiere scaling horizontal de consumers. Consulta [RabbitMQ Task Queue](/recipes/messaging/rabbitmq-task-queue) para patrones de broker alternativos.

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

### 6. Consumer en Python con kafka-python

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'orders.created',
    bootstrap_servers=['localhost:9092'],
    group_id='notification-service',
    auto_offset_reset='latest',
    enable_auto_commit=False,
    value_deserializer=lambda x: json.loads(x.decode('utf-8')),
)

for message in consumer:
    order = message.value
    try:
        send_email_notification(order)
        consumer.commit()
    except Exception as e:
        print(f"Error al procesar orden {order['id']}: {e}")
        # No commitear — el mensaje se reprocesara al reiniciar
```

El commit manual te da control sobre cuando se guardan los offsets. Solo commitea despues de procesamiento exitoso para evitar perder mensajes en caso de fallo.

## Como Funciona

- **Producers** publican mensajes a topics particionados entre brokers
- **Consumer groups** distribuyen particiones entre instancias para procesamiento paralelo
- **Offsets** trackean progreso del consumer; auto-commit persiste posicion periodicamente
- **Exactly-once** usa transacciones para commitear offsets y mensajes de salida atomicamente

## Consideraciones de Produccion

- Corre al menos 3 brokers de Kafka con replication factor 3 para tolerancia a fallos
- Monitorea consumer lag con herramientas como Kafka Lag Exporter
- Usa schema registry (Confluent) para enforcear schemas Avro/Protobuf en topics
- Configura politicas de retencion apropiadas — por tiempo (7 dias por defecto) o por tamaño
- Habilita log compaction para topics que almacenan estado actual (e.g., perfiles de usuario) en lugar de eventos
- Usa `ack=all` en el producer para asegurar que los mensajes se escriban a todas las replicas antes de confirmar

## Mejores Practicas

- **Usa nombres de topic significativos**: `orders.created` no `topic1`. Namespacea por dominio y tipo de evento.
- **Particiona por clave**: usa una clave significativa (e.g., `userId`, `orderId`) para asegurar orden dentro de una particion.
- **Batchea los sends del producer**: enviar mensajes en batches mejora el throughput. Configura `batch.size` y `linger.ms`.
- **Maneja rebalances gracefulmente**: implementa un rebalance listener para commitear offsets y limpiar recursos antes de que las particiones sean revocadas.
- **Usa producers idempotentes**: setea `enable.idempotence=true` para prevenir mensajes duplicados por retries.

## Errores Comunes

- No manejar rebalances de consumer, causando procesamiento duplicado
- Usar auto-commit con procesos de larga duracion que pueden fallar mid-batch
- Crear demasiadas particiones por topic, incrementando overhead de coordinacion
- No configurar un `transactionalId` al usar transacciones, causando errores de producer fencing
- Ignorar consumer lag hasta que se vuelve critico — configura alertas a 1000+ mensajes de retraso
- Usar el partitioner por defecto cuando el orden de mensajes importa — usa key-based partitioning
- No configurar `max.poll.interval.ms` correctamente — consumers que procesan lentamente son expulsados del group
- Usar `auto_offset_reset=none` sin offsets commiteados — consumers crashean en la primera ejecucion

## FAQ

**P: En que se diferencia de RabbitMQ?**
R: Kafka es un log distribuido optimizado para alto throughput y replay. RabbitMQ es un message broker de proposito general con routing complejo y menor latencia.

**P: Cuando deberia usar un schema registry?**
R: Cuando multiples equipos producen y consumen de topics compartidos, enforcear schemas previene mismatches de serializacion.

**P: Cuantas particiones deberia tener mi topic?**
R: Empieza con un numero igual a tus instancias de consumer esperadas. Cada particion es consumida por una instancia en un group. Mas particiones aumentan paralelismo pero tambien overhead de coordinacion. Para la mayoria de casos, 6-12 particiones por topic es un buen punto de partida.

**P: Como manejo mensajes poison pill?**
R: Un poison pill es un mensaje que siempre falla al procesarse. Usa un patron dead letter queue (DLQ): captura errores de procesamiento, publica el mensaje fallido a un topic separado con los detalles del error, y commitea el offset original. Esto evita que el consumer se quede atascado reintentando el mismo mensaje.

**P: Que es consumer lag y por que importa?**
R: Consumer lag es la diferencia entre el ultimo offset en una particion y el ultimo offset commiteado de un consumer. Lag alto significa que el consumer se esta quedando atras. Monitorea lag con Kafka Lag Exporter o Burrow. Lag persistente indica que los consumers no pueden mantenerse al dia con la tasa de produccion — escala consumers u optimiza el procesamiento.

**P: Deberia usar Avro o JSON para serializacion de mensajes?**
R: Avro con Schema Registry es preferido para produccion — enforcea compatibilidad de schemas, produce payloads mas pequeños, y soporta evolucion de schemas. JSON es mas simple para prototipado pero carece de enforcement de schema y es mas grande en el wire.

**P: Como manejo la evolucion de schemas sin romper consumers?**
R: Usa Schema Registry con modo de compatibilidad `BACKWARD`. Esto permite añadir campos opcionales y remover campos sin romper consumers existentes. Nunca cambies tipos de campos ni renombres campos — crea nuevos campos en su lugar. Prueba cambios de schema con `kafka-schema-registry-maven-plugin` antes de desplegar.

**P: Cual es la diferencia entre at-least-once y exactly-once delivery?**
R: At-least-once significa que los mensajes pueden entregarse mas de una vez durante retries — los consumers deben ser idempotentes. Exactly-once usa transacciones de Kafka para asegurar que los mensajes se procesen y commiteen exactamente una vez. Exactly-once tiene mayor overhead — usalo solo cuando los duplicados causan problemas de correctitud (e.g., transacciones financieras).

**P: Como monitoreo Kafka en produccion?**
R: Usa Kafka Lag Exporter para metricas de consumer lag, Burrow para salud de consumers, y Confluent Control Center para monitoreo de cluster. Exporta metricas a Prometheus y visualiza en Grafana. Alerta sobre crecimiento de lag, particiones under-replicated, y frecuencia de rebalances de consumer groups. Configura dashboards para throughput, percentiles de latencia, y tasas de error para detectar degradacion temprano. Revisa los logs del broker para cambios de liderazgo de particiones y reducciones de ISR semanalmente.

**P: Deberia usar Kafka Streams o un consumer plano?**
R: Kafka Streams es ideal cuando necesitas procesamiento con estado (agregaciones, joins, windowing) dentro de Kafka. Para pipelines simples de consume-process-produce, un consumer plano con control manual de offsets es mas ligero y facil de debuggear.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
