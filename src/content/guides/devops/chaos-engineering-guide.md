---
contentType: guides
slug: chaos-engineering-guide
title: "Chaos Engineering — Principles, Tools, and Safe Experiments"
description: "A practical guide to chaos engineering: build resilient systems by intentionally injecting failures. Learn the five principles, Litmus, Gremlin, and Chaos Mesh."
metaDescription: "Learn chaos engineering: build resilient systems by injecting failures. Five principles, tools like Litmus and Chaos Mesh, and safe experiment design."
difficulty: advanced
topics:
  - devops
  - testing
  - infrastructure
tags:
  - chaos-engineering
  - resilience
  - litmus
  - gremlin
  - chaos-mesh
  - fault-injection
  - sre
  - guide
relatedResources:
  - /guides/sre-practices-guide
  - /guides/observability-guide
  - /guides/service-mesh-guide
  - /recipes/circuit-breaker-pattern-recipe
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn chaos engineering: build resilient systems by injecting failures. Five principles, tools like Litmus and Chaos Mesh, and safe experiment design."
  keywords:
    - chaos-engineering
    - resilience
    - litmus
    - gremlin
    - chaos-mesh
    - fault-injection
    - guide
---

## Overview

Chaos engineering is the discipline of experimenting on a system to build confidence in its capability to withstand turbulent conditions. Instead of waiting for failures to occur in production, you intentionally inject them — pod kills, network latency, CPU exhaustion, disk fill — to validate that your system degrades gracefully and recovers automatically. Originated at Netflix with Chaos Monkey, it has evolved into a structured practice with principles, tools, and safety guardrails.

## When to Use

- Your system claims to be "highly available" but has never been tested under failure
- You want to validate autoscaling, failover, and circuit breakers
- You need to discover unknown dependencies and single points of failure
- Incident response runbooks exist but are untested
- You are running on Kubernetes and want to validate pod resilience

## The Five Principles of Chaos Engineering

1. **Build a hypothesis around steady-state behavior** — define normal metrics (error rate < 0.1%, p99 latency < 200ms)
2. **Vary real-world events** — inject failures that actually happen: network partitions, disk failures, dependency outages
3. **Run experiments in production** — staging rarely matches production topology and load
4. **Automate experiments to run continuously** — manual game days are valuable but not sustainable
5. **Minimize blast radius** — start small (one pod, one AZ), abort if SLOs are breached

## Experiment Design

```
┌─────────────────┐
│ 1. Steady state │ ← Define normal via metrics
│ 2. Hypothesis   │ ← "If X fails, Y autoscales in < 60s"
│ 3. Inject fault │ ← Kill pod, add latency, fill disk
│ 4. Observe      │ ← Compare actual vs hypothesis
│ 5. Rollback     │ ← Abort if blast radius exceeds bounds
│ 6. Learn        │ ← Fix weaknesses, automate fix
└─────────────────┘
```

## Chaos Mesh Example (Kubernetes)

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-api
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - production
    labelSelectors:
      app: api
  duration: 30s
  scheduler:
    cron: "@every 10m"
```

## LitmusChaos Example

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: api-pod-delete
  namespace: litmus
spec:
  appinfo:
    appns: production
    applabel: "app=api"
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "30"
            - name: CHAOS_INTERVAL
              value: "10"
            - name: FORCE
              value: "false"
```

## Common Experiment Types

| Experiment | Validates | Tool |
|------------|-----------|------|
| **Pod kill** | Kubernetes rescheduling, readiness probes | Chaos Mesh, Litmus |
| **Network latency** | Timeout handling, circuit breakers | Chaos Mesh, Gremlin |
| **CPU/memory stress** | Autoscaling triggers, resource limits | Stress-ng, Gremlin |
| **Disk fill** | Log rotation, storage alerts | Litmus, Gremlin |
| **Zone outage** | Multi-AZ failover | AWS FIS, Gremlin |

## Safety Guardrails

- **Abort conditions** — auto-stop experiment if error rate > 1% or p99 > 500ms
- **Time-bound** — limit experiment duration (30s, 5m, not indefinite)
- **Small scope** — one pod → one deployment → one namespace → one AZ
- **Business hours** — run experiments when engineers are available
- **Clear communication** — announce experiments to avoid incident duplication

## Common Mistakes

- **No steady-state definition** — you cannot detect degradation if you do not know what normal looks like
- **Blast radius too large** — starting with a full region outage can cause real customer impact
- **No abort mechanism** — experiments must auto-terminate if SLOs are breached
- **Blaming individuals for failures found** — chaos engineering finds system weaknesses, not human errors
- **Running experiments without runbooks** — if the experiment finds a bug, you need a remediation plan

## FAQ

**Is chaos engineering safe for production?**
Yes, if done with guardrails. Start with the smallest possible blast radius and abort conditions. The risk of an untested system failing in production is often higher than a controlled experiment.

**What is the difference between chaos engineering and testing?**
Testing validates that code behaves correctly under known conditions. Chaos engineering validates that the system as a whole behaves under unknown, real-world failure conditions.

**Do I need Kubernetes to do chaos engineering?**
No. Gremlin supports VMs, containers, and serverless. AWS Fault Injection Simulator works with EC2 and RDS. Kubernetes just makes pod-level experiments easier.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: Game Days for E-commerce Platform

```text
System: E-commerce, 15 microservices, K8s
Goal: Validate resilience before Black Friday

Game Day calendar (monthly):
  | Month | Experiment | Hypothesis | Result |
  |-------|-----------|-----------|--------|
  | Jan | Kill payment pod | Auto-scaling replaces in < 30s | Pass |
  | Feb | 500ms DB latency | Circuit breaker activates fallback | Fail: no fallback |
  | Mar | Kill entire AZ | Traffic reroutes to healthy AZ | Pass |
  | Apr | Redis latency | Cache miss degrades gracefully | Fail: cascading timeouts |
  | May | Kill search service | Catalog without search works | Pass |
  | Jun | Corrupt Kafka message | Consumer handles poison pill | Fail: consumer hangs |

Detailed experiment (Feb):
  Name: DB-latency-injection
  Hypothesis: If DB has 500ms latency, circuit breaker
              activates cache fallback in < 5s with no 5xx errors
  Blast radius: 10% of traffic (canary)
  Duration: 10 minutes
  Abort: error rate > 5% or p99 latency > 3s

  Execution (Gremlin):
    gremlin attack latency -t 500ms -i 600 --service payment-db
    --tags env=canary

  Monitoring during experiment:
    - Error rate: 0% -> 12% (FAIL)
    - p99 latency: 200ms -> 4.5s (FAIL)
    - Circuit breaker: never activated (FAIL)
    - Cache fallback: not implemented (FAIL)

  Post-mortem analysis:
    Root cause: Circuit breaker threshold set to 10s
                but DB responded in 500ms (no timeout).
                Cache fallback did not exist.

    Actions:
    1. Implement cache fallback for product queries
    2. Lower circuit breaker threshold to 2s
    3. Add 1s timeout on DB queries
    4. Re-run experiment in staging

  Re-run (Mar):
    - Error rate: 0% (PASS)
    - p99 latency: 200ms -> 350ms (PASS)
    - Circuit breaker: active at 3s (PASS)
    - Cache fallback: served stale data (PASS)

Automation (Chaos Mesh):
  apiVersion: chaos-mesh.org/v1alpha1
  kind: PodChaos
  metadata:
    name: payment-pod-kill
  spec:
    action: pod-kill
    mode: fixed-percent
    value: "10"
    selector:
      namespaces: [production]
      labelSelectors:
        app: payment-service
    scheduler:
      cron: "@every 1h"
```

### How do I convince management to do chaos engineering?

Start with a game day in staging. Document findings: each discovered failure is a production incident avoided. Quantify impact: "This experiment found a bug that would have caused 2h downtime on Black Friday ($500K)". Staging game days have zero risk and high ROI.


























































End of document. Review and update quarterly.