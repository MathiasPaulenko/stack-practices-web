---
contentType: patterns
slug: visitor-pattern-operations
title: "Visitor Pattern for Extensible Operations on Object Structures"
description: "Separate algorithms from the objects they operate on, allowing new operations to be added without modifying existing element classes"
metaDescription: "Visitor pattern for extensible operations. Separate algorithms from the objects they operate on to add new operations without modifying existing element classes."
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
  metaDescription: "Visitor pattern for extensible operations. Separate algorithms from the objects they operate on to add new operations without modifying existing element classes."
  keywords:
    - visitor pattern
    - double dispatch
    - extensible operations
    - behavioral patterns
    - object structure traversal
---

# Visitor Pattern for Extensible Operations on Object Structures

The Visitor pattern separates an algorithm from the object structure it operates on. By moving operations into visitor classes, you can add new behaviors to a class hierarchy without modifying existing element classes. This is ideal when operations change frequently but the object structure remains stable.

## When to Use This

- Many unrelated operations must be performed on objects in a structure
- The object structure rarely changes but operations change often
- You need to accumulate state across elements during traversal

## Problem

An AST (Abstract Syntax Tree) for a programming language needs formatting, linting, optimization, and code generation. Adding each operation as a method on every AST node class pollutes the hierarchy and requires modifying core classes.

## Solution

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

// Printer visitor (new operation without changing nodes)
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

// Usage
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

## How It Works

1. **Visitor** declares a visit method for each element type
2. **Concrete Visitor** implements the operation for each element
3. **Element** declares an `accept` method that receives a visitor
4. **Object Structure** traverses elements and calls `accept`
5. **Double Dispatch** routes the call to the correct visitor method based on both visitor and element types

## Production Considerations

- Use type guards or discriminated unions in TypeScript to simplify visitor dispatch
- Visitor works best with stable hierarchies; adding new element types breaks all visitors
- Consider pattern matching (TypeScript 5.3+) as an alternative for simple cases

## Common Mistakes

- Forgetting to call `accept` on child elements, breaking traversal
- Adding new element types without updating all visitors
- Using Visitor when simple polymorphism on the element classes suffices

## FAQ

**Q: How is this different from Strategy?**
A: Strategy varies an algorithm for a single object. Visitor applies different operations across an entire object structure.

**Q: Can I use this with the Composite pattern?**
A: Yes. Composite provides the structure; Visitor provides the operations. This is a common pairing for tree processing.
