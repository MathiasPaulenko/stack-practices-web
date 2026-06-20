---
contentType: recipes
slug: url-encoding
title: "URL Encoding"
description: "How to encode and decode URLs, query parameters, and path segments safely across Python, JavaScript, and Java."
metaDescription: "Practical URL encoding examples in Python, JavaScript, and Java. Learn percent-encoding, query string building, URI parsing, and safe parameter handling."
difficulty: beginner
topics:
  - data
tags:
  - data
  - encoding
  - java
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
  - /recipes/regular-expressions
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical URL encoding examples in Python, JavaScript, and Java. Learn percent-encoding, query string building, URI parsing, and safe parameter handling."
  keywords:
    - url encoding
    - percent encoding
    - query string
    - url decode
    - python urllib
    - javascript encodeURIComponent
    - java URLEncoder
    - uri parsing
    - safe url parameters
---

## Overview

URL encoding (percent-encoding) converts characters into a format that can be transmitted over the internet. It replaces unsafe ASCII characters with a `%` followed by two hexadecimal digits. It is essential for query parameters, path segments, and form submissions.

Failing to encode user input before placing it in a URL can lead to broken links, injection attacks, or unexpected [API behavior](/recipes/api/call-rest-api). See [API Security Checklist](/guides/security/api-security-checklist-guide) for comprehensive protection.

## When to Use

Use this recipe when:

- Building query strings with dynamic values from [user input](/recipes/api/input-validation)
- Encoding file names or IDs in URL paths
- Parsing URLs and extracting query parameters
- Sending form data via GET requests. See [Data Validation](/recipes/data/data-validation) for sanitizing form data.
- Handling redirect URLs with parameters

## Solution

### Python

```python
from urllib.parse import quote, unquote, urlencode, parse_qs, urlparse

# Encode a string for use in a URL path or query
encoded = quote("hello world & friends")
print(encoded)  # hello%20world%20%26%20friends

# Build a query string safely
params = {"search": "python & java", "page": 2}
query = urlencode(params)
print(query)  # search=python+%26+java&page=2

# Parse a URL
url = urlparse("https://api.example.com/search?query=hello%20world&limit=10")
print(url.query)  # query=hello%20world&limit=10
print(parse_qs(url.query))  # {'query': ['hello world'], 'limit': ['10']}

# Decode
original = unquote("hello%20world")
print(original)  # hello world
```

### JavaScript

```javascript
// Encode a component (query parameter or path segment)
const encoded = encodeURIComponent("hello world & friends");
console.log(encoded); // hello%20world%20%26%20friends

// Build query string
const params = new URLSearchParams({ search: "python & java", page: "2" });
console.log(params.toString()); // search=python+%26+java&page=2

// Parse URL
const url = new URL("https://api.example.com/search?query=hello%20world&limit=10");
console.log(url.searchParams.get("query")); // hello world
console.log(url.searchParams.get("limit")); // 10

// Decode
const decoded = decodeURIComponent("hello%20world");
console.log(decoded); // hello world
```

### Java

```java
import java.net.*;
import java.nio.charset.StandardCharsets;

// Encode
String encoded = URLEncoder.encode("hello world & friends", StandardCharsets.UTF_8);
System.out.println(encoded); // hello+world+%26+friends

// Decode
String decoded = URLDecoder.decode("hello%20world", StandardCharsets.UTF_8);
System.out.println(decoded); // hello world

// Build URI with query parameters
URI uri = new URI("https", "api.example.com", "/search",
    "query=hello+world&limit=10", null);
System.out.println(uri.toString());

// Parse URI
URI parsed = new URI("https://api.example.com/search?query=hello%20world&limit=10");
System.out.println(parsed.getQuery()); // query=hello%20world&limit=10
```

## Encoding Rules

| Function | Encodes | Safe for |
|----------|---------|----------|
| `encodeURIComponent` (JS) | All except `A-Z a-z 0-9 - _ . ! ~ * ' ( )` | Query parameters, path segments |
| `encodeURI` (JS) | Same, but preserves `; , / ? : @ & = + $ #` | Full URLs |
| `quote` (Python) | By default all non-alphanumerics | Paths, queries with safe override |
| `urlencode` (Python) | Same as `quote_plus` | Query strings (spaces → `+`) |
| `URLEncoder` (Java) | All except `a-z A-Z 0-9 - _ . *` | Query strings (spaces → `+`) |

## Best Practices

- **Always encode user input** before embedding it in URLs
- **Use `encodeURIComponent` (JS)** for query parameter values, not `encodeURI`
- **Use `urlencode` (Python)** for building complete query strings
- **Don't encode the entire URL**: Only encode the dynamic parts (values, segments)
- **Prefer `URLSearchParams`** in modern JavaScript for safe query string construction
- **Handle plus signs carefully**: In query strings, `+` means space. In paths, `%20` means space.

## Common Mistakes

- Using `encodeURI` for query parameter values (does not encode `&`, `=`, `?`)
- Forgetting to encode user input, causing malformed URLs or injection
- Double-encoding values that were already encoded by another layer
- Confusing spaces encoded as `+` (query strings) vs `%20` (paths and modern specs)
- Parsing URLs with string splitting instead of a proper URI parser

## Frequently Asked Questions

**Q: What is the difference between `encodeURI` and `encodeURIComponent`?**
A: `encodeURI` is for full URLs and preserves structural characters (`/`, `?`, `&`). `encodeURIComponent` is for individual components and encodes everything including `&` and `=`.

**Q: Should I encode spaces as `+` or `%20`?**
A: In query strings, `+` is traditional but `%20` is also valid. In paths, always use `%20`.

**Q: How do I handle arrays in query strings?**
A: Use bracket notation: `?tags[]=js&tags[]=py` or repeat the key: `?tags=js&tags=py`. Choose one convention and document it.
