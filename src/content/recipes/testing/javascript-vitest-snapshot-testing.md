---
contentType: recipes
slug: javascript-vitest-snapshot-testing
title: "Vitest Snapshot Testing for React"
description: "How to use Vitest snapshot testing to catch unintended UI changes in React components, including inline snapshots and snapshot update workflows."
metaDescription: "Use Vitest snapshot testing to catch unintended React UI changes, with inline snapshots, update workflows, and CI integration best practices."
difficulty: intermediate
topics:
  - testing
  - frontend
tags:
  - testing
  - vitest
  - javascript
  - react
  - snapshot
  - frontend
relatedResources:
  - /recipes/jest-snapshot-testing
  - /recipes/nodejs-supertest-express-api
  - /recipes/react-usememo-usecallback-performance
  - /guides/complete-guide-vitest-react-testing
  - /recipes/javascript-msw-mock-service-worker
  - /recipes/generate-test-data
lastUpdated: "2026-08-22"
publishedAt: "2026-07-05"
author: Mathias Paulenko
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

Snapshot testing captures the rendered output of a component at a point in time. On
subsequent runs, Vitest compares the current output against the stored snapshot and fails
if they differ — alerting you to unintended UI changes. Vitest is a Jest-compatible test
runner for Vite projects with built-in snapshot support.

## When to Use

- Catching accidental CSS or markup regressions in presentational components.
- Verifying that a component renders the same structure across refactors.
- Testing components with stable, deterministic output (no random IDs or timestamps).
- Documenting the expected output of utility functions that return complex objects.

## When NOT to Use

- Components with dynamic content (dates, random values, UUIDs) — snapshots will always
  fail.
- Testing business logic — use unit tests with explicit assertions instead.
- Components that change frequently during active development — snapshot churn is noise.
- Testing accessibility or interaction — snapshots only check rendered HTML, not behavior.

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

### Snapshot with property matchers

```typescript
import { describe, it, expect } from "vitest";
import { buildApiResponse } from "./api";

describe("buildApiResponse", () => {
  it("matches snapshot ignoring dynamic date", () => {
    const response = buildApiResponse({ data: [1, 2, 3], status: 200 });
    expect(response).toMatchSnapshot({
      timestamp: expect.any(String),
      reportId: expect.any(String),
    });
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

### Async component snapshot

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UserProfile } from "./UserProfile";

describe("UserProfile", () => {
  it("matches snapshot after data loads", async () => {
    render(<UserProfile userId={42} />);
    await screen.findByRole("heading", { name: /alice/i });
    expect(document.body).toMatchSnapshot();
  });
});
```

## Explanation

`toMatchSnapshot()` serializes the value the first time it runs and writes it to a `.snap`
file. On later runs, Vitest compares the serialized value to the stored copy. Use
`toMatchInlineSnapshot()` to keep the expected value in the test file, which makes reviews
easier. Property matchers let you ignore dynamic fields by checking type instead of exact
value.

## Variants

### Snapshot with mock calls

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

### RSC snapshot

For React Server Components, render the output to a string before snapshotting:

```typescript
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { StaticPage } from "./StaticPage";

describe("StaticPage", () => {
  it("matches server snapshot", () => {
    const html = renderToString(<StaticPage />);
    expect(html).toMatchSnapshot();
  });
});
```

## Best Practices

- Keep snapshots small — snapshot a single component, not an entire page tree.
- Use inline snapshots for small, stable outputs so they're reviewable in PRs.
- Review snapshot diffs in PRs — a green test with a changed snapshot means someone
  approved the change.
- Use property matchers for dynamic fields like `expect.any(String)` or `expect.any(Date)`.
- Run `vitest -u` to update snapshots only after verifying the change is intentional.
- Don’t snapshot components with random IDs, timestamps, or generated classes.

## Common Mistakes

- **Blindly updating snapshots** — running `vitest -u` without reviewing the diff hides
  real regressions.
- **Snapshotting too much** — a 200-line snapshot is unreadable and fails on any minor
  CSS change. Break it into smaller component snapshots.
- **Not using property matchers for dynamic data** — if the output includes a timestamp,
  the snapshot will fail on every run.
- **Storing snapshots away from tests** — keep `.snap` files next to test files for
  discoverability.
- **Using snapshots as the only test** — snapshots verify structure, not behavior. Add
  interaction tests with `@testing-library/react`.

## FAQ

### How do I update snapshots after an intentional change?

Run `npx vitest -u` (or `--update`). This regenerates all `.snap` files. Review the diff in
Git before committing.

### What is the difference between `toMatchSnapshot` and `toMatchInlineSnapshot`?

`toMatchSnapshot` writes to a separate `.snap` file. `toMatchInlineSnapshot` writes the
snapshot directly in the test file as a string literal. Inline snapshots are more
reviewable in PRs but can bloat the test file for large outputs.

### How do I ignore dynamic values in snapshots?

Use property matchers:

```typescript
expect(result).toMatchSnapshot({
  id: expect.any(String),
  createdAt: expect.any(String),
});
```

Vitest will match the structure but ignore the actual values of those fields.

### Should I commit `.snap` files to Git?

Yes. Snapshot files should be committed and reviewed in PRs. They serve as a contract for
the expected output.

### Can I use snapshot testing with React Server Components?

Yes. Use `renderToString` from `react-dom/server` and snapshot the HTML output. Client-side
rendering tests use `@testing-library/react` as usual.

### How do I prevent snapshot drift in large test suites?

Use `toMatchInlineSnapshot` for small outputs so the expected value is visible in code
review. For `.snap` files, enable `--ci` in CI to fail on outdated snapshots instead of
silently writing new ones. Run `vitest -u` only locally after verifying the change is
intentional.
