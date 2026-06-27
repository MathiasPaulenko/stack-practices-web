---
contentType: patterns
slug: interpreter-pattern-expressions
title: "Interpreter Pattern for Domain-Specific Expression Languages"
description: "Build a language interpreter that evaluates expressions and rules by representing grammar as composable objects, useful for formulas, queries, and business rules"
metaDescription: "Interpreter pattern for expression languages. Evaluate formulas and rules by representing grammar as composable objects for configurable business logic."
difficulty: advanced
topics:
  - design
tags:
  - interpreter
  - behavioral-patterns
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/chain-of-responsibility-middleware
  - /patterns/design/iterator-pattern-collections
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Interpreter pattern for expression languages. Evaluate formulas and rules by representing grammar as composable objects for configurable business logic."
  keywords:
    - interpreter pattern
    - expression language
    - domain specific language
    - behavioral patterns
    - rule engine
---

# Interpreter Pattern for Domain-Specific Expression Languages

The [Interpreter](/patterns/design/interpreter-pattern) pattern defines a representation for a language's grammar along with an interpreter that uses the representation to interpret sentences in the language. It turns complex text expressions into executable objects, making business rules, query filters, and mathematical formulas configurable without code changes.

## When to Use This

- You need to evaluate expressions that change frequently and must be configurable
- A simple grammar exists that does not require a full parser generator
- Business rules are expressed as formulas or conditions that non-developers define

## Problem

A pricing engine hardcodes discount logic. Marketing wants to create rules like "20% off if cart > $100 AND user is VIP" without deploying new code.

## Solution

```typescript
// interpreter/Expression.ts
interface Expression {
  interpret(context: Record<string, unknown>): boolean | number;
}

// Terminal expressions
class VariableExpression implements Expression {
  constructor(private name: string) {}

  interpret(context: Record<string, unknown>): unknown {
    return context[this.name];
  }
}

class NumberExpression implements Expression {
  constructor(private value: number) {}

  interpret(): number {
    return this.value;
  }
}

// Non-terminal: comparison
class GreaterThanExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Record<string, unknown>): boolean {
    const l = this.left.interpret(context) as number;
    const r = this.right.interpret(context) as number;
    return l > r;
  }
}

// Non-terminal: logical AND
class AndExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Record<string, unknown>): boolean {
    return this.left.interpret(context) as boolean
      && this.right.interpret(context) as boolean;
  }
}

// Non-terminal: arithmetic
class AddExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Record<string, unknown>): number {
    return (this.left.interpret(context) as number)
      + (this.right.interpret(context) as number);
  }
}

// Usage: cart value > 100 AND isVIP
const rule = new AndExpression(
  new GreaterThanExpression(
    new VariableExpression('cartValue'),
    new NumberExpression(100)
  ),
  new VariableExpression('isVIP')
);

const context = { cartValue: 150, isVIP: true };
console.log(rule.interpret(context)); // true
```

## Variation: Math Formula Parser

```typescript
// interpreter/FormulaParser.ts
function parseFormula(tokens: string[]): Expression {
  let index = 0;

  function parseExpression(): Expression {
    let left = parseTerm();

    while (index < tokens.length && (tokens[index] === '+' || tokens[index] === '-')) {
      const op = tokens[index++];
      const right = parseTerm();
      left = op === '+'
        ? new AddExpression(left, right)
        : new SubtractExpression(left, right);
    }

    return left;
  }

  function parseTerm(): Expression {
    const token = tokens[index++];
    if (!isNaN(Number(token))) {
      return new NumberExpression(Number(token));
    }
    return new VariableExpression(token);
  }

  return parseExpression();
}

// Parse "price * 0.8 + shipping"
const formula = parseFormula(['price', '*', '0.8', '+', 'shipping']);
console.log(formula.interpret({ price: 100, shipping: 10 })); // 90
```

## How It Works

1. **Abstract Expression** declares an `interpret` method
2. **Terminal Expression** evaluates literal values or variables
3. **Non-terminal Expression** combines other expressions with operators
4. **Context** provides variable values during evaluation

## Production Considerations

- [Cache](/patterns/design/cache-aside-pattern) parsed expression trees to avoid re-parsing on every evaluation
- Sanitize variable names to prevent context pollution
- For complex grammars, prefer parser generators (PEG.js, ANTLR) over hand-rolled interpreters

## Common Mistakes

- Using Interpreter for full programming languages instead of simple expressions
- Not handling type mismatches between expressions
- Building deeply nested trees without flattening, hurting performance

## FAQ

**Q: How is this different from Command?**
A: [Command](/patterns/design/command-pattern) encapsulates actions to execute later. Interpreter parses and evaluates expressions to produce a result.

**Q: When should I use a parser generator instead?**
A: When the grammar has more than 5-6 production rules, left recursion, or needs error recovery.
