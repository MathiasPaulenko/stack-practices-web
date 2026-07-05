---
contentType: guides
slug: complete-guide-bundle-size-optimization
title: "Complete Guide to Bundle Size Optimization"
description: "Reduce JavaScript bundle size. Covers tree shaking, code splitting, dynamic imports, dependency analysis, module federation, lazy loading, compression, polyfill management, and bundle monitoring with practical webpack, Vite, and Rollup examples."
metaDescription: "Reduce JS bundle size. Covers tree shaking, code splitting, dynamic imports, dependency analysis, module federation, lazy loading, compression."
difficulty: advanced
topics:
  - frontend
  - performance
tags:
  - performance
  - frontend
  - guide
  - bundle-size
  - tree-shaking
  - code-splitting
  - dynamic-import
  - webpack
  - vite
relatedResources:
  - /guides/frontend/complete-guide-web-performance-core-web-vitals
  - /guides/frontend/complete-guide-react-19-features
  - /guides/frontend/complete-guide-css-grid-and-flexbox
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Reduce JS bundle size. Covers tree shaking, code splitting, dynamic imports, dependency analysis, module federation, lazy loading, compression."
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

## Introduction

Large JavaScript bundles slow down page load, increase TTI, and hurt Core Web Vitals. This guide covers tree shaking, code splitting, dynamic imports, dependency analysis, module federation, lazy loading, compression, and bundle monitoring with practical examples for webpack, Vite, and Rollup.

## Analyzing Bundle Size

### Webpack Bundle Analyzer

```bash
npm install -D webpack-bundle-analyzer
```

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

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

# After build
npx source-map-explorer dist/*.js
```

### Package Size Check

```bash
# Check package size before installing
npx bundlephobia <package-name>

# Check what's inside a package
npx package-size lodash lodash-es date-fns dayjs

# Import cost ESLint plugin
npm install -D eslint-plugin-import-cost
```

## Tree Shaking

Tree shaking removes unused exports from your bundle. It requires ES modules (ESM) and a bundler that supports it.

```javascript
// Bad: imports entire lodash (72KB gzipped)
import _ from "lodash";
const result = _.chunk([1, 2, 3, 4], 2);

// Good: imports only chunk (1KB gzipped)
import chunk from "lodash/chunk";
const result = chunk([1, 2, 3, 4], 2);

// Best: use lodash-es with tree shaking
import { chunk } from "lodash-es";
const result = chunk([1, 2, 3, 4], 2);

// Or use date-fns instead of moment.js (67KB vs 293KB)
import { format } from "date-fns";
const date = format(new Date(), "yyyy-MM-dd");
```

### Enabling Tree Shaking in Webpack

```javascript
// webpack.config.js
module.exports = {
  mode: "production",  // Required for tree shaking
  optimization: {
    usedExports: true,  // Mark unused exports
    sideEffects: true,  // Skip files with no side effects
  },
};

// package.json — mark your package as side-effect free
{
  "sideEffects": false  // All files are pure
}

// Or specify files with side effects
{
  "sideEffects": ["./src/polyfills.js", "*.css"]
}
```

### Enabling Tree Shaking in Vite

```javascript
// vite.config.js — Vite uses Rollup which tree-shakes by default
export default {
  build: {
    rollupOptions: {
      treeshake: true,  // Enabled by default
      output: {
        manualChunks: {
          // Split vendor chunks
          "react-vendor": ["react", "react-dom"],
          "ui-vendor": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
        },
      },
    },
  },
};
```

## Code Splitting

### Route-based Splitting

```tsx
// React — lazy load routes
import { lazy, Suspense } from "react";

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}
```

### Component-based Splitting

```tsx
// Lazy load heavy components
import { lazy, Suspense } from "react";

// Code-split a chart library (200KB+)
const Chart = lazy(() => import("./components/Chart"));

// Code-split a markdown editor (150KB+)
const MarkdownEditor = lazy(() => import("./components/MarkdownEditor"));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      
      {showChart && (
        <Suspense fallback={<div className="chart-skeleton" />}>
          <Chart data={chartData} />
        </Suspense>
      )}
    </div>
  );
}
```

### Webpack SplitChunks

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: "all",
      minSize: 20000,      // 20KB minimum
      maxSize: 244000,     // 244KB maximum per chunk
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      automaticNameDelimiter: "~",
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
          priority: 10,
        },
        common: {
          name: "common",
          minChunks: 2,
          chunks: "all",
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },
};
```

## Dynamic Imports

```javascript
// Dynamic import returns a promise
const module = await import("./heavy-module.js");
module.doSomething();

// Prefetch: load during idle time
const prefetchModule = () => import("./heavy-module.js");

// Prefetch on hover
button.addEventListener("mouseenter", prefetchModule, { once: true });

// Prefetch on link hover
document.querySelectorAll('a[href^="/dashboard"]').forEach((link) => {
  link.addEventListener("mouseenter", () => {
    import("./pages/Dashboard");
  }, { once: true });
});
```

```html
<!-- Webpack magic comments -->
<script>
// Prefetch: loaded during idle time
import(/* webpackPrefetch: true */ "./Chart");

// Preload: loaded in parallel with parent chunk
import(/* webpackPreload: true */ "./CriticalChart");

// Named chunk
import(/* webpackChunkName: "chart" */ "./Chart");

// Combine
import(
  /* webpackChunkName: "chart" */
  /* webpackPrefetch: true */
  "./Chart"
);
</script>
```

## Dependency Replacement

```text
Common replacements to reduce bundle size:

moment.js (293KB) → date-fns (13KB) or dayjs (2KB)
lodash (72KB) → lodash-es (tree-shakeable) or native methods
axios (13KB) → fetch (0KB, native)
rxjs (47KB) → smaller reactive libs or native observables
uuid (7KB) → crypto.randomUUID() (native, 0KB)

Check sizes at bundlephobia.com before installing.
Always prefer native browser APIs when available.
```

```javascript
// Replace lodash with native methods
// Bad
import { map, filter, reduce } from "lodash";

// Good — native array methods
const result = array
  .map((x) => x * 2)
  .filter((x) => x > 10)
  .reduce((sum, x) => sum + x, 0);

// Replace uuid with native crypto
// Bad
import { v4 as uuidv4 } from "uuid";
const id = uuidv4();

// Good — native crypto
const id = crypto.randomUUID();

// Replace axios with fetch
// Bad
import axios from "axios";
const { data } = await axios.get("/api/users");

// Good — native fetch
const res = await fetch("/api/users");
const data = await res.json();
```

## Compression

```javascript
// webpack — gzip and brotli compression
const CompressionPlugin = require("compression-webpack-plugin");
const BrotliPlugin = require("brotli-webpack-plugin");

module.exports = {
  plugins: [
    new CompressionPlugin({
      filename: "[path][base].gz",
      algorithm: "gzip",
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,  // Only compress files > 10KB
      minRatio: 0.8,
    }),
    new BrotliPlugin({
      asset: "[path].br",
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
  ],
};
```

```javascript
// Vite — compression plugin
import { compression } from "vite-plugin-compression2";

export default {
  plugins: [
    compression({
      algorithm: "gzip",
      threshold: 10240,
    }),
    compression({
      algorithm: "brotliCompress",
      threshold: 10240,
    }),
  ],
};
```

```nginx
# Nginx — serve pre-compressed files
server {
  gzip_static on;
  brotli_static on;
  
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

## Polyfill Management

```javascript
// Bad: importing all polyfills
import "core-js/stable";
import "regenerator-runtime/runtime";

// Good: targeted polyfills
import "core-js/stable/promise";
import "core-js/stable/array/flat";
import "core-js/stable/object/fromentries";

// Best: use .browserslistrc to auto-detect
// .browserslistrc
// > 0.5%
// last 2 versions
// not dead
// not ie 11

// babel.config.js
module.exports = {
  presets: [
    ["@babel/preset-env", {
      useBuiltIns: "usage",  // Only polyfill what's used
      corejs: 3,
    }],
  ],
};
```

## Module Federation

```javascript
// webpack.config.js — host app
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

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

// webpack.config.js — remote app
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: "remoteApp",
      filename: "remoteEntry.js",
      exposes: {
        "./Widget": "./src/Widget",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
    }),
  ],
};
```

```tsx
// Host app — lazy load remote component
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

```javascript
// CI/CD — size limits
// package.json
{
  "scripts": {
    "size-check": "bundlesize"
  },
  "bundlesize": [
    { "path": "dist/assets/*.js", "maxSize": "100KB" },
    { "path": "dist/assets/*.css", "maxSize": "20KB" },
    { "path": "dist/assets/vendor*.js", "maxSize": "150KB" }
  ]
}

// GitHub Actions — bundle size check
// .github/workflows/size-check.yml
// - name: Check bundle size
//   run: npm run size-check
```

```javascript
// Bundle budget in webpack
module.exports = {
  performance: {
    hints: "warning",  // or "error"
    maxAssetSize: 244000,       // 244KB
    maxEntrypointSize: 244000,  // 244KB
    assetFilter: (filename) => {
      return !filename.endsWith(".map");
    },
  },
};
```

## FAQ

### What is tree shaking and how does it work?

Tree shaking is dead code elimination for ES modules. The bundler analyzes your import/export graph and removes exported code that is never imported. It requires ES module syntax (`import`/`export`), not CommonJS (`require`). In webpack, enable `mode: "production"` and mark your package with `"sideEffects": false` in package.json. In Vite/Rollup, tree shaking is enabled by default. The key requirement is that your code uses ESM and does not have side effects (top-level mutations) that the bundler cannot detect.

### How is code splitting different from tree shaking?

Tree shaking removes unused code from the bundle entirely. Code splitting breaks the bundle into smaller chunks that are loaded on demand. Tree shaking reduces total code size. Code splitting reduces initial load size by deferring non-critical code to later. Use both: tree shake to remove dead code, then code split to load only what is needed for the initial page. Route-based splitting is the most impactful — each route gets its own chunk.

### What is the difference between prefetch and preload?

Prefetch downloads a resource during idle time for future use — the resource loads after the current page is done. Preload downloads a resource immediately in parallel with the current page — it has higher priority. Use prefetch for chunks the user will likely need next (next route, feature they might click). Use preload for critical resources needed for the current page (fonts, critical CSS, LCP image). In webpack, use `/* webpackPrefetch: true */` and `/* webpackPreload: true */` magic comments.

### How do I know which dependencies are bloating my bundle?

Use `webpack-bundle-analyzer` or `rollup-plugin-visualizer` to see a treemap of your bundle. Large blocks indicate large dependencies. Check package sizes on bundlephobia.com before installing. Use `npm ls` to find duplicate dependencies. Look for packages imported multiple times with different versions. Replace large libraries with smaller alternatives: moment.js with date-fns, lodash with native methods, axios with fetch. Audit your bundle regularly as dependencies grow.

### Should I use gzip or brotli compression?

Use both. Brotli compresses 15-25% better than gzip for text files (JS, CSS, HTML). All modern browsers support brotli. Generate both `.gz` and `.br` files during build. Configure your server to serve brotli first, gzip as fallback. Nginx: `brotli_static on; gzip_static on;`. CDN: most CDNs auto-compress on the fly. Only compress files above 10KB — smaller files can actually get larger with compression overhead.

### How do module federation and micro-frontends affect bundle size?

Module federation allows multiple applications to share JavaScript bundles at runtime. Each micro-frontend exposes its modules via a remote entry file. The host app loads remote modules on demand. Shared dependencies (like React) are loaded once and shared across all micro-frontends. This reduces duplicate code and allows teams to deploy independently. However, it adds runtime overhead for loading remote entries. Use it for large teams with independent deployments, not for small apps where a single bundle would be simpler.
