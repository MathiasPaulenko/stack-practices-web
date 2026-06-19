---
contentType: patterns
slug: abstract-factory-cross-platform
title: "Abstract Factory for Cross-Platform UI Component Families"
description: "Create families of related objects without specifying concrete classes, enabling platform-specific implementations that share a common interface"
metaDescription: "Abstract Factory pattern for UI families. Create related objects without specifying concrete classes for cross-platform and theme-specific component families."
difficulty: intermediate
topics:
  - design
  - frontend
tags:
  - abstract-factory
  - creational-patterns
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/factory-method-injection
  - /patterns/design/bridge-pattern-ui-themes
  - /guides/react-patterns-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Abstract Factory pattern for UI families. Create related objects without specifying concrete classes for cross-platform and theme-specific component families."
  keywords:
    - abstract factory
    - family of objects
    - cross platform ui
    - creational patterns
    - platform abstraction
---

# Abstract Factory for Cross-Platform UI Component Families

The Abstract Factory pattern provides an interface for creating families of related objects without specifying their concrete classes. When a system must be independent of how its products are created, composed, and represented — especially across platforms or themes — Abstract Factory ensures consistency within each family while allowing interchangeable implementations.

## When to Use This

- A system must support multiple platforms or themes with cohesive component families
- You need to guarantee that products from the same factory are compatible
- The creation process should be hidden from the client code

## Problem

A UI toolkit needs to render native buttons, checkboxes, and dialogs on Web, iOS, and Android. Using Factory Method for each widget independently risks mixing native and web components in the same view.

## Solution

```typescript
// factory/UIFactory.ts
interface Button {
  render(): string;
  onClick(handler: () => void): void;
}

interface Checkbox {
  render(): string;
  toggle(): void;
  isChecked(): boolean;
}

interface Dialog {
  show(): void;
  hide(): void;
  setTitle(title: string): void;
}

interface UIFactory {
  createButton(label: string): Button;
  createCheckbox(label: string): Checkbox;
  createDialog(): Dialog;
}

// Web family
class WebButton implements Button {
  constructor(private label: string) {}
  render(): string { return `<button>${this.label}</button>`; }
  onClick(handler: () => void): void { /* attach DOM listener */ }
}

class WebCheckbox implements Checkbox {
  private checked = false;
  constructor(private label: string) {}
  render(): string { return `<label><input type="checkbox"> ${this.label}</label>`; }
  toggle(): void { this.checked = !this.checked; }
  isChecked(): boolean { return this.checked; }
}

class WebDialog implements Dialog {
  private title = '';
  show(): void { console.log('Show web dialog:', this.title); }
  hide(): void { console.log('Hide web dialog'); }
  setTitle(title: string): void { this.title = title; }
}

class WebFactory implements UIFactory {
  createButton(label: string): Button { return new WebButton(label); }
  createCheckbox(label: string): Checkbox { return new WebCheckbox(label); }
  createDialog(): Dialog { return new WebDialog(); }
}

// Mobile family
class MobileButton implements Button {
  constructor(private label: string) {}
  render(): string { return `[Mobile Button: ${this.label}]`; }
  onClick(): void { /* native tap handler */ }
}

class MobileCheckbox implements Checkbox {
  private checked = false;
  constructor(private label: string) {}
  render(): string { return `[Mobile Switch: ${this.label}]`; }
  toggle(): void { this.checked = !this.checked; }
  isChecked(): boolean { return this.checked; }
}

class MobileDialog implements Dialog {
  private title = '';
  show(): void { console.log('Show mobile modal:', this.title); }
  hide(): void { console.log('Dismiss mobile modal'); }
  setTitle(title: string): void { this.title = title; }
}

class MobileFactory implements UIFactory {
  createButton(label: string): Button { return new MobileButton(label); }
  createCheckbox(label: string): Checkbox { return new MobileCheckbox(label); }
  createDialog(): Dialog { return new MobileDialog(); }
}

// Client uses any factory uniformly
class SettingsScreen {
  private button: Button;
  private checkbox: Checkbox;
  private dialog: Dialog;

  constructor(factory: UIFactory) {
    this.button = factory.createButton('Save');
    this.checkbox = factory.createCheckbox('Dark Mode');
    this.dialog = factory.createDialog();
    this.dialog.setTitle('Confirm');
  }

  render(): string {
    return `${this.button.render()} ${this.checkbox.render()}`;
  }
}

// Usage
const webScreen = new SettingsScreen(new WebFactory());
const mobileScreen = new SettingsScreen(new MobileFactory());
```

## How It Works

1. **Abstract Factory** declares creation methods for each product type
2. **Concrete Factory** implements creation for a specific family
3. **Abstract Products** declare interfaces for product types
4. **Concrete Products** implement a variant for one family
5. **Client** uses only abstract interfaces; the concrete factory determines the family

## Production Considerations

- Use dependency injection frameworks to select the factory at runtime
- Abstract Factory works well with [Bridge](/patterns/design/bridge-pattern) when families also need platform-specific rendering
- Consider [factory registries](/patterns/design/factory-pattern) for plugin-based architectures

## Common Mistakes

- Adding new product types requires changing all concrete factories
- Using Abstract Factory when a simple Factory Method would suffice
- Creating overly broad families that share little in common

## FAQ

**Q: How is this different from Factory Method?**
A: [Factory Method](/patterns/design/factory-pattern) creates one product through inheritance. Abstract Factory creates families of related products through composition.

**Q: When should I avoid Abstract Factory?**
A: When the product family is small (2-3 products) or when products do not need to be compatible with each other.
