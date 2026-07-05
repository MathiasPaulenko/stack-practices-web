---
contentType: recipes
slug: java-junit5-assertions-soft
title: "JUnit5 Soft Assertions with AssertJ"
description: "How to use AssertJ soft assertions in JUnit5 to collect multiple assertion failures in a single test instead of stopping at the first failure."
metaDescription: "Use AssertJ soft assertions in JUnit5 to collect multiple failures per test, improving feedback and reducing test reruns for complex objects."
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
  metaDescription: "Use AssertJ soft assertions in JUnit5 to collect multiple failures per test, improving feedback and reducing test reruns for complex objects."
  keywords:
    - testing
    - java
    - junit5
    - assertj
    - soft-assertions
    - recipe
---

## Overview

Standard JUnit5 assertions stop at the first failure. When verifying an object with multiple fields, you see one error and have to fix and rerun to find the next. AssertJ soft assertions collect all failures and report them together, giving you the full picture in a single test run.

## When to Use

- Verifying an object with 5+ fields where any combination might fail
- Testing a response body with headers, status, and payload simultaneously
- Validating a data transformation where multiple output properties should hold
- You want faster debugging cycles — see all failures at once instead of one per run

## When NOT to Use

- Single-field assertions — a standard `assertEquals` is simpler and clearer
- Assertions that depend on each other (if A fails, B is meaningless) — use regular assertions
- Performance-critical test suites with thousands of assertions — soft assertions add overhead

## Solution

### Setup with Maven

```xml
<dependency>
    <groupId>org.assertj</groupId>
    <artifactId>assertj-core</artifactId>
    <version>3.26.0</version>
    <scope>test</scope>
</dependency>
```

### Setup with Gradle

```groovy
testImplementation 'org.assertj:assertj-core:3.26.0'
```

### Basic soft assertion

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

### Using `assertSoftly` lambda

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

### Soft assertions on collections

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

### Custom assertion messages

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

### Soft assertions with AssertJ object assertions

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

### Soft assertions with `@RegisterExtension`

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

- Call `softly.assertAll()` at the end — without it, failures are silently swallowed
- Use `assertSoftly` lambda for cleaner syntax when you don't need to reuse the `SoftAssertions` object
- Add custom messages with `.as()` for non-obvious assertions — they appear in failure output
- Don't mix soft and hard assertions in the same test — the hard assertion stops early, defeating the purpose
- Keep soft assertion blocks focused on one logical object or response

## Common Mistakes

- **Forgetting `assertAll()`**: soft assertions without `assertAll()` always pass, even when assertions fail.
- **Using soft assertions for independent tests**: each test should verify one behavior. Soft assertions are for multiple checks on the same logical unit.
- **Overusing soft assertions for simple checks**: if you have 2 assertions, regular `assertEquals` is fine. Soft assertions shine at 5+ checks.
- **Not adding descriptive messages**: when 10 assertions fail, you need context to know which is which.

## FAQ

### What is the difference between AssertJ soft assertions and JUnit5 assertAll?

Both collect multiple failures. `assertAll` uses standard JUnit5 assertions. AssertJ soft assertions give you fluent assertion methods (`assertThat`, `isNotNull`, `matches`) which are more readable and type-safe.

### Can I use soft assertions with custom assertions?

Yes. Create a custom AssertJ assertion class extending `AbstractAssert`, then use it inside a `SoftAssertions` block:

```java
softly.assertThat(user).hasValidEmail().hasActiveSubscription();
```

### Do soft assertions work with exceptions?

No. Soft assertions collect assertion failures, not exceptions. If code throws an exception, the test fails immediately. Use `assertThatThrownBy` for exception testing.

### How do I see all soft assertion failures in CI?

AssertJ prints all failures to standard output when `assertAll()` is called. In CI, check the test report — the failure message lists every failed assertion with its custom description.
