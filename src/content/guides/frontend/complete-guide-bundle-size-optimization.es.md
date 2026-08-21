---
contentType: guides
slug: complete-guide-bundle-size-optimization
title: "Optimización de Bundle Size: Guía Práctica"
description: "Reducí el tamaño de bundles JavaScript con tree shaking, code splitting, imports dinámicos, análisis de dependencias y monitoreo para webpack, Vite y Rollup."
metaDescription: "Reducí el tamaño de bundles JavaScript con tree shaking, code splitting, imports dinámicos, análisis de dependencias y monitoreo para webpack, Vite y Rollup."
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
  metaDescription: "Reducí el tamaño de bundles JavaScript con tree shaking, code splitting, imports dinámicos, análisis de dependencias y monitoreo para webpack, Vite y Rollup."
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

## Resumen

Bundles de JavaScript grandes ralentizan la carga de la página, aumentan el Time to
Interactive y perjudican los Core Web Vitals. Esta guía cubre técnicas prácticas para
reducir el tamaño del bundle: medición, análisis, tree shaking, code splitting, imports
dinámicos, reemplazo de dependencias, compresión, manejo de polyfills y monitoreo para
webpack, Vite y Rollup.

## Cuándo Usar

- La carga inicial es lenta y Lighthouse reporta payloads grandes de JavaScript.
- Una auditoría de dependencias muestra librerías sobredimensionadas o duplicadas.
- Rutas o componentes fuera de pantalla pueden cargarse más tarde.
- Necesitás definir budgets de bundle en CI.

## Cuándo NO Usar

- El bundle ya es pequeño y el cuello de botella es la red o el tiempo de respuesta del
  servidor.
- Estás optimizando antes de medir — usá un profiler primero.
- El proyecto usa server-side rendering y el tamaño del HTML pesa más que el bundle JS.

## Análisis del Bundle Size

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

El tree shaking elimina exports no usados. Requiere ES modules y un build de producción.

```javascript
// Mal: importa todo lodash
import _ from "lodash";
const result = _.chunk([1, 2, 3, 4], 2);

// Bien: importá solo la función
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

### Splitting por ruta en React

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

### Splitting por componente

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

## Imports Dinámicos

```javascript
// Cargar módulo bajo demanda
const module = await import("./heavy-module.js");
module.doSomething();

// Prefetch al pasar el mouse
button.addEventListener("mouseenter", () => {
  import(/* webpackPrefetch: true */ "./Chart");
}, { once: true });

// Preload de chunk crítico en paralelo
import(/* webpackPreload: true */ "./CriticalChart");
```

## Reemplazo de Dependencias

Cambios comunes que reducen el tamaño del bundle:

|Desde|Hasta|Ahorro|
|-----|-----|------|
|moment.js (293KB)|date-fns (13KB) o dayjs (2KB)|grande|
|lodash|lodash-es o métodos nativos|grande|
|axios|fetch nativo|13KB|
|uuid|crypto.randomUUID()|7KB|

```javascript
// Reemplazá lodash por métodos nativos de array
const result = array
  .map((x) => x * 2)
  .filter((x) => x > 10)
  .reduce((sum, x) => sum + x, 0);

// Reemplazá uuid por crypto nativo
const id = crypto.randomUUID();

// Reemplazá axios por fetch
const res = await fetch("/api/users");
const data = await res.json();
```

Consultá tamaños en bundlephobia.com antes de instalar un paquete nuevo.

## Compresión

### Compresión en build

```javascript
// Vite con vite-plugin-compression2
import { compression } from "vite-plugin-compression2";

export default {
  plugins: [
    compression({ algorithm: "gzip", threshold: 10240 }),
    compression({ algorithm: "brotliCompress", threshold: 10240 }),
  ],
};
```

### Nginx con archivos precomprimidos

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

Serví brotli primero; gzip es el fallback para navegadores antiguos.

## Manejo de Polyfills

```javascript
// Mal: importar todos los polyfills
import "core-js/stable";

// Bien: importar solo lo necesario
import "core-js/stable/promise";
import "core-js/stable/array/flat";

// Mejor: dejar que Babel inyecte polyfills por uso
// babel.config.js
module.exports = {
  presets: [
    ["@babel/preset-env", { useBuiltIns: "usage", corejs: 3 }],
  ],
};
```

## Module Federation

Usá module federation para compartir dependencias entre micro-frontends en runtime.

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

## Monitoreo del Bundle

### Budgets de tamaño en webpack

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

### Chequeo de tamaño en CI con bundlesize

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

## Buenas Prácticas

- Medí primero con un bundle analyzer.
- Preferí APIs nativas sobre librerías cuando sea posible.
- Dividí por ruta, luego por componentes pesados.
- Revisá los diffs de snapshots antes de correr `vitest -u`.
- Definí budgets de bundle en CI y fallá builds que los superen.
- Comprimí assets con gzip y brotli.

## Errores Comunes

- **Adivinar el cuello de botella** — analizá antes de cambiar dependencias.
- **Importar librerías completas** — `import _ from "lodash"` trae todo el paquete.
- **Dividir en demasiados chunks** — cientos de chunks chicos perjudican el cache y el
  overhead HTTP.
- **Ignorar la compresión** — servir JS sin comprimir desperdicia ancho de banda.
- **Olvidar el scope de polyfills** — los polyfills globales hinchan navegadores modernos.
- **Sobre-ingeniería con module federation** — agrega complejidad para equipos pequeños.

## Preguntas Frecuentes

### ¿Qué es el tree shaking y cómo funciona?

El tree shaking elimina exports no usados de los ES modules. Necesita sintaxis
`import`/`export`, un build de producción y paquetes marcados como libres de side effects.
Webpack requiere `mode: "production"`; Vite y Rollup lo hacen por defecto.

### ¿En qué se diferencia el code splitting del tree shaking?

El tree shaking elimina código muerto. El code splitting divide el bundle en chunks más
pequeños que se cargan bajo demanda. Usá ambos: tree shake primero, luego dividí por ruta o
componente pesado.

### ¿Cuál es la diferencia entre prefetch y preload?

Prefetch carga un recurso durante el tiempo ocioso para uso futuro probable. Preload lo
carga inmediatamente en paralelo con la página actual. Usá `webpackPrefetch` para las
siguientes rutas y `webpackPreload` para assets críticos de la página actual.

### ¿Cómo sé qué dependencias están hinchando mi bundle?

Usá `webpack-bundle-analyzer`, `rollup-plugin-visualizer` o `source-map-explorer`. Consultá
los tamaños en bundlephobia.com antes de instalar. Ejecutá `npm ls` para detectar
dependencias duplicadas.

### ¿Debería usar gzip o brotli?

Usá ambos. Brotli comprime texto 15-25% mejor. Serví `.br` primero y `.gz` como fallback. La
mayoría de CDNs y hosts estáticos soportan brotli.

### ¿Cómo afectan module federation y micro-frontends al bundle size?

Module federation permite que varias apps compartan dependencias en runtime, reduciendo
 código duplicado. Agrega overhead de runtime para cargar entradas remotas. Usalo para
grandes equipos con despliegues independientes, no para apps pequeñas.
