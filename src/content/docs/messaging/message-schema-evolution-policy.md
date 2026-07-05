---
contentType: docs
slug: message-schema-evolution-policy
templateType: api-deprecation
title: "Message Schema Evolution Policy"
description: "Policy for evolving message schemas safely in event-driven systems: backward and forward compatibility rules, schema registry usage, versioning strategies, migration procedures, and breaking change handling with Avro, Protobuf, and JSON examples."
metaDescription: "Message schema evolution policy: backward and forward compatibility, schema registry, versioning, migration, breaking changes with Avro, Protobuf, JSON examples."
difficulty: advanced
topics:
  - messaging
tags:
  - schema-evolution
  - messaging
  - avro
  - protobuf
  - schema-registry
  - compatibility
relatedResources:
  - /docs/messaging/kafka-topic-naming-convention-template
  - /docs/messaging/rabbitmq-queue-design-template
  - /docs/messaging/dead-letter-queue-runbook
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Message schema evolution policy: backward and forward compatibility, schema registry, versioning, migration, breaking changes with Avro, Protobuf, JSON examples."
  keywords:
    - schema evolution
    - schema registry
    - backward compatibility
    - forward compatibility
    - avro schema
    - protobuf evolution
    - message versioning
---

## Overview

This policy defines rules for evolving message schemas in event-driven systems. Schema evolution without governance leads to consumer breakages, data loss, and production incidents. This document covers compatibility rules, schema registry usage, versioning strategies, and migration procedures for Avro, Protobuf, and JSON schemas.

---

## 1. Compatibility Types

### 1.1 Compatibility Definitions

```text
Compatibility type   | Old consumer reads new schema | New consumer reads old schema
─────────────────────┼───────────────────────────────┼───────────────────────────────
Backward             | Yes                            | No
Forward              | No                             | Yes
Full                 | Yes                            | Yes
None (breaking)      | No                             | No
```

### 1.2 Default Policy

- **Backward compatibility** is the default for all new schemas
- **Full compatibility** is required for topics with multiple consumer groups
- **Breaking changes** require a new topic with versioned name (e.g., `v1` to `v2`)
- All schema changes must be registered in the schema registry before deployment

---

## 2. Backward-Compatible Changes

### 2.1 Allowed Changes (No Migration Needed)

```text
Change                          | Avro | Protobuf | JSON Schema
────────────────────────────────┼──────┼──────────┼────────────
Add optional field              | Yes  | Yes      | Yes
Remove field with default       | Yes  | Yes      | Yes
Add default to existing field   | Yes  | N/A      | Yes
Widen numeric type (int→long)   | Yes  | Yes      | N/A
Add new enum symbol             | No*  | Yes      | Yes
Rename field (with alias)       | Yes  | No       | No
```

### 2.2 Avro Example — Adding Optional Field

```json
// v1 — original schema
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "amount", "type": "double"}
  ]
}

// v2 — backward compatible (added optional field with default)
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "currency", "type": ["null", "string"], "default": null}
  ]
}
```

### 2.3 Protobuf Example — Adding Optional Field

```protobuf
// v1
message OrderCreated {
  string order_id = 1;
  string customer_id = 2;
  double amount = 3;
}

// v2 — backward compatible (added optional field)
message OrderCreated {
  string order_id = 1;
  string customer_id = 2;
  double amount = 3;
  optional string currency = 4;  // new field, optional
}
```

---

## 3. Breaking Changes

### 3.1 Breaking Change List

```text
Change                          | Impact                    | Required action
────────────────────────────────┼───────────────────────────┼──────────────────────
Remove required field           | Consumers fail            | New topic version
Change field type               | Deserialization fails     | New topic version
Rename field without alias      | Consumers can't find data | New topic version
Change field order (Protobuf)   | Wire incompatibility      | New topic version
Reuse retired field number      | Data corruption           | New topic version
Change namespace/package        | Schema mismatch           | New topic version
```

### 3.2 Breaking Change Process

```text
1. Create new topic with versioned name (e.g., prod.orders.order-created.v2)
2. Register new schema in schema registry
3. Producer dual-writes to both v1 and v2 topics
4. Migrate consumers one at a time to v2 topic
5. Monitor v1 topic for remaining consumers
6. After all consumers migrated, stop producing to v1
7. Set v1 topic retention to expire (30-day grace period)
8. Delete v1 topic after retention period
```

---

## 4. Schema Registry

### 4.1 Confluent Schema Registry

```bash
# Register a new schema
curl -X POST \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schema": "{\"type\":\"record\",\"name\":\"OrderCreated\",\"fields\":[{\"name\":\"orderId\",\"type\":\"string\"}]}"}' \
  http://schema-registry:8081/subjects/prod.orders.order-created.v1-value/versions

# Check compatibility of a new schema version
curl -X POST \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schema": "{\"type\":\"record\",\"name\":\"OrderCreated\",\"fields\":[{\"name\":\"orderId\",\"type\":\"string\"},{\"name\":\"amount\",\"type\":\"double\",\"default\":0.0}]}"}' \
  http://schema-registry:8081/compatibility/subjects/prod.orders.order-created.v1-value/versions/latest

# Get latest schema
curl http://schema-registry:8081/subjects/prod.orders.order-created.v1-value/versions/latest
```

### 4.2 Compatibility Configuration

```bash
# Set backward compatibility (default)
curl -X PUT \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"compatibility": "BACKWARD"}' \
  http://schema-registry:8081/config/prod.orders.order-created.v1-value

# Set full compatibility for multi-consumer topics
curl -X PUT \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"compatibility": "FULL"}' \
  http://schema-registry:8081/config/prod.orders.order-created.v1-value
```

### 4.3 Producer Configuration

```python
from confluent_kafka import Producer, SerializingProducer
from confluent_kafka.serialization import StringSerializer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer

schema_registry_client = SchemaRegistryClient({
    'url': 'http://schema-registry:8081',
})

avro_serializer = AvroSerializer(
    schema_registry_client,
    order_created_schema_str,
    lambda obj, ctx: obj,  # to_dict function
)

producer = SerializingProducer({
    'bootstrap.servers': 'kafka:9092',
    'key.serializer': StringSerializer('utf_8'),
    'value.serializer': avro_serializer,
})

# Producing — schema is validated against registry
producer.produce(
    topic='prod.orders.order-created.v1',
    key=str(order.order_id),
    value=order,
)
```

### 4.4 Consumer Configuration

```python
from confluent_kafka import DeserializingConsumer
from confluent_kafka.schema_registry.avro import AvroDeserializer

avro_deserializer = AvroDeserializer(
    schema_registry_client,
    lambda obj, ctx: obj,  # from_dict function
)

consumer = DeserializingConsumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'payment-service',
    'key.deserializer': StringSerializer('utf_8'),
    'value.deserializer': avro_deserializer,
    'auto.offset.reset': 'earliest',
})

consumer.subscribe(['prod.orders.order-created.v1'])
```

---

## 5. Versioning Strategy

### 5.1 Schema Versioning Rules

```text
Rule                              | Action
──────────────────────────────────┼──────────────────────────────────────
Backward-compatible change        | Increment schema version in registry
Breaking change                   | Create new topic with version suffix
Field deprecation                 | Mark as deprecated, remove in next major
Schema namespace change           | New topic, full migration
```

### 5.2 Field Deprecation

```json
// Avro — deprecate a field (keep in schema, mark deprecated)
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "amount", "type": "double"},
    {
      "name": "legacyPaymentMethod",
      "type": ["null", "string"],
      "default": null,
      "doc": "DEPRECATED — use paymentMethods array instead. Removed in v3."
    }
  ]
}
```

```protobuf
// Protobuf — deprecate a field
message OrderCreated {
  string order_id = 1;
  string customer_id = 2;
  double amount = 3;
  string legacy_payment_method = 4 [deprecated = true];  // removed in v3
  repeated string payment_methods = 5;  // replacement
}
```

---

## 6. Migration Procedures

### 6.1 Dual-Write Migration

```python
# Producer dual-writes to v1 and v2 during migration
class OrderProducer:
    def __init__(self, producer):
        self.producer = producer
        self.v1_topic = 'prod.orders.order-created.v1'
        self.v2_topic = 'prod.orders.order-created.v2'

    def publish(self, order):
        # Write to v1 (old consumers still reading)
        self.producer.produce(
            topic=self.v1_topic,
            key=order.order_id,
            value=order.to_v1_dict(),
        )

        # Write to v2 (new consumers reading)
        self.producer.produce(
            topic=self.v2_topic,
            key=order.order_id,
            value=order.to_v2_dict(),
        )
```

### 6.2 Consumer Migration Checklist

```text
- [ ] New schema registered in schema registry
- [ ] v2 topic created with correct partitions and retention
- [ ] Producer dual-writing to v1 and v2
- [ ] Consumer code updated to read v2 schema
- [ ] Consumer deployed and reading from v2 topic
- [ ] Consumer lag on v2 is zero (caught up)
- [ ] v1 consumer removed from consumer group
- [ ] Monitor v1 topic for any remaining consumers
- [ ] Stop dual-write to v1 after all consumers migrated
- [ ] Set v1 retention to expire (30-day grace period)
- [ ] Delete v1 topic after grace period
```

## FAQ

### What is the difference between backward and forward compatibility?

Backward compatibility means old consumers can read messages produced with the new schema (e.g., adding an optional field). Forward compatibility means new consumers can read messages produced with the old schema (e.g., a new consumer handles the absence of a newly added field). Full compatibility requires both. Use backward compatibility as the default since producers typically deploy before consumers. Use full compatibility when you cannot control deployment order.

### How do I handle schema changes in Protobuf?

Protobuf is designed for evolution. You can add new optional fields without breaking compatibility. Never change field numbers — they are part of the wire format. Never reuse field numbers from removed fields. Use `reserved` keywords for retired field numbers. Adding enum values is safe in Protobuf (unlike Avro). Changing field types is only safe if the wire types are compatible (e.g., int32 to int64).

### What happens if a schema change fails compatibility check?

The schema registry rejects the new schema version. The producer cannot serialize messages with the new schema. This prevents incompatible messages from reaching consumers. You must either make the change backward-compatible or create a new topic with a versioned name. Never bypass the schema registry or force-register an incompatible schema — this will break consumers silently.

### How long should I keep the old topic during migration?

Keep the old topic for at least 30 days after all consumers have migrated. This provides a grace period for rollback if issues are discovered with the new schema. Set the old topic retention to expire messages during this period to save storage. After the grace period with no issues, delete the old topic. Monitor the old topic for any unexpected consumer groups that may have been missed during migration.

### Should I use Avro, Protobuf, or JSON for message schemas?

Use Avro if you use the Confluent ecosystem and want tight schema registry integration with backward compatibility enforcement. Use Protobuf if you use gRPC or prefer a compact binary format with built-in evolution support. Use JSON Schema if you need human-readable messages and your throughput is low. Avro and Protobuf are both compact and efficient. JSON is easier to debug but larger on the wire. Choose one and standardize across your organization.
