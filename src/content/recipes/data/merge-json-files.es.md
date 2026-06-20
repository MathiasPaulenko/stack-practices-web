---
contentType: recipes
slug: merge-json-files
title: "Fusionar Archivos JSON"
description: "Cómo fusionar múltiples archivos JSON en un solo objeto o array en Python, Java y JavaScript."
metaDescription: "Aprende a fusionar archivos JSON en Python, Java y JavaScript. Combina configs, datasets y respuestas de API con ejemplos prácticos de código."
difficulty: beginner
topics:
  - data
tags:
  - json
  - merge
  - combine
  - python
  - javascript
  - java
  - data-processing
relatedResources:
  - /recipes/data/convert-csv-to-json
  - /recipes/data/convert-json-to-csv
  - /recipes/data/parse-csv-files
  - /recipes/data/parse-xml-files
  - /recipes/data/serialize-deserialize-data
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a fusionar archivos JSON en Python, Java y JavaScript. Combina configs, datasets y respuestas de API con ejemplos prácticos de código."
  keywords:
    - json
    - merge
    - combine
    - python
    - javascript
    - java
    - data-processing
---
## Visión General

Las aplicaciones modernas a menudo dividen archivos de configuración, localización y datasets en múltiples archivos JSON por modularidad. Fusionarlos en un solo objeto o array JSON es un paso de build común, warmup de caché y tarea de agregación de APIs. Esta recipe cubre deep merge de objetos, concatenación de arrays y manejo de conflictos de claves en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Agregues respuestas de microservicios en un solo payload de API
- Combines archivos de config específicos de ambiente (base + override)
- Fusiones shards de dataset divididos para procesamiento batch
- Construyas archivos de traducción unificados a partir de JSONs de locale modulares

## Solución

### Python

```python
# json + pathlib para fusionar arrays de objetos
import json
from pathlib import Path

files = Path('data/').glob('*.json')
merged = []
for f in files:
    with open(f, encoding='utf-8') as fh:
        data = json.load(fh)
        if isinstance(data, list):
            merged.extend(data)
        else:
            merged.append(data)

with open('merged.json', 'w', encoding='utf-8') as out:
    json.dump(merged, out, indent=2)
```

```python
# deep merge de dicts con helper recursivo
import json

def deep_merge(base, override):
    for key, value in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base

with open('base.json') as b, open('override.json') as o:
    result = deep_merge(json.load(b), json.load(o))
print(json.dumps(result, indent=2))
```

### JavaScript

```javascript
// Node.js: fusionar archivos JSON en un solo array
import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('data').filter(f => f.endsWith('.json'));
const merged = files.flatMap(f => {
  const data = JSON.parse(fs.readFileSync(path.join('data', f), 'utf-8'));
  return Array.isArray(data) ? data : [data];
});

fs.writeFileSync('merged.json', JSON.stringify(merged, null, 2));
```

```javascript
// deep merge de objetos con spread + recursión
import fs from 'fs';

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (typeof override[key] === 'object' && !Array.isArray(override[key]) && result[key]) {
      result[key] = deepMerge(result[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

const base = JSON.parse(fs.readFileSync('base.json', 'utf-8'));
const override = JSON.parse(fs.readFileSync('override.json', 'utf-8'));
console.log(JSON.stringify(deepMerge(base, override), null, 2));
```

### Java

```java
// Jackson para fusionar nodos JSON
// Maven: com.fasterxml.jackson.core:jackson-databind
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class JsonMerge {
    private static final ObjectMapper mapper = new ObjectMapper();

    public static JsonNode merge(JsonNode base, JsonNode override) {
        if (base.isArray() && override.isArray()) {
            ArrayNode merged = mapper.createArrayNode();
            merged.addAll((ArrayNode) base);
            merged.addAll((ArrayNode) override);
            return merged;
        } else if (base.isObject() && override.isObject()) {
            ObjectNode merged = ((ObjectNode) base).deepCopy();
            override.fields().forEachRemaining(e -> {
                JsonNode existing = merged.get(e.getKey());
                if (existing != null && existing.isObject() && e.getValue().isObject()) {
                    merged.set(e.getKey(), merge(existing, e.getValue()));
                } else {
                    merged.set(e.getKey(), e.getValue());
                }
            });
            return merged;
        }
        return override;
    }

    public static void main(String[] args) throws Exception {
        JsonNode base = mapper.readTree(new File("base.json"));
        JsonNode override = mapper.readTree(new File("override.json"));
        System.out.println(merge(base, override).toPrettyString());
    }
}
```

## Explicación

Fusionar archivos JSON no es una sola operación; depende de la estructura de los archivos. La concatenación de arrays (`extend`, `flatMap`, `ArrayNode.addAll`) es directa pero puede producir duplicados si los archivos se solapan. El deep merge de objetos combina claves anidadas recursivamente, dando precedencia a archivos override. Los merges superficiales (`{ ...a, ...b }`) reemplazan objetos anidados enteros, lo cual usualmente no es deseado para archivos de config.

Los conflictos de claves deben manejarse explícitamente: last-write-wins, merge de arrays dentro de objetos, o lanzar un error. La librería estándar de Python no tiene deep merge integrado; `Object.assign` y spread syntax de JavaScript son superficiales. Jackson (Java) provee métodos de mutación de `ObjectNode` y `deepCopy` para fusiones seguras sin side effects.

## Variantes

| Tecnología | Librería | Enfoque | Notas |
|------------|----------|---------|-------|
| Python | `json` (stdlib) | `json.load` + `deep_merge` | Sin dependencias; requiere recursión custom |
| Python | `deepmerge` | `StrategyType.TYPESAFE` | Librería dedicada con estrategias de conflicto |
| JavaScript | nativo | `flatMap` + `deepMerge` | Cero deps; cuidado con referencias circulares |
| JavaScript | `lodash` | `_.merge(base, override)` | Probado en batalla, maneja arrays y objetos |
| Java | `Jackson` | Mutación de `ObjectNode` | Compatible con streaming, árbol de nodos type-safe |
| Java | `json-java` (org.json) | Deep merge de `JSONObject` | Ligero, recursión manual requerida |

## Mejores Prácticas

- **Usa deep merge para configuración**: Los merges superficiales descartan silenciosamente claves anidadas del archivo base
- **Deduplica arrays después de concatenar**: Fusionar datasets puede producir entradas duplicadas; deduplica por una clave estable
- **Versiona la salida fusionada en CI**: Commitea configs fusionadas a control de versiones para que los cambios sean auditables
- **Valida JSON fusionado contra un schema**: Usa JSON Schema para asegurar que la salida fusionada sigue siendo válida
- **Preserva archivos originales**: Nunca sobrescribas JSONs fuente; escribe la salida fusionada en un directorio separado

## Errores Comunes

- **Hacer merge superficial de configs anidados**: Resulta en valores default perdidos cuando un archivo override provee solo claves de nivel superior
- **No manejar elementos duplicados en arrays**: Fusionar dos datasets con registros superpuestos crea duplicados
- **Mutar objetos fuente durante el merge**: Las mutaciones in-place dificultan debugging y rollback; siempre copia primero
- **Asumir que todos los archivos tienen la misma estructura**: Un archivo puede ser array y otro objeto; normaliza antes de fusionar
- **Ignorar referencias circulares**: Algoritmos de deep merge en JSON con referencias circulares causarán stack overflow; sanitiza inputs primero

## Preguntas Frecuentes

### ¿Cómo fusiono archivos JSON con schemas diferentes?

Normaliza a una estructura común primero. Usa un schema registry o paso de transformación (ej. `jq`, transformaciones de `jsonschema`) para alinear claves y tipos antes de fusionar. En Python, `pandas.json_normalize` puede aplanar JSONs heterogéneos a un formato tabular común.

### ¿Puedo fusionar archivos JSON sin cargarlos enteros en memoria?

Sí, para concatenación de arrays. Usa parsers JSON streaming como `ijson` (Python), `JSONStream` (JS) o `JsonParser` de Jackson (Java) para leer y emitir elementos incrementalmente. Para deep merge de objetos, debes mantener el objeto fusionado en memoria porque JSON no es un formato amigable a streaming para acceso aleatorio de claves.

### ¿Cómo manejo conflictos de merge cuando la misma clave tiene valores diferentes?

Define una estrategia de resolución de conflictos: last-write-wins (más simple), array-of-values (preserva ambos), o lanzar un error (modo estricto). En Python, `deepmerge` soporta configuraciones de `STRATEGY_TYPE`. En JavaScript, escribe una función `deepMerge` custom con un resolver que se ramifique en colisión de claves.
