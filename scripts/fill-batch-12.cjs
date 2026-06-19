const fs = require('fs');
const path = require('path');

function fillBody(filePath, newBody) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parts = content.split('---');
  if (parts.length < 3) {
    console.error('Invalid frontmatter in', filePath);
    return;
  }
  const frontmatter = '---' + parts[1] + '---';
  fs.writeFileSync(filePath, frontmatter + '\n' + newBody.trim() + '\n', 'utf8');
  console.log('Updated:', filePath);
}

const articles = {
  'src/content/recipes/frontend/javascript-event-loop.md': `## Overview

The JavaScript event loop is the heart of asynchronous programming in browsers and Node.js. It orchestrates the execution of code, collects and processes events, and executes queued sub-tasks. Understanding how the call stack, task queue, and microtask queue interact is essential for writing performant, non-blocking applications.

## When to Use

Use this resource when:
- Debugging mysterious asynchronous bugs or race conditions
- Optimizing UI responsiveness in frontend applications
- Choosing between setTimeout, Promise, and queueMicrotask
- Understanding why code order does not always match execution order

## Solution

### Visualizing the Event Loop

\`\`\`javascript
console.log('1. Script start');

setTimeout(() => {
  console.log('2. setTimeout (macrotask)');
}, 0);

Promise.resolve().then(() => {
  console.log('3. Promise (microtask)');
});

queueMicrotask(() => {
  console.log('4. queueMicrotask');
});

console.log('5. Script end');

// Output order:
// 1. Script start
// 5. Script end
// 3. Promise (microtask)
// 4. queueMicrotask
// 2. setTimeout (macrotask)
\`\`\`

### Handling Long-Running Tasks

\`\`\`javascript
function processLargeArray(arr, chunkSize = 1000) {
  let index = 0;

  function processChunk() {
    const chunk = arr.slice(index, index + chunkSize);
    chunk.forEach(item => heavyComputation(item));
    index += chunkSize;

    if (index < arr.length) {
      setTimeout(processChunk, 0); // Yield to event loop
    }
  }

  processChunk();
}
\`\`\`

## Explanation

The event loop operates in phases:

1. **Call Stack**: Executes synchronous code. When empty, the event loop checks queues.
2. **Microtask Queue**: Processes Promise callbacks, queueMicrotask, and MutationObserver callbacks. Cleared entirely before next macrotask.
3. **Macrotask Queue**: Processes setTimeout, setInterval, setImmediate (Node.js), and I/O events.
4. **Render Phase**: Browsers may update the DOM and repaint if time allows.

**Critical rule**: All microtasks execute before the next macrotask. This can starve the macrotask queue if microtasks recursively enqueue more microtasks.

## Variants

| Runtime | Macrotask API | Microtask API | Notes |
|---------|--------------|---------------|-------|
| Browser | setTimeout, requestAnimationFrame | Promise, queueMicrotask | rAF runs before paint |
| Node.js | setTimeout, setImmediate | Promise, process.nextTick | nextTick runs before Promises |
| Deno | setTimeout | Promise, queueMicrotask | Aligns with browser behavior |

## Best Practices

- **Break heavy work into chunks**: Use setTimeout or requestIdleCallback to yield control
- **Prefer microtasks for DOM updates**: queueMicrotask ensures DOM reads are batched
- **Avoid recursive microtask enqueuing**: Can freeze the event loop indefinitely
- **Use requestAnimationFrame for visual updates**: Synchronizes with the browser's render cycle
- **Profile with Performance tab**: Chrome DevTools visualizes microtask and macrotask timing

## Common Mistakes

1. **Assuming setTimeout(0) is immediate**: It is always slower than microtasks
2. **Blocking the main thread**: Synchronous loops >50ms cause jank and dropped frames
3. **Forgetting nextTick in Node.js**: process.nextTick runs before Promises, not after
4. **Mixing microtask recursion**: Promise.resolve().then(() => Promise.resolve().then(...)) can deadlock
5. **Ignoring the render phase**: Heavy microtask queues prevent browser painting

## Frequently Asked Questions

**Q: Why does Promise.then() run before setTimeout(0)?**
A: Promise callbacks enter the microtask queue, which has higher priority than the macrotask queue where setTimeout callbacks live.

**Q: What is the difference between queueMicrotask and Promise.resolve().then()?**
A: Functionally identical in most cases, but queueMicrotask is more explicit and slightly more efficient.

**Q: How do I prevent the event loop from freezing?**
A: Break work into small chunks using setTimeout, requestIdleCallback, or Web Workers for CPU-intensive tasks.
`,

  'src/content/recipes/ai/ai-agents-tool-use.md': `## Overview

AI agents are autonomous systems that use large language models to reason, plan, and execute tasks by calling external tools. Unlike simple chatbots, agents can search the web, query databases, run code, and interact with APIs to accomplish complex, multi-step objectives.

## When to Use

Use this resource when:
- Building autonomous assistants that need real-time data
- Creating workflows that require multiple API calls chained together
- Implementing reasoning over external knowledge sources
- Designing self-correcting systems that can retry failed operations

## Solution

### ReAct Pattern Agent (Python)

\`\`\`python
import openai
import json
from typing import Callable

def agent_react(query: str, tools: dict[str, Callable]) -> str:
    messages = [
        {"role": "system", "content": "You are a helpful assistant. Use tools when needed."},
        {"role": "user", "content": query}
    ]

    for _ in range(5):  # Max iterations
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=messages,
            tools=[
                {"type": "function", "function": {"name": n, "parameters": {}}}
                for n in tools.keys()
            ]
        )

        msg = response.choices[0].message
        if not msg.tool_calls:
            return msg.content

        messages.append(msg)
        for call in msg.tool_calls:
            result = tools[call.function.name](**json.loads(call.function.arguments))
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": str(result)
            })

    return "Max iterations reached"
\`\`\`

### Tool Definition Example

\`\`\`python
def search_wikipedia(query: str) -> str:
    """Search Wikipedia for a topic."""
    # Implementation omitted
    return f"Results for {query}"

tools = {"search_wikipedia": search_wikipedia}
result = agent_react("Who won the 2022 FIFA World Cup?", tools)
\`\`\`

## Explanation

The ReAct (Reasoning + Acting) pattern alternates between:

1. **Thought**: The LLM reasons about what to do next
2. **Action**: The LLM calls a tool with structured arguments
3. **Observation**: The tool result is fed back as context
4. **Repeat**: Until the task is complete

Key design decisions:
- **Tool schemas**: Use OpenAI's function calling format for type safety
- **Iteration limits**: Prevent infinite loops with a max step count
- **Error handling**: Tools should return errors gracefully, not crash
- **Context window**: Summarize long tool outputs to fit token limits

## Variants

| Framework | Pattern | Best For |
|-----------|---------|----------|
| LangChain | ReAct, Plan-and-Execute | Rapid prototyping |
| AutoGen | Multi-agent conversation | Collaborative tasks |
| CrewAI | Role-based agents | Business workflows |
| Custom | ReAct with tool registry | Production systems |

## Best Practices

- **Define clear tool interfaces**: Each tool needs a name, description, and JSON schema
- **Limit tool count**: 3-5 well-designed tools outperform 20 vague ones
- **Add validation**: Verify tool arguments before execution
- **Log all steps**: Agent reasoning is opaque; logging aids debugging
- **Implement timeouts**: External tools can hang; set generous timeouts

## Common Mistakes

1. **Giving agents too many tools**: Increases confusion and error rates
2. **Missing error handling**: A failed tool call without recovery crashes the loop
3. **Ignoring token limits**: Long observation histories exhaust the context window
4. **Not validating outputs**: Agents can hallucinate tool arguments
5. **Skipping human review**: Autonomous agents should have kill switches

## Frequently Asked Questions

**Q: What is the difference between RAG and an agent?**
A: RAG retrieves documents and answers once. Agents can take multiple actions, use tools, and iterate until a goal is met.

**Q: How many tools should an agent have?**
A: Start with 2-3. Research shows accuracy drops significantly beyond 5-7 tools.

**Q: Can agents run without OpenAI?**
A: Yes. Local models (Llama, Mistral) support tool calling via structured output formats like JSON mode.
`,

  'src/content/recipes/security/password-hashing-production.md': `## Overview

Storing passwords securely is one of the most critical responsibilities of any application. Modern password hashing algorithms like bcrypt, scrypt, and Argon2 are designed to be slow and memory-hard, making brute-force attacks computationally infeasible even if the database is compromised.

## When to Use

Use this resource when:
- Implementing user authentication from scratch
- Migrating from legacy hashing (MD5, SHA-1) to modern algorithms
- Choosing parameters for bcrypt, scrypt, or Argon2
- Auditing an existing authentication system

## Solution

### bcrypt (Node.js)

\`\`\`javascript
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 12; // Adjust based on hardware (10-14 typical)
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
\`\`\`

### Argon2 (Python)

\`\`\`python
import argon2

ph = argon2.PasswordHasher(
    time_cost=3,      # Iterations
    memory_cost=65536, # 64 MB in KiB
    parallelism=4     # Threads
)

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(password: str, hash: str) -> bool:
    try:
        ph.verify(hash, password)
        return True
    except argon2.exceptions.VerifyMismatchError:
        return False
\`\`\`

### scrypt (Go)

\`\`\`go
package main

import (
    "golang.org/x/crypto/scrypt"
    "crypto/rand"
    "encoding/base64"
)

func hashPassword(password string) (string, error) {
    salt := make([]byte, 16)
    rand.Read(salt)
    hash, err := scrypt.Key([]byte(password), salt, 32768, 8, 1, 32)
    if err != nil { return "", err }
    return base64.StdEncoding.EncodeToString(salt) + "$" + base64.StdEncoding.EncodeToString(hash), nil
}
\`\`\`

## Explanation

| Algorithm | Memory-Hard | Configurable | Recommended For |
|-----------|-------------|--------------|-----------------|
| bcrypt | No | Cost factor only | General use, wide library support |
| scrypt | Yes | Cost + memory + parallelism | Embedded, Go projects |
| Argon2 | Yes (winner of PHC) | Time + memory + parallelism | New projects, highest security |

**Critical rules**:
- Never roll your own crypto. Use well-vetted libraries.
- Salt must be unique per password and stored alongside the hash.
- Pepper (server-side secret) adds defense-in-depth but is not a substitute for hashing.
- Re-hash on login if cost parameters increase.

## Variants

| Language | Library | Algorithm | Notes |
|----------|---------|-----------|-------|
| Node.js | bcrypt | bcrypt | Most popular; native bindings |
| Python | argon2-cffi | Argon2 | Winner of Password Hashing Competition |
| Go | golang.org/x/crypto | scrypt, bcrypt, Argon2 | Standard library extensions |
| Java | spring-security-crypto | bcrypt, Argon2 | Spring abstraction |
| Rust | argon2 | Argon2 | zeroize support for memory clearing |

## Best Practices

- **Use Argon2id for new projects**: It won the Password Hashing Competition (PHC)
- **Target 250ms verification time**: Tune cost factors to your hardware
- **Store salts with hashes**: The salt is not a secret; prepend it to the hash
- **Add a pepper**: A server-side secret added to the password before hashing
- **Re-hash on login**: Transparently upgrade legacy hashes when users log in

## Common Mistakes

1. **Using SHA-256 or MD5 for passwords**: Fast algorithms are trivial to brute-force with GPUs
2. **Hard-coding salts**: Every password needs a unique, random salt
3. **Ignoring timing attacks**: Use constant-time comparison (built into modern libraries)
4. **Forgetting to update cost factors**: Hardware gets faster; re-tune annually
5. **Storing passwords in plain text**: Even "temporarily" is a catastrophic risk

## Frequently Asked Questions

**Q: Which algorithm should I choose in 2025?**
A: Argon2id is the recommended choice for new systems. bcrypt is acceptable if Argon2 libraries are unavailable.

**Q: How do I migrate users from MD5 to Argon2?**
A: Re-hash on next login: verify with MD5, then hash with Argon2 and replace. Mark the migration in the database.

**Q: Should I hash client-side before sending?**
A: No. Client-side hashing offers no security benefit over HTTPS and removes server-side protection.
`,

  'src/content/recipes/data/batch-processing-patterns.md': `## Overview

Batch processing is the backbone of data pipelines, ETL workflows, and report generation. Unlike stream processing, batch jobs process bounded datasets in chunks, making them simpler to reason about but requiring careful attention to idempotency, fault tolerance, and observability.

## When to Use

Use this resource when:
- Processing large datasets that do not fit in memory
- Building ETL pipelines for data warehouses
- Generating nightly reports or aggregations
- Migrating data between systems with downtime windows

## Solution

### Resilient Batch Pipeline (Python)

\`\`\`python
import logging
from typing import Callable, List, Iterator

class BatchProcessor:
    def __init__(self, batch_size: int = 1000, max_retries: int = 3):
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.processed = 0
        self.failed = []

    def process(
        self,
        items: Iterator[dict],
        handler: Callable[[List[dict]], None]
    ) -> dict:
        batch = []
        for item in items:
            batch.append(item)
            if len(batch) >= self.batch_size:
                self._execute(batch, handler)
                batch = []

        if batch:
            self._execute(batch, handler)

        return {"processed": self.processed, "failed": len(self.failed)}

    def _execute(self, batch: List[dict], handler: Callable):
        for attempt in range(self.max_retries):
            try:
                handler(batch)
                self.processed += len(batch)
                return
            except Exception as e:
                logging.warning(f"Batch failed (attempt {attempt + 1}): {e}")
                if attempt == self.max_retries - 1:
                    self.failed.extend(batch)
\`\`\`

### Idempotent Job Tracking (SQL)

\`\`\`sql
CREATE TABLE job_runs (
    job_id VARCHAR(64) PRIMARY KEY,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('running', 'completed', 'failed')),
    checksum VARCHAR(64)
);

-- Before starting, check if already completed
SELECT * FROM job_runs WHERE job_id = 'daily_report_2025_01_15' AND status = 'completed';
\`\`\`

## Explanation

A production batch pipeline needs three properties:

1. **Idempotency**: Running the same job twice must produce the same result. Use job IDs and checksums to skip already-processed work.
2. **Fault tolerance**: Individual batch failures should not crash the entire job. Implement retry with exponential backoff and a dead-letter queue.
3. **Observability**: Track progress, throughput, and errors. Emit metrics for processed items, latency, and failure rates.

**Chunking strategy**: Size batches to balance memory usage and throughput. Too small = overhead; too large = OOM risk.

## Variants

| Pattern | Use Case | Trade-off |
|---------|----------|-----------|
| Chunked processing | Large files, memory limits | Simpler, higher latency |
| Parallel workers | CPU-bound transformations | Complex, needs coordination |
| MapReduce | Distributed aggregation | Scales horizontally |
| Change Data Capture | Incremental sync | Requires source support |

## Best Practices

- **Design for idempotency**: Every job must be safely retryable
- **Log everything**: Job start, end, and every batch outcome
- **Use transactions**: Wrap batch writes in database transactions
- **Monitor queue depth**: Alert when pending batches exceed thresholds
- **Implement circuit breakers**: Stop retrying if downstream is unhealthy

## Common Mistakes

1. **Not handling partial failures**: A batch of 1000 where 1 fails needs individual retry
2. **Ignoring memory limits**: Loading entire datasets into RAM crashes the process
3. **Missing checkpointing**: A 6-hour job that fails at 5:55 must restart from scratch
4. **Silent data loss**: Errors logged but not surfaced to operators
5. **No rollback strategy**: Failed jobs leave the database in an inconsistent state

## Frequently Asked Questions

**Q: How large should each batch be?**
A: Start with 100-1000 items. Benchmark with your data and memory constraints.

**Q: Should I use a job queue like Celery or a cron job?**
A: Use Celery/Redis for distributed systems and cron for single-node, simple pipelines.

**Q: How do I handle schema changes mid-pipeline?**
A: Version your job logic and data schemas. Run old and new versions in parallel during migration.
`,

  'src/content/recipes/observability/prometheus-api-monitoring.md': `## Overview

Prometheus is the de facto standard for metrics collection in cloud-native environments. By instrumenting your API with custom counters, histograms, and gauges, you gain real-time visibility into request latency, error rates, throughput, and business-level metrics.

## When to Use

Use this resource when:
- Setting up monitoring for REST or gRPC APIs
- Defining SLOs and SLIs for microservices
- Creating Grafana dashboards for API health
- Alerting on p99 latency or error rate spikes

## Solution

### Prometheus Client Instrumentation (Node.js)

\`\`\`javascript
const client = require('prom-client');

// Counter: total requests
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Histogram: request duration
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Gauge: active connections
const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections'
});

// Middleware
app.use((req, res, next) => {
  activeConnections.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || 'unknown' });
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode
    });
    activeConnections.dec();
  });

  next();
});
\`\`\`

### Alerting Rules

\`\`\`yaml
# prometheus-alerts.yml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
\`\`\`

## Explanation

Prometheus follows a pull model:

1. **Instrumentation**: Your application exposes a /metrics endpoint
2. **Scraping**: Prometheus server polls this endpoint periodically (default 15s)
3. **Storage**: Time-series data is stored locally with compression
4. **Querying**: PromQL queries aggregate metrics in real time
5. **Alerting**: Alertmanager routes alerts to Slack, PagerDuty, email

**Metric types**:
- **Counter**: Monotonically increasing (requests, errors)
- **Histogram**: Bucketed observations + sum + count (latency)
- **Gauge**: Can go up or down (connections, queue depth)
- **Summary**: Pre-calculated quantiles (use histograms instead when possible)

## Variants

| Language | Library | Notes |
|----------|---------|-------|
| Node.js | prom-client | Most popular; built-in registry |
| Go | prometheus/client_golang | Official; best performance |
| Python | prometheus_client | Flask/Django middleware available |
| Java | Micrometer | Spring Boot integration |
| Rust | prometheus | Async-compatible |

## Best Practices

- **Use labels sparingly**: High cardinality (unique label combinations) degrades performance
- **Prefer histograms over summaries**: Histograms allow aggregation across instances
- **Instrument business metrics**: Not just technical metrics (signups, revenue per endpoint)
- **Set retention wisely**: Default 15 days; increase for long-term trends
- **Run Prometheus in HA mode**: Use Thanos or Cortex for multi-cluster aggregation

## Common Mistakes

1. **High cardinality labels**: User IDs or session IDs as labels crash Prometheus
2. **Missing unit suffixes**: Use _seconds, _bytes, _total as per naming conventions
3. **Not instrumenting failures**: Only tracking success masks outage detection
4. **Too many buckets**: 100+ histogram buckets waste storage and CPU
5. **Ignoring scrape errors**: /metrics endpoint errors mean blind spots

## Frequently Asked Questions

**Q: How much memory does Prometheus need?**
A: ~1-3KB per time series. A typical API with 100 endpoints and 5 labels needs 2-4GB RAM.

**Q: Can Prometheus handle log data?**
A: No. Use Loki for logs, Jaeger for traces, and Prometheus for metrics. The Grafana stack unifies them.

**Q: What is the difference between histogram and summary?**
A: Histograms bucket data and allow aggregation. Summaries pre-compute quantiles but cannot be aggregated across instances.
`,

  'src/content/recipes/security/hmac-request-signing.md': `## Overview

HMAC (Hash-based Message Authentication Code) is the industry standard for signing API requests. By combining a shared secret with the request payload and a cryptographic hash, both sender and receiver can verify message integrity and authenticity without transmitting the secret over the wire.

## When to Use

Use this resource when:
- Authenticating service-to-service API calls
- Ensuring webhook payloads have not been tampered with
- Implementing API key authentication without OAuth complexity
- Verifying request integrity across untrusted networks

## Solution

### HMAC-SHA256 Signing (Node.js)

\`\`\`javascript
const crypto = require('crypto');

function signRequest(method, path, body, timestamp, secret) {
  const payload = method.toUpperCase() + path + timestamp + JSON.stringify(body);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyRequest(method, path, body, timestamp, signature, secret) {
  const expected = signRequest(method, path, body, timestamp, secret);
  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}
\`\`\`

### Client-Server Example (Python)

\`\`\`python
import hmac
import hashlib
import time

def sign_request(method: str, path: str, body: bytes, secret: str) -> str:
    timestamp = str(int(time.time()))
    message = f"{method.upper()}{path}{timestamp}{body.decode()}"
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature, timestamp

# Client
signature, ts = sign_request("POST", "/api/orders", b'{"id":1}', "my-secret")
headers = {"X-Signature": signature, "X-Timestamp": ts}

# Server
def verify(signature: str, timestamp: str, method, path, body, secret):
    # Reject old requests (replay protection)
    if abs(int(time.time()) - int(timestamp)) > 300:
        return False
    expected, _ = sign_request(method, path, body, secret)
    return hmac.compare_digest(signature, expected)
\`\`\`

## Explanation

HMAC security relies on three properties:

1. **Secret key**: Never transmitted; shared out-of-band during onboarding
2. **Message coverage**: The signature must cover method, path, timestamp, and body
3. **Replay protection**: Timestamp windows prevent attackers from reusing old requests

**Why not plain SHA-256?**
SHA-256 without HMAC is vulnerable to length-extension attacks. HMAC uses two nested hash passes that prevent this.

## Variants

| Algorithm | Hash | Strength | Notes |
|-----------|------|----------|-------|
| HMAC-SHA256 | SHA-256 | 128-bit | Recommended default |
| HMAC-SHA384 | SHA-384 | 192-bit | Higher security margin |
| HMAC-SHA512 | SHA-512 | 256-bit | Slower; use for high-security contexts |
| HMAC-Blake3 | Blake3 | 256-bit | Fast; modern alternative |

## Best Practices

- **Include timestamp**: Reject requests older than 5 minutes to prevent replay attacks
- **Sign the entire request**: Method + path + timestamp + body (sorted headers if included)
- **Use constant-time comparison**: timingSafeEqual prevents timing attacks
- **Rotate secrets regularly**: Use key versioning (v1, v2) in the signature header
- **Never log the secret**: Log signatures and keys, never the raw secret

## Common Mistakes

1. **Signing only the body**: An attacker can replay a valid body with a different endpoint
2. **Missing replay protection**: Without timestamps, intercepted requests are valid forever
3. **Using MD5 or SHA-1**: Cryptographically broken; use SHA-256 minimum
4. **String comparison instead of timingSafeEqual**: Vulnerable to timing attacks
5. **Storing secrets in environment variables without encryption**: Use a secret manager

## Frequently Asked Questions

**Q: Is HMAC better than JWT for service-to-service auth?**
A: HMAC is simpler and stateless for internal services. JWT is better when you need identity claims and third-party verification.

**Q: How do I handle clock skew between services?**
A: Allow a 5-minute window and synchronize with NTP. Reject requests outside the window.

**Q: Can I use the same secret for multiple clients?**
A: No. Each client should have a unique secret so you can revoke one without affecting others.
`
};

for (const [filePath, body] of Object.entries(articles)) {
  fillBody(filePath, body);
}

console.log('All EN articles updated.');
