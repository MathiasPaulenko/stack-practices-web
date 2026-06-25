---
contentType: patterns
slug: twin-pattern
title: "Twin Pattern"
description: "Provide an alternative to multiple inheritance by linking two separate classes through mutual references, allowing them to delegate methods to each other as needed."
metaDescription: "Learn the Twin Pattern for multiple inheritance alternative. Examples in Python, Java, and JavaScript with linked classes, mutual delegation, and composition."
difficulty: intermediate
topics:
  - design
  - architecture
tags:
  - twin
  - pattern
  - design-pattern
  - structural
  - composition
  - inheritance
  - delegation
relatedResources:
  - /patterns/design/bridge-pattern
  - /patterns/design/decorator-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Twin Pattern for multiple inheritance alternative. Examples in Python, Java, and JavaScript with linked classes, mutual delegation, and composition."
  keywords:
    - twin pattern
    - design pattern
    - composition
    - inheritance
    - delegation
---

# Twin Pattern

## Overview

The Twin Pattern provides an alternative to multiple inheritance by splitting a conceptual class into two (or more) sibling classes that are linked through mutual references. Each twin handles one aspect of the original class's behavior, and they delegate to each other when a method is invoked that belongs to the other's domain.

This pattern is useful in languages that do not support multiple inheritance (Java, C#) or where using it would create fragile base classes. By decomposing a class into twins, each part can evolve independently while presenting a unified interface to clients.

A classic example is a UI widget that needs to be both drawable (rendering) and interactive (event handling). Instead of a single `DrawableInteractiveWidget`, the Twin Pattern creates a `DrawTwin` and an `InteractTwin` that know about each other.

## When to Use

Use the Twin Pattern when:
- A class needs behavior from multiple orthogonal hierarchies
- The target language does not support multiple inheritance
- Mixins or traits are unavailable or insufficient
- Two aspects of a class should evolve independently with minimal coupling

## When to Avoid

- The class can be simplified into a single hierarchy with strategy objects
- Multiple inheritance or mixins are available and cleaner
- The twins create circular dependencies that are hard to reason about
- A simple composition with one-way delegation suffices

## Solution

### Python

```python
from abc import ABC, abstractmethod
from typing import Optional

class Graphic:
    """Abstract base for drawing behavior"""
    def __init__(self):
        self.widget: Optional['Widget'] = None

    def draw(self):
        print(f"Drawing {self.widget.name} at ({self.widget.x}, {self.widget.y})")

    def resize(self, width: int, height: int):
        self.widget.width = width
        self.widget.height = height
        print(f"Resized to {width}x{height}")


class Interactive:
    """Abstract base for interaction behavior"""
    def __init__(self):
        self.widget: Optional['Widget'] = None

    def on_click(self):
        print(f"Clicked on {self.widget.name}")

    def on_hover(self):
        print(f"Hovering over {self.widget.name}")


class Widget:
    """The twin class that links Graphic and Interactive"""
    def __init__(self, name: str, x: int = 0, y: int = 0):
        self.name = name
        self.x = x
        self.y = y
        self.width = 100
        self.height = 50

        # Create twins and link them
        self._graphic = Graphic()
        self._graphic.widget = self
        self._interactive = Interactive()
        self._interactive.widget = self

    # Delegate drawing to Graphic twin
    def draw(self):
        self._graphic.draw()

    def resize(self, width: int, height: int):
        self._graphic.resize(width, height)

    # Delegate interaction to Interactive twin
    def on_click(self):
        self._interactive.on_click()

    def on_hover(self):
        self._interactive.on_hover()

    # Cross-twin access
    def get_graphic(self) -> Graphic:
        return self._graphic

    def get_interactive(self) -> Interactive:
        return self._interactive


# Usage
button = Widget("SubmitButton", 10, 20)
button.draw()        # Delegated to Graphic twin
button.on_click()    # Delegated to Interactive twin
button.resize(200, 60)
```

### Java

```java
// Twin A: Drawing behavior
class Graphic {
    private Widget widget;

    public void setWidget(Widget widget) { this.widget = widget; }

    public void draw() {
        System.out.println("Drawing " + widget.getName() + " at (" + widget.getX() + ", " + widget.getY() + ")");
    }

    public void resize(int width, int height) {
        widget.setWidth(width);
        widget.setHeight(height);
        System.out.println("Resized to " + width + "x" + height);
    }
}

// Twin B: Interaction behavior
class Interactive {
    private Widget widget;

    public void setWidget(Widget widget) { this.widget = widget; }

    public void onClick() {
        System.out.println("Clicked on " + widget.getName());
    }

    public void onHover() {
        System.out.println("Hovering over " + widget.getName());
    }
}

// The composite twin class
class Widget {
    private final String name;
    private int x, y, width, height;
    private final Graphic graphic = new Graphic();
    private final Interactive interactive = new Interactive();

    public Widget(String name, int x, int y) {
        this.name = name; this.x = x; this.y = y;
        this.width = 100; this.height = 50;
        graphic.setWidget(this);
        interactive.setWidget(this);
    }

    public String getName() { return name; }
    public int getX() { return x; }
    public int getY() { return y; }
    public int getWidth() { return width; }
    public int getHeight() { return height; }
    public void setWidth(int w) { this.width = w; }
    public void setHeight(int h) { this.height = h; }

    // Delegation methods
    public void draw() { graphic.draw(); }
    public void resize(int w, int h) { graphic.resize(w, h); }
    public void onClick() { interactive.onClick(); }
    public void onHover() { interactive.onHover(); }

    public Graphic getGraphic() { return graphic; }
    public Interactive getInteractive() { return interactive; }
}

// Usage
Widget button = new Widget("SubmitButton", 10, 20);
button.draw();
button.onClick();
button.resize(200, 60);
```

### JavaScript

```javascript
class Graphic {
  constructor() {
    this.widget = null;
  }

  draw() {
    console.log(`Drawing ${this.widget.name} at (${this.widget.x}, ${this.widget.y})`);
  }

  resize(width, height) {
    this.widget.width = width;
    this.widget.height = height;
    console.log(`Resized to ${width}x${height}`);
  }
}

class Interactive {
  constructor() {
    this.widget = null;
  }

  onClick() {
    console.log(`Clicked on ${this.widget.name}`);
  }

  onHover() {
    console.log(`Hovering over ${this.widget.name}`);
  }
}

class Widget {
  constructor(name, x = 0, y = 0) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.width = 100;
    this.height = 50;

    this.graphic = new Graphic();
    this.graphic.widget = this;
    this.interactive = new Interactive();
    this.interactive.widget = this;
  }

  draw() {
    this.graphic.draw();
  }

  resize(width, height) {
    this.graphic.resize(width, height);
  }

  onClick() {
    this.interactive.onClick();
  }

  onHover() {
    this.interactive.onHover();
  }

  getGraphic() {
    return this.graphic;
  }

  getInteractive() {
    return this.interactive;
  }
}

// Usage
const button = new Widget('SubmitButton', 10, 20);
button.draw();
button.onClick();
button.resize(200, 60);
```

## Explanation

The Twin Pattern works by mutual delegation:

1. **Widget** is the public-facing class that clients interact with
2. **Graphic** and **Interactive** are the twins, each handling one concern
3. Each twin holds a back-reference to the widget to access shared state
4. The widget delegates method calls to the appropriate twin

This is effectively "composition over inheritance" taken to its logical conclusion: instead of inheriting from multiple parents, the class composes multiple delegates and exposes their methods through its own interface.

## Variants

| Variant | Structure | Use Case |
|---------|-----------|----------|
| **Simple twin** | Two linked twins | Drawing + interaction |
| **Multi-twin** | Three or more linked twins | Complex widgets with layout, style, events |
| **Twin with interface** | Both twins implement same interface | Interchangeable twins |
| **Twin factory** | Factory creates and links twins | UI toolkits |

## Best Practices

- **Keep the public class thin.** The widget should only delegate; logic lives in twins.
- **Avoid circular logic.** Twins should not call each other's methods in loops.
- **Make twins replaceable.** Allow swapping one twin without recreating the widget.
- **Use interfaces for twins.** In typed languages, define `IGraphic` and `IInteractive`.
- **Consider observer pattern for cross-twin communication.** Rather than direct calls, use events.

## Common Mistakes

- **Tight coupling between twins.** Twins should interact through the widget, not directly.
- **Exposing twins publicly.** Clients should interact with the widget, not the twins directly.
- **Duplicate state.** State should live in the widget, not duplicated in twins.
- **Forgetting to link twins.** A twin with a null widget reference causes null pointer errors.
- **Making the pattern more complex than multiple inheritance.** If your language supports mixins, use them.

## Real-World Examples

### UI Frameworks

Java's AWT/Swing separates `Component` (the widget) from `ComponentPeer` (the native twin). The peer handles platform-specific rendering and events.

### Game Engines

Unity's Entity-Component-System separates data (Components) from behavior (Systems). While not exactly twin, the separation of concerns mirrors the pattern's intent.

### ORM Proxies

Hibernate's proxy objects split the entity into a proxy twin (lazy-loading) and a target twin (the actual data). The proxy delegates to the target when initialized.

## Frequently Asked Questions

**Q: What is the difference between Twin and Bridge?**
A: Bridge separates abstraction from implementation hierarchies. Twin splits a single class into two cooperating parts. Bridge is about independent hierarchies; Twin is about decomposing one class.

**Q: Is Twin just composition?**
A: Yes, but it is a specific form of composition where the composed objects (twins) hold mutual references and present a unified interface through a wrapper.

**Q: Can I have more than two twins?**
A: Yes, though the complexity increases. Three or more twins create a hub-and-spoke pattern around the main class.
