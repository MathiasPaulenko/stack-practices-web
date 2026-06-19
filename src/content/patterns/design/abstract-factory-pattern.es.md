---
contentType: patterns
slug: abstract-factory-pattern
title: "Patrón Abstract Factory"
description: "Crea familias de objetos relacionados sin especificar sus clases concretas. Patrón de diseño creacional para familias de objetos consistentes."
metaDescription: "Aprende el Patrón Abstract Factory con ejemplos prácticos en Python, Java y JavaScript. Patrón creacional para familias de objetos relacionados."
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
  metaDescription: "Aprende el Patrón Abstract Factory con ejemplos prácticos en Python, Java y JavaScript. Patrón creacional para familias de objetos relacionados."
  keywords:
    - abstract factory pattern
    - patrón de diseño
    - patrón creacional
    - familia de factories
    - familias de objetos
    - python abstract factory
    - java abstract factory
    - javascript abstract factory
---

# Patrón Abstract Factory

## Visión general

El Patrón Abstract Factory es un patrón de diseño creacional que proporciona una interfaz para crear familias de objetos relacionados o dependientes sin especificar sus clases concretas.

Es ideal cuando tu sistema necesita soportar múltiples variantes de productos (ej. temas de UI para Windows vs. Mac, drivers de base de datos para PostgreSQL vs. MySQL) y quiere garantizar que todos los productos de una familia se usen juntos.

## Cuándo usarlo

Usa el Patrón Abstract Factory cuando:
- Tu sistema necesita ser independiente de cómo se crean, componen y representan sus productos
- Una familia de productos relacionados está diseñada para usarse junta
- Quieres forzar que solo se usen productos compatibles de la misma familia
- Necesitas soportar múltiples configuraciones de productos (temas, plataformas, proveedores)
- Añadir una nueva familia de productos no debería requerir cambiar código cliente existente

## Solución

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

# Uso
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

// Uso
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

// Uso
UIFactory factory = new LightUIFactory();
Button button = factory.createButton();
System.out.println(button.render()); // Light Button
```

## Explicación

El Patrón Abstract Factory consiste en:

- **Abstract Factory** (`UIFactory`): Declara métodos de creación para cada tipo de producto
- **Concrete Factory** (`LightUIFactory`): Implementa la creación para una familia específica de productos
- **Abstract Products** (`Button`, `Checkbox`): Interfaces para tipos de productos
- **Concrete Products** (`LightButton`, `LightCheckbox`): Las implementaciones reales

Un cliente usa solo las interfaces abstractas. Cambiar de Light a Dark theme significa intercambiar la instancia de factory, sin cambios en el código cliente.

## Variantes

| Variante | Caso de uso | Compromiso |
|----------|-------------|------------|
| **Abstract Factory clásico** | Múltiples familias de productos | Verboso, pero type-safe |
| **Factory Method por familia** | Sistemas más simples | Menos boilerplate, pero sin control centralizado de familia |
| **Dependency Injection** | Sistemas empresariales grandes | Más flexible, pero requiere un contenedor |

## Mejores prácticas

- **Usa la misma factory para todos los productos de una feature**: Nunca mezcles factories de diferentes familias
- **Documenta el contrato de la familia de productos**: Lista qué clases concretas pertenecen juntas
- **Mantén los métodos de factory simples**: Las factories deberían delegar a constructores, no contener lógica compleja
- **Considera un registro**: Para selección de factory en tiempo de ejecución basada en configuración
- **Empareja con [Singleton](/patterns/design/singleton-pattern)**: A menudo la factory concreta misma es un singleton

## Errores comunes

- **Mezclar familias**: Crear un Light Button con un Dark Checkbox rompe la consistencia
- **Factory inflado**: Añadir lógica de negocio dentro de métodos de factory en lugar de mantenerlos como creadores delgados
- **Sobre-abstracción**: Usar Abstract Factory cuando un simple [Factory Method](/patterns/design/factory-pattern) es suficiente
- **Abstracciones filtradas**: Retornar tipos concretos en lugar de interfaces abstractas
- **Testing difícil**: No proporcionar una forma fácil de inyectar factories mock

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Factory Method y Abstract Factory?**
R: [Factory Method](/patterns/design/factory-pattern) delega la creación de objetos a subclases. Abstract Factory crea familias de objetos relacionados a través de múltiples métodos de factory.

**P: ¿Puede Abstract Factory combinarse con Builder?**
R: Sí. La factory puede retornar [builders](/patterns/design/builder-pattern) para productos complejos, o los builders pueden usar factories para construir partes.

**P: ¿Cómo añado un nuevo tipo de producto a una familia existente?**
R: Debes añadir un nuevo método abstracto a la interfaz de factory e implementarlo en cada factory concreta. Este es el principal inconveniente del patrón.
