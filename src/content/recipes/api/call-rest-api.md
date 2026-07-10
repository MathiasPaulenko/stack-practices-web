---
contentType: recipes
slug: call-rest-api
title: "Call a REST API"
description: "How to make HTTP requests to a REST API and handle the JSON response in multiple languages."
metaDescription: "Learn how to call a REST API in Python, JavaScript, and Java with practical HTTP request examples, error handling, and what works."
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
  - /recipes/read-write-file
  - /recipes/api/middleware
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn how to call a REST API in Python, JavaScript, and Java with practical HTTP request examples, error handling, and what works."
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

Here is how to the idiomatic, modern way to make an HTTP request and read the JSON response in Python, JavaScript, and Java, including basic error handling and timeout configuration.

## When to Use

Use this recipe when:

- Fetching data from a third-party or internal API. See [Input Validation](/recipes/api/input-validation) for validating API request and response data.
- Submitting form data or events to a backend service. See [Retry Logic](/recipes/architecture/retry-backoff) for handling transient failures.
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

### Go (Using net/http)

Go's standard library includes a production-ready HTTP client. Always close the response body to avoid resource leaks, and use `context` for timeouts.

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

    req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.example.com/users/1", nil)
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

### Python with Authentication and POST

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

### JavaScript with AbortController (Timeout)

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

- **Python** uses the popular `requests` library. `raise_for_status()` turns error responses into exceptions; `.json()` parses the body. Always pass a `timeout` to prevent indefinite blocking on slow or unresponsive servers.
- **JavaScript** uses the built-in `fetch` API (Node 18+ and all modern browsers). Note that `fetch` only rejects on network errors — HTTP errors like 404 or 500 still resolve the promise, so you must check `response.ok` yourself.
- **Java** uses the built-in `java.net.http.HttpClient` (Java 11+). It supports synchronous (`send`) and asynchronous (`sendAsync`) calls, and can be configured with connection pooling and request timeouts.

Once you receive the body, see [Parse JSON](/recipes/data/parse-json) for turning it into typed data.

## Variants

| Language | Client | Async support | Notes |
|----------|--------|---------------|-------|
| Python | `requests` / `httpx` | `httpx` for async | `requests` is sync-only |
| JavaScript | `fetch` (builtin) | native promises | check `response.ok` |
| Java | `HttpClient` (Java 11+) | `sendAsync` | no extra dependency |
| Go | `net/http` (builtin) | goroutines | close response body |
| Rust | `reqwest` | `tokio` runtime | zero-cost abstractions |
| C# | `HttpClient` (builtin) | `async/await` | reuse single instance |

## What Works

- **Always set a timeout**: a hung request can block a thread or worker indefinitely. For Python, pass `timeout=10` to `requests.get`; for Node, use `AbortController` with `fetch`; for Java, set a timeout on the `HttpClient` builder.
- **Check the status code**: don't assume `2xx`; handle `4xx`/`5xx` explicitly. A `401` means authentication failed; a `429` means you are rate-limited; a `503` means the service is temporarily unavailable.
- **Reuse the client**: create one `HttpClient`/session and reuse it for connection pooling. Creating a new client per request wastes resources and prevents TCP connection reuse.
- **Never log secrets**: keep API keys and tokens out of logs and error messages. If you must log a request URL, redact the query parameters that contain credentials.
- **Retry transient failures**: use exponential backoff for `429` and `5xx` responses. A `503` with a `Retry-After` header tells you exactly when to retry; respect it.
- **Set appropriate headers**: always include `Accept: application/json` when expecting JSON, and `Content-Type: application/json` when sending a JSON body. Some APIs reject requests without these headers.
- **Handle redirects carefully**: some HTTP clients follow redirects automatically, which can leak sensitive headers like `Authorization` to unintended hosts. Disable automatic redirects or whitelist allowed domains.
- **Parse defensively**: a server returning HTML (error pages, Cloudflare challenges) instead of JSON will crash naive `.json()` calls. Check `Content-Type` before parsing, and wrap in try/catch.
- **Use connection pooling**: creating a new TCP connection per request adds 50-100ms latency. Reuse `HttpClient` instances (Java, C#), `Session` objects (Python `requests`), or `http.Transport` (Go) to benefit from keep-alive and connection reuse.

## Common Mistakes

- **Forgetting `response.ok` in `fetch`**: a `404` still resolves the promise; you must check manually. This is the most common source of silent failures in JavaScript HTTP code.
- **No timeout**: the default in many clients is infinite, which causes resource exhaustion. A single unresponsive API can eventually consume all available threads or workers.
- **Blocking the event loop**: in JS, always `await` network calls; never busy-wait. Synchronous HTTP calls freeze your entire server for the duration of the request.
- **Hardcoding credentials**: read API keys from environment variables, not source code. Committed credentials are a permanent liability even if you rotate them later.
- **Ignoring rate limits**: respect `Retry-After` headers to avoid being throttled or banned. Some APIs permanently blacklist IPs that repeatedly exceed limits.
- **Not handling JSON parse errors**: a server returning HTML (like a Cloudflare error page) instead of JSON will cause `.json()` to throw. Wrap parsing in a try/catch and inspect the raw body on failure.
- **Sending sensitive data in query parameters**: URLs are logged by proxies, browsers, and server access logs. Use request headers or POST bodies for tokens and credentials.
- **Not closing response bodies**: in Go and Java, failing to close the response body leaks TCP connections and can exhaust file descriptors under load.
- **Ignoring Content-Type headers**: if the server returns `text/html` instead of `application/json`, calling `.json()` throws. Always check the content type before parsing.
- **Not handling pagination**: many APIs return paginated results with `Link` headers or cursor tokens. Failing to follow pagination links means you only get the first page of data.

## Best Practices

- **Always set timeouts**: connection timeout (5-10s) and read timeout (30-60s) separately. Without timeouts, a single hung request can block a worker indefinitely.
- **Use connection pooling**: reusing TCP connections via keep-alive reduces latency by 30-50% for repeated calls to the same host. Configure pool size based on your concurrency needs.
- **Implement exponential backoff with jitter**: retry failed requests with increasing delays (1s, 2s, 4s, 8s) plus random jitter to avoid thundering herd. Cap retries at 3-5 attempts.
- **Cache idempotent GET responses**: use ETag or Last-Modified headers to cache responses. Conditional requests (If-None-Match) return 304 with no body, saving bandwidth and parse time.
- **Validate response schema before using data**: don't trust API responses to match your expectations. Use Zod, Pydantic, or JSON Schema validation to catch shape changes early.

## Production Checklist

- [ ] Timeouts are set for both connection and read phases
- [ ] Connection pooling is configured with appropriate pool size
- [ ] Retry logic uses exponential backoff with jitter
- [ ] 429 and 503 responses respect `Retry-After` headers
- [ ] Error responses are logged with request URL, status, and response body
- [ ] Sensitive headers (Authorization) are never logged
- [ ] Response schema validation catches unexpected API changes
- [ ] Circuit breaker prevents cascading failures when downstream API is down
- [ ] HTTP/2 is enabled for multiplexing multiple requests over one connection
- [ ] DNS resolution failures are handled gracefully with caching

## When Not to Use This Approach

- **Real-time bidirectional communication**: REST is request-response only. For chat, live dashboards, or collaborative editing, use [WebSockets](/recipes/api/websocket-server) or [Server-Sent Events](/recipes/api/server-sent-events) instead.
- **High-frequency micro-batch calls**: if you're making 100+ calls/second to the same API, consider gRPC with multiplexed connections or a bulk/batch endpoint to reduce per-request overhead.
- **Large file transfers**: REST APIs have practical payload limits (typically 10-100MB). For multi-GB transfers, use presigned S3 URLs or a dedicated file transfer protocol.

## Testing Strategy

- **Unit test HTTP clients with mocked responses**: use `nock` (Node.js), `responses` (Python), or `WireMock` (Java) to mock API responses. Test success, error, timeout, and edge-case payloads without hitting real servers.
- **Integration test with a local server**: spin up a test server returning canned responses. Verify the full request/response cycle including headers, auth, and error handling.
- **Contract test against real API**: run a subset of tests against the real API in staging. Use recorded responses (VCR cassettes) for replay in CI to avoid rate limits and flakiness.
- **Load test with realistic payloads**: use `k6` or `Artillery` to simulate concurrent users. Measure p95 latency, error rate, and throughput under load.

## Cost Estimation

| Component | Cost | Notes |
|-----------|------|-------|
| HTTP client library | $0 | Built-in (fetch, HttpClient, requests) |
| Connection pool infrastructure | $0 | In-process, no external service |
| Retry/backoff overhead | $0 | Code-level, no infra cost |
| API gateway (per million calls) | $3.50 | AWS API Gateway, GCP API Gateway |
| CDN for API responses | $0-$20/month | Cloudflare free tier, CloudFront |

For 1M API calls/day: the client-side cost is effectively $0 (library + connection pool). Server-side API Gateway adds ~$105/month. The main cost is developer time for implementing retry logic, circuit breakers, and monitoring.

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

**Q: How do I handle API pagination?**
A: Most REST APIs use one of three patterns: offset/limit (`?page=2&limit=20`), cursor-based (`?cursor=abc123`), or `Link` headers. Read the API docs to determine which pattern is used. For cursor-based pagination, store the cursor from each response and pass it in the next request until no cursor is returned.

**Q: What HTTP status codes should I retry?**
A: Retry `429` (rate limited), `500`, `502`, `503`, and `504` with exponential backoff. Do not retry `400`, `401`, `403`, `404`, or `422` — these are client errors that won't succeed on retry. Respect the `Retry-After` header on `429` and `503` responses.

**Q: How do I stream large API responses?**
A: In Python, use `response.iter_content(chunk_size=8192)` to stream the body. In JavaScript, use `response.body.getReader()` for streaming. In Go, read from `resp.Body` in chunks. Streaming avoids loading the entire response into memory.

**Q: Should I use a connection timeout or a read timeout?**
A: Both. A connection timeout (typically 5-10s) covers TCP handshake failures. A read timeout (typically 30-60s) covers slow responses. Set them independently to distinguish between "can't connect" and "connected but server is slow."

**Q: How do I test API calls without hitting the real server?**
A: Use mock servers like WireMock (Java), nock (JavaScript), or `responses` (Python). For integration tests, use tools like [Pact](/recipes/testing/api-contract-testing) for contract testing. Record and replay HTTP interactions with tools like VCR (Ruby) or Polly.js (JavaScript).
