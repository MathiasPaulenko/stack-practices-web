---



contentType: patterns
slug: optimistic-update-pattern
title: "Optimistic Update: Update UI Immediately, Reconcile on"
description: "How to update UI immediately and reconcile on server response in React. Covers rollback on error, conflict resolution, and React Query integration."
metaDescription: "Update UI immediately and reconcile on server response in React. Learn rollback on error, conflict resolution, React Query, and optimistic transactions."
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
  - /recipes/svelte-store-reactive-state
  - /patterns/state-machine-ui-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Update UI immediately and reconcile on server response in React. Learn rollback on error, conflict resolution, React Query, and optimistic transactions."
  keywords:
    - frontend
    - react
    - optimistic-ui
    - state-management
    - react-query
    - pattern



---

## Overview

Optimistic updates change the UI immediately when a user performs an action, without waiting for the server to confirm. If the server succeeds, the UI is already correct. If the server fails, the UI rolls back to its previous state and shows an error. This pattern makes applications feel fast and responsive — the user sees their action reflected instantly. The trade-off is complexity: you must handle rollback, conflict resolution, and the brief window where UI and server state diverge.

## When to Use

- Like/unlike buttons, toggles, and other instant-feedback interactions
- Adding/removing items from a list (todo items, cart items)
- Editing text inline (comments, titles, descriptions)
- Any action where the server almost always succeeds
- Applications where perceived performance matters more than absolute consistency

## When NOT to Use

- Financial transactions — always wait for server confirmation
- Actions with high failure rates — rollback flicker degrades UX
- Operations that depend on server-side validation (unique name check)
- Multi-step workflows where later steps depend on earlier server state
- When the server is the source of truth and UI must reflect it exactly

## Solution

### Basic optimistic update with useState

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

      // Server confirmed — UI is already correct
    } catch (err) {
      // Rollback to previous state
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

### Optimistic list update with rollback

```jsx
// TodoList.jsx — optimistic add and delete
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

      // Replace temp todo with server todo
      setTodos(prev =>
        prev.map(t => t.id === tempId ? { ...savedTodo, pending: false } : t)
      );
    } catch (err) {
      // Rollback — remove the temp todo
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
// useOptimisticTodo.js — React Query with optimistic updates
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

      // Return context with previous value
      return { previousTodos };
    },

    onError: (err, text, context) => {
      // Rollback on error
      queryClient.setQueryData(['todos'], context.previousTodos);
    },

    onSettled: () => {
      // Always refetch after error or success
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

### Custom hook for optimistic updates

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
        // Server confirmed — keep the state, update with server data if provided
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
        text, // optimistic value (already shown)
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

### Conflict resolution with versioning

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
        // Conflict — server has a newer version
        const serverItem = await response.json();
        setConflict({
          serverTitle: serverItem.title,
          yourTitle: title,
        });
        // Rollback to server version
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

### Pessimistic fallback for critical operations

```jsx
// MixedOptimistic.jsx — optimistic for low-risk, pessimistic for high-risk
function CartActions({ item }) {
  const [quantity, setQuantity] = useState(item.quantity);

  const updateQuantity = async (newQty) => {
    if (newQty === 0) {
      // Pessimistic — deleting from cart needs confirmation
      const confirmed = window.confirm('Remove this item from cart?');
      if (!confirmed) return;

      await fetch(`/api/cart/${item.id}`, { method: 'DELETE' });
      setQuantity(0);
    } else {
      // Optimistic — quantity change is low-risk
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
// BatchOptimistic.jsx — multiple optimistic updates at once
function BulkComplete({ selectedIds, todos, setTodos }) {
  const [error, setError] = useState(null);

  const handleBulkComplete = async () => {
    const previousTodos = [...todos];

    // Optimistic: mark all selected as completed
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


- For a deeper guide, see [State Machine UI: Finite State Machines for UI](/patterns/state-machine-ui-pattern/).

- Snapshot before optimistic update — always save the previous state so you can roll back
- Use temp IDs for new items — `Date.now()` or `crypto.randomUUID()` until the server returns the real ID
- Mark pending items visually — opacity, spinner, or a subtle indicator so users know it's not confirmed
- Rollback on error — restore the exact previous state and show an error message
- Keep the optimistic window short — if the server takes more than 2 seconds, consider a loading state instead
- Handle conflicts — if another user modified the same resource, show their version and let the user decide
- Use React Query's built-in support — `onMutate`, `onError`, `onSettled` handle the pattern for you
- Don't chain optimistic updates — wait for one to settle before starting the next to avoid inconsistent state

## Common Mistakes

- **No rollback**: updating UI optimistically but not reverting on error. Users see stale data and don't know the action failed.
- **Using server IDs before they exist**: assigning `id: 1` optimistically when the server will assign `id: 42`. Use temp IDs and replace on success.
- **Chaining optimistic updates**: updating the same item twice before the first request settles. The rollback of the first overwrites the second.
- **Not handling 409 conflicts**: two users edit the same resource. The server rejects one, but the UI doesn't show the conflict.
- **Optimistic for everything**: using optimistic updates for irreversible actions (delete account, process payment). Always wait for confirmation.

## FAQ

### What is an optimistic update?

Changing the UI immediately when the user performs an action, without waiting for the server. If the server fails, the UI rolls back. This makes the app feel faster.

### When should I avoid optimistic updates?

For irreversible actions (payments, deletions that can't be undone), high-failure-rate operations, or when the server must validate before the UI reflects the change.

### How do I handle temp IDs?

Generate a temporary ID (e.g., `Date.now()`) for the optimistic item. When the server responds with the real ID, replace the temp item with the server item.

### What is rollback?

Restoring the UI to its previous state when the server request fails. You snapshot the state before the optimistic update and restore it on error.

### Should I use React Query for optimistic updates?

Yes, if you're already using React Query. Its `onMutate`/`onError`/`onSettled` callbacks handle the snapshot, optimistic update, and rollback pattern for you.
