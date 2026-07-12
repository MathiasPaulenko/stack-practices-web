---


contentType: docs
slug: component-api-documentation-template
title: "Component API Documentation Template"
description: "A template for documenting UI component APIs: props, events, slots, methods, accessibility, and usage examples with TypeScript types."
metaDescription: "Use this component API documentation template to document props, events, slots, methods, accessibility attributes, and usage examples with types."
difficulty: intermediate
topics:
  - testing
tags:
  - frontend
  - components
  - api
  - documentation
  - template
  - design-system
  - typescript
relatedResources:
  - /docs/frontend-performance-budget-template
  - /docs/accessibility-audit-checklist
  - /docs/browser-support-matrix-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this component API documentation template to document props, events, slots, methods, accessibility attributes, and usage examples with types."
  keywords:
    - component api
    - component documentation
    - props
    - events
    - slots
    - design system
    - template


---

## Overview

Component API documentation tells developers how to use a component: what props it accepts, what events it emits, what slots it provides, and what methods it exposes. Without clear API docs, developers read source code to understand components, wasting time and leading to incorrect usage.

## When to Use


- For alternatives, see [Browser Support Matrix Template](/docs/browser-support-matrix-template/).

- Documenting design system components
- Publishing a component library
- Onboarding new developers to a component system
- Creating component usage guidelines
- Maintaining API consistency across components

## Solution

```markdown
# Component API — `<Button>`

## Component Overview

| Field | Value |
|-------|-------|
| Component Name | Button |
| Package | @example/ui-components |
| Version | 2.3.0 |
| Status | Stable |
| Last Updated | 2026-07-05 |
| Maintainer | UI Platform Team |
| Source | src/components/Button/Button.tsx |
| Bundle Size (gzipped) | 2.1 KB |
| Dependencies | none |

## Description

A versatile button component with support for multiple variants, sizes, icons, loading states, and full keyboard navigation. Renders as a native `<button>` element by default, with polymorphic rendering via the `as` prop.

## Installation

```bash
npm install @example/ui-components
```

## Basic Usage

```tsx
import { Button } from '@example/ui-components';

function Example() {
  return <Button onClick={() => alert('Clicked!')}>Click me</Button>;
}
```

## Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| variant | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'link'` | `'primary'` | No | Visual style variant |
| size | `'sm' \| 'md' \| 'lg'` | `'md'` | No | Button size |
| disabled | `boolean` | `false` | No | Disables interaction and applies disabled styles |
| loading | `boolean` | `false` | No | Shows loading spinner and disables interaction |
| fullWidth | `boolean` | `false` | No | Makes button take full width of container |
| icon | `ReactNode` | `undefined` | No | Icon element rendered before children |
| iconPosition | `'left' \| 'right'` | `'left'` | No | Position of icon relative to text |
| type | `'button' \| 'submit' \| 'reset'` | `'button'` | No | Native button type attribute |
| as | `'button' \| 'a' \| React.ElementType` | `'button'` | No | Polymorphic rendering element |
| href | `string` | `undefined` | No | URL when `as="a"`; required for link rendering |
| target | `string` | `undefined` | No | Link target attribute when `as="a"` |
| rel | `string` | `undefined` | No | Link rel attribute when `as="a"` |
| ariaLabel | `string` | `undefined` | No | Accessible label for icon-only buttons |
| testId | `string` | `undefined` | No | Data attribute for testing: `data-testid` |
| className | `string` | `undefined` | No | Additional CSS classes |
| style | `CSSProperties` | `undefined` | No | Inline styles |
| onClick | `(e: MouseEvent) => void` | `undefined` | No | Click handler |
| onFocus | `(e: FocusEvent) => void` | `undefined` | No | Focus handler |
| onBlur | `(e: FocusEvent) => void` | `undefined` | No | Blur handler |

### TypeScript Types

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  type?: 'button' | 'submit' | 'reset';
  as?: 'button' | 'a' | ElementType;
  href?: string;
  target?: string;
  rel?: string;
  ariaLabel?: string;
  testId?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  onFocus?: (e: FocusEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  onBlur?: (e: FocusEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  children?: ReactNode;
}
```

### Prop Details

#### `variant`

Controls the visual style of the button. Each variant has distinct colors for default, hover, active, and disabled states.

| Variant | Use Case | Default BG | Text Color | Border |
|---------|----------|-----------|------------|--------|
| `primary` | Main action on a page | brand-600 | white | none |
| `secondary` | Alternative action | white | slate-700 | slate-300 |
| `ghost` | Tertiary action | transparent | slate-700 | none |
| `danger` | Destructive action | red-600 | white | none |
| `link` | Navigation-style action | transparent | brand-600 | none |

```tsx
<Button variant="primary">Save changes</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">More options</Button>
<Button variant="danger">Delete account</Button>
<Button variant="link" as="a" href="/docs">Read documentation</Button>
```

#### `size`

Controls the height, padding, and font size of the button.

| Size | Height | Padding (x, y) | Font Size | Icon Size |
|------|--------|----------------|-----------|-----------|
| `sm` | 32px | 12px, 6px | 14px | 16px |
| `md` | 40px | 16px, 8px | 16px | 20px |
| `lg` | 48px | 24px, 12px | 18px | 24px |

```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

#### `loading`

When `true`, the button shows a spinner, disables interaction, and maintains its width to prevent layout shift.

```tsx
<Button loading={isSubmitting}>Submit</Button>
```

#### `as` (Polymorphic)

Renders the button as a different element while maintaining styling. Common use: rendering as an anchor for navigation.

```tsx
<Button as="a" href="/dashboard" variant="primary">Go to Dashboard</Button>
<Button as="a" href="/report.pdf" target="_blank" rel="noopener noreferrer">
  Download Report
</Button>
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `onClick` | `MouseEvent` | Fired when button is clicked (not when disabled or loading) |
| `onFocus` | `FocusEvent` | Fired when button receives focus |
| `onBlur` | `FocusEvent` | Fired when button loses focus |

### Event Examples

```tsx
function FormExample() {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    await submitForm();
    setLoading(false);
  };

  return (
    <Button onClick={handleClick} loading={loading}>
      Submit
    </Button>
  );
}
```

## Slots

| Slot | Default | Description |
|------|---------|-------------|
| `children` | — | Button label text or content |
| `icon` | `undefined` | Icon rendered before or after children based on `iconPosition` |

### Slot Examples

```tsx
// Text only
<Button>Save</Button>

// Text with left icon
<Button icon={<SaveIcon />}>Save</Button>

// Text with right icon
<Button icon={<ArrowIcon />} iconPosition="right">Next</Button>

// Icon only (requires ariaLabel)
<Button icon={<CloseIcon />} ariaLabel="Close dialog" />

// Custom content
<Button>
  <span className="flex items-center gap-2">
    <Badge>New</Badge>
    Try Pro
  </span>
</Button>
```

## Methods

The Button component does not expose imperative methods. All interaction is handled through props and events.

## Accessibility

| Attribute | Value | Notes |
|-----------|-------|-------|
| Role | `button` (native) | Uses native `<button>` element |
| Keyboard | Enter/Space | Triggers `onClick` |
| Focus | Visible outline | `focus-visible` styles applied |
| Disabled | `aria-disabled` | Set when `disabled` or `loading` is true |
| Label | `aria-label` | Required for icon-only buttons via `ariaLabel` prop |

### Accessibility Examples

```tsx
// Icon-only button — ariaLabel is required
<Button icon={<SearchIcon />} ariaLabel="Search" />

// Loading state — aria-label updated
<Button loading={isLoading} ariaLabel={isLoading ? 'Submitting...' : 'Submit'}>
  Submit
</Button>

// Disabled state
<Button disabled ariaLabel="Save (disabled)">Save</Button>
```

## Variants Showcase

```tsx
// Primary actions
<Button variant="primary">Save changes</Button>
<Button variant="primary" icon={<PlusIcon />}>New project</Button>

// Secondary actions
<Button variant="secondary">Cancel</Button>
<Button variant="secondary" icon={<DownloadIcon />} iconPosition="right">Export</Button>

// Ghost actions
<Button variant="ghost">More options</Button>
<Button variant="ghost" size="sm">Filter</Button>

// Danger actions
<Button variant="danger">Delete</Button>
<Button variant="danger" loading={isDeleting}>Deleting...</Button>

// Link variant
<Button variant="link" as="a" href="/docs">Documentation</Button>
<Button variant="link" as="a" href="/docs" target="_blank" rel="noopener noreferrer">
  External link
</Button>

// Full width
<Button fullWidth>Submit form</Button>

// All sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

## Do's and Don'ts

| Do | Don't |
|----|-------|
| Use `primary` for the main action on a page | Use multiple `primary` buttons in the same view |
| Provide `ariaLabel` for icon-only buttons | Use icon-only buttons without accessible labels |
| Use `loading` instead of disabling + text change | Change button text to "Loading..." manually |
| Use `as="a"` for navigation | Use `onClick` with `window.location` for navigation |
| Use `danger` for destructive actions | Use `danger` for non-destructive actions |
| Use `fullWidth` in mobile layouts | Use `fullWidth` in desktop layouts unnecessarily |

## Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@example/ui-components';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('fires onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not fire onClick when loading', () => {
    const handleClick = jest.fn();
    render(<Button loading onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders as anchor when as="a"', () => {
    render(<Button as="a" href="/home">Home</Button>);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home');
  });

  it('applies aria-label for icon-only buttons', () => {
    render(<Button icon={<SearchIcon />} ariaLabel="Search" />);
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });
});
```

## Migration Guide

### v1.x to v2.x

| v1 Prop | v2 Prop | Breaking Change |
|---------|---------|-----------------|
| `color` | `variant` | Renamed for clarity |
| `block` | `fullWidth` | Renamed for consistency |
| `isLoading` | `loading` | Simplified naming |
| `iconLeft` | `icon` + `iconPosition="left"` | Merged into single prop |
| `iconRight` | `icon` + `iconPosition="right"` | Merged into single prop |
```

## Explanation

Component API documentation serves two audiences: developers who use the component and developers who maintain it. Users need to know what props exist, what types they accept, and what the defaults are. Maintainers need to track changes, deprecations, and migration paths.

The props table is the core of the documentation. Each prop should have a TypeScript type, a default value, whether it's required, and a description. For union types (like `variant`), list all valid values. For complex props, add a detailed subsection with examples.

Events document the callback props. Each event should specify the payload type and when it fires. Note edge cases: does `onClick` fire when the button is disabled? (It shouldn't.)

Slots document where content can be projected. In React, this is `children` and render props. In Vue, this is named slots. In Angular, this is `ng-content` with selectors. Document what content is expected and how it's positioned.

The accessibility section is non-negotiable. Every component should document its keyboard interactions, ARIA attributes, and required labels. Icon-only buttons must document the `ariaLabel` requirement.

The testing section shows how to test the component. This helps consumers write integration tests that include the component. It also serves as executable documentation — the tests verify the documented behavior.

The migration guide helps with version upgrades. List every breaking change with the old API and the new API. This reduces upgrade friction.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| React component | Props, events as callbacks, children as slots | TypeScript interfaces |
| Vue component | Props, emits, slots | DefineProps, defineEmits |
| Angular component | @Input, @Output, ng-content | Angular decorators |
| Web component | Attributes, custom events, slots | Custom elements spec |
| Svelte component | Props, dispatch events, slots | Svelte stores |

## What Works

1. Document every prop — undocumented props are discovered by reading source code
2. Include TypeScript types — types are the contract between component and consumer
3. Show real examples — not just `<Button variant="primary">`, but actual use cases
4. Document accessibility — keyboard, screen reader, ARIA requirements
5. Include a do's and don'ts table — prevents common misuse
6. Provide a migration guide — reduces friction on upgrades
7. Keep docs next to code — co-located docs stay in sync better than separate wikis

## Common Mistakes

1. Missing default values — developers don't know what they get if they omit a prop
2. No examples for complex props — `variant` with 5 options needs 5 examples
3. No accessibility section — components without a11y docs lead to inaccessible UIs
4. No migration guide — breaking changes without migration instructions cause frustration
5. Outdated docs — docs that don't match the code are worse than no docs
6. No testing examples — consumers don't know how to test with the component
7. Vague descriptions — "sets the color" doesn't explain what colors are valid

## Frequently Asked Questions

### How do we keep documentation in sync with code?

Co-locate docs with the component source. Use a tool like Storybook that generates docs from the component's TypeScript types and JSDoc comments. Run a CI check that verifies documented props match the actual component props. Review docs in the same PR that changes the component.

### Should we use Storybook or Markdown docs?

Both. Storybook provides interactive examples and auto-generated prop tables. Markdown provides narrative documentation, migration guides, and usage patterns. Use Storybook for reference, Markdown for guides.

### How detailed should prop descriptions be?

Detailed enough that a developer can use the prop without reading the source code. Include valid values, default behavior, and interaction with other props. For example, `loading` should mention that it disables interaction and shows a spinner.

### What about internal props or methods?

Don't document them. If a prop is internal (prefixed with `_` or marked `@internal`), exclude it from public docs. Documenting internal APIs creates an implicit contract that makes refactoring harder.

### How do we document polymorphic components?

Document the `as` prop with all valid values. For each value, document the additional props that become available (e.g., `href` when `as="a"`). Show examples for each polymorphic variant. TypeScript discriminated unions help enforce correct usage.
