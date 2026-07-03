---
contentType: guides
slug: stream-processing-guide
title: "Procesamiento de Streams: Pipelines de Datos Event-Driven con Kafka, Flink y..."
description: "Guía práctica sobre procesamiento de streams: elegir entre Kafka Streams, Flink y Spark Streaming, diseñar esquemas de eventos, manejar operaciones stateful, y construir pipelines exactly-once para datos en tiempo real."
metaDescription: "Aprende procesamiento de streams: Kafka, Flink, Spark, esquemas de eventos, stateful y exactly-once para pipelines en tiempo real."
difficulty: advanced
topics:
  - data
  - architecture
  - messaging
tags:
  - stream-processing
  - kafka
  - flink
  - spark-streaming
  - event-driven
  - real-time
  - guide
relatedResources:
  - /guides/data/real-time-analytics-guide
  - /guides/data/etl-pipeline-guide
  - /guides/observability/metrics-and-dashboards-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende procesamiento de streams: Kafka, Flink, Spark, esquemas de eventos, stateful y exactly-once para pipelines en tiempo real."
  keywords:
    - stream-processing
    - kafka
    - flink
    - spark-streaming
    - event-driven
    - real-time
    - guide
---

## Descripción General

El procesamiento de streams ingiere, transforma y produce datos continuamente a medida que fluyen eventos a través del sistema. A diferencia del procesamiento por batch que procesa datos en chunks programados, el procesamiento de streams maneja cada evento a medida que llega, habilitando reacciones sub-segundo a condiciones cambiantes. Poderiza detección de fraude en tiempo real, recomendaciones en vivo, monitoreo de IoT y analítica operacional.

Esta guía cubre fundamentos de procesamiento de streams, selección de motor, operaciones stateful y patrones de producción con Kafka Streams, Apache Flink y Spark Streaming.

## Cuándo Usar

- Necesitas procesar eventos a medida que llegan, no en batches por hora o diario
- Tu sistema debe reaccionar a condiciones en segundos (fraude, anomalías, alertas)
- Necesitas unir múltiples streams de eventos en tiempo real (clicks + transacciones)
- Estás construyendo un sistema event-sourced donde el log de eventos es la fuente de verdad
- Necesitas mantener estado agregado que actualiza continuamente (contadores, ventanas)
- Tu volumen de datos hace el procesamiento por batch demasiado lento o intensivo en recursos

## Cuándo NO Usar

- Tu caso de uso tolera minutos u horas de latencia. ETL por batch es más simple y barato
- Tus transformaciones requieren acceso a datos históricos que no caben en memoria
- Necesitas joins complejos multi-tabla a través de sistemas dispares. Batch u OLAP es mejor
- Tu equipo carece de experiencia operativa con procesadores de streams distribuidos
- El ordenamiento de eventos es crítico pero tu fuente no lo garantiza (la mayoría de logs, algunas APIs)

## Conceptos Clave

| Concepto | Descripción |
|---------|-------------|
| **Stream de Eventos** | Secuencia ordenada y append-only de eventos |
| **Partición de Stream** | Subconjunto de eventos dentro de un stream, procesado en paralelo |
| **Offset** | La posición de un evento dentro de una partición (como un cursor) |
| **Grupo de Consumidores** | Un conjunto de consumidores que comparten asignación de particiones |
| **Procesamiento Stateful** | Operaciones que mantienen y actualizan estado a través de eventos |
| **Watermark** | Un timestamp que indica cuándo todos los eventos hasta ese tiempo han sido vistos |
| **Checkpoint** | Un snapshot de estado y offsets para recuperación de fallos |

## Motores de Procesamiento de Streams

```
┌─────────────────────────────────────────────────────────────────┐
│                     Fuentes de Eventos                        │
│  (Kafka, Kinesis, Pulsar, RabbitMQ, Logs, APIs)               │
└─────────────────────────────┬───────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
    │   Flink   │      │  Kafka    │      │   Spark   │
    │           │      │  Streams  │      │  Streaming│
    │ • Complejo│      │ • Simple  │      │ • Batch   │
    │   event   │      │   event   │      │   compat  │
    │   time    │      │   logic   │      │ • Micro-  │
    │   proc    │      │ • Embedded│      │   batches │
    │ • Stateful│      │ • Kafka   │      │ • SQL     │
    │ • Exactly-│      │   only    │      │   support │
    │   once    │      │ • Easy ops│      │           │
    └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Destinations     │
                    │  (Database, API,  │
                    │  Another Stream,  │
                    │  Alerting)        │
                    └───────────────────┘
```

## Implementación de Procesamiento de Streams Paso a Paso

### 1. Diseña Esquemas de Eventos

Esquemas bien diseñados hacen el procesamiento de streams confiable y evolvable:

```json
// Ejemplo: Esquema de evento compatible con CloudEvents
{
  "specversion": "1.0",
  "type": "order.placed",
  "source": "payment-service",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "time": "2024-06-25T14:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "order_id": "ORD-12345",
    "customer_id": "CUST-987",
    "items": [
      {"sku": "SKU-001", "quantity": 2, "price": 29.99}
    ],
    "total": 59.98,
    "currency": "USD",
    "shipping_address": {
      "country": "ES",
      "zip": "28001"
    }
  },
  "traceparent": "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
}
```

#### Principios de Diseño de Esquemas

| Principio | Por Qué Importa |
|-----------|-----------------|
| **Eventos inmutables** | Los eventos representan algo que ocurrió; no cambian |
| **Auto-descriptivo** | Incluye todo el contexto necesario para procesar (no requiere lookups) |
| **Timestamps UTC** | El tiempo del evento es crítico para windowing y ordenamiento |
| **IDs únicos** | Habilita idempotencia y deduplicación |
| **Correlation IDs** | Traza eventos a través de múltiples etapas de procesamiento |
| **Schema registry** | Enforce compatibilidad (Avro, Protobuf, JSON Schema) |

```python
// Ejemplo: Validación de esquema con JSON Schema
from jsonschema import validate, ValidationError
import json

ORDER_PLACED_SCHEMA = {
    "type": "object",
    "required": ["specversion", "type", "source", "id", "time", "data"],
    "properties": {
        "specversion": {"type": "string", "enum": ["1.0"]},
        "type": {"type": "string"},
        "source": {"type": "string"},
        "id": {"type": "string", "format": "uuid"},
        "time": {"type": "string", "format": "date-time"},
        "data": {
            "type": "object",
            "required": ["order_id", "customer_id", "total"],
            "properties": {
                "order_id": {"type": "string"},
                "customer_id": {"type": "string"},
                "total": {"type": "number", "minimum": 0},
                "currency": {"type": "string", "enum": ["USD", "EUR", "GBP"]}
            }
        }
    }
}

def validate_event(event):
    try:
        validate(instance=event, schema=ORDER_PLACED_SCHEMA)
        return True, None
    except ValidationError as e:
        return False, str(e)
```

### 2. Implementa Kafka Streams

Kafka Streams es la opción más simple para arquitecturas centradas en Kafka:

```java
// Ejemplo: Aplicación Kafka Streams para analítica de pedidos
public class OrderAnalyticsApp {
    
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-analytics");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, 
            Serdes.String().getClass().getName());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, 
            Serdes.String().getClass().getName());
        
        StreamsBuilder builder = new StreamsBuilder();
        
        // Leer eventos de pedidos
        KStream<String, Order> orders = builder.stream("orders",
            Consumed.with(Serdes.String(), new OrderSerde()));
        
        // Filtrar pedidos de alto valor
        KStream<String, Order> highValueOrders = orders
            .filter((key, order) -> order.getTotal() > 100.0);
        
        // Enriquecer con datos de cliente (KTable lookup)
        KTable<String, Customer> customers = builder.table("customers",
            Consumed.with(Serdes.String(), new CustomerSerde()));
        
        KStream<String, EnrichedOrder> enrichedOrders = highValueOrders
            .leftJoin(customers, (order, customer) -> new EnrichedOrder(order, customer));
        
        // Escribir a tópico de salida
        enrichedOrders.to("enriched-orders",
            Produced.with(Serdes.String(), new EnrichedOrderSerde()));
        
        // Ventana tumbling: revenue por categoría por hora
        orders
            .groupBy((key, order) -> order.getCategory())
            .windowedBy(TimeWindows.of(Duration.ofHours(1)))
            .aggregate(
                () -> 0.0,
                (key, order, total) -> total + order.getTotal(),
                Materialized.with(Serdes.String(), Serdes.Double())
            )
            .toStream()
            .to("hourly-revenue-by-category");
        
        KafkaStreams streams = new KafkaStreams(builder.build(), props);
        streams.start();
        
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
    }
}
```

#### Patrones de Kafka Streams

| Patrón | Descripción | Caso de Uso |
|--------|-------------|-------------|
| **KStream → KStream** | Transformación evento-a-evento | Filtrado, mapeo, branching |
| **KStream → KTable** | Agregación en estado | Conteo, suma, agrupación |
| **KTable → KStream** | Salida de changelog | Publicar agregados actualizados |
| **KStream + KTable** | Enriquecimiento de stream | Lookup joins con datos de referencia |
| **KStream + KStream** | Join de streams | Coincidir eventos de dos streams |
| **Windowed aggregation** | Agrupación con límites de tiempo | Métricas por hora, análisis de sesión |

### 3. Implementa Apache Flink

Flink es el motor más capaz para procesamiento de streams complejo:

```java
// Ejemplo: Job de Flink para detección de fraude en tiempo real
public class FraudDetectionJob {
    
    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = 
            StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Configurar checkpointing para exactly-once
        env.enableCheckpointing(60000);  // Checkpoints de 60 segundos
        env.getCheckpointConfig().setCheckpointingMode(
            CheckpointingMode.EXACTLY_ONCE);
        env.getCheckpointConfig().setMinPauseBetweenCheckups(30000);
        
        // Fuente Kafka con watermarking de event-time
        KafkaSource<Transaction> source = KafkaSource.<Transaction>builder()
            .setBootstrapServers("kafka:9092")
            .setTopics("transactions")
            .setGroupId("fraud-detection")
            .setStartingOffsets(OffsetsInitializer.latest())
            .setValueOnlyDeserializer(new TransactionDeserializationSchema())
            .build();
        
        DataStream<Transaction> transactions = env.fromSource(
            source,
            WatermarkStrategy.<Transaction>forBoundedOutOfOrderness(
                Duration.ofSeconds(30))
                .withTimestampAssigner((transaction, timestamp) -> 
                    transaction.getTimestamp()),
            "Transactions"
        );
        
        // Stream keyed por cuenta para estado por cuenta
        DataStream<Alert> alerts = transactions
            .keyBy(Transaction::getAccountId)
            .process(new FraudDetectionFunction());
        
        // Sink de alertas a Kafka
        KafkaSink<Alert> sink = KafkaSink.<Alert>builder()
            .setBootstrapServers("kafka:9092")
            .setRecordSerializer(
                KafkaRecordSerializationSchema.builder()
                    .setTopic("fraud-alerts")
                    .setValueSerializationSchema(new AlertSerializationSchema())
                    .build()
            )
            .setDeliveryGuarantee(DeliveryGuarantee.EXACTLY_ONCE)
            .build();
        
        alerts.sinkTo(sink);
        env.execute("Fraud Detection");
    }
    
    // Función de detección de fraude con estado
    public static class FraudDetectionFunction 
            extends KeyedProcessFunction<String, Transaction, Alert> {
        
        private ValueState<Double> lastAmountState;
        private ValueState<Long> lastTimestampState;
        private ListState<Transaction> recentTransactionsState;
        
        @Override
        public void open(Configuration parameters) {
            lastAmountState = getRuntimeContext().getState(
                new ValueStateDescriptor<>("lastAmount", Types.DOUBLE));
            lastTimestampState = getRuntimeContext().getState(
                new ValueStateDescriptor<>("lastTimestamp", Types.LONG));
            recentTransactionsState = getRuntimeContext().getListState(
                new ListStateDescriptor<>("recentTxns", Transaction.class));
        }
        
        @Override
        public void processElement(Transaction txn, Context ctx, Collector<Alert> out) 
                throws Exception {
            
            Double lastAmount = lastAmountState.value();
            Long lastTimestamp = lastTimestampState.value();
            
            // Regla 1: Pico de monto (>3x anterior)
            if (lastAmount != null && txn.getAmount() > lastAmount * 3) {
                out.collect(new Alert(txn.getAccountId(), "AMOUNT_SPIKE", 
                    txn.getAmount(), txn.getTimestamp()));
            }
            
            // Regla 2: Velocidad (3+ transacciones en 1 minuto)
            recentTransactionsState.add(txn);
            long oneMinuteAgo = txn.getTimestamp() - 60000;
            
            Iterable<Transaction> recent = recentTransactionsState.get();
            int count = 0;
            for (Transaction t : recent) {
                if (t.getTimestamp() > oneMinuteAgo) count++;
            }
            
            if (count >= 3) {
                out.collect(new Alert(txn.getAccountId(), "VELOCITY", 
                    txn.getAmount(), txn.getTimestamp()));
            }
            
            // Actualizar estado
            lastAmountState.update(txn.getAmount());
            lastTimestampState.update(txn.getTimestamp());
        }
    }
}
```

#### Patrones de Flink

| Patrón | API | Caso de Uso |
|--------|-----|-------------|
| **Agregación con ventana** | `keyBy(...).window(...).aggregate(...)` | Métricas por hora, resúmenes diarios |
| **Ventanas de event-time** | `WatermarkStrategy.forBoundedOutOfOrderness(...)` | Resultados correctos a pesar de eventos tardíos |
| **Operadores stateful** | `ValueState`, `ListState`, `MapState` | Tracking de sesión, detección de fraude |
| **Async I/O** | `AsyncDataStream.unorderedWait(...)` | Enriquecimiento con llamadas a API externas |
| **CEP (Complex Event Processing)** | `CEP.pattern(...)` | Matching de patrones multi-evento |
| **Side outputs** | `OutputTag` + `ctx.output(...)` | Dead letter queue, manejo de datos tardíos |

### 4. Maneja Estado y Tolerancia a Fallos

El estado es la parte más difícil del procesamiento de streams:

```java
// Ejemplo: Configuración de backend de estado de Flink
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

// Opciones: MemoryStateBackend, FsStateBackend, RocksDBStateBackend
env.setStateBackend(new EmbeddedRocksDBStateBackend());
env.getCheckpointConfig().setCheckpointStorage("hdfs://namenode:8020/flink/checkpoints");

// TTL (time-to-live) de estado para garbage collection
StateTtlConfig ttlConfig = StateTtlConfig
    .newBuilder(Time.hours(24))
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .cleanupFullSnapshot()
    .build();

ValueStateDescriptor<MyState> descriptor = new ValueStateDescriptor<>("myState", MyState.class);
descriptor.enableTimeToLive(ttlConfig);
```

#### Estrategias de Manejo de Estado

| Estrategia | Mejor Para | Trade-off |
|------------|------------|-----------|
| **En memoria (HashMap)** | Estado pequeño, ventanas cortas | Rápido, pero se pierde en fallo |
| **RocksDB** | Estado grande, ventanas largas | Más lento, pero escala a TBs |
| **Almacenamiento externo** | Estado compartido entre jobs | Añade latencia y complejidad |
| **Checkpoints incrementales** | Estado grande que cambia lentamente | Reduce tiempo de checkpoint |

### 5. Implementa Procesamiento Exactly-Once

La semántica exactly-once asegura que cada evento se procesa una vez a pesar de fallos:

```java
// Configuración Kafka + Flink exactly-once
Properties props = new Properties();
props.put("bootstrap.servers", "kafka:9092");
props.put("group.id", "exactly-once-job");

// Configuración de producer para escrituras idempotentes
props.put("enable.idempotence", "true");
props.put("acks", "all");
props.put("retries", Integer.MAX_VALUE);
props.put("max.in.flight.requests.per.connection", "5");

// Configuración exactly-once de Flink
env.enableCheckpointing(60000);
env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);
env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);
env.getCheckpointConfig().enableExternalizedCheckpoints(
    ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);

// Sink con escrituras transaccionales
FlinkKafkaProducer<String> kafkaSink = new FlinkKafkaProducer<>(
    "output-topic",
    new SimpleStringSchema(),
    props,
    FlinkKafkaProducer.Semantic.EXACTLY_ONCE
);
```

#### Garantías de Entrega

| Garantía | Comportamiento | Caso de Uso |
|----------|---------------|-------------|
| **At-most-once** | Los eventos pueden perderse | Métricas no críticas, logs |
| **At-least-once** | Los eventos pueden duplicarse | La mayoría de analítica, conteo |
| **Exactly-once** | Sin pérdida, sin duplicados | Transacciones financieras, facturación |

## Lo que funciona

- Usa event time, no processing time. El processing time es no confiable a través de reinicios y replays. Event time con watermarks da resultados correctos.
- Mantén estado acotado. Usa TTL, expiración de ventana y limpieza periódica para prevenir crecimiento ilimitado de estado.
- Sinks idempotentes. Incluso con exactly-once, diseña tus consumidores downstream para manejar duplicados elegantemente.
- Monitorea lag. El consumer lag es la métrica operacional primaria para salud de procesamiento de streams.
- Prueba con replay. Reproduce eventos históricos a través de tu job para validar corrección y rendimiento.
- Evolución de esquema. Usa Confluent Schema Registry o similar para enforce compatibilidad backward/forward.

## Errores Comunes

- Ventanas de processing time. Los resultados difieren en cada replay. Siempre usa event time para agregaciones.
- Crecimiento ilimitado de estado. Olvidar configurar TTL en estado lleva a crashes OOM después de días o semanas.
- Ignorar backpressure. Cuando los consumidores no pueden mantenerse al día, ocurre pérdida de datos o fallos en cascada. Monitorea y escala.
- Sin dead letter queue. Eventos inválidos no deberían crashear el pipeline. Róutalos a un DLQ para inspección.
- Operaciones stateful sin checkpoints. Un reinicio del job pierde todo el estado y debe reprocesar desde el principio.
- Kafka auto.offset.reset=latest. Esto silenciosamente saltea datos en nuevos grupos de consumidores. Usa earliest u offsets explícitos.

## Variantes

- Kafka Streams: Librería embebida, no requiere cluster separado. Mejor para transformaciones simples sobre Kafka
- Flink: Procesador de streams full-featured. Mejor para procesamiento complejo de event time y operaciones stateful
- Spark Streaming: Procesamiento micro-batch. Mejor para equipos ya usando Spark, o cuando unificación batch+streaming importa
- ksqlDB: Interfaz SQL sobre Kafka Streams. Mejor para procesamiento declarativo de streams sin Java
- Pulsar Functions: Computación liviana sobre Apache Pulsar. Mejor para arquitecturas centradas en Pulsar

## FAQ

**P: ¿Debería usar Kafka Streams o Flink?**
Usa Kafka Streams si tu lógica es simple (filter, map, aggregate) y ya eres Kafka-centric. Usa Flink para windowing complejo, semántica de event time, CEP, o cuando necesitas procesar desde múltiples fuentes más allá de Kafka.

**P: ¿Cómo manejo eventos que llegan tarde?**
Usa watermarks con lateness permitida. Flink soporta `allowedLateness()` en ventanas. Kafka Streams soporta períodos de gracia. Eventos que llegan después del período de gracia van a un side output o son descartados.

**P: ¿Cuál es la diferencia entre procesamiento de streams y analítica en tiempo real?**
El procesamiento de streams es el motor que transforma eventos. La analítica en tiempo real es el sistema end-to-end que incluye colección, procesamiento, almacenamiento y visualización. El procesamiento de streams alimenta a la analítica en tiempo real.

**P: ¿Puedo usar SQL para procesamiento de streams?**
Sí. Flink SQL, ksqlDB y Spark Structured Streaming soportan SQL sobre streams. Estos son excelentes para agregaciones simples y joins. Lógica stateful compleja aún requiere la API DataStream/funcional.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.

## Conclusión

El procesamiento de streams habilita sistemas que reaccionan a eventos a medida que ocurren. Al elegir el motor correcto, diseñar esquemas de eventos inmutables, manejar estado cuidadosamente e implementar semántica exactly-once, construyes pipelines que procesan millones de eventos por segundo con garantías de corrección.

