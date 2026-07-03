---
contentType: recipes
slug: docker-network-isolation
title: "Docker Network Isolation and Inter-Container Security"
description: "Secure inter-container communication with custom Docker networks, network segmentation, and access control policies."
metaDescription: "Secure Docker containers with network isolation, custom bridge networks, internal networks, and access control. Prevent unauthorized inter-container communication."
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
  - /recipes/devops/docker-health-check-configuration
  - /recipes/devops/docker-compose-dev-prod-split
  - /recipes/devops/docker-multi-stage-build-optimization
  - /guides/webhook-security-guide
  - /patterns/sidecar-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Secure Docker containers with network isolation, custom bridge networks, internal networks, and access control. Prevent unauthorized inter-container communication."
  keywords:
    - docker network isolation
    - docker container security
    - docker bridge network
    - docker internal network
    - docker network segmentation
    - inter-container communication security
---

## Overview

By default, Docker containers on the default bridge network can communicate with each other. This is a security risk: a compromised container can probe or attack other containers on the same host. This recipe shows how to isolate containers using custom networks, internal networks, and access control to limit which containers can talk to each other.

## When to Use

- You run multiple services on the same host and need to restrict inter-container communication
- You have a public-facing container (API) and a private container (database) that should not be reachable from outside
- You want to segment services by trust level (frontend, backend, database)
- You need to comply with security policies requiring network segmentation

## Solution

### Default bridge vs custom bridge

```bash
# Default bridge: containers can talk to each other (insecure)
docker run -d --name api --network bridge my-api
docker run -d --name db --network bridge my-db
# api can reach db and vice versa — no isolation

# Custom bridge: containers can only talk to containers on the same network
docker network create --driver bridge frontend-net
docker network create --driver bridge backend-net

docker run -d --name api --network backend-net my-api
docker run -d --name db --network backend-net my-db
docker run -d --name web --network frontend-net my-web

# web cannot reach db — different network
# api can reach db — same network
```

### Internal network (no internet access)

```bash
# Create an internal network — containers cannot reach the internet
docker network create --driver bridge --internal backend-internal

docker run -d --name db --network backend-internal my-db
# db has no internet access, only inter-container communication on this network
```

### Multi-network container (API connects to both frontend and backend)

```bash
docker network create frontend-net
docker network create backend-net

# API container joins both networks
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
        internal: true   # No internet access for backend
```

### Network with IP range and subnet

```bash
docker network create \
    --driver bridge \
    --subnet 172.20.0.0/16 \
    --ip-range 172.20.0.0/24 \
    --gateway 172.20.0.1 \
    backend-net
```

### Restricting published ports with IP binding

```bash
# Bind to localhost only — not accessible from other machines
docker run -d -p 127.0.0.1:5432:5432 --name db postgres:16-alpine

# Bind to a specific interface
docker run -d -p 10.0.0.5:80:80 --name web nginx:alpine

# Bind to all interfaces (default — least secure)
docker run -d -p 0.0.0.0:80:80 --name web nginx:alpine
```

### Overlay network for Docker Swarm

```bash
# Create an overlay network (requires Swarm mode)
docker network create --driver overlay --attachable my-overlay-net

# Services on different hosts can communicate securely
docker service create --name api --network my-overlay-net my-api
docker service create --name db --network my-overlay-net my-db
```

### Inspecting network connectivity

```bash
# List all networks
docker network ls

# Inspect a network to see connected containers
docker network inspect backend-net

# Test connectivity from one container to another
docker exec api ping db
docker exec api curl -f http://db:5432

# Remove a container from a network
docker network disconnect backend-net api
```

## Explanation

Docker networks provide isolation at the data link layer. Containers on different networks cannot communicate directly.

Network types:

- **bridge**: The default driver for single-host networking. Creates a virtual ethernet bridge on the host. Custom bridge networks provide DNS resolution (container names resolve to IPs) and isolation.
- **internal**: A bridge network with `--internal` flag. Containers on this network have no external internet access. Useful for databases that should only be reachable by application containers.
- **overlay**: For multi-host networking with Docker Swarm. Uses VXLAN tunnels between hosts. Containers on the same overlay network can communicate across hosts.
- **host**: No isolation — the container uses the host's network stack directly. Use only for performance-critical scenarios.

Security principles:

- **Least privilege**: Each container should only be on the networks it needs. A database does not need internet access.
- **Segmentation**: Separate public-facing services (web) from internal services (database) using different networks.
- **Internal networks**: Use `internal: true` for networks that should have no internet access.
- **Port binding**: Bind to `127.0.0.1` for services that should only be accessible from the host, not from the network.

## Variants

| Network Type | Scope | Internet Access | Use When |
|-------------|-------|-----------------|----------|
| Default bridge | Single host | Yes | Development only |
| Custom bridge | Single host | Yes | Production single-host |
| Internal bridge | Single host | No | Databases, private services |
| Overlay | Multi-host (Swarm) | Yes | Swarm clusters |
| Host | Single host | Yes | Maximum performance |

## Guidelines

- Never use the default bridge network in production. Create custom networks.
- Use `internal: true` for backend networks containing databases and private services.
- Connect containers to only the networks they need. A web container should not be on the backend network.
- Bind database ports to `127.0.0.1` only. Never expose databases to external interfaces.
- Use Docker Compose networks to define segmentation declaratively.
- Use overlay networks for Swarm multi-host communication.
- Inspect networks regularly with `docker network inspect` to verify connectivity.
- Remove unused networks with `docker network prune`.

## Common Mistakes

- Using the default bridge network in production. All containers can reach each other.
- Exposing database ports to `0.0.0.0`. Anyone on the network can connect.
- Putting all containers on one network. No segmentation means a compromised container can attack everything.
- Not using `internal: true` for backend networks. Databases can make outbound internet connections.
- Forgetting that containers on different networks cannot resolve each other's names. DNS only works within the same network.
- Connecting a container to too many networks. This increases the attack surface.

## Frequently Asked Questions

### Can containers on different networks communicate?

No. Containers on different Docker networks cannot communicate directly. You need a container connected to both networks to act as a bridge, or use a reverse proxy.

### How does DNS resolution work in custom networks?

Docker embeds a DNS server in each custom bridge network. Container names resolve to their IP addresses within that network. The default bridge network does not have DNS resolution.

### What is the difference between internal and non-internal networks?

Internal networks (`--internal` flag) block all internet access. Containers can only communicate with other containers on the same network. Non-internal networks allow containers to reach the internet.

### How do I debug network connectivity issues?

Use `docker exec -it <container> sh` and test with `ping`, `curl`, or `nc`. Check `docker network inspect <network>` to see which containers are connected. Verify that containers are on the same network if they need to communicate.
