---
contentType: recipes
slug: chaos-engineering
title: "Chaos Engineering"
description: "Build resilient systems by intentionally injecting failures and observing how your distributed services respond and recover."
metaDescription: "Chaos engineering principles: fault injection, game days, automatic rollback, and building confidence in production systems through controlled experiments."
difficulty: advanced
topics:
  - devops
tags:
  - chaos-engineering
  - resilience
  - testing
  - distributed-systems
relatedResources:
  - /guides/cicd-pipeline-guide
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/capacity-planning-template
  - /docs/changelog-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Chaos engineering principles: fault injection, game days, automatic rollback, and building confidence in production systems through controlled experiments."
  keywords:
    - chaos-engineering
    - resilience
    - testing
    - distributed-systems
---
## Overview

Chaos engineering is the discipline of experimenting on distributed systems to build confidence in their resilience. By intentionally injecting failures — killing instances, injecting latency, corrupting packets — teams discover weaknesses before customers do. Netflix pioneered this with Chaos Monkey; today, tools like Litmus, Gremlin, and AWS Fault Injection Simulator make it accessible to any team.

## When to Use

Use this resource when:
- Operating distributed systems where failures are inevitable. See [Event-Driven Microservices](/recipes/messaging/event-driven-microservices) for resilient architectures.
- Preparing for disaster recovery drills and game days. See [Load Testing](/recipes/testing/load-testing) for capacity verification.
- Validating auto-scaling, failover, and self-healing mechanisms. See [Health Check Endpoint](/recipes/devops/health-check-endpoint) for probe configuration.
- Building confidence before high-traffic events (launches, Black Friday). See [Retry Logic](/recipes/architecture/retry-backoff) for handling failures gracefully.

## Solution

### Kubernetes Pod Chaos (Litmus)

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-delete-experiment
spec:
  appinfo:
    appns: 'production'
    applabel: 'app=payment-service'
    appkind: 'deployment'
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: '30'
            - name: CHAOS_INTERVAL
              value: '10'
            - name: FORCE
              value: 'false'
```

### Network Latency Injection (tc + Bash)

```bash
#!/bin/bash
# Add 500ms latency to egress traffic on eth0

echo "Injecting 500ms latency for 60 seconds..."
tc qdisc add dev eth0 root netem delay 500ms 50ms distribution normal

sleep 60

echo "Removing latency..."
tc qdisc del dev eth0 root

# Verify with ping
ping -c 5 api.example.com
```

### AWS Fault Injection Simulator (Python)

```python
import boto3

fis = boto3.client('fis')

response = fis.start_experiment(
    experimentTemplateId='EXT-12345678',
    tags={'Environment': 'staging'}
)

print(f"Experiment started: {response['experiment']['id']}")
```

## Explanation

**Five chaos experiment types**:

1. **Infrastructure**: Kill VMs, terminate containers, detach volumes
2. **Network**: Inject latency, drop packets, partition zones
3. **Application**: Throw exceptions, return 503s, trigger memory leaks
4. **State**: Fill disks, corrupt databases, expire certificates
5. **Dependency**: Make downstream APIs timeout or return errors

**The blast radius principle**:
- Start in staging, then move to production with minimal traffic
- Always have an abort button (automatic rollback on SLO violation)
- Run during business hours when the team is available
- Measure against SLOs, not just "does it crash"

## Variants

| Tool | Platform | Experiment Types |
|------|----------|------------------|
| Chaos Monkey | AWS/Netflix | Instance termination |
| Litmus | Kubernetes | Pod, network, disk, stress |
| Gremlin | Multi-cloud | CPU, memory, network, state |
| AWS FIS | AWS | EC2, ECS, EKS, RDS failures |
| Toxiproxy | Any | Network latency, timeouts |

## Best Practices

- **Define steady state first**: Know your normal error rate, latency, and throughput
- **Hypothesis-driven**: "If we kill the primary database, failover completes in <30s"
- **Automate rollback**: Stop experiments automatically if error rate exceeds 1%
- **Run game days**: Quarterly scheduled chaos events with the whole team
- **Document findings**: Every experiment produces a runbook update or architecture fix

## Common Mistakes

1. **Chaos without monitoring**: You can't observe effects if dashboards are incomplete
2. **Production first**: Never run chaos in production before proving it safe in staging
3. **No rollback plan**: Experiments that can't be stopped quickly become outages
4. **Testing only failures**: Also test recovery (does auto-healing actually heal?)
5. **Ignoring blast radius**: One experiment shouldn't affect all customers

## Frequently Asked Questions

**Q: Is chaos engineering just breaking things randomly?**
A: No. It's hypothesis-driven experimentation with measured outcomes and automatic safety guards.

**Q: How do I convince leadership to allow production chaos?**
A: Start with staging, show findings, quantify prevented outages. Frame it as proactive insurance.

**Q: What's the difference between chaos engineering and load testing?**
A: Load testing checks behavior under high traffic. Chaos engineering checks behavior under failures.
