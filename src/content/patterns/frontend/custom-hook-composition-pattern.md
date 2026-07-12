---

contentType: patterns
slug: custom-hook-composition-pattern
title: "Custom Hook Composition"
description: "How to compose reusable logic with custom React hooks. Covers hook composition patterns, dependency arrays, context integration, and testing strategies."
metaDescription: "Compose reusable logic with custom React hooks. Learn composition patterns, dependency arrays, context integration, memoization, and testing strategies."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - react
  - hooks
  - composition
  - reusability
  - pattern
category: architectural
relatedResources:
  - /patterns/container-presenter-pattern
  - /patterns/optimistic-update-pattern
  - /patterns/state-machine-ui-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Compose reusable logic with custom React hooks. Learn composition patterns, dependency arrays, context integration, memoization, and testing strategies."
  keywords:
    - frontend
    - react
    - hooks
    - composition
    - reusability
    - pattern

---

## Overview

Custom hook composition is the practice of building complex logic by combining smaller, focused hooks. Instead of one large hook that does everything, you compose multiple single-purpose hooks — `useFetch`, `usePagination`, `useDebounce`, `useSort` — into a higher-level hook like `useUserTable`. Each hook handles one concern, making them testable and reusable across components. This is the React equivalent of function composition: small functions that do one thing, combined to solve complex problems.

## When to Use

- Multiple components share the same data-fetching and transformation logic
- Component logic grows beyond 50-100 lines and handles multiple concerns
- You need to test business logic independently of rendering
- Different components need different combinations of the same building blocks
- State management logic is duplicated across components

## When NOT to Use

- Simple components with straightforward logic — a single `useState` is fine
- Hooks that are only used in one place and are simple enough to inline
- Performance-critical paths where hook overhead matters (rare)
- When the composition adds indirection without improving clarity

## Solution

### Basic custom hooks

```jsx
// useDebounce.js — debounce a value
import { useState, useEffect } from 'react';

function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
```

```jsx
// useFetch.js — data fetching with loading/error states
import { useState, useEffect, useCallback } from 'react';

function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export default useFetch;
```

```jsx
// useSort.js — sort an array by key
import { useState, useMemo } from 'react';

function useSort(items, initialKey = null, initialDirection = 'asc') {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDirection, setSortDirection] = useState(initialDirection);

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    const sorted = [...items].sort((a, b) => {
      if (a[sortKey] < b[sortKey]) return sortDirection === 'asc' ? -1 : 1;
      if (a[sortKey] > b[sortKey]) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [items, sortKey, sortDirection]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return { sortedItems, sortKey, sortDirection, toggleSort };
}

export default useSort;
```

```jsx
// usePagination.js — paginate an array
import { useState, useMemo } from 'react';

function usePagination(items, itemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToPage = (page) => setCurrentPage(Math.min(Math.max(page, 1), totalPages));

  return {
    paginatedItems,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
  };
}

export default usePagination;
```

### Composing hooks into a higher-level hook

```jsx
// useUserTable.js — composed hook combining fetch, debounce, sort, pagination
import useFetch from './useFetch';
import useDebounce from './useDebounce';
import useSort from './useSort';
import usePagination from './usePagination';
import { useMemo } from 'react';

function useUserTable(searchQuery, options = {}) {
  const debouncedQuery = useDebounce(searchQuery, options.debounceDelay || 300);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    return `/api/users?${params.toString()}`;
  }, [debouncedQuery]);

  const { data: users, loading, error, refetch } = useFetch(url);

  const { sortedItems, sortKey, sortDirection, toggleSort } = useSort(
    users || [],
    options.initialSortKey,
    options.initialSortDirection || 'asc',
  );

  const {
    paginatedItems,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
  } = usePagination(sortedItems, options.itemsPerPage || 10);

  return {
    users: paginatedItems,
    loading,
    error,
    sortKey,
    sortDirection,
    toggleSort,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    refetch,
  };
}

export default useUserTable;
```

```jsx
// UserTable.jsx — component using the composed hook
import React, { useState } from 'react';
import useUserTable from '../hooks/useUserTable';

function UserTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    users,
    loading,
    error,
    sortKey,
    sortDirection,
    toggleSort,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
  } = useUserTable(searchQuery, {
    itemsPerPage: 5,
    initialSortKey: 'name',
    debounceDelay: 200,
  });

  return (
    <div className="user-table">
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search users..."
      />

      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}

      <table>
        <thead>
          <tr>
            <th onClick={() => toggleSort('name')}>
              Name {sortKey === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => toggleSort('email')}>
              Email {sortKey === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button onClick={prevPage} disabled={currentPage === 1}>Previous</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={nextPage} disabled={currentPage === totalPages}>Next</button>
      </div>
    </div>
  );
}

export default UserTable;
```

### Context-integrated composition

```jsx
// useAuth.js — auth hook backed by context
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

function useAuth() {
  const { user, token, login, logout, isLoading } = useContext(AuthContext);

  if (!AuthContext) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return { user, token, login, logout, isLoading, isAuthenticated: !!user };
}

export default useAuth;
```

```jsx
// useProtectedFetch.js — compose useAuth with useFetch
import useAuth from './useAuth';
import { useState, useEffect, useCallback } from 'react';

function useProtectedFetch(url) {
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        logout();
        throw new Error('Session expired');
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, token, logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export default useProtectedFetch;
```

### Memoization in composed hooks

```jsx
// useFilteredAndSortedData.js — memoized composition
import { useMemo } from 'react';
import useSort from './useSort';

function useFilteredAndSortedData(items, filters, sortKey) {
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return String(item[key]).toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }, [items, filters]);

  const { sortedItems, sortKey: activeKey, sortDirection, toggleSort } = useSort(
    filteredItems,
    sortKey,
  );

  return { items: sortedItems, sortKey: activeKey, sortDirection, toggleSort };
}

export default useFilteredAndSortedData;
```

### Testing custom hooks

```jsx
// useDebounce.test.js
import { renderHook, act } from '@testing-library/react-hooks';
import useDebounce from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    });

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('cancels previous timer on rapid changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    act(() => jest.advanceTimersByTime(200));
    rerender({ value: 'c' });
    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe('a');

    act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBe('c');
  });
});
```

```jsx
// useFetch.test.js
import { renderHook, waitFor } from '@testing-library/react';
import useFetch from './useFetch';

describe('useFetch', () => {
  it('fetches data on mount', async () => {
    const mockData = [{ id: 1, name: 'Alice' }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useFetch('/api/users'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFetch('/api/users'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });
});
```

## Variants

### Hook with reducer for complex state

```jsx
// useAsyncReducer.js — manage async operations with reducer
import { useReducer, useCallback } from 'react';

const initialState = { loading: false, data: null, error: null };

function asyncReducer(state, action) {
  switch (action.type) {
    case 'start':
      return { loading: true, data: null, error: null };
    case 'success':
      return { loading: false, data: action.data, error: null };
    case 'error':
      return { loading: false, data: null, error: action.error };
    default:
      return state;
  }
}

function useAsyncReducer(asyncFn) {
  const [state, dispatch] = useReducer(asyncReducer, initialState);

  const execute = useCallback(async (...args) => {
    dispatch({ type: 'start' });
    try {
      const data = await asyncFn(...args);
      dispatch({ type: 'success', data });
      return data;
    } catch (err) {
      dispatch({ type: 'error', error: err.message });
      throw err;
    }
  }, [asyncFn]);

  return { ...state, execute };
}

export default useAsyncReducer;
```

### Conditional hook composition

```jsx
// useUserData.js — conditional composition based on params
function useUserData(userId, options = {}) {
  const { enabled = true } = options;

  // Always call hooks — can't conditionally call hooks
  const { data, loading, error, refetch } = useFetch(
    enabled ? `/api/users/${userId}` : null,
  );

  // But we can conditionally process the results
  const user = useMemo(() => {
    if (!enabled || !data) return null;
    return {
      ...data,
      displayName: `${data.firstName} ${data.lastName}`,
      initials: `${data.firstName[0]}${data.lastName[0]}`,
    };
  }, [data, enabled]);

  return { user, loading: enabled && loading, error: enabled ? error : null, refetch };
}
```

## Best Practices


- For a deeper guide, see [Container-Presenter: Separate Data Logic from Rendering](/patterns/container-presenter-pattern/).

- One concern per hook — `useDebounce` only debounces, `useSort` only sorts. Don't mix concerns.
- Compose, don't duplicate — if two hooks share logic, extract a third hook and compose.
- Return objects, not arrays — `{ data, loading, error }` is clearer than `[data, loading, error]` and order-independent.
- Memoize expensive computations — use `useMemo` for derived data and `useCallback` for functions passed to children.
- Keep dependency arrays correct — stale closures are the #1 hook bug. Include all referenced values.
- Name hooks with `use` prefix — React's rules of hooks require this for linting to work.
- Throw if context is missing — `useAuth` should throw if used outside `AuthProvider`, not silently return null.
- Test hooks with `renderHook` — test the hook in isolation, not through a component.

## Common Mistakes

- **Violating rules of hooks**: calling hooks conditionally or in loops. Hooks must be called unconditionally at the top level.
- **Stale closures**: forgetting a dependency in the dependency array. The callback captures old values.
- **Over-composing**: wrapping a single `useState` in a hook. Only extract when logic is non-trivial or reused.
- **Returning too much**: a hook that returns 15 values is hard to use. Split into smaller hooks or group related values.
- **Not memoizing callbacks**: passing new function references to memoized children causes unnecessary re-renders.

## FAQ

### What is hook composition?

Combining multiple custom hooks into a higher-level hook. For example, `useUserTable` composes `useFetch`, `useDebounce`, `useSort`, and `usePagination` into a single hook that manages a data table.

### Can I call hooks conditionally?

No. React's rules of hooks require that hooks are called unconditionally at the top level of your component or custom hook. You can conditionally use the results, but not the hook call itself.

### Should I return objects or arrays from hooks?

Objects are generally better — they're self-documenting and order-independent. Arrays are fine for hooks with 2-3 values like `useState`.

### How do I test custom hooks?

Use `renderHook` from `@testing-library/react` (or `@testing-library/react-hooks` for older versions). This lets you test the hook in isolation without rendering a component.

### What's the difference between a custom hook and a utility function?

A custom hook uses React hooks (`useState`, `useEffect`, etc.) and participates in the component lifecycle. A utility function is pure and stateless. If it needs React state or effects, it's a hook.
