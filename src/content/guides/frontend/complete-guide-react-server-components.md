---
contentType: guides
slug: complete-guide-react-server-components
title: "Complete Guide to React Server Components: RSC Architecture"
description: "Master React Server Components: RSC architecture, data loading, streaming, server actions, and client component boundaries in Next.js App Router."
metaDescription: "Master React Server Components: RSC architecture, data loading, streaming, server actions, and client component boundaries in Next.js App Router applications."
difficulty: advanced
topics:
  - frontend
tags:
  - guide
  - react
  - server-components
  - nextjs
  - rsc
  - streaming
  - frontend
relatedResources:
  - /guides/frontend/complete-guide-react-performance-optimization
  - /guides/frontend/complete-guide-react-state-management
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master React Server Components: RSC architecture, data loading, streaming, server actions, and client component boundaries in Next.js App Router applications."
  keywords:
    - react server components
    - rsc
    - nextjs app router
    - server actions
    - streaming
    - react 19
---

## Introduction

React Server Components (RSC) execute on the server and send HTML to the browser instead of JavaScript. They can access databases, file systems, and internal APIs directly without exposing secrets to the client. RSC reduces the JavaScript bundle size and improves initial page load. In Next.js App Router, components are server components by default. This guide covers RSC architecture, data loading patterns, streaming with Suspense, server actions, and the boundary between server and client components.

## How RSC Works

```
Traditional CSR (Client-Side Rendering):
  Browser → downloads JS bundle → executes React → fetches data → renders

RSC (Server Components):
  Server → fetches data → renders React to HTML → streams to browser
  Browser → receives HTML → hydrates only interactive parts (Client Components)

Key differences:
  - Server Components: No useState, no event handlers, no browser APIs
  - Client Components: "use client" directive, full React features
  - Server Components can import Client Components, not vice versa
  - Server Components can access databases, filesystem, env vars directly
```

## Server vs Client Components

### Server Component (default)

```tsx
// app/products/page.tsx — Server Component (default, no directive)
import { db } from "@/lib/db";
import { ProductCard } from "./ProductCard";

// This runs on the server. No "use client" needed.
export default async function ProductsPage() {
  // Direct database access — no API route needed
  const products = await db.product.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="grid grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Client Component

```tsx
// app/products/ProductCard.tsx — Client Component
"use client";

import { useState } from "react";
import { addToCart } from "./actions";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);

  async function handleAddToCart() {
    setIsAdding(true);
    try {
      await addToCart(product.id, quantity);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
      <h3 className="mt-2 font-semibold">{product.name}</h3>
      <p className="text-gray-600">${product.price}</p>
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="px-3 py-1 border rounded"
        >
          -
        </button>
        <span>{quantity}</span>
        <button
          onClick={() => setQuantity((q) => q + 1)}
          className="px-3 py-1 border rounded"
        >
          +
        </button>
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded"
        >
          {isAdding ? "Adding..." : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
```

## Data Loading Patterns

### Parallel data fetching

```tsx
// app/dashboard/page.tsx — Parallel data loading
import { Suspense } from "react";
import { db } from "@/lib/db";

async function UserStats() {
  const stats = await db.user.aggregate({ _count: true, where: { active: true } });
  return <div>Active users: {stats._count}</div>;
}

async function RevenueChart() {
  const revenue = await db.order.aggregate({
    _sum: { total: true },
    where: { status: "completed" },
  });
  return <div>Total revenue: ${revenue._sum.total}</div>;
}

async function RecentOrders() {
  const orders = await db.order.findMany({ take: 10, orderBy: { createdAt: "desc" } });
  return (
    <ul>
      {orders.map((order) => (
        <li key={order.id}>{order.id} — ${order.total}</li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>
      {/* All three fetch in parallel */}
      <Suspense fallback={<div>Loading stats...</div>}>
        <UserStats />
      </Suspense>
      <Suspense fallback={<div>Loading revenue...</div>}>
        <RevenueChart />
      </Suspense>
      <Suspense fallback={<div>Loading orders...</div>}>
        <RecentOrders />
      </Suspense>
    </div>
  );
}
```

### Sequential data fetching with caching

```tsx
// app/blog/[slug]/page.tsx — Sequential with caching
import { notFound } from "next/navigation";
import { cache } from "react";

// Cache the fetch within a single request
const getPost = cache(async (slug: string) => {
  const post = await db.post.findUnique({ where: { slug } });
  if (!post) notFound();
  return post;
});

export default async function BlogPost({ params }: { params: { slug: string } }) {
  // First fetch
  const post = await getPost(params.slug);

  // Second fetch depends on first
  const author = await db.user.findUnique({ where: { id: post.authorId } });
  const comments = await db.comment.findMany({
    where: { postId: post.id },
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <article>
      <h1>{post.title}</h1>
      <p>By {author.name}</p>
      <div>{post.content}</div>
      <section>
        <h2>Comments ({comments.length})</h2>
        {comments.map((comment) => (
          <div key={comment.id}>
            <strong>{comment.author.name}</strong>
            <p>{comment.text}</p>
          </div>
        ))}
      </section>
    </article>
  );
}
```

### Data fetching with revalidation

```tsx
// app/products/page.tsx — ISR with revalidate
export const revalidate = 3600; // Revalidate every hour

async function getProducts() {
  const res = await fetch("https://api.example.com/products", {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export default async function ProductsPage() {
  const products = await getProducts();
  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}

// Dynamic rendering — no cache
export const dynamic = "force-dynamic";

async function getRealtimeData() {
  const res = await fetch("https://api.example.com/live", {
    cache: "no-store",
  });
  return res.json();
}
```

## Streaming with Suspense

```tsx
// app/dashboard/page.tsx — Streaming with Suspense boundaries
import { Suspense } from "react";

// Slow component that takes 2s to load
async function SlowChart() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const data = await fetch("https://api.example.com/chart-data").then((r) => r.json());
  return <Chart data={data} />;
}

// Fast component that loads immediately
async function QuickStats() {
  const data = await db.stats.findFirst();
  return <div>Users: {data.users} | Orders: {data.orders}</div>;
}

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Fast content renders immediately */}
      <Suspense fallback={<div>Loading stats...</div>}>
        <QuickStats />
      </Suspense>

      {/* Slow content streams in after 2s */}
      <Suspense fallback={<div className="animate-pulse h-64 bg-gray-200 rounded" />}>
        <SlowChart />
      </Suspense>
    </div>
  );
}
```

## Server Actions

```tsx
// app/products/actions.ts — Server Actions
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const CreateProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  description: z.string().min(10).max(500),
  image: z.string().url(),
});

export async function createProduct(formData: FormData) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized");
  }

  const parsed = CreateProductSchema.parse({
    name: formData.get("name"),
    price: Number(formData.get("price")),
    description: formData.get("description"),
    image: formData.get("image"),
  });

  await db.product.create({ data: parsed });

  // Revalidate the products page
  revalidatePath("/products");
}

export async function deleteProduct(productId: string) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized");
  }

  await db.product.delete({ where: { id: productId } });
  revalidatePath("/products");
}

// Optimistic update with useActionState
export async function toggleLike(productId: string) {
  const session = await auth();
  if (!session) throw new Error("Login required");

  const existing = await db.like.findFirst({
    where: { productId, userId: session.user.id },
  });

  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
  } else {
    await db.like.create({ data: { productId, userId: session.user.id } });
  }

  revalidatePath(`/products/${productId}`);
}
```

```tsx
// app/products/CreateProductForm.tsx — Using Server Actions in Client Component
"use client";

import { useActionState } from "react";
import { createProduct } from "./actions";

export function CreateProductForm() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        await createProduct(formData);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <input name="name" type="text" placeholder="Product name" required />
      <input name="price" type="number" placeholder="Price" required />
      <textarea name="description" placeholder="Description" required />
      <input name="image" type="url" placeholder="Image URL" required />

      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Product"}
      </button>

      {state?.success && <p className="text-green-600">Product created!</p>}
      {state?.error && <p className="text-red-600">{state.error}</p>}
    </form>
  );
}
```

## Component Boundaries

```
Rules for "use client":
  1. Server Components can import Client Components ✓
  2. Client Components cannot import Server Components ✗
  3. Client Components can receive Server Components as children ✓
  4. Server Components can pass serializable props to Client Components ✓
  5. Server Components cannot pass functions to Client Components ✗
     (except server actions)

Pattern: Server Component wrapper with Client Component children

  // app/layout.tsx (Server Component)
  <ClientProvider>  // Client Component
    <PageContent />  // Server Component passed as children
  </ClientProvider>
```

```tsx
// app/layout.tsx — Server Component passing children to Client Component
import { ThemeProvider } from "./ThemeProvider"; // Client Component
import { Navbar } from "./Navbar"; // Server Component
import { db } from "@/lib/db";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await db.category.findMany(); // Server-side DB query

  return (
    <html>
      <body>
        {/* Client Component wrapping Server Component children */}
        <ThemeProvider>
          <Navbar categories={categories} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Error Handling

```tsx
// app/products/[id]/error.tsx — Error boundary for RSC
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-4 border border-red-300 rounded bg-red-50">
      <h2 className="text-red-800 font-semibold">Something went wrong</h2>
      <p className="text-red-600 text-sm">{error.message}</p>
      <button onClick={reset} className="mt-2 px-4 py-2 bg-red-600 text-white rounded">
        Try again
      </button>
    </div>
  );
}

// app/products/[id]/loading.tsx — Loading UI
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/2" />
      <div className="h-64 bg-gray-200 rounded" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  );
}

// app/products/[id]/not-found.tsx — 404 page
export default function NotFound() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold">Product not found</h1>
      <p className="text-gray-600 mt-2">The product you're looking for doesn't exist.</p>
    </div>
  );
}
```

## Best Practices

- Default to Server Components — only add "use client" when you need interactivity
- Keep client components small — push them to the leaves of the component tree
- Use Suspense for streaming — don't block the entire page on slow data
- Validate input in Server Actions — use Zod or similar for type-safe validation
- Use `revalidatePath` after mutations — keep cached pages fresh
- Pass serializable props only — strings, numbers, arrays, plain objects
- Use `cache()` for deduplication — avoid duplicate queries within a single request
- Co-locate data fetching with the component — RSC eliminates the need for separate API routes
- Use error boundaries per route segment — isolate failures to specific sections
- Set `export const revalidate` for ISR — control how often pages revalidate

## Common Mistakes

- **"use client" at the top of the file**: making everything a client component. Only mark components that need interactivity.
- **Passing non-serializable props**: functions, class instances, or Dates can't cross the server-client boundary. Use server actions for functions.
- **Importing Server Components into Client Components**: this breaks. Pass them as `children` props instead.
- **Not using Suspense**: the entire page waits for the slowest query. Wrap slow components in Suspense.
- **Forgetting to revalidate**: after a server action mutation, the cached page shows stale data. Call `revalidatePath`.

## FAQ

### What are React Server Components?

Components that render on the server and send HTML to the browser. They can access databases, file systems, and internal APIs directly. They don't ship JavaScript to the client, reducing bundle size.

### When should I use "use client"?

When a component needs: `useState`, `useEffect`, event handlers (`onClick`, `onChange`), browser APIs (`window`, `localStorage`), or third-party libraries that depend on client-side React features.

### Can Server Components and Client Components be mixed?

Yes. Server Components can import and render Client Components. Client Components can receive Server Components as `children` props. But Client Components cannot directly import Server Components.

### What are Server Actions?

Functions that run on the server but can be called from Client Components. They replace traditional API routes for form submissions and mutations. Mark them with `"use server"` directive.

### How does streaming work with RSC?

Server Components wrapped in `<Suspense>` stream their HTML as they become ready. Fast components render immediately, and slow components stream in when their data is available. The browser shows fallback UI until the streamed content arrives.
