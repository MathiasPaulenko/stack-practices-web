---
contentType: guides
slug: complete-guide-bundle-size-optimization
title: "Bundle Size Optimization: A Practical Frontend Guide"
description: "Reduce JavaScript bundle size with tree shaking, code splitting, dynamic imports, dependency analysis, and bundle monitoring for webpack, Vite, and Rollup."
metaDescription: "Reduce JavaScript bundle size with tree shaking, code splitting, dynamic imports, dependency analysis, and bundle monitoring for webpack, Vite, and Rollup."
difficulty: advanced
topics:
  - frontend
  - performance
tags:
  - performance
  - frontend
  - bundle-size
  - code-splitting
  - tree-shaking
  - javascript
  - webpack
  - vite
  - rollup
relatedResources:
  - /guides/complete-guide-web-performance-core-web-vitals
  - /guides/complete-guide-react-19-features
  - /guides/complete-guide-css-grid-and-flexbox
  - /recipes/javascript-debounce-throttle-implementation
  - /recipes/javascript-event-loop
  - /recipes/web-performance
lastUpdated: "2026-08-19"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Reduce JavaScript bundle size with tree shaking, code splitting, dynamic imports, dependency analysis, and bundle monitoring for webpack, Vite, and Rollup."
  keywords:
    - bundle size optimization
    - tree shaking
    - code splitting
    - dynamic import
    - webpack optimization
    - vite optimization
    - lazy loading
    - module federation
---

## Overview

Large JavaScript bundles slow down page load, increase Time to Interactive, and hurt Core
Web Vitals. This guide covers practical techniques to reduce bundle size: measuring,
analyzing, tree shaking, code splitting, dynamic imports, dependency replacement,
compression, polyfill management, and monitoring for webpack, Vite, and Rollup.

## When to Use

- Initial page load is slow and Lighthouse reports large JavaScript payloads.
- A dependency audit shows oversized or duplicate libraries.
- Routes or components below the fold can be deferred.
- You need to set bundle budgets in CI.

## When NOT to Use

- The bundle is already small and the bottleneck is network or server response time.
- You're optimizing before measuring — use a profiler first.
- The project uses server-side rendering where HTML size matters more than JS bundle size.

## Analyzing Bundle Size

### Webpack Bundle Analyzer

```bash
npm install -D webpack-bundle-analyzer
```

```javascript
// webpack.config.js
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
      openAnalyzer: false,
      reportFilename: "bundle-report.html",
    }),
  ],
};
```

### Vite Bundle Visualizer

```bash
npm install -D rollup-plugin-visualizer
```

```javascript
// vite.config.js
import { visualizer } from "rollup-plugin-visualizer";

export default {
  plugins: [
    visualizer({
      filename: "bundle-stats.html",
      gzipSize: true,
      brotliSize: true,
    }),
  ],
};
```

### Source Map Explorer

```bash
npm install -D source-map-explorer
npx source-map-explorer dist/*.js
```

## Tree Shaking

Tree shaking removes unused exports. It requires ES modules and a production build.

```javascript
// Bad: imports all of lodash
import _ from "lodash";
const result = _.chunk([1, 2, 3, 4], 2);

// Good: import only the function
import { chunk } from "lodash-es";
const result = chunk([1, 2, 3, 4], 2);
```

### Webpack

```javascript
// webpack.config.js
module.exports = {
  mode: "production",
  optimization: {
    usedExports: true,
    sideEffects: false,
  },
};
```

```json
// package.json
{
  "sideEffects": ["*.css", "./src/polyfills.js"]
}
```

### Vite

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      treeshake: true,
    },
  },
};
```

## Code Splitting

### Route-based splitting in React

```tsx
import { lazy, Suspense } from "react";

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Suspense>
  );
}
```

### Component-based splitting

```tsx
import { lazy, Suspense, useState } from "react";

const Chart = lazy(() => import("./components/Chart"));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show chart</button>
      {showChart && (
        <Suspense fallback={<div className="chart-skeleton" />}>
          <Chart data={chartData} />
        </Suspense>
      )}
    </div>
  );
}
```

### Webpack splitChunks

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: "all",
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
          priority: 10,
        },
      },
    },
  },
};
```

## Dynamic Imports

```javascript
// Load module on demand
const module = await import("./heavy-module.js");
module.doSomething();

// Prefetch on hover
button.addEventListener("mouseenter", () => {
  import(/* webpackPrefetch: true */ "./Chart");
}, { once: true });

// Preload critical chunk in parallel
import(/* webpackPreload: true */ "./CriticalChart");
```

## Dependency Replacement

Common swaps that reduce bundle size:

|From|To|Savings|
|----|--|-------|
|moment.js (293KB)|date-fns (13KB) or dayjs (2KB)|large|
|lodash|lodash-es or native methods|large|
|axios|native fetch|13KB|
|uuid|crypto.randomUUID()|7KB|

```javascript
// Replace lodash with native array methods
const result = array
  .map((x) => x * 2)
  .filter((x) => x > 10)
  .reduce((sum, x) => sum + x, 0);

// Replace uuid with native crypto
const id = crypto.randomUUID();

// Replace axios with fetch
const res = await fetch("/api/users");
const data = await res.json();
```

Check sizes at bundlephobia.com before installing a new package.

## Compression

### Build-time compression

```javascript
// Vite with vite-plugin-compression2
import { compression } from "vite-plugin-compression2";

export default {
  plugins: [
    compression({ algorithm: "gzip", threshold: 10240 }),
    compression({ algorithm: "brotliCompress", threshold: 10240 }),
  ],
};
```

### Nginx static pre-compressed files

```nginx
server {
  gzip_static on;
  brotli_static on;

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

Serve brotli first; gzip is the fallback for older browsers.

## Polyfill Management

```javascript
// Bad: import every polyfill
import "core-js/stable";

// Good: import only what you need
import "core-js/stable/promise";
import "core-js/stable/array/flat";

// Better: let Babel inject usage-based polyfills
// babel.config.js
module.exports = {
  presets: [
    ["@babel/preset-env", { useBuiltIns: "usage", corejs: 3 }],
  ],
};
```

## Module Federation

Use module federation to share dependencies across micro-frontends at runtime.

```javascript
// webpack.config.js — host
const { ModuleFederationPlugin } = require("webpack").container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: "host",
      remotes: {
        remoteApp: "remoteApp@https://cdn.example.com/remoteEntry.js",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^19.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
      },
    }),
  ],
};
```

```tsx
// Host app
import { lazy, Suspense } from "react";

const RemoteWidget = lazy(() => import("remoteApp/Widget"));

function App() {
  return (
    <Suspense fallback={<div>Loading widget...</div>}>
      <RemoteWidget />
    </Suspense>
  );
}
```

## Bundle Monitoring

### Size budgets in webpack

```javascript
// webpack.config.js
module.exports = {
  performance: {
    hints: "warning",
    maxAssetSize: 244000,
    maxEntrypointSize: 244000,
    assetFilter: (filename) => !filename.endsWith(".map"),
  },
};
```

### CI size check with bundlesize

```json
// package.json
{
  "scripts": {
    "size-check": "bundlesize"
  },
  "bundlesize": [
    { "path": "dist/assets/*.js", "maxSize": "100KB" },
    { "path": "dist/assets/*.css", "maxSize": "20KB" }
  ]
}
```

## Best Practices

- Measure first with a bundle analyzer.
- Prefer native APIs over libraries when possible.
- Split by route, then by heavy components.
- Review snapshot diffs before running `vitest -u`.
- Set bundle budgets in CI and fail builds that exceed them.
- Compress assets with both gzip and brotli.

## Common Mistakes

- **Guessing the bottleneck** — always analyze before changing dependencies.
- **Importing full libraries** — `import _ from "lodash"` brings the entire package.
- **Splitting too granularly** — hundreds of tiny chunks hurt caching and HTTP overhead.
- **Ignoring compression** — serving uncompressed JS wastes bandwidth.
- **Forgetting polyfill scope** — global polyfills bloat modern browsers.
- **Over-engineering module federation** — it adds complexity for small teams.

## FAQ

### What is tree shaking and how does it work?

Tree shaking removes unused exports from ES modules. It needs `import`/`export` syntax, a
production build, and packages marked as side-effect free. Webpack requires
`mode: "production"`; Vite and Rollup do it by default.

### How is code splitting different from tree shaking?

Tree shaking removes dead code. Code splitting breaks the bundle into smaller chunks loaded
on demand. Use both: tree shake first, then split by route or heavy component.

### What is the difference between prefetch and preload?

Prefetch loads a resource during idle time for likely future use. Preload loads it
immediately in parallel with the current page. Use `webpackPrefetch` for next routes and
`webpackPreload` for critical current-page assets.

### How do I know which dependencies are bloating my bundle?

Use `webpack-bundle-analyzer`, `rollup-plugin-visualizer`, or `source-map-explorer`. Check
sizes on bundlephobia.com before installing. Run `npm ls` to spot duplicate dependencies.

### Should I use gzip or brotli compression?

Use both. Brotli compresses text 15-25% better. Serve `.br` first and `.gz` as fallback.
Most CDNs and static hosts support brotli.

### How do module federation and micro-frontends affect bundle size?

Module federation lets several apps share dependencies at runtime, reducing duplicate code.
It adds runtime overhead for loading remote entries. Use it for large teams with
independent deployments, not small apps.
