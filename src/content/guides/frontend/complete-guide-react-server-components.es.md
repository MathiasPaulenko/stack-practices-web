---
contentType: guides
slug: complete-guide-react-server-components
title: "Referencia Detallada de React Server Components: Arquitectura RSC"
description: "Dominá React Server Components: arquitectura RSC, data loading, streaming, server actions y client component boundaries en Next.js App Router."
metaDescription: "Dominá React Server Components: arquitectura RSC, data loading, streaming, server actions y client component boundaries en Next.js App Router."
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
  metaDescription: "Dominá React Server Components: arquitectura RSC, data loading, streaming, server actions y client component boundaries en Next.js App Router."
  keywords:
    - react server components
    - rsc
    - nextjs app router
    - server actions
    - streaming
    - react 19
---

## Introducción

React Server Components (RSC) ejecutan en el server y mandan HTML al browser en vez de JavaScript. Pueden acceder a databases, file systems e internal APIs directamente sin exponer secrets al client. RSC reduce el JavaScript bundle size y mejora el initial page load. En Next.js App Router, los components son server components por default. A continuación: RSC architecture, data loading patterns, streaming con Suspense, server actions y el boundary entre server y client components.

## Cómo Funciona RSC

```
Traditional CSR (Client-Side Rendering):
  Browser → descarga JS bundle → ejecuta React → fetchea data → rendera

RSC (Server Components):
  Server → fetchea data → rendera React a HTML → streamea al browser
  Browser → recibe HTML → hydrata solo partes interactivas (Client Components)

Key differences:
  - Server Components: No useState, no event handlers, no browser APIs
  - Client Components: "use client" directive, full React features
  - Server Components pueden importar Client Components, no viceversa
  - Server Components pueden acceder a databases, filesystem, env vars directamente
```

## Server vs Client Components

### Server Component (default)

```tsx
// app/products/page.tsx — Server Component (default, no directive)
import { db } from "@/lib/db";
import { ProductCard } from "./ProductCard";

// Esto ejecuta en el server. No "use client" needed.
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
      {/* Los tres fetchean in parallel */}
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

### Sequential data fetching con caching

```tsx
// app/blog/[slug]/page.tsx — Sequential con caching
import { notFound } from "next/navigation";
import { cache } from "react";

// Cacheá el fetch dentro de un single request
const getPost = cache(async (slug: string) => {
  const post = await db.post.findUnique({ where: { slug } });
  if (!post) notFound();
  return post;
});

export default async function BlogPost({ params }: { params: { slug: string } }) {
  // First fetch
  const post = await getPost(params.slug);

  // Second fetch depende del first
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

### Data fetching con revalidation

```tsx
// app/products/page.tsx — ISR con revalidate
export const revalidate = 3600; // Revalidá cada hour

async function getProducts() {
  const res = await fetch("https://api.example.com/products", {
    next: { revalidate: 3600 }, // Cacheá por 1 hour
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

## Streaming con Suspense

```tsx
// app/dashboard/page.tsx — Streaming con Suspense boundaries
import { Suspense } from "react";

// Slow component que takes 2s en cargar
async function SlowChart() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const data = await fetch("https://api.example.com/chart-data").then((r) => r.json());
  return <Chart data={data} />;
}

// Fast component que carga immediately
async function QuickStats() {
  const data = await db.stats.findFirst();
  return <div>Users: {data.users} | Orders: {data.orders}</div>;
}

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Fast content rendera immediately */}
      <Suspense fallback={<div>Loading stats...</div>}>
        <QuickStats />
      </Suspense>

      {/* Slow content streamea después de 2s */}
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

  // Revalidá la products page
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

// Optimistic update con useActionState
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
// app/products/CreateProductForm.tsx — Usando Server Actions en Client Component
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
Rules para "use client":
  1. Server Components pueden importar Client Components ✓
  2. Client Components no pueden importar Server Components ✗
  3. Client Components pueden recibir Server Components como children ✓
  4. Server Components pueden pasar serializable props a Client Components ✓
  5. Server Components no pueden pasar functions a Client Components ✗
     (excepto server actions)

Pattern: Server Component wrapper con Client Component children

  // app/layout.tsx (Server Component)
  <ClientProvider>  // Client Component
    <PageContent />  // Server Component passed como children
  </ClientProvider>
```

```tsx
// app/layout.tsx — Server Component pasando children a Client Component
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
// app/products/[id]/error.tsx — Error boundary para RSC
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

- Default a Server Components — solo agregá "use client" cuando necesitás interactivity
- Mantené client components chicas — pushéalas a las leaves del component tree
- Usá Suspense para streaming — no blockeés toda la page en slow data
- Validá input en Server Actions — usá Zod o similar para type-safe validation
- Usá `revalidatePath` después de mutations — mantené cached pages fresh
- Pasá serializable props only — strings, numbers, arrays, plain objects
- Usá `cache()` para deduplication — evitá duplicate queries dentro de un single request
- Co-localizá data fetching con el component — RSC elimina la need de separate API routes
- Usá error boundaries per route segment — isolá failures a specific sections
- Seteá `export const revalidate` para ISR — controlá cómo often pages revalidate

## Common Mistakes

- **"use client" al top del file**: hace todo un client component. Solo markéa components que necesitan interactivity.
- **Pasar non-serializable props**: functions, class instances, o Dates no pueden cross el server-client boundary. Usá server actions para functions.
- **Importar Server Components en Client Components**: esto break. Pasalos como `children` props en vez.
- **No usar Suspense**: toda la page espera por la slowest query. Wrapéa slow components en Suspense.
- **Olvidar revalidate**: después de un server action mutation, la cached page muestra stale data. Llamá `revalidatePath`.

## FAQ

### ¿Qué son React Server Components?

Components que renderan en el server y mandan HTML al browser. Pueden acceder a databases, file systems e internal APIs directamente. No shipéan JavaScript al client, reduciendo bundle size.

### ¿Cuándo debería usar "use client"?

Cuando un component necesita: `useState`, `useEffect`, event handlers (`onClick`, `onChange`), browser APIs (`window`, `localStorage`), o third-party libraries que dependen de client-side React features.

### ¿Se pueden mezclar Server Components y Client Components?

Sí. Server Components pueden importar y renderar Client Components. Client Components pueden recibir Server Components como `children` props. Pero Client Components no pueden directamente importar Server Components.

### ¿Qué son Server Actions?

Functions que ejecutan en el server pero pueden ser called desde Client Components. Reemplazan traditional API routes para form submissions y mutations. Markéalos con `"use server"` directive.

### ¿Cómo funciona streaming con RSC?

Server Components wrapped en `<Suspense>` streamean su HTML a medida que están ready. Fast components renderan immediately, y slow components streamean cuando su data está available. El browser muestra fallback UI hasta que el streamed content arrive.
