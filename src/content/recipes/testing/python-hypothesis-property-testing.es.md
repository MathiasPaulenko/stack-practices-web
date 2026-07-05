---
contentType: recipes
slug: python-hypothesis-property-testing
title: "Property-Based Testing con Hypothesis"
description: "Cómo usar Hypothesis para property-based testing en Python, generando cientos de casos de test automáticamente desde strategies en lugar de escribirlos a mano."
metaDescription: "Usa Hypothesis para property-based testing en Python. Genera cientos de casos de test automáticamente con strategies, encontrando edge cases que missarías manualmente."
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
  metaDescription: "Usa Hypothesis para property-based testing en Python. Genera cientos de casos de test automáticamente con strategies, encontrando edge cases que missarías manualmente."
  keywords:
    - testing
    - python
    - hypothesis
    - property-based
    - fuzzing
    - recipe
---

## Overview

Hypothesis es una librería de property-based testing para Python. En lugar de escribir casos de test individuales con inputs específicos, defines propiedades que deben cumplirse para todos los inputs válidos. Hypothesis genera cientos de casos de test automáticamente usando strategies — generadores de datos con conocimiento de tipos. También reduce los inputs que fallan al caso mínimo que reproduce el bug.

## When to Use

- Testear funciones puras donde puedes enunciar invariantes (e.g., "ordenar devuelve los mismos elementos en orden")
- Encontrar edge cases en parsers, serializers y transformaciones de datos
- Testear propiedades matemáticas (asociatividad, conmutatividad, idempotencia)
- Verificar propiedades de round-trip (encodear y luego decodear devuelve el original)
- Fuzzear código que procesa input no confiable (JSON parsing, URL parsing)

## When NOT to Use

- Testear escenarios conocidos específicos — usa `@pytest.mark.parametrize` con casos explícitos
- Testear side effects o interacciones stateful — Hypothesis genera datos random, haciendo tests order-dependent flaky
- Testear flujos de UI o integración — property-based testing brilla en lógica pura
- Cuando el runtime del test importa — Hypothesis corre 100+ casos por test por defecto

## Solution

### Setup

```bash
pip install hypothesis pytest
```

### Property test básico

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

### Strategies de enteros

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

### Strategies de listas

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

### Strategies de diccionarios y JSON

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

### Strategies personalizadas con `@composite`

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

### Usar `assume` para filtrar inputs

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

### Stateful testing con `RuleBasedStateMachine`

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

### Controlar número de ejemplos y shrinking

```python
from hypothesis import settings

@given(st.lists(st.integers()))
@settings(max_examples=500, deadline=1000)
def test_with_more_examples(lst):
    assert sorted(lst) == sorted(lst, reverse=True)[::-1]
```

### Usar `@example` para casos específicos

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

### Testear con `st.builds` para dataclasses

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

### Testear pandas DataFrames

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

- Empieza con strategies simples (`st.text()`, `st.integers()`) y estrecha con `min_value`/`max_size` según sea necesario
- Usa `assume()` para filtrar inputs inválidos en lugar de agregar guards `if` en el body del test
- Agrega `@example` para edge cases conocidos (lista vacía, un elemento, valores boundary)
- Setea `deadline` para evitar timeouts flaky en máquinas de CI lentas
- Usa `@settings(max_examples=N)` para aumentar o disminuir el número de casos generados
- Mantén los property tests puros — sin side effects, sin network calls, sin database writes
- Usa `st.from_type(MyClass)` para auto-generar strategies desde type hints

## Common Mistakes

- **Testear demasiadas propiedades en un test**: cada test `@given` debería verificar una propiedad. Múltiples propiedades en un test hacen los fallos difíciles de diagnosticar.
- **No usar `assume()` para precondiciones**: los guards `if` hacen que Hypothesis desperdicie ejemplos en inputs inválidos. `assume()` le dice que skippee y genere uno nuevo.
- **Ignorar el output de shrinking**: cuando un test falla, Hypothesis muestra el input mínimo que falla. Úsalo para entender el bug — no solo arregles el test.
- **Usar Hypothesis para tests de integración**: property-based testing es para funciones puras. Los side effects hacen los datos generados impredecibles.
- **Olvidar registrar tipos personalizados**: usa `st.register_type_strategy(MyClass, my_strategy)` para auto-resolver tipos personalizados en `st.from_type()`.

## FAQ

### ¿Cómo encuentra Hypothesis los edge cases?

Hypothesis usa un motor de generación basado en strategies con coverage feedback. Trackea qué branches de tu código se ejercitan y genera inputs que exploran nuevos branches. Esto encuentra edge cases como strings vacíos, números negativos y caracteres Unicode que el testing manual missa.

### ¿Qué es shrinking?

Cuando un test falla, Hypothesis intenta encontrar el input más pequeño que aún falla. Por ejemplo, si `[3, -1, 0, 42, 17]` falla, podría reducir a `[0]` o `[-1]` — el reproducer mínimo.

### ¿Cómo reproduzco un test de Hypothesis que falla?

Hypothesis imprime una seed y el input simplificado que falla. Agrégalo con `@example`:

```python
@example(s="\x00")
@given(st.text())
def test_with_reproducer(s):
    ...
```

### ¿Puedo usar Hypothesis con Django o Flask?

Sí, pero solo para testear lógica pura (métodos de modelo, funciones utilitarias). No lo uses para views que hittean la base de datos — usa `@pytest.mark.django_db` con casos de test explícitos en su lugar.

### ¿Cómo limito el runtime del test?

Usa `@settings(max_examples=50, deadline=500)` para reducir el número de casos generados y setear un timeout por ejemplo en milisegundos.
