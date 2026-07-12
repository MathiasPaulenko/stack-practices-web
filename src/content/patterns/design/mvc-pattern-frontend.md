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
  - /patterns/repository-pattern-typescript
  - /patterns/decorator-pattern-pipeline
  - /guides/testing-strategy-guide
  - /recipes/server-side-rendering
  - /recipes/websockets-realtime
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

### Vue Example

```vue
<!-- view/UserListView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { UserController, UserModel } from './userMVC';

const model = new UserModel();
const controller = new UserController(model);
const users = ref<User[]>([]);
const query = ref('');

onMounted(async () => {
  await controller.loadUsers();
  users.value = controller.search('');
});

const handleSearch = (q: string) => {
  query.value = q;
  users.value = controller.search(q);
};
</script>

<template>
  <div>
    <input
      type="search"
      v-model="query"
      @input="handleSearch(query)"
      placeholder="Search users..."
    />
    <ul>
      <li v-for="u in users" :key="u.id">{{ u.name }} — {{ u.email }}</li>
    </ul>
  </div>
</template>
```

The same Model and Controller work unchanged. Only the View differs, which is the point of separating concerns.

## Variations

- **MVVM**: ViewModel exposes observable properties that the View binds to directly
- **MVP**: Presenter updates the View imperatively instead of the View observing state
- **Flux/Redux**: Unidirectional data flow with a central dispatcher replacing the Controller
- **MVU (Model-View-Update)**: Popular in Elm. A pure update function produces a new Model from messages, and the View renders from the current Model. No mutable state.

## What Works

- Keep Models pure — no side effects, no DOM references
- Controllers orchestrate but do not know how data is rendered
- Views are thin — receive data and emit events, contain no business rules

## How It Works

The Model owns data shape and business rules. It knows how to filter, sort, validate, and relate entities, but it has no knowledge of React, Vue, or the DOM. Keeping Models pure makes them trivial to unit test with plain data.

The Controller owns user intent and coordination. It decides when to fetch data, which Model methods to call, and what to do with the results. The Controller may hold references to services, repositories, or other controllers, but it does not import JSX or templates.

The View owns presentation. It receives data, renders markup, and forwards events. Views stay thin: they call controller methods on user input and re-render when state changes. Framework hooks live here, but only for local UI state such as focus, hover, or animation.

## Best Practices

- Keep Models framework-agnostic. They should compile without React or Vue imports.
- Prefer immutable updates inside Models so changes are predictable and cheap to compare.
- Inject dependencies into Controllers instead of constructing them inside. This simplifies testing and swapping implementations.
- Use a dedicated service or repository layer for network calls. Controllers orchestrate services; they should not contain raw fetch boilerplate everywhere.
- Keep Views stateless when possible. Local state is fine for UI-only concerns, but domain state belongs in the Model.
- Test each layer in isolation. Models need only sample data, controllers need mocked Models, and Views need stubbed controllers.
- Document the public interface of each layer so teammates know where to add new behavior.

## Common Mistakes

- Putting fetch logic inside the View instead of the Controller or a service layer.
- Mutating Model state directly from a View, bypassing Controller methods.
- Making the Model depend on framework-specific state management or lifecycle hooks.
- Creating anemic Models that are just bags of data with no behavior.
- Allowing Controllers to grow into god objects that handle UI, routing, validation, and persistence.
- Skipping layer tests because "it is easier to test the whole component."
- Mixing routing logic with business logic in Controllers or Views.
- Ignoring loading, error, and empty states when the Controller fetches data asynchronously.
- Putting validation only in the UI while the Model accepts any value.
- Coupling Controllers to specific View implementations instead of treating them as thin consumers.

## FAQ

### Does React already handle MVC with hooks and context?

React provides building blocks, not architecture. Hooks manage local state; they do not enforce separation of concerns. MVC adds discipline by deciding where domain logic, coordination, and presentation live.

### When should I use Redux instead of MVC?

MVC works well for localized capabilities. For data layer patterns, see [Repository](/patterns/design/repository-pattern-typescript). Redux shines when multiple unrelated components need the same data or when time-travel debugging is valuable.

### How do I handle async operations in MVC?

Controllers handle async operations. Use async/await in controller methods and update the Model with results. The View shows loading and error states while the Controller fetches data.

**Q: Should Models be plain classes or framework state?**
A: Prefer plain classes or simple data structures. Framework state belongs in Views or state libraries. Pure Models are easier to test and reuse outside the UI layer.

**Q: How do I test MVC layers independently?**
A: Test Models with plain data and assertions. Test Controllers with mocked Models and services. Test Views with stubbed controllers and fake user events. Each layer should be testable without the others.

**Q: Where does routing belong in MVC?**
A: Routing is a separate concern. Controllers may react to route parameters, but route parsing and navigation belong in a router layer. Keep URL logic out of Models and business logic out of the router.

**Q: Can I use MVC with TypeScript?**
A: Yes. TypeScript strengthens the pattern by typing Model fields, Controller interfaces, and View props. Strong types make it obvious when a layer leaks into another.

**Q: How do I handle forms and validation?**
A: Validation rules live in the Model. The View calls controller methods on input changes, and the Controller asks the Model whether the data is valid. Error messages flow back to the View through the Controller.

**Q: Should the View call the API directly?**
A: No. API calls belong in services or repositories. The View forwards events to the Controller, which coordinates the service call and updates the Model.

**Q: How do I share state between unrelated components?**
A: Lift shared state into a higher-level Controller or use a state management library. MVC does not forbid shared stores; it just asks you to keep domain logic out of Views.

**Q: Where do side effects belong?**
A: Side effects such as fetch, timers, or storage access belong in services or controllers. Models should remain pure, and Views should avoid side effects beyond rendering.

**Q: How do I handle errors?**
A: Controllers catch errors from services and update a Model field or return a result type. Views render the error state. Keep error handling out of raw UI event handlers.

**Q: Can MVC work with SSR?**
A: Yes. Models can be populated on the server, Controllers can be instantiated per request, and Views can render from initial props. Just avoid referencing browser-only APIs in Models.

**Q: How do I keep Models in sync with server state?**
A: Use a repository or service layer for fetching and caching. The Controller refreshes the Model when needed. For complex sync, consider optimistic updates, invalidation, or real-time subscriptions handled by the Controller.

**Q: When should I split a Controller?**
A: Split a Controller when it handles multiple unrelated workflows, when it becomes hard to test, or when different Views need different coordination logic. Smaller, focused controllers are easier to reason about.

**Q: How does MVC work with Vue.js?**
A: Vue components are Views. Use a reactive store or class as the Model, and a plain TypeScript module as the Controller. Vue's composition API maps well: `ref` and `reactive` hold View state, while computed properties derive from Model data.

**Q: Can I use MVC with micro-frontends?**
A: Yes. Each micro-frontend can have its own MVC triad. Share Models through a common data contract or event bus. Keep Controllers scoped to each micro-frontend to avoid coupling across boundaries.

**Q: How do I handle real-time updates with WebSockets?**
A: The Controller subscribes to WebSocket events and updates the Model. The View reacts to Model changes through normal re-rendering. Keep the WebSocket connection in a service layer, not in the View or Model.

**Q: Should I use MVC for every component?**
A: No. Simple presentational components that receive props and emit events do not need MVC. Apply the pattern when a component accumulates business logic, multiple data sources, or complex user interactions.

**Q: How do I handle undo/redo in MVC?**
A: The Model stores a history stack of states. The Controller calls `undo()` and `redo()` methods on the Model. The View re-renders from the current Model state. Keep undo logic out of the View entirely.

**Q: How does MVC compare to MVU (Model-View-Update)?**
A: MVU enforces immutability and a single update function, while MVC allows mutable Models and multiple Controller methods. MVU is more rigid but easier to reason about. MVC is more flexible but requires discipline to keep layers clean.

**Q: Can I mix MVC with React Context?**
A: Yes. Use Context to provide Controllers or services to the View tree. The Controller instance lives in a provider, and Views consume it via `useContext`. Keep the Model outside Context unless you need cross-tree state sharing.

**Q: How do I handle pagination in MVC?**
A: The Model tracks current page, page size, and total items. The Controller calls `nextPage()` or `goToPage(n)` on the Model and fetches data from the service. The View renders pagination controls and reads the current page from the Model.

**Q: What about dependency injection in frontend MVC?**
A: Pass services and repositories through Controller constructors. In React, use Context or a DI container to provide instances. In Vue, use `provide`/`inject`. This makes Controllers testable with mocked dependencies.

**Q: How do I handle optimistic updates?**
A: The Controller applies the change to the Model immediately, then sends the request. If the request fails, the Controller reverts the Model to its previous state. The View re-renders from the Model on every change.

**Q: Can MVC work with GraphQL?**
A: Yes. Wrap GraphQL queries and mutations in a service layer. The Controller calls the service and updates the Model with the response. Subscriptions go through the Controller, which pushes updates to the Model.

**Q: How do I handle authentication in MVC?**
A: Keep auth tokens and session state in a dedicated AuthService. Controllers check auth state before performing operations. Views show login prompts when the Controller signals unauthenticated state. Do not store tokens in the Model.

**Q: How do I handle internationalization (i18n)?**
A: Translation strings belong in a separate i18n service. The View calls the service for translated labels. The Model stores data in a locale-independent format. The Controller may trigger locale changes and refresh the View.

**Q: How do I handle animations in MVC?**
A: Animation logic belongs in the View. The Model and Controller should not know about transitions or motion. If an animation depends on data state, the View reads the state and decides how to animate.

**Q: How do I handle file uploads in MVC?**
A: The View captures the file input event and forwards it to the Controller. The Controller calls an upload service and tracks progress on the Model. The View renders a progress bar from the Model's upload state.

**Q: Can I use MVC with server components?**
A: Server components blur the line. Treat server components as View + Controller combined: they fetch data and render. Keep business logic in shared Model modules that work on both server and client. Avoid importing server-only code in Models.

**Q: How do I handle caching in MVC?**
A: Caching belongs in the service or repository layer. The Controller asks the service for data, and the service decides whether to return cached or fresh data. The Model receives whatever the service returns. Keep cache invalidation logic in the service.

**Q: How do I handle accessibility in MVC?**
A: Accessibility concerns live in the View. ARIA attributes, keyboard navigation, and focus management are presentation details. The Model and Controller should not know about accessibility requirements.

**Q: How do I handle offline support?**
A: A service layer detects offline state and queues operations. The Controller sends operations to the service, which stores them for later sync. The Model reflects the optimistic state. When connectivity returns, the service flushes the queue.
