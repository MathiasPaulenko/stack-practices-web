---
contentType: recipes
slug: call-rest-api
title: "Call a REST API"
description: "How to make HTTP requests to a REST API and handle the JSON response in multiple languages."
metaDescription: "Learn how to call a REST API in Python, JavaScript, and Java with practical HTTP request examples, error handling, and best practices."
difficulty: beginner
topics:
  - api
tags:
  - rest
  - http
  - api
  - python
  - javascript
  - java
relatedResources:
  - /recipes/parse-json
  - /recipes/read-write-file
lastUpdated: "2026-06-09"
author: "StackPractices"
seo:
  metaDescription: "Learn how to call a REST API in Python, JavaScript, and Java with practical HTTP request examples, error handling, and best practices."
  keywords:
    - rest
    - http
    - api
    - python
    - javascript
    - java
---
## Overview

Most applications talk to the outside world through REST APIs over HTTP. Calling a REST API means sending an HTTP request (usually `GET` or `POST`) to a URL and handling the response — typically JSON.

This recipe shows the idiomatic, modern way to make an HTTP request and read the JSON response in Python, JavaScript, and Java, including basic error handling.

## When to Use

Use this recipe when:

- Fetching data from a third-party or internal API
- Submitting form data or events to a backend service
- Integrating with SaaS platforms (payments, email, analytics)
- Building a client SDK or CLI that talks to an HTTP service

## Solution

### Python

```python
import requests

response = requests.get("https://api.example.com/users/1", timeout=10)
response.raise_for_status()  # raises on 4xx/5xx

data = response.json()
print(data["name"])
```

### JavaScript

```javascript
const response = await fetch("https://api.example.com/users/1");
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

const data = await response.json();
console.log(data.name);
```

### Java

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
System.out.println(response.body());
```

## Explanation

- **Python** uses the popular `requests` library. `raise_for_status()` turns error responses into exceptions; `.json()` parses the body. Always pass a `timeout`.
- **JavaScript** uses the built-in `fetch` API (Node 18+ and all modern browsers). Note that `fetch` only rejects on network errors — you must check `response.ok` yourself.
- **Java** uses the built-in `java.net.http.HttpClient` (Java 11+). It supports synchronous (`send`) and asynchronous (`sendAsync`) calls.

Once you receive the body, see [Parse JSON](/recipes/parse-json) for turning it into typed data.

## Variants

| Language | Client | Async support | Notes |
|----------|--------|---------------|-------|
| Python | `requests` / `httpx` | `httpx` for async | `requests` is sync-only |
| JavaScript | `fetch` (builtin) | native promises | check `response.ok` |
| Java | `HttpClient` (Java 11+) | `sendAsync` | no extra dependency |

## Best Practices

- **Always set a timeout**: a hung request can block a thread or worker indefinitely.
- **Check the status code**: don't assume `2xx`; handle `4xx`/`5xx` explicitly.
- **Reuse the client**: create one `HttpClient`/session and reuse it for connection pooling.
- **Never log secrets**: keep API keys and tokens out of logs and error messages.
- **Retry transient failures**: use exponential backoff for `429` and `5xx` responses.

## Common Mistakes

- **Forgetting `response.ok` in `fetch`**: a `404` still resolves the promise; you must check manually.
- **No timeout**: the default in many clients is infinite, which causes resource exhaustion.
- **Blocking the event loop**: in JS, always `await` network calls; never busy-wait.
- **Hardcoding credentials**: read API keys from environment variables, not source code.
- **Ignoring rate limits**: respect `Retry-After` headers to avoid being throttled or banned.

## Frequently Asked Questions

**Q: Does `fetch` throw on a 404 response?**
A: No. `fetch` only rejects on network failures. A `404` resolves normally — check `response.ok` or `response.status`.

**Q: Do I need an external library to call HTTP APIs in Java?**
A: No. Since Java 11, `java.net.http.HttpClient` is built in and supports both sync and async requests.

**Q: How do I send JSON in a POST request?**
A: Set the `Content-Type: application/json` header and pass the serialized JSON string as the request body.
