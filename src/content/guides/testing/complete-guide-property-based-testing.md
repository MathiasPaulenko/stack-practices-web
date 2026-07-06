---
contentType: guides
slug: complete-guide-property-based-testing
title: "Property-Based Testing Guide: Hypothesis, fast-check, QuickCheck Principles"
description: "Master property-based testing with Hypothesis (Python), fast-check (TypeScript), and QuickCheck principles. Generate test cases automatically, find edge cases, and shrink failures."
metaDescription: "Master property-based testing: Hypothesis for Python, fast-check for TypeScript, QuickCheck principles. Generate test cases, find edge cases, and shrink failures."
difficulty: advanced
topics:
  - testing
tags:
  - guide
  - property-based-testing
  - hypothesis
  - fast-check
  - quickcheck
  - testing
  - python
  - typescript
relatedResources:
  - /guides/testing/test-driven-development-guide
  - /guides/testing/testing-strategy-guide
  - /guides/testing/complete-guide-pytest-production
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Master property-based testing: Hypothesis for Python, fast-check for TypeScript, QuickCheck principles. Generate test cases, find edge cases, and shrink failures."
  keywords:
    - property based testing
    - hypothesis python
    - fast-check typescript
    - quickcheck
    - generative testing
    - test shrinking
---

## Introduction

Property-based testing flips the traditional testing model on its head. Instead of writing individual test cases with specific inputs and expected outputs, you define properties — invariants that should hold for all valid inputs — and the framework generates hundreds or thousands of test cases automatically. When a test fails, the framework shrinks the failing input to the smallest possible case that reproduces the bug. The following guide covers Hypothesis for Python, fast-check for TypeScript/JavaScript, and the underlying QuickCheck principles that power all property-based testing frameworks.

## Core Concepts

### Example-based vs. property-based testing

```
Example-based (traditional):
  test_add(2, 3) == 5
  test_add(0, 0) == 0
  test_add(-1, 1) == 0
  → You think of edge cases manually. You miss some.

Property-based:
  for all integers a, b:
    add(a, b) == add(b, a)          — commutativity
    add(a, 0) == a                   — identity
    add(add(a, b), c) == add(a, add(b, c))  — associativity
  → Framework generates hundreds of inputs. Finds edge cases you missed.
```

### The property-based testing cycle

1. **Generate**: Create random inputs within defined constraints
2. **Execute**: Run the function under test with those inputs
3. **Verify**: Check if the property holds
4. **Shrink**: On failure, reduce the input to the minimal reproducing case
5. **Report**: Present the shrunk counterexample

## Hypothesis (Python)

### Installation

```bash
pip install hypothesis
# Or with pytest integration (recommended)
pip install hypothesis pytest
```

### Basic properties

```python
# tests/test_string_properties.py — Basic property tests
from hypothesis import given, strategies as st

@given(st.text())
def test_string_uppercase_is_uppercase(s):
    """Uppercase of any string contains no lowercase characters."""
    assert s.upper().isupper() or not s

@given(st.text())
def test_string_reversal_is_inverse(s):
    """Reversing a string twice gives back the original."""
    assert s[::-1][::-1] == s

@given(st.lists(st.integers()))
def test_list_sort_preserves_length(lst):
    """Sorting a list does not change its length."""
    assert len(sorted(lst)) == len(lst)

@given(st.lists(st.integers()))
def test_list_sort_idempotent(lst):
    """Sorting an already sorted list gives the same list."""
    sorted_lst = sorted(lst)
    assert sorted(sorted_lst) == sorted_lst

@given(st.lists(st.integers()))
def test_list_max_is_in_list(lst):
    """The maximum of a list is always an element of the list."""
    if lst:
        assert max(lst) in lst
```

### Composite strategies

```python
# tests/test_user_properties.py — Composite strategies
from hypothesis import given, strategies as st, composite

@composite
def valid_email(draw):
    """Generate valid email addresses."""
    local = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("Ll", "Nd"))))
    domain = draw(st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=("Ll", "Nd"))))
    tld = draw(st.sampled_from(["com", "org", "net", "io", "dev"]))
    return f"{local}@{domain}.{tld}"

@composite
def user_strategy(draw):
    """Generate user objects with valid fields."""
    return {
        "id": draw(st.integers(min_value=1, max_value=1000000)),
        "name": draw(st.text(min_size=1, max_size=50)),
        "email": draw(valid_email()),
        "age": draw(st.integers(min_value=0, max_value=150)),
        "is_active": draw(st.booleans()),
    }

@given(user_strategy())
def test_user_serialization_roundtrip(user):
    """Serializing and deserializing a user preserves all fields."""
    serialized = json.dumps(user)
    deserialized = json.loads(serialized)
    assert deserialized == user

@given(user_strategy())
def test_user_email_contains_at(user):
    """Every generated user email contains @."""
    assert "@" in user["email"]
```

### Assumptions and conditional properties

```python
# tests/test_conditional_properties.py — Filtering inputs
from hypothesis import given, strategies as st, assume

@given(st.lists(st.integers()))
def test_binary_search_finds_element(lst):
    """Binary search finds any element in a sorted list."""
    assume(len(lst) > 0)  # Skip empty lists
    sorted_lst = sorted(lst)
    target = sorted_lst[len(sorted_lst) // 2]  # Pick middle element

    # Binary search implementation
    def binary_search(arr, target):
        lo, hi = 0, len(arr) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if arr[mid] == target:
                return mid
            elif arr[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1

    result = binary_search(sorted_lst, target)
    assert result != -1
    assert sorted_lst[result] == target

@given(st.text())
def test_only_alphanumeric_sort(s):
    """Sorting works correctly for alphanumeric strings."""
    assume(s.isalnum())  # Only test alphanumeric strings
    assert "".join(sorted(s)) == "".join(sorted("".join(sorted(s))))
```

### Stateful testing

```python
# tests/test_stack_properties.py — Stateful property testing
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant, initialize
from hypothesis import given, strategies as st

class StackMachine(RuleBasedStateMachine):
    """Test a stack implementation with stateful properties."""

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

    @invariant()
    def pop_returns_last_pushed(self):
        if self.stack:
            top = self.stack[-1]
            assert self.stack.pop() == top
            self.stack.append(top)  # Restore for other rules

TestStack = StackMachine.TestCase
```

### Settings and configuration

```python
# tests/test_configured.py — Hypothesis settings
from hypothesis import given, strategies as st, settings, HealthCheck

@given(st.lists(st.integers(), min_size=1))
@settings(
    max_examples=500,          # Generate up to 500 test cases
    deadline=2000,             # 2 second timeout per test
    suppress_health_check=[HealthCheck.too_slow],
    print_blob=True,           # Print the failing input as a blob
)
def test_large_list_processing(lst):
    """Process large lists within time budget."""
    result = process_list(lst)
    assert len(result) == len(lst)
```

## fast-check (TypeScript/JavaScript)

### Installation

```bash
npm install -D fast-check vitest
```

### Basic properties

```typescript
// tests/properties/string.test.ts — Basic property tests with fast-check
import { describe, it, expect } from "vitest";
import fc from "fast-check";

describe("String properties", () => {
  it("uppercase contains no lowercase characters", () => {
    fc.assert(fc.property(fc.string(), (s) => {
      expect(s.toUpperCase().match(/[a-z]/)).toBeNull();
    }));
  });

  it("reversing twice returns the original", () => {
    fc.assert(fc.property(fc.string(), (s) => {
      expect(s.split("").reverse().reverse().join("")).toBe(s);
    }));
  });

  it("concatenation length is sum of lengths", () => {
    fc.assert(fc.property(fc.string(), fc.string(), (a, b) => {
      expect((a + b).length).toBe(a.length + b.length);
    }));
  });
});

describe("Number properties", () => {
  it("addition is commutative", () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), (a, b) => {
      expect(a + b).toBe(b + a);
    }));
  });

  it("addition is associative", () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), fc.integer(), (a, b, c) => {
      expect((a + b) + c).toBe(a + (b + c));
    }));
  });

  it("multiplication distributes over addition", () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), fc.integer(), (a, b, c) => {
      expect(a * (b + c)).toBe(a * b + a * c);
    }));
  });
});
```

### Custom arbitraries

```typescript
// tests/properties/user.test.ts — Custom arbitraries
import { describe, it, expect } from "vitest";
import fc from "fast-check";

const validEmail = fc.tuple(
  fc.string({ minLength: 1 }).map((s) => s.replace(/[^a-zA-Z0-9]/g, "a")),
  fc.string({ minLength: 1 }).map((s) => s.replace(/[^a-zA-Z0-9]/g, "a")),
  fc.constantFrom("com", "org", "net", "io", "dev")
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

const userArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 1000000 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: validEmail,
  age: fc.integer({ min: 0, max: 150 }),
  isActive: fc.boolean(),
});

describe("User properties", () => {
  it("serialization roundtrip preserves data", () => {
    fc.assert(fc.property(userArbitrary, (user) => {
      const serialized = JSON.stringify(user);
      const deserialized = JSON.parse(serialized);
      expect(deserialized).toEqual(user);
    }));
  });

  it("email contains @", () => {
    fc.assert(fc.property(userArbitrary, (user) => {
      expect(user.email).toContain("@");
    }));
  });
});
```

### Stateful testing with fast-check

```typescript
// tests/properties/stack.test.ts — Stateful property testing
import { describe, it, expect } from "vitest";
import fc from "fast-check";

type StackCommand =
  | { type: "push"; value: number }
  | { type: "pop" };

const stackCommands = fc.array(
  fc.oneof(
    fc.record({ type: fc.constant("push"), value: fc.integer() }),
    fc.record({ type: fc.constant("pop") })
  )
);

describe("Stack stateful properties", () => {
  it("stack size is always non-negative", () => {
    fc.assert(fc.property(stackCommands, (commands) => {
      const stack: number[] = [];
      for (const cmd of commands) {
        if (cmd.type === "push") {
          stack.push(cmd.value);
        } else if (stack.length > 0) {
          stack.pop();
        }
        expect(stack.length).toBeGreaterThanOrEqual(0);
      }
    }));
  });

  it("pop returns last pushed value (LIFO)", () => {
    fc.assert(fc.property(stackCommands, (commands) => {
      const stack: number[] = [];
      for (const cmd of commands) {
        if (cmd.type === "push") {
          stack.push(cmd.value);
        } else if (stack.length > 0) {
          const top = stack[stack.length - 1];
          expect(stack.pop()).toBe(top);
        }
      }
    }));
  });
});
```

### Shrinking and debugging

```typescript
// tests/properties/shrinking.test.ts — Understanding shrinking
import { describe, it, expect } from "vitest";
import fc from "fast-check";

describe("Shrinking behavior", () => {
  it("finds minimal failing case", () => {
    // This will fail and shrink to the minimal case
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        // Property: sorted array has no element greater than the next
        const sorted = [...arr].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i]).toBeLessThanOrEqual(sorted[i + 1]);
        }
      }),
      { verbose: 2 } // Show shrinking steps
    );
  });

  it("with custom seed for reproducibility", () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        expect(Math.abs(n)).toBeGreaterThanOrEqual(0);
      }),
      { seed: 12345 } // Reproducible test runs
    );
  });
});
```

## Practical Property Patterns

### Roundtrip properties

```python
# Python: serialize → deserialize → compare
@given(st.text())
def test_json_roundtrip(s):
    """JSON serialization is a roundtrip for strings."""
    assert json.loads(json.dumps(s)) == s

@given(st.lists(st.integers()))
def test_sort_roundtrip(lst):
    """Sorting is idempotent."""
    assert sorted(sorted(lst)) == sorted(lst)
```

```typescript
// TypeScript: encode → decode → compare
it("base64 roundtrip", () => {
  fc.assert(fc.property(fc.string(), (s) => {
    const encoded = btoa(s);
    const decoded = atob(encoded);
    expect(decoded).toBe(s);
  }));
});
```

### Invariant properties

```python
@given(st.lists(st.integers(), min_size=1))
def test_max_is_geq_all(lst):
    """The max of a list is >= all elements."""
    m = max(lst)
    for x in lst:
        assert m >= x

@given(st.lists(st.integers(), min_size=1))
def test_sum_equals_max_times_count(lst):
    """Sum of a list of identical values equals value * count."""
    value = lst[0]
    assume(all(x == value for x in lst))
    assert sum(lst) == value * len(lst)
```

### Oracle properties

```python
@given(st.lists(st.integers()))
def test_custom_sort_matches_builtin(lst):
    """Custom sort produces same result as Python's built-in sort."""
    custom_sorted = my_custom_sort(lst[:])
    builtin_sorted = sorted(lst)
    assert custom_sorted == builtin_sorted
```

### Stateful properties

```python
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant

class DictStateMachine(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.dict = {}
        self.model = {}

    @rule(key=st.text(), value=st.integers())
    def set_value(self, key, value):
        self.dict[key] = value
        self.model[key] = value

    @rule(key=st.text())
    def get_value(self, key):
        if key in self.model:
            assert self.dict[key] == self.model[key]

    @invariant()
    def sizes_match(self):
        assert len(self.dict) == len(self.model)

TestDict = DictStateMachine.TestCase
```

## CI Integration

### GitHub Actions with Hypothesis

```yaml
# .github/workflows/property-tests.yml
name: Property Tests
on: [push, pull_request]

jobs:
  property-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install hypothesis pytest
      - run: pytest tests/properties/ -v --hypothesis-show-statistics
```

### GitHub Actions with fast-check

```yaml
# .github/workflows/property-tests.yml
name: Property Tests
on: [push, pull_request]

jobs:
  property-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx vitest run tests/properties/
```

## Best Practices

- Start with simple properties — commutativity, associativity, identity
- Use roundtrip properties for serialization — encode then decode should return original
- Use oracle properties when a reference implementation exists — compare against built-in
- Set `max_examples` higher for critical code — 1000 instead of default 100
- Use `assume` sparingly — too many assumptions reduce test coverage
- Pin the random seed in CI — reproducible failures
- Combine with example-based tests — properties find edge cases, examples document behavior
- Use stateful testing for stateful systems — databases, caches, queues
- Watch shrinking output — the minimal counterexample reveals the root cause
- Don't test framework code — test your business logic, not the language's sort

## Common Mistakes

- **Properties too weak**: `sort(lst) has same length as lst` — true but doesn't test sorting. Add `sort(lst) is sorted`.
- **Properties too strong**: `add(a, b) > 0` — fails for negative numbers. Use `add(a, 0) == a` instead.
- **Not using `assume`**: testing properties that only hold for some inputs without filtering. Use `assume(condition)`.
- **Ignoring shrinking**: the shrunk case is the most valuable output. Read it to understand the bug.
- **Testing too much per property**: one property per test function. If it fails, you know exactly which invariant broke.

## FAQ

### What is property-based testing?

A testing approach where you define invariants (properties) that should hold for all valid inputs, and a framework generates hundreds of test cases automatically. When a test fails, the framework shrinks the input to the minimal reproducing case.

### How is it different from fuzzing?

Fuzzing focuses on finding crashes and security issues by throwing random data at a program. Property-based testing verifies that specific invariants hold, with structured input generation and shrinking for debugging.

### What is shrinking?

When a property test fails with a complex input, the framework systematically reduces the input to the smallest case that still fails. This makes debugging much easier — instead of a 500-element list, you get a 2-element list that triggers the same bug.

### When should I use property-based testing?

Use it for pure functions, data transformations, serialization, parsers, and stateful systems. It's especially valuable when you have a reference implementation to compare against (oracle properties).

### What are the limitations?

Properties can be hard to define for UI code, side-effect-heavy functions, and systems with complex preconditions. Property tests are slower than unit tests due to running hundreds of iterations. Use them alongside, not instead of, example-based tests.
