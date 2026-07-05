---
contentType: docs
slug: message-schema-evolution-policy
templateType: api-deprecation
title: "Politica de Evolucion de Message Schemas"
description: "Politica para evolucionar message schemas de forma segura en event-driven systems: backward y forward compatibility rules, schema registry usage, versioning strategies, migration procedures y breaking change handling con Avro, Protobuf y JSON examples."
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

Esta politica define rules para evolucionar message schemas en event-driven systems. Schema evolution sin governance lleva a consumer breakages, data loss y production incidents. Este documento cubre compatibility rules, schema registry usage, versioning strategies y migration procedures para Avro, Protobuf y JSON schemas.

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

- **Backward compatibility** es el default para all new schemas
- **Full compatibility** es required para topics con multiple consumer groups
- **Breaking changes** requieren un new topic con versioned name (e.g., `v1` a `v2`)
- All schema changes deben ser registered en el schema registry antes de deployment

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

// v2 — backward compatible (added optional field con default)
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
1. Crea new topic con versioned name (e.g., prod.orders.order-created.v2)
2. Registra new schema en schema registry
3. Producer dual-writes a both v1 y v2 topics
4. Migra consumers one at a time a v2 topic
5. Monitora v1 topic para remaining consumers
6. Despues de all consumers migrated, stop producing a v1
7. Setea v1 topic retention a expire (30-day grace period)
8. Deletea v1 topic despues de grace period
```

---

## 4. Schema Registry

### 4.1 Confluent Schema Registry

```bash
# Registra un new schema
curl -X POST \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schema": "{\"type\":\"record\",\"name\":\"OrderCreated\",\"fields\":[{\"name\":\"orderId\",\"type\":\"string\"}]}"}' \
  http://schema-registry:8081/subjects/prod.orders.order-created.v1-value/versions

# Checkea compatibility de un new schema version
curl -X POST \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schema": "{\"type\":\"record\",\"name\":\"OrderCreated\",\"fields\":[{\"name\":\"orderId\",\"type\":\"string\"},{\"name\":\"amount\",\"type\":\"double\",\"default\":0.0}]}"}' \
  http://schema-registry:8081/compatibility/subjects/prod.orders.order-created.v1-value/versions/latest

# Get latest schema
curl http://schema-registry:8081/subjects/prod.orders.order-created.v1-value/versions/latest
```

### 4.2 Compatibility Configuration

```bash
# Setea backward compatibility (default)
curl -X PUT \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"compatibility": "BACKWARD"}' \
  http://schema-registry:8081/config/prod.orders.order-created.v1-value

# Setea full compatibility para multi-consumer topics
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

# Producing — schema se valida contra registry
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
Backward-compatible change        | Increment schema version en registry
Breaking change                   | Crea new topic con version suffix
Field deprecation                 | Marka como deprecated, remove en next major
Schema namespace change           | New topic, full migration
```

### 5.2 Field Deprecation

```json
// Avro — deprecate un field (keep en schema, mark deprecated)
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
// Protobuf — deprecate un field
message OrderCreated {
  string order_id = 1;
  string customer_id = 2;
  double amount = 3;
  string legacy_payment_method = 4 [deprecated = true];  // removed en v3
  repeated string payment_methods = 5;  // replacement
}
```

---

## 6. Migration Procedures

### 6.1 Dual-Write Migration

```python
# Producer dual-writes a v1 y v2 durante migration
class OrderProducer:
    def __init__(self, producer):
        self.producer = producer
        self.v1_topic = 'prod.orders.order-created.v1'
        self.v2_topic = 'prod.orders.order-created.v2'

    def publish(self, order):
        # Write a v1 (old consumers still reading)
        self.producer.produce(
            topic=self.v1_topic,
            key=order.order_id,
            value=order.to_v1_dict(),
        )

        # Write a v2 (new consumers reading)
        self.producer.produce(
            topic=self.v2_topic,
            key=order.order_id,
            value=order.to_v2_dict(),
        )
```

### 6.2 Consumer Migration Checklist

```text
- [ ] New schema registered en schema registry
- [ ] v2 topic creado con correct partitions y retention
- [ ] Producer dual-writing a v1 y v2
- [ ] Consumer code updated para read v2 schema
- [ ] Consumer deployed y reading de v2 topic
- [ ] Consumer lag en v2 es zero (caught up)
- [ ] v1 consumer removed del consumer group
- [ ] Monitora v1 topic para any remaining consumers
- [ ] Stop dual-write a v1 despues de all consumers migrated
- [ ] Setea v1 retention a expire (30-day grace period)
- [ ] Deletea v1 topic despues de grace period
```

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre backward y forward compatibility?

Backward compatibility significa que old consumers pueden read messages produced con el new schema (e.g., adding un optional field). Forward compatibility significa que new consumers pueden read messages produced con el old schema (e.g., un new consumer handlea el absence de un newly added field). Full compatibility requiere ambos. Usa backward compatibility como default ya que producers tipicamente deployean antes que consumers. Usa full compatibility cuando no puedes controlar deployment order.

### ¿Cómo handleo schema changes en Protobuf?

Protobuf esta designed para evolution. Puedes add new optional fields sin breaking compatibility. Nunca cambies field numbers — son part del wire format. Nunca reuses field numbers de removed fields. Usa `reserved` keywords para retired field numbers. Adding enum values es safe en Protobuf (unlike Avro). Changing field types es solo safe si los wire types son compatible (e.g., int32 a int64).

### ¿Qué pasa si un schema change failea compatibility check?

El schema registry rejectea el new schema version. El producer no puede serialize messages con el new schema. Esto previene incompatible messages de reaching consumers. Debes ya sea hacer el change backward-compatible o crear un new topic con un versioned name. Nunca bypasses el schema registry o force-registeres un incompatible schema — esto breakea consumers silently.

### ¿Por cuanto tiempo deberia keepear el old topic durante migration?

Keepea el old topic por al menos 30 days despues de all consumers hayan migrated. Esto provee un grace period para rollback si issues se discovered con el new schema. Setea el old topic retention a expire messages durante este period para save storage. Despues del grace period sin issues, deletea el old topic. Monitora el old topic para any unexpected consumer groups que puedan haber sido missed durante migration.

### ¿Deberia usar Avro, Protobuf o JSON para message schemas?

Usa Avro si usas el Confluent ecosystem y quieres tight schema registry integration con backward compatibility enforcement. Usa Protobuf si usas gRPC o prefieres un compact binary format con built-in evolution support. Usa JSON Schema si necesitas human-readable messages y tu throughput es low. Avro y Protobuf son ambos compact y efficient. JSON es easier de debug pero larger on the wire. Elige uno y standardiza across tu organization.
