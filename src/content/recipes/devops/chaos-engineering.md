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
  - devops
relatedResources:
  - /guides/cicd-pipeline-guide
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/capacity-planning-template
  - /docs/changelog-template
  - /recipes/github-actions-matrix-strategy
  - /guides/chaos-engineering-guide
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
1. **Network**: Inject latency, drop packets, partition zones
1. **Application**: Throw exceptions, return 503s, trigger memory leaks
1. **State**: Fill disks, corrupt databases, expire certificates
1. **Dependency**: Make downstream APIs timeout or return errors

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

## What Works

- **Define steady state first**: Know your normal error rate, latency, and throughput
- **Hypothesis-driven**: "If we kill the primary database, failover completes in <30s"
- **Automate rollback**: Stop experiments automatically if error rate exceeds 1%
- **Run game days**: Quarterly scheduled chaos events with the whole team
- **Document findings**: Every experiment produces a runbook update or architecture fix

## Common Mistakes

1. **Chaos without monitoring**: You can't observe effects if dashboards are incomplete
1. **Production first**: Never run chaos in production before proving it safe in staging
1. **No rollback plan**: Experiments that can't be stopped quickly become outages
1. **Testing only failures**: Also test recovery (does auto-healing actually heal?)
1. **Ignoring blast radius**: One experiment shouldn't affect all customers

## Frequently Asked Questions

**Q: Is chaos engineering just breaking things randomly?**
A: No. It's hypothesis-driven experimentation with measured outcomes and automatic safety guards.

**Q: How do I convince leadership to allow production chaos?**
A: Start with staging, show findings, quantify prevented outages. Frame it as proactive insurance.

**Q: What's the difference between chaos engineering and load testing?**
A: Load testing checks behavior under high traffic. Chaos engineering checks behavior under failures.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Gremlin Attack (CPU Stress)

```bash
# Install Gremlin CLI
sudo apt-get install gremlin

# CPU stress on a specific container for 60 seconds
gremlin attack cpu --percent 80 --length 60 --container <container-id>

# Network blackhole (drop all traffic to a dependency)
gremlin attack blackhole --ip 10.0.4.20 --length 30

# Memory consumption
gremlin attack memory --percent 75 --length 45
```

### Toxiproxy (Network Chaos for Dependencies)

```bash
# Start Toxiproxy
docker run -p 8474:8474 -p 3306:3306 ghcr.io/shopify/toxiproxy:latest

# Create a proxy for MySQL
toxiproxy-cli create mysql-proxy -l 0.0.0.0:3306 -u 127.0.0.1:3307

# Add 2000ms latency to MySQL connections
toxiproxy-cli toxic add mysql-proxy -n latency -t latency=2000

# Add timeout (connections drop after 500ms)
toxiproxy-cli toxic add mysql-proxy -n timeout -t timeout=500

# Remove all toxics
toxiproxy-cli toxic delete mysql-proxy -n latency
```

### Steady-State Verification Script

```python
import requests
import time
import sys

def check_steady_state():
    """Verify SLOs before, during, and after chaos experiments."""
    checks = [
        ("https://api.example.com/health", 200, 500),  # URL, expected_status, max_latency_ms
        ("https://api.example.com/metrics", 200, 1000),
    ]
    all_pass = True
    for url, expected_status, max_latency in checks:
        try:
            start = time.time()
            resp = requests.get(url, timeout=5)
            latency_ms = (time.time() - start) * 1000
            if resp.status_code != expected_status:
                print(f"FAIL: {url} returned {resp.status_code}, expected {expected_status}")
                all_pass = False
            elif latency_ms > max_latency:
                print(f"FAIL: {url} latency {latency_ms:.0f}ms exceeds {max_latency}ms")
                all_pass = False
            else:
                print(f"OK: {url} - {resp.status_code} in {latency_ms:.0f}ms")
        except requests.RequestException as e:
            print(f"FAIL: {url} unreachable: {e}")
            all_pass = False
    return all_pass

if __name__ == "__main__":
    if not check_steady_state():
        print("Steady state violated. Aborting experiment.")
        sys.exit(1)
    print("Steady state confirmed. Safe to proceed.")
```

### Game Day Runbook Template

```markdown
# Game Day: <Date>

## Participants
- Facilitator: <name>
- Observers: <names>
- On-call engineer: <name>

## Scope
- Target service: payment-service
- Environment: staging
- Blast radius: 10% of traffic

## Experiments
1. Kill primary database pod - expect failover < 30s
2. Inject 500ms latency to payment gateway - expect p99 < 2s
3. Drop 20% of packets to Redis - expect cache miss rate increase only

## Abort Criteria
- Error rate > 1% for > 2 minutes
- p99 latency > 5s
- Any data corruption detected

## Rollback Plan
- `kubectl rollout undo deployment/payment-service`
- `toxiproxy-cli toxic delete --all`
- Page on-call engineer
```

## Additional Best Practices

1. **Start with a single service.** Don't experiment across multiple services simultaneously until you have confidence in isolation:

```yaml
# Litmus: target only one deployment
spec:
  appinfo:
    appns: 'staging'
    applabel: 'app=payment-service'  # Only this service
    appkind: 'deployment'
```

1. **Schedule experiments during business hours.** The team must be available to respond:

```bash
# Cron for game days: every Friday 2pm
0 14 * * 5 /usr/local/bin/run-chaos-experiment.sh
```

1. **Version your experiments.** Treat chaos experiments as code:

```bash
git add experiments/
git commit -m "experiment: add pod-delete for payment-service staging"
```

## Additional Common Mistakes

1. **Running experiments without baselines.** You need steady-state metrics before chaos to compare:

```bash
# Record baseline before experiment
curl -s https://api.example.com/metrics > baseline-metrics.json
# Run experiment
# Compare after
curl -s https://api.example.com/metrics > post-experiment-metrics.json
diff <(jq '.latency_p99' baseline-metrics.json) <(jq '.latency_p99' post-experiment-metrics.json)
```

1. **Not cleaning up after experiments.** Toxiproxy toxics, tc rules, and injected failures persist if not removed:

```bash
# Always clean up
tc qdisc del dev eth0 root 2>/dev/null
toxiproxy-cli toxic delete --all
kubectl delete chaosengine --all -n staging
```

## FAQ

### How often should we run chaos experiments?

Start with monthly game days in staging. As confidence grows, move to weekly automated experiments in production with narrow blast radius. Netflix runs Chaos Monkey daily in production.

### What metrics should we monitor during experiments?

Track these SLOs:
- Error rate (should stay < 1%)
- p99 latency (should stay within SLO)
- Throughput (should not drop > 10%)
- Recovery time (time to return to steady state)

### Can chaos engineering work without Kubernetes?

Yes. Tools like Gremlin and Toxiproxy work on VMs, bare metal, and containers. AWS FIS works with EC2, ECS, and RDS. The principles are the same regardless of platform.

## Performance Tips

1. **Run experiments in off-peak hours.** Even with narrow blast radius, experiments add load:

```bash
# Schedule for 2am when traffic is lowest
0 2 * * * /usr/local/bin/chaos-experiment.sh
```

1. **Use short experiment durations.** 30-60 seconds is enough to observe behavior:

```yaml
# Litmus: 30 seconds max
env:
  - name: TOTAL_CHAOS_DURATION
    value: '30'
```

1. **Cache vulnerability scans.** If chaos experiments depend on scan results, cache them:

```python
import functools

@functools.lru_cache(maxsize=1)
def get_service_inventory():
    return fetch_service_inventory()  # Expensive call
```

1. **Parallelize steady-state checks.** Check multiple endpoints simultaneously:

```python
import concurrent.futures

def check_all_endpoints(urls):
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(check_endpoint, urls))
    return all(results)
```
