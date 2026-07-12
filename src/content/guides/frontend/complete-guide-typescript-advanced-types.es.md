---
contentType: guides
slug: complete-guide-typescript-advanced-types
title: "Referencia Detallada de TypeScript Advanced Types"
description: "Dominá TypeScript advanced types: conditional types, mapped types, template literal types, infer, distributive types y type-level programming patterns."
metaDescription: "Dominá TypeScript advanced types: conditional types, mapped types, template literal types, infer y distributive types para type-level programming seguro."
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
  metaDescription: "Dominá TypeScript advanced types: conditional types, mapped types, template literal types, infer y distributive types para type-level programming seguro."
  keywords:
    - typescript advanced types
    - conditional types
    - mapped types
    - template literal types
    - infer
    - type-level programming
---

## Introducción

El type system de TypeScript va mucho más allá de interfaces y basic generics. Advanced types como conditional types, mapped types y template literal types te permiten express complex type relationships en compile time. Estos patterns eliminan clases enteras de runtime errors haciendo invalid states unrepresentable. A continuación: conditional types, mapped types, template literal types, `infer`, distributive conditional types y real-world patterns para type-safe APIs, validation y state management.

## Conditional Types

### Conditional types básicos

```typescript
// Conditional types: T extends U ? X : Y
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">;      // true
type B = IsString<42>;           // false
type C = IsString<string | number>; // boolean (distributive)

// Exclude y Extract built on conditional types
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;

type T1 = Exclude<"a" | "b" | "c", "a">;      // "b" | "c"
type T2 = Extract<string | number | boolean, number>; // number

// NonNullable es Exclude<T, null | undefined>
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

// Practical: API response type basado en status code
type ApiResponse<T> =
  T extends 200 ? { status: 200; data: T } :
  T extends 400 ? { status: 400; error: string } :
  T extends 500 ? { status: 500; error: string; retryAfter: number } :
  never;

type SuccessResponse = ApiResponse<200>; // { status: 200; data: 200 }
type ErrorResponse = ApiResponse<400>;   // { status: 400; error: string }
```

## El keyword `infer`

```typescript
// Extraé return type de una function
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type R1 = ReturnType<() => string>;           // string
type R2 = ReturnType<(a: number) => boolean>; // boolean

// Extraé el resolved type de un Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type P1 = Awaited<Promise<string>>;           // string
type P2 = Awaited<Promise<Promise<number>>>;  // number (recursively unwrapped)
type P3 = Awaited<string | Promise<number>>;  // string | number

// Extraé array element type
type ElementOf<T> = T extends (infer E)[] ? E : never;

type E1 = ElementOf<string[]>;      // string
type E2 = ElementOf<number[]>;      // number
type E3 = ElementOf<(1 | 2 | 3)[]>; // 1 | 2 | 3

// Extraé function parameters
type FirstParam<T> = T extends (first: infer P, ...rest: any[]) => any ? P : never;

type FP1 = FirstParam<(a: string, b: number) => void>; // string

// Extraé object value type
type ValueOf<T> = T extends Record<any, infer V> ? V : never;

type V1 = ValueOf<{ a: string; b: number }>; // string | number

// Deep unwrap: obtené el innermost type de nested arrays
type DeepFlatten<T> =
  T extends (infer U)[] ? DeepFlatten<U> : T;

type DF1 = DeepFlatten<string[][][]>; // string
```

## Mapped Types

### Mapped types básicos

```typescript
// Transformá cada property
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

### Key remapping con `as`

```typescript
// Rename keys: camelCase a snake_case
type SnakeCase<S extends string> =
  S extends `${infer T}${infer U}`
    ? `${T}${U extends Uncapitalize<U> ? `_${Lowercase<U>}` : U}`
    : S;

type ToSnakeCase<T> = {
  [K in keyof T as SnakeCase<string & K>]: T[K];
};

type SnakeUser = ToSnakeCase<{ userId: number; firstName: string }>;
// { user_id: number; first_name: string }

// Filtrá keys por value type
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

### Modifiers: `+` y `-`

```typescript
// Remové readonly
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

type MutableUser = Mutable<Readonly<User>>;
// { id: number; name: string; email: string }

// Remové optional
type Required<T> = {
  [K in keyof T]-?: T[K];
};

type RequiredUser = Required<OptionalUser>;
// { id: number; name: string; email: string }
```

## Template Literal Types

```typescript
// String concatenation en el type level
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
// Conditional types distribuyen over unions
type ToArray<T> = T extends any ? T[] : never;

type D1 = ToArray<string | number>;
// string[] | number[] (NOT (string | number)[])

// Prevent distribution con [T]
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;

type D2 = ToArrayNonDist<string | number>;
// (string | number)[]

// Practical: filtrá un union
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
// Definí tus API routes como un type
type ApiRoutes = {
  "GET /users": { params: never; query: { page?: number }; response: User[] };
  "GET /users/:id": { params: { id: string }; query: never; response: User };
  "POST /users": { params: never; body: { name: string; email: string }; response: User };
  "PATCH /users/:id": { params: { id: string }; body: Partial<Pick<User, "name" | "email">>; response: User };
  "DELETE /users/:id": { params: { id: string }; query: never; response: void };
};

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";
type ApiKey = keyof ApiRoutes;

// Extraé method y path del key
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

  // Reemplazá params
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      path = path.replace(`:${key}`, value as string);
    }
  }

  // Appendéa query
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
```

### Branded types para domain safety

```typescript
// Brandéa un type para prevenir mixing
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

// Ahora el compiler previene mixing
function getUser(id: UserId): User { /* ... */ return {} as User; }
function getOrder(id: OrderId): Order { /* ... */ return {} as Order; }

const userId = createUserId("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
const orderId = createUserId("a1b2c3d4-e5f6-7890-abcd-ef1234567890") as unknown as OrderId;

// getUser(orderId); // Error: OrderId is not assignable to UserId
getUser(userId);     // OK
```

## Best Practices

- Usá `infer` para extraer types de generic functions — evitá manual type extraction
- Usá branded types para domain IDs — previene pasar un UserId donde un OrderId se espera
- Usá template literal types para string patterns — CSS properties, event names, route params
- Usá mapped types para transform existing types — no retypeés interfaces manualmente
- Usá distributive conditional types para filtrar unions — `T extends string ? T : never`
- Evitá deeply nested conditional types — se vuelven unreadable. Extraé intermediate types
- Usá `satisfies` operator para type checking sin widening — `const config = { ... } satisfies Config`
- Mantené utility types en un shared file — `types/utils.ts` para reusable type helpers
- Testeá tus types con `expect-type` o `tsd` — verificá que los types resuelvan correctamente
- Documentá complex types con examples en comments — advanced types no son self-documenting

## Common Mistakes

- **Overusar `any` en conditional types**: `T extends any ? X : Y` siempre evalúa a X. Usá specific constraints.
- **Olvidar distributive behavior**: `ToArray<string | number>` da `string[] | number[]`, no `(string | number)[]`. Usá `[T] extends [any]` para prevenir distribution.
- **Circular type references**: `type T = T extends ... ? T : ...` causa infinite recursion. Usá un base case.
- **No usar `as const`**: object literals widening a sus base types. Usá `as const` para literal types.
- **Ignorar `satisfies`**: usar type annotations widening el type. `satisfies` checkea sin widening.

## FAQ

### ¿Qué son conditional types?

Un type-level ternary: `T extends U ? X : Y`. Si `T` extends `U`, el type resuelve a `X`; sino `Y`. Distribuyen over unions, haciéndolos útiles para filtering y transforming types.

### ¿Qué es `infer`?

Un keyword usado dentro de conditional types para extraer un type de un generic. `T extends Promise<infer R> ? R : never` extraé el inner type de un Promise. Es la foundation de `ReturnType`, `Parameters` y `Awaited`.

### ¿Qué son template literal types?

String types constructed en el type level usando backtick syntax. `` `on${Capitalize<Event>}` `` genera `"onClick" | "onHover"`. Habilitan type-safe string patterns como CSS properties, event names y route paths.

### ¿Qué son mapped types?

Types que transforman cada property de un existing type. `{ readonly [K in keyof T]: T[K] }` hace todas las properties readonly. Son la foundation de `Partial`, `Required`, `Readonly` y `Pick`.

### ¿Qué es `satisfies`?

Un TypeScript 4.9+ operator que checkea si un value matchea un type sin widening. `const config = { port: 3000 } satisfies Config` verifica el shape mientras preserva el literal type `3000` en vez de widening a `number`.
