---
contentType: patterns
slug: visitor-pattern
title: "Visitor Pattern"
description: "Represent an operation to be performed on elements of an object structure without changing the classes of the elements. A behavioral design pattern."
metaDescription: "Learn the Visitor Pattern in Python, Java, and JavaScript. Behavioral design pattern for adding operations to object structures."
difficulty: advanced
topics:
  - design
tags:
  - visitor
  - pattern
  - design-pattern
  - behavioral
  - double-dispatch
  - operations
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/composite-pattern
  - /patterns/design/iterator-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Visitor Pattern in Python, Java, and JavaScript. Behavioral design pattern for adding operations to object structures."
  keywords:
    - visitor pattern
    - design pattern
    - behavioral pattern
    - double dispatch
    - object structure
    - python visitor
    - java visitor
    - javascript visitor
---

# Visitor Pattern

## Overview

The Visitor Pattern is a behavioral design pattern that lets you define a new operation on an object structure without changing the classes of the elements on which it operates. It separates algorithms from the objects they operate on, making it easy to add new operations to a complex class hierarchy.

## When to Use

Use the Visitor Pattern when:
- You need to perform operations on all elements of a complex object structure
- The object structure is stable but operations on it change frequently
- You want to avoid polluting element classes with unrelated operations
- The operation logic depends on the concrete class of the element, not just the interface
- Examples: AST traversal (compilers), document export (PDF, HTML), report generation on entity trees

## Solution

### Python

```python
from abc import ABC, abstractmethod
from typing import List

class ShapeVisitor(ABC):
    @abstractmethod
    def visit_circle(self, circle):
        pass

    @abstractmethod
    def visit_rectangle(self, rectangle):
        pass

class Shape(ABC):
    @abstractmethod
    def accept(self, visitor: ShapeVisitor):
        pass

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius

    def accept(self, visitor: ShapeVisitor):
        visitor.visit_circle(self)

class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    def accept(self, visitor: ShapeVisitor):
        visitor.visit_rectangle(self)

class AreaVisitor(ShapeVisitor):
    def __init__(self):
        self.total = 0

    def visit_circle(self, circle: Circle):
        self.total += 3.14159 * circle.radius ** 2

    def visit_rectangle(self, rectangle: Rectangle):
        self.total += rectangle.width * rectangle.height

class DrawVisitor(ShapeVisitor):
    def visit_circle(self, circle: Circle):
        print(f"Drawing circle with radius {circle.radius}")

    def visit_rectangle(self, rectangle: Rectangle):
        print(f"Drawing rectangle {rectangle.width}x{rectangle.height}")

# Usage
shapes: List[Shape] = [Circle(5), Rectangle(4, 6)]

area_visitor = AreaVisitor()
for shape in shapes:
    shape.accept(area_visitor)
print(f"Total area: {area_visitor.total}")

draw_visitor = DrawVisitor()
for shape in shapes:
    shape.accept(draw_visitor)
```

### JavaScript

```javascript
class AreaVisitor {
  constructor() {
    this.total = 0;
  }

  visitCircle(circle) {
    this.total += Math.PI * circle.radius ** 2;
  }

  visitRectangle(rectangle) {
    this.total += rectangle.width * rectangle.height;
  }
}

class DrawVisitor {
  visitCircle(circle) {
    console.log(`Drawing circle with radius ${circle.radius}`);
  }

  visitRectangle(rectangle) {
    console.log(`Drawing rectangle ${rectangle.width}x${rectangle.height}`);
  }
}

class Circle {
  constructor(radius) {
    this.radius = radius;
  }

  accept(visitor) {
    visitor.visitCircle(this);
  }
}

class Rectangle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  accept(visitor) {
    visitor.visitRectangle(this);
  }
}

// Usage
const shapes = [new Circle(5), new Rectangle(4, 6)];

const areaVisitor = new AreaVisitor();
shapes.forEach(s => s.accept(areaVisitor));
console.log(`Total area: ${areaVisitor.total}`);

const drawVisitor = new DrawVisitor();
shapes.forEach(s => s.accept(drawVisitor));
```

### Java

```java
public interface ShapeVisitor {
    void visit(Circle circle);
    void visit(Rectangle rectangle);
}

public interface Shape {
    void accept(ShapeVisitor visitor);
}

public class Circle implements Shape {
    public final double radius;

    public Circle(double radius) {
        this.radius = radius;
    }

    public void accept(ShapeVisitor visitor) {
        visitor.visit(this);
    }
}

public class Rectangle implements Shape {
    public final double width, height;

    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }

    public void accept(ShapeVisitor visitor) {
        visitor.visit(this);
    }
}

public class AreaVisitor implements ShapeVisitor {
    public double total = 0;

    public void visit(Circle circle) {
        total += Math.PI * circle.radius * circle.radius;
    }

    public void visit(Rectangle rectangle) {
        total += rectangle.width * rectangle.height;
    }
}

public class DrawVisitor implements ShapeVisitor {
    public void visit(Circle circle) {
        System.out.println("Drawing circle with radius " + circle.radius);
    }

    public void visit(Rectangle rectangle) {
        System.out.println("Drawing rectangle " + rectangle.width + "x" + rectangle.height);
    }
}

// Usage
List<Shape> shapes = List.of(new Circle(5), new Rectangle(4, 6));

AreaVisitor area = new AreaVisitor();
shapes.forEach(s -> s.accept(area));
System.out.println("Total area: " + area.total);

DrawVisitor draw = new DrawVisitor();
shapes.forEach(s -> s.accept(draw));
```

## Explanation

The Visitor Pattern has two roles:

- **Visitor** (`ShapeVisitor`): Declares a `visit()` method for each concrete element type
- **Element** (`Shape`): Declares an `accept()` method that takes a visitor and calls the appropriate `visit()` method

This is known as **double dispatch**: the first dispatch is `shape.accept(visitor)`, the second is `visitor.visit(circle)` inside the element's `accept` method. This lets the visitor execute different code based on the element's concrete type without `instanceof` checks.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Classic Visitor** | Separate visitor class per operation | Compilers, AST traversal |
| **Acyclic Visitor** | Visitor uses abstract interface, not concrete types | When element hierarchy is unstable |
| **Reflective Visitor** | Uses reflection to avoid `accept()` methods | Prototypes, scripting |

## Best Practices

- **Use only when the element hierarchy is stable** — adding a new element type requires changing all visitors
- **Group related operations** into a single visitor instead of many small ones
- **Consider `instanceof` + sealed classes** (Java 17+) as a modern alternative
- **Keep visitors stateless** when possible, or clearly document mutable state
- **Use alongside Composite** for traversing tree structures

## Common Mistakes

- Applying Visitor when the element hierarchy changes frequently (high maintenance cost)
- Breaking encapsulation by exposing too many internals to visitors
- Forgetting to add `accept()` methods to new element types
- Using Visitor when a simple polymorphic method override would suffice
- Creating a separate visitor class for every tiny operation, creating class explosion

## Frequently Asked Questions

**Q: Why not just add methods to the element classes directly?**
A: If the operation is specific to a client use case (e.g., PDF export) and not intrinsic to the element, adding it directly violates the Single Responsibility Principle. Visitor keeps element classes focused.

**Q: Is there a modern alternative to Visitor?**
A: In languages with sealed classes and pattern matching (Java 17+, TypeScript 5.3+), you can use `switch` expressions with exhaustive type checking instead of the classic Visitor double-dispatch.
