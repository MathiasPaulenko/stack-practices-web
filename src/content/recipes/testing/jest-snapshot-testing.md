---
contentType: recipes
slug: jest-snapshot-testing
title: "Snapshot Testing React Components with Jest"
description: "How to use Jest snapshot testing to catch unintended UI regressions in React components and prevent visual bugs from reaching production"
metaDescription: "Snapshot testing React components with Jest. Catch UI regressions, update snapshots intentionally, and integrate with CI for automated visual regression detection."
difficulty: beginner
topics:
  - testing
tags:
  - jest
  - testing
  - react
relatedResources:
  - /recipes/unit-testing-mocking
  - /recipes/visual-regression-testing
  - /guides/testing-strategy-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Snapshot testing React components with Jest. Catch UI regressions, update snapshots intentionally, and integrate with CI for automated visual regression detection."
  keywords:
    - jest
    - snapshot testing
    - react
    - ui testing
    - regression
---

# Snapshot Testing React Components with Jest

Snapshot testing captures the rendered output of a component and compares it against a stored reference. When the output changes unexpectedly, the test fails, alerting you to potential UI regressions before they reach users.

## When to Use This

- You want to detect unintended changes in component rendering. See [Visual Regression Testing](/recipes/testing/e2e-testing) for pixel-perfect comparisons.
- Your components have complex conditional rendering logic. See [Component Testing](/recipes/testing/e2e-testing) for interactive browser tests.
- You are refactoring a component and want confidence nothing broke. See [Unit Testing](/recipes/testing/unit-testing) for isolated logic verification.

## When NOT to Use This

- For dynamic data that changes on every render (timestamps, random IDs)
- As a replacement for behavioral or integration tests
- For third-party components you do not control

## Prerequisites

- A React project with Jest configured
- `@testing-library/react` for rendering components in tests

## Solution: React Component Snapshots

### 1. Basic Snapshot Test

```jsx
// Button.test.jsx
import { render } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders correctly with default props', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders correctly with variant prop', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders correctly when disabled', () => {
    const { container } = render(<Button disabled>Loading</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### 2. Snapshot with Props Variations

```jsx
// Card.test.jsx
import { render } from '@testing-library/react';
import Card from './Card';

describe('Card', () => {
  const baseProps = {
    title: 'Test Card',
    description: 'A sample card for testing',
    imageUrl: '/test.jpg',
  };

  it('renders with all props', () => {
    const { container } = render(<Card {...baseProps} />);
    expect(container).toMatchSnapshot();
  });

  it('renders without image', () => {
    const { container } = render(
      <Card title={baseProps.title} description={baseProps.description} />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders loading state', () => {
    const { container } = render(<Card loading title="Loading" />);
    expect(container).toMatchSnapshot();
  });
});
```

### 3. Inline Snapshots for Small Output

```jsx
// Badge.test.jsx
import { render } from '@testing-library/react';
import Badge from './Badge';

describe('Badge', () => {
  it('renders status badge', () => {
    const { container } = render(<Badge status="active">Online</Badge>);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <span
        class="badge badge--active"
      >
        Online
      </span>
    `);
  });
});
```

### 4. Snapshot Testing with React Testing Library

```jsx
// UserProfile.test.jsx
import { render, screen } from '@testing-library/react';
import UserProfile from './UserProfile';

describe('UserProfile', () => {
  it('matches snapshot for active user', () => {
    const user = {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      role: 'admin',
      avatar: '/avatars/alice.jpg',
    };

    const { asFragment } = render(<UserProfile user={user} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot for loading state', () => {
    const { asFragment } = render(<UserProfile loading />);
    expect(asFragment()).toMatchSnapshot();
  });
});
```

### 5. Updating Snapshots

```bash
# Update snapshots for a specific test file
npx jest Button.test.jsx --updateSnapshot

# Update all snapshots
npx jest --updateSnapshot

# Interactive mode: review each change
npx jest --updateSnapshot --interactive
```

## How It Works

1. **First Run**: Jest renders the component and stores the serialized HTML as a `.snap` file
2. **Subsequent Runs**: Jest renders the component again and compares against the stored snapshot
3. **Mismatch**: If outputs differ, the test fails with a diff showing exactly what changed
4. **Update**: You explicitly update snapshots after reviewing that changes are intentional

## Production Considerations

- **Commit snapshot files** to version control alongside your code
- **Review snapshot diffs** in pull requests just like code changes
- **Use `toMatchInlineSnapshot`** for small, stable outputs to keep tests self-contained
- **Combine with visual regression** for pixel-perfect UI validation
- **Mock dates and IDs** to prevent flaky snapshots from dynamic values

## FAQ

**Q: Why did my snapshot test fail when I only changed CSS?**
A: Snapshot tests capture rendered HTML including class names. If CSS module hashes changed, the snapshot will differ. Review the diff to confirm it is only class names.

**Q: Should I snapshot test every component?**
A: No. Focus on components with complex conditional rendering, reusable UI primitives, and components you are actively refactoring.

**Q: How do I handle third-party components in snapshots?**
A: Mock them with `jest.mock()` or use `jest.mockComponent()` to render a stable placeholder.
