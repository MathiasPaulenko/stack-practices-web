---
contentType: patterns
slug: snapshot-testing-pattern
title: "Snapshot Testing: Capture and Compare Serialized Output"
description: "How to use snapshot testing to detect unintended changes in serialized output. Covers Jest snapshots, pytest snapshot, and inline vs external snapshots."
metaDescription: "Detect unintended output changes with snapshot testing. Learn Jest snapshots, pytest-snapshot, inline vs external snapshots, and when to update baselines."
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
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Detect unintended output changes with snapshot testing. Learn Jest snapshots, pytest-snapshot, inline vs external snapshots, and when to update baselines."
  keywords:
    - testing
    - snapshot
    - regression
    - jest
    - pytest
    - pattern
---

## Overview

Snapshot testing captures the serialized output of a function or component and stores it as a baseline. On subsequent test runs, the output is compared against the baseline. If they differ, the test fails — alerting you to an unintended change. Snapshot tests are ideal for detecting regressions in output that is complex, verbose, or frequently changing shape: React component render trees, API response payloads, generated configuration files, serialized data structures.

## When to Use

- React/Vue/Svelte component rendering — verify the rendered output doesn't change unexpectedly
- API response shape testing — ensure response structure doesn't drift
- Generated output — config files, code generation, schema exports
- Serialization testing — verify JSON/YAML/XML output stays consistent
- Complex data transformations where writing explicit assertions is impractical

## When NOT to Use

- Testing business logic — use explicit assertions for precise verification
- When output is simple — `expect(result).toBe(42)` is better than a snapshot
- For tests that need to explain failure — snapshots show a diff but not why
- When output is non-deterministic — dates, random values, UUIDs break snapshots
- For tests that run in multiple environments — OS-specific paths or line endings cause false failures

## Solution

### Jest basic snapshot

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

// First run: creates __snapshots__/UserCard.test.snap
// Subsequent runs: compares render output against stored snapshot
```

### Jest snapshot with serializers

```javascript
// JavaScript — snapshot with custom serializer
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
// JavaScript — inline snapshot (stored in the test file itself)
test('formatDate produces correct output', () => {
  const result = formatDate(new Date('2026-01-15'));
  expect(result).toMatchInlineSnapshot(`"January 15, 2026"`);
});

// Inline snapshots are visible in the test file
// Better for small, reviewable outputs
```

### Jest property matchers

```javascript
// JavaScript — snapshot with dynamic values masked
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

### Jest snapshot for functions

```javascript
// JavaScript — snapshot for function output
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
# Subsequent runs: pytest (compares against stored snapshot)
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

### Handling non-deterministic values

```javascript
// JavaScript — mask dynamic values in snapshots
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
# Python — normalize dynamic values before snapshot
import re
from datetime import datetime

def normalize_response(data):
    """Replace dynamic values with placeholders."""
    text = json.dumps(data, indent=2)
    # Replace UUIDs
    text = re.sub(r'"id": "[^"]+"', '"id": "<UUID>"', text)
    # Replace timestamps
    text = re.sub(r'"createdAt": "[^"]+"', '"createdAt": "<TIMESTAMP>"', text)
    return text

def test_order_snapshot(snapshot):
    order = create_order(items=[{"productId": 1, "quantity": 2}])
    normalized = normalize_response(order)
    snapshot.assert_match(normalized)
```

### Snapshot for React components with props

```javascript
// JavaScript — snapshot for multiple component states
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

### Snapshot for API contracts

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

### Updating snapshots

```bash
# Jest — update all snapshots
npx jest --updateSnapshot

# Jest — update snapshots for a specific file
npx jest --updateSnapshot UserCard.test.tsx

# Jest — watch mode with update prompt
npx jest --watch

# pytest-snapshot — update all
pytest --snapshot-update

# syrupy — update
pytest --snapshot-update
```

## Variants

### Snapshot with CI guard

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

      # --ci flag prevents creating new snapshots
      # If a snapshot doesn't exist, the test fails
```

### Snapshot for generated files

```python
# Python — snapshot for generated config
def test_generate_nginx_config(snapshot):
    config = generate_nginx_config({
        "domain": "example.com",
        "ssl": True,
        "upstream": "localhost:3000",
    })
    snapshot.assert_match(config)

# Stored snapshot ensures config generation doesn't drift
```

### Snapshot diff for debugging

```javascript
// JavaScript — Jest shows diffs when snapshots don't match
// Output:
//   - Snapshot
//   + Received
//
//   - <div class="user-card admin">
//   + <div class="user-card member">
//       <h2>Alice</h2>
//       <p>alice@x.com</p>
//     </div>

// Review the diff, then update if the change is intentional
```

### Snapshot for email templates

```javascript
// JavaScript — snapshot for rendered email template
test('welcome email matches snapshot', () => {
  const html = renderWelcomeEmail({
    name: 'Alice',
    confirmationUrl: 'https://app.example.com/confirm/abc123',
  });

  // Mask the dynamic URL
  const normalized = html.replace(
    /confirm\/[a-z0-9]+/g,
    'confirm/<TOKEN>'
  );

  expect(normalized).toMatchInlineSnapshot();
});
```

## Best Practices

- Review snapshot diffs in PRs — snapshots can hide bugs if updated blindly
- Use `--ci` flag in CI — prevents auto-creating new snapshots, forces explicit creation
- Use inline snapshots for small outputs — visible in the test file, easier to review
- Use external snapshots for large outputs — keeps test files clean
- Mask non-deterministic values — dates, UUIDs, random values break snapshots
- Don't snapshot everything — use for complex output, not simple values
- Update snapshots deliberately — never run `--updateSnapshot` without reviewing the diff
- Combine with explicit assertions — snapshots for shape, explicit assertions for values

## Common Mistakes

- **Blindly updating snapshots**: running `--updateSnapshot` without reviewing the diff hides regressions. Always review changes.
- **Snapshotting non-deterministic output**: dates, random values, and UUIDs cause false failures. Mask them with property matchers.
- **Over-snapshoting**: snapshotting simple values (`expect(x).toMatchSnapshot()` where `x` is `42`) adds no value. Use explicit assertions.
- **Not using `--ci` in CI**: without `--ci`, Jest creates new snapshots automatically, masking missing tests.
- **Snapshotting too much output**: large snapshots are hard to review. Snapshot the shape, assert the values explicitly.

## FAQ

### What is a snapshot test?

A test that captures the serialized output of a function or component and stores it as a baseline. On subsequent runs, output is compared against the baseline. If it differs, the test fails.

### When should I update snapshots?

When you intentionally change the output — new feature, UI update, API response change. Review the diff carefully, then run `--updateSnapshot`. Never update without understanding the change.

### Are snapshot tests a replacement for assertion-based tests?

No. Snapshots detect changes but don't verify correctness. Use them alongside explicit assertions — snapshots for shape, assertions for values.

### How do I handle dates and UUIDs in snapshots?

Use property matchers in Jest (`expect.any(String)`) or normalize the output before snapshotting. Replace dynamic values with placeholders.

### What is the difference between inline and external snapshots?

Inline snapshots are stored in the test file itself — visible and reviewable. External snapshots are stored in `__snapshots__/` files — better for large outputs. Use inline for small, external for large.
