---
contentType: recipes
slug: diff-json-objects
title: "Comparar Objetos JSON"
description: "Cómo comparar dos objetos JSON y encontrar diferencias en Python, Java y JavaScript."
metaDescription: "Aprende a comparar objetos JSON en Python, Java y JavaScript. Encuentra claves agregadas, eliminadas y modificadas con ejemplos prácticos de código."
difficulty: beginner
topics:
  - data
tags:
  - json
  - diff
  - comparison
  - merge
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/merge-json-files
  - /recipes/data/convert-csv-to-json
  - /recipes/data/convert-json-to-csv
  - /recipes/data/serialize-deserialize-data
  - /recipes/data/validate-json-schema
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a comparar objetos JSON en Python, Java y JavaScript. Encuentra claves agregadas, eliminadas y modificadas con ejemplos prácticos de código."
  keywords:
    - json
    - diff
    - comparison
    - merge
    - python
    - javascript
    - java
---
## Visión General

Comparar objetos JSON es esencial para testing, detección de configuration drift, validación de respuestas de API y auditorías de migraciones de base de datos. Un diff apropiado revela claves agregadas, claves eliminadas, cambios de tipo y mutaciones de valores en niveles de anidamiento arbitrarios. Esta recipe cubre diffing profundo de JSON con salida estructurada en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Valides que una respuesta de API REST coincida con un snapshot de schema esperado
- Detectes configuration drift entre archivos de ambiente
- Audites migraciones de base de datos comparando exports de filas before/after
- Escribas snapshot tests para objetos de dominio serializados a JSON

## Solución

### Python

```python
# deepdiff compara objetos Python arbitrarios recursivamente
# pip install deepdiff
from deepdiff import DeepDiff

old = {"user": {"name": "Alice", "age": 30}, "roles": ["admin"]}
new = {"user": {"name": "Alice", "age": 31}, "roles": ["admin", "editor"]}

diff = DeepDiff(old, new)
print(diff)
# {'values_changed': {...}, 'iterable_item_added': {...}}
```

```python
# Alternativa de librería estándar con comparación de json.dumps
import json

old_json = json.dumps(old, sort_keys=True)
new_json = json.dumps(new, sort_keys=True)
print(old_json == new_json)
```

### JavaScript

```javascript
// fast-json-patch genera patches RFC 6902
// npm install fast-json-patch
import * as jsonpatch from 'fast-json-patch';

const oldDoc = { user: { name: 'Alice', age: 30 }, roles: ['admin'] };
const newDoc = { user: { name: 'Alice', age: 31 }, roles: ['admin', 'editor'] };

const patch = jsonpatch.compare(oldDoc, newDoc);
console.log(patch);
// [{ op: 'replace', path: '/user/age', value: 31 }, ...]
```

```javascript
// deep-object-diff para reportes simples de added/changed/deleted
// npm install deep-object-diff
import { detailedDiff } from 'deep-object-diff';

console.log(detailedDiff(oldDoc, newDoc));
// { added: {}, deleted: {}, updated: { user: { age: 31 }, roles: [...] } }
```

### Java

```java
// zjsonpatch genera JSON Patch RFC 6902
// Maven: com.flipkart.zjsonpatch:zjsonpatch
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flipkart.zjsonpatch.JsonDiff;

public class JsonDiffExample {
    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode oldNode = mapper.readTree("{\"user\":{\"name\":\"Alice\",\"age\":30}}");
        JsonNode newNode = mapper.readTree("{\"user\":{\"name\":\"Alice\",\"age\":31}}");
        JsonNode patch = JsonDiff.asJson(oldNode, newNode);
        System.out.println(patch.toPrettyString());
    }
}
```

```java
// Jackson readTree + visitor custom para comparación profunda
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

public class CustomDiff {
    public static Map<String, Object> diff(JsonNode a, JsonNode b, String path) {
        Map<String, Object> changes = new LinkedHashMap<>();
        if (!a.equals(b)) {
            changes.put(path, Map.of("old", a, "new", b));
        }
        return changes;
    }
}
```

## Explicación

El diffing de JSON es fundamentalmente traversing de árboles. Dos árboles JSON se comparan nodo por nodo: las claves de objeto se revisan por presencia en ambos lados, los elementos de array se comparan por índice (o por valor si el orden es irrelevante), y los valores escalares se testean por igualdad. El formato de salida depende de la librería: `DeepDiff` (Python) produce un reporte categorizado de cambios; `fast-json-patch` (JS) y `zjsonpatch` (Java) emiten patches RFC 6902 que pueden reproducirse con `applyPatch`.

Para detección de configuration drift, un diff estructural es suficiente. Para snapshot testing, se necesita un diff profundo completo con tracking de rutas. Para operaciones de sync de API, los patches RFC 6902 son ideales porque son compactos y reversibles.

## Variantes

| Tecnología | Librería | Enfoque | Notas |
|------------|----------|---------|-------|
| Python | `deepdiff` | `DeepDiff(old, new)` | Cambios categorizados, ignora orden, altamente configurable |
| Python | `json` (stdlib) | `json.dumps(sort_keys=True)` | Chequeo rápido de igualdad, sin reporte de rutas |
| JavaScript | `fast-json-patch` | `compare(old, new)` | Patches RFC 6902, reversibles, compactos |
| JavaScript | `deep-object-diff` | `detailedDiff(old, new)` | Split simple de added/updated/deleted |
| Java | `zjsonpatch` | `JsonDiff.asJson(old, new)` | RFC 6902 vía Jackson, probado en batalla |
| Java | `Jackson` | Visitor recursivo custom | Control total sobre la lógica de comparación |

## Lo que funciona

- **Normaliza antes de comparar**: Ordena claves de objeto y arrays si el orden es irrelevante; usa `ignore_order=True` en DeepDiff
- **Usa patches RFC 6902 para operaciones de API**: Son estándar, compactos y pueden aplicarse/revertirse
- **Excluye campos volátiles**: Timestamps, IDs aleatorios y request counts deben excluirse de la comparación
- **Compara a la granularidad correcta**: Los diffs profundos en JSONs de 10MB son lentos; compara subtrees o hashes para objetos grandes
- **Almacena snapshots golden en control de versiones**: Los snapshot tests necesitan archivos baseline commiteados junto al código

## Errores Comunes

- **Comparar floats directamente**: Diferencias de serialización de punto flotante (`1.0` vs `1.00`) disparan falsos positivos; redondea antes de comparar
- **Ignorar orden de arrays**: `[1, 2]` y `[2, 1]` son JSONs diferentes; decide si el orden importa para tu caso de uso
- **Hacer diff de JSON stringificado**: El orden de claves de `JSON.stringify` depende de inserción; siempre ordena claves o usa formas canónicas
- **No manejar null vs ausente**: `{"a": null}` y `{}` son semánticamente diferentes; asegúrate de que tu librería de diff los distinga
- **Almacenar diffs enormes en logs**: Un diff estructural completo de un archivo de config de 5MB produce logs ilegibles; resume o hashea en su lugar

## Preguntas Frecuentes

### ¿Cómo ignoro campos específicos al comparar JSON?

Usa reglas de exclusión. `DeepDiff` soporta `exclude_paths` y `exclude_regex_paths`. `fast-json-patch` no filtra nativamente; pre-procesa los objetos eliminando claves ignoradas antes de comparar. En Java, recorre el árbol de Jackson y poda rutas excluidas antes de llamar `JsonDiff`.

### ¿Puedo comparar archivos JSON ignorando el orden de arrays?

Sí. `DeepDiff` tiene `ignore_order=True`. Para JS, convierte arrays a sets u ordénalos antes de comparar si el orden es irrelevante. En Java, ordena elementos de `ArrayNode` con un comparador custom antes de comparar, o usa una librería que soporte comparación desordenada.

### ¿Cómo genero un reporte de diff legible para humanos?

Convierte el diff machine-readable en oraciones. El método `pretty()` de `DeepDiff` produce salida legible. Para patches RFC 6902, mapea códigos de operación a verbos: `replace` → "cambiado", `add` → "agregado", `remove` → "eliminado". En Java, itera sobre el array de patch `JsonNode` y formatea cada operación con su ruta y valores.
