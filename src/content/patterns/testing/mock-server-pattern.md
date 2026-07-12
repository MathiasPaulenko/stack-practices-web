---

contentType: patterns
slug: mock-server-pattern
title: "Mock Server: Stand Up a Mock Server for Integration Test"
description: "How to use mock servers to isolate integration tests from external dependencies. Covers WireMock, nock, MSW, and Mountebank with configuration examples."
metaDescription: "Isolate integration tests from external APIs with mock servers. Learn WireMock, nock, MSW, and Mountebank for stubbing HTTP responses in test environments."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - mock-server
  - wiremock
  - nock
  - msw
  - integration-tests
  - pattern
category: architectural
relatedResources:
  - /patterns/test-double-pattern
  - /patterns/contract-testing-pattern
  - /patterns/test-pyramid-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Isolate integration tests from external APIs with mock servers. Learn WireMock, nock, MSW, and Mountebank for stubbing HTTP responses in test environments."
  keywords:
    - testing
    - mock-server
    - wiremock
    - nock
    - msw
    - integration-tests
    - pattern

---

## Overview

A mock server is a standalone HTTP server that returns pre-configured responses instead of forwarding requests to real services. In integration tests, mock servers replace external dependencies — payment gateways, third-party APIs, email services, databases — so tests run fast, deterministically, and without network access. Unlike in-process mocks (which replace function calls), mock servers operate at the network level, testing the full HTTP stack including serialization, headers, and error handling.

## When to Use

- Integration tests that depend on external HTTP APIs
- Testing how your code handles API errors, timeouts, and edge cases
- Running tests in CI without network access or API keys
- Simulating slow or unreliable services for resilience testing
- Contract testing — mock the provider while testing the consumer

## When NOT to Use

- Unit tests — use in-process mocks (test doubles) instead
- When you need to test the real external API — use a sandbox environment
- For simple function stubbing — `jest.fn()` or `unittest.mock` is simpler
- When the mock server is more complex than the real API — use the real API

## Solution

### WireMock (Java/JVM)

```java
// Java — WireMock standalone server
import com.github.tomakehurst.wiremock.WireMockServer;
import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;

class PaymentGatewayMock {
    static WireMockServer wireMockServer;

    @BeforeAll
    static void startServer() {
        wireMockServer = new WireMockServer(wireMockConfig().port(8089));
        wireMockServer.start();
    }

    @AfterAll
    static void stopServer() {
        wireMockServer.stop();
    }

    @BeforeEach
    void resetMocks() {
        wireMockServer.resetAll();
    }

    @Test
    void testSuccessfulPayment() {
        // Stub the payment endpoint
        wireMockServer.stubFor(post(urlPathEqualTo("/api/charges"))
            .withHeader("Authorization", matching("Bearer .*"))
            .withRequestBody(equalToJson("""
                {
                    "amount": 1000,
                    "currency": "usd",
                    "source": "card_token_123"
                }
                """))
            .willReturn(aResponse()
                .withStatus(201)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "id": "ch_12345",
                        "amount": 1000,
                        "currency": "usd",
                        "status": "succeeded"
                    }
                    """)));

        // Test your code that calls the payment gateway
        PaymentResult result = paymentService.charge(1000, "usd", "card_token_123");

        assertEquals("succeeded", result.getStatus());
        assertEquals("ch_12345", result.getChargeId());

        // Verify the request was made
        wireMockServer.verify(postRequestedFor(urlPathEqualTo("/api/charges"))
            .withHeader("Authorization", matching("Bearer .*")));
    }

    @Test
    void testPaymentDeclined() {
        wireMockServer.stubFor(post(urlPathEqualTo("/api/charges"))
            .willReturn(aResponse()
                .withStatus(402)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "error": {
                            "code": "card_declined",
                            "message": "Your card was declined"
                        }
                    }
                    """)));

        PaymentException ex = assertThrows(PaymentException.class, () ->
            paymentService.charge(1000, "usd", "card_token_123")
        );

        assertEquals("card_declined", ex.getErrorCode());
    }
}
```

### WireMock with response templating

```java
// Java — WireMock with Handlebars templating
wireMockServer.stubFor(get(urlPathEqualTo("/api/users/{{userId}}"))
    .willReturn(aResponse()
        .withStatus(200)
        .withHeader("Content-Type", "application/json")
        .withBody("""
            {
                "id": "{{request.path.userId}}",
                "name": "User {{request.path.userId}}",
                "email": "user{{request.path.userId}}@example.com"
            }
            """)
        .withTransformers("response-template")));
```

### nock (Node.js)

```javascript
// JavaScript — nock for HTTP mocking
const nock = require('nock');

describe('UserService', () => {
  afterEach(() => nock.cleanAll());

  test('fetches user from external API', async () => {
    nock('https://api.example.com')
      .get('/users/1')
      .reply(200, {
        id: 1,
        name: 'Alice',
        email: 'alice@x.com',
      });

    const user = await userService.getUser(1);

    expect(user.name).toBe('Alice');
    expect(nock.isDone()).toBe(true); // All interceptors were called
  });

  test('handles API error', async () => {
    nock('https://api.example.com')
      .get('/users/999')
      .reply(404, {
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });

    await expect(userService.getUser(999))
      .rejects.toThrow(NotFoundError);
  });

  test('handles timeout', async () => {
    nock('https://api.example.com')
      .get('/users/1')
      .delayConnection(2000) // 2 second delay
      .reply(200, { id: 1, name: 'Alice' });

    // Configure your client with a 1 second timeout
    await expect(userService.getUser(1))
      .rejects.toThrow(TimeoutError);
  });

  test('verifies request headers', async () => {
    nock('https://api.example.com', {
      reqheaders: {
        authorization: 'Bearer token123',
        'content-type': 'application/json',
      },
    })
      .post('/users', { name: 'Bob', email: 'bob@x.com' })
      .reply(201, { id: 2, name: 'Bob', email: 'bob@x.com' });

    const user = await userService.createUser(
      { name: 'Bob', email: 'bob@x.com' },
      { token: 'token123' }
    );

    expect(user.id).toBe(2);
  });
});
```

### MSW (Mock Service Worker)

```javascript
// JavaScript — MSW for browser and Node.js
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  http.get('https://api.example.com/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: Number(params.id),
      name: 'Alice',
      email: 'alice@x.com',
    });
  }),

  http.post('https://api.example.com/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: 2, ...body, role: 'member' },
      { status: 201 }
    );
  }),

  http.get('https://api.example.com/users/999', () => {
    return HttpResponse.json(
      { error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 }
    );
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserService with MSW', () => {
  test('fetches user', async () => {
    const user = await userService.getUser(1);
    expect(user.name).toBe('Alice');
  });

  test('creates user', async () => {
    const user = await userService.createUser({
      name: 'Bob',
      email: 'bob@x.com',
    });
    expect(user.id).toBe(2);
    expect(user.role).toBe('member');
  });

  test('handles 404', async () => {
    await expect(userService.getUser(999))
      .rejects.toThrow(NotFoundError);
  });

  test('with custom handler override', async () => {
    server.use(
      http.get('https://api.example.com/users/1', () => {
        return HttpResponse.json(
          { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
          { status: 429 }
        );
      })
    );

    await expect(userService.getUser(1))
      .rejects.toThrow(RateLimitError);
  });
});
```

### Mountebank (cross-language)

```javascript
// JavaScript — Mountebank for cross-language mock servers
// Start: mb --port 2525

const mb = require('mountebank-helper');

// Create an imposter (mock server on port 3000)
const imposter = {
  port: 3000,
  protocol: 'http',
  stubs: [
    {
      predicates: [
        { equals: { method: 'GET', path: '/users/1' } },
      ],
      responses: [
        {
          is: {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: 1,
              name: 'Alice',
              email: 'alice@x.com',
            }),
          },
        },
      ],
    },
    {
      predicates: [
        { equals: { method: 'POST', path: '/users' } },
      ],
      responses: [
        {
          is: {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: 2,
              name: 'Bob',
              email: 'bob@x.com',
            }),
          },
        },
      ],
    },
  ],
};

// POST to Mountebank to create the imposter
await fetch('http://localhost:2525/imposters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(imposter),
});
```

### Python with responses library

```python
# Python — responses library for HTTP mocking
import pytest
import responses

@responses.activate
def test_get_user():
    # Mock the HTTP call
    responses.add(
        responses.GET,
        'https://api.example.com/users/1',
        json={'id': 1, 'name': 'Alice', 'email': 'alice@x.com'},
        status=200,
    )

    user = user_service.get_user(1)

    assert user['name'] == 'Alice'
    assert len(responses.calls) == 1
    assert responses.calls[0].request.url == 'https://api.example.com/users/1'

@responses.activate
def test_create_user():
    responses.add(
        responses.POST,
        'https://api.example.com/users',
        json={'id': 2, 'name': 'Bob', 'email': 'bob@x.com', 'role': 'member'},
        status=201,
    )

    user = user_service.create_user(name='Bob', email='bob@x.com')

    assert user['id'] == 2
    assert user['role'] == 'member'

@responses.activate
def test_api_error_handling():
    responses.add(
        responses.GET,
        'https://api.example.com/users/999',
        json={'error': {'code': 'NOT_FOUND', 'message': 'User not found'}},
        status=404,
    )

    with pytest.raises(NotFoundError):
        user_service.get_user(999)

@responses.activate
def test_retry_on_500():
    # First call returns 500, second returns 200
    responses.add(
        responses.GET,
        'https://api.example.com/users/1',
        status=500,
    )
    responses.add(
        responses.GET,
        'https://api.example.com/users/1',
        json={'id': 1, 'name': 'Alice'},
        status=200,
    )

    user = user_service.get_user_with_retry(1)

    assert user['name'] == 'Alice'
    assert len(responses.calls) == 2
```

### Docker-based mock server

```yaml
# docker-compose.yml — WireMock in Docker
services:
  wiremock:
    image: wiremock/wiremock:3.5.2
    ports:
      - "8089:8080"
    volumes:
      - ./test/mappings:/home/wiremock/mappings
      - ./test/responses:/home/wiremock/__files
```

```json
// test/mappings/users.json — WireMock mapping
{
  "mappings": [
    {
      "request": {
        "method": "GET",
        "urlPath": "/api/users/1"
      },
      "response": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "jsonBody": {
          "id": 1,
          "name": "Alice",
          "email": "alice@x.com"
        }
      }
    },
    {
      "request": {
        "method": "POST",
        "urlPath": "/api/users"
      },
      "response": {
        "status": 201,
        "headers": {
          "Content-Type": "application/json"
        },
        "jsonBody": {
          "id": 2,
          "name": "Bob",
          "email": "bob@x.com"
        }
      }
    }
  ]
}
```

## Variants

### Proxy mode (record and replay)

```java
// Java — WireMock as a proxy: record real responses, replay in tests
wireMockServer.stubFor(any(urlMatching(".*"))
    .willReturn(aResponse()
        .proxiedFrom("https://api.example.com")));

// First run: records real responses
// Subsequent runs: replays recorded responses (no network needed)
```

### Stateful mocking

```javascript
// JavaScript — stateful mock with MSW
let users = [];
let nextId = 1;

const statefulHandlers = [
  http.get('https://api.example.com/users', () => {
    return HttpResponse.json(users);
  }),

  http.post('https://api.example.com/users', async ({ request }) => {
    const body = await request.json();
    const user = { id: nextId++, ...body };
    users.push(user);
    return HttpResponse.json(user, { status: 201 });
  }),

  http.delete('https://api.example.com/users/:id', ({ params }) => {
    users = users.filter(u => u.id !== Number(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
];
```

### Conditional responses with WireMock

```java
// Java — WireMock scenarios for stateful workflows
wireMockServer.stubFor(post(urlPathEqualTo("/api/orders"))
    .inScenario("Order lifecycle")
    .whenScenarioStateIs("Started")
    .willReturn(aResponse()
        .withStatus(201)
        .withBody("{\"id\": 1, \"status\": \"pending\"}"))
    .willSetStateTo("Order created"));

wireMockServer.stubFor(post(urlPathEqualTo("/api/orders/1/ship"))
    .inScenario("Order lifecycle")
    .whenScenarioStateIs("Order created")
    .willReturn(aResponse()
        .withStatus(200)
        .withBody("{\"id\": 1, \"status\": \"shipped\"}"))
    .willSetStateTo("Order shipped"));
```

## Best Practices


- For a deeper guide, see [Test Pyramid: Balance Unit, Integration](/patterns/test-pyramid-pattern/).

- Clean up between tests — `nock.cleanAll()`, `wireMockServer.resetAll()`, `server.resetHandlers()`
- Verify requests were made — `nock.isDone()`, `wireMockServer.verify()`
- Match on URL path, not full URL — avoids breakage from query param ordering
- Mock at the service boundary — mock external APIs, not your own internal services
- Use realistic response bodies — include all fields the real API returns
- Test error cases — 4xx, 5xx, timeouts, malformed responses, empty bodies
- Keep mappings organized — one file per API service for WireMock mappings
- Use proxy mode for exploration — record real responses, then edit for tests

## Common Mistakes

- **Not cleaning up**: leftover mocks from one test affect the next. Always reset between tests.
- **Mocking too broadly**: `nock('https://api.example.com').get(/.*/).reply(200)` catches everything, hiding bugs.
- **Not testing error cases**: only mocking 200 responses. Real APIs fail — test 4xx, 5xx, timeouts.
- **Over-coupling to request format**: matching exact JSON bodies makes tests brittle. Use partial matching.
- **Forgetting to verify**: stubbing a response but not verifying the request was actually made.

## FAQ

### What is a mock server?

A standalone HTTP server that returns pre-configured responses instead of forwarding to real services. It operates at the network level, testing the full HTTP stack.

### How is a mock server different from a mock object?

A mock object replaces a function call in-process. A mock server replaces an HTTP endpoint at the network level. Mock servers test serialization, headers, and error handling that mock objects skip.

### Which mock server should I use?

For JVM: WireMock. For Node.js: nock (intercepts HTTP) or MSW (service worker). For cross-language: Mountebank. For Python: responses or httpx-mock.

### Should I use a mock server or a sandbox environment?

Use a sandbox for final pre-production verification. Use mock servers for CI — they're faster, don't need network, and can simulate errors that sandboxes won't produce.

### What is proxy mode?

The mock server forwards requests to the real API and records responses. On subsequent runs, it replays the recorded responses without network access. Useful for exploring APIs before writing explicit mocks.
