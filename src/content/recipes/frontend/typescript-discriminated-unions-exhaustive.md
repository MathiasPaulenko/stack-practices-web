---
contentType: recipes
slug: typescript-discriminated-unions-exhaustive
title: "Exhaustive Type Checking with Discriminated Unions"
description: "How to use TypeScript discriminated unions for exhaustive type checking, ensuring all cases are handled at compile time with never type assertions."
metaDescription: "Use TypeScript discriminated unions for exhaustive type checking. Ensure all cases are handled at compile time with never type assertions and switch statements."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - typescript
  - discriminated-unions
  - type-safety
  - exhaustiveness
  - recipe
relatedResources:
  - /recipes/frontend/typescript-utility-types-generics
  - /recipes/frontend/react-usememo-usecallback-performance
  - /recipes/frontend/react-form-react-hook-form-validation
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use TypeScript discriminated unions for exhaustive type checking. Ensure all cases are handled at compile time with never type assertions and switch statements."
  keywords:
    - frontend
    - typescript
    - discriminated-unions
    - type-safety
    - exhaustiveness
    - recipe
---

## Overview

Discriminated unions in TypeScript combine multiple object types that share a common literal property (the discriminant). When you switch on the discriminant, TypeScript narrows the type to the matching branch. By adding a `never` check in the default case, you get a compile-time error if a new variant is added but not handled — this is exhaustive type checking.

## When to Use

- State machines (idle, loading, success, error) where each state has different data
- Action types in reducers (Redux, useReducer) where each action carries different payloads
- API response handling (success with data, error with message, loading with progress)
- Form validation states (valid, invalid with errors, pending)
- Event handling where different events carry different payloads

## When NOT to Use

- Simple boolean states — `isLoading: boolean` is sufficient, no need for a union
- Optional chaining scenarios — if you just need `data?.value`, a union adds complexity
- Runtime type checking — discriminated unions are compile-time only; use Zod or io-ts for runtime validation

## Solution

### Basic discriminated union

```typescript
type Result<T, E = Error> =
  | { status: "success"; data: T }
  | { status: "error"; error: E }
  | { status: "loading" };

function handleResult(result: Result<string>): string {
  switch (result.status) {
    case "success":
      return result.data.toUpperCase();
    case "error":
      return result.error.message;
    case "loading":
      return "Loading...";
  }
}
```

TypeScript narrows `result` to the matching type in each case branch, so `result.data` is only accessible in the `success` case.

### Exhaustive checking with never

```typescript
type Result<T, E = Error> =
  | { status: "success"; data: T }
  | { status: "error"; error: E }
  | { status: "loading" };

function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

function handleResult(result: Result<string>): string {
  switch (result.status) {
    case "success":
      return result.data.toUpperCase();
    case "error":
      return result.error.message;
    case "loading":
      return "Loading...";
    default:
      return assertNever(result);
  }
}
```

If you add a new variant `{ status: "idle" }` to the union without adding a case, TypeScript errors on `assertNever(result)` because `result` is no longer `never` — it's `{ status: "idle" }`.

### State machine pattern

```typescript
type FetchState<T> =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; data: T }
  | { state: "error"; error: string };

type FetchAction<T> =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: T }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "RESET" };

function fetchReducer<T>(state: FetchState<T>, action: FetchAction<T>): FetchState<T> {
  switch (action.type) {
    case "FETCH_START":
      return { state: "loading" };
    case "FETCH_SUCCESS":
      return { state: "success", data: action.payload };
    case "FETCH_ERROR":
      return { state: "error", error: action.payload };
    case "RESET":
      return { state: "idle" };
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unhandled action: ${_exhaustive}`);
    }
  }
}
```

### Using discriminated unions with React

```tsx
import { useReducer, useEffect } from "react";

type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

type AsyncAction<T> =
  | { type: "start" }
  | { type: "success"; data: T }
  | { type: "error"; error: string };

function asyncReducer<T>(state: AsyncState<T>, action: AsyncAction<T>): AsyncState<T> {
  switch (action.type) {
    case "start":
      return { status: "loading" };
    case "success":
      return { status: "success", data: action.data };
    case "error":
      return { status: "error", error: action.error };
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unhandled action: ${_exhaustive}`);
    }
  }
}

function useAsync<T>(fn: () => Promise<T>) {
  const [state, dispatch] = useReducer(asyncReducer<T>, { status: "idle" });

  useEffect(() => {
    dispatch({ type: "start" });
    fn()
      .then((data) => dispatch({ type: "success", data }))
      .catch((error) => dispatch({ type: "error", error: String(error) }));
  }, [fn]);

  return state;
}

function UserProfile() {
  const state = useAsync(() => fetch("/api/user").then((r) => r.json()));

  switch (state.status) {
    case "idle":
      return <div>Click to load</div>;
    case "loading":
      return <div>Loading...</div>;
    case "success":
      return <div>{state.data.name}</div>;
    case "error":
      return <div>Error: {state.error}</div>;
    default: {
      const _exhaustive: never = state;
      return <div>Unknown state</div>;
    }
  }
}
```

### Discriminated union with shared properties

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "rectangle"; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
    case "rectangle":
      return shape.width * shape.height;
    default: {
      const _exhaustive: never = shape;
      throw new Error(`Unknown shape: ${_exhaustive}`);
    }
  }
}
```

### Using the `satisfies` operator (TypeScript 4.9+)

```typescript
type EventMap =
  | { type: "click"; x: number; y: number }
  | { type: "scroll"; scrollTop: number }
  | { type: "input"; value: string };

const handler = {
  click: (e: { x: number; y: number }) => console.log(`Clicked at ${e.x}, ${e.y}`),
  scroll: (e: { scrollTop: number }) => console.log(`Scrolled to ${e.scrollTop}`),
  input: (e: { value: string }) => console.log(`Input: ${e.value}`),
} satisfies Record<EventMap["type"], (e: any) => void>;
```

### Exhaustive checking with if-else

```typescript
function handleEvent(event: EventMap): void {
  if (event.type === "click") {
    console.log(`Clicked at ${event.x}, ${event.y}`);
  } else if (event.type === "scroll") {
    console.log(`Scrolled to ${event.scrollTop}`);
  } else if (event.type === "input") {
    console.log(`Input: ${event.value}`);
  } else {
    const _exhaustive: never = event;
    throw new Error(`Unhandled event: ${_exhaustive}`);
  }
}
```

### Discriminated union with optional fields

```typescript
type ApiResponse<T> =
  | { status: 200; data: T; cached?: boolean }
  | { status: 404; error: string }
  | { status: 500; error: string; stack?: string };

function processResponse<T>(response: ApiResponse<T>): T | null {
  switch (response.status) {
    case 200:
      console.log(response.cached ? "From cache" : "Fresh data");
      return response.data;
    case 404:
      console.error("Not found:", response.error);
      return null;
    case 500:
      console.error("Server error:", response.error);
      if (response.stack) console.error("Stack:", response.stack);
      return null;
    default: {
      const _exhaustive: never = response;
      throw new Error(`Unhandled status: ${_exhaustive}`);
    }
  }
}
```

## Variants

### Using discriminated unions with Zod for runtime validation

```typescript
import { z } from "zod";

const EventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("scroll"), scrollTop: z.number() }),
  z.object({ type: z.literal("input"), value: z.string() }),
]);

type Event = z.infer<typeof EventSchema>;

function handleEvent(event: unknown) {
  const parsed = EventSchema.parse(event); // Runtime validation
  // parsed is now typed as the discriminated union
  switch (parsed.type) {
    case "click":
      console.log(parsed.x, parsed.y);
      break;
    case "scroll":
      console.log(parsed.scrollTop);
      break;
    case "input":
      console.log(parsed.value);
      break;
    default: {
      const _exhaustive: never = parsed;
      throw new Error(`Unhandled: ${_exhaustive}`);
    }
  }
}
```

### Using discriminated unions with arrays

```typescript
type Task =
  | { status: "pending"; id: string; createdAt: Date }
  | { status: "in-progress"; id: string; startedAt: Date }
  | { status: "done"; id: string; completedAt: Date; result: string };

function getActiveTasks(tasks: Task[]): Task[] {
  return tasks.filter(
    (task): task is Extract<Task, { status: "in-progress" }> =>
      task.status === "in-progress"
  );
}

function summarizeTasks(tasks: Task[]): string {
  const pending = tasks.filter((t) => t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;
  const done = tasks.filter((t) => t.status === "done").length;
  return `${pending} pending, ${inProgress} in progress, ${done} done`;
}
```

## Best Practices

- Always add a `default` case with `never` assertion — this catches missing cases at compile time
- Use a single discriminant property name across all variants (`status`, `type`, `kind`)
- Use string literals for discriminants, not numbers — they're more readable in error messages
- Keep the discriminant as the first property in the type for readability
- Use `satisfies` to ensure an object covers all union variants without losing type information
- Combine with Zod for runtime validation at API boundaries — discriminated unions are compile-time only

## Common Mistakes

- **Forgetting the `never` check**: without `assertNever`, adding a new variant doesn't produce a compile error — the switch silently falls through.
- **Using non-literal discriminants**: `status: string` instead of `status: "success"` — TypeScript can't narrow on arbitrary strings.
- **Not using `break` or `return` in switch cases**: fall-through causes runtime bugs even when types are correct.
- **Mixing discriminant property names**: `{ type: "a" } | { kind: "b" }` — TypeScript can't narrow because there's no common discriminant.
- **Not handling the `never` case in if-else chains**: the same exhaustiveness issue applies to if-else as to switch.

## FAQ

### What is the `never` type?

`never` is the type of values that never occur. In exhaustive checking, after all cases are handled, the remaining type is `never`. If a new variant is added, the remaining type is no longer `never`, causing a type error.

### Can I use discriminated unions with enums?

Yes, but string literals are preferred. Enums add indirection and don't tree-shake well. Use `type Status = "idle" | "loading" | "success" | "error"` instead of an enum.

### What happens if I don't add the `never` check?

TypeScript doesn't error — the switch just doesn't have a case for the new variant. The function might return `undefined` or fall through to the wrong branch. The `never` check is what makes it exhaustive.

### Can I use discriminated unions with generics?

Yes. The generic parameter is preserved through the narrowing:

```typescript
type Box<T> = { kind: "some"; value: T } | { kind: "none" };

function unwrap<T>(box: Box<T>): T | null {
  return box.kind === "some" ? box.value : null;
}
```

### How do discriminated unions differ from regular unions?

Regular unions (`string | number`) don't have a discriminant property. TypeScript narrows them with `typeof` checks. Discriminated unions have a common literal property that TypeScript narrows on with equality checks — this is more ergonomic and supports richer types.
