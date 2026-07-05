---
contentType: patterns
slug: contract-testing-pattern
title: "Contract Testing Pattern: Verify Consumer-Producer API Contracts"
description: "How to use contract testing to verify that API producers and consumers agree on request and response shapes. Covers Pact consumer-driven contracts and provider verification."
metaDescription: "Verify consumer-producer API agreements with contract testing. Learn Pact consumer-driven contracts, provider verification, and CI/CD integration for microservices."
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
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Verify consumer-producer API agreements with contract testing. Learn Pact consumer-driven contracts, provider verification, and CI/CD integration for microservices."
  keywords:
    - testing
    - contract-testing
    - pact
    - microservices
    - api
    - pattern
---

## Overview

Contract testing verifies that two communicating services agree on the format of their requests and responses. In microservice architectures, an API provider might have dozens of consumers, each expecting specific response shapes. Contract testing — popularized by Pact — flips the traditional approach: consumers write contracts describing what they expect, and providers verify they can satisfy those contracts. This catches integration bugs without running full end-to-end tests.

## When to Use

- Microservice architectures where services communicate via HTTP or message queues
- API consumers and providers are developed by different teams
- Replacing end-to-end integration tests that are slow and brittle
- Preventing breaking API changes from reaching production
- When you need confidence that services integrate without deploying them together

## When NOT to Use

- Monolithic applications — internal function calls don't need contracts
- Single-team projects where the consumer and provider are the same codebase
- When the API is stable and rarely changes — the overhead isn't worth it
- For testing business logic — contracts verify shape, not correctness
- When you need full end-to-end verification — contracts are a complement, not a replacement

## Solution

### Consumer-driven contract with Pact (JavaScript)

```javascript
// JavaScript — Consumer: write the contract
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
    // Define the expected interaction
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

    // Call the provider (using the mock URL)
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
// JavaScript — Provider: verify the contract
const { Verifier } = require('@pact-foundation/pact');

describe('Pact Verification', () => {
  test('verifies pacts from the broker', async () => {
    const opts = {
      providerBaseUrl: 'http://localhost:3000',
      pactUrls: [
        path.resolve(__dirname, 'pacts', 'order-service-user-service.json'),
      ],
      // Or fetch from Pact Broker:
      // pactBrokerUrl: 'https://broker.example.com',
      // consumerVersionTags: ['main'],
      providerVersion: '1.0.0',
      provider: 'user-service',
    };

    await new Verifier(opts).verifyProvider();
  });
});
```

### Consumer contract with Pact (Python)

```python
# Python — Consumer: write the contract with pact-python
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
    # Define expected interaction
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
# Python — Provider: verify the contract
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
            # Or from broker:
            # broker_url='https://broker.example.com',
            # consumer_version_tags=['main'],
            provider_version='1.0.0',
        )

        assert result == 0  # 0 = all pacts verified
```

### Pact with matchers (flexible contracts)

```javascript
// JavaScript — use matchers instead of exact values
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

### Pact with states (provider states)

```javascript
// JavaScript — provider states for setup
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

### Message queue contract testing

```python
# Python — contract testing for message queues
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
        # Consumer processes the message
        message = pact.consume_message('order-events')
        notification = process_order_created(message)

    assert notification.recipient == 'alice@x.com'
    assert 'order' in notification.subject.lower()
```

## Variants

### Bi-directional contract testing

```yaml
# OpenAPI spec as provider contract + Pact as consumer contract
# Use Pactflow bi-directional feature to compare

# Provider: generate OpenAPI spec
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

### Contract testing with Spring Cloud Contract

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

// Provider test auto-generated by Spring Cloud Contract
@AutoConfigureStubRunner
class UserContractTest {

    @Test
    void validate_user_contract() throws Exception {
        // Auto-generated test from the contract
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
# Check if it's safe to deploy — verifies all contracts are satisfied
npx pact-broker can-i-deploy \
  --broker-base-url $PACT_BROKER_URL \
  --broker-token $PACT_BROKER_TOKEN \
  --participant order-service \
  --version $GIT_SHA \
  --to-environment production

# Exit 0: safe to deploy
# Exit 1: not safe — a contract is broken
```

## Best Practices

- Consumer-driven — let consumers define what they need, not what the provider exposes
- Use matchers — `like()`, `term()`, `eachLike()` instead of exact values for flexibility
- Keep contracts small — one contract per interaction, not one giant contract
- Use provider states — set up specific data conditions on the provider side
- Publish to a broker — enables cross-team contract verification and can-i-deploy checks
- Run in CI — both consumer tests and provider verification should run in CI
- Version your contracts — tag with git SHA or semver for traceability
- Don't replace all integration tests — contracts verify shape, not data correctness

## Common Mistakes

- **Exact value matching**: using exact values instead of matchers makes contracts brittle. Use `like()` for type matching.
- **Not using provider states**: without states, the provider can't set up the right data for each contract. Always define states.
- **Skipping broker**: without a broker, cross-team verification doesn't happen. Contracts are only verified locally.
- **Testing business logic in contracts**: contracts should verify API shape, not business rules. Keep them focused on request/response format.
- **Not running provider verification**: consumers write contracts but providers never verify them. Both sides must run tests.

## FAQ

### What is consumer-driven contract testing?

The consumer writes a contract describing what it expects from the provider. The provider then verifies it can satisfy that contract. This ensures the provider doesn't break the consumer's expectations.

### What is a Pact Broker?

A service that stores and manages contracts. It enables cross-team verification, can-i-deploy checks, and contract versioning. Pactflow is the hosted version.

### How is contract testing different from integration testing?

Integration tests deploy services together and test end-to-end. Contract tests verify the interface contract without deploying together. Contracts are faster, cheaper, and catch integration bugs earlier.

### What are provider states?

Provider states are setup conditions for the provider. For example, "a user with id 1 exists" tells the provider to create that user before running the contract verification.

### Should I use contract testing or OpenAPI validation?

Both. OpenAPI validates the spec against the implementation. Contract testing verifies that consumers and providers agree on the actual interactions. They complement each other.
