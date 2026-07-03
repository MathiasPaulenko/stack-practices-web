---
contentType: recipes
slug: url-encoding
title: "URL Encoding"
description: "Cómo codificar y decodificar URLs, parámetros de query y segmentos de path de forma segura en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de URL encoding en Python, JavaScript y Java. Aprende percent-encoding, query strings y parsing de URIs."
difficulty: beginner
topics:
  - data
tags:
  - data
  - encoding
  - java
  - parsing
  - json
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
  - /recipes/regular-expressions
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de URL encoding en Python, JavaScript y Java. Aprende percent-encoding, query strings y parsing de URIs."
  keywords:
    - url encoding
    - percent encoding
    - query string
    - url decode
    - python urllib
    - javascript encodeURIComponent
    - java URLEncoder
    - uri parsing
    - parámetros url seguros
---

## Visión general

El URL encoding (percent-encoding) convierte caracteres en un formato que puede transmitirse por internet. Reemplaza caracteres ASCII inseguros con `%` seguido de dos dígitos hexadecimales. Es esencial para parámetros de query, segmentos de path y envíos de formularios.

No codificar input de usuarios antes de colocarlo en una URL puede llevar a links rotos, ataques de inyección o comportamiento inesperado de [APIs](/recipes/api/call-rest-api). Consulta [API Security Checklist](/guides/security/api-security-checklist-guide) para protección detallada.

## Cuándo usarlo

Usa esta recipe cuando:

- Construyes query strings con valores en vivo de [input de usuario](/recipes/api/input-validation)
- Codificas nombres de archivo o IDs en paths de URL
- Parseas URLs y extraes parámetros de query
- Envías datos de formulario vía requests GET. Consulta [Data Validation](/recipes/data/data-validation) para sanitizar datos de formularios.
- Manejas URLs de redirección con parámetros

## Solución

### Python

```python
from urllib.parse import quote, unquote, urlencode, parse_qs, urlparse

# Codificar un string para usar en path o query de URL
encoded = quote("hello world & friends")
print(encoded)  # hello%20world%20%26%20friends

# Construir un query string de forma segura
params = {"search": "python & java", "page": 2}
query = urlencode(params)
print(query)  # search=python+%26+java&page=2

# Parsear una URL
url = urlparse("https://api.example.com/search?query=hello%20world&limit=10")
print(url.query)  # query=hello%20world&limit=10
print(parse_qs(url.query))  # {'query': ['hello world'], 'limit': ['10']}

# Decodificar
original = unquote("hello%20world")
print(original)  # hello world
```

### JavaScript

```javascript
// Codificar un componente (query parameter o path segment)
const encoded = encodeURIComponent("hello world & friends");
console.log(encoded); // hello%20world%20%26%20friends

// Construir query string
const params = new URLSearchParams({ search: "python & java", page: "2" });
console.log(params.toString()); // search=python+%26+java&page=2

// Parsear URL
const url = new URL("https://api.example.com/search?query=hello%20world&limit=10");
console.log(url.searchParams.get("query")); // hello world
console.log(url.searchParams.get("limit")); // 10

// Decodificar
const decoded = decodeURIComponent("hello%20world");
console.log(decoded); // hello world
```

### Java

```java
import java.net.*;
import java.nio.charset.StandardCharsets;

// Codificar
String encoded = URLEncoder.encode("hello world & friends", StandardCharsets.UTF_8);
System.out.println(encoded); // hello+world+%26+friends

// Decodificar
String decoded = URLDecoder.decode("hello%20world", StandardCharsets.UTF_8);
System.out.println(decoded); // hello world

// Construir URI con query parameters
URI uri = new URI("https", "api.example.com", "/search",
    "query=hello+world&limit=10", null);
System.out.println(uri.toString());

// Parsear URI
URI parsed = new URI("https://api.example.com/search?query=hello%20world&limit=10");
System.out.println(parsed.getQuery()); // query=hello%20world&limit=10
```

## Reglas de Encoding

| Función | Codifica | Seguro para |
| ------- | ------- | ----------- |
| `encodeURIComponent` (JS) | Todo excepto `A-Z a-z 0-9 - _ . ! ~ * ' ( )` | Query parameters, path segments |
| `encodeURI` (JS) | Igual, pero preserva `; , / ? : @ & = + $ #` | URLs completas |
| `quote` (Python) | Por defecto todos los no alfanuméricos | Paths, queries con override de safe |
| `urlencode` (Python) | Igual que `quote_plus` | Query strings (espacios → `+`) |
| `URLEncoder` (Java) | Todo excepto `a-z A-Z 0-9 - _ . *` | Query strings (espacios → `+`) |

## Lo que funciona

- **Siempre codifica input de usuarios** antes de embeberlo en URLs
- **Usa `encodeURIComponent` (JS)** para valores de query parameters, no `encodeURI`
- **Usa `urlencode` (Python)** para construir query strings completos
- **No codifiques la URL completa**: Solo codifica las partes en vivo (valores, segmentos)
- **Prefiere `URLSearchParams`** en JavaScript moderno para construcción segura de query strings
- **Maneja signos plus con cuidado**: En query strings, `+` significa espacio. En paths, `%20` significa espacio.

## Errores comunes

- Usar `encodeURI` para valores de query parameters (no codifica `&`, `=`, `?`)
- Olvidar codificar input de usuarios, causando URLs malformadas o inyección
- Doble-codificar valores que ya fueron codificados por otra capa
- Confundir espacios codificados como `+` (query strings) vs `%20` (paths y specs modernas)
- Parsear URLs con split de strings en lugar de un parser de URI apropiado

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre `encodeURI` y `encodeURIComponent`?**
R: `encodeURI` es para URLs completas y preserva caracteres estructurales (`/`, `?`, `&`). `encodeURIComponent` es para componentes individuales y codifica todo incluyendo `&` y `=`.

**P: ¿Debería codificar espacios como `+` o `%20`?**
R: En query strings, `+` es tradicional pero `%20` también es válido. En paths, usa siempre `%20`.

**P: ¿Cómo manejo arrays en query strings?**
R: Usa notación de brackets: `?tags[]=js&tags[]=py` o repite la key: `?tags=js&tags=py`. Elige una convención y documenta.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
