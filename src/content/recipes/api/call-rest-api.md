---
contentType: recipes
slug: call-rest-api
title: "Call a REST API: Python, JavaScript, Java & Go Examples"
description: "How to make HTTP requests to a REST API and handle the JSON response in Python, JavaScript, Java, and Go."
metaDescription: "Call REST APIs in Python (requests), JavaScript (fetch), Java (HttpClient), and Go (net/http). GET, POST, auth headers, timeouts, error handling, and JSON parsing."
difficulty: beginner
topics:
  - api
tags:
  - api
  - rest
  - http
  - backend
  - web-services
relatedResources:
  - /recipes/parse-json
  - /recipes/handle-errors
  - /recipes/handle-cors
  - /recipes/middleware
  - /recipes/rest-api-design
  - /patterns/adapter-pattern-api
lastUpdated: "2026-08-25"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Call REST APIs in Python (requests), JavaScript (fetch), Java (HttpClient), and Go (net/http). GET, POST, auth headers, timeouts, error handling, and JSON parsing."
  keywords:
    - rest
    - http
    - api
    - python
    - javascript
    - java
    - go
---

## Overview

Most apps talk to other services over HTTP at some point. A REST API call is just an
HTTP request — usually `GET` or `POST` — to a URL, plus the JSON response. The part
that tends to break is the safety layer: status codes, timeouts, and parsing the body
without crashing.

This recipe covers Python, JavaScript, Java, and Go. Related recipes: [How to Document an API with OpenAPI, Swagger UI and Redoc](/recipes/api-documentation-openapi).

## When to Use

Reach for this recipe when you need an app to talk to another service over HTTP:

- Fetching data from a third-party or internal API.
- Sending form data or events to a backend service.
- Integrating with SaaS platforms — payments, email, analytics.
- Building a client SDK or CLI that calls an HTTP service.
- Uploading files or polling for job status.

## When NOT to Use

- Real-time bidirectional communication: use [WebSockets](/recipes/websocket-server/)
  or [Server-Sent Events](/recipes/server-sent-events/) instead.
- Streaming huge payloads: consider a dedicated file transfer protocol or presigned
  URLs.

## Solution

### Python with `requests`

`requests` is the standard HTTP client in Python. Pass a `timeout` so the call won't
hang, and use `raise_for_status()` to throw on `4xx`/`5xx`.

```python
import requests

response = requests.get("https://api.example.com/users/1", timeout=10)
response.raise_for_status()

data = response.json()
print(data["name"])
```

### JavaScript with `fetch`

`fetch` works in modern browsers and Node.js 18+. It only rejects on network errors;
HTTP error responses still resolve, so check `response.ok` yourself.

```javascript
const response = await fetch("https://api.example.com/users/1");
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

const data = await response.json();
console.log(data.name);
```

### Java with `HttpClient`

Java 11 ships `java.net.http.HttpClient`. It supports both sync and async requests and
handles HTTP/2 transparently.

```java
import java.net.URI;
import java.net.http.*;

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users/1"))
    .GET()
    .build();

HttpResponse<String> response =
    client.send(request, HttpResponse.BodyHandlers.ofString());

if (response.statusCode() >= 400) {
    throw new RuntimeException("HTTP " + response.statusCode());
}

System.out.println(response.body());
```

### Go with `net/http`

Go's standard library has a production-ready HTTP client. Close the response body to
avoid leaks, and use `context` for timeouts.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", "https://api.example.com/users/1", nil)
    if err != nil {
        panic(err)
    }
    req.Header.Set("Accept", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        panic(fmt.Sprintf("HTTP %d", resp.StatusCode))
    }

    body, _ := io.ReadAll(resp.Body)
    var data map[string]interface{}
    json.Unmarshal(body, &data)
    fmt.Println(data["name"])
}
```

### POST with JSON and authentication

```python
import requests

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

payload = {"name": "Alice", "email": "alice@example.com"}

response = requests.post(
    "https://api.example.com/users",
    json=payload,
    headers=headers,
    timeout=10,
)
response.raise_for_status()
created = response.json()
print(f"Created user with ID: {created['id']}")
```

### JavaScript with a timeout

```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch("https://api.example.com/users/1", {
    signal: controller.signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  console.log(data.name);
} catch (err) {
  if (err.name === "AbortError") {
    console.error("Request timed out");
  } else {
    throw err;
  }
} finally {
  clearTimeout(timeout);
}
```

## Explanation

Every example follows the same four steps:

1. Build the request (URL, method, headers, body).
2. Set a timeout so a slow or broken server can't block the client.
3. Send the request and check the status code.
4. Parse the body as JSON and handle parse errors.

`raise_for_status()` in Python and `response.ok` in JavaScript throw on HTTP errors.
Java and Go make you check the status code yourself. To turn JSON into typed data, see
[Parse JSON](/recipes/parse-json/).

## Variants

|Language|Client|Async support|Notes|
|--------|------|-------------|-----|
|Python|`requests` / `httpx`|`httpx` for async|`requests` is sync-only|
|JavaScript|`fetch` (built-in)|native promises|check `response.ok`|
|Java|`HttpClient` (Java 11+)|`sendAsync`|no extra dependency|
|Go|`net/http` (built-in)|goroutines|close response body|
|Rust|`reqwest`|`tokio` runtime|popular, ergonomic|
|C#|`HttpClient` (built-in)|`async/await`|reuse single instance|

## Best Practices

- Set a timeout so a hung request can't block the worker forever.
- Check status codes explicitly; don't assume `2xx`.
- Reuse clients or sessions to benefit from connection pooling and keep-alive.
- Send `Accept: application/json` when you expect JSON and
  `Content-Type: application/json` when you send a JSON body.
- Read API keys from environment variables; never commit them.
- Retry `429` and `5xx` with exponential backoff and respect `Retry-After` headers.
- Wrap `.json()` parsing in a try/catch; a server may return HTML instead of JSON
  during an outage.

## Common Mistakes

- **Forgetting `response.ok` in `fetch`**: a `404` still resolves the promise, so check
  the status manually.
- **No timeout**: the default in many clients is infinite, which can exhaust workers.
- **Hardcoding credentials**: keep tokens out of source code and logs.
- **Ignoring rate limits**: respect `Retry-After` to avoid being throttled or banned.
- **Not closing response bodies** in Go and Java: this leaks connections and can
  exhaust file descriptors.
- **Sending sensitive data in query parameters**: URLs appear in logs, so put tokens in
  headers or POST bodies.

## FAQ

### Does `fetch` throw on a 404?

No. `fetch` only rejects on network failures. A `404` resolves normally, so check
`response.ok` or `response.status` before reading the body.

### Do I need an external library to call HTTP APIs in Java?

No. Java 11 ships with `java.net.http.HttpClient`, which supports sync and async
requests. For older Java versions, use Apache HttpClient or OkHttp.

### How do I send JSON in a POST request?

Set `Content-Type: application/json` and pass the serialized JSON as the body. In
Python, use `requests.post(url, json=payload)`; in JavaScript, pass a stringified
object.

### How do I cancel a long-running request?

Use `AbortController` in JavaScript, the `timeout` parameter in Python `requests`, or
`HttpRequest.timeout()` in Java.

### Should I use GET or POST for search queries?

Use GET for idempotent, cacheable lookups when the parameters fit in the URL. Use POST
for large payloads, sensitive data, or non-idempotent operations.

### How do I handle API pagination?

REST APIs usually use offset/limit (`?page=2&limit=20`), cursor-based
(`?cursor=abc123`), or `Link` headers. Check the API docs to find the pattern and loop
until no more pages are returned.

### What status codes should I retry?

Retry `429`, `500`, `502`, `503`, and `504` with exponential backoff. Don't retry
`400`, `401`, `403`, `404`, or `422` — those are client errors that won't succeed on
retry.
