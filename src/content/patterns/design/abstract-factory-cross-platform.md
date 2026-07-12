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
  - design-patterns
relatedResources:
  - /patterns/bridge-pattern-ui-themes
  - /patterns/abstract-factory-pattern
  - /patterns/dependency-injection-typescript
  - /patterns/mediator-pattern-components
  - /patterns/ambassador-pattern-services
  - /patterns/backend-for-frontend-pattern
  - /patterns/chain-of-responsibility-middleware
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

## Advanced Techniques

### Factory composition with dependency injection

Combine Abstract Factory with DI containers for runtime factory selection:

```typescript
// factory/FactoryRegistry.ts
interface FactoryRegistry {
  register(key: string, factory: UIFactory): void;
  get(key: string): UIFactory;
}

class UIFactoryRegistry implements FactoryRegistry {
  private factories = new Map<string, UIFactory>();

  register(key: string, factory: UIFactory): void {
    this.factories.set(key, factory);
  }

  get(key: string): UIFactory {
    const factory = this.factories.get(key);
    if (!factory) throw new Error(`Factory not found: ${key}`);
    return factory;
  }
}

// Usage with DI
const registry = new UIFactoryRegistry();
registry.register('web', new WebFactory());
registry.register('mobile', new MobileFactory());

// Runtime selection based on environment
const platform = detectPlatform(); // 'web' | 'mobile'
const factory = registry.get(platform);
const screen = new SettingsScreen(factory);
```

### Dynamic factory loading with plugins

Load factories dynamically based on configuration or plugins:

```typescript
// factory/DynamicFactoryLoader.ts
interface FactoryConfig {
  type: string;
  module: string;
  className: string;
}

async function loadFactory(config: FactoryConfig): Promise<UIFactory> {
  const module = await import(config.module);
  const FactoryClass = module[config.className];
  return new FactoryClass();
}

// Config-driven factory selection
const config: FactoryConfig = {
  type: 'ios',
  module: './factories/iOS',
  className: 'IOSFactory'
};

const factory = await loadFactory(config);
```

### Factory with parameterized product creation

Pass configuration to factories for flexible product instantiation:

```typescript
interface UIFactoryConfig {
  theme: 'light' | 'dark';
  locale: string;
  accessibility: boolean;
}

interface ConfigurableUIFactory extends UIFactory {
  setConfig(config: UIFactoryConfig): void;
}

class WebFactory implements ConfigurableUIFactory {
  private config: UIFactoryConfig = {
    theme: 'light',
    locale: 'en',
    accessibility: false
  };

  setConfig(config: UIFactoryConfig): void {
    this.config = { ...this.config, ...config };
  }

  createButton(label: string): Button {
    return new WebButton(label, this.config);
  }
}

class WebButton implements Button {
  constructor(
    private label: string,
    private config: UIFactoryConfig
  ) {}

  render(): string {
    const themeClass = this.config.theme === 'dark' ? 'dark-mode' : 'light-mode';
    return `<button class="${themeClass}">${this.label}</button>`;
  }

  onClick(handler: () => void): void { /* attach DOM listener */ }
}
```

### Factory method chaining for complex product assembly

Chain factory methods to build complex products from multiple components:

```typescript
interface ComplexUIFactory extends UIFactory {
  createForm(): Form;
  createFormField(type: 'text' | 'number' | 'email'): FormField;
  createValidator(type: 'required' | 'email' | 'minLength'): Validator;
}

class WebFormFactory implements ComplexUIFactory {
  createButton(label: string): Button { /* ... */ }
  createCheckbox(label: string): Checkbox { /* ... */ }
  createDialog(): Dialog { /* ... */ }

  createForm(): Form {
    return new WebForm();
  }

  createFormField(type: string): FormField {
    return new WebFormField(type);
  }

  createValidator(type: string): Validator {
    return new WebValidator(type);
  }
}

// Client builds complex form using factory chain
const factory = new WebFormFactory();
const form = factory.createForm();
form.addField(factory.createFormField('text'));
form.addField(factory.createFormField('email'));
form.addValidator(factory.createValidator('required'));
```

### Lazy factory initialization with proxies

Use proxies to defer factory instantiation until first use:

```typescript
class LazyUIFactory implements UIFactory {
  private factory: UIFactory | null = null;
  private factoryFactory: () => UIFactory;

  constructor(factoryFactory: () => UIFactory) {
    this.factoryFactory = factoryFactory;
  }

  private getFactory(): UIFactory {
    if (!this.factory) {
      this.factory = this.factoryFactory();
    }
    return this.factory;
  }

  createButton(label: string): Button {
    return this.getFactory().createButton(label);
  }

  createCheckbox(label: string): Checkbox {
    return this.getFactory().createCheckbox(label);
  }

  createDialog(): Dialog {
    return this.getFactory().createDialog();
  }
}

// Lazy initialization
const lazyFactory = new LazyUIFactory(() => {
  console.log('Initializing WebFactory...');
  return new WebFactory();
});

// Factory not initialized until first method call
const button = lazyFactory.createButton('Click me');
```

## Best Practices

1. **Keep factory interfaces focused.** Each factory should create a coherent family of related products. Avoid mixing unrelated product types in the same factory.
2. **Use composition over inheritance.** Prefer composing factories together rather than creating deep inheritance hierarchies of factory classes.
3. **Document product compatibility.** Clearly document which products from the same family are compatible and which are interchangeable.
4. **Consider factory lifecycle.** Decide whether factories are singletons, scoped to a request, or created per use case based on your application's needs.
5. **Provide sensible defaults.** When using configuration-driven factories, ensure default configurations are safe and work for most common cases.
6. **Test factory selection logic.** Write unit tests for factory selection mechanisms to ensure the correct factory is chosen for each platform or scenario.
7. **Avoid over-abstracting.** Don't create abstract factories for simple cases where direct instantiation would be clearer and more maintainable.
8. **Monitor factory performance.** Profile factory creation and product instantiation to ensure the abstraction doesn't introduce unacceptable overhead.

## FAQ

**Q: How is this different from Factory Method?**
A: [Factory Method](/patterns/design/factory-pattern) creates one product through inheritance. Abstract Factory creates families of related products through composition.

**Q: When should I avoid Abstract Factory?**
A: When the product family is small (2-3 products) or when products do not need to be compatible with each other.

**Q: Can I use Abstract Factory with dependency injection frameworks?**
A: Yes. DI frameworks can inject the appropriate factory based on configuration or environment, making runtime factory selection straightforward.

**Q: How do I handle adding a new product type to an existing factory family?**
A: Adding a new product type requires modifying the abstract factory interface and all concrete factory implementations. This is a limitation of the pattern. Consider using factory registries or plugin architectures if you need frequent product type additions.

**Q: Can Abstract Factory work with existing legacy code?**
A: Yes. You can introduce Abstract Factory gradually by creating adapter factories that wrap legacy instantiation logic, then migrate client code to use the new factories over time.

**Q: How does Abstract Factory compare to the Builder pattern?**
A: Abstract Factory focuses on creating families of related objects with a common interface. Builder focuses on constructing complex objects step by step. They can be used together: Abstract Factory creates the builder, and the builder constructs the product.

**Q: Should I use Abstract Factory for simple theme switching?**
A: For simple theme switching (colors, fonts), CSS variables or theme objects may be simpler. Use Abstract Factory when themes require different component implementations, not just styling differences.

**Q: Can I use Abstract Factory for data access layers?**
A: Yes. Abstract Factory is commonly used to create database-specific data access objects (DAOs) or repository implementations, allowing the application to switch between SQL databases, NoSQL databases, or in-memory stores.

**Q: How do I test code that uses Abstract Factory?**
A: Use mock factories in tests to create test doubles of products. This allows you to test client logic without depending on real product implementations or external dependencies.

**Q: Is this pattern suitable for small projects?**
A: For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

**Q: How does this pattern compare to alternatives?**
A: Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

**Q: Can I partially apply this pattern?**
A: Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
