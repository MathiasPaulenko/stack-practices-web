---




contentType: patterns
slug: interpreter-pattern-expressions
title: "Interpreter Pattern para Lenguajes de Expresion"
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
  - /patterns/chain-of-responsibility-middleware
  - /patterns/iterator-pattern-collections
  - /patterns/visitor-pattern-operations
  - /patterns/command-pattern-undo
  - /patterns/mediator-pattern-components
lastUpdated: "2026-07-09"
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
- Reglas de pricing, checks de elegibilidad, o filtros de query se almacenan como strings o config
- Quieres evitar recompilar y redesplegar para cada cambio de regla
- El arbol de expresion es suficientemente superficial para evaluar sin problemas de rendimiento

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

// Non-terminal: OR logico
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

// Non-terminal: NOT logico
class NotExpression implements Expression {
  constructor(private expr: Expression) {}

  interpret(context: Record<string, unknown>): boolean {
    return !(this.expr.interpret(context) as boolean);
  }
}

// Non-terminal: igualdad
class EqualsExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Record<string, unknown>): boolean {
    return this.left.interpret(context) === this.right.interpret(context);
  }
}

// Non-terminal: multiplicacion
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

// Non-terminal: resta
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

// Uso: NOT (status == 'banned') OR isAdmin
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
5. El parser construye un arbol de objetos Expression desde tokens o strings
6. El arbol se evalua llamando `interpret()` en la raiz, que evalua recursivamente los hijos
7. Cada tipo de expresion sabe como evaluarse a si misma: los terminales retornan valores, los no-terminales combinan resultados de hijos

## Mejores Practicas

- Manten la gramatica pequena. Si necesitas loops, funciones, o variables con scope, usa un generador de parser real.
- Usa un objeto context tipado en lugar de `Record<string, unknown>` para atrapar errores de tipo en compile time.
- Cachea arboles de expresion parseados cuando la misma regla se evalua muchas veces con diferentes contexts.
- Agrega un metodo `toString()` a cada expresion para debugging. Imprimir la estructura del arbol ayuda a diagnosticar bugs de parseo.
- Valida nombres de variables contra una whitelist antes de la evaluacion para prevenir inyeccion de contexto.
- Separa el parseo de la evaluacion. Parsea una vez, evalua muchas veces con diferentes contexts.
- Considera compilar expresiones a funciones en lugar de interpretar arboles para hot paths: `new Function('context', 'return ...')` es mas rapido que recorrer un arbol.

## Consideraciones de Produccion

- [Cachea](/patterns/design/cache-aside-pattern) arboles de expresion parseados para evitar re-parseo en cada evaluacion
- Sanitiza nombres de variables para prevenir polucion de contexto
- Para gramaticas complejas, prefiere generadores de parser (PEG.js, ANTLR) sobre interpretes hand-rolled
- Limita la profundidad de expresion para prevenir stack overflow en arboles profundamente anidados
- Ejuta la evaluacion en try-catch para manejar errores de tipo en runtime graceful
- Loggea el string de expresion y el context para evaluaciones fallidas para aiding debugging

## Errores Comunes

- Usar Interpreter para lenguajes de programacion completos en lugar de expresiones simples
- No manejar type mismatches entre expresiones
- Construir arboles profundamente anidados sin flattening, afectando rendimiento
- Permitir input no confiable para construir expresiones, llevando a inyeccion de codigo
- Re-parsear la misma expresion en cada evaluacion en lugar de cachear el AST
- No testear edge cases: null values, division por cero, strings vacios, boolean coercion
- Mezclar logica de parseo con logica de evaluacion en la misma clase
- Ignorar precedencia de operadores al construir el arbol de expresion

## FAQ

### En que se diferencia de Command?

[Command](/patterns/design/command-pattern) encapsula acciones para ejecutar mas tarde. Interpreter parsea y evalua expresiones para producir un resultado.

### Cuando deberia usar un generador de parser en su lugar?

Cuando la gramatica tiene mas de 5-6 reglas de produccion, recursion izquierda, o necesita recuperacion de errores. PEG.js, ANTLR, o nearley.js manejan gramaticas complejas mejor que recursive descent hand-rolled.

### Es lento el patron Interpreter?

Los interpretes tree-walking son mas lentos que codigo compilado. Para hot paths, compila el AST a una funcion JavaScript usando `new Function()`. Para la mayoria de reglas de negocio evaluadas ocasionalmente, tree-walking es suficientemente rapido.

**P: Puedo serializar arboles de expresion?**
R: Si. Agrega un metodo `toJSON()` a cada expresion que outpute `{ type, children, value }`. Reconstruye el arbol con una funcion factory que mapea el string de tipo a la clase correcta. Esto permite almacenar reglas en una base de datos.

**P: Como manejo precedencia de operadores?**
R: El parser debe respetar precedencia durante la construccion. Multiplicacion bindera mas fuerte que adicion, asi que `parseTerm` maneja `*` y `/` mientras `parseExpression` maneja `+` y `-`. La estructura del arbol resultante codifica la precedencia correctamente.

**P: Puedo usar esto para queries definidos por usuario?**
R: Si, pero valida la estructura de expresion antes de la evaluacion. Restringe variables, operadores y funciones disponibles. No permitas acceso arbitrario a propiedades del objeto context. Usa una whitelist de nombres de variables permitidos.

**P: Como debuggeo la evaluacion de expresiones?**
R: Agrega un metodo `toString()` a cada expresion que reconstruya el string fuente. Loggea la expresion y el context antes de evaluar. Para arboles complejos, imprime la estructura del AST con indentacion para ver el nesting.

**P: Cual es la diferencia entre Interpreter y Strategy?**
R: Strategy selecciona un algoritmo de un conjunto. Interpreter compone expresiones en un arbol que se evalua como un todo. Strategy trata sobre swappear comportamiento; Interpreter trata sobre construir estructuras ejecutables desde texto.

**P: Puedo extender la gramatica en runtime?**
R: Si. Registra nuevos tipos de expresion en un factory map. Cuando el parser encuentra un operador desconocido, busca en la factory y crea la expresion apropiada. Esto permite a plugins agregar nuevos operadores.

**P: Como manejo valores null o undefined?**
R: Define comportamiento explicito: trata null como 0 para aritmetica, como false para boolean, o lanza un error tipado. No dejes que la coercion implicita de JavaScript te sorprenda. Testea con null, undefined, string vacio, y NaN en cada tipo de expresion.

**P: Puedo usar este patron en Python?**
R: Si. El patron es agnostico al lenguaje. En Python, usa dataclasses para tipos de expresion y un statement `match` para evaluacion. La estructura es identica: expresiones terminales y no-terminales implementando una interfaz comun.

**P: Como testeo interpretes de expresiones?**
R: Testea cada tipo de expresion de forma aislada con inputs conocidos. Testea el parser con secuencias de tokens que cubran todos los operadores y reglas de precedencia. Testea end-to-end con input string, parseo, y evaluacion. Incluye edge cases: input vacio, token unico, expresiones profundamente anidadas.

**P: Que pasa con evaluacion short-circuit?**
R: `AndExpression` deberia short-circuit: si el lado izquierdo es false, skip evaluar el lado derecho. `OrExpression` deberia short-circuit: si el lado izquierdo es true, skip el derecho. Esto importa cuando la expresion derecha tiene efectos secundarios o es costosa.

**P: Puedo compilar expresiones a SQL?**
R: Si. Agrega un metodo `toSQL()` a cada expresion que genera un fragmento SQL. `GreaterThanExpression` genera `left > right`. `AndExpression` genera `left AND right`. Esto convierte el arbol de expresion en una clausula WHERE sin evaluar en JavaScript.

**P: Como se compara con un motor de reglas?**
R: Un motor de reglas evalua muchas reglas contra un conjunto de hechos, a menudo con resolucion de conflictos y prioridad. El patron Interpreter construye y evalua una sola expresion. Un motor de reglas puede usar interpretes internamente para evaluacion de reglas.

**P: Puedo usar esto para renderizado de templates?**
R: Si. Parsea strings de template como `"Hello, {{name}}! Your total is {{cartValue * 1.2}}"` en un arbol de expresion. Evalua con un objeto context. Asi es como motores de template como Mustache funcionan internamente.

**P: Que pasa con seguridad con expresiones proporcionadas por usuario?**
R: Nunca uses `eval()` o `new Function()` con input no confiable. Parsea en un AST y evalua con un context restringido. Limita variables disponibles, operadores, y profundidad de expresion. Loggea y rate-limitea la evaluacion para prevenir abuso.
