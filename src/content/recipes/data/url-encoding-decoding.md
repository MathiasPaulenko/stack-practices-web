---
contentType: recipes
slug: url-encoding-decoding
title: "URL Encoding and Decoding: encodeURI, encodeURIComponent, and Beyond"
description: "Master URL encoding in JavaScript and other languages with encodeURI, encodeURIComponent, plus-safe handling, RFC 3986 compliance, and decoding edge cases"
metaDescription: "Master URL encoding in JavaScript with encodeURI, encodeURIComponent, RFC 3986 compliance, plus-safe handling, and decoding edge cases."
difficulty: beginner
topics:
  - data
  - frontend
tags:
  - encoding
  - javascript
  - frontend
  - data
  - parsing
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /recipes/security/data-validation-zod
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Master URL encoding in JavaScript with encodeURI, encodeURIComponent, RFC 3986 compliance, plus-safe handling, and decoding edge cases."
  keywords:
    - url encoding
    - encodeURIComponent
    - RFC 3986
    - percent encoding
    - query parameters
---

# URL Encoding and Decoding: encodeURI, encodeURIComponent, and Beyond

Correctly encode URLs and URI components to handle special characters, spaces, and Unicode safely across browsers, servers, and APIs. This approach handles `encodeURI`, `encodeURIComponent`, RFC 3986 compliance, form data encoding, and decoding edge cases.

## When to Use This

- Building query strings from [user input](/recipes/api/input-validation) or live data
- Generating URLs with special characters, spaces, or non-ASCII text
- Parsing and re-encoding URLs from [external sources](/recipes/api/call-rest-api) safely

## Solution

### 1. encodeURI vs encodeURIComponent

```typescript
// encoding/UriComparison.ts
const url = 'https://example.com/search?q=hello world&sort=date';

// encodeURI: preserves URL structure characters
encodeURI(url);
// 'https://example.com/search?q=hello%20world&sort=date'

// encodeURIComponent: encodes everything including structure chars
encodeURIComponent(url);
// 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26sort%3Ddate'

// Rule of thumb:
// - encodeURI for complete URLs
// - encodeURIComponent for individual query parameters
```

### 2. Building Safe Query Strings

```typescript
// encoding/QueryBuilder.ts
function buildQueryString(params: Record<string, string | number>): string {
  const pairs = Object.entries(params).map(([key, value]) => {
    return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
  });

  return pairs.join('&');
}

// Usage
const query = buildQueryString({
  search: 'hello world',
  filter: 'type=news&date=today',
  emoji: '🔥',
});
// 'search=hello%20world&filter=type%3Dnews%26date%3Dtoday&emoji=%F0%9F%94%A5'
```

### 3. Decoding with Edge Case Handling

```typescript
// encoding/SafeDecode.ts
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // Malformed URI (e.g., % not followed by hex)
    return value;
  }
}

function parseQueryString(query: string): Record<string, string> {
  const params: Record<string, string> = {};

  query.replace(/^\?/, '').split('&').forEach((pair) => {
    const [key, value] = pair.split('=').map(safeDecodeURIComponent);
    if (key) params[key] = value || '';
  });

  return params;
}
```

### 4. URLSearchParams API

```typescript
// encoding/URLSearchParams.ts
const params = new URLSearchParams();

params.append('search', 'hello world');
params.append('tags', 'javascript');
params.append('tags', 'typescript');  // supports duplicate keys

params.toString();
// 'search=hello+world&tags=javascript&tags=typescript'

// Parsing
const url = new URL('https://example.com/?search=hello+world&tags=js&tags=ts');
url.searchParams.get('search');     // 'hello world'
url.searchParams.getAll('tags');    // ['js', 'ts']
url.searchParams.has('limit');     // false
```

### 5. RFC 3986 Compliance

```typescript
// encoding/RFC3986.ts
function encodeRFC3986(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// These characters are reserved but often unencoded in practice:
// ! ' ( ) *
// Strict RFC 3986 requires encoding them in certain contexts

function decodeRFC3986(str: string): string {
  return decodeURIComponent(str.replace(/\+/g, ' '));
}
```

### 6. Encoding in Go

```go
// encoding/url.go
package main

import (
    "fmt"
    "net/url"
)

func main() {
    // Query escape (spaces become +)
    fmt.Println(url.QueryEscape("hello world"))  // hello+world

    // Path escape (spaces become %20)
    fmt.Println(url.PathEscape("hello world"))   // hello%20world

    // Build URL
    u := &url.URL{Scheme: "https", Host: "example.com", Path: "/search"}
    q := u.Query()
    q.Set("q", "hello world")
    u.RawQuery = q.Encode()
    fmt.Println(u.String())
    // https://example.com/search?q=hello+world
}
```

## How It Works

- **encodeURI** encodes special characters but preserves URL delimiters (`:`, `/`, `?`, `&`, `=`)
- **encodeURIComponent** encodes everything including delimiters, making it safe for query parameter values
- **URLSearchParams** handles plus signs, duplicate keys, and round-trip encoding automatically
- **RFC 3986** defines which characters must be percent-encoded in each URI component

## Production Considerations

- Always encode user input before placing it in URLs
- Use `URL` and `URLSearchParams` APIs when available for correctness
- Handle malformed input gracefully with try-catch around `decodeURIComponent`

## Common Mistakes

- Using `encodeURI` on query parameter values, which leaves `&` and `=` unencoded
- Not decoding input before validation, allowing double-encoded values to bypass [checks](/recipes/data/data-validation)
- Assuming `+` in URLs always means space; it depends on context (query vs path)

## FAQ

**Q: Why does `+` sometimes decode to space?**
A: In query strings, `+` is a legacy encoding for space (application/x-www-form-urlencoded). In URL paths, `+` means literal plus and space should be `%20`.

**Q: Should I use `escape()`?**
A: No. `escape()` is deprecated, non-standard, and incorrectly handles non-ASCII characters. Always use `encodeURIComponent`.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
