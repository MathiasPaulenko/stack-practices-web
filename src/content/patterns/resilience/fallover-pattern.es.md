---
contentType: patterns
slug: fallover-pattern
title: "Patrón Fallover: Switcheá a Standby en Primary Failure"
description: "Cómo swithear a un standby system en primary failure detection. Cubre active-passive, active-active, health monitoring, DNS fallover, database replication, y automated promotion."
metaDescription: "Switcheá a standby en primary failure. Aprende active-passive, active-active, health monitoring, DNS fallover, database replication, y automated promotion."
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
  metaDescription: "Switcheá a standby en primary failure. Aprende active-passive, active-active, health monitoring, DNS fallover, database replication, y automated promotion."
  keywords:
    - architecture
    - resilience
    - fallover
    - failover
    - high-availability
    - pattern
---

## Overview

El fallover pattern automáticamente switchea traffic de un failed primary system a un standby system. Cuando el primary se vuelve unavailable, el fallover mechanism detecta el failure a través de health checks y redirectéa traffic al standby. Hay dos main configurations: active-passive (un primary handleéa traffic, un standby waitea) y active-active (ambos handleéan traffic, si uno falla el otro absorbe el load). Fallover puede happen en múltiples layers: DNS (routando a un different IP), load balancer (removeando unhealthy instances), database (promoteando un replica), o application-level (switcheando a un backup API). El goal es minimizear downtime — ideally under 30 seconds para automated fallover.

## When to Use

- High-availability services que requireán < 1 minute downtime
- Database failover cuando el primary node crashea
- Multi-region deployments donde una region se vuelve unavailable
- API calls a external services con known backup endpoints
- Disaster recovery scenarios que requireán automatic traffic redirection

## When NOT to Use

- Single-instance applications donde downtime es acceptable
- Cuando manual intervention es required para safety (e.g., financial systems)
- Stateless services detrás de un load balancer (el LB handleéa instance removal)
- Cuando el cost de maintainear un standby excede el cost de downtime

## Solution

### Health-monitored fallover (Python)

```python
# fallover/health_monitored.py — Active-passive fallover con health checks
import time
import threading
import requests
from enum import Enum

class NodeStatus(Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

class FalloverManager:
    """Monitoreéa primary y standby nodes.
    Automáticamente failéa over cuando primary se vuelve unhealthy."""

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
        """Checkeá si un node está healthy."""
        try:
            resp = requests.get(f"{url}{self.health_path}", timeout=3)
            if resp.status_code == 200:
                return NodeStatus.HEALTHY
            return NodeStatus.UNHEALTHY
        except Exception:
            return NodeStatus.UNHEALTHY

    def _monitor_loop(self):
        """Continuamente monitoreéa el primary y failéa over si es needed."""
        while self._running:
            primary_status = self._check_health(self.primary_url)

            with self._lock:
                if not self._is_fallover:
                    # Monitoreando primary
                    if primary_status == NodeStatus.HEALTHY:
                        self._primary_failures = 0
                    else:
                        self._primary_failures += 1
                        if self._primary_failures >= self.failure_threshold:
                            print(f"Primary failed {self._primary_failures} times, "
                                  f"failing over to standby")
                            self._initiate_fallover()
                else:
                    # En fallover mode — checkeá si primary recoveréa
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
        """Switcheá traffic de primary a standby."""
        standby_status = self._check_health(self.standby_url)
        if standby_status == NodeStatus.HEALTHY:
            self._active_url = self.standby_url
            self._is_fallover = True
            self._primary_successes = 0
            print(f"Fallover complete: now serving from {self.standby_url}")
        else:
            print(f"CRITICAL: Standby is also unhealthy! Cannot fail over.")

    def _initiate_failback(self):
        """Switcheá traffic back a primary."""
        self._active_url = self.primary_url
        self._is_fallover = False
        self._primary_failures = 0
        print(f"Failback complete: now serving from {self.primary_url}")

    def start(self):
        """Arrancá el monitoring thread."""
        t = threading.Thread(target=self._monitor_loop, daemon=True)
        t.start()

    def stop(self):
        self._running = False

    def request(self, method, path, **kwargs):
        """Hacé un request al currently active node."""
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

# Todos los requests van al active node (primary o standby)
response = fallover.request("GET", "/api/products")
```

### Database fallover con PostgreSQL (Python)

```python
# fallover/database.py — PostgreSQL failover con connection switching
import psycopg2
import time
import threading

class DatabaseFallover:
    """Manageéa database connections con automatic failover.
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
        """Obtené una connection al active database."""
        with self._lock:
            if self._connection and not self._connection.closed:
                try:
                    # Testeá la connection
                    self._connection.cursor().execute("SELECT 1")
                    return self._connection
                except Exception:
                    self._connection = None

            # Tryéa active config
            try:
                self._connection = self._create_connection(self._active_config)
                return self._connection
            except Exception as e:
                print(f"Active DB unavailable: {e}")
                self._initiate_fallover()
                self._connection = self._create_connection(self._active_config)
                return self._connection

    def _initiate_fallover(self):
        """Tryeá cada standby en order."""
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
        """Ejecutá un query en el active database."""
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

# Automáticamente failéa over si primary está down
users = db.execute("SELECT * FROM users LIMIT 10")
```

### DNS-based fallover (Python)

```python
# fallover/dns.py — DNS-based fallover para multi-region
import dns.resolver
import time

class DNSFallover:
    """DNS-based fallover: updateéa DNS records para pointear a standby.
    Más slow propagation pero funciona across regions."""

    def __init__(self, domain, primary_ip, standby_ip,
                 dns_server, ttl=60):
        self.domain = domain
        self.primary_ip = primary_ip
        self.standby_ip = standby_ip
        self.dns_server = dns_server
        self.ttl = ttl
        self._active_ip = primary_ip

    def check_and_fallover(self, health_url):
        """Checkeá primary health y updateéa DNS si es needed."""
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

        # Primary está down — failéa over
        if self._active_ip == self.primary_ip:
            self._update_dns(self.standby_ip)
            self._active_ip = self.standby_ip
            print(f"DNS fallover to standby: {self.standby_ip}")

        return False

    def _update_dns(self, ip):
        """Updateéa DNS A record (implementation depende del DNS provider)."""
        # Example: AWS Route 53 API call
        # change_route53_record(self.domain, ip, self.ttl)
        print(f"Updating DNS: {self.domain} -> {ip} (TTL: {self.ttl}s)")

    def resolve_current(self):
        """Checkeá a qué IP el domain currently resolveéa."""
        resolver = dns.resolver.Resolver()
        answers = resolver.resolve(self.domain, "A")
        return [rdata.address for rdata in answers]
```

### Nginx upstream fallover

```nginx
# fallover/nginx.conf — Nginx upstream con passive fallover
upstream api_backend {
    # Primary server — receiveéa all traffic cuando healthy
    server api-primary:8080 max_fails=3 fail_timeout=30s;

    # Standby server — receiveéa traffic cuando primary falla
    server api-standby:8080 backup max_fails=3 fail_timeout=30s;

    # Health check settings
    keepalive 32;
    keepalive_timeout 60s;
}

server {
    listen 80;
    server_name api.example.com;

    # Active health checks (requiere nginx plus)
    # health_check interval=5s fails=3 passes=2 uri=/health;

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }

    # Health endpoint para external monitoring
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Kubernetes multi-cluster fallover

```yaml
# fallover/k8s-failover.yaml — Kubernetes service con failover
apiVersion: v1
kind: Service
metadata:
  name: api-service
  annotations:
    # External-dns annotation para DNS-based failover
    external-dns.alpha.kubernetes.io/hostname: api.example.com
spec:
  type: LoadBalancer
  selector:
    app: api-server
  ports:
    - port: 80
      targetPort: 8080
---
# PodDisruptionBudget ensureéa minimum availability
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
# Multi-cluster failover con Global Load Balancer (e.g., AWS Global Accelerator)
# Primary cluster: us-east-1
# Standby cluster: eu-west-1
# Traffic routeéa a primary; on failure, routeéa a standby
```

### JavaScript fallover client

```javascript
// fallover/client.js — Client-side fallover para API calls
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
                    // Retryéa en el new endpoint
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

### Active-active con load balancing

```python
# fallover/active_active.py — Ambos nodes serveéan traffic simultaneously
import random
import requests

class ActiveActiveManager:
    """Ambos primary y standby serveéan traffic.
    Si uno falla, el otro absorbe all traffic."""

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

        # Random load balancing entre healthy endpoints
        url = random.choice(healthy)
        try:
            resp = requests.request(method, f"{url}{path}", timeout=10, **kwargs)
            return resp
        except Exception:
            self.endpoints[url]["failures"] += 1
            if self.endpoints[url]["failures"] >= 3:
                self.endpoints[url]["healthy"] = False
                print(f"Marked {url} as unhealthy")
            # Retryéa en otro healthy endpoint
            return self.request(method, path, **kwargs)
```

### Cascading fallover (multi-tier)

```python
# fallover/cascading.py — Multi-tier failover: primary -> standby -> tertiary
class CascadingFallover:
    """Tryeá endpoints en order: primary, luego standby, luego tertiary.
    Cada tier es tried solo si el previous one falla."""

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

- Usá automated health checks — manual fallover es too slow para production
- Seteá appropriate failure thresholds — 3 consecutive failures antes de fallover previene flapping
- Testeá fallover regularmente — corré game days para verificar que funciona under load
- Monitoreá fallover events — alertéa cuando fallover occurs, significa que algo está wrong
- Mantené standby warm — no lo dejeés idle; sendeá un small percentage de traffic
- Usá short DNS TTLs — 60 seconds o less para DNS-based fallover
- Planeá para failback — fallover es temporary; tené un procedure para return a primary
- Database replication lag — verificá que el standby esté caught up antes de promotearlo

## Common Mistakes

- **No health checks**: fallover never triggerea porque nobody sabe que el primary está down.
- **Fallover flap**: threshold too low causa rapid switching entre primary y standby.
- **Cold standby**: standby no tiene cached data, causando un performance spike después de fallover.
- **No failback plan**: traffic stayéa en el standby forever porque nobody planeéa el return.
- **Split-brain**: ambos primary y standby piensan que son active, causando data conflicts.

## FAQ

### ¿Qué es el fallover pattern?

Un resilience pattern que automáticamente switchea traffic de un failed primary system a un healthy standby. Health checks detectan el failure, y traffic es redirected al standby, minimizeando downtime.

### ¿Qué es active-passive vs active-active?

Active-passive: un node handleéa all traffic, el otro waitea idle. On failure, traffic switchea al passive node. Active-active: ambos nodes handleéan traffic simultaneously. Si uno falla, el otro absorbe el full load. Active-active es más efficient pero harder de implement.

### ¿Qué tan rápido debería ser fallover?

Para automated fallover: 30-60 seconds. DNS-based fallover: 1-5 minutes (limited por DNS TTL). Database fallover: 30-120 seconds (replica promotion toma time). Mientras más rápido el fallover, menos downtime users experimentan.

### ¿Qué es split-brain en fallover?

Cuando ambos el primary y standby piensan que son el active node. Esto puede happen si el health check falla debido a network partition en vez de actual failure. Ambos nodes acceptéan writes, causando data conflicts. Usá un quorum o fencing mechanism para prevenir split-brain.

### ¿Cómo testeo fallover?

Corré regular game days: killéa el primary y verificá que fallover funciona. Checkeá que users no experimenten errors, que el standby handleéa el load, y que failback funciona. Testeá under realistic traffic, no solo idle systems.
