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

## Soluciones Avanzadas

### Prevención de command injection (Python)

Cuando pases input de usuario a comandos del OS, usa listas de argumentos en lugar de strings de shell:

```python
import subprocess
import shlex

# VULNERABLE: shell=True con input de usuario
# subprocess.run(f"ls {user_dir}", shell=True)  # Nunca hagas esto

# SEGURO: shell=False con lista de argumentos
def list_directory(directory: str) -> str:
    """Listar contenido de directorio de forma segura."""
    # Validar que el directorio esté dentro de la base permitida
    import os
    allowed_base = '/var/uploads'
    real_path = os.path.realpath(directory)
    if not real_path.startswith(allowed_base):
        raise ValueError('Directorio fuera de la base permitida')

    result = subprocess.run(
        ['ls', '-la', real_path],
        capture_output=True,
        text=True,
        timeout=10,
        shell=False,  # Crítico: nunca uses shell=True con input de usuario
    )
    return result.stdout

# SEGURO: shlex.quote si shell=True es inevitable (casos raros)
def grep_file(pattern: str, filename: str) -> str:
    """Grep con argumentos escapados."""
    safe_pattern = shlex.quote(pattern)
    safe_filename = shlex.quote(filename)
    result = subprocess.run(
        f'grep {safe_pattern} {safe_filename}',
        capture_output=True,
        text=True,
        shell=True,
        timeout=10,
    )
    return result.stdout
```

### Prevención de path traversal (Node.js)

```javascript
const path = require('path');
const fs = require('fs').promises;

const ALLOWED_BASE = '/var/uploads';

async function readUserFile(userPath) {
  // Resolver a path absoluto y verificar que permanezca dentro de la base permitida
  const resolved = path.resolve(ALLOWED_BASE, userPath);
  const normalized = path.normalize(resolved);

  // Prevenir directory traversal: ../etc/passwd
  if (!normalized.startsWith(ALLOWED_BASE + path.sep)) {
    throw new Error('Path traversal detectado');
  }

  // Check adicional: asegurar que no haya null bytes
  if (userPath.includes('\0')) {
    throw new Error('Null byte en path');
  }

  try {
    return await fs.readFile(normalized, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('Archivo no encontrado');
    }
    throw err;
  }
}

// Uso
// readUserFile('../../etc/passwd') -> lanza "Path traversal detectado"
// readUserFile('reports/2024/q1.pdf') -> lee /var/uploads/reports/2024/q1.pdf
```

### Prevención de NoSQL injection (JavaScript/MongoDB)

```javascript
const { MongoClient } = require('mongodb');

// VULNERABLE: input de usuario pasado directamente a query
// const user = await db.collection('users').findOne({
//   $where: `this.username == '${req.body.username}'`
// });

// SEGURO: usar métodos de query del driver, nunca $where con input de usuario
async function findUser(username) {
  // Validar shape del input primero
  if (typeof username !== 'string' || username.length > 100) {
    throw new Error('Username inválido');
  }

  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db('app');

  // Usar queries estructuradas, no $where basado en strings
  return await db.collection('users').findOne({ username });
}

// SEGURO: sanitizar operadores de query del input de usuario
function sanitizeQuery(obj) {
  // Remover operadores $ de objetos de query suministrados por usuario
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) {
      continue; // Strip $where, $gt, $ne, etc.
    }
    if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeQuery(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// Uso: { username: { $ne: null } } se convierte en { username: {} } -> seguro
```

### Validación de file uploads (Python)

```python
import os
import uuid
import magic

ALLOWED_MIME_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

def validate_and_save_upload(file_bytes: bytes, original_name: str) -> str:
    """Validar y guardar de forma segura un archivo subido."""
    # Verificar tamaño de archivo
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f'Archivo excede límite de {MAX_FILE_SIZE // 1024 // 1024}MB')

    # Detectar MIME type real desde magic bytes, no extensión
    mime = magic.from_buffer(file_bytes, mime=True)
    if mime not in ALLOWED_MIME_TYPES:
        raise ValueError(f'Tipo de archivo {mime} no permitido')

    # Generar nombre aleatorio, preservar extensión segura
    ext = ALLOWED_MIME_TYPES[mime]
    safe_name = f'{uuid.uuid4().hex}{ext}'

    # Almacenar fuera del web root
    upload_dir = '/var/uploads'
    safe_path = os.path.join(upload_dir, safe_name)

    # Verificar que el path no escape del directorio de uploads
    if not os.path.realpath(safe_path).startswith(upload_dir):
        raise ValueError('Path de archivo inválido')

    with open(safe_path, 'wb') as f:
        f.write(file_bytes)

    return safe_name
```

## Mejores Prácticas Adicionales

1. **Usa una librería de validación de schema para todos los inputs de API.** Define tipos, rangos y formatos esperados explícitamente:

```python
from pydantic import BaseModel, EmailStr, constr, validator

class UserCreate(BaseModel):
    email: EmailStr
    username: constr(min_length=3, max_length=20, pattern=r'^[a-zA-Z0-9_]+$')
    bio: constr(max_length=500) = ''

    @validator('bio')
    def sanitize_bio(cls, v):
        import bleach
        return bleach.clean(v, tags=[], strip=True)
```

2. **Implementa headers de Content Security Policy (CSP).** CSP agrega una defensa del lado del browser que bloquea scripts inline incluso si la sanitización falla en algo:

```nginx
add_header Content-Security-Policy
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'" always;
```

## Errores Comunes Adicionales

1. **Aceptar content types JSON sin validación.** Los bodies JSON pueden contener objetos anidados, arrays y tipos inesperados. Siempre valida la estructura, no solo campos individuales:

```javascript
// INCORRECTO: confiar en estructuras anidadas
const user = req.body; // podría contener { role: 'admin' }

// CORRECTO: pick solo los campos esperados
const { email, username } = req.body;
if (typeof email !== 'string' || typeof username !== 'string') {
  return res.status(400).json({ error: 'Input inválido' });
}
```

2. **Usar `eval()` o `Function()` con input de usuario.** Estos ejecutan código arbitrario y no pueden hacerse seguros. Siempre usa alternativas seguras como `JSON.parse()` para parseo de datos.

## Preguntas Frecuentes Adicionales

### ¿Cuál es la diferencia entre encoding y sanitización?

Encoding transforma caracteres especiales en representaciones seguras (ej: `<` se convierte en `&lt;`) para un contexto de output específico. Sanitización remueve o neutraliza constructos peligrosos del input mismo. Codifica al outputear datos; sanitiza al almacenar o procesar input de rich-text.

### ¿Cómo manejo input internacionalizado de forma segura?

Usa normalización Unicode (NFC) para prevenir ataques de homoglifos y problemas de canonicalización. Valida contra rangos de caracteres esperados después de la normalización:

```python
import unicodedata

def normalize_input(text: str) -> str:
    normalized = unicodedata.normalize('NFC', text)
    # Rechazar caracteres de control excepto newline y tab
    cleaned = ''.join(
        c for c in normalized
        if unicodedata.category(c)[0] != 'C' or c in '\n\t'
    )
    return cleaned.strip()
```

### ¿Debería sanitizar datos antes de almacenarlos en la base de datos?

Depende. Almacena datos tal cual (validados pero no sanitizados) y codifica al outputear. Esto preserva la fidelidad de los datos y te permite aplicar encoding específico por contexto al renderizar. La excepción son campos de rich-text (comentarios, posts) donde debes sanitizar HTML antes de almacenar para asegurar que no persista markup malicioso.
