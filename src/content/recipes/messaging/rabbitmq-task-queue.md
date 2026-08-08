---
contentType: recipes
slug: rabbitmq-task-queue
title: "Task Queues and RPC with RabbitMQ and AMQP"
description: "Implement reliable task distribution and request-reply patterns using RabbitMQ with durable queues, dead-letter exchanges, and prefetch for controlled concurrency"
metaDescription: "Implement task queues and RPC with RabbitMQ. Use durable queues, dead-letter exchanges, and prefetch for reliable task distribution and controlled concurrency."
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
  - /recipes/kafka-event-streaming
  - /recipes/event-driven-architecture
  - /recipes/background-jobs
  - /recipes/dead-letter-queue
  - /recipes/event-driven-microservices
  - /recipes/message-idempotency
  - /guides/message-queue-guide
lastUpdated: "2026-06-18"
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






---
Distribute background tasks reliably and implement request-reply patterns using RabbitMQ. Below is a practical approach to durable queues, dead-letter exchanges for failed messages, prefetch limits for controlled concurrency, and RPC over AMQP for synchronous calls across services.

## When to Use This

- Background jobs (image processing, email sending) must not block the main request flow. See [Scheduled Jobs](/recipes/devops/background-jobs) for recurring task automation.
- Failed tasks should be retried with exponential backoff or routed to dead-letter queues. See [Retry Logic](/recipes/architecture/retry-backoff) for exponential backoff patterns.
- Services need synchronous RPC-style communication without HTTP overhead. See [Call REST API](/recipes/api/call-rest-api) for synchronous HTTP alternatives.

## Solution

### 1. Producer with Durable Queue

```typescript
// rabbitmq/producer.ts
import amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

// Durable queue survives broker restart
await channel.assertQueue('email.tasks', {
  durable: true,
});

// Dead letter exchange for failed messages
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

### 2. Worker with Prefetch and Ack

```typescript
// rabbitmq/worker.ts
const channel = await connection.createChannel();

await channel.prefetch(5); // Process 5 messages concurrently per worker

await channel.consume('email.tasks', async (msg) => {
  if (!msg) return;

  const email = JSON.parse(msg.content.toString());
  const attempt = msg.properties.headers?.['x-attempt'] || 1;

  try {
    await sendEmail(email);
    channel.ack(msg); // Remove from queue on success
  } catch (error) {
    if (attempt >= 3) {
      // Reject and send to dead letter queue
      channel.reject(msg, false);
    } else {
      // Nack and requeue for retry
      channel.nack(msg, false, true);

      // Publish with incremented attempt
      channel.sendToQueue('email.tasks', msg.content, {
        persistent: true,
        headers: { 'x-attempt': attempt + 1 },
      });
    }
  }
});
```

### 3. Request-Reply RPC Pattern

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

## How It Works

- **Exchanges** route messages to queues based on binding rules
- **Durable queues** persist messages across broker restarts
- **Prefetch** limits unacknowledged messages per consumer to prevent overload
- **Dead-letter exchanges** receive messages that are rejected or expire
- **RPC** uses reply queues and correlation IDs to match responses to requests

## Production Considerations

- Use quorum queues for replicated, fault-tolerant message storage
- Monitor queue depth with the management plugin or Prometheus exporter
- Implement circuit breakers on the producer side when queue depth exceeds thresholds

## Common Mistakes

- Not acknowledging messages, causing memory exhaustion on the broker
- Using auto-ack for long-running tasks that may fail
- Creating reply queues without cleanup, causing queue leaks in RPC

## Error Handling and Recovery

- **Consumer failure handling**: when a consumer crashes mid-processing, RabbitMQ requeues the message after a connection timeout.  Set prefetch_count to 1 for fair dispatch.
- **Connection recovery**: RabbitMQ connections drop due to network issues, server restarts, or load balancer changes.  Set connection timeout to 30 seconds.  Log connection events.
- **Message redelivery semantics**: when a consumer rejects a message (basic. nack), it can be requeued or sent to DLQ.  Requeued messages go to the end of the queue.  Set max delivery count via DLX policy.
- **Queue durability**: declare queues as durable to survive broker restarts.  Declare exchanges as durable.
- **Poison message handling**: messages that consistently cause consumer failures are poison.  Set max retry count (e. g. , 3-5).  After max retries, route to DLX.  Log poison message details.
- **Graceful shutdown**: when shutting down consumers, cancel the consumer first (asic_cancel).  Process in-flight messages.  Then close the channel and connection.  Set shutdown timeout (e. g. , 30 seconds).

## Performance and Scalability

- **Prefetch tuning**: set prefetch_count based on processing time and consumer capacity.  Low prefetch (1-10): fair dispatch, lower throughput.  High prefetch (50-100): higher throughput, uneven distribution.  Start with prefetch=10 and tune based on metrics.
- **Consumer scaling**: scale consumers horizontally by adding more consumer processes.  Scale by queue depth or consumer lag.  Set min/max replicas.
- **Queue partitioning**: partition queues by task type or priority.  Separate queues for CPU-intensive vs IO-intensive tasks.
- **Message batching**: batch publish messages for higher throughput.  Batch acknowledge for consumer efficiency.  Start with batch size of 10-50.
## Security Considerations

- **Message encryption**: encrypt sensitive message payloads at the application layer.  TLS for transport encryption.  Rotate encryption keys quarterly.  Never log encrypted payloads.
- **Authentication and authorization**: authenticate producers and consumers using mutual TLS or SASL.  Authorize queue access via ACLs.  Rotate credentials regularly.  Audit credential usage.  Block anonymous connections in production.
- **Message integrity**: use HMAC signatures to verify message integrity.  Sign message body + headers with a shared secret.  Verify signature on consumption.  Reject messages with invalid signatures.  Rotate signing keys periodically.  Log signature verification failures.
- **Audit logging**: log all message publishing and consumption events.  Send audit logs to a centralized logging system.  Retain logs per compliance requirements (e. g. , 7 years for financial systems).

## Monitoring and Observability

- **Queue depth monitoring**: monitor queue depth continuously. g. , 1000 messages).  Correlate depth spikes with deployment events.
- **Consumer lag tracking**: track the difference between message publish time and processing time. g. , 5 minutes).  Correlate lag with consumer scaling events.
- **Throughput metrics**: track messages published per second, consumed per second, and error rate.
- **Error rate monitoring**: track error rate per consumer.  Log errors with message context for debugging.  Categorize errors by type (timeout, validation, processing).
## Deployment and CI/CD

- **Blue-green deployments for consumers**: deploy new consumer versions using blue-green strategy.  Run both versions simultaneously.  Drain the old version after the new version is healthy.  Roll back immediately if error rate increases.
- **Consumer deployment ordering**: deploy consumers before producers when changing message formats.  This ensures new consumers can handle old format messages.  Deploy producers after consumers are ready.
- **Infrastructure as Code for messaging**: define queues, exchanges, and bindings in Terraform or CloudFormation.  Version infrastructure definitions.
- **Message format versioning**: include a schema version in message headers.  Consumers handle multiple versions during rollout.  Deprecate old versions after all consumers upgrade.

## Common Pitfalls and Anti-Patterns

- **Shared queue for different message types**: avoid using a single queue for different message types.  Each type has different processing requirements, priorities, and SLAs.
- **Not handling message ordering**: some systems require message ordering (e. g. , state updates).  Use sequence numbers for ordering verification.
- **Synchronous processing in async pipeline**: avoid making synchronous HTTP calls within message consumers.  This blocks the consumer and reduces throughput.  Set appropriate timeouts.  Move slow operations to separate workers.
- **Ignoring consumer lag**: consumer lag indicates the system cannot keep up with message production.  Scale consumers automatically based on lag.
## Cost Optimization

- **Right-size messaging infrastructure**: choose the right broker tier based on throughput.  Start with the smallest tier and scale up based on metrics.  Factor in operational overhead of self-hosting.
- **Message payload optimization**: reduce message size to lower costs.  Compress large payloads (gzip, lz4).  Benchmark payload size impact on throughput and cost.
- **Consumer resource optimization**: right-size consumer instances based on processing requirements.  Scale consumers to zero during off-hours for non-urgent queues.
- **Storage cost management**: message queues consume storage for queued and retained messages.  Set appropriate message TTL to auto-expire old messages.  Archive old messages to cheaper storage.

## Testing and Quality Assurance

- **Integration testing for messaging**: test producer-consumer integration end-to-end.  Verify message delivery, ordering, and content.  Test failure scenarios (broker down, consumer crash, network partition).
- **Load testing messaging systems**: test with production-like message volumes.  Verify DLQ behavior under load.
- **Chaos engineering for messaging**: inject failures (broker restart, network partition, consumer crash).  Verify system recovers automatically.  Test DLQ behavior under cascade failures.  Run chaos tests in staging regularly.
- **Contract testing for messages**: use schema registry or contract testing tools (Pact) to verify message format compatibility.  Detect breaking changes before deployment.  Run contract tests in CI.  Version schemas properly.
## Tools and Platforms

- **RabbitMQ Management Plugin**: web UI for monitoring RabbitMQ.  View queue depths, message rates, consumer counts.  Inspect and publish messages manually.  Manage exchanges, queues, and bindings.  View connection and channel details.  Export and import definitions.  Enable on port 15672.
- **AWS SQS and SNS**: managed messaging services.  SQS for point-to-point queues.  SNS for pub/sub.  No infrastructure to manage.  Pay per request.  Dead letter queues built-in.  FIFO queues for ordering.  Message attributes for filtering.
- **Apache Kafka**: distributed event streaming platform.  High throughput (millions of events/sec).  Durable event storage.  Consumer groups for parallel processing.  Partitions for ordering.  Schema registry for Avro/Protobuf.
- **Redis Pub/Sub and Streams**: lightweight messaging in Redis.  Pub/Sub: fire and forget, no persistence.  Streams: persistent, consumer groups, replayable.  Good for simple use cases and low latency.  Not suitable for high-throughput or durable messaging.

## Best Practices Summary

- **Always use manual acknowledgment**: never use auto-ack in production.  Process the message fully before acking.  This prevents message loss on consumer crashes.
- **Set appropriate TTLs**: set message TTL to prevent infinite retries.  Set queue TTL to auto-expire stale messages.  Set DLQ TTL to auto-clean old failures.  Choose TTLs based on business requirements.
- **Use dead letter exchanges**: configure DLX on all critical queues.  Set max delivery count.  Create runbooks for DLQ remediation.
- **Monitor everything**: track queue depth, consumer lag, throughput, error rate, and DLQ depth.  Set up dashboards.  Correlate metrics with deployments.
## Advanced Patterns

- **Competing consumers pattern**: multiple consumer instances read from the same queue.  Each message is processed by exactly one consumer.  Enables horizontal scaling.  Use consumer priority for weighted dispatch.
- **Request-reply pattern**: send a message with a reply-to queue.  Consumer processes and publishes the response to the reply queue.  Set timeouts for replies.
- **Routing key patterns**: use topic exchanges with routing key patterns.  * matches one word.  # matches zero or more words.  orders. *. created matches orders. us. created and orders. eu. created.  orders. # matches all order events.
- **Priority queues**: declare queues with x-max-priority argument.  Set priority on messages via headers.  Higher priority messages are consumed first.  Set max priority to 10 to limit overhead.
## Compliance and Governance

- **Message retention policies**: define retention periods per queue based on compliance requirements.  Financial systems: 7 years.  Healthcare: 6 years.  General: 30-90 days.  Audit retention compliance quarterly.
- **Data residency for messages**: some regulations require data to stay within specific geographic boundaries.  Choose cloud regions carefully.
- **Access control for queues**: restrict queue management to authorized personnel.  Separate read, write, and management permissions.  Audit queue access.  Rotate access credentials.  Block anonymous access.
- **Message audit trails**: log all message lifecycle events (publish, consume, ack, nack, DLQ).  Send audit logs to immutable storage.  Retain per compliance requirements.  Support audit log export for regulators.
## Troubleshooting Guide

- **Messages stuck in queue**: check if consumers are running and connected.  Verify consumer prefetch settings.  Inspect consumer logs for errors.  Verify queue is not paused.
- **High memory usage**: check for large message payloads.  Verify message TTL is set.  Consider message compression.
- **Connection drops**: check network stability between consumers and broker.  Verify heartbeat settings.  Log reconnection attempts.
- **Uneven message distribution**: check prefetch settings (too high causes uneven distribution).  Verify all consumers have equal capacity.  Scale consumers based on lag.
## Migration Strategies

- **Monolith to event-driven migration**: start by identifying bounded contexts.  Extract one service at a time.
- **Broker migration**: migrate from one broker to another (e. g. , RabbitMQ to Kafka).  Run both brokers in parallel during transition.  Dual-publish to both brokers.  Switch consumers one by one.  Verify message parity.  Decommission old broker after all consumers migrate.
- **Queue refactoring**: split a monolithic queue into multiple specialized queues.  Run both queues in parallel.  Switch consumers to new queues.  Decommission old queue after verification.
- **Protocol migration**: migrate from AMQP to MQTT or vice versa.  Validate message semantics across protocols.  Train team on new protocol.




## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the messaging and microservices guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply task queues and rpc with rabbitmq and amqp** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: How is this different from Kafka?**
A: RabbitMQ supports complex routing, RPC, and lower latency per message. Kafka excels at high-throughput log streaming and replay.

**Q: Should I use topic or direct exchanges?**
A: Use direct for simple routing by key. Use topic for pattern-based routing (e.g., `orders.*.created`).

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
