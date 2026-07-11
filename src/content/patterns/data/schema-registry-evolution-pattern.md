---
contentType: patterns
slug: schema-registry-evolution-pattern
title: "Schema Registry Evolution"
description: "How to manage schema versions for streaming pipelines with a schema registry. Covers Avro, backward compatibility, forward compatibility, and consumer migration."
metaDescription: "Manage schema versions for streaming pipelines with a schema registry. Learn Avro, backward and forward compatibility, evolution rules, and consumer migration."
difficulty: advanced
topics:
  - data
tags:
  - data
  - schema
  - avro
  - kafka
  - streaming
  - pattern
category: architectural
relatedResources:
  - /patterns/cdc-change-data-capture-pattern
  - /patterns/etl-extract-transform-load-pattern
  - /patterns/data-lineage-tracking-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Manage schema versions for streaming pipelines with a schema registry. Learn Avro, backward and forward compatibility, evolution rules, and consumer migration."
  keywords:
    - data
    - schema
    - avro
    - kafka
    - streaming
    - pattern
---

## Overview

A schema registry stores and versions schemas for streaming data. Producers register schemas before writing messages; consumers fetch schemas to deserialize them. The registry enforces compatibility rules — backward, forward, full — so schema changes don't break consumers. When a producer sends a message with a new schema version, the registry validates it against the previous version and rejects incompatible changes. This is critical in Kafka pipelines where producers and consumers deploy independently. Avro, Protobuf, and JSON Schema are the most common schema formats used with Confluent Schema Registry.

## When to Use

- Kafka or Pulsar pipelines with multiple producers and consumers
- Streaming data where producers and consumers deploy independently
- Data contracts between teams that need enforcement
- CDC pipelines where source schema changes must be controlled
- Event-driven architectures where event formats evolve over time

## When NOT to Use

- Static data with no schema changes — no versioning needed
- Internal systems where producer and consumer always deploy together
- Simple JSON pipelines where schema flexibility is acceptable
- Protobuf with gRPC — gRPC already handles schema evolution via code generation

## Solution

### Avro schema definition

```json
// customer-v1.avsc — Avro schema for customer events (v1)
{
  "type": "record",
  "name": "Customer",
  "namespace": "com.shop.events",
  "fields": [
    {"name": "id", "type": "long", "doc": "Customer ID"},
    {"name": "email", "type": "string", "doc": "Customer email"},
    {"name": "status", "type": {"type": "enum", "name": "Status", "symbols": ["active", "inactive", "banned"]}},
    {"name": "created_at", "type": {"type": "long", "logicalType": "timestamp-millis"}}
  ]
}
```

```json
// customer-v2.avsc — Avro schema v2 (backward compatible)
{
  "type": "record",
  "name": "Customer",
  "namespace": "com.shop.events",
  "fields": [
    {"name": "id", "type": "long", "doc": "Customer ID"},
    {"name": "email", "type": "string", "doc": "Customer email"},
    {"name": "status", "type": {"type": "enum", "name": "Status", "symbols": ["active", "inactive", "banned", "suspended"]}},
    {"name": "created_at", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "phone", "type": ["null", "string"], "default": null, "doc": "Phone number (added in v2)"},
    {"name": "country", "type": "string", "default": "US", "doc": "Country code (added in v2)"}
  ]
}
```

### Register schema with Confluent Schema Registry

```python
# register_schema.py — register Avro schema with Schema Registry
import requests
import json

SCHEMA_REGISTRY_URL = "http://localhost:8081"

def register_schema(subject, schema_file):
    with open(schema_file) as f:
        schema = json.load(f)

    response = requests.post(
        f"{SCHEMA_REGISTRY_URL}/subjects/{subject}/versions",
        headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
        json={"schema": json.dumps(schema)}
    )

    if response.status_code == 200:
        version = response.json()["version"]
        schema_id = response.json()["id"]
        print(f"Registered {subject} v{version} (ID: {schema_id})")
        return schema_id
    else:
        print(f"Failed: {response.status_code} - {response.text}")
        response.raise_for_status()

# Register v1 and v2
register_schema("customer-events-value", "customer-v1.avsc")
register_schema("customer-events-value", "customer-v2.avsc")
```

### Python producer with Avro and Schema Registry

```python
# avro_producer.py — Kafka producer with Avro serialization
from confluent_kafka import Producer, SerializingProducer
from confluent_kafka.serialization import StringSerializer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
import json

schema_registry_client = SchemaRegistryClient({"url": "http://localhost:8081"})

with open("customer-v2.avsc") as f:
    schema_str = json.dumps(json.load(f))

avro_serializer = AvroSerializer(
    schema_registry_client,
    schema_str,
    lambda obj, ctx: obj  # identity serializer
)

producer = SerializingProducer({
    "bootstrap.servers": "localhost:9092",
    "key.serializer": StringSerializer("utf_8"),
    "value.serializer": avro_serializer,
})

def delivery_report(err, msg):
    if err:
        print(f"Delivery failed: {err}")
    else:
        print(f"Delivered to {msg.topic()} [{msg.partition()}] at offset {msg.offset()}")

# Send a customer event
customer_event = {
    "id": 42,
    "email": "alice@example.com",
    "status": "active",
    "created_at": 1783305600000,
    "phone": "555-1234",
    "country": "US"
}

producer.produce(
    topic="customer-events",
    key=str(customer_event["id"]),
    value=customer_event,
    on_delivery=delivery_report
)
producer.flush()
```

### Python consumer with Avro and Schema Registry

```python
# avro_consumer.py — Kafka consumer with Avro deserialization
from confluent_kafka import DeserializingConsumer
from confluent_kafka.serialization import StringDeserializer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer

schema_registry_client = SchemaRegistryClient({"url": "http://localhost:8081"})

avro_deserializer = AvroDeserializer(schema_registry_client)

consumer = DeserializingConsumer({
    "bootstrap.servers": "localhost:9092",
    "group.id": "customer-processor",
    "auto.offset.reset": "earliest",
    "key.deserializer": StringDeserializer("utf_8"),
    "value.deserializer": avro_deserializer,
})

consumer.subscribe(["customer-events"])

while True:
    msg = consumer.poll(1.0)
    if msg is None:
        continue
    if msg.error():
        print(f"Consumer error: {msg.error()}")
        continue

    customer = msg.value()
    print(f"Received: id={customer['id']}, email={customer['email']}, status={customer['status']}")

    # v1 consumers won't have 'phone' or 'country' — they get defaults
    phone = customer.get("phone", "N/A")
    country = customer.get("country", "US")
    print(f"  phone={phone}, country={country}")

    consumer.commit(msg)
```

### Compatibility rules

```python
# compatibility.py — configure and check compatibility
import requests

SCHEMA_REGISTRY_URL = "http://localhost:8081"

# Set compatibility for a subject
def set_compatibility(subject, level):
    """Levels: NONE, BACKWARD, FORWARD, FULL, BACKWARD_TRANSITIVE, FORWARD_TRANSITIVE, FULL_TRANSITIVE"""
    response = requests.put(
        f"{SCHEMA_REGISTRY_URL}/config/{subject}",
        json={"compatibility": level}
    )
    print(f"Set {subject} compatibility to {level}: {response.status_code}")

# BACKWARD: new schema can read old data (safe for adding optional fields)
set_compatibility("customer-events-value", "BACKWARD")

# FORWARD: old schema can read new data (safe for removing optional fields)
set_compatibility("order-events-value", "FORWARD")

# FULL: both backward and forward (most restrictive)
set_compatibility("payment-events-value", "FULL")

# Check if a new schema is compatible
def check_compatibility(subject, schema_file, version="latest"):
    with open(schema_file) as f:
        schema = json.load(f)

    response = requests.post(
        f"{SCHEMA_REGISTRY_URL}/compatibility/subjects/{subject}/versions/{version}",
        headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
        json={"schema": json.dumps(schema)}
    )

    result = response.json()
    if result.get("is_compatible"):
        print(f"✅ Schema is compatible with {subject} {version}")
    else:
        print(f"❌ Schema is NOT compatible:")
        for msg in result.get("messages", []):
            print(f"  - {msg}")
    return result
```

### Java producer with Confluent SerDes

```java
// CustomerProducer.java — Kafka producer with Avro SerDes
import io.confluent.kafka.serializers.KafkaAvroSerializer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class CustomerProducer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class);
        props.put("schema.registry.url", "http://localhost:8081");

        try (var producer = new KafkaProducer<String, Customer>(props)) {
            Customer customer = Customer.newBuilder()
                .setId(42L)
                .setEmail("alice@example.com")
                .setStatus(Status.ACTIVE)
                .setCreatedAt(1783305600000L)
                .setPhone("555-1234")
                .setCountry("US")
                .build();

            producer.send(new ProducerRecord<>("customer-events",
                String.valueOf(customer.getId()), customer), (metadata, e) -> {
                if (e != null) {
                    System.err.println("Send failed: " + e);
                } else {
                    System.out.printf("Sent to %s [%d] offset %d%n",
                        metadata.topic(), metadata.partition(), metadata.offset());
                }
            });
        }
    }
}
```

### Schema evolution rules

```json
// evolution-rules.json — what changes are safe under each compatibility level
{
  "BACKWARD": {
    "description": "New consumers can read old data",
    "safe_changes": [
      "Add optional field with default",
      "Add new enum symbol (consumer ignores unknown)",
      "Remove field (new consumer doesn't expect it)",
      "Add alias to field"
    ],
    "breaking_changes": [
      "Add required field without default",
      "Change field type",
      "Rename field without alias"
    ]
  },
  "FORWARD": {
    "description": "Old consumers can read new data",
    "safe_changes": [
      "Remove optional field",
      "Add new enum symbol (old consumer may not know it)"
    ],
    "breaking_changes": [
      "Add new required field",
      "Change field type",
      "Remove required field that old consumers expect"
    ]
  },
  "FULL": {
    "description": "Both backward and forward compatible",
    "safe_changes": [
      "Add optional field with default",
      "Add alias to field"
    ],
    "breaking_changes": [
      "Any field type change",
      "Remove any field",
      "Add required field"
    ]
  }
}
```

## Variants

### Protobuf schema registry

```protobuf
// customer.proto — Protobuf schema for customer events
syntax = "proto3";
package com.shop.events;

message Customer {
  int64 id = 1;
  string email = 2;
  Status status = 3;
  int64 created_at = 4;
  optional string phone = 5;  // Added in v2
  string country = 6;          // Added in v2, defaults to ""

  enum Status {
    UNKNOWN = 0;
    ACTIVE = 1;
    INACTIVE = 2;
    BANNED = 3;
    SUSPENDED = 4;  // Added in v2
  }
}
```

### Schema with logical types and defaults

```json
// order-v2.avsc — complex schema with unions and defaults
{
  "type": "record",
  "name": "Order",
  "namespace": "com.shop.events",
  "fields": [
    {"name": "id", "type": "long"},
    {"name": "customer_id", "type": "long"},
    {"name": "total", "type": {"type": "bytes", "logicalType": "decimal", "precision": 10, "scale": 2}},
    {"name": "currency", "type": "string", "default": "USD"},
    {"name": "items", "type": {"type": "array", "items": {
      "type": "record", "name": "OrderItem",
      "fields": [
        {"name": "product_id", "type": "long"},
        {"name": "quantity", "type": "int"},
        {"name": "price", "type": {"type": "bytes", "logicalType": "decimal", "precision": 10, "scale": 2}}
      ]
    }}},
    {"name": "shipping_address", "type": ["null", {
      "type": "record", "name": "Address",
      "fields": [
        {"name": "street", "type": "string"},
        {"name": "city", "type": "string"},
        {"name": "zip", "type": "string"}
      ]
    }], "default": null},
    {"name": "placed_at", "type": {"type": "long", "logicalType": "timestamp-millis"}}
  ]
}
```

## Best Practices

- Start with BACKWARD compatibility — it's the safest default. New consumers can read old data.
- Always provide defaults for new fields — `{"name": "phone", "type": ["null", "string"], "default": null}`
- Use aliases for field renames — `{"name": "email_address", "type": "string", "aliases": ["email"]}` lets old consumers read new data
- Never change field types — create a new field with the new type and deprecate the old one
- Version your subjects — use `customer-events-value` not just `customer` to distinguish key vs value schemas
- Test compatibility in CI — run `check_compatibility` before merging schema changes
- Document breaking changes — when you must break compatibility, coordinate with all consumers
- Use FULL compatibility for critical events — payment, security events where both directions matter

## Common Mistakes

- **Adding required fields without defaults**: new consumers crash on old data. Always add with a default.
- **Changing field types**: `int` to `long` seems safe but breaks Avro. Create a new field instead.
- **No compatibility check in CI**: schema change passes code review but breaks all consumers in production.
- **Removing fields that consumers depend on**: old consumers still expect the field and fail on new data.
- **Not using a registry at all**: producers and consumers hardcode schemas. Changes require coordinated deploys.

## FAQ

### What is a schema registry?

A centralized service that stores, versions, and validates schemas for streaming data. Producers register schemas before writing; consumers fetch schemas for reading. The registry enforces compatibility rules between versions.

### What is backward compatibility?

A new schema can read data written with the previous schema. This means you can add optional fields with defaults, remove fields, or add enum symbols. New consumers won't break on old data.

### What is forward compatibility?

An old schema can read data written with the new schema. This means you can remove optional fields or add enum symbols. Old consumers won't break on new data.

### Should I use Avro, Protobuf, or JSON Schema?

Avro is the most common with Kafka — compact binary format, rich schema evolution rules. Protobuf is better if you already use gRPC. JSON Schema is the simplest but least compact. Choose based on your ecosystem.

### How do I handle breaking schema changes?

Coordinate with all consumers. Create a new subject (e.g., `customer-events-v2-value`), deploy all consumers to handle the new format, then switch producers. Alternatively, use a dual-write period where both old and new formats are produced.
