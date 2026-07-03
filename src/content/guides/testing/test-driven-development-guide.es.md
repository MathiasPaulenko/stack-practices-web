---
contentType: guides
slug: test-driven-development-guide
title: "Desarrollo Guiado por Pruebas (TDD)"
description: "Aprende TDD paso a paso: escribe un test que falle, hazlo pasar, refactoriza. Red-Green-Refactor con ejemplos reales en Python, JavaScript y Java."
metaDescription: "Guía de Desarrollo Guiado por Pruebas: ciclo Red-Green-Refactor con ejemplos prácticos. Aprende TDD en Python, JavaScript y Java paso a paso."
difficulty: beginner
topics:
  - testing
  - design
tags:
  - desarrollo-guiado-por-pruebas
  - flujo-de-trabajo
  - guia
  - pruebas-unitarias
  - red-green-refactor
  - tdd
  - testing
relatedResources:
  - /guides/testing/testing-strategy-guide
  - /guides/design/clean-code-principles-guide
  - /guides/design/solid-principles-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de Desarrollo Guiado por Pruebas: ciclo Red-Green-Refactor con ejemplos prácticos. Aprende TDD en Python, JavaScript y Java paso a paso."
  keywords:
    - desarrollo guiado por pruebas
    - tutorial tdd
    - red green refactor
    - tdd python
    - tdd javascript
    - flujo de trabajo pruebas unitarias
---

# Desarrollo Guiado por Pruebas (TDD)

## Introducción

El Desarrollo Guiado por Pruebas es un proceso de desarrollo de software donde los tests se escriben antes del código de producción. Sigue un ciclo corto y repetitivo: escribe un test que falle, escribe el código mínimo para que pase, luego refactoriza manteniendo los tests verdes.

## El Ciclo Red-Green-Refactor

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  Red    │ →  │  Green  │ →  │Refactor │
│ Escribe │    │ Código  │    │ Mejora  │
│  Falla  │    │ Mínimo  │    │ Diseño  │
│  Test   │    │  Pasa   │    │         │
└─────────┘    └─────────┘    └─────────┘
      ↑                           │
      └───────────────────────────┘
```

### 1. Red — Escribe un Test que Falle

Comienza con un test que describe el comportamiento que deseas. Ejecútalo y observa fallar.

```python
# test_calculator.py
def test_add_two_numbers():
    calc = Calculator()
    result = calc.add(2, 3)
    assert result == 5
```

```bash
$ pytest test_calculator.py
FAILED: Calculator not defined
```

**¿Por qué red primero?** Un test que pasa sin código no prueba nada. Verlo fallar confirma que el test realmente está verificando algo.

### 2. Green — Escribe Código Mínimo

Escribe el código más simple que haga pasar el test. No te preocupes por la elegancia aún.

```python
# calculator.py
class Calculator:
    def add(self, a, b):
        return a + b  # implementación más simple posible
```

```bash
$ pytest test_calculator.py
PASSED
```

**¿Por qué mínimo?** Quieres el camino más corto a green. La abstracción prematura oscurece si el test realmente verifica lo correcto.

### 3. Refactor — Mejora el Diseño

Ahora que el test pasa, limpia: renombra variables, extrae métodos, elimina duplicación. Ejecuta los tests después de cada cambio.

```python
# Refactorizado: aún pasa, pero más limpio
class Calculator:
    def add(self, augend, addend):
        return augend + addend
```

**¿Por qué refactorizar en green?** Los tests actúan como red de seguridad. Si un refactor rompe algo, lo sabes inmediatamente.

## Un Ejemplo Completo

Construyamos un `ShoppingCart` usando TDD.

### Paso 1: Carrito Vacío

```python
def test_empty_cart_total_is_zero():
    cart = ShoppingCart()
    assert cart.total() == 0
```

```python
class ShoppingCart:
    def total(self):
        return 0
```

### Paso 2: Agregar Items

```python
def test_add_item_increases_total():
    cart = ShoppingCart()
    cart.add(Item("manzana", 1.50))
    assert cart.total() == 1.50
```

```python
class ShoppingCart:
    def __init__(self):
        self.items = []

    def add(self, item):
        self.items.append(item)

    def total(self):
        return sum(item.price for item in self.items)
```

### Paso 3: Aplicar Descuento

```python
def test_apply_discount():
    cart = ShoppingCart()
    cart.add(Item("laptop", 1000))
    cart.apply_discount("SAVE10")
    assert cart.total() == 900
```

```python
class ShoppingCart:
    ...
    def apply_discount(self, code):
        self.discount = 0.10  # hardcodeado por ahora

    def total(self):
        subtotal = sum(item.price for item in self.items)
        if hasattr(self, 'discount'):
            return subtotal * (1 - self.discount)
        return subtotal
```

### Paso 4: Refactorizar — Extraer Lógica de Descuento

```python
class Discount:
    def __init__(self, code, percentage):
        self.code = code
        self.percentage = percentage

    def apply(self, amount):
        return amount * (1 - self.percentage)

class ShoppingCart:
    def __init__(self):
        self.items = []
        self.discount = None

    def add(self, item):
        self.items.append(item)

    def apply_discount(self, code):
        discounts = {"SAVE10": 0.10, "SAVE20": 0.20}
        self.discount = Discount(code, discounts.get(code, 0))

    def total(self):
        subtotal = sum(item.price for item in self.items)
        if self.discount:
            return self.discount.apply(subtotal)
        return subtotal
```

## Las Tres Leyes de TDD

1. **No puedes escribir código de producción hasta tener un test unitario fallido.**
2. **No puedes escribir más de un test unitario que sea suficiente para fallar.** (Los errores de compilación cuentan como fallos.)
3. **No puedes escribir más código de producción que el suficiente para pasar el test actualmente fallido.**

## Beneficios de TDD

| Beneficio | Cómo TDD Lo Entrega |
|-----------|---------------------|
| **Confianza** | Cada característica está respaldada por un test que prueba que funciona |
| **Presión de diseño** | El código debe ser testeable, lo cual tiende hacia [diseños desacoplados y modulares](/guides/design/solid-principles-guide) |
| **Documentación** | Los tests son ejemplos ejecutables de cómo usar el código |
| **Seguridad de regresión** | Los cambios son seguros porque los tests existentes detectan roturas |
| **Tiempo de debugging** | Los bugs se detectan inmediatamente, no días después |

## Errores Comunes de TDD

- **Probar implementación, no comportamiento** — haz assertions sobre valores de retorno, no sobre estado interno. Consulta [unit testing](/recipes/testing/unit-testing).
- **Escribir demasiados tests antes de código** — mantén el ciclo corto (minutos, no horas)
- **Saltar el paso de refactor** — el tercer paso es donde mejora el [código limpio](/guides/design/clean-code-principles-guide)
- **Probar getters/setters triviales** — enfócate en lógica y decisiones
- **No ejecutar tests frecuentemente** — si escribes 50 líneas sin ejecutar tests, no estás haciendo TDD

## TDD vs. Pruebas Unitarias

| | Pruebas Unitarias Tradicionales | TDD |
|---|-------------------------------|-----|
| **Cuándo se escriben los tests** | Después del código | Antes del código |
| **Cobertura de tests** | A menudo incompleta | Exhaustiva por diseño |
| **Influencia en diseño** | Mínima | Importante (testabilidad guía el diseño) |
| **Esfuerzo de debugging** | Mayor | Menor |

## Cuándo TDD Funciona Mejor

Usa TDD para:
- Lógica de negocio con entradas y salidas claras
- Código algorítmico
- APIs y límites de servicio
- Código que esperas cambiar frecuentemente

Usa con precaución en:
- Componentes de UI (usa tests de componente/E2E en su lugar)
- Prototipado exploratorio
- Código legacy acoplado (refactoriza para testeabilidad primero)

## Lo que funciona

- **Mantén los tests rápidos** — una suite lenta desanima ejecutarla
- **Un concepto por test** — un fallo de test debe apuntar a exactamente un problema
- **Usa nombres descriptivos en tests** — el nombre debe explicar el escenario y resultado esperado
- **Evita interdependencia de tests** — cada test debe crear su propio estado
- **Refactoriza tests también** — setup duplicado es un olor; usa fixtures y helpers

## Preguntas Frecuentes

**P: ¿TDD ralentiza el desarrollo?**
R: Inicialmente sí, pero se recupera en debugging reducido y refactoring más seguro. Estudios muestran que TDD puede reducir tasas de defectos en 40-90%.

**P: ¿Qué pasa si no sé cómo debería verse la API aún?**
R: TDD es una herramienta de diseño. Escribir el test primero te ayuda a descubrir la forma de la API. Si realmente estás explorando, un spike rápido está bien — luego reescribe con TDD una vez que entiendas el problema.

**P: ¿Debería usar TDD para cada función?**
R: No. Enfócate en código con comportamiento que valga la pena verificar. Objetos simples de transferencia de datos o configuración a menudo no necesitan tests unitarios dedicados.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.
