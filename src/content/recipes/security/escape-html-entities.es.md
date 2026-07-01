---
contentType: recipes
slug: escape-html-entities
title: "Escapar Entidades HTML"
description: "Cómo escapar entidades HTML para prevenir ataques XSS en Python, Java y JavaScript."
metaDescription: "Aprende a escapar entidades HTML en Python, Java y JavaScript. Previene cross-site scripting con ejemplos prácticos de código."
difficulty: beginner
topics:
  - security
tags:
  - html
  - escaping
  - xss
  - security
  - encoding
  - python
  - javascript
  - java
relatedResources:
  - /recipes/security/sanitize-user-input
  - /recipes/data/parse-markdown-files
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a escapar entidades HTML en Python, Java y JavaScript. Previene cross-site scripting con ejemplos prácticos de código."
  keywords:
    - html
    - escaping
    - xss
    - security
    - encoding
    - python
    - javascript
    - java
---
## Visión General

El escaping de entidades HTML convierte caracteres con significado especial en HTML (`<`, `>`, `&`, `"`, `'`) en sus referencias de entidad correspondientes (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#x27;`). Sin escaping, datos no confiables pueden inyectar markup o scripts, resultando en cross-site scripting (XSS). Esta recipe cubre escaping de HTML en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Renderices contenido generado por usuarios dentro de templates HTML
- Construyas strings HTML en vivo a partir de datos externos (APIs, bases de datos, archivos)
- Generes emails HTML que incluyan nombres o direcciones de destinatarios
- Embebas datos JSON dentro de tags `<script>` de forma segura

## Solución

### Python

```python
# html.escape (Python 3.2+)
import html

user_input = '<script>alert("xss")</script>'
safe = html.escape(user_input)
print(safe)
# Output: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
```

```python
# MarkupSafe para templates Jinja2 (escaping automático)
# pip install markupsafe
from markupsafe import Markup, escape

def render_comment(text):
    return Markup('<p>{}</p>').format(escape(text))
```

### JavaScript

```javascript
// Mapa manual de entidades para escaping liviano
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

const userInput = '<img src=x onerror=alert(1)>';
console.log(escapeHtml(userInput));
// Output: '&lt;img src=x onerror=alert(1)&gt;'
```

```javascript
// Usando DOM API en entornos de browser
function escapeHtmlDom(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Java

```java
// Apache Commons Text StringEscapeUtils
// Maven: org.apache.commons:commons-text
import org.apache.commons.text.StringEscapeUtils;

public class HtmlEscaper {
    public static String escape(String input) {
        return StringEscapeUtils.escapeHtml4(input);
    }
}
```

```java
// OWASP Java Encoder
// Maven: org.owasp.encoder:encoder
import org.owasp.encoder.Encode;

public class SafeHtml {
    public static String escapeForBody(String input) {
        return Encode.forHtml(input);
    }
    public static String escapeForAttribute(String input) {
        return Encode.forHtmlAttribute(input);
    }
}
```

## Explicación

El escaping de HTML es un encoding específico por contexto. En el body de un elemento HTML, `<` debe convertirse en `&lt;` para que el browser lo trate como texto literal, no como inicio de un tag. Dentro de un atributo HTML delimitado por comillas dobles, `"` debe convertirse en `&quot;` para evitar que el atributo se cierre prematuramente. Dentro de un bloque `<script>`, se necesita encoding adicional de JavaScript porque `</script>` puede terminar el contexto de script incluso si está HTML-escaped.

El `html.escape` de Python cubre los cinco caracteres críticos. `MarkupSafe` es el motor detrás del auto-escaping de Jinja2 y está probado en batalla. En JavaScript, el reemplazo manual con regex es suficiente para la mayoría de los casos; el enfoque de DOM API es más seguro pero solo funciona en browsers. El `StringEscapeUtils` de Java maneja entidades HTML4 comprehensivamente, mientras que OWASP Encoder proporciona control fino por contexto.

## Variantes

| Tecnología | Librería / Enfoque | Contexto | Notas |
|------------|-------------------|----------|-------|
| Python | `html.escape` | HTML body | Stdlib, cubre `< > & " '` |
| Python | `markupsafe.escape` | Templates | Usado por Jinja2, auto-escapa por defecto |
| JavaScript | Regex manual | HTML body | Liviano, sin dependencias |
| JavaScript | DOM `textContent` | HTML body | Solo browser, maneja todas las entidades |
| Java | `StringEscapeUtils.escapeHtml4` | HTML body | Apache Commons, cubre muchas entidades |
| Java | `Encode.forHtml` | HTML body + atributos | OWASP, variantes específicas por contexto |

## Lo que funciona

- **Escapa en el punto de renderizado**, no en almacenamiento: Datos escapados en una base de datos hacen que búsqueda y display sean inconsistentes
- **Usa motores de templates con auto-escaping**: Jinja2, Django templates, React JSX y Vue templates escapan por defecto
- **El contexto importa**: HTML body, atributo HTML, CSS, JavaScript y contextos de URL requieren reglas de encoding diferentes
- **Evita `innerHTML` con strings crudos**: Usa `textContent` o template literals con funciones de escaping
- **Audita componentes de terceros**: Librerías que bypassan escaping (ej. `dangerouslySetInnerHTML` en React) deben revisarse cuidadosamente

## Errores Comunes

- **Escapar demasiado temprano**: Sanitizar al input y almacenar texto escapado rompe búsqueda full-text y ordenamiento
- **Doble escaping**: `&lt;` renderizado de nuevo se convierte en `&amp;lt;`, mostrando `&lt;` literal a los usuarios
- **Encoding de contexto equivocado**: Strings HTML-escaped son inseguros dentro de contextos JavaScript sin encoding JS adicional
- **Usar `innerHTML` para texto de usuario**: Incluso si la fuente es "confiable", `innerHTML` es innecesario y riesgoso; prefiere `textContent`
- **Ignorar contexto de atributo**: `href="{{ userUrl }}"` necesita URL encoding, no solo HTML encoding

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre HTML escaping y HTML sanitization?

Escaping transforma cada carácter especial en una referencia de entidad, preservando el texto original pero haciéndolo inerte. Sanitization remueve o altera markup peligroso (ej. eliminando tags `<script>`) mientras preserva HTML seguro como `<b>`. Escapa cuando no necesites HTML; sanitiza cuando aceptes un subconjunto de HTML.

### ¿Necesito escapar datos dentro de respuestas JSON?

No. Las respuestas JSON no son contextos HTML. Escapa JSON solo cuando lo embebas dentro de una página HTML, como en un tag `<script>` o un atributo HTML. En esos casos, escapa el string JSON para el contexto HTML, y si está dentro de `<script>`, evita también secuencias `</script>`.

### ¿Debo escapar comillas simples (`'`) o solo comillas dobles (`"`)?

Escapa ambas. En atributos HTML, las comillas simples pueden delimitar atributos (`attr='value'`), así que comillas simples sin escapar rompen el atributo. OWASP Encoder escapa ambas por defecto. El `html.escape` de Python escapa comillas simples cuando `quote=True` (por defecto desde Python 3.8).
