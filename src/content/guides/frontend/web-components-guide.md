---
contentType: guides
slug: web-components-guide
title: "Web Components — Custom Elements, Shadow DOM & Templates"
description: "A practical guide to Web Components: creating reusable custom elements, encapsulating styles with Shadow DOM, and composing with HTML templates."
metaDescription: "Learn Web Components: custom elements, Shadow DOM, HTML templates. Practical guide for building reusable, framework-agnostic web components."
difficulty: intermediate
topics:
  - frontend
tags:
  - web-components
  - custom-elements
  - shadow-dom
  - html-templates
  - framework-agnostic
  - reusable-components
  - guide
relatedResources:
  - /guides/accessibility-wcag-guide
  - /guides/progressive-web-apps-guide
  - /patterns/design/factory-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn Web Components: custom elements, Shadow DOM, HTML templates. Practical guide for building reusable, framework-agnostic web components."
  keywords:
    - web-components
    - custom-elements
    - shadow-dom
    - html-templates
    - framework-agnostic
    - reusable-components
    - guide
---

## Overview

Web Components are a set of browser-native APIs for creating reusable, encapsulated HTML elements. They work in any framework — or without one — and provide true style and DOM encapsulation via Shadow DOM. This guide covers the three core technologies: Custom Elements, Shadow DOM, and HTML Templates, with practical examples you can use today.

## When to Use

- You need reusable UI elements shared across different projects or frameworks
- You want style encapsulation without CSS-in-JS or BEM naming conventions
- You are building a design system that must work in React, Vue, Angular, or vanilla JS
- You need to extend native HTML elements with custom behavior
- You want framework-independent components for long-term maintainability

## The Three Technologies

| Technology | Purpose | Standard |
|------------|---------|----------|
| **Custom Elements** | Define new HTML tags with JavaScript | Custom Elements v1 |
| **Shadow DOM** | Encapsulate DOM and styles inside a component | Shadow DOM v1 |
| **HTML Templates** | Declare reusable markup fragments | HTML Template Element |

## Custom Elements

### Autonomous Custom Elements

Create entirely new HTML tags.

```javascript
class UserCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const name = this.getAttribute('name') || 'Anonymous';
    const role = this.getAttribute('role') || 'User';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
        .name { font-weight: 600; color: #111827; }
        .role { color: #6b7280; font-size: 0.875rem; }
      </style>
      <div class="name">${name}</div>
      <div class="role">${role}</div>
    `;
  }

  static get observedAttributes() {
    return ['name', 'role'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) this.render();
  }
}

customElements.define('user-card', UserCard);
```

```html
<!-- Usage -->
<user-card name="Alice Chen" role="Senior Engineer"></user-card>
<user-card name="Bob Smith" role="Product Manager"></user-card>
```

### Customized Built-in Elements

Extend existing HTML elements with new behavior.

```javascript
class ConfirmButton extends HTMLButtonElement {
  constructor() {
    super();
    this.addEventListener('click', (e) => {
      if (!confirm(this.getAttribute('confirm-message') || 'Are you sure?')) {
        e.preventDefault();
      }
    });
  }
}

customElements.define('confirm-button', ConfirmButton, { extends: 'button' });
```

```html
<!-- Usage via is="" attribute -->
<button is="confirm-button" confirm-message="Delete this file permanently?">
  Delete
</button>
```

## Shadow DOM

### Encapsulation

Shadow DOM isolates a component's DOM and CSS from the rest of the page.

```javascript
class StyledCounter extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    
    shadow.innerHTML = `
      <style>
        /* Scoped to this component only */
        button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          cursor: pointer;
        }
        button:hover { background: #2563eb; }
        span { margin-left: 0.5rem; font-weight: 600; }
      </style>
      <button id="inc">+</button>
      <span id="count">0</span>
    `;
    
    this.count = 0;
    shadow.getElementById('inc').addEventListener('click', () => {
      this.count++;
      shadow.getElementById('count').textContent = this.count;
    });
  }
}

customElements.define('styled-counter', StyledCounter);
```

### Slots

Slots let users inject content into a component's shadow DOM.

```javascript
class AlertBox extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: block; padding: 1rem; border-radius: 0.5rem; }
        :host([type="error"]) { background: #fef2f2; border: 1px solid #fca5a5; }
        :host([type="warning"]) { background: #fffbeb; border: 1px solid #fcd34d; }
        :host([type="success"]) { background: #f0fdf4; border: 1px solid #86efac; }
        ::slotted(h3) { margin: 0 0 0.5rem; font-size: 1rem; }
        ::slotted(p) { margin: 0; color: #4b5563; }
      </style>
      <slot name="title"></slot>
      <slot></slot>
    `;
  }
}

customElements.define('alert-box', AlertBox);
```

```html
<!-- Usage with named slots -->
<alert-box type="error">
  <h3 slot="title">Connection Failed</h3>
  <p>Unable to reach the server. Please check your network and try again.</p>
</alert-box>
```

## HTML Templates

Templates declare reusable markup that is not rendered until cloned.

```html
<template id="user-row-template">
  <tr>
    <td class="name"></td>
    <td class="email"></td>
    <td><button class="delete">Remove</button></td>
  </tr>
</template>
```

```javascript
function createUserRow(user) {
  const template = document.getElementById('user-row-template');
  const clone = template.content.cloneNode(true);
  
  clone.querySelector('.name').textContent = user.name;
  clone.querySelector('.email').textContent = user.email;
  clone.querySelector('.delete').addEventListener('click', () => removeUser(user.id));
  
  return clone;
}

// Append to table
document.querySelector('#users tbody').appendChild(createUserRow({
  name: 'Alice Chen',
  email: 'alice@example.com'
}));
```

## Component Lifecycle

| Callback | When It Fires | Common Use |
|----------|--------------|------------|
| `constructor()` | Element created | Initialize state, attach shadow root |
| `connectedCallback()` | Inserted into DOM | Render, fetch data, add event listeners |
| `disconnectedCallback()` | Removed from DOM | Clean up timers, event listeners, subscriptions |
| `attributeChangedCallback()` | Observed attribute changes | Re-render, validate, update internal state |
| `adoptedCallback()` | Moved to new document | Rarely used; cleanup and re-initialize |

## Framework Integration

Web Components work in any framework.

```jsx
// React
import 'my-ui-library';

function App() {
  return (
    <div>
      <user-card name="Alice" role="Engineer" />
      <alert-box type="success">
        <h3 slot="title">Saved</h3>
        <p>Your changes have been saved.</p>
      </alert-box>
    </div>
  );
}
```

```vue
<!-- Vue -->
<template>
  <user-card :name="user.name" :role="user.role" />
</template>

<script>
import 'my-ui-library';
export default { props: ['user'] };
</script>
```

## Common Mistakes

- **Forgetting to handle attribute changes** — observed attributes must trigger re-render
- **Using `innerHTML` on the host element** — always use Shadow DOM for component markup
- **Not cleaning up in `disconnectedCallback()`** — memory leaks from orphaned event listeners
- **Assuming `constructor` runs after DOM insertion** — it runs at creation; DOM may not exist yet
- **Missing polyfills for older browsers** — Edge 18 and IE11 need the webcomponentsjs polyfill

## FAQ

**Do Web Components replace React/Vue/Angular?**
No — they complement them. Use Web Components for reusable design system elements that must work across frameworks, or for framework-agnostic embeddable widgets.

**Can Web Components use external CSS frameworks?**
Yes, but Shadow DOM blocks global CSS. Import styles inside the shadow root or use CSS custom properties (variables) as a styling API.

**How do I test Web Components?**
Use the browser's built-in tools or frameworks like Playwright/Web Test Runner. Shadow DOM requires special selectors: `shadowRoot.querySelector()`.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.
