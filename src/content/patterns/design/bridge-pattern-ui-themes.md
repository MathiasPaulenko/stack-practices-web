---
contentType: patterns
slug: bridge-pattern-ui-themes
title: "Bridge Pattern for Decoupling UI Components from Themes"
description: "Separate an abstraction from its implementation so both can vary independently using the Bridge pattern for pluggable UI themes and rendering engines"
metaDescription: "Bridge pattern for UI themes. Decouple components from rendering to let abstractions and implementations vary independently for pluggable theming systems."
difficulty: intermediate
topics:
  - design
  - frontend
tags:
  - bridge
  - structural-patterns
  - typescript
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/adapter-pattern-api
  - /patterns/design/abstract-factory-cross-platform
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Bridge pattern for UI themes. Decouple components from rendering to let abstractions and implementations vary independently for pluggable theming systems."
  keywords:
    - bridge pattern
    - decoupling
    - ui themes
    - structural patterns
    - platform independence
---

# Bridge Pattern for Decoupling UI Components from Themes

The Bridge pattern decouples an abstraction from its implementation so that the two can vary independently. Instead of a class hierarchy that combines component types with rendering platforms, Bridge creates two separate hierarchies: one for abstractions (components) and one for implementations (renderers or themes).

## When to Use This

- You need to support multiple platforms or themes without subclassing explosion
- Changes to implementation should not require recompiling the abstraction layer
- Both dimensions (what and how) need to evolve independently

## Problem

Supporting Button, Checkbox, and Slider across Web, iOS, and Android leads to 9 subclasses: WebButton, iOSButton, AndroidButton, WebCheckbox, iOSCheckbox, and so on.

## Solution

```typescript
// bridge/Renderer.ts
interface UIRenderer {
  renderButton(label: string, onClick: () => void): string;
  renderCheckbox(label: string, checked: boolean): string;
  renderSlider(min: number, max: number, value: number): string;
}

// Implementations
class WebRenderer implements UIRenderer {
  renderButton(label: string, onClick: () => void): string {
    return `<button onclick="${onClick.name}">${label}</button>`;
  }

  renderCheckbox(label: string, checked: boolean): string {
    const checkedAttr = checked ? 'checked' : '';
    return `<label><input type="checkbox" ${checkedAttr}> ${label}</label>`;
  }

  renderSlider(min: number, max: number, value: number): string {
    return `<input type="range" min="${min}" max="${max}" value="${value}">`;
  }
}

class NativeRenderer implements UIRenderer {
  renderButton(label: string): string {
    return `[Native Button: ${label}]`;
  }

  renderCheckbox(label: string, checked: boolean): string {
    return `[Native Checkbox: ${label} ${checked ? '✓' : ' '}]`;
  }

  renderSlider(min: number, max: number, value: number): string {
    return `[Native Slider: ${value}/${max}]`;
  }
}

// Abstractions
abstract class UIComponent {
  constructor(protected renderer: UIRenderer) {}
  abstract render(): string;
}

class Button extends UIComponent {
  constructor(
    renderer: UIRenderer,
    private label: string,
    private onClick: () => void
  ) {
    super(renderer);
  }

  render(): string {
    return this.renderer.renderButton(this.label, this.onClick);
  }
}

class Checkbox extends UIComponent {
  constructor(
    renderer: UIRenderer,
    private label: string,
    private checked: boolean
  ) {
    super(renderer);
  }

  render(): string {
    return this.renderer.renderCheckbox(this.label, this.checked);
  }
}

// Usage
const webRenderer = new WebRenderer();
const nativeRenderer = new NativeRenderer();

const webButton = new Button(webRenderer, 'Submit', () => {});
const nativeButton = new Button(nativeRenderer, 'Submit', () => {});

console.log(webButton.render());     // <button>Submit</button>
console.log(nativeButton.render());  // [Native Button: Submit]
```

## Variation: Theme Bridge

```typescript
// bridge/Theme.ts
interface Theme {
  getColors(): { primary: string; background: string; text: string };
  getBorderRadius(): number;
  getSpacing(): number;
}

class LightTheme implements Theme {
  getColors() { return { primary: '#007bff', background: '#ffffff', text: '#333333' }; }
  getBorderRadius() { return 4; }
  getSpacing() { return 8; }
}

class DarkTheme implements Theme {
  getColors() { return { primary: '#4dabf7', background: '#1a1a1a', text: '#e0e0e0' }; }
  getBorderRadius() { return 8; }
  getSpacing() { return 12; }
}

abstract class ThemedComponent {
  constructor(protected theme: Theme) {}
}

class ThemedButton extends ThemedComponent {
  render(label: string): string {
    const colors = this.theme.getColors();
    return `
      <button style="
        background: ${colors.primary};
        color: ${colors.text};
        border-radius: ${this.theme.getBorderRadius()}px;
        padding: ${this.theme.getSpacing()}px;
      ">${label}</button>
    `;
  }
}

const light = new ThemedButton(new LightTheme());
const dark = new ThemedButton(new DarkTheme());
```

## How It Works

1. **Abstraction** defines the high-level interface clients use
2. **Refined Abstraction** extends the abstraction with variant behavior
3. **Implementation** defines the platform or theme interface
4. **Concrete Implementation** provides platform-specific rendering

## Production Considerations

- Use dependency injection to swap implementations at runtime
- Bridge works well with [Abstract Factory](/patterns/design/abstract-factory-pattern) to create matched component families
- Keep the abstraction thin; delegate all rendering details to the implementation

## Common Mistakes

- Confusing Bridge with [Adapter](/patterns/design/adapter-pattern): Adapter makes unrelated interfaces compatible; Bridge separates an interface from implementation
- Creating a Bridge when a simple [Strategy](/patterns/design/strategy-pattern) would suffice for single-method variation

## FAQ

**Q: How is this different from Strategy?**
A: [Strategy](/patterns/design/strategy-pattern) changes behavior of a single object. Bridge separates two entire class hierarchies so each can evolve independently.

**Q: Can I use this for database backends?**
A: Yes. The abstraction is your repository interface; implementations are SQL, MongoDB, or DynamoDB adapters.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
