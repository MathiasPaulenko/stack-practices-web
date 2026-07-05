---
contentType: patterns
slug: islands-architecture-pattern
title: "Islands Architecture: Ship Interactivity Only Where Needed in SSR Apps"
description: "How to ship interactivity only where needed using islands architecture. Covers Astro islands, partial hydration, React islands, and performance benefits."
metaDescription: "Ship interactivity only where needed with islands architecture. Learn Astro islands, partial hydration, React islands, client directives, and performance gains."
difficulty: advanced
topics:
  - frontend
tags:
  - frontend
  - astro
  - islands
  - ssr
  - performance
  - pattern
category: architectural
relatedResources:
  - /patterns/css-architecture-pattern
  - /patterns/progressive-enhancement-pattern
  - /patterns/suspense-boundary-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ship interactivity only where needed with islands architecture. Learn Astro islands, partial hydration, React islands, client directives, and performance gains."
  keywords:
    - frontend
    - astro
    - islands
    - ssr
    - performance
    - pattern
---

## Overview

Islands architecture renders a page as static HTML on the server, then hydrates only the interactive parts — the "islands" — on the client. The rest of the page stays as zero-JavaScript static HTML. This dramatically reduces the JavaScript shipped to the browser compared to full-page hydration in Next.js or traditional SPAs. Astro popularized this pattern with its island directives (`client:load`, `client:visible`, `client:idle`), but the concept applies to any SSR framework that supports partial hydration. The result: faster page loads, lower Time to Interactive, and better Core Web Vitals.

## When to Use

- Content-heavy sites where most of the page is static (blogs, docs, e-commerce catalogs)
- Sites where only a few components need interactivity (search box, cart counter, newsletter form)
- Performance-critical applications where every kilobyte of JavaScript matters
- SEO-focused sites that need fast First Contentful Paint
- Multi-framework pages where different islands use different frameworks (React, Svelte, Vue)

## When NOT to Use

- Highly interactive applications (dashboards, editors, chat) where most of the page is interactive
- Single-page applications with complex client-side routing and state
- Applications where the entire page needs to be hydrated immediately
- Projects that don't use SSR or SSG — islands require server-rendered HTML

## Solution

### Astro islands with client directives

```astro
---
// page.astro — Astro page with islands
import SearchBox from '../components/SearchBox.jsx';
import Comments from '../components/Comments.jsx';
import NewsletterForm from '../components/NewsletterForm.jsx';
import ProductGallery from '../components/ProductGallery.jsx';

const products = await fetchProducts();
---

<html>
<body>
  <header>
    <nav>
      <!-- Static navigation — zero JS -->
      <a href="/">Home</a>
      <a href="/products">Products</a>
      <a href="/about">About</a>
    </nav>

    <!-- Island: hydrate immediately (search needs to be interactive right away) -->
    <SearchBox client:load />
  </header>

  <main>
    <h1>Our Products</h1>

    <!-- Static product grid — zero JS, server-rendered HTML -->
    <div class="product-grid">
      {products.map(product => (
        <article class="product-card">
          <img src={product.image} alt={product.name} loading="lazy" />
          <h2>{product.name}</h2>
          <p>{product.price}</p>
        </article>
      ))}
    </div>

    <!-- Island: hydrate when visible in viewport (gallery is below the fold) -->
    <ProductGallery products={products} client:visible />

    <!-- Island: hydrate when browser is idle (comments are non-critical) -->
    <Comments postId={post.id} client:idle />
  </main>

  <footer>
    <!-- Island: hydrate on idle (form doesn't need to be interactive immediately) -->
    <NewsletterForm client:idle />
  </footer>
</body>
</html>
```

### Client directives explained

```astro
---
// client-directives.astro — all hydration strategies
import InteractiveComponent from '../components/InteractiveComponent.jsx';
---

<!-- client:load — hydrate immediately on page load -->
<!-- Use for: above-the-fold interactive elements that must work right away -->
<SearchBox client:load />

<!-- client:visible — hydrate when the component scrolls into viewport -->
<!-- Use for: below-the-fold components, image galleries, comment sections -->
<ProductGallery client:visible />

<!-- client:idle — hydrate when the browser is idle (requestIdleCallback) -->
<!-- Use for: non-critical interactive elements, forms, widgets -->
<NewsletterForm client:idle />

<!-- client:media — hydrate when a media query matches -->
<!-- Use for: responsive components that only need JS on certain screens -->
<MobileMenu client:media="(max-width: 768px)" />

<!-- client:only — skip SSR, render only on the client -->
<!-- Use for: components that depend on browser APIs (window, document) -->
<Chart client:only="react" />
```

### React island in an Astro page

```jsx
// SearchBox.jsx — React component used as an island
import { useState, useEffect } from 'react';

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data);
      setIsOpen(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="search-box">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      {isOpen && results.length > 0 && (
        <ul className="search-results">
          {results.map(result => (
            <li key={result.id}>
              <a href={result.url}>{result.title}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Passing server data to islands

```astro
---
// product-page.astro — pass server-fetched data to an island
import ProductConfigurator from '../components/ProductConfigurator.jsx';

const product = await fetchProduct(Astro.params.slug);
const variants = await fetchVariants(product.id);
const inventory = await fetchInventory(product.id);
---

<ProductConfigurator
  client:visible
  product={product}
  variants={variants}
  inventory={inventory}
/>
```

```jsx
// ProductConfigurator.jsx — receives serialized props from server
import { useState } from 'react';

export default function ProductConfigurator({ product, variants, inventory }) {
  const [selectedVariant, setSelectedVariant] = useState(variants[0]);
  const [quantity, setQuantity] = useState(1);

  const inStock = inventory[selectedVariant.id] >= quantity;

  return (
    <div className="configurator">
      <h2>{product.name}</h2>
      <div className="variants">
        {variants.map(variant => (
          <button
            key={variant.id}
            onClick={() => setSelectedVariant(variant)}
            className={selectedVariant.id === variant.id ? 'selected' : ''}
          >
            {variant.name}
          </button>
        ))}
      </div>
      <div className="quantity">
        <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
        <span>{quantity}</span>
        <button onClick={() => setQuantity(q => q + 1)}>+</button>
      </div>
      <button disabled={!inStock}>
        {inStock ? 'Add to Cart' : 'Out of Stock'}
      </button>
    </div>
  );
}
```

### Multiple framework islands on one page

```astro
---
// multi-framework.astro — React, Svelte, and Vue islands on the same page
import ReactWidget from '../components/ReactWidget.jsx';
import SvelteCounter from '../components/SvelteCounter.svelte';
import VueChart from '../components/VueChart.vue';
---

<div>
  <h1>Multi-framework page</h1>

  <!-- React island -->
  <ReactWidget client:visible />

  <!-- Svelte island -->
  <SvelteCounter client:load />

  <!-- Vue island -->
  <VueChart data={chartData} client:visible />
</div>
```

### Island with shared state

```astro
---
// cart-page.astro — islands sharing state via a store
import CartItems from '../components/CartItems.jsx';
import CartSummary from '../components/CartSummary.jsx';
import { cartStore } from '../stores/cart.ts';
---

<!-- Initialize the store with server data -->
<script define:vars={{ initialCart }}>
  window.__cartStore = initialCart;
</script>

<CartItems client:load store={cartStore} />
<CartSummary client:visible store={cartStore} />
```

```jsx
// CartItems.jsx — React island reading from shared store
import { useSyncExternalStore } from 'react';

export default function CartItems({ store }) {
  const items = useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot(),
    () => store.getServerSnapshot()
  );

  const removeItem = (id) => {
    store.removeItem(id);
  };

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          {item.name} — ${item.price}
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}
```

### Performance comparison

```javascript
// Performance impact of islands vs. full hydration
//
// Full hydration (Next.js SPA):
// - Page HTML: 50KB
// - JavaScript bundle: 350KB (React + app code + components)
// - Time to Interactive: 3.2s
// - FID: 120ms
//
// Islands architecture (Astro):
// - Page HTML: 55KB (slightly more — includes rendered component HTML)
// - JavaScript bundle: 45KB (only the interactive islands)
// - Time to Interactive: 1.1s
// - FID: 25ms
//
// The 305KB JavaScript savings come from not shipping
// React runtime, router, and non-interactive component code.
```

## Variants

### Islands with hydration streaming

```astro
---
// streaming-islands.astro — progressive enhancement with defer
import HeavyChart from '../components/HeavyChart.jsx';
import DataTable from '../components/DataTable.jsx';
---

<!-- Static content renders immediately -->
<section>
  <h1>Dashboard</h1>
  <p>Sales overview for Q4 2026</p>
</section>

<!-- Island loads when visible — chart is below the fold -->
<HeavyChart client:visible data={chartData} />

<!-- Island loads on idle — table is heavy but not urgent -->
<DataTable client:idle rows={tableData} />
```

### Nested islands

```astro
---
// nested-islands.astro — island within a static layout
import Sidebar from '../components/Sidebar.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
---

<!-- Sidebar is mostly static but contains an interactive filter panel -->
<Sidebar>
  <nav>
    <a href="/category/all">All Products</a>
    <a href="/category/electronics">Electronics</a>
  </nav>

  <!-- Only this part hydrates -->
  <FilterPanel client:visible filters={availableFilters} />
</Sidebar>
```

## Best Practices

- Use `client:visible` by default — most interactive components are below the fold and don't need immediate hydration
- Use `client:load` only for above-the-fold critical interactions — search boxes, navigation menus
- Use `client:idle` for non-critical widgets — newsletter forms, recommendation carousels
- Keep islands small — a 5KB island is better than a 50KB island. Extract only the interactive part
- Pass server data as props — fetch data on the server and pass it to islands as serialized props
- Minimize shared state between islands — each island should be self-contained when possible
- Use `client:only` for browser-API-dependent components — maps, charts that need `window` or `canvas`
- Profile the JavaScript bundle — check that non-interactive parts aren't accidentally hydrated

## Common Mistakes

- **Hydrating everything**: wrapping the whole page in one `client:load` island. This defeats the purpose — you're back to full hydration.
- **Using `client:load` by default**: most components don't need immediate hydration. Use `client:visible` or `client:idle` instead.
- **Large islands**: a single 100KB island with 20 sub-components. Split into smaller islands so only the visible one hydrates.
- **Not passing server data**: fetching data inside the island on the client. Fetch on the server and pass as props to avoid waterfalls.
- **Sharing state across islands via global variables**: fragile and hard to debug. Use a proper state management solution if islands need to communicate.

## FAQ

### What is islands architecture?

A pattern where a page is server-rendered as static HTML, and only specific interactive components ("islands") are hydrated on the client. The rest of the page ships zero JavaScript. Astro is the most popular framework implementing this pattern.

### How is this different from code-splitting?

Code-splitting splits JavaScript into chunks that load on demand. Islands architecture goes further — the static parts of the page never load any JavaScript at all. Only the interactive islands ship JS.

### Which client directive should I use?

Use `client:load` for above-the-fold critical interactions, `client:visible` for below-the-fold components, `client:idle` for non-critical widgets, and `client:media` for responsive-only components.

### Can I use multiple frameworks on the same page?

Yes. Astro supports React, Svelte, Vue, Solid, and others as islands on the same page. Each island is independent and only its framework runtime is shipped.

### Does islands architecture work with client-side routing?

Not naturally. Islands are designed for multi-page apps (MPA) where each page is server-rendered. For client-side routing with partial hydration, you'd need a custom solution or a framework like Fresh (Deno) that combines islands with client-side navigation.
