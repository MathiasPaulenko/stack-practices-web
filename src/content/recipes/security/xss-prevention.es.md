---


contentType: recipes
slug: xss-prevention
title: "Prevenir Cross-Site Scripting (XSS)"
description: "Cómo sanitizar input de usuario, escapar output y usar Content Security Policy para prevenir ataques XSS en aplicaciones web."
metaDescription: "Aprende técnicas de prevención XSS. Escapa output, sanitiza HTML, usa headers CSP y valida input para proteger a los usuarios de ataques de cross-site scripting."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - input-validation
  - vulnerabilities
  - encryption
  - owasp
relatedResources:
  - /recipes/input-validation
  - /recipes/sql-injection-prevention
  - /recipes/handle-errors
  - /recipes/api-security-headers
  - /recipes/csrf-protection
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende técnicas de prevención XSS. Escapa output, sanitiza HTML, usa headers CSP y valida input para proteger a los usuarios de ataques de cross-site scripting."
  keywords:
    - prevención xss
    - cross site scripting
    - escaping html
    - content security policy
    - sanitización input
    - dom xss
    - reflected xss
    - stored xss


---

## Visión general

Cross-Site Scripting (XSS) es un ataque de inyección donde scripts maliciosos se incrustan en sitios web de confianza. Cuando una víctima visita la página comprometida, el script se ejecuta en su navegador con los mismos privilegios que el sitio legítimo, permitiendo a los atacantes robar cookies de sesión, capturar keystrokes, o realizar acciones en nombre del usuario.

XSS consistentemente aparece en el [OWASP Top 10](/guides/security-best-practices-guide/) porque es tanto común como peligroso. Los tres tipos principales son XSS reflejado (URL maliciosa dispara el script), XSS almacenado (script malicioso se guarda en la base de datos y se sirve a todos los usuarios), y XSS basado en DOM (JavaScript client-side escribe datos no confiables a la página sin escapar).

La defensa fundamental es simple pero frecuentemente olvidada: nunca confíes en el [input](/recipes/input-validation/) de usuario. Todos los datos de usuarios, APIs o fuentes externas deben ser escapados antes de renderizarse en HTML, JavaScript, CSS o URLs.

## Cuándo usarlo

Usa esta receta cuando:

- Renderizas contenido generado por usuarios en páginas web
- Construyes dashboards de admin, sistemas de comentarios o foros
- Manejas query parameters o fragmentos de URL en routing client-side
- Implementas editores de rich text o renderizadores de markdown
- Agregas widgets o embeds de terceros a tu aplicación
- Realizas auditorías de seguridad de código frontend

## Solución

### Escaping HTML (Server-Side)

```python
import html

user_input = '<script>alert("xss")</script>'
safe_output = html.escape(user_input)
# safe_output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

### Escaping automático de React

```jsx
// React escapa {expresiones} automáticamente — seguro por defecto
function UserProfile({ bio }) {
  return <div className="bio">{bio}</div>;
  // <script> se convierte en &lt;script&gt; automáticamente
}

// PELIGROSO — solo usar cuando controlas la fuente
function DangerousHtml({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### Content Security Policy (HTTP Header)

```http
Content-Security-Policy: default-src 'self';
  script-src 'self' https://trusted-cdn.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
```

### Sanitización de HTML (DOMPurify)

```javascript
import DOMPurify from 'dompurify';

const dirty = '<p>Hello</p><script>alert("xss")</script>';
const clean = DOMPurify.sanitize(dirty);
// clean: <p>Hello</p>
```

## Explicación

- **Escaping HTML**: Convierte caracteres como `<`, `>`, `"`, y `&` en entidades HTML para que los navegadores los traten como texto, no como markup.   Esta es la defensa más importante y debe aplicarse a todos los datos no confiables.
- **Escaping automático de React/Vue/Angular**: Los frameworks modernos escapan valores interpolados por defecto.   Las vulnerabilidades XSS usualmente ocurren cuando desarrolladores bypassan esto con `dangerouslySetInnerHTML`, `v-html`, o escape hatches similares.
- **Content Security Policy (CSP)**: Un mecanismo de seguridad del navegador que restringe dónde pueden cargarse scripts, estilos y otros recursos.   Incluso si un atacante inyecta un `<script>` tag, CSP previene su ejecución si la fuente no está en la lista blanca.
- **Sanitización de HTML**: Cuando necesitas permitir algo de HTML (como `<b>` o `<a>` tags en comentarios), usa un sanitizer para eliminar tags y atributos peligrosos mientras preservas markup seguro.

## Variantes

| Defensa | Capa | Efectividad | Mejor para |
|---------|------|-------------|------------|
| Escaping de output | Server/Client | Esencial | Todo dato no confiable en HTML |
| Headers CSP | Browser | Fuerte | Defensa en profundidad, bloqueo de scripts inline |
| Sanitización de HTML | Server/Client | Fuerte | Rich text, editores WYSIWYG |
| Cookies HttpOnly | Server | Fuerte | Prevención de robo de cookies de sesión |

## Lo que funciona

- **Escapa todos los datos no confiables**: parámetros de URL, inputs de formularios, campos de base de datos, respuestas de API, [uploads de archivos](/recipes/file-upload-validation/), e incluso headers HTTP pueden ser manipulados por atacantes.
- **Usa los defaults del framework**: deja que React, Vue o Angular manejen el escaping.
- **Implementa un CSP estricto**: empieza con `default-src 'self'` y pon en lista blanca solo los dominios requeridos.
- **Configura `HttpOnly` y `Secure` en cookies**: `HttpOnly` previene que JavaScript lea cookies de sesión, mitigando el impacto de XSS.
- **Valida input, no solo output**: rechaza caracteres inesperados en el boundary (ej.   solo permite usernames alfanuméricos) para que datos malos nunca entren a tu sistema.
- **Audita dependencias**: XSS también puede venir de paquetes npm comprometidos o scripts de terceros.

## Errores comunes

- **Usar `innerHTML` con input de usuario**: esta es la causa más común de XSS en JavaScript vanilla.
- **Escapar solo una vez**: si escapas datos antes de almacenarlos en la base de datos (`&lt;` se convierte en `&amp;lt;`), corrompes los datos.   Escapa en la capa de output, no en la capa de input.
- **Olvidar URLs y CSS**: `javascript:alert(1)` en un `href` o `expression()` en CSS pueden ejecutar código.   Valida URLs con listas blancas y sanitiza CSS.
- **CSP demasiado permisiva**: `script-src 'unsafe-inline' 'unsafe-eval' *` desactiva la mayor parte de la protección de CSP.   Sé específico con tu policy.
- **Confiar en validación client-side**: los atacantes bypassan checks del frontend por completo.   Todo escaping y validación debe ser enforceado server-side.

## Preguntas frecuentes

**P: ¿Es `dangerouslySetInnerHTML` de React seguro si escapo el input?**
R: Solo si escapas o sanitizas correctamente. Un solo error en tu lógica de escaping expone a tus usuarios. Prefiere librerías de sanitización como DOMPurify sobre escaping manual.

**P: ¿Puede CSP prevenir completamente XSS?**
R: No, pero eleva considerablemente la barrera. Un CSP estricto bloquea scripts inline y scripts externos no autorizados, convirtiendo XSS de una vulnerabilidad crítica en un no-problema en muchos casos.

**P: ¿Qué pasa con XSS basado en DOM?**
R: El XSS DOM ocurre cuando JavaScript client-side lee de `location.hash`, `document.URL`, o `localStorage` y escribe al DOM sin escapar. Trata todas las fuentes del DOM como no confiables y escapa antes de la inserción.

**P: ¿Debería escapar datos antes de almacenarlos en la base de datos?**
R: No. Almacena los datos raw y escapa en output. Escapar al almacenar significa que tus datos están atados a un formato de output específico (HTML) y los hace inutilizables para APIs JSON, emails, o generación de PDFs.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Escaping consciente del contexto (Python)

Diferentes contextos de output requieren diferentes reglas de escaping. HTML body, atributos, JavaScript y URLs cada uno necesita manejo específico:

```python
import html
import urllib.parse
import json


def escape_for_html(text: str) -> str:
    """Escapar para contexto HTML body."""
    return html.escape(text, quote=True)


def escape_for_attribute(text: str) -> str:
    """Escapar para contexto de atributo HTML."""
    return html.escape(text, quote=True)


def escape_for_javascript(text: str) -> str:
    """Escapar para contexto de string JavaScript."""
    # Usar JSON encoding para output seguro de string JS
    return json.dumps(text)


def escape_for_url(text: str) -> str:
    """Escapar para contexto de parámetro URL."""
    return urllib.parse.quote(text, safe='')


def safe_output(value: str, context: str = "html") -> str:
    """Aplicar escaping apropiado al contexto."""
    escapers = {
        "html": escape_for_html,
        "attribute": escape_for_attribute,
        "javascript": escape_for_javascript,
        "url": escape_for_url,
    }
    escaper = escapers.get(context, escape_for_html)
    return escaper(value)


# Uso en un template
user_name = '<script>alert("xss")</script>'
user_url = 'javascript:alert(1)'
user_data = '{"key":"value</script><script>alert(1)</script>"}'

# HTML body
print(f'<span>{safe_output(user_name, "html")}</span>')
# <span>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</span>

# Atributo
print(f'<a title="{safe_output(user_name, "attribute")}">link</a>')
# <a title="&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;">link</a>

# JavaScript
print(f'<script>var data = {safe_output(user_data, "javascript")};</script>')
# <script>var data = "{\"key\":\"value</script><script>alert(1)</script>\"}";</script>

# URL (también validar protocolo)
def safe_url(url: str) -> str:
    """Validar protocolo URL y escapar."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ('http', 'https', 'mailto', ''):
        return ''  # Bloquear javascript:, data:, etc.
    return escape_for_attribute(url)

print(f'<a href="{safe_url(user_url)}">click</a>')
# <a href="">click</a>  (javascript: bloqueado)
```

### DOMPurify con configuración personalizada

Para editores de rich text, configura DOMPurify para permitir tags específicas mientras bloquea las peligrosas:

```javascript
import DOMPurify from 'dompurify';

// Config personalizada: permitir enlaces y formato, bloquear iframes y scripts
const config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
    'blockquote', 'code', 'pre', 'h1', 'h2', 'h3',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
};

// Añadir un hook para forzar rel="noopener noreferrer" en todos los enlaces
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('rel', 'noopener noreferrer');
    node.setAttribute('target', '_blank');
  }
});

const dirty = `
  <p>Hello <a href="javascript:alert(1)">click</a></p>
  <iframe src="evil.com"></iframe>
  <script>alert("xss")</script>
  <img src=x onerror="alert(1)">
`;

const clean = DOMPurify.sanitize(dirty, config);
// clean: <p>Hello <a target="_blank" rel="noopener noreferrer">click</a></p>
// (iframe, script, img eliminados; javascript: href removido)
```

### Trusted Types API (Chrome/Edge)

Trusted Types enforce que solo valores sanitizados pueden asignarse a sinks peligrosos como `innerHTML`:

```javascript
// Definir una policy que sanitiza antes de insertar
const sanitizerPolicy = trustedTypes.createPolicy('sanitizer', {
  createHTML: (input) => DOMPurify.sanitize(input),
});

// Ahora innerHTML solo acepta TrustedHTML, no strings raw
// document.body.innerHTML = userInput; // TypeError en navegadores con TT
document.body.innerHTML = sanitizerPolicy.createHTML(userInput); // OK

// Content-Security-Policy header para enforcear:
// Content-Security-Policy: require-trusted-types-for 'script';
```

### CSP con nonces para scripts inline

Cuando necesitas scripts inline, usa nonces por-request en lugar de `unsafe-inline`:

```python
import secrets
from flask import Flask, render_template_string

app = Flask(__name__)

@app.route('/')
def index():
    # Generar un nonce único por request
    nonce = secrets.token_urlsafe(16)
    csp = (
        f"default-src 'self'; "
        f"script-src 'self' 'nonce-{nonce}'; "
        f"style-src 'self' 'nonce-{nonce}'; "
        f"img-src 'self' data: https:; "
        f"connect-src 'self' https://api.example.com; "
        f"object-src 'none'; "
        f"base-uri 'self'"
    )
    response = app.make_response(render_template_string(
        '''<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style nonce="{{ nonce }}">
                body { font-family: sans-serif; }
            </style>
        </head>
        <body>
            <h1>Hello</h1>
            <script nonce="{{ nonce }}">
                console.log("Safe inline script");
            </script>
        </body>
        </html>''',
        nonce=nonce
    ))
    response.headers['Content-Security-Policy'] = csp
    return response
```

### Renderizado de markdown con sanitización

Cuando renderizas markdown enviado por usuarios, sanitiza el output HTML:

```javascript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configurar marked para deshabilitar HTML raw
marked.setOptions({
  // No permitir pass-through de HTML raw
  sanitize: false, // marked deprecó sanitize; usar DOMPurify en su lugar
});

function renderMarkdown(markdownText) {
  // Paso 1: Convertir markdown a HTML
  const rawHtml = marked.parse(markdownText);

  // Paso 2: Sanitizar el output HTML
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'code', 'pre', 'a',
      'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'title', 'rel', 'target'],
  });

  return cleanHtml;
}

// Uso
const userInput = `
## Hello <script>alert("xss")</script>

[Click here](javascript:alert(1))

\`\`\`javascript
console.log("safe code block");
\`\`\`
`;

const safe = renderMarkdown(userInput);
// <h2>Hello </h2>
// <p><a>Click here</a></p>
// <pre><code class="language-javascript">console.log("safe code block");</code></pre>
```



