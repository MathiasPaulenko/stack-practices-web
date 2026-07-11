---
contentType: guides
slug: complete-guide-strangler-fig-migration
title: "Strangler Fig Migration: Reemplazo Incremental de Legacy"
description: "Dominá el strangler fig pattern para migración incremental de legacy: routing layer, feature flags, data synchronization, rollback strategies y patrones de producción."
metaDescription: "Dominá el strangler fig pattern para migración incremental: routing layer, feature flags, data synchronization, rollback strategies y patrones de producción."
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
  metaDescription: "Dominá el strangler fig pattern para migración incremental: routing layer, feature flags, data synchronization, rollback strategies y patrones de producción."
  keywords:
    - strangler fig pattern
    - legacy migration
    - incremental migration
    - routing layer
    - feature flags
    - data synchronization
    - rollback strategy
---

## Introducción

El strangler fig pattern reemplaza un legacy system incrementalmente. Una routing layer intercepta requests y los dirige al old o new system. Nueva funcionalidad se buildea en el new system mientras que old funcionalidad se migra piece by piece. El old system es eventualmente "strangled" — all traffic rutéa al new system, y el old system se decommissiona. A continuación: routing layer, feature flags, data synchronization, rollback strategies y production patterns.

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

Step 1: 95% traffic → Legacy, 5% → New (shadow o canary)
Step 2: 80% traffic → Legacy, 20% → New
Step 3: 50/50 split
Step 4: 100% → New, Legacy decommissioned
```

## Routing Layer

### API Gateway routing

```yaml
# Kong / NGINX / API Gateway configuration
# Routeéa specific endpoints al new system
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
// router/StranglerRouter.ts — Routeéa requests entre legacy y new systems
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
      // No matching rule — routeéa a legacy
      return this.legacySystem.handle(request);
    }

    // Checkeá feature flag para gradual rollout
    const useNewSystem = this.featureFlags.isEnabled(
      rule.flagName,
      { userId: request.headers['x-user-id'] },
    );

    if (useNewSystem) {
      try {
        return await this.newSystem.handle(request);
      } catch (error) {
        // Fallbackéa a legacy on new system failure
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
// router/ShadowTraffic.ts — Enviá traffic a both systems, compará results
class ShadowTraffic {
  constructor(
    private readonly legacySystem: SystemAdapter,
    private readonly newSystem: SystemAdapter,
    private readonly comparisonLogger: ComparisonLogger,
  ) {}

  async route(request: HttpRequest): Promise<HttpResponse> {
    // Enviá a both systems en parallel
    const [legacyResponse, newResponse] = await Promise.allSettled([
      this.legacySystem.handle(request),
      this.newSystem.handle(request),
    ]);

    // Returnéa legacy response al client
    if (legacyResponse.status === 'fulfilled') {
      // Loggeá comparison para analysis
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
    // Compará key fields, no full body (puede tener timestamps, IDs)
    return JSON.stringify(legacy.body) === JSON.stringify(newResp.body);
  }
}
```

## Feature Flag Integration

```typescript
// flags/FeatureFlagService.ts — Controlá migration rollout
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
    percentage: 5,  // Arrancá con 5% de users
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
# sync/cdc_sync.py — Synceá data entre legacy y new system databases
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
    """Transformá legacy user schema a new system schema."""
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
// sync/DualWriter.ts — Escribí a both systems durante migration
class DualWriter {
  constructor(
    private readonly legacyRepo: LegacyRepository,
    private readonly newRepo: NewRepository,
    private readonly syncMode: 'dual-write' | 'new-only' | 'legacy-only',
  ) {}

  async saveUser(userData: UserData): Promise<void> {
    switch (this.syncMode) {
      case 'dual-write':
        // Escribí a both — new system es source of truth eventualmente
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
// Phase 1: legacy-only (antes de migration start)
// Phase 2: dual-write (both systems reciben writes)
// Phase 3: new-only (legacy es read-only, luego decommissioned)
```

## Rollback Strategy

```typescript
// router/RollbackManager.ts — Instant rollback a legacy
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

  // Automatic rollback basado en error rate
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
□ Auditeá legacy system endpoints y data models
□ Identificá migration boundaries (cuáles features extraer first)
□ Seteá up routing layer (API gateway o application router)
□ Seteá up feature flag service
□ Seteá up monitoring y comparison logging
□ Seteá up data synchronization (CDC o dual-write)

Phase 2: Shadow Launch
□ Deployeá new system alongside legacy
□ Routeéa traffic a both, compará results
□ Verificá data consistency
□ Fixeá discrepancies found en shadow traffic

Phase 3: Canary Release
□ Routeéa 5% de traffic a new system
□ Monitoreá error rates, latency y business metrics
□ Gradualmente increaseá a 10%, 25%, 50%

Phase 4: Full Cutover
□ Routeéa 100% de traffic a new system
□ Mantené legacy on standby por 1-2 weeks
□ Monitoreá por any issues que requieran rollback

Phase 5: Decommission
□ Stopéa writing a legacy database
□ Archiveá legacy data
□ Shut downéa legacy infrastructure
□ Removéa routing rules para legacy
```

## Best Practices

- Arrancá con read-only endpoints — lower risk que writes, easier de comparar
- Usá shadow traffic antes de canary — validá el new system sin affecting users
- Seteá automatic rollback thresholds — error rate, latency, business metric drops
- Mantené el routing layer simple — complexity acá blockea el entire migration
- Migrá un domain a la vez — no splitteés across multiple domains simultáneamente
- Mantené data consistency — usá CDC o dual-write, verificá con reconciliation jobs
- Monitoreá business metrics, no solo technical ones — revenue, conversion rate, order count
- Mantené el legacy system running durante migration — rollback lo necesita available
- Documentá el migration state — cuáles endpoints están en cuál system, qué percentage
- Communicá con stakeholders — migration status, risks y timeline

## Common Mistakes

- **Migrar writes antes de reads**: writes tienen side effects y son harder de roll back. Arrancá con reads.
- **No shadow traffic phase**: yendo straight a canary missea data consistency issues.
- **No automatic rollback**: manual rollback takes too long durante un incident. Seteá thresholds.
- **Migrar too many features at once**: un failure rolléa back everything. Migrá incrementalmente.
- **No data reconciliation**: dual-write o CDC pueden drift. Runneá periodic consistency checks.
- **Decommissioning legacy too early**: mantenido running por at least 1-2 weeks después de full cutover.

## FAQ

### ¿Qué es el strangler fig pattern?

Una incremental migration strategy donde una routing layer dirige traffic entre un legacy system y un new system. Nueva funcionalidad se buildea en el new system mientras que old funcionalidad se migra piece by piece. El legacy system se gradually "strangles" hasta que all traffic rutéa al new system.

### ¿Qué es shadow traffic?

Enviar el mismo request a both legacy y new systems en parallel. El legacy response se returnéa al client. El new system response se compara contra el legacy response para correctness. Esto validá el new system sin affecting users.

### ¿Qué es dual-write?

Escribir data a both legacy y new databases durante migration. Esto keepéa both systems in sync. La migration progresa de legacy-only a dual-write a new-only. Dual-write addeá latency y requiere handling partial failures.

### ¿Cuándo debería usar CDC vs dual-write?

Usá CDC cuando no podés modificar el legacy application's write path. Usá dual-write cuando controlás el application y podés escribir a both systems simultáneamente. CDC es non-invasive pero addeá un delay. Dual-write es immediate pero requiere application changes.

### ¿Cuánto debería tomar la migration?

Depende de system complexity. Un small service podría tomar weeks. Un large monolith podría tomar months o years. La key es incremental progress — cada migrated endpoint reduce el legacy system's surface area.
