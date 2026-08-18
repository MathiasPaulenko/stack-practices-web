---
contentType: recipes
slug: url-encoding
title: "URL Encoding"
description: "Codifica y decodifica URLs, parámetros de query y segmentos de path de forma segura en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de URL encoding en Python, JavaScript y Java. Aprende percent-encoding, query strings y parsing de URIs."
difficulty: beginner
topics:
  - data
tags:
  - data
  - encoding
  - url
  - percent-encoding
  - parsing
  - python
  - javascript
  - java
  - utf-8
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
  - /recipes/input-validation
  - /recipes/data-validation
  - /recipes/regular-expressions
  - /recipes/parse-csv-python-pandas
lastUpdated: "2026-08-18"
publishedAt: "2026-06-10"
author: Mathias Paulenko
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
    - utf-8
---

## Visión General

URL encoding, también llamado percent-encoding, convierte caracteres a un formato
que puede viajar de forma segura dentro de una URL. Reemplaza caracteres ASCII
inseguros con `%` seguido de dos dígitos hexadecimales. Por eso es esencial para
parámetros de query, segmentos de path y envíos de formularios.

No codificar el input del usuario antes de colocarlo en una URL puede generar
links rotos, vulnerabilidades de open redirect o ataques de inyección. Si estás
construyendo un cliente de API, combina esta receta con
[Input Validation](/recipes/input-validation/) y la
[API Security Checklist](/guides/api-security-checklist-guide/) para una defensa
más completa.

## Cuándo Usar

Usa esta receta cuando construyas o parses URLs con datos en vivo:

- Construir query strings con valores que vienen de
  [input de usuario](/recipes/input-validation/).
- Codificar nombres de archivo o IDs antes de colocarlos en paths de URL.
- Parsear URLs y extraer parámetros de query.
- Enviar datos de formulario vía requests GET.
- Manejar URLs de redirección que llevan parámetros.

## Solución

### Python

```python
from urllib.parse import quote, unquote, urlencode, parse_qs, urlparse

# Codificar un string para un path o valor de query
encoded = quote("hello world & friends")
print(encoded)  # hello%20world%20%26%20friends

# Construir un query string de forma segura
params = {"search": "python & java", "page": 2}
query = urlencode(params)
print(query)  # search=python+%26+java&page=2

# Parsear una URL
url = urlparse("https://api.example.com/search?query=hello%20world&limit=10")
print(url.query)           # query=hello%20world&limit=10
print(parse_qs(url.query)) # {'query': ['hello world'], 'limit': ['10']}

# Decodificar
original = unquote("hello%20world")
print(original)  # hello world
```

### JavaScript

```javascript
// Codificar un componente (valor de query o segmento de path)
const encoded = encodeURIComponent("hello world & friends");
console.log(encoded); // hello%20world%20%26%20friends

// Construir un query string
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

// Codificar un valor
String encoded = URLEncoder.encode("hello world & friends", StandardCharsets.UTF_8);
System.out.println(encoded); // hello+world+%26+friends

// Decodificar un valor
String decoded = URLDecoder.decode("hello%20world", StandardCharsets.UTF_8);
System.out.println(decoded); // hello world

// Construir un URI desde partes
String query = String.format("query=%s&limit=10",
    URLEncoder.encode("hello world", StandardCharsets.UTF_8));
String full = "https://api.example.com/search?" + query;
System.out.println(full); // https://api.example.com/search?query=hello+world&limit=10

// Parsear un URI
URI parsed = new URI("https://api.example.com/search?query=hello%20world&limit=10");
System.out.println(parsed.getQuery()); // query=hello%20world&limit=10
```

## Explicación

Una URL solo puede transportar un conjunto limitado de caracteres sin ambigüedad.
El conjunto no reservado (`A-Z`, `a-z`, `0-9`, `-`, `_`, `.`, `~`) puede aparecer
tal cual. Todo lo demás debe codificarse con percent-encoding usando la secuencia
UTF-8 del carácter.

Por ejemplo, el espacio se convierte en `%20` porque su byte UTF-8 es `0x20`. En
query strings, muchas librerías también aceptan `+` como espacio gracias a la
convención `application/x-www-form-urlencoded` de formularios HTML.

El riesgo clave es embeber input del usuario tal cual. Un `&` o `?` dentro de un
valor se leería como delimitador de query o path. Codificarlo convierte `&` en
`%26` y `?` en `%3F`, así el servidor recibe el valor intacto.

## Variantes

| Función | Codifica | Seguro para |
| --- | --- | --- |
| `encodeURIComponent` (JS) | Todo excepto `A-Z a-z 0-9 - _ . ! ~ * ' ( )` | Valores de query y segmentos de path |
| `encodeURI` (JS) | Igual, pero preserva `; , / ? : @ & = + $ #` | URLs completas |
| `quote` (Python) | Por defecto todos los no alfanuméricos | Paths, queries con override de `safe` |
| `urlencode` (Python) | Igual que `quote_plus` | Query strings (espacios → `+`) |
| `URLEncoder` (Java) | Todo excepto `a-z A-Z 0-9 - _ . *` | Query strings (espacios → `+`) |

Para una comparación más profunda de enfoques de parsing de strings, consulta
[Regular Expressions](/recipes/regular-expressions/).

## Mejores Prácticas

- Siempre codifica el input del usuario antes de embeberlo en una URL.
- Usa `encodeURIComponent` en JavaScript para valores de query, no `encodeURI`.
- Usa `urlencode` en Python para query strings completos y `quote` para segmentos
  de path.
- No codifiques la URL completa; solo codifica las partes vivas como valores y
  segmentos de path.
- Prefiere `URLSearchParams` en JavaScript moderno para construir queries de forma
  segura.
- Maneja el `+` con cuidado: significa espacio en query strings, mientras que
  `%20` es la opción más segura para paths y specs modernas.
- Trata el input decodificado como no confiable y valídalo con una librería como
  [Data Validation](/recipes/data-validation/) o un validador de schemas.

## Errores Comunes

- Usar `encodeURI` para valores de query. No codifica `&`, `=` ni `?`, así que el
  query puede romperse.
- Olvidar codificar el input del usuario, lo que causa URLs malformadas o
  inyección.
- Doble-codificar valores que ya fueron codificados por otra capa.
- Confundir espacios codificados como `+` en query strings con `%20` en paths y
  specs más nuevas.
- Parsear URLs con split de strings en lugar de un parser de URI apropiado.
- Codificar una URL ya codificada. Double-encoding de `%20` produce `%2520`.
- Pasar espacios o Unicode en bruto a `new URL()` sin codificar; el comportamiento
  no es consistente entre runtimes.

## Preguntas Frecuentes

### ¿Qué caracteres hay que codificar?

Cualquier carácter fuera del conjunto no reservado `A-Z a-z 0-9 - _ . ~` debe
codificarse antes de ir en una URL. Los caracteres reservados como `&`, `=`, `?`,
`#`, `/` y el espacio son especialmente importantes porque tienen significado
estructural.

### ¿Cuál es la diferencia entre `encodeURI` y `encodeURIComponent`?

`encodeURI` conserva los delimitadores que hacen funcionar a una URL (`:`, `/`,
`?`, `&`, etc.), así que sirve para URLs completas. `encodeURIComponent` codifica
casi todo, por lo que es la opción correcta para valores individuales de query y
segmentos de path.

### ¿Debo usar `+` o `%20` para los espacios?

En query strings, muchos servidores aceptan `+` por los formularios HTML, y
`urlencode` en Python emite `+` por defecto. En paths y APIs modernas, `%20` es
la opción más segura y estándar. Si dudas, usa `%20`.

### ¿Cómo manejo caracteres no ASCII?

Codifícalos como UTF-8 primero y luego aplica percent-encoding a cada byte. Las
APIs URL modernas hacen esto automáticamente. Por ejemplo, `café` se convierte
en `caf%C3%A9`.

### ¿Por qué obtengo `%2520`?

`%2520` es el resultado de double-encoding de `%20`. Significa que codificaste el
valor después de que ya estaba codificado. Decodifica el valor una vez antes de
volver a codificarlo, o codifica solo una vez en el límite donde el valor entra
en la URL.

### ¿Cómo decodifico un query string?

En JavaScript, usa `new URL(url).searchParams`. En Python, usa `parse_qs` o
`parse_qsl` de `urllib.parse`. En Java, usa `URLDecoder.decode` en cada valor por
separado, no en toda la URL.
