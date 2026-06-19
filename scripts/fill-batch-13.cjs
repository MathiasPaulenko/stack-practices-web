const fs = require('fs');

function fillBody(filePath, newBody) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parts = content.split('---');
  if (parts.length < 3) { console.error('Invalid frontmatter in', filePath); return; }
  const frontmatter = '---' + parts[1] + '---';
  fs.writeFileSync(filePath, frontmatter + '\n' + newBody.trim() + '\n', 'utf8');
  console.log('Updated:', filePath);
}

const articles = {
  'src/content/recipes/architecture/dependency-injection.md': `## Overview

Dependency Injection (DI) is a design pattern where objects receive their dependencies from external sources rather than creating them internally. It decouples components, makes code testable without mocks, and enables flexible composition of services.

## When to Use

Use this resource when:
- Writing unit tests that require substituting real services with test doubles
- Building modular applications where components should not know about concrete implementations
- Managing complex object graphs with transitive dependencies
- Implementing plugin architectures or strategy patterns

## Solution

### Constructor Injection (TypeScript)

\`\`\`typescript
interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

class UserService {
  constructor(
    private emailService: EmailService,
    private userRepository: UserRepository
  ) {}

  async register(email: string, password: string) {
    const user = await this.userRepository.create({ email, password });
    await this.emailService.send(email, 'Welcome', 'Thanks for signing up!');
    return user;
  }
}

// Production wiring
const userService = new UserService(
  new SendGridEmailService(),
  new PostgresUserRepository()
);

// Test wiring
const userServiceTest = new UserService(
  new FakeEmailService(),
  new InMemoryUserRepository()
);
\`\`\`

### Property Injection (Python)

\`\`\`python
from typing import Protocol

class Logger(Protocol):
    def log(self, message: str) -> None: ...

class ConsoleLogger:
    def log(self, message: str) -> None:
        print(f"[LOG] {message}")

class OrderProcessor:
    logger: Logger = ConsoleLogger()  # Default

    def process(self, order: dict) -> None:
        self.logger.log(f"Processing order {order['id']}")
        # ...
\`\`\`

### DI Container (Java with Spring)

\`\`\`java
@Service
public class PaymentService {
    private final PaymentGateway gateway;
    private final FraudChecker fraudChecker;

    public PaymentService(PaymentGateway gateway, FraudChecker fraudChecker) {
        this.gateway = gateway;
        this.fraudChecker = fraudChecker;
    }
}

@Configuration
public class AppConfig {
    @Bean
    public PaymentGateway paymentGateway() {
        return new StripeGateway();
    }
}
\`\`\`

## Explanation

DI inverts control: instead of components finding or creating their dependencies, the container or caller provides them. This enables:

1. **Testability**: Swap real services for fakes or stubs without modifying code
2. **Flexibility**: Change implementations without touching consumers
3. **Lifecycle management**: Containers can manage singletons, scoped instances, and disposal
4. **AOP support**: Decorators and interceptors can be injected transparently

## Variants

| Approach | Use Case | Trade-off |
|----------|----------|-----------|
| Constructor | Mandatory dependencies | Most explicit; best for testing |
| Property/Setter | Optional dependencies | Can create partially initialized objects |
| Method | Per-call dependencies | Verbose; used for strategy injection |
| Service Locator | Legacy code | Hides dependencies; harder to test |

## Best Practices

- **Prefer constructor injection**: Makes dependencies explicit and immutable
- **Avoid service locators**: They hide dependencies and make testing harder
- **Use interfaces/protocols**: Depend on abstractions, not concrete types
- **Keep composition roots shallow**: Wire dependencies at the application entry point
- **Avoid primitive obsession**: Wrap config values in value objects (e.g., ApiKey, Timeout)

## Common Mistakes

1. **Constructor explosion**: More than 5 parameters signals a missing abstraction
2. **Leaking container**: Passing the DI container into services defeats the purpose
3. **Tight coupling to framework**: Use standard annotations (@Inject) when possible
4. **Ignoring lifecycle**: Scoped services resolved as singletons cause memory leaks
5. **Circular dependencies**: Refactor into events or a mediator if A depends on B and B on A

## Frequently Asked Questions

**Q: Is DI only for object-oriented languages?**
A: No. Functional languages achieve similar decoupling via higher-order functions and partial application.

**Q: When should I use a DI container vs. manual wiring?**
A: Manual wiring for simple apps (<50 services). Containers for complex graphs, lifecycle management, or AOP.

**Q: Does DI hurt performance?**
A: Negligible overhead at runtime. Resolve dependencies at startup (composition root), not per-request.
`,

  'src/content/recipes/api/rest-api-design.md': `## Overview

REST is the dominant architectural style for designing networked APIs. A well-designed REST API uses HTTP semantics consistently, provides predictable URLs, and returns meaningful status codes. Poor API design leads to confused consumers, broken clients, and brittle integrations.

## When to Use

Use this resource when:
- Designing a new public or internal API from scratch
- Refactoring a legacy RPC-style API to REST
- Documenting an API with OpenAPI/Swagger
- Choosing between REST, GraphQL, or gRPC for a new service

## Solution

### Resource Naming

\`\`\`
GET    /users                # List users
GET    /users/:id            # Get a user
POST   /users                # Create a user
PUT    /users/:id            # Full update
PATCH  /users/:id            # Partial update
DELETE /users/:id            # Remove a user
GET    /users/:id/orders     # Nested resource
\`\`\`

### Status Codes

\`\`\`javascript
// Successful responses
200 OK              // GET, PUT, DELETE success
201 Created         // POST success
204 No Content      // DELETE success (optional)

// Client errors
400 Bad Request     // Validation failure
401 Unauthorized    // Missing auth token
403 Forbidden       // Insufficient permissions
404 Not Found       // Resource does not exist
409 Conflict        // Duplicate or state conflict
422 Unprocessable   // Semantic validation error

// Server errors
500 Internal Error  // Unexpected server failure
502 Bad Gateway     // Upstream failure
503 Service Unavail // Rate limiting or maintenance
\`\`\`

### Pagination with Cursor

\`\`\`json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ==",
    "prev_cursor": null,
    "has_more": true
  }
}
\`\`\`

## Explanation

REST leverages HTTP as an application protocol, not just a transport:

- **Idempotency**: GET, PUT, DELETE should be safe to retry. POST is not idempotent.
- **Statelessness**: Each request contains all information needed; no server-side session.
- **Cacheability**: Use Cache-Control, ETag, and Last-Modified headers aggressively.
- **HATEOAS**: Include links to related resources (optional but improves discoverability).

## Variants

| Style | Use Case | Notes |
|-------|----------|-------|
| REST | CRUD, resource-oriented | Mature ecosystem; HTTP caching |
| GraphQL | Flexible queries; mobile | Single endpoint; client-driven |
| gRPC | Internal microservices | Binary; streaming; schema-first |
| JSON-RPC | Simple RPC | Lightweight; less HTTP-native |

## Best Practices

- **Use plural nouns**: /orders, not /order or /getOrder
- **Version in URL**: /v1/users (more explicit than headers)
- **Return consistent envelope**: { data, error, meta } structure
- **Support filtering**: GET /users?role=admin&active=true
- **Rate limit early**: Return 429 with Retry-After header

## Common Mistakes

1. **Using verbs in URLs**: /createUser, /getOrders — use nouns and HTTP methods instead
2. **Ignoring HTTP status codes**: Returning 200 with an error body breaks middleware
3. **Not versioning**: Breaking changes without versioning strand existing clients
4. **Over-fetching**: Returning huge nested objects when clients need a subset
5. **Missing content negotiation**: Not respecting Accept and Content-Type headers

## Frequently Asked Questions

**Q: Should I use PUT or PATCH for updates?**
A: PUT for full replacement (all fields required). PATCH for partial updates (only changed fields).

**Q: How do I handle file uploads in REST?**
A: Use multipart/form-data for simple uploads. For large files, use signed URLs (S3, GCS) or resumable uploads.

**Q: Is HATEOAS worth implementing?**
A: For public APIs consumed by diverse clients, yes. For internal APIs with generated clients, optional.
`,

  'src/content/recipes/frontend/websockets-realtime.md': `## Overview

WebSockets provide full-duplex, persistent communication between browsers and servers over a single TCP connection. Unlike HTTP polling, WebSockets enable real-time data flow with minimal latency, making them ideal for chat, live dashboards, multiplayer games, and collaborative editing.

## When to Use

Use this resource when:
- Building chat applications or live comment systems
- Streaming real-time data to dashboards (stocks, metrics, IoT)
- Implementing multiplayer game state synchronization
- Creating collaborative editing tools (like Google Docs)

## Solution

### Server with ws (Node.js)

\`\`\`javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log('Client connected:', req.socket.remoteAddress);

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    // Broadcast to all connected clients
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'chat',
          from: message.user,
          text: message.text,
          timestamp: Date.now()
        }));
      }
    });
  });

  ws.on('close', () => clients.delete(ws));
  ws.on('error', (err) => console.error('WebSocket error:', err));
});
\`\`\`

### Client Reconnection Logic

\`\`\`javascript
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectInterval = 3000;
    this.maxReconnectInterval = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectInterval = 3000; // Reset backoff
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.onMessage(data);
    };

    this.ws.onclose = () => {
      console.log('Disconnected, reconnecting...');
      setTimeout(() => this.connect(), this.reconnectInterval);
      this.reconnectInterval = Math.min(
        this.reconnectInterval * 2,
        this.maxReconnectInterval
      );
    };

    this.ws.onerror = (err) => console.error('WebSocket error:', err);
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
\`\`\`

## Explanation

WebSocket handshake upgrades an HTTP connection:

1. **Client sends upgrade request** with Connection: Upgrade and Upgrade: websocket headers
2. **Server responds 101 Switching Protocols** to confirm
3. **Bidirectional frames** are exchanged over the persistent TCP socket
4. **Close handshake** cleanly terminates the connection

**Key differences from SSE**:
- WebSockets are bidirectional; SSE is server-to-client only
- WebSockets use binary frames; SSE uses text/event-stream
- WebSockets need custom heartbeat/ping; SSE uses HTTP keep-alive

## Variants

| Technology | Direction | Best For |
|------------|-----------|----------|
| WebSockets | Bidirectional | Chat, games, collaboration |
| SSE | Server-to-client | Live feeds, notifications |
| Long Polling | Server-to-client | Legacy browser support |
| MQTT over WebSocket | Pub/sub | IoT, telemetry |

## Best Practices

- **Implement heartbeat/ping**: Detect dead connections with periodic ping/pong frames
- **Authenticate during handshake**: Pass JWT in query string or subprotocol
- **Use rooms/channels**: Do not broadcast everything to all clients
- **Handle backpressure**: Drop or queue messages if clients are slow
- **Fallback to SSE**: For clients behind strict proxies that block WebSockets

## Common Mistakes

1. **No reconnection logic**: Network hiccups permanently disconnect users
2. **Broadcasting to all clients**: Scales poorly; use pub/sub or channel rooms
3. **Ignoring memory leaks**: Closed connections not removed from client sets cause OOM
4. **Sending binary without framing**: Always serialize structured data (JSON, Protobuf)
5. **Not handling proxy timeouts**: Corporate proxies may kill idle connections after 30s

## Frequently Asked Questions

**Q: How many concurrent WebSocket connections can a server handle?**
A: Node.js handles ~10k-50k connections per core. Use Redis pub/sub or a message bus to scale horizontally.

**Q: Can WebSockets work over HTTPS?**
A: Yes — use wss:// (WebSocket Secure). Browsers block mixed-content ws:// on HTTPS pages.

**Q: What is the best fallback if WebSockets are blocked?**
A: Server-Sent Events for server-to-client; HTTP long polling for bidirectional needs.
`,

  'src/content/recipes/performance/caching-strategies.md': `## Overview

Caching is the single most effective technique for improving application performance. By storing frequently accessed data closer to consumers — in browser memory, CDN edges, or in-memory stores — you reduce latency, decrease database load, and improve user experience. Choosing the right caching strategy depends on data freshness requirements and read/write patterns.

## When to Use

Use this resource when:
- Database queries are becoming a bottleneck under load
- API response times exceed 200ms for read-heavy endpoints
- Serving static assets (images, JS, CSS) to global users
- Building high-traffic applications where stale data is acceptable

## Solution

### Redis Cache-Aside (Node.js)

\`\`\`javascript
const redis = require('redis');
const client = redis.createClient();

async function getUser(userId) {
  const cacheKey = \`user:\${userId}\`;
  
  // Try cache first
  const cached = await client.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Cache miss: query database
  const user = await db.users.findById(userId);
  if (user) {
    await client.setEx(cacheKey, 3600, JSON.stringify(user)); // TTL 1 hour
  }
  return user;
}
\`\`\`

### Stale-While-Revalidate (HTTP)

\`\`\`javascript
// Express middleware
app.get('/api/products', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  // Clients can use cached data for 5 minutes while revalidating in background
  res.json(products);
});
\`\`\`

### CDN Edge Caching (CloudFront/Vercel)

\`\`\`json
{
  "routes": [
    {
      "src": "/api/public/.*",
      "headers": {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400"
      }
    }
  ]
}
\`\`\`

## Explanation

| Strategy | Pattern | Best For |
|----------|---------|----------|
| Cache-Aside | Application checks cache, falls back to DB | Read-heavy; simple to implement |
| Read-Through | Cache proxies DB transparently | Read-heavy; library handles logic |
| Write-Through | Writes update cache and DB simultaneously | Data consistency critical |
| Write-Behind | Writes update cache; async DB flush | Write-heavy; eventual consistency |
| Refresh-Ahead | Background refresh before expiry | Predictable access patterns |

**Cache invalidation approaches**:
- **Time-based (TTL)**: Simple but can serve stale data
- **Key-based**: Include version or hash in cache key
- **Event-based**: Invalidate on data change via message bus

## Variants

| Layer | Technology | Latency | Use Case |
|-------|------------|---------|----------|
| Browser | LocalStorage, IndexedDB | ~1ms | Offline-first apps |
| CDN | CloudFront, Cloudflare, Fastly | ~10-50ms | Static assets, API edge caching |
| Application | Redis, Memcached | ~1ms | Session store, hot data |
| Database | Query cache, materialized views | ~1-10ms | Repeated complex queries |
| Disk | Page cache, OS buffers | ~0.1ms | File system reads |

## Best Practices

- **Set TTLs based on data volatility**: User profiles (1h), product catalogs (24h), stock prices (10s)
- **Cache at multiple layers**: Browser + CDN + Redis + DB query cache
- **Use cache stampsede protection**: Lock during cache miss to prevent thundering herd
- **Monitor hit rates**: Below 80% signals misconfiguration or too-short TTL
- **Version your cache keys**: Include app version to invalidate on deploy

## Common Mistakes

1. **Caching everything**: Static data yes; user-specific or rapidly changing data no
2. **No invalidation strategy**: Stale data persists indefinitely without TTL or events
3. **Thundering herd**: 1000 requests hit a cold cache simultaneously; use locking
4. **Cache poisoning**: Unvalidated user input stored in shared cache affects all users
5. **Ignoring cache warming**: Production deploys start with empty caches and high latency

## Frequently Asked Questions

**Q: How do I prevent cache stampedes?**
A: Use a mutex or Redis SET NX (lock) so only one request rebuilds the cache while others wait.

**Q: Should I cache GraphQL responses?**
A: Yes, but cache by query hash + variables. Apollo Server has built-in response caching.

**Q: What is the difference between Redis and Memcached?**
A: Redis supports data structures (lists, sets, sorted sets) and persistence. Memcached is simpler and slightly faster for plain key-value caching.
`,

  'src/content/recipes/devops/cicd-pipeline-setup.md': `## Overview

Continuous Integration and Continuous Deployment (CI/CD) pipelines automate the journey from code commit to production deployment. A well-configured pipeline runs tests, builds artifacts, scans for vulnerabilities, and deploys to staging or production with zero manual intervention. This eliminates human error, speeds up releases, and provides fast feedback to developers.

## When to Use

Use this resource when:
- Setting up a new project and want automated testing from day one
- Migrating from manual deployments to automated releases
- Adding security scanning, linting, or code quality gates to your workflow
- Building a multi-environment deployment strategy (dev → staging → prod)

## Solution

### GitHub Actions Workflow

\`\`\`yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=moderate

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          npm run build
          npm run deploy:staging
\`\`\`

### GitLab CI Configuration

\`\`\`yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"

test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run test:ci
  coverage: '/All files[^|]\\|[^|]\\s+([\\d.]+)/'

deploy_prod:
  stage: deploy
  script:
    - npm run deploy:production
  only:
    - main
  environment:
    name: production
    url: https://api.example.com
\`\`\`

## Explanation

A production CI/CD pipeline typically includes:

1. **Trigger**: Push, pull request, or scheduled cron job
2. **Build**: Compile, bundle, and create artifacts
3. **Test**: Unit tests, integration tests, linting, type checking
4. **Security**: Dependency audit, SAST, secret scanning
5. **Deploy**: Push to staging, run smoke tests, promote to production
6. **Notify**: Slack, email, or incident management system

**Deployment strategies**:
- **Basic**: Direct deploy to production
- **Blue-Green**: Two identical environments; switch traffic instantly
- **Canary**: Route 1% traffic to new version; increase gradually
- **Rolling**: Replace instances one by one with zero downtime

## Variants

| Platform | Best For | Notes |
|----------|----------|-------|
| GitHub Actions | Open source, GitHub repos | Free for public repos; marketplace of actions |
| GitLab CI | GitLab-hosted projects | Built-in; great for monorepos |
| CircleCI | Fast parallel testing | Excellent Docker support |
| Jenkins | On-premise, custom plugins | Self-hosted; high maintenance |
| ArgoCD | Kubernetes GitOps | Declarative; syncs cluster to Git state |

## Best Practices

- **Fail fast**: Run linting and fast unit tests before expensive integration tests
- **Parallelize jobs**: Split tests by file or module to reduce wall-clock time
- **Cache dependencies**: Cache node_modules, pip cache, and Docker layers between runs
- **Use secrets management**: Never commit API keys; use GitHub/GitLab secrets or Vault
- **Require reviews for prod**: Use branch protection and CODEOWNERS

## Common Mistakes

1. **No artifact promotion**: Rebuilding in each stage introduces non-determinism
2. **Testing only in CI**: Developers push broken code and wait for CI feedback
3. **Secrets in environment variables**: Visible in job logs; use masked secrets instead
4. **No rollback plan**: Failed deployments need instant revert via blue-green or previous image
5. **Ignoring flaky tests**: Random failures erode trust in the pipeline

## Frequently Asked Questions

**Q: Should I deploy on every commit to main?**
A: Yes for staging. For production, use a manual gate or deploy on tagged releases.

**Q: How do I handle database migrations in CI/CD?**
A: Run migrations in a separate job before the deploy. Use backward-compatible migrations to avoid downtime.

**Q: Can I use the same pipeline for microservices?**
A: Yes, but use path-based triggers so only affected services build and deploy. Monorepo tools (Nx, Turborepo) help.
`,

  'src/content/recipes/observability/structured-logging.md': `## Overview

Structured logging replaces free-text log messages with machine-readable JSON objects. This enables powerful filtering, aggregation, and correlation across distributed services. Instead of parsing regex from strings like "User 123 logged in at 10:00", structured logs emit { "event": "login", "user_id": 123, "timestamp": "..." } — making log analysis trivial in ELK, Loki, or cloud platforms.

## When to Use

Use this resource when:
- Running more than one service that needs centralized log aggregation
- Debugging issues that span multiple microservices or async jobs
- Building dashboards and alerts based on log events
- Migrating from plain text logs to a modern observability stack

## Solution

### JSON Logger (Node.js with Pino)

\`\`\`javascript
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'user-api', version: '1.2.3' }
});

// Contextual logging with correlation IDs
function handleRequest(req, res) {
  const child = logger.child({
    request_id: req.headers['x-request-id'] || crypto.randomUUID(),
    user_id: req.user?.id,
    route: req.route?.path
  });

  child.info({ event: 'request_start', method: req.method });
  
  try {
    const result = processOrder(req.body);
    child.info({ event: 'order_processed', order_id: result.id });
  } catch (err) {
    child.error({ event: 'order_failed', error: err.message, stack: err.stack });
  }
}
\`\`\`

### Python with structlog

\`\`\`python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

def transfer_funds(from_account, to_account, amount):
    logger.info(
        "transfer_initiated",
        from_account=from_account,
        to_account=to_account,
        amount_cents=amount,
        request_id=get_current_request_id()
    )
\`\`\`

### Correlation ID Middleware (Go)

\`\`\`go
func CorrelationIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Request-ID")
        if id == "" {
            id = uuid.New().String()
        }
        ctx := context.WithValue(r.Context(), "request_id", id)
        w.Header().Set("X-Request-ID", id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
\`\`\`

## Explanation

**Key fields for every log entry**:
- **timestamp**: ISO 8601 with timezone
- **level**: debug, info, warn, error, fatal
- **service**: Application or component name
- **request_id**: Correlates all logs for a single user request across services
- **event**: Machine-readable action name (snake_case)
- **message**: Human-readable description (optional in pure structured logging)

**Why structured over text?**
- Query logs without brittle regex: { event: "payment_failed", amount: { $gt: 1000 } }
- Automatic aggregation by any field in Elasticsearch/Loki
- Easy integration with tracing (OpenTelemetry) and metrics

## Variants

| Stack | Components | Best For |
|-------|------------|----------|
| ELK | Elasticsearch, Logstash, Kibana | Full-text search; complex dashboards |
| PLG | Promtail, Loki, Grafana | Kubernetes-native; label-based queries |
| CloudWatch | AWS native | AWS infrastructure; minimal setup |
| Datadog | SaaS | APM + logs + traces unified |
| Splunk | Enterprise | Compliance; advanced analytics |

## Best Practices

- **Always include request_id**: Trace a single user journey across 10+ services
- **Use log levels consistently**: debug for dev; info for normal operations; error for actionable issues
- **Never log sensitive data**: Mask PII, tokens, and passwords before serialization
- **Log at service boundaries**: Entry/exit of every HTTP handler, queue consumer, and background job
- **Emit metrics from logs**: Use log-derived metrics for dashboards instead of custom instrumentation

## Common Mistakes

1. **String concatenation in logs**: \`log.info("User " + id + " failed")\` — prevents indexing
2. **Missing context**: Logs say "Payment failed" without user_id, amount, or error code
3. **Logging at wrong level**: info for every line of code; error for handled exceptions
4. **Ignoring log volume**: Debug logs in production can cost thousands in ingestion fees
5. **Inconsistent field names**: userId vs user_id vs userID breaks aggregation

## Frequently Asked Questions

**Q: Should I use a logging library or console.log?**
A: Always use a library (Pino, Winston, structlog, Zap). They handle buffering, serialization, and log levels correctly.

**Q: How do I correlate logs across microservices?**
A: Propagate a correlation ID in HTTP headers (X-Request-ID) and include it in every log entry. Use a tracing library (OpenTelemetry) for full distributed tracing.

**Q: What is the difference between logs and traces?**
A: Logs are discrete events with timestamps. Traces connect related operations (spans) across services. Use both: structured logs for events, traces for request flow.
`
};

for (const [filePath, body] of Object.entries(articles)) {
  fillBody(filePath, body);
}

console.log('All EN articles updated for batch 13.');
