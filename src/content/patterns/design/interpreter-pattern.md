---
contentType: patterns
slug: interpreter-pattern
title: "Interpreter Pattern"
description: "Define a representation for a language's grammar along with an interpreter that uses the representation to interpret sentences. A behavioral design pattern for mini-languages."
metaDescription: "Learn the Interpreter Pattern in Python, Java, and JavaScript. Behavioral design pattern for parsing and evaluating mini-languages."
difficulty: advanced
topics:
  - design
tags:
  - interpreter
  - pattern
  - design-pattern
  - behavioral
  - parser
  - grammar
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/chain-of-responsibility-pattern
  - /patterns/design/strategy-pattern
  - /patterns/design/command-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Interpreter Pattern in Python, Java, and JavaScript. Behavioral design pattern for parsing and evaluating mini-languages."
  keywords:
    - interpreter pattern
    - design pattern
    - behavioral pattern
    - parser
    - grammar
    - python interpreter
    - java interpreter
    - javascript interpreter
---

# Interpreter Pattern

## Overview

The [Interpreter](/patterns/design/interpreter-pattern-expressions) Pattern is a behavioral design pattern that defines a representation for a language's grammar along with an interpreter that uses the representation to interpret sentences in the language. It is ideal for building small domain-specific languages (DSLs), expression evaluators, query parsers, and rule engines.

## When to Use

Use the Interpreter Pattern when:
- You have a simple grammar that needs to be parsed and evaluated frequently
- You want to build a domain-specific language (DSL) for configuration or rules
- Statements in the language can be represented as abstract syntax trees (ASTs)
- Grammar simplicity makes a full parser generator (ANTLR, yacc) overkill
- Examples: calculator expressions, SQL-like queries, boolean rule engines, regex engines

## Solution

### Python

```python
from abc import ABC, abstractmethod
from typing import Any

class Expression(ABC):
    @abstractmethod
    def interpret(self, context: dict) -> Any:
        pass

class Number(Expression):
    def __init__(self, value: float):
        self.value = value

    def interpret(self, context: dict) -> float:
        return self.value

class Variable(Expression):
    def __init__(self, name: str):
        self.name = name

    def interpret(self, context: dict) -> Any:
        return context.get(self.name, 0)

class Add(Expression):
    def __init__(self, left: Expression, right: Expression):
        self.left = left
        self.right = right

    def interpret(self, context: dict) -> float:
        return self.left.interpret(context) + self.right.interpret(context)

class Subtract(Expression):
    def __init__(self, left: Expression, right: Expression):
        self.left = left
        self.right = right

    def interpret(self, context: dict) -> float:
        return self.left.interpret(context) - self.right.interpret(context)

# Usage: evaluate "(10 + x) - 5" where x = 3
expression = Subtract(
    Add(Number(10), Variable("x")),
    Number(5)
)
context = {"x": 3}
print(expression.interpret(context))  # 8
```

### JavaScript

```javascript
class Expression {
  interpret(context) {
    throw new Error("Subclasses must implement interpret()");
  }
}

class NumberLiteral extends Expression {
  constructor(value) {
    super();
    this.value = value;
  }

  interpret(context) {
    return this.value;
  }
}

class Variable extends Expression {
  constructor(name) {
    super();
    this.name = name;
  }

  interpret(context) {
    return context[this.name] ?? 0;
  }
}

class Add extends Expression {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }

  interpret(context) {
    return this.left.interpret(context) + this.right.interpret(context);
  }
}

class Subtract extends Expression {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }

  interpret(context) {
    return this.left.interpret(context) - this.right.interpret(context);
  }
}

// Usage: evaluate "(10 + x) - 5" where x = 3
const expression = new Subtract(
  new Add(new NumberLiteral(10), new Variable("x")),
  new NumberLiteral(5)
);
console.log(expression.interpret({ x: 3 })); // 8
```

### Java

```java
import java.util.Map;

public interface Expression {
    double interpret(Map<String, Double> context);
}

public class NumberLiteral implements Expression {
    private final double value;

    public NumberLiteral(double value) {
        this.value = value;
    }

    public double interpret(Map<String, Double> context) {
        return value;
    }
}

public class Variable implements Expression {
    private final String name;

    public Variable(String name) {
        this.name = name;
    }

    public double interpret(Map<String, Double> context) {
        return context.getOrDefault(name, 0.0);
    }
}

public class Add implements Expression {
    private final Expression left, right;

    public Add(Expression left, Expression right) {
        this.left = left;
        this.right = right;
    }

    public double interpret(Map<String, Double> context) {
        return left.interpret(context) + right.interpret(context);
    }
}

public class Subtract implements Expression {
    private final Expression left, right;

    public Subtract(Expression left, Expression right) {
        this.left = left;
        this.right = right;
    }

    public double interpret(Map<String, Double> context) {
        return left.interpret(context) - right.interpret(context);
    }
}

// Usage
Expression expr = new Subtract(
    new Add(new NumberLiteral(10), new Variable("x")),
    new NumberLiteral(5)
);
System.out.println(expr.interpret(Map.of("x", 3.0))); // 8.0
```

## Explanation

The Interpreter Pattern is built around an abstract syntax tree (AST):

- **Abstract Expression** (`Expression`): Declares the `interpret()` interface
- **Terminal Expression** (`NumberLiteral`, `Variable`): Represents leaf nodes in the AST
- **Non-terminal Expression** (`Add`, `Subtract`): Represents composite nodes that combine other expressions
- **Context** (`dict`/`Map`): Holds global state (variables) available during interpretation

The client builds an AST and then calls `interpret()` on the root node, which recursively evaluates the tree.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Tree Walker** | Traverses a pre-built AST | Rule engines, query evaluators |
| **[Visitor](/patterns/design/visitor-pattern) + Interpreter** | Separates evaluation logic from tree nodes | When evaluation strategies vary |
| **Memoized Interpreter** | Caches sub-expression results | Repeated evaluations with same context |
| **Compiler + VM** | Compiles to bytecode, then executes | High-performance repeated execution |

## Best Practices

- **Keep the grammar simple** — complex grammars are better handled by parser generators
- **Build the AST first**, then interpret — don't interpret during parsing
- **Use immutable expression nodes** for thread safety and reproducibility
- **Document operator precedence** clearly if you support multiple operators
- **Consider adding `toString()`** for debugging and serialization of expressions

## Common Mistakes

- Using Interpreter for complex languages where a parser generator (ANTLR, PEG.js) is more appropriate
- Mixing parsing logic with interpretation logic, creating spaghetti code
- Not handling type errors or missing variables gracefully
- Building the AST manually instead of using a parser for larger grammars
- Ignoring operator precedence, leading to incorrect evaluation order

## Frequently Asked Questions

**Q: When should I use Interpreter instead of a parser generator?**
A: Use Interpreter for very simple grammars with few rules that change infrequently. For anything beyond basic arithmetic or boolean expressions, use ANTLR, PEG.js, or a similar tool.

**Q: Can I combine Interpreter with Visitor?**
A: Yes, and you often should. The Interpreter Pattern defines the AST structure; the [Visitor](/patterns/design/visitor-pattern) Pattern adds operations (interpret, serialize, optimize) without modifying the AST nodes.
