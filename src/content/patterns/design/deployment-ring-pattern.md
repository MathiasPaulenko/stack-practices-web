---


contentType: patterns
slug: deployment-ring-pattern
title: "Deployment Ring Pattern"
description: "Roll out changes progressively in rings of increasing size. Start with a small group, verify health, then expand to larger rings before full deployment."
metaDescription: "Roll out changes progressively in rings of increasing size. Start with a small group, verify health, then expand to larger rings before full deployment."
difficulty: intermediate
topics:
  - devops
  - architecture
tags:
  - deployment-ring
  - pattern
  - design-pattern
  - progressive-rollout
  - deployment-strategy
  - rings
  - canary
relatedResources:
  - /patterns/canary-release-pattern
  - /patterns/blue-green-deployment-pattern
  - /patterns/graceful-degradation-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Roll out changes progressively in rings of increasing size. Start with a small group, verify health, then expand to larger rings before full deployment."
  keywords:
    - deployment ring pattern
    - progressive rollout
    - design pattern
    - deployment strategy
    - ring deployment
    - canary rings
    - incremental deployment


---

# Deployment Ring Pattern

## Overview

The Deployment Ring Pattern rolls out a new version in concentric rings of increasing size. Ring 0 might be internal users (1%). Ring 1 is early adopters (5%). Ring 2 is a larger segment (25%). Ring 3 is everyone (100%). Between each ring, the system checks health metrics (error rate, latency, conversion rate). If metrics degrade, the rollout stops or rolls back. If metrics are stable, the next ring proceeds.

This pattern reduces blast radius. A bug that would affect all users in a full deployment only affects 1% in ring 0. By the time the rollout reaches 100%, the version has been validated across progressively larger and more diverse user groups.

## When to Use


- For alternatives, see [Blue-Green Deployment Pattern](/patterns/blue-green-deployment-pattern/).

Use the Deployment Ring Pattern when:
- You deploy changes that carry risk (new features, schema changes, infrastructure updates)
- You need to validate with real traffic before full rollout
- You want automatic rollback on health degradation
- Your user base is large enough to segment meaningfully
- Examples: SaaS platforms, API services, mobile app updates, microservice deployments

## Solution

### Python

```python
from dataclasses import dataclass, field
from typing import Callable, List, Optional, Dict
from enum import Enum
import time

class RingStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    ROLLED_BACK = "rolled_back"
    FAILED = "failed"

@dataclass
class Ring:
    ring_id: int
    name: str
    percentage: float
    status: RingStatus = RingStatus.PENDING
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    health_check_passed: bool = False

@dataclass
class HealthMetrics:
    error_rate: float
    p95_latency_ms: float
    success_rate: float

    def is_healthy(self, max_error_rate: float = 0.05, max_p95: float = 500) -> bool:
        return self.error_rate < max_error_rate and self.p95_latency_ms < max_p95

class RingDeployment:
    def __init__(self, version: str, rings: List[Ring],
                 health_check_fn: Callable[[], HealthMetrics],
                 max_error_rate: float = 0.05, max_p95: float = 500,
                 bake_time_seconds: float = 2.0):
        self.version = version
        self.rings = rings
        self.health_check_fn = health_check_fn
        self.max_error_rate = max_error_rate
        self.max_p95 = max_p95
        self.bake_time = bake_time_seconds
        self.current_ring_idx = 0

    def _deploy_to_ring(self, ring: Ring) -> bool:
        ring.status = RingStatus.ACTIVE
        ring.started_at = time.time()
        print(f"  Deploying v{self.version} to {ring.name} ({ring.percentage}% of users)")

        time.sleep(self.bake_time)

        metrics = self.health_check_fn()
        ring.health_check_passed = metrics.is_healthy(self.max_error_rate, self.max_p95)

        print(f"    Health: error_rate={metrics.error_rate:.2%}, p95={metrics.p95_latency_ms}ms, success={metrics.success_rate:.2%}")

        if ring.health_check_passed:
            ring.status = RingStatus.COMPLETED
            ring.completed_at = time.time()
            print(f"    PASS - Ring {ring.ring_id} completed")
            return True
        else:
            ring.status = RingStatus.FAILED
            print(f"    FAIL - Ring {ring.ring_id} failed health check, rolling back")
            return False

    def execute(self) -> Dict:
        print(f"\n=== Ring Deployment: v{self.version} ===")
        for i, ring in enumerate(self.rings):
            self.current_ring_idx = i
            success = self._deploy_to_ring(ring)
            if not success:
                self._rollback()
                return {"version": self.version, "status": "rolled_back",
                        "failed_ring": ring.ring_id, "rings_completed": i}
        print(f"\nAll rings completed. v{self.version} is live for 100% of users.")
        return {"version": self.version, "status": "completed",
                "rings_completed": len(self.rings)}

    def _rollback(self) -> None:
        for ring in self.rings:
            if ring.status == RingStatus.COMPLETED:
                ring.status = RingStatus.ROLLED_BACK
                print(f"  Rolling back ring {ring.ring_id} ({ring.name})")

# Usage
call_count = 0
def mock_health_check() -> HealthMetrics:
    global call_count
    call_count += 1
    if call_count == 3:
        return HealthMetrics(error_rate=0.08, p95_latency_ms=600, success_rate=0.92)
    return HealthMetrics(error_rate=0.01, p95_latency_ms=120, success_rate=0.99)

rings = [
    Ring(ring_id=0, name="internal", percentage=1.0),
    Ring(ring_id=1, name="early-adopters", percentage=5.0),
    Ring(ring_id=2, name="canary", percentage=25.0),
    Ring(ring_id=3, name="general", percentage=100.0),
]

deployment = RingDeployment(
    version="2.1.0", rings=rings, health_check_fn=mock_health_check,
    max_error_rate=0.05, max_p95=500, bake_time_seconds=0.5,
)

result = deployment.execute()
print(f"\nResult: {result}")
```

### JavaScript

```javascript
class RingDeployment {
  constructor(version, rings, healthCheckFn, options = {}) {
    this.version = version;
    this.rings = rings;
    this.healthCheckFn = healthCheckFn;
    this.maxErrorRate = options.maxErrorRate ?? 0.05;
    this.maxP95 = options.maxP95 ?? 500;
    this.bakeTimeMs = options.bakeTimeMs ?? 2000;
  }

  async _deployToRing(ring) {
    ring.status = "active";
    ring.startedAt = Date.now();
    console.log(`  Deploying v${this.version} to ${ring.name} (${ring.percentage}% of users)`);

    await new Promise(r => setTimeout(r, this.bakeTimeMs));

    const metrics = this.healthCheckFn();
    ring.healthCheckPassed = metrics.errorRate < this.maxErrorRate && metrics.p95LatencyMs < this.maxP95;

    console.log(`    Health: error_rate=${(metrics.errorRate * 100).toFixed(1)}%, p95=${metrics.p95LatencyMs}ms`);

    if (ring.healthCheckPassed) {
      ring.status = "completed";
      console.log(`    PASS - Ring ${ring.ringId} completed`);
      return true;
    }
    ring.status = "failed";
    console.log(`    FAIL - Ring ${ring.ringId} failed, rolling back`);
    return false;
  }

  async execute() {
    console.log(`\n=== Ring Deployment: v${this.version} ===`);
    for (let i = 0; i < this.rings.length; i++) {
      const success = await this._deployToRing(this.rings[i]);
      if (!success) {
        this._rollback();
        return { version: this.version, status: "rolled_back", failedRing: this.rings[i].ringId, ringsCompleted: i };
      }
    }
    console.log(`\nAll rings completed. v${this.version} is live for 100% of users.`);
    return { version: this.version, status: "completed", ringsCompleted: this.rings.length };
  }

  _rollback() {
    for (const ring of this.rings) {
      if (ring.status === "completed") {
        ring.status = "rolled_back";
        console.log(`  Rolling back ring ${ring.ringId} (${ring.name})`);
      }
    }
  }
}

// Usage
let callCount = 0;
const mockHealthCheck = () => {
  callCount++;
  if (callCount === 3) return { errorRate: 0.08, p95LatencyMs: 600, successRate: 0.92 };
  return { errorRate: 0.01, p95LatencyMs: 120, successRate: 0.99 };
};

const rings = [
  { ringId: 0, name: "internal", percentage: 1.0, status: "pending" },
  { ringId: 1, name: "early-adopters", percentage: 5.0, status: "pending" },
  { ringId: 2, name: "canary", percentage: 25.0, status: "pending" },
  { ringId: 3, name: "general", percentage: 100.0, status: "pending" },
];

(async () => {
  const deployment = new RingDeployment("2.1.0", rings, mockHealthCheck,
    { maxErrorRate: 0.05, maxP95: 500, bakeTimeMs: 100 });
  const result = await deployment.execute();
  console.log(`\nResult:`, result);
})();
```

### Java

```java
import java.util.*;

public class RingDeployment {

    record Ring(int ringId, String name, double percentage, String status, boolean healthCheckPassed) {
        Ring withStatus(String s) { return new Ring(ringId, name, percentage, s, healthCheckPassed); }
        Ring withHealth(boolean h) { return new Ring(ringId, name, percentage, status, h); }
    }

    record HealthMetrics(double errorRate, double p95LatencyMs, double successRate) {
        boolean isHealthy(double maxError, double maxP95) {
            return errorRate < maxError && p95LatencyMs < maxP95;
        }
    }

    private final String version;
    private final List<Ring> rings;
    private final java.util.function.Supplier<HealthMetrics> healthCheckFn;
    private final double maxErrorRate;
    private final double maxP95;

    public RingDeployment(String version, List<Ring> rings,
                          java.util.function.Supplier<HealthMetrics> healthCheckFn,
                          double maxErrorRate, double maxP95) {
        this.version = version; this.rings = rings;
        this.healthCheckFn = healthCheckFn; this.maxErrorRate = maxErrorRate; this.maxP95 = maxP95;
    }

    private boolean deployToRing(Ring ring) {
        System.out.printf("  Deploying v%s to %s (%.1f%%)%n", version, ring.name(), ring.percentage());
        try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }

        HealthMetrics m = healthCheckFn.get();
        boolean healthy = m.isHealthy(maxErrorRate, maxP95);
        System.out.printf("    Health: error_rate=%.2f%%, p95=%.0fms%n", m.errorRate() * 100, m.p95LatencyMs());

        if (healthy) { System.out.printf("    PASS - Ring %d completed%n", ring.ringId()); return true; }
        System.out.printf("    FAIL - Ring %d failed, rolling back%n", ring.ringId());
        return false;
    }

    public Map<String, Object> execute() {
        System.out.printf("%n=== Ring Deployment: v%s ===%n", version);
        for (int i = 0; i < rings.size(); i++) {
            if (!deployToRing(rings.get(i))) {
                rollback();
                return Map.of("version", version, "status", "rolled_back", "failedRing", rings.get(i).ringId(), "ringsCompleted", i);
            }
        }
        System.out.printf("%nAll rings completed. v%s is live for 100%%.%n", version);
        return Map.of("version", version, "status", "completed", "ringsCompleted", rings.size());
    }

    private void rollback() {
        for (Ring r : rings) {
            if (r.status().equals("completed"))
                System.out.printf("  Rolling back ring %d (%s)%n", r.ringId(), r.name());
        }
    }

    public static void main(String[] args) {
        int[] callCount = {0};
        var healthCheck = (java.util.function.Supplier<HealthMetrics>) () -> {
            callCount[0]++;
            if (callCount[0] == 3) return new HealthMetrics(0.08, 600, 0.92);
            return new HealthMetrics(0.01, 120, 0.99);
        };

        var rings = List.of(
            new Ring(0, "internal", 1.0, "pending", false),
            new Ring(1, "early-adopters", 5.0, "pending", false),
            new Ring(2, "canary", 25.0, "pending", false),
            new Ring(3, "general", 100.0, "pending", false)
        );

        var deployment = new RingDeployment("2.1.0", rings, healthCheck, 0.05, 500);
        System.out.println("\nResult: " + deployment.execute());
    }
}
```

## Explanation

The deployment proceeds through each ring sequentially:

1. **Deploy to ring**: Route the configured percentage of traffic to the new version. This can be done via feature flags, load balancer weights, or Kubernetes rollout strategies.
2. **Bake time**: Wait for a configured period to accumulate enough traffic for meaningful health metrics. Short for small rings (minutes), longer for big rings (hours).
3. **Health check**: Compare metrics against thresholds. Error rate, latency, and business metrics (conversion, signup rate) are common signals.
4. **Advance or rollback**: If healthy, proceed to the next ring. If unhealthy, stop the rollout and roll back all completed rings to the previous version.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Geographic rings** | Roll out by region (US, EU, APAC) | Regional compliance, latency testing |
| **User-tier rings** | Roll out by plan (free, pro, enterprise) | SaaS with tiered SLAs |
| **Time-based rings** | Expand the ring automatically over time | Low-risk changes that need minimal oversight |
| **Manual approval rings** | Require human approval between rings | High-risk changes, compliance requirements |

## What Works

- **Start with 1% or less** to catch obvious issues with minimal impact
- **Use real user traffic**, not synthetic tests, for health validation
- **Set bake times proportional to ring size** (more traffic = faster signal)
- **Define rollback criteria before starting** so the decision is automatic
- **Monitor business metrics**, not just technical ones (conversion, revenue)
- **Keep the previous version warm** so rollback is instant

## Common Mistakes

- Skipping bake time, advancing before enough data accumulates
- Using only technical metrics, missing business impact (dropped conversions)
- Rings too large (jumping from 5% to 100% defeats the purpose)
- No automated rollback, relying on manual intervention during incidents
- Rolling back only the failed ring, leaving earlier rings on the new version
- Not testing the rollback procedure itself

## Frequently Asked Questions

**Q: How is ring deployment different from canary release?**
A: Canary release is a single step: route a small percentage to the new version, watch, then go to 100%. Ring deployment is multi-step: multiple rings of increasing size with health checks between each. Ring deployment is canary release with more granular control.

**Q: How long should the bake time be?**
A: Long enough to get statistically significant health data. For 1% of traffic, you might need hours. For 25%, minutes. A good rule: aim for at least 1000 requests in the ring before evaluating health.

**Q: What metrics should I check?**
A: Error rate and latency are the minimum. Add business metrics relevant to your app: conversion rate, checkout completion, signup rate. A version that is technically healthy but drops conversions should not advance.

**Q: Can I skip rings for low-risk changes?**
A: Yes. For trivial changes (text updates, CSS fixes), you can start at a larger ring. For high-risk changes (schema migrations, new dependencies), start at the smallest ring. Match the ring strategy to the risk level.
