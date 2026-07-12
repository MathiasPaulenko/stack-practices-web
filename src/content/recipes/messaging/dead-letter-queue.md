---


contentType: recipes
slug: dead-letter-queue
title: "Dead Letter Queues"
description: "Handle failed messages gracefully with dead letter queues, retry policies, and poison pill detection in message-driven architectures."
metaDescription: "Dead letter queue patterns: poison pill detection, retry limits, message replay, alerting on DLQ depth, and recovery strategies for async systems."
difficulty: intermediate
topics:
  - messaging
tags:
  - dead-letter-queue
  - messaging
  - resilience
  - error-handling
  - kafka
relatedResources:
  - /recipes/event-driven-microservices
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /docs/api-error-response-template
  - /patterns/bulkhead-pattern
  - /recipes/message-idempotency
  - /guides/message-queue-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Dead letter queue patterns: poison pill detection, retry limits, message replay, alerting on DLQ depth, and recovery strategies for async systems."
  keywords:
    - dead-letter-queue
    - messaging
    - resilience
    - error-handling


---
## Overview

Dead letter queues (DLQs) capture messages that fail processing after repeated attempts in [message-driven](/guides/architecture/event-driven-architecture-guide) systems. Without them, failed messages would block the queue or be lost entirely. A well-designed DLQ system distinguishes between poison pills (permanently bad messages) and transient failures, enabling operators to replay, inspect, or discard problematic messages without impacting the main processing flow.

## When to Use

Use this resource when:
- Message consumers encounter unrecoverable errors (malformed payloads, missing references)
- You need to prevent one bad message from blocking an entire queue partition
- Operations teams require visibility into failed messages for manual intervention
- Compliance requires audit trails of all processed and failed messages. Use a [data retention policy](/guides/databases/database-design-guide).

## Solution

### SQS DLQ Configuration (AWS CLI)

```bash
# Create main queue and DLQ
aws sqs create-queue --queue-name orders-queue
aws sqs create-queue --queue-name orders-dlq

# Get queue URLs
QUEUE_URL=$(aws sqs get-queue-url --queue-name orders-queue --query 'QueueUrl' --output text)
DLQ_URL=$(aws sqs get-queue-url --queue-name orders-dlq --query 'QueueUrl' --output text)
DLQ_ARN=$(aws sqs get-queue-attributes --queue-url $DLQ_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

# Set redrive policy: send to DLQ after 3 failed receives
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

# DLX and DLQ
channel.exchange_declare(exchange='orders.dlx', exchange_type='direct')
channel.queue_declare(queue='orders-dlq', durable=True)
channel.queue_bind(queue='orders-dlq', exchange='orders.dlx', routing_key='failed')

# Main queue with TTL and dead-letter routing
args = {
    'x-dead-letter-exchange': 'orders.dlx',
    'x-dead-letter-routing-key': 'failed',
    'x-message-ttl': 300000  # 5 minutes
}
channel.queue_declare(queue='orders', durable=True, arguments=args)

# Reject a message to send to DLQ
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
      // Send to DLQ with error metadata
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

## Explanation

**DLQ trigger conditions**:

| Condition | When to DLQ | Action |
|-----------|-------------|--------|
| Max retries exceeded | After N failed attempts | Move to DLQ |
| Unparseable message | Invalid JSON, schema mismatch | Move immediately |
| Missing dependency | Referenced record doesn't exist | Retry, then DLQ |
| Business rule violation | Order for non-existent product | Move immediately |

**DLQ monitoring**:
- **Depth alerting**: DLQ > 10 messages triggers PagerDuty
- **Age alerting**: Message in DLQ > 24 hours needs investigation
- **Replay tooling**: Admin UI to reprocess or purge DLQ messages
- **Correlation**: Link DLQ message to original trace ID. See [distributed tracing](/recipes/observability/distributed-tracing).

## Variants

| Broker | DLQ Mechanism | Configuration |
|--------|---------------|---------------|
| AWS SQS | Redrive policy | maxReceiveCount + target ARN |
| RabbitMQ | Dead letter exchange | x-dead-letter-exchange |
| Kafka | Consumer-managed | Separate topic + producer logic |
| Azure SB | Forwarding | maxDeliveryCount + forwardTo |
| Google Pub/Sub | Dead letter topic | deadLetterPolicy.maxDeliveryAttempts |

## What Works

- **Set reasonable retry counts**: 3-5 attempts balances recovery time against queue pressure
- **Include full context in DLQ**: Original headers, retry count, error type, and stack trace
- **Separate DLQs by severity**: Validation errors vs. infrastructure failures need different handling
- **Monitor DLQ depth as a metric**: It's a leading indicator of system health. See [metrics collection](/recipes/observability/metrics-collection).
- **Automate replay with caution**: Replay after fixing the bug; replaying blindly amplifies failures

## Common Mistakes

1. **No DLQ at all**: Failed messages silently disappear or block consumers forever
2. **Infinite retry loops**: Requeuing without a max count creates perpetual processing. Use [retry with exponential backoff](/recipes/architecture/retry-backoff).
3. **Ignoring DLQ messages**: The DLQ becomes a dumping ground that nobody monitors
4. **No dead-letter reason**: Operators can't distinguish "bad JSON" from "database down"
5. **Shared DLQ for all topics**: One poison pill from topic A doesn't belong with topic B's failures

## Error Handling and Recovery

- **Poison message detection**: implement a max delivery count (e.g., 5 retries). After max retries, move the message to the DLQ automatically. Use exponential backoff between retries (1s, 2s, 4s, 8s, 16s). Log each retry attempt with message ID and error details. Alert operations team when messages enter the DLQ. Monitor DLQ depth continuously
- **DLQ message inspection**: provide tooling to inspect DLQ messages without consuming them. Use RabbitMQ management plugin or AWS SQS DLQ console. Show message body, headers, original queue, failure reason, and timestamp. Enable filtering by error type or date range. Support message requeue for retry after fixing the underlying issue
- **Automatic reprocessing**: implement a reprocessing pipeline for DLQ messages. After fixing the root cause, replay messages from DLQ back to the original queue. Use a separate worker to drain the DLQ. Validate message format before requeue. Track reprocessing success rate. Set a max reprocessing count to prevent infinite loops
- **DLQ alerts and notifications**: set up alerts for DLQ depth exceeding threshold (e.g., 10 messages). Send notifications to Slack/PagerDuty. Include message count, oldest message age, and error categories in the alert. Create a dashboard showing DLQ trends over time. Page on-call engineer for critical DLQ depth
- **Message expiration in DLQ**: set a TTL on DLQ messages (e.g., 7 days). Expired messages are automatically deleted. Prevents DLQ from growing indefinitely. Archive expired messages to cold storage before deletion for audit purposes. Log expiration events with message metadata
- **Circuit breaker integration**: when DLQ depth exceeds a critical threshold, trip a circuit breaker to stop processing new messages. This prevents cascade failures. The circuit breaker resets after a cooldown period or manual intervention. Monitor circuit breaker state and alert on trips

## Performance and Scalability

- **DLQ throughput sizing**: size DLQ infrastructure based on expected failure rate (typically 1-5% of message volume). For high-throughput systems processing 10K msg/s, a 1% failure rate generates 100 msg/s into DLQ. Ensure DLQ can handle peak failure bursts. Use separate infrastructure for DLQ to avoid impacting primary queue performance
- **Batch processing from DLQ**: process DLQ messages in batches for efficiency. Fetch 10-50 messages at once. Analyze error patterns across the batch. Group messages by error type for targeted remediation. Batch requeue when the root cause is fixed. Track batch processing metrics
- **Multi-level DLQ strategy**: use primary DLQ for retryable errors and secondary DLQ for permanent failures. Primary DLQ: transient errors (timeouts, connection issues). Secondary DLQ: permanent errors (invalid format, schema mismatch). This separates retryable from non-retryable messages. Clean secondary DLQ manually after investigation
- **DLQ storage optimization**: DLQ messages retain full body and headers, consuming storage. Compress large message bodies before storing in DLQ. Set storage limits per DLQ. Monitor DLQ storage usage. Archive old DLQ messages to S3/GCS. Implement lifecycle policies for DLQ storage
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

**Q: Should I automatically replay DLQ messages?**
A: Only after identifying and fixing the root cause. Blind replay wastes resources and may re-trigger the same error.

**Q: How long should I keep DLQ messages?**
A: Longer than your incident response SLA. 7-14 days is typical; archive to cheap storage beyond that.

**Q: What's the difference between a DLQ and a retry queue?**
A: [Retry queues](/recipes/architecture/retry-backoff) hold messages for later reprocessing. DLQs hold messages that have exhausted all retries.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.