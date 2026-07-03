---
contentType: patterns
slug: canary-release-pattern
title: "Canary Release Pattern"
description: "Route a small percentage of traffic to the new version while the rest stays on stable. Monitor health metrics and gradually increase or roll back based on results."
metaDescription: "Route a small percentage of traffic to the new version while the rest stays on stable. Monitor health and gradually increase or roll back based on results."
difficulty: intermediate
topics:
  - devops
  - architecture
tags:
  - canary-release
  - pattern
  - design-pattern
  - deployment-strategy
  - progressive-delivery
  - rollout
  - risk-reduction
relatedResources:
  - /patterns/design/blue-green-deployment-pattern
  - /patterns/design/deployment-ring-pattern
  - /patterns/design/graceful-degradation-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Route a small percentage of traffic to the new version while the rest stays on stable. Monitor health and gradually increase or roll back based on results."
  keywords:
    - canary release pattern
    - progressive delivery
    - design pattern
    - deployment strategy
    - canary rollout
    - incremental release
    - risk reduction deployment
---

# Canary Release Pattern

## Overview

The Canary Release Pattern routes a small percentage of traffic to a new version while the majority continues receiving the stable version. The name comes from coal miners who carried canaries to detect dangerous gases: the canary served as an early warning system. In software, the canary version serves a small group of users first. If it fails, only that small group is affected.

The pattern works in stages: start at 1%, watch error rates and latency, then increase to 5%, 10%, 25%, 50%, and 100%. At each stage, health metrics determine whether to proceed or roll back. Unlike blue-green (which switches all traffic at once), canary releases gradually shift traffic, giving you time to detect issues that only appear under real user load.

## When to Use

Use the Canary Release Pattern when:
- You want to validate a new version with real users before full rollout
- Issues may only appear under production traffic (not caught by staging tests)
- You need finer control than blue-green's all-or-nothing switch
- Your infrastructure supports traffic splitting (load balancer weights, service mesh)
- Examples: API versioning, UI redesigns, performance-sensitive changes, database query changes

## Solution

### Python

```python
from dataclasses import dataclass, field
from typing import Callable, List, Optional, Dict
from enum import Enum
import time

class CanaryStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    PROMOTED = "promoted"
    ROLLED_BACK = "rolled_back"
    PAUSED = "paused"

@dataclass
class HealthMetrics:
    error_rate: float
    p95_latency_ms: float
    success_rate: float

    def is_healthy(self, max_error_rate: float = 0.02, max_p95: float = 300) -> bool:
        return self.error_rate <= max_error_rate and self.p95_latency_ms <= max_p95

@dataclass
class CanaryStage:
    percentage: float
    bake_time_seconds: float
    metrics: Optional[HealthMetrics] = None
    passed: bool = False

class CanaryRelease:
    def __init__(self, version: str, stable_version: str,
                 health_check_fn: Callable[[], HealthMetrics],
                 stages: Optional[List[CanaryStage]] = None,
                 max_error_rate: float = 0.02, max_p95: float = 300):
        self.version = version
        self.stable_version = stable_version
        self.health_check_fn = health_check_fn
        self.max_error_rate = max_error_rate
        self.max_p95 = max_p95
        self.status = CanaryStatus.PENDING
        self.current_stage_idx = -1
        self.stages = stages or [
            CanaryStage(percentage=1.0, bake_time_seconds=0.3),
            CanaryStage(percentage=5.0, bake_time_seconds=0.3),
            CanaryStage(percentage=25.0, bake_time_seconds=0.3),
            CanaryStage(percentage=50.0, bake_time_seconds=0.3),
            CanaryStage(percentage=100.0, bake_time_seconds=0.3),
        ]

    def _run_stage(self, stage: CanaryStage) -> bool:
        self.current_stage_idx += 1
        self.status = CanaryStatus.RUNNING
        print(f"  Canary at {stage.percentage}% -> stable={100 - stage.percentage}%")

        time.sleep(stage.bake_time_seconds)
        metrics = self.health_check_fn()
        stage.metrics = metrics
        stage.passed = metrics.is_healthy(self.max_error_rate, self.max_p95)

        print(f"    error_rate={metrics.error_rate:.2%}, p95={metrics.p95_latency_ms}ms, success={metrics.success_rate:.2%}")

        if stage.passed:
            print(f"    PASS - advancing to next stage")
            return True
        else:
            print(f"    FAIL - rolling back canary")
            self.status = CanaryStatus.ROLLED_BACK
            return False

    def execute(self) -> Dict:
        print(f"\n=== Canary Release: v{self.version} (stable: v{self.stable_version}) ===")
        for i, stage in enumerate(self.stages):
            if not self._run_stage(stage):
                return self._result(rolled_back=True, failed_stage=i)
        self.status = CanaryStatus.PROMOTED
        print(f"\nCanary promoted. v{self.version} is now at 100%.")
        return self._result(rolled_back=False, failed_stage=None)

    def _result(self, rolled_back: bool, failed_stage: Optional[int]) -> Dict:
        return {
            "version": self.version,
            "status": self.status.value,
            "rolled_back": rolled_back,
            "stages_passed": self.current_stage_idx if rolled_back else len(self.stages),
            "failed_stage": failed_stage,
            "max_percentage_reached": self.stages[self.current_stage_idx].percentage if rolled_back else 100.0,
        }

# Usage
call_count = 0
def mock_health_check() -> HealthMetrics:
    global call_count
    call_count += 1
    if call_count == 3:
        return HealthMetrics(error_rate=0.05, p95_latency_ms=400, success_rate=0.95)
    return HealthMetrics(error_rate=0.005, p95_latency_ms=80, success_rate=0.995)

canary = CanaryRelease(
    version="3.0.0", stable_version="2.9.0",
    health_check_fn=mock_health_check,
    max_error_rate=0.02, max_p95=300,
)

result = canary.execute()
print(f"\nResult: {result}")
```

### JavaScript

```javascript
class CanaryRelease {
  constructor(version, stableVersion, healthCheckFn, options = {}) {
    this.version = version;
    this.stableVersion = stableVersion;
    this.healthCheckFn = healthCheckFn;
    this.maxErrorRate = options.maxErrorRate ?? 0.02;
    this.maxP95 = options.maxP95 ?? 300;
    this.status = "pending";
    this.currentStageIdx = -1;
    this.stages = options.stages ?? [
      { percentage: 1.0, bakeTimeMs: 100 },
      { percentage: 5.0, bakeTimeMs: 100 },
      { percentage: 25.0, bakeTimeMs: 100 },
      { percentage: 50.0, bakeTimeMs: 100 },
      { percentage: 100.0, bakeTimeMs: 100 },
    ];
  }

  async _runStage(stage) {
    this.currentStageIdx++;
    this.status = "running";
    console.log(`  Canary at ${stage.percentage}% -> stable=${100 - stage.percentage}%`);
    await new Promise(r => setTimeout(r, stage.bakeTimeMs));
    const m = this.healthCheckFn();
    const healthy = m.errorRate <= this.maxErrorRate && m.p95LatencyMs <= this.maxP95;
    console.log(`    error_rate=${(m.errorRate * 100).toFixed(2)}%, p95=${m.p95LatencyMs}ms`);
    if (healthy) { console.log(`    PASS - advancing`); return true; }
    console.log(`    FAIL - rolling back`);
    this.status = "rolled_back";
    return false;
  }

  async execute() {
    console.log(`\n=== Canary Release: v${this.version} (stable: v${this.stableVersion}) ===`);
    for (let i = 0; i < this.stages.length; i++) {
      if (!await this._runStage(this.stages[i])) {
        return { version: this.version, status: this.status, rolledBack: true,
                 stagesPassed: this.currentStageIdx, failedStage: i,
                 maxPercentage: this.stages[this.currentStageIdx].percentage };
      }
    }
    this.status = "promoted";
    console.log(`\nCanary promoted. v${this.version} is now at 100%.`);
    return { version: this.version, status: this.status, rolledBack: false,
             stagesPassed: this.stages.length, maxPercentage: 100 };
  }
}

// Usage
let callCount = 0;
const mockHealthCheck = () => {
  callCount++;
  if (callCount === 3) return { errorRate: 0.05, p95LatencyMs: 400, successRate: 0.95 };
  return { errorRate: 0.005, p95LatencyMs: 80, successRate: 0.995 };
};

(async () => {
  const canary = new CanaryRelease("3.0.0", "2.9.0", mockHealthCheck, { maxErrorRate: 0.02, maxP95: 300 });
  console.log("\nResult:", await canary.execute());
})();
```

### Java

```java
import java.util.*;

public class CanaryRelease {

    record HealthMetrics(double errorRate, double p95LatencyMs, double successRate) {
        boolean isHealthy(double maxError, double maxP95) {
            return errorRate <= maxError && p95LatencyMs <= maxP95;
        }
    }

    record Stage(double percentage, long bakeTimeMs) {}

    private final String version, stableVersion;
    private final java.util.function.Supplier<HealthMetrics> healthCheckFn;
    private final double maxErrorRate, maxP95;
    private String status = "pending";
    private int currentStageIdx = -1;
    private final List<Stage> stages;

    public CanaryRelease(String version, String stableVersion,
                         java.util.function.Supplier<HealthMetrics> healthCheckFn,
                         double maxErrorRate, double maxP95) {
        this.version = version; this.stableVersion = stableVersion;
        this.healthCheckFn = healthCheckFn; this.maxErrorRate = maxErrorRate; this.maxP95 = maxP95;
        this.stages = List.of(
            new Stage(1.0, 50), new Stage(5.0, 50), new Stage(25.0, 50),
            new Stage(50.0, 50), new Stage(100.0, 50)
        );
    }

    private boolean runStage(Stage stage) {
        currentStageIdx++;
        status = "running";
        System.out.printf("  Canary at %.0f%% -> stable=%.0f%%%n", stage.percentage(), 100 - stage.percentage());
        try { Thread.sleep(stage.bakeTimeMs()); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        HealthMetrics m = healthCheckFn.get();
        boolean healthy = m.isHealthy(maxErrorRate, maxP95);
        System.out.printf("    error_rate=%.2f%%, p95=%.0fms%n", m.errorRate() * 100, m.p95LatencyMs());
        if (healthy) { System.out.println("    PASS - advancing"); return true; }
        System.out.println("    FAIL - rolling back");
        status = "rolled_back";
        return false;
    }

    public Map<String, Object> execute() {
        System.out.printf("%n=== Canary Release: v%s (stable: v%s) ===%n", version, stableVersion);
        for (int i = 0; i < stages.size(); i++) {
            if (!runStage(stages.get(i))) {
                return Map.of("version", version, "status", status, "rolledBack", true,
                    "stagesPassed", currentStageIdx, "failedStage", i,
                    "maxPercentage", stages.get(currentStageIdx).percentage());
            }
        }
        status = "promoted";
        System.out.printf("%nCanary promoted. v%s is now at 100%%.%n", version);
        return Map.of("version", version, "status", status, "rolledBack", false,
            "stagesPassed", stages.size(), "maxPercentage", 100.0);
    }

    public static void main(String[] args) {
        int[] callCount = {0};
        var healthCheck = (java.util.function.Supplier<HealthMetrics>) () -> {
            callCount[0]++;
            if (callCount[0] == 3) return new HealthMetrics(0.05, 400, 0.95);
            return new HealthMetrics(0.005, 80, 0.995);
        };
        System.out.println("\nResult: " + new CanaryRelease("3.0.0", "2.9.0", healthCheck, 0.02, 300).execute());
    }
}
```

## Explanation

The canary release proceeds through predefined stages:

1. **Route a percentage**: Configure the load balancer or service mesh to send a small percentage of traffic to the canary version. The rest goes to the stable version. Both versions run simultaneously.
2. **Bake and measure**: Wait for the bake time to accumulate traffic, then collect health metrics from the canary. Compare error rate, latency, and business metrics against thresholds.
3. **Advance or rollback**: If metrics are within thresholds, increase the canary percentage to the next stage. If metrics degrade, route all traffic back to the stable version and stop the canary.
4. **Promote**: When the canary reaches 100% and metrics are healthy, the canary becomes the new stable version. The old stable version can be decommissioned.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **User-based canary** | Route specific users (internal team, beta users) to canary | Controlled testing with known users |
| **Header-based canary** | Route by request header (cookie, custom header) | Testing with specific clients or regions |
| **Shadow canary** | Send traffic to canary but discard responses | Test under real load without user impact |
| **Auto-promote canary** | Automatically advance stages if metrics pass | Low-risk changes with strong monitoring |

## What Works

- **Start at 1% or less** to minimize blast radius
- **Monitor both technical and business metrics** (error rate, latency, conversion)
- **Set bake times long enough** for statistically significant data
- **Define auto-rollback thresholds** before starting the canary
- **Use sticky sessions** so a user stays on the same version during the canary
- **Keep the stable version running** until the canary reaches 100% and is confirmed healthy

## Common Mistakes

- Starting at too high a percentage (10% or more), defeating the early warning purpose
- Not monitoring business metrics, only checking error rates
- Bake times too short, advancing before enough data accumulates
- No auto-rollback, requiring manual intervention during incidents
- Users bouncing between versions due to lack of sticky sessions
- Decommissioning the stable version before the canary is fully promoted

## Frequently Asked Questions

**Q: How is canary release different from blue-green deployment?**
A: Blue-green switches 100% of traffic between two environments instantly. Canary gradually shifts a percentage of traffic to the new version while the old version continues serving the rest. Canary gives more granular control and earlier detection.

**Q: What percentage should I start with?**
A: 1% is the standard starting point. For high-traffic services, even 1% represents thousands of users. For low-traffic services, you may need a higher percentage to get meaningful data within a reasonable bake time.

**Q: How do I route a percentage of traffic to the canary?**
A: Use load balancer weights (e.g., AWS ALB weighted routing), service mesh rules (Istio, Linkerd), feature flags (LaunchDarkly, Unleash), or API gateway traffic splitting. All approaches let you adjust the percentage without redeploying.

**Q: What if the canary passes technical metrics but users report issues?**
A: Include user-facing metrics in your health check: support ticket rate, user-reported errors, session duration, bounce rate. Technical metrics catch crashes, but user metrics catch UX regressions that do not show up as errors.
