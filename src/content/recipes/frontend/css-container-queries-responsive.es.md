---
contentType: recipes
slug: css-container-queries-responsive
title: "Container Queries para Responsiveness de Componentes"
description: "Cómo usar CSS container queries para layouts responsivos a nivel de componente que se adaptan al tamaño de su contenedor en lugar del viewport."
metaDescription: "Usa CSS container queries para layouts responsivos a nivel de componente. Los componentes se adaptan a su contenedor, no al viewport, permitiendo modularidad real."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - css
  - container-queries
  - responsive
  - layout
  - recipe
relatedResources:
  - /recipes/frontend/css-custom-properties-design-tokens
  - /recipes/frontend/css-dark-mode-prefers-color-scheme
  - /recipes/frontend/react-usememo-usecallback-performance
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa CSS container queries para layouts responsivos a nivel de componente. Los componentes se adaptan a su contenedor, no al viewport, permitiendo modularidad real."
  keywords:
    - frontend
    - css
    - container-queries
    - responsive
    - layout
    - recipe
---

## Overview

Container queries permiten que un componente adapte su layout basándose en el tamaño de su contenedor parent, no del viewport. Esto significa que un card component puede switchear de layout horizontal a vertical cuando su sidebar se encoge, independientemente del tamaño de pantalla. Media queries solo responden al viewport — container queries responden al espacio disponible real del componente, haciendo que los componentes sean verdaderamente reutilizables a través de diferentes layouts.

## When to Use

- Componentes reutilizables colocados en diferentes contextos de layout (sidebar, contenido principal, grid cell)
- Cards que switchean entre layouts horizontal y vertical dependiendo del ancho disponible
- Navegación que colapsa a hamburger menu cuando su contenedor es angosto, no el viewport
- Dashboard widgets que se redimensionan dentro de un grid drag-and-drop
- Widgets embebibles que necesitan adaptarse a su contenedor host

## When NOT to Use

- Layouts de página completa — media queries siguen siendo apropiadas para responsive design a nivel de página
- Componentes de ancho fijo — si el componente siempre tiene el mismo ancho, container queries no añaden valor
- Soporte de browsers legacy — container queries requieren browsers modernos (Chrome 105+, Safari 16+, Firefox 110+)

## Solution

### Container query básico

```css
.card-container {
  container-type: inline-size;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
    align-items: center;
  }
}
```

Cuando el `.card-container` tiene al menos 400px de ancho, el card switchear a layout horizontal. Por debajo de 400px, se mantiene vertical.

### Containers nombrados

```css
.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}

.main-content {
  container-type: inline-size;
  container-name: main;
}

@container sidebar (min-width: 300px) {
  .widget {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@container main (min-width: 600px) {
  .widget {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
  }
}
```

Los containers nombrados te permiten targetear containers específicos cuando los componentes están anidados.

### Unidades de container query

```css
.panel {
  container-type: inline-size;
}

.panel-title {
  font-size: clamp(1rem, 5cqi, 2rem);
  padding: 2cqb;
  margin-bottom: 2cqh;
}
```

Unidades de container query:
- `cqw` — 1% del ancho del container
- `cqh` — 1% del alto del container
- `cqi` — 1% del inline size del container
- `cqb` — 1% del block size del container
- `cqmin` — 1% de la dimensión menor del container
- `cqmax` — 1% de la dimensión mayor del container

### Componente de card responsivo

```css
.product-card-container {
  container-type: inline-size;
  padding: 1rem;
}

.product-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.product-card__image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.product-card__title {
  font-size: 1rem;
}

@container (min-width: 350px) {
  .product-card {
    flex-direction: row;
    gap: 1rem;
  }

  .product-card__image {
    width: 150px;
    aspect-ratio: 1;
  }

  .product-card__title {
    font-size: 1.125rem;
  }
}

@container (min-width: 600px) {
  .product-card {
    flex-direction: column;
  }

  .product-card__image {
    width: 100%;
    aspect-ratio: 16 / 9;
  }

  .product-card__title {
    font-size: 1.25rem;
  }
}
```

### Navegación que se adapta al container

```css
.nav-container {
  container-type: inline-size;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.nav__link {
  padding: 0.5rem 1rem;
}

@container (max-width: 500px) {
  .nav {
    flex-direction: column;
  }

  .nav__link {
    width: 100%;
    text-align: center;
  }
}
```

### Container queries con CSS Grid

```css
.grid-container {
  container-type: inline-size;
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@container (min-width: 400px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

@container (min-width: 700px) {
  .grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

@container (min-width: 1000px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Style container queries

```css
.theme-container {
  container-type: style;
}

@container style(--theme: dark) {
  .card {
    background: #1a1a2e;
    color: #e0e0e0;
  }
}

@container style(--theme: light) {
  .card {
    background: #ffffff;
    color: #1a1a2e;
  }
}
```

Setea el theme con una custom property:

```html
<div class="theme-container" style="--theme: dark;">
  <div class="card">Content</div>
</div>
```

### Container queries en Tailwind CSS v4

```html
<div class="@container">
  <div class="card flex flex-col @md:flex-row @lg:flex-col">
    <img class="w-full @md:w-36 @lg:w-full" src="product.jpg" />
    <div class="@md:ml-4">
      <h3 class="text-base @md:text-lg @lg:text-xl">Product Title</h3>
    </div>
  </div>
</div>
```

Tailwind v4 genera variantes de container query con `@container` y modificadores de breakpoint como `@md`, `@lg`.

## Variants

### Usar container queries con React

```jsx
function ProductCard({ product }) {
  return (
    <div className="product-card-container">
      <div className="product-card">
        <img className="product-card__image" src={product.image} alt={product.name} />
        <div>
          <h3 className="product-card__title">{product.name}</h3>
          <p>${product.price}</p>
        </div>
      </div>
    </div>
  );
}

// Funciona en cualquier contexto de layout — sidebar, grid, ancho completo
function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <ProductCard product={product} />
      </aside>
      <main className="content">
        <ProductCard product={product} />
      </main>
    </div>
  );
}
```

### Usar container queries con Vue

```vue
<template>
  <div class="card-container">
    <div class="card">
      <img :src="product.image" :alt="product.name" />
      <div class="card-body">
        <h3>{{ product.name }}</h3>
        <p>{{ product.price }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-container {
  container-type: inline-size;
}

.card {
  display: flex;
  flex-direction: column;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
  }
}
</style>
```

## Best Practices

- Usa `container-type: inline-size` para la mayoría de los casos — responde al ancho, que es lo que usualmente necesitas
- Usa containers nombrados (`container-name`) cuando los componentes están anidados y necesitas targetear un ancestor específico
- Setea `container-type` en el wrapper parent, no en el componente mismo — el componente queriea su container
- Usa unidades de container query (`cqi`, `cqw`) para tipografía directa que escala con el container
- Combina con `clamp()` para bounds de min/max: `font-size: clamp(1rem, 5cqi, 2rem)`
- Testea componentes en diferentes tamaños de container — no asumas que el tamaño del viewport determina el espacio del componente
- Usa `@container (max-width: ...)` para patrones mobile-first que se adaptan cuando el espacio se encoge

## Common Mistakes

- **Setear `container-type` en el componente en lugar de su parent**: el componente no puede queryar su propio tamaño — querya su container.
- **Usar `container-type: size` sin setear un height**: `size` requiere que ambas dimensiones estén definidas. Usa `inline-size` para queries solo de ancho.
- **Olvidar que container queries no reemplazan media queries**: usa media queries para layout de página, container queries para layout de componente.
- **Sobre-anidar containers**: cada `container-type` crea un containment context. Anidamiento profundo puede causar comportamiento inesperado.
- **No testear en containers angostos**: un componente que se ve bien a ancho completo podría romperse en un sidebar de 200px.

## FAQ

### ¿Qué soporte de browser tienen container queries?

Container queries están soportados en Chrome 105+, Safari 16+, Firefox 110+, y Edge 105+. Esto cubre 93%+ de usuarios globales a 2026. Para browsers más antiguos, usa `@supports` para proveer un fallback con media queries.

### ¿Cómo se diferencian container queries de media queries?

Media queries responden al tamaño del viewport. Container queries responden al tamaño del container del componente. Un componente en un sidebar de 300px en una pantalla de 1920px ve un container de 300px, no 1920px.

### ¿Puedo usar container queries con frameworks CSS?

Sí. Tailwind CSS v4 tiene soporte built-in de container queries con `@container` y variantes `@sm`, `@md`, `@lg`. Otros frameworks pueden requerir CSS custom.

### ¿Cuál es la diferencia entre `container-type: inline-size` y `container-type: size`?

`inline-size` establece containment en el eje inline (ancho en writing modes horizontales). `size` establece containment en ambos ejes. Usa `inline-size` para la mayoría de los casos — `size` requiere que el container tenga un height definido.

### ¿Cómo proveo un fallback para browsers más antiguos?

```css
.card { flex-direction: column; }

@supports (container-type: inline-size) {
  .card-container { container-type: inline-size; }
  @container (min-width: 400px) {
    .card { flex-direction: row; }
  }
}

/* Fallback para browsers sin container queries */
@media (min-width: 768px) {
  .card { flex-direction: row; }
}
```
