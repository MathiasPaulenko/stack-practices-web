---
contentType: recipes
slug: java-testcontainers-integration
title: "Java Testcontainers Integration Tests"
description: "How to use Testcontainers in JUnit5 to spin up real Postgres, Redis, and Kafka containers for integration tests that are reliable and reproducible."
metaDescription: "Use Testcontainers in JUnit5 to run real Postgres, Redis, and Kafka containers in integration tests for reliable, reproducible database and messaging testing."
difficulty: advanced
topics:
  - testing
tags:
  - testing
  - java
  - testcontainers
  - junit5
  - docker
  - integration
  - recipe
relatedResources:
  - /recipes/testing/java-junit5-assertions-soft
  - /recipes/testing/integration-testing-strategies
  - /recipes/testing/java-wiremock-stub-external
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use Testcontainers in JUnit5 to run real Postgres, Redis, and Kafka containers in integration tests for reliable, reproducible database and messaging testing."
  keywords:
    - testing
    - java
    - testcontainers
    - junit5
    - docker
    - integration
    - recipe
---

## Overview

Testcontainers spins up real Docker containers (Postgres, Redis, Kafka, etc.) during your test lifecycle. Instead of mocking database behavior, you test against the real thing — same SQL dialect, same connection pooling, same edge cases. Containers are created before tests run and destroyed after, leaving no residue.

## When to Use

- Integration tests that need a real database (Postgres, MySQL, MongoDB)
- Testing code that uses database-specific features (JSONB, arrays, full-text search)
- Verifying migration scripts against a real schema
- Testing message consumers with a real Kafka or RabbitMQ broker
- Testing against a real Redis for cache invalidation logic

## When NOT to Use

- Unit tests — mocks are faster and sufficient for logic-only tests
- CI environments without Docker — Testcontainers requires a Docker daemon
- Tests that run in seconds — container startup adds 5-15 seconds per container
- Testing HTTP clients — use WireMock instead (lighter and faster)

## Solution

### Setup with Maven

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <version>1.20.0</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>1.20.0</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <version>1.20.0</version>
    <scope>test</scope>
</dependency>
```

### Setup with Gradle

```groovy
testImplementation 'org.testcontainers:testcontainers:1.20.0'
testImplementation 'org.testcontainers:junit-jupiter:1.20.0'
testImplementation 'org.testcontainers:postgresql:1.20.0'
```

### Postgres container with JUnit5

```java
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

@Testcontainers
class PostgresIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @Test
    void shouldCreateAndQueryTable() throws Exception {
        try (Connection conn = DriverManager.getConnection(
                postgres.getJdbcUrl(),
                postgres.getUsername(),
                postgres.getPassword())) {

            try (Statement stmt = conn.createStatement()) {
                stmt.execute("CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT UNIQUE)");
                stmt.execute("INSERT INTO users (email) VALUES ('alice@example.com')");

                ResultSet rs = stmt.executeQuery("SELECT * FROM users");
                rs.next();
                assert rs.getString("email").equals("alice@example.com");
            }
        }
    }
}
```

### Redis container

```java
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import redis.clients.jedis.Jedis;

@Testcontainers
class RedisIntegrationTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

    @Test
    void shouldSetAndGetValue() {
        String host = redis.getHost();
        Integer port = redis.getMappedPort(6379);

        try (Jedis jedis = new Jedis(host, port)) {
            jedis.set("test-key", "test-value");
            assert jedis.get("test-key").equals("test-value");
        }
    }
}
```

### Kafka container

```java
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicReference;

@Testcontainers
class KafkaIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer("confluentinc/cp-kafka:7.6.0");

    @Test
    void shouldProduceAndConsume() {
        Properties producerProps = new Properties();
        producerProps.put("bootstrap.servers", kafka.getBootstrapServers());
        producerProps.put("key.serializer", StringSerializer.class.getName());
        producerProps.put("value.serializer", StringSerializer.class.getName());

        try (Producer<String, String> producer = new KafkaProducer<>(producerProps)) {
            producer.send(new ProducerRecord<>("test-topic", "key", "hello-kafka"));
        }

        Properties consumerProps = new Properties();
        consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, "test-group");
        consumerProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());

        try (Consumer<String, String> consumer = new KafkaConsumer<>(consumerProps)) {
            consumer.subscribe(Collections.singletonList("test-topic"));
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(10));
            assert records.iterator().hasNext();
            assert records.iterator().next().value().equals("hello-kafka");
        }
    }
}
```

### Shared container pattern for faster tests

```java
public abstract class BaseIntegrationTest {

    static final PostgreSQLContainer<?> SHARED_POSTGRES;

    static {
        SHARED_POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withReuse(true);
        SHARED_POSTGRES.start();
    }

    protected String getJdbcUrl() {
        return SHARED_POSTGRES.getJdbcUrl();
    }
}
```

### Using `@DynamicPropertySource` with Spring Boot

```java
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@Testcontainers
@SpringBootTest
class UserRepositoryIntegrationTest extends BaseIntegrationTest {

    @DynamicPropertySource
    static void configureProperties(DynamicPropertySource registry) {
        registry.add("spring.datasource.url", SHARED_POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", SHARED_POSTGRES::getUsername);
        registry.add("spring.datasource.password", SHARED_POSTGRES::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldSaveAndFindUser() {
        User user = new User("alice@example.com", "Alice");
        userRepository.save(user);

        User found = userRepository.findByEmail("alice@example.com");
        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("Alice");
    }
}
```

## Variants

### Using `ComposeContainer` for multi-service setups

```java
@Container
static DockerComposeContainer<?> compose = new DockerComposeContainer<>(
    new File("docker-compose-test.yml")
).withExposedService("postgres", 5432)
 .withExposedService("redis", 6379);
```

### Using `Network` for container-to-container communication

```java
Network network = Network.newNetwork();

PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
    .withNetwork(network)
    .withNetworkAliases("db");

GenericContainer<?> app = new GenericContainer<>("myapp:latest")
    .withNetwork(network)
    .withEnv("DB_HOST", "db")
    .dependsOn(postgres);
```

## Best Practices

- Use `withReuse(true)` and set `testcontainers.reuse.enable=true` in `.testcontainers.properties` to keep containers between test runs
- Use `static` containers with `@Container` — they start once per test class, not per test
- Use `@DynamicPropertySource` with Spring Boot to inject container URLs into application config
- Set container startup timeout: `withStartupTimeout(Duration.ofMinutes(2))` for slow images
- Use `withInitScript("init.sql")` to run schema setup when the container starts
- Pull images before CI: `docker pull postgres:16-alpine` to avoid timeout on first run

## Common Mistakes

- **Not using `static` containers**: non-static containers start/stop per test method, adding 10-30 seconds per test.
- **Forgetting Docker requirement**: Testcontainers needs Docker running. In CI, use a Docker-in-Docker setup or Docker socket binding.
- **Using latest tags**: `postgres:latest` can change between runs, breaking tests. Pin to a specific version.
- **Not cleaning up data between tests**: use `@Transactional` + `@Rollback` or truncate tables in `@BeforeEach`.
- **Ignoring container startup time**: if a test takes 15 seconds, 12 of which are container startup, consider shared containers or reuse mode.

## FAQ

### How do I speed up Testcontainers in CI?

Use `withReuse(true)` to keep containers alive between test runs. In CI, pre-pull images in a setup step. Use shared static containers instead of per-test containers.

### Can I run Testcontainers without Docker Desktop?

Yes. On Linux, use the Docker daemon directly. On macOS/Windows, use Colima or Rancher Desktop as a lightweight Docker runtime.

### How do I run schema migrations inside a container?

Use `withInitScript("init.sql")` for simple schemas. For Flyway or Liquibase, start the container, get the JDBC URL, and run migrations programmatically in `@BeforeAll`.

### Can I use Testcontainers with Kotlin?

Yes. The API is the same. Use `companion object` for static containers:

```kotlin
companion object {
    @Container
    @JvmStatic
    val postgres = PostgreSQLContainer("postgres:16-alpine")
}
```

### How do I debug a container that won't start?

Use `withLogTo(new Slf4jLogConsumer(logger))` to see container logs. Check Docker disk space, image availability, and port conflicts.
