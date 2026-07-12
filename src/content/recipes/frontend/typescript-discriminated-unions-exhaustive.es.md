---




contentType: recipes
slug: typescript-discriminated-unions-exhaustive
title: "Type Checking Exhaustivo con Discriminated Unions"
description: "Cómo usar discriminated unions de TypeScript para type checking exhaustivo, asegurando que todos los casos se manejen en compile time con aserciones de tipo never."
metaDescription: "Usa discriminated unions de TypeScript para type checking exhaustivo. Asegura que todos los casos se manejen en compile time con aserciones never y switch."
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
  - /recipes/typescript-utility-types-generics
  - /recipes/react-usememo-usecallback-performance
  - /recipes/react-form-react-hook-form-validation
  - /recipes/css-custom-properties-design-tokens
  - /guides/complete-guide-typescript-advanced-types
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa discriminated unions de TypeScript para type checking exhaustivo. Asegura que todos los casos se manejen en compile time con aserciones never y switch."
  keywords:
    - frontend
    - typescript
    - discriminated-unions
    - type-safety
    - exhaustiveness
    - recipe




---

## Overview

Discriminated unions en TypeScript combinan múltiples object types que comparten una propiedad literal común (el discriminante). Cuando haces switch sobre el discriminante, TypeScript narrowea el tipo al branch que coincide. Al agregar un check de `never` en el case default, obtienes un error de compile time si se agrega una nueva variante pero no se maneja — esto es type checking exhaustivo.

## When to Use

- State machines (idle, loading, success, error) donde cada estado tiene datos diferentes
- Action types en reducers (Redux, useReducer) donde cada action lleva payloads diferentes
- Handling de API responses (success con data, error con message, loading con progress)
- Estados de validación de formularios (valid, invalid con errors, pending)
- Event handling donde diferentes eventos llevan payloads diferentes

## When NOT to Use

- Estados booleanos simples — `isLoading: boolean` es suficiente, no hace falta un union
- Escenarios de optional chaining — si solo necesitas `data?.value`, un union añade complejidad
- Type checking en runtime — discriminated unions son solo compile time; usa Zod o io-ts para runtime validation

## Solution

### Discriminated union básico

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

TypeScript narrowea `result` al tipo que coincide en cada case branch, así que `result.data` solo es accesible en el case `success`.

### Checking exhaustivo con never

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

Si agregas una nueva variante `{ status: "idle" }` al union sin agregar un case, TypeScript errora en `assertNever(result)` porque `result` ya no es `never` — es `{ status: "idle" }`.

### Patrón de state machine

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

### Usar discriminated unions con React

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

### Discriminated union con propiedades compartidas

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

### Usar el operador `satisfies` (TypeScript 4.9+)

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

### Checking exhaustivo con if-else

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

### Discriminated union con campos opcionales

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

### Usar discriminated unions con Zod para runtime validation

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
  // parsed ahora está tipado como el discriminated union
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

### Usar discriminated unions con arrays

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


- For a deeper guide, see [Complete Guide to TypeScript Advanced Types](/es/guides/complete-guide-typescript-advanced-types/).

- Siempre agrega un case `default` con aserción `never` — esto atrapa cases faltantes en compile time
- Usa un solo nombre de propiedad discriminante a través de todas las variantes (`status`, `type`, `kind`)
- Usa string literals para discriminantes, no numbers — son más legibles en error messages
- Mantén el discriminante como la primera propiedad en el tipo para legibilidad
- Usa `satisfies` para asegurar que un objeto cubre todas las variantes del union sin perder type information
- Combina con Zod para runtime validation en boundaries de API — discriminated unions son solo compile time

## Common Mistakes

- **Olvidar el check de `never`**: sin `assertNever`, agregar una nueva variante no produce un compile error — el switch cae silenciosamente.
- **Usar discriminantes non-literal**: `status: string` en lugar de `status: "success"` — TypeScript no puede narrowear en strings arbitrarios.
- **No usar `break` o `return` en switch cases**: fall-through causa bugs de runtime incluso cuando los tipos son correctos.
- **Mezclar nombres de propiedad discriminante**: `{ type: "a" } | { kind: "b" }` — TypeScript no puede narrowear porque no hay un discriminante común.
- **No manejar el case `never` en cadenas if-else**: el mismo issue de exhaustiveness aplica a if-else que a switch.

## FAQ

### ¿Qué es el tipo `never`?

`never` es el tipo de valores que nunca ocurren. En checking exhaustivo, después de que todos los cases se manejan, el tipo restante es `never`. Si se agrega una nueva variante, el tipo restante ya no es `never`, causando un type error.

### ¿Puedo usar discriminated unions con enums?

Sí, pero los string literals son preferidos. Los enums añaden indirection y no tree-shakean bien. Usa `type Status = "idle" | "loading" | "success" | "error"` en lugar de un enum.

### ¿Qué pasa si no agrego el check de `never`?

TypeScript no errora — el switch simplemente no tiene un case para la nueva variante. La función podría retornar `undefined` o caer al branch equivocado. El check de `never` es lo que lo hace exhaustivo.

### ¿Puedo usar discriminated unions con generics?

Sí. El parámetro generic se preserva a través del narrowing:

```typescript
type Box<T> = { kind: "some"; value: T } | { kind: "none" };

function unwrap<T>(box: Box<T>): T | null {
  return box.kind === "some" ? box.value : null;
}
```

### ¿Cómo se diferencian discriminated unions de regular unions?

Regular unions (`string | number`) no tienen una propiedad discriminante. TypeScript los narrowea con checks de `typeof`. Discriminated unions tienen una propiedad literal común sobre la que TypeScript narrowea con checks de igualdad — esto es más ergonomic y soporta tipos más ricos.
