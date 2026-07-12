---




contentType: guides
slug: complete-guide-docker-production
title: "Referencia Detallada de Docker en Producción"
description: "Ejecutar contenedores Docker en produccion con confianza. Cubre multi-stage builds, imagenes distroless, health checks, image scanning, resource limits, logging, secrets, multi-arch builds y seguridad del container runtime con ejemplos practicos de Dockerfiles."
metaDescription: "Ejecutar Docker en produccion. Cubre multi-stage builds, distroless, health checks, image scanning, resource limits, logging, secrets, multi-arch."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - security
tags:
  - docker
  - devops
  - guia
  - containers
  - multi-stage-builds
  - distroless
  - health-checks
  - image-scanning
relatedResources:
  - /guides/complete-guide-kubernetes-networking
  - /guides/complete-guide-monitoring-and-alerting
  - /guides/complete-guide-supply-chain-security
  - /recipes/container-security
  - /guides/complete-guide-terraform-production
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejecutar Docker en produccion. Cubre multi-stage builds, distroless, health checks, image scanning, resource limits, logging, secrets, multi-arch."
  keywords:
    - docker production
    - multi-stage builds
    - distroless images
    - docker health checks
    - image scanning
    - container security
    - docker resource limits
    - multi-arch builds




---

## Introducción

Docker es el standard para packaging y deploying applications. Pero run containers en production requiere mas que `docker build` y `docker run`. A continuacion se cubre multi-stage builds, distroless images, health checks, image scanning, resource limits, logging, secrets management, multi-arch builds, y runtime security.

## Multi-Stage Builds

Multi-stage builds reducen image size separando el build environment del runtime environment. Solo el final stage's artifacts son included en la image.

### Python Multi-Stage Build

```dockerfile
# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy application code
COPY . .

# Build any artifacts (e.g., compile translations, bundle assets)
RUN python -m compileall .

# Stage 2: Runtime (distroless)
FROM gcr.io/distroless/python3-debian12:nonroot

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local/lib/python3.12/site-packages /usr/lib/python3.12/site-packages
COPY --from=builder /build /app

ENV PYTHONPATH=/usr/lib/python3.12/site-packages
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Node.js Multi-Stage Build

```dockerfile
# Stage 1: Install dependencies
FROM node:20-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM node:20-slim AS runtime

WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Run as non-root
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
```

### Java Multi-Stage Build

```dockerfile
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy JAR from builder
COPY --from=builder /build/target/*.jar app.jar

# Run as non-root
RUN addgroup -S appuser && adduser -S appuser -G appuser
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost:8080/actuator/health || exit 1

CMD ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

## Distroless Images

Distroless images contienen solo tu application y sus runtime dependencies. No shell, no package manager, no utilities. Esto reduce attack surface y image size.

```dockerfile
# Google distroless images
FROM gcr.io/distroless/python3-debian12       # Python
FROM gcr.io/distroless/node20-debian12        # Node.js
FROM gcr.io/distroless/java21-debian12        # Java
FROM gcr.io/distroless/static-debian12        # Go, Rust (static binaries)

# Distroless con debug shell (para troubleshooting only)
FROM gcr.io/distroless/python3-debian12:debug

# Uso con static binary (Go)
FROM gcr.io/distroless/static-debian12:nonroot
COPY myapp /myapp
USER nonroot:nonroot
CMD ["/myapp"]
```

### Distroless vs Alpine vs Slim

```text
Image sizes (Python 3.12):
  python:3.12          ~1GB    Full Debian — nunca usar en production
  python:3.12-slim     ~150MB  Debian sin docs/headers — good default
  python:3.12-alpine   ~50MB   musl libc — smaller pero puede break packages
  distroless python3   ~50MB   No shell, no package manager — most secure

Trade-offs:
  Distroless: Smallest, most secure, pero no shell para debugging
  Slim:       Good balance, shell available para debugging
  Alpine:     Smallest con shell, pero musl libc puede cause issues
  Full:       Nunca usar en production — too large, too many tools
```

## Health Checks

```dockerfile
# HTTP health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# TCP health check (no curl available)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD nc -z localhost 8000 || exit 1

# Process health check (distroless — no curl/nc)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/app/healthcheck"]
```

```python
# Application health endpoint
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/health")
async def health():
    """Liveness probe — esta el process running?"""
    return {"status": "healthy"}

@app.get("/health/ready")
async def readiness():
    """Readiness probe — podemos servir requests?"""
    checks = {
        "database": await check_database(),
        "redis": await check_redis(),
        "external_api": await check_external_api()
    }
    
    all_healthy = all(checks.values())
    
    if not all_healthy:
        return JSONResponse(
            status_code=503,
            content={"status": "not ready", "checks": checks}
        )
    
    return {"status": "ready", "checks": checks}

async def check_database() -> bool:
    try:
        db.execute("SELECT 1")
        return True
    except:
        return False

async def check_redis() -> bool:
    try:
        redis.ping()
        return True
    except:
        return False
```

## Image Scanning

```bash
# Trivy — open source scanner
trivy image myapp:latest
trivy image --severity HIGH,CRITICAL myapp:latest
trivy image --ignore-unfixed myapp:latest

# Grype — otro open source scanner
grype myapp:latest

# Docker Scout (Docker's built-in scanner)
docker scout cves myapp:latest

# Snyk — commercial scanner
snyk container test myapp:latest
```

```yaml
# CI/CD: Scanear images en pipeline
name: Container Security
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      
      - name: Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          severity: HIGH,CRITICAL
          exit-code: 1  # Fail build on critical vulns
          format: json
          output: trivy-report.json
      
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: trivy-report
          path: trivy-report.json
```

## Resource Limits

```yaml
# docker-compose.yml con resource limits
version: "3.9"

services:
  api:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 256M
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
      nproc: 4096
    pids_limit: 4096
    
  worker:
    image: myapp-worker:latest
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
```

```bash
# Docker run con resource limits
docker run -d \
  --name api \
  --cpus="2.0" \
  --memory="1g" \
  --memory-swap="1g" \
  --memory-reservation="256m" \
  --pids-limit="4096" \
  --ulimit nofile=65536:65536 \
  --restart unless-stopped \
  myapp:latest
```

## Logging

```python
# Structured JSON logging para containers
import logging
import json
import sys
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname.lower(),
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "line": record.lineno
        }
        
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in {"name", "msg", "args", "levelname", "levelno",
                          "pathname", "filename", "module", "exc_info",
                          "exc_text", "stack_info", "lineno", "funcName",
                          "created", "msecs", "relativeCreated", "thread",
                          "threadName", "processName", "process"}:
                log_entry[key] = value
        
        return json.dumps(log_entry)

# Configure logging — stdout only (no files en containers)
logger = logging.getLogger("app")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)

# Uso
logger.info("Request received", extra={
    "method": "GET",
    "path": "/api/users",
    "request_id": "abc123",
    "duration_ms": 42
})
```

```bash
# Docker logging drivers
# json-file (default) — con rotation
docker run --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  myapp:latest

# syslog
docker run --log-driver syslog \
  --log-opt syslog-address=tcp://logserver:514 \
  myapp:latest

# fluentd
docker run --log-driver fluentd \
  --log-opt fluentd-address=fluentd:24224 \
  --log-opt tag=docker.myapp \
  myapp:latest

# journald
docker run --log-driver journald myapp:latest
```

## Secrets en Docker

```yaml
# docker-compose.yml con secrets
version: "3.9"

services:
  api:
    image: myapp:latest
    secrets:
      - db_password
      - api_key
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      API_KEY_FILE: /run/secrets/api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

```python
# Read secrets desde files (Docker secrets)
import os

def read_secret(name: str) -> str:
    """Read un secret desde el Docker secrets mount."""
    path = os.environ.get(f"{name}_FILE", f"/run/secrets/{name.lower()}")
    with open(path) as f:
        return f.read().strip()

# Uso
db_password = read_secret("DB_PASSWORD")
api_key = read_secret("API_KEY")
```

## Multi-Architecture Builds

```bash
# Create buildx builder para multi-arch
docker buildx create --name multiarch --use

# Build para multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myapp:latest \
  --push \
  .

# Inspect manifest
docker buildx imagetools inspect myapp:latest
```

```dockerfile
# Dockerfile con architecture-specific logic
FROM --platform=$BUILDPLATFORM node:20-slim AS builder

ARG TARGETPLATFORM
ARG TARGETARCH

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM --platform=$TARGETPLATFORM node:20-slim

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## Runtime Security

```dockerfile
# Secure Dockerfile — defense in depth
FROM python:3.12-slim

# Install solo required system packages, luego clean up
RUN apt-get update && \
    apt-get install --no-install-recommends -y curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -s /bin/false appuser

WORKDIR /app

# Copy con correct ownership
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

# Switch a non-root
USER appuser:appuser

# Set read-only filesystem (usar --read-only at runtime)
# Set no-new-privileges (usar --security-opt at runtime)

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Run con maximum security constraints
docker run -d \
  --name api \
  --read-only \
  --tmpfs /tmp \
  --security-opt no-new-privileges \
  --security-opt seccomp=seccomp-profile.json \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --network internal \
  --cpus="2.0" \
  --memory="1g" \
  --pids-limit="4096" \
  --restart unless-stopped \
  myapp:latest
```

## Docker Compose para Producción

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  api:
    image: ghcr.io/myorg/myapp:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - ENV=production
      - LOG_LEVEL=info
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    networks:
      - backend
  
  worker:
    image: ghcr.io/myorg/myapp-worker:${VERSION:-latest}
    restart: unless-stopped
    command: ["python", "-m", "celery", "-A", "tasks", "worker", "--loglevel=info"]
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
    depends_on:
      api:
        condition: service_healthy
    networks:
      - backend

  nginx:
    image: nginx:1.25-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      api:
        condition: service_healthy
    networks:
      - frontend
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
```

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre slim y distroless images?

Slim images estan based en Debian pero strip out documentation, headers, y development tools. Todavia incluyen un shell y basic utilities. Distroless images contienen solo el runtime (e.g., Python interpreter) y tu application — no shell, no package manager, no utilities. Distroless es mas secure (smaller attack surface) pero harder de debug (no shell). Usa distroless para production, slim para development.

### ¿Cómo hago debug de un distroless container?

Usa la variante `:debug` de distroless images, que incluye un busybox shell. O usa `docker cp` para copiar debugging tools en un running container. Para production debugging, rely en structured logs, distributed tracing, y metrics en vez de shell access. Tambien podes usar ephemeral debug containers con `kubectl debug` en Kubernetes.

### ¿Qué resource limits deberia setear?

Empieza con CPU y memory limits basado en tu application's normal usage. Setea memory limit a 1.5x el average memory usage para allow spikes. Setea CPU limit al maximum que tu app deberia consumir. Siempre setea memory reservation lower que el limit para ensure que el container gets al menos eso. Setea PID limits para prevenir fork bombs. Testea bajo load y adjust basado en actual usage patterns.

### ¿Cómo manejo secrets en Docker sin environment variables?

Usa Docker secrets (Swarm mode) o mount secret files desde un secrets manager. Read secrets desde files at startup, no desde environment variables. Environment variables son visibles en `docker inspect`, process listings, y crash dumps. File-based secrets son solo accessible al container en el que estan mounted. Para Kubernetes, usa Sealed Secrets o External Secrets Operator.

### ¿Debería usar Alpine o Debian-based images?

Usa Debian-slim o distroless para production. Alpine usa musl libc en vez de glibc, que puede cause compatibility issues con Python packages (especialmente los que tienen C extensions como numpy, pandas). La size difference entre Alpine y slim es small (50MB vs 150MB), pero el compatibility risk con Alpine es significant. Usa Alpine solo para Go o Rust binaries que son statically linked.

### ¿Cómo reduzco Docker image size?

Usa multi-stage builds para excluir build tools del final image. Usa distroless o slim base images. Remove cache files: `pip install --no-cache-dir`, `npm ci` (no `npm install`). Combina RUN commands para reducir layers. Usa `.dockerignore` para excluir test files, documentation, y build artifacts. Squash layers con `docker build --squash` (experimental) o usa multi-stage builds. Scanea con `dive` para analyze layer sizes.

## See Also

- [CI/CD Security: Harden Your Pipelines and Prevent Supply](/es/guides/ci-cd-security-guide/)
- [Disaster Recovery: RTO, RPO, and Resilient Recovery Runbooks](/es/guides/disaster-recovery-guide/)
- [Complete Guide to Secrets Management](/es/guides/complete-guide-secrets-management/)
- [Complete Guide to Supply Chain Security](/es/guides/complete-guide-supply-chain-security/)
- [Secrets Management: Vault, Cloud Managers](/es/guides/secrets-management-guide/)

