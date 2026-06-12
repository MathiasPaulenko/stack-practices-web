# Content Backlog Phase 2 — 100 Additional Topics

> Second-wave content targets for StackPractices after Phase 1 completion.
> Check off (`[x]`) when an article is published in both EN and ES.
> Sorted by category and approximate search volume (high → medium).

---

## Recipes (30)

### API & Backend
- [ ] How to implement a GraphQL API (Apollo, Strawberry, Graphene)
- [ ] How to create API documentation with OpenAPI/Swagger
- [ ] How to build a real-time notification system with WebSockets and Redis pub/sub
- [ ] How to implement API request/response logging and audit trails
- [ ] How to implement request signing (HMAC, AWS Signature v4)
- [ ] How to build a serverless function (AWS Lambda, Cloud Functions, Azure Functions)
- [ ] How to implement content delivery with CDN edge caching

### Databases
- [ ] How to handle database deadlocks and retries
- [ ] How to set up database read replicas for scaling
- [ ] How to implement event sourcing in a relational database
- [ ] How to create and use database views and materialized views
- [ ] How to implement optimistic locking with versioning

### DevOps & Infrastructure
- [ ] How to implement graceful shutdown and zero-downtime restarts
- [ ] How to set up pre-commit hooks (husky, lint-staged, pre-commit)
- [ ] How to set up DNS and traffic routing with Cloudflare
- [ ] How to implement distributed session management with Redis
- [ ] How to set up SSL/TLS certificates with Let's Encrypt
- [ ] How to implement event-driven data synchronization between services

### Code Quality & Tooling
- [ ] How to implement dependency injection with manual wiring and containers
- [ ] How to implement a gRPC API with Protocol Buffers
- [ ] How to compress and minify static assets for production
- [ ] How to set up static code analysis with linters and formatters
- [ ] How to build a modular plugin system with dynamic loading

### Security
- [ ] How to encrypt and decrypt data at rest (AES, RSA)
- [ ] How to implement CSRF protection in web applications
- [ ] How to set up secrets rotation (HashiCorp Vault, AWS Secrets Manager)
- [ ] How to implement content security policy (CSP) headers
- [ ] How to perform dependency vulnerability scanning (Snyk, Dependabot)

### Performance & Architecture
- [ ] How to build a load balancer with health checks and sticky sessions
- [ ] How to implement search autocomplete with Redis Sorted Sets
- [ ] How to implement data pipelines with ETL/ELT workflows
- [ ] How to implement request coalescing (deduplication)
- [ ] How to set up connection pooling for databases and HTTP clients

### AI & Modern Dev
- [ ] How to build a RAG pipeline with LangChain and vector databases
- [ ] How to create a chatbot with OpenAI Assistants API
- [ ] How to implement semantic search with embeddings
- [ ] How to fine-tune a language model for code generation
- [ ] How to set up LLM prompt versioning and A/B testing

---

## Patterns (25)

### GoF / Classic
- [ ] Facade Pattern — simplify complex subsystem interfaces
- [ ] Null Object Pattern — eliminate null checks
- [ ] Object Pool Pattern — reuse expensive objects
- [ ] Specification Pattern — compose business rules
- [ ] Plugin Architecture Pattern — dynamic extension points and modular design

### Architectural
- [ ] Hexagonal Architecture (Ports and Adapters) — framework independence
- [ ] Clean Architecture — dependency rule and layers
- [ ] Layered Architecture — presentation, business, data layers
- [ ] BFF Pattern (Backend for Frontend) — tailor APIs per client
- [ ] Anti-Corruption Layer — protect domain from external changes

### Microservices & Distributed
- [ ] Strangler Fig Pattern — gradually migrate from monoliths
- [ ] Gateway Aggregation Pattern — combine multiple backend calls into one
- [ ] Materialized View Pattern — precomputed read models
- [ ] Outbox Pattern — reliable event publishing from transactions
- [ ] Pipeline Pattern — sequential data transformation stages

### Resilience & Reliability
- [ ] Throttling Pattern — control resource consumption
- [ ] API Gateway Pattern — centralized entry point with cross-cutting concerns
- [ ] Leader Election Pattern — distributed coordination and consensus
- [ ] Queue-Based Load Leveling — smooth traffic spikes
- [ ] Compensating Transaction Pattern — undo in distributed systems

### Data & State
- [ ] Unit of Work Pattern — transaction boundary management
- [ ] Snapshot Pattern — capture and restore object state
- [ ] Identity Map Pattern — prevent duplicate entity loading
- [ ] Specification Pattern (advanced) — composable query criteria and filtering
- [ ] Data Mapper Pattern — separate domain from persistence

---

## Guides (25)

### Architecture & Design
- [ ] API Gateway Design and Implementation — routing, rate limiting, auth
- [ ] Database Indexing Strategy Guide — composite, partial, covering indexes
- [ ] Serverless Architecture Guide — functions, events, and managed services
- [ ] Message Queue Selection Guide — RabbitMQ, Kafka, SQS, NATS comparison
- [ ] Multi-Tenant Architecture Guide — shared schema vs separate databases

### Development Practices
- [ ] Error Handling Best Practices — structured errors, retry, dead letter queues
- [ ] Functional Programming Guide — immutability, pure functions, monads
- [ ] Platform Engineering Guide — internal developer platforms and self-service
- [ ] Container Security Guide — image scanning, runtime protection, seccomp
- [ ] Technical Debt Management — identification, prioritization, payoff

### Frontend & Mobile
- [ ] Progressive Web App (PWA) Guide — service workers, offline, manifests
- [ ] Frontend State Management Guide — Redux, Zustand, Signals comparison
- [ ] Web Accessibility (a11y) Guide — WCAG 2.2, ARIA, screen readers
- [ ] Mobile App Security Guide — certificate pinning, keychain storage
- [ ] TypeScript Advanced Patterns — discriminated unions, branded types

### Performance & Observability
- [ ] JavaScript/TypeScript Performance Guide — v8 internals, profiling
- [ ] Cost Optimization Guide — cloud cost analysis and FinOps practices
- [ ] OpenTelemetry Implementation Guide — distributed tracing setup
- [ ] Edge Computing Guide — serverless at the edge and CDN functions
- [ ] GraphQL API Design Guide — schemas, resolvers, performance

### Career & Soft Skills
- [ ] Data Engineering Guide — pipelines, lakes, and warehouses
- [ ] Software Estimation Techniques — story points, t-shirt sizing, PERT
- [ ] Running Effective Engineering Retrospectives
- [ ] Building a Technical Onboarding Program
- [ ] Writing Engineering RFCs and Design Docs

---

## Documentation Templates (20)

### Process & Operations
- [ ] Request for Comments (RFC) Template — structured proposal format
- [ ] Capacity Planning Template — forecast resource needs
- [ ] Change Management Template — controlled deployment process
- [ ] Feature Flag Strategy Template — rollout and rollback plans
- [ ] Escalation Policy Template — when and how to escalate

### Incident & Post-Mortem
- [ ] Incident Severity Classification Template — SEV levels and response
- [ ] SLA Breach Notification Template — communication and remediation
- [ ] Blameless Post-Mortem Guide — culture and facilitation
- [ ] Runbook Decision Tree Template — if-this-then-that flows
- [ ] Service Degradation Communication Template

### Team & Knowledge
- [ ] Engineering Ladder / Career Path Template — levels and expectations
- [ ] Team Charter Template — roles, norms, working agreements
- [ ] Technical Spec Template — non-functional requirements
- [ ] API Versioning Policy Template — deprecation and sunset rules
- [ ] Service Catalog Entry Template — discoverability metadata

### Compliance & Security
- [ ] Threat Modeling Template — STRIDE and attack trees
- [ ] Compliance Gap Analysis Template (SOC2, ISO 27001)
- [ ] Vendor Security Assessment Template
- [ ] Penetration Test Remediation Template — findings and fix tracking
- [ ] Access Control Review Template

---

## Stats

| Category | Target | Published | % |
|----------|--------|-----------|---|
| Recipes | 38 | 0 | 0% |
| Patterns | 25 | 0 | 0% |
| Guides | 25 | 0 | 0% |
| Docs | 20 | 0 | 0% |
| **Total** | **108** | **0** | **0%** |

---

## Notes

- **Selection criteria**: emerging high-traffic topics (AI/LLM integration, serverless, advanced security), commonly asked in senior interviews, and gaps in the Phase 1 catalog.
- **Priority order**: Recipes first (highest SEO traffic), then Guides (authority building), Patterns (internal linking), Docs (utility).
- **Language requirement**: every item must be published in both EN and ES before checking off.
- **SEO targets**: target "how to" + technology + action verb combinations for maximum long-tail capture.
