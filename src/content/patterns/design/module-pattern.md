---
contentType: patterns
slug: module-pattern
title: "Module Pattern"
description: "Encapsulate private state and behavior inside a self-contained unit with a public API. A structural pattern for organizing code into reusable, scope-safe modules."
metaDescription: "Learn the Module Pattern for encapsulating private state and behavior. Examples in JavaScript, Python, and Java with closures and ES modules."
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
  - /patterns/design/facade-pattern
  - /patterns/design/singleton-pattern
  - /patterns/design/repository-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Module Pattern for encapsulating private state and behavior. Examples in JavaScript, Python, and Java with closures and ES modules."
  keywords:
    - module pattern
    - design pattern
    - encapsulation
    - javascript module
    - private state
    - iife
---

# Module Pattern

## Overview

The Module Pattern encapsulates private variables and functions inside a self-contained unit, exposing only a curated public API. It prevents namespace pollution, avoids global variable conflicts, and creates clear boundaries between unrelated parts of a codebase.

In JavaScript before ES6, this was achieved with Immediately Invoked Function Expressions (IIFE). Modern languages provide native modules (ES modules, Python packages, Java packages), but the pattern's core idea — hiding internals and exposing interfaces — remains fundamental.

## When to Use

Use the Module Pattern when:
- You need private state that cannot be accessed from outside the module
- Multiple components share a codebase and must avoid naming collisions
- You want to expose a clean API while hiding implementation complexity
- Testing requires clear boundaries between public contracts and private helpers

## When to Avoid

- The language provides native modules with proper encapsulation (use them instead)
- Over-modularizing simple scripts adds unnecessary indirection
- You need deep inter-module dependencies that create circular references

## Solution

### JavaScript (IIFE)

```javascript
const CounterModule = (function () {
  let count = 0; // Private state

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

// Usage
CounterModule.increment();
CounterModule.increment();
console.log(CounterModule.getCount()); // 2
// CounterModule.count is undefined — not accessible
```

### JavaScript (ES Module)

```javascript
// counter.js
let count = 0; // Module-private

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
_count = 0  # Module-private by convention

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
# counter._count is accessible but discouraged
```

### Java

```java
// com.myapp.counter.Counter.java
package com.myapp.counter;

public class Counter {
    private static int count = 0; // Package-private access

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

// Usage
Counter.increment();
System.out.println(Counter.getCount());
```

## Explanation

The Module Pattern relies on:

- **Private scope**: Variables and functions exist only inside the module boundary
- **Public API**: Explicitly exported functions form the contract with consumers
- **Single responsibility**: Each module handles one concern (counting, formatting, HTTP)

## Variants

| Variant | Mechanism | Use Case |
|---------|-----------|----------|
| **IIFE Module** | Closure-based privacy | Pre-ES6 JavaScript |
| **Revealing Module** | Returns an object literal | Cleaner API definition in JS |
| **CommonJS** | `module.exports` | Node.js before ES modules |
| **ES Module** | `export`/`import` | Modern JavaScript standard |
| **Namespace Module** | Object literal namespace | Organizing utilities under one global |

## What Works

- **One concern per module.** A module that counts, formats dates, and makes HTTP requests should be split.
- **Use explicit exports.** Do not rely on wildcard exports; they hide the public contract.
- **Name private members clearly.** Python uses `_prefix`; JavaScript closures hide them entirely.
- **Avoid circular dependencies.** Module A importing B while B imports A causes runtime errors.
- **Keep modules small.** A 500-line module is likely doing too much. Aim for 100-200 lines.

## Common Mistakes

- **Global state in modules** makes them untestable. A counter module with a global `count` cannot be reset between tests easily.
- **Wild-card exports** (`export *`) leak internal helpers that become accidental public APIs.
- **Side effects on import** like connecting to databases or registering event handlers make modules unpredictable.
- **Deeply nested module paths** (`a.b.c.d.e`) create brittle import chains. Flatten where possible.
- **Treating modules as classes** — modules are namespaces, not instantiable objects. Use classes or factories when you need multiple instances.

## Real-World Examples

### Node.js Core Modules

`fs`, `path`, and `http` are built-in modules that encapsulate OS operations behind clean APIs. None expose internal C++ bindings directly.

### Python Standard Library

`json`, `re`, and `urllib` are modules that hide parsing engines and regex compilers behind simple function interfaces.

### Angular Modules

`NgModule` decorators group components, services, and directives into cohesive feature units with explicit exports and imports.

## Frequently Asked Questions

**Q: Is the Module Pattern the same as a class?**
A: No. A class is an instantiable blueprint. A module is a singleton namespace. Use modules for organization; classes for object creation.

**Q: Can modules have dependencies on each other?**
A: Yes, but avoid circular dependencies. If A imports B and B imports A, refactor shared code into a third module C.

**Q: How do I test module-private functions?**
A: Do not test them directly. If a private function is complex enough to need testing, extract it into its own module or make it package-private.
