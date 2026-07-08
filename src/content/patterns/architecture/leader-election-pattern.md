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

## Advanced Solutions

### Leader election with etcd using Raft consensus

Implement leader election using etcd's built-in consensus:

```python
import etcd3

class EtcdLeaderElection:
    def __init__(self, etcd_client, election_key='leader', lease_ttl=10):
        self.etcd = etcd_client
        self.election_key = election_key
        self.lease_ttl = lease_ttl
        self.lease = None
        self.election = None

    async def campaign(self, node_id):
        # Create a lease with TTL
        self.lease = await self.etcd.lease(self.lease_ttl)
        
        # Campaign for leadership
        self.election = self.etcd.election(self.election_key)
        await self.election.campaign(node_id, lease=self.lease)
        
        # Keep lease alive
        while True:
            await self.lease.refresh()
            await asyncio.sleep(self.lease_ttl / 2)

    async def observe(self):
        # Observe current leader
        election = self.etcd.election(self.election_key)
        async for leader in election.observe():
            print(f"Current leader: {leader}")

    async def resign(self):
        if self.election:
            await self.election.resign()
        if self.lease:
            await self.lease.revoke()
```

### Kubernetes leader election with Lease resource

Use Kubernetes Lease API for native leader election:

```go
package main

import (
	"context"
	"fmt"
	"time"

	coordinationv1 "k8s.io/api/coordination/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type LeaseLeaderElection struct {
	clientset     *kubernetes.Clientset
	leaseName     string
	leaseNamespace string
	holderIdentity string
	leaseDuration  time.Duration
}

func NewLeaseLeaderElection(leaseName, namespace, holderIdentity string, duration time.Duration) (*LeaseLeaderElection, error) {
	config, err := rest.InClusterConfig()
	if err != nil {
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	return &LeaseLeaderElection{
		clientset:      clientset,
		leaseName:      leaseName,
		leaseNamespace: namespace,
		holderIdentity: holderIdentity,
		leaseDuration:  duration,
	}, nil
}

func (l *LeaseLeaderElection) Acquire(ctx context.Context) error {
	lease := &coordinationv1.Lease{
		ObjectMeta: metav1.ObjectMeta{
			Name:      l.leaseName,
			Namespace: l.leaseNamespace,
		},
		Spec: coordinationv1.LeaseSpec{
			HolderIdentity:       &l.holderIdentity,
			LeaseDurationSeconds: pointerToInt32(int32(l.leaseDuration.Seconds())),
			AcquireTime:          &metav1.Time{Time: time.Now()},
			RenewTime:            &metav1.Time{Time: time.Now()},
		},
	}

	for {
		current, err := l.clientset.CoordinationV1().Leases(l.leaseNamespace).Get(ctx, l.leaseName, metav1.GetOptions{})
		if err != nil {
			// Lease doesn't exist, try to create
			_, err = l.clientset.CoordinationV1().Leases(l.leaseNamespace).Create(ctx, lease, metav1.CreateOptions{})
			if err == nil {
				return nil // Acquired leadership
			}
			time.Sleep(time.Second)
			continue
		}

		// Check if lease is expired or we are the holder
		if current.Spec.HolderIdentity == nil || *current.Spec.HolderIdentity == l.holderIdentity {
			// Renew lease
			current.Spec.HolderIdentity = &l.holderIdentity
			current.Spec.RenewTime = &metav1.Time{Time: time.Now()}
			_, err = l.clientset.CoordinationV1().Leases(l.leaseNamespace).Update(ctx, current, metav1.UpdateOptions{})
			if err == nil {
				return nil // Leadership maintained
			}
		}

		time.Sleep(time.Second)
	}
}

func (l *LeaseLeaderElection) Renew(ctx context.Context) error {
	ticker := time.NewTicker(l.leaseDuration / 2)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			lease, err := l.clientset.CoordinationV1().Leases(l.leaseNamespace).Get(ctx, l.leaseName, metav1.GetOptions{})
			if err != nil {
				return fmt.Errorf("failed to get lease: %w", err)
			}

			if lease.Spec.HolderIdentity == nil || *lease.Spec.HolderIdentity != l.holderIdentity {
				return fmt.Errorf("lost leadership")
			}

			lease.Spec.RenewTime = &metav1.Time{Time: time.Now()}
			_, err = l.clientset.CoordinationV1().Leases(l.leaseNamespace).Update(ctx, lease, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("failed to renew lease: %w", err)
			}

		case <-ctx.Done():
			return nil
		}
	}
}

func pointerToInt32(i int32) *int32 {
	return &i
}
```

### Redis-based leader election with Redlock

Implement leader election using Redis Redlock algorithm:

```python
import redis
import time
import uuid

class RedisLeaderElection:
    def __init__(self, redis_client, lock_key='leader_lock', ttl=10000):
        self.redis = redis_client
        self.lock_key = lock_key
        self.ttl = ttl  # milliseconds
        self.node_id = str(uuid.uuid4())
        self.lock_value = None

    def acquire(self):
        """
        Try to acquire the lock using SET NX EX
        Returns True if acquired, False otherwise
        """
        self.lock_value = f"{self.node_id}:{int(time.time() * 1000)}"
        
        # SET key value NX EX ttl
        result = self.redis.set(
            self.lock_key,
            self.lock_value,
            nx=True,
            ex=self.ttl / 1000
        )
        
        return result is not None

    def renew(self):
        """
        Renew the lock if we still hold it
        """
        if not self.is_leader():
            return False
        
        # Check if current value matches our lock value
        current_value = self.redis.get(self.lock_key)
        if current_value and current_value.decode() == self.lock_value:
            # Extend the TTL
            self.redis.expire(self.lock_key, self.ttl / 1000)
            return True
        
        return False

    def is_leader(self):
        """
        Check if we are the current leader
        """
        current_value = self.redis.get(self.lock_key)
        if not current_value:
            return False
        
        return current_value.decode() == self.lock_value

    def release(self):
        """
        Release the lock if we hold it
        """
        current_value = self.redis.get(self.lock_key)
        if current_value and current_value.decode() == self.lock_value:
            self.redis.delete(self.lock_key)
```

## Additional Best Practices

1. **Implement graceful leader step-down.** When a leader shuts down, it should explicitly release the lease and notify followers. This prevents split-brain scenarios during planned maintenance.

```python
def shutdown(self):
    if self.is_leader():
        print("Stepping down as leader...")
        self.db.delete('leader')
        # Notify followers via pub/sub or message queue
        self.notify_followers('leader_stepdown')
```

2. **Use fencing tokens for distributed operations.** Generate a monotonically increasing fencing token with each leadership term. Include this token in all distributed writes to prevent stale leaders from making changes.

```python
class LeaderElectionWithFencing:
    def __init__(self, db):
        self.db = db
        self.fencing_token = 0

    def acquire(self):
        if self.try_acquire():
            # Increment fencing token on new leadership
            self.fencing_token = self.db.incr('fencing_token')
            return True
        return False

    def perform_write(self, key, value):
        # Include fencing token in write
        if not self.is_leader():
            raise Exception("Not leader")
        
        write_data = {
            'value': value,
            'fencing_token': self.fencing_token
        }
        self.db.set(key, write_data)
```

3. **Implement leader health monitoring.** Followers should actively monitor the leader's health, not just watch the lease. Implement health checks and readiness probes to detect leader failure before lease expiration.

## Additional Common Mistakes

1. **Using leader election for short-lived operations.** Leader election is designed for long-running coordination. For short-lived tasks, use distributed locking or task queues instead.

2. **Ignoring clock skew in distributed systems.** Clock differences between nodes can cause lease expiration issues. Use monotonic clocks or lease durations that account for expected clock skew.

## Additional Frequently Asked Questions

### How do I handle network partitions during leader election?

Implement quorum-based election where a majority of nodes must agree on the leader. Use consensus algorithms like Raft or Paxos that handle network partitions correctly by requiring majority agreement.

### What happens if the leader cannot renew the lease?

If the leader fails to renew the lease before expiration, it loses leadership. Followers detect the expired lease and compete to become the new leader. The old leader must detect it is no longer leader and stop performing leader-only operations.

### Should I use leader election or a consensus algorithm?

Use leader election when you need a single coordinator but don't need agreement on values. Use consensus algorithms like Raft when you need both leader election and agreement on a replicated log or state machine.
