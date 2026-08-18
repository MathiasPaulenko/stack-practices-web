---
contentType: recipes
slug: url-encoding
title: "URL Encoding"
description: "Encode and decode URLs, query parameters, and path segments safely across Python, JavaScript, and Java."
metaDescription: "Practical URL encoding examples in Python, JavaScript, and Java. Learn percent-encoding, query string building, URI parsing, and safe parameter handling."
difficulty: beginner
topics:
  - data
tags:
  - data
  - encoding
  - url
  - percent-encoding
  - parsing
  - python
  - javascript
  - java
  - utf-8
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
  - /recipes/input-validation
  - /recipes/data-validation
  - /recipes/regular-expressions
  - /recipes/parse-csv-python-pandas
lastUpdated: "2026-08-18"
publishedAt: "2026-06-10"
author: Mathias Paulenko
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
    - utf-8
---

## Overview

URL encoding, or percent-encoding, converts characters into a format that a URL
can carry safely. It replaces unsafe ASCII characters with a `%` followed by two
hexadecimal digits, which is why it's essential for query parameters, path
segments, and form submissions.

If you skip encoding user input before placing it in a URL, you risk broken
links, open redirect vulnerabilities, and injection attacks. If you're building an API
client, combine this recipe with [Input Validation](/recipes/input-validation/)
and the [API Security Checklist](/guides/api-security-checklist-guide/) to cover
the rest of the attack surface.

## When to Use

Reach for this recipe when you're building or parsing URLs with live data:

- Building query strings with values that come from [user input](/recipes/input-validation/).
- Encoding file names or IDs before placing them in URL paths.
- Parsing URLs to extract their query parameters.
- Sending form data via GET requests.
- Handling redirect URLs that carry parameters.

## Solution

### Python

```python
from urllib.parse import quote, unquote, urlencode, parse_qs, urlparse

# Encode a string for a path or query value
encoded = quote("hello world & friends")
print(encoded)  # hello%20world%20%26%20friends

# Build a query string safely
params = {"search": "python & java", "page": 2}
query = urlencode(params)
print(query)  # search=python+%26+java&page=2

# Parse a URL
url = urlparse("https://api.example.com/search?query=hello%20world&limit=10")
print(url.query)           # query=hello%20world&limit=10
print(parse_qs(url.query)) # {'query': ['hello world'], 'limit': ['10']}

# Decode
original = unquote("hello%20world")
print(original)  # hello world
```

### JavaScript

```javascript
// Encode a single component (query value or path segment)
const encoded = encodeURIComponent("hello world & friends");
console.log(encoded); // hello%20world%20%26%20friends

// Build a query string
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

// Encode a value
String encoded = URLEncoder.encode("hello world & friends", StandardCharsets.UTF_8);
System.out.println(encoded); // hello+world+%26+friends

// Decode a value
String decoded = URLDecoder.decode("hello%20world", StandardCharsets.UTF_8);
System.out.println(decoded); // hello world

// Build a URI from parts
String query = String.format("query=%s&limit=10",
    URLEncoder.encode("hello world", StandardCharsets.UTF_8));
String full = "https://api.example.com/search?" + query;
System.out.println(full); // https://api.example.com/search?query=hello+world&limit=10

// Parse a URI
URI parsed = new URI("https://api.example.com/search?query=hello%20world&limit=10");
System.out.println(parsed.getQuery()); // query=hello%20world&limit=10
```

## Explanation

A URL can only carry a limited set of characters before the meaning becomes
ambiguous, because many byte values would be read as delimiters. The unreserved
characters (`A-Z`, `a-z`, `0-9`, `-`, `_`, `.`, `~`)
can appear as-is; everything else must be percent-encoded using the UTF-8 byte
sequence of the character.

For example, the space character becomes `%20` because its UTF-8 byte is `0x20`.
In query strings, many libraries also accept `+` as a space because of the
`application/x-www-form-urlencoded` convention from HTML forms.

The key risk is embedding raw user input. A `&` or `?` in a value would be
misread as a query or path delimiter. Encoding turns `&` into `%26` and `?` into
`%3F`, so the server receives the value intact.

## Variants

The right function depends on the language and the part of the URL you're
building:

| Function | Encodes | Safe for |
| --- | --- | --- |
| `encodeURIComponent` (JS) | Everything except the unreserved set | Query values and path segments |
| `encodeURI` (JS) | Same, but keeps URL delimiters intact | Full URLs |
| `quote` (Python) | All non-alphanumerics by default | Paths and queries with a `safe` override |
| `urlencode` (Python) | Same as `quote_plus` | Query strings where spaces become `+` |
| `URLEncoder` (Java) | All except `a-z A-Z 0-9 - _ . *` | Query strings where spaces become `+` |

For a deeper comparison of string parsing approaches, see
[Regular Expressions](/recipes/regular-expressions/).

## Best Practices

- Always encode user input before embedding it in a URL.
- In JavaScript, reach for `encodeURIComponent` for query values, not `encodeURI`.
- In Python, use `urlencode` for full query strings and `quote` for path segments.
- Encoding the whole URL instead of only the live parts, such as values and path
  segments.
- Prefer `URLSearchParams` in modern JavaScript for safe query construction.
- Handle `+` carefully: it means space in query strings, while `%20` is the safer
  choice for paths and modern specs.
- Treat decoded input as untrusted and validate it with a library such as
  [Data Validation](/recipes/data-validation/) or a schema validator.

## Common Mistakes

- Using `encodeURI` for query values. `encodeURI` won't encode `&`, `=`, or `?`,
  so the query can break.
- Forgetting to encode user input and getting malformed URLs or injection.
- Double-encoding values that were already encoded by another layer.
- Confusing spaces encoded as `+` in query strings with `%20` in paths and newer
  specs.
- Using `split()` on a URL string instead of a proper URI parser such as
  `urllib.parse` or `new URL()`.
- Encoding an already-encoded URL. You end up with `%2520` when you encode `%20`
  a second time.
- Passing raw spaces or Unicode into `new URL()` without encoding them. Some
  runtimes accept it, but the result isn't consistent.

## FAQ

### Which characters need to be encoded?

Any character outside the unreserved set `A-Z a-z 0-9 - _ . ~` should be encoded
before it goes into a URL. Reserved characters such as `&`, `=`, `?`, `#`, `/`,
and space are especially important because they carry structural meaning.

### What is the difference between `encodeURI` and `encodeURIComponent`?

`encodeURI` keeps the delimiters that make a URL work (`:`, `/`, `?`, `&`, etc.),
so it's meant for full URLs. `encodeURIComponent` encodes almost everything, so
it's the right choice for individual query values and path segments.

### Should I use `+` or `%20` for spaces?

In query strings, many servers accept `+` because of HTML forms, and `urlencode`
in Python emits `+` by default. In paths and for modern APIs, `%20` is the safer
and more standard choice. When you aren't sure which to use, `%20` is the safer
option.

### How do I handle non-ASCII characters?

Encode them as UTF-8 first, then percent-encode each byte. Modern URL APIs do
this automatically. For example, `café` becomes `caf%C3%A9`.

### Why am I getting `%2520`?

You get `%2520` when you encode `%20` twice. It means you encoded the value after
it had already been encoded. Decode the value once before re-encoding it, or
encode only once at the boundary where the value enters the URL.

### How do I decode a query string?

In JavaScript, use `new URL(url).searchParams` to get a parsed map of values. In
Python, use `parse_qs` or `parse_qsl` from `urllib.parse`. In Java, call
`URLDecoder.decode` on each value, not on the full URL string.
