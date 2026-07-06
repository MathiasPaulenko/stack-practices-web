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
