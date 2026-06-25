---
contentType: patterns
slug: priority-queue-pattern
title: "Priority Queue Pattern"
description: "Process tasks based on priority rather than arrival order, ensuring high-priority work gets resources before lower-priority tasks even if it arrived later."
metaDescription: "Learn the Priority Queue Pattern for task scheduling by priority. Examples in Python, Java, and JavaScript with heaps, Redis sorted sets, and weighted fair queuing."
difficulty: intermediate
topics:
  - design
  - architecture
  - concurrency
tags:
  - priority-queue
  - pattern
  - design-pattern
  - scheduling
  - concurrency
  - heap
  - queue
relatedResources:
  - /patterns/design/queue-based-load-leveling-pattern
  - /patterns/design/scheduler-agent-supervisor-pattern
  - /patterns/design/throttling-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Priority Queue Pattern for task scheduling by priority. Examples in Python, Java, and JavaScript with heaps, Redis sorted sets, and weighted fair queuing."
  keywords:
    - priority queue
    - design pattern
    - scheduling
    - concurrency
    - heap
    - task priority
    - fair queuing
---

# Priority Queue Pattern

## Overview

The Priority Queue Pattern arranges tasks or messages so that higher-priority items are processed before lower-priority ones, regardless of arrival order. Instead of the traditional FIFO (first-in, first-out) queue where tasks are handled in submission order, a priority queue orders tasks by importance, urgency, or business value.

This pattern is essential when resources are constrained and not all tasks can be processed immediately. It ensures critical operations — fraud detection, VIP customer requests, system alerts — receive immediate attention while routine background work waits.

Priority queues are typically implemented as binary heaps, balanced trees, or sorted sets where insertion is O(log n) and extraction of the highest-priority element is O(log n) or O(1).

## When to Use

- Limited processing capacity with heterogeneous task importance
- VIP or tiered customer experiences where premium users get faster service
- Incident response systems where critical alerts must precede warnings
- Job scheduling where deadlines or SLAs determine execution order
- Background task processors with mixed workloads (email, reports, exports)
- Multi-tenant systems where higher-paying tenants get priority

## When to Avoid

- All tasks have equal importance — a regular FIFO queue is simpler and fairer
- Starvation of low-priority tasks is unacceptable — consider aging or fair scheduling
- The cost of determining priority exceeds the cost of processing the task
- Strict FIFO ordering is a business requirement (e.g., financial transaction logs)
- Very small task volumes where ordering provides no benefit

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

## Explanation

Priority queues use a **heap data structure** (or sorted set) to maintain ordering:

- **Insertion:** Tasks arrive with an assigned priority value. They are placed in the heap according to priority, not arrival time.
- **Extraction:** The worker always takes the element at the top of the heap — the highest priority item. If multiple items share the same priority, secondary ordering (timestamp) ensures fairness.
- **Fairness within priority:** Tasks with the same priority are processed in FIFO order, preventing starvation of newer same-priority tasks.

The priority assignment itself is domain-specific: it can be based on customer tier, SLA deadlines, severity levels, or dynamic load calculations.

## Variants

| Variant | Mechanism | Best For |
|---------|-----------|----------|
| **Binary heap** | In-memory array heap | Single-process, high-throughput task scheduling |
| **Redis sorted sets** | External sorted structure | Distributed workers, persistent queue |
| **Weighted fair queuing** | Proportional bandwidth allocation | Network traffic shaping, API rate limiting |
| **Multi-level feedback queue** | Dynamic priority adjustment | Operating system process scheduling |
| **Deadline-based** | Earliest deadline first | Real-time systems, SLA-driven processing |

## Best Practices

- **Prevent starvation.** Low-priority tasks should eventually run — implement aging (increasing priority over time) or a minimum quota.
- **Keep priority levels limited.** Too many levels (20+) make the system hard to reason about and don't improve throughput. 3-5 levels suffice.
- **Document priority assignments.** Make it clear what gets CRITICAL vs HIGH priority so teams don't default everything to maximum.
- **Monitor queue depth by priority.** A growing backlog of HIGH priority tasks signals a capacity problem, not just LOW priority neglect.
- **Consider preemption.** If a CRITICAL task arrives while a LOW task is running, should the LOW task be paused?

## Common Mistakes

- **Everything is HIGH priority.** When everything is high priority, the queue degenerates to FIFO and the system loses its value.
- **Ignoring starvation.** A queue full of HIGH and CRITICAL tasks may never process BACKGROUND tasks. Use aging or time quotas.
- **Complex priority calculations.** If computing priority takes longer than the task itself, you've introduced more overhead than benefit.
- **No visibility.** Without metrics showing queue depth by priority, operators can't tell if the system is behaving as intended.
- **Hardcoded priorities.** Business priorities change — make the priority assignment configurable.

## Real-World Examples

### Kubernetes

Kubernetes uses priority queues for pod scheduling. Pods with higher `priorityClassName` are scheduled before lower-priority pods. If a higher-priority pod cannot be scheduled, the scheduler may preempt (evict) lower-priority pods to make room.

### RabbitMQ Priority Queue

RabbitMQ supports priority queues via the `x-max-priority` argument. Messages with higher priority are delivered before lower-priority messages within the same queue, up to the configured maximum priority level.

### AWS Lambda

Lambda's event source mappings from SQS queues respect priority through separate queues. Organizations use multiple queues (critical, normal, background) with different Lambda concurrency allocations to achieve priority-based processing.

## Frequently Asked Questions

**Q: What's the difference between a priority queue and weighted fair queuing?**
A: A priority queue always processes the highest-priority item first. Weighted fair queuing allocates a proportional share of resources to each priority class, preventing starvation by guaranteeing minimum throughput to lower priorities.

**Q: How do I prevent low-priority tasks from starving?**
A: Use task aging (increase priority over time), allocate fixed time slices per priority level, or switch to weighted fair queuing instead of strict priority.

**Q: Can I change a task's priority after submission?**
A: Yes — remove the task from the queue, update its priority, and re-insert. In Redis sorted sets, this is a `zrem` followed by `zadd`. In Java's PriorityBlockingQueue, you must remove and re-offer since the queue doesn't auto-reorder.

**Q: Are priority queues fair?**
A: Strict priority queues are not fair to lower-priority tasks. Fairness requires either aging, preemption limits, or switching to a proportional allocation model.

**Q: Should I use one priority queue or multiple queues?**
A: One priority queue is simpler but may have contention. Multiple queues (one per priority) with separate worker pools allow independent scaling and isolation, but add operational complexity.
