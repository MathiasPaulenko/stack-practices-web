---
contentType: recipes
slug: generate-slugs
title: "Generar Slugs URL"
description: "Cómo generar slugs limpios y amigables para URLs desde strings en múltiples lenguajes."
metaDescription: "Aprende a generar slugs amigables para URLs desde strings en Python, JavaScript y Java. Slugs limpios y seguros para SEO en apps web."
difficulty: beginner
topics:
  - data
tags:
  - slug
  - url
  - sanitization
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-csv-files
  - /recipes/data/parse-json
  - /recipes/data/regular-expressions
  - /recipes/api/input-validation
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a generar slugs amigables para URLs desde strings en Python, JavaScript y Java. Slugs limpios y seguros para SEO en apps web."
  keywords:
    - slug
    - url
    - sanitization
    - python
    - javascript
    - java
---

## Visión General

Los slugs URL son identificadores legibles por humanos usados en direcciones web. Un slug bien formado mejora SEO, usabilidad y compartibilidad. Generar slugs involucra transliterar caracteres no ASCII, remover símbolos especiales, colapsar espacios en blanco y asegurar unicidad.

## Cuándo Usar

Usa este recurso cuando:
- Conviertas títulos de artículos, nombres de productos o contenido generado por usuarios en URLs permanentes
- Construyas CMSs, blogs, plataformas de e-commerce o cualquier app con URLs visibles para usuarios
- Normalices nombres de archivos para assets subidos para evitar problemas de encoding
- Crees rutas amigables para SEO para contenido multi-idioma

## Solución

### Python

```python
import re
import unicodedata

def generate_slug(text):
    # Normalizar unicode y remover acentos
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    # Minúsculas y reemplazar no alfanuméricos con guiones
    text = re.sub(r'[^\w\s-]', '', text.lower())
    # Colapsar múltiples guiones/espacios
    text = re.sub(r'[-\s]+', '-', text).strip('-_')
    return text

print(generate_slug("Hello, World! 2024"))  # hello-world-2024
print(generate_slug("Café & Crème Brûlée"))  # cafe-creme-brulee
```

### JavaScript

```javascript
function generateSlug(text) {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')  // Remover diacríticos
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[-\s]+/g, '-');
}

console.log(generateSlug("Hello, World! 2024"));  // hello-world-2024
console.log(generateSlug("Café & Crème Brûlée"));  // cafe-creme-brulee
```

```javascript
// Usando la popular librería slugify
// npm install slugify
import slugify from 'slugify';

slugify('Hello, World! 2024');  // hello-world-2024
slugify('Café & Crème Brûlée');  // cafe-creme-brulee
```

### Java

```java
import java.text.Normalizer;
import java.util.Locale;

public class SlugGenerator {
    public static String generateSlug(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFKD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.toLowerCase(Locale.ROOT)
            .replaceAll("[^\\w\\s-]", "")
            .replaceAll("[-\\s]+", "-")
            .replaceAll("^-+|$-+", "");
    }

    public static void main(String[] args) {
        System.out.println(generateSlug("Hello, World! 2024"));  // hello-world-2024
        System.out.println(generateSlug("Café & Crème Brûlée"));  // cafe-creme-brulee
    }
}
```

## Explicación

El algoritmo central es consistente entre lenguajes:
1. **Normalización Unicode** (`NFKD`) descompone caracteres acentuados en base + marca combinada, permitiendo remover diacríticos
2. **Minúsculas** asegura URLs insensibles a mayúsculas
3. **Eliminar caracteres especiales** excepto alfanuméricos, guiones y espacios
4. **Colapsar separadores** en guiones simples y trim guiones iniciales/finales

Esto produce strings ASCII-only, minúsculas, delimitados por guiones, seguros para URLs, nombres de archivo e IDs.

### Manejo de Scripts No Latinos

Para lenguajes como Chino, Japones, Arabe o Ruso, la normalizacion NFKD sola es insuficiente porque los caracteres no se descomponen en ASCII. Necesitas transliteracion:

```python
from slugify import slugify

print(slugify('ä½ å¥½ä¸–ç•Œ'))  # ni-hao-shi-jie
print(slugify('ÐŸÑ€Ð¸Ð²ÐµÑ‚ Ð¼Ð¸Ñ€'))  # privet-mir
```

```javascript
import slugify from '@sindresorhus/slugify';

console.log(slugify('ä½ å¥½ä¸–ç•Œ'));  // ni-hao-shi-jie
```

Si la transliteracion no esta disponible, genera un ID aleatorio o usa un sufijo numerico como fallback.

### Python con Manejo de Unicidad

```python
import re
import unicodedata

def generate_slug(text, existing_slugs=None, max_length=100):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^\w\s-]', '', text.lower())
    text = re.sub(r'[-\s]+', '-', text).strip('-_')
    text = text[:max_length].rstrip('-')

    if existing_slugs is None:
        return text

    base = text
    counter = 2
    while text in existing_slugs:
        suffix = f'-{counter}'
        text = base[:max_length - len(suffix)] + suffix
        counter += 1
    return text

existing = {'hello-world', 'hello-world-2'}
print(generate_slug('Hello World', existing))  # hello-world-3
```

### JavaScript con Opciones Custom

```javascript
function generateSlug(text, options = {}) {
  const {
    replacement = '-',
    remove = /[^\w\s-]/g,
    lower = true,
    strict = true,
  } = options;

  let result = text
    .normalize('NFKD')
.replace(/[\u0300-\u036f]/g, '')
.replace(remove, '')
    .trim()
.replace(/[-\s]+/g, replacement);

  if (lower) result = result.toLowerCase();
  if (strict) result = result.replace(/[^a-z0-9-]/g, '');

  return result;
}
```

### Go (Usando golang.org/x/text)

```go
package main

import (
    "fmt"
    "regexp"
    "strings"
    "unicode"
    "golang.org/x/text/unicode/norm"
)

func generateSlug(text string) string {
    t := norm.NFKD.String(text)

    var b strings.Builder
    for _, r := range t {
        if unicode.Is(unicode.Mn, r) {
            continue
        }
        b.WriteRune(r)
    }
    text = b.String()
    text = strings.ToLower(text)

    reg := regexp.MustCompile(`[^a-z0-9]+`)
    text = reg.ReplaceAllString(text, "-")

    return strings.Trim(text, "-")
}
```

## Variantes

| Tecnología | Librería | Enfoque | Notas |
|------------|----------|---------|-------|
| Python | `python-slugify` | `slugify()` | Maneja unicode, soporta reglas específicas por idioma |
| Python | `unicodedata` + `re` | Manual | Sin dependencias, control total |
| JavaScript | `slugify` | `slugify()` | Ligera, soporta reemplazos custom |
| JavaScript | Manual | `normalize()` + regex | Cero dependencias |
| Java | `slugify` (Maven) | `Slugify` | Soporta reemplazos custom y reglas por idioma |
| Java | `Normalizer` + regex | Manual | Incluido en JDK, sin deps externas |
| Go | `golang.org/x/text` | `norm.NFKD` + regex | Stdlib extendido, sin deps de terceros |

## Lo que funciona

- **Siempre normaliza Unicode** antes de quitar acentos para manejar é, ñ, ä¸­æ–‡ correctamente
- **Impón longitud máxima** (ej. 100 caracteres) para prevenir URLs excesivamente largas y problemas de base de datos
- **Verifica unicidad** contra slugs existentes en tu base de datos; añade `-2`, `-3` si es necesario
- **Evita guiones iniciales/finales** que se ven poco profesionales y pueden romper resolución de URLs relativas
- **Usa minúsculas exclusivamente**; las URLs son case-sensitive en la mayoría de servidores Unix

## Errores Comunes

- **Quitar acentos sin normalización NFKD**: `é` permanece como `é` en lugar de convertirse en `e`
- **Permitir caracteres reservados de URL**: `#`, `%`, `?`, `&` tienen significado especial en URLs y deben removerse
- **No limitar longitud del slug**: Slugs extremadamente largos dañan legibilidad y pueden exceder límites de columnas de base de datos
- **Ignorar slugs duplicados**: Dos artículos con el mismo título colisionarán sin una estrategia de unicidad
- **Traducir en lugar de transliterar**: Traducir "hello" al español no es lo mismo que hacerlo seguro para URLs
- **No manejar slugs vacios**: si el input es completamente caracteres especiales, el slug queda vacio. Agrega un fallback como `untitled` o un ID aleatorio
- **Usar underscores en lugar de guiones**: los underscores son validos en URLs pero Google trata los guiones como separadores de palabras, mejorando SEO
- **No colapsar separadores consecutivos**: `hello---world` se ve roto. Siempre colapsa multiples guiones en uno solo

## Preguntas Frecuentes

### ¿Cómo manejo scripts completamente no latinos como Chino o àrabe?

Para Chino, usa librerías de romanización Pinyin (`pypinyin` en Python, `pinyin` en JS). Para àrabe, Persa o Cirílico, usa librerías de transliteración (`unidecode`, `transliteration`). Como fallback, genera un ID aleatorio o usa un sufijo numérico.

### ¿Los slugs deben ser únicos globalmente o por usuario?

Depende de la estructura de tus URLs. Si las URLs son `/posts/:slug`, los slugs deben ser globalmente únicos. Si son `/:username/:slug`, la unicidad solo necesita asegurarse por usuario. Siempre indexa la columna slug para búsquedas rápidas.

### ¿Puedo cambiar un slug después de publicar?

Cambiar slugs rompe links existentes y bookmarks. Si debes cambiar un slug, implementa un redirect 301 del slug antiguo al nuevo. Almacena el slug antiguo en una tabla de redirects para preservar valor SEO.

### ¿Debo almacenar slugs en la base de datos o generarlos on the fly?

Almacenalos. Generar slugs on the fly significa que un cambio de titulo rompe URLs silenciosamente. Almacena el slug como columna con un indice unico. Cuando el titulo cambia, decide si actualizar el slug (con un redirect) o mantener el viejo.

### ¿Como manejo colisiones de slugs a escala?

Para sitios de alto trafico, anadir `-2`, `-3` puede llevar a race conditions. Usa una transaccion de base de datos con `SELECT ... FOR UPDATE` para chequear e insertar atomicamente. Alternativamente, anade un sufijo aleatorio corto (ej. 4 caracteres) para garantizar unicidad sin un lookup.

### ¿Cual es la longitud ideal de un slug?

Manten slugs entre 3 y 75 caracteres. Los motores de busqueda truncan URLs alrededor de 60-75 caracteres en paginas de resultados. Slugs cortos (menos de 3 caracteres) son ambiguos y pueden conflictuar con rutas reservadas. Trunca en el ultimo limite de palabra completo para evitar partir palabras.

### ¿Como slugifico contenido con emojis?

Remueve emojis enteramente. La mayoria de URL parsers y browsers no manejan URLs con emoji de forma confiable. En Python, usa `re.sub(r'[\U0001F600-\U0001F64F]', '', text)` o la libreria `emoji` para removerlos. En JavaScript, usa `text.replace(/\p{Extended_Pictographic}/gu, '')`.

### ¿Son los slugs case-sensitive?

Tecnicamente, las URLs son case-sensitive segun RFC 3986. En la practica, la mayoria de servidores las tratan como case-insensitive, pero no esta garantizado. Siempre usa minusculas para evitar ambiguedad. Algunos servidores (nginx, Apache) pueden configurarse para redirigir URLs en mayusculas a minusculas para consistencia.

### ¿Que librerias manejan transliteracion para scripts no latinos?

En Python, `python-slugify` incluye transliteracion para la mayoria de scripts. `unidecode` maneja muchos scripts pero produce output ASCII-only. En JavaScript, `@sindresorhus/slugify` y el paquete `transliteration` cubren Chino, Cirilico y Arabe. En Java, `junidecode` provee funcionalidad similar. Testea con tu contenido real — la calidad de transliteracion varia entre librerias.

### ¿Debo usar guiones o underscores en slugs?

Usa guiones. Google trata los guiones como separadores de palabras, lo que mejora el SEO. Los underscores son validos en URLs pero Google no los reconoce como separadores de palabras, por lo que `hello_world` se interpreta como una sola palabra.
