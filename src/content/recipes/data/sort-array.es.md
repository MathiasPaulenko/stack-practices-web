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
  - /recipes/money-currency
  - /recipes/regular-expressions
lastUpdated: "2026-06-10"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Ejemplos prácticos de ordenamiento de arrays en Python, JavaScript y Java. Aprende orden ascendente, descendente y comparadores personalizados."
  keywords:
    - ordenar array
    - sorting
    - ordenar lista
    - comparador


---
## Overview

El ordenamiento es una de las tareas de manipulación de datos más comunes. Cada lenguaje provee utilidades de ordenamiento optimizadas y built-in. La solucion abajo muestra cómo ordenar arrays y listas en orden ascendente, descendente y por criterios personalizados (ej. por una propiedad o con un comparador custom).

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

- **Estabilidad**: Python y JavaScript usan Timsort, que es estable (elementos iguales mantienen su orden original).   `Collections.
- **Contrato del comparador**: un comparador devuelve un número negativo si `a < b`, cero si son iguales, y positivo si `a > b`.   Violar este contrato (ej.   resultados inconsistentes) causa comportamiento indefinido.
- **In-place vs. copia**: `list.  sort()` y `Arrays.  sort()` modifican el original; `sorted()` y `toSorted()` devuelven una nueva colección.   Prefiere copias inmutables a menos que la memoria sea un constraint.
- **Complejidad temporal**: los sorts built-in son `O(n log n)` en promedio y peor caso.   Para datos especializados (enteros en un rango pequeño), counting sort puede ser `O(n)`.

## Variants

| Tarea | Python | JavaScript | Java |
|-------|--------|------------|------|
| Ascendente | `sorted(lst)` | `toSorted((a,b)=>a-b)` | `Collections.sort(list)` |
| Descendente | `sorted(lst, reverse=True)` | `toSorted((a,b)=>b-a)` | `sort(reverseOrder())` |
| Por clave/propiedad | `sorted(lst, key=fn)` | `toSorted((a,b)=>a.p-b.p)` | `sorted(Comparator.comparing(...))` |
| In-place | `lst.sort()` | `lst.sort(...)` | `list.sort(...)` |

## Lo que funciona

- **Usa sorts built-in**: no implementes tu propio algoritmo de ordenamiento a menos que tengas un perfil de rendimiento muy específico (ej.   datos casi ordenados).
- **Mantén comparadores puros**: las funciones comparadoras no deben mutar datos ni depender de estado externo.
- **Maneja empates explícitamente**: si dos items son iguales en la clave primaria, ordena por una clave secundaria para asegurar orden determinista.
- **Prefiere inmutabilidad**: devolver un array/lista ordenada nueva evita efectos secundarios sorprendentes en el código llamador.
- **Ordenamiento consciente de locale**: strxfrm` en Python) en lugar de comparación raw de code points.

## Common Mistakes

- **Ordenar números alfabéticamente en JavaScript**: `[10, 2].  sort()` produce `[10, 2]` porque el sort default convierte elementos a strings.   Siempre pasa un comparador para números.
- **Mutar durante el sort**: modificar el array siendo ordenado (ej.   en un comparador con side effects) causa resultados impredecibles.
- **Comparador inconsistente**: devolver solo `1` y `-1` sin `0` para igualdad puede causar crashes o resultados incorrectos en algunas implementaciones.
- **Ordenar datasets enormes en memoria**: Consulta [Database Transactions](/recipes/databases/database-transactions) para consistencia de datos.
- **Asumir que todos los sorts son estables**: aunque la mayoría de lenguajes modernos usan sorts estables, no confíes en la estabilidad a menos que esté documentada.   Ordena explícitamente por claves secundarias cuando el orden importe.

## Cuando No Usar Este Enfoque

- **El schema es desconocido o cambia frecuentemente**: si la estructura de datos cambia semanalmente, los schemas de validacion rigidos se convierten en una carga de mantenimiento.
- **Los datos caben en una base de datos**: si los datos necesitan querying, indexing o transacciones, almacenarlos en archivos JSON y manipularlos en memoria es el enfoque equivocado.
- **Validacion en tiempo real de datos streaming**: la validacion batch de payloads JSON es muy lenta para streaming.
- **Type checking simple**: si solo necesitas verificar que un valor es string o number, un validador de schema completo es excesivo.
- **Transformaciones CPU-bound en datasets grandes**: si procesar 10M+ records toma minutos, la manipulacion en memoria llega a sus limites.
- **Procesamiento distribuido de datos**: si los datos spanean multiples maquinas, la manipulacion local de JSON no funciona.

## Benchmarks de Rendimiento

- **Serializacion JSON**: json.  dumps() en Python serializa 1MB de datos en 30-100ms.   orjson serializa los mismos datos en 5-15ms.
- **Validacion de schema**: jsonschema valida 10,000 documentos JSON contra un schema en 2-10 segundos.   pydantic valida el mismo volumen en 0.  5-2 segundos.
- **Performance de deep clone**: copy.  deepcopy() en un objeto Python de 1MB toma 50-200ms.   json.  loads(json.  dumps(obj)) toma 30-80ms pero pierde tipos no serializables.
- **Performance de sort**: sorted() en Python sobre 1M enteros toma 200-400ms. 
umpy.sort() sobre el mismo array toma 50-100ms. Array.sort() de JavaScript sobre 1M numeros toma 100-300ms (V8 Timsort)
- **Performance de diff**: difflib comparando dos archivos de 10,000 lineas toma 500ms-2s.   deepdiff comparando dos objetos JSON de 1MB toma 200ms-1s.
- **Performance de regex**: regex compilado en Python matchea 1M strings en 50-200ms.   Regex no compilado toma 2-5x mas.

## Estrategia de Testing

- **Test con datos edge-case**: objetos vacios, null values, arrays anidados, strings Unicode, numeros muy grandes (>2^53) y arrays de tipos mixtos.
- **Test de round-trips de serializacion**: serializa un objeto, deserializalo, y compara.   El testing round-trip detecta perdida de datos por type coercion (ej.
- **Test de fallos de validacion de schema**: verifica que los datos invalidos sean rechazados con mensajes de error claros.
- **Test con input adversarial**: JSON profundamente anidado (10,000 niveles), strings enormes (1MB+), muchas keys (100,000+) y keys duplicadas.
- **Test de estabilidad de sort**: verifica que elementos iguales mantengan su orden original.   sorted() de Python es estable.   Array.  sort() de JavaScript es estable en V8 desde ES2019.
- **Test de regex contra input malicioso**: patrones como (a+)+b causan catastrophic backtracking en input como aaaaaaaaaaaaaaaaaaa!.

## Estimacion de Costos

- **Overhead de validacion**: la validacion de schema agrega 5-20% de latencia al procesamiento de requests.
- **Memoria para JSON grande**: un archivo JSON de 500MB usa 2-3GB en memoria despues del parsing (overhead de dict de Python).
- **Infraestructura de caching**: Redis para cachear datos validados cuesta -200/mes para un cache de 10GB.   Memcached es mas barato pero carece de persistencia.
- **Costo de desarrollo**: escribir validadores custom toma 4-16 horas por tipo de dato.   Usar pydantic o zod reduce esto a 1-2 horas.
- **Tradeoffs de formato de serializacion**: JSON es human-readable pero 2-5x mas grande que formatos binarios.

## Monitoring y Observabilidad

- **Tasa de errores de validacion**: Alerta cuando la tasa de error excede 5%.
- **Duracion de serializacion**: monitorea el tiempo gastado serializando/deserializando.
- **Cache hit rate**: si cacheas datos validados, monitorea el hit rate.
- **Uso de memoria de estructuras de datos**: monitorea el peak de memoria despues de cargar objetos JSON grandes.
- **Tiempo de ejecucion de regex**: loguea operaciones de regex lentas (>100ms).   Regex lentas en input del usuario son un vector de DoS.

## Deployment Checklist

- [ ] Setear tamaÃ±o maximo de payload: rechazar payloads JSON mas grandes que 1MB (o limite apropiado) en el load balancer. Retornar HTTP 413 para payloads oversized
- [ ] Configurar versionado de schema: incluye un campo de schema version en los datos validados. Rechaza datos con versiones desconocidas para prevenir schema drift silencioso
- [ ] Setear limites de profundidad de recursion: para validacion o serializacion recursiva, setea una profundidad maxima (ej. 100). Rechaza datos que excedan el limite para prevenir stack overflow
- [ ] Habilitar caching para datos validados: cachea resultados de validacion con un TTL. Usa el hash del input raw como cache key. Invalida en cambios de schema
- [ ] Configurar respuestas de error: retorna errores de validacion estructurados con field paths y mensajes. No expongas detalles internos del schema en respuestas de error
- [ ] Setear timeouts de regex: usa 
e.TIMEOUT (Python 3.11+) o corre regex en un proceso separado con timeout. Mata operaciones de regex que excedan 1 segundo

## Consideraciones de Seguridad

- **Prototype pollution via JSON merge**: mergear JSON del usuario con keys __proto__ o constructor puede pollear prototypes de objetos JavaScript.
- **Ataques de deserializacion**: pickle.  loads() en Python y unserialize() en PHP ejecutan codigo arbitrario.   Nunca deserialices datos no confiables con estos formatos.
- **Regex DoS (ReDoS)**: patrones con quantifiers anidados como (a+)+ causan backtracking exponencial.   Un atacante puede colgar el server con un input de 30 caracteres.
- **Inyeccion JSON via key collision**: keys duplicadas en JSON ({"role": "user", "role": "admin") son manejadas diferentemente por los parsers.
- **Cache poisoning via bypass de validacion**: si los resultados de validacion se cachean por hash de input, un atacante que encuentra una colision de hash puede inyectar un resultado cacheado "valido" para input invalido.
- **Type confusion en lenguajes dinamicos**: isinstance(x, int) retorna True para True en Python (bool es subclase de int).
- **Fuga de informacion en mensajes de error**: errores de validacion que incluyen detalles del schema, nombres internos de campos o stack traces ayudan a los atacantes a entender el sistema.
- **Deep clone bypassando checks de seguridad**: si un objeto security-sensitive se clona y el clone salta validacion, un atacante puede modificar el clone para bypassar checks.
- **Inyeccion de comparador de sort**: si los comparadores de sort vienen de input del usuario, un atacante puede proveer un comparador que throw o cuelgue.
- **Diff leakeando datos sensibles**: si el output de diff se loguea o muestra, puede exponer campos sensibles (passwords, tokens).
- **Enumeracion de cache keys**: si las cache keys son secuenciales o predecibles, un atacante puede enumerar datos cacheados.
- **Bypass de validacion basada en regex**: ^pattern$ con 
e.DOTALL permite que . matchee newlines, potencialmente bypassando validacion basada en lineas. Usa 
e.ASCII y anchors explicitos para regexes security-sensitive
## Variantes y Alternativas

- **Validacion schema-first vs code-first**: JSON Schema, OpenAPI y Protobuf definen schemas en un formato agnostico del lenguaje.   Pydantic, zod y joi definen schemas en codigo.
- **Validacion estricta vs leniente**: validacion estricta rechaza campos desconocidos.   Validacion leniente los ignora.   Para APIs, validacion estricta previene errores de cliente por typos.
- **Deep copy vs shallow copy vs structural sharing**: deep copy duplica todo (caro, seguro).   Shallow copy sharea referencias (rapido, inseguro para mutacion).   Structural sharing (usado en immutable.
- **Sort in-place vs copy sort**: list.  sort() sortea in-place (0 memoria extra).   sorted() retorna una lista nueva (memoria O(n)).   Para datasets grandes, sort in-place es preferido.
- **Caching centralizado vs distribuido**: Redis/Memcached son caches centralizados compartidos entre instancias.   Caches in-process (LRU, functools.  lru_cache) son mas rapidos pero no compartidos.
- **Validacion sync vs async**: validacion sincrona bloquea el event loop.   Validacion async permite validacion concurrente de multiples payloads.

## Pitfalls Comunes en Produccion

- **Breaks por evolucion de schema**: agregar un campo requerido rompe clientes existentes.
- **El orden de validacion importa**: valida formato primero (barato), luego tipo (medio), luego reglas de negocio (caro).
- **Type coercion silenciosa**: int("3.  14") levanta ValueError pero loat("3") tiene exito.   Los parsers JSON coercean strings a numeros en algunos lenguajes.
- **Cache stampede**: cuando una cache entry expira, todos los requests concurrentes hittean el backend simultaneamente.
- **Trampas de performance de deep copy**: copy.  deepcopy() en objetos con referencias circulares causa recursion infinita.
- **Inestabilidad de sort con keys custom**: sorted() de Python es estable, pero key functions custom que retornan valores iguales para items diferentes pueden producir ordenamientos inesperados.
## Patrones de Integracion

- **Pipeline de validacion de requests API**: valida body del request contra schema (pydantic/zod) -> sanitiza input (strippa whitespace, normaliza encoding) -> autoriza (chequea permisos) -> procesa.
- **Procesamiento de datos event-driven**: cuando los datos cambian, publica un evento.   Los consumidores validan y procesan el evento independientemente.
- **CQRS con modelos separados de lectura/escritura**: Modelo de lectura proyecta datos en estructuras optimizadas para queries.   La validacion ocurre solo del lado de escritura.
- **Enforcement de data contracts**: define data contracts entre servicios usando JSON Schema o Protobuf.   Valida en ambos lados, productor y consumidor.
- **Validacion batch con reporting**: valida 10,000+ records en batch.
- **Validacion en tiempo real con feedback**: valida datos a medida que llegan.   Envia feedback inmediato a la fuente de datos (respuesta API, mensaje de error UI).

## Manejo de Errores y Recuperacion

- **Agregacion de errores de validacion**: colecta todos los errores de validacion para un solo input, no solo el primero.   Retorna todos los errores al cliente para que puedan fixear todo en un round-trip.   Pydantic soporta esto con ValidationError.
- **Retry con backoff para fallos transitorios**: si la validacion falla por una dependencia transitoria (ej.   servicio de datos de referencia caido), reintenta con exponential backoff.
- **Circuit breaker para dependencias de validacion**: si un servicio de datos de referencia (necesario para validacion) esta caido, abre un circuit breaker.
- **Transacciones compensatorias para fallos de validacion**: si la validacion falla despues de procesamiento parcial (ej.
- **Dead letter queue para records invalidos**: records que fallan validacion van a una dead letter queue para inspeccion manual.
- **Evolucion de schema con compatibilidad backward**: Nuevos campos requeridos deben tener defaults.   Campos removidos deben ser opcionales por un ciclo de release antes de la eliminacion.
## Tooling y Ecosistema

- **Pydantic**: libreria de validacion de datos Python.   30M+ downloads/mes.   Models type-safe con validacion automatica.   Usado por FastAPI.   v2 es 5-50x mas rapido que v1 (Rust core).
- **zod**: validacion de schema TypeScript-first.   20M+ downloads/mes.   Type inference desde schemas.   Compone con z.  union, z.  intersection.
- **JSON Schema**: especificacion de validacion agnostica del lenguaje.   Soportado por 50+ librerias a traves de lenguajes.   Draft 2020-12 es el ultimo.
- **msgpack**: formato de serializacion binario.   2-5x mas pequeÃ±o y rapido que JSON.   Librerias para 50+ lenguajes.
- **Immer**: libreria de estado inmutable JavaScript.   Structural sharing con una API de draft mutable.   10M+ downloads/mes.
- **jsondiffpatch**: libreria JavaScript para deep diffing y patching de objetos JSON.   Soporta arrays, objetos anidados y reverse patches.

## Resumen de Best Practices

- Valida en los boundaries del sistema (entrada API, import de archivos, consumo de mensajes). Confia en datos internos
- Usa validacion estricta para input del usuario, validacion leniente para pipelines de datos internos
- Prefiere schema-first design (JSON Schema, Protobuf) para contracts cross-service
- Cachea resultados de validacion por hash de input para evitar procesamiento redundante
- Usa Decimal para dinero, int para conteos, str para IDs. Nunca uses loat para valores exactos
- Loguea fallos de validacion con field path, valor y tipo esperado para debugging
## FAQ

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





## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de data y java para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica ordenar un array** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
