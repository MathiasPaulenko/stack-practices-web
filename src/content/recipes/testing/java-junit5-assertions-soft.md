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
  - /recipes/unit-testing
  - /recipes/java-testcontainers-integration
  - /recipes/java-wiremock-stub-external
  - /guides/complete-guide-junit5-modern-testing
lastUpdated: "2026-07-09"
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


- For a deeper guide, see [Java Testcontainers Integration Tests](/recipes/java-testcontainers-integration/).

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

### How do I use soft assertions with parameterized tests?

Wrap each parameterized test invocation in its own `SoftAssertions` block. Do not share a `SoftAssertions` instance across parameter invocations — it accumulates failures from all runs. Use `@ParameterizedTest` with `@MethodSource` and assert within each invocation. If a single parameter fails, only that invocation fails, not the entire test.

### How do I combine soft assertions with Hamcrest matchers?

Use `assertThat(actual, matcher)` inside a `SoftAssertions` block. AssertJ's `SoftAssertions` supports Hamcrest matchers via `assertThat` overloads. Alternatively, use `MatcherAssert.assertThat` wrapped in a try-catch that collects `AssertionError` instances. This lets you migrate from Hamcrest to AssertJ gradually without rewriting all assertions at once.

### What is the performance impact of soft assertions?

Soft assertions add minimal overhead — each assertion is evaluated and stored in a list. The `assertAll()` call iterates the list and throws if any failed. For 10-20 assertions per test, the overhead is negligible. Avoid soft assertions in tight loops with thousands of iterations — use a single aggregate assertion instead (e.g., collect results into a list and assert once).

### How do I group soft assertions by logical section?

Use multiple `SoftAssertions` blocks per test, one per logical section (e.g., one for field validation, one for computed properties). Call `assertAll()` after each block so failures from the first section are reported before the second runs. This gives clearer test output and helps identify which logical section failed. Alternatively, use `SoftAssertionsProvider` with `assertSoftly` for a scoped block.

### Can I use soft assertions with Kotlin?

Yes. AssertJ works in Kotlin but consider using `assertk` or `Kluent` for more idiomatic Kotlin syntax. With AssertJ in Kotlin, use `SoftAssertions().apply { softly -> softly.assertThat(x).isEqualTo(y) }.assertAll()`. For Kotlin-specific soft assertions, `assertk` provides `assertAll { assert(x).isEqualTo(y) }` with a cleaner DSL.

### How do I migrate from JUnit4 Assert to JUnit5 soft assertions?

Replace `org.junit.Assert.assertEquals` calls with AssertJ `assertThat` inside a `SoftAssertions` block. Add AssertJ dependency (`org.assertj:assertj-core:3.25+`). Replace `Assert.assertEquals(expected, actual)` with `softly.assertThat(actual).isEqualTo(expected)`. Add `softly.assertAll()` at the end. The migration is mechanical — no test logic changes needed. Run both old and new assertions side by side during migration to catch regressions.

### How do I use soft assertions with collections?

AssertJ provides collection-specific assertions inside `SoftAssertions`. Use `softly.assertThat(list).hasSize(3).containsExactly("a", "b", "c")` to check multiple collection properties in one block. For nested collections, use `softly.assertThat(list).flatExtracting(Item::getTags).contains("tag1")`. For large collections, avoid `containsExactly` with soft assertions — if one element differs, the assertion message becomes unwieldy. Use `assertThat` with `contains` and `hasSize` separately for clearer failure messages.

### How do I use soft assertions with streams and reactive code?

For `Stream` and `Flux` assertions, collect the stream to a list first, then assert on the collected list. Do not assert on an open stream — terminal operations consume it. Use `softly.assertThat(stream.toList()).hasSize(3)` with AssertJ. For reactive streams (Project Reactor), use `StepVerifier` with `expectNext` and `expectComplete` — these are not soft assertions, so wrap multiple `StepVerifier` calls in separate test methods if you need independent failure reporting.

### How do I use soft assertions with JSON responses?

Use AssertJ's `assertThat(jsonNode).hasFieldOrProperty("name")` inside a `SoftAssertions` block. For Jackson `JsonNode`, extract fields with `node.get("field").asText()` and assert on each. For POJO deserialization, use `ObjectMapper.readValue(json, MyClass.class)` then assert on the deserialized object. AssertJ Guava provides `assertThat(jsonNode)` with JSON-specific assertions if you add `assertj-guava` dependency. For JSON arrays, use `softly.assertThat(arrayNode).hasSize(3)` and iterate with `arrayNode.elements()` to assert on each element individually.

### How do I use soft assertions with custom assertion classes?

Extend `AbstractSoftAssertions` to create custom soft assertion classes. Implement `assertThat(MyType actual)` returning a custom assertion that extends `AbstractAssert`. Register the class with `SoftAssertionsProvider` or use `SoftAssertions.assertSoftly(softly -> softly.assertThat(myObject).hasValidState())`. Custom assertions encapsulate domain-specific validation logic (e.g., `assertThat(user).isActive().hasValidEmail()`) and make test intent clearer than raw field-by-field assertions. Reuse custom assertions across test classes to reduce duplication and maintain consistency when domain rules change. Generate custom assertion classes with AssertJ's generator maven plugin to boilerplate-free assertions from your POJOs.

### How do I disable soft assertions in production tests?

Use JUnit5 `@Disabled` annotation on test classes that contain soft assertions if you need to skip them temporarily. For conditional disabling, use `@EnabledIfEnvironmentVariable` to run soft assertion tests only in CI. Do not wrap `softly.assertAll()` in a try-catch to suppress failures — this defeats the purpose. If soft assertions are too slow in CI, split them into a separate test suite tagged with `@Tag("soft")` and run them with Maven Surefire's `groups` configuration.
