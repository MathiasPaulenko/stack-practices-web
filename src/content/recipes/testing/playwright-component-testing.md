---
contentType: recipes
slug: playwright-component-testing
title: "Component Testing with Playwright and Storybook"
description: "How to test React components in isolation using Playwright component tests combined with Storybook stories for visual and behavioral validation"
metaDescription: "Component testing with Playwright and Storybook. Test React components in isolation, validate interactions, and catch visual regressions before deployment."
difficulty: beginner
topics:
  - testing
tags:
  - playwright
  - testing
  - react
relatedResources:
  - /recipes/jest-snapshot-testing
  - /recipes/visual-regression-testing
  - /guides/testing-strategy-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Component testing with Playwright and Storybook. Test React components in isolation, validate interactions, and catch visual regressions before deployment."
  keywords:
    - playwright
    - component testing
    - react testing
    - storybook
    - visual regression
---

# Component Testing with Playwright and Storybook

Playwright component tests allow you to mount, interact with, and assert on React components in a real browser. Combined with Storybook stories as test fixtures, you get isolated component testing that catches both functional and visual regressions.

## When to Use This

- You want to test components in isolation without spinning up the full application
- Interactions like hover, focus, and keyboard navigation must be validated
- Visual regressions in individual components need to be caught before deployment

## Prerequisites

- React project with Playwright installed
- Storybook configured (optional but recommended for fixtures)

## Solution

### 1. Install Dependencies

```bash
npm init playwright@latest -- --ct
npm install -D @playwright/experimental-ct-react
```

### 2. Configure Playwright for Components

```typescript
// playwright-ct.config.ts
import { defineConfig, devices } from '@playwright/experimental-ct-react';

export default defineConfig({
  testDir: './src/components',
  use: {
    trace: 'on-first-retry',
    ctPort: 3100,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

### 3. Write Component Tests

```tsx
// Button.test.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from './Button';

test.describe('Button', () => {
  test('renders with primary variant', async ({ mount }) => {
    const component = await mount(<Button variant="primary">Submit</Button>);
    await expect(component).toHaveText('Submit');
    await expect(component).toHaveClass(/primary/);
  });

  test('handles click events', async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <Button onClick={() => { clicked = true; }}>Click me</Button>
    );
    await component.click();
    expect(clicked).toBe(true);
  });

  test('disabled state prevents interaction', async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <Button disabled onClick={() => { clicked = true; }}>Disabled</Button>
    );
    await component.click({ force: true });
    expect(clicked).toBe(false);
    await expect(component).toBeDisabled();
  });

  test('focus state is visible', async ({ mount, page }) => {
    const component = await mount(<Button>Focusable</Button>);
    await component.focus();
    await expect(page.locator('button:focus-visible')).toBeVisible();
  });
});
```

### 4. Reuse Storybook Stories as Fixtures

```tsx
// Card.test.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import * as Stories from './Card.stories';

test.describe('Card', () => {
  test('loading state matches story', async ({ mount }) => {
    const component = await mount(<Stories.Loading {...Stories.Loading.args} />);
    await expect(component.locator('[data-testid="skeleton"]')).toHaveCount(3);
  });

  test('card is accessible via keyboard', async ({ mount, page }) => {
    const component = await mount(<Stories.WithActions {...Stories.WithActions.args} />);
    await component.locator('button').first().focus();
    await page.keyboard.press('Tab');
    await expect(component.locator('button:focus')).toHaveText('Edit');
  });
});
```

### 5. Visual Regression Testing

```tsx
// Alert.test.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Alert } from './Alert';

test('warning alert visual appearance', async ({ mount }) => {
  const component = await mount(
    <Alert type="warning">Disk space is low</Alert>
  );
  await expect(component).toHaveScreenshot('alert-warning.png');
});
```

## How It Works

1. **Mount API** renders components in an isolated browser context
2. **Real Browser** executes tests with actual layout, focus, and event handling
3. **Storybook Integration** reuses existing stories as test fixtures
4. **Screenshot Comparison** captures and compares visual states across builds

## Production Considerations

- Run component tests in CI before every pull request
- Store baseline screenshots in version control for deterministic comparison
- Use `toHaveScreenshot` with a threshold for acceptable pixel differences
- Combine with unit tests for logic and E2E tests for user flows

## FAQ

**Q: How is this different from React Testing Library?**
A: React Testing Library uses jsdom, which does not support real layout or CSS. Playwright component tests run in a browser and catch visual and interaction bugs that jsdom cannot.

**Q: Should I replace Jest with Playwright for all component tests?**
A: Keep Jest for fast logic tests. Use Playwright component tests for interactions, focus, and visual regression.

**Q: Can I test components that use context providers?**
A: Yes. Wrap the component with providers in the mount call, or create a test wrapper component.
