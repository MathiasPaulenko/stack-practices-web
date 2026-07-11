---
contentType: patterns
slug: custom-hook-composition-pattern
title: "Custom Hook Composition"
description: "Cómo componer lógica reusable con custom React hooks. Cubre hook composition patterns, dependency arrays, context integration, y testing strategies."
metaDescription: "Compón lógica reusable con custom React hooks. Aprende composition patterns, dependency arrays, context integration, memoization, y testing strategies."
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
  metaDescription: "Compón lógica reusable con custom React hooks. Aprende composition patterns, dependency arrays, context integration, memoization, y testing strategies."
  keywords:
    - frontend
    - react
    - hooks
    - composition
    - reusability
    - pattern
---

## Overview

Custom hook composition es la práctica de construir complex logic combinando hooks más chicos y focused. En vez de un hook grande que hace todo, componés múltiples single-purpose hooks — `useFetch`, `usePagination`, `useDebounce`, `useSort` — en un higher-level hook como `useUserTable`. Cada hook maneja un concern, haciéndolos testable y reusables across components. Esto es el React equivalent de function composition: funciones chicas que hacen una cosa, combined para resolver complex problems.

## When to Use

- Múltiples components comparten la misma data-fetching y transformation logic
- Component logic crece más allá de 50-100 lines y maneja múltiples concerns
- Necesitás testear business logic independientemente del rendering
- Diferentes components necesitan diferentes combinations de los mismos building blocks
- State management logic está duplicada across components

## When NOT to Use

- Componentes simples con straightforward logic — un single `useState` está fine
- Hooks que solo se usan en un lugar y son simples enough para inline
- Performance-critical paths donde hook overhead importa (raro)
- Cuando la composition agrega indirection sin mejorar clarity

## Solution

### Basic custom hooks

```jsx
// useDebounce.js — debounce un value
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
// useFetch.js — data fetching con loading/error states
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
// useSort.js — sort un array por key
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
// usePagination.js — paginate un array
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

### Componiendo hooks en un higher-level hook

```jsx
// useUserTable.js — composed hook combinando fetch, debounce, sort, pagination
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
// UserTable.jsx — component usando el composed hook
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
// useAuth.js — auth hook backedeado por context
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
// useProtectedFetch.js — componé useAuth con useFetch
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

### Memoization en composed hooks

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

### Hook con reducer para complex state

```jsx
// useAsyncReducer.js — manage async operations con reducer
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
// useUserData.js — conditional composition basada en params
function useUserData(userId, options = {}) {
  const { enabled = true } = options;

  // Always llamar hooks — no podés conditionalmente llamar hooks
  const { data, loading, error, refetch } = useFetch(
    enabled ? `/api/users/${userId}` : null,
  );

  // Pero podés conditionalmente process los results
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

- Un concern por hook — `useDebounce` solo debounces, `useSort` solo sorts. No mezcles concerns.
- Componé, no dupliques — si dos hooks comparten logic, extractá un third hook y componé.
- Retorná objects, no arrays — `{ data, loading, error }` es más claro que `[data, loading, error]` y order-independent.
- Memoizá expensive computations — usá `useMemo` para derived data y `useCallback` para functions passed a children.
- Mantené dependency arrays correctos — stale closures son el #1 hook bug. Incluí todos los referenced values.
- Nombrá hooks con `use` prefix — React's rules of hooks require esto para que linting funcione.
- Throweá si context está missing — `useAuth` debería throw si se usa fuera de `AuthProvider`, no silently return null.
- Testeá hooks con `renderHook` — testea el hook en isolation, no a través de un component.

## Common Mistakes

- **Violar rules of hooks**: llamar hooks conditionalmente o en loops. Los hooks deben llamarse unconditionally al top level.
- **Stale closures**: olvidar un dependency en el dependency array. El callback capturea old values.
- **Over-composing**: wrappear un single `useState` en un hook. Solo extract cuando logic es non-trivial o reused.
- **Retornar demasiado**: un hook que retorna 15 values es hard de usar. Spliteá en hooks más chicos o groupá related values.
- **No memoizar callbacks**: pasar new function references a memoized children causa unnecessary re-renders.

## FAQ

### ¿Qué es hook composition?

Combinar múltiples custom hooks en un higher-level hook. Por ejemplo, `useUserTable` compone `useFetch`, `useDebounce`, `useSort`, y `usePagination` en un single hook que maneja un data table.

### ¿Puedo llamar hooks conditionalmente?

No. React's rules of hooks requieren que los hooks se llamen unconditionally al top level de tu component o custom hook. Podés conditionalmente usar los results, pero no el hook call mismo.

### ¿Debería retornar objects o arrays desde hooks?

Los objects son generally mejores — son self-documenting y order-independent. Los arrays están fine para hooks con 2-3 values como `useState`.

### ¿Cómo testeo custom hooks?

Usá `renderHook` de `@testing-library/react` (o `@testing-library/react-hooks` para versiones más viejas). Esto te deja testear el hook en isolation sin renderizar un component.

### ¿Cuál es la diferencia entre un custom hook y una utility function?

Un custom hook usa React hooks (`useState`, `useEffect`, etc.) y participa en el component lifecycle. Una utility function es pure y stateless. Si necesita React state o effects, es un hook.
