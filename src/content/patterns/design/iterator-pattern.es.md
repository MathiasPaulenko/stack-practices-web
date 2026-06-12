---
contentType: patterns
slug: iterator-pattern
title: "Patrón Iterator"
description: "Proporciona una forma de acceder a los elementos de una colección secuencialmente sin exponer su representación subyacente. Un patrón de comportamiento para recorrido."
metaDescription: "Aprende el Patrón Iterator en Python, Java y JavaScript. Patrón de comportamiento para recorrido secuencial de colecciones."
difficulty: beginner
topics:
  - design
tags:
  - iterator
  - patron
  - patron-de-diseno
  - comportamiento
  - recorrido
  - coleccion
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/composite-pattern
  - /patterns/design/chain-of-responsibility-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Iterator en Python, Java y JavaScript. Patrón de comportamiento para recorrido secuencial de colecciones."
  keywords:
    - patron iterator
    - patron de diseno
    - patron de comportamiento
    - recorrido de colecciones
    - python iterator
    - java iterator
    - javascript iterator
---

# Patrón Iterator

## Visión General

El Patrón Iterator es un patrón de diseño de comportamiento que proporciona una forma de acceder a los elementos de un objeto agregado secuencialmente sin exponer su representación subyacente. Separa la lógica de recorrido de la colección misma, permitiendo múltiples recorridos simultáneos y diferentes estrategias de recorrido.

## Cuándo Usarlo

Usa el Patrón Iterator cuando:
- Necesitas recorrer una colección sin exponer su estructura interna
- Quieres soportar múltiples algoritmos de recorrido (hacia adelante, hacia atrás, filtrado)
- Necesitas permitir que múltiples clientes recorran simultáneamente
- Quieres una interfaz uniforme para recorrer diferentes tipos de colecciones
- La representación interna de la colección puede cambiar

## Solución

### Python

```python
class BookCollection:
    def __init__(self):
        self._books = []

    def add(self, book: str):
        self._books.append(book)

    def __iter__(self):
        return iter(self._books)

    def reverse_iter(self):
        return reversed(self._books)

# Uso
collection = BookCollection()
collection.add("Design Patterns")
collection.add("Clean Code")
collection.add("Refactoring")

# Iteración hacia adelante (protocolo de iterador incorporado)
for book in collection:
    print(book)

# Iteración inversa
for book in collection.reverse_iter():
    print(book)
```

### JavaScript

```javascript
class BookCollection {
  constructor() {
    this.books = [];
  }

  add(book) {
    this.books.push(book);
  }

  *[Symbol.iterator]() {
    for (const book of this.books) {
      yield book;
    }
  }

  *reverseIterator() {
    for (let i = this.books.length - 1; i >= 0; i--) {
      yield this.books[i];
    }
  }
}

// Uso
const collection = new BookCollection();
collection.add("Design Patterns");
collection.add("Clean Code");
collection.add("Refactoring");

// Hacia adelante
for (const book of collection) {
  console.log(book);
}

// Inverso
for (const book of collection.reverseIterator()) {
  console.log(book);
}
```

### Java

```java
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class BookCollection implements Iterable<String> {
    private final List<String> books = new ArrayList<>();

    public void add(String book) {
        books.add(book);
    }

    @Override
    public Iterator<String> iterator() {
        return books.iterator();
    }

    public Iterator<String> reverseIterator() {
        return new ReverseIterator<>(books);
    }
}

class ReverseIterator<T> implements Iterator<T> {
    private final List<T> list;
    private int index;

    public ReverseIterator(List<T> list) {
        this.list = list;
        this.index = list.size() - 1;
    }

    @Override
    public boolean hasNext() {
        return index >= 0;
    }

    @Override
    public T next() {
        return list.get(index--);
    }
}

// Uso
BookCollection collection = new BookCollection();
collection.add("Design Patterns");
collection.add("Clean Code");
collection.add("Refactoring");

for (String book : collection) {
    System.out.println(book);
}
```

## Explicación

El Patrón Iterator tiene dos roles:

- **Agregado** (`BookCollection`): La colección que contiene los elementos
- **Iterator**: Proporciona acceso secuencial a los elementos sin exponer los internals de la colección

Los lenguajes modernos integran profundamente los iteradores — los protocolos `__iter__` de Python, `Symbol.iterator` de JavaScript, y las interfaces `Iterable`/`Iterator` de Java son todos ejemplos de este patrón.

## Variantes

| Variante | Descripción | Caso de Uso |
|----------|-------------|-------------|
| **Iterator Externo** | El cliente controla el recorrido (`next()`, `hasNext()`) | Flexible, control explícito |
| **Iterator Interno** | La colección aplica una función a cada elemento (`forEach`) | Código de cliente más simple |
| **Iterator Inverso** | Recorre en orden inverso | Pilas, historial de undo |
| **Iterator de Filtro** | Salta elementos que no coinciden con un predicado | Búsqueda, filtrado |

## Buenas Prácticas

- **Usa protocolos de iterador nativos del lenguaje** cuando estén disponibles en lugar de clases personalizadas
- **Lanza excepciones en llamadas `next()` inválidas** para fallar rápido
- **Soporta `remove()` solo cuando sea semánticamente válido** y documenta claramente
- **Haz los iteradores fail-fast** si la colección se modifica durante la iteración
- **Documenta si el orden de iteración está garantizado** o es arbitrario

## Errores Comunes

- Exponer la colección interna directamente en lugar de usar un iterador
- No manejar la modificación concurrente durante la iteración, llevando a comportamiento indefinido
- Implementar clases de iterador complejas cuando un simple generador o comprensión es suficiente
- Crear iteradores que no implementan el protocolo de iterador nativo del lenguaje
- Olvidar resetear el estado del iterador, causando comportamiento inesperado en reuso

## Preguntas Frecuentes

**P: ¿Necesito implementar el Patrón Iterator manualmente?**
R: Raramente. La mayoría de los lenguajes proporcionan soporte de iterador incorporado. Solo implementa un iterador personalizado cuando necesites un recorrido no estándar (ej. recorrido de árbol, recorrido de grafo, o iteración filtrada).

**P: ¿Cuál es la diferencia entre Iterator y Visitor?**
R: Iterator recorre elementos. Visitor realiza operaciones sobre elementos. A menudo se usan juntos: un iterador camina la estructura, y un visitor procesa cada elemento.
