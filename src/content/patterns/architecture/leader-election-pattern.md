---
contentType: patterns
slug: leader-election-pattern
title: "Leader Election Pattern"
description: "Coordinate a single active instance among multiple distributed nodes to avoid conflicts and split-brain scenarios."
metaDescription: "Coordinate a single active node with the Leader Election Pattern. Avoid split-brain, duplicate work, and race conditions in distributed systems."
difficulty: intermediate
category: architectural
topics:
  - architecture
  - concurrency
tags:
  - leader-election
  - pattern
  - distributed-systems
  - architecture
  - consensus
relatedResources:
  - /patterns/distributed-lock-pattern
  - /guides/concurrency-patterns-guide
  - /patterns/priority-queue-pattern
  - /guides/microservices-architecture-guide
  - /guides/system-design-interview-guide
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Coordinate a single active node with the Leader Election Pattern. Avoid split-brain, duplicate work, and race conditions in distributed systems."
  keywords:
    - leader-election
    - pattern
    - distributed-systems
    - architecture
    - consensus
---
## Overview

The Leader Election Pattern ensures that exactly one instance in a distributed system is the active leader at any time. Other instances remain as followers and take over only if the leader fails. This pattern prevents split-brain situations, duplicate work, and conflicting writes when several nodes could perform the same task.

It is commonly used in distributed schedulers, cluster managers, and stateful services where a single coordinator simplifies coordination.

## When to Use

Use this pattern when:
- Multiple nodes could perform the same operation but only one should do it
- You need to coordinate shared resources such as locks, queues, or writes
- A service must have a single source of truth for configuration or scheduling
- You want to avoid split-brain or race conditions in a cluster
- You can tolerate a short failover delay while a new leader is elected

## Solution

```python
# Simplified leader election using a lease in a shared database
import time
import uuid
from datetime import datetime, timedelta

class LeaderElection:
    def __init__(self, db, lease_seconds=10):
        self.db = db
        self.node_id = uuid.uuid4().hex
        self.lease_seconds = lease_seconds

    def is_leader(self):
        leader = self.db.get('leader')
        if leader and leader['node_id'] == self.node_id and leader['expires'] > datetime.utcnow():
            return True
        return False

    def try_acquire(self):
        now = datetime.utcnow()
        leader = self.db.get('leader')
        if not leader or leader['expires'] < now:
            self.db.set('leader', {'node_id': self.node_id, 'expires': now + timedelta(seconds=self.lease_seconds)})
            return True
        return False

    def renew(self):
        if self.is_leader():
            self.db.set('leader', {'node_id': self.node_id, 'expires': datetime.utcnow() + timedelta(seconds=self.lease_seconds)})
```

```bash
# Kubernetes leader election with a Lease resource
kubectl create lease app-leader --holder=node-1 --lease-duration=15s
```

## Explanation

Leader election works by having all candidates compete for a shared lock or lease. The node that successfully acquires the lease becomes the leader and must renew it periodically. If the leader stops renewing, the lease expires and other candidates can claim it. The system uses a fencing token or unique node identifier to ensure that an old leader cannot act after it has lost leadership.

A typical leader election mechanism includes:
- **Lease acquisition**: a node writes a unique identifier into a shared store with a timeout
- **Heartbeats**: the leader renews the lease before it expires
- **Failure detection**: followers watch the lease and detect expiration
- **Failover**: a follower acquires the lease and assumes leadership

## Variants

| Variant | Coordination Store | Trade-off |
|---------|-------------------|-----------|
| **Database Lease** | PostgreSQL, MySQL | Simple but depends on DB availability |
| **Distributed Lock** | Redis Redlock | Fast but vulnerable to clock drift |
| **Consensus Algorithm** | etcd, ZooKeeper | Strong consistency but more complex |
| **Kubernetes Lease** | API server Lease object | Native for K8s workloads, easy integration |

## What Works

- Use a **short lease** with automatic renewal to detect failures quickly
- Generate a **fencing token** per leadership term to prevent stale leaders from acting
- Ensure the leader **gracefully steps down** on shutdown
- **Watch the lease** from followers rather than polling aggressively
- Keep leader responsibilities **idempotent** where possible
- Log leadership changes clearly for operational visibility

## Common Mistakes

- Allowing a former leader to perform writes after losing the lease
- Using a lease duration that is too long, delaying failover
- Not handling **network partitions** correctly, causing split-brain
- Implementing leader election without a strong fencing token
- Forgetting to release the lease on graceful shutdown

## Frequently Asked Questions

**Q: What is the difference between leader election and distributed locking?**
A: Leader election is a specialized form of locking that selects one active coordinator for a long period. Distributed locking is more general and can protect arbitrary resources.

**Q: Can a system have multiple leaders for different responsibilities?**
A: Yes. You can elect one leader per partition, shard, or task type, which improves scalability while keeping coordination simple.

**Q: Is leader election enough for consensus?**
A: No. Leader election picks a coordinator, but consensus algorithms such as Raft or Paxos also guarantee agreement on values across nodes.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
