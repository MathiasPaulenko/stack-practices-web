---
contentType: recipes
slug: spa-code-splitting-lazy
title: "SPA Performance: Code Splitting and Lazy Loading"
description: "Improve single-page application load times by splitting bundles at route and component level, implementing lazy loading with React.lazy and live imports"
metaDescription: "Improve SPA performance with code splitting and lazy loading. Split bundles at route and component level using React.lazy and live imports for faster loads."
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
  metaDescription: "Improve SPA performance with code splitting and lazy loading. Split bundles at route and component level using React.lazy and live imports for faster loads."
  keywords:
    - code splitting
    - lazy loading
    - react lazy
    - spa performance
    - live imports
---

# SPA Performance: Code Splitting and Lazy Loading

Reduce initial bundle size in [single-page applications](/recipes/performance/lazy-loading) by splitting code at the route and component level. This recipe demonstrates React.lazy, live imports, and preload strategies that keep time-to-interactive low without sacrificing user experience.

## When to Use This

- Your SPA bundle exceeds 200KB gzipped and loads slowly on mobile
- Not all routes are accessed by every user on first visit
- Heavy components (charts, editors, maps) are only needed on specific pages. See [MVC Pattern Frontend](/patterns/design/mvc-pattern-frontend) for component architecture.

## Solution

### 1. Route-Level Code Splitting

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

### 2. Component-Level Lazy Loading

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

### 3. Prefetch on Hover

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

### 4. Vite Configuration for Chunking

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

## How It Works

- `React.lazy` wraps a live import and renders a fallback while loading
- `Suspense` boundaries catch loading states and show fallback UI
- Prefetching on hover starts loading before the user clicks
- Manual chunks group shared vendor code into cacheable bundles

## Variation: Intersection Observer for Below-Fold Content

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

## Production Considerations

- Set proper `fallback` UI to prevent layout shifts while loading
- Monitor [Core Web Vitals](/guides/performance/performance-optimization-guide) (LCP, INP, CLS) after splitting
- Use `preload` for critical routes accessed by most users

## Common Mistakes

- Wrapping every component in lazy, causing excessive network requests
- Not handling load errors with an `ErrorBoundary`
- Forgetting that lazy-loaded routes still need their data fetched

## FAQ

**Q: Does this work with SSR?**
A: Yes, but use `@loadable/component` instead of `React.lazy` for server-side rendering support.

**Q: How small should each chunk be?**
A: Aim for 30-100KB gzipped per route chunk. Too many tiny chunks hurt performance due to request overhead.
