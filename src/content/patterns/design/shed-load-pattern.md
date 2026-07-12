---



contentType: patterns
slug: shed-load-pattern
title: "Shed Load Pattern"
description: "Drop requests proactively under extreme load to protect the system. Reject excess traffic before it consumes resources and causes cascading failures."
metaDescription: "Drop requests proactively under extreme load to protect the system. Reject excess traffic before it consumes resources and causes cascading failures."
difficulty: intermediate
topics:
  - architecture
  - performance
tags:
  - shed-load
  - pattern
  - design-pattern
  - resilience
  - load-shedding
  - backpressure
  - overload-protection
relatedResources:
  - /patterns/throttling-pattern
  - /patterns/circuit-breaker-pattern
  - /patterns/graceful-degradation-pattern
  - /patterns/geode-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Drop requests proactively under extreme load to protect the system. Reject excess traffic before it consumes resources and causes cascading failures."
  keywords:
    - shed load pattern
    - load shedding
    - design pattern
    - resilience pattern
    - overload protection
    - backpressure
    - drop requests



---

# Shed Load Pattern

## Overview

When a system receives more traffic than it can process, it enters a death spiral: queues grow, latency spikes, memory exhausts, and the system crashes. Load shedding stops this spiral by proactively rejecting excess requests before they consume resources. Instead of accepting everything and failing slowly, the system accepts only what it can handle and rejects the rest immediately with a clear error (typically HTTP 503).

The pattern monitors a load metric (queue depth, CPU usage, memory, active connections). When the metric crosses a threshold, new requests are rejected at the edge before entering the processing pipeline. Existing requests continue processing. When load drops below the threshold, the system resumes accepting new requests.

## When to Use


- For alternatives, see [Back-Pressure Pattern](/patterns/back-pressure-pattern/).

Use the Shed Load Pattern when:
- Traffic spikes can exceed your system capacity (flash sales, viral events, DDoS)
- Processing a request consumes significant resources (CPU, memory, database connections)
- Failing slowly is worse than failing fast (timeout cascades, resource exhaustion)
- You need to protect critical paths during overload
- Examples: API gateways, payment processors, real-time streaming systems, batch job queues

## Solution

### Python

```python
from dataclasses import dataclass, field
from typing import Callable, Optional
from enum import Enum
import time
import threading

class LoadStatus(Enum):
    ACCEPTED = "accepted"
    SHED = "shed"

@dataclass
class LoadMetrics:
    active_requests: int = 0
    queue_depth: int = 0
    cpu_usage: float = 0.0
    memory_usage: float = 0.0

    @property
    def load_score(self) -> float:
        return max(self.cpu_usage, self.memory_usage, self.queue_depth / 1000.0)

class LoadShedder:
    def __init__(self, max_concurrent: int = 100, cpu_threshold: float = 0.85,
                 memory_threshold: float = 0.90, queue_threshold: int = 500):
        self.max_concurrent = max_concurrent
        self.cpu_threshold = cpu_threshold
        self.memory_threshold = memory_threshold
        self.queue_threshold = queue_threshold
        self._active = 0
        self._lock = threading.Lock()
        self._shed_count = 0
        self._accept_count = 0

    def _get_metrics(self) -> LoadMetrics:
        import psutil
        cpu = psutil.cpu_percent(interval=0.1) / 100.0
        mem = psutil.virtual_memory().percent / 100.0
        return LoadMetrics(
            active_requests=self._active,
            queue_depth=self._active * 10,
            cpu_usage=cpu,
            memory_usage=mem,
        )

    def should_shed(self) -> bool:
        metrics = self._get_metrics()
        if self._active >= self.max_concurrent:
            return True
        if metrics.cpu_usage >= self.cpu_threshold:
            return True
        if metrics.memory_usage >= self.memory_threshold:
            return True
        if metrics.queue_depth >= self.queue_threshold:
            return True
        return False

    def execute(self, request_id: str, handler: Callable) -> dict:
        with self._lock:
            if self.should_shed():
                self._shed_count += 1
                return {
                    "request_id": request_id,
                    "status": LoadStatus.SHED.value,
                    "message": "Service overloaded, please retry later",
                    "http_status": 503,
                }
            self._active += 1
            self._accept_count += 1

        try:
            result = handler(request_id)
            return {"request_id": request_id, "status": LoadStatus.ACCEPTED.value,
                    "result": result, "http_status": 200}
        finally:
            with self._lock:
                self._active -= 1

    def stats(self) -> dict:
        total = self._accept_count + self._shed_count
        return {
            "accepted": self._accept_count,
            "shed": self._shed_count,
            "active": self._active,
            "shed_rate": self._shed_count / max(total, 1),
        }

# Usage
shedder = LoadShedder(max_concurrent=3, cpu_threshold=0.95, memory_threshold=0.95, queue_threshold=10000)

def mock_handler(req_id: str) -> str:
    time.sleep(0.1)
    return f"processed-{req_id}"

import concurrent.futures

def send_request(i: int) -> dict:
    return shedder.execute(f"req-{i}", mock_handler)

with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
    results = list(pool.map(send_request, range(10)))

for r in results:
    print(f"  {r['request_id']}: {r['status']} (HTTP {r.get('http_status', 500)})")

print(f"\nStats: {shedder.stats()}")
```

### JavaScript

```javascript
class LoadShedder {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 100;
    this.cpuThreshold = options.cpuThreshold ?? 0.85;
    this.memoryThreshold = options.memoryThreshold ?? 0.90;
    this.queueThreshold = options.queueThreshold ?? 500;
    this.active = 0;
    this.shedCount = 0;
    this.acceptCount = 0;
  }

  _getMetrics() {
    const mem = process.memoryUsage();
    const memUsage = mem.rss / (mem.rss + 1024 * 1024 * 512);
    return {
      activeRequests: this.active,
      queueDepth: this.active * 10,
      cpuUsage: Math.min(this.active / this.maxConcurrent, 1.0),
      memoryUsage: memUsage,
    };
  }

  shouldShed() {
    const m = this._getMetrics();
    if (this.active >= this.maxConcurrent) return true;
    if (m.cpuUsage >= this.cpuThreshold) return true;
    if (m.memoryUsage >= this.memoryThreshold) return true;
    if (m.queueDepth >= this.queueThreshold) return true;
    return false;
  }

  async execute(requestId, handler) {
    if (this.shouldShed()) {
      this.shedCount++;
      return { requestId, status: "shed", message: "Service overloaded", httpStatus: 503 };
    }
    this.active++;
    this.acceptCount++;
    try {
      const result = await handler(requestId);
      return { requestId, status: "accepted", result, httpStatus: 200 };
    } finally {
      this.active--;
    }
  }

  stats() {
    const total = this.acceptCount + this.shedCount;
    return {
      accepted: this.acceptCount, shed: this.shedCount,
      active: this.active, shedRate: this.shedCount / Math.max(total, 1),
    };
  }
}

// Usage
const shedder = new LoadShedder({ maxConcurrent: 3, cpuThreshold: 0.95, memoryThreshold: 0.95 });

async function mockHandler(reqId) {
  await new Promise(r => setTimeout(r, 100));
  return `processed-${reqId}`;
}

(async () => {
  const requests = Array.from({ length: 10 }, (_, i) => shedder.execute(`req-${i}`, mockHandler));
  const results = await Promise.all(requests);
  for (const r of results) {
    console.log(`  ${r.requestId}: ${r.status} (HTTP ${r.httpStatus})`);
  }
  console.log(`\nStats:`, shedder.stats());
})();
```

### Java

```java
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class LoadShedder {

    private final int maxConcurrent;
    private final double cpuThreshold;
    private final double memoryThreshold;
    private final int queueThreshold;
    private final AtomicInteger active = new AtomicInteger(0);
    private final AtomicInteger shedCount = new AtomicInteger(0);
    private final AtomicInteger acceptCount = new AtomicInteger(0);

    public LoadShedder(int maxConcurrent, double cpuThreshold, double memoryThreshold, int queueThreshold) {
        this.maxConcurrent = maxConcurrent;
        this.cpuThreshold = cpuThreshold;
        this.memoryThreshold = memoryThreshold;
        this.queueThreshold = queueThreshold;
    }

    private boolean shouldShed() {
        if (active.get() >= maxConcurrent) return true;
        double cpuLoad = (double) active.get() / maxConcurrent;
        if (cpuLoad >= cpuThreshold) return true;
        long freeMem = Runtime.getRuntime().freeMemory();
        long totalMem = Runtime.getRuntime().totalMemory();
        double memUsage = 1.0 - ((double) freeMem / totalMem);
        if (memUsage >= memoryThreshold) return true;
        if (active.get() * 10 >= queueThreshold) return true;
        return false;
    }

    public String execute(String requestId, java.util.function.Function<String, String> handler) {
        if (shouldShed()) {
            shedCount.incrementAndGet();
            return String.format("{\"requestId\":\"%s\",\"status\":\"shed\",\"httpStatus\":503}", requestId);
        }
        active.incrementAndGet();
        acceptCount.incrementAndGet();
        try {
            String result = handler.apply(requestId);
            return String.format("{\"requestId\":\"%s\",\"status\":\"accepted\",\"result\":\"%s\",\"httpStatus\":200}",
                requestId, result);
        } finally {
            active.decrementAndGet();
        }
    }

    public String stats() {
        int total = acceptCount.get() + shedCount.get();
        return String.format("accepted=%d, shed=%d, active=%d, shedRate=%.2f",
            acceptCount.get(), shedCount.get(), active.get(), (double) shedCount.get() / Math.max(total, 1));
    }

    public static void main(String[] args) throws Exception {
        var shedder = new LoadShedder(3, 0.95, 0.95, 10000);
        var executor = Executors.newFixedThreadPool(10);
        var futures = new java.util.ArrayList<Future<String>>();

        for (int i = 0; i < 10; i++) {
            final int idx = i;
            futures.add(executor.submit(() -> shedder.execute("req-" + idx, req -> {
                try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                return "processed-" + req;
            })));
        }

        for (Future<String> f : futures) {
            System.out.println("  " + f.get());
        }
        System.out.println("\nStats: " + shedder.stats());
        executor.shutdown();
    }
}
```

## Explanation

The shedder sits at the entry point of the system and makes a go/no-go decision for each request:

1. **Metric collection**: Before accepting a request, the shedder checks current load metrics. These include active request count, CPU usage, memory pressure, and queue depth.
2. **Threshold check**: If any metric exceeds its threshold, the request is shed immediately. The caller receives a 503 with a retry-after header, not a timeout after 30 seconds of waiting.
3. **Accept and track**: If the system has capacity, the request is accepted and the active counter increments. The counter decrements when the request completes, freeing capacity for the next one.

The key insight is that shedding is proactive, not reactive. The system does not wait until it crashes to start rejecting. It rejects before resource exhaustion, keeping the system responsive for accepted requests.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Priority-based shedding** | Shed low-priority requests first, keep premium users | Tiered SLAs, freemium APIs |
| **Gradual shedding** | Shed a percentage of requests as load increases | Smoother degradation than a hard cutoff |
| **Queue-based shedding** | Shed when the request queue exceeds a depth limit | Worker queue systems, message processors |
| **Time-based shedding** | Shed during predicted peak hours | Known traffic patterns (sales, events) |

## What Works

- **Shed at the edge** (API gateway, load balancer) before requests enter internal services
- **Return 503 with Retry-After** so clients know to back off temporarily
- **Monitor shed rate** as a key metric; high shed rate means you need more capacity
- **Shed low-priority traffic first** to protect critical paths
- **Keep shed logic fast** so the shedder itself does not become a bottleneck
- **Combine with autoscaling** so shedding is temporary while capacity catches up

## Common Mistakes

- Shedding too late, after resources are already exhausted
- Not tracking active requests, so the shedder does not know current load
- Shedding without returning a useful error, leaving clients confused
- Shed logic that is too expensive, adding latency to every request
- Not differentiating between priority levels, shedding critical and non-critical traffic equally
- Shedding at the application layer instead of the edge, wasting network and processing resources

## Frequently Asked Questions

**Q: How is load shedding different from rate limiting (throttling)?**
A: Rate limiting caps requests per client over time (100 req/min). Load shedding caps total system load based on health metrics (CPU, queue depth). Rate limiting protects against individual clients. Load shedding protects the system as a whole.

**Q: What HTTP status should shed requests return?**
A: 503 Service Unavailable with a `Retry-After` header. This tells clients the failure is temporary and when to retry. Do not return 500, which implies a bug.

**Q: Should I shed synchronously or asynchronously?**
A: Synchronously at the edge. The shed check should take microseconds. If the check itself is slow, you have a different problem.

**Q: How do I calculate the right thresholds?**
A: Load test your system to find its breaking point. Set thresholds at 80-90% of that point. For example, if the system handles 1000 concurrent requests before degrading, set `max_concurrent` to 850.
