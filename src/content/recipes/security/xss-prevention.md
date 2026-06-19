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
relatedResources:
  - /recipes/input-validation
  - /recipes/sql-injection-prevention
  - /recipes/handle-errors
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

XSS consistently ranks in the [OWASP Top 10](/guides/security/web-application-security-guide) because it is both common and dangerous. The three main types are reflected XSS (malicious URL triggers the script), stored XSS (malicious script is saved in the database and served to all users), and DOM-based XSS (client-side JavaScript writes untrusted data to the page without escaping).

The fundamental defense is simple but frequently forgotten: never trust user [input](/recipes/security/input-validation). All data from users, APIs, or external sources must be escaped before rendering in HTML, JavaScript, CSS, or URLs.

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

## Best Practices

- **Escape all untrusted data**: URL parameters, form inputs, database fields, API responses, [file uploads](/recipes/file-handling/file-upload-validation), and even HTTP headers can be manipulated by attackers.
- **Use framework defaults**: let React, Vue, or Angular handle escaping. Only use raw HTML insertion when absolutely necessary and sanitize the input first.
- **Implement a strict CSP**: start with `default-src 'self'` and whitelist only required domains. Avoid `'unsafe-inline'` and `'unsafe-eval'` for scripts.
- **Set `HttpOnly` and `Secure` on cookies**: `HttpOnly` prevents JavaScript from reading session cookies, mitigating the impact of XSS. `Secure` ensures cookies are only sent over HTTPS.
- **Validate input, not just output**: reject unexpected characters at the boundary (e.g., only allow alphanumeric usernames) so bad data never enters your system.
- **Audit dependencies**: XSS can also come from compromised npm packages or third-party scripts. Use `npm audit` and [review dependencies](/recipes/security/dependency-audit-template) loaded from external domains.

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
A: No, but it significantly raises the bar. A strict CSP blocks inline scripts and unauthorized external scripts, turning XSS from a critical vulnerability into a non-issue in many cases.

**Q: What about DOM-based XSS?**
A: DOM XSS occurs when client-side JavaScript reads from `location.hash`, `document.URL`, or `localStorage` and writes to the DOM without escaping. Treat all DOM sources as untrusted and escape before insertion.

**Q: Should I escape data before storing it in the database?**
A: No. Store data raw and escape on output. Escaping on storage means your data is tied to a specific output format (HTML) and makes it unusable for JSON APIs, emails, or PDF generation.

