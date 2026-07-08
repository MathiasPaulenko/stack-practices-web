---
contentType: patterns
slug: abstract-factory-pattern
title: "Abstract Factory Pattern"
description: "Create families of related objects without specifying concrete classes. A creational design pattern for consistent object families."
metaDescription: "Learn the Abstract Factory Pattern with practical examples in Python, Java, and JavaScript. Creational design pattern for families of related objects."
difficulty: intermediate
topics:
  - design
tags:
  - abstract-factory
  - creational
  - design-pattern
  - java
  - javascript
  - pattern
  - python
relatedResources:
  - /patterns/design/factory-pattern
  - /patterns/design/builder-pattern
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Abstract Factory Pattern with practical examples in Python, Java, and JavaScript. Creational design pattern for families of related objects."
  keywords:
    - abstract factory pattern
    - design pattern
    - creational pattern
    - factory family
    - object families
    - python abstract factory
    - java abstract factory
    - javascript abstract factory
---

# Abstract Factory Pattern

## Overview

The Abstract Factory Pattern is a creational design pattern that provides an interface for creating families of related or dependent objects without specifying their concrete classes.

It is ideal when your system needs to support multiple product variants (e.g., UI themes for Windows vs. Mac, database drivers for PostgreSQL vs. MySQL) and wants to guarantee that all products in a family are used together.

## When to Use

Use the Abstract Factory Pattern when:
- Your system needs to be independent of how its products are created, composed, and represented
- A family of related products is designed to be used together
- You want to enforce that only compatible products from the same family are used
- You need to support multiple product configurations (themes, platforms, vendors)
- Adding a new product family should not require changing existing client code

## Solution

### Python

```python
from abc import ABC, abstractmethod

class Button(ABC):
    @abstractmethod
    def render(self) -> str:
        pass

class Checkbox(ABC):
    @abstractmethod
    def render(self) -> str:
        pass

class LightButton(Button):
    def render(self) -> str:
        return "Light Button"

class LightCheckbox(Checkbox):
    def render(self) -> str:
        return "Light Checkbox"

class UIFactory(ABC):
    @abstractmethod
    def create_button(self) -> Button:
        pass

    @abstractmethod
    def create_checkbox(self) -> Checkbox:
        pass

class LightUIFactory(UIFactory):
    def create_button(self) -> Button:
        return LightButton()

    def create_checkbox(self) -> Checkbox:
        return LightCheckbox()

# Usage
factory = LightUIFactory()
button = factory.create_button()
print(button.render())  # Light Button
```

### JavaScript

```javascript
class Button {
  render() {
    throw new Error("Not implemented");
  }
}

class Checkbox {
  render() {
    throw new Error("Not implemented");
  }
}

class LightButton extends Button {
  render() {
    return "Light Button";
  }
}

class LightCheckbox extends Checkbox {
  render() {
    return "Light Checkbox";
  }
}

class UIFactory {
  createButton() {
    throw new Error("Not implemented");
  }
  createCheckbox() {
    throw new Error("Not implemented");
  }
}

class LightUIFactory extends UIFactory {
  createButton() {
    return new LightButton();
  }
  createCheckbox() {
    return new LightCheckbox();
  }
}

// Usage
const factory = new LightUIFactory();
const button = factory.createButton();
console.log(button.render()); // Light Button
```

### Java

```java
interface Button {
    String render();
}

interface Checkbox {
    String render();
}

class LightButton implements Button {
    public String render() { return "Light Button"; }
}

class LightCheckbox implements Checkbox {
    public String render() { return "Light Checkbox"; }
}

interface UIFactory {
    Button createButton();
    Checkbox createCheckbox();
}

class LightUIFactory implements UIFactory {
    public Button createButton() { return new LightButton(); }
    public Checkbox createCheckbox() { return new LightCheckbox(); }
}

// Usage
UIFactory factory = new LightUIFactory();
Button button = factory.createButton();
System.out.println(button.render()); // Light Button
```

## Explanation

The Abstract Factory Pattern consists of:

- **Abstract Factory** (`UIFactory`): Declares creation methods for each product type
- **Concrete Factory** (`LightUIFactory`): Implements creation for a specific product family
- **Abstract Products** (`Button`, `Checkbox`): Interfaces for product types
- **Concrete Products** (`LightButton`, `LightCheckbox`): The actual implementations

A client uses only the abstract interfaces. Switching from Light to Dark theme means swapping the factory instance, with no changes to client code.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Classic Abstract Factory** | Multiple product families | Verbose, but type-safe |
| **Factory Method per family** | Simpler systems | Less boilerplate, but no centralized family control |
| **Dependency Injection** | Large enterprise systems | More flexible, but requires a container |

## What Works

- **Use the same factory for all products in a feature**: Never mix factories from different families
- **Document the product family contract**: List which concrete classes belong together
- **Keep factory methods simple**: Factories should delegate to constructors, not contain complex logic
- **Consider a registry**: For runtime factory selection based on configuration
- **Pair with [Singleton](/patterns/design/singleton-pattern)**: Often the concrete factory itself is a singleton

## Advanced Techniques

### Multiple product families with configuration

Extend the pattern to support multiple families with runtime configuration:

```python
# Python: Multiple families with registry
from abc import ABC, abstractmethod
from typing import Dict, Type

class UIFactory(ABC):
    @abstractmethod
    def create_button(self) -> Button:
        pass

    @abstractmethod
    def create_checkbox(self) -> Checkbox:
        pass

class LightUIFactory(UIFactory):
    def create_button(self) -> Button:
        return LightButton()

    def create_checkbox(self) -> Checkbox:
        return LightCheckbox()

class DarkUIFactory(UIFactory):
    def create_button(self) -> Button:
        return DarkButton()

    def create_checkbox(self) -> Checkbox:
        return DarkCheckbox()

class FactoryRegistry:
    _factories: Dict[str, Type[UIFactory]] = {}

    @classmethod
    def register(cls, name: str, factory_class: Type[UIFactory]):
        cls._factories[name] = factory_class

    @classmethod
    def get_factory(cls, name: str) -> UIFactory:
        factory_class = cls._factories.get(name)
        if not factory_class:
            raise ValueError(f"Unknown factory: {name}")
        return factory_class()

# Register factories
FactoryRegistry.register('light', LightUIFactory)
FactoryRegistry.register('dark', DarkUIFactory)

# Runtime selection
theme = 'dark'  # Could come from config
factory = FactoryRegistry.get_factory(theme)
button = factory.create_button()
```

### Factory with parameterized product creation

Pass parameters to factory methods for flexible product instantiation:

```java
// Java: Parameterized factory
interface Button {
    String render();
    void setLabel(String label);
    void setSize(Size size);
}

interface UIFactory {
    Button createButton(String label, Size size);
    Checkbox createCheckbox(String label, boolean checked);
}

class LightUIFactory implements UIFactory {
    public Button createButton(String label, Size size) {
        Button button = new LightButton();
        button.setLabel(label);
        button.setSize(size);
        return button;
    }

    public Checkbox createCheckbox(String label, boolean checked) {
        Checkbox checkbox = new LightCheckbox();
        checkbox.setLabel(label);
        checkbox.setChecked(checked);
        return checkbox;
    }
}
```

### Lazy factory initialization with proxies

Defer factory instantiation until first use:

```javascript
// JavaScript: Lazy factory proxy
class UIFactory {
    createButton() {
        throw new Error("Not implemented");
    }
    createCheckbox() {
        throw new Error("Not implemented");
    }
}

class LazyUIFactory extends UIFactory {
    constructor(factoryCreator) {
        super();
        this._factoryCreator = factoryCreator;
        this._factory = null;
    }

    _getFactory() {
        if (!this._factory) {
            this._factory = this._factoryCreator();
        }
        return this._factory;
    }

    createButton() {
        return this._getFactory().createButton();
    }

    createCheckbox() {
        return this._getFactory().createCheckbox();
    }
}

// Usage
const lazyFactory = new LazyUIFactory(() => {
    console.log('Factory initialized');
    return new LightUIFactory();
});

// Factory not initialized until first method call
const button = lazyFactory.createButton();
```

### Factory composition with dependency injection

Combine multiple factories for complex product creation:

```python
# Python: Factory composition
class ComplexUIFactory(UIFactory):
    def __init__(self, button_factory: UIFactory, checkbox_factory: UIFactory):
        self.button_factory = button_factory
        self.checkbox_factory = checkbox_factory

    def create_button(self) -> Button:
        return self.button_factory.create_button()

    def create_checkbox(self) -> Checkbox:
        return self.checkbox_factory.create_checkbox()

# Compose factories from different sources
button_factory = LightUIFactory()
checkbox_factory = DarkUIFactory()
composite_factory = ComplexUIFactory(button_factory, checkbox_factory)
```

### Dynamic factory loading with reflection

Load factories dynamically based on configuration:

```java
// Java: Dynamic factory loading
public interface UIFactory {
    Button createButton();
    Checkbox createCheckbox();
}

public class FactoryLoader {
    public static UIFactory loadFactory(String className) 
            throws Exception {
        Class<?> clazz = Class.forName(className);
        return (UIFactory) clazz.getDeclaredConstructor().newInstance();
    }
}

// Config-driven loading
String factoryClassName = config.get("ui.factory");
UIFactory factory = FactoryLoader.loadFactory(factoryClassName);
```

## Best Practices

1. **Keep factory interfaces cohesive.** Each factory should create a logically related family of products. Avoid mixing unrelated product types.
2. **Use meaningful naming.** Name factories after the family they represent (e.g., LightUIFactory, DarkUIFactory) rather than generic names.
3. **Document product compatibility.** Clearly document which products from the same family are compatible and how they should be used together.
4. **Consider factory lifecycle.** Decide whether factories are singletons, scoped to a request, or created per use case based on your application's needs.
5. **Provide sensible defaults.** When using configuration-driven factories, ensure default configurations are safe and work for most common cases.
6. **Test factory selection logic.** Write unit tests for factory selection mechanisms to ensure the correct factory is chosen for each scenario.
7. **Avoid over-abstracting.** Don't create abstract factories for simple cases where direct instantiation would be clearer and more maintainable.
8. **Monitor factory performance.** Profile factory creation and product instantiation to ensure the abstraction doesn't introduce unacceptable overhead.
9. **Handle errors gracefully.** Factories should handle or propagate errors appropriately, especially when loading factories dynamically.
10. **Use type safety.** Use language features to ensure type safety in factory methods and product interfaces.

## FAQ

**Q: What is the difference between Factory Method and Abstract Factory?**
A: [Factory Method](/patterns/design/factory-pattern) delegates object creation to subclasses. Abstract Factory creates families of related objects through multiple factory methods.

**Q: Can Abstract Factory be combined with Builder?**
A: Yes. The factory can return [builders](/patterns/design/builder-pattern) for complex products, or builders can use factories to construct parts.

**Q: How do I add a new product type to an existing family?**
A: You must add a new abstract method to the factory interface and implement it in every concrete factory. This is the main drawback of the pattern.

**Q: Should I use Abstract Factory for simple theme switching?**
A: For simple theme switching (colors, fonts), CSS variables or theme objects may be simpler. Use Abstract Factory when themes require different component implementations.

**Q: Can Abstract Factory work with existing legacy code?**
A: Yes. You can introduce Abstract Factory gradually by creating adapter factories that wrap legacy instantiation logic, then migrate client code over time.

**Q: How does Abstract Factory compare to the Prototype pattern?**
A: Abstract Factory creates new objects from scratch. Prototype clones existing objects. They can be used together: Abstract Factory creates prototypes, and Prototype clones them.

**Q: Can I use Abstract Factory for data access layers?**
A: Yes. Abstract Factory is commonly used to create database-specific data access objects (DAOs) or repository implementations, allowing the application to switch between database vendors.

**Q: How do I test code that uses Abstract Factory?**
A: Use mock factories in tests to create test doubles of products. This allows you to test client logic without depending on real product implementations.

**Q: Is this pattern suitable for small projects?**
A: For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

**Q: How does this pattern compare to alternatives?**
A: Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

**Q: Can I partially apply this pattern?**
A: Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
