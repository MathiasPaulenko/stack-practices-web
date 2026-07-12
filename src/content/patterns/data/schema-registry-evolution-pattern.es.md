---


contentType: patterns
slug: schema-registry-evolution-pattern
title: "Patrón Schema Registry Evolution"
description: "Cómo manejar schema versions para streaming pipelines con un schema registry. Cubre Avro, backward compatibility, forward compatibility, y consumer migration."
metaDescription: "Maneja schema versions para streaming pipelines con un schema registry. Aprende Avro, backward y forward compatibility, evolution rules, y consumer migration."
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
  - /patterns/batch-to-streaming-bridge-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Maneja schema versions para streaming pipelines con un schema registry. Aprende Avro, backward y forward compatibility, evolution rules, y consumer migration."
  keywords:
    - data
    - schema
    - avro
    - kafka
    - streaming
    - pattern


---

## Overview

Un schema registry storeéa y versionéa schemas para streaming data. Los producers registran schemas antes de writeéar messages; los consumers fetchean schemas para deserializarlos. El registry enforcea compatibility rules — backward, forward, full — para que los schema changes no breakeen consumers. Cuando un producer sendéa un message con un new schema version, el registry validéa contra el previous version y rejectéa incompatible changes. Esto es critical en Kafka pipelines donde producers y consumers deployean independentemente. Avro, Protobuf, y JSON Schema son los schema formats más comunes usados con Confluent Schema Registry.

## When to Use

- Kafka o Pulsar pipelines con múltiples producers y consumers
- Streaming data donde producers y consumers deployean independentemente
- Data contracts entre teams que necesitan enforcement
- CDC pipelines donde source schema changes deben ser controlled
- Event-driven architectures donde event formats evolucionan over time

## When NOT to Use

- Static data sin schema changes — no versioning needed
- Internal systems donde producer y consumer siempre deployean juntos
- Simple JSON pipelines donde schema flexibility es acceptable
- Protobuf con gRPC — gRPC ya handlea schema evolution vía code generation

## Solution

### Avro schema definition

```json
// customer-v1.avsc — Avro schema para customer events (v1)
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

### Register schema con Confluent Schema Registry

```python
# register_schema.py — registrá Avro schema con Schema Registry
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

# Register v1 y v2
register_schema("customer-events-value", "customer-v1.avsc")
register_schema("customer-events-value", "customer-v2.avsc")
```

### Python producer con Avro y Schema Registry

```python
# avro_producer.py — Kafka producer con Avro serialization
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

# Sendéa un customer event
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

### Python consumer con Avro y Schema Registry

```python
# avro_consumer.py — Kafka consumer con Avro deserialization
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

    # v1 consumers no van a tener 'phone' o 'country' — gettean defaults
    phone = customer.get("phone", "N/A")
    country = customer.get("country", "US")
    print(f"  phone={phone}, country={country}")

    consumer.commit(msg)
```

### Compatibility rules

```python
# compatibility.py — configurá y checkeá compatibility
import requests

SCHEMA_REGISTRY_URL = "http://localhost:8081"

# Seteá compatibility para un subject
def set_compatibility(subject, level):
    """Levels: NONE, BACKWARD, FORWARD, FULL, BACKWARD_TRANSITIVE, FORWARD_TRANSITIVE, FULL_TRANSITIVE"""
    response = requests.put(
        f"{SCHEMA_REGISTRY_URL}/config/{subject}",
        json={"compatibility": level}
    )
    print(f"Set {subject} compatibility to {level}: {response.status_code}")

# BACKWARD: new schema puede leer old data (safe para agregar optional fields)
set_compatibility("customer-events-value", "BACKWARD")

# FORWARD: old schema puede leer new data (safe para remover optional fields)
set_compatibility("order-events-value", "FORWARD")

# FULL: both backward y forward (most restrictive)
set_compatibility("payment-events-value", "FULL")

# Checkeá si un new schema es compatible
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

### Java producer con Confluent SerDes

```java
// CustomerProducer.java — Kafka producer con Avro SerDes
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
// evolution-rules.json — qué changes son safe bajo cada compatibility level
{
  "BACKWARD": {
    "description": "New consumers pueden leer old data",
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
    "description": "Old consumers pueden leer new data",
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
    "description": "Both backward y forward compatible",
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
// customer.proto — Protobuf schema para customer events
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

### Schema con logical types y defaults

```json
// order-v2.avsc — complex schema con unions y defaults
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


- For a deeper guide, see [Batch-to-Streaming Bridge](/es/patterns/batch-to-streaming-bridge-pattern/).

- Arrancá con BACKWARD compatibility — es el safest default. New consumers pueden leer old data.
- Siempre proveé defaults para new fields — `{"name": "phone", "type": ["null", "string"], "default": null}`
- Usá aliases para field renames — `{"name": "email_address", "type": "string", "aliases": ["email"]}` lets old consumers read new data
- Nunca cambiés field types — creá un new field con el new type y deprecateá el old one
- Versioneá tus subjects — usá `customer-events-value` no solo `customer` para distinguish key vs value schemas
- Testeá compatibility en CI — corré `check_compatibility` antes de mergear schema changes
- Documentá breaking changes — cuando tenés que break compatibility, coordiná con todos los consumers
- Usá FULL compatibility para critical events — payment, security events donde both directions matter

## Common Mistakes

- **Agregar required fields sin defaults**: new consumers crashean en old data. Siempre agregá con un default.
- **Cambiar field types**: `int` a `long` parece safe pero breakea Avro. Creá un new field en su lugar.
- **No compatibility check en CI**: schema change pasa code review pero breakea todos los consumers en production.
- **Remover fields que consumers depend on**: old consumers todavía expect el field y failean en new data.
- **No usar un registry at all**: producers y consumers hardcodean schemas. Changes requieren coordinated deploys.

## FAQ

### ¿Qué es un schema registry?

Un centralized service que storeéa, versionéa, y validéa schemas para streaming data. Los producers registran schemas antes de writeéar; los consumers fetchean schemas para leer. El registry enforcea compatibility rules entre versions.

### ¿Qué es backward compatibility?

Un new schema puede leer data written con el previous schema. Esto significa que podés agregar optional fields con defaults, remover fields, o agregar enum symbols. New consumers no breakean en old data.

### ¿Qué es forward compatibility?

Un old schema puede leer data written con el new schema. Esto significa que podés remover optional fields o agregar enum symbols. Old consumers no breakean en new data.

### ¿Debería usar Avro, Protobuf, o JSON Schema?

Avro es el más common con Kafka — compact binary format, rich schema evolution rules. Protobuf es mejor si ya usás gRPC. JSON Schema es el más simple pero least compact. Elegí basado en tu ecosystem.

### ¿Cómo handleo breaking schema changes?

Coordiná con todos los consumers. Creá un new subject (e.g., `customer-events-v2-value`), deployéa todos los consumers para handlear el new format, después switchéa producers. Alternatively, usá un dual-write period donde both old y new formats se producen.
