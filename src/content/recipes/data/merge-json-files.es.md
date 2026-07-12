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
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/parse-csv-files
  - /recipes/parse-xml-files
  - /recipes/serialize-deserialize-data
  - /recipes/merge-json-files-javascript
  - /recipes/diff-json-objects
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


- For alternatives, see [Convert CSV to JSON](/es/recipes/convert-csv-to-json/).

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

### Python con librería `deepmerge`

```python
from deepmerge import always_merger
import json

with open('base.json') as b, open('override.json') as o:
    base = json.load(b)
    override = json.load(o)

result = always_merger.merge(base, override)
print(json.dumps(result, indent=2))
```

```python
from deepmerge import conservative_merger
import json

# conservative_merger lanza error en conflicto en lugar de sobrescribir
with open('base.json') as b, open('override.json') as o:
    base = json.load(b)
    override = json.load(o)

try:
    result = conservative_merger.merge(base, override)
except ValueError as e:
    print(f"Conflicto: {e}")
```

### JavaScript con Lodash

```javascript
const _ = require('lodash');
const fs = require('fs');

const base = JSON.parse(fs.readFileSync('base.json', 'utf-8'));
const override = JSON.parse(fs.readFileSync('override.json', 'utf-8'));

// _.merge hace deep merge, muta el target
const result = _.merge({}, base, override);

// _.mergeWith para manejo custom de arrays
const result2 = _.mergeWith({}, base, override, (objValue, srcValue) => {
  if (Array.isArray(objValue)) {
    return objValue.concat(srcValue); // concatena arrays en lugar de reemplazar
  }
});

console.log(JSON.stringify(result, null, 2));
```

### Fusionar Múltiples Archivos con Patrón Glob

```python
import json
import glob

def merge_json_glob(pattern: str, output: str) -> None:
    merged = {}
    for filepath in sorted(glob.glob(pattern)):
        with open(filepath, encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, dict):
                merged.update(data)
            elif isinstance(data, list):
                merged.setdefault('items', []).extend(data)

    with open(output, 'w', encoding='utf-8') as out:
        json.dump(merged, out, indent=2, ensure_ascii=False)

merge_json_glob('config/*.json', 'config/merged.json')
```

```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

function mergeJsonGlob(pattern, output) {
  const merged = {};
  const files = glob.sync(pattern).sort();

  for (const filepath of files) {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    if (Array.isArray(data)) {
      merged.items = (merged.items || []).concat(data);
    } else {
      Object.assign(merged, data);
    }
  }

  fs.writeFileSync(output, JSON.stringify(merged, null, 2));
}

mergeJsonGlob('config/*.json', 'config/merged.json');
```

### Deduplicación Después del Merge

```python
import json

def merge_and_dedupe(files: list[str], key: str = 'id') -> list:
    seen = set()
    merged = []
    for f in files:
        with open(f, encoding='utf-8') as fh:
            for item in json.load(fh):
                item_key = item.get(key)
                if item_key not in seen:
                    seen.add(item_key)
                    merged.append(item)
    return merged

result = merge_and_dedupe(['data1.json', 'data2.json'], key='id')
```

| Tecnología | Librería | Enfoque | Notas |
|------------|----------|---------|-------|
| Python | `json` (stdlib) | `json.load` + `deep_merge` | Sin dependencias; requiere recursión custom |
| Python | `deepmerge` | `StrategyType.TYPESAFE` | Librería dedicada con estrategias de conflicto |
| JavaScript | nativo | `flatMap` + `deepMerge` | Cero deps; cuidado con referencias circulares |
| JavaScript | `lodash` | `_.merge(base, override)` | Probado en batalla, maneja arrays y objetos |
| Java | `Jackson` | Mutación de `ObjectNode` | Compatible con streaming, árbol de nodos type-safe |
| Java | `json-java` (org.json) | Deep merge de `JSONObject` | Ligero, recursión manual requerida |

## Lo que funciona

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

### ¿Cuál es la diferencia entre merge superficial y deep merge?

Merge superficial (`Object.assign`, spread `{...a, ...b}`) reemplaza objetos anidados enteros — si `a` tiene `{db: {host: "x", port: 5432}}` y `b` tiene `{db: {port: 3306}}`, el resultado es `{db: {port: 3306}}` — `host` se pierde. Deep merge combina claves anidadas recursivamente, produciendo `{db: {host: "x", port: 3306}}`. Siempre usa deep merge para archivos de configuración con estructuras anidadas.

### ¿Cómo fusiono archivos JSON asincrónicamente en Node.js?

```javascript
const fs = require('fs/promises');
const path = require('path');

async function mergeJsonAsync(dir, output) {
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json'));
  const merged = [];

  for (const file of files) {
    const content = await fs.readFile(path.join(dir, file), 'utf-8');
    const data = JSON.parse(content);
    if (Array.isArray(data)) merged.push(...data);
    else merged.push(data);
  }

  await fs.writeFile(output, JSON.stringify(merged, null, 2));
}

mergeJsonAsync('data/', 'merged.json');
```

### ¿Debo fusionar arrays o reemplazarlos durante un deep merge?

Depende. Para arrays de configuración (ej. `allowedOrigins`), reemplazar es más seguro — el archivo override define la lista completa. Para arrays de datos (ej. registros de dataset), concatenar y deduplicar es usualmente lo que quieres. Lodash `_.merge` reemplaza arrays por defecto; usa `_.mergeWith` con un customizer para concatenar.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
