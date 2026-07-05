---
contentType: recipes
slug: java-junit5-assertions-soft
title: "JUnit5 Soft Assertions con AssertJ"
description: "Cómo usar AssertJ soft assertions en JUnit5 para recolectar múltiples fallos de aserción en un solo test en lugar de detenerse en el primer fallo."
metaDescription: "Usa AssertJ soft assertions en JUnit5 para recolectar múltiples fallos por test, mejorando el feedback y reduciendo reruns para objetos complejos."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - java
  - junit5
  - assertj
  - soft-assertions
  - recipe
relatedResources:
  - /recipes/testing/unit-testing
  - /recipes/testing/java-testcontainers-integration
  - /recipes/testing/java-wiremock-stub-external
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa AssertJ soft assertions en JUnit5 para recolectar múltiples fallos por test, mejorando el feedback y reduciendo reruns para objetos complejos."
  keywords:
    - testing
    - java
    - junit5
    - assertj
    - soft-assertions
    - recipe
---

## Overview

Las aserciones estándar de JUnit5 se detienen en el primer fallo. Cuando verificas un objeto con múltiples campos, ves un error y tienes que corregir y volver a ejecutar para encontrar el siguiente. AssertJ soft assertions recolectan todos los fallos y los reportan juntos, dándote el panorama completo en una sola ejecución de test.

## When to Use

- Verificar un objeto con 5+ campos donde cualquier combinación puede fallar
- Testear un body de respuesta con headers, status y payload simultáneamente
- Validar una transformación de datos donde múltiples propiedades de salida deben cumplirse
- Quieres ciclos de debugging más rápidos — ver todos los fallos a la vez en lugar de uno por ejecución

## When NOT to Use

- Aserciones de un solo campo — un `assertEquals` estándar es más simple y claro
- Aserciones que dependen entre sí (si A falla, B no tiene sentido) — usa aserciones regulares
- Suites de test críticas en performance con miles de aserciones — soft assertions añaden overhead

## Solution

### Setup con Maven

```xml
<dependency>
    <groupId>org.assertj</groupId>
    <artifactId>assertj-core</artifactId>
    <version>3.26.0</version>
    <scope>test</scope>
</dependency>
```

### Setup con Gradle

```groovy
testImplementation 'org.assertj:assertj-core:3.26.0'
```

### Soft assertion básico

```java
import org.assertj.core.api.SoftAssertions;
import org.junit.jupiter.api.Test;

class UserTest {

    @Test
    void should_validate_all_user_fields() {
        User user = userService.findById(1);

        SoftAssertions softly = new SoftAssertions();
        softly.assertThat(user.getId()).isEqualTo(1);
        softly.assertThat(user.getEmail()).isEqualTo("alice@example.com");
        softly.assertThat(user.getRole()).isEqualTo("admin");
        softly.assertThat(user.isActive()).isTrue();
        softly.assertThat(user.getCreatedAt()).isNotNull();
        softly.assertAll();
    }
}
```

### Usando `assertSoftly` lambda

```java
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

import org.junit.jupiter.api.Test;

class OrderTest {

    @Test
    void should_validate_order_response() {
        OrderResponse response = orderService.placeOrder(request);

        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode()).isEqualTo(201);
            softly.assertThat(response.getOrderId()).isNotNull();
            softly.assertThat(response.getTotal()).isEqualByComparingTo("99.99");
            softly.assertThat(response.getItems()).hasSize(3);
            softly.assertThat(response.getEstimatedDelivery()).isAfterOrEqualTo(LocalDate.now().plusDays(1));
        });
    }
}
```

### Soft assertions en colecciones

```java
@Test
void should_validate_all_products() {
    List<Product> products = productRepository.findAll();

    SoftAssertions softly = new SoftAssertions();
    softly.assertThat(products).hasSize(50);

    for (Product p : products) {
        softly.assertThat(p.getName()).isNotBlank();
        softly.assertThat(p.getPrice()).isPositive();
        softly.assertThat(p.getSku()).matches("^[A-Z]{3}-\\d{4}$");
    }
    softly.assertAll();
}
```

### Mensajes de aserción personalizados

```java
@Test
void should_validate_with_custom_messages() {
    Config config = configService.load("production");

    SoftAssertions softly = new SoftAssertions();
    softly.assertThat(config.getTimeout())
        .as("Production timeout must be at least 30s")
        .isGreaterThanOrEqualTo(30);
    softly.assertThat(config.getRetries())
        .as("Production retries must be between 1 and 5")
        .isBetween(1, 5);
    softly.assertThat(config.getFeatureFlags())
        .as("Feature flags must include 'monitoring'")
        .containsKey("monitoring");
    softly.assertAll();
}
```

### Soft assertions con AssertJ object assertions

```java
@Test
void should_validate_user_dto() {
    UserDto user = UserDto.builder()
        .id(42)
        .name("Alice")
        .email("alice@example.com")
        .role("admin")
        .active(true)
        .build();

    assertThat(user)
        .usingRecursiveComparison()
        .ignoringFields("createdAt")
        .isEqualTo(expectedUser);
}
```

## Variants

### JUnit5 `assertAll` (built-in)

```java
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Test
void should_validate_with_junit5_assert_all() {
    User user = userService.findById(1);

    assertAll(
        () -> assertEquals(1, user.getId()),
        () -> assertEquals("alice@example.com", user.getEmail()),
        () -> assertTrue(user.isActive()),
        () -> assertEquals("admin", user.getRole())
    );
}
```

### Soft assertions con `@RegisterExtension`

```java
import org.assertj.core.api.junit.jupiter.SoftAssertionsExtension;
import org.assertj.core.api.SoftAssertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;

class ServiceTest {

    @RegisterExtension
    final SoftAssertionsExtension soft = new SoftAssertionsExtension();

    @Test
    void should_validate(ServiceSoftAssertions softly) {
        Result result = service.execute();
        softly.assertThat(result.getCode()).isEqualTo(200);
        softly.assertThat(result.getData()).isNotEmpty();
    }
}
```

## Best Practices

- Llama `softly.assertAll()` al final — sin eso, los fallos se ignoran silenciosamente
- Usa `assertSoftly` lambda para sintaxis más limpia cuando no necesitas reusar el objeto `SoftAssertions`
- Agrega mensajes personalizados con `.as()` para aserciones no obvias — aparecen en el output de fallos
- No mezcles soft y hard assertions en el mismo test — la hard assertion se detiene antes, arruinando el propósito
- Mantén los bloques de soft assertion enfocados en un objeto o respuesta lógica

## Common Mistakes

- **Olvidar `assertAll()`**: soft assertions sin `assertAll()` siempre pasan, incluso cuando las aserciones fallan.
- **Usar soft assertions para tests independientes**: cada test debería verificar un comportamiento. Soft assertions son para múltiples checks en la misma unidad lógica.
- **Sobreusar soft assertions para checks simples**: si tienes 2 aserciones, `assertEquals` regular está bien. Soft assertions brillan con 5+ checks.
- **No agregar mensajes descriptivos**: cuando 10 aserciones fallan, necesitas contexto para saber cuál es cuál.

## FAQ

### ¿Cuál es la diferencia entre AssertJ soft assertions y JUnit5 assertAll?

Ambos recolectan múltiples fallos. `assertAll` usa aserciones estándar de JUnit5. AssertJ soft assertions te dan métodos fluidos (`assertThat`, `isNotNull`, `matches`) que son más legibles y type-safe.

### ¿Puedo usar soft assertions con aserciones personalizadas?

Sí. Crea una clase de aserción personalizada de AssertJ extendiendo `AbstractAssert`, luego úsala dentro de un bloque `SoftAssertions`:

```java
softly.assertThat(user).hasValidEmail().hasActiveSubscription();
```

### ¿Las soft assertions funcionan con excepciones?

No. Soft assertions recolectan fallos de aserción, no excepciones. Si el código lanza una excepción, el test falla inmediatamente. Usa `assertThatThrownBy` para testing de excepciones.

### ¿Cómo veo todos los fallos de soft assertions en CI?

AssertJ imprime todos los fallos a standard output cuando se llama `assertAll()`. En CI, revisa el reporte de tests — el mensaje de fallo lista cada aserción fallida con su descripción personalizada.
