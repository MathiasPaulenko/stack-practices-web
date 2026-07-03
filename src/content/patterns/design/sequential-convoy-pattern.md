---
contentType: patterns
slug: sequential-convoy-pattern
title: "Sequential Convoy Pattern"
description: "Preserve message ordering for related messages in a distributed system by grouping them into ordered sequences and processing them one at a time through a single consumer."
metaDescription: "Learn the Sequential Convoy Pattern for preserving message ordering. Examples in Python, Java, and JavaScript with sequence IDs, partition keys, and ordered processing."
difficulty: intermediate
topics:
  - design
  - architecture
  - messaging
tags:
  - sequential-convoy
  - pattern
  - design-pattern
  - messaging
  - ordering
  - sequence
  - kafka
  - queue
relatedResources:
  - /patterns/design/queue-based-load-leveling-pattern
  - /patterns/design/idempotent-consumer-pattern
  - /patterns/design/distributed-lock-pattern
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Learn the Sequential Convoy Pattern for preserving message ordering. Examples in Python, Java, and JavaScript with sequence IDs, partition keys, and ordered processing."
  keywords:
    - sequential convoy
    - design pattern
    - message ordering
    - sequence
    - kafka
    - partition key
    - ordered processing
---

# Sequential Convoy Pattern

## Overview

The Sequential Convoy Pattern preserves the order of related messages in a distributed messaging system. While many message brokers guarantee ordering within a single partition or queue, they typically process unrelated messages in parallel for throughput. When messages have a causal relationship — for example, "create user" followed by "update user" — processing them out of order leads to inconsistent state.

This pattern groups related messages into a **convoy** (a sequence) and ensures they are processed by a single consumer in order. Unrelated convoys can still be processed in parallel, preserving both correctness and throughput.

## When to Use

- Messages for the same entity must be processed in the order they were produced
- Event sourcing where events for an aggregate must be applied sequentially
- Order processing pipelines where status transitions depend on prior states
- Inventory systems where stock movements must be applied chronologically
- Multi-step workflows where step N cannot begin until step N-1 completes

## When to Avoid

- Messages have no causal relationship — parallel processing is simpler and faster
- Strict ordering is not required (e.g., independent analytics events)
- The system can tolerate eventual consistency without ordering guarantees
- Message volumes per convoy are so high that single-consumer processing creates a bottleneck

## Solution

### Python (Kafka with Partition Key)

```python
from kafka import KafkaProducer, KafkaConsumer
from kafka.partitioner import DefaultPartitioner
import json
import time

class OrderedMessageProducer:
    """Produce messages that maintain ordering per entity"""

    def __init__(self, bootstrap_servers):
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            # Partition by entity ID ensures all messages for the same entity
            # go to the same partition, preserving order
            partitioner=lambda key, partitions, topic: (
                hash(key) % len(partitions) if key else 0
            )
        )

    def send_event(self, entity_id: str, event_type: str, payload: dict):
        """Send event with entity_id as partition key"""
        message = {
            'entity_id': entity_id,
            'event_type': event_type,
            'payload': payload,
            'timestamp': time.time(),
            'sequence_number': self._get_next_sequence(entity_id)
        }
        # Using entity_id as key ensures all events for this entity
        # land in the same partition, preserving order
        self.producer.send(
            'entity-events',
            key=entity_id.encode('utf-8'),
            value=message
        )
        self.producer.flush()

    def _get_next_sequence(self, entity_id: str) -> int:
        # In production, use a database or Redis counter
        # This is a simplified example
        return int(time.time() * 1000)

class SequentialConvoyConsumer:
    """Process messages in order per entity"""

    def __init__(self, bootstrap_servers, topic, group_id):
        self.consumer = KafkaConsumer(
            topic,
            bootstrap_servers=bootstrap_servers,
            group_id=group_id,
            auto_offset_reset='earliest',
            # Critical: max one consumer per partition to preserve order
            max_poll_records=1,
            enable_auto_commit=False
        )
        self.pending_sequences: dict = {}
        self.last_processed: dict = {}

    def process_messages(self):
        for message in self.consumer:
            event = json.loads(message.value)
            entity_id = event['entity_id']
            seq_num = event['sequence_number']

            # Ensure in-order processing
            expected_seq = self.last_processed.get(entity_id, 0) + 1

            if seq_num == expected_seq:
                self._process_event(event)
                self.last_processed[entity_id] = seq_num
                self._check_pending(entity_id)
            elif seq_num > expected_seq:
                # Out of order — buffer and wait for missing messages
                self.pending_sequences.setdefault(entity_id, {})[seq_num] = event
                print(f"Buffering out-of-order message {seq_num} for {entity_id}")
            else:
                # Duplicate or already processed
                print(f"Skipping duplicate/late message {seq_num} for {entity_id}")

            self.consumer.commit()

    def _process_event(self, event):
        print(f"Processing {event['event_type']} for {event['entity_id']}")
        # Business logic here

    def _check_pending(self, entity_id):
        """Process any buffered messages that are now in order"""
        pending = self.pending_sequences.get(entity_id, {})
        expected = self.last_processed.get(entity_id, 0) + 1

        while expected in pending:
            event = pending.pop(expected)
            self._process_event(event)
            self.last_processed[entity_id] = expected
            expected += 1

# Usage
producer = OrderedMessageProducer(['localhost:9092'])
producer.send_event('user-123', 'created', {'name': 'Alice'})
producer.send_event('user-123', 'updated', {'name': 'Alice Smith'})
producer.send_event('user-123', 'deleted', {})

consumer = SequentialConvoyConsumer(['localhost:9092'], 'entity-events', 'convoy-group')
consumer.process_messages()
```

### Java (Azure Service Bus Sessions)

```java
import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import com.azure.messaging.servicebus.ServiceBusMessage;
import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.azure.messaging.servicebus.ServiceBusProcessorClient;
import com.azure.messaging.servicebus.models.ServiceBusReceiveMode;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class SequentialConvoyServiceBus {

    private static final String CONNECTION_STRING = "<connection-string>";
    private static final String QUEUE_NAME = "ordered-queue";

    // Producer: uses session ID to group ordered messages
    public static class OrderedProducer {
        private final ServiceBusSenderClient sender;

        public OrderedProducer() {
            this.sender = new ServiceBusClientBuilder()
                .connectionString(CONNECTION_STRING)
                .sender()
                .queueName(QUEUE_NAME)
                .buildClient();
        }

        public void sendOrderedEvents(String entityId, List<DomainEvent> events) {
            for (int i = 0; i < events.size(); i++) {
                ServiceBusMessage message = new ServiceBusMessage(
                    serializeEvent(events.get(i))
                );
                // Session ID ensures all messages with the same ID
                // are processed by the same consumer in order
                message.setSessionId(entityId);
                message.setApplicationProperty("sequenceNumber", i);

                sender.sendMessage(message);
            }
        }
    }

    // Consumer: processes one session at a time, preserving order
    public static class OrderedConsumer {

        public void startProcessing() {
            ServiceBusProcessorClient processor = new ServiceBusClientBuilder()
                .connectionString(CONNECTION_STRING)
                .processor()
                .queueName(QUEUE_NAME)
                .receiveMode(ServiceBusReceiveMode.PEEK_LOCK)
                .processMessage(this::processMessage)
                .processError(this::handleError)
                // Prefetch count 1 ensures strict ordering within session
                .prefetchCount(1)
                .buildProcessorClient();

            processor.start();
        }

        private void processMessage(ServiceBusReceivedMessageContext context) {
            ServiceBusReceivedMessage message = context.getMessage();
            String sessionId = message.getSessionId();
            int sequenceNumber = (int) message.getApplicationProperties()
                .get("sequenceNumber");

            // Process in order — Service Bus guarantees this
            // because only one processor handles a session at a time
            DomainEvent event = deserializeEvent(message.getBody().toString());
            applyEvent(sessionId, event);

            context.complete();
        }

        private void handleError(ServiceBusErrorContext context) {
            System.err.println("Error: " + context.getException().getMessage());
        }
    }
}
```

### JavaScript (Redis Streams with Consumer Groups)

```javascript
const Redis = require('ioredis');

class SequentialConvoyProcessor {
    constructor(redis, streamKey) {
        this.redis = redis;
        this.streamKey = streamKey;
        this.groupName = 'convoy-processors';
    }

    async initialize() {
        try {
            await this.redis.xgroup('CREATE', this.streamKey,
                this.groupName, '0', 'MKSTREAM');
        } catch (err) {
            if (!err.message.includes('already exists')) throw err;
        }
    }

    async produceEvent(entityId, eventType, payload) {
        const sequence = await this.redis.incr(`seq:${entityId}`);

        await this.redis.xadd(this.streamKey, '*',
            'entityId', entityId,
            'sequence', sequence.toString(),
            'eventType', eventType,
            'payload', JSON.stringify(payload)
        );
    }

    async consumeOrdered(consumerId) {
        const results = await this.redis.xreadgroup(
            'GROUP', this.groupName, consumerId,
            'COUNT', 1,
            'BLOCK', 5000,
            'STREAMS', this.streamKey, '>'
        );

        if (!results || results.length === 0) return null;

        const [[, messages]] = results;
        const [id, fields] = messages[0];

        const event = this.parseFields(fields);
        const entityId = event.entityId;
        const sequence = parseInt(event.sequence);

        // Check ordering
        const lastProcessed = await this.redis.get(`last:${entityId}`);
        const expected = lastProcessed ? parseInt(lastProcessed) + 1 : 1;

        if (sequence === expected) {
            await this.processEvent(event);
            await this.redis.set(`last:${entityId}`, sequence);
            await this.redis.xack(this.streamKey, this.groupName, id);
            return event;
        } else if (sequence > expected) {
            // Requeue — will be retried when sequence is complete
            console.log(`Out of order: expected ${expected}, got ${sequence}`);
            return null;
        } else {
            // Duplicate
            await this.redis.xack(this.streamKey, this.groupName, id);
            return null;
        }
    }

    parseFields(fields) {
        const obj = {};
        for (let i = 0; i < fields.length; i += 2) {
            obj[fields[i]] = fields[i + 1];
        }
        return obj;
    }

    async processEvent(event) {
        console.log(`Processing ${event.eventType} for ${event.entityId}`);
        // Business logic
    }
}
```

## Explanation

The pattern relies on two key mechanisms:

1. **Partitioning by entity ID:** Messages for the same entity are routed to the same partition/queue/session. This is done using a partition key (Kafka), session ID (Service Bus), or entity field (Redis).

2. **Single consumer per partition:** Only one consumer processes messages from a given partition at a time. This prevents two consumers from handling different messages for the same entity simultaneously, which would violate ordering.

The trade-off is reduced parallelism per entity — all messages for `user-123` must be processed sequentially. However, messages for `user-456` can be processed in parallel on a different partition.

## Variants

| Variant | Mechanism | Best For |
|---------|-----------|----------|
| **Kafka partition key** | Hash-based partition assignment | High throughput, simple ordering |
| **Service Bus sessions** | Session-aware load balancing | Cloud-native, exactly-once per session |
| **RabbitMQ single active consumer** | Exclusive consumer per queue | Simple queue-based ordering |
| **Database sequence table** | Optimistic locking on sequence numbers | Systems without message broker ordering |
| **Sagas with orchestration** | Explicit step ordering in workflow engine | Complex multi-step business processes |

## What Works

- **Use a deterministic partition key.** The entity ID should consistently map to the same partition. Changing the key invalidates ordering.
- **Monitor partition skew.** If one entity generates 90% of messages, its partition becomes a bottleneck. Consider splitting hot entities.
- **Handle missing messages gracefully.** If sequence N never arrives, the convoy stalls. Implement timeouts and alerts.
- **Keep convoys small.** Long-running convoys hold up new messages. Design for short, bounded sequences.
- **Idempotent processing within convoys.** Even with ordering, retries can cause duplicates. Make individual operations idempotent.

## Common Mistakes

- **Changing partition keys.** Rebalancing Kafka partitions changes which consumer handles which entity, violating ordering assumptions.
- **Multiple consumers per partition.** Two consumers reading the same partition will process messages in parallel for the same entity.
- **Not handling sequence gaps.** A lost message in a sequence blocks all subsequent messages forever.
- **Overly large convoys.** A convoy that processes thousands of messages for one entity creates a hotspot.
- **Ignoring producer retries.** A retried message may be reordered relative to a newer message if not using the same partition key.

## Real-World Examples

### Kafka Partitioning

Kafka guarantees order within a partition. By using the user ID as the partition key, all events for a user are ordered. Uber uses this for trip events: `trip-created`, `driver-assigned`, `trip-started`, `trip-completed` must be processed in order for fare calculation.

### Azure Service Bus Sessions

Service Bus sessions provide FIFO ordering within a session. An e-commerce platform uses sessions per shopping cart: `item-added`, `quantity-changed`, `checkout-initiated`, `payment-received` must be processed sequentially to maintain cart consistency.

### Event Store DB

Event Store DB uses optimistic concurrency control on streams. Each aggregate (e.g., an order) is a stream, and events are appended with expected version numbers. Concurrent writers fail if the stream has been modified, preserving ordering.

## Frequently Asked Questions

**Q: How is this different from just using a single queue?**
A: A single queue forces ALL messages to be sequential, destroying throughput. The convoy pattern only sequences messages for the same entity; different entities process in parallel.

**Q: What happens if a message in the sequence is lost?**
A: The convoy stalls at the gap. Solutions: implement a timeout with alerting, use a dead letter queue for gaps, or design messages to not depend on every intermediate step.

**Q: Can I have multiple consumers for fault tolerance?**
A: Yes — Kafka consumer groups balance partitions across consumers, but each partition is owned by exactly one consumer at a time. If a consumer fails, its partitions are reassigned to another.

**Q: Does this pattern work across regions?**
A: Cross-region ordering is extremely difficult. Most systems accept eventual consistency across regions and use the convoy pattern within a single region.

**Q: How do I handle a consumer that is slow but correct?**
A: Slow consumers delay all messages in their partitions. Solutions: split the entity into sub-entities with different keys, or use a dedicated high-priority consumer for the slow partition.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
