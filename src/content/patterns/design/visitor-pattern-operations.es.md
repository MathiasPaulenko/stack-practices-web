---




contentType: patterns
slug: visitor-pattern-operations
title: "Visitor Pattern para Operaciones Extensibles sobre"
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
  - design-patterns
relatedResources:
  - /patterns/strategy-pattern
  - /patterns/chain-of-responsibility-middleware
  - /patterns/command-pattern-undo
  - /patterns/interpreter-pattern-expressions
  - /patterns/iterator-pattern-collections
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

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Visitor para AST de un Compilador

```typescript
// Visitor pattern: separar algoritmos de la estructura de objetos
interface ASTNode {
  accept(visitor: ASTVisitor): void;
}

interface ASTVisitor {
  visitNumber(node: NumberNode): void;
  visitString(node: StringNode): void;
  visitBinaryOp(node: BinaryOpNode): void;
  visitFunctionCall(node: FunctionCallNode): void;
}

// Nodos concretos
class NumberNode implements ASTNode {
  constructor(public value: number) {}
  accept(v: ASTVisitor) { v.visitNumber(this); }
}

class StringNode implements ASTNode {
  constructor(public value: string) {}
  accept(v: ASTVisitor) { v.visitString(this); }
}

class BinaryOpNode implements ASTNode {
  constructor(public op: string, public left: ASTNode, public right: ASTNode) {}
  accept(v: ASTVisitor) { v.visitBinaryOp(this); }
}

class FunctionCallNode implements ASTNode {
  constructor(public name: string, public args: ASTNode[]) {}
  accept(v: ASTVisitor) { v.visitFunctionCall(this); }
}

// Visitor 1: evaluacion
class EvaluatorVisitor implements ASTVisitor {
  private stack: unknown[] = [];
  getResult(): unknown { return this.stack[0]; }
  visitNumber(n: NumberNode) { this.stack.push(n.value); }
  visitString(n: StringNode) { this.stack.push(n.value); }
  visitBinaryOp(n: BinaryOpNode) {
    n.left.accept(this); n.right.accept(this);
    const r = this.stack.pop() as number;
    const l = this.stack.pop() as number;
    switch (n.op) {
      case "+": this.stack.push(l + r); break;
      case "-": this.stack.push(l - r); break;
      case "*": this.stack.push(l * r); break;
      case "/": this.stack.push(l / r); break;
    }
  }
  visitFunctionCall(n: FunctionCallNode) {
    const args = n.args.map(a => { a.accept(this); return this.stack.pop(); });
    if (n.name === "sqrt") this.stack.push(Math.sqrt(args[0] as number));
  }
}

// Visitor 2: pretty print
class PrettyPrintVisitor implements ASTVisitor {
  private output = "";
  getOutput(): string { return this.output; }
  visitNumber(n: NumberNode) { this.output += n.value; }
  visitString(n: StringNode) { this.output += `"${n.value}"`; }
  visitBinaryOp(n: BinaryOpNode) {
    this.output += "("; n.left.accept(this);
    this.output += ` ${n.op} `; n.right.accept(this);
    this.output += ")";
  }
  visitFunctionCall(n: FunctionCallNode) {
    this.output += `${n.name}(`;
    n.args.forEach((a, i) => { if (i > 0) this.output += ", "; a.accept(this); });
    this.output += ")";
  }
}

// Uso: AST para (3 + 4) * sqrt(16)
const ast = new BinaryOpNode("*",
  new BinaryOpNode("+", new NumberNode(3), new NumberNode(4)),
  new FunctionCallNode("sqrt", [new NumberNode(16)])
);

const eval = new EvaluatorVisitor();
ast.accept(eval);
console.log(eval.getResult()); // 28

const printer = new PrettyPrintVisitor();
ast.accept(printer);
console.log(printer.getOutput()); // ((3 + 4) * sqrt(16))
```

Lecciones:
  - Visitor separa algoritmos de la estructura de objetos
  - Anadir nuevo visitor no requiere cambiar los nodos
  - Anadir nuevo nodo requiere cambiar todos los visitors
  - Ideal para estructuras estables con algoritmos variables
  - Double dispatch: el nodo decide que metodo del visitor llamar
```

### Cuando NO usar Visitor?

No uses Visitor cuando la estructura de objetos cambia frecuentemente: cada nuevo nodo requiere modificar todos los visitors. Usa Visitor cuando la estructura es estable pero los algoritmos cambian o se anaden. Para estructuras inestables, usa metodos directos en cada clase o el patron Interpreter.
