---
contentType: patterns
slug: command-pattern
title: "Patrón Command"
description: "Encapsula una petición como un objeto, permitiendo parametrizar clientes con colas, logs y operaciones deshacibles. Patrón de diseño conductual."
metaDescription: "Aprende el Patrón Command con ejemplos prácticos en Python, Java y JavaScript. Patrón conductual para encapsular peticiones como objetos."
difficulty: intermediate
topics:
  - design
tags:
  - command
  - pattern
  - design-pattern
  - behavioral
  - undo
  - queue
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/observer-pattern
  - /patterns/design/strategy-pattern
  - /recipes/testing/unit-testing
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Command con ejemplos prácticos en Python, Java y JavaScript. Patrón conductual para encapsular peticiones como objetos."
  keywords:
    - command pattern
    - patrón de diseño
    - patrón conductual
    - undo redo
    - encapsulación de peticiones
    - python command
    - java command
    - javascript command
---

# Patrón Command

## Visión general

El Patrón Command es un patrón de diseño conductual que convierte una petición en un objeto independiente que contiene toda la información sobre la petición. Esto te permite parametrizar métodos con diferentes peticiones, retrasar o encolar ejecución y soportar operaciones deshacibles.

Es la base de sistemas de [undo/redo](/patterns/design/command-pattern-undo), colas de trabajo, grabación de macros y operaciones transaccionales.

## Cuándo usarlo

Usa el Patrón Command cuando:
- Necesitas parametrizar objetos con operaciones a ejecutar
- Quieres encolar, programar o ejecutar operaciones remotamente
- Necesitas funcionalidad de deshacer/rehacer
- Quieres registrar cambios para reproducción o auditoría
- Necesitas comportamiento transaccional (ejecutar todo o revertir)

## Solución

### Python

```python
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self):
        pass

    @abstractmethod
    def undo(self):
        pass

class Light:
    def __init__(self):
        self.is_on = False

    def turn_on(self):
        self.is_on = True
        print("Light is on")

    def turn_off(self):
        self.is_on = False
        print("Light is off")

class TurnOnCommand(Command):
    def __init__(self, light: Light):
        self.light = light

    def execute(self):
        self.light.turn_on()

    def undo(self):
        self.light.turn_off()

# Uso
light = Light()
cmd = TurnOnCommand(light)
cmd.execute()  # Light is on
cmd.undo()     # Light is off
```

### JavaScript

```javascript
class Light {
  constructor() {
    this.isOn = false;
  }
  turnOn() {
    this.isOn = true;
    console.log("Light is on");
  }
  turnOff() {
    this.isOn = false;
    console.log("Light is off");
  }
}

class TurnOnCommand {
  constructor(light) {
    this.light = light;
  }
  execute() {
    this.light.turnOn();
  }
  undo() {
    this.light.turnOff();
  }
}

// Uso
const light = new Light();
const cmd = new TurnOnCommand(light);
cmd.execute(); // Light is on
cmd.undo();    // Light is off
```

### Java

```java
interface Command {
    void execute();
    void undo();
}

class Light {
    boolean isOn = false;
    void turnOn() { isOn = true; System.out.println("Light is on"); }
    void turnOff() { isOn = false; System.out.println("Light is off"); }
}

class TurnOnCommand implements Command {
    private final Light light;
    TurnOnCommand(Light light) { this.light = light; }
    public void execute() { light.turnOn(); }
    public void undo() { light.turnOff(); }
}

// Uso
Light light = new Light();
Command cmd = new TurnOnCommand(light);
cmd.execute(); // Light is on
cmd.undo();    // Light is off
```

## Explicación

El Patrón Command separa la invocación de la acción de su ejecución:

- **Interfaz Command**: Declara `execute()` y opcionalmente `undo()`
- **Command concreto** (`TurnOnCommand`): Vincula un receptor (`Light`) a una acción (`turnOn`)
- **Receptor** (`Light`): El objeto que realiza el trabajo real
- **Invocador**: Llama `execute()` en los commands (ej. un botón, scheduler o control remoto)

Al encapsular peticiones como objetos, ganas la habilidad de encolar, loggear y revertir operaciones.

## Variantes

| Variante | Caso de uso | Compromiso |
|----------|-------------|------------|
| **Command simple** | Acción directa sin undo | Fácil de implementar, flexibilidad limitada |
| **Command deshacible** | Operaciones que pueden revertirse | Requiere mantener estado para la reversión |
| **Macro Command** | Compuesto de múltiples commands | Potente, pero más difícil de deshacer atómicamente |

## Mejores prácticas

- **Implementa `undo()` para cada command** si tu sistema soporta deshacer
- **Mantén los commands sin estado cuando sea posible**: Almacena estado del receptor, no del command
- **Usa un historial de commands** (stack) para soportar deshacer/rehacer multinivel
- **Documenta efectos secundarios**: Commands que afectan sistemas externos son más difíciles de deshacer
- **Considera inmutabilidad**: Una vez configurado, un command no debería cambiar su target

## Errores comunes

- **Olvidar estado de undo**: Commands que no pueden revertirse rompen el stack de undo
- **Acoplamiento fuerte**: Commands que dependen de estado global en lugar de un receptor específico
- **Sobre-ingeniería**: Usar Command para operaciones triviales que nunca necesitan encolado o deshacer
- **Suposiciones síncronas**: No considerar que los commands pueden ejecutarse asíncronamente
- **Falta de idempotencia**: Ejecutar el mismo command dos veces produce resultados diferentes

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Command y Strategy?**
R: [Strategy](/patterns/design/strategy-pattern) encapsula algoritmos intercambiables. Command encapsula una petición para realizar una acción, a menudo con soporte para deshacer, encolar y logging.

**P: ¿Se puede usar Command sin undo?**
R: Sí. La capacidad de deshacer es opcional. Muchos sistemas usan Command únicamente para encolar y desacoplar invocadores de receptores.

**P: ¿Cómo implemento deshacer multinivel?**
R: Mantén un stack de commands ejecutados. Deshacer hace pop del stack y llama `undo()`. Consulta [Command con Undo/Redo](/patterns/design/command-pattern-undo) para una implementación completa. Rehacer empuja el command de vuelta y llama `execute()`.
