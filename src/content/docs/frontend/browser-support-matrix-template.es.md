---
contentType: docs
slug: browser-support-matrix-template
title: "Plantilla de Matriz de Soporte de Navegadores"
description: "Una plantilla para trackear targets de soporte de navegadores, compatibilidad de features, requisitos de polyfills y estrategias de fallback."
metaDescription: "Usá esta plantilla de matriz de soporte de navegadores para trackear browsers soportados, compatibilidad de features, polyfills y fallbacks."
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
  - /docs/frontend/frontend-performance-budget-template
  - /docs/frontend/accessibility-audit-checklist
  - /docs/frontend/component-api-documentation-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de matriz de soporte de navegadores para trackear browsers soportados, compatibilidad de features, polyfills y fallbacks."
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

Un browser support matrix define qué browsers y versions tu application soporta, qué features están available en cada uno y qué polyfills o fallbacks se necesitan. Sin un matrix, teams hacen ad-hoc decisions que lead a inconsistent experiences y difficult debugging.

## When to Use

- Empezando un new web project
- Definiendo support requirements para un client project
- Evaluando si drop support para un older browser
- Planificando polyfill y transpilation strategy
- Communicando support decisions a stakeholders

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
| Edge | 110+ | 5.2% | Automated | Chromium-based, same que Chrome |
| Firefox | 115+ | 3.1% | Automated + manual | ESR + stable |
| Safari | 16+ | 4.3% | Manual + BrowserStack | macOS + iOS |

### Tier 2 — Best Effort Support

| Browser | Minimum Version | Global Usage | Testing | Notes |
|---------|----------------|-------------|---------|-------|
| Samsung Internet | 20+ | 2.6% | Manual | Android, Chromium-based |
| Opera | 95+ | 2.1% | Not tested | Chromium-based, assumed same que Chrome |
| Chrome (Android) | 110+ | 65.2% (mobile) | Manual | Mobile Chrome |

### Tier 3 — Not Supported

| Browser | Version | Global Usage | Notes |
|---------|---------|-------------|-------|
| Internet Explorer | All | 0.3% | EOL June 2022, no soportado |
| Safari < 16 | < 16 | 0.8% | Mostrá upgrade banner |
| Chrome < 110 | < 110 | 0.4% | Mostrá upgrade banner |
| Firefox < 115 | < 115 | 0.2% | Mostrá upgrade banner |

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
| webgpu-polyfill | Firefox, Safari | 8 KB | Dynamic import | WebGPU fallback a WebGL |

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
// Dynamic polyfill loading para Web Share API
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

// Feature detection para WebGPU
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
| View Transitions | No transition, instant page swap | No animation | Low — justo no uses |
| Scroll-driven animations | JS IntersectionObserver-based | Slightly different timing | Medium |
| Web Share API | Custom share dialog con copy link | Different UI, same function | Medium |
| File System Access | Download + upload flow | Different workflow | Medium |
| WebGPU | WebGL renderer | Lower performance para 3D | High |
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

Para browsers below el minimum supported version, mostrá un upgrade banner:

```html
<!-- Shown solo para unsupported browsers -->
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

Un browser support matrix sirve a three purposes: setea expectations para stakeholders, guide development decisions y define el testing strategy. El tiered approach (full support, best effort, not supported) acknowledge que no todos los browsers merecen el same investment.

Tier 1 browsers get full testing: automated E2E, visual regression y manual testing. Bugs en estos browsers blockean release. Tier 2 browsers get best-effort testing: son Chromium-based y assumed que funcionan como Chrome, pero get periodic smoke tests. Tier 3 browsers get un upgrade banner.

El feature compatibility matrix mapea cada feature a browser support. Features con gaps get polyfills o fallbacks. La key decision es: polyfill (add bundle size) o fallback (degraded experience). Polyfills son appropriate para small, critical features. Fallbacks son appropriate para large, non-critical features.

La polyfill strategy section documentea qué polyfills se necesitan, su size y cómo se load. Build-time polyfills (via Babel) se incluyen en el main bundle. Dynamic polyfills se load on demand via `import()`, reduciendo initial bundle size para users que no los necesitan.

El testing matrix define qué browsers se testean, cómo y qué tan seguido. CI testing coverea los most important browsers en every PR. BrowserStack coverea Safari y mobile browsers weekly. Esto catchea regressions antes de que users los reporten.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Enterprise app | Soportá older browsers (IE11 si required) | Puede necesitar heavier polyfills |
| Consumer app | Evergreen only, latest 2 versions | Minimal polyfills |
| Mobile web app | Focus en mobile browsers | Safari iOS, Chrome Android, Samsung |
| Government site | Strict accessibility + legacy support | Section 508 puede require older browser support |
| Internal tool | Chrome only | Minimal cross-browser testing |
| Global audience | Incluí regional browsers (UC, Opera Mini) | Checkeá regional usage stats |

## What Works

1. Usá Browserslist como el single source of truth — feedea Babel, Autoprefixer y ESLint
2. Testeá en real browsers — emulators y simulators missean rendering differences
3. Feature-detect, no browser-detect — `if ('share' in navigator)` no `if (isSafari)`
4. Loadé polyfills dynamically — no penalice modern browsers con polyfill bytes
5. Revieweá el matrix quarterly — browser usage shifts, new versions drop
6. Trackeá browser usage analytics — drop support cuando usage cae below threshold
7. Mostrá upgrade banners para unsupported browsers — no silently breakees

## Common Mistakes

1. Soportar too many browsers — cada browser addea testing y polyfill cost
2. No testear Safari — Safari tiene unique CSS y JS quirks a pesar de ser WebKit
3. Browser detection en vez de feature detection — fragile y breakea en new versions
4. No fallback strategy — features que silently failen son worse que degraded experiences
5. Ignorar mobile browsers — mobile usage often excede desktop
6. No analytics para inform decisions — soportar browsers que nadie usa wastean effort
7. No updatear el matrix — browser versions mueven fast, stale matrices dan false confidence

## Frequently Asked Questions

### ¿Cómo decidimos qué browsers soportar?

Empezá con analytics data desde tu existing site. Identificá browsers con > 0.5% usage. Checkeá caniuse.com para feature compatibility. Considerá tu audience: enterprise users pueden estar locked a older browsers. Seteá el baseline en los last 2 versions de cada major browser plus cualquier browser above tu usage threshold.

### ¿Deberíamos soportar Internet Explorer?

No. IE11 reached end of life en June 2022. Microsoft activamente redirects IE11 users a Edge. Soportar IE11 require heavy polyfills, limite tu CSS y JS feature set y increase testing burden. Mostrá un upgrade banner en vez.

### ¿Cómo handleamos Safari's slower feature adoption?

Safari adopt web features slower que Chrome y Firefox. Testeá en Safari early y often. Usá caniuse.com para checkear Safari support antes de usar un feature. Para features que Safari les falta, implementá un fallback o loadé un polyfill dinámicamente. No asumas "funciona en Chrome así que funciona everywhere."

### ¿Cuál es el cost de soportar un additional browser?

Cada additional browser addea: testing time (manual o automated), potential polyfill bundle size, debugging time para browser-specific bugs y CSS compatibility work. Estimá 5-10% de frontend development time per additional browser tier. Weigheá esto contra el user percentage que ese browser representa.

### ¿Qué tan seguido deberíamos reviewear el matrix?

Quarterly at minimum. Browser versions update every 4-6 weeks. Usage data shifts a medida que users upgrade. Revieweá el matrix, checkeá analytics para usage changes, verify caniuse data para new features y updateá el Browserslist configuration. Droppeá browsers que caen below el usage threshold.
