---
contentType: recipes
slug: flatten-unflatten-objects
title: "Aplanar y Reconstruir Objetos Anidados"
description: "Cómo convertir objetos anidados en pares clave-valor planos y reconstruirlos, con soporte de notación por puntos, corchetes y separadores custom."
metaDescription: "Aprende operaciones flatten y unflatten en Python, JavaScript y Java. Cubre notación por puntos, anidamiento profundo, manejo de arrays y conversión round-trip."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - java
  - parsing
  - json
  - csv
relatedResources:
  - /recipes/caching
  - /recipes/date-formatting
  - /recipes/money-currency
  - /recipes/parse-json
  - /recipes/regular-expressions
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende operaciones flatten y unflatten en Python, JavaScript y Java. Cubre notación por puntos, anidamiento profundo, manejo de arrays y conversión round-trip."
  keywords:
    - flatten
    - unflatten
    - objetos
    - anidado
    - recursion
    - python
    - javascript
    - java
---
## Visión General

El flattening transforma un objeto profundamente anidado en un diccionario de un solo nivel usando claves con notación por puntos (ej. `user.address.city` → `"London"`). El unflattening invierte esto, reconstruyendo la estructura anidada original. Estas operaciones son esenciales para librerías de formularios, actualizaciones de documentos en bases de datos, serialización de query strings, y conversión entre documentos NoSQL y columnas planas de tablas. La solucion a continuacion cubre implementaciones recursivas con separadores custom, preservación de índices de arrays, y fidelidad de round-trip en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Conviertas datos de formularios anidados en pares clave-valor planos para [query strings HTTP](/recipes/data/url-encoding) o export CSV
- Apliques patches solo en campos específicos profundamente anidados en documentos MongoDB/Elasticsearch
- Normalices [respuestas de APIs JSON](/recipes/data/parse-json) en estructuras relacionales planas para analytics
- Construyas sistemas de configuración en vivo donde rutas con notación por puntos accedan a settings anidados

## Solución

### Python

```python
from typing import Any

def flatten(obj: Any, separator: str = ".", prefix: str = "") -> dict:
    result = {}
    if isinstance(obj, dict):
        for key, value in obj.items():
            new_key = f"{prefix}{separator}{key}" if prefix else key
            result.update(flatten(value, separator, new_key))
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            new_key = f"{prefix}[{index}]"
            result.update(flatten(value, separator, new_key))
    else:
        result[prefix] = obj
    return result

def unflatten(flat: dict, separator: str = ".") -> Any:
    result = {}
    for key, value in flat.items():
        parts = key.split(separator)
        target = result
        for part in parts[:-1]:
            if part not in target:
                target[part] = {}
            target = target[part]
        target[parts[-1]] = value
    return result

# Uso
nested = {
    "user": {
        "name": "Alice",
        "address": {"city": "London", "zip": "SW1A"},
        "tags": ["admin", "active"]
    },
    "version": 1
}

flat = flatten(nested)
print(flat)
# {
#   "user.name": "Alice",
#   "user.address.city": "London",
#   "user.address.zip": "SW1A",
#   "user.tags[0]": "admin",
#   "user.tags[1]": "active",
#   "version": 1
# }

restored = unflatten(flat)
print(restored["user"]["address"]["city"])  # "London"
```

### JavaScript

```javascript
function flatten(obj, separator = ".", prefix = "") {
  const result = {};

  if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      Object.assign(result, flatten(value, separator, newKey));
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((value, index) => {
      const newKey = `${prefix}[${index}]`;
      Object.assign(result, flatten(value, separator, newKey));
    });
  } else {
    result[prefix] = obj;
  }

  return result;
}

function unflatten(flat, separator = ".") {
  const result = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(separator);
    let target = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in target)) {
        const nextPart = parts[i + 1];
        target[part] = /^\d+$/.test(nextPart) ? [] : {};
      }
      target = target[part];
    }

    target[parts[parts.length - 1]] = value;
  }

  return result;
}

// Uso
const nested = {
  user: {
    name: "Alice",
    address: { city: "London", zip: "SW1A" },
    tags: ["admin", "active"]
  },
  version: 1
};

const flat = flatten(nested);
console.log(flat["user.address.city"]); // "London"

const restored = unflatten(flat);
console.log(restored.user.address.city); // "London"
```

### Java

```java
import java.util.*;

public class FlattenUtil {

  public static Map<String, Object> flatten(Map<String, Object> map) {
    Map<String, Object> result = new LinkedHashMap<>();
    flattenHelper(map, "", result);
    return result;
  }

  private static void flattenHelper(Object obj, String prefix, Map<String, Object> result) {
    if (obj instanceof Map) {
      Map<?, ?> map = (Map<?, ?>) obj;
      for (Map.Entry<?, ?> entry : map.entrySet()) {
        String key = prefix.isEmpty() ? entry.getKey().toString()
                                      : prefix + "." + entry.getKey();
        flattenHelper(entry.getValue(), key, result);
      }
    } else if (obj instanceof List) {
      List<?> list = (List<?>) obj;
      for (int i = 0; i < list.size(); i++) {
        String key = prefix + "[" + i + "]";
        flattenHelper(list.get(i), key, result);
      }
    } else {
      result.put(prefix, obj);
    }
  }

  public static Map<String, Object> unflatten(Map<String, Object> flat) {
    Map<String, Object> result = new LinkedHashMap<>();

    for (Map.Entry<String, Object> entry : flat.entrySet()) {
      String[] parts = entry.getKey().split("\\.");
      Map<String, Object> target = result;

      for (int i = 0; i < parts.length - 1; i++) {
        String part = parts[i];
        if (!target.containsKey(part)) {
          String nextPart = parts[i + 1];
          target.put(part, nextPart.matches("\\d+") ? new ArrayList<>() : new LinkedHashMap<>());
        }
        target = (Map<String, Object>) target.get(part);
      }

      target.put(parts[parts.length - 1], entry.getValue());
    }

    return result;
  }

  // Uso
  public static void main(String[] args) {
    Map<String, Object> nested = new LinkedHashMap<>();
    Map<String, Object> user = new LinkedHashMap<>();
    Map<String, Object> address = new LinkedHashMap<>();
    address.put("city", "London");
    address.put("zip", "SW1A");
    user.put("name", "Alice");
    user.put("address", address);
    user.put("tags", List.of("admin", "active"));
    nested.put("user", user);
    nested.put("version", 1);

    Map<String, Object> flat = flatten(nested);
    System.out.println(flat.get("user.address.city")); // London

    Map<String, Object> restored = unflatten(flat);
    System.out.println(((Map<?, ?>) ((Map<?, ?>) restored.get("user")).get("address")).get("city"));
  }
}
```

## Explicación

- **Recorrido recursivo** recorre cada par clave-valor de la estructura anidada. Para cada objeto anidado, la función recursa con un prefijo actualizado. Para arrays, agrega `[index]` para preservar la posición.
- **Claves con notación por puntos** (`parent.child.key`) son legibles y compatibles con la mayoría de parsers de query strings, lodash `get/set`, y notación de puntos de MongoDB.
- **Reconstrucción unflatten** divide claves con notación por puntos y construye objetos anidados nivel por nivel. Detectar índices de arrays (strings numéricos) permite reconstruir arrays en lugar de objetos con claves numéricas.
- **Fidelidad de round-trip** se preserva al hacer flatten y luego unflatten, siempre que ninguna clave contenga el carácter separador. Si las claves contienen puntos, usa un separador custom (`→`, `__`) o escapa el separador.

## Variantes

| Enfoque | Separador | Manejo de Arrays | Mejor Para |
|---------|-----------|------------------|------------|
| Notación por puntos | `.` | Sufijo `[index]` | MongoDB, lodash, query strings |
| Notación por corchetes | `.` | `.0`, `.1` | Datos de formularios estilo PHP |
| Separador custom | `__` | `__0` | Claves que contienen puntos |
| Lodash `_.set` | `.` | Auto-detección | One-liners rápidos con dependencia |
| JSON Pointer | `/` | `/0` | JSON Patch, cumplimiento RFC 6901 |

## Lo que funciona

1. **Valida la elección del separador** — si tus claves de datos pueden contener puntos (ej. nombres de dominio como `example.com`), usa un separador custom como `__` o `→` para evitar rutas ambiguas.
2. **Preserva índices de arrays explícitamente** — incluye siempre los índices de arrays en la clave flatten (`tags[0]`). Sin ellos, los arrays se convierten en objetos con claves de string numéricas al hacer unflatten.
3. **Maneja null y objetos vacíos** — los valores `null` deben preservarse tal cual. Los objetos vacíos `{}` deben preservarse u omitirse explícitamente según tu caso de uso.
4. **Fidelidad de tipos en round-trip** — el flattening pierde información de tipos para Dates, Maps, Sets y typed arrays. [Serializa estos a strings](/recipes/data/deep-clone-javascript) antes de flatten si la recuperación del tipo importa.
5. **Limita la profundidad para seguridad** — en input no confiable, limita la profundidad de recursión para prevenir ataques de stack overflow con JSON maliciosamente anidado.

## Errores Comunes

1. Usar notación por puntos cuando las claves de datos mismas contienen puntos, causando rutas ambiguas o incorrectas.
2. Aplanar arrays sin preservar índices, haciendo la reconstrucción round-trip imposible.
3. No manejar referencias circulares, que causan recursión infinita. Usa un cache `WeakSet` para detectar ciclos.
4. Intentar reconstruir claves con separadores inconsistentes (mezclando `.` y `_`), produciendo output malformado.
5. Tratar todas las claves de string numéricas como índices de arrays, convirtiendo claves de objetos como `"123"` en arrays inesperadamente.

## Preguntas Frecuentes

### ¿Puedo aplanar solo hasta una profundidad específica?

Sí. Modifica la función recursiva para aceptar un parámetro `maxDepth` y detén la recursión cuando `currentDepth >= maxDepth`. Retorna el valor anidado restante bajo el prefijo actual. Esto es útil para updates superficiales donde solo necesitas los primeros dos niveles aplanados.

### ¿Cómo manejo claves que contienen el carácter separador?

Escapa el separador en las claves antes de flatten (ej. reemplaza `.` por `\.`), luego desescapa durante unflatten. Alternativamente, elige un separador que no pueda aparecer en tus datos, como `→` o caracteres Unicode. Muchas librerías (como `flat`) soportan separadores custom.

### ¿El round-trip flatten → unflatten siempre produce output idéntico?

No siempre. Arrays con índices dispersos, objetos con prototipos `null`, y tipos especiales (Date, RegExp, Map) pueden diferir después del round-trip. Para fidelidad estricta, registra metadata sobre los tipos originales junto con los datos flatten, o usa un formato de serialización como JSON Pointer que preserva la información estructural.
