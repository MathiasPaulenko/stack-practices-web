---
contentType: guides
slug: complete-guide-property-based-testing
title: "Property-Based Testing: Hypothesis, fast-check, QuickCheck"
description: "Dominá property-based testing con Hypothesis (Python), fast-check (TypeScript) y principios de QuickCheck. Generá test cases automáticamente, encontrá edge cases y shrinkéá failures."
metaDescription: "Dominá property-based testing: Hypothesis para Python, fast-check para TypeScript y QuickCheck. Generá test cases, encontrá edge cases y shrinkéá failures."
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
  metaDescription: "Dominá property-based testing: Hypothesis para Python, fast-check para TypeScript y QuickCheck. Generá test cases, encontrá edge cases y shrinkéá failures."
  keywords:
    - property based testing
    - hypothesis python
    - fast-check typescript
    - quickcheck
    - generative testing
    - test shrinking
---

## Introducción

Property-based testing invierte el modelo de testing tradicional. En vez de escribir test cases individuales con inputs y outputs específicos, definís properties — invariantes que deberían valer para todos los inputs válidos — y el framework genera cientos o miles de test cases automáticamente. Cuando un test falla, el framework shrinkéa el input que falla al caso más chico posible que reproduce el bug. A continuación: Hypothesis para Python, fast-check para TypeScript/JavaScript y los principios subyacentes de QuickCheck que alimentan todos los frameworks de property-based testing.

## Conceptos Core

### Example-based vs. property-based testing

```
Example-based (tradicional):
  test_add(2, 3) == 5
  test_add(0, 0) == 0
  test_add(-1, 1) == 0
  → Pensás edge cases manualmente. Te faltan algunos.

Property-based:
  for all integers a, b:
    add(a, b) == add(b, a)          — commutativity
    add(a, 0) == a                   — identity
    add(add(a, b), c) == add(a, add(b, c))  — associativity
  → El framework genera cientos de inputs. Encuentra edge cases que te faltaron.
```

### El ciclo de property-based testing

1. **Generate**: Creá random inputs dentro de constraints definidas
2. **Execute**: Corré la function bajo test con esos inputs
3. **Verify**: Checkeá si la property vale
4. **Shrink**: En failure, reducí el input al caso minimal que reproduce
5. **Report**: Presentá el counterexample shrunkéado

## Hypothesis (Python)

### Instalación

```bash
pip install hypothesis
# O con pytest integration (recomendado)
pip install hypothesis pytest
```

### Properties básicas

```python
# tests/test_string_properties.py — Basic property tests
from hypothesis import given, strategies as st

@given(st.text())
def test_string_uppercase_is_uppercase(s):
    """Uppercase de cualquier string no contiene lowercase characters."""
    assert s.upper().isupper() or not s

@given(st.text())
def test_string_reversal_is_inverse(s):
    """Revertir un string dos veces da back el original."""
    assert s[::-1][::-1] == s

@given(st.lists(st.integers()))
def test_list_sort_preserves_length(lst):
    """Sortear una list no cambia su length."""
    assert len(sorted(lst)) == len(lst)

@given(st.lists(st.integers()))
def test_list_sort_idempotent(lst):
    """Sortear una list ya sorteada da la misma list."""
    sorted_lst = sorted(lst)
    assert sorted(sorted_lst) == sorted_lst

@given(st.lists(st.integers()))
def test_list_max_is_in_list(lst):
    """El max de una list siempre es un elemento de la list."""
    if lst:
        assert max(lst) in lst
```

### Composite strategies

```python
# tests/test_user_properties.py — Composite strategies
from hypothesis import given, strategies as st, composite

@composite
def valid_email(draw):
    """Generá valid email addresses."""
    local = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("Ll", "Nd"))))
    domain = draw(st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=("Ll", "Nd"))))
    tld = draw(st.sampled_from(["com", "org", "net", "io", "dev"]))
    return f"{local}@{domain}.{tld}"

@composite
def user_strategy(draw):
    """Generá user objects con valid fields."""
    return {
        "id": draw(st.integers(min_value=1, max_value=1000000)),
        "name": draw(st.text(min_size=1, max_size=50)),
        "email": draw(valid_email()),
        "age": draw(st.integers(min_value=0, max_value=150)),
        "is_active": draw(st.booleans()),
    }

@given(user_strategy())
def test_user_serialization_roundtrip(user):
    """Serializar y deserializar un user preserva todos los fields."""
    serialized = json.dumps(user)
    deserialized = json.loads(serialized)
    assert deserialized == user

@given(user_strategy())
def test_user_email_contains_at(user):
    """Cada user email generado contiene @."""
    assert "@" in user["email"]
```

### Assumptions y conditional properties

```python
# tests/test_conditional_properties.py — Filtrando inputs
from hypothesis import given, strategies as st, assume

@given(st.lists(st.integers()))
def test_binary_search_finds_element(lst):
    """Binary search encuentra cualquier elemento en una sorted list."""
    assume(len(lst) > 0)  # Skipeá empty lists
    sorted_lst = sorted(lst)
    target = sorted_lst[len(sorted_lst) // 2]  # Pick middle element

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
    """Sortear funciona correctamente para alphanumeric strings."""
    assume(s.isalnum())  # Solo testeá alphanumeric strings
    assert "".join(sorted(s)) == "".join(sorted("".join(sorted(s))))
```

### Stateful testing

```python
# tests/test_stack_properties.py — Stateful property testing
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant, initialize
from hypothesis import given, strategies as st

class StackMachine(RuleBasedStateMachine):
    """Testeá una stack implementation con stateful properties."""

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
            self.stack.append(top)  # Restore para other rules

TestStack = StackMachine.TestCase
```

### Settings y configuration

```python
# tests/test_configured.py — Hypothesis settings
from hypothesis import given, strategies as st, settings, HealthCheck

@given(st.lists(st.integers(), min_size=1))
@settings(
    max_examples=500,          # Generá hasta 500 test cases
    deadline=2000,             # 2 second timeout per test
    suppress_health_check=[HealthCheck.too_slow],
    print_blob=True,           # Printá el failing input como blob
)
def test_large_list_processing(lst):
    """Procesá large lists dentro del time budget."""
    result = process_list(lst)
    assert len(result) == len(lst)
```

## fast-check (TypeScript/JavaScript)

### Instalación

```bash
npm install -D fast-check vitest
```

### Properties básicas

```typescript
// tests/properties/string.test.ts — Basic property tests con fast-check
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

### Stateful testing con fast-check

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

### Shrinking y debugging

```typescript
// tests/properties/shrinking.test.ts — Entendiendo shrinking
import { describe, it, expect } from "vitest";
import fc from "fast-check";

describe("Shrinking behavior", () => {
  it("finds minimal failing case", () => {
    // Esto va a fallar y shrinkéar al caso minimal
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        // Property: sorted array has no element greater than the next
        const sorted = [...arr].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i]).toBeLessThanOrEqual(sorted[i + 1]);
        }
      }),
      { verbose: 2 } // Mostrá shrinking steps
    );
  });

  it("with custom seed for reproducibility", () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        expect(Math.abs(n)).toBeGreaterThanOrEqual(0);
      }),
      { seed: 12345 } // Test runs reproducibles
    );
  });
});
```

## Patrones Prácticos de Properties

### Roundtrip properties

```python
# Python: serialize → deserialize → compare
@given(st.text())
def test_json_roundtrip(s):
    """JSON serialization es un roundtrip para strings."""
    assert json.loads(json.dumps(s)) == s

@given(st.lists(st.integers()))
def test_sort_roundtrip(lst):
    """Sortear es idempotent."""
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
    """El max de una list es >= todos los elementos."""
    m = max(lst)
    for x in lst:
        assert m >= x

@given(st.lists(st.integers(), min_size=1))
def test_sum_equals_max_times_count(lst):
    """Sum de una list de valores idénticos equals value * count."""
    value = lst[0]
    assume(all(x == value for x in lst))
    assert sum(lst) == value * len(lst)
```

### Oracle properties

```python
@given(st.lists(st.integers()))
def test_custom_sort_matches_builtin(lst):
    """Custom sort produce mismo resultado que Python built-in sort."""
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

## Integración con CI

### GitHub Actions con Hypothesis

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

### GitHub Actions con fast-check

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

- Empezá con properties simples — commutativity, associativity, identity
- Usá roundtrip properties para serialization — encode then decode debería devolver original
- Usá oracle properties cuando existe una reference implementation — compará contra built-in
- Seteá `max_examples` más alto para código crítico — 1000 en vez del default 100
- Usá `assume` sparingly — demasiadas assumptions reducen test coverage
- Pineá el random seed en CI — failures reproducibles
- Combiná con example-based tests — properties encuentran edge cases, examples documentan behavior
- Usá stateful testing para stateful systems — databases, caches, queues
- Mirá el shrinking output — el counterexample minimal revela el root cause
- No testees framework code — testeá tu business logic, no el sort del language

## Common Mistakes

- **Properties demasiado débiles**: `sort(lst) has same length as lst` — true pero no testea sorting. Agregá `sort(lst) is sorted`.
- **Properties demasiado fuertes**: `add(a, b) > 0` — falla para negative numbers. Usá `add(a, 0) == a` en vez.
- **No usar `assume`**: testear properties que solo valen para algunos inputs sin filtrar. Usá `assume(condition)`.
- **Ignorar shrinking**: el caso shrunkéado es el output más valioso. Leelo para entender el bug.
- **Testear demasiado por property**: una property por test function. Si falla, sabés exactamente qué invariante breakó.

## FAQ

### ¿Qué es property-based testing?

Un approach de testing donde definís invariantes (properties) que deberían valer para todos los inputs válidos, y un framework genera cientos de test cases automáticamente. Cuando un test falla, el framework shrinkéa el input al caso minimal que reproduce.

### ¿Cómo se diferencia de fuzzing?

Fuzzing se enfoca en encontrar crashes y security issues tirando data random a un programa. Property-based testing verifica que invariantes específicas valgan, con input generation estructurada y shrinking para debugging.

### ¿Qué es shrinking?

Cuando una property test falla con un input complejo, el framework reduce sistemáticamente el input al caso más chico que still falla. Esto hace debugging mucho más fácil — en vez de una list de 500 elementos, obtenés una de 2 que triggera el mismo bug.

### ¿Cuándo debería usar property-based testing?

Usalo para pure functions, data transformations, serialization, parsers y stateful systems. Es especialmente valioso cuando tenés una reference implementation para comparar (oracle properties).

### ¿Cuáles son las limitaciones?

Las properties pueden ser difíciles de definir para UI code, side-effect-heavy functions y systems con preconditions complejas. Property tests son más lentos que unit tests por correr cientos de iteraciones. Usalos junto a, no en vez de, example-based tests.
