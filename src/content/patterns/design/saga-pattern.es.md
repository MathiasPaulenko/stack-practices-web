---
contentType: patterns
slug: saga-pattern
title: "Patrón Saga"
description: "Gestiona transacciones distribuidas a través de múltiples servicios encadenando transacciones locales con acciones compensatorias para rollbacks. Un patrón de microservicios."
metaDescription: "Aprende el Patrón Saga en Python, Java y JavaScript. Patrón de microservicios para transacciones distribuidas con acciones compensatorias."
difficulty: advanced
topics:
  - design
tags:
  - saga
  - patron
  - patron-de-diseno
  - microservicios
  - transacciones-distribuidas
  - compensacion
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/cqrs-pattern
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/retry-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Saga en Python, Java y JavaScript. Patrón de microservicios para transacciones distribuidas con acciones compensatorias."
  keywords:
    - patron saga
    - patron de diseno
    - patron microservicios
    - transacciones distribuidas
    - compensacion
    - python saga
    - java saga
    - javascript saga
---

# Patrón Saga

## Resumen

El Patrón Saga gestiona transacciones distribuidas a través de múltiples servicios rompiendo una transacción de larga duración en una secuencia de transacciones locales. Cada transacción local actualiza un único servicio y publica un evento o mensaje para disparar el siguiente paso. Si un paso falla, la saga ejecuta **transacciones compensatorias** para deshacer los cambios realizados por los pasos anteriores.

## Cuándo usarlo

Usa el Patrón Saga cuando:
- Una operación de negocio abarca múltiples microservicios o bases de datos
- El commit de dos fases (2PC) sea demasiado lento o no disponible
- Necesites consistencia eventual a través de servicios distribuidos
- Cada servicio debe permanecer autónomo con sus propios límites de transacción
- Ejemplos: checkout de e-commerce, reserva de viajes, transferencias financieras, cumplimiento de órdenes

## Solución

### Python

```python
from typing import Callable, List, Dict, Any
from dataclasses import dataclass

@dataclass
class SagaResult:
    success: bool
    data: Any = None
    error: str = None
    step_index: int = 0

class SagaStep:
    def __init__(self, name: str, action: Callable, compensation: Callable = None):
        self.name = name
        self.action = action
        self.compensation = compensation

class SagaOrchestrator:
    def __init__(self):
        self.steps: List[SagaStep] = []
        self.completed: List[Dict] = []

    def add_step(self, name: str, action: Callable, compensation: Callable = None):
        self.steps.append(SagaStep(name, action, compensation))

    def execute(self, context: Dict) -> SagaResult:
        self.completed = []
        for i, step in enumerate(self.steps):
            try:
                result = step.action(context)
                self.completed.append({"step": step.name, "context": dict(context)})
                print(f"Paso '{step.name}' completado")
            except Exception as e:
                print(f"Paso '{step.name}' falló: {e}")
                self.rollback(i)
                return SagaResult(success=False, error=str(e), step_index=i)
        return SagaResult(success=True, data=context)

    def rollback(self, failed_index: int):
        print(f"Revirtiendo {failed_index} pasos completados...")
        for j in range(failed_index - 1, -1, -1):
            step = self.steps[j]
            if step.compensation:
                try:
                    state = self.completed[j]
                    step.compensation(state["context"])
                    print(f"Compensado '{step.name}'")
                except Exception as e:
                    print(f"Compensación falló para '{step.name}': {e}")

# Uso: saga de reserva de viaje
saga = SagaOrchestrator()

saga.add_step(
    "reservar_vuelo",
    action=lambda ctx: ctx.update({"flight": "FL123"}) or True,
    compensation=lambda ctx: print("Cancelando reserva de vuelo")
)

saga.add_step(
    "reservar_hotel",
    action=lambda ctx: ctx.update({"hotel": "HT456"}) or True,
    compensation=lambda ctx: print("Cancelando reserva de hotel")
)

saga.add_step(
    "cobrar_pago",
    action=lambda ctx: (_ for _ in ()).throw(Exception("Pago declinado")),
    compensation=lambda ctx: print("Reembolsando pago")
)

result = saga.execute({"user": "alice"})
print(f"Éxito saga: {result.success}")
```

### JavaScript

```javascript
class SagaStep {
  constructor(name, action, compensation) {
    this.name = name;
    this.action = action;
    this.compensation = compensation;
  }
}

class SagaOrchestrator {
  constructor() {
    this.steps = [];
    this.completed = [];
  }

  addStep(name, action, compensation) {
    this.steps.push(new SagaStep(name, action, compensation));
  }

  async execute(context) {
    this.completed = [];
    for (let i = 0; i < this.steps.length; i++) {
      try {
        await this.steps[i].action(context);
        this.completed.push({ step: this.steps[i].name, context: { ...context } });
        console.log(`Paso '${this.steps[i].name}' completado`);
      } catch (e) {
        console.log(`Paso '${this.steps[i].name}' falló: ${e.message}`);
        await this.rollback(i);
        return { success: false, error: e.message, stepIndex: i };
      }
    }
    return { success: true, data: context };
  }

  async rollback(failedIndex) {
    console.log(`Revirtiendo ${failedIndex} pasos completados...`);
    for (let j = failedIndex - 1; j >= 0; j--) {
      const step = this.steps[j];
      if (step.compensation) {
        try {
          await step.compensation(this.completed[j].context);
          console.log(`Compensado '${step.name}'`);
        } catch (e) {
          console.log(`Compensación falló para '${step.name}': ${e.message}`);
        }
      }
    }
  }
}

// Uso
const saga = new SagaOrchestrator();
saga.addStep("reservarVuelo",
  async (ctx) => { ctx.flight = "FL123"; },
  async () => console.log("Cancelando vuelo")
);
saga.addStep("reservarHotel",
  async (ctx) => { ctx.hotel = "HT456"; },
  async () => console.log("Cancelando hotel")
);
saga.addStep("cobrarPago",
  async () => { throw new Error("Pago declinado"); },
  async () => console.log("Reembolsando pago")
);

saga.execute({ user: "alice" }).then(r => console.log("Éxito:", r.success));
```

### Java

```java
import java.util.*;
import java.util.function.Consumer;

class SagaStep {
    String name;
    Consumer<Map<String, Object>> action;
    Consumer<Map<String, Object>> compensation;

    SagaStep(String name, Consumer<Map<String, Object>> action, Consumer<Map<String, Object>> compensation) {
        this.name = name;
        this.action = action;
        this.compensation = compensation;
    }
}

class SagaResult {
    boolean success;
    String error;
    int stepIndex;

    SagaResult(boolean success, String error, int stepIndex) {
        this.success = success;
        this.error = error;
        this.stepIndex = stepIndex;
    }
}

class SagaOrchestrator {
    private final List<SagaStep> steps = new ArrayList<>();
    private final List<Map<String, Object>> completed = new ArrayList<>();

    void addStep(String name, Consumer<Map<String, Object>> action, Consumer<Map<String, Object>> compensation) {
        steps.add(new SagaStep(name, action, compensation));
    }

    SagaResult execute(Map<String, Object> context) {
        completed.clear();
        for (int i = 0; i < steps.size(); i++) {
            try {
                steps.get(i).action.accept(context);
                completed.add(new HashMap<>(context));
                System.out.println("Paso '" + steps.get(i).name + "' completado");
            } catch (Exception e) {
                System.out.println("Paso '" + steps.get(i).name + "' falló: " + e.getMessage());
                rollback(i);
                return new SagaResult(false, e.getMessage(), i);
            }
        }
        return new SagaResult(true, null, steps.size());
    }

    void rollback(int failedIndex) {
        System.out.println("Revirtiendo " + failedIndex + " pasos completados...");
        for (int j = failedIndex - 1; j >= 0; j--) {
            SagaStep step = steps.get(j);
            if (step.compensation != null) {
                try {
                    step.compensation.accept(completed.get(j));
                    System.out.println("Compensado '" + step.name + "'");
                } catch (Exception e) {
                    System.out.println("Compensación falló: " + e.getMessage());
                }
            }
        }
    }
}

// Uso
SagaOrchestrator saga = new SagaOrchestrator();
saga.addStep("reservarVuelo",
    ctx -> ctx.put("flight", "FL123"),
    ctx -> System.out.println("Cancelando vuelo")
);
saga.addStep("reservarHotel",
    ctx -> ctx.put("hotel", "HT456"),
    ctx -> System.out.println("Cancelando hotel")
);
saga.addStep("cobrarPago",
    ctx -> { throw new RuntimeException("Pago declinado"); },
    ctx -> System.out.println("Reembolsando pago")
);

SagaResult result = saga.execute(new HashMap<>(Map.of("user", "alice")));
System.out.println("Éxito: " + result.success);
```

## Explicación

El Patrón Saga tiene dos estilos:

- **Orquestación**: Un coordinador central gestiona la secuencia y maneja fallos
- **Coreografía**: Los servicios se comunican mediante eventos; cada servicio escucha eventos y actúa, publicando el siguiente evento

Ambos enfoques usan **transacciones compensatorias** para deshacer trabajo cuando un paso falla. A diferencia de las transacciones ACID, las sagas son **eventualmente consistentes** — los estados intermedios son visibles.

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **Saga Orquestada** | Coordinador central gestiona el flujo | Flujos complejos; necesitan visibilidad |
| **Saga Coreografiada** | Impulsada por eventos, sin coordinador central | Flujos simples; acoplamiento débil |
| **Saga Paralela** | Pasos independientes ejecutan concurrentemente | Operaciones no dependientes |
| **Saga Anidada** | Una saga llama a otra | Descomposiciones complejas de dominio |

## Mejores prácticas

- **Diseña compensaciones primero** — cada paso debe tener una operación de deshacer confiable
- **Idempotencia**: Los pasos y compensaciones deberían ser seguros de ejecutar múltiples veces
- **Timeouts**: Cada paso debe tener un timeout; respuestas faltantes deberían disparar compensación
- **Logging**: Registra cada paso, compensación y fallo para observabilidad
- **Reintentos**: Reintenta fallas transitorias dentro de un paso antes de declarar fallo

## Errores comunes

- Olvidar compensaciones para pasos que tienen efectos secundarios
- No manejar fallas parciales en compensaciones (algunas tienen éxito, otras fallan)
- Permitir que las sagas corran indefinidamente sin timeouts
- No hacer los pasos idempotentes, causando efectos secundarios duplicados al reintentar
- Mezclar compensaciones síncronas y asíncronas inconsistentemente

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Saga y 2PC?**
R: 2PC bloquea recursos entre servicios hasta el commit, asegurando consistencia fuerte pero bloqueando y siendo frágil. Saga libera los bloqueos inmediatamente después de cada transacción local, logrando consistencia eventual con mejor disponibilidad y rendimiento.

**P: ¿Cómo manejo una compensación que también falla?**
R: Registra el fallo y alerta a un operador. Algunas compensaciones pueden requerir intervención manual (ej. reembolsar un pago). Diseña compensaciones para ser lo más simples y confiables posible.

**P: ¿Orquestación vs. Coreografía — cuál debería usar?**
R: Usa orquestación para flujos complejos donde la visibilidad y el control sean críticos. Usa coreografía para flujos más simples donde el acoplamiento débil y la autonomía sean más importantes.
