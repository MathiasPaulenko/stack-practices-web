---

contentType: patterns
slug: fallover-pattern
title: "Fallover: Switch to Standby on Primary Failure Detection"
description: "How to switch to a standby system on primary failure detection. Covers active-passive, active-active, health monitoring, DNS fallover, database replication, and automated promotion."
metaDescription: "Switch to standby on primary failure. Learn active-passive, active-active, health monitoring, DNS fallover, database replication, and automated promotion."
difficulty: advanced
topics:
  - architecture
  - infrastructure
tags:
  - architecture
  - resilience
  - fallover
  - failover
  - high-availability
  - pattern
category: behavioral
relatedResources:
  - /patterns/circuit-breaker-half-open-pattern
  - /patterns/graceful-shutdown-pattern
  - /patterns/bulkhead-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Switch to standby on primary failure. Learn active-passive, active-active, health monitoring, DNS fallover, database replication, and automated promotion."
  keywords:
    - architecture
    - resilience
    - fallover
    - failover
    - high-availability
    - pattern

---

## Overview

The fallover pattern automatically switches traffic from a failed primary system to a standby system. When the primary becomes unavailable, the fallover mechanism detects the failure through health checks and redirects traffic to the standby. There are two main configurations: active-passive (one primary handles traffic, one standby waits) and active-active (both handle traffic, if one fails the other absorbs the load). Fallover can happen at multiple layers: DNS (routing to a different IP), load balancer (removing unhealthy instances), database (promoting a replica), or application-level (switching to a backup API). The goal is to minimize downtime — ideally under 30 seconds for automated fallover.

## When to Use

- High-availability services requiring < 1 minute downtime
- Database failover when the primary node crashes
- Multi-region deployments where one region becomes unavailable
- API calls to external services with known backup endpoints
- Disaster recovery scenarios requiring automatic traffic redirection

## When NOT to Use

- Single-instance applications where downtime is acceptable
- When manual intervention is required for safety (e.g., financial systems)
- Stateless services behind a load balancer (the LB handles instance removal)
- When the cost of maintaining a standby exceeds the cost of downtime

## Solution

### Health-monitored fallover (Python)

```python
# fallover/health_monitored.py — Active-passive fallover with health checks
import time
import threading
import requests
from enum import Enum

class NodeStatus(Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

class FalloverManager:
    """Monitors primary and standby nodes.
    Automatically fails over when primary becomes unhealthy."""

    def __init__(self, primary_url, standby_url, health_path="/health",
                 check_interval=5, failure_threshold=3, recovery_threshold=3):
        self.primary_url = primary_url
        self.standby_url = standby_url
        self.health_path = health_path
        self.check_interval = check_interval
        self.failure_threshold = failure_threshold
        self.recovery_threshold = recovery_threshold

        self._active_url = primary_url
        self._primary_failures = 0
        self._primary_successes = 0
        self._standby_failures = 0
        self._is_fallover = False
        self._lock = threading.Lock()
        self._running = True

    @property
    def active_url(self):
        with self._lock:
            return self._active_url

    @property
    def is_fallover(self):
        with self._lock:
            return self._is_fallover

    def _check_health(self, url):
        """Check if a node is healthy."""
        try:
            resp = requests.get(f"{url}{self.health_path}", timeout=3)
            if resp.status_code == 200:
                return NodeStatus.HEALTHY
            return NodeStatus.UNHEALTHY
        except Exception:
            return NodeStatus.UNHEALTHY

    def _monitor_loop(self):
        """Continuously monitor the primary and fail over if needed."""
        while self._running:
            primary_status = self._check_health(self.primary_url)

            with self._lock:
                if not self._is_fallover:
                    # Monitoring primary
                    if primary_status == NodeStatus.HEALTHY:
                        self._primary_failures = 0
                    else:
                        self._primary_failures += 1
                        if self._primary_failures >= self.failure_threshold:
                            print(f"Primary failed {self._primary_failures} times, "
                                  f"failing over to standby")
                            self._initiate_fallover()
                else:
                    # In fallover mode — check if primary recovered
                    if primary_status == NodeStatus.HEALTHY:
                        self._primary_successes += 1
                        if self._primary_successes >= self.recovery_threshold:
                            print(f"Primary recovered {self._primary_successes} times, "
                                  f"failing back")
                            self._initiate_failback()
                    else:
                        self._primary_successes = 0

            time.sleep(self.check_interval)

    def _initiate_fallover(self):
        """Switch traffic from primary to standby."""
        standby_status = self._check_health(self.standby_url)
        if standby_status == NodeStatus.HEALTHY:
            self._active_url = self.standby_url
            self._is_fallover = True
            self._primary_successes = 0
            print(f"Fallover complete: now serving from {self.standby_url}")
        else:
            print(f"CRITICAL: Standby is also unhealthy! Cannot fail over.")

    def _initiate_failback(self):
        """Switch traffic back to primary."""
        self._active_url = self.primary_url
        self._is_fallover = False
        self._primary_failures = 0
        print(f"Failback complete: now serving from {self.primary_url}")

    def start(self):
        """Start the monitoring thread."""
        t = threading.Thread(target=self._monitor_loop, daemon=True)
        t.start()

    def stop(self):
        self._running = False

    def request(self, method, path, **kwargs):
        """Make a request to the currently active node."""
        url = f"{self.active_url}{path}"
        return requests.request(method, url, **kwargs)

    def get_status(self):
        with self._lock:
            return {
                "active_url": self._active_url,
                "is_fallover": self._is_fallover,
                "primary_failures": self._primary_failures,
                "primary_successes": self._primary_successes,
            }


# Usage
fallover = FalloverManager(
    primary_url="https://api-primary.example.com",
    standby_url="https://api-standby.example.com",
    health_path="/health",
    check_interval=5,
    failure_threshold=3,
    recovery_threshold=3
)
fallover.start()

# All requests go to the active node (primary or standby)
response = fallover.request("GET", "/api/products")
```

### Database fallover with PostgreSQL (Python)

```python
# fallover/database.py — PostgreSQL failover with connection switching
import psycopg2
import time
import threading

class DatabaseFallover:
    """Manages database connections with automatic failover.
    Primary: read-write. Standby: read-only, promoted on failover."""

    def __init__(self, primary_config, standby_configs):
        self.primary_config = primary_config
        self.standby_configs = standby_configs
        self._active_config = primary_config
        self._is_fallover = False
        self._lock = threading.Lock()
        self._connection = None

    def _create_connection(self, config):
        return psycopg2.connect(
            host=config["host"],
            port=config.get("port", 5432),
            database=config["database"],
            user=config["user"],
            password=config["password"],
            connect_timeout=5
        )

    def get_connection(self):
        """Get a connection to the active database."""
        with self._lock:
            if self._connection and not self._connection.closed:
                try:
                    # Test the connection
                    self._connection.cursor().execute("SELECT 1")
                    return self._connection
                except Exception:
                    self._connection = None

            # Try active config
            try:
                self._connection = self._create_connection(self._active_config)
                return self._connection
            except Exception as e:
                print(f"Active DB unavailable: {e}")
                self._initiate_fallover()
                self._connection = self._create_connection(self._active_config)
                return self._connection

    def _initiate_fallover(self):
        """Try each standby in order."""
        for i, standby in enumerate(self.standby_configs):
            try:
                conn = self._create_connection(standby)
                conn.close()
                self._active_config = standby
                self._is_fallover = True
                print(f"Failed over to standby {i}: {standby['host']}")
                return
            except Exception:
                continue

        raise Exception("All databases are unavailable")

    def execute(self, query, params=None):
        """Execute a query on the active database."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(query, params)
        result = cur.fetchall()
        conn.commit()
        return result

    @property
    def is_fallover(self):
        with self._lock:
            return self._is_fallover


# Usage
db = DatabaseFallover(
    primary_config={"host": "db-primary.internal", "database": "shop",
                    "user": "app", "password": "secret"},
    standby_configs=[
        {"host": "db-replica-1.internal", "database": "shop",
         "user": "app", "password": "secret"},
        {"host": "db-replica-2.internal", "database": "shop",
         "user": "app", "password": "secret"},
    ]
)

# Automatically fails over if primary is down
users = db.execute("SELECT * FROM users LIMIT 10")
```

### DNS-based fallover (Python)

```python
# fallover/dns.py — DNS-based fallover for multi-region
import dns.resolver
import time

class DNSFallover:
    """DNS-based fallover: updates DNS records to point to standby.
    Slower propagation but works across regions."""

    def __init__(self, domain, primary_ip, standby_ip,
                 dns_server, ttl=60):
        self.domain = domain
        self.primary_ip = primary_ip
        self.standby_ip = standby_ip
        self.dns_server = dns_server
        self.ttl = ttl
        self._active_ip = primary_ip

    def check_and_fallover(self, health_url):
        """Check primary health and update DNS if needed."""
        import requests
        try:
            resp = requests.get(health_url, timeout=5)
            if resp.status_code == 200:
                if self._active_ip != self.primary_ip:
                    self._update_dns(self.primary_ip)
                    self._active_ip = self.primary_ip
                    print(f"DNS failback to primary: {self.primary_ip}")
                return True
        except Exception:
            pass

        # Primary is down — fail over
        if self._active_ip == self.primary_ip:
            self._update_dns(self.standby_ip)
            self._active_ip = self.standby_ip
            print(f"DNS fallover to standby: {self.standby_ip}")

        return False

    def _update_dns(self, ip):
        """Update DNS A record (implementation depends on DNS provider)."""
        # Example: AWS Route 53 API call
        # change_route53_record(self.domain, ip, self.ttl)
        print(f"Updating DNS: {self.domain} -> {ip} (TTL: {self.ttl}s)")

    def resolve_current(self):
        """Check what IP the domain currently resolves to."""
        resolver = dns.resolver.Resolver()
        answers = resolver.resolve(self.domain, "A")
        return [rdata.address for rdata in answers]
```

### Nginx upstream fallover

```nginx
# fallover/nginx.conf — Nginx upstream with passive fallover
upstream api_backend {
    # Primary server — receives all traffic when healthy
    server api-primary:8080 max_fails=3 fail_timeout=30s;

    # Standby server — receives traffic when primary fails
    server api-standby:8080 backup max_fails=3 fail_timeout=30s;

    # Health check settings
    keepalive 32;
    keepalive_timeout 60s;
}

server {
    listen 80;
    server_name api.example.com;

    # Active health checks (requires nginx plus)
    # health_check interval=5s fails=3 passes=2 uri=/health;

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }

    # Health endpoint for external monitoring
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Kubernetes multi-cluster fallover

```yaml
# fallover/k8s-failover.yaml — Kubernetes service with failover
apiVersion: v1
kind: Service
metadata:
  name: api-service
  annotations:
    # External-dns annotation for DNS-based failover
    external-dns.alpha.kubernetes.io/hostname: api.example.com
spec:
  type: LoadBalancer
  selector:
    app: api-server
  ports:
    - port: 80
      targetPort: 8080
---
# PodDisruptionBudget ensures minimum availability
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-server
---
# Multi-cluster failover with Global Load Balancer (e.g., AWS Global Accelerator)
# Primary cluster: us-east-1
# Standby cluster: eu-west-1
# Traffic routes to primary; on failure, routes to standby
```

### JavaScript fallover client

```javascript
// fallover/client.js — Client-side fallover for API calls
class FalloverClient {
    constructor(endpoints, options = {}) {
        this.endpoints = endpoints;  // ["https://api1.com", "https://api2.com"]
        this.activeIndex = 0;
        this.healthPath = options.healthPath || "/health";
        this.checkInterval = options.checkInterval || 10000;
        this.failureThreshold = options.failureThreshold || 3;
        this.failures = 0;
        this.isChecking = false;
    }

    get activeEndpoint() {
        return this.endpoints[this.activeIndex];
    }

    async checkHealth() {
        try {
            const response = await fetch(
                `${this.activeEndpoint}${this.healthPath}`,
                { signal: AbortSignal.timeout(3000) }
            );
            if (response.ok) {
                this.failures = 0;
                return true;
            }
        } catch (error) {
            // Health check failed
        }

        this.failures++;
        if (this.failures >= this.failureThreshold) {
            this.fallover();
        }
        return false;
    }

    fallover() {
        const nextIndex = (this.activeIndex + 1) % this.endpoints.length;
        if (nextIndex !== this.activeIndex) {
            console.log(`Failing over from ${this.endpoints[this.activeIndex]} ` +
                        `to ${this.endpoints[nextIndex]}`);
            this.activeIndex = nextIndex;
            this.failures = 0;
        }
    }

    async request(method, path, options = {}) {
        const url = `${this.activeEndpoint}${path}`;
        try {
            const response = await fetch(url, {
                method,
                ...options,
                signal: AbortSignal.timeout(10000)
            });
            if (response.status >= 500) {
                this.failures++;
                if (this.failures >= this.failureThreshold) {
                    this.fallover();
                    // Retry on the new endpoint
                    return this.request(method, path, options);
                }
                throw new Error(`HTTP ${response.status}`);
            }
            this.failures = 0;
            return response;
        } catch (error) {
            this.failures++;
            if (this.failures >= this.failureThreshold) {
                this.fallover();
                return this.request(method, path, options);
            }
            throw error;
        }
    }

    startHealthChecks() {
        this.isChecking = true;
        const check = async () => {
            if (!this.isChecking) return;
            await this.checkHealth();
            setTimeout(check, this.checkInterval);
        };
        check();
    }

    stopHealthChecks() {
        this.isChecking = false;
    }
}

// Usage
const client = new FalloverClient(
    ["https://api-primary.example.com", "https://api-standby.example.com"],
    { failureThreshold: 3, checkInterval: 10000 }
);
client.startHealthChecks();

const response = await client.request("GET", "/api/products");
const data = await response.json();
```

## Variants

### Active-active with load balancing

```python
# fallover/active_active.py — Both nodes serve traffic simultaneously
import random
import requests

class ActiveActiveManager:
    """Both primary and standby serve traffic.
    If one fails, the other absorbs all traffic."""

    def __init__(self, endpoints, health_path="/health"):
        self.endpoints = {url: {"healthy": True, "failures": 0}
                          for url in endpoints}
        self.health_path = health_path

    def get_healthy_endpoints(self):
        return [url for url, info in self.endpoints.items()
                if info["healthy"]]

    def request(self, method, path, **kwargs):
        healthy = self.get_healthy_endpoints()
        if not healthy:
            raise Exception("All endpoints are unhealthy")

        # Random load balancing among healthy endpoints
        url = random.choice(healthy)
        try:
            resp = requests.request(method, f"{url}{path}", timeout=10, **kwargs)
            return resp
        except Exception:
            self.endpoints[url]["failures"] += 1
            if self.endpoints[url]["failures"] >= 3:
                self.endpoints[url]["healthy"] = False
                print(f"Marked {url} as unhealthy")
            # Retry on another healthy endpoint
            return self.request(method, path, **kwargs)
```

### Cascading fallover (multi-tier)

```python
# fallover/cascading.py — Multi-tier failover: primary -> standby -> tertiary
class CascadingFallover:
    """Tries endpoints in order: primary, then standby, then tertiary.
    Each tier is tried only if the previous one fails."""

    def __init__(self, tiers):
        """tiers: [{"name": "primary", "url": "...", "timeout": 5}, ...]"""
        self.tiers = tiers
        self._active_tier = 0

    @property
    def active_url(self):
        return self.tiers[self._active_tier]["url"]

    def request(self, method, path, **kwargs):
        for i, tier in enumerate(self.tiers):
            try:
                url = f"{tier['url']}{path}"
                resp = requests.request(method, url, timeout=tier["timeout"], **kwargs)
                if resp.status_code < 500:
                    if i != self._active_tier:
                        print(f"Fallover: tier {self._active_tier} -> {i} ({tier['name']})")
                        self._active_tier = i
                    return resp
            except Exception:
                continue

        raise Exception("All tiers exhausted")
```

## Best Practices


- For a deeper guide, see [Graceful Shutdown: Drain In-Flight Requests Before Exit](/patterns/graceful-shutdown-pattern/).

- Use automated health checks — manual fallover is too slow for production
- Set appropriate failure thresholds — 3 consecutive failures before fallover prevents flapping
- Test fallover regularly — run game days to verify it works under load
- Monitor fallover events — alert when fallover occurs, it means something is wrong
- Keep standby warm — don't let it sit idle; send a small percentage of traffic
- Use short DNS TTLs — 60 seconds or less for DNS-based fallover
- Plan for failback — fallover is temporary; have a procedure to return to primary
- Database replication lag — verify the standby is caught up before promoting it

## Common Mistakes

- **No health checks**: fallover never triggers because nobody knows the primary is down.
- **Fallover flap**: threshold too low causes rapid switching between primary and standby.
- **Cold standby**: standby has no cached data, causing a performance spike after fallover.
- **No failback plan**: traffic stays on the standby forever because nobody plans the return.
- **Split-brain**: both primary and standby think they're active, causing data conflicts.

## FAQ

### What is the fallover pattern?

A resilience pattern that automatically switches traffic from a failed primary system to a healthy standby. Health checks detect the failure, and traffic is redirected to the standby, minimizing downtime.

### What is active-passive vs active-active?

Active-passive: one node handles all traffic, the other waits idle. On failure, traffic switches to the passive node. Active-active: both nodes handle traffic simultaneously. If one fails, the other absorbs the full load. Active-active is more efficient but harder to implement.

### How fast should fallover be?

For automated fallover: 30-60 seconds. DNS-based fallover: 1-5 minutes (limited by DNS TTL). Database fallover: 30-120 seconds (replica promotion takes time). The faster the fallover, the less downtime users experience.

### What is split-brain in fallover?

When both the primary and standby think they're the active node. This can happen if the health check fails due to network partition rather than actual failure. Both nodes accept writes, causing data conflicts. Use a quorum or fencing mechanism to prevent split-brain.

### How do I test fallover?

Run regular game days: kill the primary and verify fallover works. Check that users don't experience errors, that the standby handles the load, and that failback works. Test under realistic traffic, not just idle systems.
