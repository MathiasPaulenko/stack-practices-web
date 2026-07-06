---
contentType: guides
slug: complete-guide-typescript-advanced-types
title: "Complete Guide to TypeScript Advanced Types"
description: "Master TypeScript advanced types: conditional types, mapped types, template literal types, infer, distributive types, and type-level programming patterns."
metaDescription: "Master TypeScript advanced types: conditional types, mapped types, template literal types, infer, distributive types, and type-level programming patterns for safer code."
difficulty: advanced
topics:
  - frontend
tags:
  - guide
  - typescript
  - advanced-types
  - conditional-types
  - mapped-types
  - type-safety
  - frontend
relatedResources:
  - /guides/frontend/complete-guide-react-server-components
  - /recipes/frontend/typescript-utility-types-generics
  - /recipes/frontend/typescript-discriminated-unions-exhaustive
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Master TypeScript advanced types: conditional types, mapped types, template literal types, infer, distributive types, and type-level programming patterns for safer code."
  keywords:
    - typescript advanced types
    - conditional types
    - mapped types
    - template literal types
    - infer
    - type-level programming
---

## Introduction

TypeScript's type system goes far beyond interfaces and basic generics. Advanced types like conditional types, mapped types, and template literal types let you express complex type relationships at compile time. These patterns eliminate entire classes of runtime errors by making invalid states unrepresentable. This guide covers conditional types, mapped types, template literal types, `infer`, distributive conditional types, and real-world patterns for type-safe APIs, validation, and state management.

## Conditional Types

### Basic conditional types

```typescript
// Conditional types: T extends U ? X : Y
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">;      // true
type B = IsString<42>;           // false
type C = IsString<string | number>; // boolean (distributive)

// Exclude and Extract built on conditional types
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;

type T1 = Exclude<"a" | "b" | "c", "a">;      // "b" | "c"
type T2 = Extract<string | number | boolean, number>; // number

// NonNullable is Exclude<T, null | undefined>
type NonNullable<T> = T extends null | undefined ? never : T;
type T3 = NonNullable<string | null>; // string
```

### Nested conditional types

```typescript
type TypeName<T> =
  T extends string ? "string" :
  T extends number ? "number" :
  T extends boolean ? "boolean" :
  T extends undefined ? "undefined" :
  T extends Function ? "function" :
  "object";

type N1 = TypeName<"hello">;    // "string"
type N2 = TypeName<42>;         // "number"
type N3 = TypeName<() => void>; // "function"
type N4 = TypeName<{ a: 1 }>;   // "object"

// Practical: API response type based on status code
type ApiResponse<T> =
  T extends 200 ? { status: 200; data: T } :
  T extends 400 ? { status: 400; error: string } :
  T extends 500 ? { status: 500; error: string; retryAfter: number } :
  never;

type SuccessResponse = ApiResponse<200>; // { status: 200; data: 200 }
type ErrorResponse = ApiResponse<400>;   // { status: 400; error: string }
```

## The `infer` Keyword

```typescript
// Extract return type of a function
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type R1 = ReturnType<() => string>;           // string
type R2 = ReturnType<(a: number) => boolean>; // boolean

// Extract the resolved type of a Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type P1 = Awaited<Promise<string>>;           // string
type P2 = Awaited<Promise<Promise<number>>>;  // number (recursively unwrapped)
type P3 = Awaited<string | Promise<number>>;  // string | number

// Extract array element type
type ElementOf<T> = T extends (infer E)[] ? E : never;

type E1 = ElementOf<string[]>;      // string
type E2 = ElementOf<number[]>;      // number
type E3 = ElementOf<(1 | 2 | 3)[]>; // 1 | 2 | 3

// Extract function parameters
type FirstParam<T> = T extends (first: infer P, ...rest: any[]) => any ? P : never;

type FP1 = FirstParam<(a: string, b: number) => void>; // string

// Extract object value type
type ValueOf<T> = T extends Record<any, infer V> ? V : never;

type V1 = ValueOf<{ a: string; b: number }>; // string | number

// Deep unwrap: get the innermost type of nested arrays
type DeepFlatten<T> =
  T extends (infer U)[] ? DeepFlatten<U> : T;

type DF1 = DeepFlatten<string[][][]>; // string
```

## Mapped Types

### Basic mapped types

```typescript
// Transform each property
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

type Optional<T> = {
  [K in keyof T]?: T[K];
};

type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

interface User {
  id: number;
  name: string;
  email: string;
}

type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; readonly email: string }

type OptionalUser = Optional<User>;
// { id?: number; name?: string; email?: string }

type NullableUser = Nullable<User>;
// { id: number | null; name: string | null; email: string | null }
```

### Key remapping with `as`

```typescript
// Rename keys: camelCase to snake_case
type SnakeCase<S extends string> =
  S extends `${infer T}${infer U}`
    ? `${T}${U extends Uncapitalize<U> ? `_${Lowercase<U>}` : U}`
    : S;

type ToSnakeCase<T> = {
  [K in keyof T as SnakeCase<string & K>]: T[K];
};

type SnakeUser = ToSnakeCase<{ userId: number; firstName: string }>;
// { user_id: number; first_name: string }

// Filter keys by value type
type StringKeys<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type SK1 = StringKeys<{ id: number; name: string; email: string; active: boolean }>;
// { name: string; email: string }

// Pick specific keys
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

type FunctionsOnly = PickByValue<
  { id: number; onClick: () => void; onChange: (v: string) => void },
  Function
>;
// { onClick: () => void; onChange: (v: string) => void }
```

### Modifiers: `+` and `-`

```typescript
// Remove readonly
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

type MutableUser = Mutable<Readonly<User>>;
// { id: number; name: string; email: string }

// Remove optional
type Required<T> = {
  [K in keyof T]-?: T[K];
};

type RequiredUser = Required<OptionalUser>;
// { id: number; name: string; email: string }
```

## Template Literal Types

```typescript
// String concatenation at the type level
type Greeting = `Hello, ${string}!`;
const g: Greeting = "Hello, World!"; // OK

// Union expansion
type Side = "top" | "right" | "bottom" | "left";
type Margin = `margin-${Side}`;
// "margin-top" | "margin-right" | "margin-bottom" | "margin-left"

type Padding = `padding-${Side}`;
// "padding-top" | "padding-right" | "padding-bottom" | "padding-left"

// CSS property builder
type CSSProperty = `${string}-${string}` | string;

// Event handler types
type EventName = "click" | "hover" | "focus" | "submit";
type EventHandler = `on${Capitalize<EventName>}`;
// "onClick" | "onHover" | "onFocus" | "onSubmit"

// Route parameter extraction
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : {};

type Params = ExtractParams<"/users/:userId/posts/:postId">;
// { userId: string; postId: string }

// Type-safe event emitter
type EventMap = {
  click: { x: number; y: number };
  hover: { target: string };
  submit: { formData: Record<string, string> };
};

type EventKeys = keyof EventMap; // "click" | "hover" | "submit"

class TypedEmitter<T extends Record<string, any>> {
  private handlers: { [K in keyof T]?: ((payload: T[K]) => void)[] } = {};

  on<K extends keyof T>(event: K, handler: (payload: T[K]) => void): void {
    (this.handlers[event] ??= []).push(handler);
  }

  emit<K extends keyof T>(event: K, payload: T[K]): void {
    this.handlers[event]?.forEach((h) => h(payload));
  }
}

const emitter = new TypedEmitter<EventMap>();
emitter.on("click", (e) => console.log(e.x, e.y)); // e is { x: number; y: number }
emitter.emit("click", { x: 10, y: 20 }); // OK
// emitter.emit("click", { target: "btn" }); // Error: missing x, y
```

## Distributive Conditional Types

```typescript
// Conditional types distribute over unions
type ToArray<T> = T extends any ? T[] : never;

type D1 = ToArray<string | number>;
// string[] | number[] (NOT (string | number)[])

// Prevent distribution with [T]
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;

type D2 = ToArrayNonDist<string | number>;
// (string | number)[]

// Practical: filter a union
type OnlyStrings<T> = T extends string ? T : never;

type Strings = OnlyStrings<"a" | "b" | 42 | true | "c">;
// "a" | "b" | "c"

// Deep partial
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

interface Config {
  server: { host: string; port: number };
  database: { url: string; poolSize: number };
  logging: { level: string; format: string };
}

type PartialConfig = DeepPartial<Config>;
// { server?: { host?: string; port?: number }; database?: { url?: string; poolSize?: number }; ... }
```

## Real-World Patterns

### Type-safe API client

```typescript
// Define your API routes as a type
type ApiRoutes = {
  "GET /users": { params: never; query: { page?: number }; response: User[] };
  "GET /users/:id": { params: { id: string }; query: never; response: User };
  "POST /users": { params: never; body: { name: string; email: string }; response: User };
  "PATCH /users/:id": { params: { id: string }; body: Partial<Pick<User, "name" | "email">>; response: User };
  "DELETE /users/:id": { params: { id: string }; query: never; response: void };
};

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";
type ApiKey = keyof ApiRoutes;

// Extract method and path from key
type ExtractMethod<K extends ApiKey> = K extends `${infer M} ${string}` ? M : never;
type ExtractPath<K extends ApiKey> = K extends `${string} ${infer P}` ? P : never;

// Type-safe request function
async function api<K extends ApiKey>(
  key: K,
  options: {
    params?: ApiRoutes[K]["params"] extends never ? never : ApiRoutes[K]["params"];
    query?: ApiRoutes[K]["query"] extends never ? never : ApiRoutes[K]["query"];
    body?: ApiRoutes[K]["body"] extends never ? never : ApiRoutes[K]["body"];
  } = {}
): Promise<ApiRoutes[K]["response"]> {
  const method = key.split(" ")[0] as ApiMethod;
  let path = key.split(" ")[1];

  // Replace params
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      path = path.replace(`:${key}`, value as string);
    }
  }

  // Append query
  if (options.query) {
    const qs = new URLSearchParams(options.query as Record<string, string>).toString();
    path += `?${qs}`;
  }

  const res = await fetch(path, {
    method,
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return res.json();
}

// Usage — fully type-safe
const users = await api("GET /users", { query: { page: 1 } });
// users: User[]

const user = await api("GET /users/:id", { params: { id: "123" } });
// user: User

const created = await api("POST /users", { body: { name: "Alice", email: "alice@example.com" } });
// created: User

// const bad = await api("GET /users/:id", { params: { wrong: "x" } });
// Error: params must have { id: string }
```

### Type-safe state machine

```typescript
type StateMachine<T extends Record<string, { transitions: Record<string, string> }>> = {
  [K in keyof T]: {
    state: K;
    transitions: keyof T[K]["transitions"];
  };
};

type TrafficLight = {
  red: { transitions: { go: "green" } };
  green: { transitions: { warn: "yellow" } };
  yellow: { transitions: { stop: "red" } };
};

type TrafficState = TrafficLight[keyof TrafficLight];
// { state: "red"; transitions: "go" } | { state: "green"; transitions: "warn" } | { state: "yellow"; transitions: "stop" }

class Machine<T extends Record<string, { transitions: Record<string, string> }>> {
  constructor(private current: keyof T, private config: T) {}

  transition(event: T[keyof T]["transitions"] & string): void {
    const stateConfig = this.config[this.current];
    const next = stateConfig.transitions[event];
    if (!next) throw new Error(`Invalid transition: ${event} from ${String(this.current)}`);
    this.current = next as keyof T;
  }

  get state(): keyof T {
    return this.current;
  }
}

const traffic = new Machine("red", {
  red: { transitions: { go: "green" } },
  green: { transitions: { warn: "yellow" } },
  yellow: { transitions: { stop: "red" } },
});

traffic.transition("go");    // red → green
traffic.transition("warn");  // green → yellow
traffic.transition("stop");  // yellow → red
// traffic.transition("go");  // Error from red: valid. But from yellow: runtime error
```

### Branded types for domain safety

```typescript
// Brand a type to prevent mixing
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

type UserId = Brand<string, "UserId">;
type Email = Brand<string, "Email">;
type OrderId = Brand<string, "OrderId">;

// Smart constructors
function createUserId(id: string): UserId {
  if (!id.match(/^[a-f0-9-]{36}$/)) throw new Error("Invalid UUID");
  return id as UserId;
}

function createEmail(email: string): Email {
  if (!email.includes("@")) throw new Error("Invalid email");
  return email as Email;
}

// Now the compiler prevents mixing
function getUser(id: UserId): User { /* ... */ return {} as User; }
function getOrder(id: OrderId): Order { /* ... */ return {} as Order; }

const userId = createUserId("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
const orderId = createUserId("a1b2c3d4-e5f6-7890-abcd-ef1234567890") as unknown as OrderId;

// getUser(orderId); // Error: OrderId is not assignable to UserId
getUser(userId);     // OK
```

## Best Practices

- Use `infer` to extract types from generic functions — avoid manual type extraction
- Use branded types for domain IDs — prevents passing a UserId where an OrderId is expected
- Use template literal types for string patterns — CSS properties, event names, route params
- Use mapped types to transform existing types — don't manually retype interfaces
- Use distributive conditional types to filter unions — `T extends string ? T : never`
- Avoid deeply nested conditional types — they become unreadable. Extract intermediate types
- Use `satisfies` operator for type checking without widening — `const config = { ... } satisfies Config`
- Keep utility types in a shared file — `types/utils.ts` for reusable type helpers
- Test your types with `expect-type` or `tsd` — verify that types resolve correctly
- Document complex types with examples in comments — advanced types are not self-documenting

## Common Mistakes

- **Overusing `any` in conditional types**: `T extends any ? X : Y` always evaluates to X. Use specific constraints.
- **Forgetting distributive behavior**: `ToArray<string | number>` gives `string[] | number[]`, not `(string | number)[]`. Use `[T] extends [any]` to prevent distribution.
- **Circular type references**: `type T = T extends ... ? T : ...` causes infinite recursion. Use a base case.
- **Not using `as const`**: object literals widen to their base types. Use `as const` for literal types.
- **Ignoring `satisfies`**: using type annotations widens the type. `satisfies` checks without widening.

## FAQ

### What are conditional types?

A type-level ternary: `T extends U ? X : Y`. If `T` extends `U`, the type resolves to `X`; otherwise `Y`. They distribute over unions, making them useful for filtering and transforming types.

### What is `infer`?

A keyword used within conditional types to extract a type from a generic. `T extends Promise<infer R> ? R : never` extracts the inner type of a Promise. It's the foundation of `ReturnType`, `Parameters`, and `Awaited`.

### What are template literal types?

String types constructed at the type level using backtick syntax. `` `on${Capitalize<Event>}` `` generates `"onClick" | "onHover"`. They enable type-safe string patterns like CSS properties, event names, and route paths.

### What are mapped types?

Types that transform each property of an existing type. `{ readonly [K in keyof T]: T[K] }` makes all properties readonly. They're the foundation of `Partial`, `Required`, `Readonly`, and `Pick`.

### What is `satisfies`?

A TypeScript 4.9+ operator that checks if a value matches a type without widening it. `const config = { port: 3000 } satisfies Config` verifies the shape while preserving the literal type `3000` instead of widening to `number`.
