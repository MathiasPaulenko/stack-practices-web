---
contentType: recipes
slug: unit-testing
title: "Pruebas Unitarias"
description: "Cómo escribir pruebas unitarias rápidas y deterministas con mocks y assertions en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de pruebas unitarias con pytest, Jest y JUnit. Aprende a estructurar tests, usar mocks y mantener suites rápidas."
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
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Ejemplos prácticos de pruebas unitarias con pytest, Jest y JUnit. Aprende a estructurar tests, usar mocks y mantener suites rápidas."
  keywords:
    - pruebas unitarias
    - pytest
    - jest
    - junit
    - automatización de pruebas
---

## Overview

Las pruebas unitarias validan las piezas más pequeñas y testeables de tu código — usualmente una sola función o método — aisladas de dependencias externas. Una buena prueba unitaria es rápida, determinista y lo suficientemente legible como para servir como documentación viva.

Esta receta muestra cómo escribir pruebas unitarias idiomáticas en Python (pytest), JavaScript (Jest) y Java (JUnit 5).

## When to Use

Usa esta receta cuando:

- Agregues o modifiques lógica de negocio que deba verificarse automáticamente
- Refactores código legacy y quieras confianza de que no rompiste el comportamiento
- Practiques desarrollo guiado por pruebas (TDD)
- Configures un pipeline CI/CD que requiera una suite de pruebas exitosa antes del deploy

## Solution

### Python (pytest)

```python
# calculator.py
def add(a, b):
    return a + b


def divide(a, b):
    if b == 0:
        raise ValueError("No se puede dividir por cero")
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
    with pytest.raises(ValueError, match="No se puede dividir por cero"):
        divide(10, 0)
```

Ejecutar: `pytest -q`

### JavaScript (Jest)

```javascript
// calculator.js
function add(a, b) {
  return a + b;
}

function divide(a, b) {
  if (b === 0) throw new Error('No se puede dividir por cero');
  return a / b;
}

module.exports = { add, divide };

// calculator.test.js
const { add, divide } = require('./calculator');

describe('add', () => {
  test('suma números positivos', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('suma números negativos', () => {
    expect(add(-1, 1)).toBe(0);
  });
});

describe('divide', () => {
  test('divide correctamente', () => {
    expect(divide(10, 2)).toBe(5);
  });

  test('lanza error al dividir por cero', () => {
    expect(() => divide(10, 0)).toThrow('No se puede dividir por cero');
  });
});
```

Ejecutar: `jest`

### Java (JUnit 5)

```java
// Calculator.java
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public double divide(double a, double b) {
        if (b == 0) throw new IllegalArgumentException("No se puede dividir por cero");
        return a / b;
    }
}

// CalculatorTest.java
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    private final Calculator calc = new Calculator();

    @Test
    void sumaNumerosPositivos() {
        assertEquals(5, calc.add(2, 3));
    }

    @Test
    void sumaNumerosNegativos() {
        assertEquals(0, calc.add(-1, 1));
    }

    @Test
    void divideCorrectamente() {
        assertEquals(5.0, calc.divide(10, 2));
    }

    @Test
    void dividePorCeroLanzaExcepcion() {
        Exception ex = assertThrows(IllegalArgumentException.class, () -> calc.divide(10, 0));
        assertEquals("No se puede dividir por cero", ex.getMessage());
    }
}
```

Ejecutar: `mvn test` o el runner de tu IDE.

## Explanation

- **Arrange-Act-Assert (AAA)**: cada prueba debe preparar el estado (arrange), ejecutar el código bajo prueba (act) y verificar el resultado (assert). Esta estructura hace que los tests sean fáciles de escanear.
- **Determinismo**: las pruebas unitarias nunca deben depender de la red, el sistema de archivos o la hora actual. Si lo hacen, son pruebas de integración.
- **Aislamiento**: cada prueba debe ejecutarse independientemente. El estado global o fixtures mutables compartidos causan fallos flaky dependientes del orden.
- **Retroalimentación rápida**: una suite de pruebas unitarias debe ejecutarse en segundos, no minutos. Las suites lentas desalientan ejecutarlas localmente.

## Variants

| Característica | Python (pytest) | JavaScript (Jest) | Java (JUnit 5) |
|----------------|-----------------|-------------------|----------------|
| Estilo de assertion | `assert` keyword | `expect(...).toBe()` | `assertEquals(...)` |
| Test de excepciones | `pytest.raises()` | `expect(...).toThrow()` | `assertThrows(...)` |
| Tests parametrizados | `@pytest.mark.parametrize` | `test.each` | `@ParameterizedTest` |
| Mocking | `unittest.mock` | `jest.mock` | Mockito |
| Fixtures | `pytest.fixture` | `beforeEach` / `afterEach` | `@BeforeEach` / `@AfterEach` |

## Best Practices

- **Nombra tests según comportamiento**: `sumaNumerosNegativos` es mejor que `test_add2` porque describe la intención.
- **Un concepto por test**: si necesitas múltiples asserts, asegúrate de que verifiquen un solo resultado lógico. De lo contrario, divide el test.
- **Evita lógica en tests**: sin sentencias `if` ni bucles en tests — hacen que los fallos sean más difíciles de diagnosticar.
- **Usa fakes sobre mocks cuando sea posible**: un repositorio en memoria fake es más simple que mockear cada llamada a método.
- **Mantén los tests cerca del código**: coloca los archivos de test junto al fuente (co-locación) o en un directorio `tests/` espejado.

## Common Mistakes

- **Probar implementación en vez de comportamiento**: afirmar que se llamó a un método privado específico hace que los tests sean frágiles durante refactoring.
- **Ignorar casos edge**: cadenas vacías, cero, null/undefined y entradas muy grandes son donde se esconden los bugs.
- **Estado mutable compartido**: un test que muta un contador global rompe todos los tests que se ejecutan después.
- **Pruebas unitarias lentas**: llamar a una base de datos real o servicio HTTP convierte pruebas unitarias en de integración y ralentiza la suite.
- **Salida ruidosa**: `console.log` o `System.out.println` en tests ensucian los logs de CI. Usa fallos de assertion apropiados en su lugar.

## Frequently Asked Questions

**Q: ¿Cuántos asserts debe tener una prueba unitaria?**
A: Un concepto lógico por test. Múltiples asserts están bien si verifican diferentes aspectos del mismo resultado (ej. un objeto creado tiene el ID correcto y el nombre correcto). Si los conceptos divergen, divide el test.

**Q: ¿Debería probar métodos privados?**
A: No. Prueba la API pública. Los métodos privados son detalles de implementación; si los cambias, no deberías tener que actualizar tests. Si un método privado es lo suficientemente complejo como para necesitar sus propios tests, considera extraerlo a una clase separada.

**Q: ¿Cuál es la diferencia entre un stub y un mock?**
A: Un stub proporciona respuestas predefinidas a llamadas. Un mock verifica que ocurrieron interacciones específicas (ej. "este método fue llamado exactamente una vez"). Usa stubs para entradas; usa mocks con moderación para verificar efectos secundarios.
