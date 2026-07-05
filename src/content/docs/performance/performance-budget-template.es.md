---
contentType: docs
slug: performance-budget-template
templateType: guideline
title: "Plantilla de Performance Budget"
description: "Plantilla para definir y enforcear web performance budgets: LCP, INP, CLS targets, resource budgets para JS, CSS, imagenes, fuentes, third-party scripts, CI/CD integration con Lighthouse CI y alerting thresholds con ejemplos para Next.js, Astro y SPA architectures."
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
  - /docs/devops/deployment-rollback-runbook
  - /docs/performance/core-web-vitals-audit-checklist
  - /docs/performance/load-test-plan-template
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

Esta plantilla define web performance budgets para un site o application. Cubre Core Web Vitals targets (LCP, INP, CLS), resource budgets (JavaScript, CSS, imagenes, fuentes, third-party scripts), CI/CD enforcement con Lighthouse CI y alerting thresholds. Usa esta plantilla cuando seteas up un new project o tighteneas performance governance en un existing one.

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

## Preguntas Frecuentes

### ¿Cómo seteo un realistic performance budget?

Empieza midiendo current performance con Lighthouse y real user monitoring (RUM). Collecta P75 metrics para cada page type por 7 days. Setea tu budget 10-20% below current P75 values — esto da un realistic improvement target sin ser unachievable. Si tu current LCP es 3.2s, setea el budget a 2.5s. Reviewea budgets quarterly — mientras optimizas, tightenealos. Si estas seteando budgets para un new project, usa industry benchmarks: 150 KB JS para content sites, 300 KB para SPAs, 2.5s LCP para all page types. Adjusta basado en tu user base — si most users estan en mobile o slow connections, setea tighter budgets.

### ¿Qué pasa cuando un PR excede el performance budget?

El CI pipeline deberia failear el PR con un clear message mostrando que metric o resource excedio el budget. El PR author debe either reducear el bundle size (code splitting, tree shaking, removeer unused dependencies) o get explicit approval del team lead para increasear el budget. Budget increases deberian ser rare y documented — updateea el budget config file con un comment explicando por que el increase fue necessary. Trackea budget increases over time — si budgets siguen growing, tienes un systemic problem que needea architectural changes, no budget adjustments.

### ¿Deberia medir performance en mobile o desktop?

Ambos, pero prioriza mobile. Google usa mobile-first indexing y Core Web Vitals desde mobile devices para search rankings. Setea up Lighthouse CI con both mobile y desktop presets. Mobile throttling (4x CPU slowdown, 1.6 Mbps throughput) simula un mid-range phone en un 3G/4G connection. Desktop testing (no throttling) catchea regressions que affectan fast connections. Si solo puedes testear uno, testea mobile — desktop performance es usualmente adequate si mobile pasa. Testea en real devices periodicamente — emulated throttling no captura all real-world conditions.

### ¿Cómo reduceo JavaScript bundle size?

Code split por route — solo loadea JS needed para el current page. Usa dynamic imports para heavy features (maps, editors, charts) que no se needean en initial load. Tree shakeea unused exports — verifica que tu bundler removeea dead code. Audita dependencies con `npm ls` y bundle visualizers (webpack-bundle-analyzer, rollup-plugin-visualizer). Reemplaza large libraries con smaller alternatives: moment.js → date-fns, lodash → native methods, axios → fetch. Lazy loadea below-the-fold components. Removee unused polyfills — modern browsers no needean most de ellos. Setea un hard limit y enforcealo en CI — developers encontraran ways para stay under it.

### ¿Qué tan seguido deberia reviewear y updatear performance budgets?

Reviewea budgets monthly durante el first quarter despues de setup, luego quarterly. Trackea budget utilization over time — si consistentemente usas menos de 70% de tu budget, considera tightenearlo. Si consistentemente hitteas el hard limit, investiga el root cause en vez de increasear el budget. Reviewea budgets cuando addeas major features, cambias architecture (e.g., addeando un SPA framework), o cuando user demographics shiftean. Compara tus budgets contra competitors usando tools como WebPageTest o CrUX data. Setea un calendar reminder para quarterly budget reviews e involucrea el full engineering team — performance es responsibility de todos.
