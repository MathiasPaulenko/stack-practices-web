---
contentType: patterns
slug: priority-queue-pattern
title: "Patrón de Cola de Prioridad: Programación por Urgencia"
description: "Usa el patrón de cola de prioridad para procesar primero el trabajo crítico. Ejemplos en Python, Java y JavaScript con heaps y Redis."
metaDescription: "Aprende el patrón de cola de prioridad: programación de tareas por urgencia con ejemplos en Python, Java y JavaScript usando heaps y Redis."
difficulty: intermediate
topics:
  - design
  - architecture
  - concurrency
tags:
  - queue
  - pattern
  - design-pattern
  - scheduling
  - concurrency
relatedResources:
  - /patterns/queue-based-load-leveling-pattern
  - /patterns/scheduler-agent-supervisor-pattern
  - /patterns/throttling-pattern
  - /patterns/lock-free-queue-pattern
  - /patterns/message-queue-load-leveling-pattern
  - /patterns/serverless-throttling-pattern
lastUpdated: "2026-08-23"
publishedAt: "2026-06-26"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende el patrón de cola de prioridad: programación de tareas por urgencia con ejemplos en Python, Java y JavaScript usando heaps y Redis."
  keywords:
    - cola de prioridad
    - patrón de diseño
    - programación
    - concurrencia
    - heap
    - prioridad de tareas
    - fair queuing
---
## Visión General

El Patrón de Cola de Prioridad organiza tareas o mensajes de modo que los elementos de mayor prioridad se procesen antes
que los de menor prioridad, independientemente del orden de llegada. En lugar de la cola tradicional FIFO donde las
tareas se manejan en orden de envío, una cola de prioridad ordena las tareas por importancia, urgencia o valor de
negocio.

Este patrón es esencial cuando los recursos son limitados y no todas las tareas pueden procesarse inmediatamente.
Garantiza que las operaciones críticas — detección de fraude, solicitudes de clientes VIP, alertas del sistema — reciban
atención inmediata mientras el trabajo de fondo rutinario espera.

## Cuándo Usar

- Capacidad de procesamiento limitada con importancia heterogénea de tareas
- Experiencias de clientes VIP o por niveles donde los usuarios premium obtienen servicio más rápido
- Sistemas de respuesta a incidentes donde las alertas críticas deben preceder a las advertencias
- Programación de trabajos donde los plazos o SLAs determinan el orden de ejecución
- Procesadores de tareas de fondo con cargas mixtas (email, reportes, exportaciones)
- Sistemas multi-tenant donde los inquilinos de mayor pago obtienen prioridad

Para estrategias relacionadas, consulta el patrón [Queue-Based Load
Leveling](/es/patterns/queue-based-load-leveling-pattern/) y el patrón [Throttling](/es/patterns/throttling-pattern/).

## Cuándo Evitar

- Todas las tareas tienen igual importancia — una cola FIFO regular es más simple y justa
- El hambre de tareas de baja prioridad es inaceptable — considerar envejecimiento o scheduling justo
- El costo de determinar prioridad excede el costo de procesar la tarea
- El orden FIFO estricto es un requisito de negocio
- Volúmenes muy pequeños donde el ordenamiento no aporta beneficio

## Solución

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

### Java (PriorityBlockingQueue con Thread Pool)

```java
import java.util.Comparator; import java.util.concurrent.*;

public class PriorityQueueScheduler { private final PriorityBlockingQueue<PriorityTask> queue; private final
ExecutorService executor;

public PriorityQueueScheduler(int numWorkers) { this.queue = new PriorityBlockingQueue<>(1000, Comparator
.comparingInt(PriorityTask::getPriority) .thenComparingLong(PriorityTask::getTimestamp)); this.executor =
Executors.newFixedThreadPool(numWorkers); startWorkers(numWorkers); }

private void startWorkers(int numWorkers) { for (int i = 0; i < numWorkers; i++) { executor.submit(this::workerLoop); }
}

private void workerLoop() { while (!Thread.currentThread().isInterrupted()) { try { PriorityTask task = queue.take();
processTask(task); } catch (InterruptedException e) { Thread.currentThread().interrupt(); break; } } }

enum Priority { CRITICAL(1), HIGH(2), NORMAL(3), LOW(4), BACKGROUND(5); final int value; Priority(int value) {
this.value = value; } }

static class PriorityTask { private final String taskId; private final int priority; private final Runnable handler;
private final long timestamp = System.currentTimeMillis();

public int getPriority() { return priority; } public long getTimestamp() { return timestamp; } } }

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

### TypeScript (Cola de Prioridad Genérica con Heap)

```typescript
// Priority Queue: elementos con mayor prioridad se procesan primero
class PriorityQueue<T> {
  private heap: { priority: number; data: T }[] = [];

  enqueue(data: T, priority: number): void {
    this.heap.push({ priority, data });
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top.data;
  }

  peek(): T | null { return this.heap.length > 0 ? this.heap[0].data : null; }
  size(): number { return this.heap.length; }
  isEmpty(): boolean { return this.heap.length === 0; }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[idx].priority <= this.heap[parent].priority) break;
      [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
      idx = parent;
    }
  }

  private bubbleDown(idx: number): void {
    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let largest = idx;
      if (left < this.heap.length && this.heap[left].priority > this.heap[largest].priority) largest = left;
      if (right < this.heap.length && this.heap[right].priority > this.heap[largest].priority) largest = right;
      if (largest === idx) break;
      [this.heap[idx], this.heap[largest]] = [this.heap[largest], this.heap[idx]];
      idx = largest;
    }
  }
}

// Uso: sistema de tickets de soporte
interface Ticket { id: string; subject: string; }

const ticketQueue = new PriorityQueue<Ticket>();
ticketQueue.enqueue({ id: "T1", subject: "Question" }, 1);   // Baja
ticketQueue.enqueue({ id: "T2", subject: "Bug" }, 3);         // Alta
ticketQueue.enqueue({ id: "T3", subject: "Feature" }, 2);     // Media
ticketQueue.enqueue({ id: "T4", subject: "Outage" }, 5);      // Crítica

console.log(ticketQueue.dequeue()?.id); // T4 (Outage, prioridad 5)
console.log(ticketQueue.dequeue()?.id); // T2 (Bug, prioridad 3)
console.log(ticketQueue.dequeue()?.id); // T3 (Feature, prioridad 2)
console.log(ticketQueue.dequeue()?.id); // T1 (Question, prioridad 1)
```

## Explicación

Las colas de prioridad usan una **estructura de datos heap** (o sorted set) para mantener el ordenamiento:

- **Inserción:** Las tareas llegan con un valor de prioridad asignado. Se colocan en el heap segun la prioridad, no el
  tiempo de llegada.
- **Extracción:** El worker siempre toma el elemento en la cima del heap — el de mayor prioridad. Si varios elementos
  comparten la misma prioridad, el orden secundario (timestamp) asegura equidad.
- **Equidad dentro de la prioridad:** Las tareas con la misma prioridad se procesan en orden FIFO.

## Variantes

| Variante | Mecanismo | Ideal Para |
| ---------- | ----------- | ------------ |
| Heap binario | Heap en array en memoria | Programación de tareas de un solo proceso, alto throughput |
| Sorted sets de Redis | Estructura ordenada externa | Workers distribuidos, cola persistente |
| Fair queuing ponderado | Asignación de ancho de banda proporcional | Control de tráfico de red, rate limiting de APIs |
| Cola de retroalimentacion multinivel | Ajuste live de prioridad | Programación de procesos de sistema operativo |
| Basado en plazos | Primero el plazo más cercano | Sistemas en tiempo real, procesamiento guiado por SLA |

## Mejores Prácticas

- **Prevenir el hambre de tareas de baja prioridad.** Estas tareas deben ejecutarse eventualmente: implementar
  envejecimiento (aumentar la prioridad con el tiempo) o una cuota mínima.
- **Mantener los niveles de prioridad limitados.** Demasiados niveles (más de 20) hacen que el sistema sea difícil de
  razonar y no mejoran el throughput. Con 3-5 niveles alcanza.
- **Documentar las asignaciones de prioridad.** Dejar claro qué se considera CRÍTICO versus ALTO para que los equipos no
  pongan todo en la máxima prioridad.
- **Monitorear la profundidad de la cola por prioridad.** Un backlog creciente de tareas de ALTA prioridad señala un
  problema de capacidad, no solo descuido de las de BAJA.
- **Considerar la apropiación.** Si llega una tarea CRÍTICA mientras se ejecuta una de BAJA prioridad, ¿debería pausarse
  la de BAJA?

## Errores Comunes

- **Todo es de ALTA prioridad.** Cuando todo es de alta prioridad, la cola degenera en FIFO y el sistema pierde su
  valor.
- **Ignorar el hambre de tareas.** Una cola llena de tareas de ALTA y CRÍTICA prioridad puede nunca procesar las de
  BACKGROUND. Usar envejecimiento o cupos de tiempo.
- **Cálculos de prioridad complejos.** Si calcular la prioridad toma más que procesar la tarea, se agregó más carga que
  beneficio.
- **Falta de visibilidad.** Sin métricas que muestren la profundidad de la cola por prioridad, los operadores no pueden
  saber si el sistema se comporta como se espera.
- **Prioridades codificadas en duro.** Las prioridades de negocio cambian: hacer la asignación de prioridad configurable.

## Ejemplos del Mundo Real

### Kubernetes

Kubernetes usa una cola de prioridad cuando programa pods. Los pods con mayor `priorityClassName` se programan antes
que los de menor prioridad. Si no se puede programar un pod de mayor prioridad, el scheduler puede apropiarse (evictar)
pods de menor prioridad para hacer lugar.

### RabbitMQ Priority Queue

RabbitMQ soporta colas de prioridad mediante el argumento `x-max-priority`, así los mensajes pueden adelantarse. Los
mensajes de mayor prioridad se entregan antes que los de menor prioridad dentro de la misma cola, hasta el nivel máximo
configurado.

### AWS Lambda

Los mapeos de fuentes de eventos de SQS respetan la prioridad mediante colas separadas. Las organizaciones usan varias
colas (crítica, normal, background) con diferentes asignaciones de concurrencia de Lambda para lograr procesamiento
basado en prioridad.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre una cola de prioridad y fair queuing ponderado?

Una cola de prioridad siempre toma el ítem de mayor prioridad primero. El fair queuing ponderado, en cambio, asigna una
porción proporcional de recursos a cada clase de prioridad, así las de menor prioridad no mueren de hambre.

### ¿Cómo evito que las tareas de baja prioridad mueran de hambre?

Usa envejecimiento de tareas: aumenta la prioridad a medida que esperan. También puedes asignar franjas de tiempo fijas
a cada nivel o pasar a fair queuing en lugar de prioridad estricta.

### ¿Puedo cambiar la prioridad de una tarea después del envío?

Sí, pero tienes que quitarla primero. Actualiza la prioridad y vuélvela a insertar. En Redis es un `zrem` seguido de un
`zadd`. En `PriorityBlockingQueue` de Java, remuévela y vuélvela a ofrecer; la cola no se reordena sola.

### ¿Las colas de prioridad son justas?

Las colas de prioridad estrictas no son justas para las tareas de baja prioridad. Si importa la equidad, agrega
envejecimiento, limita la apropiación o pasa a un modelo de asignación proporcional.

### ¿Debo usar una cola de prioridad o varias?

Una sola cola es más simple, pero puede convertirse en un cuello de botella. Varias colas — una por prioridad con workers
separados — escalan y aíslan mejor, pero agregan complejidad operativa.

### ¿Cuándo elijo una cola de prioridad en lugar de una FIFO?

Usa una cola de prioridad cuando los elementos tengan distinta urgencia: tickets críticos antes que preguntas, jobs de
alto valor antes que batch. Usa una cola FIFO cuando el orden de llegada importe: pedidos, mensajes, logs de
transacciones. La cola de prioridad reordena por urgencia; FIFO conserva el orden de llegada. Para sistemas de soporte,
una cola de prioridad. Para procesamiento de transacciones, FIFO. Para el scheduling de un SO, una cola de prioridad por
prioridad de procesos.
