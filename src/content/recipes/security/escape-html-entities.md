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
  - /recipes/security/sanitize-user-input
  - /recipes/data/parse-markdown-files
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

HTML entity escaping converts characters with special meaning in HTML (`<`, `>`, `&`, `"`, `'`) into their corresponding entity references (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#x27;`). Without escaping, untrusted data can inject markup or scripts, leading to cross-site scripting (XSS). This recipe covers HTML escaping in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Rendering user-generated content inside HTML templates
- Building dynamic HTML strings from external data (APIs, databases, files)
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

Python's `html.escape` covers the five critical characters. `MarkupSafe` is the engine behind Jinja2's auto-escaping and is battle-tested. In JavaScript, manual replacement with a regex is sufficient for most cases; the DOM API approach is safer but only works in browsers. Java's `StringEscapeUtils` handles HTML4 entities comprehensively, while OWASP Encoder provides fine-grained context control.

## Variants

| Technology | Library / Approach | Context | Notes |
|------------|-------------------|---------|-------|
| Python | `html.escape` | HTML body | Stdlib, covers `< > & " '` |
| Python | `markupsafe.escape` | Templates | Used by Jinja2, auto-escapes by default |
| JavaScript | Manual regex | HTML body | Lightweight, no dependencies |
| JavaScript | DOM `textContent` | HTML body | Browser only, handles all entities |
| Java | `StringEscapeUtils.escapeHtml4` | HTML body | Apache Commons, covers many entities |
| Java | `Encode.forHtml` | HTML body + attributes | OWASP, context-specific variants |

## Best Practices

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
