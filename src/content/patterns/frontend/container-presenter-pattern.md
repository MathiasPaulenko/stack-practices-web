---
contentType: patterns
slug: container-presenter-pattern
title: "Container-Presenter: Separate Data Logic from Rendering"
description: "How to separate data-fetching logic from rendering in React using the container-presenter pattern. Covers hooks migration, testing benefits, and trade-offs."
metaDescription: "Separate data-fetching logic from rendering in React with container-presenter. Learn hooks migration, testing isolation, reusability, and trade-offs."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - react
  - architecture
  - separation-of-concerns
  - testing
  - pattern
category: architectural
relatedResources:
  - /patterns/custom-hook-composition-pattern
  - /patterns/optimistic-update-pattern
  - /patterns/suspense-boundary-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Separate data-fetching logic from rendering in React with container-presenter. Learn hooks migration, testing isolation, reusability, and trade-offs."
  keywords:
    - frontend
    - react
    - architecture
    - separation-of-concerns
    - testing
    - pattern
---

## Overview

The container-presenter pattern splits a React component into two parts: a container that manages data (fetching, state, business logic) and a presenter that renders UI based on props. The container knows how to get data and what to do with it. The presenter knows how to display it. This separation makes presenters reusable across different data sources, simplifies unit testing, and keeps rendering logic free of side effects.

## When to Use

- Components that mix data-fetching with complex rendering logic
- UI components that should be reusable with different data sources
- Teams where data logic and UI design are handled by different people
- Testing strategies that require isolating rendering from data dependencies
- Shared component libraries where consumers provide their own data

## When NOT to Use

- Simple components with no data-fetching — a single component is fine
- Small applications where the overhead of two files per component isn't justified
- React hooks have largely replaced this pattern for data logic — prefer custom hooks for new code
- Components where data and rendering are tightly coupled and never reused

## Solution

### Classic container-presenter (class components)

```jsx
// UserListContainer.jsx — manages data
import React, { Component } from 'react';
import UserListPresenter from './UserListPresenter';

class UserListContainer extends Component {
  state = {
    users: [],
    loading: true,
    error: null,
  };

  componentDidMount() {
    this.fetchUsers();
  }

  async fetchUsers() {
    this.setState({ loading: true, error: null });
    try {
      const response = await fetch('/api/users');
      const users = await response.json();
      this.setState({ users, loading: false });
    } catch (error) {
      this.setState({ error: error.message, loading: false });
    }
  }

  handleDelete = async (userId) => {
    await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    this.fetchUsers();
  };

  handleSearch = (query) => {
    const filtered = this.state.users.filter(u =>
      u.name.toLowerCase().includes(query.toLowerCase())
    );
    this.setState({ users: filtered });
  };

  render() {
    return (
      <UserListPresenter
        users={this.state.users}
        loading={this.state.loading}
        error={this.state.error}
        onDelete={this.handleDelete}
        onSearch={this.handleSearch}
      />
    );
  }
}

export default UserListContainer;
```

```jsx
// UserListPresenter.jsx — pure rendering
import React from 'react';
import PropTypes from 'prop-types';

function UserListPresenter({ users, loading, error, onDelete, onSearch }) {
  if (loading) return <div className="spinner">Loading users...</div>;
  if (error) return <div className="error">Failed to load: {error}</div>;

  return (
    <div className="user-list">
      <input
        type="search"
        placeholder="Search users..."
        onChange={(e) => onSearch(e.target.value)}
        className="search-input"
      />
      <ul>
        {users.map(user => (
          <li key={user.id} className="user-item">
            <span>{user.name} — {user.email}</span>
            <button onClick={() => onDelete(user.id)} className="btn-delete">
              Delete
            </button>
          </li>
        ))}
      </ul>
      {users.length === 0 && <p>No users found.</p>}
    </div>
  );
}

UserListPresenter.propTypes = {
  users: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  })).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onDelete: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
};

export default UserListPresenter;
```

### Hooks-based container (modern approach)

```jsx
// useUsers.js — custom hook as container
import { useState, useEffect, useCallback } from 'react';

function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const deleteUser = useCallback(async (userId) => {
    await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  const searchUsers = useCallback((query) => {
    setUsers(prev => {
      const allUsers = prev;
      if (!query) return allUsers;
      return allUsers.filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase())
      );
    });
  }, []);

  return { users, loading, error, deleteUser, searchUsers, refetch: fetchUsers };
}

export default useUsers;
```

```jsx
// UserList.jsx — presenter component using the hook
import React from 'react';
import useUsers from '../hooks/useUsers';

function UserList() {
  const { users, loading, error, deleteUser, searchUsers } = useUsers();

  if (loading) return <div className="spinner">Loading users...</div>;
  if (error) return <div className="error">Failed to load: {error}</div>;

  return (
    <div className="user-list">
      <input
        type="search"
        placeholder="Search users..."
        onChange={(e) => searchUsers(e.target.value)}
      />
      <ul>
        {users.map(user => (
          <li key={user.id}>
            <span>{user.name} — {user.email}</span>
            <button onClick={() => deleteUser(user.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserList;
```

### Reusable presenter with different data sources

```jsx
// ProductGrid.jsx — reusable presenter
import React from 'react';

function ProductGrid({ products, loading, error, onAddToCart, layout = 'grid' }) {
  if (loading) return <div className="skeleton-grid">Loading products...</div>;
  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div className={`product-${layout}`}>
      {products.map(product => (
        <div key={product.id} className="product-card">
          <img src={product.image} alt={product.name} />
          <h3>{product.name}</h3>
          <p className="price">${product.price}</p>
          <button onClick={() => onAddToCart(product.id)}>
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
}

export default ProductGrid;
```

```jsx
// FeaturedProducts.jsx — container using the same presenter
import React, { useState, useEffect } from 'react';
import ProductGrid from './ProductGrid';

function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/products?featured=true')
      .then(res => res.json())
      .then(data => { setProducts(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const handleAddToCart = (productId) => {
    fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity: 1 }),
    });
  };

  return (
    <section className="featured">
      <h2>Featured Products</h2>
      <ProductGrid
        products={products}
        loading={loading}
        error={error}
        onAddToCart={handleAddToCart}
        layout="carousel"
      />
    </section>
  );
}
```

```jsx
// SearchResults.jsx — different container, same presenter
import React, { useState, useEffect } from 'react';
import ProductGrid from './ProductGrid';

function SearchResults({ query }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => { setProducts(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [query]);

  const handleAddToCart = (productId) => {
    fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity: 1 }),
    });
  };

  return (
    <section className="search-results">
      <h2>Results for "{query}"</h2>
      <ProductGrid
        products={products}
        loading={loading}
        error={error}
        onAddToCart={handleAddToCart}
        layout="list"
      />
    </section>
  );
}
```

### Testing the presenter in isolation

```jsx
// UserListPresenter.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import UserListPresenter from './UserListPresenter';

describe('UserListPresenter', () => {
  const mockUsers = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ];

  it('renders users', () => {
    render(
      <UserListPresenter
        users={mockUsers}
        loading={false}
        error={null}
        onDelete={() => {}}
        onSearch={() => {}}
      />
    );
    expect(screen.getByText('Alice — alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob — bob@example.com')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <UserListPresenter
        users={[]}
        loading={true}
        error={null}
        onDelete={() => {}}
        onSearch={() => {}}
      />
    );
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(
      <UserListPresenter
        users={[]}
        loading={false}
        error="Network error"
        onDelete={() => {}}
        onSearch={() => {}}
      />
    );
    expect(screen.getByText('Failed to load: Network error')).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = jest.fn();
    render(
      <UserListPresenter
        users={mockUsers}
        loading={false}
        error={null}
        onDelete={onDelete}
        onSearch={() => {}}
      />
    );
    fireEvent.click(screen.getAllByText('Delete')[0]);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('calls onSearch when typing in search box', () => {
    const onSearch = jest.fn();
    render(
      <UserListPresenter
        users={mockUsers}
        loading={false}
        error={null}
        onDelete={() => {}}
        onSearch={onSearch}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Search users...'), {
      target: { value: 'Alice' },
    });
    expect(onSearch).toHaveBeenCalledWith('Alice');
  });
});
```

### TypeScript with typed props

```tsx
// UserListPresenter.tsx — typed presenter
import React from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

interface UserListPresenterProps {
  users: User[];
  loading: boolean;
  error: string | null;
  onDelete: (userId: number) => void;
  onSearch: (query: string) => void;
}

function UserListPresenter({
  users,
  loading,
  error,
  onDelete,
  onSearch,
}: UserListPresenterProps): JSX.Element {
  if (loading) return <div className="spinner">Loading users...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="user-list">
      <input
        type="search"
        placeholder="Search users..."
        onChange={(e) => onSearch(e.target.value)}
      />
      <ul>
        {users.map(user => (
          <li key={user.id}>
            <span>{user.name} — {user.email}</span>
            <button onClick={() => onDelete(user.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserListPresenter;
```

## Variants

### Render props as container

```jsx
// DataContainer.jsx — container as render prop
import React, { useState, useEffect } from 'react';

function DataContainer({ url, render }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [url]);

  return render({ data, loading, error });
}

// Usage — presenter is inline
<DataContainer url="/api/users" render={({ data, loading, error }) => (
  loading ? <Spinner /> : <UserList users={data} />
)} />
```

### Higher-order component as container

```jsx
// withData.jsx — HOC container
import React, { useState, useEffect } from 'react';

function withData(url, WrappedComponent) {
  return function DataContainer(props) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      fetch(url)
        .then(res => res.json())
        .then(d => { setData(d); setLoading(false); })
        .catch(e => { setError(e.message); setLoading(false); });
    }, [url]);

    return <WrappedComponent data={data} loading={loading} error={error} {...props} />;
  };
}

// Usage
const UserListContainer = withData('/api/users', UserListPresenter);
```

## Best Practices

- Keep presenters pure — no side effects, no API calls, no state management beyond UI state
- Pass callbacks, not data sources — presenters receive `onDelete(id)`, not a fetch function
- Use TypeScript for props — typed props catch mismatches between container and presenter
- Prefer custom hooks over HOCs or render props — hooks are the modern way to extract container logic
- Test presenters in isolation — render with mock props, assert on output, verify callbacks
- Keep presenters reusable — avoid domain-specific props; use generic names like `items` not `users`

## Common Mistakes

- **Putting business logic in presenters**: the presenter should only render. Validation, transformation, and API calls belong in the container or hook.
- **Making presenters too specific**: a `UserList` that only works with `/api/users` isn't reusable. Accept `items` and `onItemDelete` instead.
- **Not testing in isolation**: if you can't render the presenter with mock props without mocking fetch, the separation is incomplete.
- **Over-splitting simple components**: a button that opens a dropdown doesn't need a container-presenter split. Reserve this for components with real data logic.

## FAQ

### Is container-presenter still relevant with hooks?

Yes, but the implementation changed. Custom hooks replace container components — the hook manages data, the component renders. The principle of separating data from rendering remains the same.

### When should I use container-presenter vs. a single component?

When the component has both data-fetching and non-trivial rendering logic, or when the same UI could be used with different data sources. If the component is simple, keep it as one file.

### What's the difference between container-presenter and smart-dumb components?

They're the same pattern with different names. Container = smart (manages data), presenter = dumb (renders props). The terms are interchangeable.

### Should presenters have any state?

Only UI state — like expanded/collapsed, active tab, hover. Business state (selected user, filtered list) belongs in the container or hook.

### Can I use this pattern with Vue or Angular?

The principle applies to any framework. In Vue, use a container component with a presentational child. In Angular, use a smart component wrapping a dumb component.
