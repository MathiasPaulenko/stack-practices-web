---
contentType: recipes
slug: merge-json-files-javascript
title: "Merge de Archivos JSON en JavaScript"
description: "Cómo combinar múltiples archivos JSON con estrategias de resolución de conflictos usando Node.js."
metaDescription: "Merge de archivos JSON en JavaScript con resolución de conflictos. Aprende deep merge, shallow merge y estrategias custom con Node.js."
difficulty: intermediate
topics:
  - data
tags:
  - json
  - javascript
  - nodejs
  - data-processing
  - merge
relatedResources:
  - /recipes/merge-json-files
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/diff-json-objects
  - /recipes/parse-csv-files
lastUpdated: "2026-07-01"
publishedAt: "2026-07-01"
author: Mathias Paulenko
seo:
  metaDescription: "Merge de archivos JSON en JavaScript con resolución de conflictos. Aprende deep merge, shallow merge y estrategias custom con Node.js."
  keywords:
    - merge json javascript
    - deep merge nodejs
    - combinar archivos json
    - object.assign javascript
    - lodash merge

---
## Visión General

Hacer merge de archivos JSON es una tarea común al combinar configuración, agregar respuestas de APIs o construir pipelines de datos. JavaScript ofrece varios enfoques, desde un simple spread operator hasta librerías de deep merge recursivo. Esta recipe cubre las estrategias principales y cuándo usar cada una.

## Cuándo Usar


- For alternatives, see [Merge JSON Files](/es/recipes/merge-json-files/).

- Necesitas combinar múltiples archivos de configuración JSON en uno
- Estás agregando respuestas paginadas de una API en un solo payload
- Necesitas mezclar settings de usuario con defaults sin perder keys anidadas
- Estás construyendo un pipeline de datos que une JSON de distintas fuentes

## Solución

### Shallow merge con spread operator

```javascript
const fileA = require("./config-a.json");
const fileB = require("./config-b.json");

const merged = { ...fileA, ...fileB };
// Los valores de fileB sobrescriben fileA solo en el nivel superior
```

### Leer y combinar múltiples archivos con fs

```javascript
const fs = require("fs");
const path = require("path");

function mergeJsonFiles(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const result = {};

  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
    Object.assign(result, content);
  }

  return result;
}

const merged = mergeJsonFiles("./configs");
```

### Deep merge con función recursiva

```javascript
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === "object" &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const defaults = { api: { timeout: 5000, retries: 3 }, log: { level: "info" } };
const user = { api: { timeout: 10000 }, log: { format: "json" } };

const merged = deepMerge({}, defaults);
deepMerge(merged, user);
// Resultado: { api: { timeout: 10000, retries: 3 }, log: { level: "info", format: "json" } }
```

### Usar lodash para deep merge

```javascript
const _ = require("lodash");

const defaults = { api: { timeout: 5000, retries: 3 } };
const user = { api: { timeout: 10000 } };

const merged = _.merge({}, defaults, user);
// lodash combina objetos anidados sin sobrescribir keys hermanas
```

### Resolución custom de conflictos

```javascript
function mergeWithConflictResolution(sources, resolver) {
  const result = {};

  for (const source of sources) {
    for (const key of Object.keys(source)) {
      if (key in result && !deepEqual(result[key], source[key])) {
        result[key] = resolver(key, result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}

// Ejemplo: último valor gana, pero loguear el conflicto
const merged = mergeWithConflictResolution(
  [fileA, fileB, fileC],
  (key, oldVal, newVal) => {
    console.warn(`Conflicto en "${key}": usando nuevo valor`);
    return newVal;
  }
);
```

## Explicación

Shallow merge (`{ ...a, ...b }`) solo combina keys de nivel superior. Si ambos objetos tienen un objeto anidado en la misma key, el segundo reemplaza al primero por completo. Esto está bien para configs planas.

Deep merge recorre recursivamente objetos anidados, combinando keys en cada nivel. Esto es lo que quieres cuando mezclas configs con secciones anidadas (settings de base de datos, opciones de API, etc.).

Los arrays son complicados. La mayoría de las implementaciones de deep merge reemplazan arrays en vez de concatenarlos. Si necesitas concatenación, usa un resolver custom o lodash con `mergeWith` y un customizer.

## Variantes

| Enfoque | Maneja Anidación | Maneja Arrays | Dependencia |
|----------|------------------|---------------|-------------|
| Spread operator | No (solo nivel superior) | Sobrescribe | Ninguna |
| Object.assign | No (solo nivel superior) | Sobrescribe | Ninguna |
| Custom deepMerge | Sí | Sobrescribe | Ninguna |
| lodash _.merge | Sí | Sobrescribe | lodash |
| lodash mergeWith | Sí | Personalizable | lodash |

## Pautas

- Usa shallow merge para configs planas. Es más simple y rápido.
- Usa deep merge cuando las configs tienen secciones anidadas que deben combinarse, no reemplazarse.
- Decide el comportamiento de arrays explícitamente. Deep merge por defecto reemplaza arrays; puede que quieras concatenación.
- Valida el output mergeado con un schema (AJV, Joi) antes de usarlo en producción.
- Loguea conflictos al hacer merge desde múltiples fuentes no confiables.

## Errores Comunes

- Usar spread operator para configs anidadas y perder keys silenciosamente. `{ ...a, ...b }` reemplaza `a.nested` completamente con `b.nested`.
- Mutar objetos fuente. Siempre empieza con un objeto limpio: `deepMerge({}, source1, source2)`.
- Asumir que los arrays se mergean por concatenación. No es así. La mayoría de implementaciones sobrescriben.
- No manejar valores `null`. `null` es un objeto en `typeof`, así que deep merge puede recurse dentro de él.
- Olvidar que `JSON.parse` puede lanzar errores. Envuelve lecturas de archivo en try/catch.

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



## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de json y javascript para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica merge de archivos json en javascript** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

### ¿Cómo hago merge de arrays en vez de reemplazarlos?

Usa lodash `mergeWith` con un customizer que concatene arrays:

```javascript
const merged = _.mergeWith({}, a, b, (objVal, srcVal) => {
  if (Array.isArray(objVal) && Array.isArray(srcVal)) {
    return objVal.concat(srcVal);
  }
});
```

### ¿Cuál es la diferencia entre Object.assign y spread?

Son equivalentes para objetos planos. `{ ...a, ...b }` es syntactic sugar para `Object.assign({}, a, b)`. Ambos hacen shallow merge.

### ¿Cómo hago merge de archivos JSON asíncronamente?

Usa `fs.promises.readFile` y `Promise.all`:

```javascript
const files = ["a.json", "b.json"];
const contents = await Promise.all(
  files.map((f) => fs.promises.readFile(f, "utf-8").then(JSON.parse))
);
const merged = contents.reduce((acc, obj) => deepMerge(acc, obj), {});
```

### ¿Debería usar una librería o escribir mi propio deep merge?

Escribe el tuyo solo si la lógica es simple y quieres cero dependencias. Para código de producción, lodash `_.merge` está bien probado y maneja edge cases como `null`, arrays y referencias circulares.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
