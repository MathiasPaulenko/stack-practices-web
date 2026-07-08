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

## Lo que funciona

- **Usa la misma factory para todos los productos de una feature**: Nunca mezcles factories de diferentes familias
- **Documenta el contrato de la familia de productos**: Lista qué clases concretas pertenecen juntas
- **Mantén los métodos de factory simples**: Las factories deberían delegar a constructores, no contener lógica compleja
- **Considera un registro**: Para selección de factory en tiempo de ejecución basada en configuración
- **Empareja con [Singleton](/patterns/design/singleton-pattern)**: A menudo la factory concreta misma es un singleton

## Técnicas Avanzadas

### Múltiples familias de productos con configuración

Extiende el patrón para soportar múltiples familias con configuración en runtime:

```python
# Python: Múltiples familias con registro
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
            raise ValueError(f"Factory desconocida: {name}")
        return factory_class()

# Registrar factories
FactoryRegistry.register('light', LightUIFactory)
FactoryRegistry.register('dark', DarkUIFactory)

# Selección en runtime
theme = 'dark'  # Podría venir de configuración
factory = FactoryRegistry.get_factory(theme)
button = factory.create_button()
```

### Factory con creación de productos parametrizada

Pasa parámetros a métodos de factory para instanciación flexible de productos:

```java
// Java: Factory parametrizada
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

### Inicialización lazy de factories con proxies

Difierre la instanciación de factory hasta el primer uso:

```javascript
// JavaScript: Proxy de factory lazy
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

// Uso
const lazyFactory = new LazyUIFactory(() => {
    console.log('Factory inicializada');
    return new LightUIFactory();
});

// Factory no inicializada hasta primera llamada de método
const button = lazyFactory.createButton();
```

### Composición de factory con inyección de dependencias

Combina múltiples factories para creación compleja de productos:

```python
# Python: Composición de factory
class ComplexUIFactory(UIFactory):
    def __init__(self, button_factory: UIFactory, checkbox_factory: UIFactory):
        self.button_factory = button_factory
        self.checkbox_factory = checkbox_factory

    def create_button(self) -> Button:
        return self.button_factory.create_button()

    def create_checkbox(self) -> Checkbox:
        return self.checkbox_factory.create_checkbox()

# Componer factories desde diferentes fuentes
button_factory = LightUIFactory()
checkbox_factory = DarkUIFactory()
composite_factory = ComplexUIFactory(button_factory, checkbox_factory)
```

### Carga dinámica de factories con reflexión

Carga factories dinámicamente basadas en configuración:

```java
// Java: Carga dinámica de factory
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

// Carga basada en configuración
String factoryClassName = config.get("ui.factory");
UIFactory factory = FactoryLoader.loadFactory(factoryClassName);
```

## Mejores Prácticas

1. **Mantén interfaces de factory cohesivas.** Cada factory debe crear una familia lógicamente relacionada de productos. Evita mezclar tipos de productos no relacionados.
2. **Usa nombres significativos.** Nombra las factories según la familia que representan (ej. LightUIFactory, DarkUIFactory) en lugar de nombres genéricos.
3. **Documenta compatibilidad de productos.** Documenta claramente qué productos de la misma familia son compatibles y cómo deben usarse juntos.
4. **Considera el ciclo de vida de factory.** Decide si las factories son singletons, con scope a request, o creadas por caso de uso según las necesidades de tu aplicación.
5. **Proporciona defaults sensatos.** Cuando uses factories basadas en configuración, asegúrate que las configuraciones por defecto sean seguras y funcionen para la mayoría de casos comunes.
6. **Prueba la lógica de selección de factory.** Escribe unit tests para mecanismos de selección de factory para asegurar que la factory correcta sea elegida para cada escenario.
7. **Evita sobre-abstractización.** No crees abstract factories para casos simples donde la instanciación directa sería más clara y mantenible.
8. **Monitorea el rendimiento de factory.** Perfila la creación de factory y la instanciación de productos para asegurar que la abstracción no introduzca overhead inaceptable.
9. **Maneja errores gracefulmente.** Las factories deben manejar o propagar errores apropiadamente, especialmente al cargar factories dinámicamente.
10. **Usa seguridad de tipos.** Aprovecha características del lenguaje para asegurar seguridad de tipos en métodos de factory e interfaces de productos.

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Factory Method y Abstract Factory?**
R: [Factory Method](/patterns/design/factory-pattern) delega la creación de objetos a subclases. Abstract Factory crea familias de objetos relacionados a través de múltiples métodos de factory.

**P: ¿Puede Abstract Factory combinarse con Builder?**
R: Sí. La factory puede retornar [builders](/patterns/design/builder-pattern) para productos complejos, o los builders pueden usar factories para construir partes.

**P: ¿Cómo añado un nuevo tipo de producto a una familia existente?**
R: Debes añadir un nuevo método abstracto a la interfaz de factory e implementarlo en cada factory concreta. Este es el principal inconveniente del patrón.

**P: ¿Debería usar Abstract Factory para cambio de tema simple?**
R: Para cambio de tema simple (colores, fuentes), variables CSS u objetos de tema pueden ser más simples. Usa Abstract Factory cuando los temas requieren diferentes implementaciones de componentes.

**P: ¿Puede Abstract Factory trabajar con código legacy existente?**
R: Sí. Puedes introducir Abstract Factory gradualmente creando adapter factories que envuelvan lógica de instanciación legacy, luego migrar código cliente con el tiempo.

**P: ¿Cómo se compara Abstract Factory con el patrón Prototype?**
R: Abstract Factory crea nuevos objetos desde cero. Prototype clona objetos existentes. Pueden usarse juntos: Abstract Factory crea prototipos, y Prototype los clona.

**P: ¿Puedo usar Abstract Factory para capas de acceso a datos?**
R: Sí. Abstract Factory se usa comúnmente para crear objetos de acceso a datos (DAOs) o implementaciones de repository específicas de base de datos, permitiendo que la aplicación cambie entre proveedores de base de datos.

**P: ¿Cómo pruebo código que usa Abstract Factory?**
R: Usa factories mock en tests para crear test doubles de productos. Esto permite probar lógica cliente sin depender de implementaciones de producto reales.

**P: ¿Es este patrón adecuado para proyectos pequeños?**
R: Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

**P: ¿Cómo se compara este patrón con alternativas?**
R: Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

**P: ¿Puedo aplicar este patrón parcialmente?**
R: Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
