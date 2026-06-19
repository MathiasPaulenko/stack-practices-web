---
contentType: recipes
slug: dead-letter-queue
title: "Dead Letter Queues"
description: "Maneja mensajes fallidos gracefulmente con dead letter queues, políticas de retry y detección de poison pills en arquitecturas message-driven."
metaDescription: "Dead letter queues: detección de poison pills, límites de retry, replay de mensajes y estrategias de recuperación para sistemas async."
difficulty: intermediate
topics:
  - messaging
tags:
  - dead-letter-queue
  - messaging
  - resilience
  - error-handling
relatedResources:
  - /recipes/event-driven-microservices
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /docs/api-error-response-template
  - /patterns/bulkhead-pattern
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Dead letter queues: detección de poison pills, límites de retry, replay de mensajes y estrategias de recuperación para sistemas async."
  keywords:
    - dead-letter-queue
    - messaging
    - resilience
    - error-handling
---
## Visión General

Las dead letter queues (DLQs) capturan mensajes que fallan el procesamiento después de intentos repetidos en sistemas [message-driven](/guides/event-driven-architecture-guide). Sin ellas, los mensajes fallidos bloquearían la cola o se perderían por completo. Un sistema DLQ bien diseñado distingue entre poison pills (mensajes permanentemente malos) y fallas transitorias, habilitando a operadores a replayear, inspeccionar o descartar mensajes problemáticos sin impactar el flujo principal de procesamiento.

## Cuándo Usar

Usa este recurso cuando:
- Los consumers de mensajes encuentran errores irrecuperables (payloads malformados, referencias faltantes)
- Necesitas prevenir que un mensaje malo bloquee una partición de cola completa
- Los equipos de operaciones requieren visibilidad en mensajes fallidos para intervención manual
- Compliance requiere audit trails de todos los mensajes procesados y fallidos. Usa una [política de retención de datos](/docs/data-retention-policy-template).

## Solución

### SQS DLQ Configuration (AWS CLI)

```bash
# Crear cola principal y DLQ
aws sqs create-queue --queue-name orders-queue
aws sqs create-queue --queue-name orders-dlq

# Obtener URLs de colas
QUEUE_URL=$(aws sqs get-queue-url --queue-name orders-queue --query 'QueueUrl' --output text)
DLQ_URL=$(aws sqs get-queue-url --queue-name orders-dlq --query 'QueueUrl' --output text)
DLQ_ARN=$(aws sqs get-queue-attributes --queue-url $DLQ_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

# Setear redrive policy: enviar a DLQ después de 3 receives fallidos
aws sqs set-queue-attributes \
  --queue-url $QUEUE_URL \
  --attributes '{
    "RedrivePolicy": "{\\"deadLetterTargetArn\\":\\"'$DLQ_ARN'\\",\\"maxReceiveCount\\":3}"
  }'
```

### RabbitMQ Dead Letter Exchange (Python + pika)

```python
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# DLX y DLQ
channel.exchange_declare(exchange='orders.dlx', exchange_type='direct')
channel.queue_declare(queue='orders-dlq', durable=True)
channel.queue_bind(queue='orders-dlq', exchange='orders.dlx', routing_key='failed')

# Cola principal con TTL y dead-letter routing
args = {
    'x-dead-letter-exchange': 'orders.dlx',
    'x-dead-letter-routing-key': 'failed',
    'x-message-ttl': 300000  # 5 minutos
}
channel.queue_declare(queue='orders', durable=True, arguments=args)

# Rechazar un mensaje para enviar a DLQ
channel.basic_reject(delivery_tag=method.delivery_tag, requeue=False)
```

### Kafka Dead Letter Topic (Node.js + KafkaJS)

```javascript
const { Kafka } = require('kafkajs');
const kafka = new Kafka({ brokers: ['localhost:9092'] });

const consumer = kafka.consumer({ groupId: 'order-processors' });

await consumer.connect();
await consumer.subscribe({ topic: 'orders', fromBeginning: false });

const producer = kafka.producer();
await producer.connect();

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      await processOrder(JSON.parse(message.value));
    } catch (err) {
      // Enviar a DLQ con metadata de error
      await producer.send({
        topic: 'orders-dlq',
        messages: [{
          key: message.key,
          value: message.value,
          headers: {
            'error.type': err.name,
            'error.message': err.message,
            'original.topic': topic,
            'original.partition': String(partition),
            'original.offset': String(message.offset),
            'retry.count': '3'
          }
        }]
      });
    }
  }
});
```

## Explicación

**Condiciones de trigger de DLQ**:

| Condición | Cuándo hacer DLQ | Acción |
|-----------|------------------|--------|
| Max retries excedido | Después de N intentos fallidos | Mover a DLQ |
| Mensaje no parseable | JSON inválido, schema mismatch | Mover inmediatamente |
| Dependencia faltante | Registro referenciado no existe | Reintentar, luego DLQ |
| Violación de business rule | Orden para producto inexistente | Mover inmediatamente |

**Monitoreo de DLQ**:
- **Alerting de profundidad**: DLQ > 10 mensajes dispara PagerDuty
- **Alerting de edad**: Mensaje en DLQ > 24 horas necesita investigación
- **Tooling de replay**: UI de admin para reprocesar o purgar mensajes de DLQ
- **Correlación**: Vincular mensaje de DLQ al trace ID original. Consulta [distributed tracing](/recipes/distributed-tracing).

## Variantes

| Broker | Mecanismo DLQ | Configuración |
|--------|---------------|---------------|
| AWS SQS | Redrive policy | maxReceiveCount + target ARN |
| RabbitMQ | Dead letter exchange | x-dead-letter-exchange |
| Kafka | Consumer-managed | Topic separado + lógica de producer |
| Azure SB | Forwarding | maxDeliveryCount + forwardTo |
| Google Pub/Sub | Dead letter topic | deadLetterPolicy.maxDeliveryAttempts |

## Mejores Prácticas

- **Setea counts de retry razonables**: 3-5 intentos balancean tiempo de recuperación contra presión de cola
- **Incluye contexto completo en DLQ**: Headers originales, retry count, tipo de error y stack trace
- **Separa DLQs por severidad**: Errores de validación vs. fallas de infraestructura necesitan manejo diferente
- **Monitorea profundidad de DLQ como métrica**: Es un indicador leading de salud del sistema. Consulta [recolección de métricas](/recipes/metrics-collection).
- **Automatiza replay con cautela**: Replay después de arreglar el bug; replay ciego amplifica fallas

## Errores Comunes

1. **Sin DLQ**: Mensajes fallidos desaparecen silenciosamente o bloquean consumers para siempre
2. **Loops infinitos de retry**: Requeuear sin un count máximo crea procesamiento perpetuo. Usa [retry con backoff exponencial](/recipes/retry-backoff).
3. **Ignorar mensajes de DLQ**: La DLQ se convierte en un basurero que nadie monitorea
4. **Sin razón de dead-letter**: Operadores no pueden distinguir "bad JSON" de "database down"
5. **DLQ compartida para todos los topics**: Un poison pill del topic A no pertenece con fallas del topic B

## Preguntas Frecuentes

**P: ¿Debería replayear mensajes de DLQ automáticamente?**
R: Solo después de identificar y arreglar la causa raíz. El replay ciego desperdicia recursos y puede re-disparar el mismo error.

**P: ¿Cuánto tiempo debería mantener mensajes de DLQ?**
R: Más que tu SLA de respuesta a incidentes. 7-14 días es típico; archiva a storage barato después.

**P: ¿Cuál es la diferencia entre una DLQ y una cola de retry?**
R: Las [colas de retry](/recipes/retry-backoff) retienen mensajes para reprocesamiento posterior. Las DLQs retienen mensajes que agotaron todos los retries.
