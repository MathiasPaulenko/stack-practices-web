---
contentType: patterns
slug: command-pattern-undo
title: "Command Pattern con Undo/Redo en TypeScript"
description: "Implementa el Command pattern para encapsular peticiones como objetos, habilitando operaciones undo/redo, encolamiento de peticiones y logging de operaciones"
metaDescription: "Command pattern con undo/redo en TypeScript. Encapsula peticiones como objetos para encolamiento, logging y acciones reversibles en aplicaciones interactivas."
difficulty: intermediate
topics:
  - design
tags:
  - command
  - behavioral-patterns
  - typescript
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/memento-pattern-state
  - /patterns/design/abstract-factory-cross-platform
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Command pattern con undo/redo en TypeScript. Encapsula peticiones como objetos para encolamiento, logging y acciones reversibles en aplicaciones interactivas."
  keywords:
    - command pattern
    - undo redo
    - typescript
    - behavioral patterns
    - operation queue
---

# Command Pattern con Undo/Redo en TypeScript

El [Command](/patterns/design/command-pattern) pattern convierte una peticion en un objeto independiente que contiene toda la informacion sobre la peticion. Este desacoplamiento permite parametrizar metodos con diferentes peticiones, retrasar o encolar ejecucion, e implementar operaciones undo/redo — esencial para aplicaciones interactivas como editores, herramientas de dibujo y constructores de formularios.

## Cuando Usar Esto

- Necesitas funcionalidad undo/redo en una interfaz de usuario
- Las operaciones deben ser encoladas, logueadas o ejecutadas remotamente
- El invocador no deberia saber cual receptor maneja una peticion

## Problema

Un editor de texto llama directamente metodos en un objeto documento. Agregar undo requiere exponer estado interno, y agregar macros requiere duplicar logica en la capa de UI.

## Solucion

```typescript
// commands/Command.ts
interface Command {
  execute(): void;
  undo(): void;
  getName(): string;
}

// Receiver
class TextDocument {
  private content = '';
  private history: string[] = [''];

  insert(text: string, position: number): void {
    this.content = this.content.slice(0, position) + text + this.content.slice(position);
    this.saveState();
  }

  delete(position: number, length: number): string {
    const removed = this.content.slice(position, position + length);
    this.content = this.content.slice(0, position) + this.content.slice(position + length);
    this.saveState();
    return removed;
  }

  getContent(): string {
    return this.content;
  }

  private saveState(): void {
    this.history.push(this.content);
  }

  restoreState(index: number): void {
    this.content = this.history[index] ?? this.content;
  }
}

// Concrete Commands
class InsertCommand implements Command {
  private previousLength: number;

  constructor(
    private document: TextDocument,
    private text: string,
    private position: number
  ) {
    this.previousLength = document.getContent().length;
  }

  execute(): void {
    this.document.insert(this.text, this.position);
  }

  undo(): void {
    this.document.delete(this.position, this.text.length);
  }

  getName(): string {
    return `Insert "${this.text}"`;
  }
}

class DeleteCommand implements Command {
  private deletedText: string = '';

  constructor(
    private document: TextDocument,
    private position: number,
    private length: number
  ) {}

  execute(): void {
    this.deletedText = this.document.delete(this.position, this.length);
  }

  undo(): void {
    this.document.insert(this.deletedText, this.position);
  }

  getName(): string {
    return `Delete ${this.length} chars`;
  }
}

// Invoker
class CommandHistory {
  private history: Command[] = [];
  private currentIndex = -1;

  execute(command: Command): void {
    command.execute();
    
    // Remover comandos redo
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(command);
    this.currentIndex++;
  }

  undo(): void {
    if (this.currentIndex < 0) return;
    this.history[this.currentIndex].undo();
    this.currentIndex--;
  }

  redo(): void {
    if (this.currentIndex >= this.history.length - 1) return;
    this.currentIndex++;
    this.history[this.currentIndex].execute();
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }
}

// Uso
const doc = new TextDocument();
const history = new CommandHistory();

history.execute(new InsertCommand(doc, 'Hello', 0));
history.execute(new InsertCommand(doc, ' World', 5));
console.log(doc.getContent()); // "Hello World"

history.undo();
console.log(doc.getContent()); // "Hello"

history.redo();
console.log(doc.getContent()); // "Hello World"
```

## Variaciones

- **Macro Command** ejecuta multiples comandos como una unidad
- **Async Command** retorna una Promise para operaciones de larga duracion
- **Composite Command** trata un lote de comandos como una accion undoable

## Consideraciones de Produccion

- Limita el tamano del historial para prevenir agotamiento de memoria en sesiones largas
- Serializa comandos a JSON para recuperacion de crash y edicion colaborativa
- Usa estados inmutables de documento para logica de undo mas simple en arquitecturas funcionales

## Errores Comunes

- Almacenar snapshots completos del documento en lugar de operaciones inversas
- No manejar ejecucion concurrente de comandos en escenarios multi-usuario
- Olvidar limpiar la pila de redo cuando se ejecuta un nuevo comando despues de undo

## FAQ

**P: En que se diferencia del Memento pattern?**
R: Command almacena la operacion para revertir. [Memento](/patterns/design/memento-pattern-state) almacena un snapshot de estado. Los commands son mas pequenos pero mas dificiles de implementar; los Mementos son mas simples pero usan mas memoria.

**P: Puedo usar esto para logging de peticiones API?**
R: Si. Envuelve [peticiones HTTP](/recipes/api/call-rest-api) como commands para replicar secuencias para debugging o testing.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
