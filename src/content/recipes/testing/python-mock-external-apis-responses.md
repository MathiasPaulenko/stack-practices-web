---




contentType: recipes
slug: python-mock-external-apis-responses
title: "Mock External APIs with responses Library"
description: "How to mock HTTP API calls in Python tests using the responses library, including status codes, headers, JSON bodies, and error simulation."
metaDescription: "Mock external HTTP APIs in Python tests with the responses library. Simulate status codes, JSON bodies, timeouts, and connection errors easily."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - python
  - mocking
  - http
  - responses
  - requests
  - recipe
relatedResources:
  - /recipes/python-pytest-fixtures-parametrize
  - /recipes/setup-test-fixtures
  - /recipes/unit-testing-mocking
  - /recipes/python-coverage-pytest-cov
  - /recipes/python-hypothesis-property-testing
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Mock external HTTP APIs in Python tests with the responses library. Simulate status codes, JSON bodies, timeouts, and connection errors easily."
  keywords:
    - testing
    - python
    - mocking
    - http
    - responses
    - requests
    - recipe




---

## Overview

The `responses` library intercepts HTTP requests made by the `requests` library in Python tests. Instead of hitting real external services, `responses` returns predefined mock responses. This makes tests fast, deterministic, and independent of network conditions.

## When to Use

- Testing code that calls third-party REST APIs (payment gateways, email services, SMS providers)
- Simulating API error responses (500s, timeouts, rate limits) without a real service
- Verifying that your code sends the correct request body, headers, and query parameters
- Running tests in CI without network access or API keys

## When NOT to Use

- Testing your own API endpoints — use a test client (e.g., FastAPI `TestClient`, Django `TestCase`)
- Integration tests that need a real database or message queue — use Testcontainers instead
- Load testing — mocks don't reflect real-world latency or throughput
- Testing webhook receivers — use a local server with `httpx` or `aiohttp` test utilities

## Solution

### Setup

```bash
pip install responses pytest
```

### Basic mock response

```python
import responses
import pytest
import requests

@responses.activate
def test_get_user():
    responses.add(
        method=responses.GET,
        url="https://api.example.com/users/1",
        json={"id": 1, "name": "Alice", "email": "alice@example.com"},
        status=200,
    )

    resp = requests.get("https://api.example.com/users/1")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Alice"
```

### Mock with headers and query params

```python
@responses.activate
def test_search_with_params():
    responses.add(
        method=responses.GET,
        url="https://api.example.com/search",
        json={"results": [{"title": "Python Guide"}]},
        status=200,
        headers={"X-RateLimit-Remaining": "99"},
    )

    resp = requests.get(
        "https://api.example.com/search",
        params={"q": "python", "page": 1},
        headers={"Authorization": "Bearer test-token"},
    )

    assert resp.headers["X-RateLimit-Remaining"] == "99"
    assert resp.json()["results"][0]["title"] == "Python Guide"

    # Verify the request was made correctly
    assert len(responses.calls) == 1
    assert "q=python" in responses.calls[0].request.url
```

### Mock error responses

```python
@responses.activate
def test_handle_server_error():
    responses.add(
        method=responses.GET,
        url="https://api.example.com/users/1",
        status=500,
        json={"error": "Internal Server Error"},
    )

    with pytest.raises(requests.HTTPError):
        resp = requests.get("https://api.example.com/users/1")
        resp.raise_for_status()


@responses.activate
def test_handle_timeout():
    responses.add(
        method=responses.GET,
        url="https://api.example.com/slow-endpoint",
        body=requests.exceptions.Timeout("Connection timed out"),
    )

    with pytest.raises(requests.exceptions.Timeout):
        requests.get("https://api.example.com/slow-endpoint")
```

### Mock multiple responses for the same URL

```python
@responses.activate
def test_retry_logic():
    responses.add(
        method=responses.GET,
        url="https://api.example.com/data",
        status=503,
    )
    responses.add(
        method=responses.GET,
        url="https://api.example.com/data",
        status=200,
        json={"data": "success"},
    )

    # First call fails
    resp1 = requests.get("https://api.example.com/data")
    assert resp1.status_code == 503

    # Second call succeeds
    resp2 = requests.get("https://api.example.com/data")
    assert resp2.status_code == 200
    assert resp2.json()["data"] == "success"
```

### Using a callback for dynamic responses

```python
@responses.activate
def test_callback_response():
    def request_callback(request):
        payload = request.body
        if b"premium" in payload:
            return (200, {}, json.dumps({"tier": "premium", "quota": 10000}))
        return (200, {}, json.dumps({"tier": "free", "quota": 100}))

    responses.add_callback(
        method=responses.POST,
        url="https://api.example.com/subscribe",
        callback=request_callback,
        content_type="application/json",
    )

    resp = requests.post(
        "https://api.example.com/subscribe",
        json={"plan": "premium"},
    )
    assert resp.json()["quota"] == 10000
```

### Asserting on request body

```python
@responses.activate
def test_post_request_body():
    responses.add(
        method=responses.POST,
        url="https://api.example.com/orders",
        status=201,
        json={"id": 42, "status": "created"},
    )

    requests.post(
        "https://api.example.com/orders",
        json={"product_id": 10, "quantity": 3},
    )

    sent_body = json.loads(responses.calls[0].request.body)
    assert sent_body["product_id"] == 10
    assert sent_body["quantity"] == 3
```

### Using `responses` as a pytest fixture

```python
import responses
import pytest

@pytest.fixture
def mock_api():
    with responses.RequestsMock() as rsps:
        yield rsps

def test_with_fixture(mock_api):
    mock_api.add(
        method=responses.GET,
        url="https://api.example.com/health",
        status=200,
        json={"status": "healthy"},
    )

    resp = requests.get("https://api.example.com/health")
    assert resp.json()["status"] == "healthy"
```

## Variants

### Using `httpx` with `respx`

If you use `httpx` instead of `requests`, use the `respx` library:

```python
import respx
import httpx

@respx.mock
def test_httpx_mock():
    respx.get("https://api.example.com/users/1").respond(
        200, json={"id": 1, "name": "Alice"}
    )

    resp = httpx.get("https://api.example.com/users/1")
    assert resp.json()["name"] == "Alice"
```

### Using `aioresponses` for `aiohttp`

```python
from aioresponses import aioresponses
import aiohttp
import pytest

@pytest.mark.asyncio
async def test_async_mock():
    with aioresponses() as m:
        m.get("https://api.example.com/data", payload={"key": "value"})

        async with aiohttp.ClientSession() as session:
            async with session.get("https://api.example.com/data") as resp:
                data = await resp.json()
                assert data["key"] == "value"
```

## Best Practices


- For a deeper guide, see [Stub External HTTP Services with WireMock](/recipes/java-wiremock-stub-external/).

- Always use `@responses.activate` or the context manager — without it, real HTTP calls go through
- Assert on `responses.calls` to verify your code sent the correct request
- Use `add_callback` for complex logic that can't be expressed with static responses
- Reset `responses.calls` between tests if you're checking call counts
- Mock at the HTTP layer, not at the function layer — this tests the real integration path

## Common Mistakes

- **Forgetting `@responses.activate`**: without it, `responses.add` raises an error or real requests go through.
- **Not matching the exact URL**: `responses` matches URLs exactly by default. Use `match_querystring=True` or regex URLs for flexibility.
- **Mocking too many endpoints**: if every test mocks 10 endpoints, the test setup becomes the test. Extract shared mocks into fixtures.
- **Not testing error paths**: mock 500s, timeouts, and rate limits — these are the paths that fail in production.
- **Using mocks for integration tests**: mocks verify your code's logic, not that the real API works. Use contract tests for that.

## FAQ

### How do I match URLs with regex?

```python
import re

responses.add(
    method=responses.GET,
    url=re.compile(r"https://api\.example\.com/users/\d+"),
    json={"id": 1},
)
```

### How do I simulate a connection error?

```python
responses.add(
    method=responses.GET,
    url="https://api.example.com/down",
    body=requests.exceptions.ConnectionError("Connection refused"),
)
```

### Can I mock streaming responses?

Yes, pass a generator to `body`:

```python
def stream_generator():
    yield b"chunk1\n"
    yield b"chunk2\n"

responses.add(
    method=responses.GET,
    url="https://api.example.com/stream",
    body=stream_generator(),
    content_type="text/event-stream",
)
```

### How do I verify how many times an endpoint was called?

```python
assert len(responses.calls) == 3
# Or filter by URL
api_calls = [c for c in responses.calls if "api.example.com" in c.request.url]
assert len(api_calls) == 3
```

### Should I use `responses` or `unittest.mock.patch`?

Use `responses` when your code uses the `requests` library. Use `unittest.mock.patch` when you want to mock at the function or method level. `responses` is more realistic because it tests the actual HTTP call path.

### How do I mock streaming responses?

```python
import responses

@responses.activate
def test_streaming():
    def stream_callback(request):
        body = iter([b"chunk1\n", b"chunk2\n", b"chunk3\n"])
        return (200, {"Content-Type": "text/plain"}, body)

    responses.add_callback(
        responses.GET,
        "https://api.example.com/stream",
        callback=stream_callback,
    )
```

### Can I mock responses conditionally based on request body?

Yes. Use `add_callback` to inspect the request and return different responses:

```python
@responses.activate
def test_conditional():
    def callback(request):
        if b"premium" in request.body:
            return (200, {}, json.dumps({"plan": "premium"}))
        return (200, {}, json.dumps({"plan": "free"}))

    responses.add_callback(responses.POST, "https://api.example.com/subscribe", callback=callback)
```
