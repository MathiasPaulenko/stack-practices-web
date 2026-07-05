---
contentType: guides
slug: complete-guide-react-19-features
title: "Guía Completa de React 19 Features"
description: "Dominar React 19 features. Cubre server components, use() hook, actions, form actions, useActionState, useOptimistic, useFormStatus, ref as prop, document metadata, asset loading y React Compiler con ejemplos practicos de codigo."
metaDescription: "Dominar React 19. Cubre server components, use() hook, actions, useActionState, useOptimistic, useFormStatus, ref as prop, React Compiler."
difficulty: advanced
topics:
  - frontend
  - performance
  - architecture
tags:
  - react
  - frontend
  - guia
  - react-19
  - server-components
  - actions
  - react-compiler
  - use-hook
relatedResources:
  - /guides/frontend/complete-guide-web-performance-core-web-vitals
  - /guides/frontend/complete-guide-bundle-size-optimization
  - /guides/frontend/complete-guide-css-grid-and-flexbox
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Dominar React 19. Cubre server components, use() hook, actions, useActionState, useOptimistic, useFormStatus, ref as prop, React Compiler."
  keywords:
    - react 19
    - server components
    - use hook
    - react actions
    - useactionstate
    - useoptimistic
    - react compiler
    - form actions
---

## Introducción

React 19 introdujo server components, el `use()` hook, actions, `useActionState`, `useOptimistic`, `useFormStatus`, ref as a prop, document metadata, y el React Compiler. Esta guia cubre cada feature con practical code examples y migration tips.

## Server Components

Server Components corren en el server y mandan HTML al client. Pueden access databases, file systems, y internal APIs sin shippear ese code al browser.

```tsx
// app/users/page.tsx — Server Component
import { db } from "@/lib/db";

async function getUsers() {
  const users = await db.user.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
  });
  return users;
}

export default async function UsersPage() {
  const users = await getUsers();
  
  return (
    <main>
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.name} — {user.email}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

```tsx
// Mezclando server y client components
// app/dashboard/page.tsx — Server Component
import { db } from "@/lib/db";
import { DashboardChart } from "./DashboardChart";

export default async function Dashboard() {
  const stats = await db.getStats();
  
  return (
    <main>
      <h1>Dashboard</h1>
      {/* Pass serializable data a client components */}
      <DashboardChart data={stats} />
    </main>
  );
}

// app/dashboard/DashboardChart.tsx — Client Component
"use client";

import { useState } from "react";

interface DashboardChartProps {
  data: { label: string; value: number }[];
}

export function DashboardChart({ data }: DashboardChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  
  return (
    <div className="chart">
      {data.map((item, i) => (
        <div
          key={i}
          className="bar"
          style={{ height: `${item.value}%` }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          {hovered === i && <span className="tooltip">{item.value}</span>}
          <span className="label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
```

### Server Component Rules

```text
Server Components CAN:
  - Access databases, file systems, internal APIs
  - Import y use server-only libraries
  - Pass serializable props a client components
  - Use async/await directamente

Server Components CANNOT:
  - Use useState, useEffect, useReducer, o cualquier state hook
  - Use event handlers (onClick, onChange, etc.)
  - Use browser APIs (window, document, localStorage)
  - Import client-only libraries

Client Components CANNOT:
  - Access databases o file systems
  - Use server-only libraries
  - Import server components directamente
  - Use async/await en render (use use() instead)

Passing data entre ellos:
  - Server → Client: pass serializable props (strings, numbers, arrays, objects)
  - Client → Server: usa server actions o API routes
  - Nunca passes functions, class instances, o non-serializable data
```

## The use() Hook

`use()` unwrapea promises y lee context. A diferencia de other hooks, `use()` puede ser called condicionalmente.

```tsx
import { use } from "react";

// Unwrapping un promise
async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`);
  return res.json();
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// Parent crea el promise
function App({ userId }: { userId: string }) {
  const userPromise = getUser(userId);
  
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

```tsx
// use() con context — puede ser called condicionalmente
import { createContext, use, useContext } from "react";

const ThemeContext = createContext<"light" | "dark">("light");

function ThemedButton({ showTheme }: { showTheme: boolean }) {
  // use() puede ser called condicionalmente — useContext no
  if (showTheme) {
    const theme = use(ThemeContext);
    return <button className={`btn btn-${theme}`}>Click me ({theme})</button>;
  }
  return <button className="btn">Click me</button>;
}
```

## Actions y Form Actions

Actions reemplazan manual form handling. Funcionan con progressive enhancement — forms funcionan even sin JavaScript.

```tsx
// Server action
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  
  if (!name || !email) {
    return { error: "Name and email are required" };
  }
  
  await db.user.create({
    data: { name, email },
  });
  
  revalidatePath("/users");
  return { success: true };
}

// Form usando action
function CreateUserForm() {
  return (
    <form action={createUser}>
      <input name="name" type="text" required placeholder="Name" />
      <input name="email" type="email" required placeholder="Email" />
      <button type="submit">Create User</button>
    </form>
  );
}
```

## useActionState

`useActionState` maneja form state — pending, errors, y returned data.

```tsx
import { useActionState } from "react";

interface State {
  error?: string;
  success?: boolean;
}

async function submitForm(prevState: State, formData: FormData): Promise<State> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  
  if (!name || name.length < 2) {
    return { error: "Name must be at least 2 characters" };
  }
  
  if (!email || !email.includes("@")) {
    return { error: "Valid email is required" };
  }
  
  try {
    const res = await fetch("/api/users", {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
      return { error: "Failed to create user" };
    }
    
    return { success: true };
  } catch {
    return { error: "Network error" };
  }
}

function UserForm() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    submitForm,
    {}
  );
  
  return (
    <form action={formAction}>
      <input name="name" type="text" placeholder="Name" />
      <input name="email" type="email" placeholder="Email" />
      
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create User"}
      </button>
      
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p className="success">User created!</p>}
    </form>
  );
}
```

## useOptimistic

`useOptimistic` muestra immediate UI updates antes de que el server confirme el change.

```tsx
import { useOptimistic } from "react";

interface Message {
  id: string;
  text: string;
  sent: boolean;
}

function MessageList({ messages, sendMessage }: {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
}) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: Message) => [
      ...state,
      { ...newMessage, sent: false },
    ]
  );
  
  async function handleSubmit(formData: FormData) {
    const text = formData.get("message") as string;
    const tempId = crypto.randomUUID();
    
    addOptimisticMessage({ id: tempId, text, sent: true });
    await sendMessage(text);
  }
  
  return (
    <div>
      <ul>
        {optimisticMessages.map((msg) => (
          <li key={msg.id} className={msg.sent ? "sent" : "pending"}>
            {msg.text}
            {!msg.sent && <span className="spinner" />}
          </li>
        ))}
      </ul>
      
      <form action={handleSubmit}>
        <input name="message" type="text" required placeholder="Type a message..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

## useFormStatus

`useFormStatus` da child components access al parent form's pending state.

```tsx
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  
  return (
    <button type="submit" disabled={pending}>
      {pending ? (
        <>
          <span className="spinner" /> Submitting...
        </>
      ) : (
        "Submit"
      )}
    </button>
  );
}

// Uso — SubmitButton es un child del form
function ContactForm() {
  return (
    <form action={submitContact}>
      <input name="name" type="text" required />
      <input name="email" type="email" required />
      <SubmitButton />
    </form>
  );
}
```

## ref as a Prop

En React 19, `ref` es un regular prop — no mas `forwardRef`.

```tsx
// React 18 — required forwardRef
// const Input = React.forwardRef<HTMLInputElement, InputProps>(
//   (props, ref) => <input ref={ref} {...props} />
// );

// React 19 — ref es just a prop
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

function Input({ label, ref, ...props }: InputProps) {
  return (
    <label>
      {label && <span className="label">{label}</span>}
      <input ref={ref} {...props} />
    </label>
  );
}

// Uso
function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  
  function focusInput() {
    inputRef.current?.focus();
  }
  
  return (
    <>
      <Input ref={inputRef} label="Name" type="text" />
      <button onClick={focusInput}>Focus input</button>
    </>
  );
}
```

## Document Metadata

React 19 renderiza `<title>`, `<meta>`, y `<link>` tags en cualquier parte del component tree.

```tsx
function BlogPost({ post }: { post: { title: string; description: string } }) {
  return (
    <article>
      {/* Document metadata — hoisted a <head> */}
      <title>{post.title}</title>
      <meta name="description" content={post.description} />
      <meta property="og:title" content={post.title} />
      <meta property="og:description" content={post.description} />
      <link rel="canonical" href={`https://stackpractices.com/blog/${post.slug}`} />
      
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

## Asset Loading

```tsx
// React 19 suspende mientras assets load
import { Suspense } from "react";

function ProfilePhoto({ src }: { src: string }) {
  return (
    <img src={src} alt="Profile" loading="lazy" />
  );
}

// preload assets
function App() {
  return (
    <>
      {/* Preload fonts e images */}
      <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" />
      <link rel="preload" href="/images/hero.webp" as="image" />
      
      <Suspense fallback={<div className="skeleton" />}>
        <ProfilePhoto src="/api/avatar/123" />
      </Suspense>
    </>
  );
}
```

## React Compiler

El React Compiler automaticamente optimiza re-renders — no mas `useMemo` y `useCallback` needed en most cases.

```tsx
// Before — manual memoization
function ProductList({ products }: { products: Product[] }) {
  const sorted = useMemo(
    () => products.sort((a, b) => a.price - b.price),
    [products]
  );
  
  const handleClick = useCallback((id: string) => {
    addToCart(id);
  }, []);
  
  return (
    <ul>
      {sorted.map((p) => (
        <li key={p.id} onClick={() => handleClick(p.id)}>
          {p.name} — ${p.price}
        </li>
      ))}
    </ul>
  );
}

// After — React Compiler handles memoization
function ProductList({ products }: { products: Product[] }) {
  const sorted = products.sort((a, b) => a.price - b.price);
  
  function handleClick(id: string) {
    addToCart(id);
  }
  
  return (
    <ul>
      {sorted.map((p) => (
        <li key={p.id} onClick={() => handleClick(p.id)}>
          {p.name} — ${p.price}
        </li>
      ))}
    </ul>
  );
}
```

```json
{
  "compilerOptions": {
    "reactCompiler": true
  }
}
```

```bash
# Install React Compiler ESLint plugin
npm install -D eslint-plugin-react-compiler

# eslint.config.js
// {
//   plugins: ["react-compiler"],
//   rules: { "react-compiler/react-compiler": "error" }
// }
```

## Migration a React 19

```bash
# Upgrade
npm install react@19 react-dom@19

# Update types
npm install -D @types/react@19 @types/react-dom@19

# Code mods
npx react-codemod@latest

# Specific transforms
npx react-codemod@latest replace-useformstatus
npx react-codemod@latest replace-useoptimistic
npx react-codemod@latest replace-use-form-state
```

```tsx
// Breaking changes a watch para:
// 1. ref es ahora un prop — remove forwardRef wrappers
// 2. defaultProps removed para function components
// 3. string refs removed
// 4. propTypes removed
// 5. Legacy context removed
// 6. render-return-array ahora necesita keys

// Before: defaultProps
// function Button({ size = "medium" }) { ... }
// Button.defaultProps = { size: "medium" };

// After: default parameters
function Button({ size = "medium" }: { size?: string }) {
  return <button className={`btn btn-${size}`} />;
}
```

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre server components y client components?

Server Components ejecutan en el server durante SSR o at build time. Pueden access databases, file systems, y server-only libraries. Shippean zero JavaScript al client. Client Components ejecutan en el browser y pueden usar state, effects, event handlers, y browser APIs. Server Components pueden render Client Components y pasarles serializable props. Client Components no pueden importar Server Components directamente pero pueden llamar server actions.

### ¿Cuándo deberia usar el use() hook en vez de useEffect?

Usa `use()` para unwrapeear promises cuando tenes async data — integra con Suspense para loading states. Usa `useEffect()` para side effects que necesitan cleanup (subscriptions, event listeners, timers). `use()` puede ser called condicionalmente (dentro de if statements), mientras `useEffect()` no. `use()` pausa rendering hasta que el promise resuelve, mientras `useEffect()` corre despues de rendering.

### ¿Necesito todavia useMemo y useCallback con el React Compiler?

En most cases, no. El React Compiler automaticamente memoiza values y functions basado en sus dependencies. Podes escribir plain functions y computed values sin manual memoization. El compiler analiza tu code at build time e inserta optimizations. Sin embargo, podes todavia necesitar `useMemo` para expensive computations en edge cases que el compiler no puede optimizar, o cuando trabajas con non-React libraries que requieren referential stability.

### ¿Cómo diferieren actions de onSubmit handlers?

Actions integran con el HTML form element's native action attribute. Soportan progressive enhancement — el form funciona sin JavaScript mandando un POST request. Actions handle pending state, errors, y form reset automaticamente. `onSubmit` es un client-side event handler que requiere JavaScript y manual state management. Usa actions para forms que submittean data, usa `onSubmit` para client-side validation o intercepting submissions.

### ¿Puedo usar React 19 features sin un framework?

Server Components requieren un framework (Next.js, Remix, o un custom RSC setup) porque necesitan server-side rendering infrastructure. Client-side features como `useActionState`, `useOptimistic`, `useFormStatus`, `use()`, y ref-as-prop funcionan en cualquier React 19 app. El React Compiler funciona con cualquier build setup que lo soporte. Para server actions, necesitas un server runtime para ejecutarlos.

### ¿Cómo migro de forwardRef a ref-as-prop?

Remove el `forwardRef` wrapper y add `ref` al component's props. Cambia `React.forwardRef<RefType, Props>((props, ref) => ...)` a `function Component({ ref, ...props }: Props & { ref?: Ref<RefType> })`. El `npx react-codemod` tool puede automatizar esta migration. Testea que todos los parent components passing refs todavia funcionen — el API es backward compatible ya que `ref` ya estaba siendo passed, es just ahora accessible como un regular prop.
