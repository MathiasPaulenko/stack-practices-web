---
contentType: patterns
slug: suspense-boundary-pattern
title: "Suspense Boundary Pattern: Declarative Loading States with React Suspense"
description: "How to use React Suspense boundaries for declarative loading states. Covers data fetching, streaming SSR, nested boundaries, and error boundaries."
metaDescription: "Use React Suspense boundaries for declarative loading states. Learn data fetching, streaming SSR, nested boundaries, fallbacks, and error integration."
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
  metaDescription: "Use React Suspense boundaries for declarative loading states. Learn data fetching, streaming SSR, nested boundaries, fallbacks, and error integration."
  keywords:
    - frontend
    - react
    - suspense
    - loading-states
    - ssr
    - pattern
---

## Overview

React Suspense lets you declaratively specify loading states without writing conditional rendering logic. Wrap a component in a `<Suspense>` boundary with a `fallback` prop, and React shows the fallback while the component's data is loading. This eliminates the `if (loading) return <Spinner />` pattern scattered throughout components. Suspense works with lazy-loaded components, data fetching libraries (React Query, SWR, Relay), and server-side streaming. Combined with error boundaries, it provides a complete declarative approach to async UI states.

## When to Use

- Code-splitting with `React.lazy()` for route-level or component-level splitting
- Data fetching with Suspense-enabled libraries (React Query v5, Relay, SWR)
- Streaming SSR with selective hydration — send HTML as data becomes available
- Nested loading states where different parts of the page load independently
- Eliminating manual loading state management across many components

## When NOT to Use

- Simple applications without code-splitting or data fetching
- When you need fine-grained control over loading transitions — Suspense is all-or-nothing per boundary
- Legacy React versions (< 18) without concurrent features
- Cases where loading states must show partial data (Suspense shows fallback, not partial content)

## Solution

### Basic Suspense with lazy loading

```jsx
// App.jsx — lazy load a heavy component
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

### Suspense with data fetching

```jsx
// useSuspenseFetch.js — data fetching hook that integrates with Suspense
import { use, useState, useEffect } from 'react';

function fetchUser(userId) {
  return fetch(`/api/users/${userId}`).then(res => res.json());
}

// React 19: use() hook suspends until promise resolves
function UserProfile({ userId }) {
  const user = use(fetchUser(userId));

  return (
    <div className="profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// Parent wraps in Suspense
function App() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfile userId={42} />
    </Suspense>
  );
}
```

### React Query with Suspense

```jsx
// useUser.js — React Query v5 with suspense
import { useSuspenseQuery } from '@tanstack/react-query';

function useUser(userId) {
  return useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
  });
}

// UserCard.jsx — no loading state needed
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

// Dashboard.jsx — Suspense boundary at the top
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

      {/* Main content loads first */}
      <Suspense fallback={<MainSkeleton />}>
        <MainContent />
      </Suspense>

      {/* Sidebar loads independently */}
      <aside>
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
      </aside>

      {/* Comments load last — don't block the page */}
      <section className="comments">
        <Suspense fallback={<div>Loading comments...</div>}>
          <Comments postId={1} />
        </Suspense>
      </section>
    </div>
  );
}
```

### Suspense with error boundaries

```jsx
// ErrorBoundary.jsx — catch errors from suspended components
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

// Usage — wrap Suspense in ErrorBoundary
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

### Streaming SSR with Suspense

```jsx
// server.js — streaming SSR with selective hydration
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

// App.jsx — Suspense boundaries on the server
function App() {
  return (
    <html>
      <body>
        <div id="root">
          <Header />

          {/* Critical content renders immediately */}
          <Suspense fallback={<ProductSkeleton />}>
            <Product productId={1} />
          </Suspense>

          {/* Non-critical content streams later */}
          <Suspense fallback={<ReviewsSkeleton />}>
            <Reviews productId={1} />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
```

### Suspense list for coordinated loading

```jsx
// SuspenseList.jsx — coordinate multiple Suspense boundaries
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

### Use transition with Suspense

```jsx
// TransitionWithSuspense.jsx — useTransition for smooth state changes
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
// Skeletons.jsx — skeleton components for fallbacks
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

### Suspense with cached promises

```jsx
// cache.js — cache promises to avoid re-fetching
const cache = new Map();

function fetchWithCache(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(res => res.json()));
  }
  return cache.get(url);
}

// Component uses cached promise with use()
function UserProfile({ userId }) {
  const user = use(fetchWithCache(`/api/users/${userId}`));
  return <h1>{user.name}</h1>;
}
```

### Conditional Suspense boundary

```jsx
// ConditionalSuspense.jsx — wrap in Suspense only when needed
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

- Place boundaries strategically — wrap the smallest unit that should independently show a loading state
- Use nested boundaries — don't use one giant boundary for the whole page; let different sections load independently
- Provide meaningful fallbacks — skeleton screens that match the content shape, not just "Loading..."
- Combine with error boundaries — Suspense handles loading, ErrorBoundary handles failures
- Use `useTransition` for user-triggered suspends — keeps the current UI visible during the transition
- Don't suspend in event handlers without transitions — wrap in `startTransition` to avoid blocking
- Cache promises — re-suspending on every render causes infinite loops if the promise isn't cached
- Stream critical content first — in SSR, put critical content outside Suspense and non-critical inside

## Common Mistakes

- **One boundary for everything**: wrapping the entire app in one Suspense. A single slow component blocks the whole page. Use nested boundaries.
- **Uncached promises**: calling `fetch()` directly in render without caching. Each render creates a new promise, causing infinite re-suspension.
- **Fallback doesn't match content**: showing a spinner where a table will appear causes layout shift. Use skeleton screens that match the content shape.
- **No error boundary**: Suspense only handles loading. Without an error boundary, a rejected promise crashes the app.
- **Suspending in event handlers**: calling a suspending function in an onClick without `useTransition` blocks the UI.

## FAQ

### What is React Suspense?

A feature that lets components declaratively wait for async data. Wrap components in `<Suspense fallback={...}>` and React shows the fallback while data loads — no manual loading state needed.

### Does Suspense work with any data fetching library?

No. The library must support Suspense. React Query v5 (`useSuspenseQuery`), Relay, SWR (with `suspense: true`), and React 19's `use()` hook work. Plain `fetch()` needs a caching wrapper.

### What is the difference between Suspense and conditional loading?

With conditional loading, you write `if (loading) return <Spinner />` in every component. With Suspense, the component just reads data and React handles the loading state at the boundary. The component code is simpler.

### Can I use Suspense for client-side data fetching?

Yes. With React 19's `use()` hook or React Query's `useSuspenseQuery`, client-side data fetching suspends automatically. The component reads data as if it's synchronous.

### What is streaming SSR?

A server-side rendering mode where React sends HTML in chunks. Critical content arrives first, non-critical content (wrapped in Suspense) streams later. The browser can start rendering before all data is ready.
