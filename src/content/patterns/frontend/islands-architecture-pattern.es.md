---
contentType: patterns
slug: islands-architecture-pattern
title: "Patrón Islands Architecture"
description: "Cómo shippear interactivity solo donde se necesita usando islands architecture. Cubre Astro islands, partial hydration, React islands, y performance benefits."
metaDescription: "Shippeá interactivity solo donde se necesita con islands architecture. Aprende Astro islands, partial hydration, React islands, client directives, y performance gains."
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
  metaDescription: "Shippeá interactivity solo donde se necesita con islands architecture. Aprende Astro islands, partial hydration, React islands, client directives, y performance gains."
  keywords:
    - frontend
    - astro
    - islands
    - ssr
    - performance
    - pattern
---

## Overview

Islands architecture renderiza una page como static HTML en el server, después hydrata solo las parts interactivas — los "islands" — en el client. El resto de la page se queda como zero-JavaScript static HTML. Esto reduce dramáticamente el JavaScript shippeado al browser compared a full-page hydration en Next.js o traditional SPAs. Astro popularizó este pattern con sus island directives (`client:load`, `client:visible`, `client:idle`), pero el concept aplica a cualquier SSR framework que supporte partial hydration. El result: faster page loads, lower Time to Interactive, y mejores Core Web Vitals.

## When to Use

- Content-heavy sites donde la mayoría de la page es static (blogs, docs, e-commerce catalogs)
- Sites donde solo unos pocos components necesitan interactivity (search box, cart counter, newsletter form)
- Performance-critical applications donde cada kilobyte de JavaScript importa
- SEO-focused sites que necesitan fast First Contentful Paint
- Multi-framework pages donde diferentes islands usan diferentes frameworks (React, Svelte, Vue)

## When NOT to Use

- Highly interactive applications (dashboards, editors, chat) donde la mayoría de la page es interactive
- Single-page applications con complex client-side routing y state
- Applications donde toda la page necesita ser hydrated inmediatamente
- Projects que no usan SSR o SSG — islands requieren server-rendered HTML

## Solution

### Astro islands con client directives

```astro
---
// page.astro — Astro page con islands
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

    <!-- Island: hydratá inmediatamente (search necesita ser interactive right away) -->
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

    <!-- Island: hydratá cuando visible en viewport (gallery está below the fold) -->
    <ProductGallery products={products} client:visible />

    <!-- Island: hydratá cuando browser está idle (comments son non-critical) -->
    <Comments postId={post.id} client:idle />
  </main>

  <footer>
    <!-- Island: hydratá on idle (form no necesita ser interactive inmediatamente) -->
    <NewsletterForm client:idle />
  </footer>
</body>
</html>
```

### Client directives explicados

```astro
---
// client-directives.astro — todas las hydration strategies
import InteractiveComponent from '../components/InteractiveComponent.jsx';
---

<!-- client:load — hydratá inmediatamente on page load -->
<!-- Usá para: above-the-fold interactive elements que deben funcionar right away -->
<SearchBox client:load />

<!-- client:visible — hydratá cuando el component scrolls into viewport -->
<!-- Usá para: below-the-fold components, image galleries, comment sections -->
<ProductGallery client:visible />

<!-- client:idle — hydratá cuando el browser está idle (requestIdleCallback) -->
<!-- Usá para: non-critical interactive elements, forms, widgets -->
<NewsletterForm client:idle />

<!-- client:media — hydratá cuando un media query matchea -->
<!-- Usá para: responsive components que solo necesitan JS en certain screens -->
<MobileMenu client:media="(max-width: 768px)" />

<!-- client:only — skip SSR, render solo en el client -->
<!-- Usá para: components que dependen de browser APIs (window, document) -->
<Chart client:only="react" />
```

### React island en una Astro page

```jsx
// SearchBox.jsx — React component usado como island
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

### Pasando server data a islands

```astro
---
// product-page.astro — pasá server-fetched data a un island
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
// ProductConfigurator.jsx — recibe serialized props desde server
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

### Múltiples framework islands en una page

```astro
---
// multi-framework.astro — React, Svelte, y Vue islands en la misma page
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

### Island con shared state

```astro
---
// cart-page.astro — islands sharing state vía un store
import CartItems from '../components/CartItems.jsx';
import CartSummary from '../components/CartSummary.jsx';
import { cartStore } from '../stores/cart.ts';
---

<!-- Inicializá el store con server data -->
<script define:vars={{ initialCart }}>
  window.__cartStore = initialCart;
</script>

<CartItems client:load store={cartStore} />
<CartSummary client:visible store={cartStore} />
```

```jsx
// CartItems.jsx — React island leyendo desde shared store
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
// Performance impact de islands vs. full hydration
//
// Full hydration (Next.js SPA):
// - Page HTML: 50KB
// - JavaScript bundle: 350KB (React + app code + components)
// - Time to Interactive: 3.2s
// - FID: 120ms
//
// Islands architecture (Astro):
// - Page HTML: 55KB (slightly more — incluye rendered component HTML)
// - JavaScript bundle: 45KB (solo los interactive islands)
// - Time to Interactive: 1.1s
// - FID: 25ms
//
// Los 305KB JavaScript savings vienen de no shippear
// React runtime, router, y non-interactive component code.
```

## Variants

### Islands con hydration streaming

```astro
---
// streaming-islands.astro — progressive enhancement con defer
import HeavyChart from '../components/HeavyChart.jsx';
import DataTable from '../components/DataTable.jsx';
---

<!-- Static content renderiza inmediatamente -->
<section>
  <h1>Dashboard</h1>
  <p>Sales overview for Q4 2026</p>
</section>

<!-- Island loads cuando visible — chart está below the fold -->
<HeavyChart client:visible data={chartData} />

<!-- Island loads on idle — table es heavy pero no urgent -->
<DataTable client:idle rows={tableData} />
```

### Nested islands

```astro
---
// nested-islands.astro — island dentro de un static layout
import Sidebar from '../components/Sidebar.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
---

<!-- Sidebar es mostly static pero contiene un interactive filter panel -->
<Sidebar>
  <nav>
    <a href="/category/all">All Products</a>
    <a href="/category/electronics">Electronics</a>
  </nav>

  <!-- Solo esta part hydrata -->
  <FilterPanel client:visible filters={availableFilters} />
</Sidebar>
```

## Best Practices

- Usá `client:visible` por defecto — la mayoría de los interactive components están below the fold y no necesitan immediate hydration
- Usá `client:load` solo para above-the-fold critical interactions — search boxes, navigation menus
- Usá `client:idle` para non-critical widgets — newsletter forms, recommendation carousels
- Mantené islands chicas — un 5KB island es mejor que un 50KB island. Extractá solo la interactive part
- Pasá server data como props — fetcheá data en el server y pasala a islands como serialized props
- Minimizá shared state entre islands — cada island debería ser self-contained cuando sea possible
- Usá `client:only` para browser-API-dependent components — maps, charts que necesitan `window` o `canvas`
- Profileá el JavaScript bundle — checkeá que las non-interactive parts no estén accidentalmente hydrated

## Common Mistakes

- **Hydratar todo**: wrappear toda la page en un `client:load` island. Esto defeat el purpose — estás back a full hydration.
- **Usar `client:load` por defecto**: la mayoría de los components no necesitan immediate hydration. Usá `client:visible` o `client:idle` en su lugar.
- **Islands grandes**: un single 100KB island con 20 sub-components. Spliteá en islands más chicos para que solo el visible hydrate.
- **No pasar server data**: fetchear data dentro del island en el client. Feteá en el server y pasá como props para avoid waterfalls.
- **Sharear state across islands vía global variables**: frágil y hard de debuggear. Usá una proper state management solution si los islands necesitan comunicarse.

## FAQ

### ¿Qué es islands architecture?

Un pattern donde una page es server-rendered como static HTML, y solo specific interactive components ("islands") son hydrated en el client. El resto de la page shippea zero JavaScript. Astro es el framework más popular que implementa este pattern.

### ¿En qué se diferencia de code-splitting?

Code-splitting splitea JavaScript en chunks que load on demand. Islands architecture va más lejos — las static parts de la page nunca loadean ningún JavaScript. Solo los interactive islands shippean JS.

### ¿Qué client directive debería usar?

Usá `client:load` para above-the-fold critical interactions, `client:visible` para below-the-fold components, `client:idle` para non-critical widgets, y `client:media` para responsive-only components.

### ¿Puedo usar múltiples frameworks en la misma page?

Sí. Astro supporta React, Svelte, Vue, Solid, y otros como islands en la misma page. Cada island es independent y solo su framework runtime es shippeado.

### ¿Islands architecture funciona con client-side routing?

No naturalmente. Islands están designed para multi-page apps (MPA) donde cada page es server-rendered. Para client-side routing con partial hydration, necesitarías una custom solution o un framework como Fresh (Deno) que combina islands con client-side navigation.
