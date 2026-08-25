---
contentType: recipes
slug: flatten-unflatten-objects
title: "Aplanar y Reconstruir Objetos Anidados"
description: "Cómo convertir objetos anidados en pares clave-valor planos y reconstruirlos, con soporte de notación por puntos, corchetes y separadores personalizados."
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
  - recursion
relatedResources:
  - /recipes/parse-json
  - /recipes/url-encoding
  - /recipes/regular-expressions
  - /recipes/deep-clone-javascript
  - /recipes/merge-json-files
  - /recipes/serialize-deserialize-data
lastUpdated: "2026-08-17"
publishedAt: "2026-06-12"
author: Mathias Paulenko
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

Aplanar convierte un objeto profundamente anidado en un diccionario de un solo nivel con claves como `user.address.city = "London"`. Reconstruir (unflatten) vuelve a armar la estructura original a partir de esas claves planas. Sirve para librerías de formularios, actualizaciones de documentos, query strings y convertir documentos NoSQL en columnas planas de tablas. Los ejemplos de abajo muestran implementaciones recursivas en Python, JavaScript y Java, con separadores personalizados, manejo de índices de arrays y fidelidad en el ciclo de ida y vuelta. Recursos relacionados: [Formateo de Fechas](/recipes/date-formatting/) y [Manejo de Dinero y Moneda](/recipes/money-currency/).

## Cuándo Usar

Úsalo cuando:

- Conviertas datos de formularios anidados en pares clave-valor planos para [query strings HTTP](/recipes/url-encoding/) o exportación a CSV.
- Apliques parches solo en campos específicos profundamente anidados de documentos MongoDB o Elasticsearch.
- Normalices [respuestas de APIs JSON](/recipes/parse-json/) en estructuras relacionales planas para analytics.
- Construyas sistemas de configuración en vivo donde rutas con notación por puntos accedan a settings anidados.

## Solución

### Python

```python
import re
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

def _set(node, parts, value):
    for i, part in enumerate(parts[:-1]):
        next_is_index = parts[i + 1].isdigit()
        if isinstance(node, list):
            index = int(part)
            while len(node) <= index:
                node.append(None)
            if node[index] is None:
                node[index] = [] if next_is_index else {}
            node = node[index]
        else:
            if part not in node:
                node[part] = [] if next_is_index else {}
            node = node[part]

    last = parts[-1]
    if isinstance(node, list):
        index = int(last)
        while len(node) <= index:
            node.append(None)
        node[index] = value
    else:
        node[last] = value

def unflatten(flat: dict, separator: str = ".") -> Any:
    result = {}
    split_re = re.compile(re.escape(separator) + r"|\[|\]")
    for key, value in flat.items():
        parts = [p for p in split_re.split(key) if p]
        _set(result, parts, value)
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

function _set(node, parts, value) {
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextIsIndex = /^\d+$/.test(parts[i + 1]);
    if (Array.isArray(node)) {
      const index = Number(part);
      while (node.length <= index) node.push(null);
      if (node[index] === null) {
        node[index] = nextIsIndex ? [] : {};
      }
      node = node[index];
    } else {
      if (!(part in node)) {
        node[part] = nextIsIndex ? [] : {};
      }
      node = node[part];
    }
  }

  const last = parts[parts.length - 1];
  if (Array.isArray(node)) {
    const index = Number(last);
    while (node.length <= index) node.push(null);
    node[index] = value;
  } else {
    node[last] = value;
  }
}

function unflatten(flat, separator = ".") {
  const result = {};
  const esc = separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const splitRe = new RegExp(`${esc}|[\\[\\]]`, "g");

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(splitRe).filter(Boolean);
    _set(result, parts, value);
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
import java.util.regex.Pattern;

public class FlattenUtil {

  public static Map<String, Object> flatten(Map<String, Object> map) {
    Map<String, Object> result = new LinkedHashMap<>();
    flattenHelper(map, ".", "", result);
    return result;
  }

  private static void flattenHelper(Object obj, String separator, String prefix, Map<String, Object> result) {
    if (obj instanceof Map) {
      Map<?, ?> map = (Map<?, ?>) obj;
      for (Map.Entry<?, ?> entry : map.entrySet()) {
        String key = prefix.isEmpty() ? entry.getKey().toString()
                                      : prefix + separator + entry.getKey();
        flattenHelper(entry.getValue(), separator, key, result);
      }
    } else if (obj instanceof List) {
      List<?> list = (List<?>) obj;
      for (int i = 0; i < list.size(); i++) {
        String key = prefix + "[" + i + "]";
        flattenHelper(list.get(i), separator, key, result);
      }
    } else {
      result.put(prefix, obj);
    }
  }

  public static Map<String, Object> unflatten(Map<String, Object> flat) {
    return unflatten(flat, ".");
  }

  public static Map<String, Object> unflatten(Map<String, Object> flat, String separator) {
    Map<String, Object> result = new LinkedHashMap<>();
    String splitRegex = Pattern.quote(separator) + "|\\[|\\]";

    for (Map.Entry<String, Object> entry : flat.entrySet()) {
      String[] rawParts = entry.getKey().split(splitRegex);
      List<String> parts = new ArrayList<>();
      for (String p : rawParts) {
        if (!p.isEmpty()) parts.add(p);
      }
      build(result, parts, 0, entry.getValue());
    }

    return result;
  }

  @SuppressWarnings("unchecked")
  private static void build(Object node, List<String> parts, int index, Object value) {
    if (index == parts.size() - 1) {
      String part = parts.get(index);
      if (node instanceof List) {
        int i = Integer.parseInt(part);
        List<Object> list = (List<Object>) node;
        while (list.size() <= i) list.add(null);
        list.set(i, value);
      } else {
        ((Map<String, Object>) node).put(part, value);
      }
      return;
    }

    String part = parts.get(index);
    boolean nextIsIndex = parts.get(index + 1).matches("\\d+");

    if (node instanceof List) {
      int i = Integer.parseInt(part);
      List<Object> list = (List<Object>) node;
      while (list.size() <= i) list.add(null);
      Object child = list.get(i);
      if (child == null) {
        child = nextIsIndex ? new ArrayList<>() : new LinkedHashMap<>();
        list.set(i, child);
      }
      build(child, parts, index + 1, value);
    } else {
      Map<String, Object> map = (Map<String, Object>) node;
      if (!map.containsKey(part)) {
        map.put(part, nextIsIndex ? new ArrayList<>() : new LinkedHashMap<>());
      }
      build(map.get(part), parts, index + 1, value);
    }
  }

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
    Map<String, Object> restoredUser = (Map<String, Object>) restored.get("user");
    Map<String, Object> restoredAddress = (Map<String, Object>) restoredUser.get("address");
    System.out.println(restoredAddress.get("city")); // London
  }
}
```

## Explicación

La función recorre recursivamente cada par clave-valor de la estructura anidada. Para cada objeto anidado vuelve a llamarse con un prefijo actualizado. Para los arrays añade `[index]` para preservar la posición.

Las claves con notación por puntos (`parent.child.key`) se leen con facilidad y funcionan con la mayoría de parsers de query strings, con `get/set` de lodash y con la notación de puntos de MongoDB.

Al reconstruir, se separan las claves con notación por puntos y los índices entre corchetes, y se construyen los objetos anidados nivel por nivel. Detectar los índices de array (strings numéricos) permite reconstruir arrays en lugar de objetos con claves numéricas.

La fidelidad del ciclo completo se mantiene siempre que ninguna clave contenga el carácter separador. Si las claves contienen puntos, usa un separador personalizado (`→`, `__`) o escapa el separador.

## Variantes

| Enfoque | Separador | Manejo de Arrays | Mejor Para |
| --- | --- | --- | --- |
| Notación por puntos | `.` | Sufijo `[index]` | MongoDB, lodash, query strings |
| Notación por corchetes | `.` | `.0`, `.1` | Datos de formularios estilo PHP |
| Separador personalizado | `__` | `__0` | Claves que contienen puntos |
| Lodash `_.set` | `.` | Auto-detección | One-liners rápidos con dependencia |
| JSON Pointer | `/` | `/0` | JSON Patch, cumplimiento RFC 6901 |

## Mejores Prácticas

Trata el separador como un carácter reservado. Si tus claves pueden contener puntos (por ejemplo `example.com`), cámbialo por `__` o una flecha Unicode para que la ruta no choque con el nombre de la clave.

Siempre conserva los índices del array en la clave aplanada (`tags[0]`). Si los quitas, al reconstruir el objeto el array se convierte en un objeto cuyas claves son strings numéricos y el ciclo se rompe.

Deja los valores `null` tal cual y decide de antemano si conservar o descartar los objetos vacíos. El ciclo aplanar/reconstruir no sabe lo que tu aplicación espera, así que conviene dejar la regla explícita.

Al aplanar se pierde la información de tipos como Date, Map, Set o typed arrays. Si necesitas recuperarlos, [serialízalos primero](/recipes/serialize-deserialize-data/) y reconstruye alrededor de la representación en string.

Cuando el input no sea confiable, limita la profundidad de recursión y lleva un `WeakSet` con los objetos visitados para evitar que un payload malicioso desborde la pila o entre en un bucle infinito.

## Errores Comunes

1. Usar notación por puntos cuando las claves de datos mismas contienen puntos, causando rutas ambiguas o incorrectas.
2. Aplanar arrays sin preservar índices, por lo que no puedes reconstruir la estructura original.
3. No manejar referencias circulares, que causan recursión infinita. Usa un cache `WeakSet` para detectar ciclos.
4. Intentar reconstruir claves con separadores inconsistentes (mezclando `.` y `_`), produciendo una salida malformada.
5. Tratar todas las claves de string numéricas como índices de arrays, convirtiendo claves de objetos como `"123"` en arrays inesperadamente.

## Preguntas Frecuentes

### ¿Puedo aplanar solo hasta una profundidad específica?

Sí. Agrega un parámetro `maxDepth` y detén la recursión cuando `currentDepth >= maxDepth`. Todo lo que quede por debajo se conserva anidado bajo el prefijo actual. Es útil para actualizaciones superficiales en las que solo te importan los primeros dos niveles.

### ¿Cómo manejo claves que contienen el carácter separador?

Escapa el separador en las claves antes de aplanar (por ejemplo, reemplaza `.` por `\.`) y desescápalo al reconstruir. O elige un separador que no pueda aparecer en tus datos, como `→` u otro carácter Unicode. La mayoría de librerías, incluida `flat`, permiten usar un separador personalizado.

### ¿El ciclo aplanar → reconstruir siempre produce el mismo resultado?

No. Arrays con índices dispersos, objetos con prototipos `null` y tipos especiales como Date, RegExp o Map pueden cambiar después del ciclo. Si necesitas fidelidad estricta, guarda metadata de los tipos originales junto con los datos aplanados, o usa un formato como JSON Pointer que conserve la información estructural.

### ¿Cómo aplaneo objetos con referencias circulares?

Lleva un `WeakSet` con los objetos visitados. Cuando la recursión encuentre un objeto que ya está en el conjunto, reemplázalo por un marcador como `[Circular]` u omite la clave. La referencia circular no sobrevive al reconstruir, así que si necesitas conservarla, usa una librería como `flatted` o `circular-json` que codifica los ciclos como rutas indexadas.

### ¿Qué librerías manejan aplanar/reconstruir en producción?

En JavaScript, `flat` es muy usada y soporta separadores personalizados, límites de profundidad y manejo seguro de claves. En Python, `flatten-dict` y `pandas.json_normalize` cubren la mayoría de los casos. En Java, `JsonPointer` de Jackson y el recorrido de `JsonObject` de Gson pueden aplanar árboles JSON. Para trabajo específico de base de datos, como `jsonb_path_query` en PostgreSQL, usa las funciones JSON nativas de la base de datos en vez de hacerlo en la aplicación.

### ¿Cómo aplaneo objetos TypeScript preservando información de tipos?

Define un tipo genérico `Flatten<T>` que construya recursivamente claves como ``${Prefix}.${Key}``. En runtime la función sigue produciendo claves de string, pero el tipo le indica al compilador qué claves esperar. Usa aserciones `as const` sobre el resultado aplanado y valida los datos no confiables con Zod.


