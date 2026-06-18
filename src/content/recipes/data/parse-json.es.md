---
contentType: recipes
slug: parse-json
title: "Parsear JSON"
description: "Cómo parsear cadenas JSON a estructuras de datos nativas en varios lenguajes de programación."
metaDescription: "Ejemplos prácticos de parseo de JSON en Python, JavaScript y Java con fragmentos de código, casos límite y buenas prácticas para desarrolladores."
difficulty: beginner
topics:
  - data
tags:
  - data
  - java
  - javascript
relatedResources:
  - /recipes/call-rest-api
  - /recipes/read-write-file
  - /recipes/regular-expressions
lastUpdated: "2026-06-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de parseo de JSON en Python, JavaScript y Java con fragmentos de código, casos límite y buenas prácticas para desarrolladores."
  keywords:
    - parsear json
    - json python
    - json javascript
    - json java
    - deserializar json
---
## Visión General

JSON es el formato de intercambio de datos de facto para las APIs modernas, los archivos de configuración y la comunicación entre servicios. Parsear JSON consiste en convertir una cadena con formato JSON en una estructura de datos nativa con la que tu lenguaje pueda trabajar (objetos, diccionarios, arrays).

Todos los lenguajes principales ofrecen soporte de JSON de primera clase, ya sea incorporado o mediante una librería consolidada. Esta receta muestra la forma idiomática de parsear JSON en Python, JavaScript y Java.

## Cuándo Usar

Usa esta receta cuando:

- Consumes una API REST que devuelve un payload JSON
- Lees configuración o datos almacenados en archivos `.json`
- Deserializas cuerpos de webhooks o eventos de una cola de mensajes
- Conviertes una cadena JSON en objetos tipados de tu modelo de dominio

## Solución

### Python

```python
import json

raw = '{"name": "Ada", "age": 36, "skills": ["math", "code"]}'
data = json.loads(raw)

print(data["name"])      # "Ada"
print(data["skills"][0])  # "math"
```

### JavaScript

```javascript
const raw = '{"name": "Ada", "age": 36, "skills": ["math", "code"]}';
const data = JSON.parse(raw);

console.log(data.name);       // "Ada"
console.log(data.skills[0]);  // "math"
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

## Explicación

Cada lenguaje adopta un enfoque ligeramente distinto:

- **Python** usa el módulo incorporado `json`. `json.loads()` parsea una cadena; `json.load()` parsea desde un archivo. Devuelve estructuras nativas `dict` y `list`.
- **JavaScript** usa `JSON.parse()` incorporado. Devuelve objetos y arrays planos. Nunca uses `eval()` para parsear JSON: es un riesgo de seguridad.
- **Java** no tiene parser incorporado, así que añades una librería como [Jackson](https://github.com/FasterXML/jackson) o Gson. `readTree()` te da un árbol navegable; `readValue()` mapea directamente a POJOs tipados.

Una vez tengas los datos parseados, consulta [Llamar a una API REST](/es/recipes/call-rest-api) para obtener JSON por HTTP, o [Leer y Escribir Archivos](/es/recipes/read-write-file) para cargarlo desde disco.

## Variantes

| Lenguaje | Herramienta | Devuelve | Parsear desde archivo |
|----------|-------------|----------|-----------------------|
| Python | `json` (stdlib) | `dict` / `list` | `json.load(f)` |
| JavaScript | `JSON.parse()` (nativo) | `Object` / `Array` | leer archivo y luego parsear |
| Java | Jackson / Gson | `JsonNode` / POJO | `mapper.readValue(file, T.class)` |

## Mejores Prácticas

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

**Q: ¿Cómo parseo JSON desde un archivo en Python?**
A: Usa `json.load(f)` (fíjate, `load`, no `loads`), pasando un archivo abierto: `with open("data.json") as f: data = json.load(f)`.

**Q: ¿Cuál es el equivalente en Java de `json.loads` de Python?**
A: `ObjectMapper.readValue(String, Class<T>)` para mapear a un objeto tipado, o `readTree(String)` para un árbol sin tipar.

**Q: ¿Debo validar el JSON antes de parsearlo?**
A: Para APIs que controlas, valida con JSON Schema. Para fuentes externas, el parseo defensivo con try/catch suele bastar.
