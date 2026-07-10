---
contentType: recipes
slug: java-testcontainers-integration
title: "Testcontainers para Tests de Integración en Java"
description: "Cómo usar Testcontainers en JUnit5 para levantar contenedores reales de Postgres, Redis y Kafka para tests de integración confiables y reproducibles."
metaDescription: "Usa Testcontainers en JUnit5 para correr contenedores reales de Postgres, Redis y Kafka en tests de integración para testing confiable de DB y messaging."
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
  metaDescription: "Usa Testcontainers en JUnit5 para correr contenedores reales de Postgres, Redis y Kafka en tests de integración para testing confiable de DB y messaging."
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

Testcontainers levanta contenedores Docker reales (Postgres, Redis, Kafka, etc.) durante el ciclo de vida de tus tests. En lugar de mockear el comportamiento de la base de datos, testeo contra la cosa real — mismo dialecto SQL, mismo connection pooling, mismos edge cases. Los contenedores se crean antes de que corran los tests y se destruyen después, sin dejar residuos.

## When to Use

- Tests de integración que necesitan una base de datos real (Postgres, MySQL, MongoDB)
- Testear código que usa features específicas de la base de datos (JSONB, arrays, full-text search)
- Verificar scripts de migración contra un schema real
- Testear message consumers con un broker real de Kafka o RabbitMQ
- Testear contra un Redis real para lógica de cache invalidation

## When NOT to Use

- Unit tests — los mocks son más rápidos y suficientes para tests de lógica
- Entornos de CI sin Docker — Testcontainers requiere un Docker daemon
- Tests que corren en segundos — el startup del contenedor añade 5-15 segundos por contenedor
- Testear HTTP clients — usa WireMock en su lugar (más ligero y rápido)

## Solution

### Setup con Maven

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

### Setup con Gradle

```groovy
testImplementation 'org.testcontainers:testcontainers:1.20.0'
testImplementation 'org.testcontainers:junit-jupiter:1.20.0'
testImplementation 'org.testcontainers:postgresql:1.20.0'
```

### Contenedor Postgres con JUnit5

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

### Contenedor Redis

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

### Contenedor Kafka

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

### Pattern de contenedor compartido para tests más rápidos

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

### Usando `@DynamicPropertySource` con Spring Boot

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

### Usar `ComposeContainer` para setups multi-servicio

```java
@Container
static DockerComposeContainer<?> compose = new DockerComposeContainer<>(
    new File("docker-compose-test.yml")
).withExposedService("postgres", 5432)
 .withExposedService("redis", 6379);
```

### Usar `Network` para comunicación contenedor-a-contenedor

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

- Usa `withReuse(true)` y setea `testcontainers.reuse.enable=true` en `.testcontainers.properties` para mantener contenedores entre ejecuciones de test
- Usa contenedores `static` con `@Container` — arrancan una vez por clase de test, no por test
- Usa `@DynamicPropertySource` con Spring Boot para inyectar URLs de contenedor en la config de la aplicación
- Setea timeout de startup: `withStartupTimeout(Duration.ofMinutes(2))` para imágenes lentas
- Usa `withInitScript("init.sql")` para correr setup de schema cuando el contenedor arranca
- Pre-pullea imágenes antes de CI: `docker pull postgres:16-alpine` para evitar timeout en el primer run

## Common Mistakes

- **No usar contenedores `static`**: los contenedores non-static arrancan/detienen por método de test, añadiendo 10-30 segundos por test.
- **Olvidar el requisito de Docker**: Testcontainers necesita Docker corriendo. En CI, usa Docker-in-Docker o Docker socket binding.
- **Usar tags latest**: `postgres:latest` puede cambiar entre runs, rompiendo tests. Pinea a una versión específica.
- **No limpiar datos entre tests**: usa `@Transactional` + `@Rollback` o trunca tablas en `@BeforeEach`.
- **Ignorar el tiempo de startup del contenedor**: si un test toma 15 segundos, 12 de los cuales son startup, considera contenedores compartidos o modo reuse.

## FAQ

### ¿Cómo acelero Testcontainers en CI?

Usa `withReuse(true)` para mantener contenedores vivos entre ejecuciones de test. En CI, pre-pullea imágenes en un paso de setup. Usa contenedores estáticos compartidos en lugar de contenedores por test.

### ¿Puedo correr Testcontainers sin Docker Desktop?

Sí. En Linux, usa el Docker daemon directamente. En macOS/Windows, usa Colima o Rancher Desktop como runtime Docker ligero.

### ¿Cómo corro migraciones de schema dentro de un contenedor?

Usa `withInitScript("init.sql")` para schemas simples. Para Flyway o Liquibase, arranca el contenedor, obtén la JDBC URL y corre migraciones programáticamente en `@BeforeAll`.

### ¿Puedo usar Testcontainers con Kotlin?

Sí. La API es la misma. Usa `companion object` para contenedores estáticos:

```kotlin
companion object {
    @Container
    @JvmStatic
    val postgres = PostgreSQLContainer("postgres:16-alpine")
}
```

### ¿Cómo debuggeo un contenedor que no arranca?

Usa `withLogTo(new Slf4jLogConsumer(logger))` para ver los logs del contenedor. Verifica el espacio en disco de Docker, disponibilidad de imagen y conflictos de puertos.

### ¿Cómo acelero la ejecución de tests con Testcontainers?

Usa `@Testcontainers` con reuse de contenedores: setea `testcontainers.reuse.enable=true` en `.testcontainers.properties`. Esto mantiene los contenedores vivos entre runs de tests en lugar de destruirlos y recrearlos. También usa `withReuse(true)` en las definiciones de contenedores.

### ¿Puedo usar Testcontainers con Spring Boot?

Sí. Agrega la dependencia starter de `testcontainers` para Spring Boot. Usa `@ServiceConnection` en los campos de contenedor para auto-configurar los Data sources de Spring:

```java
@SpringBootTest
@Testcontainers
class MyIntegrationTest {
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
}
```
