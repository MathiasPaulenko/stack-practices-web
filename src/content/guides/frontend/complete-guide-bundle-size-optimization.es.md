---
contentType: guides
slug: complete-guide-bundle-size-optimization
title: "Guía Completa de Bundle Size Optimization"
description: "Reducir JavaScript bundle size. Cubre tree shaking, code splitting, dynamic imports, dependency analysis, module federation, lazy loading, compression, polyfill management y bundle monitoring con ejemplos practicos de webpack, Vite y Rollup."
metaDescription: "Reduce JS bundle size. Covers tree shaking, code splitting, dynamic imports, dependency analysis, module federation, lazy loading, compression."
difficulty: advanced
topics:
  - frontend
  - performance
tags:
  - performance
  - frontend
  - guia
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

## Introducción

Large JavaScript bundles slowean page load, increase TTI, y hurt Core Web Vitals. Esta guia cubre tree shaking, code splitting, dynamic imports, dependency analysis, module federation, lazy loading, compression, y bundle monitoring con practical examples para webpack, Vite, y Rollup.

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

# Despues de build
npx source-map-explorer dist/*.js
```

### Package Size Check

```bash
# Checkea package size antes de install
npx bundlephobia <package-name>

# Checkea que hay dentro de un package
npx package-size lodash lodash-es date-fns dayjs

# Import cost ESLint plugin
npm install -D eslint-plugin-import-cost
```

## Tree Shaking

Tree shaking removee unused exports de tu bundle. Requiere ES modules (ESM) y un bundler que lo soporte.

```javascript
// Bad: importa entire lodash (72KB gzipped)
import _ from "lodash";
const result = _.chunk([1, 2, 3, 4], 2);

// Good: importa solo chunk (1KB gzipped)
import chunk from "lodash/chunk";
const result = chunk([1, 2, 3, 4], 2);

// Best: usa lodash-es con tree shaking
import { chunk } from "lodash-es";
const result = chunk([1, 2, 3, 4], 2);

// O usa date-fns en vez de moment.js (67KB vs 293KB)
import { format } from "date-fns";
const date = format(new Date(), "yyyy-MM-dd");
```

### Enabling Tree Shaking en Webpack

```javascript
// webpack.config.js
module.exports = {
  mode: "production",  // Required para tree shaking
  optimization: {
    usedExports: true,  // Mark unused exports
    sideEffects: true,  // Skip files sin side effects
  },
};

// package.json — markea tu package como side-effect free
{
  "sideEffects": false  // Todos los files son pure
}

// O specifica files con side effects
{
  "sideEffects": ["./src/polyfills.js", "*.css"]
}
```

### Enabling Tree Shaking en Vite

```javascript
// vite.config.js — Vite usa Rollup que tree-shakea by default
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

// Code-split un chart library (200KB+)
const Chart = lazy(() => import("./components/Chart"));

// Code-split un markdown editor (150KB+)
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
// Dynamic import returnea un promise
const module = await import("./heavy-module.js");
module.doSomething();

// Prefetch: loadea durante idle time
const prefetchModule = () => import("./heavy-module.js");

// Prefetch en hover
button.addEventListener("mouseenter", prefetchModule, { once: true });

// Prefetch en link hover
document.querySelectorAll('a[href^="/dashboard"]').forEach((link) => {
  link.addEventListener("mouseenter", () => {
    import("./pages/Dashboard");
  }, { once: true });
});
```

```html
<!-- Webpack magic comments -->
<script>
// Prefetch: loadea durante idle time
import(/* webpackPrefetch: true */ "./Chart");

// Preload: loadea in parallel con parent chunk
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
Common replacements para reduce bundle size:

moment.js (293KB) → date-fns (13KB) o dayjs (2KB)
lodash (72KB) → lodash-es (tree-shakeable) o native methods
axios (13KB) → fetch (0KB, native)
rxjs (47KB) → smaller reactive libs o native observables
uuid (7KB) → crypto.randomUUID() (native, 0KB)

Checkea sizes en bundlephobia.com antes de install.
Siempre preferi native browser APIs cuando esten available.
```

```javascript
// Reemplaza lodash con native methods
// Bad
import { map, filter, reduce } from "lodash";

// Good — native array methods
const result = array
  .map((x) => x * 2)
  .filter((x) => x > 10)
  .reduce((sum, x) => sum + x, 0);

// Reemplaza uuid con native crypto
// Bad
import { v4 as uuidv4 } from "uuid";
const id = uuidv4();

// Good — native crypto
const id = crypto.randomUUID();

// Reemplaza axios con fetch
// Bad
import axios from "axios";
const { data } = await axios.get("/api/users");

// Good — native fetch
const res = await fetch("/api/users");
const data = await res.json();
```

## Compression

```javascript
// webpack — gzip y brotli compression
const CompressionPlugin = require("compression-webpack-plugin");
const BrotliPlugin = require("brotli-webpack-plugin");

module.exports = {
  plugins: [
    new CompressionPlugin({
      filename: "[path][base].gz",
      algorithm: "gzip",
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,  // Solo comprimir files > 10KB
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
// Bad: importando all polyfills
import "core-js/stable";
import "regenerator-runtime/runtime";

// Good: targeted polyfills
import "core-js/stable/promise";
import "core-js/stable/array/flat";
import "core-js/stable/object/fromentries";

// Best: usa .browserslistrc para auto-detect
// .browserslistrc
// > 0.5%
// last 2 versions
// not dead
// not ie 11

// babel.config.js
module.exports = {
  presets: [
    ["@babel/preset-env", {
      useBuiltIns: "usage",  // Solo polyfill lo que se usa
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
// Bundle budget en webpack
module.exports = {
  performance: {
    hints: "warning",  // o "error"
    maxAssetSize: 244000,       // 244KB
    maxEntrypointSize: 244000,  // 244KB
    assetFilter: (filename) => {
      return !filename.endsWith(".map");
    },
  },
};
```

## Preguntas Frecuentes

### ¿Qué es tree shaking y cómo funciona?

Tree shaking es dead code elimination para ES modules. El bundler analiza tu import/export graph y removee exported code que nunca es imported. Requiere ES module syntax (`import`/`export`), no CommonJS (`require`). En webpack, enablea `mode: "production"` y markea tu package con `"sideEffects": false` en package.json. En Vite/Rollup, tree shaking esta enabled by default. El key requirement es que tu code usa ESM y no tiene side effects (top-level mutations) que el bundler no pueda detectar.

### ¿Cómo diferiere code splitting de tree shaking?

Tree shaking removee unused code del bundle entirely. Code splitting breakea el bundle en smaller chunks que se loadean on demand. Tree shaking reduce total code size. Code splitting reduce initial load size defiriendo non-critical code para later. Usa ambos: tree shake para remove dead code, luego code split para loadear solo lo needed para el initial page. Route-based splitting es el mas impactful — cada route gets su own chunk.

### ¿Cuál es la diferencia entre prefetch y preload?

Prefetch descarga un resource durante idle time para future use — el resource loadea despues de que la current page este done. Preload descarga un resource immediately in parallel con la current page — tiene higher priority. Usa prefetch para chunks que el user probablemente necesite next (next route, feature que might clickear). Usa preload para critical resources needed para la current page (fonts, critical CSS, LCP image). En webpack, usa `/* webpackPrefetch: true */` y `/* webpackPreload: true */` magic comments.

### ¿Cómo se que dependencies estan bloatando mi bundle?

Usa `webpack-bundle-analyzer` o `rollup-plugin-visualizer` para ver un treemap de tu bundle. Large blocks indican large dependencies. Checkea package sizes en bundlephobia.com antes de install. Usa `npm ls` para findar duplicate dependencies. Busca packages imported multiple times con different versions. Reemplaza large libraries con smaller alternatives: moment.js con date-fns, lodash con native methods, axios con fetch. Auditea tu bundle regularmente a medida que dependencies grow.

### ¿Deberia usar gzip o brotli compression?

Usa ambos. Brotli comprime 15-25% better que gzip para text files (JS, CSS, HTML). Todos los modern browsers soportan brotli. Genera tanto `.gz` como `.br` files durante build. Configura tu server para servear brotli first, gzip como fallback. Nginx: `brotli_static on; gzip_static on;`. CDN: most CDNs auto-compressen on the fly. Solo comprimir files arriba de 10KB — smaller files pueden actually get larger con compression overhead.

### ¿Cómo affectan module federation y micro-frontends el bundle size?

Module federation permite que multiple applications shareean JavaScript bundles at runtime. Cada micro-frontend expone sus modules via un remote entry file. El host app loadea remote modules on demand. Shared dependencies (como React) se loadean once y se sharean across all micro-frontends. Esto reduce duplicate code y permite que teams deployeen independent. Sin embargo, add runtime overhead para loadear remote entries. Usalo para large teams con independent deployments, no para small apps donde un single bundle seria simpler.
