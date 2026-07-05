---
contentType: recipes
slug: python-hypothesis-property-testing
title: "Property-Based Testing with Hypothesis"
description: "How to use Hypothesis for property-based testing in Python, generating hundreds of test cases automatically from strategies instead of writing them by hand."
metaDescription: "Use Hypothesis for property-based testing in Python. Generate hundreds of test cases automatically with strategies, finding edge cases you would miss manually."
difficulty: advanced
topics:
  - testing
tags:
  - testing
  - python
  - hypothesis
  - property-based
  - fuzzing
  - recipe
relatedResources:
  - /recipes/testing/python-pytest-fixtures-parametrize
  - /recipes/testing/python-coverage-pytest-cov
  - /recipes/testing/python-mock-external-apis-responses
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use Hypothesis for property-based testing in Python. Generate hundreds of test cases automatically with strategies, finding edge cases you would miss manually."
  keywords:
    - testing
    - python
    - hypothesis
    - property-based
    - fuzzing
    - recipe
---

## Overview

Hypothesis is a property-based testing library for Python. Instead of writing individual test cases with specific inputs, you define properties that should hold for all valid inputs. Hypothesis generates hundreds of test cases automatically using strategies — type-aware data generators. It also shrinks failing inputs to the minimal case that reproduces the bug.

## When to Use

- Testing pure functions where you can state invariants (e.g., "sorting returns the same elements in order")
- Finding edge cases in parsers, serializers, and data transformations
- Testing mathematical properties (associativity, commutativity, idempotency)
- Verifying round-trip properties (encode then decode returns the original)
- Fuzzing code that processes untrusted input (JSON parsing, URL parsing)

## When NOT to Use

- Testing specific known scenarios — use `@pytest.mark.parametrize` with explicit cases
- Testing side effects or stateful interactions — Hypothesis generates random data, making order-dependent tests flaky
- Testing UI or integration flows — property-based testing shines on pure logic
- When test runtime matters — Hypothesis runs 100+ cases per test by default

## Solution

### Setup

```bash
pip install hypothesis pytest
```

### Basic property test

```python
from hypothesis import given
from hypothesis import strategies as st

def reverse_string(s: str) -> str:
    return s[::-1]

@given(st.text())
def test_reverse_twice_returns_original(s):
    assert reverse_string(reverse_string(s)) == s

@given(st.text())
def test_reverse_preserves_length(s):
    assert len(reverse_string(s)) == len(s)

@given(st.text())
def test_reverse_first_becomes_last(s):
    if s:
        assert reverse_string(s)[0] == s[-1]
```

### Integer strategies

```python
@given(st.integers(min_value=0, max_value=100))
def test_square_is_non_negative(n):
    assert n * n >= 0

@given(st.integers())
def test_addition_is_commutative(a, b):
    assert a + b == b + a

@given(st.integers(), st.integers())
def test_addition_is_commutative(a, b):
    assert a + b == b + a

@given(st.integers(min_value=1))
def test_division_then_multiplication(n):
    assert (n * 10) // 10 == n
```

### List strategies

```python
@given(st.lists(st.integers(min_value=1, max_value=100), min_size=1))
def test_max_is_in_list(lst):
    assert max(lst) in lst

@given(st.lists(st.integers()))
def test_sort_preserves_length(lst):
    assert len(sorted(lst)) == len(lst)

@given(st.lists(st.integers()))
def test_sort_is_idempotent(lst):
    assert sorted(sorted(lst)) == sorted(lst)

@given(st.lists(st.integers(), min_size=1))
def test_min_le_max(lst):
    assert min(lst) <= max(lst)
```

### Dictionary and JSON strategies

```python
@given(st.dictionaries(st.text(min_size=1), st.integers()))
def test_dict_items_roundtrip(d):
    assert dict(d.items()) == d

@given(st.from_type(dict))
def test_json_roundtrip(d):
    import json
    encoded = json.dumps(d)
    decoded = json.loads(encoded)
    assert decoded == d
```

### Custom strategies with `@composite`

```python
from hypothesis import strategies as st, composite

@composite
def valid_email(draw):
    local = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("Ll", "Nd"))))
    domain = draw(st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=("Ll", "Nd"))))
    tld = draw(st.sampled_from(["com", "org", "net", "io"]))
    return f"{local}@{domain}.{tld}"

@given(valid_email())
def test_email_validation(email):
    assert "@" in email
    assert "." in email.split("@")[1]
```

### Using `assume` to filter inputs

```python
from hypothesis import given, assume
from hypothesis import strategies as st

@given(st.integers())
def test_division(n):
    assume(n != 0)
    assert 100 / n * n == 100

@given(st.lists(st.integers(), min_size=2))
def test_first_not_equal_to_last(lst):
    assume(lst[0] != lst[-1])
    assert lst[0] != lst[-1]
```

### Stateful testing with `RuleBasedStateMachine`

```python
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant
from hypothesis import strategies as st

class StackMachine(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.stack = []

    @rule(value=st.integers())
    def push(self, value):
        self.stack.append(value)

    @rule()
    def pop(self):
        if self.stack:
            self.stack.pop()

    @invariant()
    def stack_size_non_negative(self):
        assert len(self.stack) >= 0

TestStack = StackMachine.TestCase
```

### Controlling example count and shrinking

```python
from hypothesis import settings

@given(st.lists(st.integers()))
@settings(max_examples=500, deadline=1000)
def test_with_more_examples(lst):
    assert sorted(lst) == sorted(lst, reverse=True)[::-1]
```

### Using `@example` for specific cases

```python
from hypothesis import given, example
from hypothesis import strategies as st

@given(st.lists(st.integers()))
@example([])
@example([1])
@example([1, 2, 3])
def test_sort_with_specific_cases(lst):
    assert sorted(lst) == sorted(sorted(lst))
```

## Variants

### Testing with `st.builds` for dataclasses

```python
from dataclasses import dataclass
from hypothesis import given
from hypothesis import strategies as st

@dataclass
class User:
    id: int
    name: str
    email: str

@given(st.builds(User, id=st.integers(min_value=1), name=st.text(min_size=1), email=st.emails()))
def test_user_serialization(user):
    data = {"id": user.id, "name": user.name, "email": user.email}
    reconstructed = User(**data)
    assert reconstructed == user
```

### Testing pandas DataFrames

```python
from hypothesis.extra.pandas import data_frames, column
from hypothesis import given

@given(data_frames([column("a", st.integers()), column("b", st.text())]))
def test_dataframe_shape(df):
    assert len(df.columns) == 2
    assert "a" in df.columns
    assert "b" in df.columns
```

## Best Practices

- Start with simple strategies (`st.text()`, `st.integers()`) and narrow with `min_value`/`max_size` as needed
- Use `assume()` to filter invalid inputs instead of adding `if` guards in the test body
- Add `@example` for known edge cases (empty list, single element, boundary values)
- Set `deadline` to avoid flaky timeouts on slow CI machines
- Use `@settings(max_examples=N)` to increase or decrease the number of generated cases
- Keep property tests pure — no side effects, no network calls, no database writes
- Use `st.from_type(MyClass)` to auto-generate strategies from type hints

## Common Mistakes

- **Testing too many properties in one test**: each `@given` test should verify one property. Multiple properties in one test make failures hard to diagnose.
- **Not using `assume()` for preconditions**: `if` guards cause Hypothesis to waste examples on invalid inputs. `assume()` tells it to skip and generate a new one.
- **Ignoring shrinking output**: when a test fails, Hypothesis shows the minimal failing input. Use it to understand the bug — don't just fix the test.
- **Using Hypothesis for integration tests**: property-based testing is for pure functions. Side effects make generated data unpredictable.
- **Forgetting to register custom types**: use `st.register_type_strategy(MyClass, my_strategy)` to auto-resolve custom types in `st.from_type()`.

## FAQ

### How does Hypothesis find edge cases?

Hypothesis uses a strategy-based generation engine with coverage feedback. It tracks which branches of your code are exercised and generates inputs that explore new branches. This finds edge cases like empty strings, negative numbers, and Unicode characters that manual testing misses.

### What is shrinking?

When a test fails, Hypothesis tries to find the smallest input that still fails. For example, if `[3, -1, 0, 42, 17]` fails, it might shrink to `[0]` or `[-1]` — the minimal reproducer.

### How do I reproduce a failing Hypothesis test?

Hypothesis prints a seed and the simplified failing input. Add it with `@example`:

```python
@example(s="\x00")
@given(st.text())
def test_with_reproducer(s):
    ...
```

### Can I use Hypothesis with Django or Flask?

Yes, but only for testing pure logic (model methods, utility functions). Don't use it for views that hit the database — use `@pytest.mark.django_db` with explicit test cases instead.

### How do I limit test runtime?

Use `@settings(max_examples=50, deadline=500)` to reduce the number of generated cases and set a per-example timeout in milliseconds.
