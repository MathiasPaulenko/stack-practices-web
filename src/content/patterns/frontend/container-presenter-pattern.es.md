---
contentType: patterns
slug: container-presenter-pattern
title: "Patrón Container-Presenter: Separar Data Logic del Rendering en React"
description: "Cómo separar data-fetching logic del rendering en React usando el container-presenter pattern. Cubre hooks migration, testing benefits, y trade-offs."
metaDescription: "Separa data-fetching logic del rendering en React con container-presenter. Aprende hooks migration, testing isolation, reusability, y trade-offs."
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
  metaDescription: "Separa data-fetching logic del rendering en React con container-presenter. Aprende hooks migration, testing isolation, reusability, y trade-offs."
  keywords:
    - frontend
    - react
    - architecture
    - separation-of-concerns
    - testing
    - pattern
---

## Overview

El container-presenter pattern splitea un React component en dos partes: un container que maneja data (fetching, state, business logic) y un presenter que renderiza UI basado en props. El container sabe cómo gettear data y qué hacer con ella. El presenter sabe cómo displayearla. Esta separación hace los presenters reusables across diferentes data sources, simplifica unit testing, y mantiene rendering logic free de side effects.

## When to Use

- Componentes que mezclan data-fetching con complex rendering logic
- UI components que deberían ser reusables con diferentes data sources
- Teams donde data logic y UI design las manejan diferentes personas
- Testing strategies que requieren isolat rendering de data dependencies
- Shared component libraries donde los consumers proveen su propia data

## When NOT to Use

- Componentes simples sin data-fetching — un single component está fine
- Aplicaciones chicas donde el overhead de dos files por component no está justificado
- React hooks ha largamente reemplazado este pattern para data logic — preferí custom hooks para new code
- Componentes donde data y rendering están tightly coupled y nunca se reusan

## Solution

### Classic container-presenter (class components)

```jsx
// UserListContainer.jsx — maneja data
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
// useUsers.js — custom hook como container
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
// UserList.jsx — presenter component usando el hook
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

### Reusable presenter con diferentes data sources

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
// FeaturedProducts.jsx — container usando el mismo presenter
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
// SearchResults.jsx — different container, mismo presenter
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

### Testing el presenter en isolation

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

### TypeScript con typed props

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

### Render props como container

```jsx
// DataContainer.jsx — container como render prop
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

// Usage — presenter es inline
<DataContainer url="/api/users" render={({ data, loading, error }) => (
  loading ? <Spinner /> : <UserList users={data} />
)} />
```

### Higher-order component como container

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

- Mantené los presenters pure — no side effects, no API calls, no state management más allá de UI state
- Pasá callbacks, no data sources — los presenters reciben `onDelete(id)`, no una fetch function
- Usá TypeScript para props — typed props catchean mismatches entre container y presenter
- Preferí custom hooks sobre HOCs o render props — hooks son la modern way de extract container logic
- Testeá presenters en isolation — render con mock props, assert en output, verify callbacks
- Mantené presenters reusables — evitá domain-specific props; usá generic names como `items` no `users`

## Common Mistakes

- **Poner business logic en presenters**: el presenter debería solo render. Validation, transformation, y API calls belong en el container o hook.
- **Hacer presenters demasiado specific**: un `UserList` que solo funciona con `/api/users` no es reusable. Acceptá `items` y `onItemDelete` en su lugar.
- **No testear en isolation**: si no podés render el presenter con mock props sin mockear fetch, la separación está incomplete.
- **Over-splitting simple components**: un button que abre un dropdown no necesita un container-presenter split. Reservá esto para componentes con real data logic.

## FAQ

### ¿Container-presenter sigue siendo relevante con hooks?

Sí, pero la implementation cambió. Los custom hooks reemplazan container components — el hook maneja data, el component renderiza. El principle de separar data del rendering sigue siendo el mismo.

### ¿Cuándo debería usar container-presenter vs. un single component?

Cuando el component tiene tanto data-fetching como non-trivial rendering logic, o cuando el mismo UI podría usarse con diferentes data sources. Si el component es simple, mantenelo como un file.

### ¿Cuál es la diferencia entre container-presenter y smart-dumb components?

Son el mismo pattern con diferentes names. Container = smart (maneja data), presenter = dumb (renderiza props). Los terms son interchangeable.

### ¿Deberían los presenters tener state?

Solo UI state — como expanded/collapsed, active tab, hover. Business state (selected user, filtered list) belongs en el container o hook.

### ¿Puedo usar este pattern con Vue o Angular?

El principle aplica a cualquier framework. En Vue, usá un container component con un presentational child. En Angular, usá un smart component wrapping un dumb component.
