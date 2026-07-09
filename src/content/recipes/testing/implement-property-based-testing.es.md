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
lastUpdated: "2026-07-09"
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

## Lo que funciona

- **Comienza con propiedades, no con generadores.** La parte difícil del property-based testing es encontrar la propiedad correcta (`encode(decode(x)) == x`), no escribir el generador.
- **Usa shrinking religiosamente.** El valor del property-based testing es encontrar el caso de fallo mínimo. Asegúrate de que el shrinking de tu framework esté habilitado y sea útil.
- **Combina con tests basados en ejemplos.** Las propiedades verifican invariantes; los ejemplos verifican escenarios de negocio específicos. Ambos son necesarios.
- **Mantén las propiedades puras.** Una propiedad que escribe a base de datos o depende del tiempo actual no es reproducible y no puede hacerse shrink bien.
- **Usa una seed determinística en CI.** Los property tests son aleatorios por naturaleza; una seed asegura que los fallos sean reproducibles entre ejecuciones.

## Errores Comunes

- **Testear la implementación, no la especificación.** Escribir `property: sort(arr) == mySortFunction(arr)` es tautológico y no encuentra bugs.
- **Propiedades demasiado débiles.** `length(f(x)) >= 0` siempre es verdadero y no provee valor. Las propiedades deben ser lo suficientemente fuertes para atrapar bugs reales.
- **Ignorar el output de shrinking.** Un array de 100 elementos que falla es difícil de debuggear; el array shrink de 3 elementos es lo que deberías analizar.
- **Generadores lentos o no terminantes.** Generar estructuras recursivas sin límites de profundidad puede causar loops infinitos durante la ejecución de tests.
- **Propiedades flaky debido a estado global.** Una propiedad que modifica un contador a nivel de módulo falla impredeciblemente dependiendo del orden de ejecución.

## Preguntas Frecuentes

**Q: ¿Qué es property-based testing?**
A: En lugar de escribir entradas de ejemplo, defines propiedades que siempre deberían cumplirse para una función. El framework genera cientos de entradas aleatorias e intenta encontrar un contraejemplo.

**Q: ¿Qué es el shrinking en PBT?**
A: Cuando se encuentra un contraejemplo, el framework reduce la entrada al valor más pequeño posible que aún falla la propiedad. Esto hace el debugging mucho más rápido.

**Q: ¿Cuándo PBT no es una buena opción?**
A: PBT es menos útil para flujos de UI, máquinas de estado complejas o propiedades difíciles de expresar formalmente. Los tests basados en ejemplos siguen siendo valiosos para esos casos.

### ¿Cómo escribo propiedades para sistemas con estado?

Modela el sistema como una máquina de estados y genera secuencias de comandos (ej., `push(x)`, `pop()`, `peek()`). Define un invariante que se cumpla después de cada comando — para un stack, `pop()` retorna el último valor pusheado. Usa el soporte del framework para testing con estado: Hypothesis `@st.composite` con rules, fast-check `fc.commands`, o `@Lifecycle` de jqwik. Ejecuta suficientes iteraciones para cubrir interleavings (500+ runs).

### ¿Cuál es la diferencia entre testing generativo y basado en ejemplos?

Los tests basados en ejemplos usan inputs fijos que eliges. Los tests generativos (property-based) usan inputs generados por el framework a lo largo de muchas runs. Los tests basados en ejemplos son mejores para regresión (conoces el input exacto que falla). Los tests property-based son mejores para exploración (encuentran inputs que nunca se te ocurriría testear). Usa ambos: property tests para invariantes, example tests para edge cases específicos y regresión.

### ¿Cómo controlo el runtime de los tests property-based en CI?

Setea `max_examples` (Hypothesis), `num_runs` (fast-check), o `@Trials` (jqwik) a un valor más bajo en CI (ej., 100) y más alto localmente (ej., 1000). Usa un profile de CI separado o variable de entorno. Marca los property tests de larga duración con un marker custom y excluyelos de los pipelines rápidos de CI. Ejecuta las suites completas de property tests nightly.

### ¿Cómo reproduzco un test property-based que falla?

Los frameworks imprimen el contraejemplo shrinkeado al fallar. Copia los valores exactos del input y escribe un test basado en ejemplos con esos valores. En Hypothesis, usa `@example` para fijar el caso que falla. En fast-check, usa `fc.constant` para reproducir. En jqwik, usa `@ForAll` con `@FromData`. Esto asegura que el test de regresión se ejecute deterministamente sin necesitar la run completa de property-based.

### ¿Cómo genero data realista para tests property-based?

Usa combinadores de strategies para constreñir la data generada a rangos realistas. Para emails, genera patrones `string@string.string`. Para fechas, genera valores dentro de bounds de lógica de negocio (ej., 1900-2100). Para JSON, usa generadores recursivos que produzcan objetos anidados. Librerías como `hypothesis-jsonschema` generan data matching un JSON Schema. Para data domain-specific, escribe strategies custom que encodeen reglas de negocio (ej., IBANs válidos, ISBNs válidos).

### ¿Cómo integro tests property-based con pipelines CI/CD?

Ejecuta los tests property-based como un job de CI separado de los unit tests para evitar bloquear PRs en runs largos. Setea `max_examples` a 50-100 en CI y 1000+ en runs nightly. Usa el marker `pytest --property-based-tests` o `npm run test:property` para aislarlos. Cachea la example database de Hypothesis entre runs de CI para que los casos que fallan conocidos se replayeen primero. Fallea el pipeline en cualquier contraejemplo encontrado, y adjunta el input shrinkeado como artifact de CI para debugging.

### ¿Cómo escribo propiedades para funciones async?

Wrappa funciones async en un adapter sync usando `asyncio.run()` o `pytest-asyncio`. En fast-check, usa `fc.asyncProperty` con arbitraries async. En Hypothesis, usa `@given` con `st.from_type` y llama `asyncio.run(fn(x))` dentro del test body. Para propiedades concurrentes, genera listas de operaciones async y aserta invariantes después de que todas settleen. Usa `anyio` para testear contra backends asyncio y trio con la misma propiedad.

### ¿Cómo debuggeo un test property-based que falla?

Lee el contraejemplo shrinkeado impreso por el framework. Agrega `print()` o logging dentro de la property function para trazar la ejecución con el input que falla. Usa `@seed` (Hypothesis) o `fc.seed` (fast-check) para reproducir la secuencia random exacta. Si el input shrinkeado sigue siendo complejo, agrega `assume()`/`fc.pre()` para constreñir el search space más. Escribe un unit test con el input exacto que falla para debuggear paso a paso en tu IDE.

### ¿Cómo combino property-based testing con fuzzing?

Property-based testing es una forma de fuzzing — genera inputs random y chequea propiedades. Para coverage-guided fuzzing, usa `Atheris` (Python) o `jsfuzz` (JavaScript) que trackean code coverage y mutan inputs para alcanzar nuevas branches. Combina con PBT definiendo propiedades que el fuzzer chequea: el fuzzer maximiza coverage mientras las property assertions verifican corrección. Usa `atheris.FuzzedDataProvider` para feedear data estructurada del fuzzer a tu propiedad.

### ¿Cómo escribo propiedades para round-trips de serialización?

La propiedad clásica: `deserialize(serialize(x)) == x` para todo `x` válido. Genera objetos del tipo target, serializalos, deserializa el resultado, y aserta igualdad. Para JSON, genera objetos con `st.recursive` conteniendo strings, ints, floats, lists, y dicts. Para protobuf, usa `st.from_type` con las clases generadas. Maneja pérdida de precisión explícitamente: floats pueden no round-tripear exactamente a través de JSON, así que compara con tolerancia en lugar de igualdad estricta.

### ¿Cómo escribo propiedades para funciones puras vs funciones con side effects?

Para funciones puras, las propiedades son straightforward: aserta invariantes como `f(x) >= 0` o `f(f(x)) == f(x)`. Para funciones con side effects, aísla los side effects usando dependency injection o mocks. Genera inputs, ejecuta la función con una database o API mockeada, y aserta propiedades sobre la secuencia de calls hechas (ej., "cada insert es seguido por un commit" o "ningún read ocurre después de un write a la misma key"). Usa stateful property testing para funciones con estado acumulado. Para funciones con external API calls, genera mock responses y aserta propiedades de retry/backoff.

### ¿Cómo comparto strategies entre test suites?

Extrae strategies reutilizables en un módulo compartido (ej., `test/strategies.py` o `test/strategies.ts`). Exporta generadores comunes como `email_strategy`, `date_strategy`, `json_strategy` que encodeen reglas de dominio. Impórtalos en los test files para mantener las properties DRY. En Hypothesis, usa `st.register_type_strategy` para bindear una strategy a un tipo custom para que `st.from_type(MyClass)` funcione automáticamente. En fast-check, exporta instancias de `fc.Arbitrary` desde un archivo compartido.
