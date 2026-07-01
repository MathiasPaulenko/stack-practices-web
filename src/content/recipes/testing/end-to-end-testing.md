---
contentType: recipes
slug: end-to-end-testing
title: "End-to-End Testing"
description: "Write reliable end-to-end tests that simulate real user journeys across the entire application stack."
metaDescription: "End-to-end testing what works: Playwright, Cypress, test isolation, data seeding, CI integration, and flaky test prevention strategies."
difficulty: intermediate
topics:
  - testing
tags:
  - e2e
  - testing
  - playwright
  - automation
relatedResources:
  - /guides/cicd-pipeline-guide
  - /guides/testing-strategy-guide
  - /recipes/e2e-testing
  - /recipes/playwright-component-testing
  - /guides/test-driven-development-guide
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "End-to-end testing what works: Playwright, Cypress, test isolation, data seeding, CI integration, and flaky test prevention strategies."
  keywords:
    - e2e
    - testing
    - playwright
    - automation
---

## Overview

End-to-end (E2E) tests verify that an application works as a whole by driving it through the same interfaces a real user would use: a browser, a mobile app, or a public API. Unlike unit tests, which isolate a single function, or integration tests, which check a service boundary, E2E tests exercise the entire stack: frontend, backend, database, cache, third-party services, and network infrastructure.

The goal is not to cover every edge case, but to protect the critical user journeys that generate business value: signing up, logging in, checking out, paying, or completing a workflow. A good E2E suite catches regressions that no other test type can, but a bad one is slow, brittle, and ignored. This recipe shows how to write fast, deterministic, and maintainable E2E tests using modern tools and patterns.

## When to Use

Use this resource when:
- Testing complete user journeys across the full application stack. See [Component Testing](/recipes/testing/e2e-testing) for isolated UI validation.
- Verifying critical paths like checkout, signup, or payment flows. See [Unit Testing](/recipes/testing/unit-testing) for testing logic in isolation.
- Catching regressions that integration tests miss due to real browser behavior, rendering, or network timing.

## Solution

### Playwright test

```javascript
// e2e/checkout.spec.js
import { test, expect } from '@playwright/test';

test('customer completes checkout', async ({ page }) => {
  await page.goto('/products/demo-book');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.goto('/checkout');
  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('Order confirmed')).toBeVisible();
  await expect(page.locator('[data-testid="order-id"]')).not.toBeEmpty();
});
```

### Cypress test

```javascript
// cypress/e2e/checkout.cy.js
describe('checkout', () => {
  it('completes a purchase', () => {
    cy.visit('/products/demo-book');
    cy.contains('Add to cart').click();
    cy.visit('/checkout');
    cy.get('[data-testid="email"]').type('customer@example.com');
    cy.get('[data-testid="card"]').type('4242424242424242');
    cy.contains('Pay now').click();
    cy.contains('Order confirmed').should('be.visible');
    cy.get('[data-testid="order-id"]').should('not.be.empty');
  });
});
```

### Python with Playwright

```python
# tests/test_checkout.py
from playwright.sync_api import Page, expect

def test_checkout(page: Page):
    page.goto("/products/demo-book")
    page.get_by_role("button", name="Add to cart").click()
    page.goto("/checkout")
    page.get_by_label("Email").fill("customer@example.com")
    page.get_by_label("Card number").fill("4242424242424242")
    page.get_by_role("button", name="Pay now").click()
    expect(page.get_by_text("Order confirmed")).to_be_visible()
```

## Explanation

A well-architected E2E test has four layers: **isolation**, **setup**, **interaction**, and **assertion**.

**Isolation** means each test starts from a clean, known state. The test should not depend on data left by a previous test. Use a test database seeded per test, or reset the application state before the test runs. Playwright and Cypress both support `beforeEach` hooks and project-level setup to enforce this.

**Setup** covers authentication, data seeding, and configuration. Instead of logging in through the UI for every test, use an API endpoint or a browser storage injection to set the session cookie. This removes dozens of slow interaction steps from unrelated tests.

**Interaction** should use user-visible selectors whenever possible: role, label, placeholder, or text. Avoid brittle CSS selectors like `.btn-primary-3 > span`. Modern testing libraries encourage `getByRole`, `getByLabel`, and `getByText` because they mirror how users perceive the page.

**Assertion** should verify outcomes, not implementation. Assert that the user sees "Order confirmed" or that the order appears in their history. Do not assert that a specific function was called with a specific argument; that belongs in a unit test.

## Variants

| Tool | Language | Best For | Notes |
|------|----------|----------|-------|
| Playwright | JavaScript, Python, Java, .NET | Modern browsers, cross-browser, parallel execution | Fast, uses browser contexts, supports tracing |
| Cypress | JavaScript | Frontend teams, interactive debugging | Runs in the browser, limited to Chromium/WebKit/Firefox |
| Selenium | Java, Python, C#, etc. | Legacy browser support, enterprise grids | Slower, requires more infrastructure |
| Puppeteer | JavaScript | Chrome-only automation, scraping, PDF generation | Lower-level API than Playwright |
| WebdriverIO | JavaScript | Cross-browser with mobile support | Modular, supports Appium |

## What Works

1. **Test the happy path and a few critical failure paths.** Do not try to cover every validation message; unit tests are cheaper for that.
2. **Seed deterministic data before each test.** Use a factory or API to create users, products, and orders, and clean them up after the test.
3. **Prefer user-visible selectors over CSS or XPath.** `getByRole('button', { name: 'Submit' })` survives redesigns better than `.btn-primary`.
4. **Run E2E tests in CI on every pull request, but keep them fast.** Parallelize by shard, run only the smoke suite on small changes, and use the full suite before release.
5. **Treat flakiness as a bug.** If a test fails intermittently, investigate immediately. Common causes are race conditions, missing awaits, or unstable test data.

## Common Mistakes

1. **Testing everything through the UI.** Login, navigation, and data setup should be done via APIs or storage injection when possible.
2. **Writing assertions that depend on timing.** Use explicit waits, retrying matchers, and stable states instead of fixed `sleep` calls.
3. **Sharing mutable state between tests.** Tests that depend on each other create confusing failures and prevent parallel execution.
4. **Ignoring CI environment differences.** Local tests may pass because the dev server is already warm; CI should build the production bundle and use a fresh environment.
5. **Neglecting to clean up test artifacts.** Leftover accounts, orders, or payment records pollute analytics and can cause subsequent failures.

## Frequently Asked Questions

**Q: How many E2E tests should I write?**
A: Focus on critical user journeys. A typical mid-sized application has between 20 and 100 E2E tests. Cover the paths that, if broken, would stop users from achieving their primary goal.

**Q: Should E2E tests run before or after deployment?**
A: Run a smoke suite against a staging environment before deployment, and run the full suite after deployment against production (or a production-like environment). Some teams run the critical path tests against production continuously.

**Q: How do I make E2E tests less flaky?**
A: Seed clean data per test, use explicit waits and retrying assertions, avoid fixed delays, run tests in isolated browser contexts, and treat every flaky test as a bug to fix rather than retry.

**Q: Can I mock third-party APIs in E2E tests?**
A: Yes, but only when the third party is unreliable or expensive. Use a tool like Mock Service Worker or Playwright's network interception. Do not mock your own backend; that defeats the purpose of E2E testing.

**Q: What is the difference between E2E tests and component tests?**
A: E2E tests run the full application stack and real browser. Component tests render a single UI component in isolation and are faster but do not verify backend integration. Use both for different confidence levels.
