---

contentType: patterns
slug: suspense-boundary-pattern
title: "Patrón Suspense Boundary"
description: "Cómo usar React Suspense boundaries para declarative loading states. Cubre data fetching, streaming SSR, nested boundaries, y error boundaries."
metaDescription: "Usa React Suspense boundaries para declarative loading states. Aprende data fetching, streaming SSR, nested boundaries, fallbacks, y error integration."
difficulty: advanced
topics:
  - frontend
tags:
  - frontend
  - react
  - suspense
  - loading-states
  - ssr
  - pattern
category: architectural
relatedResources:
  - /patterns/container-presenter-pattern
  - /patterns/optimistic-update-pattern
  - /patterns/islands-architecture-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa React Suspense boundaries para declarative loading states. Aprende data fetching, streaming SSR, nested boundaries, fallbacks, y error integration."
  keywords:
    - frontend
    - react
    - suspense
    - loading-states
    - ssr
    - pattern

---

## Overview

React Suspense te deja declaratively specificar loading states sin escribir conditional rendering logic. Wrappeá un component en un `<Suspense>` boundary con un `fallback` prop, y React muestra el fallback mientras el data del component está loading. Esto elimina el `if (loading) return <Spinner />` pattern scattered throughout components. Suspense funciona con lazy-loaded components, data fetching libraries (React Query, SWR, Relay), y server-side streaming. Combinado con error boundaries, provee un complete declarative approach a async UI states.

## When to Use

- Code-splitting con `React.lazy()` para route-level o component-level splitting
- Data fetching con Suspense-enabled libraries (React Query v5, Relay, SWR)
- Streaming SSR con selective hydration — send HTML a medida que data becomes available
- Nested loading states donde diferentes parts de la page load independientemente
- Eliminar manual loading state management across muchos components

## When NOT to Use

- Aplicaciones simples sin code-splitting o data fetching
- Cuando necesitás fine-grained control sobre loading transitions — Suspense es all-or-nothing per boundary
- React versions legacy (< 18) sin concurrent features
- Cases donde loading states deben showear partial data (Suspense muestra fallback, no partial content)

## Solution

### Basic Suspense con lazy loading

```jsx
// App.jsx — lazy load un heavy component
import React, { Suspense, lazy } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));
const AdminPanel = lazy(() => import('./AdminPanel'));

function App() {
  return (
    <div>
      <Header />

      <Suspense fallback={<div className="loading">Loading chart...</div>}>
        <HeavyChart data={chartData} />
      </Suspense>

      <Suspense fallback={<div className="loading">Loading admin panel...</div>}>
        <AdminPanel />
      </Suspense>
    </div>
  );
}
```

### Suspense con data fetching

```jsx
// useSuspenseFetch.js — data fetching hook que integra con Suspense
import { use, useState, useEffect } from 'react';

function fetchUser(userId) {
  return fetch(`/api/users/${userId}`).then(res => res.json());
}

// React 19: use() hook suspende hasta que promise resolve
function UserProfile({ userId }) {
  const user = use(fetchUser(userId));

  return (
    <div className="profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// Parent wrappea en Suspense
function App() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfile userId={42} />
    </Suspense>
  );
}
```

### React Query con Suspense

```jsx
// useUser.js — React Query v5 con suspense
import { useSuspenseQuery } from '@tanstack/react-query';

function useUser(userId) {
  return useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
  });
}

// UserCard.jsx — no necesita loading state
function UserCard({ userId }) {
  const { data: user } = useUser(userId);

  return (
    <div className="user-card">
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.role}</p>
    </div>
  );
}

// Dashboard.jsx — Suspense boundary en el top
function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <div className="dashboard">
        <UserCard userId={42} />
        <UserStats userId={42} />
        <UserActivity userId={42} />
      </div>
    </Suspense>
  );
}
```

### Nested Suspense boundaries

```jsx
// NestedBoundaries.jsx — granular loading states
function Page() {
  return (
    <div className="page">
      <Header />

      {/* Main content loads primero */}
      <Suspense fallback={<MainSkeleton />}>
        <MainContent />
      </Suspense>

      {/* Sidebar loads independientemente */}
      <aside>
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
      </aside>

      {/* Comments loads último — no bloquean la page */}
      <section className="comments">
        <Suspense fallback={<div>Loading comments...</div>}>
          <Comments postId={1} />
        </Suspense>
      </section>
    </div>
  );
}
```

### Suspense con error boundaries

```jsx
// ErrorBoundary.jsx — catchear errors desde suspended components
import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-boundary">
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Usage — wrappeá Suspense en ErrorBoundary
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<LoadingSpinner />}>
        <AsyncComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Streaming SSR con Suspense

```jsx
// server.js — streaming SSR con selective hydration
import { renderToPipeableStream } from 'react-dom/server';
import App from './App';

function handler(req, res) {
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapModules: ['/client.js'],
    onShellReady() {
      res.setHeader('content-type', 'text/html');
      pipe(res);
    },
    onError(error) {
      console.error('SSR error:', error);
    },
  });
}

// App.jsx — Suspense boundaries en el server
function App() {
  return (
    <html>
      <body>
        <div id="root">
          <Header />

          {/* Critical content renderiza inmediatamente */}
          <Suspense fallback={<ProductSkeleton />}>
            <Product productId={1} />
          </Suspense>

          {/* Non-critical content streams después */}
          <Suspense fallback={<ReviewsSkeleton />}>
            <Reviews productId={1} />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
```

### Suspense list para coordinated loading

```jsx
// SuspenseList.jsx — coordinar múltiples Suspense boundaries
import { Suspense, SuspenseList } from 'react';

function Article({ id }) {
  const article = use(fetchArticle(id));
  return <article>{article.content}</article>;
}

function Comments({ id }) {
  const comments = use(fetchComments(id));
  return <ul>{comments.map(c => <li key={c.id}>{c.text}</li>)}</ul>;
}

function RelatedArticles({ id }) {
  const related = use(fetchRelated(id));
  return <div>{related.map(a => <ArticleCard key={a.id} {...a} />)}</div>;
}

function ArticlePage({ articleId }) {
  return (
    <SuspenseList revealOrder="forwards" tail="collapsed">
      <Suspense fallback={<ArticleSkeleton />}>
        <Article id={articleId} />
      </Suspense>

      <Suspense fallback={<CommentsSkeleton />}>
        <Comments id={articleId} />
      </Suspense>

      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedArticles id={articleId} />
      </Suspense>
    </SuspenseList>
  );
}
```

### Use transition con Suspense

```jsx
// TransitionWithSuspense.jsx — useTransition para smooth state changes
import { useTransition, Suspense } from 'react';

function TabContainer() {
  const [tab, setTab] = useState('overview');
  const [isPending, startTransition] = useTransition();

  const handleTabChange = (newTab) => {
    startTransition(() => {
      setTab(newTab);
    });
  };

  return (
    <div className="tabs">
      <nav>
        <button
          onClick={() => handleTabChange('overview')}
          disabled={isPending}
        >
          Overview
        </button>
        <button
          onClick={() => handleTabChange('analytics')}
          disabled={isPending}
        >
          Analytics
        </button>
      </nav>

      <Suspense fallback={<TabSkeleton />}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </Suspense>
    </div>
  );
}
```

### Skeleton fallbacks

```jsx
// Skeletons.jsx — skeleton components para fallbacks
function UserCardSkeleton() {
  return (
    <div className="user-card skeleton">
      <div className="skeleton-avatar" />
      <div className="skeleton-line w-60" />
      <div className="skeleton-line w-40" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard skeleton">
      <div className="skeleton-header" />
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="table-skeleton">
      <div className="skeleton-row skeleton-header-row" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-cell" />
          <div className="skeleton-cell" />
          <div className="skeleton-cell" />
        </div>
      ))}
    </div>
  );
}
```

## Variants

### Suspense con cached promises

```jsx
// cache.js — cache promises para avoid re-fetching
const cache = new Map();

function fetchWithCache(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(res => res.json()));
  }
  return cache.get(url);
}

// Component usa cached promise con use()
function UserProfile({ userId }) {
  const user = use(fetchWithCache(`/api/users/${userId}`));
  return <h1>{user.name}</h1>;
}
```

### Conditional Suspense boundary

```jsx
// ConditionalSuspense.jsx — wrappeá en Suspense solo cuando necesario
function MaybeLazy({ shouldLazy, component: Component, ...props }) {
  if (!shouldLazy) {
    return <Component {...props} />;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Component {...props} />
    </Suspense>
  );
}

// Usage
const HeavyComponent = lazy(() => import('./HeavyComponent'));
const LightComponent = () => <div>Light</div>;

function App({ isPremium }) {
  return (
    <MaybeLazy
      shouldLazy={isPremium}
      component={isPremium ? HeavyComponent : LightComponent}
    />
  );
}
```

## Best Practices


- For a deeper guide, see [Container-Presenter: Separate Data Logic from Rendering](/es/patterns/container-presenter-pattern/).

- Ubicá boundaries estratégicamente — wrappeá la smallest unit que debería independentemente showear un loading state
- Usá nested boundaries — no uses un giant boundary para toda la page; dejá que diferentes sections load independientemente
- Proveé meaningful fallbacks — skeleton screens que matchean el content shape, no solo "Loading..."
- Combiná con error boundaries — Suspense maneja loading, ErrorBoundary maneja failures
- Usá `useTransition` para user-triggered suspends — mantiene el current UI visible durante el transition
- No suspendas en event handlers sin transitions — wrappeá en `startTransition` para avoid blocking
- Cacheá promises — re-suspending en cada render causa infinite loops si el promise no está cached
- Streaméá critical content primero — en SSR, poné critical content fuera de Suspense y non-critical adentro

## Common Mistakes

- **Un boundary para todo**: wrappear toda la app en un Suspense. Un single slow component bloquea toda la page. Usá nested boundaries.
- **Uncached promises**: llamar `fetch()` directamente en render sin caching. Cada render crea un new promise, causando infinite re-suspension.
- **Fallback no matchea content**: mostrar un spinner donde un table va a aparecer causa layout shift. Usá skeleton screens que matcheen el content shape.
- **No error boundary**: Suspense solo maneja loading. Sin un error boundary, un rejected promise crashea la app.
- **Suspender en event handlers**: llamar una suspending function en un onClick sin `useTransition` bloquea la UI.

## FAQ

### ¿Qué es React Suspense?

Un feature que deja a los components declaratively waitear por async data. Wrappeá components en `<Suspense fallback={...}>` y React muestra el fallback mientras data loads — no necesita manual loading state.

### ¿Suspense funciona con cualquier data fetching library?

No. La library debe supportar Suspense. React Query v5 (`useSuspenseQuery`), Relay, SWR (con `suspense: true`), y React 19's `use()` hook funcionan. Plain `fetch()` necesita un caching wrapper.

### ¿Cuál es la diferencia entre Suspense y conditional loading?

Con conditional loading, escribís `if (loading) return <Spinner />` en cada component. Con Suspense, el component solo lee data y React maneja el loading state en el boundary. El component code es más simple.

### ¿Puedo usar Suspense para client-side data fetching?

Sí. Con React 19's `use()` hook o React Query's `useSuspenseQuery`, client-side data fetching suspende automáticamente. El component lee data como si fuera synchronous.

### ¿Qué es streaming SSR?

Un server-side rendering mode donde React send HTML en chunks. Critical content arrive primero, non-critical content (wrappeado en Suspense) streams después. El browser puede empezar a render antes de que toda data esté ready.
