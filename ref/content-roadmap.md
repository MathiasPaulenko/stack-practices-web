# Content Roadmap — 200 SEO-First Ideas

> Target: organic traffic through long-tail developer queries.
> Each item should be created as a **recipe**, **pattern**, **guide**, or **doc**.
> Bilingual (EN + ES) required for every item.

---

## Legend

| Type | Description | Search Strategy |
|------|-------------|-----------------|
| `recipe` | "How to X in Python/Java/JS" — actionable code | High intent, medium volume |
| `pattern` | "What is X pattern" + implementation | Medium intent, steady volume |
| `guide` | "Complete guide to X" — long-form tutorial | Low intent, high volume |
| `doc` | Reusable template or checklist | Niche, high conversion |

---

## Completed Content Inventory

> Reference only — do not duplicate. See `ref/existing-*.txt` for full per-item lists.

| Type | Count | Categories |
|------|-------|------------|
| Recipes | ~256 unique | AI, API, Architecture, Auth, Concurrency, Data, Database, Design, DevOps, File Handling, Frontend, Infrastructure, Messaging, Observability, Performance, Security, Serverless, Testing, Bash |
| Patterns | ~56 unique | Creational, Structural, Behavioral, Resilience |
| Guides | 112 unique | Architecture, Databases, DevOps, Security, Frontend, Code Quality, Testing, Planning, Deployment, Observability, Data & Storage |
| Docs | ~62 unique | ADRs, Runbooks, Checklists, Templates, Policies |

---

## Pending Content

### Pending Recipes (3)

**DevOps & Infrastructure (3)**
- `setup-ci-gitlab-pipelines` — GitLab CI pipeline configuration
- `ansible-playbook` — Ansible playbook for server configuration
- `setup-ssl-certificates` — Let's Encrypt + certbot automation

---

### Pending Patterns (37)

**Creational (2)**
- `object-pool-pattern` — Object Pool for expensive resource reuse
- `multiton-pattern` — Multiton (named singleton registry)

**Structural (16)**
- `facade-pattern` — Facade pattern for complex subsystem simplification
- `module-pattern` — Module pattern in JavaScript / ES modules
- `mixin-pattern` — Mixin pattern for code reuse
- `registry-pattern` — Registry / Service Locator pattern
- `front-controller-pattern` — Front Controller for web apps
- `page-controller-pattern` — Page Controller pattern
- `model-view-presenter-pattern` — MVP pattern
- `model-view-viewmodel-pattern` — MVVM pattern
- `entity-component-system-pattern` — ECS pattern for game engines
- `data-mapper-pattern` — Data Mapper ORM pattern
- `active-record-pattern` — Active Record pattern
- `data-access-object-pattern` — DAO pattern
- `unit-of-work-pattern` — Unit of Work for transaction management
- `identity-map-pattern` — Identity Map for object caching
- `eager-loading-pattern` — Eager Loading pattern
- `specification-pattern` — Specification pattern for query composition

**Behavioral (19)**
- `null-object-pattern` — Null Object pattern
- `blackboard-pattern` — Blackboard pattern for AI/heuristic systems
- `business-delegate-pattern` — Business Delegate pattern
- `composite-entity-pattern` — Composite Entity pattern
- `context-object-pattern` — Context Object pattern
- `intercepting-filter-pattern` — Intercepting Filter for web pipelines
- `manager-pattern` — Manager / Service pattern
- `marker-interface-pattern` — Marker Interface pattern
- `partial-class-pattern` — Partial Class pattern
- `plugin-pattern` — Plugin / Extension Point pattern
- `role-pattern` — Role pattern for dynamic behavior
- `twin-pattern` — Twin pattern (alternative to multiple inheritance)
- `type-object-pattern` — Type Object pattern for game entities
- `value-object-pattern` — Value Object (DDD) pattern
- `aggregate-pattern` — Aggregate Root pattern (DDD)
- `domain-event-pattern` — Domain Event pattern (DDD)
- `event-bus-pattern` — Event Bus / Mediator for decoupled communication
- `outbox-pattern` — Outbox pattern for reliable messaging
- `inbox-pattern` — Inbox pattern for idempotent consumers

---

## New Content

### New Patterns (20)

**Infrastructure & Integration**
1. `anti-corruption-layer-pattern` — Isolate legacy system dependencies
2. `back-pressure-pattern` — Flow control in streaming pipelines
3. `backend-for-frontend-pattern` — BFF aggregation for mobile/web
4. `claim-check-pattern` — Pass reference instead of large payloads
5. `compensating-transaction-pattern` — Saga rollback operations
6. `content-delivery-network-pattern` — Edge caching and distribution
7. `database-per-service-pattern` — Microservice data isolation
8. `distributed-lock-pattern` — Coordination across distributed nodes
9. `event-carried-state-transfer-pattern` — Replicate state via events
10. `gatekeeper-pattern` — Validate requests at the edge
11. `idempotent-consumer-pattern` — Exactly-once processing guarantee
12. `materialized-view-pattern` — Precomputed query result caches
13. `priority-queue-pattern` — Task scheduling by priority
14. `queue-based-load-leveling-pattern` — Smooth traffic spikes
15. `scheduler-agent-supervisor-pattern` — Resilient job scheduling
16. `sequential-convoy-pattern` — Preserve message ordering
17. `sharding-pattern` — Horizontal data partitioning
18. `static-content-hosting-pattern` — Serve assets from object storage
19. `strangler-fig-pattern` — Incremental legacy migration
20. `throttling-pattern` — Rate limit resource consumption

---

### New Guides (0)

All planned guides are now complete.

---

### New Docs / Templates (1)

**Operations**

**Security & Compliance**
1. `vulnerability-management-template` — CVE tracking and patching timeline

---

## Priority Matrix

Create content in this order for maximum traffic impact:

1. **Pending Recipes** — File Handling & Bash (quick wins, low competition)
2. **Pending Recipes** — Databases & Storage (consistent developer searches)
3. **Pending Recipes** — Testing (quality assurance searches)
4. **Pending Recipes** — DevOps (cloud/DevOps growth)
5. **Pending Recipes** — Auth & Security (high intent, growing concern)
6. **Pending Patterns** — Core structural/behavioral patterns (steady year-round traffic)
7. **New Patterns** — Infrastructure integration (backlink potential)
8. **Pending Guides** — Architecture (evergreen, high authority)
9. **Pending Guides** — Databases (complements recipe traffic)
10. **Pending Guides** — DevOps & Cloud (matches industry growth)
11. **New Guides** — Integration, Messaging, Data (expand coverage)
12. **Pending Docs** — Essential templates (conversion-oriented)
13. **New Docs** — Security, Operations, Infrastructure (complete the suite)
