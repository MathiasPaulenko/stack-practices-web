---


contentType: docs
slug: browser-support-matrix-template
title: "Browser Support Matrix Template"
description: "A template for tracking browser support targets, feature compatibility, polyfill requirements, and fallback strategies across the browser matrix."
metaDescription: "Use this browser support matrix template to track supported browsers, feature compatibility, polyfill requirements, and fallback strategies."
difficulty: intermediate
topics:
  - testing
tags:
  - frontend
  - browser-support
  - compatibility
  - polyfills
  - template
  - cross-browser
  - caniuse
relatedResources:
  - /docs/frontend-performance-budget-template
  - /docs/accessibility-audit-checklist
  - /docs/component-api-documentation-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this browser support matrix template to track supported browsers, feature compatibility, polyfill requirements, and fallback strategies."
  keywords:
    - browser support
    - compatibility matrix
    - polyfills
    - cross-browser
    - fallback
    - caniuse
    - template


---

## Overview

A browser support matrix defines which browsers and versions your application supports, what features are available in each, and what polyfills or fallbacks are needed. Without a matrix, teams make ad-hoc decisions that lead to inconsistent experiences and difficult debugging.

## When to Use


- For alternatives, see [Component API Documentation Template](/docs/component-api-documentation-template/).

- Starting a new web project
- Defining support requirements for a client project
- Evaluating whether to drop support for an older browser
- Planning polyfill and transpilation strategy
- Communicating support decisions to stakeholders

## Solution

```markdown
# Browser Support Matrix — `<Project Name>`

## Matrix Overview

| Field | Value |
|-------|-------|
| Project | Example Web App |
| Last Updated | 2026-07-05 |
| Owner | Frontend Team |
| Support Strategy | Progressive enhancement |
| Baseline | Last 2 versions + > 0.5% global usage |
| IE11 Support | No |
| Transpilation Target | ES2020 |
| CSS Transpilation | PostCSS + Autoprefixer |

## 1. Supported Browsers

### Tier 1 — Full Support

| Browser | Minimum Version | Global Usage | Testing | Notes |
|---------|----------------|-------------|---------|-------|
| Chrome | 110+ | 65.2% | Automated + manual | Evergreen, auto-updates |
| Edge | 110+ | 5.2% | Automated | Chromium-based, same as Chrome |
| Firefox | 115+ | 3.1% | Automated + manual | ESR + stable |
| Safari | 16+ | 4.3% | Manual + BrowserStack | macOS + iOS |

### Tier 2 — Best Effort Support

| Browser | Minimum Version | Global Usage | Testing | Notes |
|---------|----------------|-------------|---------|-------|
| Samsung Internet | 20+ | 2.6% | Manual | Android, Chromium-based |
| Opera | 95+ | 2.1% | Not tested | Chromium-based, assumed same as Chrome |
| Chrome (Android) | 110+ | 65.2% (mobile) | Manual | Mobile Chrome |

### Tier 3 — Not Supported

| Browser | Version | Global Usage | Notes |
|---------|---------|-------------|-------|
| Internet Explorer | All | 0.3% | EOL June 2022, not supported |
| Safari < 16 | < 16 | 0.8% | Show upgrade banner |
| Chrome < 110 | < 110 | 0.4% | Show upgrade banner |
| Firefox < 115 | < 115 | 0.2% | Show upgrade banner |

## 2. Feature Compatibility Matrix

### JavaScript Features

| Feature | Chrome 110+ | Edge 110+ | Firefox 115+ | Safari 16+ | Samsung 20+ | Polyfill Needed | Fallback |
|---------|------------|-----------|-------------|-----------|------------|----------------|----------|
| ES2020 (optional chaining, nullish coalescing) | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| ES2021 (logical assignment, Promise.any) | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| ES2022 (top-level await, class fields) | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| ES2023 (array findLast, hashbang) | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| structuredClone | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Intl.Segmenter | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Import maps | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| CSS Modules (import attributes) | ⚠️ 123+ | ⚠️ 123+ | ❌ | ❌ | ⚠️ 123+ | Yes | Bundler handles |
| Web Components (custom elements, shadow DOM) | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| ResizeObserver | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| IntersectionObserver | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Web Workers | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Service Workers | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| WebAssembly | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| WebGPU | ⚠️ 113+ | ⚠️ 113+ | ❌ | ❌ | ⚠️ 113+ | Yes | WebGL fallback |

### CSS Features

| Feature | Chrome 110+ | Edge 110+ | Firefox 115+ | Safari 16+ | Samsung 20+ | Polyfill Needed | Fallback |
|---------|------------|-----------|-------------|-----------|------------|----------------|----------|
| CSS Grid | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Flexbox | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Custom Properties (CSS variables) | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Container Queries | ✅ | ✅ | ✅ | ✅ | ✅ | No | Media query fallback |
| :has() selector | ✅ 105+ | ✅ 105+ | ✅ 121+ | ✅ 15.4+ | ✅ | No | Class-based fallback |
| Cascade Layers (@layer) | ✅ | ✅ | ✅ | ✅ | ✅ | No | Specificity fallback |
| Color-mix() | ✅ 111+ | ✅ 111+ | ✅ 113+ | ✅ 16.2+ | ✅ | No | Pre-computed values |
| Nesting | ✅ 112+ | ✅ 112+ | ✅ 117+ | ✅ 16.5+ | ✅ | No | PostCSS nesting |
| Subgrid | ✅ 117+ | ✅ 117+ | ✅ 71+ | ✅ 16+ | ✅ | No | Regular grid fallback |
| View Transitions API | ✅ 111+ | ✅ 111+ | ❌ | ❌ | ✅ | Yes | No transition |
| Scroll-driven animations | ✅ 115+ | ✅ 115+ | ❌ | ❌ | ✅ | Yes | JS-based scroll |

### Web APIs

| Feature | Chrome 110+ | Edge 110+ | Firefox 115+ | Safari 16+ | Samsung 20+ | Polyfill Needed | Fallback |
|---------|------------|-----------|-------------|-----------|------------|----------------|----------|
| Fetch API | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Web Crypto API | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Web Storage (localStorage, sessionStorage) | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| IndexedDB | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Cache API | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Push API | ✅ | ✅ | ✅ | ⚠️ 16.4+ | ✅ | No | Polling fallback |
| Web Notifications | ✅ | ✅ | ✅ | ⚠️ 16.4+ | ✅ | No | In-app notifications |
| Geolocation | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Web Share API | ✅ | ✅ | ❌ | ✅ | ✅ | Yes | Custom share dialog |
| File System Access API | ✅ | ✅ | ❌ | ❌ | ✅ | Yes | Download/upload fallback |
| Web Authentication (WebAuthn) | ✅ | ✅ | ✅ | ✅ | ✅ | No | — |
| Payment Request API | ✅ | ✅ | ❌ | ✅ | ✅ | Yes | Traditional checkout |

## 3. Polyfill Strategy

### Required Polyfills

| Polyfill | Target Browsers | Bundle Size (gzipped) | Load Strategy | Reason |
|----------|----------------|----------------------|---------------|--------|
| core-js (ES features) | All | 12 KB | Build-time | ES feature transpilation |
| regenerator-runtime | All | 3 KB | Build-time | Async/await transpilation |
| web-share-polyfill | Firefox | 2 KB | Dynamic import | Web Share API |
| webgpu-polyfill | Firefox, Safari | 8 KB | Dynamic import | WebGPU fallback to WebGL |

### Polyfill Loading Configuration

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        chrome: '110',
        edge: '110',
        firefox: '115',
        safari: '16',
        samsung: '20',
      },
      useBuiltIns: 'usage',
      corejs: 3,
    }],
  ],
};
```

```javascript
// PostCSS configuration
module.exports = {
  plugins: [
    require('autoprefixer')({
      overrideBrowserslist: [
        'Chrome >= 110',
        'Edge >= 110',
        'Firefox >= 115',
        'Safari >= 16',
        'Samsung >= 20',
      ],
    }),
    require('postcss-nesting'),
  ],
};
```

### Conditional Polyfill Loading

```javascript
// Dynamic polyfill loading for Web Share API
async function share(data) {
  if (navigator.share) {
    try {
      await navigator.share(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  } else {
    const { sharePolyfill } = await import('./polyfills/web-share.js');
    sharePolyfill(data);
  }
}

// Feature detection for WebGPU
async function getRenderingContext(canvas) {
  if (await navigator.gpu?.requestAdapter()) {
    const context = canvas.getContext('webgpu');
    return { type: 'webgpu', context };
  }
  const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  return { type: 'webgl', context };
}
```

## 4. Fallback Strategies

| Feature | Fallback Strategy | User Impact | Implementation Effort |
|---------|------------------|-------------|----------------------|
| View Transitions | No transition, instant page swap | No animation | Low — just don't use |
| Scroll-driven animations | JS IntersectionObserver-based | Slightly different timing | Medium |
| Web Share API | Custom share dialog with copy link | Different UI, same function | Medium |
| File System Access | Download + upload flow | Different workflow | Medium |
| WebGPU | WebGL renderer | Lower performance for 3D | High |
| Payment Request API | Traditional checkout form | More steps, same function | Low |
| Push API (Safari < 16.4) | Polling for updates | Battery impact, less real-time | Medium |

## 5. Testing Matrix

| Browser | Version | OS | Testing Method | Frequency | Coverage |
|---------|---------|-----|---------------|-----------|----------|
| Chrome | Latest | Windows | Playwright CI | Every PR | E2E + visual |
| Chrome | Latest | macOS | Playwright CI | Every PR | E2E + visual |
| Chrome | Latest | Android | BrowserStack | Weekly | Smoke test |
| Edge | Latest | Windows | Playwright CI | Every PR | E2E |
| Firefox | Latest | Windows | Playwright CI | Every PR | E2E |
| Firefox | Latest | macOS | Manual | Bi-weekly | Smoke test |
| Firefox | ESR | Windows | Manual | Monthly | Smoke test |
| Safari | Latest | macOS | BrowserStack | Weekly | E2E + visual |
| Safari | Latest | iOS | BrowserStack | Weekly | Smoke test |
| Safari | 16.0 | iOS | BrowserStack | Monthly | Smoke test |
| Samsung Internet | Latest | Android | BrowserStack | Monthly | Smoke test |

## 6. Build Configuration

### Browserslist Configuration

```text
# .browserslistrc
[production]
Chrome >= 110
Edge >= 110
Firefox >= 115
Safari >= 16
Samsung >= 20

[development]
last 2 Chrome versions
last 2 Firefox versions
last 2 Safari versions
```

### Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  build: {
    target: 'es2020',
    css: {
      postcss: {
        plugins: [autoprefixer()],
      },
    },
  },
  legacy: {
    targets: ['Chrome >= 110', 'Firefox >= 115', 'Safari >= 16'],
    additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
  },
});
```

## 7. Upgrade Banner

For browsers below the minimum supported version, show an upgrade banner:

```html
<!-- Shown only for unsupported browsers -->
<noscript>
  <div class="upgrade-banner">
    <p>Please update your browser to use this application.</p>
  </div>
</noscript>

<script>
  function isSupported() {
    const ua = navigator.userAgent;
    const versions = {
      chrome: /Chrome\/(\d+)/,
      firefox: /Firefox\/(\d+)/,
      safari: /Version\/(\d+).*Safari/,
      edge: /Edg\/(\d+)/,
    };

    const minVersions = { chrome: 110, firefox: 115, safari: 16, edge: 110 };

    for (const [browser, regex] of Object.entries(versions)) {
      const match = ua.match(regex);
      if (match && parseInt(match[1]) < minVersions[browser]) {
        return false;
      }
    }
    return true;
  }

  if (!isSupported()) {
    document.getElementById('upgrade-banner').style.display = 'block';
  }
</script>
```
```

## Explanation

A browser support matrix serves three purposes: it sets expectations for stakeholders, guides development decisions, and defines the testing strategy. The tiered approach (full support, best effort, not supported) acknowledges that not all browsers deserve the same investment.

Tier 1 browsers get full testing: automated E2E, visual regression, and manual testing. Bugs in these browsers block release. Tier 2 browsers get best-effort testing: they're Chromium-based and assumed to work like Chrome, but get periodic smoke tests. Tier 3 browsers get an upgrade banner.

The feature compatibility matrix maps each feature to browser support. Features with gaps get polyfills or fallbacks. The key decision is: polyfill (add bundle size) or fallback (degraded experience). Polyfills are appropriate for small, critical features. Fallbacks are appropriate for large, non-critical features.

The polyfill strategy section documents which polyfills are needed, their size, and how they're loaded. Build-time polyfills (via Babel) are included in the main bundle. Dynamic polyfills are loaded on demand via `import()`, reducing initial bundle size for users who don't need them.

The testing matrix defines which browsers are tested, how, and how often. CI testing covers the most important browsers on every PR. BrowserStack covers Safari and mobile browsers weekly. This catches regressions before users report them.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Enterprise app | Support older browsers (IE11 if required) | May need heavier polyfills |
| Consumer app | Evergreen only, latest 2 versions | Minimal polyfills |
| Mobile web app | Focus on mobile browsers | Safari iOS, Chrome Android, Samsung |
| Government site | Strict accessibility + legacy support | Section 508 may require older browser support |
| Internal tool | Chrome only | Minimal cross-browser testing |
| Global audience | Include regional browsers (UC, Opera Mini) | Check regional usage stats |

## What Works

1. Use Browserslist as the single source of truth — it feeds Babel, Autoprefixer, and ESLint
2. Test on real browsers — emulators and simulators miss rendering differences
3. Feature-detect, don't browser-detect — `if ('share' in navigator)` not `if (isSafari)`
4. Load polyfills dynamically — don't penalize modern browsers with polyfill bytes
5. Review the matrix quarterly — browser usage shifts, new versions drop
6. Track browser usage analytics — drop support when usage falls below threshold
7. Show upgrade banners for unsupported browsers — don't silently break

## Common Mistakes

1. Supporting too many browsers — every browser adds testing and polyfill cost
2. Not testing Safari — Safari has unique CSS and JS quirks despite being WebKit
3. Browser detection instead of feature detection — fragile and breaks on new versions
4. No fallback strategy — features that silently fail are worse than degraded experiences
5. Ignoring mobile browsers — mobile usage often exceeds desktop
6. No analytics to inform decisions — supporting browsers nobody uses wastes effort
7. Not updating the matrix — browser versions move fast, stale matrices give false confidence

## Frequently Asked Questions

### How do we decide which browsers to support?

Start with analytics data from your existing site. Identify browsers with > 0.5% usage. Check caniuse.com for feature compatibility. Consider your audience: enterprise users may be locked to older browsers. Set the baseline at the last 2 versions of each major browser plus any browser above your usage threshold.

### Should we support Internet Explorer?

No. IE11 reached end of life in June 2022. Microsoft actively redirects IE11 users to Edge. Supporting IE11 requires heavy polyfills, limits your CSS and JS feature set, and increases testing burden. Show an upgrade banner instead.

### How do we handle Safari's slower feature adoption?

Safari adopts web features slower than Chrome and Firefox. Test on Safari early and often. Use caniuse.com to check Safari support before using a feature. For features Safari lacks, implement a fallback or load a polyfill dynamically. Don't assume "it works in Chrome so it works everywhere."

### What is the cost of supporting an additional browser?

Each additional browser adds: testing time (manual or automated), potential polyfill bundle size, debugging time for browser-specific bugs, and CSS compatibility work. Estimate 5-10% of frontend development time per additional browser tier. Weigh this against the user percentage that browser represents.

### How often should we review the matrix?

Quarterly at minimum. Browser versions update every 4-6 weeks. Usage data shifts as users upgrade. Review the matrix, check analytics for usage changes, verify caniuse data for new features, and update the Browserslist configuration. Drop browsers that fall below the usage threshold.
