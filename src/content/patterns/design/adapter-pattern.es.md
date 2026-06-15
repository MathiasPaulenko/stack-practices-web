---
contentType: patterns
slug: adapter-pattern
title: "Patrón Adapter"
description: "Convierte la interfaz de una clase en otra interfaz que los clientes esperan. Patrón de diseño estructural para compatibilidad de interfaces."
metaDescription: "Aprende el Patrón Adapter con ejemplos prácticos en Python, Java y JavaScript. Patrón estructural para hacer que interfaces incompatibles trabajen juntas."
difficulty: beginner
topics:
  - design
tags:
  - adapter
  - pattern
  - design-pattern
  - structural
  - compatibility
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/decorator-pattern
  - /patterns/design/command-pattern
  - /recipes/api/call-rest-api
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Adapter con ejemplos prácticos en Python, Java y JavaScript. Patrón estructural para hacer que interfaces incompatibles trabajen juntas."
  keywords:
    - adapter pattern
    - patrón de diseño
    - patrón estructural
    - compatibilidad de interfaces
    - wrapper
    - python adapter
    - java adapter
    - javascript adapter
---

# Patrón Adapter

## Visión general

El Patrón Adapter es un patrón de diseño estructural que permite que objetos con interfaces incompatibles colaboren. Envuelve una clase existente con una nueva interfaz para que sea compatible con las expectativas del cliente.

Es el equivalente software de un adaptador de corriente físico: convierte una interfaz en otra sin modificar el dispositivo original.

## Cuándo usarlo

Usa el Patrón Adapter cuando:
- Quieres usar una clase existente cuya interfaz es incompatible con el resto de tu código
- Necesitas reutilizar código legacy o de terceros que no coincide con tus interfaces
- Quieres crear una interfaz unificada a través de varias clases con APIs diferentes
- No puedes o no deberías modificar el código fuente de la clase incompatible
- Necesitas traducir formatos de datos o convenciones de llamada entre sistemas

## Solución

### Python

```python
class OldPrinter:
    def old_print(self, text: str):
        print(f"OldPrinter: {text}")

class PrinterAdapter:
    def __init__(self, old_printer: OldPrinter):
        self._old = old_printer

    def print(self, text: str):
        self._old.old_print(text)

# Uso
adapter = PrinterAdapter(OldPrinter())
adapter.print("Hello World")  # OldPrinter: Hello World
```

### JavaScript

```javascript
class OldPrinter {
  oldPrint(text) {
    console.log(`OldPrinter: ${text}`);
  }
}

class PrinterAdapter {
  constructor(oldPrinter) {
    this.old = oldPrinter;
  }

  print(text) {
    this.old.oldPrint(text);
  }
}

// Uso
const adapter = new PrinterAdapter(new OldPrinter());
adapter.print("Hello World"); // OldPrinter: Hello World
```

### Java

```java
class OldPrinter {
    void oldPrint(String text) {
        System.out.println("OldPrinter: " + text);
    }
}

interface ModernPrinter {
    void print(String text);
}

class PrinterAdapter implements ModernPrinter {
    private final OldPrinter oldPrinter;

    PrinterAdapter(OldPrinter oldPrinter) {
        this.oldPrinter = oldPrinter;
    }

    public void print(String text) {
        oldPrinter.oldPrint(text);
    }
}

// Uso
ModernPrinter printer = new PrinterAdapter(new OldPrinter());
printer.print("Hello World"); // OldPrinter: Hello World
```

## Explicación

El Patrón Adapter consiste en:

- **Interfaz Target** (`ModernPrinter`): La interfaz que el cliente espera
- **Adaptee** (`OldPrinter`): La clase existente con la interfaz incompatible
- **Adapter** (`PrinterAdapter`): Envuelve el adaptee y expone la interfaz target

El adapter traduce llamadas desde la interfaz target a llamadas que el adaptee entiende. Ni el cliente ni el adaptee necesitan cambiar.

## Variantes

| Variante | Caso de uso | Compromiso |
|----------|-------------|------------|
| **Object Adapter** | Envuelve una instancia (composición) | Flexible, puede adaptar subclases |
| **Class Adapter** | Hereda del adaptee (herencia múltiple) | Menos flexible, no posible en todos los lenguajes |
| **Two-way Adapter** | Ambas interfaces son usables | Más complejo, pero bidireccional |

## Mejores prácticas

- **Prefiere composición sobre herencia** para adapters (object adapter pattern)
- **Mantén el adapter delgado**: Debería traducir llamadas, no añadir lógica de negocio
- **Documenta el mapeo**: Explica cómo los métodos target se mapean a métodos del adaptee
- **Maneja nulls y excepciones** gracefulmente durante la traducción
- **Considera caching**: Si la traducción involucra computación pesada, cachea resultados

## Errores comunes

- **Adapters gordos**: Añadir lógica de negocio en lugar de solo traducción de interfaz
- **Adapters filtrados**: Exponer métodos del adaptee a través de la interfaz del adapter
- **Adapters en cascada**: Encadenar múltiples adapters crea un infierno de indirección
- **Ignorar excepciones**: No traducir o manejar errores del adaptee apropiadamente
- **Modificar el adaptee**: Todo el punto es dejar la clase original intacta

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Adapter y Facade?**
R: Adapter hace compatible una interfaz incompatible. Facade simplifica un subsistema complejo proporcionando una única interfaz unificada.

**P: ¿Puedo adaptar múltiples clases a la vez?**
R: Sí. Un único adapter puede envolver múltiples adaptees y coordinarlos para proporcionar una interfaz unificada.

**P: ¿Es Adapter un workaround para mal diseño?**
R: A veces, pero a menudo es un puente pragmático cuando integras código externo o legacy que no puedes modificar.
