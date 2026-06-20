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
relatedResources:
  - /recipes/input-validation
  - /recipes/sql-injection-prevention
  - /recipes/handle-errors
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

XSS consistentemente aparece en el [OWASP Top 10](/guides/security/security-best-practices-guide) porque es tanto común como peligroso. Los tres tipos principales son XSS reflejado (URL maliciosa dispara el script), XSS almacenado (script malicioso se guarda en la base de datos y se sirve a todos los usuarios), y XSS basado en DOM (JavaScript client-side escribe datos no confiables a la página sin escapar).

La defensa fundamental es simple pero frecuentemente olvidada: nunca confíes en el [input](/recipes/api/input-validation) de usuario. Todos los datos de usuarios, APIs o fuentes externas deben ser escapados antes de renderizarse en HTML, JavaScript, CSS o URLs.

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

- **Escaping HTML**: Convierte caracteres como `<`, `>`, `"`, y `&` en entidades HTML para que los navegadores los traten como texto, no como markup. Esta es la defensa más importante y debe aplicarse a todos los datos no confiables.
- **Escaping automático de React/Vue/Angular**: Los frameworks modernos escapan valores interpolados por defecto. Las vulnerabilidades XSS usualmente ocurren cuando desarrolladores bypassan esto con `dangerouslySetInnerHTML`, `v-html`, o escape hatches similares.
- **Content Security Policy (CSP)**: Un mecanismo de seguridad del navegador que restringe dónde pueden cargarse scripts, estilos y otros recursos. Incluso si un atacante inyecta un `<script>` tag, CSP previene su ejecución si la fuente no está en la lista blanca.
- **Sanitización de HTML**: Cuando necesitas permitir algo de HTML (como `<b>` o `<a>` tags en comentarios), usa un sanitizer para eliminar tags y atributos peligrosos mientras preservas markup seguro.

## Variantes

| Defensa | Capa | Efectividad | Mejor para |
|---------|------|-------------|------------|
| Escaping de output | Server/Client | Esencial | Todo dato no confiable en HTML |
| Headers CSP | Browser | Fuerte | Defensa en profundidad, bloqueo de scripts inline |
| Sanitización de HTML | Server/Client | Fuerte | Rich text, editores WYSIWYG |
| Cookies HttpOnly | Server | Fuerte | Prevención de robo de cookies de sesión |

## Mejores prácticas

- **Escapa todos los datos no confiables**: parámetros de URL, inputs de formularios, campos de base de datos, respuestas de API, [uploads de archivos](/recipes/file-handling/file-upload-validation), e incluso headers HTTP pueden ser manipulados por atacantes.
- **Usa los defaults del framework**: deja que React, Vue o Angular manejen el escaping. Solo usa inserción de HTML raw cuando sea absolutamente necesario y sanitiza el input primero.
- **Implementa un CSP estricto**: empieza con `default-src 'self'` y pon en lista blanca solo los dominios requeridos. Evita `'unsafe-inline'` y `'unsafe-eval'` para scripts.
- **Configura `HttpOnly` y `Secure` en cookies**: `HttpOnly` previene que JavaScript lea cookies de sesión, mitigando el impacto de XSS. `Secure` asegura que las cookies solo se envíen sobre HTTPS.
- **Valida input, no solo output**: rechaza caracteres inesperados en el boundary (ej. solo permite usernames alfanuméricos) para que datos malos nunca entren a tu sistema.
- **Audita dependencias**: XSS también puede venir de paquetes npm comprometidos o scripts de terceros. Usa `npm audit` y [audita dependencias](/guides/security/security-best-practices-guide) cargadas desde dominios externos.

## Errores comunes

- **Usar `innerHTML` con input de usuario**: esta es la causa más común de XSS en JavaScript vanilla. Usa `textContent` en su lugar para texto plano.
- **Escapar solo una vez**: si escapas datos antes de almacenarlos en la base de datos (`&lt;` se convierte en `&amp;lt;`), corrompes los datos. Escapa en la capa de output, no en la capa de input.
- **Olvidar URLs y CSS**: `javascript:alert(1)` en un `href` o `expression()` en CSS pueden ejecutar código. Valida URLs con listas blancas y sanitiza CSS.
- **CSP demasiado permisiva**: `script-src 'unsafe-inline' 'unsafe-eval' *` desactiva la mayor parte de la protección de CSP. Sé específico con tu policy.
- **Confiar en validación client-side**: los atacantes bypassan checks del frontend por completo. Todo escaping y validación debe ser enforceado server-side.

## Preguntas frecuentes

**P: ¿Es `dangerouslySetInnerHTML` de React seguro si escapo el input?**
R: Solo si escapas o sanitizas correctamente. Un solo error en tu lógica de escaping expone a tus usuarios. Prefiere librerías de sanitización como DOMPurify sobre escaping manual.

**P: ¿Puede CSP prevenir completamente XSS?**
R: No, pero eleva significativamente la barrera. Un CSP estricto bloquea scripts inline y scripts externos no autorizados, convirtiendo XSS de una vulnerabilidad crítica en un no-problema en muchos casos.

**P: ¿Qué pasa con XSS basado en DOM?**
R: El XSS DOM ocurre cuando JavaScript client-side lee de `location.hash`, `document.URL`, o `localStorage` y escribe al DOM sin escapar. Trata todas las fuentes del DOM como no confiables y escapa antes de la inserción.

**P: ¿Debería escapar datos antes de almacenarlos en la base de datos?**
R: No. Almacena los datos raw y escapa en output. Escapar al almacenar significa que tus datos están atados a un formato de output específico (HTML) y los hace inutilizables para APIs JSON, emails, o generación de PDFs.

