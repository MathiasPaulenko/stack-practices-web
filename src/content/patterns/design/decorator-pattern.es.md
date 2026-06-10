---
contentType: patterns
slug: decorator-pattern
title: "Patrón Decorator"
description: "Añade nueva funcionalidad a objetos dinámicamente envolviéndolos. Patrón de diseño estructural para extensión flexible de comportamiento."
metaDescription: "Aprende el Patrón Decorator con ejemplos prácticos en Python, Java y JavaScript. Patrón estructural para extensión dinámica de comportamiento."
difficulty: intermediate
topics:
  - design
tags:
  - decorator
  - pattern
  - design-pattern
  - structural
  - composition
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/adapter-pattern
  - /patterns/design/strategy-pattern
  - /recipes/api/call-rest-api
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Decorator con ejemplos prácticos en Python, Java y JavaScript. Patrón estructural para extensión dinámica de comportamiento."
  keywords:
    - decorator pattern
    - patrón de diseño
    - patrón estructural
    - comportamiento dinámico
    - python decorator
    - java decorator
    - javascript decorator
---

# Patrón Decorator

## Visión general

El Patrón Decorator es un patrón de diseño estructural que te permite añadir nuevos comportamientos a objetos colocándolos dentro de objetos envolventes que contienen esos comportamientos. Proporciona una alternativa flexible a la herencia para extender funcionalidad.

Es ampliamente usado en streams de I/O (Java), pipelines de middleware (Express.js) y la sintaxis `@decorator` de Python.

## Cuándo usarlo

Usa el Patrón Decorator cuando:
- Necesitas añadir responsabilidades a objetos dinámicamente y de forma transparente
- La extensión por herencia es impracticable o imposible (ej. clases final)
- Quieres combinar múltiples comportamientos en diversas configuraciones
- Necesitas adherirte al Principio de Responsabilidad Única separando preocupaciones
- Quieres evitar una explosión de clases de todas las combinaciones posibles por herencia

## Solución

### Python

```python
from abc import ABC, abstractmethod

class Coffee(ABC):
    @abstractmethod
    def cost(self) -> float:
        pass

    @abstractmethod
    def description(self) -> str:
        pass

class SimpleCoffee(Coffee):
    def cost(self) -> float:
        return 2.0

    def description(self) -> str:
        return "Simple coffee"

class MilkDecorator(Coffee):
    def __init__(self, coffee: Coffee):
        self._coffee = coffee

    def cost(self) -> float:
        return self._coffee.cost() + 0.5

    def description(self) -> str:
        return self._coffee.description() + ", milk"

# Uso
coffee = MilkDecorator(SimpleCoffee())
print(coffee.description())  # Simple coffee, milk
print(coffee.cost())         # 2.5
```

### JavaScript

```javascript
class Coffee {
  cost() {
    return 2.0;
  }

  description() {
    return "Simple coffee";
  }
}

class MilkDecorator {
  constructor(coffee) {
    this.coffee = coffee;
  }

  cost() {
    return this.coffee.cost() + 0.5;
  }

  description() {
    return this.coffee.description() + ", milk";
  }
}

// Uso
const coffee = new MilkDecorator(new Coffee());
console.log(coffee.description()); // Simple coffee, milk
console.log(coffee.cost());        // 2.5
```

### Java

```java
interface Coffee {
    double cost();
    String description();
}

class SimpleCoffee implements Coffee {
    public double cost() { return 2.0; }
    public String description() { return "Simple coffee"; }
}

abstract class CoffeeDecorator implements Coffee {
    protected Coffee coffee;
    CoffeeDecorator(Coffee coffee) { this.coffee = coffee; }
}

class MilkDecorator extends CoffeeDecorator {
    MilkDecorator(Coffee coffee) { super(coffee); }
    public double cost() { return coffee.cost() + 0.5; }
    public String description() { return coffee.description() + ", milk"; }
}

// Uso
Coffee coffee = new MilkDecorator(new SimpleCoffee());
System.out.println(coffee.description()); // Simple coffee, milk
System.out.println(coffee.cost());        // 2.5
```

## Explicación

El Patrón Decorator se basa en composición sobre herencia:

- **Interfaz Componente** (`Coffee`): Define el contrato tanto para componentes concretos como decorators
- **Componente concreto** (`SimpleCoffee`): El objeto base siendo envuelto
- **Decorator** (`MilkDecorator`): Implementa la misma interfaz y delega al objeto envuelto

Los decorators pueden anidarse arbitrariamente. Puedes envolver un `MilkDecorator` con un `SugarDecorator`, luego con un `WhipDecorator`, construyendo pilas de comportamiento en tiempo de ejecución.

## Variantes

| Variante | Caso de uso | Compromiso |
|----------|-------------|------------|
| **Basado en clases** | Lenguajes fuertemente tipados (Java, C#) | Verboso pero type-safe |
| **Basado en funciones** | Sintaxis `@decorator` de Python | Conciso, pero composición menos explícita |
| **Pipeline de middleware** | Frameworks web (Express, Koa) | Excelente para procesamiento request/response |

## Mejores prácticas

- **Mantén los decorators transparentes**: Deben implementar exactamente la misma interfaz que el componente
- **Delega todos los métodos**: A menos que se sobrescriba intencionalmente, pasa cada llamada al objeto envuelto
- **Evita decorators con estado** cuando sea posible para reducir complejidad
- **Documenta el orden de decorators**: Algunos decorators pueden comportarse diferente dependiendo del orden de envoltura
- **Prefiere composición sobre herencia**: Esta es la filosofía central del patrón

## Errores comunes

- **Olvidar delegar**: Un decorator que no reenvía llamadas rompe la cadena
- **Abstracción filtrada**: Decorators exponiendo métodos no presentes en la interfaz del componente
- **Sensibilidad al orden**: Decorators que dependen de ser internos o externos pueden causar bugs sutiles
- **Sobre-decoración**: Demasiados decorators anidados dificultan el debugging y profiling
- **Conflictos de estado**: Múltiples decorators con estado conflictivo sobre el mismo componente

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Decorator y Proxy?**
R: Decorator añade responsabilidades dinámicamente. Proxy controla el acceso a un objeto (inicialización perezosa, control de acceso, logging). Tienen estructura similar pero intención diferente.

**P: ¿Se pueden remover decorators en tiempo de ejecución?**
R: No fácilmente en la mayoría de implementaciones. Si necesitas flexibilidad de añadir/remover, considera el patrón Chain of Responsibility.

**P: ¿Son la sintaxis `@decorator` de Python y el Patrón Decorator lo mismo?**
R: El `@decorator` de Python es una característica del lenguaje para envolver funciones. El Patrón Decorator es un patrón de diseño OOP para envolver objetos. Comparten el concepto pero se aplican a diferentes niveles.
