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
  - integration
  - tdd
relatedResources:
  - /recipes/handle-errors
  - /recipes/sort-array
  - /guides/testing-strategy-guide
  - /recipes/integration-testing
  - /recipes/java-junit5-assertions-soft
  - /recipes/unit-testing-mocking
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

The following demonstrates how to write idiomatic unit tests in Python (pytest), JavaScript (Jest), and Java (JUnit 5).

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

### Parameterized Tests

```python
# test_calculator_parametrized.py
import pytest
from calculator import add

@pytest.mark.parametrize("a, b, expected", [
    (1, 2, 3),
    (-1, 1, 0),
    (0, 0, 0),
    (100, 200, 300),
    (-5, -5, -10),
])
def test_add_parametrized(a, b, expected):
    assert add(a, b) == expected
```

```javascript
// calculator.parametrized.test.js
const { add } = require('./calculator');

test.each([
  [1, 2, 3],
  [-1, 1, 0],
  [0, 0, 0],
  [100, 200, 300],
  [-5, -5, -10],
])('add(%i, %i) = %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected);
});
```

Parameterized tests let you run the same logic against multiple inputs without duplicating code. Each row is a separate test case — if one fails, the others still run.

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

## What Works

- **Name tests after behavior**: `test_addNegativeNumbers` is better than `test_add2` because it describes intent.
- **One concept per test**: if you need multiple asserts, ensure they verify a single logical outcome. Otherwise, split the test.
- **Avoid logic in tests**: no `if` statements or loops in tests — they make failures harder to diagnose.
- **Use fakes over mocks when possible**: a fake in-memory repository is simpler than [mocking](/recipes/testing/unit-testing) every method call.
- **Keep tests close to the code**: place test files next to the source (co-location) or in a mirrored `tests/` directory.
- **Test boundary conditions**: zero, negative numbers, empty collections, maximum values, and null inputs are where most bugs hide.
- **Use setup and teardown consistently**: shared setup belongs in `beforeEach` / `setUp`, not duplicated across tests.
- **Run tests in random order**: order-dependent tests hide bugs. Use `pytest --randomly-seed` or Jest's `--randomize` to catch them.

## Common Mistakes

- **Testing implementation instead of behavior**: asserting that a specific private method was called makes tests brittle during refactoring.
- **Ignoring edge cases**: empty strings, zero, null/undefined, and very large inputs are where bugs hide.
- **Shared mutable state**: a test that mutates a global counter breaks every test that runs after it.
- **Slow unit tests**: calling a real database or HTTP service turns unit tests into [integration tests](/recipes/testing/integration-testing) and slows the suite.
- **Noisy output**: `console.log` or `System.out.println` in tests clutters CI logs. Use proper assertion failures instead.
- **Testing too much per test**: a test with 20 assertions is hard to debug when it fails. Split into focused tests.
- **Not testing error paths**: many developers only test the happy path. Test what happens when inputs are invalid, dependencies fail, or exceptions are thrown.
- **Over-mocking**: mocking every internal function creates tests that pass but prove nothing about real behavior. Mock at boundaries only.
- **Ignoring flaky tests**: a test that passes 90% of the time hides real bugs. Fix flaky tests immediately or quarantine them.

## Frequently Asked Questions

**Q: How many asserts should a unit test have?**
A: One logical concept per test. Multiple asserts are fine if they verify different aspects of the same outcome (e.g., a created object has both the right ID and the right name). If the concepts diverge, split the test.

**Q: Should I test private methods?**
A: No. Test the public API. Private methods are implementation details; if you change them, you should not have to update tests. See [clean code](/guides/design/clean-code-principles-guide). If a private method is complex enough to need its own tests, consider extracting it into a separate class.

**Q: What is the difference between a stub and a mock?**
A: A stub provides canned answers to calls. A mock verifies that specific interactions happened (e.g., "this method was called exactly once"). Use stubs for inputs; use mocks sparingly for verifying side effects.

**Q: How do I test async functions?**
A: In pytest, use `pytest-asyncio` with `@pytest.mark.asyncio`. In Jest, use `async/await` inside `test()` or `it()`. In JUnit 5, use `assertThrows` with `CompletableFuture` or reactive testing utilities. Always await the result — do not fire-and-forget.

**Q: What coverage should I aim for?**
A: Coverage is a metric, not a goal. 80%+ is reasonable for most projects. Focus on covering critical business logic and edge cases. 100% coverage does not mean 100% correctness — a test that calls a function without asserting anything inflates coverage without value.

**Q: How do I mock external dependencies?**
A: In pytest, use `unittest.mock.patch` to replace functions or classes. In Jest, use `jest.mock('./module')` to auto-mock or `jest.fn()` for manual mocks. In JUnit, use Mockito's `@Mock` annotation. Always mock the interface, not the implementation — mock at the boundary (HTTP client, database) not at internal helpers.

```python
from unittest.mock import patch
from myapp.weather import get_temperature

@patch('myapp.weather.requests.get')
def test_get_temperature(mock_get):
    mock_get.return_value.json.return_value = {'temp': 22}
    assert get_temperature('Madrid') == 22
    mock_get.assert_called_once_with('https://api.weather.com/Madrid')
```

**Q: What is test-driven development (TDD)?**
A: TDD is a workflow where you write the test first, watch it fail (red), write the minimal code to pass (green), then refactor. This ensures every line of production code is covered by a test from the start. TDD works best for bug fixes and new features with clear requirements.

**Q: Should I use snapshots testing?**
A: Snapshot tests are useful for serializable outputs (JSON, HTML, React components). They catch unintended changes but can become noisy if snapshots are updated without review. Use them alongside behavioral tests, not as a replacement.

**Q: How do I test code that depends on the current time?**
A: Inject a clock or time provider instead of calling `datetime.now()` or `Date.now()` directly. In tests, pass a fixed time. In Python, use `freezegun`. In Jest, use `jest.useFakeTimers()`. This makes tests deterministic and repeatable.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
