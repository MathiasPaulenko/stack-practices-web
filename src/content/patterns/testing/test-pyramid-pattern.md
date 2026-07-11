---
contentType: patterns
slug: test-pyramid-pattern
title: "Test Pyramid: Balance Unit, Integration"
description: "How to structure a test suite using the test pyramid. Covers unit, integration, and E2E test proportions, the testing trophy, and ice cream cone anti-pattern."
metaDescription: "Balance unit, integration, and E2E tests with the test pyramid pattern. Learn testing trophy, ice cream cone anti-pattern, and proportional test suite design."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - test-pyramid
  - test-strategy
  - unit-tests
  - integration-tests
  - e2e-tests
  - pattern
category: architectural
relatedResources:
  - /patterns/test-double-pattern
  - /patterns/contract-testing-pattern
  - /patterns/snapshot-testing-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Balance unit, integration, and E2E tests with the test pyramid pattern. Learn testing trophy, ice cream cone anti-pattern, and proportional test suite design."
  keywords:
    - testing
    - test-pyramid
    - test-strategy
    - unit-tests
    - integration-tests
    - e2e-tests
    - pattern
---

## Overview

The test pyramid is a strategy for structuring automated test suites. Mike Cohn introduced the concept in "Succeeding with Agile" (2009): many fast unit tests at the base, fewer integration tests in the middle, and very few slow E2E tests at the top. The goal is maximum confidence with minimum execution time. Over the years, alternative shapes emerged — the testing trophy (Guillermo Rauch) and the ice cream cone anti-pattern — each addressing different project realities.

## When to Use

- Establishing a test strategy for a new project
- Auditing an existing test suite for balance and coverage
- Convincing a team to invest in unit tests vs only E2E tests
- Setting CI/CD pipeline time budgets
- Deciding which type of test to write for a new feature

## When NOT to Use

- Small scripts or prototypes — a few unit tests are enough
- Legacy systems with no tests — start with characterization tests, not a pyramid
- Projects where E2E tests are the only feasible option (e.g., testing a third-party integration)
- When the team lacks the skills for unit testing — invest in training first

## Solution

### The classic test pyramid

```
        /\
       /  \        E2E (5-10%)
      /----\       Slow, brittle, high confidence
     /      \
    /--------\     Integration (20-30%)
   /          \    Medium speed, medium confidence
  /------------\
 /              \  Unit (60-70%)
/----------------\ Fast, isolated, low confidence per test
```

### Unit tests (base of pyramid)

```python
# Python — unit test example
import pytest

def test_calculate_discount():
    result = calculate_discount(price=100, discount_percent=20)
    assert result == 80

def test_calculate_discount_zero():
    result = calculate_discount(price=100, discount_percent=0)
    assert result == 100

def test_calculate_discount_full():
    result = calculate_discount(price=100, discount_percent=100)
    assert result == 0

def test_calculate_discount_negative_price():
    with pytest.raises(ValueError):
        calculate_discount(price=-100, discount_percent=20)
```

```javascript
// JavaScript — unit test example
describe('calculateDiscount', () => {
  test('applies percentage discount', () => {
    expect(calculateDiscount(100, 20)).toBe(80);
  });

  test('handles zero discount', () => {
    expect(calculateDiscount(100, 0)).toBe(100);
  });

  test('handles full discount', () => {
    expect(calculateDiscount(100, 100)).toBe(0);
  });

  test('rejects negative price', () => {
    expect(() => calculateDiscount(-100, 20)).toThrow(ValueError);
  });
});
```

### Integration tests (middle of pyramid)

```python
# Python — integration test with real database
import pytest
from myapp.db import get_session
from myapp.repositories import UserRepository
from myapp.services import UserService

@pytest.fixture
def db_session():
    session = get_session("sqlite:///:memory:")
    session.create_tables()
    yield session
    session.drop_all()

def test_user_persists_across_service_calls(db_session):
    repo = UserRepository(db_session)
    service = UserService(repo)

    # Create
    user = service.create_user("Alice", "alice@x.com")
    user_id = user.id

    # Read from same session (integration: service + repository + db)
    found = service.get_user(user_id)
    assert found.name == "Alice"

    # Update
    service.update_name(user_id, "Alice Smith")
    updated = service.get_user(user_id)
    assert updated.name == "Alice Smith"
```

```javascript
// JavaScript — integration test with real API
import { request } from 'supertest';
import { app } from '../app';
import { testDb } from '../test/db';

describe('POST /api/users', () => {
  beforeEach(async () => {
    await testDb.truncate('users');
  });

  test('creates user and retrieves it', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@x.com' })
      .expect(201);

    // Retrieve
    const getRes = await request(app)
      .get(`/api/users/${createRes.body.id}`)
      .expect(200);

    expect(getRes.body.name).toBe('Alice');
    expect(getRes.body.email).toBe('alice@x.com');
  });

  test('rejects duplicate email', async () => {
    await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@x.com' })
      .expect(201);

    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Bob', email: 'alice@x.com' })
      .expect(409);

    expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
  });
});
```

### E2E tests (top of pyramid)

```javascript
// JavaScript — Playwright E2E test
import { test, expect } from '@playwright/test';

test('user can register and login', async ({ page }) => {
  // Navigate to registration
  await page.goto('https://app.example.com/register');

  // Fill registration form
  await page.fill('[data-testid=name]', 'Alice');
  await page.fill('[data-testid=email]', 'alice@x.com');
  await page.fill('[data-testid=password]', 'SecurePass123!');
  await page.click('[data-testid=submit]');

  // Verify redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('h1')).toHaveText('Welcome, Alice');

  // Logout
  await page.click('[data-testid=logout]');

  // Login
  await page.goto('https://app.example.com/login');
  await page.fill('[data-testid=email]', 'alice@x.com');
  await page.fill('[data-testid=password]', 'SecurePass123!');
  await page.click('[data-testid=submit]');

  await expect(page).toHaveURL(/\/dashboard$/);
});
```

### The testing trophy (Guillermo Rauch)

```
        /\
       /  \        E2E (few)
      /----\
     /      \
    /--------\     Integration (many) — the wide middle
   /          \
  /------------\
 /              \  Unit (some)
/----------------\
```

The testing trophy inverts the emphasis: more integration tests, fewer unit tests. The rationale is that integration tests provide higher confidence for modern applications where the complexity is in wiring, not in individual functions.

### The ice cream cone (anti-pattern)

```
/----------------\  E2E (many) — slow, brittle, expensive
\              /
 \------------/
  \          /   Integration (few)
   \--------/
    \      /
     \----/
      \  /       Unit (few)
       \/
```

The ice cream cone is the most common anti-pattern: teams rely on E2E tests because they're easy to write (no mocking) but the suite becomes slow and flaky.

### Measuring your pyramid

```python
# Python — count tests by type
import os
import re
from pathlib import Path

def count_tests_by_type(project_root):
    counts = {"unit": 0, "integration": 0, "e2e": 0}

    for path in Path(project_root).rglob("test_*.py"):
        content = path.read_text()
        test_count = len(re.findall(r"def test_", content))

        if "e2e" in str(path) or "e2e" in str(path.parent):
            counts["e2e"] += test_count
        elif "integration" in str(path) or "integration" in str(path.parent):
            counts["integration"] += test_count
        else:
            counts["unit"] += test_count

    total = sum(counts.values())
    for test_type, count in counts.items():
        pct = (count / total * 100) if total else 0
        print(f"{test_type}: {count} ({pct:.1f}%)")

    return counts

# Output:
# unit: 245 (68.2%)
# integration: 89 (24.8%)
# e2e: 25 (7.0%)
```

### CI/CD pipeline with pyramid stages

```yaml
# .github/workflows/test-pipeline.yml
name: Test Pipeline

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -e ".[dev]"
      - name: Run unit tests (should be fast)
        run: pytest tests/unit/ -v --tb=short
      - name: Check unit test time
        run: |
          TIME=$(pytest tests/unit/ --durations=0 2>&1 | grep "passed in" | grep -oP '[\d.]+')
          echo "Unit tests took ${TIME}s"
          # Fail if unit tests take more than 30 seconds
          if (( $(echo "$TIME > 30" | bc -l) )); then
            echo "FAIL: Unit tests too slow"
            exit 1
          fi

  integration-tests:
    needs: unit-tests
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
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -e ".[dev]"
      - name: Run integration tests
        run: pytest tests/integration/ -v
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

  e2e-tests:
    needs: integration-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - name: Start app
        run: |
          npm run build
          npm run start &
          sleep 5
      - name: Run E2E tests
        run: npx playwright test
```

### Test type decision guide

```python
# Decision framework:
# 1. Is it a pure function with no dependencies? → UNIT TEST
# 2. Does it involve multiple components but no external services? → INTEGRATION TEST
# 3. Does it verify a user journey through the full system? → E2E TEST
# 4. Does it verify an API contract between services? → CONTRACT TEST
# 5. Does it verify a specific UI interaction? → COMPONENT TEST

# Example mapping:
# calculate_discount()           → UNIT
# UserService + UserRepository    → INTEGRATION
# User registers and logs in     → E2E
# order-service ↔ user-service   → CONTRACT
# Button click shows dropdown    → COMPONENT
```

## Variants

### The testing honeycomb

```
        /\
       /  \        E2E (few)
      /----\
     /      \
    /--------\     Integration (many)
   /          \    Unit (some)
  /------------\
```

Adam Tornhill's variation: integration tests form the wide middle, unit tests are fewer but still significant. Suits applications where business logic lives in interactions between components.

### Component tests (React)

```javascript
// JavaScript — component test (between unit and integration)
import { render, screen, fireEvent } from '@testing-library/react';
import { UserForm } from './UserForm';

test('form submits with entered values', () => {
  const onSubmit = jest.fn();
  render(<UserForm onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Alice' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'alice@x.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

  expect(onSubmit).toHaveBeenCalledWith({
    name: 'Alice',
    email: 'alice@x.com',
  });
});
```

### Smoke tests (minimal E2E)

```python
# Python — smoke tests: critical paths only
import pytest
import requests

BASE_URL = "http://localhost:8000"

class TestSmoke:
    """Run after every deploy — verifies the app is alive."""

    def test_health_check(self):
        res = requests.get(f"{BASE_URL}/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

    def test_home_page_loads(self):
        res = requests.get(f"{BASE_URL}/")
        assert res.status_code == 200

    def test_api_responds(self):
        res = requests.get(f"{BASE_URL}/api/v1/status")
        assert res.status_code == 200
```

## Best Practices

- Aim for 70/25/5 — unit/integration/E2E as a starting point, adjust to your context
- Unit tests should run in seconds — if they take minutes, they're integration tests
- E2E tests should cover critical paths only — login, checkout, core workflow
- Run unit tests on every save — fast feedback loop
- Run integration tests on every push — medium feedback
- Run E2E tests on every PR merge — slow but thorough
- Tag tests by type — `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.e2e`
- Track flaky tests — E2E tests are the most common source of flakiness
- Don't chase 100% coverage — 70-80% with good distribution is better than 100% unit-only

## Common Mistakes

- **Ice cream cone**: too many E2E tests, too few unit tests. Suite is slow, flaky, and expensive to maintain.
- **All unit, no integration**: unit tests pass but the app breaks in production because components don't wire correctly.
- **E2E testing everything**: using E2E tests for logic that could be unit tested. Each E2E test adds minutes to CI.
- **No test tagging**: can't run just unit tests or just integration tests. Everything runs together, slowing feedback.
- **Ignoring flaky tests**: flaky E2E tests erode trust in the suite. Fix or remove them immediately.

## FAQ

### What is the test pyramid?

A strategy for structuring test suites: many fast unit tests at the base, fewer integration tests in the middle, and very few slow E2E tests at the top. The goal is maximum confidence with minimum execution time.

### What is the testing trophy?

An alternative to the pyramid proposed by Guillermo Rauch. It emphasizes more integration tests and fewer unit tests, arguing that integration tests provide higher confidence for modern applications.

### What is the ice cream cone anti-pattern?

When a test suite has many E2E tests and few unit tests. This results in slow, flaky test suites that are expensive to maintain and erode developer trust.

### How many E2E tests should I have?

Enough to cover critical user journeys — typically 5-15 tests. Login, registration, checkout, core workflow. Don't E2E test every edge case — that's what unit tests are for.

### Should I use the pyramid or the trophy?

It depends. Use the pyramid for libraries, CLI tools, and apps with complex business logic. Use the trophy for web apps where the complexity is in wiring components together. Adapt to your context.
