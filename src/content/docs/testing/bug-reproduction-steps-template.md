---
contentType: docs
slug: bug-reproduction-steps-template
title: "Bug Reproduction Steps Template"
description: "A template for writing minimal, reliable bug reproduction steps that help developers reproduce and fix issues quickly."
metaDescription: "Use this bug reproduction steps template to write minimal repro steps with environment, data, expected vs actual behavior, and severity classification."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - bug-report
  - template
  - reproduction
  - qa
  - debugging
relatedResources:
  - /docs/testing/test-case-template
  - /docs/testing/regression-test-checklist
  - /docs/testing/test-strategy-document-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this bug reproduction steps template to write minimal repro steps with environment, data, expected vs actual behavior, and severity classification."
  keywords:
    - bug report
    - reproduction steps
    - bug template
    - qa
    - debugging
    - defect tracking
    - template
---

## Overview

A bug report is only useful if a developer can reproduce the issue. Vague reports like "the login page is broken" waste time and lead to back-and-forth questions. This template ensures bug reports contain the minimum information needed to reproduce, diagnose, and fix the issue.

## When to Use

- Filing a bug in your issue tracker (Jira, GitHub Issues, Linear)
- Reporting a production incident for the on-call engineer
- Submitting a bug bounty report
- Creating a regression test from a discovered defect
- Communicating a bug to an external vendor or library maintainer

## Solution

```markdown
# Bug Report: BUG-<ID>

## Metadata

| Field | Value |
|-------|-------|
| Bug ID | BUG-001 |
| Title | Login button is unresponsive after entering invalid password 3 times |
| Reporter | <Reporter Name> |
| Date Reported | 2026-07-05 |
| Severity | Major |
| Priority | High |
| Status | Open |
| Assignee | <Developer> |
| Environment | Staging |
| Module | Authentication |
| Related Test Case | TC-001-N6 |

## Severity and Priority

| Level | Definition | Example |
|-------|-----------|---------|
| Critical | System unusable, data loss, security breach | All users locked out, payment data exposed |
| Major | Core feature broken, no workaround | Login fails for 50% of users |
| Minor | Feature broken, workaround exists | Date picker shows wrong format |
| Trivial | Cosmetic issue, no functional impact | Button color slightly off |

**Severity**: Major (core login functionality broken, but only after 3 failed attempts)
**Priority**: High (affects all users who mistype password, common scenario)

## Environment

| Field | Value |
|-------|-------|
| URL | https://staging.app.example.com/login |
| Browser | Chrome 126.0.6478.126 |
| OS | macOS 14.5 |
| Device | MacBook Pro 14" |
| Screen Resolution | 1512 x 982 |
| User Role | End user (not admin) |
| Account | testuser@example.com |
| Network | Wi-Fi (stable, 50 Mbps) |
| Timestamp | 2026-07-05T14:32:18Z |
| Build Version | v2.4.1-staging (commit abc1234) |

## Preconditions

1. User account exists: `testuser@example.com`
2. User is logged out (no active session)
3. User knows the correct password: `Test@1234`
4. No previous failed login attempts in the current session

## Reproduction Steps

| Step # | Action | Expected | Actual |
|--------|--------|----------|--------|
| 1 | Navigate to https://staging.app.example.com/login | Login page loads | Login page loads ✅ |
| 2 | Enter `testuser@example.com` in email field | Email accepted | Email accepted ✅ |
| 3 | Enter `wrongpass1` in password field | Password accepted (masked) | Password accepted ✅ |
| 4 | Click "Log In" button | Error: "Invalid email or password" | Error shown ✅ |
| 5 | Enter `wrongpass2` in password field | Password accepted (masked) | Password accepted ✅ |
| 6 | Click "Log In" button | Error: "Invalid email or password" | Error shown ✅ |
| 7 | Enter `wrongpass3` in password field | Password accepted (masked) | Password accepted ✅ |
| 8 | Click "Log In" button | Error: "Account locked for 15 minutes" | Button becomes unresponsive. No error message. Console shows `TypeError: Cannot read properties of undefined (reading 'message')` ❌ |
| 9 | Wait 15 minutes, try again | Account unlocks, login works | Button still unresponsive ❌ |

## Minimal Reproduction

After investigation, the minimal steps to reproduce:

1. Navigate to login page
2. Attempt login with invalid password 3 times
3. Observe: "Log In" button stops responding to clicks
4. Console error: `TypeError: Cannot read properties of undefined (reading 'message')` in `auth.js:142`

The issue occurs because the account lock response (HTTP 429) returns a different JSON structure than the invalid credentials response (HTTP 401). The error handler expects `response.error.message` but the 429 response has `response.message` (no `error` wrapper).

## Expected Behavior

After 3 failed login attempts, the system should:
1. Display: "Account locked due to too many failed attempts. Try again in 15 minutes."
2. Disable the login form for 15 minutes
3. Log the lock event to the audit log
4. Send an email notification to the user

## Actual Behavior

After 3 failed login attempts:
1. The "Log In" button becomes unresponsive (no click handler fires)
2. No error message is displayed
3. The form remains enabled but non-functional
4. Console shows a JavaScript TypeError
5. The account IS locked server-side, but the UI doesn't reflect it

## Evidence

### Console Output

```
TypeError: Cannot read properties of undefined (reading 'message')
    at handleAuthError (auth.js:142)
    at HTMLButtonElement.<anonymous> (auth.js:87)
    at HTMLButtonElement.dispatch (jquery.min.js:3)
    at HTMLButtonElement.r.handle (jquery.min.js:3)
```

### Network Response (429)

```json
{
  "status": 429,
  "message": "Account locked due to too many failed attempts. Try again in 15 minutes.",
  "lockedUntil": "2026-07-05T14:47:18Z"
}
```

### Network Response (401, for comparison)

```json
{
  "status": 401,
  "error": {
    "message": "Invalid email or password",
    "code": "INVALID_CREDENTIALS"
  }
}
```

### Screenshot

![Bug screenshot](link-to-screenshot.png)

## Impact Assessment

| Area | Impact |
|------|--------|
| Users affected | All users who mistype password 3+ times |
| Frequency | Common (typos happen frequently) |
| Workaround | Hard refresh the page (F5) to restore button functionality |
| Business impact | Users may abandon login and contact support |
| Support tickets | 3 tickets reported this week with same issue |

## Suggested Fix

The error handler in `auth.js:142` should handle both response structures:

```typescript
// Current (broken)
function handleAuthError(response) {
  const message = response.error.message; // crashes on 429
  showError(message);
}

// Fixed
function handleAuthError(response) {
  const message = response.error?.message ?? response.message ?? 'An error occurred';
  showError(message);
}
```

## Regression Test

After the fix, add this test to prevent regression:

```typescript
test('BUG-001: Login button remains responsive after account lock', async ({ page }) => {
  await page.goto('https://staging.app.example.com/login');

  // Attempt 3 failed logins
  for (let i = 0; i < 3; i++) {
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', `wrongpass${i + 1}`);
    await page.click('[data-testid="login-button"]');
    await page.waitForResponse(res => res.url().includes('/auth/login'));
  }

  // Verify lock message is displayed
  await expect(page.locator('[data-testid="error-message"]')).toContainText('Account locked');

  // Verify button is still responsive (can be clicked, shows lock message again)
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="error-message"]')).toContainText('Account locked');
});
```
```

## Explanation

A good bug report has five elements: environment (where it happened), preconditions (what state the system was in), steps (how to trigger it), expected vs actual (what should vs what did happen), and evidence (screenshots, logs, network responses).

The minimal reproduction section is the most valuable. After reproducing the bug, strip away unnecessary steps until you have the shortest sequence that triggers the issue. This helps developers isolate the cause and write a targeted fix.

The suggested fix section is optional but helpful. If the reporter has technical knowledge, suggesting a fix direction saves the developer investigation time. However, the reporter should not assume the fix is correct — the developer should validate.

The regression test section ensures the bug never comes back. Every bug fix should include a test that would have caught the original issue. This turns a negative (finding a bug) into a positive (permanent coverage improvement).

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Production incident | Add timeline, impact, and mitigation | Use incident report template instead |
| API bug | Include request/response headers and body | Use curl or Postman examples |
| Mobile bug | Include device model, OS version, app version | Add screen recording |
| Performance bug | Include profiling data, load conditions | Use k6 or Lighthouse report |
| Security bug | Include vulnerability type (CWE), impact | Follow responsible disclosure |

## What Works

1. Write minimal reproduction steps — strip away anything not needed to trigger the bug
2. Include exact versions — "latest Chrome" is not specific enough
3. Attach console logs and network responses — developers need to see what the code did
4. Compare expected vs actual explicitly — don't make the developer guess what's wrong
5. Suggest a fix if you can — saves investigation time
6. Add a regression test — prevents the bug from returning
7. Include impact assessment — helps prioritize the fix

## Common Mistakes

1. Vague steps ("click around the login area") — be specific about every action
2. Missing environment details — bugs often reproduce only on specific browsers or OS
3. No evidence — "it doesn't work" without logs or screenshots is not actionable
4. Combining multiple bugs — one report per bug, or the fix gets complicated
5. No minimal reproduction — including unrelated steps makes it harder to diagnose
6. Assuming the developer knows your workflow — state preconditions explicitly
7. No severity assessment — without severity, the team can't prioritize

## Frequently Asked Questions

### How do I find the minimal reproduction?

Start with the full reproduction steps. Remove one step at a time and try to reproduce. If the bug still occurs without that step, remove it permanently. Continue until you can't remove any more steps without the bug disappearing.

### What if I can't reproduce the bug consistently?

Note the frequency: "reproduces 3 out of 5 times." Include all environmental factors: network conditions, browser extensions, time of day. Intermittent bugs often involve race conditions, caching, or time-sensitive behavior. Include any patterns you notice.

### Should I report bugs directly in code comments?

No. Bug reports belong in the issue tracker where they can be tracked, prioritized, and assigned. Code comments should reference the bug ID: `// BUG-001: Handle 429 response structure`. This connects the code to the tracking system.

### What severity should I assign?

Critical: data loss, security breach, system unusable. Major: core feature broken, no workaround. Minor: feature broken, workaround exists. Trivial: cosmetic only. When in doubt, ask the product owner or tech lead to confirm severity.

### How detailed should the regression test be?

It should cover the exact scenario that triggered the bug: same steps, same data, same assertions. The test should fail before the fix and pass after. Keep it focused — one test per bug, not a comprehensive suite.
