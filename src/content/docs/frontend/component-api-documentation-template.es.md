---


contentType: docs
slug: component-api-documentation-template
title: "Plantilla de Documentación de Component API"
description: "Una plantilla para documentar APIs de componentes UI: props, events, slots, methods, accessibility y usage examples con TypeScript types."
metaDescription: "Usá esta plantilla de documentación de component API para documentar props, events, slots, methods, accessibility y usage examples con types."
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
  metaDescription: "Usá esta plantilla de documentación de component API para documentar props, events, slots, methods, accessibility y usage examples con types."
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

Component API documentation le dice a developers cómo usar un component: qué props accept, qué events emite, qué slots provee y qué methods expone. Sin clear API docs, developers leen source code para entender components, wasteando time y leading a incorrect usage.

## When to Use


- For alternatives, see [Browser Support Matrix Template](/es/docs/browser-support-matrix-template/).

- Documentando design system components
- Publicando un component library
- Onboardéando new developers a un component system
- Creando component usage guidelines
- Manteniendo API consistency across components

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

Un versatile button component con support para multiple variants, sizes, icons, loading states y full keyboard navigation. Renderea como un native `<button>` element por default, con polymorphic rendering via el `as` prop.

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
| disabled | `boolean` | `false` | No | Disablea interaction y apply disabled styles |
| loading | `boolean` | `false` | No | Muestra loading spinner y disablea interaction |
| fullWidth | `boolean` | `false` | No | Hace que button take full width de container |
| icon | `ReactNode` | `undefined` | No | Icon element rendereado before children |
| iconPosition | `'left' \| 'right'` | `'left'` | No | Position de icon relative a text |
| type | `'button' \| 'submit' \| 'reset'` | `'button'` | No | Native button type attribute |
| as | `'button' \| 'a' \| React.ElementType` | `'button'` | No | Polymorphic rendering element |
| href | `string` | `undefined` | No | URL cuando `as="a"`; required para link rendering |
| target | `string` | `undefined` | No | Link target attribute cuando `as="a"` |
| rel | `string` | `undefined` | No | Link rel attribute cuando `as="a"` |
| ariaLabel | `string` | `undefined` | No | Accessible label para icon-only buttons |
| testId | `string` | `undefined` | No | Data attribute para testing: `data-testid` |
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

Control el visual style del button. Cada variant tiene distinct colors para default, hover, active y disabled states.

| Variant | Use Case | Default BG | Text Color | Border |
|---------|----------|-----------|------------|--------|
| `primary` | Main action en un page | brand-600 | white | none |
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

Control el height, padding y font size del button.

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

Cuando `true`, el button muestra un spinner, disablea interaction y maintain su width para prevenir layout shift.

```tsx
<Button loading={isSubmitting}>Submit</Button>
```

#### `as` (Polymorphic)

Renderea el button como un different element mientras maintain styling. Common use: renderear como un anchor para navigation.

```tsx
<Button as="a" href="/dashboard" variant="primary">Go to Dashboard</Button>
<Button as="a" href="/report.pdf" target="_blank" rel="noopener noreferrer">
  Download Report
</Button>
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `onClick` | `MouseEvent` | Fire cuando button se clickea (no cuando disabled o loading) |
| `onFocus` | `FocusEvent` | Fire cuando button recibe focus |
| `onBlur` | `FocusEvent` | Fire cuando button pierde focus |

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
| `children` | — | Button label text o content |
| `icon` | `undefined` | Icon rendereado before o after children basado en `iconPosition` |

### Slot Examples

```tsx
// Text only
<Button>Save</Button>

// Text con left icon
<Button icon={<SaveIcon />}>Save</Button>

// Text con right icon
<Button icon={<ArrowIcon />} iconPosition="right">Next</Button>

// Icon only (require ariaLabel)
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

El Button component no expone imperative methods. All interaction se handlea through props y events.

## Accessibility

| Attribute | Value | Notes |
|-----------|-------|-------|
| Role | `button` (native) | Usa native `<button>` element |
| Keyboard | Enter/Space | Triggerea `onClick` |
| Focus | Visible outline | `focus-visible` styles applied |
| Disabled | `aria-disabled` | Set cuando `disabled` o `loading` es true |
| Label | `aria-label` | Required para icon-only buttons via `ariaLabel` prop |

### Accessibility Examples

```tsx
// Icon-only button — ariaLabel es required
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
| Usá `primary` para el main action en un page | Usá multiple `primary` buttons en el same view |
| Proveé `ariaLabel` para icon-only buttons | Usá icon-only buttons sin accessible labels |
| Usá `loading` en vez de disablear + text change | Cambiá button text a "Loading..." manualmente |
| Usá `as="a"` para navigation | Usá `onClick` con `window.location` para navigation |
| Usá `danger` para destructive actions | Usá `danger` para non-destructive actions |
| Usá `fullWidth` en mobile layouts | Usá `fullWidth` en desktop layouts unnecessarily |

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
| `color` | `variant` | Renamed para clarity |
| `block` | `fullWidth` | Renamed para consistency |
| `isLoading` | `loading` | Simplified naming |
| `iconLeft` | `icon` + `iconPosition="left"` | Merged en single prop |
| `iconRight` | `icon` + `iconPosition="right"` | Merged en single prop |
```

## Explanation

Component API documentation sirve a two audiences: developers que usan el component y developers que lo maintain. Users necesitan saber qué props existen, qué types accept y qué son los defaults. Maintainers necesitan trackear changes, deprecations y migration paths.

La props table es el core de la documentation. Cada prop debería tener un TypeScript type, un default value, si es required y un description. Para union types (como `variant`), listé todos los valid values. Para complex props, addeá un detailed subsection con examples.

Events documentean los callback props. Cada event debería specify el payload type y cuándo fire. Notá edge cases: ¿`onClick` firea cuando el button está disabled? (No debería.)

Slots documentean dónde content puede ser projected. En React, esto es `children` y render props. En Vue, esto es named slots. En Angular, esto es `ng-content` con selectors. Documentá qué content se espera y cómo se posiciona.

La accessibility section es non-negotiable. Cada component debería documentar su keyboard interactions, ARIA attributes y required labels. Icon-only buttons deben documentar el `ariaLabel` requirement.

La testing section muestra cómo testear el component. Esto helpa a consumers a escribir integration tests que incluyan el component. También sirve como executable documentation — los tests verify el documented behavior.

El migration guide helpa con version upgrades. Listé every breaking change con el old API y el new API. Esto reduce upgrade friction.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| React component | Props, events as callbacks, children as slots | TypeScript interfaces |
| Vue component | Props, emits, slots | DefineProps, defineEmits |
| Angular component | @Input, @Output, ng-content | Angular decorators |
| Web component | Attributes, custom events, slots | Custom elements spec |
| Svelte component | Props, dispatch events, slots | Svelte stores |

## What Works

1. Documentá every prop — undocumented props se discovered leyendo source code
2. Incluí TypeScript types — types son el contract entre component y consumer
3. Mostrá real examples — no solo `<Button variant="primary">`, sino actual use cases
4. Documentá accessibility — keyboard, screen reader, ARIA requirements
5. Incluí un do's and don'ts table — previene common misuse
6. Proveé un migration guide — reduce friction en upgrades
7. Mantené docs next a code — co-located docs stay in sync better que separate wikis

## Common Mistakes

1. Missing default values — developers no saben qué get si omiten un prop
2. No examples para complex props — `variant` con 5 options necesita 5 examples
3. No accessibility section — components sin a11y docs lead a inaccessible UIs
4. No migration guide — breaking changes sin migration instructions causan frustration
5. Outdated docs — docs que no matchean el code son worse que no docs
6. No testing examples — consumers no saben cómo testear con el component
7. Vague descriptions — "setea el color" no explica qué colors son valid

## Frequently Asked Questions

### ¿Cómo mantenemos documentation in sync con code?

Co-locá docs con el component source. Usá un tool como Storybook que genere docs desde el component's TypeScript types y JSDoc comments. Corré un CI check que verify que documented props matcheen los actual component props. Revieweá docs en el same PR que cambia el component.

### ¿Deberíamos usar Storybook o Markdown docs?

Ambos. Storybook provee interactive examples y auto-generated prop tables. Markdown provee narrative documentation, migration guides y usage patterns. Usá Storybook para reference, Markdown para guides.

### ¿Qué tan detailed deberían ser prop descriptions?

Detailed enough que un developer pueda usar el prop sin leer el source code. Incluí valid values, default behavior y interaction con otros props. Por ejemplo, `loading` debería mention que disablea interaction y muestra un spinner.

### ¿Qué hay de internal props o methods?

No los documentes. Si un prop es internal (prefixed con `_` o marked `@internal`), excluílo de public docs. Documentar internal APIs crea un implicit contract que hace refactoring harder.

### ¿Cómo documentamos polymorphic components?

Documentá el `as` prop con all valid values. Para cada value, documentá los additional props que become available (e.g., `href` cuando `as="a"`). Mostrá examples para cada polymorphic variant. TypeScript discriminated unions help a enforce correct usage.
