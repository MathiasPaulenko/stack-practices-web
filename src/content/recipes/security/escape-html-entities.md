---





contentType: recipes
slug: escape-html-entities
title: "Escape HTML Entities"
description: "How to escape HTML entities to prevent XSS attacks in Python, Java, and JavaScript."
metaDescription: "Learn how to escape HTML entities in Python, Java, and JavaScript. Prevent cross-site scripting with practical code examples."
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
  - /recipes/sanitize-user-input
  - /recipes/parse-markdown-files
  - /patterns/voucher-pattern
  - /patterns/multi-tenant-data-isolation-pattern
  - /patterns/federated-identity-pattern
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to escape HTML entities in Python, Java, and JavaScript. Prevent cross-site scripting with practical code examples."
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
## Overview

HTML entity escaping converts characters with special meaning in HTML (`<`, `>`, `&`, `"`, `'`) into their corresponding entity references (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#x27;`). Without escaping, untrusted data can inject markup or scripts, leading to cross-site scripting (XSS). Below is a practical approach to HTML escaping in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Rendering user-generated content inside HTML templates
- Building live HTML strings from external data (APIs, databases, files)
- Generating HTML emails that include recipient names or addresses
- Embedding JSON data inside `<script>` tags safely

## Solution

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
# MarkupSafe for Jinja2 templates (automatic escaping)
# pip install markupsafe
from markupsafe import Markup, escape

def render_comment(text):
    return Markup('<p>{}</p>').format(escape(text))
```

### JavaScript

```javascript
// Manual entity map for lightweight escaping
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
// Using DOM API in browser environments
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

## Explanation

HTML escaping is a context-specific encoding. In the body of an HTML element, `<` must become `&lt;` so browsers treat it as literal text, not the start of a tag. Inside an HTML attribute delimited by double quotes, `"` must become `&quot;` to prevent the attribute from closing early. Inside a `<script>` block, additional JavaScript encoding is needed because `</script>` can terminate the script context even if HTML-escaped.

Python's `html.escape` covers the five critical characters. `MarkupSafe` is the engine behind Jinja2's auto-escaping and is battle-tested. In JavaScript, manual replacement with a regex is sufficient for most cases; the DOM API approach is safer but only works in browsers. Java's `StringEscapeUtils` handles HTML4 entities thoroughly, while OWASP Encoder provides fine-grained context control.

## Variants

| Technology | Library / Approach | Context | Notes |
|------------|-------------------|---------|-------|
| Python | `html.escape` | HTML body | Stdlib, covers `< > & " '` |
| Python | `markupsafe.escape` | Templates | Used by Jinja2, auto-escapes by default |
| JavaScript | Manual regex | HTML body | Lightweight, no dependencies |
| JavaScript | DOM `textContent` | HTML body | Browser only, handles all entities |
| Java | `StringEscapeUtils.escapeHtml4` | HTML body | Apache Commons, covers many entities |
| Java | `Encode.forHtml` | HTML body + attributes | OWASP, context-specific variants |

## What Works

- **Escape at the point of rendering**, not at storage: Escaped data in a database makes search and display inconsistent
- **Use auto-escaping template engines**: Jinja2, Django templates, React JSX, and Vue templates escape by default
- **Context matters**: HTML body, HTML attribute, CSS, JavaScript, and URL contexts each require different encoding rules
- **Avoid `innerHTML` with raw strings**: Use `textContent` or template literals with escaping functions
- **Audit third-party components**: Libraries that bypass escaping (e.g., `dangerouslySetInnerHTML` in React) must be reviewed carefully

## Common Mistakes

- **Escaping too early**: Sanitizing on input and storing escaped text breaks full-text search and sorting
- **Double escaping**: `&lt;` rendered again becomes `&amp;lt;`, displaying literal `&lt;` to users
- **Wrong context encoding**: HTML-encoded strings are unsafe inside JavaScript contexts without additional JS encoding
- **Using `innerHTML` for user text**: Even if the source is "trusted," `innerHTML` is unnecessary and risky; prefer `textContent`
- **Ignoring attribute context**: `href="{{ userUrl }}"` needs URL encoding, not just HTML encoding

## Frequently Asked Questions

### What is the difference between HTML escaping and HTML sanitization?

Escaping transforms every special character into an entity reference, preserving the original text but making it inert. Sanitization removes or alters dangerous markup (e.g., stripping `<script>` tags) while preserving safe HTML like `<b>`. Escape when you do not need HTML; sanitize when you accept a subset of HTML.

### Do I need to escape data inside JSON responses?

No. JSON responses are not HTML contexts. Escape JSON only when embedding it inside an HTML page, such as in a `<script>` tag or an HTML attribute. In those cases, escape the JSON string for the HTML context, and if inside `<script>`, also avoid `</script>` sequences.

### Should I escape single quotes (`'`) or just double quotes (`"`)?

Escape both. In HTML attributes, single quotes can delimit attributes (`attr='value'`), so unescaped single quotes break out of the attribute. The OWASP Encoder escapes both by default. Python's `html.escape` escapes single quotes when `quote=True` (default since Python 3.8).

## Advanced Solutions

### Context-aware escaping for script context

Embedding JSON data inside `<script>` tags requires more than HTML escaping. The sequence `</script>` terminates the script block regardless of HTML entity encoding:

```javascript
function safeJsonInScript(data) {
  // 1. Stringify the JSON
  let json = JSON.stringify(data);

  // 2. Escape the forward slash in </script> sequences
  json = json.replace(/</g, '\\u003c');

  // 3. Also escape <!-- to prevent HTML comment injection
  json = json.replace(/-->/g, '--\\u003e');

  return json;
}

// Usage in a server-rendered template
const userData = { name: 'John</script><script>alert(1)</script>', role: 'admin' };
const safeJson = safeJsonInScript(userData);
// Output: {"name":"John\\u003c/script>\\u003cscript>alert(1)\\u003c/script>","role":"admin"}
```

```python
import json
import re

def safe_json_for_script(data):
    """Serialize JSON safe for embedding in <script> tags."""
    json_str = json.dumps(data)
    # Escape <, >, and line separators to prevent script context breakout
    json_str = json_str.replace('<', '\\u003c')
    json_str = json_str.replace('>', '\\u003e')
    json_str = json_str.replace('\u2028', '\\u2028')  # Line separator
    json_str = json_str.replace('\u2029', '\\u2029')  # Paragraph separator
    return json_str

# Flask/Jinja2 usage
@app.route('/dashboard')
def dashboard():
    user_data = {'name': 'Alice', 'permissions': ['read', 'write']}
    return render_template('dashboard.html',
                           safe_data=safe_json_for_script(user_data))
```

### URL context escaping

URLs in `href` and `src` attributes need URL encoding, not just HTML escaping. Using `javascript:` URIs, attackers can execute scripts:

```python
from urllib.parse import quote, urlparse

def safe_url(url):
    """Validate and sanitize URLs for href attributes."""
    # Reject javascript: and data: schemes
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https', 'mailto', 'tel', ''):
        return ''  # Reject dangerous schemes

    # Re-encode the URL safely
    return quote(url, safe=':/?&=%#')

# Usage
user_url = 'javascript:alert(1)'
print(safe_url(user_url))  # Output: '' (rejected)

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

// Usage in DOM
const link = document.createElement('a');
link.href = safeUrl(userInput);
if (link.href) {
  document.body.appendChild(link);
}
```

### CSS context escaping

Injecting user data into CSS requires its own encoding. Unescaped data can break out of the CSS context and inject markup:

```java
import org.owasp.encoder.Encode;

public class SafeCss {
    // For CSS string context
    public static String forCssString(String input) {
        return Encode.forCssString(input);
    }

    // For CSS URL context
    public static String forCssUrl(String input) {
        return Encode.forCssUrl(input);
    }
}

// Usage: <div style="color: {{userColor}}">
String safeColor = SafeCss.forCssString(userInput);
// Escapes backslash, quotes, angle brackets, and newlines
```

### Go html escaping in templates

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

    // html/template auto-escapes by context
    tmpl.Execute(w, data)
}

// Manual escaping with html.EscapeString
func manualEscape(s string) string {
    return html.EscapeString(s)
}
```

### React dangerouslySetInnerHTML safe wrapper

When you must render HTML in React, wrap it with sanitization:

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

// Usage
function Comment({ text }) {
  // If text is plain text, use children (auto-escaped)
  // If text contains HTML from a trusted source, use SafeHtml
  return <SafeHtml html={text} />;
}
```

## Additional Best Practices


- For a deeper guide, see [Sanitize User Input](/recipes/sanitize-user-input/).

1. **Use template engines with context-aware auto-escaping.** Modern template engines detect the context (HTML body, attribute, script, style) and apply the correct encoding automatically:

```python
# Jinja2 with autoescape
from jinja2 import Environment, select_autoescape

env = Environment(autoescape=select_autoescape(['html', 'xml']))
template = env.from_string('<p>{{ user_input }}</p>')
# Jinja2 escapes <, >, &, ", ' automatically

# Django templates auto-escape by default
# {{ user_input }} is escaped automatically
# Use {% autoescape off %} only for trusted content
```

2. **Set `X-Content-Type-Options: nosniff` on responses.** Prevents browsers from MIME-sniffing escaped content as executable:

```http
X-Content-Type-Options: nosniff
Content-Type: text/html; charset=utf-8
```

## Additional Common Mistakes

1. **Escaping for HTML body but placing data in a JavaScript context.** HTML escaping is not sufficient inside `<script>` blocks. The string `</script>` is not affected by HTML entity encoding and will terminate the script context:

```html
<!-- WRONG: HTML-escaped data in script context -->
<script>
  var userData = "{{ user_input | escapehtml }}";
  // If user_input contains </script>, the script block terminates
</script>

<!-- CORRECT: Use JSON serialization with < and > escaped -->
<script>
  var userData = {{ user_input | tojson | replace('<', '\\u003c') }};
</script>
```

2. **Trusting client-side escaping alone.** Client-side escaping can be bypassed if the server sends raw data. Always escape on the server when rendering HTML, and use client-side escaping as defense-in-depth:

```javascript
// Server must escape when SSR
app.get('/profile', (req, res) => {
  const user = getUser(req.params.id);
  // Template engine escapes automatically
  res.render('profile', { user });
});

// Client must also escape when dynamically updating
function updateProfileName(name) {
  document.getElementById('name').textContent = name; // Safe
  // NOT: document.getElementById('name').innerHTML = name;
}
```

## Additional FAQ

### How do I escape HTML in a URL fragment?

URL fragments (`#fragment`) follow URL encoding rules, not HTML encoding. Use `encodeURIComponent` in JavaScript or `urllib.parse.quote` in Python. HTML-encoding a URL fragment will not prevent injection of `javascript:` URIs.

### What is the OWASP encoding order?

OWASP recommends encoding in this order: 1) decode the input to its canonical form, 2) validate the input against allowlists, 3) encode for the specific output context (HTML, attribute, script, CSS, URL). Never encode before validating — encoding first can hide malicious patterns from validators.

### Can I use `textContent` instead of escaping?

Yes, `textContent` is inherently safe because the browser treats it as literal text, never as HTML. If you are building DOM elements programmatically, prefer `textContent` over `innerHTML` with manual escaping. However, for server-rendered HTML, you still need entity escaping since there is no DOM API available.
