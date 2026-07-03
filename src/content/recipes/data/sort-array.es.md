---
contentType: recipes
slug: sort-array
title: "Ordenar un Array"
description: "Cómo ordenar arrays y listas en orden ascendente, descendente y personalizado en varios lenguajes."
metaDescription: "Ejemplos prácticos de ordenamiento de arrays en Python, JavaScript y Java. Aprende orden ascendente, descendente y comparadores personalizados."
difficulty: beginner
topics:
  - data
tags:
  - data
  - java
  - parsing
  - json
  - csv
relatedResources:
  - /recipes/parse-json
  - /recipes/unit-testing
  - /recipes/date-formatting
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de ordenamiento de arrays en Python, JavaScript y Java. Aprende orden ascendente, descendente y comparadores personalizados."
  keywords:
    - ordenar array
    - sorting
    - ordenar lista
    - comparador
---

## Overview

El ordenamiento es una de las tareas de manipulación de datos más comunes. Cada lenguaje provee utilidades de ordenamiento optimizadas y built-in. Esta receta muestra cómo ordenar arrays y listas en orden ascendente, descendente y por criterios personalizados (ej. por una propiedad o con un comparador custom).

## When to Use

Usa esta receta cuando:

- Muestres datos en un orden específico (alfabético, cronológico, por prioridad). Consulta [Date Formatting](/recipes/data/date-formatting) para ordenamiento cronológico.
- Prepares datos para algoritmos que requieren entrada ordenada (búsqueda binaria, merge)
- Normalices datos antes de comparación o deduplicación
- Implementes ranking, leaderboards o ordenamiento de resultados de búsqueda. Consulta [Pagination](/recipes/api/pagination) para gestionar resultados ordenados.

## Solution

### Python

```python
numbers = [3, 1, 4, 1, 5, 9, 2, 6]

# Ascendente (default)
asc = sorted(numbers)
# [1, 1, 2, 3, 4, 5, 6, 9]

# Descendente
desc = sorted(numbers, reverse=True)
# [9, 6, 5, 4, 3, 2, 1, 1]

# Ordenar objetos por clave
users = [
    {"name": "Bob", "age": 30},
    {"name": "Ada", "age": 36},
    {"name": "Chen", "age": 25},
]
by_age = sorted(users, key=lambda u: u["age"])
# Chen (25), Bob (30), Ada (36)

# In-place
numbers.sort()
```

### JavaScript

```javascript
const numbers = [3, 1, 4, 1, 5, 9, 2, 6];

// Ascendente
const asc = numbers.toSorted((a, b) => a - b);
// [1, 1, 2, 3, 4, 5, 6, 9]

// Descendente
const desc = numbers.toSorted((a, b) => b - a);
// [9, 6, 5, 4, 3, 2, 1, 1]

// Ordenar objetos por propiedad
const users = [
  { name: 'Bob', age: 30 },
  { name: 'Ada', age: 36 },
  { name: 'Chen', age: 25 },
];
const byAge = users.toSorted((a, b) => a.age - b.age);
// Chen (25), Bob (30), Ada (36)

// In-place
numbers.sort((a, b) => a - b);
```

### Java

```java
import java.util.*;

List<Integer> numbers = new ArrayList<>(List.of(3, 1, 4, 1, 5, 9, 2, 6));

// Ascendente
Collections.sort(numbers);
// [1, 1, 2, 3, 4, 5, 6, 9]

// Descendente
numbers.sort(Collections.reverseOrder());
// [9, 6, 5, 4, 3, 2, 1, 1]

// Ordenar objetos por campo
record User(String name, int age) {}
List<User> users = List.of(
    new User("Bob", 30),
    new User("Ada", 36),
    new User("Chen", 25)
);
List<User> byAge = users.stream()
    .sorted(Comparator.comparingInt(User::age))
    .toList();
// Chen (25), Bob (30), Ada (36)

// Comparador personalizado (longitud de nombre descendente)
users.stream()
    .sorted(Comparator.comparingInt((User u) -> u.name().length()).reversed())
    .toList();
```

## Explanation

- **Estabilidad**: Python y JavaScript usan Timsort, que es estable (elementos iguales mantienen su orden original). `Collections.sort()` de Java también usa Timsort y es estable.
- **Contrato del comparador**: un comparador devuelve un número negativo si `a < b`, cero si son iguales, y positivo si `a > b`. Violar este contrato (ej. resultados inconsistentes) causa comportamiento indefinido.
- **In-place vs. copia**: `list.sort()` y `Arrays.sort()` modifican el original; `sorted()` y `toSorted()` devuelven una nueva colección. Prefiere copias inmutables a menos que la memoria sea un constraint.
- **Complejidad temporal**: los sorts built-in son `O(n log n)` en promedio y peor caso. Para datos especializados (enteros en un rango pequeño), counting sort puede ser `O(n)`.

## Variants

| Tarea | Python | JavaScript | Java |
|-------|--------|------------|------|
| Ascendente | `sorted(lst)` | `toSorted((a,b)=>a-b)` | `Collections.sort(list)` |
| Descendente | `sorted(lst, reverse=True)` | `toSorted((a,b)=>b-a)` | `sort(reverseOrder())` |
| Por clave/propiedad | `sorted(lst, key=fn)` | `toSorted((a,b)=>a.p-b.p)` | `sorted(Comparator.comparing(...))` |
| In-place | `lst.sort()` | `lst.sort(...)` | `list.sort(...)` |

## Lo que funciona

- **Usa sorts built-in**: no implementes tu propio algoritmo de ordenamiento a menos que tengas un perfil de rendimiento muy específico (ej. datos casi ordenados).
- **Mantén comparadores puros**: las funciones comparadoras no deben mutar datos ni depender de estado externo.
- **Maneja empates explícitamente**: si dos items son iguales en la clave primaria, ordena por una clave secundaria para asegurar orden determinista.
- **Prefiere inmutabilidad**: devolver un array/lista ordenada nueva evita efectos secundarios sorprendentes en el código llamador.
- **Ordenamiento consciente de locale**: para strings orientadas al usuario, usa collation sensible a locale (`localeCompare` en JS, `locale.strxfrm` en Python) en lugar de comparación raw de code points.

## Common Mistakes

- **Ordenar números alfabéticamente en JavaScript**: `[10, 2].sort()` produce `[10, 2]` porque el sort default convierte elementos a strings. Siempre pasa un comparador para números.
- **Mutar durante el sort**: modificar el array siendo ordenado (ej. en un comparador con side effects) causa resultados impredecibles.
- **Comparador inconsistente**: devolver solo `1` y `-1` sin `0` para igualdad puede causar crashes o resultados incorrectos en algunas implementaciones.
- **Ordenar datasets enormes en memoria**: para datasets mayores que la RAM disponible, usa external sorting o `ORDER BY` de base de datos. Consulta [Database Transactions](/recipes/databases/database-transactions) para consistencia de datos.
- **Asumir que todos los sorts son estables**: aunque la mayoría de lenguajes modernos usan sorts estables, no confíes en la estabilidad a menos que esté documentada. Ordena explícitamente por claves secundarias cuando el orden importe.

## Frequently Asked Questions

**Q: ¿Por qué `[10, 2].sort()` devuelve `[10, 2]` en JavaScript?**
A: El `sort()` default convierte elementos a strings y compara unidades de código UTF-16. `"10"` viene antes que `"2"` lexicográficamente. Siempre pasa `(a, b) => a - b` para sorts numéricos.

**Q: ¿Cómo ordeno por múltiples campos?**
A: En Python, devuelve una tupla desde la key function: `sorted(users, key=lambda u: (u.country, u.age))`. En JavaScript, encadena comparaciones: `(a, b) => a.country.localeCompare(b.country) || a.age - b.age`.

**Q: ¿El ordenamiento in-place es más rápido que crear una copia ordenada nueva?**
A: Ligeramente, porque evita asignar un nuevo array. Sin embargo, para la mayoría de aplicaciones la diferencia es despreciable. Prefiere inmutabilidad a menos que el profiling muestre un bottleneck.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
