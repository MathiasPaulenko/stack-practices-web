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
  - /patterns/memento-pattern-state
  - /patterns/abstract-factory-cross-platform
  - /patterns/dependency-injection-typescript
  - /patterns/interpreter-pattern-expressions
  - /patterns/visitor-pattern-operations
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


## Temas Avanzados

### Escenario: Sistema de Undo/Redo para Editor de Texto

```typescript
// Command pattern: encapsular operaciones como objetos
interface Command {
  execute(): void;
  undo(): void;
  describe(): string;
}

// Receptor: el editor de texto
class TextEditor {
  private content = "";
  private selection = { start: 0, end: 0 };

  insert(text: string, pos: number) {
    this.content = this.content.slice(0, pos) + text + this.content.slice(pos);
  }
  delete(start: number, end: number) {
    this.content = this.content.slice(0, start) + this.content.slice(end);
  }
  getContent(): string { return this.content; }
}

// Comandos concretos
class InsertCommand implements Command {
  constructor(private editor: TextEditor, private text: string, private pos: number) {}
  execute() { this.editor.insert(this.text, this.pos); }
  undo() { this.editor.delete(this.pos, this.pos + this.text.length); }
  describe() { return `Insert "${this.text}" at ${this.pos}`; }
}

class DeleteCommand implements Command {
  private deletedText = "";
  constructor(private editor: TextEditor, private start: number, private end: number) {}
  execute() {
    this.deletedText = this.editor.getContent().slice(this.start, this.end);
    this.editor.delete(this.start, this.end);
  }
  undo() { this.editor.insert(this.deletedText, this.start); }
  describe() { return `Delete ${this.start}-${this.end}`; }
}

// Invocador: historial de comandos
class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory = 100;

  execute(cmd: Command) {
    cmd.execute();
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
  }
  undo(): Command | null {
    const cmd = this.undoStack.pop();
    if (cmd) { cmd.undo(); this.redoStack.push(cmd); }
    return cmd;
  }
  redo(): Command | null {
    const cmd = this.redoStack.pop();
    if (cmd) { cmd.execute(); this.undoStack.push(cmd); }
    return cmd;
  }
  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
}

// Uso
const editor = new TextEditor();
const history = new CommandHistory();

history.execute(new InsertCommand(editor, "Hello", 0));
history.execute(new InsertCommand(editor, " World", 5));
console.log(editor.getContent()); // "Hello World"

history.undo();
console.log(editor.getContent()); // "Hello"

history.redo();
console.log(editor.getContent()); // "Hello World"
```

Lecciones:
  - Command encapsula operaciones como objetos con execute y undo
  - El historial maneja undo/redo sin conocer detalles de cada comando
  - Cada comando guarda el estado necesario para deshacer
  - Limitar el historial (100 comandos) para evitar memory leaks
  - Macro command: agrupar multiples comandos en uno solo
```

### Como implemento macros con Command?

Crea un MacroCommand que contiene una lista de comandos. Execute() llama a execute() de cada comando en orden. Undo() llama a undo() en orden inverso. Esto permite agrupar operaciones atomicas: por ejemplo, "formatear documento" ejecuta 20 comandos individuales, y un solo undo los revierte todos.
