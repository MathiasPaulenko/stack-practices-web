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
author: "StackPractices"
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
