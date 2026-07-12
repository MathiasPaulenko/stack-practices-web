---



contentType: docs
slug: performance-budget-template
templateType: guideline
title: "Performance Budget Template"
description: "Template for defining and enforcing web performance budgets: LCP, INP, CLS targets, resource budgets for JS, CSS, images, fonts, third-party scripts, CI/CD integration with Lighthouse CI, and alerting thresholds with examples for Next.js, Astro, and SPA architectures."
metaDescription: "Performance budget template: LCP, INP, CLS targets, JS/CSS/image budgets, third-party limits, Lighthouse CI integration, alerting thresholds, web vitals."
difficulty: intermediate
topics:
  - performance
  - frontend
tags:
  - performance-budget
  - web-vitals
  - lighthouse
  - core-web-vitals
  - ci-cd
  - monitoring
relatedResources:
  - /docs/deployment-rollback-runbook
  - /docs/core-web-vitals-audit-checklist
  - /docs/load-test-plan-template
  - /docs/database-query-tuning-checklist
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Performance budget template: LCP, INP, CLS targets, JS/CSS/image budgets, third-party limits, Lighthouse CI integration, alerting thresholds, web vitals."
  keywords:
    - performance budget
    - core web vitals
    - lighthouse ci
    - web performance
    - lcp inp cls
    - resource budget



---

## Overview

This template defines web performance budgets for a site or application. It covers Core Web Vitals targets (LCP, INP, CLS), resource budgets (JavaScript, CSS, images, fonts, third-party scripts), CI/CD enforcement with Lighthouse CI, and alerting thresholds. Use this template when setting up a new project or tightening performance governance on an existing one.

---

## 1. Core Web Vitals Targets

### 1.1 Budget Thresholds

```text
Metric | Good       | Needs Improvement | Poor    | Budget Target
───────┼────────────┼───────────────────┼─────────┼──────────────
LCP    | < 2.5s     | 2.5s - 4.0s       | > 4.0s  | < 2.5s (P75)
INP    | < 200ms    | 200ms - 500ms     | > 500ms | < 200ms (P75)
CLS    | < 0.1      | 0.1 - 0.25        | > 0.25  | < 0.1 (P75)
FCP    | < 1.8s     | 1.8s - 3.0s       | > 3.0s  | < 1.8s (P75)
TTFB   | < 800ms    | 800ms - 1.8s      | > 1.8s  | < 800ms (P75)
```

### 1.2 Page-Type Budgets

```text
Page type        | LCP    | INP    | CLS   | TTFB   | JS budget
─────────────────┼────────┼────────┼───────┼────────┼──────────
Homepage         | < 2.0s | < 150ms| < 0.05| < 600ms| 150 KB
Product page     | < 2.5s | < 200ms| < 0.1 | < 800ms| 200 KB
Search results   | < 2.0s | < 200ms| < 0.1 | < 600ms| 180 KB
Article page     | < 2.0s | < 150ms| < 0.05| < 600ms| 120 KB
Checkout         | < 2.5s | < 200ms| < 0.05| < 800ms| 250 KB
Dashboard (SPA)  | < 3.0s | < 300ms| < 0.1 | < 800ms| 350 KB
```

---

## 2. Resource Budgets

### 2.1 Asset Size Limits

```text
Resource type       | Budget    | Hard limit | Notes
────────────────────┼───────────┼────────────┼──────────────────────────
JavaScript (gzip)   | 150 KB    | 200 KB     | Initial load, per route
CSS (gzip)          | 30 KB     | 50 KB     | Critical + above-the-fold
Images (total)      | 500 KB    | 1 MB      | Above-the-fold images
Fonts               | 100 KB    | 150 KB    | WOFF2, max 2 families
Third-party JS      | 50 KB     | 100 KB    | Analytics, tags, widgets
Total page weight   | 1.2 MB    | 2 MB      | Initial load, no lazy content
```

### 2.2 Request Count Budgets

```text
Resource type       | Budget | Hard limit
────────────────────┼────────┼──────────
JS requests         | 5      | 10
CSS requests        | 2      | 4
Image requests      | 10     | 20
Font requests       | 2      | 4
Third-party requests| 5      | 10
Total requests      | 30     | 50
```

### 2.3 Budget Configuration File

```json
{
  "performanceBudget": {
    "pageType": "homepage",
    "metrics": {
      "lcp": { "target": 2000, "unit": "ms", "percentile": 75 },
      "inp": { "target": 150, "unit": "ms", "percentile": 75 },
      "cls": { "target": 0.05, "unit": "score", "percentile": 75 },
      "ttfb": { "target": 600, "unit": "ms", "percentile": 75 }
    },
    "resources": {
      "javascript": { "budget": 150, "hardLimit": 200, "unit": "KB", "gzip": true },
      "css": { "budget": 30, "hardLimit": 50, "unit": "KB", "gzip": true },
      "images": { "budget": 500, "hardLimit": 1000, "unit": "KB" },
      "fonts": { "budget": 100, "hardLimit": 150, "unit": "KB" },
      "thirdParty": { "budget": 50, "hardLimit": 100, "unit": "KB", "gzip": true },
      "totalWeight": { "budget": 1200, "hardLimit": 2000, "unit": "KB" }
    },
    "requests": {
      "js": { "budget": 5, "hardLimit": 10 },
      "css": { "budget": 2, "hardLimit": 4 },
      "images": { "budget": 10, "hardLimit": 20 },
      "fonts": { "budget": 2, "hardLimit": 4 },
      "thirdParty": { "budget": 5, "hardLimit": 10 },
      "total": { "budget": 30, "hardLimit": 50 }
    }
  }
}
```

---

## 3. Lighthouse CI Configuration

### 3.1 Lighthouse CI Config

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:4321/",
        "http://localhost:4321/products",
        "http://localhost:4321/blog/sample-article"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240,
          "cpuSlowdownMultiplier": 1
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interaction-to-next-paint": ["error", { "maxNumericValue": 200 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 1800 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 200 }],
        "resource-summary:script:size": ["error", { "maxNumericValue": 200000 }],
        "resource-summary:stylesheet:size": ["error", { "maxNumericValue": 50000 }],
        "resource-summary:image:size": ["warn", { "maxNumericValue": 1000000 }],
        "resource-summary:font:size": ["warn", { "maxNumericValue": 150000 }],
        "resource-summary:third-party:count": ["warn", { "maxNumericValue": 10 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### 3.2 GitHub Actions Integration

```yaml
name: Performance Budget Check
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build

      - name: Start preview server
        run: |
          npm run preview &
          sleep 5

      - name: Run Lighthouse CI
        run: npx @lhci/cli autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_TOKEN }}

      - name: Check bundle size
        run: |
          BUNDLE_SIZE=$(du -sh dist/assets/*.js | cut -f1)
          echo "Total JS bundle: $BUNDLE_SIZE"
          # Fail if over 200KB
          JS_SIZE=$(cat dist/assets/*.js | wc -c)
          if [ $JS_SIZE -gt 204800 ]; then
            echo "FAIL: JS bundle exceeds 200KB budget"
            exit 1
          fi
```

---

## 4. Bundle Size Enforcement

### 4.1 Size Limit Configuration

```json
{
  "name": "performance-budget",
  "path": "dist/assets/*",
  "limit": "200 KB",
  "gzip": true,
  "webpack": false,
  "running": false
}
```

### 4.2 Package.json Scripts

```json
{
  "scripts": {
    "check-size": "size-limit",
    "check-bundle": "bundlesize",
    "perf-budget": "node scripts/check-performance-budget.js"
  }
}
```

### 4.3 Custom Budget Checker

```javascript
const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const BUDGETS = {
  javascript: { budget: 150 * 1024, hardLimit: 200 * 1024 },
  css: { budget: 30 * 1024, hardLimit: 50 * 1024 },
  images: { budget: 500 * 1024, hardLimit: 1024 * 1024 },
  fonts: { budget: 100 * 1024, hardLimit: 150 * 1024 },
};

function checkBudget(distDir) {
  const files = fs.readdirSync(distDir, { recursive: true });
  const totals = { javascript: 0, css: 0, images: 0, fonts: 0 };
  let failed = false;

  for (const file of files) {
    const fullPath = path.join(distDir, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const ext = path.extname(file).toLowerCase();
    const content = fs.readFileSync(fullPath);
    const size = ext === '.js' || ext === '.css'
      ? gzipSync(content).length
      : content.length;

    if (ext === '.js') totals.javascript += size;
    else if (ext === '.css') totals.css += size;
    else if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext)) totals.images += size;
    else if (['.woff2', '.woff', '.ttf'].includes(ext)) totals.fonts += size;
  }

  for (const [type, total] of Object.entries(totals)) {
    const budget = BUDGETS[type];
    const kb = (total / 1024).toFixed(1);
    if (total > budget.hardLimit) {
      console.error(`FAIL: ${type} is ${kb} KB (hard limit: ${budget.hardLimit / 1024} KB)`);
      failed = true;
    } else if (total > budget.budget) {
      console.warn(`WARN: ${type} is ${kb} KB (budget: ${budget.budget / 1024} KB)`);
    } else {
      console.log(`OK: ${type} is ${kb} KB (budget: ${budget.budget / 1024} KB)`);
    }
  }

  if (failed) process.exit(1);
}

checkBudget('dist');
```

---

## 5. Third-Party Script Governance

### 5.1 Third-Party Inventory Template

```text
Script name        | Category  | Size (gzip) | Load timing | Required?
───────────────────┼───────────┼─────────────┼─────────────┼──────────
Google Analytics   | Analytics | 45 KB       | Async       | Yes
Google Tag Manager | Tags      | 35 KB       | Async       | Yes
Stripe.js          | Payment   | 80 KB       | On-demand   | Checkout only
Intercom           | Support   | 120 KB      | Lazy        | No — remove
Facebook Pixel     | Marketing | 60 KB       | Async       | No — remove
```

### 5.2 Third-Party Loading Strategy

```html
<!-- Analytics — load async, defer until after FCP -->
<script async defer src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXX"></script>

<!-- Stripe — load only on checkout page -->
<script>
  if (window.location.pathname.includes('/checkout')) {
    const s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.async = true;
    document.head.appendChild(s);
  }
</script>

<!-- Partytown — move third-party scripts to web worker -->
<script type="module">
  import { partytownSnippet } from '@builder.io/partytown/integration';
  const script = document.createElement('script');
  script.textContent = partytownSnippet();
  document.head.appendChild(script);
</script>
```

---

## 6. Monitoring and Alerting

### 6.1 Real User Monitoring (RUM) Setup

```javascript
// web-vitals library integration
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    delta: metric.delta,
    navigationType: metric.navigationType,
    page: window.location.pathname,
  });

  navigator.sendBeacon('/api/web-vitals', body);
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### 6.2 Alert Thresholds

```text
Alert                    | Condition                    | Severity
─────────────────────────┼──────────────────────────────┼──────────
LCP regression           | P75 LCP > 2.5s for 1 hour    | Critical
INP regression           | P75 INP > 200ms for 1 hour   | Critical
CLS regression           | P75 CLS > 0.1 for 1 hour     | High
JS bundle size exceeded  | Bundle > 200 KB on any route | High
Third-party script added | New third-party detected      | Medium
TTFB degradation         | P75 TTFB > 800ms for 30 min  | High
```

### 6.3 Dashboard Queries (Google Analytics 4)

```text
# LCP by page (P75)
Page path + query class, Event name: LCP, Percentile: 75th

# INP by page (P75)
Page path + query class, Event name: INP, Percentile: 75th

# CLS by page (P75)
Page path + query class, Event name: CLS, Percentile: 75th

# Alert: pages exceeding budget
Filter: LCP > 2500 OR INP > 200 OR CLS > 0.1
Group by: Page path
```

## FAQ

### How do I set a realistic performance budget?

Start by measuring current performance with Lighthouse and real user monitoring (RUM). Collect P75 metrics for each page type over 7 days. Set your budget 10-20% below current P75 values — this gives a realistic improvement target without being unachievable. If your current LCP is 3.2s, set the budget at 2.5s. Review budgets quarterly — as you optimize, tighten them. If you are setting budgets for a new project, use industry benchmarks: 150 KB JS for content sites, 300 KB for SPAs, 2.5s LCP for all page types. Adjust based on your user base — if most users are on mobile or slow connections, set tighter budgets.

### What happens when a PR exceeds the performance budget?

The CI pipeline should fail the PR with a clear message showing which metric or resource exceeded the budget. The PR author must either reduce the bundle size (code splitting, tree shaking, removing unused dependencies) or get explicit approval from the team lead to increase the budget. Budget increases should be rare and documented — update the budget config file with a comment explaining why the increase was necessary. Track budget increases over time — if budgets keep growing, you have a systemic problem that needs architectural changes, not budget adjustments.

### Should I measure performance on mobile or desktop?

Both, but prioritize mobile. Google uses mobile-first indexing and Core Web Vitals from mobile devices for search rankings. Set up Lighthouse CI with both mobile and desktop presets. Mobile throttling (4x CPU slowdown, 1.6 Mbps throughput) simulates a mid-range phone on a 3G/4G connection. Desktop testing (no throttling) catches regressions that affect fast connections. If you can only test one, test mobile — desktop performance is usually adequate if mobile passes. Test on real devices periodically — emulated throttling does not capture all real-world conditions.

### How do I reduce JavaScript bundle size?

Code split by route — only load JS needed for the current page. Use dynamic imports for heavy features (maps, editors, charts) that are not needed on initial load. Tree shake unused exports — verify your bundler removes dead code. Audit dependencies with `npm ls` and bundle visualizers (webpack-bundle-analyzer, rollup-plugin-visualizer). Replace large libraries with smaller alternatives: moment.js → date-fns, lodash → native methods, axios → fetch. Lazy load below-the-fold components. Remove unused polyfills — modern browsers do not need most of them. Set a hard limit and enforce it in CI — developers will find ways to stay under it.

### How often should I review and update performance budgets?

Review budgets monthly during the first quarter after setup, then quarterly. Track budget utilization over time — if you consistently use less than 70% of your budget, consider tightening it. If you consistently hit the hard limit, investigate the root cause rather than increasing the budget. Review budgets when adding major features, changing architecture (e.g., adding a SPA framework), or when user demographics shift. Compare your budgets against competitors using tools like WebPageTest or CrUX data. Set a calendar reminder for quarterly budget reviews and involve the full engineering team — performance is everyone's responsibility.

## See Also

- [Complete Guide to Web Performance and Core Web Vitals](/guides/complete-guide-web-performance-core-web-vitals/)
- [Core Web Vitals Audit Checklist](/docs/core-web-vitals-audit-checklist/)
- [Feature Flags: Progressive Release and Safe Experimentation](/guides/feature-flags-guide/)
- [Complete Guide to Bundle Size Optimization](/guides/complete-guide-bundle-size-optimization/)
- [Complete Guide to React 19 Features](/guides/complete-guide-react-19-features/)

