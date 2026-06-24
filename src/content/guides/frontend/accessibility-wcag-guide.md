---
contentType: guides
slug: accessibility-wcag-guide
title: "WCAG 2.2 Accessibility — A Developer Guide"
description: "A practical guide to WCAG 2.2 compliance: perceivable, operable, understandable, and robust principles with code examples for web accessibility."
metaDescription: "Learn WCAG 2.2 accessibility: perceivable, operable, understandable, robust. Practical guide with code examples for accessible web development."
difficulty: intermediate
topics:
  - frontend
tags:
  - accessibility
  - wcag
  - wcag-2.2
  - a11y
  - screen-reader
  - keyboard-navigation
  - aria
  - guide
relatedResources:
  - /guides/progressive-web-apps-guide
  - /guides/web-components-guide
  - /patterns/design/circuit-breaker-pattern
  - /recipes/frontend/implement-accessible-modal
  - /recipes/frontend/build-responsive-layout
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn WCAG 2.2 accessibility: perceivable, operable, understandable, robust. Practical guide with code examples for accessible web development."
  keywords:
    - accessibility
    - wcag
    - wcag-2.2
    - a11y
    - screen-reader
    - keyboard-navigation
    - aria
    - guide
---

## Overview

Web accessibility (a11y) ensures that people with disabilities can perceive, understand, navigate, and interact with web content. WCAG 2.2 (Web Content Accessibility Guidelines) is the current standard, organized around four principles: Perceivable, Operable, Understandable, and Robust (POUR). This guide covers the most impactful success criteria with practical code examples.

## When to Use

- You are building public-facing websites or applications
- You need to meet legal requirements (ADA, EAA, Section 508)
- You want to improve usability for all users, including those using screen readers or keyboard navigation
- You are conducting an accessibility audit

## The Four Principles (POUR)

| Principle | What It Means | Key Criteria |
|-----------|--------------|--------------|
| **Perceivable** | Information must be presentable in ways users can perceive | Alt text, color contrast, resizable text |
| **Operable** | Interface components must be operable by all users | Keyboard navigation, focus indicators, timing |
| **Understandable** | Information and operation must be understandable | Readable text, predictable behavior, error prevention |
| **Robust** | Content must work with current and future assistive tech | Valid HTML, ARIA roles, name-role-value |

## Perceivable

### Text Alternatives (1.1.1)

All non-text content must have a text alternative.

```html
<!-- Good: descriptive alt text -->
<img src="chart.png" alt="Bar chart showing Q1-Q4 revenue growth from 2M to 5M" />

<!-- Good: decorative image hidden from screen readers -->
<img src="decoration.png" alt="" />

<!-- Bad: missing or useless alt text -->
<img src="chart.png" />
<img src="chart.png" alt="image" />
```

### Color Contrast (1.4.3)

Text must have sufficient contrast against its background.

| Level | Normal Text | Large Text |
|-------|-------------|------------|
| AA | 4.5:1 | 3:1 |
| AAA | 7:1 | 4.5:1 |

```css
/* Check with tools like WebAIM Contrast Checker */
.text-primary {
  color: #1a1a1a; /* dark gray */
  background: #ffffff;
  /* Ratio: 16.1:1 — passes AAA */
}

.text-muted {
  color: #767676; /* medium gray */
  background: #ffffff;
  /* Ratio: 4.6:1 — passes AA, not AAA */
}
```

### Resizable Text (1.4.4)

Text must be resizable up to 200% without loss of content or functionality.

```css
/* Good: relative units */
body {
  font-size: 100%; /* respects user browser setting */
}

h1 {
  font-size: 2rem; /* scales with root font size */
}

/* Bad: fixed pixels that break zoom */
body { font-size: 16px; }
```

## Operable

### Keyboard Accessible (2.1.1)

All functionality must be available from a keyboard.

```html
<!-- Good: native elements are keyboard accessible -->
<button onclick="submit()">Submit</button>
<a href="/next">Next Page</a>

<!-- Bad: div pretending to be a button -->
<div class="btn" onclick="submit()">Submit</div>

<!-- Good: custom component with keyboard support -->
<div role="button" tabindex="0" 
     onclick="submit()" 
     onkeydown="if(event.key==='Enter') submit()">
  Submit
</div>
```

### Focus Visible (2.4.7)

Keyboard focus must be visually indicated.

```css
/* Never remove focus indicators without replacement */
*:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* Custom focus style for interactive elements */
button:focus-visible,
a:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 95, 204, 0.4);
}
```

### Bypass Blocks (2.4.1)

Provide a way to skip repetitive content.

```html
<!-- Skip link for keyboard users -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<nav><!-- navigation --></nav>

<main id="main-content">
  <!-- primary content -->
</main>
```

## Understandable

### Readable Text (3.1.5)

Content should be readable at a lower secondary education level.

```html
<!-- Good: clear, simple language -->
<p>Enter your email to reset your password.</p>

<!-- Bad: jargon and complexity -->
<p>Input your registered electronic mail address to initiate credential recovery protocol.</p>
```

### Error Prevention (3.3.4)

Prevent errors on legal/financial/data-modifying submissions.

```html
<!-- Good: confirmation for destructive actions -->
<form onsubmit="return confirm('Delete this account permanently?')">
  <button type="submit">Delete Account</button>
</form>

<!-- Good: review before final submission -->
<form>
  <fieldset>
    <legend>Review your order</legend>
    <!-- summary of order -->
  </fieldset>
  <button type="submit">Confirm Payment</button>
</form>
```

## Robust

### Valid HTML and ARIA (4.1.1, 4.1.2)

Use valid markup and proper ARIA roles.

```html
<!-- Good: native semantic element -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<!-- Good: ARIA for custom components -->
<div role="tablist">
  <button role="tab" aria-selected="true" id="tab-1">Tab 1</button>
  <button role="tab" aria-selected="false" id="tab-2">Tab 2</button>
</div>
<div role="tabpanel" aria-labelledby="tab-1">Panel content</div>
```

## Testing Accessibility

| Tool | Purpose |
|------|---------|
| axe DevTools | Browser extension for automated checks |
| Lighthouse | Built-in Chrome accessibility audit |
| NVDA / JAWS | Screen reader testing (Windows) |
| VoiceOver | Screen reader testing (macOS) |
| Tab key | Manual keyboard navigation test |
| WAVE | WebAIM accessibility evaluation tool |

## Common Mistakes

- **Using `outline: none` without replacement** — keyboard users lose their place
- **Relying solely on color for errors** — add icons and text
- **Missing form labels** — every input needs an associated label
- **Autoplaying media without controls** — respect `prefers-reduced-motion`
- **Infinite scroll without skip mechanism** — provide pagination or search

## FAQ

**What WCAG level should I target?**
Level AA is the standard for most legal requirements. Level AAA is aspirational for critical content.

**Do I need to test with actual screen readers?**
Automated tools catch ~30% of issues. Manual testing with screen readers and keyboard navigation finds the rest.

**How do I handle dynamic content (SPA, AJAX)?**
Use ARIA live regions to announce updates, manage focus on route changes, and ensure modals trap focus.
