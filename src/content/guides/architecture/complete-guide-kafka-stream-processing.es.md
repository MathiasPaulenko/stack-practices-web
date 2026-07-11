---
contentType: guides
slug: complete-guide-kafka-stream-processing
title: "Guía Completa de Kafka Stream Processing"
description: "Construye pipelines de event streaming en tiempo real con Kafka. Cubre producers, consumers, Kafka Streams, Kafka Connect, schema registry y patrones de procesamiento."
metaDescription: "Guía completa de Kafka stream processing. Construye pipelines en tiempo real con producers, consumers, Kafka Streams, Connect, schema registry y patrones."
difficulty: advanced
topics:
  - messaging
  - architecture
  - data
tags:
  - kafka
  - stream-processing
  - event-streaming
  - kafka-streams
  - kafka-connect
  - schema-registry
  - guide
  - messaging
relatedResources:
  - /guides/architecture/event-driven-architecture-guide
  - /guides/architecture/complete-guide-microservices-communication
  - /patterns/architecture/pipes-and-filters-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Guía completa de Kafka stream processing. Construye pipelines en tiempo real con producers, consumers, Kafka Streams, Connect, schema registry y patrones."
  keywords:
    - kafka stream processing
    - kafka streams
    - kafka connect
    - schema registry
    - event streaming
    - real-time data pipeline
    - kafka consumers
    - kafka producers
---

# Guía Completa de Kafka Stream Processing

## Introducción

Apache Kafka es una plataforma distribuida de event streaming. Maneja trillones de eventos por día en empresas como LinkedIn, Uber y Netflix. A continuación: conceptos core de Kafka, producers, consumers, Kafka Streams API, Kafka Connect, Schema Registry y patrones comunes de stream processing con ejemplos en Python, Java y JavaScript.

## Conceptos Core

- **Topic**: Un stream nombrado de eventos (como una categoría)
- **Partition**: Un topic se divide en partitions para paralelismo; cada partition es un log ordenado y append-only
- **Offset**: La posición de un mensaje dentro de una partition
- **Consumer Group**: Un grupo de consumers que comparten partitions de un topic
- **Broker**: Un servidor Kafka que almacena y sirve mensajes
- **Producer**: Una aplicación que publica eventos a topics
- **Consumer**: Una aplicación que se suscribe a topics y procesa eventos

## Producer

### Python (aiokafka)

```python
from aiokafka import AIOKafkaProducer
import json
import asyncio

async def produce_events():
    producer = AIOKafkaProducer(
        bootstrap_servers="localhost:9092",
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
        acks="all",
        enable_idempotence=True,
    )
    await producer.start()
    try:
        for i in range(100):
            await producer.send_and_wait(
                "orders",
                key=f"order-{i}",
                value={"order_id": i, "amount": 99.99 * i, "status": "created"},
            )
    finally:
        await producer.stop()

asyncio.run(produce_events())
```

### Java (Kafka Producer)

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class OrderProducer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("acks", "all");
        props.put("enable.idempotence", "true");

        try (Producer<String, String> producer = new KafkaProducer<>(props)) {
            for (int i = 0; i < 100; i++) {
                ProducerRecord<String, String> record = new ProducerRecord<>(
                    "orders",
                    "order-" + i,
                    "{\"order_id\":" + i + ",\"amount\":" + (99.99 * i) + "}"
                );
                producer.send(record, (metadata, e) -> {
                    if (e != null) {
                        e.printStackTrace();
                    } else {
                        System.out.printf("Sent to partition %d offset %d%n",
                            metadata.partition(), metadata.offset());
                    }
                });
            }
        }
    }
}
```

## Consumer

### Python (aiokafka)

```python
from aiokafka import AIOKafkaConsumer
import json
import asyncio

async def consume_events():
    consumer = AIOKafkaConsumer(
        "orders",
        bootstrap_servers="localhost:9092",
        group_id="order-processor",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        key_deserializer=lambda k: k.decode("utf-8") if k else None,
        auto_offset_reset="earliest",
        enable_auto_commit=False,
    )
    await consumer.start()
    try:
        async for msg in consumer:
            print(f"Topic={msg.topic}, Partition={msg.partition}, Offset={msg.offset}")
            print(f"Key={msg.key}, Value={msg.value}")
            await consumer.commit()
    finally:
        await consumer.stop()

asyncio.run(consume_events())
```

### JavaScript (KafkaJS)

```javascript
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
    clientId: "order-consumer",
    brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "order-processor" });

async function consumeEvents() {
    await consumer.connect();
    await consumer.subscribe({ topic: "orders", fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const event = JSON.parse(message.value.toString());
            console.log(`Processing order ${event.order_id}, amount: ${event.amount}`);

            // Procesar la orden...
        },
    });
}

consumeEvents();
```

## Kafka Streams (Java)

Kafka Streams es una librería para construir aplicaciones de stream processing en tiempo real.

### Filter y branch

```java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;
import java.util.Properties;

public class OrderStreamProcessor {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("application.id", "order-processor");
        props.put("bootstrap.servers", "localhost:9092");
        props.put("default.key.serde", "org.apache.kafka.common.serialization.Serdes$StringSerde");
        props.put("default.value.serde", "org.apache.kafka.common.serialization.Serdes$StringSerde");

        StreamsBuilder builder = new StreamsBuilder();
        KStream<String, String> orders = builder.stream("orders");

        // Branch por amount
        KStream<String, String>[] branches = orders.branch(
            (key, value) -> value.contains("\"amount\":0"),
            (key, value) -> true
        );

        KStream<String, String> zeroOrders = branches[0];
        KStream<String, String> validOrders = branches[1];

        // Filter órdenes high-value
        KStream<String, String> highValue = validOrders.filter(
            (key, value) -> {
                // Parsear y chequear amount > 1000
                return value.contains("\"amount\":1");
            }
        );

        highValue.to("high-value-orders");
        validOrders.to("processed-orders");

        KafkaStreams streams = new KafkaStreams(builder.build(), props);
        streams.start();
    }
}
```

### Aggregation (count por key)

```java
KTable<String, Long> orderCounts = orders
    .groupBy((key, value) -> key, Grouped.with(
        Serdes.String(),
        Serdes.String()
    ))
    .count();

orderCounts.toStream().to("order-counts");
```

### Windowed aggregation (ventanas tumbling de 5 minutos)

```java
KTable<Windowed<String>, Long> windowedCounts = orders
    .groupByKey()
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
    .count();

windowedCounts.toStream((key, value) -> key.key() + "@" + key.window().start())
    .to("windowed-order-counts");
```

### Joining streams

```java
KStream<String, String> orders = builder.stream("orders");
KStream<String, String> payments = builder.stream("payments");

KStream<String, String> enriched = orders.join(
    payments,
    (orderValue, paymentValue) -> orderValue + "|" + paymentValue,
    JoinWindows.of(Duration.ofMinutes(5)),
    Joined.with(Serdes.String(), Serdes.String(), Serdes.String())
);

enriched.to("enriched-orders");
```

## Schema Registry

Schema Registry asegura compatibilidad entre producers y consumers enforceando un schema (Avro, Protobuf, JSON Schema).

### Registrar un schema Avro

```python
from confluent_kafka import SerializingProducer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer

schema_registry_conf = {"url": "http://localhost:8081"}
schema_registry_client = SchemaRegistryClient(schema_registry_conf)

schema_str = """
{
  "type": "record",
  "name": "Order",
  "fields": [
    {"name": "order_id", "type": "int"},
    {"name": "amount", "type": "double"},
    {"name": "status", "type": "string"}
  ]
}
"""

avro_serializer = AvroSerializer(schema_registry_client, schema_str)

producer_conf = {
    "bootstrap.servers": "localhost:9092",
    "key.serializer": "org.apache.kafka.common.serialization.StringSerializer",
    "value.serializer": avro_serializer,
}

producer = SerializingProducer(producer_conf)
producer.produce(
    topic="orders-avro",
    key="order-1",
    value={"order_id": 1, "amount": 99.99, "status": "created"},
)
producer.flush()
```

## Kafka Connect

Kafka Connect es un framework para conectar Kafka con sistemas externos (bases de datos, colas, file systems).

### JDBC Source Connector

```json
{
  "name": "postgres-source",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
    "connection.url": "jdbc:postgresql://localhost:5432/mydb",
    "connection.user": "postgres",
    "connection.password": "secret",
    "table.whitelist": "orders",
    "mode": "incrementing",
    "incrementing.column.name": "id",
    "topic.prefix": "postgres-",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter"
  }
}
```

### Elasticsearch Sink Connector

```json
{
  "name": "es-sink",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "tasks.max": "1",
    "topics": "processed-orders",
    "connection.url": "http://localhost:9200",
    "type.name": "_doc",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "schema.ignore": "true"
  }
}
```

## Patrones de Stream Processing

| Patrón | Descripción | Caso de Uso |
|---------|-------------|----------|
| Filter | Descartar eventos que no matchean un predicado | Remover órdenes inválidas |
| Map | Transformar cada evento | Enriquecer con data de customer |
| Aggregate | Group y reduce | Contar órdenes por customer |
| Window | Agregar sobre tiempo | Rolling average de 5 minutos |
| Join | Combinar dos streams | Órdenes + pagos |
| Split | Rutear a múltiples topics | Órdenes high/low value |
| Repartition | Re-keyear un stream | Group por customer_id en vez de order_id |

## Pautas

- **Usar `acks=all` para producers** — asegura que los datos se escriban a múltiples réplicas
- **Habilitar producers idempotentes** — previene duplicados en retries
- **Setear `enable.auto.commit=false`** — commitear offsets después de procesar, no antes
- **Manejar errores de deserialización** — usar un dead-letter topic para poison pills
- **Usar Schema Registry** — enforce compatibilidad de schema, prevenir breaking consumers
- **Particionar por key para ordering** — eventos con el mismo key van a la misma partition
- **Sizear partitions correctamente** — apuntar a 10-50 MB/s throughput por partition
- **Monitorear consumer lag** — lag creciente significa que los consumers no pueden seguir
- **Usar exactly-once semantics para pipelines críticos** — setear `processing.guarantee=exactly_once_v2`
- **Setear retención sabiamente** — usar retención por tiempo (7 días) o por tamaño (1GB) por topic
- **Usar consumer groups para paralelismo** — cada consumer en un group obtiene un subset de partitions

## Errores Comunes

- No manejar poison pills — un mensaje malo bloquea toda la partition
- Usar `auto.offset.reset=latest` — consumers nuevos se pierden datos históricos
- No setear `max.poll.interval.ms` — consumers lentos son kickeados del group
- Over-partitioning — demasiadas partitions aumentan overhead y latencia
- No monitorear lag — los issues aparecen solo cuando los usuarios se quejan
- Usar Kafka como database — Kafka es un log, no un store queryable
- No usar Schema Registry — cambios de schema rompen consumers silenciosamente
- Producir sin key — los eventos se distribuyen random, perdiendo garantías de ordering

## Preguntas Frecuentes

### ¿Cuántas partitions debería tener un topic?

Comenzar con 6-12 partitions para la mayoría de topics. Añadir partitions si el consumer lag crece o el throughput excede 50 MB/s por partition. No puedes reducir partitions después — solo añadir. Planear para peak throughput.

### ¿Cómo aseguro exactly-once processing?

Usar Kafka Streams con `processing.guarantee=exactly_once_v2`. Para loops consumer-producer, usar la transactional API: `producer.initTransactions()`, `beginTransaction()`, send + commit offset, `commitTransaction()`.

### ¿Cuál es la diferencia entre Kafka Streams y Kafka Consumers?

Kafka Consumers son low-level — manejas offsets, retries y state vos mismo. Kafka Streams es una librería high-level que maneja state management, exactly-once, rebalancing y local state stores. Usar Kafka Streams para stateful processing (aggregations, joins). Usar consumers para simple event processing.
