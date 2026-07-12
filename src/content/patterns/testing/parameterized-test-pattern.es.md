---

contentType: patterns
slug: parameterized-test-pattern
title: "Patrón Parameterized Test"
description: "Cómo escribir parameterized tests para verificar la misma lógica across múltiples inputs. Cubre pytest parametrize, Jest test.each, JUnit ParameterizedTest y data providers."
metaDescription: "Ejecuta la misma lógica de test across múltiples inputs con parameterized tests. Aprende pytest parametrize, Jest test.each, JUnit ParameterizedTest y data providers."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - parameterized
  - data-driven
  - test-cases
  - pattern
category: architectural
relatedResources:
  - /patterns/test-double-pattern
  - /patterns/fixture-setup-teardown-pattern
  - /patterns/snapshot-testing-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejecuta la misma lógica de test across múltiples inputs con parameterized tests. Aprende pytest parametrize, Jest test.each, JUnit ParameterizedTest y data providers."
  keywords:
    - testing
    - parameterized
    - data-driven
    - test-cases
    - pattern

---

## Overview

Los parameterized tests (también llamados data-driven tests) corren la misma lógica de test across múltiples combinaciones de input. En vez de escribir diez test functions separadas que cada una testea un input, escribís una test function y proveés una tabla de inputs y expected outputs. Esto reduce duplicación, hace fácil agregar nuevos test cases, y documenta claramente la relación entre inputs y comportamiento esperado.

## When to Use

- Testear pure functions con muchas combinaciones input-output
- Testear validators, parsers, formatters, y calculators
- Edge case testing — null, empty, boundary values, invalid inputs
- Testear el mismo comportamiento across diferentes configuraciones o entornos
- Cuando agregar un nuevo test case debería ser un one-line change

## When NOT to Use

- Tests con setup complex, unique per case — cada case necesita diferentes mocks o fixtures
- Tests que verifican interacción (mock calls) en vez de output — la parameterización agrega confusión
- Cuando cada test case tiene assertions diferentes — la lógica no es verdaderamente shared
- Para tests con side effects que requieren ordering cuidadoso — los parameterized tests deberían ser independientes

## Solution

### pytest parametrize

```python
# Python — pytest.mark.parametrize
import pytest

def add(a, b):
    return a + b

@pytest.mark.parametrize("a, b, expected", [
    (1, 2, 3),
    (0, 0, 0),
    (-1, 1, 0),
    (-1, -1, -2),
    (100, 200, 300),
    (0.1, 0.2, 0.3),
])
def test_add(a, b, expected):
    assert add(a, b) == pytest.approx(expected)
```

### pytest parametrize con IDs

```python
# Python — parametrize con test IDs para output legible
@pytest.mark.parametrize("input, expected", [
    ("hello", "HELLO"),
    ("world", "WORLD"),
    ("", ""),
    ("  spaces  ", "  SPACES  "),
    ("CamelCase", "CAMELCASE"),
    ("123abc", "123ABC"),
], ids=[
    "lowercase",
    "word",
    "empty",
    "with_spaces",
    "camelcase",
    "alphanumeric",
])
def test_to_upper(input, expected):
    assert input.upper() == expected
```

### pytest parametrize con múltiples parámetros

```python
# Python — múltiples parámetros y edge cases
@pytest.mark.parametrize("email, is_valid", [
    ("alice@example.com", True),
    ("bob@x.com", True),
    ("invalid", False),
    ("@example.com", False),
    ("alice@", False),
    ("alice@.com", False),
    ("", False),
    (None, False),
], ids=[
    "valid_standard",
    "valid_short",
    "no_at_symbol",
    "no_local_part",
    "no_domain",
    "dot_domain",
    "empty_string",
    "none_input",
])
def test_validate_email(email, is_valid):
    assert validate_email(email) == is_valid
```

### Jest test.each (formato tabla)

```javascript
// JavaScript — Jest test.each con syntax de tabla
describe('add', () => {
  test.each`
    a      | b      | expected
    ${1}   | ${2}   | ${3}
    ${0}   | ${0}   | ${0}
    ${-1}  | ${1}   | ${0}
    ${-1}  | ${-1}  | ${-2}
    ${100} | ${200} | ${300}
  `('returns $expected for $a + $b', ({ a, b, expected }) => {
    expect(add(a, b)).toBe(expected);
  });
});
```

### Jest test.each (formato array)

```javascript
// JavaScript — Jest test.each con formato array
describe('validateEmail', () => {
  test.each([
    ['alice@example.com', true],
    ['bob@x.com', true],
    ['invalid', false],
    ['@example.com', false],
    ['alice@', false],
    ['', false],
  ])('validateEmail("%s") returns %s', (email, expected) => {
    expect(validateEmail(email)).toBe(expected);
  });
});
```

### Jest describe.each para tests agrupados

```javascript
// JavaScript — Jest describe.each para grouping
describe.each([
  ['Celsius', 'Fahrenheit', c => c * 9/5 + 32],
  ['Fahrenheit', 'Celsius', f => (f - 32) * 5/9],
])('%s to %s conversion', (from, to, convert) => {
  test.each([
    [0, 32],
    [100, 212],
    [-40, -40],
    [37, 98.6],
  ])('%s° %s = %s° %s', (input, expected) => {
    expect(convert(input)).toBeCloseTo(expected, 1);
  });
});
```

### JUnit 5 ParameterizedTest

```java
// Java — JUnit 5 @ParameterizedTest
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class CalculatorTest {

    @ParameterizedTest
    @CsvSource({
        "1, 2, 3",
        "0, 0, 0",
        "-1, 1, 0",
        "-1, -1, -2",
        "100, 200, 300",
        "0.1, 0.2, 0.3"
    })
    void testAdd(double a, double b, double expected) {
        assertEquals(expected, calculator.add(a, b), 0.001);
    }

    @ParameterizedTest
    @ValueSource(strings = {"hello", "world", "test", "jest"})
    void testIsNotEmpty(String input) {
        assertFalse(input.isEmpty());
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 5, 8, 13, 21})
    void testIsPositive(int number) {
        assertTrue(number > 0);
    }
}
```

### JUnit 5 con MethodSource

```java
// Java — JUnit 5 @MethodSource para test data complex
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

class EmailValidatorTest {

    @ParameterizedTest
    @MethodSource("emailProvider")
    void testValidateEmail(String email, boolean expected) {
        assertEquals(expected, EmailValidator.isValid(email));
    }

    static Stream<Arguments> emailProvider() {
        return Stream.of(
            Arguments.of("alice@example.com", true),
            Arguments.of("bob@x.com", true),
            Arguments.of("invalid", false),
            Arguments.of("@example.com", false),
            Arguments.of("alice@", false),
            Arguments.of("", false),
            Arguments.of(null, false)
        );
    }
}
```

### JUnit 5 con EnumSource

```java
// Java — JUnit 5 @EnumSource para testear todos los enum values
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

enum OrderStatus { PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED }

class OrderStatusTest {

    @ParameterizedTest
    @EnumSource(OrderStatus.class)
    void testAllStatusesHaveDisplayName(OrderStatus status) {
        assertNotNull(status.getDisplayName());
        assertFalse(status.getDisplayName().isEmpty());
    }

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {"PENDING", "PROCESSING"})
    void testActiveStatusesCanBeCancelled(OrderStatus status) {
        assertTrue(OrderRules.canCancel(status));
    }

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {"DELIVERED", "CANCELLED"}, mode = EnumSource.Mode.EXCLUDE)
    void testNonFinalStatusesCanBeModified(OrderStatus status) {
        assertTrue(OrderRules.canModify(status));
    }
}
```

### Python con fixture + parametrize

```python
# Python — combinar fixtures con parametrize
@pytest.fixture
def calculator():
    return Calculator()

@pytest.mark.parametrize("expression, expected", [
    ("1 + 2", 3),
    ("10 - 5", 5),
    ("3 * 4", 12),
    ("20 / 4", 5),
    ("2 ** 3", 8),
    ("10 % 3", 1),
])
def test_calculator_operations(calculator, expression, expected):
    assert calculator.evaluate(expression) == expected

@pytest.mark.parametrize("expression", [
    "1 / 0",
    "10 % 0",
    "abc + 1",
    "",
    None,
])
def test_calculator_invalid_input(calculator, expression):
    with pytest.raises((ValueError, TypeError)):
        calculator.evaluate(expression)
```

### Cross-product parametrization

```python
# Python — parametrizar múltiples dimensiones (cross product)
@pytest.mark.parametrize("currency", ["USD", "EUR", "GBP", "JPY"])
@pytest.mark.parametrize("amount", [0, 100, 1000, 10000])
def test_format_currency(amount, currency):
    result = format_currency(amount, currency)
    assert currency in result
    assert str(amount) in result or format(amount, ",") in result
```

### Property-based testing (Hypothesis)

```python
# Python — property-based testing con Hypothesis
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_add_commutative(a, b):
    assert add(a, b) == add(b, a)

@given(st.integers(), st.integers(), st.integers())
def test_add_associative(a, b, c):
    assert add(add(a, b), c) == add(a, add(b, c))

@given(st.lists(st.integers()))
def test_sum_equals_len_times_mean(numbers):
    if numbers:
        assert sum(numbers) == len(numbers) * (sum(numbers) / len(numbers))

@given(st.text())
def test_upper_lower_roundtrip(s):
    assert s.upper().lower() == s.lower()
```

## Variants

### Data desde archivo externo

```python
# Python — cargar test data desde CSV
import csv
import pytest

def load_test_data():
    with open('tests/data/email_cases.csv') as f:
        reader = csv.DictReader(f)
        return [(row['email'], row['expected'] == 'true') for row in reader]

@pytest.mark.parametrize("email, expected", load_test_data())
def test_validate_email_from_csv(email, expected):
    assert validate_email(email) == expected
```

```csv
# tests/data/email_cases.csv
email,expected
alice@example.com,true
bob@x.com,true
invalid,false
@example.com,false
```

### Parameterized con custom names

```javascript
// JavaScript — Jest con custom test names
describe('fizzbuzz', () => {
  const cases = [
    { input: 1, expected: '1' },
    { input: 3, expected: 'Fizz' },
    { input: 5, expected: 'Buzz' },
    { input: 15, expected: 'FizzBuzz' },
    { input: 30, expected: 'FizzBuzz' },
    { input: 7, expected: '7' },
  ];

  test.each(cases)('fizzbuzz($input) → "$expected"', ({ input, expected }) => {
    expect(fizzbuzz(input)).toBe(expected);
  });
});
```

### Parameterized integration tests

```java
// Java — parameterized integration test con diferentes DB configs
@ParameterizedTest
@MethodSource("databaseConfigs")
void testUserCrudAcrossDatabases(DatabaseConfig config) {
    var repo = new UserRepository(config);
    
    // Create
    User user = repo.save(new User("Alice", "alice@x.com"));
    assertNotNull(user.getId());
    
    // Read
    User found = repo.findById(user.getId());
    assertEquals("Alice", found.getName());
    
    // Update
    found.setName("Alice Smith");
    repo.save(found);
    assertEquals("Alice Smith", repo.findById(user.getId()).getName());
    
    // Delete
    repo.delete(user.getId());
    assertNull(repo.findById(user.getId()));
}

static Stream<DatabaseConfig> databaseConfigs() {
    return Stream.of(
        new DatabaseConfig("h2", "jdbc:h2:mem:test"),
        new DatabaseConfig("sqlite", "jdbc:sqlite::memory:"),
        new DatabaseConfig("postgres", "jdbc:postgresql://localhost/testdb")
    );
}
```

## Best Practices


- For a deeper guide, see [JUnit 5: Extensions, Parameterized Tests, Dynamic Tests](/es/guides/complete-guide-junit5-modern-testing/).

- Usá descriptive test IDs — `ids` en pytest, template strings en Jest, names en JUnit
- Mantené test data legible — alineá columnas, agrupá cases relacionados
- Testeá edge cases — null, empty, boundary values, max/min, invalid input
- No over-parameterizes — si cada case necesita different setup, escribí tests separados
- Usá `pytest.approx` para floats — las floating point comparisons necesitan tolerance
- Agrupá por comportamiento, no por función — `test_email_validation` no `test_validate_email_valid` + `test_validate_email_invalid`
- Considerá property-based testing para funciones matemáticas — Hypothesis encuentra edge cases que te perderías
- Mantené las parameter lists cortas — si tenés 8 parámetros, tu función puede ser demasiado compleja

## Common Mistakes

- **Demasiados parámetros**: 6+ parámetros por case hace los tests illegibles. Extraé un objeto o spliteá el test.
- **Testear detalles de implementación**: los parameterized tests deberían testear outputs, no internal calls.
- **Edge cases faltantes**: los devs testean el happy path y se olvidan de null, empty, negative, y boundary values.
- **No usar IDs**: `test_add[0]` es useless cuando falla. Usá `test_add[zero_plus_zero]` en su lugar.
- **Mezclar concerns**: un parameterized test para inputs válidos e inválidos con assertion logic diferente es confuso. Splitealos.

## FAQ

### ¿Qué es un parameterized test?

Un test que corre la misma lógica con múltiples combinaciones input-output. En vez de escribir 10 test functions, escribís 1 y proveés una tabla de 10 cases.

### ¿En qué se diferencia de un loop dentro de un test?

Un loop dentro de un test reporta un pass/fail para todos los cases. Los parameterized tests reportan cada case separadamente — sabés exactamente qué input falló.

### ¿Qué es property-based testing?

En vez de proveer inputs específicos, definís properties (e.g., "la adición es commutative") y el framework genera random inputs para verificar que la property se mantenga. Hypothesis (Python) y fast-check (JavaScript) son tools populares.

### ¿Debería usar parameterized tests para integration tests?

Sí, cuando el mismo workflow aplica a diferentes configuraciones (e.g., testear CRUD against múltiples databases). Pero evitalo cuando cada configuración necesita different setup.

### ¿Cuántos test cases debería tener?

Suficientes para cubrir todas las equivalence classes: normal cases, edge cases, boundary values, y error cases. Típicamente 5-15 cases por parameterized test. Si tenés 50+, considerá property-based testing.
