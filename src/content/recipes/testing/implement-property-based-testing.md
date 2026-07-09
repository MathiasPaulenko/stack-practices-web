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
lastUpdated: "2026-07-09"
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

## What works

- **Start with properties, not generators.** The hard part of property-based testing is finding the right property (`encode(decode(x)) == x`), not writing the generator.
- **Use shrinking religiously.** The value of property-based testing is finding the minimal failing case. Ensure your framework's shrinking is enabled and useful.
- **Combine with example-based tests.** Properties check invariants; examples check specific business scenarios. Both are needed.
- **Keep properties pure.** A property that writes to a database or depends on the current time is not reproducible and cannot be shrunk well.
- **Use a deterministic seed in CI.** Property tests are random by nature; a seed ensures failures are reproducible across runs.

## Common Mistakes

- **Testing the implementation, not the specification.** Writing `property: sort(arr) == mySortFunction(arr)` is tautological and finds no bugs.
- **Properties that are too weak.** `length(f(x)) >= 0` is always true and provides no value. Properties should be strong enough to catch real bugs.
- **Ignoring shrinking output.** A 100-element array that fails is hard to debug; the shrunk 3-element array is what you should analyze.
- **Slow or non-terminating generators.** Generating recursive structures without depth limits can cause infinite loops during test execution.
- **Flaky properties due to global state.** A property that modifies a module-level counter fails unpredictably depending on execution order.

## Frequently Asked Questions

**Q: What is property-based testing?**
A: Instead of writing example inputs, you define properties that should always hold for a function. The framework generates hundreds of random inputs and tries to find a counterexample.

**Q: What is shrinking in PBT?**
A: When a counterexample is found, the framework shrinks the input to the smallest possible value that still fails the property. This makes debugging much faster.

**Q: When is PBT not a good fit?**
A: PBT is less useful for UI workflows, complex state machines, or properties that are hard to express formally. Example-based tests remain valuable for those cases.

### How do I write properties for stateful systems?

Model the system as a state machine and generate command sequences (e.g., `push(x)`, `pop()`, `peek()`). Define an invariant that holds after each command — for a stack, `pop()` returns the last `push()`ed value. Use framework support for stateful testing: Hypothesis `@st.composite` with rules, fast-check `fc.commands`, or jqwik's `@Lifecycle`. Run enough iterations to cover interleavings (500+ runs).

### What is the difference between generative and example-based testing?

Example-based tests use fixed inputs you choose. Generative (property-based) tests use framework-generated inputs over many runs. Example-based tests are better for regression (you know the exact failing input). Property-based tests are better for exploration (they find inputs you would never think to test). Use both: property tests for invariants, example tests for specific edge cases and regression.

### How do I control the runtime of property-based tests in CI?

Set `max_examples` (Hypothesis), `num_runs` (fast-check), or `@Trials` (jqwik) to a lower value in CI (e.g., 100) and a higher value locally (e.g., 1000). Use a separate CI profile or environment variable. Mark long-running property tests with a custom marker and exclude them from fast CI pipelines. Run full property suites nightly.

### How do I reproduce a failing property-based test?

Frameworks print the shrunk counterexample on failure. Copy the exact input values and write an example-based test with those values. In Hypothesis, use `@example` to pin the failing case. In fast-check, use `fc.constant` to reproduce. In jqwik, use `@ForAll` with `@FromData`. This ensures the regression test runs deterministically without needing the full property-based run.

### How do I generate realistic data for property-based tests?

Use strategy combinators to constrain generated data to realistic ranges. For emails, generate `string@string.string` patterns. For dates, generate values within business-logic bounds (e.g., 1900-2100). For JSON, use recursive generators that produce nested objects. Libraries like `hypothesis-jsonschema` generate data matching a JSON Schema. For domain-specific data, write custom strategies that encode business rules (e.g., valid IBANs, valid ISBNs).

### How do I integrate property-based tests with CI/CD pipelines?

Run property-based tests as a separate CI job from unit tests to avoid blocking PRs on long runs. Set `max_examples` to 50-100 in CI and 1000+ in nightly runs. Use `pytest --property-based-tests` marker or `npm run test:property` to isolate them. Cache the Hypothesis example database between CI runs so known failing cases are replayed first. Fail the pipeline on any counterexample found, and attach the shrunk input as a CI artifact for debugging.

### How do I write properties for async functions?

Wrap async functions in a sync adapter using `asyncio.run()` or `pytest-asyncio`. In fast-check, use `fc.asyncProperty` with async arbitraries. In Hypothesis, use `@given` with `st.from_type` and call `asyncio.run(fn(x))` inside the test body. For concurrent properties, generate lists of async operations and assert invariants after all settle. Use `anyio` to test against both asyncio and trio backends with the same property.

### How do I debug a failing property-based test?

Read the shrunk counterexample printed by the framework. Add `print()` or logging inside the property function to trace execution with the failing input. Use `@seed` (Hypothesis) or `fc.seed` (fast-check) to reproduce the exact random sequence. If the shrunk input is still complex, add `assume()`/`fc.pre()` to constrain the search space further. Write a unit test with the exact failing input to debug step-by-step in your IDE.

### How do I combine property-based testing with fuzzing?

Property-based testing is a form of fuzzing — it generates random inputs and checks properties. For coverage-guided fuzzing, use `Atheris` (Python) or `jsfuzz` (JavaScript) which track code coverage and mutate inputs to reach new branches. Combine with PBT by defining properties that the fuzzer checks: the fuzzer maximizes coverage while the property assertions verify correctness. Use `atheris.FuzzedDataProvider` to feed structured data from the fuzzer into your property.

### How do I write properties for serialization round-trips?

The classic property: `deserialize(serialize(x)) == x` for all valid `x`. Generate objects of the target type, serialize them, deserialize the result, and assert equality. For JSON, generate objects with `st.recursive` containing strings, ints, floats, lists, and dicts. For protobuf, use `st.from_type` with the generated classes. Handle precision loss explicitly: floats may not round-trip exactly through JSON, so compare with a tolerance instead of strict equality.

### How do I write properties for pure functions vs side-effectful functions?

For pure functions, properties are straightforward: assert invariants like `f(x) >= 0` or `f(f(x)) == f(x)`. For side-effectful functions, isolate the side effects using dependency injection or mocks. Generate inputs, execute the function with a mocked database or API, and assert properties on the sequence of calls made (e.g., "every insert is followed by a commit" or "no read happens after a write to the same key"). Use stateful property testing for functions with accumulated state. For functions with external API calls, generate mock responses and assert retry/backoff properties.

### How do I share strategies across test suites?

Extract reusable strategies into a shared module (e.g., `test/strategies.py` or `test/strategies.ts`). Export common generators like `email_strategy`, `date_strategy`, `json_strategy` that encode domain rules. Import them in test files to keep properties DRY. In Hypothesis, use `st.register_type_strategy` to bind a strategy to a custom type so `st.from_type(MyClass)` works automatically. In fast-check, export `fc.Arbitrary` instances from a shared file.
