---
contentType: recipes
slug: visual-regression-testing
title: "Catch UI Regressions Automatically with Visual Testing"
description: "How to detect unintended visual changes in web applications using screenshot comparison, baseline management, and tools like Chromatic, Percy, and Playwright."
metaDescription: "Learn visual regression testing for web apps. Detect unintended visual changes using screenshot comparison, baselines and Chromatic, Percy."
difficulty: intermediate
topics:
  - testing
tags:
  - baseline
  - chromatic
  - design-systems
  - percy
  - playwright
  - testing
  - ui-testing
  - visual-regression
relatedResources:
  - /recipes/e2e-testing
  - /recipes/unit-testing
  - /recipes/integration-testing
  - /recipes/integration-testing-strategies
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn visual regression testing for web apps. Detect unintended visual changes using screenshot comparison, baselines and Chromatic, Percy."
  keywords:
    - visual regression testing
    - screenshot comparison
    - ui regression
    - chromatic testing
    - percy visual testing
---

## Overview

Functional tests verify that buttons click, forms submit, and APIs return correct data. But they do not catch a CSS change that shifts a button 2 pixels left, a font update that breaks line heights, or a theme change that makes text unreadable. Visual regression testing fills this gap by capturing screenshots of your application and comparing them against approved baselines. Any pixel difference is flagged for human review, preventing unintended visual changes from reaching production.

The core challenge is avoiding false positives. Anti-aliasing, animation frames, timestamps, and dynamic content (ads, stock prices, user avatars) create benign differences that must be filtered out. Modern visual testing tools use DOM-based rendering, ignoring sub-pixel noise, and allow masking dynamic regions. This recipe covers Playwright screenshot comparison, Chromatic for component libraries, and strategies for stable, maintainable visual baselines.

## When to use it

Use this recipe when:

- Maintaining a design system where component changes affect multiple applications
- Releasing frequent UI updates and needing confidence that changes are intentional
- Supporting multiple browsers or themes where visual consistency is critical
- Migrating CSS frameworks or refactoring global styles with broad impact
- Collaborating between design and engineering teams with shared visual standards

## Solution

### Playwright Visual Comparison

```javascript
// playwright.config.js
module.exports = {
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },
};

// test.spec.js
const { test, expect } = require('@playwright/test');

test('homepage visual regression', async ({ page }) => {
  await page.goto('https://app.example.com');

  // Wait for dynamic content to stabilize
  await page.waitForLoadState('networkidle');

  // Mask dynamic elements (timestamps, user names, ads)
  await expect(page).toHaveScreenshot('homepage.png', {
    mask: [
      page.locator('[data-testid="timestamp"]'),
      page.locator('[data-testid="user-avatar"]'),
    ],
    fullPage: true,
  });
});

test('dark mode toggle', async ({ page }) => {
  await page.goto('https://app.example.com');
  await page.click('[data-testid="theme-toggle"]');
  await expect(page).toHaveScreenshot('homepage-dark.png');
});
```

### Chromatic for Component Libraries

```javascript
// .storybook/preview.js
export const parameters = {
  chromatic: {
    diffThreshold: 0.2,
    delay: 300, // Wait for animations to complete
    disableSnapshot: false,
    viewports: [320, 768, 1280],
  },
};

// Button.stories.js
export const Primary = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
  parameters: {
    chromatic: { viewports: [320, 1280] },
  },
};

// CI integration
// npx chromatic --project-token=YOUR_TOKEN
```

### Percy with Selenium (Python)

```python
from selenium import webdriver
from percy.selenium import percy_snapshot

driver = webdriver.Chrome()
driver.get("https://app.example.com/dashboard")

# Snapshot with Percy for visual comparison
percy_snapshot(driver, name="Dashboard", widths=[768, 1280, 1920])

driver.quit()
```

## Explanation

- **Screenshot comparison**: visual testing tools capture a screenshot of the current page and compare it pixel-by-pixel against the approved baseline. Differences are highlighted in a diff view. Reviewers approve intentional changes or reject regressions.
- **Baseline management**: the baseline is the approved version of a screenshot. When a test produces a different image, it is flagged as "changed." The team reviews the diff and either approves it (updating the baseline) or rejects it (fixing the code). Baselines are typically stored in cloud services, not version control.
- **Masking and exclusion**: dynamic content like timestamps, random user avatars, and ads cause false positives. Mask these elements by selecting their DOM nodes before capture. The tool replaces masked regions with solid colors, ignoring them during comparison.
- **Cross-browser rendering**: fonts, anti-aliasing, and layout engines vary between browsers. A screenshot taken in Chrome will not match one from Safari pixel-perfectly. Run visual tests in the browsers you support, maintaining separate baselines for each.

## Variants

| Tool | Scope | CI integration | Cost | Best for |
|------|-------|----------------|------|----------|
| Playwright | Full page + component | Built-in | Free | Teams already using Playwright |
| Chromatic | Storybook components | GitHub/CI | Paid | Design systems |
| Percy | Full page + component | Multi-platform | Paid | Cross-browser testing |
| Applitools | AI-powered | Enterprise | Paid | Large-scale visual testing |

## Best practices

- **Stabilize before capture**: wait for fonts to load, animations to complete, and network requests to settle before taking screenshots. Use `networkidle`, explicit waits, or Chromatic's `delay` parameter. Screenshots of loading spinners are useless.
- **Isolate components in Storybook**: testing components in isolation (via Storybook) produces more stable baselines than full-page screenshots. A Button component has fewer variables than an entire Dashboard page. Use both: Storybook for component coverage, full-page for integration.
- **Mask all dynamic content**: identify every element that changes between runs — dates, usernames, IDs, random images, A/B test variations. Mask them aggressively. Unmasked dynamic content is the #1 cause of flaky visual tests.
- **Review diffs in CI, not locally**: visual testing produces many images. Reviewing them in pull requests via CI integrations (GitHub Checks, GitLab MRs) is more efficient than downloading and comparing locally. Approve baselines through the web UI.
- **Limit viewport combinations**: testing every component at 12 breakpoints is slow and expensive. Identify your top 3 breakpoints (mobile, tablet, desktop) and test only those. Use responsive design principles to infer intermediate behavior.

## Common mistakes

- **Testing full pages without masking**: a page with a live timestamp, rotating banner, and user-specific greeting will fail on every run. Either mask these elements or use stubbed data that is identical across test runs.
- **Storing baselines in Git**: screenshots are large binary files that bloat repositories. Use cloud-based baseline storage (Chromatic, Percy, or your own S3 bucket). Git should store only the test code, not the images.
- **Running visual tests on every commit**: visual tests are slower than unit tests. Run them on pull requests and before releases, not on every push to feature branches. Use your CI pipeline to gate releases, not development velocity.
- **Ignoring mobile viewports**: a component that looks fine at 1280px may overflow at 375px. Always include at least one mobile viewport in your visual test matrix. Mobile traffic often exceeds desktop in consumer applications.

## FAQ

**Q: Are visual tests a replacement for unit tests?**
A: No. Visual tests catch visual regressions; unit tests catch logic bugs. They complement each other. A button may look correct but submit the wrong form. A form may calculate correctly but be invisible due to a CSS bug. Use both.

**Q: How do I handle intentional design changes?**
A: When a PR intentionally changes the UI, the visual test will flag a diff. The reviewer approves the new screenshot, which becomes the new baseline. This is the normal workflow — visual tests do not block changes, they ensure changes are reviewed.

**Q: Can I test responsive animations?**
A: Most visual testing tools capture static screenshots, not videos. For animations, use a delay to capture the final state, or mask the animated region. For motion-specific testing, use dedicated animation testing tools or manual QA.

**Q: What causes flaky visual tests?**
A: Unstable data, loading states, animations, browser version differences, and non-deterministic rendering. Fix flakiness by masking dynamic regions, using stubbed data, waiting for stability, and pinning browser versions in CI.

