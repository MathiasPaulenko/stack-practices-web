---
contentType: recipes
slug: javascript-vitest-snapshot-testing
title: "Vitest Snapshot Testing for React"
description: "How to use Vitest snapshot testing to catch unintended UI changes in React components, including inline snapshots and snapshot updating workflows."
metaDescription: "Use Vitest snapshot testing to catch unintended React UI changes, with inline snapshots, update workflows, and CI integration best practices."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - vitest
  - javascript
  - react
  - snapshot
  - frontend
  - recipe
relatedResources:
  - /recipes/testing/jest-snapshot-testing
  - /recipes/testing/nodejs-supertest-express-api
  - /recipes/frontend/react-usememo-usecallback-performance
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use Vitest snapshot testing to catch unintended React UI changes, with inline snapshots, update workflows, and CI integration best practices."
  keywords:
    - testing
    - vitest
    - javascript
    - react
    - snapshot
    - frontend
    - recipe
---

## Overview

Snapshot testing captures the rendered output of a component at a point in time. On subsequent test runs, Vitest compares the current output against the stored snapshot. If they differ, the test fails — alerting you to unintended UI changes. Vitest is a Jest-compatible test runner for Vite projects with built-in snapshot support.

## When to Use

- Catching accidental CSS or markup regressions in presentational components
- Verifying that a component renders the same structure across refactors
- Testing components with stable, deterministic output (no random IDs or timestamps)
- Documenting the expected output of utility functions that return complex objects

## When NOT to Use

- Components with dynamic content (dates, random values, UUIDs) — snapshots will always fail
- Testing business logic — use unit tests with explicit assertions instead
- Components that change frequently during active development — snapshot churn is noise
- Testing accessibility or interaction — snapshots only check rendered HTML, not behavior

## Solution

### Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
});
```

```typescript
// test/setup.ts
import "@testing-library/jest-dom";
```

### Basic snapshot test

```typescript
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("matches snapshot for default variant", () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches snapshot for primary variant", () => {
    const { container } = render(<Button variant="primary">Save</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches snapshot for disabled state", () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### Inline snapshot

```typescript
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders inline snapshot", () => {
    const { container } = render(<Badge count={5} />);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <span
        class="badge badge-primary"
      >
        5
      </span>
    `);
  });
});
```

### Snapshot with serializers

```typescript
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UserCard } from "./UserCard";

describe("UserCard", () => {
  it("matches snapshot with custom serializer", () => {
    const user = { id: 1, name: "Alice", email: "alice@example.com" };
    const { container } = render(<UserCard user={user} />);

    expect(container).toMatchInlineSnapshot(
      {
        serialization: "html",
      },
      `
      <div>
        <div
          class="user-card"
        >
          <h3>
            Alice
          </h3>
          <p>
            alice@example.com
          </p>
        </div>
      </div>
    `,
    );
  });
});
```

### Snapshot a function output

```typescript
import { describe, it, expect } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("matches snapshot for USD", () => {
    expect(formatCurrency(1234.56, "USD")).toMatchInlineSnapshot(
      `"$1,234.56"`,
    );
  });

  it("matches snapshot for EUR", () => {
    expect(formatCurrency(1234.56, "EUR")).toMatchInlineSnapshot(
      `"€1,234.56"`,
    );
  });
});
```

### Snapshot with `toHaveProperty` for objects

```typescript
import { describe, it, expect } from "vitest";
import { buildApiResponse } from "./api";

describe("buildApiResponse", () => {
  it("matches snapshot for success response", () => {
    const response = buildApiResponse({ data: [1, 2, 3], status: 200 });
    expect(response).toMatchSnapshot({
      timestamp: expect.any(String),
    });
  });
});
```

## Variants

### Snapshot with `toMatchSnapshot` with property matchers

```typescript
it("matches snapshot ignoring dynamic date", () => {
  const result = generateReport({ userId: 42 });
  expect(result).toMatchSnapshot({
    generatedAt: expect.any(String),
    reportId: expect.any(String),
  });
});
```

### Using `vi.fn()` mock snapshots

```typescript
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SubmitForm } from "./SubmitForm";

describe("SubmitForm", () => {
  it("calls onSubmit with form data", () => {
    const onSubmit = vi.fn();
    const { getByRole } = render(<SubmitForm onSubmit={onSubmit} />);

    fireEvent.click(getByRole("button", { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "",
      password: "",
    });
    expect(onSubmit.mock.calls).toMatchSnapshot();
  });
});
```

## Best Practices

- Keep snapshots small — snapshot a single component, not an entire page tree
- Use inline snapshots for small, stable outputs — they live in the test file and are reviewable in PRs
- Review snapshot diffs in PRs — a green test with a changed snapshot means someone approved the change
- Use `toMatchSnapshot` with property matchers for dynamic fields (`expect.any(Date)`, `expect.any(String)`)
- Run `vitest -u` to update snapshots only after verifying the change is intentional
- Don't snapshot test components with random IDs, timestamps, or generated classes

## Common Mistakes

- **Blindly updating snapshots**: running `vitest -u` without reviewing the diff hides real regressions.
- **Snapshotting too much**: a 200-line snapshot is unreadable and fails on any minor CSS change. Break it into smaller component snapshots.
- **Not using property matchers for dynamic data**: if your output includes a timestamp, the snapshot will fail on every run.
- **Storing snapshots in a different directory than tests**: keep `.snap` files next to test files for discoverability.
- **Using snapshots as the only test**: snapshots verify structure, not behavior. Add interaction tests with `@testing-library/react`.

## FAQ

### How do I update snapshots after an intentional change?

Run `npx vitest -u` (or `--update`). This regenerates all `.snap` files. Review the diff in git before committing.

### What is the difference between `toMatchSnapshot` and `toMatchInlineSnapshot`?

`toMatchSnapshot` writes to a separate `.snap` file. `toMatchInlineSnapshot` writes the snapshot directly in the test file as a string literal. Inline snapshots are more reviewable in PRs but can bloat the test file for large outputs.

### How do I ignore dynamic values in snapshots?

Use property matchers:

```typescript
expect(result).toMatchSnapshot({
  id: expect.any(String),
  createdAt: expect.any(String),
});
```

Vitest will match the structure but ignore the actual values of those fields.

### Should I commit `.snap` files to git?

Yes. Snapshot files should be committed and reviewed in PRs. They serve as a contract for the expected output.

### Can I use snapshot testing with React Server Components?

Snapshot testing works for components that render to a string. For RSC, use `renderToString` from `react-dom/server` and snapshot the HTML output. Client-side rendering tests use `@testing-library/react` as usual.

### How do I prevent snapshot drift in large test suites?

Use `toMatchInlineSnapshot` for small outputs so the expected value is visible in code review. For `.snap` files, enable `--ci` flag in CI to fail on outdated snapshots instead of silently writing new ones. Run `vitest -u` only locally after verifying the change is intentional. Add a CI step that checks for modified `.snap` files and fails if they were not explicitly updated.

### What is the performance impact of snapshot testing?

Snapshot tests are faster than assertion-based tests because they compare strings instead of running logic. However, large snapshots (full DOM trees) slow down test serialization. Keep snapshots small by testing individual components rather than full pages. Use `toMatchInlineSnapshot` for small values to avoid file I/O overhead.

### How do I snapshot async component output in Vitest?

Render the component with `@testing-library/react`, then `await` the result before snapshotting. For components that fetch data, mock the API with `vi.mock()` or MSW (Mock Service Worker). Wait for the data to load using `findBy*` queries (which retry until the element appears), then call `toMatchSnapshot()` on the container's HTML. This ensures the snapshot captures the fully rendered state, not the loading state.

### How do I snapshot error boundaries in Vitest?

Wrap the component in an error boundary and trigger an error by passing invalid props or mocking a dependency to throw. Use `expect(container.innerHTML).toMatchSnapshot()` on the boundary's fallback UI. For React error boundaries, create a test component that throws in render and verify the boundary catches it. Test both the error state and the recovery state (when the error is resolved). Use `vi.spyOn(console, 'error')` to suppress React's error logging during the test.

Reset the spy after each test with `afterEach(() => vi.restoreAllMocks())` to avoid leaking suppression into other tests.
