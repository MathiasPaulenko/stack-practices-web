---
contentType: recipes
slug: parse-json
title: "Parsear JSON"
description: "Cómo parsear cadenas JSON a estructuras de datos nativas en varios lenguajes de programación."
metaDescription: "Ejemplos prácticos de parseo de JSON en Python, JavaScript y Java con fragmentos de código, casos límite y lo que funciona para desarrolladores."
difficulty: beginner
topics:
  - data
tags:
  - data
  - java
  - javascript
  - parsing
  - json
relatedResources:
  - /recipes/call-rest-api
  - /recipes/read-write-file
  - /recipes/regular-expressions
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de parseo de JSON en Python, JavaScript y Java con fragmentos de código, casos límite y lo que funciona para desarrolladores."
  keywords:
    - parsear json
    - json python
    - json javascript
    - json java
    - deserializar json
---
## Visión General

JSON es el formato de intercambio de datos de facto para las APIs modernas, los archivos de configuración y la comunicación entre servicios. Parsear JSON consiste en convertir una cadena con formato JSON en una estructura de datos nativa con la que tu lenguaje pueda trabajar (objetos, diccionarios, arrays).

Todos los lenguajes principales ofrecen soporte de JSON de primera clase, ya sea incorporado o mediante una librería consolidada. La forma idiomática de parsear JSON en Python, JavaScript y Java, además de manejo de errores, streaming para payloads grandes y validación con esquemas.

## Cuándo Usar

Usa esta receta cuando:

- Consumes una API REST que devuelve un payload JSON
- Lees configuración o datos almacenados en archivos `.json`
- Deserializas cuerpos de webhooks o eventos de una cola de mensajes
- Conviertes una cadena JSON en objetos tipados de tu modelo de dominio. Consulta [Data Validation Zod](/recipes/security/data-validation-zod) para parsing basado en schemas.

## Cuándo Evitar

- **YAML o TOML para config editada por humanos**: JSON no tiene comentarios ni strings multi-línea. Usa TOML o YAML para configuración escrita a mano.
- **Datos binarios**: JSON codifica binario como base64, inflando el tamaño un 33%. Usa Protobuf, MessagePack o CBOR para payloads con mucho binario.
- **Archivos enormes que no caben en memoria**: usa parsers de streaming (ver sección Avanzado) en lugar de `json.loads` / `JSON.parse`.

## Solución

### Python

```python
import json

raw = '{"name": "Ada", "age": 36, "skills": ["math", "code"]}'
data = json.loads(raw)

print(data["name"])      # "Ada"
print(data["skills"][0])  # "math"
```

Parsear desde un archivo:

```python
import json

with open("data.json", encoding="utf-8") as f:
    data = json.load(f)
```

Parsear con manejo de errores:

```python
import json

try:
    data = json.loads(raw)
except json.JSONDecodeError as e:
    print(f"JSON inválido en línea {e.lineno}, col {e.colno}: {e.msg}")
    raise
```

### JavaScript

```javascript
const raw = '{"name": "Ada", "age": 36, "skills": ["math", "code"]}';
const data = JSON.parse(raw);

console.log(data.name);       // "Ada"
console.log(data.skills[0]);  // "math"
```

Parsear con función reviver para transformar valores durante el parseo:

```javascript
const raw = '{"date": "2026-01-15", "count": "42"}';
const data = JSON.parse(raw, (key, value) => {
  if (key === 'count') return Number(value);
  if (key === 'date') return new Date(value);
  return value;
});
// data.date es un objeto Date, data.count es un número
```

Parsear con manejo de errores:

```javascript
try {
  const data = JSON.parse(raw);
} catch (e) {
  if (e instanceof SyntaxError) {
    console.error('JSON inválido:', e.message);
  }
  throw e;
}
```

### Java

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

ObjectMapper mapper = new ObjectMapper();
JsonNode node = mapper.readTree(
    "{\"name\": \"Ada\", \"age\": 36}");

String name = node.get("name").asText(); // "Ada"
int age = node.get("age").asInt();        // 36
```

Mapear directamente a un POJO tipado:

```java
public class User {
    public String name;
    public int age;
    public List<String> skills;
}

User user = mapper.readValue(jsonString, User.class);
```

Parsear con manejo de errores:

```java
try {
    User user = mapper.readValue(json, User.class);
} catch (JsonProcessingException e) {
    log.error("JSON inválido: {}", e.getOriginalMessage());
    throw new IllegalArgumentException("Bad request", e);
}
```

## Explicación

Cada lenguaje adopta un enfoque ligeramente distinto:

- **Python** usa el módulo incorporado `json`. `json.loads()` parsea una cadena; `json.load()` parsea desde un archivo. Devuelve estructuras nativas `dict` y `list`.
- **JavaScript** usa `JSON.parse()` incorporado. Devuelve objetos y arrays planos. Nunca uses `eval()` para parsear JSON: es un riesgo de seguridad.
- **Java** no tiene parser incorporado, así que añades una librería como [Jackson](https://github.com/FasterXML/jackson) o Gson. `readTree()` te da un árbol navegable; `readValue()` mapea directamente a POJOs tipados.

Una vez tengas los datos parseados, consulta [Llamar a una API REST](/recipes/api/call-rest-api) para obtener JSON por HTTP, o [Leer y Escribir Archivos](/recipes/file-handling/read-write-file) para cargarlo desde disco.

## Variantes

| Lenguaje | Herramienta | Devuelve | Parsear desde archivo |
|----------|-------------|----------|-----------------------|
| Python | `json` (stdlib) | `dict` / `list` | `json.load(f)` |
| JavaScript | `JSON.parse()` (nativo) | `Object` / `Array` | leer archivo y luego parsear |
| Java | Jackson / Gson | `JsonNode` / POJO | `mapper.readValue(file, T.class)` |
| Go | `encoding/json` (stdlib) | `map[string]interface{}` / struct | `json.NewDecoder(r).Decode(&v)` |
| Rust | `serde_json` crate | `Value` / struct | `serde_json::from_reader(r)` |
| C# | `System.Text.Json` (stdlib) | `JsonElement` / class | `JsonSerializer.Deserialize<T>(stream)` |

## Avanzado: Streaming de Archivos JSON Grandes

Cuando los archivos JSON son demasiado grandes para caber en memoria (GBs de datos), usa parsers de streaming que procesan el archivo incrementalmente.

### Python con ijson

```python
import ijson

def process_large_json(file_path):
    with open(file_path, 'rb') as f:
        for item in ijson.items(f, 'items.item'):
            process(item)
```

### Java con Jackson Streaming

```java
try (JsonParser parser = mapper.getFactory().createParser(new File("large.json"))) {
    while (parser.nextToken() != JsonToken.END_OBJECT) {
        String fieldName = parser.getCurrentName();
        if ("items".equals(fieldName)) {
            parser.nextToken(); // START_ARRAY
            while (parser.nextToken() != JsonToken.END_ARRAY) {
                Item item = parser.readValueAs(Item.class);
                process(item);
            }
        }
    }
}
```

### JavaScript con stream-json

```javascript
const fs = require('fs');
const streamJson = require('stream-json');

const pipeline = fs.createReadStream('large.json')
  .pipe(streamJson.parser());

pipeline.on('data', (data) => {
  if (data.name === 'startArray') {
    // manejar inicio de array
  }
});
```

## Avanzado: Validación con JSON Schema

Valida la estructura del JSON antes de confiar en ella:

```python
import jsonschema

schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer", "minimum": 0},
    },
    "required": ["name"],
}

jsonschema.validate(data, schema)  # lanza ValidationError si es inválido
```

```javascript
const Ajv = require('ajv');
const ajv = new Ajv();
const validate = ajv.compile(schema);

if (!validate(data)) {
  console.error(validate.errors);
}
```

## Lo que funciona

- **Maneja siempre los errores de parseo**: envuelve el parseo en `try/except` (Python) o `try/catch` (JS/Java); el JSON externo no es de confianza.
- **Prefiere modelos tipados en Java**: mapea a POJOs con `readValue()` en lugar de navegar `JsonNode` por claves de texto.
- **Nunca uses `eval()` en JavaScript**: ejecuta código arbitrario; usa siempre `JSON.parse()`.
- **Procesa payloads grandes en streaming**: usa `ijson` (Python) o el `JsonParser` de Jackson para no cargar archivos enormes en memoria.
- **Valida contra un esquema**: para APIs propias, valida con JSON Schema antes de confiar en la estructura.

## Errores Comunes

- **Ignorar la codificación**: JSON es UTF-8; leer un archivo con la codificación incorrecta corrompe los caracteres.
- **No capturar nada**: el JSON malformado lanza una excepción; fallar en silencio es peor que devolver un 400 claro.
- **Precisión numérica en JavaScript**: los enteros mayores que `Number.MAX_SAFE_INTEGER` pierden precisión; parsea los IDs grandes como cadenas.
- **Confundir `loads` y `load`**: en Python, `loads` recibe una cadena y `load` recibe un archivo.
- **Confiar en el caso de las claves**: las claves JSON distinguen mayúsculas; `Name` y `name` son campos distintos.

## Preguntas Frecuentes

### ¿Cómo parseo JSON desde un archivo en Python?

Usa `json.load(f)` (fíjate, `load`, no `loads`), pasando un archivo abierto: `with open("data.json") as f: data = json.load(f)`. Siempre especifica `encoding="utf-8"` ya que JSON es UTF-8 por especificación.

### ¿Cuál es el equivalente en Java de `json.loads` de Python?

`ObjectMapper.readValue(String, Class<T>)` para mapear a un objeto tipado, o `readTree(String)` para un árbol sin tipar. Jackson también soporta `readValue(File, Class)` y `readValue(InputStream, Class)` para archivos y streams.

### ¿Debo validar el JSON antes de parsearlo?

Para APIs que controlas, valida con JSON Schema después de parsear. Para fuentes externas, el parseo defensivo con try/catch es lo mínimo. Si la estructura es crítica (e.g., datos financieros), usa validación de esquema sin importar la fuente.

### ¿Cómo manejo enteros grandes en JSON con JavaScript?

Los números en JavaScript son floats de 64 bits, así que los enteros más allá de `Number.MAX_SAFE_INTEGER` (2^53 - 1) pierden precisión. Usa una función reviver para parsear números grandes como strings: `JSON.parse(raw, (k, v) => typeof v === 'number' && v > Number.MAX_SAFE_INTEGER ? String(v) : v)`. O usa `BigInt` con un parser personalizado.

### ¿Cómo parseo JSON con comentarios (JSONC)?

El JSON estándar no permite comentarios. Usa un parser JSONC: `jsonc-parser` (npm), `json5` (Python/JS), o elimina comentarios antes de parsear. En configuración de VS Code, JSONC es común. No uses `eval()` como workaround.

### ¿Cuál es la diferencia entre `JSON.parse` y `JSON.stringify`?

`JSON.parse` convierte una cadena JSON en un valor JavaScript. `JSON.stringify` hace lo inverso: convierte un valor JavaScript en una cadena JSON. Son inversos, pero `stringify` descarta valores `undefined` y funciones.

### ¿Cómo parseo streams JSON (NDJSON)?

NDJSON (newline-delimited JSON) tiene un objeto JSON por línea. En Python, divide líneas y parsea cada una: `[json.loads(line) for line in f if line.strip()]`. En Node.js, usa `readline` con `JSON.parse`. En Java, usa `ObjectMapper.readValues()` con un reader delimitado por líneas.

### ¿Cómo manejo referencias circulares al serializar a JSON?

No puedes serializar referencias circulares con `JSON.stringify` estándar — lanza `TypeError`. Usa una función replacer personalizada que rastree objetos vistos, o usa librerías como `flatted` o `circular-json` que codifican referencias circulares con referencias de ruta.

### ¿Qué es JSON5 y debería usarlo?

JSON5 es un superset de JSON que permite comentarios, comas finales, claves sin comillas y strings multi-línea. Es útil para archivos de configuración escritos por humanos. Usa la librería `json5` para parsear. No uses JSON5 para payloads de API — mantén JSON estándar para interoperabilidad.

### ¿Cómo parseo JSON en Go?

Usa `encoding/json` del stdlib: `var v MyStruct; err := json.Unmarshal([]byte(raw), &v)`. Para streaming, usa `json.NewDecoder(r).Decode(&v)`. Go requiere campos de struct exportados con tags `json:"fieldName"` para el mapeo.

### ¿Cómo hago pretty-print de JSON?

Python: `json.dumps(data, indent=2)`. JavaScript: `JSON.stringify(data, null, 2)`. Java: `mapper.writerWithDefaultPrettyPrinter().writeValueAsString(obj)`. Go: `json.MarshalIndent(v, "", "  ")`.

### ¿Cuál es el tamaño máximo de una cadena JSON?

No hay límite en la especificación. Los límites prácticos dependen de tu parser y memoria. El `json` de Python maneja strings hasta la memoria disponible. El `JSON.parse` de JavaScript está limitado por el heap de JS (típicamente 2-4 GB). Para archivos mayores a 1 GB, usa parsers de streaming.
