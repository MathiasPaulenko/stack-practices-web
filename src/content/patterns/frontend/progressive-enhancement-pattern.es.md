---
contentType: patterns
slug: progressive-enhancement-pattern
title: "Patrón Progressive Enhancement: Buildar Functional Baseline, Enhancar con JS"
description: "Cómo buildar un functional HTML baseline y progressivamente enhancar con JavaScript. Cubre core functionality, feature detection, graceful degradation, y accessibility."
metaDescription: "Builda un functional HTML baseline y progressivamente enhancá con JavaScript. Aprende feature detection, graceful degradation, accessibility, y no-JS fallbacks."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - progressive-enhancement
  - accessibility
  - html
  - pattern
category: architectural
relatedResources:
  - /patterns/islands-architecture-pattern
  - /patterns/css-architecture-pattern
  - /patterns/container-presenter-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Builda un functional HTML baseline y progressivamente enhancá con JavaScript. Aprende feature detection, graceful degradation, accessibility, y no-JS fallbacks."
  keywords:
    - frontend
    - progressive-enhancement
    - accessibility
    - html
    - pattern
---

## Overview

Progressive enhancement arranca con un functional HTML baseline que funciona sin JavaScript, después agrega layers de enhancement: CSS para presentation y JavaScript para interactivity. La core functionality — submitear forms, navegar pages, leer content — funciona incluso si JavaScript falla en loadear o está disabled. JavaScript agrega validation, dynamic updates, animations, y otras improvements on top del working baseline. Este approach asegura robustness, accessibility, y SEO — search engines y screen readers gettean el content regardless de JavaScript availability.

## When to Use

- Public-facing websites donde SEO y accessibility importan
- Forms que deben funcionar incluso cuando JavaScript falla
- Content sites donde el primary value es leer
- Applications que targetean users en slow connections o older browsers
- Cualquier site donde robustness es más importante que flashy interactions

## When NOT to Use

- Highly interactive applications (editors, games, chat) donde HTML alone no puede proveer value
- Internal tools donde controlás el browser y network conditions
- Real-time dashboards que requieren JavaScript para funcionar
- Applications donde el entire value proposition es JavaScript-based interactivity

## Solution

### Layer 1: Functional HTML baseline

```html
<!-- contact-form.html — funciona sin JavaScript -->
<form action="/api/contact" method="POST" class="contact-form">
  <fieldset>
    <legend>Contact Us</legend>

    <div class="field">
      <label for="name">Name</label>
      <input type="text" id="name" name="name" required maxlength="100">
    </div>

    <div class="field">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required>
    </div>

    <div class="field">
      <label for="message">Message</label>
      <textarea id="message" name="message" required rows="5" maxlength="1000"></textarea>
    </div>

    <button type="submit">Send Message</button>
  </fieldset>
</form>
```

### Layer 2: CSS presentation

```css
/* contact-form.css — enhancá el baseline */
.contact-form {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.contact-form fieldset {
  border: none;
  padding: 0;
}

.contact-form legend {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.field input,
.field textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 1rem;
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px #dbeafe;
}

/* Solo mostrá JS-enhanced states cuando JS está available */
.js .field input.invalid {
  border-color: #ef4444;
}

.js .field .error-message {
  display: none;
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.js .field.invalid .error-message {
  display: block;
}

.contact-form button {
  width: 100%;
  padding: 0.625rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
}

.contact-form button:hover {
  background: #2563eb;
}
```

### Layer 3: JavaScript enhancement

```javascript
// contact-form.js — enhancá el form con validation y async submit
document.documentElement.classList.add('js');

const form = document.querySelector('.contact-form');

if (form) {
  // Client-side validation
  const inputs = form.querySelectorAll('input, textarea');

  inputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('invalid')) {
        validateField(input);
      }
    });
  });

  function validateField(input) {
    const field = input.closest('.field');
    let isValid = true;
    let message = '';

    if (input.required && !input.value.trim()) {
      isValid = false;
      message = 'This field is required.';
    } else if (input.type === 'email' && input.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.value)) {
        isValid = false;
        message = 'Please enter a valid email address.';
      }
    } else if (input.maxLength && input.value.length > input.maxLength) {
      isValid = false;
      message = `Maximum ${input.maxLength} characters.`;
    }

    field.classList.toggle('invalid', !isValid);

    let errorEl = field.querySelector('.error-message');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'error-message';
      field.appendChild(errorEl);
    }
    errorEl.textContent = message;

    return isValid;
  }

  // Async submission — solo si JS está available
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate todos los fields
    let allValid = true;
    inputs.forEach(input => {
      if (!validateField(input)) {
        allValid = false;
      }
    });

    if (!allValid) return;

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    try {
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: form.method,
        body: formData,
      });

      if (response.ok) {
        form.innerHTML = `
          <div class="success-message">
            <h2>Thank you!</h2>
            <p>Your message has been sent. We'll get back to you soon.</p>
          </div>
        `;
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = 'Send Message';

      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-error';
      errorDiv.textContent = 'Failed to send. Please try again.';
      form.insertBefore(errorDiv, form.firstChild);
    }
  });
}
```

### Feature detection antes de enhancement

```javascript
// feature-detection.js — checkeá capabilities antes de enhancar
const features = {
  fetch: typeof fetch !== 'undefined',
  intersectionObserver: 'IntersectionObserver' in window,
  customElements: 'customElements' in window,
  webp: document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0,
  serviceWorker: 'serviceWorker' in navigator,
};

// Solo enhancá si las features están available
if (features.fetch) {
  enhanceFormSubmission();
}

if (features.intersectionObserver) {
  lazyLoadImages();
} else {
  // Fallback: loadéá todas las images inmediatamente
  loadAllImages();
}

if (features.serviceWorker) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Service worker falló — el site funciona sin él
  });
}

function enhanceFormSubmission() {
  document.querySelectorAll('form[data-enhance]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
      });
      if (response.ok) {
        form.dispatchEvent(new CustomEvent('form:success', { detail: await response.json() }));
      }
    });
  });
}

function lazyLoadImages() {
  const images = document.querySelectorAll('img[data-src]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });
  images.forEach(img => observer.observe(img));
}

function loadAllImages() {
  document.querySelectorAll('img[data-src]').forEach(img => {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  });
}
```

### Navigation enhancement

```html
<!-- nav.html — funciona como regular links, enhanced a SPA-style navigation -->
<nav class="main-nav">
  <a href="/" data-link>Home</a>
  <a href="/about" data-link>About</a>
  <a href="/products" data-link>Products</a>
  <a href="/contact" data-link>Contact</a>
</nav>
```

```javascript
// nav-enhance.js — enhancá links para SPA-style navigation
if (features.fetch && features.customElements) {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;

    // Solo handleá same-origin links
    if (link.origin !== window.location.origin) return;

    e.preventDefault();

    loadPage(link.href);
  });

  async function loadPage(url) {
    const main = document.querySelector('main');

    // Showeá loading state
    main.style.opacity = '0.5';

    try {
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Update content
      main.innerHTML = doc.querySelector('main').innerHTML;
      main.style.opacity = '1';

      // Update URL y title
      window.history.pushState({}, '', url);
      document.title = doc.title;

      // Scroll a top
      window.scrollTo(0, 0);
    } catch {
      // Fallback: navegá normalmente
      window.location.href = url;
    }
  }

  // Handleá back/forward
  window.addEventListener('popstate', () => {
    loadPage(window.location.href);
  });
}
```

### Table sorting enhancement

```html
<!-- data-table.html — functional table, enhanced con sorting -->
<table class="data-table" data-enhance="sort">
  <thead>
    <tr>
      <th data-sort="name">Name</th>
      <th data-sort="email">Email</th>
      <th data-sort="date">Date</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Alice</td>
      <td>alice@example.com</td>
      <td>2026-01-15</td>
    </tr>
    <tr>
      <td>Bob</td>
      <td>bob@example.com</td>
      <td>2026-03-20</td>
    </tr>
  </tbody>
</table>
```

```javascript
// table-sort.js — enhancá table con click-to-sort
document.querySelectorAll('table[data-enhance="sort"]').forEach(table => {
  const headers = table.querySelectorAll('th[data-sort]');

  headers.forEach(header => {
    header.style.cursor = 'pointer';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');

    header.addEventListener('click', () => sortTable(table, header));
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        sortTable(table, header);
      }
    });
  });

  function sortTable(table, header) {
    const sortKey = header.dataset.sort;
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const currentDir = header.dataset.dir || 'asc';
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';

    rows.sort((a, b) => {
      const aVal = a.querySelector(`td:nth-child(${header.cellIndex + 1})`).textContent;
      const bVal = b.querySelector(`td:nth-child(${header.cellIndex + 1})`).textContent;
      return newDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    header.dataset.dir = newDir;
    rows.forEach(row => tbody.appendChild(row));
  }
});
```

## Variants

### Universal rendering con enhancement

```javascript
// server-rendered HTML que hydrata progressivamente
// Server send full HTML, client enhanca specific parts
document.addEventListener('DOMContentLoaded', () => {
  // Solo enhancá si el browser supporta las needed APIs
  if (!('fetch' in window) || !('IntersectionObserver' in window)) {
    return; // Baseline HTML funciona fine
  }

  // Enhancá search
  const searchInput = document.querySelector('#search-input');
  if (searchInput) {
    enhanceSearch(searchInput);
  }

  // Enhancá cart
  const cartButton = document.querySelector('#add-to-cart');
  if (cartButton) {
    enhanceCart(cartButton);
  }
});
```

### No-JS fallback con noscript

```html
<!-- Proveé fallback para JavaScript-dependent features -->
<noscript>
  <style>
    .js-only { display: none !important; }
    .no-js-only { display: block !important; }
  </style>
  <div class="no-js-only warning">
    This feature requires JavaScript. Some functionality may be limited.
  </div>
</noscript>

<style>
  .no-js-only { display: none; }
</style>
```

## Best Practices

- Arrancá con HTML que funciona — forms submitean, links navegan, content es readable
- Usá feature detection, no browser sniffing — checkeá `if ('fetch' in window)` no `if (isChrome)`
- Agregá la `js` class al `<html>` — usá `.js .component` selectors para que enhanced styles solo apliquen cuando JS está available
- Enhancá, no reemplacés — JavaScript debería mejorar el HTML baseline, no reemplazarlo con algo que break sin JS
- Testeá con JavaScript disabled — disableá JS en DevTools y verify que la page sigue funcionando
- Mantené server-side validation — client-side validation es enhancement; server-side es required
- Usá `data-enhance` attributes — markeá elements para enhancement para que el JS layer sepa qué mejorar
- Proveé loading states para async operations — los users necesitan feedback cuando JS takes over

## Common Mistakes

- **Forms JavaScript-only**: form no tiene `action` attribute y relies enteramente en JS. Sin JS, el form no hace nada.
- **No server-side validation**: trustear client-side validation. Bypasseá JS y submiteá invalid data directamente al server.
- **Reemplazar en vez de enhancar**: JS removea el HTML table y lo rebuildea como un React component. Sin JS, no table.
- **No testear sin JS**: el site funciona en development (JS siempre loadea) pero breakea para users con JS disabled o slow connections.
- **CSS-dependent en JS**: styles que solo funcionan cuando JS agrega classes. El un-JS version se ve broken incluso aunque funciona.

## FAQ

### ¿Qué es progressive enhancement?

Un layered approach: HTML provee el functional baseline, CSS agrega presentation, JavaScript agrega interactivity. Cada layer build sobre el de abajo. Si JavaScript falla, el HTML sigue funcionando.

### ¿En qué se diferencia de graceful degradation?

Progressive enhancement arranca simple y agrega features. Graceful degradation arranca con full features y trata de handle failures. Progressive enhancement es generally más robust porque el baseline siempre funciona.

### ¿Debería cada site usar progressive enhancement?

Public-facing sites, sí — SEO y accessibility lo requieren. Internal tools y highly interactive apps puede que no lo necesiten si controlás el environment.

### ¿Cómo testeo sin JavaScript?

En Chrome DevTools: Command Palette > Run Command > "Show JavaScript disabled" o usá Network conditions para blockear JavaScript. Verify que forms submitean, links navegan, y content es readable.

### ¿Progressive enhancement significa no JavaScript?

No. Significa que JavaScript es un enhancement layer, no un requirement. Igual usás JavaScript para validation, async submissions, animations, y interactivity — pero el site funciona sin él.
