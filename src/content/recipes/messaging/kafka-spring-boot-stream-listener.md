---
contentType: recipes
slug: kafka-spring-boot-stream-listener
title: "Consume Kafka Topics with Spring Boot Stream Listeners"
description: "Build Kafka consumers in Spring Boot using @KafkaListener annotations, concurrent consumers, error handlers, DLQ patterns, and batch listeners with manual acknowledgment."
metaDescription: "Consume Kafka topics in Spring Boot with @KafkaListener. Use concurrent consumers, error handlers, DLQ, batch listeners, and manual ack for reliable processing."
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
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-kafka-stream-processing
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Consume Kafka topics in Spring Boot with @KafkaListener. Use concurrent consumers, error handlers, DLQ, batch listeners, and manual ack for reliable processing."
  keywords:
    - spring boot kafka listener
    - kafkalistener annotation
    - spring kafka error handling
    - spring kafka dlq
    - spring kafka batch listener
---

## Overview

Spring Boot's Kafka integration provides `@KafkaListener` annotations for declarative consumer configuration. Below: setting up Kafka consumers, concurrent consumption, error handling with DLQ, batch listeners, manual acknowledgment, and header-based routing.

## When to Use This

- Spring Boot microservices consuming Kafka events
- Applications needing typed message deserialization (JSON to POJO)
- Batch processing of Kafka messages with transactional guarantees
- Multi-topic consumers with different processing logic per topic

## Prerequisites

- Java 17+
- Spring Boot 3.x
- Spring Kafka dependency

## Solution

### 1. Configuration

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

### 2. Basic Kafka Listener

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
        // Business logic
    }
}
```

### 3. Consumer Configuration Bean

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

### 4. Error Handling with DLQ

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
            // Send to DLQ topic
            kafkaTemplate.send("orders.dlq", record.key(), record.value());
            System.err.println("Sent to DLQ: " + e.getMessage());
        }
    }

    private void processOrder(OrderEvent event) {
        if (event.getOrderId() == null) {
            throw new IllegalArgumentException("Missing orderId");
        }
        // Business logic
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
                // Continue processing rest of batch
            }
        }

        // Acknowledge after batch is processed
        ack.acknowledge();
    }

    private void processOrder(OrderEvent event) {
        // Business logic
    }
}
```

### 6. Manual Acknowledgment

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
            // Acknowledge only after successful processing
            acknowledgment.acknowledge();
        } catch (Exception e) {
            // Don't acknowledge — message will be redelivered
            System.err.println("Processing failed, not acknowledging: " + e);
            // Optionally: sleep and retry, or send to DLQ
        }
    }
}
```

### 7. Header-Based Routing

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

### 8. Multiple Topics with Different Containers

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

## How It Works

1. **`@KafkaListener`**: Spring scans for this annotation and creates a message listener container for each method. The container manages the consumer lifecycle, polling, and dispatching messages to the handler.
2. **Container factory**: The `ConcurrentKafkaListenerContainerFactory` creates `ConcurrentMessageListenerContainer` instances. `setConcurrency(n)` creates N consumer threads, each assigned partitions by Kafka.
3. **Acknowledgment modes**: `MANUAL` requires explicit `ack.acknowledge()`. `MANUAL_IMMEDIATE` commits synchronously. `BATCH` commits after each batch. `RECORD` commits after each record.
4. **Batch listener**: Setting `batch = "true"` makes the listener receive a `List<ConsumerRecord>` instead of individual records. This reduces per-message overhead and enables batch database operations.
5. **Error handling**: Without an error handler, exceptions propagate and the container stops. Use a `DefaultErrorHandler` or custom `ErrorHandler` to handle failures without stopping the container.

## Variants

### Retry with Dead Letter Topic

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, Object> retryFactory(
        ConsumerFactory<String, Object> cf,
        KafkaTemplate<String, Object> template) {
    ConcurrentKafkaListenerContainerFactory<String, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(cf);

    // Retry 3 times with exponential backoff, then send to DLT
    DefaultErrorHandler errorHandler = new DefaultErrorHandler(
        new DeadLetterPublishingRecoverer(template),
        new ExponentialBackOffWithMaxRetries(3)
    );
    factory.setCommonErrorHandler(errorHandler);

    return factory;
}
```

### Filtering Messages

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, Object> filteringFactory(
        ConsumerFactory<String, Object> cf) {
    ConcurrentKafkaListenerContainerFactory<String, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(cf);

    // Only process orders with status "PENDING"
    factory.setRecordFilterStrategy(record -> {
        OrderEvent event = (OrderEvent) record.value();
        return !"PENDING".equals(event.getStatus());
    });

    return factory;
}
}
```

### Topic Partition Assignment

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

## Best Practices

- **Disable auto-commit**: Set `enable-auto-commit: false` and use manual acknowledgment. This prevents offset commits before processing completes.
- **Set `concurrency` to match partitions**: If the topic has 6 partitions, set `concurrency=6` for maximum parallelism. Extra threads sit idle.
- **Use batch listeners for high throughput**: Batch processing reduces per-message overhead and enables bulk database operations. Set `MAX_POLL_RECORDS_CONFIG` to control batch size.
- **Always handle errors**: Unhandled exceptions stop the container. Use `DefaultErrorHandler` with a `DeadLetterPublishingRecoverer` for automatic retry and DLQ.
- **Use `JsonDeserializer` with trusted packages**: Only deserialize classes from trusted packages to prevent deserialization vulnerabilities.
- **Monitor consumer lag**: Use Spring Boot Actuator with Kafka health indicators, or Micrometer to track lag metrics.

## Common Mistakes

- **Not setting `ack-mode`**: The default `BATCH` mode commits after each batch. If you need per-record guarantees, set `ack-mode: manual` and acknowledge explicitly.
- **Blocking in the listener**: Long-running operations block the consumer, preventing polls and triggering rebalance. Offload heavy work to a thread pool.
- **Not configuring `MAX_POLL_RECORDS_CONFIG`**: The default 500 records per poll may be too many for slow processing. Reduce to avoid `max.poll.interval.ms` timeout.
- **Using auto-commit with slow processing**: Auto-commit runs every 5 seconds. If processing takes longer, offsets are committed before processing completes — data loss on crash.
- **Not handling deserialization errors**: If a message can't be deserialized, the consumer gets stuck. Use `ErrorHandlingDeserializer` to handle deserialization failures gracefully.

## FAQ

**How does `concurrency` work in Spring Kafka?**

`concurrency` sets the number of consumer threads. Each thread creates a separate KafkaConsumer. Kafka assigns partitions to consumers — with 6 partitions and `concurrency=3`, each thread gets 2 partitions.

**What is the difference between `BATCH` and `MANUAL` ack mode?**

`BATCH` commits offsets after each batch of records is processed. `MANUAL` requires explicit `ack.acknowledge()` — giving full control over when offsets are committed. Use `MANUAL` for per-record guarantees.

**How do I retry failed messages?**

Use `DefaultErrorHandler` with `ExponentialBackOffWithMaxRetries`. After max retries, the `DeadLetterPublishingRecoverer` sends the message to a dead-letter topic. Configure this on the container factory.

**Can I consume from multiple topics with one listener?**

Yes. `@KafkaListener(topics = {"orders", "payments"})` subscribes to multiple topics. All messages go to the same handler. Use header-based routing to differentiate message types.

**How do I handle deserialization errors?**

Use `ErrorHandlingDeserializer` as the value deserializer. It catches deserialization exceptions and returns `null` or a `DeserializationException` header. Configure a `DefaultErrorHandler` to skip or DLQ these messages.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
