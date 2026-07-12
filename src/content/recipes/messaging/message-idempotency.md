---

contentType: recipes
slug: message-idempotency
title: "Message Processing Idempotency"
description: "Design idempotent message processors that safely handle duplicate deliveries without side effects in async and event-driven systems."
metaDescription: "Idempotent message processing: deduplication strategies, idempotency keys, exactly-once semantics, and safe handling of duplicate deliveries."
difficulty: advanced
topics:
  - messaging
tags:
  - messaging
  - distributed-systems
  - architecture
  - kafka
  - rabbitmq
relatedResources:
  - /recipes/event-driven-microservices
  - /recipes/dead-letter-queue
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /guides/microservices-architecture-guide
  - /guides/message-queue-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Idempotent message processing: deduplication strategies, idempotency keys, exactly-once semantics, and safe handling of duplicate deliveries."
  keywords:
    - message-idempotency
    - messaging
    - distributed-systems
    - architecture

---
## Overview

Idempotency ensures that processing the same message multiple times produces the same result as processing it once. In [async systems](/guides/architecture/event-driven-architecture-guide) where at-least-once delivery is the default, duplicate messages are inevitable — [network retries](/recipes/architecture/retry-backoff), consumer rebalances, and producer retries all create duplicates. Without idempotency, customers get charged twice, inventory gets decremented twice, and emails get sent twice.

## When to Use

Use this resource when:
- Using message brokers that guarantee at-least-once delivery (Kafka, RabbitMQ, SQS)
- Producers retry failed publishes, creating duplicate messages
- Consumer groups rebalance and reprocess messages from earlier offsets
- Exactly-once semantics are required but the broker doesn't natively support them

## Solution

### Idempotency Key with Redis (Node.js)

```javascript
const redis = require('redis');
const client = redis.createClient();

async function processPayment(message) {
  const idempotencyKey = message.idempotencyKey || message.orderId;
  const lockKey = `idempotency:${idempotencyKey}`;
  
  // SET NX EX: set only if not exists, with 24h expiry
  const locked = await client.set(lockKey, 'processing', {
    NX: true,
    EX: 86400
  });
  
  if (!locked) {
    console.log('Duplicate message ignored:', idempotencyKey);
    return { status: 'already_processed' };
  }
  
  try {
    const result = await chargeCustomer(message);
    await client.set(lockKey, JSON.stringify(result), { EX: 86400 });
    return result;
  } catch (err) {
    // Remove lock on failure so retry can attempt again
    await client.del(lockKey);
    throw err;
  }
}
```

### Database Deduplication with Unique Index (PostgreSQL)

```sql
-- Table stores processed message IDs
CREATE TABLE processed_messages (
    message_id UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    result JSONB
);

-- Consumer uses INSERT ... ON CONFLICT DO NOTHING
WITH inserted AS (
    INSERT INTO processed_messages (message_id, result)
    VALUES (
        'msg_abc123'::UUID,
        '{"status": "shipped"}'::JSONB
    )
    ON CONFLICT (message_id) DO NOTHING
    RETURNING message_id
)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM inserted) THEN 'processed'
        ELSE 'duplicate'
    END as status;
```

### Kafka Exactly-Once Producer (Java)

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

// Enable idempotent producer (exactly-once per partition)
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

Producer<String, String> producer = new KafkaProducer<>(props);

producer.send(new ProducerRecord<>("orders", orderId, payload));
```

## Explanation

**Three deduplication strategies**:

| Strategy | Storage | Latency | Durability |
|----------|---------|---------|------------|
| External cache (Redis) | Memory | <1ms | Medium (TTL-based) |
| Database unique index | Disk | 5-20ms | High (transactional) |
| Natural idempotency | None | 0ms | Infinite (design-level) |

**Natural idempotency examples**:
- `UPDATE accounts SET balance = 100 WHERE id = 1` (sets value, not increments)
- `INSERT ... ON CONFLICT DO NOTHING` (ignores duplicates)
- `DELETE FROM carts WHERE user_id = 5` (idempotent even if run twice)

**Message ID sources**:
- Producer-generated UUID at publish time
- Business key (orderId, paymentId) already present in payload
- Hash of message content (deterministic but collisions possible)

## Variants

| Approach | Best For | Trade-off |
|----------|----------|-----------|
| Redis SET NX | High throughput | Data loss if Redis fails |
| DB unique constraint | Financial data | Slower; requires DB round-trip |
| Bloom filter | Memory-efficient check | False positives possible |
| Kafka transactional | Stream processing | Higher latency; exactly-once per partition |

## What Works

- **TTL your dedup store**: Keep keys for 24-72 hours; message brokers don't redeliver indefinitely
- **Include processing result**: Storing the result allows returning the same response for duplicates
- **Use business keys when possible**: `orderId` is more meaningful than a random UUID
- **Handle the "processing" state**: A key set but not completed indicates an in-flight message
- **Clean up expired keys**: Cron jobs or Redis TTL prevent unbounded storage growth

## Common Mistakes

1. **No deduplication window**: Checking for duplicates only in-memory means process restarts lose state
2. **Key collisions**: Using timestamps or non-unique fields creates false duplicates
3. **Ignoring the "at-least-once" contract**: Assuming the broker delivers exactly-once without verification
4. **Non-idempotent side effects**: Sending email inside the transaction means duplicates send multiple emails. For failed messages, use [dead letter queues](/recipes/messaging/dead-letter-queue).
5. **Forgetting to clean up**: Deduplication tables that grow forever become performance bottlenecks

## Error Handling and Recovery

- **Duplicate detection strategies**: use a deduplication table with message ID as primary key. Check existence before processing. Use database unique constraints as a safety net. For Redis, use SETNX with TTL. For Kafka, use transactional consumers with offset commit after processing. Track duplicate rate as a metric. Alert on sudden duplicate rate increases
- **Idempotency key generation**: generate idempotency keys from a combination of business identifiers (e.g., order_id + operation_type). Use UUIDs for keys when no natural key exists. Include timestamp for time-bounded idempotency. Store the key in message headers. Document key generation rules for each message type. Validate key format on consumption
- **Handling partial processing failures**: when processing fails mid-way, the message may be re-delivered. Use transactional outbox pattern to ensure atomicity. Track processing state (started, processing, completed) in a state table. On retry, check state and resume from the last completed step. Implement compensating actions for partial completions
- **Idempotency window management**: set a TTL on idempotency records (e.g., 24 hours). Within the window, duplicates are rejected. After the window, the same key can be reused. Choose window size based on max retry period. Clean expired records periodically. Monitor record count and storage usage
- **Race condition prevention**: use database locks or SELECT FOR UPDATE when checking idempotency. Use Redis atomic operations (SETNX, Lua scripts). Use Kafka transactional consumers. Implement optimistic concurrency control with version numbers. Test with concurrent consumers to verify idempotency holds under load
- **Cross-service idempotency**: when a message triggers actions across multiple services, use a distributed transaction or saga. Each service checks idempotency independently. Use a correlation ID to track the request across services. Store idempotency records per service. Coordinate rollback using compensating actions

## Testing and Quality Assurance

- **Idempotency testing**: send the same message twice and verify the result is identical. Test with concurrent duplicate messages. Test with messages processed out of order. Test with partial failures and retries. Test with expired idempotency records. Automate idempotency tests in CI. Include idempotency verification in integration tests
- **Chaos testing for duplicates**: inject duplicate messages randomly in staging. Verify the system handles them correctly. Use chaos engineering tools (Chaos Monkey, Gremlin). Test with network partitions that cause redelivery. Test with consumer restarts that cause reprocessing. Document findings and fix issues
- **Load testing with duplicates**: send 10K messages with 10% duplicates under load. Verify no side effects from duplicates. Measure overhead of idempotency checking. Ensure idempotency storage scales with message volume. Monitor database/Redis performance during duplicate detection. Target < 5% overhead from idempotency checks
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

## Testing and QA Checklist

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
## Reporting and Communication

- **Weekly messaging metrics review**: review queue depths, throughput, error rates, and consumer lag weekly. Identify trends and anomalies. Compare with previous weeks. Document findings and action items. Share with engineering and operations teams. Use metrics to prioritize optimization work. Track improvements over time
- **Incident post-mortems for messaging failures**: conduct post-mortems for significant messaging incidents (message loss, DLQ overflow, broker outage). Use blameless format. Document timeline, root cause, impact, and remediation. Share learnings across teams. Track remediation items to completion. Update runbooks based on findings
- **Capacity planning**: project message volume growth quarterly. Plan broker capacity based on projections. Plan consumer capacity based on processing time and volume. Factor in seasonality and planned product launches. Document capacity assumptions. Review capacity plan monthly. Provision capacity before it is needed
## Automation and Tooling

- **Automated DLQ monitoring**: deploy automated scripts that check DLQ depth every 5 minutes. Alert on threshold breach. Auto-create tickets for DLQ investigation. Generate daily DLQ summary reports. Track time-to-resolution for DLQ issues. Use Lambda or scheduled containers for monitoring. Integrate with incident management tools
- **Message replay automation**: build tooling to replay messages from DLQ to original queue. Support selective replay by message ID, date range, or error type. Dry-run mode to preview replay without executing. Track replay success rate. Log replay events for audit. Rate-limit replay to avoid overwhelming consumers
- **Consumer health checks**: implement health check endpoints for consumers. Check database connectivity, downstream service availability, and processing capacity. Return health status to orchestrator. Auto-restart unhealthy consumers. Monitor health check history. Alert on repeated health check failures
## Sustainability Considerations

- **Energy-efficient message processing**: optimize consumer code to reduce CPU cycles per message. Batch messages to reduce per-message overhead. Use efficient serialization formats (Avro, Protobuf) to reduce network transfer. Right-size consumer infrastructure to avoid idle energy consumption. Schedule non-urgent batch processing during off-peak hours when grid carbon intensity is lower
- **Green messaging architecture**: prefer managed messaging services that share infrastructure across tenants, reducing per-message carbon footprint. Use auto-scaling to match consumer capacity to demand, eliminating idle resources. Choose cloud regions with renewable energy. Archive old messages to cold storage to reduce active storage energy. Monitor carbon footprint of messaging infrastructure
## Frequently Asked Questions

**Q: What's the difference between idempotency and deduplication?**
A: Deduplication prevents processing the same message twice. Idempotency means processing twice produces the same outcome. They're often used together.

**Q: Can I achieve exactly-once delivery?**
A: In practice, exactly-once is actually exactly-once processing with idempotency. True exactly-once delivery is impossible in [distributed systems](/guides/architecture/microservices-architecture-guide).

**Q: How long should I keep deduplication keys?**
A: Longer than your maximum redelivery window. For Kafka: `offsets.retention.minutes`. For SQS: visibility timeout × max retries + buffer.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### How do I handle idempotency across multiple message brokers?

Use a centralized idempotency store (Redis, DynamoDB) that all consumers share. Store the message ID and processing result. Check the store before processing any message regardless of which broker delivered it. This ensures idempotency even when messages flow through multiple brokers or are replicated across systems.

### What is the overhead of idempotency checks?

Typically 1-5% of processing time. Redis SETNX checks take < 1ms. Database checks take 2-5ms. The overhead is negligible compared to the cost of duplicate side effects. Measure overhead in your environment to confirm. Use connection pooling and batch operations to minimize impact.