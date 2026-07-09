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
  - design-patterns
relatedResources:
  - /patterns/design/chain-of-responsibility-middleware
  - /patterns/design/iterator-pattern-collections
lastUpdated: "2026-07-09"
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
- Pricing rules, eligibility checks, or query filters are stored as strings or config
- You want to avoid recompiling and redeploying for every rule change
- The expression tree is shallow enough to evaluate without performance concerns

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

// Non-terminal: logical OR
class OrExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Record<string, unknown>): boolean {
    return this.left.interpret(context) as boolean
      || this.right.interpret(context) as boolean;
  }
}

// Non-terminal: logical NOT
class NotExpression implements Expression {
  constructor(private expr: Expression) {}

  interpret(context: Record<string, unknown>): boolean {
    return !(this.expr.interpret(context) as boolean);
  }
}

// Non-terminal: equality
class EqualsExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Record<string, unknown>): boolean {
    return this.left.interpret(context) === this.right.interpret(context);
  }
}

// Non-terminal: multiplication
class MultiplyExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Record<string, unknown>): number {
    return (this.left.interpret(context) as number)
      * (this.right.interpret(context) as number);
  }
}

// Non-terminal: subtraction
class SubtractExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Record<string, unknown>): number {
    return (this.left.interpret(context) as number)
      - (this.right.interpret(context) as number);
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

// Usage: NOT (status == 'banned') OR isAdmin
const accessRule = new OrExpression(
  new NotExpression(
    new EqualsExpression(
      new VariableExpression('status'),
      new VariableExpression('banned')
    )
  ),
  new VariableExpression('isAdmin')
);

const ctx2 = { status: 'banned', isAdmin: false, banned: 'banned' };
console.log(accessRule.interpret(ctx2)); // false
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
5. The parser builds a tree of Expression objects from tokens or strings
6. The tree is evaluated by calling `interpret()` on the root, which recursively evaluates children
7. Each expression type knows how to evaluate itself: terminals return values, non-terminals combine child results

## Best Practices

- Keep the grammar small. If you need loops, functions, or variables with scope, use a real parser generator.
- Use a typed context object instead of `Record<string, unknown>` to catch type errors at compile time.
- Cache parsed expression trees when the same rule is evaluated many times with different contexts.
- Add a `toString()` method to each expression for debugging. Printing the tree structure helps diagnose parsing bugs.
- Validate variable names against a whitelist before evaluation to prevent context injection.
- Separate parsing from evaluation. Parse once, evaluate many times with different contexts.
- Consider compiling expressions to functions instead of interpreting trees for hot paths: `new Function('context', 'return ...')` is faster than walking a tree.

## Production Considerations

- [Cache](/patterns/design/cache-aside-pattern) parsed expression trees to avoid re-parsing on every evaluation
- Sanitize variable names to prevent context pollution
- For complex grammars, prefer parser generators (PEG.js, ANTLR) over hand-rolled interpreters
- Limit expression depth to prevent stack overflow on deeply nested trees
- Run evaluation in a try-catch to handle runtime type errors gracefully
- Log the expression string and context for failed evaluations to aid debugging

## Common Mistakes

- Using Interpreter for full programming languages instead of simple expressions
- Not handling type mismatches between expressions
- Building deeply nested trees without flattening, hurting performance
- Allowing untrusted input to construct expressions, leading to code injection
- Re-parsing the same expression on every evaluation instead of caching the AST
- Not testing edge cases: null values, division by zero, empty strings, boolean coercion
- Mixing parsing logic with evaluation logic in the same class
- Ignoring operator precedence when building the expression tree

## FAQ

**Q: How is this different from Command?**
A: [Command](/patterns/design/command-pattern) encapsulates actions to execute later. Interpreter parses and evaluates expressions to produce a result.

**Q: When should I use a parser generator instead?**
A: When the grammar has more than 5-6 production rules, left recursion, or needs error recovery. PEG.js, ANTLR, or nearley.js handle complex grammars better than hand-rolled recursive descent.

**Q: Is the Interpreter pattern slow?**
A: Tree-walking interpreters are slower than compiled code. For hot paths, compile the AST to a JavaScript function using `new Function()`. For most business rules evaluated occasionally, tree-walking is fast enough.

**Q: Can I serialize expression trees?**
A: Yes. Add a `toJSON()` method to each expression that outputs `{ type, children, value }`. Reconstruct the tree with a factory function that maps the type string to the correct class. This lets you store rules in a database.

**Q: How do I handle operator precedence?**
A: The parser must respect precedence during construction. Multiplication binds tighter than addition, so `parseTerm` handles `*` and `/` while `parseExpression` handles `+` and `-`. The resulting tree structure encodes precedence correctly.

**Q: Can I use this for user-defined queries?**
A: Yes, but validate the expression structure before evaluation. Restrict available variables, operators, and functions. Do not allow arbitrary property access on the context object. Use a whitelist of allowed variable names.

**Q: How do I debug expression evaluation?**
A: Add a `toString()` method to each expression that reconstructs the source string. Log the expression and context before evaluation. For complex trees, print the AST structure with indentation to see the nesting.

**Q: What is the difference between Interpreter and Strategy?**
A: Strategy selects one algorithm from a set. Interpreter composes expressions into a tree that is evaluated as a whole. Strategy is about swapping behavior; Interpreter is about building executable structures from text.

**Q: Can I extend the grammar at runtime?**
A: Yes. Register new expression types in a factory map. When the parser encounters an unknown operator, it looks up the factory and creates the appropriate expression. This allows plugins to add new operators.

**Q: How do I handle null or undefined values?**
A: Define explicit behavior: treat null as 0 for arithmetic, as false for boolean, or throw a typed error. Do not let JavaScript's implicit coercion surprise you. Test with null, undefined, empty string, and NaN in every expression type.

**Q: Can I use this pattern in Python?**
A: Yes. The pattern is language-agnostic. In Python, use dataclasses for expression types and a `match` statement for evaluation. The structure is identical: terminal and non-terminal expressions implementing a common interface.

**Q: How do I test expression interpreters?**
A: Test each expression type in isolation with known inputs. Test the parser with token sequences that cover all operators and precedence rules. Test end-to-end with string input, parsing, and evaluation. Include edge cases: empty input, single token, deeply nested expressions.

**Q: What about short-circuit evaluation?**
A: `AndExpression` should short-circuit: if the left side is false, skip evaluating the right side. `OrExpression` should short-circuit: if the left side is true, skip the right. This matters when the right expression has side effects or is expensive.

**Q: Can I compile expressions to SQL?**
A: Yes. Add a `toSQL()` method to each expression that generates a SQL fragment. `GreaterThanExpression` generates `left > right`. `AndExpression` generates `left AND right`. This turns the expression tree into a WHERE clause without evaluating in JavaScript.

**Q: How does this compare to a rules engine?**
A: A rules engine evaluates many rules against a fact set, often with conflict resolution and priority. The Interpreter pattern builds and evaluates a single expression. A rules engine may use interpreters internally for rule evaluation.

**Q: Can I use this for template rendering?**
A: Yes. Parse template strings like `"Hello, {{name}}! Your total is {{cartValue * 1.2}}"` into an expression tree. Evaluate with a context object. This is how template engines like Mustache work internally.

**Q: What about security with user-provided expressions?**
A: Never use `eval()` or `new Function()` with untrusted input. Parse into an AST and evaluate with a restricted context. Limit available variables, operators, and expression depth. Log and rate-limit evaluation to prevent abuse.
