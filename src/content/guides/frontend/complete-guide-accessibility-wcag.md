---


contentType: guides
slug: complete-guide-accessibility-wcag
title: "Complete Guide to Web Accessibility: WCAG 2.2 Compliance"
description: "Master web accessibility with WCAG 2.2: ARIA roles, keyboard navigation, screen reader support, color contrast, focus management, and accessible forms."
metaDescription: "Master web accessibility with WCAG 2.2: ARIA roles, keyboard navigation, screen reader support, color contrast, focus management, and accessible forms for all users."
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
  - /guides/complete-guide-css-modern-layout
  - /recipes/css-container-queries-responsive
  - /recipes/css-custom-properties-design-tokens
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Master web accessibility with WCAG 2.2: ARIA roles, keyboard navigation, screen reader support, color contrast, focus management, and accessible forms for all users."
  keywords:
    - web accessibility
    - wcag 2.2
    - aria
    - screen readers
    - keyboard navigation
    - a11y
    - color contrast


---

## Introduction

Web accessibility means building websites that people with disabilities can use. WCAG 2.2 is the international standard with four principles: Perceivable, Operable, Understandable, and Robust. Accessibility is not optional — it's required by law in many countries and improves usability for everyone. Below is a practical guide to semantic HTML, ARIA roles, keyboard navigation, screen reader support, color contrast, focus management, and accessible forms with practical code examples.

## WCAG 2.2 Principles

```
PERCEIVABLE: Users must be able to perceive content
  - Text alternatives for images
  - Captions for video
  - Sufficient color contrast (4.5:1 for normal text, 3:1 for large text)
  - Content is resizable up to 200% without loss

OPERABLE: Users must be able to interact
  - All functionality available via keyboard
  - No keyboard traps
  - Skip navigation links
  - Enough time to read content (or pause/extend timers)

UNDERSTANDABLE: Content and interface must be understandable
  - Readable language (lang attribute on <html>)
  - Predictable navigation and behavior
  - Input error prevention and clear error messages

ROBUST: Content works with assistive technologies
  - Valid HTML
  - Compatible with screen readers and other AT
  - ARIA used correctly (only when HTML isn't enough)
```

## Semantic HTML First

```html
<!-- Bad: div soup — screen readers see nothing -->
<div class="header">
  <div class="nav">
    <div class="link" onclick="navigate('/')">Home</div>
  </div>
</div>

<!-- Good: semantic elements — screen readers understand structure -->
<header>
  <nav aria-label="Main navigation">
    <a href="/">Home</a>
  </nav>
</header>

<!-- Semantic elements provide built-in accessibility -->
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

### When to use ARIA

```html
<!-- Rule 1: If HTML provides a semantic element, use it instead of ARIA -->
<!-- Bad -->
<div role="button" tabindex="0" onclick="submit()">Submit</div>

<!-- Good -->
<button onclick="submit()">Submit</button>

<!-- Rule 2: ARIA is for when HTML isn't enough -->
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

### Common ARIA attributes

```html
<!-- aria-label: when there's no visible text -->
<button aria-label="Close dialog" onclick="closeDialog()">
  <svg aria-hidden="true"><use href="#icon-close" /></svg>
</button>

<!-- aria-labelledby: when visible text labels the element -->
<input type="search" aria-labelledby="search-label" />
<span id="search-label">Search products</span>

<!-- aria-describedby: additional description -->
<input type="password" aria-describedby="password-hint" />
<p id="password-hint">Must be at least 12 characters with a number and symbol.</p>

<!-- aria-live: announce dynamic content changes -->
<div aria-live="polite" id="status"></div>
<script>
  document.getElementById('status').textContent = 'Form saved successfully';
</div>

<!-- aria-expanded: toggle state -->
<button aria-expanded="false" aria-controls="menu" onclick="toggleMenu()">
  Menu
</button>
<ul id="menu" hidden>
  <li><a href="/settings">Settings</a></li>
  <li><a href="/logout">Logout</a></li>
</ul>

<!-- aria-hidden: hide from screen readers (decorative content) -->
<svg aria-hidden="true" class="icon">
  <path d="..." />
</svg>
```

## Keyboard Navigation

### Focus management

```css
/* Always visible focus indicator */
*:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* Don't remove focus outlines without replacement */
/* Bad: *:focus { outline: none; } */

/* Skip link for keyboard users */
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

### Roving tabindex for custom widgets

```typescript
// Tab interface: only one tab is in the tab order at a time
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

## Accessible Forms

```html
<form>
  <!-- Every input has a label -->
  <div>
    <label for="name">Full Name</label>
    <input type="text" id="name" name="name" required autocomplete="name" />
  </div>

  <!-- Required fields are marked -->
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

  <!-- Select with grouped options -->
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

  <!-- Checkbox group with fieldset/legend -->
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

  <!-- Submit button with clear text -->
  <button type="submit">Create Account</button>
</form>
```

### Form validation with ARIA

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

// Announce form submission result
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

## Color Contrast

```css
/* WCAG 2.2 contrast ratios:
   Normal text (< 18pt / 24px): 4.5:1 minimum (AA), 7:1 (AAA)
   Large text (>= 18pt / 24px or 14pt bold): 3:1 minimum (AA), 4.5:1 (AAA)
   UI components and graphical objects: 3:1 minimum
*/

/* Good contrast (AA compliant) */
.text-primary { color: #1e293b; }  /* on white: 14.7:1 */
.text-secondary { color: #475569; } /* on white: 7.6:1 */
.text-muted { color: #64748b; }    /* on white: 4.6:1 */

/* Bad contrast (fails AA) */
.text-faint { color: #94a3b8; }    /* on white: 2.9:1 — fails for normal text */

/* Focus indicator must be 3:1 against adjacent colors */
button:focus-visible {
  outline: 3px solid #2563eb;     /* blue on white: 5.2:1 */
  outline-offset: 2px;
}

/* Don't rely on color alone to convey information */
/* Bad: only red text indicates error */
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
/* Visually hidden but available to screen readers */
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

/* Show visually when focused (e.g., skip link) */
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
<!-- Provide context for screen reader users -->
<button>
  <span aria-hidden="true">🗑</span>
  <span class="sr-only">Delete item</span>
</button>

<!-- Indicate position in a list -->
<ul>
  <li>Item 1 <span class="sr-only">of 5</span></li>
  <li>Item 2 <span class="sr-only">of 5</span></li>
</ul>
```

## Accessible Modal Dialog

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
    // Focus first focusable element
    const firstFocusable = this.dialog.querySelector(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    ) as HTMLElement;
    firstFocusable?.focus();
  }

  close() {
    this.dialog.close();
  }

  private onClose() {
    // Return focus to the element that opened the modal
    this.previouslyFocused?.focus();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.close();
      return;
    }

    // Focus trap: keep focus within the dialog
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


- For a deeper guide, see [WCAG 2.2 Accessibility: A Developer Guide](/guides/accessibility-wcag-guide/).

- Use semantic HTML first — `<button>`, `<nav>`, `<main>`, `<article>` have built-in accessibility
- Add ARIA only when HTML isn't sufficient — ARIA doesn't add behavior, just semantics
- Ensure all interactions work with keyboard alone — test by unplugging your mouse
- Maintain 4.5:1 color contrast for text — use a contrast checker tool
- Provide visible focus indicators — never remove `outline` without a replacement
- Use `<label>` for every form input — click the label should focus the input
- Announce dynamic changes with `aria-live` — screen reader users need to know content updated
- Test with actual screen readers — NVDA (Windows), VoiceOver (macOS), TalkBack (Android)
- Set `lang` on `<html>` — helps screen readers pronounce content correctly
- Use `alt` text for informative images, empty `alt=""` for decorative ones

## Common Mistakes

- **Removing focus outlines**: `* { outline: none }` makes keyboard navigation impossible. Always provide a visible focus indicator.
- **Using divs for buttons**: `<div onclick>` is not keyboard accessible. Use `<button>`.
- **Missing form labels**: inputs without labels are unnamed to screen readers. Always use `<label for="id">`.
- **Color-only error indication**: red text alone is invisible to colorblind users. Add text or icons.
- **No alt text on images**: screen readers read the filename. Use descriptive `alt` or `alt=""` for decorative images.
- **Heading hierarchy skips**: jumping from `<h1>` to `<h4>` breaks document outline. Don't skip levels.

## FAQ

### What is WCAG 2.2?

The Web Content Accessibility Guidelines version 2.2, published by the W3C. It defines three conformance levels: A (lowest), AA (target for most organizations), and AAA (highest). WCAG 2.2 added requirements for focus appearance, dragging movements, and target size.

### What is ARIA?

Accessible Rich Internet Applications. A set of HTML attributes that add accessibility information to custom widgets. ARIA doesn't add behavior — it only communicates semantics to assistive technologies. Use it when HTML's built-in semantics aren't enough.

### How do I test accessibility?

Use automated tools (axe DevTools, Lighthouse) for quick audits. Test with keyboard only (Tab, Shift+Tab, Enter, Space, arrows). Test with a screen reader (NVDA on Windows, VoiceOver on macOS). Test at 200% zoom. Check color contrast with a contrast checker.

### What color contrast ratio do I need?

WCAG AA requires 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt bold), and 3:1 for UI components and graphical objects. WCAG AAA requires 7:1 for normal text and 4.5:1 for large text.

### What is a focus trap?

A pattern that keeps keyboard focus within a modal dialog or widget. When the user tabs past the last focusable element, focus wraps to the first element. This prevents users from interacting with content behind the modal.
