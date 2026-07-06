---
contentType: guides
slug: complete-guide-junit5-modern-testing
title: "Guía Completa de JUnit 5: Extensions, Tests Parametrizados, Dynamic Tests"
description: "Dominá JUnit 5 para testing moderno en Java: modelo de extensions, tests parametrizados, dynamic tests, test interfaces, lifecycle, conditional execution y JUnit Platform."
metaDescription: "Dominá JUnit 5 para testing moderno en Java: extensions, tests parametrizados, dynamic tests, test interfaces, lifecycle, conditional execution y JUnit Platform."
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
  metaDescription: "Dominá JUnit 5 para testing moderno en Java: extensions, tests parametrizados, dynamic tests, test interfaces, lifecycle, conditional execution y JUnit Platform."
  keywords:
    - junit5 tutorial
    - junit 5 extensions
    - parameterized tests junit
    - dynamic tests junit5
    - junit platform
    - java testing
---

## Introducción

JUnit 5 es una reescritura completa del framework JUnit, construido como una plataforma modular en vez de una sola librería. Introduce un modelo de extensions que reemplaza los runners y rules de JUnit 4, tests parametrizados de primera clase, generación de dynamic tests y el JUnit Platform para correr test engines. Esta guía cubre las features que importan para codebases de Java en producción: extensions personalizados, patrones de tests parametrizados, dynamic tests para escenarios data-driven, conditional execution e integración con Maven y Gradle.

## Arquitectura

JUnit 5 consiste en tres módulos:

- **JUnit Platform**: La fundación para lanzar testing frameworks en la JVM. Provee el `TestEngine` API para IDEs y build tools.
- **JUnit Jupiter**: El nuevo programming y extension model. Esto es lo que usás para escribir tests (`@Test`, `@ExtendWith`, etc.).
- **JUnit Vintage**: Una capa de compatibilidad para correr tests de JUnit 3 y 4 junto con JUnit 5.

## Lifecycle y Básicos

### Anotaciones de test lifecycle

```java
// LifecycleTest.java — JUnit 5 lifecycle
import org.junit.jupiter.api.*;

class LifecycleTest {

    @BeforeAll
    static void setUpAll() {
        // Corre una vez antes de todos los tests en la class
        // Debe ser static
    }

    @BeforeEach
    void setUp() {
        // Corre antes de cada test
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
        // Corre después de cada test
    }

    @AfterAll
    static void tearDownAll() {
        // Corre una vez después de todos los tests en la class
        // Debe ser static
    }
}
```

### Display names y tags

```java
// TaggedTest.java — Custom display names y tags
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
        // Lazy message usando lambda (solo evaluado en failure)
        assertEquals(4, 2 + 2, () -> "Calculation failed at runtime");
    }

    @Test
    void testGroupedAssertions() {
        // Todas las assertions corren incluso si una falla
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

        // Preemptive: killea la operation si timeout exceeded
        assertTimeoutPreemptively(
            java.time.Duration.ofMillis(500),
            () -> service.quickLookup()
        );
    }
}
```

## Tests Parametrizados

### Tests parametrizados básicos

```java
// ParameterizedTest.java — Tests parametrizados con various sources
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
// CsvSourceTest.java — Tests parametrizados basados en CSV
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
// MethodSourceTest.java — Data desde methods
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

// Usando objects directamente
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

### Custom display names para parámetros

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

## Modelo de Extensions

### Extension personalizado

```java
// RetryExtension.java — Retry automático de tests fallidos
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
        // Retried hasta 3 veces si falla
        assertTrue(apiService.connect());
    }
}
```

### Parameter resolver extension

```java
// DatabaseExtension.java — Inyectá database connections en tests
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
        // db es automáticamente inyectado
        OrderRepository repo = new OrderRepository(db);
        Order order = repo.findById(1L);
        assertNotNull(order);
    }
}
```

### Conditional test execution

```java
// ConditionalExtension.java — Corré tests basado en environment
import org.junit.jupiter.api.extension.*;
import java.util.Optional;

public class EnvironmentCondition implements ExecutionCondition {

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        String env = System.getProperty("test.env", "local");

        // Checkeá @RequiresStaging annotation
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
        // Solo corre cuando -Dtest.env=staging
    }
}
```

## Dynamic Tests

### Dynamic tests básicos

```java
// DynamicTestTest.java — Generá tests en runtime
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
// DataDrivenTest.java — Dynamic tests desde data externa
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

### Default methods en test interfaces

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
// NestedTest.java — Groupéa tests relacionados en nested classes
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

## Configuración de Build

### Maven

```xml
<!-- pom.xml — JUnit 5 con Maven Surefire -->
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
// build.gradle — JUnit 5 con Gradle
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

// Task separado para integration tests
task integrationTest(type: Test) {
    useJUnitPlatform()
    filter {
        includeTags 'integration'
    }
}
```

## Best Practices

- Usá `@DisplayName` para nombres de test legibles — los reports de test se vuelven documentation
- Preferí tests parametrizados sobre métodos de test duplicados
- Usá `assertAll` para grouped assertions — todos los checks corren incluso si uno falla
- Usá `@Tag` para clasificar tests — habilita ejecución selectiva en CI
- Escribí extensions personalizados para cross-cutting test concerns — no repetir setup code
- Usá nested tests para estructurar escenarios de test complejos — mejora readability
- Usá `@TestFactory` para data-driven tests desde fuentes externas
- Seteá lazy assertion messages con lambdas — evita string concatenation en success
- Usá `@Nested` para sharear setup dentro de un grupo de tests relacionados
- Mantené unit tests bajo 100ms — mockeá dependencias externas

## Common Mistakes

- **Usar `@BeforeAll` sin static**: JUnit 5 requiere que `@BeforeAll` methods sean static a menos que uses `@TestInstance(Lifecycle.PER_CLASS)`.
- **No usar `assertAll`**: Cuando múltiples assertions fallan, solo ves la primera. `assertAll` reporta todos los failures.
- **Overusear `@Disabled`**: Tests disabled se acumulan y se vuelven stale. Deletealos o fixealos.
- **Ignorar parameterized test names**: Los nombres default son feos. Usá `@ParameterizedTest(name = "...")` para output legible.
- **No usar tags**: Sin tags, no podés correr tests selectivamente en CI vs local development.

## FAQ

### ¿Cuál es la diferencia entre JUnit 4 y JUnit 5?

JUnit 5 es una reescritura completa con arquitectura modular (Platform, Jupiter, Vintage). Reemplaza runners/rules con extensions, agrega tests parametrizados de primera clase, dynamic tests, nested tests y mejor assertion API. Los tests de JUnit 4 pueden correr via el Vintage engine.

### ¿Cómo corro tests de JUnit 5 en Maven?

Agregá la dependencia `junit-jupiter` y configurá `maven-surefire-plugin` 3.x con `useJUnitPlatform()`. Corré con `mvn test`.

### ¿Qué son las extensions de JUnit 5?

Las extensions reemplazan `@RunWith` y `@Rule` de JUnit 4. Implementá interfaces como `ParameterResolver`, `InvocationInterceptor` o `ExecutionCondition` para agregar comportamiento custom. Registrá con `@ExtendWith`.

### ¿Cómo funcionan los tests parametrizados en JUnit 5?

Usá `@ParameterizedTest` con una source annotation (`@ValueSource`, `@CsvSource`, `@MethodSource`, `@EnumSource`). El test method corre una vez por cada set de parámetros.

### ¿Qué son los dynamic tests?

Tests generados en runtime via `@TestFactory`. Útiles para data-driven testing donde los test cases vienen de fuentes externas (files, databases, APIs). Cada dynamic test tiene un display name y un executable.
