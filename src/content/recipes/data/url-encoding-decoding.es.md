---
contentType: recipes
slug: url-encoding-decoding
title: "Codificacion y Decodificacion de URLs: encodeURI, encodeURIComponent y Mas"
description: "Domina la codificacion de URLs en JavaScript y otros lenguajes con encodeURI, encodeURIComponent, manejo de plus-safe, cumplimiento RFC 3986 y casos edge de decodificacion"
metaDescription: "Domina la codificacion de URLs en JavaScript con encodeURI, encodeURIComponent, cumplimiento RFC 3986, manejo plus-safe y casos edge de decodificacion."
difficulty: beginner
topics:
  - data
  - frontend
tags:
  - encoding
  - javascript
  - frontend
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /guides/security-guide
  - /recipes/security/data-validation-zod
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Domina la codificacion de URLs en JavaScript con encodeURI, encodeURIComponent, cumplimiento RFC 3986, manejo plus-safe y casos edge de decodificacion."
  keywords:
    - url encoding
    - encodeURIComponent
    - RFC 3986
    - percent encoding
    - query parameters
---

# Codificacion y Decodificacion de URLs: encodeURI, encodeURIComponent y Mas

Codifica URLs y componentes URI correctamente para manejar caracteres especiales, espacios y Unicode de forma segura en browsers, servidores y APIs. Esta recipe cubre `encodeURI`, `encodeURIComponent`, cumplimiento RFC 3986, codificacion de form data y casos edge de decodificacion.

## Cuando Usar Esto

- Construyendo query strings desde input de usuario o datos dinamicos
- Generando URLs con caracteres especiales, espacios o texto non-ASCII
- Parseando y recodificando URLs de fuentes externas de forma segura

## Solucion

### 1. encodeURI vs encodeURIComponent

```typescript
// encoding/UriComparison.ts
const url = 'https://example.com/search?q=hello world&sort=date';

// encodeURI: preserva caracteres de estructura de URL
encodeURI(url);
// 'https://example.com/search?q=hello%20world&sort=date'

// encodeURIComponent: codifica todo incluyendo caracteres de estructura
encodeURIComponent(url);
// 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26sort%3Ddate'

// Regla general:
// - encodeURI para URLs completas
// - encodeURIComponent para parametros de query individuales
```

### 2. Construccion Segura de Query Strings

```typescript
// encoding/QueryBuilder.ts
function buildQueryString(params: Record<string, string | number>): string {
  const pairs = Object.entries(params).map(([key, value]) => {
    return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
  });

  return pairs.join('&');
}

const query = buildQueryString({
  search: 'hello world',
  filter: 'type=news&date=today',
  emoji: '🔥',
});
// 'search=hello%20world&filter=type%3Dnews%26date%3Dtoday&emoji=%F0%9F%94%A5'
```

### 3. Decodificacion con Manejo de Casos Edge

```typescript
// encoding/SafeDecode.ts
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseQueryString(query: string): Record<string, string> {
  const params: Record<string, string> = {};

  query.replace(/^\?/, '').split('&').forEach((pair) => {
    const [key, value] = pair.split('=').map(safeDecodeURIComponent);
    if (key) params[key] = value || '';
  });

  return params;
}
```

### 4. API URLSearchParams

```typescript
// encoding/URLSearchParams.ts
const params = new URLSearchParams();

params.append('search', 'hello world');
params.append('tags', 'javascript');
params.append('tags', 'typescript');

params.toString();
// 'search=hello+world&tags=javascript&tags=typescript'

// Parsing
const url = new URL('https://example.com/?search=hello+world&tags=js&tags=ts');
url.searchParams.get('search');     // 'hello world'
url.searchParams.getAll('tags');    // ['js', 'ts']
url.searchParams.has('limit');     // false
```

### 5. Cumplimiento RFC 3986

```typescript
// encoding/RFC3986.ts
function encodeRFC3986(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function decodeRFC3986(str: string): string {
  return decodeURIComponent(str.replace(/\+/g, ' '));
}
```

### 6. Codificacion en Go

```go
// encoding/url.go
package main

import (
    "fmt"
    "net/url"
)

func main() {
    fmt.Println(url.QueryEscape("hello world"))  // hello+world
    fmt.Println(url.PathEscape("hello world"))   // hello%20world

    u := &url.URL{Scheme: "https", Host: "example.com", Path: "/search"}
    q := u.Query()
    q.Set("q", "hello world")
    u.RawQuery = q.Encode()
    fmt.Println(u.String())
    // https://example.com/search?q=hello+world
}
```

## Como Funciona

- **encodeURI** codifica caracteres especiales pero preserva delimitadores de URL
- **encodeURIComponent** codifica todo incluyendo delimitadores, haciendolo seguro para valores de query parameters
- **URLSearchParams** maneja plus signs, duplicate keys y codificacion round-trip automaticamente
- **RFC 3986** define que caracteres deben ser percent-encoded en cada componente de URI

## Consideraciones de Produccion

- Siempre codifica input de usuario antes de colocarlo en URLs
- Usa APIs `URL` y `URLSearchParams` cuando esten disponibles para correccion
- Maneja input malformed gracefulmente con try-catch alrededor de `decodeURIComponent`

## Errores Comunes

- Usar `encodeURI` en valores de query parameters, que deja `&` y `=` sin codificar
- No decodificar input antes de validacion, permitiendo que valores double-encoded evadan checks
- Asumir que `+` en URLs siempre significa espacio; depende del contexto (query vs path)

## FAQ

**P: Por que `+` a veces decodifica a espacio?**
R: En query strings, `+` es una codificacion legacy para espacio (application/x-www-form-urlencoded). En paths de URL, `+` significa plus literal y el espacio debe ser `%20`.

**P: Deberia usar `escape()`?**
R: No. `escape()` esta deprecado, no es standard e incorrectamente maneja caracteres non-ASCII. Siempre usa `encodeURIComponent`.
