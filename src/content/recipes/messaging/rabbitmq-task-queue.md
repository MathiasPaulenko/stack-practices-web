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

RabbitMQ is a battle-tested message broker that speaks AMQP, an open wire
protocol with clients in most languages. Teams reach for it when a web request
does too much work: instead of making the user wait, you hand the job to a
worker process through a queue. AMQP gives you explicit control over routing, delivery guarantees, and
persistence; that's why it fits task queues and request-reply (RPC) patterns
better than plain HTTP polling.

This recipe's TypeScript examples use `amqplib` 0.10.x. The same concepts
transfer to Python, Go, Java, or .NET clients, because they all talk the same
protocol. You
will configure a durable task queue, add a dead-letter exchange for poison
messages, cap retries with prefetch, and implement an RPC call with a temporary
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
- Broadcasting to thousands of clients in real time. A WebSocket or pub-sub
  broker is usually simpler.
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

AMQP routing rests on three primitives: exchanges, queues, and bindings. A
producer never sends directly to a queue; it sends to an exchange, and the
exchange forwards the message to queues whose binding key matches the routing
key. In this recipe we use a `direct` exchange and the default empty exchange
for `sendToQueue`, which routes using the queue name as the routing key.

```mermaid
flowchart LR
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

Dead-letter exchanges catch messages that can't be processed. A message lands in
the DLQ when it's rejected without requeue, when it expires, or when it exceeds
the queue's `x-max-delivery-count`. Operators get a dedicated place to inspect
failures without blocking the main queue. Pair the DLQ
with an `x-dead-letter-routing-key` so you can route different queues to
different DLQs if your topology grows.

The retry loop in the worker works by nacking the original message and then
republishing it with an incremented `x-attempt` header. This works, but the
republished message lands at the tail, so its place in line changes. For time-sensitive retries, set `x-message-ttl` on a separate delay queue or use
a dedicated retry exchange.

AMQP RPC relies on a temporary reply queue that's exclusive and auto-deleted.
The client generates a `correlationId`, sends the request with `replyTo` set to
that queue, and waits for a response whose `correlationId` matches. The server
sends the same id back.
Because AMQP is asynchronous, the client wraps this in a promise with a timeout.
Always close the connection or clean up the reply queue when the timeout fires,
otherwise the broker accumulates stale queues.

## Variants

The table below compares exchange types and queue patterns. Choose the one that
fits your routing needs and latency budget.

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
Node.js and browsers via bundles. The Python equivalent below uses `pika` 1.3.x.

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
- For any queue that handles business-critical work, add a dedicated DLX and
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
  broker's memory and can eventually exhaust it. Use manual ack, and call `ack`
  only after the side effects are complete.
- Relying on auto-ack for long or fallible tasks is risky: a crash or exception
  causes the message to disappear rather than return to the queue.
- Creating exclusive reply queues in RPC and never closing the connection or
  channel is a mistake. Exclusive queues are deleted when the connection closes,
  but if the connection stays open, stale queues accumulate.
- Keeping a failed message in the retry loop forever is a mistake. Always cap
  retries and move poison messages to a DLQ. Otherwise a bad message blocks the
  queue for valid messages behind it.
- Publishing to a durable queue without `persistent: true` is a mistake. The
  queue survives a restart, but the messages don't.
- Neglecting consumer lag is a mistake. A single slow worker can stall the whole
  pipeline if prefetch is too high or if tasks aren't idempotent. See [Message
  Idempotency](/recipes/message-idempotency/).

## FAQ

### How is this different from Kafka?

RabbitMQ is a message broker that routes messages with low latency and flexible
bindings. Kafka, by contrast, is an event log optimized for high throughput and
replay. Kafka doesn't support request-reply natively and uses different
delivery semantics.

### Should I use a direct or topic exchange?

Use a `direct` exchange when the queue or routing key is exact. Use a `topic`
exchange when pattern matching is needed, such as `orders.us.created` and
`orders.eu.created` both matching `orders.*.created`.

### Is this solution production-ready?

You'll see these patterns in production, yet you still need monitoring,
connection recovery, authentication, and TLS to fit your environment.

### What are the performance characteristics?

A typical RabbitMQ work queue can move thousands to tens of thousands of messages
per second per node. Throughput drops with heavy routing logic or large
messages. To scale, add more nodes or consumers.

### How do I debug issues with this approach?

The management UI on port 15672 gives you queue depth, consumer count, and
message rates. Then check consumer logs, confirm the connection is open, and make
sure your DLQ isn't filling up.

### Why do I need both a durable queue and persistent messages?

A durable queue survives a broker restart, but it only stores the metadata of the
queue, not the messages inside it. Persistent messages are written to disk, so
they survive a restart. You need both: one keeps the queue structure, the other keeps the data.

### Can I mix task queues and RPC on the same RabbitMQ cluster?

Yes. RabbitMQ handles any pattern on a queue. Just keep the naming and routing
separate so a task queue isn't accidentally consumed by an RPC server. Many teams run one vhost for events and another for RPC to isolate
traffic.

### What happens if the RPC server is down?

If the timeout fires, the client promise rejects. In a real service you should
catch that error, log it, and possibly retry with a delay or fall back to a
cached result. For idempotent calls, a bounded retry works well.
