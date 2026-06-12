---
contentType: patterns
slug: memento-pattern
title: "Patrón Memento"
description: "Captura y restaura el estado interno de un objeto sin violar el encapsulamiento. Un patrón de comportamiento para deshacer/rehacer."
metaDescription: "Aprende el Patrón Memento en Python, Java y JavaScript. Patrón de comportamiento para instantáneas de estado y funcionalidad de deshacer."
difficulty: intermediate
topics:
  - design
tags:
  - memento
  - patron
  - patron-de-diseno
  - comportamiento
  - deshacer
  - instantanea-de-estado
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/command-pattern
  - /patterns/design/state-pattern
  - /patterns/design/prototype-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Memento en Python, Java y JavaScript. Patrón de comportamiento para instantáneas de estado y funcionalidad de deshacer."
  keywords:
    - patron memento
    - patron de diseno
    - patron de comportamiento
    - deshacer rehacer
    - instantanea de estado
    - python memento
    - java memento
    - javascript memento
---

# Patrón Memento

## Visión General

El Patrón Memento es un patrón de diseño de comportamiento que te permite guardar y restaurar el estado anterior de un objeto sin revelar su estructura interna. Es la base de la funcionalidad de deshacer/rehacer en aplicaciones como editores de texto, programas de dibujo, y gestión de estado de juegos.

## Cuándo Usarlo

Usa el Patrón Memento cuando:
- Necesitas implementar funcionalidad de deshacer y rehacer
- Quieres guardar puntos de control del estado de un objeto
- Debes preservar el encapsulamiento y no exponer el estado interno directamente
- La restauración de estado debería ser posible sin que el cliente conozca los internals del objeto

## Solución

### Python

```python
class EditorMemento:
    def __init__(self, content: str, cursor: int):
        self._content = content
        self._cursor = cursor

    @property
    def content(self) -> str:
        return self._content

    @property
    def cursor(self) -> int:
        return self._cursor

class TextEditor:
    def __init__(self):
        self._content = ""
        self._cursor = 0

    def type(self, text: str):
        self._content = self._content[:self._cursor] + text
        self._cursor += len(text)

    def save(self) -> EditorMemento:
        return EditorMemento(self._content, self._cursor)

    def restore(self, memento: EditorMemento):
        self._content = memento.content
        self._cursor = memento.cursor

    @property
    def content(self) -> str:
        return self._content

# Uso con historial
class History:
    def __init__(self):
        self._history = []

    def push(self, memento):
        self._history.append(memento)

    def pop(self):
        if not self._history:
            return None
        return self._history.pop()

editor = TextEditor()
history = History()

history.push(editor.save())
editor.type("Hola ")
history.push(editor.save())
editor.type("Mundo!")

print(editor.content)  # Hola Mundo!

editor.restore(history.pop())
print(editor.content)  # Hola

editor.restore(history.pop())
print(editor.content)  # (vacío)
```

### JavaScript

```javascript
class EditorMemento {
  constructor(content, cursor) {
    this.content = content;
    this.cursor = cursor;
  }
}

class TextEditor {
  constructor() {
    this._content = "";
    this._cursor = 0;
  }

  type(text) {
    this._content = this._content.slice(0, this._cursor) + text;
    this._cursor += text.length;
  }

  save() {
    return new EditorMemento(this._content, this._cursor);
  }

  restore(memento) {
    this._content = memento.content;
    this._cursor = memento.cursor;
  }

  get content() {
    return this._content;
  }
}

// Uso
class History {
  constructor() {
    this.history = [];
  }

  push(memento) {
    this.history.push(memento);
  }

  pop() {
    return this.history.pop();
  }
}

const editor = new TextEditor();
const history = new History();

history.push(editor.save());
editor.type("Hola ");
history.push(editor.save());
editor.type("Mundo!");

console.log(editor.content); // Hola Mundo!

editor.restore(history.pop());
console.log(editor.content); // Hola
```

### Java

```java
public class EditorMemento {
    private final String content;
    private final int cursor;

    public EditorMemento(String content, int cursor) {
        this.content = content;
        this.cursor = cursor;
    }

    public String getContent() { return content; }
    public int getCursor() { return cursor; }
}

public class TextEditor {
    private String content = "";
    private int cursor = 0;

    public void type(String text) {
        content = content.substring(0, cursor) + text;
        cursor += text.length();
    }

    public EditorMemento save() {
        return new EditorMemento(content, cursor);
    }

    public void restore(EditorMemento memento) {
        this.content = memento.getContent();
        this.cursor = memento.getCursor();
    }

    public String getContent() { return content; }
}

// Uso con historial
import java.util.ArrayDeque;
import java.util.Deque;

public class History {
    private final Deque<EditorMemento> stack = new ArrayDeque<>();

    public void push(EditorMemento memento) {
        stack.push(memento);
    }

    public EditorMemento pop() {
        return stack.isEmpty() ? null : stack.pop();
    }
}

// Demo
TextEditor editor = new TextEditor();
History history = new History();

history.push(editor.save());
editor.type("Hola ");
history.push(editor.save());
editor.type("Mundo!");

System.out.println(editor.getContent());

editor.restore(history.pop());
System.out.println(editor.getContent());
```

## Explicación

El Patrón Memento tiene tres roles:

- **Originador** (`TextEditor`): El objeto cuyo estado necesita ser guardado
- **Memento** (`EditorMemento`): Una instantánea inmutable del estado del originador
- **Cuidador** (`History`): Gestiona los mementos (cuándo guardar, cuándo restaurar) sin acceder a su contenido

El beneficio clave es que el estado interno del memento es opaco al cuidador, preservando el encapsulamiento.

## Variantes

| Variante | Descripción | Caso de Uso |
|----------|-------------|-------------|
| **Instantánea Completa** | Almacena todo el estado del objeto | Objetos pequeños, instantáneas infrecuentes |
| **Delta/Incremental** | Almacena solo campos cambiados | Objetos grandes, instantáneas frecuentes |
| **Memento Serializable** | Usa serialización para copia profunda | Grafos de objetos complejos |
| **Command + Memento** | Comandos almacenan mementos para deshacer | Sistemas transaccionales, editores |

## Buenas Prácticas

- **Mantén los mementos inmutables** después de la creación para prevenir manipulación accidental
- **Limita la vida útil de los mementos** — historiales grandes consumen memoria significativa
- **Considera serialización** para grafos de objetos complejos, pero sé consciente de los costos de rendimiento
- **Implementa una interfaz de memento** que solo expone métodos de restauración de estado al originador
- **Usa mementos delta** para objetos grandes donde solo cambian algunos campos

## Errores Comunes

- Exponer el estado interno del memento al cuidador, rompiendo el encapsulamiento
- Almacenar demasiadas instantáneas completas, causando uso excesivo de memoria
- No manejar versionado de mementos cuando la estructura del originador cambia con el tiempo
- Olvidar validar mementos antes de la restauración (instantáneas corruptas o incompatibles)
- Permitir que los originadores modifiquen mementos después de la creación, causando comportamiento impredecible de deshacer

## Preguntas Frecuentes

**P: ¿Cómo se diferencia Memento de Prototype?**
R: Prototype crea un nuevo objeto copiando uno existente. Memento guarda el estado de un objeto para poder restaurarlo más tarde. Prototype es sobre duplicación; Memento es sobre viajar en el tiempo.

**P: ¿Puedo usar serialización en lugar de Memento?**
R: Sí, pero la serialización es a menudo más lenta y menos controlada. Memento te da control granular sobre qué estado se guarda y cómo se restaura.
