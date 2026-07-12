---




contentType: patterns
slug: snapshot-testing-pattern
title: "Patrón Snapshot Testing"
description: "Cómo usar snapshot testing para detectar cambios no intencionales en output serializado. Cubre Jest snapshots, pytest-snapshot, e inline vs external snapshots."
metaDescription: "Detecta cambios no intencionales en output con snapshot testing. Aprende Jest snapshots, pytest-snapshot, inline vs external snapshots, y cuándo actualizar baselines."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - snapshot
  - regression
  - jest
  - pytest
  - pattern
category: architectural
relatedResources:
  - /patterns/test-double-pattern
  - /patterns/parameterized-test-pattern
  - /patterns/golden-master-testing-pattern
  - /patterns/contract-testing-pattern
  - /patterns/fixture-setup-teardown-pattern
  - /patterns/test-pyramid-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Detecta cambios no intencionales en output con snapshot testing. Aprende Jest snapshots, pytest-snapshot, inline vs external snapshots, y cuándo actualizar baselines."
  keywords:
    - testing
    - snapshot
    - regression
    - jest
    - pytest
    - pattern




---

## Overview

El snapshot testing captura el output serializado de una función o componente y lo almacena como baseline. En runs subsiguientes del test, el output se compara contra el baseline. Si difieren, el test falla — alertándote de un cambio no intencional. Los snapshot tests son ideales para detectar regresiones en output que es complex, verbose, o cambia de shape frecuentemente: React component render trees, API response payloads, generated config files, serialized data structures.

## When to Use

- React/Vue/Svelte component rendering — verificar que el rendered output no cambie inesperadamente
- API response shape testing — asegurar que la estructura de response no derive
- Generated output — config files, code generation, schema exports
- Serialization testing — verificar que JSON/YAML/XML output se mantenga consistente
- Complex data transformations donde escribir explicit assertions es impractical

## When NOT to Use

- Testear business logic — usá explicit assertions para verificación precisa
- Cuando el output es simple — `expect(result).toBe(42)` es mejor que un snapshot
- Para tests que necesitan explicar el failure — los snapshots muestran un diff pero no por qué
- Cuando el output es non-deterministic — dates, random values, UUIDs rompen snapshots
- Para tests que corren en múltiples entornos — OS-specific paths o line endings causan false failures

## Solution

### Jest snapshot básico

```javascript
// JavaScript — Jest snapshot test
import { render } from '@testing-library/react';
import { UserCard } from './UserCard';

test('UserCard matches snapshot', () => {
  const { container } = render(
    <UserCard name="Alice" email="alice@x.com" role="admin" />
  );
  expect(container.firstChild).toMatchSnapshot();
});

// First run: crea __snapshots__/UserCard.test.snap
// Runs subsiguientes: compara render output contra stored snapshot
```

### Jest snapshot con serializers

```javascript
// JavaScript — snapshot con custom serializer
import { serializer } from 'jest-snapshot-serializer-raw';

expect.addSnapshotSerializer(serializer);

test('API response matches snapshot', async () => {
  const response = await fetch('/api/users/1');
  const data = await response.json();
  expect(data).toMatchSnapshot();
});
```

### Jest inline snapshots

```javascript
// JavaScript — inline snapshot (almacenado en el test file mismo)
test('formatDate produces correct output', () => {
  const result = formatDate(new Date('2026-01-15'));
  expect(result).toMatchInlineSnapshot(`"January 15, 2026"`);
});

// Inline snapshots son visibles en el test file
// Mejores para outputs pequeños y reviewables
```

### Jest property matchers

```javascript
// JavaScript — snapshot con dynamic values enmascarados
test('user API response matches shape', async () => {
  const response = await getUser(1);

  expect(response).toMatchInlineSnapshot({
    id: expect.any(Number),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  }, `
    Object {
      "createdAt": Any<String>,
      "email": "alice@x.com",
      "id": Any<Number>,
      "name": "Alice",
      "role": "admin",
      "updatedAt": Any<String>,
    }
  `);
});
```

### Jest snapshot para funciones

```javascript
// JavaScript — snapshot para function output
test('generateConfig matches snapshot', () => {
  const config = generateConfig({
    environment: 'production',
    features: ['auth', 'logging', 'monitoring'],
  });

  expect(config).toMatchSnapshot();
});

test('formatReport matches snapshot', () => {
  const report = formatReport({
    title: 'Monthly Report',
    data: [
      { month: 'January', revenue: 50000 },
      { month: 'February', revenue: 55000 },
    ],
  });

  expect(report).toMatchInlineSnapshot();
});
```

### pytest-snapshot

```python
# Python — pytest-snapshot (install: pip install pytest-snapshot)
from pytest_snapshot import snapshot

def test_api_response(snapshot):
    response = {
        "user": {
            "id": 1,
            "name": "Alice",
            "email": "alice@x.com",
            "role": "admin",
        },
        "metadata": {
            "version": "1.0",
            "page": 1,
            "per_page": 20,
        },
    }
    snapshot.assert_match(json.dumps(response, indent=2))

# First run: pytest --snapshot-create
# Runs subsiguientes: pytest (compara contra stored snapshot)
# Update: pytest --snapshot-update
```

### syrupy (Python snapshot library)

```python
# Python — syrupy (install: pip install syrupy)
def test_user_serialization(snapshot):
    user = User(id=1, name="Alice", email="alice@x.com")
    serialized = user.to_dict()
    assert serialized == snapshot

def test_complex_data_structure(snapshot):
    data = {
        "users": [
            {"id": 1, "name": "Alice", "orders": [100, 101, 102]},
            {"id": 2, "name": "Bob", "orders": [200]},
        ],
        "pagination": {"page": 1, "total": 2},
    }
    assert data == snapshot
```

### Manejar valores non-deterministic

```javascript
// JavaScript — enmascarar dynamic values en snapshots
test('order response matches snapshot', async () => {
  const order = await createOrder({
    items: [{ productId: 1, quantity: 2 }],
  });

  expect(order).toMatchInlineSnapshot({
    id: expect.any(String),
    createdAt: expect.any(String),
    transactionId: expect.any(String),
  }, `
    Object {
      "createdAt": Any<String>,
      "id": Any<String>,
      "items": Array [
        Object {
          "productId": 1,
          "quantity": 2,
        },
      ],
      "status": "pending",
      "transactionId": Any<String>,
    }
  `);
});
```

```python
# Python — normalizar dynamic values antes de snapshot
import re
from datetime import datetime

def normalize_response(data):
    """Reemplazar dynamic values con placeholders."""
    text = json.dumps(data, indent=2)
    # Reemplazar UUIDs
    text = re.sub(r'"id": "[^"]+"', '"id": "<UUID>"', text)
    # Reemplazar timestamps
    text = re.sub(r'"createdAt": "[^"]+"', '"createdAt": "<TIMESTAMP>"', text)
    return text

def test_order_snapshot(snapshot):
    order = create_order(items=[{"productId": 1, "quantity": 2}])
    normalized = normalize_response(order)
    snapshot.assert_match(normalized)
```

### Snapshot para React components con props

```javascript
// JavaScript — snapshot para múltiples component states
describe('Button', () => {
  test('default state', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('disabled state', () => {
    const { container } = render(<Button disabled>Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('loading state', () => {
    const { container } = render(<Button loading>Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('with icon', () => {
    const { container } = render(
      <Button>
        <Icon name="check" />
        Save
      </Button>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### Snapshot para API contracts

```javascript
// JavaScript — snapshot API response shape
describe('GET /api/users', () => {
  test('list response shape', async () => {
    const res = await request(app).get('/api/users').expect(200);

    expect(res.body).toMatchInlineSnapshot({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          email: expect.any(String),
        }),
      ]),
      pagination: expect.objectContaining({
        page: expect.any(Number),
        perPage: expect.any(Number),
        total: expect.any(Number),
      }),
    });
  });

  test('error response shape', async () => {
    const res = await request(app).get('/api/users/999').expect(404);

    expect(res.body).toMatchInlineSnapshot({
      error: expect.objectContaining({
        code: expect.any(String),
        message: expect.any(String),
      }),
    });
  });
});
```

### Actualizar snapshots

```bash
# Jest — updatear todos los snapshots
npx jest --updateSnapshot

# Jest — updatear snapshots de un file específico
npx jest --updateSnapshot UserCard.test.tsx

# Jest — watch mode con update prompt
npx jest --watch

# pytest-snapshot — updatear todos
pytest --snapshot-update

# syrupy — updatear
pytest --snapshot-update
```

## Variants

### Snapshot con CI guard

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Run tests (fail if snapshots are outdated)
        run: npx jest --ci

      # --ci flag previene crear new snapshots
      # Si un snapshot no existe, el test falla
```

### Snapshot para generated files

```python
# Python — snapshot para generated config
def test_generate_nginx_config(snapshot):
    config = generate_nginx_config({
        "domain": "example.com",
        "ssl": True,
        "upstream": "localhost:3000",
    })
    snapshot.assert_match(config)

# Stored snapshot asegura que config generation no derive
```

### Snapshot diff para debugging

```javascript
// JavaScript — Jest muestra diffs cuando los snapshots no matchean
// Output:
//   - Snapshot
//   + Received
//
//   - <div class="user-card admin">
//   + <div class="user-card member">
//       <h2>Alice</h2>
//       <p>alice@x.com</p>
//     </div>

// Revisá el diff, después updateá si el cambio es intencional
```

### Snapshot para email templates

```javascript
// JavaScript — snapshot para rendered email template
test('welcome email matches snapshot', () => {
  const html = renderWelcomeEmail({
    name: 'Alice',
    confirmationUrl: 'https://app.example.com/confirm/abc123',
  });

  // Enmascarar el dynamic URL
  const normalized = html.replace(
    /confirm\/[a-z0-9]+/g,
    'confirm/<TOKEN>'
  );

  expect(normalized).toMatchInlineSnapshot();
});
```

## Best Practices


- For a deeper guide, see [Setup Test Fixtures](/es/recipes/setup-test-fixtures/).

- Revisá snapshot diffs en PRs — los snapshots pueden esconder bugs si se updatean a ciegas
- Usá `--ci` flag en CI — previene auto-creating new snapshots, fuerza explicit creation
- Usá inline snapshots para outputs pequeños — visibles en el test file, más fáciles de reviewar
- Usá external snapshots para outputs grandes — mantiene los test files clean
- Enmascarar non-deterministic values — dates, UUIDs, random values rompen snapshots
- No snapshotees todo — usá para output complex, no para valores simples
- Updateá snapshots deliberadamente — nunca corras `--updateSnapshot` sin revisar el diff
- Combiná con explicit assertions — snapshots para shape, explicit assertions para values

## Common Mistakes

- **Updatear snapshots a ciegas**: correr `--updateSnapshot` sin revisar el diff esconde regresiones. Siempre revisá los cambios.
- **Snapshotear output non-deterministic**: dates, random values, y UUIDs causan false failures. Enmascarálos con property matchers.
- **Over-snapshoting**: snapshotear valores simples (`expect(x).toMatchSnapshot()` donde `x` es `42`) no agrega valor. Usá explicit assertions.
- **No usar `--ci` en CI**: sin `--ci`, Jest crea new snapshots automáticamente, enmascarando missing tests.
- **Snapshotear demasiado output**: los snapshots grandes son difíciles de reviewar. Snapshoteá el shape, asertá los values explícitamente.

## FAQ

### ¿Qué es un snapshot test?

Un test que captura el output serializado de una función o componente y lo almacena como baseline. En runs subsiguientes, el output se compara contra el baseline. Si difiere, el test falla.

### ¿Cuándo debería updatear snapshots?

Cuando cambiás el output intencionalmente — new feature, UI update, API response change. Revisá el diff cuidadosamente, después corré `--updateSnapshot`. Nunca updatees sin entender el cambio.

### ¿Los snapshot tests reemplazan a los assertion-based tests?

No. Los snapshots detectan cambios pero no verifican correctness. Usalos junto con explicit assertions — snapshots para shape, assertions para values.

### ¿Cómo manejo dates y UUIDs en snapshots?

Usá property matchers en Jest (`expect.any(String)`) o normalizá el output antes de snapshoteear. Reemplazá dynamic values con placeholders.

### ¿Cuál es la diferencia entre inline y external snapshots?

Los inline snapshots se almacenan en el test file mismo — visibles y reviewables. Los external snapshots se almacenan en `__snapshots__/` files — mejores para outputs grandes. Usá inline para pequeños, external para grandes.
