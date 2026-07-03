---
contentType: recipes
slug: kafka-python-consumer-groups
title: "Construir Consumer Groups de Kafka con Python para Streaming Escalable"
description: "Crear consumer groups de Kafka en Python con asignacion de particiones, gestion de offsets, estrategias de commit, manejo de rebalance y semantica exactly-once para stream processing escalable."
metaDescription: "Construye consumer groups de Kafka en Python. Gestiona particiones, offsets, commit, rebalance y semantica exactly-once para stream processing escalable."
difficulty: advanced
topics:
  - messaging
  - architecture
  - infrastructure
tags:
  - kafka
  - python
  - consumer-group
  - streaming
  - event-driven
relatedResources:
  - /recipes/messaging/rabbitmq-python-pika-consumer
  - /recipes/messaging/python-celery-task-queue
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-kafka-stream-processing
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye consumer groups de Kafka en Python. Gestiona particiones, offsets, commit, rebalance y semantica exactly-once para stream processing escalable."
  keywords:
    - kafka python consumer group
    - kafka consumer offset management
    - kafka rebalance handling
    - kafka exactly once python
    - kafka partition assignment
---

## Descripcion general

Los consumer groups de Kafka habilitan procesamiento paralelo de un topico distribuyendo particiones entre consumers. Cada particion se asigna a exactamente un consumer en el grupo, proporcionando escalabilidad horizontal y procesamiento ordenado por particion. A continuacion: crear consumer groups, gestionar offsets, manejar rebalances, estrategias de commit y lograr semantica exactly-once con Python y `confluent-kafka`.

## Cuando Usar Esto

- Event streaming de alto throughput (click streams, datos IoT, transacciones financieras)
- Pipelines de agregacion de logs y analitica en tiempo real
- Arquitecturas de event sourcing donde el orden por particion importa
- Stream processing con consumers paralelos y ordenamiento a nivel de particion

## Prerrequisitos

- Python 3.10+
- Cluster de Kafka (local o cloud, ej., Confluent Cloud)
- Paquete `confluent-kafka`

## Solucion

### 1. Consumer Group Basico

```python
from confluent_kafka import Consumer, KafkaError
import json

def create_consumer(group_id: str, servers: str = 'localhost:9092'):
    conf = {
        'bootstrap.servers': servers,
        'group.id': group_id,
        'auto.offset.reset': 'earliest',
        'enable.auto.commit': False,  # Commits manuales
        'partition.assignment.strategy': 'cooperative-sticky',
    }
    return Consumer(conf)

def consume_messages(consumer: Consumer, topic: str):
    consumer.subscribe([topic])

    try:
        while True:
            msg = consumer.poll(timeout=1.0)

            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                print(f"Consumer error: {msg.error()}")
                continue

            # Procesar mensaje
            key = msg.key().decode('utf-8') if msg.key() else None
            value = json.loads(msg.value().decode('utf-8'))

            print(f"Topic={msg.topic()}, Partition={msg.partition()}, "
                  f"Offset={msg.offset()}, Key={key}")

            process_event(value)

            # Commit manual despues de procesar
            consumer.commit(msg)

    except KeyboardInterrupt:
        print("Stopping consumer...")
    finally:
        consumer.close()

consumer = create_consumer('order-processors')
consume_messages(consumer, 'orders')
```

### 2. Productor con Particionado Basado en Key

```python
from confluent_kafka import Producer
import json

def create_producer(servers: str = 'localhost:9092'):
    return Producer({
        'bootstrap.servers': servers,
        'acks': 'all',
        'enable.idempotence': True,
    })

def delivery_report(err, msg):
    if err:
        print(f"Delivery failed: {err}")
    else:
        print(f"Delivered to {msg.topic()} [{msg.partition()}] at offset {msg.offset()}")

def produce_event(producer: Producer, topic: str, key: str, value: dict):
    producer.produce(
        topic=topic,
        key=key.encode('utf-8'),  # La key determina la particion
        value=json.dumps(value).encode('utf-8'),
        callback=delivery_report,
    )
    producer.poll(0)  # Servir delivery callbacks

# Particionado basado en key asegura que misma key siempre va a misma particion
producer = create_producer()
produce_event(producer, 'orders', 'user-123', {'orderId': 'o1', 'userId': 'user-123'})
produce_event(producer, 'orders', 'user-456', {'orderId': 'o2', 'userId': 'user-456'})
producer.flush()
```

### 3. Manejo de Rebalance

```python
from confluent_kafka import Consumer, KafkaError, TopicPartition
import json

def on_assign(consumer, partitions):
    print(f"Partitions assigned: {partitions}")
    # Cargar offsets committed y seek a ellos
    for tp in partitions:
        # Podria cargar desde store externo para exactly-once
        pass

def on_revoke(consumer, partitions):
    print(f"Partitions revoked: {partitions}")
    # Commit offsets actuales antes de perder ownership
    consumer.commit(asynchronous=False)

def on_lost(consumer, partitions):
    print(f"Partitions lost: {partitions}")
    # Particiones perdidas por fallo de consumer — cleanup

def create_resilient_consumer(group_id: str):
    conf = {
        'bootstrap.servers': 'localhost:9092',
        'group.id': group_id,
        'auto.offset.reset': 'earliest',
        'enable.auto.commit': False,
        'partition.assignment.strategy': 'cooperative-sticky',
        # Callbacks de rebalance
        'on_assign': on_assign,
        'on_revoke': on_revoke,
        'on_lost': on_lost,
    }
    return Consumer(conf)

consumer = create_resilient_consumer('order-processors')
consumer.subscribe(['orders'])
```

### 4. Procesamiento en Batch con Offset Manual

```python
from confluent_kafka import Consumer, KafkaError
import json
from collections import defaultdict

def consume_batch(consumer: Consumer, topic: str, batch_size: int = 100, timeout: float = 5.0):
    consumer.subscribe([topic])
    messages = []

    while True:
        msg = consumer.poll(timeout=timeout)

        if msg is None:
            if messages:
                process_batch(messages)
                consumer.commit(asynchronous=False)
                messages = []
            continue

        if msg.error():
            continue

        messages.append({
            'topic': msg.topic(),
            'partition': msg.partition(),
            'offset': msg.offset(),
            'key': msg.key().decode('utf-8') if msg.key() else None,
            'value': json.loads(msg.value().decode('utf-8')),
        })

        if len(messages) >= batch_size:
            process_batch(messages)
            consumer.commit(asynchronous=False)
            messages = []

def process_batch(messages: list):
    # Agrupar por particion para procesamiento ordenado
    by_partition = defaultdict(list)
    for msg in messages:
        by_partition[(msg['topic'], msg['partition'])].append(msg)

    for (topic, partition), msgs in by_partition.items():
        print(f"Processing {len(msgs)} messages from {topic}[{partition}]")
        for msg in msgs:
            process_event(msg['value'])
```

### 5. Semantica Exactly-Once (Transaccional)

```python
from confluent_kafka import Consumer, Producer, KafkaError, KafkaException
import json

class ExactlyOnceProcessor:
    def __init__(self, input_topic: str, output_topic: str, group_id: str):
        self.consumer = Consumer({
            'bootstrap.servers': 'localhost:9092',
            'group.id': group_id,
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': False,
            'isolation.level': 'read_committed',
        })

        self.producer = Producer({
            'bootstrap.servers': 'localhost:9092',
            'transactional.id': f'{group_id}-txn',
            'enable.idempotence': True,
        })

        self.input_topic = input_topic
        self.output_topic = output_topic

    def start(self):
        self.producer.init_transactions()
        self.consumer.subscribe([self.input_topic])

        try:
            while True:
                msg = self.consumer.poll(1.0)
                if msg is None or msg.error():
                    continue

                # Procesar dentro de una transaccion
                self.producer.begin_transaction()

                try:
                    result = process_event(json.loads(msg.value().decode('utf-8')))

                    # Producir mensaje de output
                    self.producer.produce(
                        self.output_topic,
                        value=json.dumps(result).encode('utf-8'),
                    )

                    # Commit consumer offset dentro de la transaccion
                    self.producer.send_offsets_to_transaction(
                        [TopicPartition(msg.topic(), msg.partition(), msg.offset() + 1)],
                        self.consumer.consumer_group_metadata(),
                    )

                    self.producer.commit_transaction()

                except Exception as e:
                    print(f"Transaction failed, aborting: {e}")
                    self.producer.abort_transaction()

        finally:
            self.consumer.close()
            self.producer.flush()
```

### 6. Ejecutar Multiples Consumers en un Group

```python
# Ejecutar multiples instancias — Kafka asigna particiones automaticamente
# Con 6 particiones y 3 consumers, cada uno obtiene 2 particiones

# consumer_worker.py
import sys
from confluent_kafka import Consumer

def start_worker(worker_id: str, group_id: str, topic: str):
    consumer = Consumer({
        'bootstrap.servers': 'localhost:9092',
        'group.id': group_id,
        'auto.offset.reset': 'earliest',
        'enable.auto.commit': False,
        'partition.assignment.strategy': 'cooperative-sticky',
    })

    consumer.subscribe([topic])
    print(f"[Worker {worker_id}] Subscribed to {topic}")

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None or msg.error():
                continue

            value = json.loads(msg.value().decode('utf-8'))
            print(f"[Worker {worker_id}] P={msg.partition()} O={msg.offset()} — {value.get('id')}")
            process_event(value)
            consumer.commit(msg)
    finally:
        consumer.close()

worker_id = sys.argv[1]
start_worker(worker_id, 'order-processors', 'orders')

# Ejecutar en terminales separadas:
# python consumer_worker.py worker-1
# python consumer_worker.py worker-2
# python consumer_worker.py worker-3
```

## Como Funciona

1. **Consumer groups**: Los consumers en el mismo grupo comparten particiones. Cada particion se asigna a exactamente un consumer. Agregar consumers escala el throughput hasta el numero de particiones.
2. **Particionado basado en key**: El productor hashea la key del mensaje para determinar la particion. La misma key siempre va a la misma particion, preservando orden para esa key.
3. **Gestion de offsets**: Cada consumer rastrea su posicion (offset) en cada particion. Los commits persisten el offset al topico `__consumer_offsets` de Kafka. Los commits manuales dan control sobre cuando se guardan los offsets.
4. **Rebalance**: Cuando consumers se unen o abandonan el grupo, las particiones se reasignan. La estrategia cooperative-sticky minimiza disrupcion moviendo solo las particiones que necesitan moverse.
5. **Exactly-once**: Las transacciones vinculan el commit de offset del consumer y el envio del productor en una operacion atomica. Si la transaccion falla, ambos se revierten — sin duplicados, sin perdida de datos.

## Variantes

### Agregacion con Ventanas usando Kafka Streams

```python
# Usa stream processing de confluent-kafka-python o Faust
# pip install faust-streaming

import faust

app = faust.App('order-aggregator', broker='kafka://localhost:9092')
orders_topic = app.topic('orders', value_type=dict)
order_counts = app.Table('order_counts', default=int)

@app.agent(orders_topic)
async def count_orders(stream):
    async for order in stream:
        user_id = order['userId']
        order_counts[user_id] += 1
        print(f"User {user_id}: {order_counts[user_id]} orders")
```

### Schema Registry con Avro

```python
from confluent_kafka import Consumer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer

schema_registry = SchemaRegistryClient({'url': 'http://localhost:8081'})
avro_deserializer = AvroDeserializer(schema_registry)

consumer = Consumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'avro-consumers',
})

consumer.subscribe(['orders-avro'])

msg = consumer.poll(1.0)
if msg:
    value = avro_deserializer(msg.value(), None)
    print(f"Deserialized: {value}")
```

### Multiples Topicos

```python
# Suscribirse a multiples topicos con patron
consumer.subscribe(['orders', 'payments', 'shipments'])

# O usar patron regex
import re
consumer.subscribe(['orders.*'], on_assign=on_assign)
```

## Mejores Practicas

- **Usar asignacion `cooperative-sticky`**: La estrategia `range` por defecto causa rebalances stop-the-world. Cooperative-sticky solo mueve particiones afectadas, reduciendo disrupcion.
- **Deshabilitar `enable.auto.commit`**: Auto-commit puede commit offsets antes de que el procesamiento complete. Usa commits manuales despues de procesamiento exitoso.
- **Usar particionado basado en key para orden**: Mensajes con la misma key (ej., user ID) van a la misma particion, preservando orden. Sin keys, los mensajes se distribuyen round-robin.
- **Establecer `isolation.level=read_committed`**: Solo lee transacciones committed. Sin esto, los consumers pueden ver mensajes no committed (potencialmente rolled-back).
- **Manejar rebalances graceful**: Implementa `on_revoke` para commit offsets antes de perder ownership de particiones. De lo contrario, puedes reprocesar mensajes.
- **Monitorear consumer lag**: Usa `kafka-consumer-groups.sh` o Burrow para monitorear lag (diferencia entre ultimo offset y offset committed). Lag alto significa que los consumers no pueden mantenerse.

## Errores Comunes

- **Mas consumers que particiones**: Los consumers extra estan inactivos. Si tienes 6 particiones, solo 6 consumers pueden consumir activamente. Escala particiones antes de escalar consumers.
- **Auto-commit con procesamiento lento**: Auto-commit corre cada 5 segundos por defecto. Si el procesamiento toma mas, los offsets se commit antes de que el procesamiento complete — perdida de datos en crash.
- **No manejar rebalance**: Durante rebalance, las particiones se revocan. Si no commit antes de la revocacion, reprocesas mensajes despues del rebalance.
- **Bloquear en el loop de poll**: Procesamiento de larga duracion bloquea `poll()`, disparando session timeout y rebalance. Usa pause/resume o procesamiento async.
- **No establecer `auto.offset.reset`**: Si no existe offset committed, este setting determina donde empezar. `earliest` lee desde el principio, `latest` solo mensajes nuevos. Elige segun tu caso de uso.

## FAQ

**Cuantas particiones deberia crear?**

Planifica para el throughput pico. Cada particion soporta ~10MB/s. Para 100MB/s, usa 10+ particiones. Mas particiones habilitan mas paralelismo pero aumentan overhead. Empieza con 6-12 y escala segun sea necesario.

**Que es consumer lag?**

Lag es la diferencia entre el ultimo offset en una particion y el offset committed del consumer. Lag alto significa que el consumer se esta quedando atras. Monitorea con `kafka-consumer-groups.sh --describe`.

**Como funciona exactly-once en Kafka?**

Las transacciones de Kafka vinculan el envio del productor y el commit de offset del consumer en una operacion atomica. El productor usa un `transactional.id` para writes idempotentes. El consumer establece `isolation.level=read_committed` para solo ver mensajes committed.

**Puedo tener multiples consumer groups en el mismo topico?**

Si. Cada consumer group rastrea sus offsets independientemente. Multiples groups pueden leer el mismo topico para diferentes propositos (ej., uno para analitica en tiempo real, otro para sync de base de datos).

**Que pasa si un consumer crashea?**

Kafka detecta el fallo via session timeout (default 10s). Ocurre un rebalance y las particiones del consumer crasheado se reasignan a otros consumers. Los offsets se leen desde la ultima posicion committed.
