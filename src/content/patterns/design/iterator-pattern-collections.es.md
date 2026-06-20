---
contentType: patterns
slug: iterator-pattern-collections
title: "Iterator Pattern para Traversal de Colecciones Custom en TypeScript"
description: "Provee una forma de acceder a elementos de un objeto agregado secuencialmente sin exponer su representacion subyacente usando el Iterator pattern"
metaDescription: "Iterator pattern para colecciones custom. Accede a elementos de agregados secuencialmente sin exponer la representacion subyacente para arboles, grafos y streams."
difficulty: intermediate
topics:
  - design
tags:
  - iterator
  - behavioral-patterns
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/composite-pattern-ui
  - /patterns/design/strategy-pattern-algorithms
  - /guides/clean-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Iterator pattern para colecciones custom. Accede a elementos de agregados secuencialmente sin exponer la representacion subyacente para arboles, grafos y streams."
  keywords:
    - iterator pattern
    - collection traversal
    - behavioral patterns
    - typescript
    - tree traversal
---

# Iterator Pattern para Traversal de Colecciones Custom en TypeScript

El [Iterator](/patterns/design/iterator-pattern) pattern provee una forma de acceder a elementos de un objeto agregado secuencialmente sin exponer su representacion subyacente. Separa el algoritmo de traversal de la estructura de coleccion, permitiendo iterar sobre arrays, arboles, grafos o streams con la misma interfaz.

## Cuando Usar Esto

- Necesitas recorrer una coleccion sin exponer su estructura interna
- Se requieren multiples algoritmos de traversal (pre-order, post-order, level-order) para la misma coleccion
- Quieres iteracion uniforme a traves de diferentes tipos de coleccion

## Problema

Una estructura de [arbol](/patterns/design/composite-pattern) requiere diferentes ordenes de traversal para diferentes casos de uso, pero cada traversal esta fuertemente acoplado a la implementacion del nodo del arbol.

## Solucion

```typescript
// iterator/Iterator.ts
interface Iterator<T> {
  next(): T | null;
  hasNext(): boolean;
  reset(): void;
}

interface IterableCollection<T> {
  createIterator(): Iterator<T>;
}

// Tree Node
class TreeNode<T> {
  children: TreeNode<T>[] = [];

  constructor(public value: T) {}

  addChild(child: TreeNode<T>): void {
    this.children.push(child);
  }
}

// Depth-First Iterator (pre-order)
class PreOrderIterator<T> implements Iterator<T> {
  private stack: TreeNode<T>[] = [];

  constructor(root: TreeNode<T>) {
    this.stack.push(root);
  }

  next(): T | null {
    if (!this.hasNext()) return null;

    const node = this.stack.pop()!;
    // Push hijos en orden inverso para traversal de izquierda a derecha
    for (let i = node.children.length - 1; i >= 0; i--) {
      this.stack.push(node.children[i]);
    }

    return node.value;
  }

  hasNext(): boolean {
    return this.stack.length > 0;
  }

  reset(): void {
    this.stack = [];
  }
}

// Breadth-First Iterator
class LevelOrderIterator<T> implements Iterator<T> {
  private queue: TreeNode<T>[] = [];

  constructor(root: TreeNode<T>) {
    this.queue.push(root);
  }

  next(): T | null {
    if (!this.hasNext()) return null;

    const node = this.queue.shift()!;
    this.queue.push(...node.children);

    return node.value;
  }

  hasNext(): boolean {
    return this.queue.length > 0;
  }

  reset(): void {
    this.queue = [];
  }
}

// Sistema de archivos con iterator
class FileSystem implements IterableCollection<string> {
  private root = new TreeNode<string>('root');

  addNode(parentPath: string, name: string): void {
    const parent = this.findNode(parentPath);
    if (parent) {
      parent.addChild(new TreeNode<string>(name));
    }
  }

  private findNode(path: string): TreeNode<string> | null {
    // Busqueda por path simplificada
    return this.root;
  }

  createIterator(type: 'pre-order' | 'level-order' = 'pre-order'): Iterator<string> {
    if (type === 'level-order') {
      return new LevelOrderIterator(this.root);
    }
    return new PreOrderIterator(this.root);
  }
}

// Uso
const fs = new FileSystem();
fs.addNode('root', 'src');
fs.addNode('root', 'dist');

const preOrder = fs.createIterator('pre-order');
console.log('Pre-order:');
while (preOrder.hasNext()) {
  console.log(preOrder.next());
}

const levelOrder = fs.createIterator('level-order');
console.log('Level-order:');
while (levelOrder.hasNext()) {
  console.log(levelOrder.next());
}
```

## Variacion: Async Iterator para Streams

```typescript
// iterator/AsyncStreamIterator.ts
interface AsyncIterator<T> {
  next(): Promise<T | null>;
  hasNext(): boolean;
}

class DatabaseQueryIterator implements AsyncIterator<Record<string, unknown>> {
  private currentPage: Record<string, unknown>[] = [];
  private pageIndex = 0;
  private offset = 0;
  private hasMore = true;

  constructor(
    private query: string,
    private pageSize: number = 100,
    private db: { query: (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]> }
  ) {}

  async next(): Promise<Record<string, unknown> | null> {
    if (this.pageIndex >= this.currentPage.length) {
      if (!this.hasMore) return null;
      await this.loadNextPage();
    }

    if (this.pageIndex >= this.currentPage.length) return null;
    return this.currentPage[this.pageIndex++];
  }

  hasNext(): boolean {
    return this.hasMore || this.pageIndex < this.currentPage.length;
  }

  private async loadNextPage(): Promise<void> {
    this.currentPage = await this.db.query(
      `${this.query} LIMIT ${this.pageSize} OFFSET ${this.offset}`,
      []
    );
    this.offset += this.pageSize;
    this.pageIndex = 0;
    this.hasMore = this.currentPage.length === this.pageSize;
  }
}
```

## Como Funciona

1. **Iterator** declara la interfaz para traversal con `next()`, `hasNext()` y `reset()`
2. **Concrete Iterator** implementa logica de traversal para una estructura de coleccion especifica
3. **Aggregate** declara el factory method para crear iterators
4. **Concrete Aggregate** retorna una nueva instancia de iterator configurada para su estructura

## Consideraciones de Produccion

- Implementa `Symbol.iterator` para soporte nativo de loops `for...of` en TypeScript
- Usa generators (`function*`) para implementacion concisa de iterators
- Considera async iterators para APIs paginadas y datos de streaming

## Errores Comunes

- Exponer el indice de coleccion interna, permitiendo a clientes modificarlo
- No manejar modificacion concurrente durante iteracion
- Implementar solo un traversal cuando multiples son necesarios

## FAQ

**P: En que se diferencia de un simple loop `for`?**
R: Iterator separa traversal de la coleccion, permitiendo multiples algoritmos y ocultando estructura interna. Un loop `for` expone indices y detalles de array.

**P: Puedo usar esto con iterators nativos de JavaScript?**
R: Si. Implementa `[Symbol.iterator]` y usa generators para integrar con `for...of`, spread syntax y destructuring.

**P: Cuando deberia usar async iterators?**
R: Para [queries paginadas de base de datos](/recipes/databases/sql-joins), lecturas de archivos en streaming, o cualquier coleccion donde elementos llegan asincronicamente.
