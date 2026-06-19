---
contentType: recipes
slug: api-mocking
title: "API Mocking for Testing"
description: "Build reliable tests by mocking external APIs with WireMock, MockServer, and MSW to eliminate flakiness and test edge cases."
metaDescription: "API mocking strategies for testing: WireMock, MockServer, MSW, stub definitions, response templating, and testing edge cases without real dependencies."
difficulty: intermediate
topics:
  - testing
tags:
  - api-mocking
  - testing
  - mocking
  - automation
relatedResources:
  - /guides/cicd-pipeline-guide
  - /guides/testing-strategy-guide
  - /recipes/end-to-end-testing
  - /guides/test-driven-development-guide
  - /recipes/load-testing-k6
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "API mocking strategies for testing: WireMock, MockServer, MSW, stub definitions, response templating, and testing edge cases without real dependencies."
  keywords:
    - api-mocking
    - testing
    - mocking
    - automation
---
## Overview

API mocking replaces real external dependencies with controlled simulations during [testing](/guides/testing-strategy-guide). This eliminates network flakiness, reduces test execution time, and enables testing edge cases — like 500 errors or timeouts — that are hard to reproduce with live services. Modern tools like WireMock, MSW, and MockServer provide request matching, response templating, and verification capabilities that make mocks behave like the real thing.

## When to Use

Use this resource when:
- External APIs are unreliable, slow, or have rate limits that block [CI pipelines](/guides/cicd-pipeline-guide)
- You need to test error handling for HTTP 429, 503, or [timeout scenarios](/recipes/retry-backoff)
- The real service doesn't have a sandbox or test environment
- You want deterministic tests that don't fail due to third-party changes

## Solution

### WireMock Standalone (Java)

```java
import com.github.tomakehurst.wiremock.WireMockServer;
import static com.github.tomakehurst.wiremock.client.WireMock.*;

public class PaymentApiMock {
    private static WireMockServer wireMockServer;

    public static void start() {
        wireMockServer = new WireMockServer(8089);
        wireMockServer.start();

        wireMockServer.stubFor(
            post(urlEqualTo("/payments"))
                .withHeader("Content-Type", equalTo("application/json"))
                .withRequestBody(matchingJsonPath("$.amount"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("{\"id\": \"pay_123\", \"status\": \"succeeded\"}")
                )
        );

        // Error scenario
        wireMockServer.stubFor(
            post(urlEqualTo("/payments"))
                .withRequestBody(matchingJsonPath("$.amount", equalTo("999999")))
                .willReturn(aResponse()
                    .withStatus(400)
                    .withBody("{\"error\": \"amount_exceeds_limit\"}")
                )
        );
    }

    public static void stop() {
        wireMockServer.stop();
    }
}
```

### MSW (Mock Service Worker) for Browser/Node

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  rest.get('https://api.example.com/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json({ id, name: 'Test User', email: 'test@example.com' })
    );
  }),

  rest.post('https://api.example.com/orders', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ orderId: 'ord_456', total: req.body.total })
    );
  }),

  // Network error simulation
  rest.get('https://api.example.com/flaky', (req, res, ctx) => {
    return res(ctx.status(503), ctx.json({ error: 'Service Unavailable' }));
  })
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Python responses Library

```python
import responses
import requests

@responses.activate
def test_payment_api():
    responses.add(
        responses.POST,
        'https://payments.example.com/charge',
        json={'id': 'ch_123', 'status': 'succeeded'},
        status=200
    )

    result = requests.post(
        'https://payments.example.com/charge',
        json={'amount': 100, 'currency': 'USD'}
    )

    assert result.json()['status'] == 'succeeded'
    assert len(responses.calls) == 1
    assert responses.calls[0].request.json()['amount'] == 100
```

## Explanation

**Three mocking strategies**:

| Strategy | Level | Best For |
|----------|-------|----------|
| HTTP server proxy | Network | Integration tests; verify real HTTP clients |
| Request interceptor | Application | Unit tests; browser/Node unified mocking |
| Service virtualization | System | Complex stateful APIs; contract testing |

**Request matching hierarchy**:
1. **Exact URL** — `GET /users/123`
2. **Path pattern** — `GET /users/*`
3. **Header match** — `Content-Type: application/json`
4. **Body match** — JSON path or regex on request body
5. **State-dependent** — Return different response on second call

## Variants

| Tool | Language | Best Feature |
|------|----------|--------------|
| WireMock | Java/Any | Stateful scenarios; proxy recording |
| MSW | TypeScript | Same mocks in browser, Node, and tests |
| MockServer | Any | JSON expectation API; verification |
| responses | Python | Decorator-based; simple assertions |
| Nock | Node.js | Chained API; recorder mode |

## Best Practices

- **Mock at the boundary**: Mock HTTP, not internal methods — tests should exercise the full stack. For full integration coverage, see [end-to-end testing](/recipes/end-to-end-testing).
- **Verify requests, not just responses**: Ensure your code sends the right payload and headers
- **Use record/replay for complex APIs**: Capture real traffic once, then replay in tests
- **Keep mocks close to reality**: Update mocks when the real API changes; stale mocks hide bugs
- **Reset between tests**: Clean state to prevent one test's setup from affecting another

## Common Mistakes

1. **Mocking internal methods**: You test the mock, not the code
2. **Overly permissive matchers**: `any()` matchers let bugs through that specific matchers catch
3. **No error scenario coverage**: Only testing 200 OK misses half your [error handling](/recipes/handle-errors) code
4. **Shared mutable state**: Global mock state leaks between tests
5. **Forgetting to verify**: A passing test with an unused mock means nothing was actually tested

## Frequently Asked Questions

**Q: Should I mock my own service's database?**
A: No. Use an in-memory database or TestContainers. Mock external APIs, not your own dependencies.

**Q: What's the difference between mocking and stubbing?**
A: Stubs return canned responses. Mocks also verify interactions (was this method called with these args?).

**Q: Can mocks replace contract testing?**
A: No. Mocks test your assumptions about the API. Contract testing verifies both sides agree on the schema.
