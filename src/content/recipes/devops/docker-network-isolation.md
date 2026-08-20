---
contentType: recipes
slug: docker-network-isolation
title: "Docker Network Isolation and Inter-Container Security"
description: "Secure inter-container communication with custom Docker networks, network segmentation, and access control policies."
metaDescription: "Secure Docker containers with custom bridge, internal and overlay networks. Isolate services, block unauthorized inter-container traffic, and bind ports safely."
difficulty: intermediate
topics:
  - devops
  - security
tags:
  - docker
  - networking
  - security
  - isolation
  - bridge
  - overlay
relatedResources:
  - /recipes/docker-health-check-configuration
  - /recipes/docker-compose-dev-prod-split
  - /recipes/docker-multi-stage-build-optimization
  - /recipes/docker-image-vulnerability-scan
  - /recipes/docker-secrets-management
  - /recipes/docker-basics
lastUpdated: "2026-08-19"
publishedAt: "2026-07-02"
author: Mathias Paulenko
seo:
  metaDescription: "Secure Docker containers with custom bridge, internal and overlay networks. Isolate services, block unauthorized inter-container traffic, and bind ports safely."
  keywords:
    - docker network isolation
    - docker container security
    - docker bridge network
    - docker internal network
    - docker network segmentation
    - inter-container communication
---

## Overview

By default, Docker puts containers on the bridge network and lets them reach each
other. That's a security risk: a compromised container can probe or attack the
others on the same host. This recipe shows how to isolate services with custom
networks, internal networks, and port binding rules.

## When to Use

- Several services run on the same host, and you want to limit how they talk to
  each other.
- A public-facing container (web) must reach an API, but that API must also
  reach a database that should stay private.
- You want to segment services by trust level (frontend, backend, database).
- Compliance or security policies require network segmentation.

### When to avoid

- There's just one container running. A custom network adds complexity without a
  threat to mitigate.
- You already use Kubernetes or Docker Swarm, and its network policies handle
  segmentation.
- Your workload needs the host network for very low latency and you handle
  isolation somewhere else.

## Solution

### Default bridge vs custom bridge

```bash
# Default bridge: containers can talk to each other (insecure)
docker run -d --name api --network bridge my-api
docker run -d --name db --network bridge my-db
# api can reach db and vice versa — no isolation

# Custom bridge: containers in this network can only talk to each other
docker network create --driver bridge frontend-net
docker network create --driver bridge backend-net

docker run -d --name api --network backend-net my-api
docker run -d --name db --network backend-net my-db
docker run -d --name web --network frontend-net my-web

# web cannot reach db — different network
# api can reach db — same network
```

### Internal network (no internet)

```bash
# Create an internal network — containers cannot reach the internet
docker network create --driver bridge --internal backend-internal

docker run -d --name db --network backend-internal my-db
# db has no internet access, only inter-container traffic on this network
```

### Multi-network container

```bash
docker network create frontend-net
docker network create backend-net

# API joins both networks
docker run -d --name api --network frontend-net my-api
docker network connect backend-net api

docker run -d --name web --network frontend-net my-web
docker run -d --name db --network backend-net my-db

# web -> api (frontend-net) ✓
# api -> db (backend-net) ✓
# web -> db ✗ (different networks)
```

### Docker Compose with network isolation

```yaml
# docker-compose.yml
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - frontend
    depends_on:
      - api

  api:
    build: .
    networks:
      - frontend
      - backend
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    networks:
      - backend
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

### Bind ports to a specific interface

```bash
# Localhost only — not accessible from other machines
docker run -d -p 127.0.0.1:5432:5432 --name db postgres:16-alpine

# Specific interface
docker run -d -p 10.0.0.5:80:80 --name web nginx:alpine

# All interfaces — least secure, avoid for databases
docker run -d -p 0.0.0.0:80:80 --name web nginx:alpine
```

### Inspect and test connectivity

```bash
# List networks
docker network ls

# Inspect a network
docker network inspect backend-net

# Test from one container to another
docker exec api ping db
docker exec api curl -f http://db:5432

# Remove a container from a network
docker network disconnect backend-net api
```

## Explanation

Docker networks isolate at the data link layer. A container in one network can't
start a conversation with a container in another network. Docker embeds a DNS
server inside custom bridge networks, so names only resolve there.

**Network types**:

| Type | Scope | Internet | Use for |
| --- | --- | --- | --- |
| **bridge** | Single host | Yes | Default/custom single-host networking |
| **internal** | Single host | No | Databases and private services |
| **overlay** | Multi-host | Yes | Docker Swarm across hosts |
| **host** | Single host | Yes | Performance-critical, no isolation |
| **macvlan** | Single host | Yes | Direct IP on the physical network |

Use aliases to give a container several names on the same network:

```yaml
services:
  db:
    image: postgres:16-alpine
    networks:
      backend:
        aliases:
          - database
          - postgres.internal

networks:
  backend:
    driver: bridge
    internal: true
```

Other containers can then reach it as `database` or `postgres.internal`.

## Variants

| Approach | Use when | Trade-off |
| --- | --- | --- |
| Custom bridge | One host, several services | More secure than default bridge |
| Internal bridge | Databases, workers with no internet | Stronger isolation, no outbound |
| Multi-network | Reverse proxy / API gateway | One container joins two segments |
| Overlay | Docker Swarm multi-host | Encrypted VXLAN across hosts |
| Host network | Very high throughput | No isolation |
| Macvlan | Container needs its own IP | Complex, requires physical network |

## Best Practices

- Never use the default bridge network in production. Create custom networks.
- Use `internal: true` for backend networks with databases or private services.
- Connect containers to only the networks they need.
- Bind database ports to `127.0.0.1` only. Never expose databases on `0.0.0.0`.
- Define segmentation in `docker-compose.yml` so you can version it.
- Inspect networks regularly with `docker network inspect` and prune unused
  networks.
- Use overlay networks when you've got a Docker Swarm cluster across hosts.

## Common Mistakes

- Using the default bridge in production, so every container can reach every
  other one.
- Exposing database ports to `0.0.0.0`.
- Putting every container on the same network. A compromised container can attack
  the rest.
- Not using `internal: true` for backend networks. Databases may make outbound
  internet connections.
- Forgetting that DNS only resolves within one network.
- Connecting a container to too many networks, which increases the attack
  surface.

## FAQ

### Can containers on different Docker networks communicate?

No. Containers on different networks won't reach each other directly. You can
connect a single container to both networks, or put a reverse proxy on the edge.

### How does DNS resolution work?

Docker has an embedded DNS server on custom bridge networks. Container names
resolve only inside that network. The default bridge won't resolve container
names for you.

### What is the difference between internal and non-internal networks?

Internal networks (`--internal` or `internal: true`) cut off internet access.
Containers can only talk to other containers on the same network. Non-internal
networks allow outbound internet.

### How do I debug connectivity?

Get a shell inside the container with `docker exec <container> sh`, then try
`ping`, `curl`, or `nc`. Use `docker network inspect <network>` to see which
containers are actually connected.

### Should I use overlay or bridge?

Use bridge when your stack stays on one host. Use overlay when your Swarm spans
more than one host. Overlay uses VXLAN tunnels and supports encryption.

### When is host network the right choice?

Almost never for services that handle untrusted traffic. Use it only for
performance-critical, trusted workloads where you can't pay the bridge NAT
overhead.
