---
contentType: patterns
slug: test-pyramid-pattern
title: "Patrón Test Pyramid: Balancear Proporciones de Unit,"
description: "Cómo estructurar un test suite usando la test pyramid. Cubre proporciones de unit, integration y E2E tests, la testing trophy, y el anti-pattern ice cream cone."
metaDescription: "Balancea unit, integration y E2E tests con el patrón test pyramid. Aprende testing trophy, ice cream cone anti-pattern, y diseño de test suite proporcional."
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
  metaDescription: "Balancea unit, integration y E2E tests con el patrón test pyramid. Aprende testing trophy, ice cream cone anti-pattern, y diseño de test suite proporcional."
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

La test pyramid es una estrategia para estructurar automated test suites. Mike Cohn introdujo el concepto en "Succeeding with Agile" (2009): muchos unit tests rápidos en la base, menos integration tests en el medio, y muy pocos E2E tests lentos arriba. El goal es máximo confidence con mínimo execution time. Con los años, surgieron shapes alternativas — la testing trophy (Guillermo Rauch) y el ice cream cone anti-pattern — cada una addressando diferentes realidades de proyecto.

## When to Use

- Establecer una test strategy para un proyecto nuevo
- Auditar un test suite existente para balance y coverage
- Convencer a un equipo de invertir en unit tests vs solo E2E tests
- Setear time budgets para CI/CD pipelines
- Decidir qué tipo de test escribir para una feature nueva

## When NOT to Use

- Scripts o prototypes pequeños — unos pocos unit tests alcanzan
- Legacy systems sin tests — empezá con characterization tests, no una pyramid
- Proyectos donde E2E tests son la única opción feasible (e.g., testear una third-party integration)
- Cuando el equipo no tiene skills para unit testing — invertí en training primero

## Solution

### La test pyramid clásica

```
        /\
       /  \        E2E (5-10%)
      /----\       Lento, brittle, high confidence
     /      \
    /--------\     Integration (20-30%)
   /          \    Velocidad media, confidence media
  /------------\
 /              \  Unit (60-70%)
/----------------\ Rápido, aislado, low confidence por test
```

### Unit tests (base de la pyramid)

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

### Integration tests (medio de la pyramid)

```python
# Python — integration test con real database
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

    # Read desde same session (integration: service + repository + db)
    found = service.get_user(user_id)
    assert found.name == "Alice"

    # Update
    service.update_name(user_id, "Alice Smith")
    updated = service.get_user(user_id)
    assert updated.name == "Alice Smith"
```

```javascript
// JavaScript — integration test con real API
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

### E2E tests (tope de la pyramid)

```javascript
// JavaScript — Playwright E2E test
import { test, expect } from '@playwright/test';

test('user can register and login', async ({ page }) => {
  // Navigate a registration
  await page.goto('https://app.example.com/register');

  // Fill registration form
  await page.fill('[data-testid=name]', 'Alice');
  await page.fill('[data-testid=email]', 'alice@x.com');
  await page.fill('[data-testid=password]', 'SecurePass123!');
  await page.click('[data-testid=submit]');

  // Verify redirect a dashboard
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

### La testing trophy (Guillermo Rauch)

```
        /\
       /  \        E2E (pocos)
      /----\
     /      \
    /--------\     Integration (muchos) — el medio ancho
   /          \
  /------------\
 /              \  Unit (algunos)
/----------------\
```

La testing trophy invierte el énfasis: más integration tests, menos unit tests. La rationale es que los integration tests proveen higher confidence para aplicaciones modernas donde la complexity está en el wiring, no en funciones individuales.

### El ice cream cone (anti-pattern)

```
/----------------\  E2E (muchos) — lento, brittle, expensive
\              /
 \------------/
  \          /   Integration (pocos)
   \--------/
    \      /
     \----/
      \  /       Unit (pocos)
       \/
```

El ice cream cone es el anti-pattern más común: los equipos dependen de E2E tests porque son fáciles de escribir (no mocking) pero el suite se vuelve lento y flaky.

### Midiendo tu pyramid

```python
# Python — contar tests por tipo
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

### CI/CD pipeline con pyramid stages

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
      - name: Run unit tests (deberían ser rápidos)
        run: pytest tests/unit/ -v --tb=short
      - name: Check unit test time
        run: |
          TIME=$(pytest tests/unit/ --durations=0 2>&1 | grep "passed in" | grep -oP '[\d.]+')
          echo "Unit tests took ${TIME}s"
          # Fails si unit tests toman más de 30 segundos
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

### Guía de decisión de test type

```python
# Framework de decisión:
# 1. Es una pure function sin dependencies? → UNIT TEST
# 2. Involucra múltiples components pero no external services? → INTEGRATION TEST
# 3. Verifica un user journey through el full system? → E2E TEST
# 4. Verifica un API contract entre servicios? → CONTRACT TEST
# 5. Verifica una UI interaction específica? → COMPONENT TEST

# Mapping de ejemplo:
# calculate_discount()           → UNIT
# UserService + UserRepository    → INTEGRATION
# User registers and logs in     → E2E
# order-service ↔ user-service   → CONTRACT
# Button click shows dropdown    → COMPONENT
```

## Variants

### El testing honeycomb

```
        /\
       /  \        E2E (pocos)
      /----\
     /      \
    /--------\     Integration (muchos)
   /          \    Unit (algunos)
  /------------\
```

Variación de Adam Tornhill: los integration tests forman el medio ancho, los unit tests son menos pero todavía significant. Suits aplicaciones donde la business logic vive en interacciones entre components.

### Component tests (React)

```javascript
// JavaScript — component test (entre unit e integration)
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

### Smoke tests (E2E minimal)

```python
# Python — smoke tests: critical paths only
import pytest
import requests

BASE_URL = "http://localhost:8000"

class TestSmoke:
    """Corre después de cada deploy — verifica que la app esté alive."""

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

- Apuntá a 70/25/5 — unit/integration/E2E como starting point, ajustá a tu contexto
- Los unit tests deberían correr en segundos — si toman minutos, son integration tests
- Los E2E tests deberían cubrir critical paths only — login, checkout, core workflow
- Corré unit tests en cada save — fast feedback loop
- Corré integration tests en cada push — feedback medio
- Corré E2E tests en cada PR merge — lento pero thorough
- Taggeá tests por tipo — `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.e2e`
- Trackeá flaky tests — los E2E tests son la source más común de flakiness
- No persigas 100% coverage — 70-80% con buena distribución es mejor que 100% unit-only

## Common Mistakes

- **Ice cream cone**: demasiados E2E tests, muy pocos unit tests. El suite es lento, flaky, y expensive de mantener.
- **All unit, no integration**: los unit tests pasan pero la app rompe en producción porque los components no se wire correctamente.
- **E2E testear todo**: usar E2E tests para lógica que podría ser unit tested. Cada E2E test agrega minutos al CI.
- **No taggear tests**: no podés correr solo unit tests o solo integration tests. Todo corre junto, slowing feedback.
- **Ignorar flaky tests**: los flaky E2E tests erosionan trust en el suite. Fixealos o removelos inmediatamente.

## FAQ

### ¿Qué es la test pyramid?

Una estrategia para estructurar test suites: muchos unit tests rápidos en la base, menos integration tests en el medio, y muy pocos E2E tests lentos arriba. El goal es máximo confidence con mínimo execution time.

### ¿Qué es la testing trophy?

Una alternativa a la pyramid propuesta por Guillermo Rauch. Enfatiza más integration tests y menos unit tests, argumentando que los integration tests proveen higher confidence para aplicaciones modernas.

### ¿Qué es el ice cream cone anti-pattern?

Cuando un test suite tiene muchos E2E tests y pocos unit tests. Esto resulta en test suites lentos, flaky, que son expensive de mantener y erosionan developer trust.

### ¿Cuántos E2E tests debería tener?

Suficientes para cubrir critical user journeys — típicamente 5-15 tests. Login, registration, checkout, core workflow. No E2E testees cada edge case — para eso están los unit tests.

### ¿Debería usar la pyramid o la trophy?

Depende. Usá la pyramid para libraries, CLI tools, y apps con business logic complex. Usá la trophy para web apps donde la complexity está en wirear components juntos. Adaptá a tu contexto.
