---
contentType: recipes
slug: implement-property-based-testing
title: "Implement Property-Based Testing"
description: "How to write property-based tests with Hypothesis, fast-check, and jqwik that generate thousands of inputs to find edge cases traditional tests miss."
metaDescription: "Write property-based tests with Hypothesis, fast-check, and jqwik that generate thousands of inputs to find edge cases traditional tests miss."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - property-based-testing
  - hypothesis
  - fast-check
  - jqwik
  - fuzzing
  - recipe
relatedResources:
  - /recipes/testing/generate-test-data
  - /recipes/testing/setup-test-fixtures
  - /recipes/testing/implement-mutation-testing
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Write property-based tests with Hypothesis, fast-check, and jqwik that generate thousands of inputs to find edge cases traditional tests miss."
  keywords:
    - testing
    - property-based-testing
    - hypothesis
    - fast-check
    - jqwik
    - fuzzing
    - recipe
---

## Overview

Traditional example-based tests check one input at a time (`assert reverse("abc") == "cba"`). Property-based tests describe universal properties (`reverse(reverse(s)) == s`) and the framework generates hundreds of random inputs to find violations. This approach discovers edge cases — empty strings, Unicode combining characters, integer overflow, null pointers — that human-chosen examples rarely cover.

## When to Use

- Pure functions with clear mathematical properties (sorting, parsing, encoding, serialization)
- Input validation and sanitization routines that must handle arbitrary data
- State machine behavior where transitions should preserve invariants
- Algorithms that must be reversible (compress/decompress, encrypt/decrypt, encode/decode)
- You have experienced bugs caused by specific edge-case inputs (empty collections, MAX_INT, special characters)

## When NOT to Use

- The code is heavily I/O-dependent or side-effectful — properties are hard to state and verify
- Tests need to assert exact behavior for specific business scenarios — use example-based tests
- The property is too complex to state formally ("looks good to a human")
- Execution time matters — property tests run hundreds of iterations and can be slow

## Step-by-Step Implementation

### Python (Hypothesis)

```python
from hypothesis import given, strategies as st, settings, example

# Basic property: reversing twice returns the original
@given(st.text())
def test_reverse_is_involution(s):
    assert reverse(reverse(s)) == s

# Constrained strategy
@given(st.integers(min_value=0, max_value=1000))
def test_square_is_non_negative(n):
    assert n * n >= 0

# Composite strategy for domain objects
@st.composite
def users(draw):
    return {
        "name": draw(st.text(min_size=1, max_size=100)),
        "age": draw(st.integers(min_value=0, max_value=150)),
        "email": draw(st.emails()),
    }

@given(users())
def test_user_serialization_roundtrip(user):
    serialized = json.dumps(user)
    deserialized = json.loads(serialized)
    assert deserialized == user

# State machine testing
from hypothesis.stateful import RuleBasedStateMachine, rule, precondition

class CounterMachine(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.value = 0

    @rule(n=st.integers(min_value=0))
    def add(self, n):
        self.value += n

    @rule(n=st.integers(min_value=0, max_value=self.value))
    def subtract(self, n):
        self.value -= n

    @precondition(lambda self: self.value > 0)
    @rule()
    def is_positive(self):
        assert self.value > 0

TestCounter = CounterMachine.TestCase
```

### JavaScript (fast-check)

```javascript
import fc from 'fast-check';

// Property: reverse(reverse(s)) === s
fc.assert(
  fc.property(fc.string(), (s) => {
    return reverse(reverse(s)) === s;
  }),
  { numRuns: 1000 }
);

// Property with precondition
fc.assert(
  fc.property(
    fc.array(fc.integer()),
    (arr) => {
      const sorted = arr.slice().sort((a, b) => a - b);
      // Monotonic: each element <= the next
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i - 1] > sorted[i]) return false;
      }
      return sorted.length === arr.length;
    }
  )
);

// Model-based testing (state machine)
class ListModel {
  constructor() { this.items = []; }
  push(x) { this.items.push(x); }
  pop() { return this.items.pop(); }
  get length() { return this.items.length; }
}

fc.assert(
  fc.property(
    fc.commands([
      fc.integer().map(n => ({ type: 'push', value: n })),
      fc.constant({ type: 'pop' })
    ]),
    (cmds) => {
      const model = new ListModel();
      const sut = new MyList();
      fc.modelRun(() => ({ model, real: sut }), cmds);
    }
  )
);

// Shrink to minimal failing case
fc.assert(
  fc.property(fc.array(fc.integer()), (arr) => {
    return myFunction(arr) >= 0;  // Fails on some input
  })
);
// fast-check automatically shrinks to the smallest array that fails
```

### Java (jqwik)

```java
import net.jqwik.api.*;

class StringProperties {

    @Property
    boolean reverseOfReverseIsOriginal(@ForAll String s) {
        return reverse(reverse(s)).equals(s);
    }

    @Property
    boolean concatenationLengthIsSum(
        @ForAll @StringLength(min = 0, max = 100) String a,
        @ForAll @StringLength(min = 0, max = 100) String b
    ) {
        return (a + b).length() == a.length() + b.length();
    }

    @Property
    boolean sortedListIsOrdered(@ForAll List<@IntRange(min = -1000, max = 1000) Integer> numbers) {
        List<Integer> sorted = numbers.stream().sorted().toList();
        for (int i = 1; i < sorted.size(); i++) {
            if (sorted.get(i - 1) > sorted.get(i)) return false;
        }
        return true;
    }

    // Custom arbitraries (generators)
    @Provide
    Arbitrary<Email> validEmails() {
        return Combinators.combine(
            Arbitraries.strings().alpha().ofLength(5),
            Arbitraries.of("gmail.com", "yahoo.com", "example.com")
        ).as((local, domain) -> new Email(local + "@" + domain));
    }

    @Property
    boolean emailParsingRoundTrip(@ForAll("validEmails") Email email) {
        return Email.parse(email.toString()).equals(email);
    }
}

// Stateful testing
class StackMachine {
    private final Stack<Integer> stack = new Stack<>();

    @Action
    void push(@ForAll int value) { stack.push(value); }

    @Action
    @Precondition("!stack.isEmpty()")
    void pop() { stack.pop(); }

    @Invariant
    boolean sizeIsNeverNegative() { return stack.size() >= 0; }
}
```

## Best Practices

- **Start with properties, not generators.** The hard part of property-based testing is finding the right property (`encode(decode(x)) == x`), not writing the generator.
- **Use shrinking religiously.** The value of property-based testing is finding the minimal failing case. Ensure your framework's shrinking is enabled and effective.
- **Combine with example-based tests.** Properties check invariants; examples check specific business scenarios. Both are needed.
- **Keep properties pure.** A property that writes to a database or depends on the current time is not reproducible and cannot be shrunk effectively.
- **Use a deterministic seed in CI.** Property tests are random by nature; a seed ensures failures are reproducible across runs.

## Common Mistakes

- **Testing the implementation, not the specification.** Writing `property: sort(arr) == mySortFunction(arr)` is tautological and finds no bugs.
- **Properties that are too weak.** `length(f(x)) >= 0` is always true and provides no value. Properties should be strong enough to catch real bugs.
- **Ignoring shrinking output.** A 100-element array that fails is hard to debug; the shrunk 3-element array is what you should analyze.
- **Slow or non-terminating generators.** Generating recursive structures without depth limits can cause infinite loops during test execution.
- **Flaky properties due to global state.** A property that modifies a module-level counter fails unpredictably depending on execution order.
