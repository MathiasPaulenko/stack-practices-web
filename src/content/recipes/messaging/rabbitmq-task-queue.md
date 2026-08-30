---
contentType: recipes
slug: rabbitmq-task-queue
title: "Task Queues and RPC with RabbitMQ and AMQP"
description: "Distribute background tasks and implement request-reply patterns with RabbitMQ using durable queues, dead-letter exchanges, and prefetch."
metaDescription: "Implement task queues and RPC with RabbitMQ. Use durable queues, dead-letter exchanges, and prefetch for reliable task distribution and controlled concurrency."
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
  metaDescription: "Implement task queues and RPC with RabbitMQ. Use durable queues, dead-letter exchanges, and prefetch for reliable task distribution and controlled concurrency."
  keywords:
    - rabbitmq
    - amqp
    - task queue
    - dead letter
    - rpc
    - messaging
---

## Overview

RabbitMQ is a message broker that uses AMQP, an open wire protocol with clients
in most languages. Teams reach for it when a web request
does too much work: instead of making the user wait, you hand the job to a
worker process through a queue. AMQP is a wire protocol that lets you control routing, delivery guarantees and
persistence directly, so task queues and request-reply (RPC) patterns fit it
better than plain HTTP polling.

This recipe's TypeScript examples use [`amqplib`](https://amqp-node.github.io/amqplib/) 0.10.x. The same concepts
transfer to Python, Go, Java, or .NET clients, because they all talk the same
protocol. You'll
configure a durable task queue, add a dead-letter exchange for poison
messages, cap retries with prefetch and implement an RPC call through a temporary
reply queue.

## When to Use

- Move slow work such as image processing, sending emails, or generating PDFs
  out of the request path. The caller publishes the task and continues, while a
  worker picks it up later. See [Background Jobs](/recipes/background-jobs/)
  for related patterns.
- Retry a failed task a few times, then route it to a dead-letter queue for
  inspection once the retries are exhausted. See [Retry Backoff](/recipes/retry-backoff/)
  for retry strategies.
- You need request-reply communication that feels synchronous but skips the
  overhead of HTTP. RPC over AMQP is useful when a service lives behind a
  firewall or when you already run RabbitMQ for events.
- You want to scale workers horizontally: add more consumers to the same queue
  and RabbitMQ distributes messages round-robin.

Avoid RabbitMQ for:

- Streaming high-throughput event logs where replay and long retention matter.
  Kafka usually fits that case better. See [Event Streaming with Kafka](/recipes/kafka-event-streaming/).
- Live updates to thousands of clients at once are usually simpler with a
  WebSocket or pub-sub broker than with RabbitMQ.
- Heavy batch workloads that take minutes per message without acknowledgments,
  because unacknowledged messages can exhaust broker memory.

## Solution

These snippets use TypeScript and `amqplib` 0.10.x. The producer creates a durable
queue with a dead-letter policy, the worker consumes with prefetch and retries,
the RPC client returns a promise, and the server replies with the same
`correlationId`.

### 1. Producer with durable queue and DLX

```typescript
// rabbitmq/producer.ts
import * as amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

// Dead-letter exchange for failed messages
await channel.assertExchange('dlx', 'direct');
await channel.assertQueue('email.tasks.dlq', { durable: true });
await channel.bindQueue('email.tasks.dlq', 'dlx', 'email.tasks');

// Durable queue with a dead-letter policy
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

### 2. Worker with prefetch and retry

```typescript
// rabbitmq/worker.ts
import * as amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

await channel.prefetch(5); // Process up to 5 messages concurrently per worker

await channel.consume('email.tasks', async (msg) => {
  if (!msg) return;

  const email = JSON.parse(msg.content.toString());
  const attempt = msg.properties.headers?.['x-attempt'] || 1;

  try {
    await sendEmail(email);
    channel.ack(msg);
  } catch (error) {
    if (attempt >= 3) {
      // Drop the message after three attempts; the DLX routes it to the DLQ
      channel.nack(msg, false, false);
    } else {
      // Reject the original message and republish with an incremented attempt
      channel.nack(msg, false, false);
      channel.sendToQueue('email.tasks', msg.content, {
        persistent: true,
        headers: { 'x-attempt': attempt + 1 },
      });
    }
  }
});

async function sendEmail(email: unknown): Promise<void> {
  // Your email-sending logic here
  console.log('Sending email:', email);
}
```

### 3. Request-reply RPC pattern

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

## Explanation

Three primitives drive AMQP routing: exchanges, queues and bindings. A
producer never sends directly to a queue; it sends to an exchange, and the
exchange forwards the message to queues whose binding key matches the routing
key. This recipe uses a `direct` exchange plus the default empty exchange for
`sendToQueue`; the empty exchange routes using the queue name as the routing key.

```mermaid
flowchart LR
%% alt: A producer sends a task through the default exchange to the email.tasks queue, then to a worker; after three failed attempts the message is routed to the DLX and DLQ
    P[Producer] -->|sendToQueue| E[Default exchange]
    E --> Q[email.tasks queue]
    Q --> C[Worker consumer]
    C -->|nack after 3 attempts| D[DLX direct]
    D --> DLQ[email.tasks.dlq]
```

Durability has two layers. A broker restart recreates a durable queue, but that alone doesn't save the
messages. Messages also need `persistent: true` (delivery mode 2) so the broker
writes them to disk. If you declare a durable
queue and send transient messages, the queue survives but the messages disappear
on restart.

`prefetch(n)` is a per-consumer limit on unacknowledged messages. It prevents
one fast worker from grabbing the next fifty tasks while a slow worker is still
processing the first one. Task duration drives the right value: 5–10 is a reasonable starting point for
CPU-bound work with fast workers, and you can raise it for IO-bound work that
waits on network calls, but never beyond what the worker can handle.

A dead-letter exchange takes messages the consumer can't process and routes them
to the DLQ for inspection. See [Dead Letter Queue](/recipes/dead-letter-queue/) for the full pattern. A message
lands in the DLQ when it's rejected without requeue, when it expires, or when it exceeds
the queue's `x-max-delivery-count`. This gives operators a focused place to
inspect failures while the main queue keeps moving. Pair the DLQ
with an `x-dead-letter-routing-key` so you can route different queues to
different DLQs if your topology grows.

The retry loop in the worker works by nacking the original message and then
republishing it with an incremented `x-attempt` header. Republishing is simple, but the
message loses its original place in line because it lands at the back of the queue.
Time-sensitive retries need either a delay queue with `x-message-ttl` or a separate
retry exchange.

AMQP RPC relies on a temporary reply queue that's exclusive and auto-deleted.
The client generates a `correlationId`, sends the request with `replyTo` set to
that queue, and waits for a response whose `correlationId` matches. The server
echoes the same id back to the client.
Because AMQP is asynchronous, the client wraps this in a promise with a timeout.
Always close the connection or clean up the reply queue when the timeout fires,
otherwise the broker accumulates stale queues.

## Variants

Exchanges and queue patterns carry different trade-offs, so match the choice to your
routing needs and latency budget.

| Approach | Best for | Trade-off |
| --- | --- | --- |
| Direct exchange | Exact queue routing | No pattern matching |
| Topic exchange | Pattern-based routing (`orders.*.created`) | Slightly more overhead |
| Fanout exchange | Broadcasting to many consumers | Ignores routing keys |
| Work queue with prefetch | Load balancing among workers | Requires manual ack |
| RPC with reply queue | Synchronous service calls | Adds latency and complexity |

If you only need point-to-point task distribution, a `direct` exchange or the
default exchange with `sendToQueue` is enough. When the same event must reach
several consumers, a `fanout` or `topic` exchange is the better choice.

### Python equivalent with `pika`

The TypeScript examples use `amqplib`, and the same library is available for
Node.js and browsers via bundles. The Python equivalent below uses `pika` 1.3.x for its synchronous
[`BlockingConnection`](https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html)
API. See our [RabbitMQ consumer recipe with Python and Pika](/recipes/rabbitmq-python-pika-consumer/)
for a deeper dive.

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

## Best Practices

- Acknowledge messages manually after the work is done. Auto-ack removes the
  message from the queue as soon as it's delivered, so a crash mid-processing
  loses it. With manual ack, an unacknowledged message is requeued when the
  consumer disconnects, unless you explicitly `nack` it.
- Set `prefetch` based on task duration and consumer count. Start with 5–10 for
  mixed workloads, measure queue depth and consumer lag, then adjust up or down.
  A prefetch that's too high wastes memory; too low leaves workers idle.
- Declare both queues and exchanges as `durable` so the topology survives a
  broker restart. For messages that must not disappear, publish with
  `persistent: true` and never rely solely on queue durability.
- Business-critical queues should each have a dedicated DLX and
  DLQ. Cap retries — three attempts is a common default — and route poison
  messages out of the retry loop.
- Monitor queue depth, consumer count, and DLQ growth. A sudden depth spike
  usually means a consumer is down or a downstream dependency is slow. Alert on
  DLQ growth because it means something is repeatedly failing.
- Use separate connections or channels for publishers and consumers on the same
  process. Publishing while consuming on the same channel can block delivery
  acknowledgments and create head-of-line blocking.

## Common Mistakes

- If you forget to acknowledge a message, unacknowledged messages stay in the
  broker's memory and can eventually exhaust it. Ack manually, and only call
  `ack` once the side effects finish.
- Relying on auto-ack for long or fallible tasks is risky: a crash or exception
  causes the message to disappear rather than return to the queue.
- Creating exclusive reply queues in RPC and never closing the connection or
  channel is a mistake. Exclusive queues are deleted when the connection closes,
  but if the connection stays open, stale queues accumulate.
- Keeping a failed message in the retry loop forever is a mistake. Always cap
  retries and move poison messages to a DLQ. Otherwise a bad message blocks the
  queue for valid messages behind it.
- Publishing to a durable queue without `persistent: true` is a mistake. The
  queue structure survives a restart, but the messages inside it survive only if they were published as persistent.
- Letting consumer lag grow is a mistake. A single slow worker can stall the whole
  pipeline if prefetch is too high or if tasks aren't idempotent. See [Message
  Idempotency](/recipes/message-idempotency/).

## FAQ

### How is this different from Kafka?

RabbitMQ is a message broker; it routes messages quickly and with flexible
bindings. Kafka, by contrast, is an event log built for high throughput and
replay. Kafka has no native request-reply support and uses different
delivery semantics.

### Should I use a direct or topic exchange?

Use a `direct` exchange when the queue or routing key is exact. Use a `topic`
exchange when pattern matching is needed, such as `orders.us.created` and
`orders.eu.created` both matching the `orders.*.created` pattern.

### Is this solution production-ready?

These patterns work in production, but a real deployment still needs monitoring,
connection recovery, authentication and TLS before they fit your environment.

### What are the performance characteristics?

A RabbitMQ node can move anywhere from tens of thousands to hundreds of thousands
of small messages per second, depending on message size, persistence, publisher
confirms and consumer acknowledgements. RabbitMQ's own benchmarker reports
36,000–67,000 messages per second for replicated 1 KB quorum queues, and the
official PerfTest tool can show higher numbers for classic queues in controlled
setups. In real task-queue deployments with durable queues, persistent messages
and manual acks, most teams see tens of thousands of messages per second per
node. You scale by adding more broker nodes or more consumers.

### How do I debug issues with this approach?

Use the management UI on port 15672 to watch queue depth, consumer count and
message rates. Then check consumer logs, confirm the connection is open, and make
sure your DLQ isn't filling up.

### Why do I need both a durable queue and persistent messages?

A durable queue survives a broker restart, but it only stores the metadata of the
queue, not the messages inside it. Persistent messages are written to disk, so
they survive a broker restart. You need both mechanisms: durable queues hold the
structure, and persistent messages hold the data.

### Can I mix task queues and RPC on the same RabbitMQ cluster?

Yes. RabbitMQ doesn't enforce a pattern on a queue, so you can run both. Just keep
naming and routing separate so a task queue isn't accidentally consumed by an RPC
server. Many teams run one vhost for events and another for RPC to isolate traffic.

### What happens if the RPC server is down?

If the timeout expires, the client promise rejects. In a real service you should
catch that error, log it, and possibly retry with a delay or fall back to a
cached result. For idempotent calls, a bounded retry works well.

## Further Reading

- The [AMQP 0-9-1 specification](https://www.amqp.org/specification/0-9-1/amqp-org-download)
  defines exchanges, queues, bindings and delivery semantics.
- The [RabbitMQ documentation](https://www.rabbitmq.com/docs) covers tutorials,
  production checklists and client libraries.
- The [amqplib API reference](https://amqp-node.github.io/amqplib/) and the
  [pika docs](https://pika.readthedocs.io/en/stable/) document the Node.js and Python
  clients used in the examples.
