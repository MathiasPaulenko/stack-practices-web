---
contentType: patterns
slug: mock-server-pattern
title: "Patrón Mock Server: Levantar un Mock Server para Aislamiento de Integration Tests"
description: "Cómo usar mock servers para aislar integration tests de dependencias externas. Cubre WireMock, nock, MSW, y Mountebank con ejemplos de configuración."
metaDescription: "Aisla integration tests de APIs externas con mock servers. Aprende WireMock, nock, MSW, y Mountebank para stubbing de HTTP responses en entornos de test."
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
  metaDescription: "Aisla integration tests de APIs externas con mock servers. Aprende WireMock, nock, MSW, y Mountebank para stubbing de HTTP responses en entornos de test."
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

Un mock server es un HTTP server standalone que retorna responses pre-configuradas en vez de forwardear requests a servicios reales. En integration tests, los mock servers reemplazan dependencias externas — payment gateways, third-party APIs, email services, databases — para que los tests corran rápido, deterministicamente, y sin network access. A diferencia de los in-process mocks (que reemplazan function calls), los mock servers operan a nivel de red, testeando el full HTTP stack incluyendo serialization, headers, y error handling.

## When to Use

- Integration tests que dependen de external HTTP APIs
- Testear cómo tu código maneja API errors, timeouts, y edge cases
- Correr tests en CI sin network access o API keys
- Simular servicios lentos o unreliable para resilience testing
- Contract testing — mockear el provider mientras testeás el consumer

## When NOT to Use

- Unit tests — usá in-process mocks (test doubles) en su lugar
- Cuando necesitás testear la real external API — usá un sandbox environment
- Para simple function stubbing — `jest.fn()` o `unittest.mock` es más simple
- Cuando el mock server es más complejo que la real API — usá la real API

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
        // Stub el payment endpoint
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

        // Testear tu código que llama al payment gateway
        PaymentResult result = paymentService.charge(1000, "usd", "card_token_123");

        assertEquals("succeeded", result.getStatus());
        assertEquals("ch_12345", result.getChargeId());

        // Verificar que la request fue hecha
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

### WireMock con response templating

```java
// Java — WireMock con Handlebars templating
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
// JavaScript — nock para HTTP mocking
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
    expect(nock.isDone()).toBe(true); // Todos los interceptors fueron llamados
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

    // Configurar tu client con un 1 second timeout
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
// JavaScript — MSW para browser y Node.js
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
// JavaScript — Mountebank para mock servers cross-language
// Start: mb --port 2525

const mb = require('mountebank-helper');

// Crear un imposter (mock server en port 3000)
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

// POST a Mountebank para crear el imposter
await fetch('http://localhost:2525/imposters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(imposter),
});
```

### Python con responses library

```python
# Python — responses library para HTTP mocking
import pytest
import responses

@responses.activate
def test_get_user():
    # Mockear el HTTP call
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
    # First call retorna 500, second retorna 200
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
# docker-compose.yml — WireMock en Docker
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

### Proxy mode (record y replay)

```java
// Java — WireMock como proxy: graba real responses, replay en tests
wireMockServer.stubFor(any(urlMatching(".*"))
    .willReturn(aResponse()
        .proxiedFrom("https://api.example.com")));

// First run: graba real responses
// Runs subsiguientes: replay de recorded responses (no network needed)
```

### Stateful mocking

```javascript
// JavaScript — stateful mock con MSW
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

### Conditional responses con WireMock

```java
// Java — WireMock scenarios para stateful workflows
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

- Limpiá entre tests — `nock.cleanAll()`, `wireMockServer.resetAll()`, `server.resetHandlers()`
- Verificá que las requests fueron hechas — `nock.isDone()`, `wireMockServer.verify()`
- Matcheá en URL path, no full URL — evita breakage de query param ordering
- Mockeá en el service boundary — mockeá external APIs, no tus propios internal services
- Usá realistic response bodies — incluí todos los fields que la real API retorna
- Testeá error cases — 4xx, 5xx, timeouts, malformed responses, empty bodies
- Mantené los mappings organizados — un file por API service para WireMock mappings
- Usá proxy mode para exploration — graba real responses, después editá para tests

## Common Mistakes

- **No limpiar**: leftover mocks de un test afectan al siguiente. Siempre reseteá entre tests.
- **Mockear demasiado broad**: `nock('https://api.example.com').get(/.*/).reply(200)` catchea todo, escondiendo bugs.
- **No testear error cases**: solo mockear 200 responses. Las APIs reales fallan — testeá 4xx, 5xx, timeouts.
- **Over-coupling al request format**: matchear exact JSON bodies hace los tests brittle. Usá partial matching.
- **Olvidar verify**: stubbear una response pero no verificar que la request fue realmente hecha.

## FAQ

### ¿Qué es un mock server?

Un HTTP server standalone que retorna responses pre-configuradas en vez de forwardear a servicios reales. Opera a nivel de red, testeando el full HTTP stack.

### ¿En qué se diferencia un mock server de un mock object?

Un mock object reemplaza un function call in-process. Un mock server reemplaza un HTTP endpoint a nivel de red. Los mock servers testean serialization, headers, y error handling que los mock objects skipean.

### ¿Qué mock server debería usar?

Para JVM: WireMock. Para Node.js: nock (intercepta HTTP) o MSW (service worker). Para cross-language: Mountebank. Para Python: responses o httpx-mock.

### ¿Debería usar un mock server o un sandbox environment?

Usá un sandbox para final pre-production verification. Usá mock servers para CI — son más rápidos, no necesitan network, y pueden simular errors que los sandboxes no producen.

### ¿Qué es proxy mode?

El mock server forwardea requests a la real API y graba responses. En runs subsiguientes, replay los recorded responses sin network access. Útil para explorar APIs antes de escribir explicit mocks.
