---




contentType: patterns
slug: module-pattern
title: "Patrón Module"
description: "Encapsula estado y comportamiento privados dentro de una unidad auto-contenida con una API pública. Un patrón structural para organizar código en módulos reutilizables y seguros en scope."
metaDescription: "Aprende el Patrón Module para encapsular estado y comportamiento privados. Ejemplos en JavaScript, Python y Java con closures y ES modules."
difficulty: beginner
topics:
  - design
tags:
  - module
  - pattern
  - design-pattern
  - structural
  - encapsulation
  - javascript
  - scope
relatedResources:
  - /patterns/facade-pattern
  - /patterns/singleton-pattern
  - /patterns/repository-pattern
  - /patterns/mixin-pattern
  - /patterns/plugin-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Module para encapsular estado y comportamiento privados. Ejemplos en JavaScript, Python y Java con closures y ES modules."
  keywords:
    - module pattern
    - design pattern
    - encapsulation
    - javascript module
    - private state
    - iife




---

# Patrón Module

## Descripción General

El Patrón Module encapsula variables y funciones privadas dentro de una unidad auto-contenida, exponiendo solo una API pública curada. Previene la polución de namespace, evita conflictos de variables globales y crea límites claros entre partes no relacionadas de un codebase.

En JavaScript antes de ES6, esto se lograba con Immediately Invoked Function Expressions (IIFE). Los lenguajes modernos proveen módulos nativos (ES modules, paquetes Python, paquetes Java), pero la idea central del patrón — ocultar internals y exponer interfaces — sigue siendo fundamental.

## Cuándo Usar


- For alternatives, see [Adapter Pattern](/es/patterns/adapter-pattern/).

Usa el Patrón Module cuando:
- Necesitas estado privado al que no se puede acceder desde fuera del módulo
- Múltiples componentes comparten un codebase y deben evitar colisiones de nombres
- Quieres exponer una API limpia mientras ocultas la complejidad de implementación
- Las pruebas requieren límites claros entre contratos públicos y helpers privados

## Cuándo Evitar

- El lenguaje provee módulos nativos con encapsulación adecuada (úsalos en su lugar)
- Sobre-modularizar scripts simples agrega indirección innecesaria
- Necesitas dependencias profundas entre módulos que crean referencias circulares

## Solución

### JavaScript (IIFE)

```javascript
const CounterModule = (function () {
  let count = 0; // Estado privado

  function log(operation) {
    console.log(`Counter ${operation}: ${count}`);
  }

  return {
    increment() {
      count++;
      log('incremented');
      return count;
    },
    decrement() {
      count--;
      log('decremented');
      return count;
    },
    getCount() {
      return count;
    }
  };
})();

// Uso
CounterModule.increment();
CounterModule.increment();
console.log(CounterModule.getCount()); // 2
// CounterModule.count es undefined — no accesible
```

### JavaScript (ES Module)

```javascript
// counter.js
let count = 0; // Privado al módulo

function log(operation) {
  console.log(`Counter ${operation}: ${count}`);
}

export function increment() {
  count++;
  log('incremented');
  return count;
}

export function decrement() {
  count--;
  log('decremented');
  return count;
}

export function getCount() {
  return count;
}

// main.js
import { increment, getCount } from './counter.js';
increment();
console.log(getCount());
```

### Python

```python
# counter.py
_count = 0  # Privado al módulo por convención

def _log(operation):
    print(f"Counter {operation}: {_count}")

def increment():
    global _count
    _count += 1
    _log("incremented")
    return _count

def decrement():
    global _count
    _count -= 1
    _log("decremented")
    return _count

def get_count():
    return _count

# main.py
from counter import increment, get_count

increment()
increment()
print(get_count())  # 2
# counter._count es accesible pero desaconsejado
```

### Java

```java
// com.myapp.counter.Counter.java
package com.myapp.counter;

public class Counter {
    private static int count = 0; // Acceso package-private

    private static void log(String operation) {
        System.out.println("Counter " + operation + ": " + count);
    }

    public static int increment() {
        count++;
        log("incremented");
        return count;
    }

    public static int decrement() {
        count--;
        log("decremented");
        return count;
    }

    public static int getCount() {
        return count;
    }
}

// Uso
Counter.increment();
System.out.println(Counter.getCount());
```

## Explicación

El Patrón Module se basa en:

- **Scope privado**: Las variables y funciones existen solo dentro del límite del módulo
- **API pública**: Las funciones exportadas explícitamente forman el contrato con los consumidores
- **Responsabilidad única**: Cada módulo maneja un solo concern (contar, formatear, HTTP)

## Variantes

| Variante | Mecanismo | Caso de Uso |
|----------|-----------|-------------|
| **IIFE Module** | Closure-based privacy | JavaScript pre-ES6 |
| **Revealing Module** | Retorna un object literal | Definición de API más limpia en JS |
| **CommonJS** | `module.exports` | Node.js antes de ES modules |
| **ES Module** | `export`/`import` | Estándar moderno de JavaScript |
| **Namespace Module** | Namespace object literal | Organizar utilidades bajo un global |

## Lo que funciona

- **Un concern por módulo.** Un módulo que cuenta, formatea fechas y hace HTTP requests debería dividirse.
- **Usa exports explícitos.** No confíes en wildcard exports; ocultan el contrato público.
- **Nombra miembros privados claramente.** Python usa `_prefijo`; JavaScript los oculta con closures.
- **Evita dependencias circulares.** El módulo A importando B mientras B importa A causa errores de runtime.
- **Mantén los módulos pequeños.** Un módulo de 500 líneas probablemente hace demasiado. Apunta a 100-200 líneas.

## Errores Comunes

- **Estado global en módulos** los hace no testeables. Un módulo contador con un `count` global no se puede resetear fácilmente entre tests.
- **Wild-card exports** (`export *`) filtran helpers internos que se convierten en APIs públicas accidentales.
- **Side effects en import** como conectar a bases de datos o registrar event handlers hacen los módulos impredecibles.
- **Rutas de módulo profundamente anidadas** (`a.b.c.d.e`) crean cadenas de imports frágiles. Aplana donde sea posible.
- **Tratar módulos como clases** — los módulos son namespaces, no objetos instanciables. Usa clases o factories cuando necesites múltiples instancias.

## Ejemplos del Mundo Real

### Módulos Core de Node.js

`fs`, `path` y `http` son módulos built-in que encapsulan operaciones del SO detrás de APIs limpias. Ninguno expone bindings C++ internos directamente.

### Python Standard Library

`json`, `re` y `urllib` son módulos que ocultan motores de parsing y compiladores regex detrás de interfaces de funciones simples.

### Angular Modules

Los decoradores `NgModule` agrupan componentes, servicios y directivas en unidades de feature cohesivas con exports e imports explícitos.

## Preguntas Frecuentes

**Q: Es el Patrón Module lo mismo que una clase?**
A: No. Una clase es un blueprint instanciable. Un módulo es un namespace singleton. Usa módulos para organización; clases para creación de objetos.

**Q: Los módulos pueden tener dependencias entre sí?**
A: Sí, pero evita dependencias circulares. Si A importa B y B importa A, refactoriza código compartido en un tercer módulo C.

**Q: Cómo testeo funciones privadas de un módulo?**
A: No las testees directamente. Si una función privada es lo suficientemente compleja como para necesitar testing, extráela a su propio módulo o hazla package-private.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Module Pattern para Encapsulacion en JS

```typescript
// Module pattern: encapsulacion privada con closures
const PaymentModule = (function() {
  // Privado: no accesible desde fuera
  let apiKey = "";
  let transactions: Transaction[] = [];
  const MAX_TRANSACTIONS = 1000;

  // Privado: validar API key
  function validateKey(key: string): boolean {
    return key.startsWith("pk_") && key.length === 32;
  }

  // Privado: logging interno
  function log(msg: string) {
    console.log(`[PAYMENT] ${new Date().toISOString()} ${msg}`);
  }

  // Publico: API expuesta
  return {
    init(key: string) {
      if (!validateKey(key)) throw new Error("Invalid API key");
      apiKey = key;
      log("Module initialized");
    },
    charge(amount: number, currency: string): Promise<Transaction> {
      if (!apiKey) throw new Error("Module not initialized");
      if (transactions.length >= MAX_TRANSACTIONS) {
        throw new Error("Transaction limit reached");
      }
      log(`Charging ${amount} ${currency}`);
      const tx = { id: crypto.randomUUID(), amount, currency, status: "pending" };
      transactions.push(tx);
      return Promise.resolve(tx);
    },
    getTransactions(): Transaction[] { return [...transactions]; }
    getStats() {
      return {
        total: transactions.length,
        pending: transactions.filter(t => t.status === "pending").length,
        completed: transactions.filter(t => t.status === "completed").length,
      };
    }
  };
})();

// Uso
PaymentModule.init("pk_test_1234567890123456789012345678");
const tx = await PaymentModule.charge(99.99, "USD");
console.log(PaymentModule.getStats()); // { total: 1, pending: 1, completed: 0 }
// PaymentModule.apiKey -> undefined (privado)
// PaymentModule.validateKey -> undefined (privado)
```

Lecciones:
  - Module pattern: IIFE crea un closure con estado privado
  - Solo lo que se retorna en el objeto es publico
  - apiKey, transactions y funciones internas son privadas
  - En ES6+, usar import/export nativo en lugar de IIFE
  - El module pattern sigue siendo util para singletons con estado
  - Namespacing: agrupar funcionalidad relacionada bajo un modulo
```

### Module pattern vs ES modules: cual uso?

Usa ES modules (import/export) para todo codigo nuevo: es el estandar, soportado nativamente por browsers y Node.js. Usa el module pattern (IIFE) solo para compatibilidad legacy o cuando necesitas un singleton con estado privado sin clases. ES modules son estaticos: el bundler puede tree-shake. El module pattern es dinamico: todo se incluye. Para librerias nuevas, ES modules. Para scripts inline o compatibilidad con sistemas viejos, module pattern.
