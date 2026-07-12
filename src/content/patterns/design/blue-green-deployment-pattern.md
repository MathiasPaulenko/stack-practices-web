---


contentType: patterns
slug: blue-green-deployment-pattern
title: "Blue-Green Deployment Pattern"
description: "Run two identical environments and switch traffic between them. Deploy to the idle environment, test it, then flip the router for instant release or rollback."
metaDescription: "Run two identical environments and switch traffic between them. Deploy to idle, test, then flip the router for instant release or rollback."
difficulty: intermediate
topics:
  - devops
  - architecture
tags:
  - blue-green-deployment
  - pattern
  - design-pattern
  - deployment-strategy
  - zero-downtime
  - rollback
  - release
relatedResources:
  - /patterns/canary-release-pattern
  - /patterns/deployment-ring-pattern
  - /patterns/graceful-degradation-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Run two identical environments and switch traffic between them. Deploy to idle, test, then flip the router for instant release or rollback."
  keywords:
    - blue green deployment pattern
    - zero downtime deployment
    - design pattern
    - deployment strategy
    - instant rollback
    - release pattern
    - blue green switch


---

# Blue-Green Deployment Pattern

## Overview

The Blue-Green Deployment Pattern maintains two identical production environments: blue and green. At any time, one environment serves live traffic (active) while the other sits idle (inactive). To deploy a new version, you deploy to the inactive environment, run smoke tests against it, and then flip the router to send traffic to the newly deployed environment. The switch is instantaneous.

If something goes wrong, you flip the router back to the previous environment. No redeployment, no waiting for builds. The old version is still running and ready to serve traffic immediately. This makes rollback as simple as a DNS change or load balancer switch.

## When to Use


- For alternatives, see [Canary Release Pattern](/patterns/canary-release-pattern/).

Use the Blue-Green Deployment Pattern when:
- You need zero-downtime deployments for a stateless service
- Rollback speed is critical (seconds, not minutes)
- You can afford to run two identical environments
- Your service does not require long-running connections that complicate switching
- Examples: API services, web applications, microservices with externalized state

## Solution

### Python

```python
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from enum import Enum
import time

class EnvironmentColor(Enum):
    BLUE = "blue"
    GREEN = "green"

class EnvironmentStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPLOYING = "deploying"
    TESTING = "testing"

@dataclass
class Environment:
    color: EnvironmentColor
    version: str = ""
    status: EnvironmentStatus = EnvironmentStatus.INACTIVE
    health: bool = False
    instance_count: int = 0

@dataclass
class DeploymentResult:
    success: bool
    active_environment: EnvironmentColor
    version: str
    rollback_performed: bool = False
    message: str = ""

class BlueGreenDeployment:
    def __init__(self):
        self.blue = Environment(color=EnvironmentColor.BLUE, version="1.0.0",
                                status=EnvironmentStatus.ACTIVE, health=True, instance_count=3)
        self.green = Environment(color=EnvironmentColor.GREEN, version="",
                                 status=EnvironmentStatus.INACTIVE, health=False, instance_count=0)
        self._active: Environment = self.blue
        self._inactive: Environment = self.green
        self._history: List[Dict] = []

    @property
    def active(self) -> Environment:
        return self._active

    @property
    def inactive(self) -> Environment:
        return self._inactive

    def _switch(self) -> None:
        self._active, self._inactive = self._inactive, self._active
        self._active.status = EnvironmentStatus.ACTIVE
        self._inactive.status = EnvironmentStatus.INACTIVE

    def deploy(self, new_version: str, smoke_tests: List[callable] = None) -> DeploymentResult:
        print(f"\n=== Blue-Green Deploy: v{new_version} ===")
        smoke_tests = smoke_tests or []

        target = self.inactive
        print(f"  Deploying to {target.color.value} (currently inactive)")

        target.status = EnvironmentStatus.DEPLOYING
        target.version = new_version
        target.instance_count = 3
        time.sleep(0.2)
        print(f"  Deployed v{new_version} to {target.color.value}")

        target.status = EnvironmentStatus.TESTING
        all_passed = True
        for test in smoke_tests:
            result = test()
            if not result:
                all_passed = False
                break

        if not all_passed:
            target.health = False
            target.status = EnvironmentStatus.INACTIVE
            print(f"  Smoke tests FAILED on {target.color.value}, keeping {self.active.color.value} active")
            return DeploymentResult(success=False, active_environment=self.active.color,
                                    version=self.active.version, message="Smoke tests failed")

        target.health = True
        print(f"  Smoke tests passed on {target.color.value}")

        old_active = self.active
        self._switch()
        print(f"  Switched traffic: {self.active.color.value} (v{self.active.version}) is now active")
        print(f"  {old_active.color.value} (v{old_active.version}) is now inactive")

        self._history.append({"version": new_version, "active": self.active.color.value,
                              "timestamp": time.time()})
        return DeploymentResult(success=True, active_environment=self.active.color,
                                version=new_version, message="Deployment successful")

    def rollback(self) -> DeploymentResult:
        print(f"\n=== Rollback ===")
        if self.inactive.health and self.inactive.version:
            old_active = self.active
            self._switch()
            print(f"  Rolled back to {self.active.color.value} (v{self.active.version})")
            return DeploymentResult(success=True, active_environment=self.active.color,
                                    version=self.active.version, rollback_performed=True,
                                    message="Rollback successful")
        return DeploymentResult(success=False, active_environment=self.active.color,
                                version=self.active.version, message="No healthy environment to roll back to")

    def status(self) -> Dict:
        return {
            "active": {"color": self.active.color.value, "version": self.active.version,
                       "instances": self.active.instance_count},
            "inactive": {"color": self.inactive.color.value, "version": self.inactive.version,
                         "instances": self.inactive.instance_count, "health": self.inactive.health},
            "history": self._history,
        }

# Usage
bg = BlueGreenDeployment()
print(f"Initial state: {bg.status()}")

def test_api_response() -> bool:
    print("    Running test: API response")
    return True

def test_db_connection() -> bool:
    print("    Running test: DB connection")
    return True

result = bg.deploy("2.0.0", smoke_tests=[test_api_response, test_db_connection])
print(f"Result: {result}")
print(f"State: {bg.status()}")

print("\n=== Simulating issue, rolling back ===")
rollback = bg.rollback()
print(f"Rollback: {rollback}")
print(f"Final state: {bg.status()}")
```

### JavaScript

```javascript
class Environment {
  constructor(color) {
    this.color = color;
    this.version = "";
    this.status = "inactive";
    this.health = false;
    this.instanceCount = 0;
  }
}

class BlueGreenDeployment {
  constructor() {
    this.blue = new Environment("blue");
    this.blue.version = "1.0.0"; this.blue.status = "active"; this.blue.health = true; this.blue.instanceCount = 3;
    this.green = new Environment("green");
    this.active = this.blue;
    this.inactive = this.green;
    this.history = [];
  }

  _switch() {
    [this.active, this.inactive] = [this.inactive, this.active];
    this.active.status = "active";
    this.inactive.status = "inactive";
  }

  async deploy(newVersion, smokeTests = []) {
    console.log(`\n=== Blue-Green Deploy: v${newVersion} ===`);
    const target = this.inactive;
    console.log(`  Deploying to ${target.color} (inactive)`);
    target.status = "deploying"; target.version = newVersion; target.instanceCount = 3;
    await new Promise(r => setTimeout(r, 100));
    console.log(`  Deployed v${newVersion} to ${target.color}`);

    target.status = "testing";
    for (const test of smokeTests) {
      if (!await test()) {
        target.health = false; target.status = "inactive";
        console.log(`  Smoke tests FAILED on ${target.color}`);
        return { success: false, activeColor: this.active.color, version: this.active.version, message: "Smoke tests failed" };
      }
    }
    target.health = true;
    console.log(`  Smoke tests passed on ${target.color}`);

    this._switch();
    console.log(`  Switched: ${this.active.color} (v${this.active.version}) is now active`);
    this.history.push({ version: newVersion, active: this.active.color });
    return { success: true, activeColor: this.active.color, version: newVersion, message: "Deployment successful" };
  }

  rollback() {
    console.log(`\n=== Rollback ===`);
    if (this.inactive.health && this.inactive.version) {
      this._switch();
      console.log(`  Rolled back to ${this.active.color} (v${this.active.version})`);
      return { success: true, activeColor: this.active.color, version: this.active.version, rollback: true };
    }
    return { success: false, activeColor: this.active.color, version: this.active.version, message: "No healthy env" };
  }

  status() {
    return {
      active: { color: this.active.color, version: this.active.version, instances: this.active.instanceCount },
      inactive: { color: this.inactive.color, version: this.inactive.version, health: this.inactive.health },
      history: this.history,
    };
  }
}

// Usage
(async () => {
  const bg = new BlueGreenDeployment();
  console.log("Initial:", bg.status());

  const result = await bg.deploy("2.0.0", [
    async () => { console.log("    Test: API response"); return true; },
    async () => { console.log("    Test: DB connection"); return true; },
  ]);
  console.log("Result:", result);
  console.log("State:", bg.status());

  console.log("\n=== Rolling back ===");
  console.log("Rollback:", bg.rollback());
  console.log("Final:", bg.status());
})();
```

### Java

```java
import java.util.*;

public class BlueGreenDeployment {

    enum Color { BLUE, GREEN }

    static class Environment {
        Color color; String version = ""; String status = "inactive";
        boolean health = false; int instanceCount = 0;
        Environment(Color c) { this.color = c; }
    }

    private Environment active, inactive;
    private final List<Map<String, Object>> history = new ArrayList<>();

    public BlueGreenDeployment() {
        active = new Environment(Color.BLUE);
        active.version = "1.0.0"; active.status = "active"; active.health = true; active.instanceCount = 3;
        inactive = new Environment(Color.GREEN);
    }

    private void switchEnv() {
        Environment tmp = active; active = inactive; inactive = tmp;
        active.status = "active"; inactive.status = "inactive";
    }

    public Map<String, Object> deploy(String newVersion, List<java.util.function.Supplier<Boolean>> smokeTests) {
        System.out.printf("%n=== Blue-Green Deploy: v%s ===%n", newVersion);
        Environment target = inactive;
        System.out.printf("  Deploying to %s (inactive)%n", target.color);
        target.status = "deploying"; target.version = newVersion; target.instanceCount = 3;
        System.out.printf("  Deployed v%s to %s%n", newVersion, target.color);

        target.status = "testing";
        for (var test : smokeTests) {
            if (!test.get()) {
                target.health = false; target.status = "inactive";
                System.out.printf("  Smoke tests FAILED on %s%n", target.color);
                return Map.of("success", false, "activeColor", active.color, "version", active.version);
            }
        }
        target.health = true;
        System.out.printf("  Smoke tests passed on %s%n", target.color);
        switchEnv();
        System.out.printf("  Switched: %s (v%s) is now active%n", active.color, active.version);
        history.add(Map.of("version", newVersion, "active", active.color.toString()));
        return Map.of("success", true, "activeColor", active.color, "version", newVersion);
    }

    public Map<String, Object> rollback() {
        System.out.println("\n=== Rollback ===");
        if (inactive.health && !inactive.version.isEmpty()) {
            switchEnv();
            System.out.printf("  Rolled back to %s (v%s)%n", active.color, active.version);
            return Map.of("success", true, "activeColor", active.color, "version", active.version, "rollback", true);
        }
        return Map.of("success", false, "activeColor", active.color, "version", active.version);
    }

    public static void main(String[] args) {
        var bg = new BlueGreenDeployment();
        var result = bg.deploy("2.0.0", List.of(
            () -> { System.out.println("    Test: API response"); return true; },
            () -> { System.out.println("    Test: DB connection"); return true; }
        ));
        System.out.println("Result: " + result);
        System.out.println("\n=== Rolling back ===");
        System.out.println("Rollback: " + bg.rollback());
    }
}
```

## Explanation

The pattern operates in four phases:

1. **Deploy to inactive**: The new version is deployed to whichever environment is not serving traffic. The active environment continues serving users without interruption.
2. **Smoke test**: Run tests against the inactive environment to verify the new version works. These tests hit the inactive environment directly, not through the router.
3. **Switch**: Update the router (load balancer, DNS, API gateway) to send traffic to the newly deployed environment. The switch is a configuration change, not a deployment, so it takes seconds.
4. **Rollback if needed**: If problems appear after the switch, flip the router back. The previous version is still running in the other environment, ready to serve traffic immediately.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Rolling blue-green** | Gradually shift traffic instead of an instant flip | Large traffic volumes where instant switch overwhelms |
| **Canary blue-green** | Combine with canary: shift 10% first, then 100% | Risk-averse deployments |
| **Shadow traffic** | Send a copy of traffic to the inactive env for testing | Validate under real load before switching |
| **Blue-green with drain** | Wait for active connections to finish before switching | Long-running connections (WebSocket, uploads) |

## What Works

- **Externalize all state** (database, cache, sessions) so environments are truly interchangeable
- **Run smoke tests against the inactive environment** before switching
- **Keep both environments at the same scale** so the new one can handle the full load
- **Use a single switch point** (load balancer, API gateway) for instant traffic shift
- **Monitor the new environment immediately after switch** for error spikes
- **Keep the previous version running** for a while after switch, not just for rollback but for comparison

## Common Mistakes

- Not externalizing state, so the inactive environment has stale or missing data
- Running environments at different scales, causing capacity issues after switch
- Switching without smoke testing the inactive environment first
- Not testing the rollback procedure, discovering it fails when you need it
- Switching DNS without low TTL, so clients cache the old IP for too long
- Long-running connections (WebSocket, file uploads) that do not transfer cleanly during switch

## Frequently Asked Questions

**Q: How is blue-green different from canary deployment?**
A: Blue-green switches 100% of traffic at once between two environments. Canary gradually shifts a percentage of traffic to the new version. Blue-green gives instant rollback. Canary gives gradual validation. They can be combined.

**Q: Does blue-green work with databases?**
A: Only if the database schema change is backward-compatible. Both versions must work with the same database. For breaking schema changes, you need an expansion-contraction migration (add new columns, deploy, migrate data, remove old columns).

**Q: What about cost? Am I running two production environments?**
A: Yes. You need two full environments. Some teams keep the inactive one at reduced scale and scale it up before switching. Cloud environments can automate this: scale up, switch, scale down the old one.

**Q: How do I handle WebSocket or long-running connections?**
A: The switch does not kill existing connections. New connections go to the new environment. Old connections drain naturally. For immediate cutover, you can close existing connections with a graceful shutdown message and let clients reconnect to the new environment.
