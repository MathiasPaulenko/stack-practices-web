---
contentType: patterns
slug: parameterized-test-pattern
title: "Parameterized Test Pattern: Run the Same Logic Across Multiple Inputs"
description: "How to write parameterized tests to verify the same logic across multiple inputs. Covers pytest parametrize, Jest test.each, JUnit ParameterizedTest, and data providers."
metaDescription: "Run the same test logic across multiple inputs with parameterized tests. Learn pytest parametrize, Jest test.each, JUnit ParameterizedTest, and data providers."
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
  metaDescription: "Run the same test logic across multiple inputs with parameterized tests. Learn pytest parametrize, Jest test.each, JUnit ParameterizedTest, and data providers."
  keywords:
    - testing
    - parameterized
    - data-driven
    - test-cases
    - pattern
---

## Overview

Parameterized tests (also called data-driven tests) run the same test logic across multiple input combinations. Instead of writing ten separate test functions that each test one input, you write one test function and provide a table of inputs and expected outputs. This reduces duplication, makes it easy to add new test cases, and clearly documents the relationship between inputs and expected behavior.

## When to Use

- Testing pure functions with many input-output combinations
- Testing validators, parsers, formatters, and calculators
- Edge case testing — null, empty, boundary values, invalid inputs
- Testing the same behavior across different configurations or environments
- When adding a new test case should be a one-line change

## When NOT to Use

- Tests with complex, unique setup per case — each case needs different mocks or fixtures
- Tests that verify interaction (mock calls) rather than output — parameterization adds confusion
- When each test case has different assertions — the logic isn't truly shared
- For tests with side effects that require careful ordering — parameterized tests should be independent

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

### pytest parametrize with IDs

```python
# Python — parametrize with test IDs for readable output
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

### pytest parametrize with multiple parameters

```python
# Python — multiple parameters and edge cases
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

### Jest test.each (table format)

```javascript
// JavaScript — Jest test.each with table syntax
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

### Jest test.each (array format)

```javascript
// JavaScript — Jest test.each with array format
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

### Jest describe.each for grouped tests

```javascript
// JavaScript — Jest describe.each for grouping
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

### JUnit 5 with MethodSource

```java
// Java — JUnit 5 @MethodSource for complex test data
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

### JUnit 5 with EnumSource

```java
// Java — JUnit 5 @EnumSource for testing all enum values
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

### Python with fixture + parametrize

```python
# Python — combining fixtures with parametrize
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
# Python — parametrize multiple dimensions (cross product)
@pytest.mark.parametrize("currency", ["USD", "EUR", "GBP", "JPY"])
@pytest.mark.parametrize("amount", [0, 100, 1000, 10000])
def test_format_currency(amount, currency):
    result = format_currency(amount, currency)
    assert currency in result
    assert str(amount) in result or format(amount, ",") in result
```

### Property-based testing (Hypothesis)

```python
# Python — property-based testing with Hypothesis
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

### Data from external file

```python
# Python — load test data from CSV
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

### Parameterized with custom names

```javascript
// JavaScript — Jest with custom test names
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
// Java — parameterized integration test with different DB configs
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

- Use descriptive test IDs — `ids` in pytest, template strings in Jest, names in JUnit
- Keep test data readable — align columns, group related cases
- Test edge cases — null, empty, boundary values, max/min, invalid input
- Don't over-parameterize — if each case needs different setup, write separate tests
- Use `pytest.approx` for floats — floating point comparisons need tolerance
- Group by behavior, not by function — `test_email_validation` not `test_validate_email_valid` + `test_validate_email_invalid`
- Consider property-based testing for mathematical functions — Hypothesis finds edge cases you'd miss
- Keep parameter lists short — if you have 8 parameters, your function may be too complex

## Common Mistakes

- **Too many parameters**: 6+ parameters per case makes tests unreadable. Extract an object or split the test.
- **Testing implementation details**: parameterized tests should test outputs, not internal calls.
- **Missing edge cases**: developers test the happy path and forget null, empty, negative, and boundary values.
- **Not using IDs**: `test_add[0]` is useless when it fails. Use `test_add[zero_plus_zero]` instead.
- **Mixing concerns**: one parameterized test for both valid and invalid inputs with different assertion logic is confusing. Split them.

## FAQ

### What is a parameterized test?

A test that runs the same logic with multiple input-output combinations. Instead of writing 10 test functions, you write 1 and provide a table of 10 cases.

### How is this different from a loop inside a test?

A loop inside a test reports one pass/fail for all cases. Parameterized tests report each case separately — you know exactly which input failed.

### What is property-based testing?

Instead of providing specific inputs, you define properties (e.g., "addition is commutative") and the framework generates random inputs to verify the property holds. Hypothesis (Python) and fast-check (JavaScript) are popular tools.

### Should I use parameterized tests for integration tests?

Yes, when the same workflow applies to different configurations (e.g., testing CRUD against multiple databases). But avoid it when each configuration needs different setup.

### How many test cases should I have?

Enough to cover all equivalence classes: normal cases, edge cases, boundary values, and error cases. Typically 5-15 cases per parameterized test. If you have 50+, consider property-based testing.
