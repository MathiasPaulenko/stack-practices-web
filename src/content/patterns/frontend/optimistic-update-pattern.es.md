---
contentType: patterns
slug: optimistic-update-pattern
title: "Patrón Optimistic Update: UI Inmediata, Reconciliar"
description: "Cómo actualizar UI inmediatamente y reconciliar en server response en React. Cubre rollback on error, conflict resolution, y React Query integration."
metaDescription: "Actualiza UI inmediatamente y reconcilia en server response en React. Aprende rollback on error, conflict resolution, React Query, y optimistic transactions."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - react
  - optimistic-ui
  - state-management
  - react-query
  - pattern
category: architectural
relatedResources:
  - /patterns/container-presenter-pattern
  - /patterns/custom-hook-composition-pattern
  - /patterns/suspense-boundary-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Actualiza UI inmediatamente y reconcilia en server response en React. Aprende rollback on error, conflict resolution, React Query, y optimistic transactions."
  keywords:
    - frontend
    - react
    - optimistic-ui
    - state-management
    - react-query
    - pattern
---

## Overview

Los optimistic updates cambian la UI inmediatamente cuando un user performa un action, sin esperar a que el server confirme. Si el server succede, la UI ya está correct. Si el server falla, la UI rolla back a su previous state y muestra un error. Este pattern hace que las aplicaciones se sientan fast y responsive — el user ve su action reflected instantáneamente. El trade-off es complexity: tenés que manejar rollback, conflict resolution, y el brief window donde UI y server state divergen.

## When to Use

- Botones de like/unlike, toggles, y otras instant-feedback interactions
- Agregar/remover items de una list (todo items, cart items)
- Editar text inline (comments, titles, descriptions)
- Cualquier action donde el server casi siempre succede
- Aplicaciones donde perceived performance importa más que absolute consistency

## When NOT to Use

- Financial transactions — siempre esperá server confirmation
- Actions con high failure rates — rollback flicker degrada UX
- Operations que dependen de server-side validation (unique name check)
- Multi-step workflows donde later steps dependen de earlier server state
- Cuando el server es el source of truth y la UI debe reflectarlo exactamente

## Solution

### Basic optimistic update con useState

```jsx
// LikeButton.jsx — basic optimistic update
import React, { useState } from 'react';

function LikeButton({ postId, initialLiked, initialCount }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState(null);

  const handleLike = async () => {
    const previousLiked = liked;
    const previousCount = count;

    // Optimistic update — immediate UI change
    setLiked(!liked);
    setCount(prev => liked ? prev - 1 : prev + 1);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: !liked }),
      });

      if (!response.ok) throw new Error('Failed to update like');

      // Server confirmed — UI ya está correct
    } catch (err) {
      // Rollback a previous state
      setLiked(previousLiked);
      setCount(previousCount);
      setError('Could not update like. Please try again.');
    }
  };

  return (
    <div className="like-button">
      <button onClick={handleLike} className={liked ? 'liked' : ''}>
        {liked ? '♥' : '♡'} {count}
      </button>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

export default LikeButton;
```

### Optimistic list update con rollback

```jsx
// TodoList.jsx — optimistic add y delete
import React, { useState } from 'react';

function TodoList({ initialTodos }) {
  const [todos, setTodos] = useState(initialTodos);
  const [error, setError] = useState(null);

  const addTodo = async (text) => {
    const tempId = Date.now();
    const newTodo = { id: tempId, text, completed: false, pending: true };

    // Optimistic add
    setTodos(prev => [...prev, newTodo]);
    setError(null);

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const savedTodo = await response.json();

      // Replace temp todo con server todo
      setTodos(prev =>
        prev.map(t => t.id === tempId ? { ...savedTodo, pending: false } : t)
      );
    } catch (err) {
      // Rollback — remové el temp todo
      setTodos(prev => prev.filter(t => t.id !== tempId));
      setError('Failed to add todo. Please try again.');
    }
  };

  const deleteTodo = async (id) => {
    const previousTodos = todos;

    // Optimistic delete
    setTodos(prev => prev.filter(t => t.id !== id));
    setError(null);

    try {
      const response = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
    } catch (err) {
      // Rollback
      setTodos(previousTodos);
      setError('Failed to delete. Please try again.');
    }
  };

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Optimistic toggle
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      });
      if (!response.ok) throw new Error('Toggle failed');
    } catch (err) {
      // Rollback
      setTodos(prev =>
        prev.map(t => t.id === id ? { ...t, completed: todo.completed } : t)
      );
      setError('Failed to update. Please try again.');
    }
  };

  return (
    <div className="todo-list">
      <form onSubmit={(e) => {
        e.preventDefault();
        const input = e.target.elements.text;
        if (input.value.trim()) {
          addTodo(input.value.trim());
          input.value = '';
        }
      }}>
        <input name="text" placeholder="New todo..." />
        <button type="submit">Add</button>
      </form>

      {error && <div className="error">{error}</div>}

      <ul>
        {todos.map(todo => (
          <li key={todo.id} className={todo.pending ? 'pending' : ''}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : '' }}>
              {todo.text}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoList;
```

### React Query optimistic updates

```jsx
// useOptimisticTodo.js — React Query con optimistic updates
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function useTodos() {
  const queryClient = useQueryClient();

  const { data: todos = [] } = useQuery({
    queryKey: ['todos'],
    queryFn: () => fetch('/api/todos').then(res => res.json()),
  });

  const addTodoMutation = useMutation({
    mutationFn: (text) =>
      fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).then(res => res.json()),

    onMutate: async (text) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot previous value
      const previousTodos = queryClient.getQueryData(['todos']);

      // Optimistically add
      queryClient.setQueryData(['todos'], (old) => [
        ...old,
        { id: Date.now(), text, completed: false, pending: true },
      ]);

      // Return context con previous value
      return { previousTodos };
    },

    onError: (err, text, context) => {
      // Rollback on error
      queryClient.setQueryData(['todos'], context.previousTodos);
    },

    onSettled: () => {
      // Always refetch después de error o success
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: (id) =>
      fetch(`/api/todos/${id}`, { method: 'DELETE' }),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData(['todos']);

      queryClient.setQueryData(['todos'], (old) =>
        old.filter((t) => t.id !== id)
      );

      return { previousTodos };
    },

    onError: (err, id, context) => {
      queryClient.setQueryData(['todos'], context.previousTodos);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: ({ id, completed }) =>
      fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      }),

    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData(['todos']);

      queryClient.setQueryData(['todos'], (old) =>
        old.map((t) => t.id === id ? { ...t, completed } : t)
      );

      return { previousTodos };
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(['todos'], context.previousTodos);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return {
    todos,
    addTodo: addTodoMutation.mutate,
    deleteTodo: deleteTodoMutation.mutate,
    toggleTodo: toggleTodoMutation.mutate,
    isAdding: addTodoMutation.isPending,
  };
}

export default useTodos;
```

### Custom hook para optimistic updates

```jsx
// useOptimistic.js — generic optimistic update hook
import { useState, useCallback, useRef } from 'react';

function useOptimistic(initialState) {
  const [state, setState] = useState(initialState);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const previousStateRef = useRef(initialState);

  const optimisticUpdate = useCallback(
    async (optimisticState, asyncFn) => {
      previousStateRef.current = state;

      // Apply optimistic state
      setState(optimisticState);
      setIsOptimistic(true);

      try {
        const result = await asyncFn();
        // Server confirmed — keep el state, update con server data si provided
        if (result !== undefined) {
          setState(result);
        }
        setIsOptimistic(false);
        return result;
      } catch (error) {
        // Rollback
        setState(previousStateRef.current);
        setIsOptimistic(false);
        throw error;
      }
    },
    [state]
  );

  return { state, setState, optimisticUpdate, isOptimistic };
}

export default useOptimistic;
```

```jsx
// Usage
function CommentEditor({ comment }) {
  const { state: text, optimisticUpdate, isOptimistic } = useOptimistic(comment.text);

  const handleSave = async () => {
    try {
      await optimisticUpdate(
        text, // optimistic value (ya shown)
        () => fetch(`/api/comments/${comment.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ text }),
        }).then(res => res.json()).then(data => data.text)
      );
    } catch {
      alert('Failed to save. Reverted to previous text.');
    }
  };

  return (
    <div>
      <textarea value={text} onChange={(e) => optimisticUpdate(e.target.value, async () => {})} />
      <button onClick={handleSave} disabled={isOptimistic}>
        {isOptimistic ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
```

### Conflict resolution con versioning

```jsx
// OptimisticUpdateWithVersion.jsx — handle concurrent edits
import React, { useState } from 'react';

function EditableTitle({ item, onUpdate }) {
  const [title, setTitle] = useState(item.title);
  const [version, setVersion] = useState(item.version);
  const [conflict, setConflict] = useState(null);

  const handleSave = async () => {
    const previousTitle = title;
    const previousVersion = version;

    // Optimistic update
    setTitle(title);
    setConflict(null);

    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, version }),
      });

      if (response.status === 409) {
        // Conflict — server tiene un newer version
        const serverItem = await response.json();
        setConflict({
          serverTitle: serverItem.title,
          yourTitle: title,
        });
        // Rollback a server version
        setTitle(serverItem.title);
        setVersion(serverItem.version);
        return;
      }

      const updated = await response.json();
      setVersion(updated.version);
    } catch (err) {
      setTitle(previousTitle);
      setVersion(previousVersion);
    }
  };

  return (
    <div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={handleSave}>Save</button>
      {conflict && (
        <div className="conflict-warning">
          Another user edited this title to "{conflict.serverTitle}".
          Your change "{conflict.yourTitle}" was reverted.
        </div>
      )}
    </div>
  );
}
```

## Variants

### Pessimistic fallback para critical operations

```jsx
// MixedOptimistic.jsx — optimistic para low-risk, pessimistic para high-risk
function CartActions({ item }) {
  const [quantity, setQuantity] = useState(item.quantity);

  const updateQuantity = async (newQty) => {
    if (newQty === 0) {
      // Pessimistic — deleting from cart necesita confirmation
      const confirmed = window.confirm('Remove this item from cart?');
      if (!confirmed) return;

      await fetch(`/api/cart/${item.id}`, { method: 'DELETE' });
      setQuantity(0);
    } else {
      // Optimistic — quantity change es low-risk
      const prev = quantity;
      setQuantity(newQty);
      try {
        await fetch(`/api/cart/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: newQty }),
        });
      } catch {
        setQuantity(prev);
      }
    }
  };

  return (
    <div>
      <button onClick={() => updateQuantity(quantity - 1)}>-</button>
      <span>{quantity}</span>
      <button onClick={() => updateQuantity(quantity + 1)}>+</button>
    </div>
  );
}
```

### Batch optimistic updates

```jsx
// BatchOptimistic.jsx — múltiples optimistic updates a la vez
function BulkComplete({ selectedIds, todos, setTodos }) {
  const [error, setError] = useState(null);

  const handleBulkComplete = async () => {
    const previousTodos = [...todos];

    // Optimistic: mark todos los selected como completed
    setTodos(prev =>
      prev.map(t =>
        selectedIds.includes(t.id) ? { ...t, completed: true } : t
      )
    );

    try {
      await fetch('/api/todos/bulk-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
    } catch {
      // Rollback all
      setTodos(previousTodos);
      setError('Failed to complete some items.');
    }
  };

  return (
    <button onClick={handleBulkComplete}>
      Complete {selectedIds.length} items
    </button>
  );
}
```

## Best Practices

- Snapshoteá antes del optimistic update — siempre guardá el previous state para poder roll back
- Usá temp IDs para new items — `Date.now()` o `crypto.randomUUID()` hasta que el server retorne el real ID
- Markéa pending items visualmente — opacity, spinner, o un subtle indicator para que los users sepan que no está confirmed
- Rollbackeá on error — restaurá el exact previous state y mostrá un error message
- Mantené el optimistic window corto — si el server toma más de 2 segundos, considerá un loading state en su lugar
- Manejá conflicts — si otro user modificó el mismo resource, mostrá su version y dejá que el user decida
- Usá React Query's built-in support — `onMutate`, `onError`, `onSettled` manejan el pattern por vos
- No encadenés optimistic updates — esperá que uno settle antes de arrancar el next para avoid inconsistent state

## Common Mistakes

- **No rollback**: updatear UI optimistamente pero no revertir on error. Los users ven stale data y no saben que el action falló.
- **Usar server IDs antes de que existan**: asignar `id: 1` optimistamente cuando el server va a asignar `id: 42`. Usá temp IDs y reemplazá on success.
- **Encadenar optimistic updates**: updatear el mismo item dos veces antes de que el primer request settle. El rollback del primero overwrites el segundo.
- **No manejar 409 conflicts**: dos users editan el mismo resource. El server rechaza uno, pero la UI no muestra el conflict.
- **Optimistic para todo**: usar optimistic updates para irreversible actions (delete account, process payment). Siempre esperá confirmation.

## FAQ

### ¿Qué es un optimistic update?

Cambiar la UI inmediatamente cuando el user performa un action, sin esperar al server. Si el server falla, la UI rolla back. Esto hace que la app se sienta más fast.

### ¿Cuándo debería evitar optimistic updates?

Para irreversible actions (payments, deletions que no se pueden undo), high-failure-rate operations, o cuando el server debe validatear antes de que la UI reflecte el change.

### ¿Cómo manejo temp IDs?

Generá un temporary ID (e.g., `Date.now()`) para el optimistic item. Cuando el server responde con el real ID, reemplazá el temp item con el server item.

### ¿Qué es rollback?

Restaurar la UI a su previous state cuando el server request falla. Snapshoteás el state antes del optimistic update y lo restaurás on error.

### ¿Debería usar React Query para optimistic updates?

Sí, si ya estás usando React Query. Sus callbacks `onMutate`/`onError`/`onSettled` manejan el snapshot, optimistic update, y rollback pattern por vos.
