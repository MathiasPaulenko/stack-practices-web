---
contentType: recipes
slug: kafka-spring-boot-stream-listener
title: "Consumir Topicos de Kafka con Spring Boot Stream Listeners"
description: "Construir consumers de Kafka en Spring Boot usando anotaciones @KafkaListener, consumers concurrentes, error handlers, patrones DLQ y batch listeners con acknowledgment manual."
metaDescription: "Consume topicos de Kafka en Spring Boot con @KafkaListener. Usa consumers concurrentes, error handlers, DLQ, batch listeners y ack manual para procesamiento confiable."
difficulty: intermediate
topics:
  - messaging
  - architecture
  - infrastructure
tags:
  - kafka
  - spring-boot
  - java
  - consumer
  - streaming
relatedResources:
  - /recipes/messaging/kafka-python-consumer-groups
  - /recipes/messaging/rabbitmq-python-pika-consumer
  - /guides/complete-guide-message-queues
  - /guides/complete-guide-kafka-patterns
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Consume topicos de Kafka en Spring Boot con @KafkaListener. Usa consumers concurrentes, error handlers, DLQ, batch listeners y ack manual para procesamiento confiable."
  keywords:
    - spring boot kafka listener
    - kafkalistener annotation
    - spring kafka error handling
    - spring kafka dlq
    - spring kafka batch listener
---

## Descripcion general

La integracion de Kafka con Spring Boot proporciona anotaciones `@KafkaListener` para configuracion declarativa de consumers. A continuacion: configurar consumers de Kafka, consumo concurrente, manejo de errores con DLQ, batch listeners, acknowledgment manual y routing basado en headers.

## Cuando Usar Esto

- Microservicios de Spring Boot que consumen eventos de Kafka
- Aplicaciones que necesitan deserializacion tipada de mensajes (JSON a POJO)
- Procesamiento en batch de mensajes de Kafka con garantias transaccionales
- Consumers multi-topico con logica de procesamiento diferente por topico

## Prerrequisitos

- Java 17+
- Spring Boot 3.x
- Dependencia Spring Kafka

## Solucion

### 1. Configuracion

```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: order-service
      auto-offset-reset: earliest
      enable-auto-commit: false
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.example.events"
    listener:
      ack-mode: manual
      concurrency: 3
```

### 2. Kafka Listener Basico

```java
package com.example.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class OrderConsumer {

    @KafkaListener(
        topics = "orders",
        groupId = "order-service",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleOrder(OrderEvent event) {
        System.out.println("Received order: " + event.getOrderId());
        processOrder(event);
    }

    private void processOrder(OrderEvent event) {
        // Logica de negocio
    }
}
```

### 3. Bean de Configuracion de Consumer

```java
package com.example.config;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import java.util.HashMap;
import java.util.Map;

@EnableKafka
@Configuration
public class KafkaConsumerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ConsumerFactory<String, Object> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-service");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.example.events");
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500);
        props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);
        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        factory.setConcurrency(3);
        factory.getContainerProperties().setAckMode(
            org.springframework.kafka.listener.ContainerProperties.AckMode.MANUAL
        );
        return factory;
    }
}
```

### 4. Manejo de Errores con DLQ

```java
package com.example.kafka;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.ErrorHandler;
import org.springframework.kafka.listener.MessageListenerContainer;
import org.springframework.stereotype.Service;

@Service
public class OrderConsumerWithErrorHandler {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public OrderConsumerWithErrorHandler(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @KafkaListener(topics = "orders", groupId = "order-service")
    public void handleOrder(ConsumerRecord<String, OrderEvent> record) {
        try {
            OrderEvent event = record.value();
            processOrder(event);
        } catch (Exception e) {
            // Enviar a topico DLQ
            kafkaTemplate.send("orders.dlq", record.key(), record.value());
            System.err.println("Sent to DLQ: " + e.getMessage());
        }
    }

    private void processOrder(OrderEvent event) {
        if (event.getOrderId() == null) {
            throw new IllegalArgumentException("Missing orderId");
        }
        // Logica de negocio
    }
}
```

### 5. Batch Listener

```java
package com.example.kafka;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class BatchOrderConsumer {

    @KafkaListener(
        topics = "orders",
        groupId = "order-batch-service",
        batch = "true"
    )
    public void handleBatch(List<ConsumerRecord<String, OrderEvent>> records, Acknowledgment ack) {
        System.out.println("Processing batch of " + records.size() + " records");

        for (ConsumerRecord<String, OrderEvent> record : records) {
            try {
                processOrder(record.value());
            } catch (Exception e) {
                System.err.println("Failed to process record at offset " + record.offset() + ": " + e);
                // Continuar procesando el resto del batch
            }
        }

        // Acknowledge despues de que el batch se procesa
        ack.acknowledge();
    }

    private void processOrder(OrderEvent event) {
        // Logica de negocio
    }
}
```

### 6. Acknowledgment Manual

```java
@Service
public class ManualAckConsumer {

    @KafkaListener(topics = "orders", groupId = "order-manual-service")
    public void handleOrder(
        ConsumerRecord<String, OrderEvent> record,
        Acknowledgment acknowledgment
    ) {
        try {
            OrderEvent event = record.value();
            processOrder(event);
            // Acknowledge solo despues de procesamiento exitoso
            acknowledgment.acknowledge();
        } catch (Exception e) {
            // No acknowledge — el mensaje se re-entregara
            System.err.println("Processing failed, not acknowledging: " + e);
            // Opcionalmente: dormir y reintentar, o enviar a DLQ
        }
    }
}
```

### 7. Routing Basado en Headers

```java
@Service
public class RoutingConsumer {

    @KafkaListener(topics = "events", groupId = "event-processor")
    public void handleEvent(
        ConsumerRecord<String, byte[]> record,
        Acknowledgment ack
    ) {
        String eventType = new String(record.headers().lastHeader("event-type").value());

        switch (eventType) {
            case "ORDER_CREATED" -> processOrderCreated(record.value());
            case "ORDER_CANCELLED" -> processOrderCancelled(record.value());
            case "PAYMENT_PROCESSED" -> processPayment(record.value());
            default -> System.err.println("Unknown event type: " + eventType);
        }

        ack.acknowledge();
    }
}
```

### 8. Multiples Topicos con Diferentes Containers

```java
@Configuration
public class MultiTopicConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> ordersFactory(
            ConsumerFactory<String, Object> cf) {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(cf);
        factory.setConcurrency(3);
        return factory;
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> paymentsFactory(
            ConsumerFactory<String, Object> cf) {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(cf);
        factory.setConcurrency(2);
        return factory;
    }
}

@Service
public class MultiTopicConsumer {

    @KafkaListener(topics = "orders", groupId = "multi-service", containerFactory = "ordersFactory")
    public void handleOrder(OrderEvent event) {
        processOrder(event);
    }

    @KafkaListener(topics = "payments", groupId = "multi-service", containerFactory = "paymentsFactory")
    public void handlePayment(PaymentEvent event) {
        processPayment(event);
    }
}
```

## Como Funciona

1. **`@KafkaListener`**: Spring escanea esta anotacion y crea un message listener container por cada metodo. El container gestiona el ciclo de vida del consumer, polling y dispatch de mensajes al handler.
2. **Container factory**: El `ConcurrentKafkaListenerContainerFactory` crea instancias de `ConcurrentMessageListenerContainer`. `setConcurrency(n)` crea N threads de consumer, cada uno asignado a particiones por Kafka.
3. **Modos de acknowledgment**: `MANUAL` requiere `ack.acknowledge()` explicito. `MANUAL_IMMEDIATE` commitea sincronamente. `BATCH` commitea despues de cada batch. `RECORD` commitea despues de cada record.
4. **Batch listener**: Establecer `batch = "true"` hace que el listener reciba un `List<ConsumerRecord>` en lugar de registros individuales. Esto reduce overhead por mensaje y habilita operaciones batch en base de datos.
5. **Manejo de errores**: Sin un error handler, las excepciones se propagan y el container se detiene. Usa un `DefaultErrorHandler` o `ErrorHandler` custom para manejar fallos sin detener el container.

## Variantes

### Retry con Dead Letter Topic

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, Object> retryFactory(
        ConsumerFactory<String, Object> cf,
        KafkaTemplate<String, Object> template) {
    ConcurrentKafkaListenerContainerFactory<String, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(cf);

    // Reintentar 3 veces con backoff exponencial, luego enviar a DLT
    DefaultErrorHandler errorHandler = new DefaultErrorHandler(
        new DeadLetterPublishingRecoverer(template),
        new ExponentialBackOffWithMaxRetries(3)
    );
    factory.setCommonErrorHandler(errorHandler);

    return factory;
}
```

### Filtrado de Mensajes

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, Object> filteringFactory(
        ConsumerFactory<String, Object> cf) {
    ConcurrentKafkaListenerContainerFactory<String, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(cf);

    // Solo procesar ordenes con status "PENDING"
    factory.setRecordFilterStrategy(record -> {
        OrderEvent event = (OrderEvent) record.value();
        return !"PENDING".equals(event.getStatus());
    });

    return factory;
}
}
```

### Asignacion de Particiones de Topico

```java
@KafkaListener(
    topics = "orders",
    groupId = "partitioned-service",
    topicPartitions = @TopicPartition(
        topic = "orders",
        partitions = {"0", "1", "2"}
    )
)
public void handlePartition(ConsumerRecord<String, OrderEvent> record) {
    System.out.println("Partition " + record.partition() + " offset " + record.offset());
}
```

## Mejores Practicas

- **Deshabilitar auto-commit**: Establece `enable-auto-commit: false` y usa acknowledgment manual. Esto previene commits de offset antes de que el procesamiento complete.
- **Establecer `concurrency` segun particiones**: Si el topico tiene 6 particiones, establece `concurrency=6` para maximo paralelismo. Threads extra estan inactivos.
- **Usar batch listeners para alto throughput**: El procesamiento en batch reduce overhead por mensaje y habilita operaciones bulk en base de datos. Establece `MAX_POLL_RECORDS_CONFIG` para controlar el tamano del batch.
- **Siempre manejar errores**: Excepciones no manejadas detienen el container. Usa `DefaultErrorHandler` con `DeadLetterPublishingRecoverer` para retry automatico y DLQ.
- **Usar `JsonDeserializer` con trusted packages**: Solo deserializa clases de paquetes confiables para prevenir vulnerabilidades de deserializacion.
- **Monitorear consumer lag**: Usa Spring Boot Actuator con indicadores de salud de Kafka, o Micrometer para rastrear metricas de lag.

## Errores Comunes

- **No establecer `ack-mode`**: El modo default `BATCH` commitea despues de cada batch. Si necesitas garantias por record, establece `ack-mode: manual` y acknowledge explicitamente.
- **Bloquear en el listener**: Operaciones de larga duracion bloquean el consumer, previniendo polls y disparando rebalance. Descarga trabajo pesado a un thread pool.
- **No configurar `MAX_POLL_RECORDS_CONFIG`**: El default de 500 records por poll puede ser demasiado para procesamiento lento. Reduce para evitar timeout de `max.poll.interval.ms`.
- **Usar auto-commit con procesamiento lento**: Auto-commit corre cada 5 segundos. Si el procesamiento toma mas, los offsets se commitean antes de que el procesamiento complete — perdida de datos en crash.
- **No manejar errores de deserializacion**: Si un mensaje no se puede deserializar, el consumer se atasca. Usa `ErrorHandlingDeserializer` para manejar fallos de deserializacion graceful.

## FAQ

**Como funciona `concurrency` en Spring Kafka?**

`concurrency` establece el numero de threads de consumer. Cada thread crea un KafkaConsumer separado. Kafka asigna particiones a consumers — con 6 particiones y `concurrency=3`, cada thread obtiene 2 particiones.

**Cual es la diferencia entre ack mode `BATCH` y `MANUAL`?**

`BATCH` commitea offsets despues de que cada batch de records se procesa. `MANUAL` requiere `ack.acknowledge()` explicito — dando control total sobre cuando se commitean los offsets. Usa `MANUAL` para garantias por record.

**Como reintento mensajes fallidos?**

Usa `DefaultErrorHandler` con `ExponentialBackOffWithMaxRetries`. Despues del maximo de reintentos, el `DeadLetterPublishingRecoverer` envia el mensaje a un topico dead-letter. Configura esto en el container factory.

**Puedo consumir de multiples topicos con un listener?**

Si. `@KafkaListener(topics = {"orders", "payments"})` se suscribe a multiples topicos. Todos los mensajes van al mismo handler. Usa routing basado en headers para diferenciar tipos de mensaje.

**Como manejo errores de deserializacion?**

Usa `ErrorHandlingDeserializer` como value deserializer. Captura excepciones de deserializacion y retorna `null` o un header `DeserializationException`. Configura un `DefaultErrorHandler` para saltar o enviar a DLQ estos mensajes.
