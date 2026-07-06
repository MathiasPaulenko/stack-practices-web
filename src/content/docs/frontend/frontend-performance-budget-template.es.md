---
contentType: docs
slug: frontend-performance-budget-template
title: "Plantilla de Performance Budget Frontend"
description: "Una plantilla para definir budgets de JS, CSS, imágenes y fonts por ruta con estrategias de enforcement y thresholds de monitoreo."
metaDescription: "Usá esta plantilla de performance budget frontend para definir límites de JS, CSS, imágenes, fonts por ruta con enforcement y monitoreo."
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
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de performance budget frontend para definir límites de JS, CSS, imágenes, fonts por ruta con enforcement y monitoreo."
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

Un performance budget setea limits en el size y timing de resources que componen un web page. Sin budgets, page weight crece incrementalmente hasta que performance degrades. Esta plantilla define budgets por route, los trackea en CI y establece monitoring thresholds para production.

## When to Use

- Empezando un new web project
- Experimentando performance regressions
- Seteando up Core Web Vitals monitoring
- Estableciendo team performance standards
- Preparándote para performance-focused launches

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
| Total JS (gzipped) | 150 KB | 142 KB | ✅ | Incluye vendor bundle |
| Total CSS (gzipped) | 30 KB | 28 KB | ✅ | Tailwind + custom |
| Total images | 500 KB | 480 KB | ✅ | Hero + thumbnails |
| Total fonts | 100 KB | 80 KB | ✅ | 2 font families |
| HTML | 50 KB | 35 KB | ✅ | Server-rendered |
| Total page weight | 830 KB | 765 KB | ✅ | Sum de all resources |
| JS requests | 3 | 3 | ✅ | Vendor + app + lazy |
| CSS requests | 1 | 1 | ✅ | Single stylesheet |
| Image requests | 8 | 7 | ✅ | — |
| Font requests | 2 | 2 | ✅ | — |
| Total requests | 15 | 14 | ✅ | — |

### Product Page (`/products/:id`)

| Resource Type | Budget | Current | Status | Notes |
|---------------|--------|---------|--------|-------|
| Total JS (gzipped) | 180 KB | 165 KB | ✅ | Incluye product gallery |
| Total CSS (gzipped) | 35 KB | 32 KB | ✅ | — |
| Total images | 800 KB | 750 KB | ✅ | Product images |
| Total fonts | 100 KB | 80 KB | ✅ | Same que home |
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
| Total JS (gzipped) | 200 KB | 188 KB | ✅ | Incluye payment SDK |
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
| Total JS (gzipped) | 250 KB | 245 KB | ⚠️ | Chart library es heavy |
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
| Stripe.js | Payment | 50 KB | 48 KB | ✅ | Solo en checkout |
| Sentry | Error tracking | 25 KB | 22 KB | ✅ | Loaded async |
| Google Maps | Maps | 80 KB | 75 KB | ✅ | Solo en store locator |
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
| LCP p75 > 3s | Warning | Any | Investigá slow routes |
| LCP p75 > 4s | Critical | Any | Roll back si recent deploy |
| INP p75 > 300ms | Warning | Any | Checkeá por long tasks |
| CLS p75 > 0.15 | Warning | Any | Checkeá por layout shifts |
| TTFB p75 > 1.2s | Warning | Any | Checkeá server response |
| JS bundle size > budget | Warning | Any | Investigá bundle growth |

### Synthetic Monitoring

| Route | Check Frequency | Metrics | Alert |
|-------|----------------|---------|-------|
| / | Every 5 min | LCP, CLS, INP, TTFB | LCP > 3s |
| /products/sample | Every 10 min | LCP, CLS, INP | LCP > 3s |
| /checkout | Every 10 min | LCP, CLS, INP | LCP > 3s |
| /dashboard | Every 10 min | LCP, CLS, INP | LCP > 3s |
```

## Explanation

Performance budgets funcionan seteando limits antes de development y enforcéndolos en CI. El route-level breakdown acknowledge que different pages tienen different needs: un checkout page con un payment SDK va a tener más JS que un blog post. Setear un single global budget es too restrictive para complex apps.

Core Web Vitals targets vienen de Google's thresholds. LCP, INP y CLS son los three metrics que Google usa para search ranking. Meetear estos targets asegura both good user experience y SEO benefits.

Third-party scripts son la most common source de budget overruns. Cada third-party debería tener su own budget y ser loaded solo dónde needed. Stripe.js debería solo load en el checkout page, no globalmente. Analytics debería load asynchronously para avoid blocking rendering.

CI enforcement previene regressions antes de que lleguen a production. El bundle size check corre en every PR y fail el build si cualquier asset excede su budget. Lighthouse CI corre contra el built site y checkea Core Web Vitals thresholds. Esto catchea both size regressions y performance regressions.

Production monitoring catchea issues que CI no puede. CI testea en un clean environment; production tiene real users en real devices con real network conditions. RUM data muestra el p75 experience, que es lo que Google usa para ranking. Synthetic monitoring provee consistent baselines para comparison.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| SPA | Budget per route (lazy loaded) | Code splitting es critical |
| SSR / SSG | Budget per page template | Server rendering reduce JS needs |
| Mobile-first | Stricter budgets (50% de desktop) | Mobile networks son slower |
| E-commerce | Stricter LCP (< 2s) | Revenue impact de performance |
| Content site | Focus en image budgets | Images son los heaviest assets |
| Enterprise app | Allow larger bundles | Internal users, controlled network |

## What Works

1. Seteá budgets por route — un single global budget es too restrictive
2. Enforcé en CI — catcheá regressions antes de production
3. Monitoreá en production — CI no puede replicatear real user conditions
4. Trackeá third-party scripts separadamente — son la most common overrun
5. Usá gzip sizes — raw sizes son misleading
6. Revieweá budgets quarterly — adjustá a medida que el app evoluciona
7. Hacé budgets visible — dashboards mostrando budget status para cada route

## Common Mistakes

1. No enforcement — budgets sin CI gates son aspirational, no real
2. Too generous — budgets que nunca se exceden no previenen regressions
3. Too strict — budgets que blockean every PR se bypass o se remueven
4. Ignorar third-party scripts — pueden accountear 50%+ de page weight
5. No monitorear production — CI pasa pero real users suffren
6. Usar raw sizes en vez de gzipped — 200 KB raw puede ser 60 KB gzipped
7. No route-level breakdown — un global 200 KB JS budget no accounta para route-specific needs

## Frequently Asked Questions

### ¿Cómo determino el right budget para mi app?

Medí current performance first. Seteá budgets 10-20% above current sizes para allow normal development. Si current sizes ya son too large, seteá budgets en current sizes y require que cualquier new code offsetee removiendo old code. Usá Lighthouse y WebPageTest para medir.

### ¿Qué si no podemos meetear el budget?

Si no podés meetear un budget, o el budget es unrealistic o el code necesita optimization. Empezá analyzeando el bundle con `webpack-bundle-analyzer` o `source-map-explorer`. Lookeá por large dependencies que podrían ser replaced, tree-shaken o lazy-loaded. Si el budget es genuinely too low, raisealo con justification.

### ¿Deberíamos usar Lighthouse CI o bundle size checks?

Ambos. Bundle size checks catchean asset growth (una new dependency addea 50 KB). Lighthouse CI catchea performance regressions que size checks missean (una new animation blockea el main thread). Miden different things y se complementan.

### ¿Cómo handleamos third-party scripts que no podemos controlar?

Loadealos asynchronously, deferrelos o usá un tag manager. Seteá budgets para su impact en page weight y timing. Monitoreá su performance en production. Si un third-party script consistently excede su budget o causa performance issues, evaluá alternatives.

### ¿Cuál es la difference entre RUM y synthetic monitoring?

RUM (Real User Monitoring) collect data desde actual users visitando tu site. Reflect real devices, networks y usage patterns. Synthetic monitoring corre scripted tests desde controlled environments. RUM muestra el real experience; synthetic provee consistent baselines para comparison. Usá ambos.
