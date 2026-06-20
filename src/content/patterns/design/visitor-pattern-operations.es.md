---
contentType: patterns
slug: visitor-pattern-operations
title: "Visitor Pattern para Operaciones Extensibles sobre Estructuras de Objetos"
description: "Separa algoritmos de los objetos sobre los que operan, permitiendo agregar nuevas operaciones sin modificar clases de elementos existentes"
metaDescription: "Visitor pattern para operaciones extensibles. Separa algoritmos de los objetos sobre los que operan para agregar nuevas operaciones sin modificar clases existentes."
difficulty: advanced
topics:
  - design
tags:
  - visitor
  - behavioral-patterns
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/strategy-pattern
  - /patterns/design/chain-of-responsibility-middleware
  - /guides/clean-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Visitor pattern para operaciones extensibles. Separa algoritmos de los objetos sobre los que operan para agregar nuevas operaciones sin modificar clases existentes."
  keywords:
    - visitor pattern
    - double dispatch
    - extensible operations
    - behavioral patterns
    - object structure traversal
---

# Visitor Pattern para Operaciones Extensibles sobre Estructuras de Objetos

El [Visitor](/patterns/design/visitor-pattern) pattern separa un algoritmo de la estructura de objetos sobre la que opera. Moviendo operaciones a clases visitor, puedes agregar nuevos comportamientos a una jerarquia de clases sin modificar las clases de elementos existentes. Esto es ideal cuando las operaciones cambian frecuentemente pero la estructura de objetos permanece estable.

## Cuando Usar Esto

- Muchas operaciones no relacionadas deben realizarse sobre objetos en una estructura. Consulta [Decorator Pattern](/patterns/design/decorator-pattern) para agregar comportamiento.
- La estructura de objetos raramente cambia pero las operaciones cambian a menudo. Consulta [Strategy Pattern](/patterns/design/strategy-pattern) para algoritmos intercambiables.
- Necesitas acumular estado a traves de elementos durante el recorrido. Consulta [Composite Pattern](/patterns/design/composite-pattern) para estructuras de árbol.

## Problema

Un AST (Abstract Syntax Tree) para un lenguaje de programacion necesita formateo, linting, optimizacion y generacion de codigo. Agregar cada operacion como metodo en cada clase de nodo AST contamina la jerarquia y requiere modificar clases core.

## Solucion

```typescript
// visitor/ASTVisitor.ts
interface ASTNode {
  accept(visitor: ASTVisitor): void;
}

interface ASTVisitor {
  visitNumber(node: NumberNode): void;
  visitBinaryOp(node: BinaryOpNode): void;
  visitVariable(node: VariableNode): void;
}

class NumberNode implements ASTNode {
  constructor(public value: number) {}
  accept(visitor: ASTVisitor): void { visitor.visitNumber(this); }
}

class BinaryOpNode implements ASTNode {
  constructor(
    public operator: string,
    public left: ASTNode,
    public right: ASTNode
  ) {}
  accept(visitor: ASTVisitor): void { visitor.visitBinaryOp(this); }
}

class VariableNode implements ASTNode {
  constructor(public name: string) {}
  accept(visitor: ASTVisitor): void { visitor.visitVariable(this); }
}

// Evaluator visitor
class Evaluator implements ASTVisitor {
  private variables: Record<string, number>;
  private stack: number[] = [];

  constructor(variables: Record<string, number>) {
    this.variables = variables;
  }

  visitNumber(node: NumberNode): void {
    this.stack.push(node.value);
  }

  visitVariable(node: VariableNode): void {
    this.stack.push(this.variables[node.name] ?? 0);
  }

  visitBinaryOp(node: BinaryOpNode): void {
    node.left.accept(this);
    node.right.accept(this);

    const right = this.stack.pop()!;
    const left = this.stack.pop()!;

    switch (node.operator) {
      case '+': this.stack.push(left + right); break;
      case '-': this.stack.push(left - right); break;
      case '*': this.stack.push(left * right); break;
      case '/': this.stack.push(left / right); break;
    }
  }

  getResult(): number {
    return this.stack[this.stack.length - 1];
  }
}

// Printer visitor (nueva operacion sin cambiar nodos)
class Printer implements ASTVisitor {
  private output = '';

  visitNumber(node: NumberNode): void {
    this.output += node.value;
  }

  visitVariable(node: VariableNode): void {
    this.output += node.name;
  }

  visitBinaryOp(node: BinaryOpNode): void {
    this.output += '(';
    node.left.accept(this);
    this.output += ` ${node.operator} `;
    node.right.accept(this);
    this.output += ')';
  }

  getOutput(): string {
    return this.output;
  }
}

// Uso
const ast = new BinaryOpNode(
  '+',
  new NumberNode(2),
  new BinaryOpNode('*', new VariableNode('x'), new NumberNode(3))
);

const evaluator = new Evaluator({ x: 4 });
ast.accept(evaluator);
console.log(evaluator.getResult()); // 14

const printer = new Printer();
ast.accept(printer);
console.log(printer.getOutput()); // (2 + (x * 3))
```

## Variation: Serializer Visitor

```typescript
// visitor/Serializer.ts
class JSONSerializer implements ASTVisitor {
  private result: unknown = null;

  visitNumber(node: NumberNode): void {
    this.result = { type: 'number', value: node.value };
  }

  visitVariable(node: VariableNode): void {
    this.result = { type: 'variable', name: node.name };
  }

  visitBinaryOp(node: BinaryOpNode): void {
    node.left.accept(this);
    const left = this.result;
    node.right.accept(this);
    const right = this.result;

    this.result = {
      type: 'binaryOp',
      operator: node.operator,
      left,
      right,
    };
  }

  serialize(): string {
    return JSON.stringify(this.result);
  }
}
```

## Como Funciona

1. **Visitor** declara un metodo visit para cada tipo de elemento
2. **Concrete Visitor** implementa la operacion para cada elemento
3. **Element** declara un metodo `accept` que recibe un visitor
4. **Object Structure** recorre elementos y llama `accept`
5. **Double Dispatch** enruta la llamada al metodo visitor correcto basado en ambos tipos: visitor y elemento

## Consideraciones de Produccion

- Usa type guards o discriminated unions en TypeScript para simplificar dispatch de visitor
- Visitor funciona mejor con jerarquias estables; agregar nuevos tipos de elemento rompe todos los visitors
- Considera pattern matching (TypeScript 5.3+) como alternativa para casos simples

## Errores Comunes

- Olvidar llamar `accept` en elementos hijos, rompiendo el recorrido
- Agregar nuevos tipos de elemento sin actualizar todos los visitors
- Usar Visitor cuando simple polimorfismo en las clases de elementos bastaria

## FAQ

**P: En que se diferencia de Strategy?**
R: Strategy varia un algoritmo para un unico objeto. Visitor aplica diferentes operaciones a traves de toda una estructura de objetos.

**P: Puedo usar esto con Composite pattern?**
R: Si. [Composite](/patterns/design/composite-pattern) provee la estructura; Visitor provee las operaciones. Este es un par comun para procesamiento de arboles.
