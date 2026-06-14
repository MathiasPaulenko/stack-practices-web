---
contentType: recipes
slug: e2e-testing
title: "Write End-to-End Tests That Actually Catch Bugs"
description: "How to design reliable end-to-end tests using Playwright and Cypress that simulate real user journeys, avoid flakiness, and integrate into CI/CD pipelines."
metaDescription: "Learn end-to-end testing with Playwright and Cypress. Design reliable E2E tests that simulate real user journeys, avoid flakiness, and integrate into CI/CD."
difficulty: intermediate
topics:
  - testing
tags:
  - e2e-testing
  - playwright
  - cypress
  - user-journey
  - flakiness
  - ci-cd
  - automation
  - testing
relatedResources:
  - /recipes/integration-testing
  - /recipes/unit-testing-mocking
  - /recipes/load-testing
lastUpdated: "2026-06-13"
author: "StackPractices"
seo:
  metaDescription: "Learn end-to-end testing with Playwright and Cypress. Design reliable E2E tests that simulate real user journeys, avoid flakiness, and integrate into CI/CD."
  keywords:
    - end to end testing
    - playwright e2e
    - cypress testing
    - user journey testing
    - automated browser testing
---

## Overview

End-to-end (E2E) tests simulate real user interactions across the entire application stack — browser, frontend, API, database, and third-party services. Unlike unit tests, which verify isolated functions, and integration tests, which verify component interactions, E2E tests validate that the complete system behaves correctly from the user's perspective.

The primary challenge with E2E testing is flakiness — tests that intermittently fail without code changes. Flakiness stems from race conditions, unstable selectors, environmental drift, and asynchronous timing issues. A well-designed E2E suite uses explicit waits, stable selectors, deterministic test data, and isolated environments to minimize false negatives. This recipe covers Playwright and Cypress, the two dominant modern E2E frameworks.

## When to use it

Use this recipe when:

- Validating critical user journeys like login, checkout, and onboarding flows
- Testing across multiple browsers and devices before release
- Catching regressions that unit and integration tests miss
- Building confidence for continuous deployment pipelines
- Reproducing bugs reported by users in production environments

## Solution

### Playwright (TypeScript)

```typescript
import { test, expect } from '@playwright/test';

test.describe('checkout flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('user can complete a purchase', async ({ page }) => {
    await page.goto('/products');
    await page.click('[data-testid="product-42"]');
    await page.click('[data-testid="add-to-cart"]');
    await page.waitForSelector('[data-testid="cart-count"]', { hasText: '1' });

    await page.goto('/checkout');
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="expiry"]', '12/25');
    await page.fill('[data-testid="cvc"]', '123');
    await page.click('[data-testid="place-order"]');

    await page.waitForSelector('[data-testid="order-confirmation"]');
    const confirmation = await page.textContent('[data-testid="order-confirmation"]');
    expect(confirmation).toContain('Thank you for your order');
  });
});
```

### Cypress (JavaScript)

```javascript
describe('checkout flow', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('user can complete a purchase', () => {
    cy.visit('/products');
    cy.get('[data-testid="product-42"]').click();
    cy.get('[data-testid="add-to-cart"]').click();
    cy.get('[data-testid="cart-count"]').should('have.text', '1');

    cy.visit('/checkout');
    cy.get('[data-testid="card-number"]').type('4242424242424242');
    cy.get('[data-testid="expiry"]').type('12/25');
    cy.get('[data-testid="cvc"]').type('123');
    cy.get('[data-testid="place-order"]').click();

    cy.get('[data-testid="order-confirmation"]')
      .should('be.visible')
      .and('contain', 'Thank you for your order');
  });
});
```

### CI/CD Integration (GitHub Actions)

```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Explanation

- **Real browser automation**: Playwright and Cypress drive real Chromium, Firefox, and WebKit browsers. They simulate clicks, typing, navigation, and network conditions more accurately than headless HTTP clients.
- **Auto-waiting**: both frameworks automatically wait for elements to appear, become enabled, or stop animating before interacting. This eliminates the `sleep(1)` anti-pattern that causes flakiness in Selenium.
- **Trace and debug**: Playwright generates traces (screenshots, network logs, DOM snapshots) on failure. Cypress runs inside the browser and provides time-travel debugging. Both make diagnosing failures significantly faster.
- **Test isolation**: each test should create and clean up its own data. Shared database state between tests causes ordering dependencies and hidden failures. Use APIs or database fixtures to reset state in `beforeEach`.

## Variants

| Framework | Language | Cross-browser | Parallel | Best for |
|-----------|----------|---------------|----------|----------|
| Playwright | TypeScript | Chromium, Firefox, WebKit | Native | Teams needing speed and coverage |
| Cypress | JavaScript | Chromium, Electron | Via dashboard | Teams wanting in-browser debugging |
| Selenium | Multi | All major | Via Grid | Legacy enterprise support |
| Puppeteer | JavaScript | Chromium only | Manual | Chrome-specific scraping/testing |

## Best practices

- **Use `data-testid` selectors**: avoid selecting by CSS class or DOM position. Classes change during refactors; `data-testid` attributes are stable contracts between frontend and test suite.
- **Test user journeys, not implementation details**: a good E2E test reads like a user story — "the user logs in, adds a product to cart, and checks out." It does not assert internal Redux state or API response payloads.
- **Run E2E in CI on every PR**: E2E tests are slow, but running them on pull requests catches regressions before they reach staging. Use sharding (parallel workers) to keep total runtime under 10 minutes.
- **Mock external dependencies**: third-party payment processors, email services, and analytics should be stubbed or intercepted. Tests that depend on real external services are slow and unreliable.
- **Retry failed tests cautiously**: most frameworks support automatic retries. Use them sparingly — retries mask real flakiness. Fix the root cause instead of retrying indefinitely.

## Common mistakes

- **Testing everything through the UI**: not every feature needs an E2E test. Business-critical paths (checkout, login, payments) deserve E2E coverage. Internal admin utilities are better served by integration tests.
- **Hardcoding timeouts**: explicit waits like `cy.wait(3000)` make tests slow and still fail on slower CI runners. Use framework auto-waiting or assert on DOM conditions instead.
- **Sharing test accounts**: tests that log in with the same user account create race conditions. Use test-specific accounts or ephemeral users created via API before each test.
- **Ignoring mobile viewports**: users interact with your application on phones, tablets, and desktops. Run E2E tests against multiple viewport sizes to catch responsive layout bugs.

## FAQ

**Q: How many E2E tests should I write?**
A: Follow the test pyramid — many unit tests, fewer integration tests, and a small number of E2E tests covering critical user journeys. A typical application has 20-50 E2E tests, not hundreds.

**Q: Should E2E tests run against production?**
A: Run synthetic monitoring (smoke tests) against production, but not the full E2E suite. Production tests mutate real data and depend on external services outside your control.

**Q: How do I handle authentication in E2E tests?**
A: Use API endpoints to create and authenticate test users before each test. Store session tokens in `localStorage` or cookies via `page.addInitScript` to bypass the UI login flow.

**Q: What is the difference between E2E and integration testing?**
A: E2E tests drive the application through the UI as a user would. Integration tests verify that backend components (API + database + service) work together, often via direct HTTP calls without a browser.

