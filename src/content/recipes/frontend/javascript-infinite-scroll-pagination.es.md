---
contentType: recipes
slug: javascript-infinite-scroll-pagination
title: "Paginación con Scroll Infinito en JavaScript con IntersectionObserver"
description: "Implementa carga de datos basada en scroll en JavaScript con IntersectionObserver"
metaDescription: "Construye paginación de scroll infinito en JavaScript con IntersectionObserver, fetch API, estados de carga y manejo de errores."
difficulty: intermediate
topics:
  - frontend
tags:
  - javascript
  - infinite-scroll
  - pagination
  - intersection-observer
  - lazy-loading
  - browser
relatedResources:
  - /recipes/javascript-localstorage-expiration
  - /recipes/javascript-drag-drop-file-upload
  - /recipes/javascript-clipboard-copy-paste
  - /guides/frontend-best-practices
  - /patterns/lazy-loading-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Construye paginación de scroll infinito en JavaScript con IntersectionObserver, fetch API, estados de carga y manejo de errores."
  keywords:
    - javascript infinite scroll
    - intersection observer pagination
    - scroll based loading js
    - lazy load content javascript
    - infinite scroll implementation
    - javascript pagination observer
---

## Visión General

El scroll infinito carga contenido automáticamente a medida que el usuario desciende, eliminando botones de paginación. Esta recipe usa `IntersectionObserver` para detectar cuando un elemento sentinel entra al viewport, luego obtiene la siguiente página de datos vía fetch API. Cubre indicadores de carga, manejo de errores, debounce y limpieza.

## Cuándo Usar

- Tienes un listing estilo feed (posts sociales, resultados de búsqueda, imágenes) donde los botones de paginación empeoran la UX
- Quieres lazy-loading de contenido sin una librería de virtual scroll
- Necesitas cargar datos on-demand al acercarse el usuario al final de la página
- Estás construyendo una interfaz mobile-first donde el scroll es la navegación principal

## Solución

### Scroll infinito básico con IntersectionObserver

```javascript
const sentinel = document.getElementById("sentinel");
const container = document.getElementById("list");
let page = 1;
let loading = false;
let hasMore = true;

async function loadPage(pageNum) {
    const res = await fetch(`/api/items?page=${pageNum}`);
    const data = await res.json();
    return data;
}

function renderItems(items) {
    for (const item of items) {
        const div = document.createElement("div");
        div.className = "list-item";
        div.textContent = item.title;
        container.appendChild(div);
    }
}

const observer = new IntersectionObserver(async (entries) => {
    if (entries[0].isIntersecting && !loading && hasMore) {
        loading = true;
        page++;
        const data = await loadPage(page);
        renderItems(data.items);
        hasMore = data.hasMore;
        loading = false;
    }
});

observer.observe(sentinel);
```

### Scroll infinito completo con estados de carga y error

```javascript
class InfiniteScroll {
    constructor(options) {
        this.container = options.container;
        this.sentinel = options.sentinel;
        this.fetchUrl = options.fetchUrl;
        this.renderItem = options.renderItem;
        this.pageSize = options.pageSize ?? 10;
        this.threshold = options.threshold ?? 200;

        this.page = 1;
        this.loading = false;
        this.hasMore = true;
        this.observer = null;
    }

    init() {
        this.loadInitial();
        this.setupObserver();
    }

    async loadInitial() {
        this.showLoading();
        try {
            const data = await this.fetchPage(1);
            this.renderItems(data.items);
            this.hasMore = data.hasMore;
            this.page = 1;
        } catch (err) {
            this.showError("Error al cargar datos iniciales");
        }
        this.hideLoading();
    }

    setupObserver() {
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            { rootMargin: `${this.threshold}px` }
        );
        this.observer.observe(this.sentinel);
    }

    async handleIntersection(entries) {
        if (!entries[0].isIntersecting || this.loading || !this.hasMore) return;

        this.loading = true;
        this.showLoading();

        try {
            this.page++;
            const data = await this.fetchPage(this.page);
            this.renderItems(data.items);
            this.hasMore = data.hasMore;

            if (!this.hasMore) {
                this.observer.unobserve(this.sentinel);
                this.showEndMessage();
            }
        } catch (err) {
            this.page--;
            this.showError("Error al cargar más items. Reintentando...");
            setTimeout(() => { this.loading = false; }, 2000);
            return;
        }

        this.loading = false;
        this.hideLoading();
    }

    async fetchPage(pageNum) {
        const url = `${this.fetchUrl}?page=${pageNum}&limit=${this.pageSize}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        return res.json();
    }

    renderItems(items) {
        for (const item of items) {
            const element = this.renderItem(item);
            this.container.appendChild(element);
        }
    }

    showLoading() {
        let loader = document.getElementById("scroll-loader");
        if (!loader) {
            loader = document.createElement("div");
            loader.id = "scroll-loader";
            loader.className = "scroll-loader";
            loader.textContent = "Cargando...";
            this.container.parentElement.appendChild(loader);
        }
        loader.style.display = "block";
    }

    hideLoading() {
        const loader = document.getElementById("scroll-loader");
        if (loader) loader.style.display = "none";
    }

    showError(message) {
        let error = document.getElementById("scroll-error");
        if (!error) {
            error = document.createElement("div");
            error.id = "scroll-error";
            error.className = "scroll-error";
            this.container.parentElement.appendChild(error);
        }
        error.textContent = message;
        error.style.display = "block";
        setTimeout(() => { error.style.display = "none"; }, 3000);
    }

    showEndMessage() {
        const end = document.createElement("div");
        end.className = "scroll-end";
        end.textContent = "No hay más items para cargar.";
        this.container.parentElement.appendChild(end);
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

// Uso
const scroll = new InfiniteScroll({
    container: document.getElementById("list"),
    sentinel: document.getElementById("sentinel"),
    fetchUrl: "/api/posts",
    renderItem: (post) => {
        const div = document.createElement("div");
        div.className = "post-card";
        div.innerHTML = `<h3>${post.title}</h3><p>${post.excerpt}</p>`;
        return div;
    },
    pageSize: 20,
    threshold: 300
});

scroll.init();

// Limpieza al navegar
window.addEventListener("beforeunload", () => scroll.destroy());
```

### Fallback con scroll event y debounce

```javascript
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

let page = 1;
let loading = false;
let hasMore = true;

const handleScroll = debounce(async () => {
    const scrollY = window.scrollY + window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    if (scrollY >= docHeight - 300 && !loading && hasMore) {
        loading = true;
        page++;

        try {
            const res = await fetch(`/api/items?page=${page}`);
            const data = await res.json();
            renderItems(data.items);
            hasMore = data.hasMore;
        } catch (err) {
            page--;
            console.error("Error al cargar:", err);
        }

        loading = false;
    }
}, 150);

window.addEventListener("scroll", handleScroll);
```

### Hook de React con IntersectionObserver

```jsx
import { useEffect, useRef, useState, useCallback } from "react";

function useInfiniteScroll(fetchUrl) {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef(null);

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        try {
            const res = await fetch(`${fetchUrl}?page=${page}`);
            const data = await res.json();
            setItems(prev => [...prev, ...data.items]);
            setHasMore(data.hasMore);
            setPage(prev => prev + 1);
        } catch (err) {
            console.error("Error al cargar:", err);
        }
        setLoading(false);
    }, [fetchUrl, page, loading, hasMore]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { rootMargin: "300px" }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore]);

    return { items, loading, hasMore, sentinelRef };
}

// Uso en un componente
function ItemList() {
    const { items, loading, hasMore, sentinelRef } = useInfiniteScroll("/api/items");

    return (
        <div>
            {items.map(item => (
                <div key={item.id} className="item-card">
                    {item.title}
                </div>
            ))}
            {loading && <p>Cargando...</p>}
            {hasMore && <div ref={sentinelRef} style={{ height: "1px" }} />}
            {!hasMore && <p>No hay más items.</p>}
        </div>
    );
}
```

## Explicación

`IntersectionObserver` observa un elemento objetivo (el sentinel) y dispara un callback cuando entra o sale del viewport. Coloca el sentinel al final de la lista. Cuando se hace visible, obtiene la siguiente página y agrega los items.

Conceptos clave:

- **`rootMargin`**: Expande el bounding box del observer para que dispare antes de que el sentinel sea visible. Configurar `rootMargin: "300px"` dispara la carga cuando el usuario está a 300px del final, creando una experiencia fluida.
- **Guard de carga**: El flag `loading` previene fetches duplicados cuando múltiples eventos de intersección se disparan rápidamente.
- **Flag `hasMore`**: La respuesta de la API debe incluir un boolean `hasMore`. Cuando es false, desconectar el observer para detener intentos.
- **Recuperación de errores**: En fallo de fetch, decrementar el contador de página y permitir reintento. Mostrar un mensaje de error con delay antes de resetear el flag de carga.
- **Limpieza**: Siempre llamar `observer.disconnect()` cuando el componente se desmonta o el usuario navega away. Esto previene memory leaks y fetches fantasma.
- **Fallback con scroll event**: Para navegadores antiguos sin `IntersectionObserver`, usar un listener de `scroll` con debounce verificando `window.scrollY + window.innerHeight >= docHeight - threshold`.

## Variantes

| Enfoque | Soporte Navegador | Complejidad | Usar Cuando |
|---------|-------------------|-------------|-------------|
| IntersectionObserver | Navegadores modernos | Baja | Opción por defecto |
| Scroll event + debounce | Todos los navegadores | Media | Soporte legacy necesario |
| Hook de React | Apps React | Media | Proyectos React |
| Virtual scroll | Todos los navegadores | Alta | Listas muy grandes (10k+ items) |

## Pautas

- Usar `IntersectionObserver` sobre scroll events para mejor rendimiento.
- Configurar `rootMargin` para disparar la carga antes de que el usuario llegue al final (200-400px).
- Proteger contra fetches duplicados con un flag `loading`.
- Incluir un flag `hasMore` desde la API para saber cuándo detenerse.
- Desconectar el observer al terminar para prevenir memory leaks.
- Mostrar indicadores de carga y mensajes de error para feedback del usuario.
- Hacer debounce a los handlers de scroll event si se usa el enfoque fallback (100-200ms).
- Considerar virtual scrolling para listas con miles de items para evitar inflar el DOM.

## Errores Comunes

- No proteger contra fetches duplicados. Múltiples eventos de intersección se disparan rápido, causando llamadas API redundantes.
- No desconectar el observer al desmontar. Esto causa memory leaks y fetches fantasma.
- Configurar `rootMargin` a 0. El sentinel debe ser visible antes de que la carga dispare, creando un hueco visible.
- No manejar errores de fetch. El scroll deja de funcionar silenciosamente tras un fallo de red.
- Agregar miles de items al DOM sin virtual scrolling. Esto degrada el rendimiento severamente.
- No incluir un flag `hasMore`. El observer sigue disparando para siempre, haciendo llamadas API innecesarias.

## Preguntas Frecuentes

### ¿Por qué IntersectionObserver es mejor que scroll events?

`IntersectionObserver` se ejecuta fuera del event loop del main thread, así que no bloquea el scroll. Los scroll events se disparan en cada cambio de píxel y requieren throttling manual. `IntersectionObserver` también es más simple de configurar con `rootMargin`.

### ¿Cómo evito demasiados items en el DOM?

Para listas con miles de items, usa librerías de virtual scrolling como `react-window` o `vue-virtual-scroller`. Estas renderizan solo los items visibles más un pequeño buffer, manteniendo los nodos del DOM bajo 50 incluso para 100k items.

### ¿Cómo debería verse la respuesta de la API?

```json
{
    "items": [...],
    "page": 2,
    "hasMore": true,
    "total": 500
}
```

El flag `hasMore` le dice al cliente si continuar cargando. El `total` es opcional pero útil para indicadores de progreso.

### ¿Cómo manejo el scroll rápido pasado el sentinel?

El flag `loading` previene fetches duplicados. Aunque el usuario pase el sentinel múltiples veces, solo un fetch se ejecuta a la vez. El observer no se redispara mientras el sentinel permanece visible — solo dispara en cambios de estado de intersección.
