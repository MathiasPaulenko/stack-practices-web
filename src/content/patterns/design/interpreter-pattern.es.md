---
contentType: patterns
slug: interpreter-pattern
title: "Patrón Interpreter"
description: "Define una representación para la gramática de un lenguaje junto con un intérprete que usa la representación para interpretar oraciones. Un patrón de diseño de comportamiento para mini-lenguajes."
metaDescription: "Aprende el Patrón Interpreter en Python, Java y JavaScript. Patrón de comportamiento para analizar y evaluar mini-lenguajes."
difficulty: advanced
topics:
  - design
tags:
  - interpreter
  - patron
  - patron-de-diseno
  - comportamiento
  - parser
  - gramatica
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
  metaDescription: "Aprende el Patrón Interpreter en Python, Java y JavaScript. Patrón de comportamiento para analizar y evaluar mini-lenguajes."
  keywords:
    - patron interpreter
    - patron de diseno
    - patron de comportamiento
    - parser
    - gramatica
    - python interpreter
    - java interpreter
    - javascript interpreter
---

# Patrón Interpreter

## Resumen

El [Patrón Interpreter](/patterns/design/interpreter-pattern-expressions) es un patrón de diseño de comportamiento que define una representación para la gramática de un lenguaje junto con un intérprete que usa la representación para interpretar oraciones en el lenguaje. Es ideal para construir lenguajes específicos de dominio (DSL), evaluadores de expresiones, analizadores de consultas y motores de reglas.

## Cuándo usarlo

Usa el Patrón Interpreter cuando:
- Tengas una gramática simple que necesita ser analizada y evaluada frecuentemente
- Quieras construir un lenguaje específico de dominio (DSL) para configuración o reglas
- Las oraciones del lenguaje puedan representarse como árboles de sintaxis abstracta (AST)
- La simplicidad de la gramática hace que un generador de parsers (ANTLR, yacc) sea excesivo
- Ejemplos: expresiones aritméticas, consultas tipo SQL, motores de reglas booleanas, motores regex

## Solución

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

# Uso: evaluar "(10 + x) - 5" donde x = 3
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
    throw new Error("Las subclases deben implementar interpret()");
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

// Uso: evaluar "(10 + x) - 5" donde x = 3
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

// Uso
Expression expr = new Subtract(
    new Add(new NumberLiteral(10), new Variable("x")),
    new NumberLiteral(5)
);
System.out.println(expr.interpret(Map.of("x", 3.0))); // 8.0
```

## Explicación

El Patrón Interpreter se construye alrededor de un árbol de sintaxis abstracta (AST):

- **Expresión Abstracta** (`Expression`): Declara la interfaz `interpret()`
- **Expresión Terminal** (`NumberLiteral`, `Variable`): Representa nodos hoja en el AST
- **Expresión No Terminal** (`Add`, `Subtract`): Representa nodos compuestos que combinan otras expresiones
- **Contexto** (`dict`/`Map`): Mantiene estado global (variables) disponible durante la interpretación

El cliente construye un AST y luego llama `interpret()` en el nodo raíz, que evalúa recursivamente el árbol.

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **Tree Walker** | Recorre un AST pre-construido | Motores de reglas, evaluadores de consultas |
| **[Visitor](/patterns/design/visitor-pattern) + Interpreter** | Separa la lógica de evaluación de los nodos del árbol | Cuando las estrategias de evaluación varían |
| **Interpreter Memoizado** | Cachea resultados de sub-expresiones | Evaluaciones repetidas con el mismo contexto |
| **Compiler + VM** | Compila a bytecode, luego ejecuta | Ejecución repetida de alto rendimiento |

## Mejores prácticas

- **Mantén la gramática simple** — las gramáticas complejas se manejan mejor con generadores de parsers
- **Construye el AST primero**, luego interpreta — no interpretes durante el parsing
- **Usa nodos de expresión inmutables** para seguridad de hilos y reproducibilidad
- **Documenta la precedencia de operadores** claramente si soportas múltiples operadores
- **Considera agregar `toString()`** para depuración y serialización de expresiones

## Errores comunes

- Usar Interpreter para lenguajes complejos donde un generador de parsers (ANTLR, PEG.js) es más apropiado
- Mezclar la lógica de parsing con la lógica de interpretación, creando código spaghetti
- No manejar errores de tipo o variables faltantes gracefulmente
- Construir el AST manualmente en lugar de usar un parser para gramáticas más grandes
- Ignorar la precedencia de operadores, llevando a orden de evaluación incorrecto

## Preguntas frecuentes

**P: ¿Cuándo debería usar Interpreter en lugar de un generador de parsers?**
R: Usa Interpreter para gramáticas muy simples con pocas reglas que cambian infrecuentemente. Para cualquier cosa más allá de aritmética básica o expresiones booleanas, usa ANTLR, PEG.js o una herramienta similar.

**P: ¿Puedo combinar Interpreter con Visitor?**
R: Sí, y a menudo deberías. El Patrón Interpreter define la estructura del AST; el [Patrón Visitor](/patterns/design/visitor-pattern) agrega operaciones (interpretar, serializar, optimizar) sin modificar los nodos del AST.
