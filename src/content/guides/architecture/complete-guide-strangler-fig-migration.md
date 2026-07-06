---
contentType: guides
slug: complete-guide-strangler-fig-migration
title: "Complete Guide to Strangler Fig Migration: Incremental Legacy Replacement"
description: "Master the strangler fig pattern for incremental legacy migration: routing layer, feature flags, data synchronization, rollback strategies, and production patterns."
metaDescription: "Master the strangler fig pattern for incremental legacy migration: routing layer, feature flags, data synchronization, rollback strategies, and production patterns."
difficulty: advanced
topics:
  - architecture
tags:
  - guide
  - strangler-fig
  - migration
  - legacy
  - incremental
  - routing
  - api-gateway
relatedResources:
  - /guides/architecture/complete-guide-modular-monolith
  - /guides/architecture/complete-guide-api-gateway-pattern
  - /patterns/architecture/strangler-fig-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Master the strangler fig pattern for incremental legacy migration: routing layer, feature flags, data synchronization, rollback strategies, and production patterns."
  keywords:
    - strangler fig pattern
    - legacy migration
    - incremental migration
    - routing layer
    - feature flags
    - data synchronization
    - rollback strategy
---

## Introduction

The strangler fig pattern replaces a legacy system incrementally. A routing layer intercepts requests and directs them to either the old or new system. New functionality is built in the new system while old functionality is migrated piece by piece. The old system is eventually "strangled" — all traffic routes to the new system, and the old system is decommissioned. This guide covers the routing layer, feature flags, data synchronization, rollback strategies, and production patterns.

## How It Works

```
Client Request
      │
      ▼
┌─────────────┐
│  Router /   │     ┌──────────────────┐
│  API Gateway├────►│  New System      │
│             │     │  (microservice)  │
│             │     └──────────────────┘
│             │
│             │     ┌──────────────────┐
│             ├────►│  Legacy System   │
│             │     │  (monolith)      │
└─────────────┘     └──────────────────┘

Step 1: 95% traffic → Legacy, 5% → New (shadow or canary)
Step 2: 80% traffic → Legacy, 20% → New
Step 3: 50/50 split
Step 4: 100% → New, Legacy decommissioned
```

## Routing Layer

### API Gateway routing

```yaml
# Kong / NGINX / API Gateway configuration
# Route specific endpoints to the new system
routes:
  - name: user-service-new
    paths:
      - /api/v2/users
    upstream: new-user-service:3000
    strip_path: false

  - name: legacy-system
    paths:
      - /api
    upstream: legacy-monolith:8080
    strip_path: false
```

### Application-level router

```typescript
// router/StranglerRouter.ts — Route requests between legacy and new systems
interface SystemAdapter {
  handle(request: HttpRequest): Promise<HttpResponse>;
}

class StranglerRouter {
  constructor(
    private readonly legacySystem: SystemAdapter,
    private readonly newSystem: SystemAdapter,
    private readonly routingRules: RoutingRule[],
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async route(request: HttpRequest): Promise<HttpResponse> {
    const rule = this.matchRule(request);

    if (!rule) {
      // No matching rule — route to legacy
      return this.legacySystem.handle(request);
    }

    // Check feature flag for gradual rollout
    const useNewSystem = this.featureFlags.isEnabled(
      rule.flagName,
      { userId: request.headers['x-user-id'] },
    );

    if (useNewSystem) {
      try {
        return await this.newSystem.handle(request);
      } catch (error) {
        // Fallback to legacy on new system failure
        console.error('New system failed, falling back to legacy:', error);
        return this.legacySystem.handle(request);
      }
    }

    return this.legacySystem.handle(request);
  }

  private matchRule(request: HttpRequest): RoutingRule | null {
    for (const rule of this.routingRules) {
      if (this.matches(request, rule)) {
        return rule;
      }
    }
    return null;
  }

  private matches(request: HttpRequest, rule: RoutingRule): boolean {
    if (rule.path && !request.path.match(rule.path)) return false;
    if (rule.method && request.method !== rule.method) return false;
    return true;
  }
}

interface RoutingRule {
  path?: RegExp;
  method?: string;
  flagName: string;
}
```

### Shadow traffic (dark launch)

```typescript
// router/ShadowTraffic.ts — Send traffic to both systems, compare results
class ShadowTraffic {
  constructor(
    private readonly legacySystem: SystemAdapter,
    private readonly newSystem: SystemAdapter,
    private readonly comparisonLogger: ComparisonLogger,
  ) {}

  async route(request: HttpRequest): Promise<HttpResponse> {
    // Send to both systems in parallel
    const [legacyResponse, newResponse] = await Promise.allSettled([
      this.legacySystem.handle(request),
      this.newSystem.handle(request),
    ]);

    // Return legacy response to client
    if (legacyResponse.status === 'fulfilled') {
      // Log comparison for analysis
      this.comparisonLogger.log({
        path: request.path,
        method: request.method,
        legacyStatus: legacyResponse.value.status,
        newStatus: newResponse.status === 'fulfilled'
          ? newResponse.value.status
          : 'error',
        legacyTime: legacyResponse.value.responseTime,
        newTime: newResponse.status === 'fulfilled'
          ? newResponse.value.responseTime
          : null,
        match: this.responsesMatch(
          legacyResponse.value,
          newResponse.status === 'fulfilled' ? newResponse.value : null,
        ),
      });

      return legacyResponse.value;
    }

    throw new Error('Legacy system failed');
  }

  private responsesMatch(legacy: HttpResponse, newResp: HttpResponse | null): boolean {
    if (!newResp) return false;
    if (legacy.status !== newResp.status) return false;
    // Compare key fields, not full body (may have timestamps, IDs)
    return JSON.stringify(legacy.body) === JSON.stringify(newResp.body);
  }
}
```

## Feature Flag Integration

```typescript
// flags/FeatureFlagService.ts — Control migration rollout
class FeatureFlagService {
  constructor(private readonly flagStore: FlagStore) {}

  async isEnabled(flagName: string, context: FlagContext): Promise<boolean> {
    const flag = await this.flagStore.get(flagName);

    switch (flag.rolloutStrategy) {
      case 'percentage':
        return this.percentageRollout(flag, context);

      case 'user-list':
        return flag.userIds.includes(context.userId);

      case 'environment':
        return flag.environments.includes(context.environment);

      case 'boolean':
        return flag.enabled;

      default:
        return false;
    }
  }

  private percentageRollout(flag: Flag, context: FlagContext): boolean {
    const hash = this.hashString(context.userId || flag.name);
    const bucket = hash % 100;
    return bucket < flag.percentage;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

// Migration rollout config
const migrationFlags = {
  'use-new-user-service': {
    enabled: true,
    rolloutStrategy: 'percentage',
    percentage: 5,  // Start with 5% of users
  },
  'use-new-order-service': {
    enabled: true,
    rolloutStrategy: 'user-list',
    userIds: ['test-user-1', 'test-user-2'],
  },
  'use-new-billing-service': {
    enabled: false,
    rolloutStrategy: 'boolean',
  },
};
```

## Data Synchronization

### Change Data Capture (CDC)

```python
# sync/cdc_sync.py — Sync data between legacy and new system databases
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'legacy-db-changes',
    bootstrap_servers=['kafka:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
)

for message in consumer:
    change = message.value
    table = change['table']
    operation = change['op']  # insert, update, delete

    if table == 'users':
        if operation in ('insert', 'update'):
            sync_user_to_new_system(change['after'])
        elif operation == 'delete':
            delete_user_from_new_system(change['before']['id'])

def sync_user_to_new_system(user_data):
    """Transform legacy user schema to new system schema."""
    new_user = {
        'id': user_data['user_id'],
        'email': user_data['email_address'],
        'firstName': user_data['fname'],
        'lastName': user_data['lname'],
        'createdAt': user_data['created_timestamp'],
        'status': 'active' if user_data['is_active'] == 1 else 'inactive',
    }
    new_system_client.upsert_user(new_user)
```

### Dual write pattern

```typescript
// sync/DualWriter.ts — Write to both systems during migration
class DualWriter {
  constructor(
    private readonly legacyRepo: LegacyRepository,
    private readonly newRepo: NewRepository,
    private readonly syncMode: 'dual-write' | 'new-only' | 'legacy-only',
  ) {}

  async saveUser(userData: UserData): Promise<void> {
    switch (this.syncMode) {
      case 'dual-write':
        // Write to both — new system is source of truth eventually
        await this.newRepo.saveUser(userData);
        try {
          await this.legacyRepo.saveUser(userData);
        } catch (error) {
          console.error('Legacy write failed (non-blocking):', error);
        }
        break;

      case 'new-only':
        await this.newRepo.saveUser(userData);
        break;

      case 'legacy-only':
        await this.legacyRepo.saveUser(userData);
        break;
    }
  }
}

// Migration phases:
// Phase 1: legacy-only (before migration starts)
// Phase 2: dual-write (both systems receive writes)
// Phase 3: new-only (legacy is read-only, then decommissioned)
```

## Rollback Strategy

```typescript
// router/RollbackManager.ts — Instant rollback to legacy
class RollbackManager {
  constructor(
    private readonly flagStore: FlagStore,
    private readonly alerting: AlertingService,
  ) {}

  async rollback(flagName: string, reason: string): Promise<void> {
    await this.flagStore.update(flagName, {
      enabled: false,
      percentage: 0,
    });

    await this.alerting.notify({
      severity: 'critical',
      message: `Rolled back ${flagName}: ${reason}`,
      channel: '#migration-alerts',
    });
  }

  // Automatic rollback based on error rate
  async monitor(flagName: string, metrics: MetricsCollector): Promise<void> {
    const errorRate = await metrics.getErrorRate(flagName, windowSeconds = 60);
    const p99Latency = await metrics.getP99Latency(flagName, windowSeconds = 60);

    if (errorRate > 0.05) {  // 5% error rate threshold
      await this.rollback(flagName, `Error rate ${errorRate} exceeded 5%`);
    } else if (p99Latency > 2000) {  // 2s p99 latency threshold
      await this.rollback(flagName, `P99 latency ${p99Latency}ms exceeded 2000ms`);
    }
  }
}
```

## Migration Checklist

```
Phase 1: Preparation
□ Audit legacy system endpoints and data models
□ Identify migration boundaries (which features to extract first)
□ Set up routing layer (API gateway or application router)
□ Set up feature flag service
□ Set up monitoring and comparison logging
□ Set up data synchronization (CDC or dual-write)

Phase 2: Shadow Launch
□ Deploy new system alongside legacy
 Route traffic to both, compare results
□ Verify data consistency
□ Fix discrepancies found in shadow traffic

Phase 3: Canary Release
□ Route 5% of traffic to new system
□ Monitor error rates, latency, and business metrics
□ Gradually increase to 10%, 25%, 50%

Phase 4: Full Cutover
□ Route 100% of traffic to new system
□ Keep legacy on standby for 1-2 weeks
□ Monitor for any issues requiring rollback

Phase 5: Decommission
□ Stop writing to legacy database
□ Archive legacy data
□ Shut down legacy infrastructure
□ Remove routing rules for legacy
```

## Best Practices

- Start with read-only endpoints — lower risk than writes, easier to compare
- Use shadow traffic before canary — validate the new system without affecting users
- Set automatic rollback thresholds — error rate, latency, business metric drops
- Keep the routing layer simple — complexity here blocks the entire migration
- Migrate one domain at a time — don't split across multiple domains simultaneously
- Maintain data consistency — use CDC or dual-write, verify with reconciliation jobs
- Monitor business metrics, not just technical ones — revenue, conversion rate, order count
- Keep the legacy system running during migration — rollback needs it available
- Document the migration state — which endpoints are on which system, what percentage
- Communicate with stakeholders — migration status, risks, and timeline

## Common Mistakes

- **Migrating writes before reads**: writes have side effects and are harder to roll back. Start with reads.
- **No shadow traffic phase**: going straight to canary misses data consistency issues.
- **No automatic rollback**: manual rollback takes too long during an incident. Set thresholds.
- **Migrating too many features at once**: one failure rolls back everything. Migrate incrementally.
- **No data reconciliation**: dual-write or CDC can drift. Run periodic consistency checks.
- **Decommissioning legacy too early**: keep it running for at least 1-2 weeks after full cutover.

## FAQ

### What is the strangler fig pattern?

An incremental migration strategy where a routing layer directs traffic between a legacy system and a new system. New functionality is built in the new system while old functionality is migrated piece by piece. The legacy system is gradually "strangled" until all traffic routes to the new system.

### What is shadow traffic?

Sending the same request to both legacy and new systems in parallel. The legacy response is returned to the client. The new system response is compared against the legacy response for correctness. This validates the new system without affecting users.

### What is dual-write?

Writing data to both legacy and new databases during migration. This keeps both systems in sync. The migration progresses from legacy-only to dual-write to new-only. Dual-write adds latency and requires handling partial failures.

### When should I use CDC vs dual-write?

Use CDC when you can't modify the legacy application's write path. Use dual-write when you control the application and can write to both systems simultaneously. CDC is non-invasive but adds a delay. Dual-write is immediate but requires application changes.

### How long should the migration take?

Depends on system complexity. A small service might take weeks. A large monolith might take months or years. The key is incremental progress — each migrated endpoint reduces the legacy system's surface area.
