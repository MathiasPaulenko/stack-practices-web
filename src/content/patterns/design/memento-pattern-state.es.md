---
contentType: patterns
slug: memento-pattern-state
title: "Memento Pattern para Snapshot y Restauracion de Estado"
description: "Captura y externaliza el estado interno de un objeto sin violar encapsulacion, habilitando undo, serializacion y rollback de estado en aplicaciones"
metaDescription: "Memento pattern para snapshots de estado. Captura y restaura estado de objetos sin romper encapsulacion para funcionalidad de undo, serializacion y rollback."
difficulty: intermediate
topics:
  - design
tags:
  - memento
  - behavioral-patterns
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/command-pattern-undo
  - /patterns/design/prototype-pattern-cloning
  - /guides/clean-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Memento pattern para snapshots de estado. Captura y restaura estado de objetos sin romper encapsulacion para funcionalidad de undo, serializacion y rollback."
  keywords:
    - memento pattern
    - state snapshot
    - undo restore
    - behavioral patterns
    - serialization
---

# Memento Pattern para Snapshot y Restauracion de Estado

El Memento pattern captura y externaliza el estado interno de un objeto para que el objeto pueda ser restaurado a ese estado mas tarde, sin violar encapsulacion. A diferencia de Command, que almacena operaciones, Memento almacena el snapshot completo del estado. Es la base para sistemas de undo, checkpoints en juegos y guardado de borradores en editores.

## Cuando Usar Esto

- Necesitas restauracion completa de estado, no solo reversion de operaciones
- La estructura interna del objeto es compleja y deberia permanecer oculta
- Los snapshots deben persistirse a disco o transmitirse por red

## Problema

Una aplicacion de dibujo necesita funcionalidad undo, pero exponer coordenadas y estilos de formas internas viola encapsulacion. Almacenar operaciones es insuficiente porque las formas pueden ser modificadas por herramientas externas.

## Solucion

```typescript
// memento/EditorMemento.ts
interface EditorMemento {
  getState(): string;
}

class TextEditor {
  private content = '';
  private cursorPosition = 0;
  private selectionRange: [number, number] = [0, 0];

  type(text: string): void {
    const before = this.content.slice(0, this.cursorPosition);
    const after = this.content.slice(this.cursorPosition);
    this.content = before + text + after;
    this.cursorPosition += text.length;
    this.selectionRange = [this.cursorPosition, this.cursorPosition];
  }

  delete(): void {
    const [start, end] = this.selectionRange;
    if (start === end && start > 0) {
      this.content = this.content.slice(0, start - 1) + this.content.slice(start);
      this.cursorPosition = start - 1;
    } else {
      this.content = this.content.slice(0, start) + this.content.slice(end);
      this.cursorPosition = start;
    }
    this.selectionRange = [this.cursorPosition, this.cursorPosition];
  }

  // Crear snapshot
  save(): EditorMemento {
    return new EditorSnapshot(
      this.content,
      this.cursorPosition,
      this.selectionRange
    );
  }

  // Restaurar desde snapshot
  restore(memento: EditorMemento): void {
    const snapshot = memento as EditorSnapshot;
    this.content = snapshot.getContent();
    this.cursorPosition = snapshot.getCursor();
    this.selectionRange = snapshot.getSelection();
  }

  getContent(): string {
    return this.content;
  }
}

// Memento implementation (opaca para clientes)
class EditorSnapshot implements EditorMemento {
  constructor(
    private content: string,
    private cursor: number,
    private selection: [number, number]
  ) {}

  getState(): string {
    return JSON.stringify({ content: this.content, cursor: this.cursor, selection: this.selection });
  }

  getContent(): string { return this.content; }
  getCursor(): number { return this.cursor; }
  getSelection(): [number, number] { return this.selection; }
}

// Caretaker maneja historial
class EditorHistory {
  private history: EditorMemento[] = [];
  private currentIndex = -1;

  backup(editor: TextEditor): void {
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(editor.save());
    this.currentIndex++;
  }

  undo(editor: TextEditor): void {
    if (this.currentIndex <= 0) return;
    this.currentIndex--;
    editor.restore(this.history[this.currentIndex]);
  }

  redo(editor: TextEditor): void {
    if (this.currentIndex >= this.history.length - 1) return;
    this.currentIndex++;
    editor.restore(this.history[this.currentIndex]);
  }
}

// Uso
const editor = new TextEditor();
const history = new EditorHistory();

history.backup(editor);
editor.type('Hello');
history.backup(editor);
editor.type(' World');

console.log(editor.getContent()); // "Hello World"

history.undo(editor);
console.log(editor.getContent()); // "Hello"

history.redo(editor);
console.log(editor.getContent()); // "Hello World"
```

## Variacion: Sistema de Checkpoints de Juego

```typescript
// memento/GameCheckpoint.ts
class GameState {
  private level = 1;
  private health = 100;
  private inventory: string[] = [];

  createCheckpoint(): GameCheckpoint {
    return new GameCheckpoint(this.level, this.health, [...this.inventory]);
  }

  loadCheckpoint(checkpoint: GameCheckpoint): void {
    this.level = checkpoint.getLevel();
    this.health = checkpoint.getHealth();
    this.inventory = checkpoint.getInventory();
  }
}

class GameCheckpoint implements EditorMemento {
  constructor(
    private level: number,
    private health: number,
    private inventory: string[]
  ) {}

  getState(): string {
    return JSON.stringify({ level: this.level, health: this.health });
  }

  getLevel(): number { return this.level; }
  getHealth(): number { return this.health; }
  getInventory(): string[] { return [...this.inventory]; }
}
```

## Como Funciona

1. **Originator** crea y restaura mementos de su propio estado
2. **Memento** almacena el snapshot de estado; solo el Originator puede leerlo
3. **Caretaker** maneja el historial de mementos sin acceder a sus contenidos
4. **Client** solicita backups y dispara undo/redo a traves del Caretaker

## Consideraciones de Produccion

- Usa comparticion estructural o delta encoding para estados grandes para reducir memoria
- Limita la profundidad del historial para prevenir crecimiento sin bounds
- Serializa mementos a JSON para persistencia entre sesiones

## Errores Comunes

- Permitir que mementos sean modificados despues de la creacion, corrompiendo el historial
- Almacenar referencias a objetos mutables en lugar de deep copies
- Romper encapsulacion exponiendo internos de memento al Caretaker

## FAQ

**P: En que se diferencia de Command?**
R: Command almacena operaciones para revertir. Memento almacena snapshots completos de estado. Los mementos son mas grandes pero mas simples de implementar para objetos complejos.

**P: Puedo usar esto con Redux?**
R: El time-travel de Redux es esencialmente un historial de mementos sobre estado inmutable. Redux DevTools implementa este pattern.
