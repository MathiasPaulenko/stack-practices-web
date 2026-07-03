---
contentType: patterns
slug: interpreter-pattern-expressions
title: "Interpreter Pattern para Lenguajes de Expresion Especificos de Dominio"
description: "Construye un interprete de lenguaje que evalua expresiones y reglas representando la gramatica como objetos componibles, util para formulas, queries y reglas de negocio"
metaDescription: "Interpreter pattern para lenguajes de expresion. Evalua formulas y reglas representando gramatica como objetos componibles para logica de negocio configurable."
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
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Interpreter pattern para lenguajes de expresion. Evalua formulas y reglas representando gramatica como objetos componibles para logica de negocio configurable."
  keywords:
    - interpreter pattern
    - expression language
    - domain specific language
    - behavioral patterns
    - rule engine
---

# Interpreter Pattern para Lenguajes de Expresion Especificos de Dominio

El [Interpreter](/patterns/design/interpreter-pattern) pattern define una representacion para la gramatica de un lenguaje junto con un interprete que usa la representacion para interpretar oraciones en el lenguaje. Convierte expresiones de texto complejas en objetos ejecutables, haciendo que reglas de negocio, filtros de query y formulas matematicas sean configurables sin cambios de codigo.

## Cuando Usar Esto

- Necesitas evaluar expresiones que cambian frecuentemente y deben ser configurables
- Existe una gramatica simple que no requiere un generador de parser completo
- Las reglas de negocio se expresan como formulas o condiciones que definen no-desarrolladores

## Problema

Un motor de precios hardcodea logica de descuentos. Marketing quiere crear reglas como "20% off si carrito > $100 AND usuario es VIP" sin desplegar nuevo codigo.

## Solucion

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

// Non-terminal: comparacion
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

// Non-terminal: AND logico
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

// Non-terminal: aritmetica
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

// Uso: cart value > 100 AND isVIP
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

## Variacion: Parser de Formulas Matematicas

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

## Como Funciona

1. **Abstract Expression** declara un metodo `interpret`
2. **Terminal Expression** evalua valores literales o variables
3. **Non-terminal Expression** combina otras expresiones con operadores
4. **Context** provee valores de variables durante la evaluacion

## Consideraciones de Produccion

- [Cachea](/patterns/design/cache-aside-pattern) arboles de expresion parseados para evitar re-parseo en cada evaluacion
- Sanitiza nombres de variables para prevenir polucion de contexto
- Para gramaticas complejas, prefiere generadores de parser (PEG.js, ANTLR) sobre interpretes hand-rolled

## Errores Comunes

- Usar Interpreter para lenguajes de programacion completos en lugar de expresiones simples
- No manejar type mismatches entre expresiones
- Construir arboles profundamente anidados sin flattening, afectando rendimiento

## FAQ

**P: En que se diferencia de Command?**
R: [Command](/patterns/design/command-pattern) encapsula acciones para ejecutar mas tarde. Interpreter parsea y evalua expresiones para producir un resultado.

**P: Cuando deberia usar un generador de parser en su lugar?**
R: Cuando la gramatica tiene mas de 5-6 reglas de produccion, recursion izquierda, o necesita recuperacion de errores.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
