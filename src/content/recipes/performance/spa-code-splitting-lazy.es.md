---
contentType: recipes
slug: spa-code-splitting-lazy
title: "Rendimiento SPA: Code Splitting y Lazy Loading"
description: "Mejora tiempos de carga de single-page applications dividiendo bundles a nivel de ruta y componente, implementando lazy loading con React.lazy e imports dinamicos"
metaDescription: "Mejora rendimiento de SPAs con code splitting y lazy loading. Divide bundles a nivel de ruta y componente usando React.lazy e imports dinamicos para cargas mas rapidas."
difficulty: intermediate
topics:
  - frontend
  - performance
tags:
  - spa
  - react
  - performance
  - frontend
relatedResources:
  - /patterns/design/composite-pattern-ui
  - /patterns/design/bridge-pattern-ui-themes
  - /guides/performance-optimization-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Mejora rendimiento de SPAs con code splitting y lazy loading. Divide bundles a nivel de ruta y componente usando React.lazy e imports dinamicos para cargas mas rapidas."
  keywords:
    - code splitting
    - lazy loading
    - react lazy
    - spa performance
    - dynamic imports
---

# Rendimiento SPA: Code Splitting y Lazy Loading

Reduce el tamano del bundle inicial en [single-page applications](/recipes/performance/lazy-loading) dividiendo codigo a nivel de ruta y componente. Esta recipe demuestra React.lazy, imports dinamicos y estrategias de preload que mantienen time-to-interactive bajo sin sacrificar experiencia de usuario.

## Cuando Usar Esto

- Tu bundle de SPA excede 200KB gzip y carga lentamente en mobile
- No todas las rutas son accedidas por cada usuario en la primera visita
- Componentes pesados (graficos, editores, mapas) solo se necesitan en paginas especificas. Consulta [MVC Pattern Frontend](/patterns/design/mvc-pattern-frontend) para arquitectura de componentes.

## Solucion

### 1. Code Splitting a Nivel de Ruta

```typescript
// router.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 2. Lazy Loading a Nivel de Componente

```typescript
// components/HeavyChart.tsx
import { lazy, Suspense, useState } from 'react';

const Chart = lazy(() => import('./ChartLibrary'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Analytics</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <Chart data={getData()} />
        </Suspense>
      )}
    </div>
  );
}
```

### 3. Prefetch en Hover

```typescript
// utils/prefetch.ts
const lazyPages = {
  '/reports': () => import('./pages/Reports'),
  '/analytics': () => import('./pages/Analytics'),
};

export function prefetchRoute(path: string): void {
  const loader = lazyPages[path as keyof typeof lazyPages];
  if (loader) loader();
}

// Navigation.tsx
import { prefetchRoute } from './utils/prefetch';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <a
      href={to}
      onMouseEnter={() => prefetchRoute(to)}
    >
      {children}
    </a>
  );
}
```

### 4. Configuracion Vite para Chunking

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          forms: ['react-hook-form', 'zod'],
        },
      },
    },
  },
});
```

## Como Funciona

- `React.lazy` envuelve un import dinamico y renderiza un fallback mientras carga
- `Suspense` boundaries capturan estados de carga y muestran fallback UI
- Prefetching en hover inicia la carga antes de que el usuario haga click
- Manual chunks agrupan codigo vendor compartido en bundles cacheables

## Variacion: Intersection Observer para Contenido Below-Fold

```typescript
// hooks/useLazyLoad.ts
import { useEffect, useRef, useState } from 'react';

function useLazyLoad() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
```

## Consideraciones de Produccion

- Setea fallback UI apropiado para prevenir layout shifts mientras carga
- Monitorea [Core Web Vitals](/guides/performance/performance-optimization-guide) (LCP, INP, CLS) despues de hacer splitting
- Usa `preload` para rutas criticas accedidas por la mayoria de usuarios

## Errores Comunes

- Envolver cada componente en lazy, causando excessive network requests
- No manejar errores de carga con un `ErrorBoundary`
- Olvidar que rutas lazy-loaded aun necesitan que sus datos sean fetched

## FAQ

**P: Funciona con SSR?**
R: Si, pero usa `@loadable/component` en lugar de `React.lazy` para soporte de server-side rendering.

**P: Que tan pequeno deberia ser cada chunk?**
R: Apunta a 30-100KB gzip por chunk de ruta. Demasiados chunks pequenos afectan rendimiento por overhead de requests.
