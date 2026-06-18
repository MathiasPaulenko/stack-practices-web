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

## Best Practices

- **Use the same factory for all products in a feature**: Never mix factories from different families
- **Document the product family contract**: List which concrete classes belong together
- **Keep factory methods simple**: Factories should delegate to constructors, not contain complex logic
- **Consider a registry**: For runtime factory selection based on configuration
- **Pair with Singleton**: Often the concrete factory itself is a singleton

## Common Mistakes

- **Mixing families**: Creating a Light Button with a Dark Checkbox breaks consistency
- **Factory bloat**: Adding business logic inside factory methods instead of keeping them as thin creators
- **Over-abstraction**: Using Abstract Factory when a simple Factory Method is sufficient
- **Leaky abstractions**: Returning concrete types instead of abstract interfaces
- **Difficult testing**: Not providing an easy way to inject mock factories

## Frequently Asked Questions

**Q: What is the difference between Factory Method and Abstract Factory?**
A: Factory Method delegates object creation to subclasses. Abstract Factory creates families of related objects through multiple factory methods.

**Q: Can Abstract Factory be combined with Builder?**
A: Yes. The factory can return builders for complex products, or builders can use factories to construct parts.

**Q: How do I add a new product type to an existing family?**
A: You must add a new abstract method to the factory interface and implement it in every concrete factory. This is the main drawback of the pattern.
