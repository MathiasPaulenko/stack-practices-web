---


contentType: guides
slug: complete-guide-react-19-features
title: "Complete Guide to React 19 Features"
description: "Master React 19 features. Covers server components, use() hook, actions, form actions, useActionState, useOptimistic, useFormStatus, ref as prop, document metadata, asset loading, and React Compiler with practical code examples."
metaDescription: "Master React 19. Covers server components, use() hook, actions, useActionState, useOptimistic, useFormStatus, ref as prop, React Compiler."
difficulty: advanced
topics:
  - frontend
  - performance
  - architecture
tags:
  - react
  - frontend
  - guide
  - react-19
  - server-components
  - actions
  - react-compiler
  - use-hook
relatedResources:
  - /guides/complete-guide-web-performance-core-web-vitals
  - /guides/complete-guide-bundle-size-optimization
  - /guides/complete-guide-css-grid-and-flexbox
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Master React 19. Covers server components, use() hook, actions, useActionState, useOptimistic, useFormStatus, ref as prop, React Compiler."
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

## Introduction

React 19 introduced server components, the `use()` hook, actions, `useActionState`, `useOptimistic`, `useFormStatus`, ref as a prop, document metadata, and the React Compiler. Below is a practical guide to each feature with practical code examples and migration tips.

## Server Components

Server Components run on the server and send HTML to the client. They can access databases, file systems, and internal APIs without shipping that code to the browser.

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
// Mixing server and client components
// app/dashboard/page.tsx — Server Component
import { db } from "@/lib/db";
import { DashboardChart } from "./DashboardChart";

export default async function Dashboard() {
  const stats = await db.getStats();
  
  return (
    <main>
      <h1>Dashboard</h1>
      {/* Pass serializable data to client components */}
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
  - Import and use server-only libraries
  - Pass serializable props to client components
  - Use async/await directly

Server Components CANNOT:
  - Use useState, useEffect, useReducer, or any state hook
  - Use event handlers (onClick, onChange, etc.)
  - Use browser APIs (window, document, localStorage)
  - Import client-only libraries

Client Components CANNOT:
  - Access databases or file systems
  - Use server-only libraries
  - Import server components directly
  - Use async/await in render (use use() instead)

Passing data between them:
  - Server → Client: pass serializable props (strings, numbers, arrays, objects)
  - Client → Server: use server actions or API routes
  - Never pass functions, class instances, or non-serializable data
```

## The use() Hook

`use()` unwraps promises and reads context. Unlike other hooks, `use()` can be called conditionally.

```tsx
import { use } from "react";

// Unwrapping a promise
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

// Parent creates the promise
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
// use() with context — can be called conditionally
import { createContext, use, useContext } from "react";

const ThemeContext = createContext<"light" | "dark">("light");

function ThemedButton({ showTheme }: { showTheme: boolean }) {
  // use() can be called conditionally — useContext cannot
  if (showTheme) {
    const theme = use(ThemeContext);
    return <button className={`btn btn-${theme}`}>Click me ({theme})</button>;
  }
  return <button className="btn">Click me</button>;
}
```

## Actions and Form Actions

Actions replace manual form handling. They work with progressive enhancement — forms work even without JavaScript.

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

// Form using action
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

`useActionState` manages form state — pending, errors, and returned data.

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

`useOptimistic` shows immediate UI updates before the server confirms the change.

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

`useFormStatus` gives child components access to the parent form's pending state.

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

// Usage — SubmitButton is a child of the form
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

In React 19, `ref` is a regular prop — no more `forwardRef`.

```tsx
// React 18 — required forwardRef
// const Input = React.forwardRef<HTMLInputElement, InputProps>(
//   (props, ref) => <input ref={ref} {...props} />
// );

// React 19 — ref is just a prop
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

// Usage
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

React 19 renders `<title>`, `<meta>`, and `<link>` tags anywhere in the component tree.

```tsx
function BlogPost({ post }: { post: { title: string; description: string } }) {
  return (
    <article>
      {/* Document metadata — hoisted to <head> */}
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
// React 19 suspends while assets load
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
      {/* Preload fonts and images */}
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

The React Compiler automatically optimizes re-renders — no more `useMemo` and `useCallback` needed in most cases.

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

## Migration to React 19

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
// Breaking changes to watch for:
// 1. ref is now a prop — remove forwardRef wrappers
// 2. defaultProps removed for function components
// 3. string refs removed
// 4. propTypes removed
// 5. Legacy context removed
// 6. render-return-array now needs keys

// Before: defaultProps
// function Button({ size = "medium" }) { ... }
// Button.defaultProps = { size: "medium" };

// After: default parameters
function Button({ size = "medium" }: { size?: string }) {
  return <button className={`btn btn-${size}`} />;
}
```

## FAQ

### What is the difference between server components and client components?

Server Components execute on the server during SSR or at build time. They can access databases, file systems, and server-only libraries. They ship zero JavaScript to the client. Client Components execute in the browser and can use state, effects, event handlers, and browser APIs. Server Components can render Client Components and pass them serializable props. Client Components cannot import Server Components directly but can call server actions.

### When should I use the use() hook instead of useEffect?

Use `use()` to unwrap promises when you have async data — it integrates with Suspense for loading states. Use `useEffect()` for side effects that need cleanup (subscriptions, event listeners, timers). `use()` can be called conditionally (inside if statements), while `useEffect()` cannot. `use()` pauses rendering until the promise resolves, while `useEffect()` runs after rendering.

### Do I still need useMemo and useCallback with the React Compiler?

In most cases, no. The React Compiler automatically memoizes values and functions based on their dependencies. You can write plain functions and computed values without manual memoization. The compiler analyzes your code at build time and inserts optimizations. However, you may still need `useMemo` for expensive computations in edge cases the compiler cannot optimize, or when working with non-React libraries that require referential stability.

### How do actions differ from onSubmit handlers?

Actions integrate with the HTML form element's native action attribute. They support progressive enhancement — the form works without JavaScript by sending a POST request. Actions handle pending state, errors, and form reset automatically. `onSubmit` is a client-side event handler that requires JavaScript and manual state management. Use actions for forms that submit data, use `onSubmit` for client-side validation or intercepting submissions.

### Can I use React 19 features without a framework?

Server Components require a framework (Next.js, Remix, or a custom RSC setup) because they need server-side rendering infrastructure. Client-side features like `useActionState`, `useOptimistic`, `useFormStatus`, `use()`, and ref-as-prop work in any React 19 app. The React Compiler works with any build setup that supports it. For server actions, you need a server runtime to execute them.

### How do I migrate from forwardRef to ref-as-prop?

Remove the `forwardRef` wrapper and add `ref` to the component's props. Change `React.forwardRef<RefType, Props>((props, ref) => ...)` to `function Component({ ref, ...props }: Props & { ref?: Ref<RefType> })`. The `npx react-codemod` tool can automate this migration. Test that all parent components passing refs still work — the API is backward compatible since `ref` was already being passed, it is just now accessible as a regular prop.

## See Also

- [Complete Guide to React Performance Optimization](/guides/complete-guide-react-performance-optimization/)
- [Complete Guide to Bundle Size Optimization](/guides/complete-guide-bundle-size-optimization/)
- [Complete Guide to Web Performance and Core Web Vitals](/guides/complete-guide-web-performance-core-web-vitals/)
- [SPA Performance: Code Splitting and Lazy Loading](/recipes/spa-code-splitting-lazy/)
- [Complete Guide to LLM Application Architecture](/guides/complete-guide-llm-application-architecture/)

