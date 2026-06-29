---
contentType: patterns
slug: priority-queue-pattern
title: "Patron de Cola de Prioridad"
description: "Procesa tareas basandose en prioridad en lugar de orden de llegada, asegurando que el trabajo de alta prioridad obtenga recursos antes que las tareas de menor prioridad."
metaDescription: "Aprende el Patron de Cola de Prioridad para programacion por prioridad. Ejemplos en Python, Java y JavaScript con heaps, sorted sets de Redis y fair queuing."
difficulty: intermediate
topics:
  - design
  - architecture
  - concurrency
tags:
  - cola-de-prioridad
  - patron
  - patron-de-diseno
  - programacion
  - concurrencia
  - heap
  - cola
relatedResources:
  - /patterns/design/queue-based-load-leveling-pattern
  - /patterns/design/scheduler-agent-supervisor-pattern
  - /patterns/design/throttling-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patron de Cola de Prioridad para programacion por prioridad. Ejemplos en Python, Java y JavaScript con heaps, sorted sets de Redis y fair queuing."
  keywords:
    - cola de prioridad
    - patron de diseno
    - programacion
    - concurrencia
    - heap
    - prioridad de tareas
    - fair queuing
---

# Patron de Cola de Prioridad

## Resumen

El Patron de Cola de Prioridad organiza tareas o mensajes de modo que los elementos de mayor prioridad se procesen antes que los de menor prioridad, independientemente del orden de llegada. En lugar de la cola tradicional FIFO donde las tareas se manejan en orden de envio, una cola de prioridad ordena las tareas por importancia, urgencia o valor de negocio.

Este patron es esencial cuando los recursos son limitados y no todas las tareas pueden procesarse inmediatamente. Garantiza que las operaciones criticas — deteccion de fraude, solicitudes de clientes VIP, alertas del sistema — reciban atencion inmediata mientras el trabajo de fondo rutinario espera.

## Cuando Usar

- Capacidad de procesamiento limitada con importancia heterogenea de tareas
- Experiencias de clientes VIP o por niveles donde los usuarios premium obtienen servicio mas rapido
- Sistemas de respuesta a incidentes donde las alertas criticas deben preceder a las advertencias
- Programacion de trabajos donde los plazos o SLAs determinan el orden de ejecucion
- Procesadores de tareas de fondo con cargas mixtas (email, reportes, exportaciones)
- Sistemas multi-tenant donde los inquilinos de mayor pago obtienen prioridad

## Cuando Evitar

- Todas las tareas tienen igual importancia — una cola FIFO regular es mas simple y justa
- El hambre de tareas de baja prioridad es inaceptable — considerar envejecimiento o scheduling justo
- El costo de determinar prioridad excede el costo de procesar la tarea
- El orden FIFO estricto es un requisito de negocio
- Volumenes muy pequenos donde el ordenamiento no aporta beneficio

## Solucion

### Python (Cola de Prioridad basada en Heap)

```python
import heapq
import time
from dataclasses import dataclass, field
from enum import Enum
import threading

class Priority(Enum):
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4
    BACKGROUND = 5

@dataclass(order=True)
class Task:
    priority: int
    timestamp: float = field(compare=True)
    task_id: str = field(compare=False)
    payload: dict = field(compare=False)

class PriorityQueueProcessor:
    def __init__(self, num_workers=4):
        self.heap = []
        self.lock = threading.Lock()
        self.num_workers = num_workers
        self.running = False

    def submit(self, task_id: str, payload: dict, priority: Priority = Priority.NORMAL):
        task = Task(
            priority=priority.value,
            timestamp=time.time(),
            task_id=task_id,
            payload=payload
        )
        with self.lock:
            heapq.heappush(self.heap, task)

    def _process_next(self):
        with self.lock:
            if not self.heap:
                return None
            task = heapq.heappop(self.heap)
        print(f"Procesando {task.task_id} (prioridad {task.priority})")
        time.sleep(0.1)

    def _worker_loop(self):
        while self.running:
            self._process_next()
            time.sleep(0.01)

    def start(self):
        self.running = True
        for _ in range(self.num_workers):
            t = threading.Thread(target=self._worker_loop, daemon=True)
            t.start()
```

### Java (PriorityBlockingQueue con Thread Pool)

```java
import java.util.Comparator;
import java.util.concurrent.*;

public class PriorityQueueScheduler {
    private final PriorityBlockingQueue<PriorityTask> queue;
    private final ExecutorService executor;

    public PriorityQueueScheduler(int numWorkers) {
        this.queue = new PriorityBlockingQueue<>(1000, Comparator
            .comparingInt(PriorityTask::getPriority)
            .thenComparingLong(PriorityTask::getTimestamp));
        this.executor = Executors.newFixedThreadPool(numWorkers);
        startWorkers(numWorkers);
    }

    private void startWorkers(int numWorkers) {
        for (int i = 0; i < numWorkers; i++) {
            executor.submit(this::workerLoop);
        }
    }

    private void workerLoop() {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                PriorityTask task = queue.take();
                processTask(task);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    enum Priority {
        CRITICAL(1), HIGH(2), NORMAL(3), LOW(4), BACKGROUND(5);
        final int value;
        Priority(int value) { this.value = value; }
    }

    static class PriorityTask {
        private final String taskId;
        private final int priority;
        private final Runnable handler;
        private final long timestamp = System.currentTimeMillis();

        public int getPriority() { return priority; }
        public long getTimestamp() { return timestamp; }
    }
}
```

### JavaScript (Cola de Prioridad con Redis Sorted Set)

```javascript
const Redis = require('ioredis');

class RedisPriorityQueue {
    constructor(redis, queueName) {
        this.redis = redis;
        this.queueName = queueName;
    }

    async enqueue(task, priority = 3) {
        const score = priority * 1000000000 + Date.now();
        await this.redis.zadd(this.queueName, score, JSON.stringify(task));
    }

    async dequeue() {
        const result = await this.redis.zpopmin(this.queueName, 1);
        if (result.length === 0) return null;
        return JSON.parse(result[0]);
    }
}
```

## Explicacion

Las colas de prioridad usan una **estructura de datos heap** (o sorted set) para mantener el ordenamiento:

- **Insercion:** Las tareas llegan con un valor de prioridad asignado. Se colocan en el heap segun la prioridad, no el tiempo de llegada.
- **Extraccion:** El worker siempre toma el elemento en la cima del heap — el de mayor prioridad. Si multiples elementos comparten la misma prioridad, el orden secundario (timestamp) asegura equidad.
- **Equidad dentro de la prioridad:** Las tareas con la misma prioridad se procesan en orden FIFO.

## Variantes

| Variante | Mecanismo | Ideal Para |
|----------|-----------|------------|
| Heap binario | Heap en array en memoria | Programacion de tareas de un solo proceso, alto throughput |
| Sorted sets de Redis | Estructura ordenada externa | Workers distribuidos, cola persistente |
| Fair queuing ponderado | Asignacion de ancho de banda proporcional | Control de trafico de red, rate limiting de APIs |
| Cola de retroalimentacion multinivel | Ajuste live de prioridad | Programacion de procesos de sistema operativo |
| Basado en plazos | Primero el plazo mas cercano | Sistemas en tiempo real, procesamiento guiado por SLA |

## Lo que Funciona

- Prevenir el hambre de tareas de baja prioridad
- Mantener niveles de prioridad limitados (3-5)
- Documentar las asignaciones de prioridad
- Monitorear la profundidad de la cola por prioridad
- Considerar la apropiacion

## Errores Comunes

- Todo es de ALTA prioridad
- Ignorar el hambre de tareas
- Calculos de prioridad complejos
- Falta de visibilidad
- Prioridades codificadas en duro

## Ejemplos del Mundo Real

- **Kubernetes**: Usa colas de prioridad para la programacion de pods. Los pods con mayor `priorityClassName` se programan antes.
- **RabbitMQ Priority Queue**: Soporta colas de prioridad mediante el argumento `x-max-priority`.
- **AWS Lambda**: Los mapeos de fuentes de eventos desde colas SQS respetan la prioridad a traves de colas separadas.

## Preguntas Frecuentes

**P: ¿Cual es la diferencia entre una cola de prioridad y fair queuing ponderado?**
R: Una cola de prioridad siempre procesa el item de mayor prioridad primero. El fair queuing asigna una proporcion de recursos a cada clase de prioridad.

**P: ¿Como evito que las tareas de baja prioridad mueran de hambre?**
R: Usar envejecimiento de tareas (aumentar prioridad con el tiempo), asignar cuotas de tiempo fijas, o cambiar a fair queuing.

**P: ¿Puedo cambiar la prioridad de una tarea despues del envio?**
R: Si — remover la tarea de la cola, actualizar su prioridad y reinsertarla.

**P: ¿Las colas de prioridad son justas?**
R: Las colas de prioridad estrictas no son justas para las tareas de baja prioridad. La equidad requiere envejecimiento, limites de apropiacion, o un modelo de asignacion proporcional.

**P: ¿Debo usar una cola de prioridad o multiples colas?**
R: Una cola de prioridad es mas simple pero puede tener contencion. Multiples colas permiten escalamiento y aislamiento independientes.
