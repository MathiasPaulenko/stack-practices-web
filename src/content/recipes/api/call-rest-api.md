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
  - /recipes/api/middleware
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

REST (Representational State Transfer) has been the dominant architectural style for web services since the early 2000s. It uses standard HTTP methods — GET for retrieval, POST for creation, PUT for updates, DELETE for removal — and returns structured data formats like JSON or XML. Understanding how to properly construct requests, handle errors, and parse responses is a foundational skill for any developer building connected applications.

This recipe shows the idiomatic, modern way to make an HTTP request and read the JSON response in Python, JavaScript, and Java, including basic error handling and timeout configuration.

## When to Use

Use this recipe when:

- Fetching data from a third-party or internal API
- Submitting form data or events to a backend service
- Integrating with SaaS platforms (payments, email, analytics)
- Building a client SDK or CLI that talks to an HTTP service
- Uploading files to a storage API or CDN
- Polling for job status or webhook delivery confirmation
- Building serverless functions that orchestrate multiple API calls

## Solution

### Python

Python's `requests` library is the most popular HTTP client. Always pass a `timeout` to prevent hanging indefinitely, and use `raise_for_status()` to turn HTTP error codes into exceptions that stop execution.

```python
import requests

response = requests.get("https://api.example.com/users/1", timeout=10)
response.raise_for_status()  # raises on 4xx/5xx

data = response.json()
print(data["name"])
```

### JavaScript

The built-in `fetch` API is available in all modern browsers and Node.js 18+. Note that `fetch` only rejects on network errors; HTTP error responses like 404 or 500 still resolve the promise, so you must check `response.ok` manually.

```javascript
const response = await fetch("https://api.example.com/users/1");
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

const data = await response.json();
console.log(data.name);
```

### Java

Java 11 introduced `java.net.http.HttpClient`, replacing the older `HttpURLConnection`. It supports both synchronous (`send`) and asynchronous (`sendAsync`) requests, and handles HTTP/2 and WebSocket upgrades transparently.

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

- **Python** uses the popular `requests` library. `raise_for_status()` turns error responses into exceptions; `.json()` parses the body. Always pass a `timeout` to prevent indefinite blocking on slow or unresponsive servers.
- **JavaScript** uses the built-in `fetch` API (Node 18+ and all modern browsers). Note that `fetch` only rejects on network errors — HTTP errors like 404 or 500 still resolve the promise, so you must check `response.ok` yourself.
- **Java** uses the built-in `java.net.http.HttpClient` (Java 11+). It supports synchronous (`send`) and asynchronous (`sendAsync`) calls, and can be configured with connection pooling and request timeouts.

Once you receive the body, see [Parse JSON](/recipes/parse-json) for turning it into typed data.

## Variants

| Language | Client | Async support | Notes |
|----------|--------|---------------|-------|
| Python | `requests` / `httpx` | `httpx` for async | `requests` is sync-only |
| JavaScript | `fetch` (builtin) | native promises | check `response.ok` |
| Java | `HttpClient` (Java 11+) | `sendAsync` | no extra dependency |

## Best Practices

- **Always set a timeout**: a hung request can block a thread or worker indefinitely. For Python, pass `timeout=10` to `requests.get`; for Node, use `AbortController` with `fetch`; for Java, set a timeout on the `HttpClient` builder.
- **Check the status code**: don't assume `2xx`; handle `4xx`/`5xx` explicitly. A `401` means authentication failed; a `429` means you are rate-limited; a `503` means the service is temporarily unavailable.
- **Reuse the client**: create one `HttpClient`/session and reuse it for connection pooling. Creating a new client per request wastes resources and prevents TCP connection reuse.
- **Never log secrets**: keep API keys and tokens out of logs and error messages. If you must log a request URL, redact the query parameters that contain credentials.
- **Retry transient failures**: use exponential backoff for `429` and `5xx` responses. A `503` with a `Retry-After` header tells you exactly when to retry; respect it.
- **Set appropriate headers**: always include `Accept: application/json` when expecting JSON, and `Content-Type: application/json` when sending a JSON body. Some APIs reject requests without these headers.
- **Handle redirects carefully**: some HTTP clients follow redirects automatically, which can leak sensitive headers like `Authorization` to unintended hosts. Disable automatic redirects or whitelist allowed domains.

## Common Mistakes

- **Forgetting `response.ok` in `fetch`**: a `404` still resolves the promise; you must check manually. This is the most common source of silent failures in JavaScript HTTP code.
- **No timeout**: the default in many clients is infinite, which causes resource exhaustion. A single unresponsive API can eventually consume all available threads or workers.
- **Blocking the event loop**: in JS, always `await` network calls; never busy-wait. Synchronous HTTP calls freeze your entire server for the duration of the request.
- **Hardcoding credentials**: read API keys from environment variables, not source code. Committed credentials are a permanent liability even if you rotate them later.
- **Ignoring rate limits**: respect `Retry-After` headers to avoid being throttled or banned. Some APIs permanently blacklist IPs that repeatedly exceed limits.
- **Not handling JSON parse errors**: a server returning HTML (like a Cloudflare error page) instead of JSON will cause `.json()` to throw. Wrap parsing in a try/catch and inspect the raw body on failure.
- **Sending sensitive data in query parameters**: URLs are logged by proxies, browsers, and server access logs. Use request headers or POST bodies for tokens and credentials.

## Frequently Asked Questions

**Q: Does `fetch` throw on a 404 response?**
A: No. `fetch` only rejects on network failures. A `404` resolves normally — check `response.ok` or `response.status` before processing the body.

**Q: Do I need an external library to call HTTP APIs in Java?**
A: No. Since Java 11, `java.net.http.HttpClient` is built in and supports both sync and async requests. For older Java versions, you can use Apache HttpClient or OkHttp.

**Q: How do I send JSON in a POST request?**
A: Set the `Content-Type: application/json` header and pass the serialized JSON string as the request body. In Python, use `json=` parameter of `requests.post`; in JS, use `JSON.stringify()` with the `body` option.

**Q: How do I cancel a long-running request?**
A: Use `AbortController` in JavaScript (`signal` option), `timeout` parameter in Python `requests`, or `HttpRequest.timeout()` in Java. All modern HTTP clients support request cancellation.

**Q: Should I use GET or POST for search queries?**
A: Use GET for idempotent, cacheable retrieval where the parameters fit in a URL. Use POST for large payloads, sensitive data, or non-idempotent operations. GET requests should not have side effects.
