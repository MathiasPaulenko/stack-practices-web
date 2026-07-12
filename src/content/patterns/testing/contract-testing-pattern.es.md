---


contentType: patterns
slug: contract-testing-pattern
title: "Patrón Contract Testing"
description: "Cómo usar contract testing para verificar que producers y consumers de API acuerdan en shapes de request y response. Cubre Pact consumer-driven contracts y provider verification."
metaDescription: "Verifica agreements de API consumer-producer con contract testing. Aprende Pact consumer-driven contracts, provider verification, e integración CI/CD para microservices."
difficulty: advanced
topics:
  - testing
tags:
  - testing
  - contract-testing
  - pact
  - microservices
  - api
  - pattern
category: architectural
relatedResources:
  - /patterns/test-double-pattern
  - /patterns/mock-server-pattern
  - /patterns/snapshot-testing-pattern
  - /patterns/test-pyramid-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Verifica agreements de API consumer-producer con contract testing. Aprende Pact consumer-driven contracts, provider verification, e integración CI/CD para microservices."
  keywords:
    - testing
    - contract-testing
    - pact
    - microservices
    - api
    - pattern


---

## Overview

El contract testing verifica que dos servicios que se comunican acuerdan en el formato de sus requests y responses. En arquitecturas de microservices, un API provider puede tener docenas de consumers, cada uno esperando response shapes específicas. El contract testing — popularizado por Pact — invierte el approach tradicional: los consumers escriben contracts describiendo qué esperan, y los providers verifican que pueden satisfacer esos contracts. Esto atrapa integration bugs sin correr full end-to-end tests.

## When to Use

- Arquitecturas de microservices donde los servicios se comunican via HTTP o message queues
- API consumers y providers son desarrollados por equipos diferentes
- Reemplazar end-to-end integration tests que son lentos y brittle
- Prevenir breaking API changes de llegar a producción
- Cuando necesitás confidence de que los servicios se integran sin deployarlos juntos

## When NOT to Use

- Aplicaciones monolíticas — las internal function calls no necesitan contracts
- Proyectos single-team donde el consumer y el provider son el mismo codebase
- Cuando la API es estable y rara vez cambia — el overhead no vale la pena
- Para testear business logic — los contracts verifican shape, no correctness
- Cuando necesitás full end-to-end verification — los contracts son un complemento, no un reemplazo

## Solution

### Consumer-driven contract con Pact (JavaScript)

```javascript
// JavaScript — Consumer: escribir el contract
const { Pact } = require('@pact-foundation/pact');
const path = require('path');

const provider = new Pact({
  consumer: 'order-service',
  provider: 'user-service',
  port: 8080,
  log: path.resolve(__dirname, 'logs', 'pact.log'),
  dir: path.resolve(__dirname, 'pacts'),
});

describe('User Service Contract', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  test('GET /users/:id returns user', async () => {
    // Definir la interaction esperada
    await provider.addInteraction({
      uponReceiving: 'a request for a user',
      withRequest: {
        method: 'GET',
        path: '/users/1',
        headers: { Accept: 'application/json' },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: 1,
          name: 'Alice',
          email: 'alice@x.com',
          role: 'admin',
        },
      },
    });

    // Llamar al provider (usando la mock URL)
    const user = await getUser(1);

    expect(user).toEqual({
      id: 1,
      name: 'Alice',
      email: 'alice@x.com',
      role: 'admin',
    });
  });

  test('POST /users creates a new user', async () => {
    await provider.addInteraction({
      uponReceiving: 'a request to create a user',
      withRequest: {
        method: 'POST',
        path: '/users',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'Bob', email: 'bob@x.com' },
      },
      willRespondWith: {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: 2,
          name: 'Bob',
          email: 'bob@x.com',
          role: 'member',
        },
      },
    });

    const user = await createUser({ name: 'Bob', email: 'bob@x.com' });

    expect(user.id).toBe(2);
    expect(user.name).toBe('Bob');
  });
});
```

### Provider verification (JavaScript)

```javascript
// JavaScript — Provider: verificar el contract
const { Verifier } = require('@pact-foundation/pact');

describe('Pact Verification', () => {
  test('verifies pacts from the broker', async () => {
    const opts = {
      providerBaseUrl: 'http://localhost:3000',
      pactUrls: [
        path.resolve(__dirname, 'pacts', 'order-service-user-service.json'),
      ],
      // O fetch desde Pact Broker:
      // pactBrokerUrl: 'https://broker.example.com',
      // consumerVersionTags: ['main'],
      providerVersion: '1.0.0',
      provider: 'user-service',
    };

    await new Verifier(opts).verifyProvider();
  });
});
```

### Consumer contract con Pact (Python)

```python
# Python — Consumer: escribir el contract con pact-python
import pytest
from pact import Consumer, Provider

pact = Consumer('order-service').has_pact_with(
    Provider('user-service'),
    pact_dir='pacts/',
    host_name='localhost',
    host_port=8080,
)

@pytest.fixture
def user_client():
    return UserClient(base_url='http://localhost:8080')

def test_get_user_contract(user_client):
    # Definir expected interaction
    (
        pact
        .given('a user with id 1 exists')
        .upon_receiving('a request for user 1')
        .with_request('GET', '/users/1', headers={'Accept': 'application/json'})
        .will_respond_with(200, body={
            'id': 1,
            'name': 'Alice',
            'email': 'alice@x.com',
            'role': 'admin',
        })
    )

    with pact:
        user = user_client.get_user(1)

    assert user['name'] == 'Alice'
    assert user['email'] == 'alice@x.com'

def test_create_user_contract(user_client):
    (
        pact
        .given('no user with email bob@x.com exists')
        .upon_receiving('a request to create a user')
        .with_request(
            'POST',
            '/users',
            headers={'Content-Type': 'application/json'},
            body={'name': 'Bob', 'email': 'bob@x.com'},
        )
        .will_respond_with(201, body={
            'id': 2,
            'name': 'Bob',
            'email': 'bob@x.com',
            'role': 'member',
        })
    )

    with pact:
        user = user_client.create_user(name='Bob', email='bob@x.com')

    assert user['id'] == 2
    assert user['name'] == 'Bob'
```

### Provider verification (Python)

```python
# Python — Provider: verificar el contract
import pytest
from pact.verifier import Verifier

class TestProviderVerification:
    def test_verify_pacts(self):
        verifier = Verifier(
            provider='user-service',
            provider_base_url='http://localhost:5000',
        )

        result = verifier.verify_pacts(
            'pacts/order-service-user-service.json',
            # O desde broker:
            # broker_url='https://broker.example.com',
            # consumer_version_tags=['main'],
            provider_version='1.0.0',
        )

        assert result == 0  # 0 = todos los pacts verificados
```

### Pact con matchers (contracts flexibles)

```javascript
// JavaScript — usar matchers en vez de exact values
const { like, eachLike, term, regex } = require('@pact-foundation/pact').MatchersV3;

test('GET /users returns a list', async () => {
  await provider.addInteraction({
    uponReceiving: 'a request for all users',
    withRequest: {
      method: 'GET',
      path: '/users',
      query: { page: '1', per_page: '20' },
    },
    willRespondWith: {
      status: 200,
      body: {
        data: eachLike({
          id: like(1),
          name: like('Alice'),
          email: like('alice@x.com'),
          role: term({
            generate: 'member',
            matcher: 'admin|member|guest',
          }),
        }),
        pagination: {
          page: like(1),
          per_page: like(20),
          total: like(100),
        },
      },
    },
  });

  const response = await getUsers({ page: 1, perPage: 20 });

  expect(response.data).toHaveLength(1);
  expect(response.data[0].name).toBe('Alice');
});
```

### Pact con states (provider states)

```javascript
// JavaScript — provider states para setup
// Consumer side
await provider.addInteraction({
  state: 'a user with id 1 exists',
  uponReceiving: 'a request for user 1',
  withRequest: { method: 'GET', path: '/users/1' },
  willRespondWith: {
    status: 200,
    body: { id: 1, name: 'Alice' },
  },
});

// Provider side — handle state setup
app.post('/pact-state-setup', (req, res) => {
  const { state } = req.body;

  switch (state) {
    case 'a user with id 1 exists':
      testDb.insert({ id: 1, name: 'Alice', email: 'alice@x.com' });
      break;
    case 'no users exist':
      testDb.truncate('users');
      break;
    default:
      res.status(400).json({ error: `Unknown state: ${state}` });
      return;
  }

  res.status(200).json({ setup: state });
});
```

### Pact Broker integration

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on: [push, pull_request]

jobs:
  consumer-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Run consumer tests
        run: npx jest --testPathPattern=contract
      - name: Publish pacts to broker
        run: |
          npx pact-broker publish pacts/ \
            --consumer-app-version ${{ github.sha }} \
            --broker-base-url ${{ secrets.PACT_BROKER_URL }} \
            --broker-token ${{ secrets.PACT_BROKER_TOKEN }}
        env:
          PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}

  provider-verify:
    needs: consumer-test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Start provider
        run: |
          npm run start &
          sleep 5
      - name: Verify pacts from broker
        run: |
          npx pact-broker verify \
            --broker-base-url ${{ secrets.PACT_BROKER_URL }} \
            --broker-token ${{ secrets.PACT_BROKER_TOKEN }} \
            --provider-base-url http://localhost:3000 \
            --provider user-service \
            --provider-app-version ${{ github.sha }}
```

### Contract testing para message queues

```python
# Python — contract testing para message queues
from pact import Consumer, Provider

pact = Consumer('notification-service').has_pact_with(
    Provider('order-service'),
    pact_dir='pacts/',
)

def test_order_created_message_contract():
    (
        pact
        .given('an order is created')
        .expects_to_receive('an order created event')
        .with_content({
            'event_type': 'order.created',
            'order_id': 123,
            'customer_email': 'alice@x.com',
            'total': 99.99,
        })
    )

    with pact:
        # Consumer procesa el message
        message = pact.consume_message('order-events')
        notification = process_order_created(message)

    assert notification.recipient == 'alice@x.com'
    assert 'order' in notification.subject.lower()
```

## Variants

### Bi-directional contract testing

```yaml
# OpenAPI spec como provider contract + Pact como consumer contract
# Usar Pactflow bi-directional feature para comparar

# Provider: generar OpenAPI spec
openapi: 3.0.0
info:
  title: User Service API
  version: 1.0.0
paths:
  /users/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
                  email:
                    type: string
```

### Contract testing con Spring Cloud Contract

```java
// Java — Spring Cloud Contract DSL
// src/test/resources/contracts/user_service/get_user_by_id.groovy
Contract.make {
    request {
        method 'GET'
        url '/users/1'
        headers {
            accept(applicationJson())
        }
    }
    response {
        status 200
        headers {
            contentType(applicationJson())
        }
        body([
            id: 1,
            name: 'Alice',
            email: 'alice@x.com',
            role: 'admin',
        ])
    }
}

// Provider test auto-generated por Spring Cloud Contract
@AutoConfigureStubRunner
class UserContractTest {

    @Test
    void validate_user_contract() throws Exception {
        // Test auto-generated desde el contract
        mockMvc.perform(get("/users/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice"))
                .andExpect(jsonPath("$.email").value("alice@x.com"));
    }
}
```

### Can-I-Deploy check

```bash
# Check si es seguro deployar — verifica que todos los contracts estén satisfechos
npx pact-broker can-i-deploy \
  --broker-base-url $PACT_BROKER_URL \
  --broker-token $PACT_BROKER_TOKEN \
  --participant order-service \
  --version $GIT_SHA \
  --to-environment production

# Exit 0: seguro para deployar
# Exit 1: no seguro — un contract está roto
```

## Best Practices


- For a deeper guide, see [Fixture Setup/Teardown: Reusable Test Context Lifecycle](/es/patterns/fixture-setup-teardown-pattern/).

- Consumer-driven — dejá que los consumers definan qué necesitan, no lo que el provider expone
- Usá matchers — `like()`, `term()`, `eachLike()` en vez de exact values para flexibilidad
- Mantené los contracts pequeños — un contract por interaction, no un contract gigante
- Usá provider states — seteá data conditions específicas en el provider side
- Publicá a un broker — habilita cross-team contract verification y can-i-deploy checks
- Corré en CI — tanto consumer tests como provider verification deberían correr en CI
- Versioná tus contracts — taggeá con git SHA o semver para traceability
- No reemplaces todos los integration tests — los contracts verifican shape, no data correctness

## Common Mistakes

- **Exact value matching**: usar exact values en vez de matchers hace los contracts brittle. Usá `like()` para type matching.
- **No usar provider states**: sin states, el provider no puede setear la data correcta para cada contract. Siempre definí states.
- **Skipear broker**: sin broker, cross-team verification no pasa. Los contracts solo se verifican localmente.
- **Testear business logic en contracts**: los contracts deberían verificar API shape, no business rules. Mantenelos enfocados en request/response format.
- **No correr provider verification**: los consumers escriben contracts pero los providers nunca los verifican. Ambos lados deben correr tests.

## FAQ

### ¿Qué es consumer-driven contract testing?

El consumer escribe un contract describiendo qué espera del provider. El provider después verifica que puede satisfacer ese contract. Esto asegura que el provider no rompa las expectations del consumer.

### ¿Qué es un Pact Broker?

Un servicio que almacena y maneja contracts. Habilita cross-team verification, can-i-deploy checks, y contract versioning. Pactflow es la versión hosted.

### ¿En qué se diferencia contract testing de integration testing?

Los integration tests deployan servicios juntos y testean end-to-end. Los contract tests verifican el interface contract sin deployar juntos. Los contracts son más rápidos, más baratos, y atrapan integration bugs más temprano.

### ¿Qué son provider states?

Provider states son setup conditions para el provider. Por ejemplo, "a user with id 1 exists" le dice al provider que cree ese user antes de correr el contract verification.

### ¿Debería usar contract testing o OpenAPI validation?

Ambos. OpenAPI valida el spec contra la implementación. Contract testing verifica que consumers y providers acuerden en las actual interactions. Se complementan.
