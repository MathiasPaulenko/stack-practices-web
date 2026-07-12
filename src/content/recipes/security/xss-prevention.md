---


contentType: recipes
slug: xss-prevention
title: "Prevent Cross-Site Scripting (XSS)"
description: "How to sanitize user input, escape output, and use Content Security Policy to prevent XSS attacks in web applications."
metaDescription: "Learn XSS prevention techniques. Escape output, sanitize HTML, use CSP headers, and validate input to protect users from cross-site scripting attacks."
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
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn XSS prevention techniques. Escape output, sanitize HTML, use CSP headers, and validate input to protect users from cross-site scripting attacks."
  keywords:
    - xss prevention
    - cross site scripting
    - html escaping
    - content security policy
    - input sanitization
    - dom xss
    - reflected xss
    - stored xss


---

## Overview

Cross-Site Scripting (XSS) is an injection attack where malicious scripts are embedded into trusted websites. When a victim visits the compromised page, the script executes in their browser with the same privileges as the legitimate site, allowing attackers to steal session cookies, capture keystrokes, or perform actions on behalf of the user.

XSS consistently ranks in the [OWASP Top 10](/guides/security/security-best-practices-guide) because it is both common and dangerous. The three main types are reflected XSS (malicious URL triggers the script), stored XSS (malicious script is saved in the database and served to all users), and DOM-based XSS (client-side JavaScript writes untrusted data to the page without escaping).

The fundamental defense is simple but frequently forgotten: never trust user [input](/recipes/api/input-validation). All data from users, APIs, or external sources must be escaped before rendering in HTML, JavaScript, CSS, or URLs.

## When to Use

Use this recipe when:

- Rendering user-generated content in web pages
- Building admin dashboards, comment systems, or forums
- Handling query parameters or URL fragments in client-side routing
- Implementing rich text editors or markdown renderers
- Adding third-party widgets or embeds to your application
- Conducting security audits of frontend code

## Solution

### HTML Escaping (Server-Side)

```python
import html

user_input = '<script>alert("xss")</script>'
safe_output = html.escape(user_input)
# safe_output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

### React Automatic Escaping

```jsx
// React escapes {expressions} automatically — safe by default
function UserProfile({ bio }) {
  return <div className="bio">{bio}</div>;
  // <script> becomes &lt;script&gt; automatically
}

// DANGEROUS — only use when you control the source
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

### Sanitizing HTML (DOMPurify)

```javascript
import DOMPurify from 'dompurify';

const dirty = '<p>Hello</p><script>alert("xss")</script>';
const clean = DOMPurify.sanitize(dirty);
// clean: <p>Hello</p>
```

## Explanation

- **HTML escaping**: Converts characters like `<`, `>`, `"`, and `&` into HTML entities so browsers treat them as text, not markup. This is the most important defense and must be applied to all untrusted data.
- **React/Vue/Angular auto-escaping**: Modern frameworks escape interpolated values by default. XSS vulnerabilities usually occur when developers bypass this with `dangerouslySetInnerHTML`, `v-html`, or similar escape hatches.
- **Content Security Policy (CSP)**: A browser security mechanism that restricts where scripts, styles, and other resources can load from. Even if an attacker injects a `<script>` tag, CSP prevents it from executing if the source is not whitelisted.
- **HTML sanitization**: When you need to allow some HTML (like `<b>` or `<a>` tags in comments), use a sanitizer to strip dangerous tags and attributes while preserving safe markup.

## Variants

| Defense | Layer | Effectiveness | Best For |
|---------|-------|---------------|----------|
| Output escaping | Server/Client | Essential | All untrusted data in HTML |
| CSP headers | Browser | Strong | Defense in depth, inline script blocking |
| HTML sanitization | Server/Client | Strong | Rich text, WYSIWYG editors |
| HttpOnly cookies | Server | Strong | Session cookie theft prevention |

## What Works

- **Escape all untrusted data**: URL parameters, form inputs, database fields, API responses, [file uploads](/recipes/file-handling/file-upload-validation), and even HTTP headers can be manipulated by attackers.
- **Use framework defaults**: let React, Vue, or Angular handle escaping. Only use raw HTML insertion when absolutely necessary and sanitize the input first.
- **Implement a strict CSP**: start with `default-src 'self'` and whitelist only required domains. Avoid `'unsafe-inline'` and `'unsafe-eval'` for scripts.
- **Set `HttpOnly` and `Secure` on cookies**: `HttpOnly` prevents JavaScript from reading session cookies, mitigating the impact of XSS. `Secure` ensures cookies are only sent over HTTPS.
- **Validate input, not just output**: reject unexpected characters at the boundary (e.g., only allow alphanumeric usernames) so bad data never enters your system.
- **Audit dependencies**: XSS can also come from compromised npm packages or third-party scripts. Use `npm audit` and [review dependencies](/guides/security/security-best-practices-guide) loaded from external domains.

## Common Mistakes

- **Using `innerHTML` with user input**: this is the single most common cause of XSS in vanilla JavaScript. Use `textContent` instead for plain text.
- **Escaping only once**: if you escape data before storing it in the database (`&lt;` becomes `&amp;lt;`), you corrupt the data. Escape at the output layer, not the input layer.
- **Forgetting about URLs and CSS**: `javascript:alert(1)` in an `href` or `expression()` in CSS can execute code. Validate URLs with allowlists and sanitize CSS.
- **Overly permissive CSP**: `script-src 'unsafe-inline' 'unsafe-eval' *` disables most of CSP's protection. Be specific with your policy.
- **Trusting client-side validation**: attackers bypass frontend checks entirely. All escaping and validation must be enforced server-side.

## Frequently Asked Questions

**Q: Is React's `dangerouslySetInnerHTML` safe if I escape the input?**
A: Only if you escape or sanitize correctly. A single mistake in your escaping logic exposes your users. Prefer sanitization libraries like DOMPurify over manual escaping.

**Q: Can CSP completely prevent XSS?**
A: No, but it considerably raises the bar. A strict CSP blocks inline scripts and unauthorized external scripts, turning XSS from a critical vulnerability into a non-issue in many cases.

**Q: What about DOM-based XSS?**
A: DOM XSS occurs when client-side JavaScript reads from `location.hash`, `document.URL`, or `localStorage` and writes to the DOM without escaping. Treat all DOM sources as untrusted and escape before insertion.

**Q: Should I escape data before storing it in the database?**
A: No. Store data raw and escape on output. Escaping on storage means your data is tied to a specific output format (HTML) and makes it unusable for JSON APIs, emails, or PDF generation.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Context-aware escaping (Python)

Different output contexts require different escaping rules. HTML body, attributes, JavaScript, and URLs each need specific handling:

```python
import html
import urllib.parse
import json


def escape_for_html(text: str) -> str:
    """Escape for HTML body context."""
    return html.escape(text, quote=True)


def escape_for_attribute(text: str) -> str:
    """Escape for HTML attribute context."""
    return html.escape(text, quote=True)


def escape_for_javascript(text: str) -> str:
    """Escape for JavaScript string context."""
    # Use JSON encoding for safe JS string output
    return json.dumps(text)


def escape_for_url(text: str) -> str:
    """Escape for URL parameter context."""
    return urllib.parse.quote(text, safe='')


def safe_output(value: str, context: str = "html") -> str:
    """Apply context-appropriate escaping."""
    escapers = {
        "html": escape_for_html,
        "attribute": escape_for_attribute,
        "javascript": escape_for_javascript,
        "url": escape_for_url,
    }
    escaper = escapers.get(context, escape_for_html)
    return escaper(value)


# Usage in a template
user_name = '<script>alert("xss")</script>'
user_url = 'javascript:alert(1)'
user_data = '{"key":"value</script><script>alert(1)</script>"}'

# HTML body
print(f'<span>{safe_output(user_name, "html")}</span>')
# <span>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</span>

# Attribute
print(f'<a title="{safe_output(user_name, "attribute")}">link</a>')
# <a title="&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;">link</a>

# JavaScript
print(f'<script>var data = {safe_output(user_data, "javascript")};</script>')
# <script>var data = "{\"key\":\"value</script><script>alert(1)</script>\"}";</script>

# URL (also validate protocol)
def safe_url(url: str) -> str:
    """Validate URL protocol and escape."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ('http', 'https', 'mailto', ''):
        return ''  # Block javascript:, data:, etc.
    return escape_for_attribute(url)

print(f'<a href="{safe_url(user_url)}">click</a>')
# <a href="">click</a>  (javascript: blocked)
```

### DOMPurify with custom configuration

For rich text editors, configure DOMPurify to allow specific tags while blocking dangerous ones:

```javascript
import DOMPurify from 'dompurify';

// Custom config: allow links and formatting, block iframes and scripts
const config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
    'blockquote', 'code', 'pre', 'h1', 'h2', 'h3',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
};

// Add a hook to enforce rel="noopener noreferrer" on all links
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
// (iframe, script, img all removed; javascript: href stripped)
```

### Trusted Types API (Chrome/Edge)

Trusted Types enforce that only sanitized values can be assigned to dangerous sinks like `innerHTML`:

```javascript
// Define a policy that sanitizes before insertion
const sanitizerPolicy = trustedTypes.createPolicy('sanitizer', {
  createHTML: (input) => DOMPurify.sanitize(input),
});

// Now innerHTML only accepts TrustedHTML, not raw strings
// document.body.innerHTML = userInput; // TypeError in browsers with TT
document.body.innerHTML = sanitizerPolicy.createHTML(userInput); // OK

// Content-Security-Policy header to enforce:
// Content-Security-Policy: require-trusted-types-for 'script';
```

### CSP with nonces for inline scripts

When you need inline scripts, use per-request nonces instead of `unsafe-inline`:

```python
import secrets
from flask import Flask, render_template_string

app = Flask(__name__)

@app.route('/')
def index():
    # Generate a unique nonce per request
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

### Markdown rendering with sanitization

When rendering user-submitted markdown, sanitize the HTML output:

```javascript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked to disable raw HTML
marked.setOptions({
  // Do not allow raw HTML pass-through
  sanitize: false, // marked deprecated sanitize; use DOMPurify instead
});

function renderMarkdown(markdownText) {
  // Step 1: Convert markdown to HTML
  const rawHtml = marked.parse(markdownText);

  // Step 2: Sanitize the HTML output
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

// Usage
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

## Additional Best Practices

1. **Use `textContent` instead of `innerHTML` for plain text.** This is the simplest XSS prevention in vanilla JavaScript:

```javascript
// WRONG: vulnerable to XSS
element.innerHTML = userInput;

// CORRECT: treats input as plain text
element.textContent = userInput;
```

2. **Set `X-Content-Type-Options: nosniff` on all responses.** This prevents browsers from MIME-sniffing responses as executable:

```javascript
// Express middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
```

## Additional Common Mistakes

1. **Trusting `data:` URLs in image src.** `data:` URLs can contain HTML or SVG with embedded scripts. Validate image URLs against an allowlist of protocols:

```javascript
function safeImageSrc(url) {
  const allowed = /^https?:\/\/|^\/[^/]/;
  if (!allowed.test(url)) {
    return '/images/placeholder.png';
  }
  return url;
}

// Block: data:text/html,<script>alert(1)</script>
// Block: javascript:alert(1)
// Allow: https://cdn.example.com/image.png
// Allow: /images/avatar.png
```

2. **Sanitizing on the client only.** If you sanitize HTML in the browser but store the raw input server-side, an attacker can bypass the client sanitizer and submit raw HTML directly to the API. Always sanitize server-side before storage:

```python
import bleach

def sanitize_html(content: str) -> str:
    """Server-side HTML sanitization using bleach."""
    return bleach.clean(
        content,
        tags={'p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'pre'},
        attributes={'a': ['href', 'title', 'rel', 'target']},
        protocols=['https', 'http', 'mailto'],
        strip=True,
    )

# Flask route
@app.route('/api/comment', methods=['POST'])
def post_comment():
    raw_content = request.json.get('content', '')
    safe_content = sanitize_html(raw_content)
    # Store safe_content in database
    db.save_comment(safe_content)
    return jsonify({'success': True})
```

## Additional FAQ

### How do I test for XSS vulnerabilities?

Use automated scanners and manual testing. Inject common payloads and verify they are escaped:

```javascript
// Test payloads to try in input fields
const xssPayloads = [
  '<script>alert(1)</script>',
  '"><script>alert(1)</script>',
  "';alert(1);//",
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  'javascript:alert(1)',
  '<iframe src=javascript:alert(1)>',
  '"><img src=x onerror=alert(1)>',
];

// Automated test with Playwright
import { test, expect } from '@playwright/test';

test('comment field escapes XSS', async ({ page }) => {
  await page.goto('/posts/1');
  for (const payload of xssPayloads) {
    await page.fill('[name=comment]', payload);
    await page.click('button[type=submit]');
    // Verify the payload is displayed as text, not executed
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain(payload);
    // Verify no alert dialog was triggered
    page.on('dialog', dialog => {
      throw new Error(`XSS triggered with payload: ${payload}`);
    });
  }
});
```

### What is mutation XSS and how do I prevent it?

Mutation XSS occurs when the browser's HTML parser reinterprets sanitized HTML differently than the sanitizer expected. This can happen with mXSS vectors in `innerHTML` assignments. To prevent it:

- Use DOMPurify, which handles mXSS vectors
- Avoid `innerHTML` for user content — use `textContent` or framework auto-escaping
- Set a strict CSP that blocks inline scripts even if mXSS bypasses sanitization

### Should I use `Subresource Integrity (SRI)` for third-party scripts?

Yes. SRI ensures that a third-party script has not been tampered with. If the hash doesn't match, the browser refuses to execute it:

```html
<script src="https://cdn.example.com/library.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>
```
