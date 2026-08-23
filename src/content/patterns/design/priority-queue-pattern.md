---
contentType: patterns
slug: priority-queue-pattern
title: "Priority Queue Pattern: Schedule Tasks by Urgency"
description: "Use the Priority Queue pattern to process high-priority work first. See Python, Java, and JavaScript examples with heaps and Redis."
metaDescription: "Master the Priority Queue pattern: schedule tasks by urgency with Python, Java, and JavaScript examples using heaps and Redis."
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
  metaDescription: "Master the Priority Queue pattern: schedule tasks by urgency with Python, Java, and JavaScript examples using heaps and Redis."
  keywords:
    - priority queue
    - design pattern
    - scheduling
    - concurrency
    - heap
    - task priority
    - fair queuing
---
## Overview

A priority queue puts tasks or messages in an order where higher-priority items are handled before
lower-priority ones, no matter when they arrived. Instead of the traditional FIFO (first-in, first-out) queue where tasks
are handled in submission order, a priority queue orders tasks by importance, urgency, or business value.

You reach for a priority queue when resources are tight and you can't process everything at once. It routes
critical operations — fraud detection, VIP customer requests, system alerts — to the front of the line, while routine
background work waits.

Priority queues usually use binary heaps, balanced trees, or sorted sets: insertion is O(log n),
and pulling the highest-priority item is O(log n) or O(1).

## When to Use

- Limited processing capacity with heterogeneous task importance
- VIP or tiered customer experiences where premium users get faster service
- Incident response systems where critical alerts must precede warnings
- Job scheduling where deadlines or SLAs determine execution order
- Background task processors with mixed workloads (email, reports, exports)
- Multi-tenant systems where higher-paying tenants get priority

For related strategies, see the [Queue-Based Load Leveling pattern](/patterns/queue-based-load-leveling-pattern/) and
the [Throttling pattern](/patterns/throttling-pattern/).

## When to Avoid

- All tasks have equal importance — a regular FIFO queue is simpler and fairer
- Starvation of low-priority tasks is unacceptable — consider aging or fair scheduling
- The cost of determining priority exceeds the cost of processing the task
- Strict FIFO ordering is a business requirement (e.g., financial transaction logs)
- Very small task volumes where ordering gives no benefit

## Solution

### Python (Heap-Based Priority Queue)

```python
import heapq
import time
from dataclasses import dataclass, field
from typing import List, Callable
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
    handler: Callable = field(compare=False, default=None)

class PriorityQueueProcessor:
    """Process tasks by priority with fairness within priority levels"""

    def __init__(self, num_workers=4):
        self.heap = []
        self.lock = threading.Lock()
        self.workers = []
        self.running = False
        self.num_workers = num_workers

    def submit(self, task_id: str, payload: dict,
               priority: Priority = Priority.NORMAL,
               handler: Callable = None):
        """Submit a task with a given priority"""
        task = Task(
            priority=priority.value,
            timestamp=time.time(),
            task_id=task_id,
            payload=payload,
            handler=handler
        )
        with self.lock:
            heapq.heappush(self.heap, task)

    def _process_next(self):
        """Worker thread: get highest priority task and process it"""
        with self.lock:
            if not self.heap:
                return None
            task = heapq.heappop(self.heap)

        try:
            if task.handler:
                task.handler(task.payload)
            else:
                self._default_handler(task)
            print(f"Completed: {task.task_id} (priority {task.priority})")
        except Exception as e:
            print(f"Failed {task.task_id}: {e}")

    def _default_handler(self, task: Task):
        """Default processing logic"""
        print(f"Processing {task.task_id}: {task.payload}")
        time.sleep(0.1)  # Simulate work

    def _worker_loop(self):
        while self.running:
            self._process_next()
            time.sleep(0.01)

    def start(self):
        self.running = True
        for _ in range(self.num_workers):
            t = threading.Thread(target=self._worker_loop, daemon=True)
            t.start()
            self.workers.append(t)

    def stop(self):
        self.running = False
        for w in self.workers:
            w.join(timeout=2)

# Usage
processor = PriorityQueueProcessor(num_workers=2)
processor.start()

processor.submit("email-batch", {"type": "newsletter"}, Priority.LOW)
processor.submit("fraud-alert", {"user_id": 12345, "risk_score": 0.95}, Priority.CRITICAL)
processor.submit("report-gen", {"format": "pdf"}, Priority.NORMAL)
processor.submit("vip-onboarding", {"customer_id": "VIP-001"}, Priority.HIGH)

time.sleep(2)
processor.stop()
```

### Java (PriorityBlockingQueue with Thread Pool)

```java
import java.util.Comparator;
import java.util.concurrent.*;

public class PriorityQueueScheduler {

    private final PriorityBlockingQueue<PriorityTask> queue;
    private final ExecutorService executor;

    public PriorityQueueScheduler(int numWorkers) {
        // Comparator: lower priority value = higher priority, then FIFO within same priority
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

    private void processTask(PriorityTask task) {
        System.out.printf("Processing [%s] priority=%d: %s%n",
            task.getTaskId(), task.getPriority(), task.getPayload());

        try {
            task.getHandler().run();
        } catch (Exception e) {
            System.err.println("Task failed: " + task.getTaskId() + " - " + e.getMessage());
        }
    }

    public void submit(String taskId, Runnable handler, Priority priority) {
        queue.offer(new PriorityTask(taskId, priority.value, handler));
    }

    public void shutdown() {
        executor.shutdown();
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

        PriorityTask(String taskId, int priority, Runnable handler) {
            this.taskId = taskId;
            this.priority = priority;
            this.handler = handler;
        }

        // getters...
        public int getPriority() { return priority; }
        public long getTimestamp() { return timestamp; }
        public String getTaskId() { return taskId; }
        public Runnable getHandler() { return handler; }
    }

    public static void main(String[] args) {
        PriorityQueueScheduler scheduler = new PriorityQueueScheduler(2);

        scheduler.submit("report-gen", () -> System.out.println("Generating report..."), Priority.NORMAL);
        scheduler.submit("fraud-check", () -> System.out.println("Checking fraud..."), Priority.CRITICAL);
        scheduler.submit("data-cleanup", () -> System.out.println("Cleaning up..."), Priority.BACKGROUND);
        scheduler.submit("vip-request", () -> System.out.println("VIP request..."), Priority.HIGH);

        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        scheduler.shutdown();
    }
}
```

### JavaScript (Redis Sorted Set Priority Queue)

```javascript
const Redis = require('ioredis');

class RedisPriorityQueue {
    constructor(redis, queueName) {
        this.redis = redis;
        this.queueName = queueName;
    }

    async enqueue(task, priority = 3) {
        // Lower score = higher priority; timestamp breaks ties for FIFO within priority
        const score = priority * 1000000000 + Date.now();
        const taskJson = JSON.stringify(task);

        await this.redis.zadd(this.queueName, score, taskJson);
    }

    async dequeue() {
        // Get and remove the lowest score item
        const result = await this.redis.zpopmin(this.queueName, 1);
        if (result.length === 0) return null;

        const [taskJson, score] = result;
        return {
            task: JSON.parse(taskJson),
            score: parseFloat(score)
        };
    }

    async peek() {
        const result = await this.redis.zrange(this.queueName, 0, 0, 'WITHSCORES');
        if (result.length === 0) return null;
        return { task: JSON.parse(result[0]), score: parseFloat(result[1]) };
    }

    async size() {
        return await this.redis.zcard(this.queueName);
    }
}

// Worker implementation
class PriorityWorker {
    constructor(redis, queueName, options = {}) {
        this.queue = new RedisPriorityQueue(redis, queueName);
        this.handlers = new Map();
        this.running = false;
        this.pollInterval = options.pollInterval || 100;
        this.concurrency = options.concurrency || 1;
    }

    registerHandler(taskType, handler) {
        this.handlers.set(taskType, handler);
    }

    async start() {
        this.running = true;
        const workers = Array(this.concurrency).fill().map(() => this.workerLoop());
        await Promise.all(workers);
    }

    async workerLoop() {
        while (this.running) {
            const item = await this.queue.dequeue();
            if (!item) {
                await this.sleep(this.pollInterval);
                continue;
            }

            const { task } = item;
            const handler = this.handlers.get(task.type);

            if (handler) {
                try {
                    await handler(task.payload);
                } catch (err) {
                    console.error(`Task ${task.id} failed:`, err);
                }
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop() {
        this.running = false;
    }
}

// Usage
const redis = new Redis();
const worker = new PriorityWorker(redis, 'task-queue', { concurrency: 2 });

worker.registerHandler('email', async (payload) => {
    console.log(`Sending email to ${payload.to}`);
});

worker.registerHandler('process-payment', async (payload) => {
    console.log(`Processing payment ${payload.orderId}`);
});

// Submit tasks with priorities (1 = highest)
async function submitTasks() {
    const queue = new RedisPriorityQueue(redis, 'task-queue');
    await queue.enqueue({ id: '1', type: 'email', payload: { to: 'user@example.com' } }, 4);
    await queue.enqueue({ id: '2', type: 'process-payment', payload: { orderId: 'ORD-123' } }, 1);
    await queue.enqueue({ id: '3', type: 'email', payload: { to: 'vip@example.com' } }, 2);
}

submitTasks().then(() => worker.start());
```

### TypeScript (Generic Heap Priority Queue)

```typescript
// Priority Queue: highest-priority items are processed first
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

// Usage: support ticket system
interface Ticket { id: string; subject: string; }

const ticketQueue = new PriorityQueue<Ticket>();
ticketQueue.enqueue({ id: "T1", subject: "Question" }, 1);   // Low
ticketQueue.enqueue({ id: "T2", subject: "Bug" }, 3);         // High
ticketQueue.enqueue({ id: "T3", subject: "Feature" }, 2);     // Medium
ticketQueue.enqueue({ id: "T4", subject: "Outage" }, 5);      // Critical

console.log(ticketQueue.dequeue()?.id); // T4 (Outage, priority 5)
console.log(ticketQueue.dequeue()?.id); // T2 (Bug, priority 3)
console.log(ticketQueue.dequeue()?.id); // T3 (Feature, priority 2)
console.log(ticketQueue.dequeue()?.id); // T1 (Question, priority 1)
```

## Explanation

Priority queues use a **heap data structure** (or sorted set) to keep things ordered. When a task arrives, it goes into
the heap by priority, not by arrival time. The worker pulls the top element — the highest-priority item. If several items
share the same priority, the timestamp keeps things fair and stops newer same-priority tasks from starving.

How you assign priority is up to you: customer tier, SLA deadlines, severity levels, or live load.

## Variants

| Variant | Mechanism | Best For |
| --------- | ----------- | ---------- |
| **Binary heap** | In-memory array heap | Single-process, high-throughput task scheduling |
| **Redis sorted sets** | External sorted structure | Distributed workers, persistent queue |
| **Weighted fair queuing** | Proportional bandwidth allocation | Network traffic shaping, API rate limiting |
| **Multi-level feedback queue** | Live priority adjustment | Operating system process scheduling |
| **Deadline-based** | Earliest deadline first | Real-time systems, SLA-driven processing |

## Best Practices

- **Prevent starvation.** Low-priority tasks should eventually run — implement aging (increasing priority over time) or
  a minimum quota.
- **Keep priority levels small.** Too many levels (20+) make the system hard to reason about and don't improve
  throughput. Three to five levels are usually enough.
- **Document priority assignments.** Make it clear what gets CRITICAL vs HIGH priority so teams don't default everything
  to maximum.
- **Monitor queue depth by priority.** A growing backlog of HIGH priority tasks signals a capacity problem, not just LOW
  priority neglect.
- **Consider preemption.** If a CRITICAL task arrives while a LOW task is running, should the LOW task be paused?

## Common Mistakes

- **Everything is HIGH priority.** When every task is marked high priority, the queue becomes FIFO
  and the whole point is lost.
- **Ignoring starvation.** A queue full of HIGH and CRITICAL tasks may never process BACKGROUND tasks. Use aging or time
  quotas.
- **Complex priority calculations.** If computing priority takes longer than the task itself, the overhead
  outweighs the value.
- **No metrics.** Without queue depth metrics by priority, you can't tell whether the system is behaving as expected.
- **Hardcoded priorities.** Business priorities change — make the priority assignment configurable.

## Real-World Examples

### Kubernetes

When Kubernetes schedules pods, it uses a priority queue: pods with a higher `priorityClassName` go first. If a
higher-priority pod can't be scheduled, the scheduler may preempt (evict) lower-priority pods to make room.

### RabbitMQ Priority Queue

RabbitMQ uses the `x-max-priority` argument so messages can skip ahead. Higher-priority messages are delivered before
lower-priority ones within the same queue, up to the configured maximum level.

### AWS Lambda

Lambda's event source mappings from SQS queues respect priority through separate queues. Organizations use several
queues (critical, normal, background) with different Lambda concurrency allocations to achieve priority-based
processing.

## FAQ

### What's the difference between a priority queue and weighted fair queuing?

A priority queue always grabs the highest-priority item first. Weighted fair queuing, on the other hand, gives each
priority class a proportional slice of resources, so lower priorities still get a guaranteed minimum and don't starve.

### How do I prevent low-priority tasks from starving?

Use task aging: bump the priority up as a task waits. You can also allocate fixed time slices to each level, or switch to
weighted fair queuing instead of strict priority.

### Can I change a task's priority after submission?

Yes, but remove it first. Then update the priority and put it back. In Redis that's a `zrem` followed by a `zadd`. In
Java's `PriorityBlockingQueue`, remove and re-offer; the queue won't reorder on its own.

### Are priority queues fair?

Strict priority queues aren't fair to lower-priority tasks. If fairness matters, add aging, limit preemption, or move to
a proportional allocation model.

### Should I use one priority queue or several?

One queue is simpler, but it can become a bottleneck. Several queues — one per priority with separate worker pools —
scale and isolate better, but add operational complexity.

### When should I choose a priority queue over a FIFO queue?

Use a priority queue when items have different urgency: critical tickets before questions, high-value jobs before batch
work. Use FIFO when arrival order matters: orders, messages, transaction logs. A priority queue reorders by urgency; FIFO
preserves arrival order. Support systems usually call for a priority queue. Transaction processing usually goes with FIFO.
OS scheduling uses a priority queue ordered by process priority.
