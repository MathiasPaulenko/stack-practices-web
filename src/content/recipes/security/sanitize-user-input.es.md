---
contentType: recipes
slug: sanitize-user-input
title: "Sanitizar Input de Usuario"
description: "Cómo sanitizar y validar input de usuario en Python, Java y JavaScript para prevenir ataques de inyección."
metaDescription: "Aprende a sanitizar input de usuario en Python, Java y JavaScript. Previene XSS, SQL injection y command injection con ejemplos de código."
difficulty: beginner
topics:
  - security
tags:
  - sanitization
  - input-validation
  - xss
  - sql-injection
  - security
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/generate-slugs
  - /recipes/security/escape-html-entities
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a sanitizar input de usuario en Python, Java y JavaScript. Previene XSS, SQL injection y command injection con ejemplos de código."
  keywords:
    - sanitization
    - input-validation
    - xss
    - sql-injection
    - security
    - python
    - javascript
    - java
---
## Visión General

El input de usuario no confiable es la causa raíz de la mayoría de las vulnerabilidades en aplicaciones web: XSS, SQL injection, command injection, path traversal y header injection. La sanitización transforma input crudo en datos seguros y normalizados. La validación verifica que los datos sanitizados cumplan con restricciones estructurales y semánticas. Esta recipe muestra cómo sanitizar y validar input en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Aceptes datos de formularios, query parameters o JSON bodies de clientes web
- Proceses uploads de archivos o rutas de archivo proporcionadas por usuarios
- Renderices contenido generado por usuarios en HTML, email o logs
- Pases valores de usuario a comandos de OS, queries SQL o filtros NoSQL

## Solución

### Python

```python
# Sanitización HTML con bleach
# pip install bleach
import bleach

def sanitize_html(text: str) -> str:
    allowed_tags = ['p', 'br', 'strong', 'em']
    allowed_attrs = {}
    return bleach.clean(text, tags=allowed_tags, attributes=allowed_attrs, strip=True)

user_input = '<script>alert("xss")</script><p>Hello</p>'
print(sanitize_html(user_input))
# Output: '<p>Hello</p>'
```

```python
# Parametrización SQL segura con psycopg2
import psycopg2

def get_user_by_email(email: str):
    conn = psycopg2.connect("dbname=test")
    cur = conn.cursor()
    # Nunca uses f-strings o % formatting para SQL
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    return cur.fetchone()
```

### JavaScript

```javascript
// DOMPurify para sanitización HTML del lado del browser
// npm install dompurify jsdom (uso en Node.js)
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const dirty = '<img src=x onerror=alert(1)><b>Hello</b>';
console.log(DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ['b'] }));
// Output: '<b>Hello</b>'
```

```javascript
// express-validator para validación de input de rutas
// npm install express-validator
import { body, validationResult } from 'express-validator';

app.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    // Seguro para continuar
  }
);
```

### Java

```java
// JSoup para sanitización HTML
// Maven: org.jsoup:jsoup
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

public class HtmlSanitizer {
    public static String sanitize(String input) {
        return Jsoup.clean(input, Safelist.basic());
    }
}
```

```java
// OWASP Java Encoder para encoding específico por contexto
// Maven: org.owasp.encoder:encoder
import org.owasp.encoder.Encode;

public class SafeOutput {
    public static void renderUserContent(String userInput) {
        String safeForHtml = Encode.forHtml(userInput);
        String safeForJs = Encode.forJavaScript(userInput);
        String safeForCss = Encode.forCssString(userInput);
    }
}
```

## Explicación

La sanitización y validación son capas complementarias. La sanitización remueve o escapa constructos peligrosos antes de que la validación se ejecute. La validación rechaza datos que no coinciden con schemas, tipos o rangos esperados. Por ejemplo, un campo de email debe validarse con regex o librería dedicada, y luego escaparse en HTML antes de renderizar en un template.

El `bleach` de Python es ideal para campos de rich-text porque permite una allow-list explícita de tags. `DOMPurify` (JS) y `JSoup` (Java) sirven el mismo propósito. Para SQL, las queries parametrizadas son el único enfoque seguro; la concatenación de strings es siempre vulnerable. Para output encoding, el contexto importa: HTML encoding, JavaScript encoding, CSS encoding y URL encoding tienen reglas diferentes y deben aplicarse en el contexto correcto.

## Variantes

| Tecnología | Librería | Propósito | Notas |
|------------|----------|-----------|-------|
| Python | `bleach` | Sanitización HTML | Basado en allow-list, mantenido por Mozilla |
| Python | `psycopg2` / `sqlalchemy` | Parametrización SQL | Usa bound parameters, nunca format strings |
| JavaScript | `DOMPurify` | Sanitización HTML | Rápido, browser + Node.js, configurable |
| JavaScript | `express-validator` | Validación de input | Middleware para rutas Express |
| Java | `JSoup` | Sanitización HTML | Perfiles `Safelist` para casos de uso comunes |
| Java | `OWASP Java Encoder` | Encoding específico por contexto | HTML, JS, CSS, URL, attribute encoding |

## Lo que funciona

- **Valida primero, luego sanitiza**: Rechaza input inválido temprano; la sanitización es red de seguridad, no guardián
- **Usa allow-lists, no block-lists**: Define lo que se permite (tags, protocolos, caracteres) en lugar de intentar bloquear cada vector de ataque
- **Queries parametrizadas para todo SQL**: Prepared statements eliminan SQL injection sin importar el contenido del input
- **Encoding context-aware**: Usa HTML encoding en HTML, JS encoding en bloques `<script>`, CSS encoding en atributos style
- **Rate-limit y size-limit**: Limita tamaño de body y rate de requests para prevenir ataques ReDoS y agotamiento de memoria

## Errores Comunes

- **Black-listing de tags HTML**: Los atacantes inventan nuevos tags y atributos; las allow-lists son el único enfoque confiable
- **Sanitizar después de validar**: La validación debe ocurrir sobre input crudo; sanitizar primero puede saltear reglas de validación
- **Usar regex para parsear HTML**: Regex no puede parsear HTML correctamente; siempre usa un parser HTML apropiado para sanitización
- **Encoding una vez y reutilizar en todos lados**: Output HTML-escaped es inseguro dentro de strings JavaScript; codifica por contexto
- **Confiar en validación del lado del cliente**: Los checks del cliente mejoran UX pero son trivialmente bypassables; siempre re-valida del lado del servidor

## Preguntas Frecuentes

### ¿Debo sanitizar input del lado del cliente o del servidor?

Siempre sanitiza del lado del servidor. La sanitización del cliente mejora UX y reduce carga del servidor, pero los atacantes pueden bypassarla completamente enviando requests HTTP crudos. Los checks del cliente son una capa de conveniencia; los checks del servidor son el límite de seguridad.

### ¿Cuál es la diferencia entre validación y sanitización?

La validación verifica que el input cumpla con reglas esperadas (ej: "¿es este un email válido?"). La sanitización transforma input para remover constructos peligrosos (ej: "quita tags `<script>`"). Valida para rechazar datos malos; sanitiza para hacer seguros los datos aceptables.

### ¿Cómo manejo uploads de archivos de forma segura?

Valida el tipo de archivo inspeccionando magic bytes, no la extensión. Almacena uploads fuera del web root. Renombra archivos a IDs aleatorios. Sírvelos con `Content-Disposition: attachment` y `X-Content-Type-Options: nosniff`. Escanea con antivirus si es necesario.
