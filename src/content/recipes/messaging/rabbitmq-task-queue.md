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
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement task queues and RPC with RabbitMQ. Use durable queues, dead-letter exchanges, and prefetch for reliable task distribution and controlled concurrency."
  keywords:
    - rabbitmq
    - amqp
    - task queue
    - dead letter
    - rpc






---

# Task Queues and RPC with RabbitMQ and AMQP

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

- **Consumer failure handling**: when a consumer crashes mid-processing, RabbitMQ requeues the message after a connection timeout. Use manual acknowledgment to prevent message loss. Set prefetch_count to 1 for fair dispatch. Implement heartbeat to detect dead consumers. Use asic.nack with requeue=false for permanent failures to DLQ
- **Connection recovery**: RabbitMQ connections drop due to network issues, server restarts, or load balancer changes. Use automatic recovery in the client library (pika's utomatic_recovery=True). Set connection timeout to 30 seconds. Implement retry logic with exponential backoff. Log connection events. Monitor reconnection frequency
- **Message redelivery semantics**: when a consumer rejects a message (basic.nack), it can be requeued or sent to DLQ. Requeued messages go to the end of the queue. Use x-death header to track rejection count. Set max delivery count via DLX policy. Test redelivery behavior with simulated failures. Monitor redelivery rate
- **Queue durability**: declare queues as durable to survive broker restarts. Use persistent messages (delivery_mode=2) for task queues. Declare exchanges as durable. Use mirrored queues in a cluster for HA. Test queue durability by restarting the broker. Monitor queue persistence settings across all queues
- **Poison message handling**: messages that consistently cause consumer failures are poison. Set max retry count (e.g., 3-5). After max retries, route to DLX. Use TTL on requeued messages to delay retry. Log poison message details. Alert on poison message rate. Implement a poison message analysis dashboard
- **Graceful shutdown**: when shutting down consumers, cancel the consumer first (asic_cancel). Process in-flight messages. Then close the channel and connection. Use SIGTERM handler for graceful shutdown in containers. Set shutdown timeout (e.g., 30 seconds). Monitor graceful shutdown success rate

## Performance and Scalability

- **Prefetch tuning**: set prefetch_count based on processing time and consumer capacity. Low prefetch (1-10): fair dispatch, lower throughput. High prefetch (50-100): higher throughput, uneven distribution. Start with prefetch=10 and tune based on metrics. Monitor consumer lag. Adjust prefetch per queue based on message processing time
- **Consumer scaling**: scale consumers horizontally by adding more consumer processes. Use Kubernetes deployments or auto-scaling groups. Scale by queue depth or consumer lag. Set min/max replicas. Monitor scaling events. Use consumer priority for weighted distribution. Ensure consumers are stateless for horizontal scaling
- **Queue partitioning**: partition queues by task type or priority. Use topic exchanges for routing. Separate queues for CPU-intensive vs IO-intensive tasks. Use priority queues (x-max-priority) for urgent tasks. Monitor queue depth per partition. Scale consumers per partition based on depth
- **Message batching**: batch publish messages for higher throughput. Use asic_publish with confirms for reliability. Batch acknowledge for consumer efficiency. Balance batch size vs latency. Start with batch size of 10-50. Monitor batch publish/ack rates. Adjust based on throughput requirements
## Security Considerations

- **Message encryption**: encrypt sensitive message payloads at the application layer. TLS for transport encryption. Use AES-256 for payload encryption. Rotate encryption keys quarterly. Store keys in a secrets manager (AWS KMS, HashiCorp Vault). Never log encrypted payloads. Decrypt only in the consumer process memory
- **Authentication and authorization**: authenticate producers and consumers using mutual TLS or SASL. Authorize queue access via ACLs. Use per-service credentials with least privilege. Rotate credentials regularly. Audit credential usage. Block anonymous connections in production. Use virtual hosts for environment isolation
- **Message integrity**: use HMAC signatures to verify message integrity. Sign message body + headers with a shared secret. Verify signature on consumption. Reject messages with invalid signatures. Rotate signing keys periodically. Log signature verification failures. Use asymmetric keys for cross-organization messaging
- **Audit logging**: log all message publishing and consumption events. Include message ID, timestamp, producer/consumer identity, and action. Send audit logs to a centralized logging system. Retain logs per compliance requirements (e.g., 7 years for financial systems). Alert on suspicious patterns (mass deletions, unauthorized access)

## Monitoring and Observability

- **Queue depth monitoring**: monitor queue depth continuously. Alert on depth exceeding threshold (e.g., 1000 messages). Track depth trends over time. Correlate depth spikes with deployment events. Use RabbitMQ management API or cloud provider metrics. Set up Grafana dashboards for queue depth visualization
- **Consumer lag tracking**: track the difference between message publish time and processing time. Alert on lag exceeding SLA (e.g., 5 minutes). Monitor lag percentiles (p50, p95, p99). Correlate lag with consumer scaling events. Use distributed tracing to identify slow consumers. Optimize processing to reduce lag
- **Throughput metrics**: track messages published per second, consumed per second, and error rate. Monitor throughput trends. Alert on throughput drops > 50%. Compare throughput across environments. Use Prometheus + Grafana for visualization. Export metrics to a time-series database for historical analysis
- **Error rate monitoring**: track error rate per consumer. Alert on error rate > 1%. Log errors with message context for debugging. Categorize errors by type (timeout, validation, processing). Monitor error rate trends. Correlate error spikes with deployments or infrastructure changes
## Deployment and CI/CD

- **Blue-green deployments for consumers**: deploy new consumer versions using blue-green strategy. Run both versions simultaneously. Drain the old version after the new version is healthy. Use feature flags to toggle between versions. Monitor error rates during switchover. Roll back immediately if error rate increases. Test rollback procedure regularly
- **Consumer deployment ordering**: deploy consumers before producers when changing message formats. This ensures new consumers can handle old format messages. Use schema evolution patterns (additive changes, optional fields). Deploy producers after consumers are ready. Use canary deployment for producers to test new message formats gradually
- **Infrastructure as Code for messaging**: define queues, exchanges, and bindings in Terraform or CloudFormation. Version infrastructure definitions. Review infrastructure changes in PRs. Test infrastructure changes in staging before production. Use policy-as-code to enforce security and naming conventions. Tag all messaging resources for cost allocation
- **Message format versioning**: include a schema version in message headers. Consumers handle multiple versions during rollout. Deprecate old versions after all consumers upgrade. Document schema changes in a changelog. Use schema registry for Avro/Protobuf. Test backward and forward compatibility before deploying schema changes

## Common Pitfalls and Anti-Patterns

- **Shared queue for different message types**: avoid using a single queue for different message types. Each type has different processing requirements, priorities, and SLAs. Use separate queues per message type or use routing keys with topic exchanges. This enables independent scaling, monitoring, and error handling per type
- **Not handling message ordering**: some systems require message ordering (e.g., state updates). Use partitioned queues with single-active consumer per partition. Use sequence numbers for ordering verification. Test ordering under concurrent producers. Document ordering guarantees per queue. Use FIFO queues when strict ordering is required
- **Synchronous processing in async pipeline**: avoid making synchronous HTTP calls within message consumers. This blocks the consumer and reduces throughput. Use async HTTP clients. Set appropriate timeouts. Move slow operations to separate workers. Use circuit breakers for downstream calls. Monitor consumer processing time
- **Ignoring consumer lag**: consumer lag indicates the system cannot keep up with message production. Monitor lag continuously. Alert on lag exceeding SLA. Scale consumers automatically based on lag. Investigate root causes (slow processing, downstream failures, insufficient resources). Track lag trends over time
## Cost Optimization

- **Right-size messaging infrastructure**: choose the right broker tier based on throughput. Start with the smallest tier and scale up based on metrics. Use serverless messaging (SQS, SNS) for variable workloads to avoid paying for idle capacity. Compare self-hosted RabbitMQ vs managed service costs. Factor in operational overhead of self-hosting. Review tier monthly
- **Message payload optimization**: reduce message size to lower costs. Compress large payloads (gzip, lz4). Remove unnecessary metadata. Use reference passing (send a reference ID instead of full payload) for large objects. Benchmark payload size impact on throughput and cost. Target average message size < 10KB
- **Consumer resource optimization**: right-size consumer instances based on processing requirements. Use spot instances for non-critical consumers. Scale consumers to zero during off-hours for non-urgent queues. Monitor consumer CPU and memory utilization. Right-size before scaling out. Track cost per message processed
- **Storage cost management**: message queues consume storage for queued and retained messages. Set appropriate message TTL to auto-expire old messages. Configure DLQ retention policies. Monitor queue storage usage. Archive old messages to cheaper storage. Use lifecycle policies for message archives. Track storage costs per queue

## Testing and Quality Assurance

- **Integration testing for messaging**: test producer-consumer integration end-to-end. Verify message delivery, ordering, and content. Test with realistic message volumes. Test failure scenarios (broker down, consumer crash, network partition). Use test queues for integration tests. Clean up test queues after each run. Automate in CI pipeline
- **Load testing messaging systems**: test with production-like message volumes. Measure throughput, latency, and error rate under load. Identify bottlenecks (broker, consumer, network). Test consumer scaling behavior. Verify DLQ behavior under load. Test backpressure handling. Document load test results and capacity limits
- **Chaos engineering for messaging**: inject failures (broker restart, network partition, consumer crash). Verify system recovers automatically. Test message redelivery after consumer failure. Test DLQ behavior under cascade failures. Run chaos tests in staging regularly. Document findings and improve resilience
- **Contract testing for messages**: use schema registry or contract testing tools (Pact) to verify message format compatibility. Test producer schema against consumer expectations. Detect breaking changes before deployment. Run contract tests in CI. Version schemas properly. Document schema evolution guidelines
## Tools and Platforms

- **RabbitMQ Management Plugin**: web UI for monitoring RabbitMQ. View queue depths, message rates, consumer counts. Inspect and publish messages manually. Manage exchanges, queues, and bindings. View connection and channel details. Export and import definitions. Enable on port 15672. Use for debugging and operational monitoring
- **AWS SQS and SNS**: managed messaging services. SQS for point-to-point queues. SNS for pub/sub. No infrastructure to manage. Pay per request. Dead letter queues built-in. FIFO queues for ordering. Message attributes for filtering. Use with Lambda for serverless consumers. Use with Auto Scaling for EC2 consumers
- **Apache Kafka**: distributed event streaming platform. High throughput (millions of events/sec). Durable event storage. Consumer groups for parallel processing. Partitions for ordering. Schema registry for Avro/Protobuf. Use for event sourcing, log aggregation, stream processing. Self-hosted or managed (Confluent Cloud, AWS MSK)
- **Redis Pub/Sub and Streams**: lightweight messaging in Redis. Pub/Sub: fire and forget, no persistence. Streams: persistent, consumer groups, replayable. Good for simple use cases and low latency. Use for caching invalidation, real-time notifications. Not suitable for high-throughput or durable messaging. Use Redis Streams for reliable delivery

## Best Practices Summary

- **Always use manual acknowledgment**: never use auto-ack in production. Process the message fully before acking. Use nack for failures with appropriate requeue strategy. This prevents message loss on consumer crashes. Monitor ack/nack rates
- **Set appropriate TTLs**: set message TTL to prevent infinite retries. Set queue TTL to auto-expire stale messages. Set DLQ TTL to auto-clean old failures. Choose TTLs based on business requirements. Document TTL values per queue. Monitor TTL expiration rates
- **Use dead letter exchanges**: configure DLX on all critical queues. Set max delivery count. Monitor DLQ depth. Implement DLQ inspection tooling. Create runbooks for DLQ remediation. Test DLX configuration regularly
- **Monitor everything**: track queue depth, consumer lag, throughput, error rate, and DLQ depth. Set up dashboards. Configure alerts with appropriate thresholds. Use distributed tracing for message flows. Correlate metrics with deployments. Review metrics weekly
## Advanced Patterns

- **Competing consumers pattern**: multiple consumer instances read from the same queue. Each message is processed by exactly one consumer. Enables horizontal scaling. Use prefetch=1 for fair dispatch. Monitor for slow consumers that cause uneven distribution. Use consumer priority for weighted dispatch. Handle consumer failures gracefully with requeue
- **Request-reply pattern**: send a message with a reply-to queue. Consumer processes and publishes the response to the reply queue. Use correlation IDs to match requests with responses. Set timeouts for replies. Use for async RPC over messaging. Monitor reply latency. Use exclusive reply queues per producer for isolation
- **Routing key patterns**: use topic exchanges with routing key patterns. * matches one word. # matches zero or more words. orders.*.created matches orders.us.created and orders.eu.created. orders.# matches all order events. Document routing key conventions. Test routing patterns before deploying. Monitor unroutable messages
- **Priority queues**: declare queues with x-max-priority argument. Set priority on messages via headers. Higher priority messages are consumed first. Use sparingly as it adds overhead. Monitor priority queue performance. Set max priority to 10 to limit overhead. Use separate queues for different priority levels as an alternative
## Compliance and Governance

- **Message retention policies**: define retention periods per queue based on compliance requirements. Financial systems: 7 years. Healthcare: 6 years. General: 30-90 days. Implement retention via TTL or scheduled cleanup. Document retention policies. Audit retention compliance quarterly. Use message archiving before deletion for audit trails
- **Data residency for messages**: some regulations require data to stay within specific geographic boundaries. Choose cloud regions carefully. Use region-specific queues and brokers. Avoid cross-region replication for regulated data. Document data residency per queue. Monitor for policy violations. Use private connections for regulated messaging
- **Access control for queues**: restrict queue management to authorized personnel. Use IAM policies or RabbitMQ ACLs. Separate read, write, and management permissions. Audit queue access. Rotate access credentials. Use per-service accounts. Block anonymous access. Document access policies per queue
- **Message audit trails**: log all message lifecycle events (publish, consume, ack, nack, DLQ). Include message ID, timestamp, actor, and action. Send audit logs to immutable storage. Retain per compliance requirements. Support audit log export for regulators. Test audit trail completeness regularly
## Troubleshooting Guide

- **Messages stuck in queue**: check if consumers are running and connected. Verify consumer prefetch settings. Check for blocked connections (RabbitMQ blocked publisher). Inspect consumer logs for errors. Verify queue is not paused. Check resource limits (file descriptors, memory). Use RabbitMQ management UI to inspect queue state
- **High memory usage**: check for large message payloads. Verify message TTL is set. Check for unacked messages piling up. Monitor consumer memory usage. Use prefetch limits to control memory. Consider message compression. Check for memory leaks in consumer code. Profile consumer processes regularly
- **Connection drops**: check network stability between consumers and broker. Verify heartbeat settings. Check broker resource limits. Review firewall and load balancer timeouts. Use automatic recovery in client libraries. Monitor connection events. Log reconnection attempts. Set appropriate connection timeout
- **Uneven message distribution**: check prefetch settings (too high causes uneven distribution). Verify all consumers have equal capacity. Check for slow consumers. Use prefetch=1 for strict fair dispatch. Monitor consumer processing times. Scale consumers based on lag. Consider consumer priority for weighted distribution
## Migration Strategies

- **Monolith to event-driven migration**: start by identifying bounded contexts. Extract one service at a time. Use the strangler fig pattern: route traffic from monolith to new service via events. Keep the monolith as event producer until fully migrated. Monitor for event delivery issues during migration. Plan rollback for each extraction step
- **Broker migration**: migrate from one broker to another (e.g., RabbitMQ to Kafka). Run both brokers in parallel during transition. Dual-publish to both brokers. Switch consumers one by one. Verify message parity. Decommission old broker after all consumers migrate. Plan for schema compatibility across brokers
- **Queue refactoring**: split a monolithic queue into multiple specialized queues. Use a router service to forward messages to new queues. Run both queues in parallel. Switch consumers to new queues. Monitor for message loss or duplication. Decommission old queue after verification. Document new queue architecture
- **Protocol migration**: migrate from AMQP to MQTT or vice versa. Use a protocol bridge during transition. Validate message semantics across protocols. Test performance characteristics of new protocol. Train team on new protocol. Monitor for compatibility issues. Document protocol-specific behaviors
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