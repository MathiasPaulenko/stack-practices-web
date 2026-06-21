---
contentType: recipes
slug: truncate-text
title: "Truncar Texto"
description: "Cómo truncar texto con ellipsis y límites de palabras en Python, Java y JavaScript."
metaDescription: "Aprende a truncar texto en Python, Java y JavaScript. Preserva límites de palabras y añade ellipsis con ejemplos prácticos de código."
difficulty: beginner
topics:
  - data
tags:
  - text
  - truncation
  - formatting
  - strings
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-pdf-files
  - /recipes/data/convert-csv-to-json
  - /recipes/data/convert-json-to-csv
  - /recipes/data/diff-json-objects
  - /recipes/data/generate-slugs
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a truncar texto en Python, Java y JavaScript. Preserva límites de palabras y añade ellipsis con ejemplos prácticos de código."
  keywords:
    - text
    - truncation
    - formatting
    - strings
    - python
    - javascript
    - java
---
## Visión General

Truncar texto es una tarea común de UI y procesamiento de datos: previews, snippets de notificaciones, resúmenes de resultados de búsqueda y exports de CSV necesitan cortar strings largos a una longitud máxima sin romper palabras o HTML. Esta recipe cubre truncamiento basado en caracteres, límites de palabras y truncamiento consciente de HTML en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Muestres previews de artículos, resúmenes de comentarios o descripciones de productos con links "Leer más"
- Exportes datos de reportes a columnas de ancho fijo o spreadsheets
- Generes líneas de asunto de email o cuerpos de notificaciones push con límites de longitud de plataforma
- Recortes contenido generado por usuarios antes de almacenar o indexar

## Solución

### Python

```python
# Truncamiento basado en caracteres con ellipsis
def truncate(text: str, max_length: int = 100) -> str:
    if len(text) <= max_length:
        return text
    return text[:max_length - 3].rstrip() + '...'

print(truncate("This is a very long sentence that needs to be shortened."))
# Output: 'This is a very long sentence that needs to be shor...'
```

```python
# Truncamiento por límite de palabras con textwrap
import textwrap

def truncate_words(text: str, max_length: int = 100) -> str:
    if len(text) <= max_length:
        return text
    shortened = textwrap.shorten(text, width=max_length, placeholder='...')
    return shortened

print(truncate_words("This is a very long sentence that needs to be shortened."))
# Output: 'This is a very long sentence that needs to be...'
```

### JavaScript

```javascript
// Truncamiento basado en caracteres
function truncate(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trimEnd() + '...';
}

console.log(truncate("This is a very long sentence that needs to be shortened."));
// Output: 'This is a very long sentence that needs to be shor...'
```

```javascript
// Truncamiento por límite de palabras
function truncateWords(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

console.log(truncateWords("This is a very long sentence that needs to be shortened."));
// Output: 'This is a very long sentence that needs to be...'
```

### Java

```java
// Apache Commons Lang StringUtils
// Maven: org.apache.commons:commons-lang3
import org.apache.commons.lang3.StringUtils;

public class TextTruncator {
    public static String truncate(String text, int maxLength) {
        return StringUtils.abbreviate(text, maxLength);
    }
}

// truncate("This is a very long sentence...", 30)
// Output: "This is a very long sente..."
```

```java
// Truncamiento por límite de palabras con Streams
import java.util.Arrays;
import java.util.stream.Collectors;

public class WordTruncator {
    public static String truncateWords(String text, int maxLength) {
        String[] words = text.split(" ");
        StringBuilder result = new StringBuilder();
        for (String word : words) {
            if (result.length() + word.length() + 1 > maxLength) break;
            if (result.length() > 0) result.append(" ");
            result.append(word);
        }
        return result.toString() + (result.length() < text.length() ? "..." : "");
    }
}
```

## Explicación

El truncamiento por caracteres es directo pero puede dividir palabras por la mitad, produciendo salida incómoda como "shor...". El truncamiento por límite de palabras busca hacia atrás desde el punto de corte hasta el espacio más cercano, preservando legibilidad. `textwrap.shorten` (Python) maneja tanto truncamiento por caracteres como por palabras con una sola llamada. JavaScript requiere slicing manual y búsqueda de índice. El `StringUtils.abbreviate` de Java hace truncamiento por caracteres por defecto; la lógica por límite de palabras debe construirse manualmente o con una librería como `Truncation`.

El truncamiento consciente de HTML es más complejo: debes cerrar cualquier tag abierto antes de añadir el ellipsis, o usar un parser HTML dedicado. Para texto plano, el truncamiento por límite de palabras suele ser el mejor balance entre simplicidad y legibilidad.

## Variantes

| Tecnología | Librería / Enfoque | Estrategia | Notas |
|------------|-------------------|------------|-------|
| Python | Slicing + ellipsis | Caracter | Rápido, simple, puede dividir palabras |
| Python | `textwrap.shorten` | Palabra + caracter | Stdlib, maneja breaks de palabras elegantemente |
| JavaScript | `slice` + `trimEnd` | Caracter | Rápido, built-in, sin dependencias |
| JavaScript | `lastIndexOf(' ')` | Palabra | Manual, sin dependencias |
| Java | `StringUtils.abbreviate` | Caracter | Apache Commons, placeholder configurable |
| Java | Custom stream builder | Palabra | Control total sobre delimitador y ellipsis |

## Mejores Prácticas

- **Respeta límites de palabras para texto de UI**: "La legibilidad es más importante que el conteo exacto de caracteres en strings orientados al usuario"
- **Usa truncamiento por caracteres para output de máquina**: Archivos de ancho fijo, columnas de base de datos y logs necesitan longitudes exactas
- **Elimina espacios en blanco antes de medir**: Espacios al inicio/final distorsionan cálculos de longitud y producen `"..."` en strings vacíos
- **Maneja surrogate pairs y caracteres combinados**: El `length` de JavaScript cuenta unidades de código UTF-16, no clusters de grafemas; usa `Intl.Segmenter` para conteo Unicode apropiado
- **Añade atributos title para links truncados**: `<a title="Texto completo">truncado...</a>` mejora accesibilidad

## Errores Comunes

- **Dividir tags HTML**: Truncar HTML crudo en la posición 100 puede romper `<a href="...` a mitad de tag; usa un parser HTML o elimina tags primero
- **Olvidar añadir longitud de ellipsis**: Un límite de 100 caracteres con `...` significa que el slice debe terminar en 97, no 100
- **No manejar caracteres multibyte**: Un slice de 20 caracteres de texto japonés puede cortar un kanji de 2 bytes por la mitad en algunas codificaciones
- **Trimming antes del length check**: `trim()` luego slice puede aún exceder el límite si el string original no tenía espacios trailing
- **Asumir que los espacios son el único límite de palabra**: Guiones, em-dashes y caracteres CJK tienen reglas de boundary diferentes

## Preguntas Frecuentes

### ¿Cómo trunco HTML sin romper tags?

Usa una librería consciente de HTML. Python tiene `html-truncate` y `BeautifulSoup`; JavaScript tiene `truncate-html`; Java tiene `Jsoup` combinado con traversing manual de nodos. La regla es: cuenta caracteres de texto visible, y cuando se alcanza el límite, cierra todos los tags abiertos antes de añadir el ellipsis.

### ¿Cómo manejo clusters de grafemas Unicode al truncar?

Un cluster de grafema es lo que un humano percibe como un carácter (ej. emoji con modificadores de tono de piel). El `.length` de JavaScript cuenta unidades de código UTF-16, no grafemas. Usa `Intl.Segmenter` (browsers modernos) o el paquete `grapheme-splitter`. En Python, `len()` cuenta code points; usa la librería `grapheme` para conteo real de clusters. En Java, usa `BreakIterator.getCharacterInstance()`.

### ¿Debo truncar del lado del cliente o del servidor?

Para previews de UI, el truncamiento del cliente con CSS (`text-overflow: ellipsis`) es el más simple y preserva el texto completo para screen readers. Para exports de longitud fija, constraints de base de datos o snippets de resultados de búsqueda, trunca del lado del servidor. El truncamiento del servidor es necesario cuando el texto completo es demasiado grande para transferir al cliente.
