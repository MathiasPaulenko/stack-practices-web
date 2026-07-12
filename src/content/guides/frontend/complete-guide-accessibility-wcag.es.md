---
contentType: guides
slug: complete-guide-accessibility-wcag
title: "Referencia Detallada de Accesibilidad Web: WCAG 2.2"
description: "Dominá accesibilidad web con WCAG 2.2: roles ARIA, navegación por teclado, soporte para screen readers, contraste de color y formularios accesibles."
metaDescription: "Dominá accesibilidad web con WCAG 2.2: roles ARIA, navegación por teclado, soporte para screen readers, contraste de color y formularios accesibles para todos."
difficulty: intermediate
topics:
  - frontend
tags:
  - guide
  - accessibility
  - wcag
  - aria
  - a11y
  - screen-readers
  - frontend
relatedResources:
  - /guides/frontend/complete-guide-css-modern-layout
  - /recipes/frontend/css-container-queries-responsive
  - /recipes/frontend/css-custom-properties-design-tokens
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Dominá accesibilidad web con WCAG 2.2: roles ARIA, navegación por teclado, soporte para screen readers, contraste de color y formularios accesibles para todos."
  keywords:
    - web accessibility
    - wcag 2.2
    - aria
    - screen readers
    - keyboard navigation
    - a11y
    - color contrast
---

## Introducción

Accesibilidad web significa construir websites que people con disabilities pueden usar. WCAG 2.2 es el international standard con cuatro principles: Perceivable, Operable, Understandable y Robust. Accesibilidad no es optional — es required por law en muchos countries y mejora usability para todos. A continuación: semantic HTML, ARIA roles, keyboard navigation, screen reader support, color contrast, focus management y accessible forms con practical code examples.

## WCAG 2.2 Principles

```
PERCEIVABLE: Users deben poder perceive content
  - Text alternatives para images
  - Captions para video
  - Sufficient color contrast (4.5:1 para normal text, 3:1 para large text)
  - Content es resizable hasta 200% sin loss

OPERABLE: Users deben poder interact
  - All functionality available via keyboard
  - No keyboard traps
  - Skip navigation links
  - Enough time para read content (o pause/extend timers)

UNDERSTANDABLE: Content y interface deben ser understandable
  - Readable language (lang attribute en <html>)
  - Predictable navigation y behavior
  - Input error prevention y clear error messages

ROBUST: Content funciona con assistive technologies
  - Valid HTML
  - Compatible con screen readers y other AT
  - ARIA usado correctamente (solo cuando HTML no es enough)
```

## Semantic HTML First

```html
<!-- Bad: div soup — screen readers no ven nada -->
<div class="header">
  <div class="nav">
    <div class="link" onclick="navigate('/')">Home</div>
  </div>
</div>

<!-- Good: semantic elements — screen readers entienden structure -->
<header>
  <nav aria-label="Main navigation">
    <a href="/">Home</a>
  </nav>
</header>

<!-- Semantic elements proveen built-in accessibility -->
<main>
  <article>
    <header>
      <h1>Article Title</h1>
      <time datetime="2026-07-05">July 5, 2026</time>
    </header>
    <section>
      <h2>Section Heading</h2>
      <p>Content...</p>
    </section>
    <aside>
      <h2>Related</h2>
      <ul>
        <li><a href="/related-1">Related Article 1</a></li>
      </ul>
    </aside>
  </article>
</main>
```

## ARIA Roles

### Cuándo usar ARIA

```html
<!-- Rule 1: Si HTML provee un semantic element, usalo en vez de ARIA -->
<!-- Bad -->
<div role="button" tabindex="0" onclick="submit()">Submit</div>

<!-- Good -->
<button onclick="submit()">Submit</button>

<!-- Rule 2: ARIA es para cuando HTML no es enough -->
<!-- Custom widget: tab interface -->
<div role="tablist">
  <button role="tab" id="tab-1" aria-selected="true" aria-controls="panel-1">Tab 1</button>
  <button role="tab" id="tab-2" aria-selected="false" aria-controls="panel-2" tabindex="-1">Tab 2</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  Content for tab 1
</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
  Content for tab 2
</div>
```

### ARIA attributes comunes

```html
<!-- aria-label: cuando no hay visible text -->
<button aria-label="Close dialog" onclick="closeDialog()">
  <svg aria-hidden="true"><use href="#icon-close" /></svg>
</button>

<!-- aria-labelledby: cuando visible text labeléa el element -->
<input type="search" aria-labelledby="search-label" />
<span id="search-label">Search products</span>

<!-- aria-describedby: additional description -->
<input type="password" aria-describedby="password-hint" />
<p id="password-hint">Must be at least 12 characters with a number and symbol.</p>

<!-- aria-live: announceéa dynamic content changes -->
<div aria-live="polite" id="status"></div>
<script>
  document.getElementById('status').textContent = 'Form saved successfully';
</script>

<!-- aria-expanded: toggle state -->
<button aria-expanded="false" aria-controls="menu" onclick="toggleMenu()">
  Menu
</button>
<ul id="menu" hidden>
  <li><a href="/settings">Settings</a></li>
  <li><a href="/logout">Logout</a></li>
</ul>

<!-- aria-hidden: hide de screen readers (decorative content) -->
<svg aria-hidden="true" class="icon">
  <path d="..." />
</svg>
```

## Navegación por Teclado

### Focus management

```css
/* Always visible focus indicator */
*:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* No removás focus outlines sin replacement */
/* Bad: *:focus { outline: none; } */

/* Skip link para keyboard users */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #2563eb;
  color: white;
  padding: 8px 16px;
  z-index: 100;
  transition: top 0.2s;
}
.skip-link:focus {
  top: 0;
}
```

```html
<!-- Skip to main content link -->
<a href="#main" class="skip-link">Skip to main content</a>
<nav>...</nav>
<main id="main">
  <h1>Page content</h1>
</main>
```

### Roving tabindex para custom widgets

```typescript
// Tab interface: solo un tab está en el tab order a la vez
class TabList {
  private tabs: HTMLElement[] = [];
  private activeIndex = 0;

  constructor(container: HTMLElement) {
    this.tabs = Array.from(container.querySelectorAll('[role="tab"]'));
    this.tabs.forEach((tab, index) => {
      tab.addEventListener("keydown", this.handleKeyDown.bind(this));
      tab.addEventListener("click", () => this.activate(index));
    });
    this.updateTabindex();
  }

  private updateTabindex() {
    this.tabs.forEach((tab, index) => {
      tab.tabIndex = index === this.activeIndex ? 0 : -1;
      tab.setAttribute("aria-selected", String(index === this.activeIndex));
    });
  }

  private activate(index: number) {
    this.activeIndex = index;
    this.updateTabindex();
    this.tabs[index].focus();
    // Show corresponding panel...
  }

  private handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        this.activate((this.activeIndex + 1) % this.tabs.length);
        break;
      case "ArrowLeft":
        e.preventDefault();
        this.activate((this.activeIndex - 1 + this.tabs.length) % this.tabs.length);
        break;
      case "Home":
        e.preventDefault();
        this.activate(0);
        break;
      case "End":
        e.preventDefault();
        this.activate(this.tabs.length - 1);
        break;
    }
  }
}
```

## Formularios Accesibles

```html
<form>
  <!-- Cada input tiene un label -->
  <div>
    <label for="name">Full Name</label>
    <input type="text" id="name" name="name" required autocomplete="name" />
  </div>

  <!-- Required fields están marked -->
  <div>
    <label for="email">
      Email <span aria-hidden="true" class="required">*</span>
      <span class="sr-only">(required)</span>
    </label>
    <input
      type="email"
      id="email"
      name="email"
      required
      autocomplete="email"
      aria-describedby="email-error"
      aria-invalid="false"
    />
    <p id="email-error" class="error" role="alert"></p>
  </div>

  <!-- Select con grouped options -->
  <div>
    <label for="country">Country</label>
    <select id="country" name="country">
      <optgroup label="North America">
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </optgroup>
      <optgroup label="Europe">
        <option value="uk">United Kingdom</option>
        <option value="de">Germany</option>
      </optgroup>
    </select>
  </div>

  <!-- Checkbox group con fieldset/legend -->
  <fieldset>
    <legend>Notification Preferences</legend>
    <label><input type="checkbox" name="notify" value="email" /> Email</label>
    <label><input type="checkbox" name="notify" value="sms" /> SMS</label>
    <label><input type="checkbox" name="notify" value="push" /> Push notifications</label>
  </fieldset>

  <!-- Radio group -->
  <fieldset>
    <legend>Subscription Plan</legend>
    <label><input type="radio" name="plan" value="free" /> Free</label>
    <label><input type="radio" name="plan" value="pro" /> Pro ($9/month)</label>
  </fieldset>

  <!-- Submit button con clear text -->
  <button type="submit">Create Account</button>
</form>
```

### Form validation con ARIA

```typescript
// Accessible form validation
function validateField(field: HTMLInputElement): boolean {
  const errorEl = document.getElementById(`${field.id}-error`);
  const isValid = field.checkValidity();

  field.setAttribute("aria-invalid", String(!isValid));

  if (!isValid && errorEl) {
    errorEl.textContent = field.validationMessage;
    errorEl.style.display = "block";
  } else if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  return isValid;
}

// Announceéa form submission result
function announceResult(message: string) {
  const announcer = document.getElementById("form-status");
  announcer.textContent = message;
}

// Usage
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fields = Array.from(form.querySelectorAll("input[required]"));
  const allValid = fields.every(validateField);

  if (!allValid) {
    announceResult("Please fix the errors above.");
    fields.find((f) => f.getAttribute("aria-invalid") === "true")?.focus();
    return;
  }

  announceResult("Form submitted successfully.");
});
```

## Contraste de Color

```css
/* WCAG 2.2 contrast ratios:
   Normal text (< 18pt / 24px): 4.5:1 minimum (AA), 7:1 (AAA)
   Large text (>= 18pt / 24px o 14pt bold): 3:1 minimum (AA), 4.5:1 (AAA)
   UI components y graphical objects: 3:1 minimum
*/

/* Good contrast (AA compliant) */
.text-primary { color: #1e293b; }  /* on white: 14.7:1 */
.text-secondary { color: #475569; } /* on white: 7.6:1 */
.text-muted { color: #64748b; }    /* on white: 4.6:1 */

/* Bad contrast (fails AA) */
.text-faint { color: #94a3b8; }    /* on white: 2.9:1 — fails para normal text */

/* Focus indicator debe ser 3:1 contra adjacent colors */
button:focus-visible {
  outline: 3px solid #2563eb;     /* blue on white: 5.2:1 */
  outline-offset: 2px;
}

/* No relies solo en color para convey information */
/* Bad: solo red text indica error */
.error { color: #dc2626; }

/* Good: icon + text + color */
.error {
  color: #dc2626;
}
.error::before {
  content: "⚠ ";
  aria-hidden: true;
}
```

## Screen Reader Only Content

```css
/* Visually hidden pero available para screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Show visually cuando focused (e.g., skip link) */
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

```html
<!-- Proveé context para screen reader users -->
<button>
  <span aria-hidden="true">🗑</span>
  <span class="sr-only">Delete item</span>
</button>

<!-- Indicá position en un list -->
<ul>
  <li>Item 1 <span class="sr-only">of 5</span></li>
  <li>Item 2 <span class="sr-only">of 5</span></li>
</ul>
```

## Modal Dialog Accesible

```typescript
class AccessibleModal {
  private dialog: HTMLDialogElement;
  private previouslyFocused: HTMLElement | null = null;

  constructor(dialog: HTMLDialogElement) {
    this.dialog = dialog;
    dialog.addEventListener("close", this.onClose.bind(this));
    dialog.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  open() {
    this.previouslyFocused = document.activeElement as HTMLElement;
    this.dialog.showModal();
    // Focusá first focusable element
    const firstFocusable = this.dialog.querySelector(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    ) as HTMLElement;
    firstFocusable?.focus();
  }

  close() {
    this.dialog.close();
  }

  private onClose() {
    // Return focus al element que abrió el modal
    this.previouslyFocused?.focus();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.close();
      return;
    }

    // Focus trap: mantené focus dentro del dialog
    if (e.key !== "Tab") return;

    const focusables = Array.from(
      this.dialog.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      )
    ).filter((el) => !el.hasAttribute("disabled"));

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
```

```html
<dialog aria-labelledby="modal-title" aria-describedby="modal-desc">
  <h2 id="modal-title">Confirm Deletion</h2>
  <p id="modal-desc">Are you sure you want to delete this item? This action cannot be undone.</p>
  <div class="actions">
    <button onclick="modal.close()">Cancel</button>
    <button onclick="confirmDelete()">Delete</button>
  </div>
</dialog>
```

## Best Practices

- Usá semantic HTML first — `<button>`, `<nav>`, `<main>`, `<article>` tienen built-in accessibility
- Agregá ARIA solo cuando HTML no es sufficient — ARIA no agrega behavior, solo semantics
- Asegurate que todas las interactions funcionen con keyboard alone — testéa desplugging tu mouse
- Mantené 4.5:1 color contrast para text — usá un contrast checker tool
- Proveé visible focus indicators — nunca removás `outline` sin un replacement
- Usá `<label>` para cada form input — click el label debería focusar el input
- Announceéa dynamic changes con `aria-live` — screen reader users necesitan saber que content updated
- Testéa con actual screen readers — NVDA (Windows), VoiceOver (macOS), TalkBack (Android)
- Seteá `lang` en `<html>` — ayuda a screen readers pronounce content correctamente
- Usá `alt` text para informative images, empty `alt=""` para decorative ones

## Common Mistakes

- **Remover focus outlines**: `* { outline: none }` hace keyboard navigation impossible. Siempre proveé un visible focus indicator.
- **Usar divs para buttons**: `<div onclick>` no es keyboard accessible. Usá `<button>`.
- **Missing form labels**: inputs sin labels son unnamed para screen readers. Siempre usá `<label for="id">`.
- **Color-only error indication**: red text solo es invisible para colorblind users. Agregá text o icons.
- **No alt text en images**: screen readers leen el filename. Usá descriptive `alt` o `alt=""` para decorative images.
- **Heading hierarchy skips**: saltar de `<h1>` a `<h4>` break el document outline. No saltes levels.

## FAQ

### ¿Qué es WCAG 2.2?

Los Web Content Accessibility Guidelines version 2.2, published por el W3C. Define tres conformance levels: A (lowest), AA (target para most organizations) y AAA (highest). WCAG 2.2 agregó requirements para focus appearance, dragging movements y target size.

### ¿Qué es ARIA?

Accessible Rich Internet Applications. Un set de HTML attributes que agregan accessibility information a custom widgets. ARIA no agrega behavior — solo comunica semantics a assistive technologies. Usalo cuando HTML's built-in semantics no son enough.

### ¿Cómo testeo accesibilidad?

Usá automated tools (axe DevTools, Lighthouse) para quick audits. Testéa con keyboard only (Tab, Shift+Tab, Enter, Space, arrows). Testéa con un screen reader (NVDA en Windows, VoiceOver en macOS). Testéa a 200% zoom. Checkeá color contrast con un contrast checker.

### ¿Qué color contrast ratio necesito?

WCAG AA requiere 4.5:1 para normal text, 3:1 para large text (18pt+ o 14pt bold) y 3:1 para UI components y graphical objects. WCAG AAA requiere 7:1 para normal text y 4.5:1 para large text.

### ¿Qué es un focus trap?

Un pattern que mantiene keyboard focus dentro de un modal dialog o widget. Cuando el user tabs past el last focusable element, focus wrappea al first element. Esto previene que users interactuen con content detrás del modal.
