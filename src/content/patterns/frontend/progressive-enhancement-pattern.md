---
contentType: patterns
slug: progressive-enhancement-pattern
title: "Progressive Enhancement Pattern: Build Functional Baseline, Enhance with JS"
description: "How to build a functional HTML baseline and progressively enhance with JavaScript. Covers core functionality, feature detection, graceful degradation, and accessibility."
metaDescription: "Build a functional HTML baseline and progressively enhance with JavaScript. Learn feature detection, graceful degradation, accessibility, and no-JS fallbacks."
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
  metaDescription: "Build a functional HTML baseline and progressively enhance with JavaScript. Learn feature detection, graceful degradation, accessibility, and no-JS fallbacks."
  keywords:
    - frontend
    - progressive-enhancement
    - accessibility
    - html
    - pattern
---

## Overview

Progressive enhancement starts with a functional HTML baseline that works without JavaScript, then adds layers of enhancement: CSS for presentation and JavaScript for interactivity. The core functionality — submitting forms, navigating pages, reading content — works even if JavaScript fails to load or is disabled. JavaScript adds validation, dynamic updates, animations, and other improvements on top of the working baseline. This approach ensures robustness, accessibility, and SEO — search engines and screen readers get the content regardless of JavaScript availability.

## When to Use

- Public-facing websites where SEO and accessibility matter
- Forms that must work even when JavaScript fails
- Content sites where the primary value is reading
- Applications targeting users on slow connections or older browsers
- Any site where robustness is more important than flashy interactions

## When NOT to Use

- Highly interactive applications (editors, games, chat) where HTML alone can't provide value
- Internal tools where you control the browser and network conditions
- Real-time dashboards that require JavaScript to function
- Applications where the entire value proposition is JavaScript-based interactivity

## Solution

### Layer 1: Functional HTML baseline

```html
<!-- contact-form.html — works without JavaScript -->
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
/* contact-form.css — enhance the baseline */
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

/* Only show JS-enhanced states when JS is available */
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
// contact-form.js — enhance the form with validation and async submit
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

  // Async submission — only if JS is available
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate all fields
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

### Feature detection before enhancement

```javascript
// feature-detection.js — check capabilities before enhancing
const features = {
  fetch: typeof fetch !== 'undefined',
  intersectionObserver: 'IntersectionObserver' in window,
  customElements: 'customElements' in window,
  webp: document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0,
  serviceWorker: 'serviceWorker' in navigator,
};

// Only enhance if features are available
if (features.fetch) {
  enhanceFormSubmission();
}

if (features.intersectionObserver) {
  lazyLoadImages();
} else {
  // Fallback: load all images immediately
  loadAllImages();
}

if (features.serviceWorker) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Service worker failed — site still works without it
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
<!-- nav.html — works as regular links, enhanced to SPA-style navigation -->
<nav class="main-nav">
  <a href="/" data-link>Home</a>
  <a href="/about" data-link>About</a>
  <a href="/products" data-link>Products</a>
  <a href="/contact" data-link>Contact</a>
</nav>
```

```javascript
// nav-enhance.js — enhance links for SPA-style navigation
if (features.fetch && features.customElements) {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;

    // Only handle same-origin links
    if (link.origin !== window.location.origin) return;

    e.preventDefault();

    loadPage(link.href);
  });

  async function loadPage(url) {
    const main = document.querySelector('main');

    // Show loading state
    main.style.opacity = '0.5';

    try {
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Update content
      main.innerHTML = doc.querySelector('main').innerHTML;
      main.style.opacity = '1';

      // Update URL and title
      window.history.pushState({}, '', url);
      document.title = doc.title;

      // Scroll to top
      window.scrollTo(0, 0);
    } catch {
      // Fallback: navigate normally
      window.location.href = url;
    }
  }

  // Handle back/forward
  window.addEventListener('popstate', () => {
    loadPage(window.location.href);
  });
}
```

### Table sorting enhancement

```html
<!-- data-table.html — functional table, enhanced with sorting -->
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
// table-sort.js — enhance table with click-to-sort
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

### Universal rendering with enhancement

```javascript
// server-rendered HTML that hydrates progressively
// Server sends full HTML, client enhances specific parts
document.addEventListener('DOMContentLoaded', () => {
  // Only enhance if browser supports the needed APIs
  if (!('fetch' in window) || !('IntersectionObserver' in window)) {
    return; // Baseline HTML works fine
  }

  // Enhance search
  const searchInput = document.querySelector('#search-input');
  if (searchInput) {
    enhanceSearch(searchInput);
  }

  // Enhance cart
  const cartButton = document.querySelector('#add-to-cart');
  if (cartButton) {
    enhanceCart(cartButton);
  }
});
```

### No-JS fallback with noscript

```html
<!-- Provide fallback for JavaScript-dependent features -->
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

- Start with HTML that works — forms submit, links navigate, content is readable
- Use feature detection, not browser sniffing — check `if ('fetch' in window)` not `if (isChrome)`
- Add the `js` class to `<html>` — use `.js .component` selectors so enhanced styles only apply when JS is available
- Enhance, don't replace — JavaScript should improve the HTML baseline, not replace it with something that breaks without JS
- Test with JavaScript disabled — disable JS in DevTools and verify the page still works
- Keep server-side validation — client-side validation is enhancement; server-side is required
- Use `data-enhance` attributes — mark elements for enhancement so the JS layer knows what to improve
- Provide loading states for async operations — users need feedback when JS takes over

## Common Mistakes

- **JavaScript-only forms**: form has no `action` attribute and relies entirely on JS. Without JS, the form does nothing.
- **No server-side validation**: trusting client-side validation. Bypass JS and submit invalid data directly to the server.
- **Replacing instead of enhancing**: JS removes the HTML table and rebuilds it as a React component. Without JS, no table.
- **Not testing without JS**: the site works in development (JS always loads) but breaks for users with JS disabled or slow connections.
- **CSS-dependent on JS**: styles that only work when JS adds classes. The un-JS version looks broken even though it functions.

## FAQ

### What is progressive enhancement?

A layered approach: HTML provides the functional baseline, CSS adds presentation, JavaScript adds interactivity. Each layer builds on the one below. If JavaScript fails, the HTML still works.

### How is this different from graceful degradation?

Progressive enhancement starts simple and adds features. Graceful degradation starts with full features and tries to handle failures. Progressive enhancement is generally more robust because the baseline always works.

### Should every site use progressive enhancement?

Public-facing sites, yes — SEO and accessibility require it. Internal tools and highly interactive apps may not need it if you control the environment.

### How do I test without JavaScript?

In Chrome DevTools: Command Palette > Run Command > "Show JavaScript disabled" or use Network conditions to block JavaScript. Verify forms submit, links navigate, and content is readable.

### Does progressive enhancement mean no JavaScript?

No. It means JavaScript is an enhancement layer, not a requirement. You still use JavaScript for validation, async submissions, animations, and interactivity — but the site works without it.
