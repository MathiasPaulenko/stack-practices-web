---
contentType: guides
slug: complete-guide-bundle-size-optimization
title: "Optimización del tamaño del bundle: Guía práctica frontend"
description: "Guía práctica para medir y reducir el tamaño del bundle JavaScript con tree shaking, code splitting, reemplazo de dependencias, compresión y budgets en CI."
metaDescription: "Reducí el tamaño del bundle JavaScript con tree shaking, code splitting, dynamic imports, análisis de dependencias y monitoreo de bundles para webpack, Vite y Rollup."
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
lastUpdated: "2026-08-22"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Reducí el tamaño del bundle JavaScript con tree shaking, code splitting, dynamic imports, análisis de dependencias y monitoreo de bundles para webpack, Vite y Rollup."
  keywords:
    - optimizacion bundle size
    - tree shaking
    - code splitting
    - dynamic import
    - webpack optimization
    - vite optimization
    - lazy loading
    - module federation
---

Un bundle de JavaScript hinchado es una de las formas más rápidas de empeorar el Time to Interactive
y el puntaje de Core Web Vitals. La buena noticia es que generalmente podés achicarlo mucho midiendo
primero y luego combinando tree shaking, code splitting, reemplazo de dependencias, compresión y
budgets en CI. Esta guía cubre webpack, Vite y Rollup.

## Cuándo Usarla

- La carga inicial se siente lenta y Lighthouse marca payloads grandes de JavaScript.
- Una auditoría de dependencias revela librerías sobredimensionadas o duplicadas.
- Tenés rutas o componentes fuera del área visible que pueden cargar después.
- Querés aplicar budgets de bundle en CI para que las regresiones fallen el build.

## Cuándo NO Usarla

- El bundle ya es pequeño y el cuello de botella real es la red o el tiempo de respuesta del
    servidor.
- Estás optimizando antes de medir. Usá un profiler o analyzer primero.
- Server-side rendering es el camino principal y el tamaño del HTML pesa más que el bundle JS.

## Analizando el tamaño del bundle

Antes de cambiar nada, necesitás una imagen clara de qué hay dentro del bundle.

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

El tree shaking elimina exportaciones no usadas, pero solo funciona con ES modules y builds de
producción.

```javascript
// Mal: importa todo lodash
import _ from "lodash";
const result = _.chunk([1, 2, 3, 4], 2);

// Bien: importa solo la función
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

## Dynamic Imports

```javascript
// Cargar módulo bajo demanda
const module = await import("./heavy-module.js");
module.doSomething();

// Prefetch en hover
button.addEventListener("mouseenter", () => {
  import(/* webpackPrefetch: true */ "./Chart");
}, { once: true });

// Preload chunk crítico en paralelo
import(/* webpackPreload: true */ "./CriticalChart");
```

## Reemplazo de Dependencias

Reemplazos comunes que reducen el tamaño del bundle:

| De | A | Ahorro |
| --- | --- | --- |
| moment.js (293KB) | date-fns (13KB) o dayjs (2KB) | grande |
| lodash | lodash-es o métodos nativos | grande |
| axios | fetch nativo | 13KB |
| uuid | crypto.randomUUID() | 7KB |

```javascript
// Reemplazar lodash por métodos nativos de array
const result = array
  .map((x) => x * 2)
  .filter((x) => x > 10)
  .reduce((sum, x) => sum + x, 0);

// Reemplazar uuid por crypto nativo
const id = crypto.randomUUID();

// Reemplazar axios por fetch
const res = await fetch("/api/users");
const data = await res.json();
```

Consultá los tamaños en bundlephobia.com antes de instalar un nuevo paquete.

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

### Archivos precomprimidos en Nginx

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

// Bien: importar solo lo que necesitás
import "core-js/stable/promise";
import "core-js/stable/array/flat";

// Mejor: dejar que Babel inyecte polyfills según uso
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

- Medí primero con un bundle analyzer. Adivinar es perder tiempo.
- Preferí APIs nativas sobre librerías cuando el navegador ya soporta lo que necesitás.
- Dividí por ruta primero, luego por componentes pesados fuera del área visible.
- Revisá los diffs de dependencias antes de actualizar un paquete.
- Definí budgets de bundle en CI y fallá builds que los superen.
- Comprimí assets con gzip y brotli, y serví `.br` cuando sea posible.

## Errores Comunes

- **Adivinar el cuello de botella** — analizá antes de cambiar dependencias.
- **Importar librerías completas** — `import _ from "lodash"` trae todo el paquete.
- **Dividir en demasiados chunks** — cientos de chunks chicos perjudican el cache y agregan overhead
    HTTP.
- **Ignorar la compresión** — servir JS sin comprimir desperdicia ancho de banda.
- **Olvidar el alcance de los polyfills** — polyfills globales inflan navegadores modernos.
- **Sobre-ingeniería con module federation** — agrega complejidad que equipos pequeños rara vez
    necesitan.

## Preguntas Frecuentes

### ¿Qué es tree shaking y cómo funciona?

El tree shaking elimina exportaciones no usadas de los ES modules. Necesita sintaxis
`import`/`export`, un build de producción y paquetes marcados como libres de side effects. Webpack
requiere `mode: "production"`; Vite y Rollup lo hacen por defecto.

### ¿En qué se diferencia code splitting de tree shaking?

El tree shaking remueve código muerto. El code splitting divide el bundle en chunks más chicos que
se cargan bajo demanda. Usá ambos: tree shake primero, luego dividí por ruta o componente pesado.

### ¿Cuál es la diferencia entre prefetch y preload?

Prefetch carga un recurso durante el tiempo ocioso para uso futuro probable. Preload lo carga
inmediatamente en paralelo con la página actual. Usá `webpackPrefetch` para las siguientes rutas y
`webpackPreload` para assets críticos de la página actual.

### ¿Cómo sé qué dependencias están inflando mi bundle?

Usá `webpack-bundle-analyzer`, `rollup-plugin-visualizer` o `source-map-explorer`. Consultá tamaños
en bundlephobia.com antes de instalar. Ejecutá `npm ls` para detectar dependencias duplicadas.

### ¿Debería usar gzip o brotli?

Usá ambos. Brotli comprime texto un 15-25% mejor. Serví `.br` primero y `.gz` como fallback. La
mayoría de CDNs y hosts estáticos soportan brotli.

### ¿Cómo afectan module federation y los micro-frontends al tamaño del bundle?

Module federation permite que varias apps compartan dependencias en runtime, reduciendo código
duplicado. Agrega overhead de runtime para cargar entradas remotas. Usalo para equipos grandes con
despliegues independientes, no para apps pequeñas.
