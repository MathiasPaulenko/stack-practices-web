---
contentType: docs
slug: frontend-performance-budget-template
title: "Frontend Performance Budget Template"
description: "A template for defining JS, CSS, image, and font budgets per route with enforcement strategies and monitoring thresholds."
metaDescription: "Use this frontend performance budget template to define JS, CSS, image, font limits per route with enforcement strategies and monitoring thresholds."
difficulty: intermediate
topics:
  - testing
tags:
  - frontend
  - performance
  - budget
  - template
  - core-web-vitals
  - bundle-size
  - web-performance
relatedResources:
  - /docs/frontend/accessibility-audit-checklist
  - /docs/frontend/component-api-documentation-template
  - /docs/frontend/browser-support-matrix-template
  - /guides/frontend/complete-guide-core-web-vitals
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this frontend performance budget template to define JS, CSS, image, font limits per route with enforcement strategies and monitoring thresholds."
  keywords:
    - performance budget
    - frontend performance
    - bundle size
    - core web vitals
    - web performance
    - template
    - resource limits
---

## Overview

A performance budget sets limits on the size and timing of resources that make up a web page. Without budgets, page weight grows incrementally until performance degrades. This template defines budgets per route, tracks them in CI, and establishes monitoring thresholds for production.

## When to Use

- Starting a new web project
- Experiencing performance regressions
- Setting up Core Web Vitals monitoring
- Establishing team performance standards
- Preparing for performance-focused launches

## Solution

```markdown
# Performance Budget — `<Project Name>`

## Budget Overview

| Field | Value |
|-------|-------|
| Project | Example Web App |
| Last Updated | 2026-07-05 |
| Owner | Frontend Team |
| Enforcement | CI gate + Lighthouse CI |
| Monitoring | Real User Monitoring (RUM) + Synthetic |

## 1. Route-Level Budgets

### Home Page (`/`)

| Resource Type | Budget | Current | Status | Notes |
|---------------|--------|---------|--------|-------|
| Total JS (gzipped) | 150 KB | 142 KB | ✅ | Includes vendor bundle |
| Total CSS (gzipped) | 30 KB | 28 KB | ✅ | Tailwind + custom |
| Total images | 500 KB | 480 KB | ✅ | Hero + thumbnails |
| Total fonts | 100 KB | 80 KB | ✅ | 2 font families |
| HTML | 50 KB | 35 KB | ✅ | Server-rendered |
| Total page weight | 830 KB | 765 KB | ✅ | Sum of all resources |
| JS requests | 3 | 3 | ✅ | Vendor + app + lazy |
| CSS requests | 1 | 1 | ✅ | Single stylesheet |
| Image requests | 8 | 7 | ✅ | — |
| Font requests | 2 | 2 | ✅ | — |
| Total requests | 15 | 14 | ✅ | — |

### Product Page (`/products/:id`)

| Resource Type | Budget | Current | Status | Notes |
|---------------|--------|---------|--------|-------|
| Total JS (gzipped) | 180 KB | 165 KB | ✅ | Includes product gallery |
| Total CSS (gzipped) | 35 KB | 32 KB | ✅ | — |
| Total images | 800 KB | 750 KB | ✅ | Product images |
| Total fonts | 100 KB | 80 KB | ✅ | Same as home |
| HTML | 60 KB | 42 KB | ✅ | Product data |
| Total page weight | 1,175 KB | 1,069 KB | ✅ | — |
| JS requests | 4 | 4 | ✅ | Vendor + app + gallery + reviews |
| CSS requests | 1 | 1 | ✅ | — |
| Image requests | 12 | 10 | ✅ | Gallery + thumbnails |
| Font requests | 2 | 2 | ✅ | — |
| Total requests | 20 | 18 | ✅ | — |

### Checkout Page (`/checkout`)

| Resource Type | Budget | Current | Status | Notes |
|---------------|--------|---------|--------|-------|
| Total JS (gzipped) | 200 KB | 188 KB | ✅ | Includes payment SDK |
| Total CSS (gzipped) | 35 KB | 30 KB | ✅ | — |
| Total images | 100 KB | 50 KB | ✅ | Minimal images |
| Total fonts | 100 KB | 80 KB | ✅ | — |
| HTML | 40 KB | 30 KB | ✅ | — |
| Total page weight | 475 KB | 428 KB | ✅ | — |
| JS requests | 5 | 5 | ✅ | Vendor + app + payment + validation + analytics |
| CSS requests | 1 | 1 | ✅ | — |
| Image requests | 2 | 2 | ✅ | Logo + security badge |
| Font requests | 2 | 2 | ✅ | — |
| Total requests | 11 | 11 | ✅ | — |

### Dashboard Page (`/dashboard`)

| Resource Type | Budget | Current | Status | Notes |
|---------------|--------|---------|--------|-------|
| Total JS (gzipped) | 250 KB | 245 KB | ⚠️ | Chart library is heavy |
| Total CSS (gzipped) | 40 KB | 38 KB | ✅ | — |
| Total images | 200 KB | 150 KB | ✅ | Avatars + charts |
| Total fonts | 100 KB | 80 KB | ✅ | — |
| HTML | 80 KB | 65 KB | ✅ | Dashboard data |
| Total page weight | 670 KB | 578 KB | ✅ | — |
| JS requests | 6 | 6 | ✅ | Vendor + app + charts + date + table + auth |
| CSS requests | 1 | 1 | ✅ | — |
| Image requests | 5 | 4 | ✅ | — |
| Font requests | 2 | 2 | ✅ | — |
| Total requests | 15 | 14 | ✅ | — |

## 2. Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor | Target | Current (p75) | Status |
|--------|------|-------------------|------|--------|---------------|--------|
| LCP | < 2.5s | 2.5s - 4.0s | > 4.0s | < 2.5s | 2.1s | ✅ |
| INP | < 200ms | 200ms - 500ms | > 500ms | < 200ms | 180ms | ✅ |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 | < 0.1 | 0.05 | ✅ |
| FCP | < 1.8s | 1.8s - 3.0s | > 3.0s | < 1.8s | 1.4s | ✅ |
| TTFB | < 800ms | 800ms - 1.8s | > 1.8s | < 800ms | 650ms | ✅ |

## 3. Timing Budgets

| Metric | Budget | Current | Status |
|--------|--------|---------|--------|
| Time to First Byte (TTFB) | < 800ms | 650ms | ✅ |
| First Contentful Paint (FCP) | < 1.8s | 1.4s | ✅ |
| Largest Contentful Paint (LCP) | < 2.5s | 2.1s | ✅ |
| Time to Interactive (TTI) | < 3.5s | 3.1s | ✅ |
| Total Blocking Time (TBT) | < 200ms | 150ms | ✅ |
| Cumulative Layout Shift (CLS) | < 0.1 | 0.05 | ✅ |
| Interaction to Next Paint (INP) | < 200ms | 180ms | ✅ |

## 4. Third-Party Budgets

| Third-Party | Type | JS Budget | Current | Status | Notes |
|-------------|------|-----------|---------|--------|-------|
| Google Analytics | Analytics | 45 KB | 42 KB | ✅ | Loaded async |
| Stripe.js | Payment | 50 KB | 48 KB | ✅ | Only on checkout |
| Sentry | Error tracking | 25 KB | 22 KB | ✅ | Loaded async |
| Google Maps | Maps | 80 KB | 75 KB | ✅ | Only on store locator |
| Intercom | Support | 60 KB | 55 KB | ✅ | Lazy loaded |
| **Total third-party** | | **260 KB** | **242 KB** | **✅** | |

## 5. CI Enforcement

### Bundle Size Check

```yaml
# .github/workflows/performance-budget.yml
name: Performance Budget Check
on: [pull_request]

jobs:
  budget-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build

      - name: Check bundle sizes
        run: |
          node scripts/check-bundle-size.js

      - name: Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci collect --url=http://localhost:3000 --numberOfRuns=3
          lhci assert --preset=lighthouse:recommended
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_TOKEN }}
```

### Bundle Size Script

```javascript
// scripts/check-bundle-size.js
const fs = require('fs');
const path = require('path');
const gzipSize = require('gzip-size');

const budgets = {
  'dist/assets/vendor.js': { max: 100000, type: 'gzipped' },
  'dist/assets/app.js': { max: 50000, type: 'gzipped' },
  'dist/assets/styles.css': { max: 30000, type: 'gzipped' },
};

let failed = false;

for (const [file, budget] of Object.entries(budgets)) {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.error(`MISSING: ${file}`);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(filePath);
  const size = budget.type === 'gzipped' ? gzipSize.sync(content) : content.length;
  const sizeKB = (size / 1024).toFixed(1);
  const maxKB = (budget.max / 1024).toFixed(1);

  if (size > budget.max) {
    console.error(`FAIL: ${file} — ${sizeKB} KB (budget: ${maxKB} KB)`);
    failed = true;
  } else {
    console.log(`OK: ${file} — ${sizeKB} KB (budget: ${maxKB} KB)`);
  }
}

if (failed) {
  process.exit(1);
}
```

### Lighthouse CI Config

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000",
        "http://localhost:3000/products/sample",
        "http://localhost:3000/checkout"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 200 }]
      }
    }
  }
}
```

## 6. Production Monitoring

### RUM Thresholds

| Metric | Alert Threshold | Page | Action |
|--------|----------------|------|--------|
| LCP p75 > 3s | Warning | Any | Investigate slow routes |
| LCP p75 > 4s | Critical | Any | Roll back if recent deploy |
| INP p75 > 300ms | Warning | Any | Check for long tasks |
| CLS p75 > 0.15 | Warning | Any | Check for layout shifts |
| TTFB p75 > 1.2s | Warning | Any | Check server response |
| JS bundle size > budget | Warning | Any | Investigate bundle growth |

### Synthetic Monitoring

| Route | Check Frequency | Metrics | Alert |
|-------|----------------|---------|-------|
| / | Every 5 min | LCP, CLS, INP, TTFB | LCP > 3s |
| /products/sample | Every 10 min | LCP, CLS, INP | LCP > 3s |
| /checkout | Every 10 min | LCP, CLS, INP | LCP > 3s |
| /dashboard | Every 10 min | LCP, CLS, INP | LCP > 3s |
```

## Explanation

Performance budgets work by setting limits before development and enforcing them in CI. The route-level breakdown acknowledges that different pages have different needs: a checkout page with a payment SDK will have more JS than a blog post. Setting a single global budget is too restrictive for complex apps.

Core Web Vitals targets come from Google's thresholds. LCP, INP, and CLS are the three metrics Google uses for search ranking. Meeting these targets ensures both good user experience and SEO benefits.

Third-party scripts are the most common source of budget overruns. Each third-party should have its own budget and be loaded only where needed. Stripe.js should only load on the checkout page, not globally. Analytics should load asynchronously to avoid blocking rendering.

CI enforcement prevents regressions before they reach production. The bundle size check runs on every PR and fails the build if any asset exceeds its budget. Lighthouse CI runs against the built site and checks Core Web Vitals thresholds. This catches both size regressions and performance regressions.

Production monitoring catches issues that CI can't. CI tests in a clean environment; production has real users on real devices with real network conditions. RUM data shows the p75 experience, which is what Google uses for ranking. Synthetic monitoring provides consistent baselines for comparison.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| SPA | Budget per route (lazy loaded) | Code splitting is critical |
| SSR / SSG | Budget per page template | Server rendering reduces JS needs |
| Mobile-first | Stricter budgets (50% of desktop) | Mobile networks are slower |
| E-commerce | Stricter LCP (< 2s) | Revenue impact of performance |
| Content site | Focus on image budgets | Images are the heaviest assets |
| Enterprise app | Allow larger bundles | Internal users, controlled network |

## What Works

1. Set budgets per route — a single global budget is too restrictive
2. Enforce in CI — catch regressions before production
3. Monitor in production — CI can't replicate real user conditions
4. Track third-party scripts separately — they're the most common overrun
5. Use gzip sizes — raw sizes are misleading
6. Review budgets quarterly — adjust as the app evolves
7. Make budgets visible — dashboards showing budget status for each route

## Common Mistakes

1. No enforcement — budgets without CI gates are aspirational, not real
2. Too generous — budgets that are never exceeded don't prevent regressions
3. Too strict — budgets that block every PR get bypassed or removed
4. Ignoring third-party scripts — they can account for 50%+ of page weight
5. Not monitoring production — CI passes but real users suffer
6. Using raw sizes instead of gzipped — 200 KB raw might be 60 KB gzipped
7. No route-level breakdown — a global 200 KB JS budget doesn't account for route-specific needs

## Frequently Asked Questions

### How do I determine the right budget for my app?

Measure current performance first. Set budgets 10-20% above current sizes to allow normal development. If current sizes are already too large, set budgets at current sizes and require any new code to offset by removing old code. Use Lighthouse and WebPageTest to measure.

### What if we can't meet the budget?

If you can't meet a budget, either the budget is unrealistic or the code needs optimization. Start by analyzing the bundle with `webpack-bundle-analyzer` or `source-map-explorer`. Look for large dependencies that could be replaced, tree-shaken, or lazy-loaded. If the budget is genuinely too low, raise it with justification.

### Should we use Lighthouse CI or bundle size checks?

Both. Bundle size checks catch asset growth (a new dependency adds 50 KB). Lighthouse CI catches performance regressions that size checks miss (a new animation blocks the main thread). They measure different things and complement each other.

### How do we handle third-party scripts that we can't control?

Load them asynchronously, defer them, or use a tag manager. Set budgets for their impact on page weight and timing. Monitor their performance in production. If a third-party script consistently exceeds its budget or causes performance issues, evaluate alternatives.

### What is the difference between RUM and synthetic monitoring?

RUM (Real User Monitoring) collects data from actual users visiting your site. It reflects real devices, networks, and usage patterns. Synthetic monitoring runs scripted tests from controlled environments. RUM shows the real experience; synthetic provides consistent baselines for comparison. Use both.
