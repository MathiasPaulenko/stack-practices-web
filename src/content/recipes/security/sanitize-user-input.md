---
contentType: recipes
slug: sanitize-user-input
title: "Sanitize User Input"
description: "How to sanitize and validate user input in Python, Java, and JavaScript to prevent injection attacks."
metaDescription: "Learn how to sanitize user input in Python, Java, and JavaScript. Prevent XSS, SQL injection, and command injection with code examples."
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
  metaDescription: "Learn how to sanitize user input in Python, Java, and JavaScript. Prevent XSS, SQL injection, and command injection with code examples."
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
## Overview

Untrusted user input is the root cause of most web application vulnerabilities: XSS, SQL injection, command injection, path traversal, and header injection. Sanitization transforms raw input into safe, normalized data. Validation checks that the sanitized data meets structural and semantic constraints. This approach shows how to how to sanitize and validate input across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Accepting form data, query parameters, or JSON bodies from web clients
- Processing file uploads or file paths provided by users
- Rendering user-generated content in HTML, email, or logs
- Passing user values to OS commands, SQL queries, or NoSQL filters

## Solution

### Python

```python
# HTML sanitization with bleach
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
# SQL safe parameterization with psycopg2
import psycopg2

def get_user_by_email(email: str):
    conn = psycopg2.connect("dbname=test")
    cur = conn.cursor()
    # Never use f-strings or % formatting for SQL
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    return cur.fetchone()
```

### JavaScript

```javascript
// DOMPurify for browser-side HTML sanitization
// npm install dompurify jsdom (Node.js usage)
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const dirty = '<img src=x onerror=alert(1)><b>Hello</b>';
console.log(DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ['b'] }));
// Output: '<b>Hello</b>'
```

```javascript
// express-validator for route input validation
// npm install express-validator
import { body, validationResult } from 'express-validator';

app.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    // Safe to proceed
  }
);
```

### Java

```java
// JSoup for HTML sanitization
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
// OWASP Java Encoder for context-specific encoding
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

## Explanation

Sanitization and validation are complementary layers. Sanitization removes or escapes dangerous constructs before validation runs. Validation rejects data that does not match expected schemas, types, or ranges. For example, an email field should be validated with a regex or dedicated library, and then HTML-escaped before rendering in a template.

Python's `bleach` is ideal for rich-text fields because it allows an explicit allow-list of tags. `DOMPurify` (JS) and `JSoup` (Java) serve the same purpose. For SQL, parameterized queries are the only safe approach; string concatenation is always vulnerable. For output encoding, context matters: HTML encoding, JavaScript encoding, CSS encoding, and URL encoding each have different rules and must be applied in the correct context.

## Variants

| Technology | Library | Purpose | Notes |
|------------|---------|---------|-------|
| Python | `bleach` | HTML sanitization | Allow-list based, maintained by Mozilla |
| Python | `psycopg2` / `sqlalchemy` | SQL parameterization | Use bound parameters, never format strings |
| JavaScript | `DOMPurify` | HTML sanitization | Fast, browser + Node.js, configurable |
| JavaScript | `express-validator` | Input validation | Middleware for Express routes |
| Java | `JSoup` | HTML sanitization | `Safelist` profiles for common use cases |
| Java | `OWASP Java Encoder` | Context-specific encoding | HTML, JS, CSS, URL, attribute encoding |

## What Works

- **Validate first, then sanitize**: Reject invalid input early; sanitization is a safety net, not a gatekeeper
- **Use allow-lists, not block-lists**: Define what is permitted (tags, protocols, characters) rather than trying to block every attack vector
- **Parameterized queries for all SQL**: Prepared statements eliminate SQL injection regardless of input content
- **Context-aware encoding**: Use HTML encoding in HTML, JS encoding in `<script>` blocks, CSS encoding in style attributes
- **Rate-limit and size-limit**: Cap request body size and rate to prevent ReDoS and memory exhaustion attacks

## Common Mistakes

- **Black-listing HTML tags**: Attackers invent new tags and attributes; allow-lists are the only reliable approach
- **Sanitizing after validation**: Validation should happen on raw input; sanitizing first can bypass validation rules
- **Using regex for HTML parsing**: Regex cannot parse HTML correctly; always use a proper HTML parser for sanitization
- **Encoding once and reusing everywhere**: HTML-encoded output is unsafe inside JavaScript strings; encode per context
- **Trusting client-side validation**: Client-side checks improve UX but are trivial to bypass; always re-validate server-side

## Frequently Asked Questions

### Should I sanitize input on the client or server?

Always sanitize on the server. Client-side sanitization improves UX and reduces server load, but attackers can bypass it entirely by sending raw HTTP requests. Client-side checks are a convenience layer; server-side checks are the security boundary.

### What is the difference between validation and sanitization?

Validation checks that input conforms to expected rules (e.g., "is this a valid email?"). Sanitization transforms input to remove dangerous constructs (e.g., "strip `<script>` tags"). Validate to reject bad data; sanitize to make acceptable data safe.

### How do I safely handle file uploads?

Validate the file type by inspecting magic bytes, not the extension. Store uploads outside the web root. Rename files to random IDs. Serve them with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`. Scan with an antivirus if required.

## Advanced Solutions

### Command injection prevention (Python)

When passing user input to OS commands, use argument lists instead of shell strings:

```python
import subprocess
import shlex

# VULNERABLE: shell=True with user input
# subprocess.run(f"ls {user_dir}", shell=True)  # Never do this

# SAFE: shell=False with argument list
def list_directory(directory: str) -> str:
    """Safely list directory contents."""
    # Validate directory is within allowed base
    import os
    allowed_base = '/var/uploads'
    real_path = os.path.realpath(directory)
    if not real_path.startswith(allowed_base):
        raise ValueError('Directory outside allowed base')

    result = subprocess.run(
        ['ls', '-la', real_path],
        capture_output=True,
        text=True,
        timeout=10,
        shell=False,  # Critical: never use shell=True with user input
    )
    return result.stdout

# SAFE: shlex.quote if shell=True is unavoidable (rare cases)
def grep_file(pattern: str, filename: str) -> str:
    """Grep with escaped arguments."""
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

### Path traversal prevention (Node.js)

```javascript
const path = require('path');
const fs = require('fs').promises;

const ALLOWED_BASE = '/var/uploads';

async function readUserFile(userPath) {
  // Resolve to absolute path and check it stays within allowed base
  const resolved = path.resolve(ALLOWED_BASE, userPath);
  const normalized = path.normalize(resolved);

  // Prevent directory traversal: ../etc/passwd
  if (!normalized.startsWith(ALLOWED_BASE + path.sep)) {
    throw new Error('Path traversal detected');
  }

  // Additional check: ensure no null bytes
  if (userPath.includes('\0')) {
    throw new Error('Null byte in path');
  }

  try {
    return await fs.readFile(normalized, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('File not found');
    }
    throw err;
  }
}

// Usage
// readUserFile('../../etc/passwd') -> throws "Path traversal detected"
// readUserFile('reports/2024/q1.pdf') -> reads /var/uploads/reports/2024/q1.pdf
```

### NoSQL injection prevention (JavaScript/MongoDB)

```javascript
const { MongoClient } = require('mongodb');

// VULNERABLE: user input passed directly to query
// const user = await db.collection('users').findOne({
//   $where: `this.username == '${req.body.username}'`
// });

// SAFE: use driver query methods, never $where with user input
async function findUser(username) {
  // Validate input shape first
  if (typeof username !== 'string' || username.length > 100) {
    throw new Error('Invalid username');
  }

  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db('app');

  // Use structured queries, not string-based $where
  return await db.collection('users').findOne({ username });
}

// SAFE: sanitize query operators from user input
function sanitizeQuery(obj) {
  // Remove $ operators from user-supplied query objects
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

// Usage: { username: { $ne: null } } becomes { username: {} } -> safe
```

### File upload validation (Python)

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
    """Validate and safely save an uploaded file."""
    # Check file size
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f'File exceeds {MAX_FILE_SIZE // 1024 // 1024}MB limit')

    # Detect real MIME type from magic bytes, not extension
    mime = magic.from_buffer(file_bytes, mime=True)
    if mime not in ALLOWED_MIME_TYPES:
        raise ValueError(f'File type {mime} not allowed')

    # Generate random filename, preserve safe extension
    ext = ALLOWED_MIME_TYPES[mime]
    safe_name = f'{uuid.uuid4().hex}{ext}'

    # Store outside web root
    upload_dir = '/var/uploads'
    safe_path = os.path.join(upload_dir, safe_name)

    # Verify path doesn't escape upload dir
    if not os.path.realpath(safe_path).startswith(upload_dir):
        raise ValueError('Invalid file path')

    with open(safe_path, 'wb') as f:
        f.write(file_bytes)

    return safe_name
```

## Additional Best Practices

1. **Use a schema validation library for all API inputs.** Define expected types, ranges, and formats explicitly:

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

2. **Implement Content Security Policy (CSP) headers.** CSP adds a browser-side defense that blocks inline scripts even if sanitization misses something:

```nginx
add_header Content-Security-Policy
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'" always;
```

## Additional Common Mistakes

1. **Accepting JSON content types without validation.** JSON bodies can contain nested objects, arrays, and unexpected types. Always validate the structure, not just individual fields:

```javascript
// WRONG: trusting nested structures
const user = req.body; // could contain { role: 'admin' }

// CORRECT: pick only expected fields
const { email, username } = req.body;
if (typeof email !== 'string' || typeof username !== 'string') {
  return res.status(400).json({ error: 'Invalid input' });
}
```

2. **Using `eval()` or `Function()` with user input.** These execute arbitrary code and cannot be made safe. Always use safe alternatives like `JSON.parse()` for data parsing.

## Additional FAQ

### What is the difference between encoding and sanitization?

Encoding transforms special characters into safe representations (e.g., `<` becomes `&lt;`) for a specific output context. Sanitization removes or neutralizes dangerous constructs from the input itself. Encode when outputting data; sanitize when storing or processing rich-text input.

### How do I handle internationalized input safely?

Use Unicode normalization (NFC) to prevent homoglyph attacks and canonicalization issues. Validate against expected character ranges after normalization:

```python
import unicodedata

def normalize_input(text: str) -> str:
    normalized = unicodedata.normalize('NFC', text)
    # Reject control characters except newline and tab
    cleaned = ''.join(
        c for c in normalized
        if unicodedata.category(c)[0] != 'C' or c in '\n\t'
    )
    return cleaned.strip()
```

### Should I sanitize data before storing it in the database?

It depends. Store data as-is (validated but not sanitized) and encode on output. This preserves data fidelity and lets you apply context-specific encoding when rendering. The exception is rich-text fields (comments, posts) where you should sanitize HTML before storage to ensure no malicious markup persists.
