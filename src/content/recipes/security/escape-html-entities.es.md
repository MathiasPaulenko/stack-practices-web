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

## Soluciones Avanzadas

### Escaping específico por contexto para script

Embeber datos JSON dentro de tags `<script>` requiere más que HTML escaping. La secuencia `</script>` termina el bloque de script independientemente del encoding de entidades HTML:

```javascript
function safeJsonInScript(data) {
  // 1. Stringificar el JSON
  let json = JSON.stringify(data);

  // 2. Escapar el forward slash en secuencias </script>
  json = json.replace(/</g, '\\u003c');

  // 3. También escapar <!-- para prevenir inyección de comentarios HTML
  json = json.replace(/-->/g, '--\\u003e');

  return json;
}

// Uso en un template server-rendered
const userData = { name: 'John</script><script>alert(1)</script>', role: 'admin' };
const safeJson = safeJsonInScript(userData);
// Output: {"name":"John\\u003c/script>\\u003cscript>alert(1)\\u003c/script>","role":"admin"}
```

```python
import json
import re

def safe_json_for_script(data):
    """Serializar JSON seguro para embeber en tags <script>."""
    json_str = json.dumps(data)
    # Escapar <, >, y separadores de línea para prevenir breakout del contexto de script
    json_str = json_str.replace('<', '\\u003c')
    json_str = json_str.replace('>', '\\u003e')
    json_str = json_str.replace('\u2028', '\\u2028')  # Separador de línea
    json_str = json_str.replace('\u2029', '\\u2029')  # Separador de párrafo
    return json_str

# Uso en Flask/Jinja2
@app.route('/dashboard')
def dashboard():
    user_data = {'name': 'Alice', 'permissions': ['read', 'write']}
    return render_template('dashboard.html',
                           safe_data=safe_json_for_script(user_data))
```

### Escaping para contexto de URL

Las URLs en atributos `href` y `src` necesitan URL encoding, no solo HTML escaping. Usando URIs `javascript:`, los atacantes pueden ejecutar scripts:

```python
from urllib.parse import quote, urlparse

def safe_url(url):
    """Validar y sanitizar URLs para atributos href."""
    # Rechazar schemes javascript: y data:
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https', 'mailto', 'tel', ''):
        return ''  # Rechazar schemes peligrosos

    # Re-encodear la URL de forma segura
    return quote(url, safe=':/?&=%#')

# Uso
user_url = 'javascript:alert(1)'
print(safe_url(user_url))  # Output: '' (rechazada)

user_url2 = 'https://example.com/path?q=test'
print(safe_url(user_url2))  # Output: 'https://example.com/path?q=test'
```

```javascript
function safeUrl(url) {
  try {
    const parsed = new URL(url, window.location.origin);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}

// Uso en DOM
const link = document.createElement('a');
link.href = safeUrl(userInput);
if (link.href) {
  document.body.appendChild(link);
}
```

### Escaping para contexto CSS

Inyectar datos de usuario en CSS requiere su propio encoding. Datos sin escapar pueden romper el contexto CSS e inyectar markup:

```java
import org.owasp.encoder.Encode;

public class SafeCss {
    // Para contexto de string CSS
    public static String forCssString(String input) {
        return Encode.forCssString(input);
    }

    // Para contexto de URL CSS
    public static String forCssUrl(String input) {
        return Encode.forCssUrl(input);
    }
}

// Uso: <div style="color: {{userColor}}">
String safeColor = SafeCss.forCssString(userInput);
// Escapa backslash, comillas, angle brackets, y newlines
```

### Escaping de HTML en templates de Go

```go
package main

import (
    "html"
    "html/template"
    "net/http"
)

func renderTemplate(w http.ResponseWriter, r *http.Request) {
    tmpl, err := template.New("page").Parse(`
        <h1>{{.Title}}</h1>
        <p>{{.Content}}</p>
        <a href="{{.URL}}">Link</a>
    `)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    data := struct {
        Title   string
        Content string
        URL     string
    }{
        Title:   "<script>alert(1)</script>",
        Content: "User <b>comment</b> & more",
        URL:     "https://example.com",
    }

    // html/template auto-escapa por contexto
    tmpl.Execute(w, data)
}

// Escaping manual con html.EscapeString
func manualEscape(s string) string {
    return html.EscapeString(s)
}
```

### Wrapper seguro para dangerouslySetInnerHTML en React

Cuando debes renderizar HTML en React, envuélvelo con sanitización:

```jsx
import DOMPurify from 'dompurify';

function SafeHtml({ html, ...props }) {
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });

  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} {...props} />;
}

// Uso
function Comment({ text }) {
  // Si text es texto plano, usa children (auto-escaped)
  // Si text contiene HTML de una fuente confiable, usa SafeHtml
  return <SafeHtml html={text} />;
}
```

## Mejores Prácticas Adicionales

1. **Usa motores de templates con auto-escaping específico por contexto.** Los motores de templates modernos detectan el contexto (HTML body, atributo, script, style) y aplican el encoding correcto automáticamente:

```python
# Jinja2 con autoescape
from jinja2 import Environment, select_autoescape

env = Environment(autoescape=select_autoescape(['html', 'xml']))
template = env.from_string('<p>{{ user_input }}</p>')
# Jinja2 escapa <, >, &, ", ' automáticamente

# Django templates auto-escapa por defecto
# {{ user_input }} se escapa automáticamente
# Usa {% autoescape off %} solo para contenido confiable
```

2. **Setea `X-Content-Type-Options: nosniff` en respuestas.** Previene que navegadores hagan MIME-sniffing de contenido escapado como ejecutable:

```http
X-Content-Type-Options: nosniff
Content-Type: text/html; charset=utf-8
```

## Errores Comunes Adicionales

1. **Escapar para HTML body pero colocar datos en un contexto JavaScript.** El escaping de HTML no es suficiente dentro de bloques `<script>`. El string `</script>` no se ve afectado por el encoding de entidades HTML y terminará el contexto de script:

```html
<!-- INCORRECTO: datos HTML-escaped en contexto de script -->
<script>
  var userData = "{{ user_input | escapehtml }}";
  // Si user_input contiene </script>, el bloque de script termina
</script>

<!-- CORRECTO: Usar serialización JSON con < y > escapados -->
<script>
  var userData = {{ user_input | tojson | replace('<', '\\u003c') }};
</script>
```

2. **Confiar solo en el escaping del lado del cliente.** El escaping del lado del cliente puede ser bypassed si el servidor envía datos crudos. Siempre escapa en el servidor al renderizar HTML, y usa escaping del lado del cliente como defensa en profundidad:

```javascript
// El servidor debe escapar cuando hace SSR
app.get('/profile', (req, res) => {
  const user = getUser(req.params.id);
  // El motor de templates escapa automáticamente
  res.render('profile', { user });
});

// El cliente también debe escapar al actualizar dinámicamente
function updateProfileName(name) {
  document.getElementById('name').textContent = name; // Seguro
  // NO: document.getElementById('name').innerHTML = name;
}
```

## Preguntas Frecuentes Adicionales

### ¿Cómo escapo HTML en un fragmento de URL?

Los fragmentos de URL (`#fragment`) siguen reglas de URL encoding, no de HTML encoding. Usa `encodeURIComponent` en JavaScript o `urllib.parse.quote` en Python. HTML-encoding un fragmento de URL no prevendrá la inyección de URIs `javascript:`.

### ¿Cuál es el orden de encoding de OWASP?

OWASP recomienda encoding en este orden: 1) decodificar el input a su forma canónica, 2) validar el input contra allowlists, 3) encodear para el contexto de output específico (HTML, atributo, script, CSS, URL). Nunca encodees antes de validar — encodear primero puede ocultar patrones maliciosos de los validadores.

### ¿Puedo usar `textContent` en lugar de escaping?

Sí, `textContent` es inherentemente seguro porque el browser lo trata como texto literal, nunca como HTML. Si estás construyendo elementos DOM programáticamente, prefiere `textContent` sobre `innerHTML` con escaping manual. Sin embargo, para HTML server-rendered, todavía necesitas escaping de entidades ya que no hay API DOM disponible.
