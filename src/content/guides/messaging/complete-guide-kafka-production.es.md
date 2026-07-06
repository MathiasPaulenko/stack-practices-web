---
contentType: guides
slug: complete-guide-kafka-production
title: "Guía Completa de Apache Kafka en Producción"
description: "Ejecutar Apache Kafka en produccion con confianza. Cubre particiones, replicacion, consumer groups, monitoreo, tuning de performance y mejores practicas operativas para pipelines de streaming de alto throughput."
metaDescription: "Ejecutar Kafka en produccion. Cubre particiones, replicacion, consumer groups, monitoreo, tuning de performance y mejores practicas."
difficulty: advanced
topics:
  - messaging
  - infrastructure
  - observability
tags:
  - kafka
  - messaging
  - guia
  - streaming
  - partitions
  - consumer-groups
  - replication
  - monitoring
relatedResources:
  - /guides/serverless/complete-guide-serverless-architecture
  - /patterns/design/circuit-breaker-pattern
  - /patterns/resilience/bulkhead-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejecutar Kafka en produccion. Cubre particiones, replicacion, consumer groups, monitoreo, tuning de performance y mejores practicas."
  keywords:
    - apache kafka produccion
    - kafka particiones
    - kafka replicacion
    - kafka consumer groups
    - kafka monitoreo
    - kafka performance tuning
    - kafka operaciones
    - pipelines streaming
---

## Introducción

Apache Kafka es una plataforma de event streaming distribuida usada por miles de empresas para pipelines de datos en tiempo real, arquitecturas event-driven, y streaming analytics. Ejecutar Kafka en produccion requiere entender particiones, replicacion, consumer groups, y concerns operativos. A continuacion se cubre todo lo que necesitas para operar Kafka de forma confiable a escala.

## Fundamentos de Arquitectura Kafka

### Conceptos Clave

```text
Producer → Topic (Particionado) → Broker Cluster → Consumer Group
                ↓
         Particion 0: [msg1, msg2, msg3, ...]
         Particion 1: [msg4, msg5, msg6, ...]
         Particion 2: [msg7, msg8, msg9, ...]
```

- **Broker**: Un servidor Kafka. Los clusters tipicamente tienen 3+ brokers.
- **Topic**: Un stream nombrado de eventos, dividido en particiones.
- **Particion**: Una secuencia ordenada, append-only de eventos. La unidad de paralelismo.
- **Offset**: Un ID monotonamente creciente para cada mensaje dentro de una particion.
- **Consumer Group**: Un grupo de consumers que comparten particiones de un topic.
- **Replicacion**: Cada particion tiene replicas across brokers para fault tolerance.

### Diseno de Particiones

Las particiones determinan el paralelismo. Mas particiones significan que mas consumers pueden procesar datos concurrentemente, pero demasiadas particiones aumentan overhead.

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=["kafka1:9092", "kafka2:9092", "kafka3:9092"],
    key_serializer=str.encode,
    value_serializer=lambda v: json.dumps(v).encode("utf-8")
)

# Particionado: mensajes con la misma key van a la misma particion
# Esto garantiza orden para eventos relacionados a la misma entidad
def send_order_event(order_id, event_type, data):
    producer.send(
        "orders",
        key=str(order_id),  # Mismo order_id → misma particion → ordenado
        value={
            "order_id": order_id,
            "event_type": event_type,
            "data": data,
            "timestamp": "2026-07-04T12:00:00Z"
        }
    )
    producer.flush()
```

### Elegir el Conteo de Particiones

| Factor | Recomendacion |
|--------|--------------|
| Target de throughput | 1 particion por 10MB/s de throughput de escritura |
| Paralelismo de consumer | Al menos tantas particiones como consumers |
| Conteo de brokers | Particiones por broker deberia mantenerse bajo 2000 |
| Retencion | Mas particiones = mas memoria para offsets |
| Crecimiento futuro | Over-partitionar temprano (no se puede reducir facilmente) |

```bash
# Crear un topic con 12 particiones y replication factor 3
kafka-topics.sh --create \
  --bootstrap-server kafka1:9092 \
  --topic orders \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config compression.type=lz4
```

## Replicacion y Fault Tolerance

Cada particion tiene un leader y N-1 followers. Producers y consumers interactuan con el leader. Los followers replican los datos del leader.

### Replication Factor

```text
Replication Factor 1: Sin tolerancia a fallos de broker (perdida de datos)
Replication Factor 2: Tolera 1 fallo de broker (no recomendado — sin margen de seguridad)
Replication Factor 3: Toler 1 fallo de broker (estandar de produccion)
Replication Factor 5: Toler 2 fallos de broker (alta disponibilidad)
```

### In-Sync Replicas (ISR)

Una replica esta "in-sync" si ha fetcheado todos los mensajes del leader. Solo las replicas ISR son elegibles para convertirse en leaders.

```bash
# Checkear ISR para un topic
kafka-topics.sh --describe \
  --bootstrap-server kafka1:9092 \
  --topic orders

# Output:
# Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
# Topic: orders  Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1
```

### Configuracion de acks

```python
# acks=0: Fire and forget — sin acknowledgment (mayor throughput, riesgo de perdida)
producer = KafkaProducer(bootstrap_servers=["kafka1:9092"], acks=0)

# acks=1: Leader acknowledgle (buen balance para la mayoria de casos)
producer = KafkaProducer(bootstrap_servers=["kafka1:9092"], acks=1)

# acks=all: Leader + todas las replicas ISR acknowledgle (mayor durabilidad)
producer = KafkaProducer(
    bootstrap_servers=["kafka1:9092"],
    acks="all",
    retries=3,
    max_in_flight_requests_per_connection=1  # Prevenir out-of-order en retry
)
```

## Consumer Groups

Los consumer groups permiten procesamiento paralelo de particiones de topic. Cada particion es consumida por exactamente un consumer dentro de un grupo.

### Mecanica de Consumer Group

```text
Topic: orders (6 particiones)

Consumer Group A (3 consumers):
  Consumer 1 → Particiones 0, 1
  Consumer 2 → Particiones 2, 3
  Consumer 3 → Particiones 4, 5

Consumer Group B (2 consumers):
  Consumer 1 → Particiones 0, 1, 2
  Consumer 2 → Particiones 3, 4, 5

# Agregar un consumer al Group A:
  Consumer 4 → Particion 4
  Consumer 3 → Particion 5 (rebalance)
```

### Consumer Basico

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    "orders",
    bootstrap_servers=["kafka1:9092", "kafka2:9092", "kafka3:9092"],
    group_id="order-processor",
    auto_offset_reset="earliest",
    enable_auto_commit=False,
    key_deserializer=lambda k: k.decode("utf-8") if k else None,
    value_deserializer=lambda v: json.loads(v.decode("utf-8"))
)

for message in consumer:
    try:
        process_order(message.value)
        consumer.commit()  # Commit manual despues de procesamiento exitoso
    except Exception as e:
        logger.error(f"Failed to process message: {e}")
        # El mensaje sera re-delivered en el siguiente poll
```

### Procesamiento At-Least-Once

```python
from kafka import KafkaConsumer, TopicPartition
import json

consumer = KafkaConsumer(
    "orders",
    bootstrap_servers=["kafka1:9092"],
    group_id="order-processor",
    enable_auto_commit=False,
    auto_offset_reset="earliest"
)

def process_with_retry(message, max_retries=3):
    for attempt in range(max_retries):
        try:
            process_order(message.value)
            return True
        except Exception as e:
            if attempt == max_retries - 1:
                # Enviar a dead letter topic
                send_to_dlt(message)
                return True  # Marcar como manejado para skip
            time.sleep(2 ** attempt)  # Exponential backoff
    return False

for message in consumer:
    if process_with_retry(message):
        consumer.commit()
```

### Semantica Exactly-Once

Kafka soporta exactly-once a traves de APIs transaccionales. Usa esto cuando el procesamiento no debe producir duplicados.

```python
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError

# Producer transaccional
producer = KafkaProducer(
    bootstrap_servers=["kafka1:9092"],
    transactional_id="order-processor-tx",
    enable_idempotence=True
)

consumer = KafkaConsumer(
    "orders",
    bootstrap_servers=["kafka1:9092"],
    group_id="order-processor-tx",
    isolation_level="read_committed"
)

# Patron consume-transform-produce con exactly-once
producer.init_transactions()

for message in consumer:
    try:
        producer.begin_transaction()
        
        # Procesar y producir a topic de output
        result = transform_order(message.value)
        producer.send("processed-orders", value=result)
        
        # Commit consumer offset dentro de la transaccion
        producer.send_offsets_to_transaction(
            consumer.position(message.partition),
            consumer.consumer_group_metadata()
        )
        
        producer.commit_transaction()
    except KafkaError:
        producer.abort_transaction()
```

## Tuning de Performance

### Tuning de Producer

```python
producer = KafkaProducer(
    bootstrap_servers=["kafka1:9092"],
    
    # Batching: acumular mensajes antes de enviar
    batch_size=65536,          # 64KB batch size
    linger_ms=10,              # Esperar hasta 10ms para llenar batch
    
    # Compresion: reducir overhead de red
    compression_type="lz4",    # lz4 (rapido), snappy (balanceado), zstd (mejor ratio)
    
    # Buffering: buffer en memoria para mensajes no enviados
    buffer_memory=67108864,    # 64MB buffer
    
    # Durabilidad
    acks="all",
    retries=3,
    max_in_flight_requests_per_connection=5,
    
    # Serializacion
    key_serializer=str.encode,
    value_serializer=lambda v: json.dumps(v).encode("utf-8")
)
```

### Tuning de Consumer

```python
consumer = KafkaConsumer(
    "orders",
    bootstrap_servers=["kafka1:9092"],
    
    # Settings de fetch
    fetch_min_bytes=1024,       # Esperar al menos 1KB antes de retornar
    fetch_max_wait_ms=500,      # Max tiempo de espera para fetch_min_bytes
    max_partition_fetch_bytes=1048576,  # 1MB por particion
    
    # Settings de poll
    max_poll_records=500,       # Max records por poll
    max_poll_interval_ms=300000,  # 5min max tiempo de procesamiento
    
    # Gestion de offset
    enable_auto_commit=False,
    auto_offset_reset="earliest"
)
```

### Tuning de Broker

```bash
# server.properties — settings clave de produccion

# Replicacion
default.replication.factor=3
min.insync.replicas=2

# Retencion de log
log.retention.hours=168          # 7 dias
log.segment.bytes=1073741824     # 1GB segments
log.retention.check.interval.ms=300000

# Red
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

# Threads
num.network.threads=3
num.io.threads=8

# Defaults de topic
num.partitions=6
log.cleanup.policy=delete        # o "compact" para retencion basada en key
```

## Monitoreo

### Metricas Clave a Trackear

| Metrica | Descripcion | Threshold de Alerta |
|---------|-------------|---------------------|
| Under-replicated partitions | Particiones con followers lagging | > 0 |
| Offline partitions | Particiones sin leader | > 0 |
| Consumer lag | Diferencia entre log end y committed offset | > 10,000 |
| Bytes in/out por segundo | Throughput | Baseline + 50% |
| Request latency | Tiempo para servir requests | > 100ms |
| Active controller count | Deberia ser siempre 1 | != 1 |
| ISR shrinks por segundo | Replicas cayendo out of sync | > 0 sostenido |

### Monitoreo de Consumer Lag

```python
from kafka import KafkaConsumer, TopicPartition
import json

consumer = KafkaConsumer(
    "orders",
    bootstrap_servers=["kafka1:9092"],
    group_id="order-processor"
)

# Obtener lag actual
def get_consumer_lag(consumer, topic, group_id):
    partitions = consumer.partitions_for_topic(topic)
    if not partitions:
        return 0
    
    total_lag = 0
    for partition in partitions:
        tp = TopicPartition(topic, partition)
        # Obtener end offset de la particion
        end_offset = consumer.end_offsets([tp])[tp]
        # Obtener posicion committed del consumer
        committed = consumer.committed(tp)
        if committed is not None:
            total_lag += end_offset - committed
    
    return total_lag

lag = get_consumer_lag(consumer, "orders", "order-processor")
if lag > 10000:
    alert(f"High consumer lag: {lag} mensajes atrasados")
```

### Metricas JMX via Command Line

```bash
# Checkear under-replicated partitions
kafka-topics.sh --describe --bootstrap-server kafka1:9092 --under-replicated-partitions

# Checkear consumer group lag
kafka-consumer-groups.sh --describe \
  --bootstrap-server kafka1:9092 \
  --group order-processor

# Output:
# GROUP            TOPIC    PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID
# order-processor  orders   0          15000           15200           200  consumer-1
```

## Procedimientos Operativos

### Agregar Particiones

```bash
# Aumentar particiones (no se pueden reducir despues)
kafka-topics.sh --alter \
  --bootstrap-server kafka1:9092 \
  --topic orders \
  --partitions 24

# Nota: mensajes existentes se quedan en sus particiones originales
# Mensajes nuevos pueden distribuirse diferente si el key hashing cambia
```

### Reasignar Particiones

Al agregar brokers, rebalancea particiones across el cluster.

```bash
# Generar plan de reasignacion
kafka-reassign-partitions.sh --bootstrap-server kafka1:9092 \
  --topics-to-move-json-file topics.json \
  --generate

# Ejecutar reasignacion
kafka-reassign-partitions.sh --bootstrap-server kafka1:9092 \
  --reassignment-json-file plan.json \
  --execute

# Verificar completitud
kafka-reassign-partitions.sh --bootstrap-server kafka1:9092 \
  --reassignment-json-file plan.json \
  --verify
```

### Preferred Leader Election

```bash
# Triggerar preferred leader election para restaurar asignaciones originales de leader
kafka-leader-election.sh --bootstrap-server kafka1:9092 \
  --election-type preferred \
  --all-topic-partitions
```

## Seguridad

### Autenticacion SASL

```bash
# server.properties
listeners=SASL_SSL://:9092
advertised.listeners=SASL_SSL://kafka1:9092
sasl.enabled.mechanisms=SCRAM-SHA-512
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512
listener.security.protocol.map=SASL_SSL:SASL_SSL
ssl.keystore.location=/etc/kafka/keystore.jks
ssl.keystore.password=changeit
ssl.truststore.location=/etc/kafka/truststore.jks
ssl.truststore.password=changeit
```

```python
# Python client con SASL
producer = KafkaProducer(
    bootstrap_servers=["kafka1:9092"],
    security_protocol="SASL_SSL",
    sasl_mechanism="SCRAM-SHA-512",
    sasl_plain_username="producer-user",
    sasl_plain_password="secure-password",
    ssl_cafile="/path/to/ca-cert"
)
```

### ACLs

```bash
# Otorgar permiso de produce a un user en un topic
kafka-acls.sh --bootstrap-server kafka1:9092 \
  --add --allow-principal User:producer-user \
  --producer --topic orders

# Otorgar permiso de consume a un consumer group
kafka-acls.sh --bootstrap-server kafka1:9092 \
  --add --allow-principal User:consumer-user \
  --consumer --topic orders --group order-processor
```

## Checklist de Producción

- [ ] Replication factor >= 3 para todos los topics
- [ ] min.insync.replicas >= 2
- [ ] acks=all para producers criticos
- [ ] Conteo de particiones dimensionado para throughput y paralelismo de consumer
- [ ] Monitoreo de consumer lag con alerts
- [ ] Dead letter topic para mensajes fallidos
- [ ] Manejo de graceful shutdown para consumers
- [ ] Autenticacion SASL/SSL habilitada
- [ ] ACLs configuradas por topic y consumer group
- [ ] Retencion de log configurada segun requisitos de topic
- [ ] Metricas JMX exportadas a sistema de monitoreo
- [ ] Alerts de uso de disco de broker al 70% y 85%
- [ ] Plan de disaster recovery (MirrorMaker2 o replicacion de cluster)
- [ ] Schema registry para serializacion Avro/Protobuf

## Preguntas Frecuentes

### ¿Cuántas particiones debería usar?

Empieza con 6-12 particiones por topic para throughput moderado. Agrega mas si necesitas mas paralelismo de consumer o mayor throughput de escritura. Regla general: 1 particion por 10MB/s de throughput. No excedas 2000 particiones por broker.

### ¿Qué pasa cuando un broker falla?

Si el broker era un partition leader, una de las replicas ISR toma como leader. Si el replication factor es 3 y min.insync.replicas es 2, el cluster continua operando con 2 replicas. Los producers con acks=all experimentaran una pausa breve hasta que el nuevo leader sea elegido.

### ¿Cómo manejo el consumer lag?

Checkea si los consumers son lentos (aumentar paralelismo, optimizar procesamiento), si hay un spike de trafico (escalar consumers), o si un consumer esta atascado (reiniciarlo). Monitorea lag continuamente y alerta cuando excede tu threshold. Usa `kafka-consumer-groups.sh` para inspeccionar lag por particion.

### ¿Puedo reducir el numero de particiones?

No. Kafka no soporta reducir particiones. Si necesitas menos particiones, crea un nuevo topic con el conteo deseado y migra producers y consumers. Elige el conteo de particiones cuidadosamente al momento de creacion del topic.

### ¿Qué es log compaction?

Log compaction retiene solo el valor mas reciente para cada key, removiendo entradas mas viejas. Esto es util para topics de changelog donde solo te importa el estado actual. Usa `log.cleanup.policy=compact` en lugar del default `delete`.

### ¿Cómo logro procesamiento exactly-once?

Usa el API transaccional de Kafka: crea un producer transaccional con `transactional_id`, consume-transform-produce dentro de una transaccion, y commit el consumer offset como parte de la transaccion. Los consumers deben setear `isolation_level=read_committed` para solo ver mensajes committed.
