---
contentType: guides
slug: complete-guide-junit5-modern-testing
title: "Complete Guide to JUnit 5: Extensions, Parameterized Tests, Dynamic Tests"
description: "Master JUnit 5 for modern Java testing: extensions model, parameterized tests, dynamic tests, test interfaces, lifecycle, conditional execution, and JUnit Platform integration."
metaDescription: "Master JUnit 5 for modern Java testing: extensions model, parameterized tests, dynamic tests, test interfaces, lifecycle, conditional execution, and JUnit Platform."
difficulty: intermediate
topics:
  - testing
tags:
  - guide
  - junit5
  - java
  - testing
  - extensions
  - parameterized
  - dynamic-tests
relatedResources:
  - /guides/testing/test-driven-development-guide
  - /guides/testing/testing-strategy-guide
  - /recipes/testing/api-mocking
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master JUnit 5 for modern Java testing: extensions model, parameterized tests, dynamic tests, test interfaces, lifecycle, conditional execution, and JUnit Platform."
  keywords:
    - junit5 tutorial
    - junit 5 extensions
    - parameterized tests junit
    - dynamic tests junit5
    - junit platform
    - java testing
---

## Introduction

JUnit 5 is a complete rewrite of the JUnit framework, built as a modular platform rather than a single library. It introduces an extensions model that replaces JUnit 4's runners and rules, first-class parameterized tests, dynamic test generation, and the JUnit Platform for running test engines. This guide covers the features that matter for production Java codebases: custom extensions, parameterized test patterns, dynamic tests for data-driven scenarios, conditional execution, and integration with Maven and Gradle.

## Architecture

JUnit 5 consists of three modules:

- **JUnit Platform**: The foundation for launching testing frameworks on the JVM. Provides the `TestEngine` API for IDEs and build tools.
- **JUnit Jupiter**: The new programming and extension model. This is what you use to write tests (`@Test`, `@ExtendWith`, etc.).
- **JUnit Vintage**: A compatibility layer for running JUnit 3 and 4 tests alongside JUnit 5.

## Lifecycle and Basics

### Test lifecycle annotations

```java
// LifecycleTest.java — JUnit 5 lifecycle
import org.junit.jupiter.api.*;

class LifecycleTest {

    @BeforeAll
    static void setUpAll() {
        // Runs once before all tests in the class
        // Must be static
    }

    @BeforeEach
    void setUp() {
        // Runs before each test
    }

    @Test
    void firstTest() {
        // Test logic here
    }

    @Test
    void secondTest() {
        // Test logic here
    }

    @AfterEach
    void tearDown() {
        // Runs after each test
    }

    @AfterAll
    static void tearDownAll() {
        // Runs once after all tests in the class
        // Must be static
    }
}
```

### Display names and tags

```java
// TaggedTest.java — Custom display names and tags
import org.junit.jupiter.api.*;

@DisplayName("Order Service Tests")
class OrderServiceTest {

    @Test
    @DisplayName("should calculate total with tax")
    @Tag("unit")
    void testCalculateTotalWithTax() {
        // Test logic
    }

    @Test
    @DisplayName("should reject order with negative quantity")
    @Tag("unit")
    @Tag("validation")
    void testNegativeQuantity() {
        // Test logic
    }

    @Test
    @DisplayName("should persist order to database")
    @Tag("integration")
    @Tag("slow")
    void testOrderPersistence() {
        // Test logic
    }
}
```

### Assertions

```java
// AssertionsTest.java — JUnit 5 assertions
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AssertionsTest {

    @Test
    void testBasicAssertions() {
        assertEquals(4, 2 + 2);
        assertNotEquals(5, 2 + 2);
        assertTrue(5 > 3);
        assertFalse(5 < 3);
        assertNull(null);
        assertNotNull(new Object());
    }

    @Test
    void testWithMessage() {
        assertEquals(4, 2 + 2, "2 + 2 should equal 4");
        // Lazy message using lambda (only evaluated on failure)
        assertEquals(4, 2 + 2, () -> "Calculation failed at runtime");
    }

    @Test
    void testGroupedAssertions() {
        // All assertions run even if one fails
        assertAll("user validation",
            () -> assertEquals("Alice", user.getName()),
            () -> assertEquals("alice@example.com", user.getEmail()),
            () -> assertTrue(user.isActive())
        );
    }

    @Test
    void testExceptions() {
        IllegalStateException ex = assertThrows(
            IllegalStateException.class,
            () -> service.processInvalidOrder()
        );
        assertEquals("Order cannot be processed", ex.getMessage());
    }

    @Test
    void testTimeout() {
        assertTimeout(
            java.time.Duration.ofSeconds(2),
            () -> service.fetchData()
        );

        // Preemptive: kills the operation if timeout exceeded
        assertTimeoutPreemptively(
            java.time.Duration.ofMillis(500),
            () -> service.quickLookup()
        );
    }
}
```

## Parameterized Tests

### Basic parameterized tests

```java
// ParameterizedTest.java — Parameterized tests with various sources
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

@ParameterizedTest
@ValueSource(ints = {1, 2, 3, 4, 5})
void testPositiveNumbers(int number) {
    assertTrue(number > 0);
}

@ParameterizedTest
@ValueSource(strings = {"", "  ", "\t", "\n"})
void testBlankStrings(String input) {
    assertTrue(input.isBlank());
}

@ParameterizedTest
@NullAndEmptySource
@ValueSource(strings = {"  ", "\t"})
void testBlankOrNullStrings(String input) {
    assertTrue(input == null || input.isBlank());
}
```

### CSV source

```java
// CsvSourceTest.java — CSV-based parameterized tests
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@ParameterizedTest
@CsvSource({
    "1, 1, 2",
    "2, 3, 5",
    "10, 20, 30",
    "-1, 1, 0",
    "0, 0, 0"
})
void testAddition(int a, int b, int expected) {
    assertEquals(expected, calculator.add(a, b));
}

@ParameterizedTest
@CsvSource({
    "Alice, 30, true",
    "Bob, 17, false",
    "Charlie, 18, true",
    "Diana, 16, false"
})
void testAgeValidation(String name, int age, boolean canVote) {
    Person person = new Person(name, age);
    assertEquals(canVote, person.canVote());
}
```

### Method source

```java
// MethodSourceTest.java — Data from methods
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import java.util.stream.Stream;

static Stream<Arguments> provideTestData() {
    return Stream.of(
        Arguments.of("admin", "ADMIN", true),
        Arguments.of("user", "USER", true),
        Arguments.of("guest", "GUEST", true),
        Arguments.of("admin", "USER", false)
    );
}

@ParameterizedTest
@MethodSource("provideTestData")
void testRoleCheck(String username, String expectedRole, boolean match) {
    User user = userService.findByUsername(username);
    assertEquals(match, user.hasRole(expectedRole));
}

// Using objects directly
record TestCase(String input, String expected, String description) {}

static Stream<TestCase> provideComplexTestData() {
    return Stream.of(
        new TestCase("hello", "HELLO", "lowercase to uppercase"),
        new TestCase("WORLD", "WORLD", "already uppercase"),
        new TestCase("", "", "empty string"),
        new TestCase("123", "123", "numeric string")
    );
}

@ParameterizedTest
@MethodSource("provideComplexTestData")
void testUppercase(TestCase tc) {
    assertEquals(tc.expected(), tc.input().toUpperCase());
}
```

### Custom display names for parameters

```java
// DisplayNameTest.java — Custom parameterized display names
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@ParameterizedTest(name = "[{index}] {0} + {1} = {2}")
@CsvSource({
    "1, 2, 3",
    "10, 20, 30",
    "100, 200, 300"
})
void testAdditionWithName(int a, int b, int expected) {
    assertEquals(expected, calculator.add(a, b));
}

@ParameterizedTest(name = "{0} should be valid")
@ValueSource(strings = {"user@example.com", "admin@company.org"})
void testValidEmails(String email) {
    assertTrue(validator.isValid(email));
}
```

## Extensions Model

### Custom extension

```java
// RetryExtension.java — Retry failed tests automatically
import org.junit.jupiter.api.extension.*;
import java.lang.reflect.Method;

public class RetryExtension implements InvocationInterceptor {

    private static final int MAX_RETRIES = 3;

    @Override
    public void interceptTestTemplateMethod(
            Invocation<Void> invocation,
            ReflectiveInvocationContext<Method> invocationContext,
            ExtensionContext extensionContext) throws Throwable {

        Throwable lastError = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                invocation.proceed();
                return; // Success, no retry needed
            } catch (Throwable t) {
                lastError = t;
                System.out.printf("Attempt %d failed: %s%n", attempt, t.getMessage());
            }
        }
        throw lastError;
    }
}

// Usage
@ExtendWith(RetryExtension.class)
class FlakyServiceTest {

    @Test
    @DisplayName("should connect to external API")
    void testExternalApiConnection() {
        // Retried up to 3 times if it fails
        assertTrue(apiService.connect());
    }
}
```

### Parameter resolver extension

```java
// DatabaseExtension.java — Inject database connections into tests
import org.junit.jupiter.api.extension.*;
import org.junit.jupiter.api.*;

public class DatabaseExtension implements ParameterResolver, AfterTestExecutionCallback {

    private DatabaseConnection connection;

    @Override
    public boolean supportsParameter(ParameterContext parameterContext,
                                     ExtensionContext extensionContext) {
        return parameterContext.getParameter().getType() == DatabaseConnection.class;
    }

    @Override
    public Object resolveParameter(ParameterContext parameterContext,
                                   ExtensionContext extensionContext) {
        connection = new DatabaseConnection("jdbc:postgresql://localhost/test");
        connection.connect();
        return connection;
    }

    @Override
    public void afterTestExecution(ExtensionContext context) {
        if (connection != null) {
            connection.close();
        }
    }
}

// Usage
@ExtendWith(DatabaseExtension.class)
class OrderRepositoryTest {

    @Test
    void testFindById(DatabaseConnection db) {
        // db is automatically injected
        OrderRepository repo = new OrderRepository(db);
        Order order = repo.findById(1L);
        assertNotNull(order);
    }
}
```

### Conditional test execution

```java
// ConditionalExtension.java — Run tests based on environment
import org.junit.jupiter.api.extension.*;
import java.util.Optional;

public class EnvironmentCondition implements ExecutionCondition {

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        String env = System.getProperty("test.env", "local");

        // Check for @RequiresStaging annotation
        Optional<RequiresStaging> annotation = context.getTestMethod()
            .flatMap(method -> Optional.ofNullable(
                method.getAnnotation(RequiresStaging.class)));

        if (annotation.isPresent() && !"staging".equals(env)) {
            return ConditionEvaluationResult.disabled("Requires staging environment");
        }

        return ConditionEvaluationResult.enabled("Environment check passed");
    }
}

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@ExtendWith(EnvironmentCondition.class)
public @interface RequiresStaging {}

// Usage
class PaymentServiceTest {

    @Test
    @RequiresStaging
    void testRealPaymentGateway() {
        // Only runs when -Dtest.env=staging
    }
}
```

## Dynamic Tests

### Basic dynamic tests

```java
// DynamicTestTest.java — Generate tests at runtime
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.DynamicTest;
import static org.junit.jupiter.api.DynamicTest.*;

import java.util.stream.Stream;
import java.util.List;

class DynamicTestTest {

    @TestFactory
    Stream<DynamicTest> testStringOperations() {
        List<String> inputs = List.of("hello", "world", "java", "test");

        return inputs.stream()
            .map(input -> dynamicTest(
                "uppercase: " + input,
                () -> assertEquals(input.toUpperCase(), input.toUpperCase())
            ));
    }

    @TestFactory
    List<DynamicTest> testMultipleScenarios() {
        return List.of(
            dynamicTest("add positive numbers",
                () -> assertEquals(5, calculator.add(2, 3))),
            dynamicTest("add negative numbers",
                () -> assertEquals(-5, calculator.add(-2, -3))),
            dynamicTest("add zero",
                () -> assertEquals(5, calculator.add(5, 0)))
        );
    }
}
```

### Data-driven dynamic tests

```java
// DataDrivenTest.java — Dynamic tests from external data
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.DynamicTest.*;
import java.util.stream.Stream;
import java.util.List;

class DataDrivenTest {

    record TestCase(String name, Runnable test) {}

    @TestFactory
    Stream<DynamicTest> testAllValidationRules() {
        List<TestCase> cases = List.of(
            new TestCase("email is required", () -> {
                assertThrows(ValidationException.class,
                    () -> validator.validateEmail(null));
            }),
            new TestCase("email format is checked", () -> {
                assertThrows(ValidationException.class,
                    () -> validator.validateEmail("not-an-email"));
            }),
            new TestCase("valid email passes", () -> {
                assertDoesNotThrow(
                    () -> validator.validateEmail("user@example.com"));
            }),
            new TestCase("email with subdomain passes", () -> {
                assertDoesNotThrow(
                    () -> validator.validateEmail("user@mail.example.com"));
            })
        );

        return cases.stream()
            .map(tc -> dynamicTest(tc.name(), tc.test()));
    }
}
```

## Test Interfaces

### Default methods in test interfaces

```java
// TestInterface.java — Shared test logic via interfaces
import org.junit.jupiter.api.*;

public interface ComparableContract<T extends Comparable<T>> {

    T createSmallerValue();
    T createLargerValue();

    @Test
    @DisplayName("returns positive when comparing smaller to larger")
    default void returnsPositiveWhenSmallerComparedToLarger() {
        T smaller = createSmallerValue();
        T larger = createLargerValue();
        assertTrue(smaller.compareTo(larger) < 0);
    }

    @Test
    @DisplayName("returns negative when comparing larger to smaller")
    default void returnsNegativeWhenLargerComparedToSmaller() {
        T smaller = createSmallerValue();
        T larger = createLargerValue();
        assertTrue(larger.compareTo(smaller) > 0);
    }

    @Test
    @DisplayName("returns zero when comparing to self")
    default void returnsZeroWhenComparedToSelf() {
        T value = createSmallerValue();
        assertEquals(0, value.compareTo(value));
    }
}

// Implementation
class StringComparableTest implements ComparableContract<String> {

    @Override
    public String createSmallerValue() {
        return "apple";
    }

    @Override
    public String createLargerValue() {
        return "banana";
    }
}
```

## Nested Tests

```java
// NestedTest.java — Group related tests in nested classes
import org.junit.jupiter.api.*;

@DisplayName("Order Service")
class OrderServiceTest {

    @Nested
    @DisplayName("when creating an order")
    class WhenCreating {

        @Test
        @DisplayName("should assign a unique ID")
        void shouldAssignId() {
            Order order = service.create(new OrderRequest("item1", 2));
            assertNotNull(order.getId());
        }

        @Test
        @DisplayName("should set status to pending")
        void shouldSetPendingStatus() {
            Order order = service.create(new OrderRequest("item1", 2));
            assertEquals(OrderStatus.PENDING, order.getStatus());
        }

        @Nested
        @DisplayName("with invalid input")
        class WithInvalidInput {

            @Test
            @DisplayName("should reject empty item ID")
            void shouldRejectEmptyItem() {
                assertThrows(ValidationException.class,
                    () -> service.create(new OrderRequest("", 2)));
            }

            @Test
            @DisplayName("should reject negative quantity")
            void shouldRejectNegativeQuantity() {
                assertThrows(ValidationException.class,
                    () -> service.create(new OrderRequest("item1", -1)));
            }
        }
    }

    @Nested
    @DisplayName("when canceling an order")
    class WhenCanceling {

        @Test
        @DisplayName("should set status to canceled")
        void shouldSetCanceledStatus() {
            Order order = service.create(new OrderRequest("item1", 2));
            service.cancel(order.getId());
            assertEquals(OrderStatus.CANCELED, order.getStatus());
        }

        @Test
        @DisplayName("should reject canceling shipped orders")
        void shouldRejectShippedCancellation() {
            Order order = service.create(new OrderRequest("item1", 2));
            service.ship(order.getId());
            assertThrows(IllegalStateException.class,
                () -> service.cancel(order.getId()));
        }
    }
}
```

## Build Configuration

### Maven

```xml
<!-- pom.xml — JUnit 5 with Maven Surefire -->
<dependencies>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.11.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter-params</artifactId>
        <version>5.11.0</version>
        <scope>test</scope>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-surefire-plugin</artifactId>
            <version>3.3.0</version>
            <configuration>
                <groups>unit</groups>
                <excludedGroups>slow,integration</excludedGroups>
            </configuration>
        </plugin>
    </plugins>
</build>
```

### Gradle

```groovy
// build.gradle — JUnit 5 with Gradle
dependencies {
    testImplementation platform('org.junit:junit-bom:5.11.0')
    testImplementation 'org.junit.jupiter:junit-jupiter'
    testImplementation 'org.junit.jupiter:junit-jupiter-params'
}

test {
    useJUnitPlatform()
    filter {
        includeTags 'unit'
        excludeTags 'slow', 'integration'
    }
    testLogging {
        events 'passed', 'skipped', 'failed'
        exceptionFormat 'full'
    }
}

// Separate task for integration tests
task integrationTest(type: Test) {
    useJUnitPlatform()
    filter {
        includeTags 'integration'
    }
}
```

## Best Practices

- Use `@DisplayName` for readable test names — test reports become documentation
- Prefer parameterized tests over duplicated test methods
- Use `assertAll` for grouped assertions — all checks run even if one fails
- Use `@Tag` to classify tests — enables selective execution in CI
- Write custom extensions for cross-cutting test concerns — don't repeat setup code
- Use nested tests to structure complex test scenarios — improves readability
- Use `@TestFactory` for data-driven tests from external sources
- Set lazy assertion messages with lambdas — avoids string concatenation on success
- Use `@Nested` to share setup within a group of related tests
- Keep unit tests under 100ms — mock external dependencies

## Common Mistakes

- **Using `@BeforeAll` without static**: JUnit 5 requires `@BeforeAll` methods to be static unless `@TestInstance(Lifecycle.PER_CLASS)` is used.
- **Not using `assertAll`**: When multiple assertions fail, you only see the first. `assertAll` reports all failures.
- **Overusing `@Disabled`**: Disabled tests accumulate and become stale. Delete or fix them.
- **Ignoring parameterized test names**: Default names are ugly. Use `@ParameterizedTest(name = "...")` for readable output.
- **Not using tags**: Without tags, you can't selectively run tests in CI vs local development.

## FAQ

### What is the difference between JUnit 4 and JUnit 5?

JUnit 5 is a complete rewrite with a modular architecture (Platform, Jupiter, Vintage). It replaces runners/rules with extensions, adds first-class parameterized tests, dynamic tests, nested tests, and better assertion APIs. JUnit 4 tests can still run via the Vintage engine.

### How do I run JUnit 5 tests in Maven?

Add the `junit-jupiter` dependency and configure `maven-surefire-plugin` 3.x with `useJUnitPlatform()`. Run with `mvn test`.

### What are JUnit 5 extensions?

Extensions replace JUnit 4's `@RunWith` and `@Rule`. Implement interfaces like `ParameterResolver`, `InvocationInterceptor`, or `ExecutionCondition` to add custom behavior. Register with `@ExtendWith`.

### How do parameterized tests work in JUnit 5?

Use `@ParameterizedTest` with a source annotation (`@ValueSource`, `@CsvSource`, `@MethodSource`, `@EnumSource`). The test method runs once per parameter set.

### What are dynamic tests?

Tests generated at runtime via `@TestFactory`. Useful for data-driven testing where test cases come from external sources (files, databases, APIs). Each dynamic test has a display name and an executable.
