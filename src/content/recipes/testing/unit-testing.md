---
contentType: recipes
slug: unit-testing
title: "Unit Testing"
description: "How to write fast, deterministic unit tests with mocks and assertions in Python, JavaScript, and Java."
metaDescription: "Practical unit testing examples using pytest, Jest, and JUnit. Learn to structure tests, use mocks, and keep suites fast and maintainable."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - unit-tests
  - pytest
  - jest
  - junit
  - python
  - javascript
  - java
relatedResources:
  - /recipes/handle-errors
  - /recipes/sort-array
  - /guides/testing/testing-strategy-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical unit testing examples using pytest, Jest, and JUnit. Learn to structure tests, use mocks, and keep suites fast and maintainable."
  keywords:
    - unit testing
    - pytest
    - jest
    - junit
    - test automation
---

## Overview

Unit tests validate the smallest testable pieces of your code — usually a single function or method — in isolation from external dependencies. A good unit test is fast, deterministic, and readable enough to serve as living documentation.

This recipe shows how to write idiomatic unit tests in Python (pytest), JavaScript (Jest), and Java (JUnit 5).

## When to Use

Use this recipe when:

- Adding or modifying business logic that should be verified automatically
- Refactoring legacy code and want confidence you did not break behavior
- Practicing test-driven development (TDD)
- Setting up a CI/CD pipeline that requires a passing test suite before deploy

## Solution

### Python (pytest)

```python
# calculator.py
def add(a, b):
    return a + b


def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b


# test_calculator.py
import pytest
from calculator import add, divide


def test_add():
    assert add(2, 3) == 5


def test_add_negative():
    assert add(-1, 1) == 0


def test_divide():
    assert divide(10, 2) == 5.0


def test_divide_by_zero():
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(10, 0)
```

Run: `pytest -q`

### JavaScript (Jest)

```javascript
// calculator.js
function add(a, b) {
  return a + b;
}

function divide(a, b) {
  if (b === 0) throw new Error('Cannot divide by zero');
  return a / b;
}

module.exports = { add, divide };

// calculator.test.js
const { add, divide } = require('./calculator');

describe('add', () => {
  test('adds positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('adds negative numbers', () => {
    expect(add(-1, 1)).toBe(0);
  });
});

describe('divide', () => {
  test('divides correctly', () => {
    expect(divide(10, 2)).toBe(5);
  });

  test('throws on divide by zero', () => {
    expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
  });
});
```

Run: `jest`

### Java (JUnit 5)

```java
// Calculator.java
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public double divide(double a, double b) {
        if (b == 0) throw new IllegalArgumentException("Cannot divide by zero");
        return a / b;
    }
}

// CalculatorTest.java
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    private final Calculator calc = new Calculator();

    @Test
    void addPositiveNumbers() {
        assertEquals(5, calc.add(2, 3));
    }

    @Test
    void addNegativeNumbers() {
        assertEquals(0, calc.add(-1, 1));
    }

    @Test
    void divideCorrectly() {
        assertEquals(5.0, calc.divide(10, 2));
    }

    @Test
    void divideByZeroThrows() {
        Exception ex = assertThrows(IllegalArgumentException.class, () -> calc.divide(10, 0));
        assertEquals("Cannot divide by zero", ex.getMessage());
    }
}
```

Run: `mvn test` or your IDE's test runner.

## Explanation

- **Arrange-Act-Assert (AAA)**: every test should set up state (arrange), execute the code under test (act), and verify the outcome (assert). This structure makes tests easy to scan.
- **Determinism**: unit tests should never depend on the network, filesystem, or current time. If they do, they are integration tests.
- **Isolation**: each test should run independently. Global state or shared mutable fixtures cause flaky, order-dependent failures.
- **Fast feedback**: a unit test suite should run in seconds, not minutes. Slow suites discourage running them locally.

## Variants

| Feature | Python (pytest) | JavaScript (Jest) | Java (JUnit 5) |
|---------|-----------------|-------------------|----------------|
| Assertion style | `assert` keyword | `expect(...).toBe()` | `assertEquals(...)` |
| Exception testing | `pytest.raises()` | `expect(...).toThrow()` | `assertThrows(...)` |
| Parameterized tests | `@pytest.mark.parametrize` | `test.each` | `@ParameterizedTest` |
| Mocking | `unittest.mock` | `jest.mock` | Mockito |
| Fixtures | `pytest.fixture` | `beforeEach` / `afterEach` | `@BeforeEach` / `@AfterEach` |

## Best Practices

- **Name tests after behavior**: `test_addNegativeNumbers` is better than `test_add2` because it describes intent.
- **One concept per test**: if you need multiple asserts, ensure they verify a single logical outcome. Otherwise, split the test.
- **Avoid logic in tests**: no `if` statements or loops in tests — they make failures harder to diagnose.
- **Use fakes over mocks when possible**: a fake in-memory repository is simpler than mocking every method call.
- **Keep tests close to the code**: place test files next to the source (co-location) or in a mirrored `tests/` directory.

## Common Mistakes

- **Testing implementation instead of behavior**: asserting that a specific private method was called makes tests brittle during refactoring.
- **Ignoring edge cases**: empty strings, zero, null/undefined, and very large inputs are where bugs hide.
- **Shared mutable state**: a test that mutates a global counter breaks every test that runs after it.
- **Slow unit tests**: calling a real database or HTTP service turns unit tests into integration tests and slows the suite.
- **Noisy output**: `console.log` or `System.out.println` in tests clutters CI logs. Use proper assertion failures instead.

## Frequently Asked Questions

**Q: How many asserts should a unit test have?**
A: One logical concept per test. Multiple asserts are fine if they verify different aspects of the same outcome (e.g., a created object has both the right ID and the right name). If the concepts diverge, split the test.

**Q: Should I test private methods?**
A: No. Test the public API. Private methods are implementation details; if you change them, you should not have to update tests. If a private method is complex enough to need its own tests, consider extracting it into a separate class.

**Q: What is the difference between a stub and a mock?**
A: A stub provides canned answers to calls. A mock verifies that specific interactions happened (e.g., "this method was called exactly once"). Use stubs for inputs; use mocks sparingly for verifying side effects.
