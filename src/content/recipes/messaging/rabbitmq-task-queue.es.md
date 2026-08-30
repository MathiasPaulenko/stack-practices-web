---
contentType: recipes
slug: rabbitmq-task-queue
title: "Task Queues y RPC con RabbitMQ y AMQP"
description: "Distribuí tareas en segundo plano e implementá patrones request-reply con RabbitMQ usando durable queues, dead-letter exchanges y prefetch."
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
  - /recipes/dead-letter-queue
  - /recipes/message-idempotency
  - /recipes/rabbitmq-python-pika-consumer
  - /recipes/python-celery-task-queue
  - /recipes/event-driven-microservices
  - /guides/message-queue-guide
lastUpdated: "2026-08-30"
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

RabbitMQ es un broker de mensajes que usa AMQP, un
protocolo abierto con clientes en la mayoría de los lenguajes. Los equipos lo
usan cuando una request web hace demasiado trabajo: en lugar de hacer esperar al
usuario, le pasan la tarea a un worker mediante una queue. AMQP es un protocolo wire
que te permite controlar el enrutamiento, las garantías de entrega y la persistencia
directamente, así que los task queues y patrones request-reply (RPC) encajan mejor que
un HTTP polling simple.

Esta receta usa TypeScript con [`amqplib`](https://amqp-node.github.io/amqplib/) 0.10.x. Los mismos conceptos se
trasladan a clientes de Python, Go, Java o .NET, porque todos hablan el mismo
protocolo. Vas a configurar una task queue durable, agregar un dead-letter
exchange para mensajes problemáticos, limitar reintentos con prefetch e
implementar una llamada RPC con una reply queue temporal.

## Cuándo Usar

- Sacá el trabajo lento, como procesamiento de imágenes, envío de emails o
  generación de PDFs, del camino de la request. El publicador envía la tarea y
  sigue, mientras un worker la toma después. Consultá [Background
  Jobs](/recipes/background-jobs/) para patrones relacionados.
- Reintentá una tarea fallida unas pocas veces y luego enrutala a una
  dead-letter queue para inspeccionarla cuando se agoten los reintentos.
  Consultá [Retry Backoff](/recipes/retry-backoff/) para estrategias de
  reintento.
- Necesitás comunicación request-reply que se sienta síncrona pero evite el
  overhead de HTTP. El RPC sobre AMQP sirve cuando un servicio está detrás de un
  firewall o cuando ya usás RabbitMQ para eventos.
- Querés escalar workers horizontalmente: agregá más consumers a la misma queue
  y RabbitMQ distribuye los mensajes en round-robin.

Evitá RabbitMQ para:

- Streaming de logs de eventos de alto throughput donde importan el replay y la
  retención larga. Kafka suele encajar mejor ahí. Consultá [Event Streaming with
  Kafka](/recipes/kafka-event-streaming/).
- Transmitir actualizaciones en vivo a miles de clientes a la vez suele ser más simple con un
  broker pub-sub o WebSocket que con RabbitMQ.
- Cargas de batch pesadas que tardan minutos por mensaje sin acknowledgments,
  porque los mensajes no confirmados pueden agotar la memoria del broker.

## Solución

Estos ejemplos usan TypeScript y `amqplib` 0.10.x. El producer crea una durable
queue con política de dead-letter, el worker consume con prefetch y reintentos,
el client RPC devuelve una promesa y el server responde con el mismo
`correlationId`.

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

Tres primitivas impulsan el enrutamiento AMQP: exchanges, queues y
bindings. Un producer nunca envía directamente a una queue; envía a un exchange,
y el exchange reenvía el mensaje a las queues cuya binding key coincida con la
routing key. Esta receta usa un exchange `direct` más el exchange vacío por
defecto para `sendToQueue`; el exchange vacío enruta usando el nombre de la queue como routing
key.

```mermaid
flowchart LR
    P[Producer] -->|sendToQueue| E[Default exchange]
    E --> Q[queue email.tasks]
    Q --> C[Worker consumer]
    C -->|nack luego de 3 intentos| D[DLX direct]
    D --> DLQ[email.tasks.dlq]
```

La durabilidad se divide en dos niveles: la queue y el mensaje. Una queue durable se recrea después de un
restart del broker, pero eso solo no guarda los mensajes. Los mensajes también
necesitan `persistent: true` (modo de entrega 2) para que el broker los escriba
en disco. Si declarás una durable queue y enviás mensajes transient, la queue
sobrevive pero los mensajes desaparecen al reiniciar.

El `prefetch(n)` limita cuántos mensajes no confirmados puede tener cada consumer. Evita que
un consumer rápido se lleve las siguientes cincuenta tareas mientras otro lento
todavía procesa la primera. El valor correcto depende de la duración de la
tarea: para trabajo CPU-bound con workers rápidos, 5–10 es un punto de partida
razonable; para trabajo IO-bound que espera llamadas de red, podés subirlo, pero
nunca por encima de lo que un worker puede manejar sin ahogarse.

Un dead-letter exchange toma mensajes que el consumer no puede procesar y los enruta
al DLQ para inspección. Consultá [Dead Letter Queue](/recipes/dead-letter-queue/) para
el patrón completo. Un mensaje cae en el DLQ cuando se rechaza sin requeue, cuando
expira o cuando supera el `x-max-delivery-count` de la queue. Esto le da a los
operadores un lugar enfocado para inspeccionar fallos mientras la queue
principal sigue moviéndose. Emparejá el DLQ con una `x-dead-letter-routing-key` para poder
enrutar distintas queues a distintos DLQs si tu topología crece.

El ciclo de reintentos del worker funciona rechazando el mensaje original y
republicándolo con un header `x-attempt` incrementado. Republicar es simple, pero el mensaje
pierde su lugar original en la queue porque cae al final. Los reintentos sensibles al tiempo necesitan una delay queue con
`x-message-ttl` o un exchange de reintentos dedicado.

El RPC sobre AMQP usa una reply queue exclusiva y auto-delete. El client genera
un `correlationId`, envía la request con `replyTo` apuntando a esa queue y espera
una respuesta cuyo `correlationId` coincida. El server devuelve el mismo id al client. Como
AMQP es asíncrono, el client envuelve esto en una promesa con timeout. Siempre
cerrá la conexión o limpiá la reply queue cuando se dispare el timeout, porque
si no el broker acumula queues obsoletas.

## Variantes

Los exchanges y patrones de queue tienen distintas contraprestaciones, así que elegí el que
mejor se ajuste a tus necesidades de enrutamiento y presupuesto de latencia.

| Enfoque | Ideal para | Contra |
| --- | --- | --- |
| Direct exchange | Enrutamiento exacto a queue | Sin pattern matching |
| Topic exchange | Enrutamiento por patrones (`orders.*.created`) | Un poco más de overhead |
| Fanout exchange | Broadcast a muchos consumers | Ignora routing keys |
| Work queue con prefetch | Balanceo de carga entre workers | Requiere ack manual |
| RPC con reply queue | Llamadas síncronas a servicios | Agrega latencia y complejidad |

Si solo necesitás distribución de tareas punto a punto, un exchange `direct` o
el exchange por defecto con `sendToQueue` es suficiente. Cuando el mismo evento
debé llegar a múltiples consumers, un exchange `fanout` o `topic` es la mejor
opción.

### Equivalente en Python con `pika`

Los ejemplos de TypeScript usan `amqplib`, y la misma librería está disponible
para Node.js y navegadores mediante bundles. El ejemplo de abajo usa `pika` 1.3.x para su API
síncrona de [`BlockingConnection`](https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html).
Consultá nuestra receta [RabbitMQ consumer con Python y Pika](/recipes/rabbitmq-python-pika-consumer/) para profundizar.

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

- Confirmá los mensajes manualmente después de que el trabajo termine. El
  auto-ack saca el mensaje de la queue apenas se entrega, así que si el worker
  se cae a mitad de procesamiento se pierde. Con ack manual, un mensaje no
  confirmado se reencola cuando el consumer se desconecta, salvo que lo rechaces
  explícitamente con `nack`.
- Seteá el `prefetch` según la duración de la tarea y la cantidad de consumers.
  Empezá con 5–10 para cargas mixtas, medí queue depth y consumer lag, y ajustá
  para arriba o para abajo. Un prefetch demasiado alto desperdicia memoria;
  demasiado bajo deja workers ociosos.
- Declará queues y exchanges como `durable` para que la topología sobreviva un
  restart del broker. Para mensajes que no deben desaparecer, publicá con
  `persistent: true` y nunca confiés solo en la durabilidad de la queue.
- Si una queue maneja trabajo crítico, dale su propio DLX y DLQ.
  Limitá los reintentos — tres intentos es un default común — y enrutá los
  mensajes problemáticos fuera del ciclo de reintentos.
- Monitoreá queue depth, cantidad de consumers y crecimiento del DLQ. Un pico
  repentino de depth suele significar que un consumer está caído o que una
  dependencia downstream está lenta. Alertá sobre crecimiento del DLQ porque
  significa que algo falla repetidamente.
- Usá conexiones o canales separados para publishers y consumers en el mismo
  proceso. Publicar mientras se consume en el mismo canal puede bloquear los
  acknowledgments de entrega y crear head-of-line blocking.

## Errores Comunes

- Si te olvidás de confirmar un mensaje, los mensajes no confirmados se quedan
  en la memoria del broker y eventualmente pueden agotarla. Hacé ack manual y
  llamá a `ack` solo cuando los efectos secundarios terminen.
- Depender del auto-ack en tareas largas o fallibles es arriesgado: un crash o
  una excepción hacen que el mensaje desaparezca en lugar de volver a la queue.
- Crear reply queues exclusivas en RPC y nunca cerrar la conexión o el canal es
  un error. Las queues exclusivas se borran cuando se cierra la conexión, pero
  si la conexión queda abierta se acumulan queues obsoletas.
- Dejar un mensaje fallido en el ciclo de reintentos para siempre es un error.
  Siempre limitá los reintentos y mové los mensajes problemáticos a un DLQ. Si
  no, un mensaje malo bloquea la queue para los mensajes válidos detrás.
- Publicar en una durable queue sin `persistent: true` activado es un error. La
  estructura de la queue sobrevive un restart, pero los mensajes dentro no, a menos que sean persistentes.
- Dejar crecer el consumer lag es un error. Un worker lento puede parar todo el
  pipeline si el prefetch es demasiado alto o si las tareas no son idempotentes.
  Consultá [Message Idempotency](/recipes/message-idempotency/).

## Preguntas Frecuentes

### ¿En qué se diferencia de Kafka?

RabbitMQ enruta mensajes rápidamente y con bindings flexibles. En cambio, Kafka
funciona como un log de eventos pensado para alto throughput y replay. Kafka no
tiene soporte nativo para request-reply y usa distintas semánticas de entrega.

### ¿Debería usar un direct o topic exchange?

Usá un exchange `direct` cuando la queue o routing key son exactas. Usá un
exchange `topic` cuando necesitás pattern matching, por ejemplo que
`orders.us.created` y `orders.eu.created` coincidan con el patrón `orders.*.created`.

### ¿Esta solución está lista para producción?

Estos patrones funcionan en producción, pero un despliegue real todavía necesita
monitoreo, recuperación de conexiones, autenticación y TLS antes de encajar en tu
entorno.

### ¿Cuáles son las características de rendimiento?

Una work queue típica puede mover miles o decenas de miles de mensajes por
segundo por nodo en RabbitMQ. El throughput baja con lógica de enrutamiento
compleja o mensajes grandes. Escalás agregando nodos al broker o más consumers.

### ¿Cómo depuro problemas con este enfoque?

Usá la UI de management en el puerto 15672 para monitorear queue depth, cantidad de consumers
y message rates. Revisá los logs del consumer, confirmá que la conexión esté
abierta y asegurate de que tu DLQ no se esté llenando.

### ¿Por qué necesito una durable queue y mensajes persistentes?

Una durable queue sobrevive un restart del broker, pero solo guarda los
metadatos de la queue, no los mensajes que contiene. Los mensajes persistentes se
escriben en disco, así que sobreviven un restart del broker. Necesitás ambos
mecanismos: las queues durable almacenan la estructura y los mensajes persistentes almacenan los datos.

### ¿Puedo mezclar task queues y RPC en el mismo cluster de RabbitMQ?

Sí. RabbitMQ no impone un patrón particular en una queue, así que podés correr ambos. Solo mantené los
nombres y el enrutamiento separados para que una task queue no sea consumida
accidentalmente por un server RPC. Muchos equipos usan un vhost para eventos y
otro para RPC para aislar el tráfico.

### ¿Qué pasa si el server RPC está caído?

Si vence el timeout, la promesa del client rechaza. En un servicio real deberías
capturar ese error, loguearlo y posiblemente reintentar con un delay o caer en
un resultado cacheado. Para llamadas idempotentes, un reintento acotado funciona
bien.

## Referencias

- La [especificación AMQP 0-9-1](https://www.amqp.org/specification/0-9-1/amqp-org-download)
  define exchanges, queues, bindings y semánticas de entrega.
- La [documentación de RabbitMQ](https://www.rabbitmq.com/docs) incluye tutoriales,
  checklists de producción y librerías cliente.
- La referencia de la API de [amqplib](https://amqp-node.github.io/amqplib/) y los
  docs de [pika](https://pika.readthedocs.io/en/stable/) documentan los clientes de
  Node.js y Python usados en los ejemplos.
