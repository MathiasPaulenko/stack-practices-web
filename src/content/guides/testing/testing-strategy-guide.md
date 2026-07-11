---
contentType: guides
slug: testing-strategy-guide
title: "Software Testing Strategy Guide"
description: "A practical guide to building a layered testing strategy with unit, integration, and end-to-end tests."
metaDescription: "Learn how to build a software testing strategy with unit tests, integration tests, and E2E tests. Covers test pyramid, mocking, CI integration, and coverage goals."
difficulty: intermediate
topics:
  - testing
  - architecture
tags:
  - architecture
  - ci-cd
  - coverage
  - e2e
  - integration-tests
  - mocking
  - test-pyramid
  - testing
  - unit-tests
relatedResources:
  - /recipes/unit-testing
  - /recipes/api/input-validation
  - /recipes/github-actions
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn how to build a software testing strategy with unit tests, integration tests, and E2E tests. Covers test pyramid, mocking, CI integration, and coverage goals."
  keywords:
    - testing strategy
    - test pyramid
    - unit testing
    - integration testing
    - e2e testing
    - test coverage
    - mocking
    - test automation
---

## Introduction

Testing is not just about finding bugs. A well-designed testing strategy provides confidence for refactoring, documents expected behavior, catches regressions before they reach production, and works as executable specifications for your system.

Below is a practical guide to the test pyramid, test types, when to use each, and how to integrate testing into your CI/CD pipeline.

## The Testing Pyramid

The ideal test suite follows a pyramid shape:

```
      /\
     /  \    E2E Tests (few, slow, expensive)
    /____\
   /      \  Integration Tests (some, medium speed)
  /        \
 /__________\ Unit Tests (many, fast, cheap)
```

| Layer | Scope | Speed | Cost | Quantity |
|-------|-------|-------|------|----------|
| **Unit** | Single function/class | Milliseconds | Low | Many (70-80%) |
| **Integration** | Multiple components | Seconds | Medium | Some (15-25%) |
| **E2E** | Full user flows | Minutes | High | Few (5-10%) |

## Unit Testing

Unit tests verify individual functions or classes in isolation. They are your first line of defense.

### What to Test

- Business logic and algorithms
- Edge cases (null, empty, overflow)
- Error handling paths
- Boundary conditions

### What NOT to Test

- Framework code (ORM, HTTP layer)
- Third-party libraries
- Simple getters/setters without logic

### Example (Python with pytest)

```python
def calculate_discount(price: float, customer_type: str) -> float:
    if customer_type == "vip":
        return price * 0.8
    return price * 0.95

# Test
import pytest

@pytest.mark.parametrize("price,customer_type,expected", [
    (100.0, "vip", 80.0),
    (100.0, "regular", 95.0),
    (0.0, "vip", 0.0),
])
def test_calculate_discount(price, customer_type, expected):
    assert calculate_discount(price, customer_type) == expected
```

## Integration Testing

Integration tests verify that multiple components work together correctly.

### What to Test

- Database queries and migrations
- API endpoint behavior (with real or test DB)
- Message queue publishing/consuming
- External service interactions (with test doubles)

### Example (Node.js with supertest)

```javascript
const request = require('supertest');
const app = require('../app');

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('alice@example.com');
  });
});
```

## End-to-End Testing

E2E tests simulate real user behavior through the entire application stack.

### What to Test

- Critical user journeys (login, checkout, signup)
- Cross-browser compatibility
- Mobile responsiveness
- Accessibility compliance

### Tools by Stack

| Stack | Recommended Tool |
|-------|-----------------|
| Web | Playwright, Cypress |
| Mobile | Appium, Maestro |
| API | REST Assured, Postman |

## Test Coverage Goals

- **Line coverage**: 70-80% minimum for business logic. See [unit testing](/recipes/testing/unit-testing).
- **Branch coverage**: Prioritize over line coverage
- **Critical paths**: 100% coverage for payment, auth, and [security](/guides/security/security-best-practices-guide) flows

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - run: npm run test:integration
      - run: npm run test:e2e
```

## What Works

- **Write tests first** ([TDD](/guides/testing/test-driven-development-guide)) for complex logic or bug fixes
- **Use test data builders** instead of hardcoding fixtures
- **Mock external services** at [integration test](/recipes/testing/integration-testing) boundaries
- **Run tests in parallel** to keep feedback loops fast
- **Fail [CI](/guides/devops/cicd-pipeline-guide) on coverage regression**, not on arbitrary targets
- **Keep E2E tests deterministic**: avoid timing-dependent assertions

## Common Anti-Patterns

- Testing implementation details instead of behavior
- Sharing mutable state between tests
- Using sleep() instead of explicit waits in E2E tests
- Mocking everything in integration tests
- Ignoring flaky tests instead of fixing root causes

## Summary Checklist

- [ ] Unit tests for all business logic functions
- [ ] Integration tests for database and API layers
- [ ] E2E tests for critical user journeys
- [ ] Tests run in [CI](/guides/devops/cicd-pipeline-guide) on every pull request
- [ ] Coverage tracked and reported
- [ ] Flaky tests identified and fixed promptly

## Frequently Asked Questions

### What is the testing pyramid?

The testing pyramid is a model that suggests having many [unit tests](/recipes/testing/unit-testing) at the base, fewer [integration tests](/recipes/testing/integration-testing) in the middle, and very few end-to-end tests at the top. This keeps the test suite fast, reliable, and cost-effective.

### How much test coverage should I aim for?

Aim for 70-80% coverage on critical business logic. Higher coverage is better, but 100% coverage does not guarantee correctness. Focus on behavior and edge cases rather than hitting arbitrary percentages.

### Should I mock external APIs in integration tests?

Mock external APIs at integration test boundaries using libraries like WireMock or MSW. This keeps tests deterministic and fast while still verifying your system's interaction patterns.


## Advanced Topics

### Scenario: Testing Strategy for Microservices

```text
System: 8 microservices, REST API + queue workers
Goal: 80% coverage, CI < 10 min, 0 flaky tests

Testing pyramid:
  | Level | Count | Duration | Tool |
  |-------|-------|----------|------|
  | Unit | 1200 | 2 min | Vitest + Jest |
  | Integration | 300 | 4 min | Vitest + Testcontainers |
  | Contract | 80 | 1 min | Pact |
  | E2E | 40 | 3 min | Playwright |
  | Total | 1620 | 10 min | |

Strategy per service:
  | Service | Unit | Integration | Contract | E2E |
  |---------|------|-------------|----------|-----|
  | auth-service | 200 | 40 | 10 | 5 |
  | payment-service | 180 | 50 | 15 | 8 |
  | user-service | 150 | 35 | 8 | 5 |
  | order-service | 170 | 45 | 12 | 7 |
  | notification-service | 120 | 30 | 5 | 3 |
  | search-service | 130 | 25 | 8 | 4 |
  | analytics-service | 100 | 20 | 5 | 2 |
  | api-gateway | 150 | 55 | 17 | 6 |

Testing rules:
  | Rule | Reason |
  |------|--------|
  | Unit tests < 1s each | Fast feedback |
  | Integration tests < 5s each | Testcontainers |
  | E2E tests < 30s each | Playwright + headed |
  | 0 flaky tests | Re-run 3x, if fails 1x, fix |
  | Coverage min 70% on business logic | CI gate |
  | Coverage min 90% on payment-service | Critical |
  | PR blocked if coverage drops | --coverage --check |
  | Tests deterministic | No time/order dependency |

CI pipeline (10 min total):
  1. Lint + type check (1 min)
  2. Unit tests (2 min)
  3. Integration tests (4 min)
  4. Contract tests (1 min)
  5. Build (1 min)
  6. E2E tests on staging (3 min, parallel with deploy)

Lessons:
  - The pyramid: many unit, few E2E
  - Contract tests between services are mandatory
  - 0 flaky tests: a flaky test is worse than no test
  - CI < 10 min: if it takes longer, devs lose trust
  - Coverage is a proxy, not the goal: test behavior
```

### How do I handle tests for external services?

Use contract testing with Pact: the consumer defines expectations, the provider verifies them. For third-party APIs (Stripe, GitHub), use VCR or cassettes: record the response once, replay in tests. For DB, use Testcontainers: spin up a real container per test suite. Avoid manual mocks: they are brittle and miss real changes.




























End of document. Review and update quarterly.