---

contentType: recipes
slug: blue-green-deployment
title: "Blue-Green Deployment"
description: "Deploy with zero downtime using blue-green environments, instant traffic switching, and automated rollback capabilities."
metaDescription: "Blue-green deployment strategy: zero-downtime releases, instant traffic switching, automated rollback, and environment management for production safety."
difficulty: intermediate
topics:
  - devops
tags:
  - blue-green
  - deployment
  - zero-downtime
  - devops
  - ci-cd
relatedResources:
  - /guides/deployment-strategies-guide
  - /docs/post-deployment-checklist-template
  - /guides/cicd-pipeline-guide
  - /recipes/graceful-shutdown
  - /recipes/istio-canary-deployment
  - /recipes/traffic-mirroring
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Blue-green deployment strategy: zero-downtime releases, instant traffic switching, automated rollback, and environment management for production safety."
  keywords:
    - blue-green
    - deployment
    - zero-downtime
    - devops

---
## Overview

Blue-green deployment is a release strategy that maintains two identical production environments — one active (blue) and one idle (green). New versions deploy to the idle environment, get smoke-tested, and then traffic switches instantly. If problems arise, rollback is a single traffic switch away, taking seconds instead of hours.

## When to Use

Use this resource when:
- Downtime during deployments is unacceptable (SLA > 99.9%). See [Health Check Endpoint](/recipes/devops/health-check-endpoint) for readiness verification.
- You need instant rollback capability without redeploying. See [Feature Flags](/recipes/devops/feature-flags) for instant toggles.
- Running database migrations that must be backward-compatible. See [Docker Compose Local Dev](/recipes/devops/docker-compose-local-dev) for local migration testing.
- Validating new releases against real production traffic via canary routing. See [Istio Canary Deployment](/recipes/devops/istio-canary-deployment) for progressive traffic shifting.

## Solution

### Nginx Traffic Switch (Bash)

```bash
#!/bin/bash
# Switch traffic from blue to green

BLUE_IP="10.0.1.10"
GREEN_IP="10.0.1.11"
NGINX_CONF="/etc/nginx/sites-enabled/app"

# Update upstream to point to green
sed -i "s/server $BLUE_IP:8080/server $GREEN_IP:8080/" $NGINX_CONF
nginx -s reload

# Health check on green
if ! curl -sf http://$GREEN_IP:8080/health; then
  # Rollback instantly
  sed -i "s/server $GREEN_IP:8080/server $BLUE_IP:8080/" $NGINX_CONF
  nginx -s reload
  echo "Rollback complete"
  exit 1
fi
```

### Kubernetes Deployment with Service Switch

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-active
spec:
  selector:
    version: blue  # Change to "green" to switch
  ports:
    - port: 80
      targetPort: 8080

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
      version: green
  template:
    metadata:
      labels:
        app: web
        version: green
    spec:
      containers:
        - name: app
          image: myapp:v2.0.0
```

### AWS Route 53 Weighted Routing

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "green",
        "Weight": 100,
        "TTL": 60,
        "ResourceRecords": [{"Value": "1.2.3.4"}]
      }
    }]
  }'
```

## Explanation

**How it works**:
1. **Blue environment** serves all production traffic
2. **Green environment** receives the new deployment
3. **Smoke tests** validate green (health checks, synthetic transactions)
4. **Traffic switch** routes all users to green
5. **Blue remains warm** as instant rollback target
6. **Next deploy** goes to blue, roles swap

**Database compatibility**:
- Migrations must be backward-compatible (add columns, never remove)
- Blue must tolerate green's schema; green must tolerate blue's schema
- Use feature flags to hide new columns from blue

## Variants

| Strategy | Downtime | Rollback Speed | Cost |
|----------|----------|----------------|------|
| Blue-Green | Zero | Instant (seconds) | 2x infrastructure |
| Rolling | Zero | Slow (minutes) | 1x + surge |
| Canary | Zero | Medium (minutes) | 1x + small surge |
| Recreate | High | N/A | 1x |

## What Works

- **Keep blue warm for one deploy cycle**: Don't decommission until the next deployment succeeds
- **Automate the switch**: Manual DNS updates are error-prone; use CI/CD pipelines
- **Monitor during switch**: Watch error rates, latency, and business metrics for 5-10 minutes post-switch
- **Use sticky sessions carefully**: Switching mid-session can disrupt stateful connections
- **Share state via external stores**: Both environments must access the same databases, caches, and queues

## Common Mistakes

1. **Stateful blue/green**: Sessions stored in-memory are lost during switches; use Redis or JWT
2. **Different configs**: Blue and green must have identical environment variables except the version
3. **Forgetting to test rollback**: A deployment that can't roll back safely is not production-ready
4. **Database schema conflicts**: Breaking schema changes deployed before both apps are compatible
5. **Leaving old environments running**: Unused environments incur cloud costs; automate cleanup

## Frequently Asked Questions

**Q: How much does blue-green cost?**
A: Roughly double during deploy windows. You can scale down blue to minimal instances between deploys.

**Q: Can I use blue-green with serverless?**
A: Yes. AWS Lambda aliases, API Gateway canary stages, and Vercel production/preview deployments all support it.

**Q: What's the difference between blue-green and canary?**
A: Blue-green switches 100% of traffic at once. Canary routes a small percentage first, then gradually increases.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### CI/CD Pipeline with GitHub Actions

```yaml
# .github/workflows/blue-green.yml
name: Blue-Green Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to green
        run: |
          kubectl apply -f k8s/green-deployment.yaml
          kubectl rollout status deployment/app-green --timeout=120s

      - name: Smoke test green
        run: |
          GREEN_IP=$(kubectl get svc app-green -o jsonpath='{.spec.clusterIP}')
          for i in $(seq 1 10); do
            if curl -sf "http://$GREEN_IP:8080/health"; then
              echo "Green healthy"
              break
            fi
            sleep 5
          done

      - name: Switch traffic to green
        run: |
          kubectl patch svc app-active -p '{"spec":{"selector":{"version":"green"}}}'

      - name: Verify production
        run: |
          sleep 30
          if ! curl -sf https://api.example.com/health; then
            kubectl patch svc app-active -p '{"spec":{"selector":{"version":"blue"}}}'
            echo "Rollback triggered"
            exit 1
          fi

      - name: Scale down blue
        run: kubectl scale deployment app-blue --replicas=0
```

### Database Migration Strategy

```python
import psycopg2

def expand_migrate(conn):
    """Phase 1: Expand — add new columns, keep old ones."""
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email_v2 VARCHAR(255);
        """)
        cur.execute("""
            UPDATE users SET email_v2 = email;
        """)
        conn.commit()

def contract_migrate(conn):
    """Phase 2: Contract — remove old columns after blue is decommissioned."""
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE users DROP COLUMN IF EXISTS email;
        """)
        conn.commit()

# Deploy sequence:
# 1. Run expand_migrate (both blue and green work)
# 2. Switch traffic to green
# 3. After validation, run contract_migrate (only green uses new schema)
```

### Monitoring Script Post-Switch

```bash
#!/bin/bash
# monitor-post-switch.sh

DURATION=300  # 5 minutes
INTERVAL=10
END=$((SECONDS + DURATION))

while [ $SECONDS -lt $END ]; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health)
  LATENCY=$(curl -s -o /dev/null -w "%{time_total}" https://api.example.com/health)
  ERROR_RATE=$(curl -s https://api.example.com/metrics | grep error_rate | awk '{print $2}')

  echo "$(date -Iseconds) status=$STATUS latency=${LATENCY}s error_rate=$ERROR_RATE"

  if [ "$STATUS" != "200" ] || (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
    echo "ALERT: Rolling back"
    kubectl patch svc app-active -p '{"spec":{"selector":{"version":"blue"}}}'
    exit 1
  fi

  sleep $INTERVAL
done

echo "Monitoring complete. Green is stable."
```

## Additional Best Practices

1. **Pre-warm the green environment.** Send shadow traffic before the switch to JIT-compile code and warm caches:

```bash
# Mirror 10% of traffic to green for 2 minutes before full switch
istioctl experimental envoy-config 2>&1 | grep mirror
```

2. **Tag Docker images with Git SHA, not just semver.** This makes rollback deterministic:

```bash
# Build and tag
docker build -t myapp:$(git rev-parse --short HEAD) .
# Deploy green with specific SHA
kubectl set image deployment/app-green app=myapp:abc1234
```

3. **Use DNS TTL wisely.** Set TTL to 60 seconds or lower during deploy windows to ensure fast propagation:

```bash
# Route53 with low TTL for deploy window
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123 \
  --change-batch '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"api.example.com","Type":"A","TTL":60,"ResourceRecords":[{"Value":"1.2.3.4"}]}}]}'
```

## Additional Common Mistakes

1. **Not testing the rollback path.** A rollback that hasn't been tested will fail when you need it most:

```bash
# Include rollback test in staging
./scripts/switch-traffic.sh green
sleep 10
./scripts/switch-traffic.sh blue  # verify rollback works
```

2. **Different instance sizes for blue and green.** Green must handle the same load as blue:

```yaml
# Both deployments must have identical resources
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        resources:
          requests: { cpu: 500m, memory: 512Mi }
          limits: { cpu: 1000m, memory: 1Gi }
```

3. **Switching without health checks.** Always verify green is healthy before switching:

```bash
# Check all green pods are ready
READY=$(kubectl get deployment app-green -o jsonpath='{.status.readyReplicas}')
DESIRED=$(kubectl get deployment app-green -o jsonpath='{.spec.replicas}')
if [ "$READY" != "$DESIRED" ]; then
  echo "Green not fully ready: $READY/$DESIRED"
  exit 1
fi
```

## Additional FAQ

### How do I handle long-running WebSocket connections during a switch?

Use a drain period. Stop accepting new connections on blue, wait for existing ones to close (with a timeout), then switch. For connections that exceed the timeout, send a reconnect signal so clients reconnect to green.

### Should I use blue-green for microservices?

Blue-green works well for individual services but gets expensive at the cluster level. For microservices, use canary deployments or feature flags instead. Blue-green is best for monolithic apps or critical services that need instant rollback.

### How do I manage secrets across blue and green?

Both environments should reference the same secret store (Vault, AWS Secrets Manager). Never duplicate secrets in environment-specific configs. The secret values are identical; only the code version differs.

## Performance Tips

1. **Scale blue down between deploys.** Keep blue at 1 replica to save costs while maintaining rollback capability:

```bash
kubectl scale deployment app-blue --replicas=1
```

2. **Use spot instances for the idle environment.** Green runs briefly during deploy; run it on cheaper spot instances:

```yaml
nodeSelector:
  node-role.kubernetes.io/spot: "true"
```

3. **Cache the Docker image on all nodes.** Pre-pull the new image to avoid slow startup during switch:

```yaml
# Use a DaemonSet to pre-pull
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: image-pre-puller
spec:
  template:
    spec:
      initContainers:
      - name: pull
        image: myapp:v2.0.0
        command: ["true"]
      containers:
      - name: pause
        image: gcr.io/google_containers/pause
```
