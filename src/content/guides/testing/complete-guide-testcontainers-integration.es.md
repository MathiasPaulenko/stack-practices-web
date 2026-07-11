---
contentType: guides
slug: complete-guide-testcontainers-integration
title: "Testcontainers: Dependencias Reales en Integration Tests"
description: "Dominá Testcontainers para integration testing con databases reales, message brokers y APIs. Cubre Java, Python y Node.js con test fixtures basados en Docker."
metaDescription: "Dominá Testcontainers para integration testing: databases reales, message brokers y APIs en Docker containers. Cubre Java, Python y Node.js con test fixtures."
difficulty: advanced
topics:
  - testing
  - devops
tags:
  - guide
  - testcontainers
  - integration-testing
  - docker
  - java
  - python
  - nodejs
relatedResources:
  - /guides/testing/test-driven-development-guide
  - /guides/testing/testing-strategy-guide
  - /guides/testing/complete-guide-pytest-production
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 18
seo:
  metaDescription: "Dominá Testcontainers para integration testing: databases reales, message brokers y APIs en Docker containers. Cubre Java, Python y Node.js con test fixtures."
  keywords:
    - testcontainers
    - integration testing
    - docker testing
    - testcontainers java
    - testcontainers python
    - testcontainers nodejs
---

## Introducción

Testcontainers es una librería que provee instancias livianas, desechables de Docker containers para integration testing. En vez de mockear databases, message brokers o APIs externas, levantás instancias reales en Docker containers que se crean antes de que corran los tests y se destruyen después. Esto te da integration tests que capturan issues reales — compatibilidad de drivers, diferencias de SQL dialect, serialization bugs — sin mantener infraestructura de test permanente. A continuación: Testcontainers en Java, Python y Node.js con patrones prácticos para databases, Kafka, Redis y containers personalizados.

## ¿Por qué Testcontainers?

### Mocks vs. dependencias reales

```
Mock approach:
- Rápido: no external services
- Frágil: los mocks drift del real behavior
- Ciego: SQL dialect issues, driver bugs, connection pooling — todo hidden

Testcontainers approach:
- Real: PostgreSQL, Kafka, Redis reales
- Accurate: captura dialect-specific SQL, connection issues, serialization bugs
- Aislado: cada test obtiene un container fresh, no shared state
- CI-friendly: Docker ya está en tu CI pipeline
```

## Java con Testcontainers

### Dependencias de Maven

```xml
<!-- pom.xml — Testcontainers para Java -->
<dependencies>
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
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>kafka</artifactId>
        <version>1.20.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>redis</artifactId>
        <version>1.20.0</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### PostgreSQL container

```java
// PostgresIntegrationTest.java — Database integration test
import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.sql.*;

@Testcontainers
class PostgresIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test")
        .withReuse(true); // Reuse across test runs for speed

    private Connection connection;

    @BeforeEach
    void setUp() throws SQLException {
        connection = DriverManager.getConnection(
            postgres.getJdbcUrl(),
            postgres.getUsername(),
            postgres.getPassword()
        );
        try (Statement stmt = connection.createStatement()) {
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """);
        }
    }

    @AfterEach
    void tearDown() throws SQLException {
        try (Statement stmt = connection.createStatement()) {
            stmt.execute("DROP TABLE IF EXISTS users");
        }
        connection.close();
    }

    @Test
    void testInsertAndQuery() throws SQLException {
        try (PreparedStatement ps = connection.prepareStatement(
            "INSERT INTO users (email, name) VALUES (?, ?) RETURNING id"
        )) {
            ps.setString(1, "alice@example.com");
            ps.setString(2, "Alice");
            ResultSet rs = ps.executeQuery();
            assertTrue(rs.next());
            int id = rs.getInt("id");
            assertTrue(id > 0);
        }

        try (Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM users")) {
            assertTrue(rs.next());
            assertEquals(1, rs.getInt(1));
        }
    }

    @Test
    void testUniqueConstraint() throws SQLException {
        try (PreparedStatement ps = connection.prepareStatement(
            "INSERT INTO users (email, name) VALUES (?, ?)"
        )) {
            ps.setString(1, "bob@example.com");
            ps.setString(2, "Bob");
            ps.executeUpdate();
        }

        // Duplicate email should fail
        SQLException ex = assertThrows(SQLException.class, () -> {
            try (PreparedStatement ps = connection.prepareStatement(
                "INSERT INTO users (email, name) VALUES (?, ?)"
            )) {
                ps.setString(1, "bob@example.com");
                ps.setString(2, "Bob 2");
                ps.executeUpdate();
            }
        });
        assertTrue(ex.getMessage().contains("unique constraint"));
    }
}
```

### Kafka container

```java
// KafkaIntegrationTest.java — Kafka integration test
import org.junit.jupiter.api.*;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import java.time.Duration;
import java.util.*;

@Testcontainers
class KafkaIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer("confluentinc/cp-kafka:7.6.0");

    private Properties producerProps;
    private Properties consumerProps;

    @BeforeEach
    void setUp() {
        producerProps = new Properties();
        producerProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        producerProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        producerProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

        consumerProps = new Properties();
        consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, "test-group");
        consumerProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
    }

    @Test
    void testProduceAndConsume() {
        String topic = "test-topic";

        // Produce
        try (KafkaProducer<String, String> producer = new KafkaProducer<>(producerProps)) {
            ProducerRecord<String, String> record = new ProducerRecord<>(topic, "key1", "value1");
            producer.send(record);
            producer.flush();
        }

        // Consume
        try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(consumerProps)) {
            consumer.subscribe(List.of(topic));
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(10));
            assertEquals(1, records.count());
            ConsumerRecord<String, String> record = records.iterator().next();
            assertEquals("key1", record.key());
            assertEquals("value1", record.value());
        }
    }
}
```

### Redis container

```java
// RedisIntegrationTest.java — Redis integration test
import org.junit.jupiter.api.*;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import redis.clients.jedis.Jedis;

@Testcontainers
class RedisIntegrationTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

    private Jedis jedis;

    @BeforeEach
    void setUp() {
        jedis = new Jedis(redis.getHost(), redis.getMappedPort(6379));
    }

    @AfterEach
    void tearDown() {
        jedis.flushAll();
        jedis.close();
    }

    @Test
    void testSetAndGet() {
        jedis.set("key1", "value1");
        assertEquals("value1", jedis.get("key1"));
    }

    @Test
    void testHashOperations() {
        jedis.hset("user:1", "name", "Alice");
        jedis.hset("user:1", "email", "alice@example.com");

        Map<String, String> hash = jedis.hgetAll("user:1");
        assertEquals("Alice", hash.get("name"));
        assertEquals("alice@example.com", hash.get("email"));
    }

    @Test
    void testListOperations() {
        jedis.lpush("queue", "item1", "item2", "item3");
        assertEquals(3, jedis.llen("queue"));
        assertEquals("item3", jedis.rpop("queue"));
        assertEquals("item2", jedis.rpop("queue"));
    }
}
```

## Python con Testcontainers

### PostgreSQL

```python
# tests/integration/test_postgres.py — Testcontainers en Python
import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine, text

@pytest.fixture(scope="module")
def postgres_container():
    with PostgresContainer("postgres:16") as postgres:
        yield postgres

@pytest.fixture(scope="module")
def db_engine(postgres_container):
    engine = create_engine(postgres_container.get_connection_url())
    return engine

@pytest.fixture(scope="function")
def db_session(db_engine):
    with db_engine.connect() as conn:
        # Setup
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL
            )
        """))
        conn.commit()
        yield conn
        # Cleanup
        conn.execute(text("DROP TABLE IF EXISTS users"))
        conn.commit()

def test_insert_user(db_session):
    result = db_session.execute(text(
        "INSERT INTO users (email, name) VALUES (:email, :name) RETURNING id"
    ), {"email": "alice@example.com", "name": "Alice"})
    db_session.commit()
    assert result.fetchone()[0] > 0

def test_unique_email_constraint(db_session):
    db_session.execute(text(
        "INSERT INTO users (email, name) VALUES ('bob@test.com', 'Bob')"
    ))
    db_session.commit()

    with pytest.raises(Exception) as exc_info:
        db_session.execute(text(
            "INSERT INTO users (email, name) VALUES ('bob@test.com', 'Bob2')"
        ))
        db_session.commit()
    assert "unique" in str(exc_info.value).lower()
```

### Redis

```python
# tests/integration/test_redis.py — Redis con Testcontainers
import pytest
from testcontainers.redis import RedisContainer
import redis

@pytest.fixture(scope="module")
def redis_container():
    with RedisContainer("redis:7-alpine") as container:
        yield container

@pytest.fixture
def redis_client(redis_container):
    client = redis.Redis(
        host=redis_container.get_container_host_ip(),
        port=redis_container.get_exposed_port(6379),
        decode_responses=True,
    )
    yield client
    client.flushall()

def test_string_operations(redis_client):
    redis_client.set("key1", "value1")
    assert redis_client.get("key1") == "value1"

def test_hash_operations(redis_client):
    redis_client.hset("user:1", mapping={"name": "Alice", "email": "alice@test.com"})
    assert redis_client.hget("user:1", "name") == "Alice"
    assert redis_client.hgetall("user:1") == {"name": "Alice", "email": "alice@test.com"}

def test_list_operations(redis_client):
    redis_client.lpush("queue", "item1", "item2", "item3")
    assert redis_client.llen("queue") == 3
    assert redis_client.rpop("queue") == "item3"
```

### Kafka

```python
# tests/integration/test_kafka.py — Kafka con Testcontainers
import pytest
from testcontainers.kafka import KafkaContainer
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError
import json

@pytest.fixture(scope="module")
def kafka_container():
    with KafkaContainer() as kafka:
        yield kafka

@pytest.fixture
def producer(kafka_container):
    p = KafkaProducer(
        bootstrap_servers=kafka_container.get_bootstrap_server(),
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
    )
    yield p
    p.close()

@pytest.fixture
def consumer(kafka_container):
    c = KafkaConsumer(
        "test-topic",
        bootstrap_servers=kafka_container.get_bootstrap_server(),
        auto_offset_reset="earliest",
        group_id="test-group",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        consumer_timeout_ms=10000,
    )
    yield c
    c.close()

def test_produce_and_consume(producer, consumer):
    producer.send("test-topic", key="key1", value={"message": "hello"})
    producer.flush()

    records = list(consumer)
    assert len(records) >= 1
    assert records[-1].key == "key1"
    assert records[-1].value == {"message": "hello"}
```

## Node.js con Testcontainers

### Setup

```bash
npm install -D testcontainers @testcontainers/postgresql @testcontainers/redis
```

### PostgreSQL

```typescript
// tests/integration/postgres.test.ts — Testcontainers en Node.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

describe("PostgreSQL integration", () => {
  let container: StartedPostgreSqlContainer;
  let client: Client;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16")
      .withDatabase("testdb")
      .withUsername("test")
      .withPassword("test")
      .start();

    client = new Client({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    await container.stop();
  });

  beforeEach(async () => {
    await client.query("DROP TABLE IF EXISTS users");
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL
      )
    `);
  });

  it("inserts and retrieves a user", async () => {
    const result = await client.query(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      ["alice@example.com", "Alice"]
    );
    expect(result.rows[0].id).toBeGreaterThan(0);

    const count = await client.query("SELECT COUNT(*) FROM users");
    expect(parseInt(count.rows[0].count)).toBe(1);
  });

  it("enforces unique email constraint", async () => {
    await client.query(
      "INSERT INTO users (email, name) VALUES ($1, $2)",
      ["bob@example.com", "Bob"]
    );

    await expect(
      client.query("INSERT INTO users (email, name) VALUES ($1, $2)", ["bob@example.com", "Bob2"])
    ).rejects.toThrow(/unique/i);
  });
});
```

### Redis

```typescript
// tests/integration/redis.test.ts — Redis con Testcontainers
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";
import Redis from "ioredis";

describe("Redis integration", () => {
  let container: StartedRedisContainer;
  let redis: Redis;

  beforeAll(async () => {
    container = await new RedisContainer("redis:7-alpine").start();
    redis = new Redis(container.getPort(), container.getHost());
  });

  afterAll(async () => {
    await redis.quit();
    await container.stop();
  });

  beforeEach(async () => {
    await redis.flushall();
  });

  it("sets and gets a string", async () => {
    await redis.set("key1", "value1");
    expect(await redis.get("key1")).toBe("value1");
  });

  it("performs hash operations", async () => {
    await redis.hset("user:1", "name", "Alice", "email", "alice@test.com");
    expect(await redis.hget("user:1", "name")).toBe("Alice");
    expect(await redis.hgetall("user:1")).toEqual({
      name: "Alice",
      email: "alice@test.com",
    });
  });
});
```

## Custom Containers

```java
// CustomContainerTest.java — Custom container para cualquier Docker image
import org.junit.jupiter.api.*;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.net.http.*;
import java.net.URI;

@Testcontainers
class CustomContainerTest {

    @Container
    static GenericContainer<?> mockServer = new GenericContainer<>("mockserver/mockserver:5.15.0")
        .withExposedPorts(1080)
        .withEnv("MOCKSERVER_INITIALIZATION_JSON_PATH", "/config/expectations.json")
        .withClasspathResourceMapping("config/expectations.json",
            "/config/expectations.json",
            BindMode.READ_ONLY);

    @Test
    void testMockServerResponse() throws Exception {
        String baseUrl = String.format("http://%s:%d",
            mockServer.getHost(),
            mockServer.getMappedPort(1080));

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/api/users"))
            .GET()
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("users"));
    }
}
```

## Best Practices

- Usá `withReuse(true)` para containers que no cambian — acelera local development
- Scopeá containers a `@Container` (per-test) o `static` (per-class) según necesidades de isolation
- Siempre cleanupeá state en `@BeforeEach` — los containers persisten entre tests en la misma class
- Usá versiones de image específicas — `postgres:16` no `postgres:latest` para reproducibility
- Seteá resource limits en CI — `withMemory()` y `withCPUs()` previenen container resource exhaustion
- Usá `WaitStrategy` para slow-starting containers — `withStartupTimeout(Duration.ofMinutes(2))`
- Mantené container images chicas — Alpine variants arrancan más rápido
- Corré integration tests separados de unit tests — `mvn test -DexcludedGroups=integration` para feedback rápido

## Common Mistakes

- **Usar `latest` tag**: las images cambian entre runs, causando flaky tests. Pineá versiones específicas.
- **No cleanupear state entre tests**: data de un test afecta a otro. Usá `@BeforeEach` cleanup.
- **Container por test**: crear un container nuevo para cada test es lento. Usá `static` containers con cleanup.
- **No startup timeout**: algunos containers tardan más que el default 60s. Seteá `withStartupTimeout`.
- **No disposear containers**: los containers leakean si no se stoppean properly. Usá try-with-resources o `@AfterAll`.

## FAQ

### ¿Qué es Testcontainers?

Una librería que crea Docker containers para integration tests. Soporta Java (JUnit, Spring), Python (pytest), Node.js, Go y .NET con modules para services comunes como PostgreSQL, Kafka, Redis y Elasticsearch.

### ¿Cómo se diferencia Testcontainers de mocking?

Mocking simula behavior en code. Testcontainers corre services reales en Docker containers, capturando issues que los mocks hidden: diferencias de SQL dialect, connection pooling, serialization y driver compatibility.

### ¿Testcontainers requiere Docker?

Sí. Docker debe estar instalado y corriendo en la máquina que ejecuta los tests. En CI, Docker está típicamente pre-instalado en GitHub Actions, GitLab CI y la mayoría de CI runners.

### ¿Cómo acelero los tests de Testcontainers?

Usá `withReuse(true)` para mantener containers vivos entre test runs. Usá `static` containers shared entre tests en una class. Usá Alpine-based images para startup más rápido. Corré unit tests separados de integration tests.

### ¿Puedo usar Testcontainers con Spring Boot?

Sí. Agregá la dependencia `spring-boot-testcontainers`. Usá `@ServiceConnection` para auto-configurar Spring Data sources desde container properties. Esto elimina la configuración manual de `@DynamicPropertySource`.
