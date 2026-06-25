---
contentType: recipes
slug: implement-property-based-testing
title: "Implementar Property-Based Testing"
description: "Cómo escribir tests property-based con Hypothesis, fast-check y jqwik que generan miles de entradas para encontrar casos edge que los tests tradicionales no detectan."
metaDescription: "Escribe tests property-based con Hypothesis, fast-check y jqwik que generan miles de entradas para encontrar casos edge que los tests tradicionales no detectan."
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
  metaDescription: "Escribe tests property-based con Hypothesis, fast-check y jqwik que generan miles de entradas para encontrar casos edge que los tests tradicionales no detectan."
  keywords:
    - testing
    - property-based-testing
    - hypothesis
    - fast-check
    - jqwik
    - fuzzing
    - recipe
---

## Descripción General

Los tests tradicionales basados en ejemplos verifican una entrada a la vez (`assert reverse("abc") == "cba"`). Los tests property-based describen propiedades universales (`reverse(reverse(s)) == s`) y el framework genera cientos de entradas aleatorias para encontrar violaciones. Este enfoque descubre casos edge — strings vacíos, caracteres Unicode combining, overflow de enteros, null pointers — que los ejemplos elegidos por humanos raramente cubren.

## Cuándo Usar

- Funciones puras con propiedades matemáticas claras (sorting, parsing, encoding, serialization)
- Rutinas de validación y sanitización de entrada que deben manejar datos arbitrarios
- Comportamiento de state machine donde las transiciones deben preservar invariantes
- Algoritmos que deben ser reversibles (compress/decompress, encrypt/decrypt, encode/decode)
- Has experimentado bugs causados por inputs específicos de casos edge (colecciones vacías, MAX_INT, caracteres especiales)

## Cuándo NO Usar

- El código depende fuertemente de I/O o tiene efectos secundarios — las propiedades son difíciles de enunciar y verificar
- Los tests necesitan asertar comportamiento exacto para escenarios de negocio específicos — usa tests basados en ejemplos
- La propiedad es demasiado compleja para enunciar formalmente ("se ve bien para un humano")
- El tiempo de ejecución importa — los property tests ejecutan cientos de iteraciones y pueden ser lentos

## Implementación Paso a Paso

### Python (Hypothesis)

```python
from hypothesis import given, strategies as st, settings, example

# Propiedad básica: reversar dos veces devuelve el original
@given(st.text())
def test_reverse_is_involution(s):
    assert reverse(reverse(s)) == s

# Estrategia restringida
@given(st.integers(min_value=0, max_value=1000))
def test_square_is_non_negative(n):
    assert n * n >= 0

# Estrategia compuesta para objetos de dominio
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

# Testing de state machine
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

// Propiedad: reverse(reverse(s)) === s
fc.assert(
  fc.property(fc.string(), (s) => {
    return reverse(reverse(s)) === s;
  }),
  { numRuns: 1000 }
);

// Propiedad con precondición
fc.assert(
  fc.property(
    fc.array(fc.integer()),
    (arr) => {
      const sorted = arr.slice().sort((a, b) => a - b);
      // Monotónico: cada elemento <= el siguiente
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

// Shrink al caso de fallo mínimo
fc.assert(
  fc.property(fc.array(fc.integer()), (arr) => {
    return myFunction(arr) >= 0;  # Falla en algún input
  })
);
// fast-check automáticamente hace shrink al array más pequeño que falla
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

    // Arbitraries personalizados (generadores)
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

## Mejores Prácticas

- **Comienza con propiedades, no con generadores.** La parte difícil del property-based testing es encontrar la propiedad correcta (`encode(decode(x)) == x`), no escribir el generador.
- **Usa shrinking religiosamente.** El valor del property-based testing es encontrar el caso de fallo mínimo. Asegúrate de que el shrinking de tu framework esté habilitado y sea efectivo.
- **Combina con tests basados en ejemplos.** Las propiedades verifican invariantes; los ejemplos verifican escenarios de negocio específicos. Ambos son necesarios.
- **Mantén las propiedades puras.** Una propiedad que escribe a base de datos o depende del tiempo actual no es reproducible y no puede hacerse shrink efectivamente.
- **Usa una seed determinística en CI.** Los property tests son aleatorios por naturaleza; una seed asegura que los fallos sean reproducibles entre ejecuciones.

## Errores Comunes

- **Testear la implementación, no la especificación.** Escribir `property: sort(arr) == mySortFunction(arr)` es tautológico y no encuentra bugs.
- **Propiedades demasiado débiles.** `length(f(x)) >= 0` siempre es verdadero y no provee valor. Las propiedades deben ser lo suficientemente fuertes para atrapar bugs reales.
- **Ignorar el output de shrinking.** Un array de 100 elementos que falla es difícil de debuggear; el array shrink de 3 elementos es lo que deberías analizar.
- **Generadores lentos o no terminantes.** Generar estructuras recursivas sin límites de profundidad puede causar loops infinitos durante la ejecución de tests.
- **Propiedades flaky debido a estado global.** Una propiedad que modifica un contador a nivel de módulo falla impredeciblemente dependiendo del orden de ejecución.

## Recursos Relacionados

- [Generar Datos de Test](/recipes/testing/generate-test-data)
- [Configurar Fixtures de Test](/recipes/testing/setup-test-fixtures)
- [Mutation Testing](/recipes/testing/implement-mutation-testing)
