---



contentType: docs
slug: test-case-template
title: "Test Case Template"
description: "A standardized test case format with steps, expected results, preconditions, and postconditions for manual and automated testing."
metaDescription: "Use this test case template to write standardized test cases with steps, expected results, preconditions, postconditions, and traceability."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - test-case
  - template
  - manual-testing
  - test-design
  - traceability
relatedResources:
  - /docs/test-strategy-document-template
  - /docs/test-coverage-report-template
  - /docs/bug-reproduction-steps-template
  - /docs/regression-test-checklist
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this test case template to write standardized test cases with steps, expected results, preconditions, postconditions, and traceability."
  keywords:
    - test case
    - test template
    - manual testing
    - test design
    - preconditions
    - expected results
    - traceability



---

## Overview

A test case is a set of conditions under which a tester determines whether an application meets requirements. Standardized test cases ensure consistent coverage, reproducible results, and traceability from requirements to verification. This template provides a structure for writing test cases that are clear, complete, and actionable.

## When to Use


- For alternatives, see [Data Quality Rules Template](/docs/data-quality-rules-template/).

- Writing manual test cases for QA cycles
- Creating test documentation for compliance audits
- Onboarding new QA team members to testing standards
- Converting manual tests into automated test scripts
- Tracking test coverage against requirements

## Solution

```markdown
# Test Case: TC-<ID>

## Metadata

| Field | Value |
|-------|-------|
| Test Case ID | TC-001 |
| Title | Verify user can log in with valid credentials |
| Module | Authentication |
| Feature | Login |
| Priority | Critical |
| Type | Functional |
| Execution Type | Manual / Automated |
| Estimated Time | 5 minutes |
| Created By | <Author> |
| Created Date | 2026-07-05 |
| Last Updated | 2026-07-05 |
| Requirement ID | REQ-AUTH-001 |
| Test Status | Not Run / Pass / Fail / Blocked |

## Preconditions

1. User account exists in the system with email `testuser@example.com`
2. User account is active (not suspended or deleted)
3. User knows the correct password: `Test@1234`
4. Application is accessible at `https://app.example.com`
5. Browser is Chrome 120+ or Firefox 120+
6. No active session for the test user (logged out)

## Test Steps

| Step # | Action | Expected Result | Actual Result | Status |
|--------|--------|-----------------|---------------|--------|
| 1 | Navigate to `https://app.example.com/login` | Login page loads with email and password fields, and a "Log In" button | | |
| 2 | Enter `testuser@example.com` in the email field | Email field displays the entered value | | |
| 3 | Enter `Test@1234` in the password field | Password field displays masked characters (••••••••) | | |
| 4 | Click the "Log In" button | System processes the login request | | |
| 5 | Wait for redirect | User is redirected to the dashboard at `/dashboard` | | |
| 6 | Verify the user avatar | User avatar with initials "TU" is visible in the top-right corner | | |
| 7 | Verify the welcome message | Dashboard displays "Welcome, Test User" | | |
| 8 | Verify session cookie | A session cookie named `session_id` is set with `HttpOnly` and `Secure` flags | | |

## Postconditions

1. User is authenticated and has an active session
2. Session token is valid for 24 hours
3. User activity log records the login event with timestamp and IP
4. User is on the dashboard page

## Test Data

| Field | Value | Notes |
|-------|-------|-------|
| Email | `testuser@example.com` | Pre-created test account |
| Password | `Test@1234` | Changed quarterly |
| Invalid email | `invalid@example.com` | For negative test case |
| Invalid password | `wrongpass` | For negative test case |

## Negative Test Cases

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| TC-001-N1 | Login with invalid password | Same as TC-001 but enter `wrongpass` in step 3 | Error message "Invalid email or password" is displayed. User remains on login page. |
| TC-001-N2 | Login with non-existent email | Same as TC-001 but enter `nobody@example.com` in step 2 | Error message "Invalid email or password" is displayed. No account enumeration. |
| TC-001-N3 | Login with empty email field | Skip step 2, click "Log In" | Email field shows validation error "Email is required" |
| TC-001-N4 | Login with empty password field | Skip step 3, click "Log In" | Password field shows validation error "Password is required" |
| TC-001-N5 | Login with SQL injection in email | Enter `' OR 1=1; --` in email field | Error message "Invalid email format" is displayed. No SQL execution. |
| TC-001-N6 | Login after 5 failed attempts | Repeat TC-001-N1 five times | Account is locked for 15 minutes. Error message "Account locked due to too many attempts." |

## Edge Cases

| Test Case ID | Description | Expected Result |
|--------------|-------------|-----------------|
| TC-001-E1 | Email with leading/trailing spaces | `  testuser@example.com  ` should be trimmed and accepted |
| TC-001-E2 | Email with uppercase | `TestUser@Example.com` should be case-insensitive and accepted |
| TC-001-E3 | Password with special characters | Password `Tëst@1234!#$%` should be accepted if it meets policy |
| TC-001-E4 | Session timeout during login | If login takes > 30s, show "Request timeout. Please try again." |
| TC-001-E5 | Concurrent login from two browsers | Second login should succeed. First session should be invalidated. |

## Traceability

| Requirement ID | Requirement Description | Test Case IDs |
|----------------|--------------------------|---------------|
| REQ-AUTH-001 | User can log in with valid credentials | TC-001 |
| REQ-AUTH-002 | Invalid credentials show error without enumeration | TC-001-N1, TC-001-N2 |
| REQ-AUTH-003 | Account locks after 5 failed attempts | TC-001-N6 |
| REQ-AUTH-004 | Session is invalidated on concurrent login | TC-001-E5 |

## Automation Notes

If automating this test case with Playwright:

```typescript
test('TC-001: User can log in with valid credentials', async ({ page }) => {
  // Preconditions: ensure test user exists
  await ensureTestUserExists();

  // Step 1: Navigate to login page
  await page.goto('https://app.example.com/login');
  await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="login-button"]')).toBeVisible();

  // Steps 2-3: Enter credentials
  await page.fill('[data-testid="email-input"]', 'testuser@example.com');
  await page.fill('[data-testid="password-input"]', 'Test@1234');

  // Step 4: Click login
  await page.click('[data-testid="login-button"]');

  // Step 5: Verify redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/);

  // Step 6: Verify user avatar
  await expect(page.locator('[data-testid="user-avatar"]')).toHaveText('TU');

  // Step 7: Verify welcome message
  await expect(page.locator('[data-testid="welcome-message"]')).toHaveText('Welcome, Test User');

  // Step 8: Verify session cookie
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'session_id');
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie.httpOnly).toBe(true);
  expect(sessionCookie.secure).toBe(true);

  // Postcondition: clean up
  await page.click('[data-testid="logout-button"]');
});
```
```

## Explanation

The test case template has six key sections: metadata (identification and traceability), preconditions (what must be true before testing), steps (the actions and expected results), postconditions (what should be true after), test data (inputs needed), and negative/edge cases (what else to verify).

Preconditions are critical: without them, a test case may pass on one machine and fail on another because the starting state differs. Postconditions verify that the system is in the expected state after the test, not just that the immediate action worked.

Negative test cases are where most bugs hide. Testing only the happy path gives false confidence. SQL injection, empty inputs, boundary values, and concurrent access are where production incidents originate.

The traceability matrix links requirements to test cases. This is mandatory for compliance (SOC 2, ISO 27001, FDA) and useful for coverage analysis: if a requirement has no test cases, it's untested.


### Detailed Scenario: Test Case for Order Creation API

```text
API: POST /v1/orders
Module: Orders
Priority: Critical
Type: Functional + Integration

Preconditions:
  1. Orders service running in staging
  2. User authenticated with valid JWT token
  3. At least 3 products with available stock in DB
  4. Valid shipping address created beforehand

Steps:
  | # | Action | Expected Result |
  |---|--------|-----------------|
  | 1 | POST /v1/orders with valid body | 201 Created with body {id, status, total} |
  | 2 | Verify Location header | Contains /v1/orders/{id} |
  | 3 | GET /v1/orders/{id} | 200 OK with same body |
  | 4 | Verify stock decremented | GET /v1/products/{sku} shows stock -1 |
  | 5 | Verify event published | Message queue has order.created event |
  | 6 | Repeat POST with same Idempotency-Key | 200 OK with same order (no duplicate) |

Negative Cases:
  | ID | Description | Result |
  |----|-------------|--------|
  | N1 | Nonexistent customer_id | 400 with VALIDATION_ERROR |
  | N2 | Empty items array | 422 with EMPTY_ITEMS |
  | N3 | quantity <= 0 | 422 with INVALID_QUANTITY |
  | N4 | SKU out of stock | 409 with OUT_OF_STOCK |
  | N5 | Missing Authorization header | 401 Unauthorized |
  | N6 | Duplicate Idempotency-Key with different body | 409 Conflict |

Edge Cases:
  | ID | Description | Result |
  |----|-------------|--------|
  | E1 | Order with 100 items | 201 Created, latency < 2s |
  | E2 | Order with unicode characters in address | 201 Created, data preserved |
  | E3 | quantity = 999999 | 201 Created or 422 if exceeds max allowed |
  | E4 | Concurrency: 2 orders for same SKU simultaneously | One succeeds, other 409 OUT_OF_STOCK |

Traceability:
  | Requirement | Cases |
  |-------------|-------|
  | REQ-ORD-001 | TC-ORD-001 (happy path) |
  | REQ-ORD-002 | TC-ORD-N1..N6 (validation) |
  | REQ-ORD-003 | TC-ORD-E4 (concurrency) |
  | REQ-ORD-004 | TC-ORD-001 step 6 (idempotency) |
```

### How do I document test cases for asynchronous flows?

For asynchronous flows (message queues, webhooks, events), document the expected event as the result. Instead of verifying an immediate HTTP response, verify: (1) the message published to the queue, (2) the final state after processing, (3) the maximum acceptable timeout. Use polling with retry in automation: check every 500ms up to 10s max.

### Should I use BDD (Gherkin) for writing test cases?

BDD (Given-When-Then) is useful when working with product managers or stakeholders who need to read the test cases. For technical teams, the tabular format is more direct. If you use Cucumber or Behave, Gherkin format is required. For Playwright or Vitest, the tabular format maps directly to code.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| API testing | Replace UI steps with HTTP requests | Use status codes and response body assertions |
| Mobile testing | Add device/OS to preconditions | Test on multiple screen sizes |
| Performance testing | Add load parameters and latency thresholds | Use k6 or JMeter scripts |
| Compliance testing | Add regulatory requirement mapping | FDA 21 CFR Part 11, GDPR |
| Exploratory testing | Use charter-based format instead of steps | Time-boxed exploration with debrief |

## What Works

1. Write preconditions explicitly — implicit assumptions cause false failures
2. Include negative and edge cases in every test case — not as separate documents
3. Use data-testid attributes in automation — more stable than CSS selectors
4. Link every test case to a requirement — no orphan tests
5. Keep test data in a shared location — not hardcoded in each test case
6. Review test cases like code — peer review catches missing steps
7. Version test cases alongside requirements — track changes over time

## Common Mistakes

1. Vague expected results ("page loads correctly" — what does correct mean?)
2. Missing preconditions ("assumes user is logged in" — state it explicitly)
3. Testing only the happy path — negative cases find the real bugs
4. Hardcoding test data in steps — use a test data table for maintainability
5. No traceability to requirements — can't prove coverage for audits
6. Overly detailed steps for automated tests — the script is the documentation
7. Not updating test cases when requirements change — stale tests waste time

## Frequently Asked Questions

### How detailed should test steps be?

Detailed enough that someone unfamiliar with the feature can execute the test and verify the result. Each step should have one action and one expected result. If a step has multiple actions, split it. For automated tests, the code is the documentation — steps are for manual execution.

### Should I write test cases before or after development?

Before. Test cases are derived from requirements, not from the implementation. Writing test cases first (or alongside acceptance criteria) catches requirement ambiguities before code is written. This is the essence of behavior-driven development (BDD).

### How do I handle test cases that change frequently?

Use parameterized test cases. Keep the steps stable and parameterize the data. For example, a login test case with a data table of 10 different credential combinations is more maintainable than 10 separate test cases.

### What is the difference between a test case and a test scenario?

A test scenario is a high-level description of what to test ("verify login works"). A test case is a detailed set of steps with specific inputs and expected results. One scenario typically has multiple test cases: happy path, negative cases, edge cases.

### How many test cases per feature?

Depends on complexity. A simple feature might need 5-10 test cases (happy path, 3-5 negative, 2-3 edge). A complex feature like payment processing might need 50+. Use risk-based testing: more test cases for higher-risk features. Don't write test cases for trivial UI changes.
