---
contentType: recipes
slug: rabbitmq-task-queue
title: "Task Queues y RPC con RabbitMQ y AMQP"
description: "Distribuí tareas de background e implementá patrones request-reply con RabbitMQ usando durable queues, dead-letter exchanges y prefetch para concurrencia controlada."
metaDescription: "Implementá task queues y RPC con RabbitMQ. Usá durable queues, dead-letter exchanges y prefetch para distribución confiable de tareas y concurrencia controlada."
difficulty: intermediate
topics:
  - messaging
tags:
  - messaging
  - microservices
  - rabbitmq
  - amqp
  - task-queue
  - rpc
  - dead-letter
relatedResources:
  - /recipes/background-jobs
  - /recipes/dead-letter-queue
  - /recipes/message-idempotency
  - /recipes/event-driven-architecture
  - /recipes/retry-backoff
  - /guides/message-queue-guide
lastUpdated: "2026-08-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Implementá task queues y RPC con RabbitMQ. Usá durable queues, dead-letter exchanges y prefetch para distribución confiable de tareas y concurrencia controlada."
  keywords:
    - rabbitmq
    - amqp
    - task queue
    - dead letter
    - rpc
    - messaging
---

## Visión General

RabbitMQ es una opción sólida para distribuir trabajo de background y llamar
servicios de forma síncrona sobre AMQP. Esta receta cubre cómo armar una task
queue durable, reintentar mensajes fallidos, enrutar mensajes
problemáticos a una dead-letter queue y usar el patrón request-reply para RPC.

## Cuándo Usar

- Sacá el trabajo lento, como procesamiento de imágenes o envío de emails, fuera
  de la request principal para que no bloquee. Consultá
  [Background Jobs](/recipes/background-jobs/) para patrones relacionados.
- Reintentá las tareas fallidas unas pocas veces antes de apartalas para
  inspección. Consultá [Retry Backoff](/recipes/retry-backoff/)
  para estrategias de reintento.
- Necesitás comunicación request-reply que se sienta síncrona pero evite el
  overhead de HTTP. Para alternativas HTTP, consultá [Llamar REST API](/recipes/call-rest-api/).

## Solución

### 1. Producer con durable queue y DLX

```typescript
// rabbitmq/producer.ts
import * as amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

// Dead-letter exchange para mensajes fallidos
await channel.assertExchange('dlx', 'direct');
await channel.assertQueue('email.tasks.dlq', { durable: true });
await channel.bindQueue('email.tasks.dlq', 'dlx', 'email.tasks');

// Durable queue con política de dead-letter
await channel.assertQueue('email.tasks', {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'dlx',
    'x-dead-letter-routing-key': 'email.tasks',
  },
});

async function sendEmailTask(email: unknown): Promise<void> {
  channel.sendToQueue('email.tasks', Buffer.from(JSON.stringify(email)), {
    persistent: true,
    headers: { 'x-attempt': 1 },
  });
}
```

### 2. Worker con prefetch y reintento

```typescript
// rabbitmq/worker.ts
import * as amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

await channel.prefetch(5); // Procesa hasta 5 mensajes concurrentes por worker

await channel.consume('email.tasks', async (msg) => {
  if (!msg) return;

  const email = JSON.parse(msg.content.toString());
  const attempt = msg.properties.headers?.['x-attempt'] || 1;

  try {
    await sendEmail(email);
    channel.ack(msg);
  } catch (error) {
    if (attempt >= 3) {
      // Después de tres intentos, descarta el mensaje; el DLX lo enruta al DLQ
      channel.nack(msg, false, false);
    } else {
      // Rechazá el mensaje original y republicá con el intento incrementado
      channel.nack(msg, false, false);
      channel.sendToQueue('email.tasks', msg.content, {
        persistent: true,
        headers: { 'x-attempt': attempt + 1 },
      });
    }
  }
});

async function sendEmail(email: unknown): Promise<void> {
  // Tu lógica de envío de email aquí
  console.log('Sending email:', email);
}
```

### 3. Patrón RPC request-reply

```typescript
// rabbitmq/rpc-client.ts
import * as amqp from 'amqplib';

async function rpcCall(queue: string, payload: unknown): Promise<unknown> {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

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

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// rabbitmq/rpc-server.ts
import * as amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

await channel.assertQueue('calc.multiply');
await channel.consume('calc.multiply', (msg) => {
  if (!msg) return;

  const { a, b } = JSON.parse(msg.content.toString());
  const result = a * b;

  channel.sendToQueue(
    msg.properties.replyTo,
    Buffer.from(JSON.stringify({ result })),
    { correlationId: msg.properties.correlationId },
  );

  channel.ack(msg);
});
```

### 4. Docker Compose setup

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

## Explicación

- **Exchanges** eligen qué queues reciben un mensaje a partir de reglas de binding.
  Un exchange `direct` entrega un mensaje a cada queue cuya binding key coincida
  con la routing key del mensaje.
- Si tanto las queues como los mensajes son durables, tus mensajes sobreviven
  un restart del broker. Sin durabilidad, el broker pierde todo al reiniciarse.
- **Prefetch** limita cuántos mensajes no confirmados puede tener cada consumer a
  la vez, así un consumer rápido no puede acaparar trabajo y dejar sin recursos a
  otros.
- **Dead-letter exchanges (DLX)** capturan mensajes que se rechazan sin requeue,
  que expiran o que superan el máximo de entregas. Eso te da un lugar para mirar
  fallos sin perder el mensaje.
- **RPC sobre AMQP** usa una reply queue temporal y un `correlationId`. El client
  escucha en la reply queue y el server repite el `correlationId` en la
  respuesta.

## Variantes

| Enfoque | Ideal para | Contra |
| --- | --- | --- |
| Direct exchange | Enrutamiento exacto a queue | Sin pattern matching |
| Topic exchange | Enrutamiento por patrones (`orders.*.created`) | Un poco más de overhead |
| Fanout exchange | Broadcast a muchos consumers | Ignora routing keys |
| Work queue con prefetch | Balanceo de carga entre workers | Requiere ack manual |
| RPC con reply queue | Llamadas síncronas a servicios | Agrega latencia y complejidad |

### Equivalente en Python con `pika`

```python
import pika
import json

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

channel.exchange_declare(exchange='dlx', exchange_type='direct')
channel.queue_declare(queue='email.tasks.dlq', durable=True)
channel.queue_bind(queue='email.tasks.dlq', exchange='dlx', routing_key='email.tasks')

channel.queue_declare(
    queue='email.tasks',
    durable=True,
    arguments={
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'email.tasks',
    },
)

def send_email_task(email):
    channel.basic_publish(
        exchange='',
        routing_key='email.tasks',
        body=json.dumps(email),
        properties=pika.BasicProperties(
            delivery_mode=2,  # persistent
            headers={'x-attempt': 1},
        ),
    )

send_email_task({'to': 'user@example.com', 'subject': 'Hello'})
connection.close()
```

## Mejores Prácticas

- Confirmá los mensajes manualmente, porque si el consumer se cae a mitad de
  procesamiento el auto-ack puede perder trabajo.
- Seteá el `prefetch` según cuánto dura cada tarea y cuántos consumers tenés,
  empezando con 5–10 y ajustando desde ahí.
- Declará queues y exchanges como `durable` para que sobrevivan un restart del
  broker.
- Configurá un DLX en cualquier queue que importe, dale un DLQ dedicado y fijá un
  límite de reintentos — tres intentos, por ejemplo, antes de enrutar el
  mensaje.
- Mantené un ojo en queue depth, consumer lag y crecimiento del DLQ, porque un
  pico de depth suele significar que un consumer está caído o lento.

## Errores Comunes

- Olvidar confirmar un mensaje del todo, lo que deja mensajes no confirmados
  acumulándose en memoria hasta agotar el broker.
- Depender del auto-ack para tareas largas o fallibles es arriesgado; cuando el
  worker se cae, el mensaje desaparece.
- Crear reply queues exclusivas en RPC sin cerrar la conexión, lo que deja queues
  huérfanas en el broker.
- Dejar un mensaje fallido en el ciclo de reintentos para siempre en vez de
  limitar los reintentos y enviar los problemáticos a un DLQ.
- Publicar en una durable queue sin activar `persistent: true`, así el mensaje se
  pierde cuando el broker reinicia.

## Preguntas Frecuentes

### ¿En qué se diferencia de Kafka?

RabbitMQ actúa como broker de mensajes con enrutamiento flexible y latencia baja
por mensaje. Kafka, en cambio, funciona como un log de eventos pensado para alto
throughput y replay. Kafka no soporta request-reply de forma nativa y usa
distintas semánticas de entrega.

### ¿Debería usar un direct o topic exchange?

Usá un exchange `direct` cuando la queue o routing key son exactas. Usá un
exchange `topic` cuando necesitás pattern matching, por ejemplo que
`orders.us.created` y `orders.eu.created` coincidan con `orders.*.created`.

### ¿Esta solución está lista para producción?

Estos patrones se usan comúnmente en producción, pero igual vas a querer
monitoreo, recuperación de conexiones, autenticación y TLS
para que coincida con tu entorno.

### ¿Cuáles son las características de rendimiento?

Una work queue típica puede mover miles o decenas de miles de mensajes por
segundo por nodo en RabbitMQ. El throughput baja con lógica de enrutamiento
compleja o mensajes grandes. Para escalar, agregás nodos o consumers.

### ¿Cómo depuro problemas con este enfoque?

La UI de management en el puerto 15672 te da queue depth, cantidad de consumers
y message rates. Revisá los logs del consumer, confirmá que la
conexión esté abierta y asegurate de que tu DLQ no se esté llenando.
