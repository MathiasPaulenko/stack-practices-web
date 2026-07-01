---
contentType: patterns
slug: visitor-pattern
title: "Patrón Visitor"
description: "Representa una operación a realizar sobre los elementos de una estructura de objetos sin cambiar las clases de los elementos. Un patrón de diseño de comportamiento."
metaDescription: "Aprende el Patrón Visitor en Python, Java y JavaScript. Patrón de comportamiento para agregar operaciones a estructuras de objetos."
difficulty: advanced
topics:
  - design
tags:
  - visitor
  - patron
  - patron-de-diseno
  - comportamiento
  - doble-despacho
  - operaciones
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
  metaDescription: "Aprende el Patrón Visitor en Python, Java y JavaScript. Patrón de comportamiento para agregar operaciones a estructuras de objetos."
  keywords:
    - patron visitor
    - patron de diseno
    - patron de comportamiento
    - doble despacho
    - estructura de objetos
    - python visitor
    - java visitor
    - javascript visitor
---

# Patrón Visitor

## Resumen

El Patrón Visitor es un patrón de diseño de comportamiento que te permite definir una nueva operación sobre una estructura de objetos sin cambiar las clases de los elementos sobre los que opera. Separa los algoritmos de los objetos sobre los que operan, haciendo fácil agregar nuevas operaciones a una jerarquía de clases compleja.

## Cuándo usarlo

Usa el Patrón Visitor cuando:
- Necesites realizar operaciones sobre todos los elementos de una estructura de objetos compleja. Consulta [Composite Pattern](/patterns/design/composite-pattern) para estructuras de árbol.
- La estructura de objetos sea estable pero las operaciones sobre ella cambien frecuentemente. Consulta [Strategy Pattern](/patterns/design/strategy-pattern) para algoritmos intercambiables.
- Quieras evitar contaminar las clases de elementos con operaciones no relacionadas. Consulta [Single Responsibility Principle](/patterns/design/solid-principles-typescript) para clases enfocadas.
- La lógica de la operación dependa de la clase concreta del elemento, no solo de la interfaz
- Ejemplos: recorrido de AST (compiladores), exportación de documentos (PDF, HTML), generación de reportes sobre árboles de entidades

## Solución

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

# Uso
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

// Uso
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

// Uso
List<Shape> shapes = List.of(new Circle(5), new Rectangle(4, 6));

AreaVisitor area = new AreaVisitor();
shapes.forEach(s -> s.accept(area));
System.out.println("Total area: " + area.total);

DrawVisitor draw = new DrawVisitor();
shapes.forEach(s -> s.accept(draw));
```

## Explicación

El Patrón Visitor tiene dos roles:

- **Visitor** (`ShapeVisitor`): Declara un método `visit()` para cada tipo de elemento concreto
- **Elemento** (`Shape`): Declara un método `accept()` que recibe un visitor y llama al método `visit()` apropiado

Esto se conoce como **doble despacho**: el primer despacho es `shape.accept(visitor)`, el segundo es `visitor.visit(circle)` dentro del método `accept` del elemento. Esto permite que el visitor ejecute código diferente basado en el tipo concreto del elemento sin usar `instanceof`.

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **Visitor Clásico** | Clase visitor separada por operación | Compiladores, recorrido de AST |
| **Visitor Acíclico** | Visitor usa interfaz abstracta, no tipos concretos | Cuando la jerarquía de elementos es inestable |
| **Visitor Reflectivo** | Usa reflexión para evitar métodos `accept()` | Prototipos, scripting |

## Lo que funciona

- **Usa solo cuando la jerarquía de elementos sea estable** — agregar un nuevo tipo de elemento requiere cambiar todos los visitors
- **Agrupa operaciones relacionadas** en un solo visitor en lugar de muchos pequeños
- **Considera `instanceof` + sealed classes** (Java 17+) como alternativa moderna
- **Mantén los visitors sin estado** cuando sea posible, o documenta claramente el estado mutable
- **Úsalo junto con [Composite](/patterns/design/composite-pattern)** para recorrer estructuras de árbol

## Errores comunes

- Aplicar Visitor cuando la jerarquía de elementos cambia frecuentemente (alto costo de mantenimiento)
- Romper el encapsulamiento exponiendo demasiados internals a los visitors
- Olvidar agregar métodos `accept()` a nuevos tipos de elementos
- Usar Visitor cuando un simple método polimórfico sobreescrito sería suficiente
- Crear una clase visitor separada para cada operación pequeña, creando explosión de clases

## Preguntas frecuentes

**P: ¿Por qué no simplemente agregar métodos a las clases de elementos directamente?**
R: Si la operación es específica de un caso de uso del cliente (ej. exportación a PDF) y no es intrínseca al elemento, agregarla directamente viola el [Principio de Responsabilidad Única](/patterns/design/solid-principles-typescript). Visitor mantiene las clases de elementos enfocadas.

**P: ¿Hay una alternativa moderna a Visitor?**
R: En lenguajes con sealed classes y pattern matching (Java 17+, TypeScript 5.3+), puedes usar expresiones `switch` con type checking exhaustivo en lugar del doble despacho clásico de Visitor.
