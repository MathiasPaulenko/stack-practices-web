---
contentType: patterns
slug: mvc-pattern-frontend
title: "MVC Pattern in Modern Frontend Applications"
description: "Apply the Model-View-Controller pattern to React and Vue applications to separate data, UI, and interaction logic for maintainable component architecture"
metaDescription: "MVC pattern in modern frontend. Separate data, UI, and interaction logic in React and Vue for maintainable component architecture and predictable state flow."
difficulty: beginner
topics:
  - design
  - frontend
tags:
  - mvc
  - frontend
  - architecture
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/repository-pattern-typescript
  - /patterns/design/decorator-pattern-pipeline
  - /guides/testing-strategy-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "MVC pattern in modern frontend. Separate data, UI, and interaction logic in React and Vue for maintainable component architecture and predictable state flow."
  keywords:
    - mvc pattern
    - frontend architecture
    - react mvc
    - vue mvc
    - component architecture
---

# MVC Pattern in Modern Frontend Applications

[Model-View-Controller](/patterns/design/mvc-pattern) separates an application into three components: Model (data and rules), View (presentation), and Controller (input handling and coordination). While frameworks like React and Vue blur these boundaries, applying MVC discipline prevents components from becoming unmaintainable mashups of state, UI, and side effects.

## When to Use This

- Components grow beyond 200 lines because they mix data fetching, transformation, and rendering. See [Component Testing](/recipes/testing/playwright-component-testing) for testable UI patterns.
- The same data logic is duplicated across multiple pages. See [Repository Pattern](/patterns/design/repository-pattern-typescript) for shared data access layers.
- Testing UI requires mocking networks, stores, and DOM simultaneously. See [Unit Testing](/recipes/testing/unit-testing-mocking) for isolated test strategies.

## Problem

A React component that fetches users, filters by search, sorts by name, paginates results, and renders cards is impossible to test or reuse.

## Solution

```typescript
// model/UserModel.ts
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

class UserModel {
  private users: User[] = [];

  setUsers(users: User[]) {
    this.users = users;
  }

  getFilteredUsers(query: string): User[] {
    if (!query) return this.users;
    const lower = query.toLowerCase();
    return this.users.filter(u =>
      u.name.toLowerCase().includes(lower) ||
      u.email.toLowerCase().includes(lower)
    );
  }

  getSortedUsers(field: keyof User, direction: 'asc' | 'desc'): User[] {
    return [...this.users].sort((a, b) => {
      const cmp = String(a[field]).localeCompare(String(b[field]));
      return direction === 'desc' ? -cmp : cmp;
    });
  }
}

// controller/UserController.ts
class UserController {
  constructor(private model: UserModel) {}

  async loadUsers(): Promise<void> {
    const res = await fetch('/api/users');
    const users = await res.json();
    this.model.setUsers(users);
  }

  search(query: string): User[] {
    return this.model.getFilteredUsers(query);
  }

  sort(field: keyof User, direction: 'asc' | 'desc'): User[] {
    return this.model.getSortedUsers(field, direction);
  }
}

// view/UserListView.tsx
import { useState, useEffect } from 'react';

function UserListView({ controller }: { controller: UserController }) {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    controller.loadUsers().then(() => {
      setUsers(controller.search(''));
    });
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    setUsers(controller.search(q));
  };

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search users..."
      />
      <ul>
        {users.map(u => (
          <li key={u.id}>{u.name} — {u.email}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Variations

- **MVVM**: ViewModel exposes observable properties that the View binds to directly
- **MVP**: Presenter updates the View imperatively instead of the View observing state
- **Flux/Redux**: Unidirectional data flow with a central dispatcher replacing the Controller

## What Works

- Keep Models pure — no side effects, no DOM references
- Controllers orchestrate but do not know how data is rendered
- Views are thin — receive data and emit events, contain no business rules

## Common Mistakes

- Putting fetch logic inside the View instead of the Controller
- Making the Model aware of framework-specific state management
- Allowing the View to directly mutate Model data

## FAQ

**Q: Does React already handle MVC with hooks and context?**
A: React provides building blocks, not architecture. Hooks manage local state; they do not enforce separation of concerns. MVC adds discipline.

**Q: When should I use Redux instead of MVC?**
A: MVC works well for localized capabilities. For data layer patterns, see [Repository](/patterns/design/repository-pattern-typescript). Redux shines when multiple unrelated components need the same data or when time-travel debugging is valuable.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
