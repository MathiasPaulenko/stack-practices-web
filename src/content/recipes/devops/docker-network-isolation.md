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
  - /recipes/docker-health-check-configuration
  - /recipes/docker-compose-dev-prod-split
  - /recipes/docker-multi-stage-build-optimization
  - /guides/webhook-security-guide
  - /patterns/sidecar-pattern
  - /recipes/docker-image-vulnerability-scan
  - /recipes/bash-iptables-firewall
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

By default, Docker containers on the default bridge network can communicate with each other. This is a security risk: a compromised container can probe or attack other containers on the same host. The pattern below demonstrates how to isolate containers using custom networks, internal networks, and access control to limit which containers can talk to each other.

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

### Network Aliases for Service Discovery

```yaml
# docker-compose.yml
services:
  api:
    build: .
    networks:
      frontend:
        aliases:
          - api-service
          - api.internal
      backend:
        aliases:
          - backend-api

  db:
    image: postgres:16-alpine
    networks:
      backend:
        aliases:
          - database
          - postgres

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

```bash
# Other containers can reach api by any alias
docker exec web curl http://api-service:3000
docker exec web curl http://api.internal:3000
docker exec api curl http://database:5432
```

### IPv6 Network Configuration

```bash
# Create network with IPv6 support
docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 2001:db8:1::/64 \
    --gateway 2001:db8:1::1 \
    ipv6-net

# Run container with IPv6
docker run -d --network ipv6-net --name api my-api
```

```yaml
# docker-compose.yml with IPv6
networks:
  frontend:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 2001:db8:2::/64
          gateway: 2001:db8:2::1
```

### Macvlan Network for Direct Host Network Access

```bash
# Create macvlan network (container gets its own IP on the physical network)
docker network create \
    --driver macvlan \
    --subnet 192.168.1.0/24 \
    --gateway 192.168.1.1 \
    -o parent=eth0 \
    macvlan-net

# Run container with its own MAC address and IP
docker run -d --network macvlan-net --name api my-api
```

### Firewall Integration with iptables

```bash
# Block container from accessing specific external IPs
iptables -I DOCKER-USER -d 10.0.0.0/8 -j DROP

# Allow only specific containers to reach the database
iptables -I DOCKER-USER -s 172.20.0.2 -d 172.20.0.3 -p tcp --dport 5432 -j ACCEPT
iptables -I DOCKER-USER -d 172.20.0.3 -p tcp --dport 5432 -j DROP

# Log dropped traffic for debugging
iptables -I DOCKER-USER -j LOG --log-prefix "DOCKER-DROP: " --log-level 4
```

### Network Troubleshooting Toolkit

```bash
#!/bin/bash
# net-debug.sh — Debug Docker network connectivity

CONTAINER=${1:-api}
TARGET=${2:-db}
PORT=${3:-5432}

echo "=== Network check: $CONTAINER -> $TARGET:$PORT ==="

# Check if containers exist
docker inspect "$CONTAINER" > /dev/null 2>&1 || { echo "Container $CONTAINER not found"; exit 1; }
docker inspect "$TARGET" > /dev/null 2>&1 || { echo "Container $TARGET not found"; exit 1; }

# Check shared networks
CONTAINER_NETS=$(docker inspect "$CONTAINER" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')
TARGET_NETS=$(docker inspect "$TARGET" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')

echo "Container networks: $CONTAINER_NETS"
echo "Target networks: $TARGET_NETS"

SHARED=""
for net in $CONTAINER_NETS; do
  if echo "$TARGET_NETS" | grep -qw "$net"; then
    SHARED="$SHARED $net"
  fi
done

if [ -z "$SHARED" ]; then
  echo "FAIL: No shared networks. Containers cannot communicate."
  exit 1
fi

echo "Shared networks:$SHARED"

# Test DNS resolution
echo "=== DNS resolution ==="
docker exec "$CONTAINER" getent hosts "$TARGET" 2>/dev/null || \
  echo "DNS resolution failed for $TARGET"

# Test TCP connectivity
echo "=== TCP connectivity ==="
docker exec "$CONTAINER" timeout 3 bash -c "echo > /dev/tcp/$TARGET/$PORT" 2>/dev/null && \
  echo "OK: Port $PORT reachable" || \
  echo "FAIL: Port $PORT not reachable"

# Show network details
echo "=== Network details ==="
for net in $SHARED; do
  echo "--- $net ---"
  docker network inspect "$net" --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
done
```

### Three-Tier Network Segmentation with Compose

```yaml
# docker-compose.yml — Three-tier architecture
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
      cache:
        condition: service_started

  worker:
    build: ./worker
    networks:
      - backend
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    networks:
      - backend
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    networks:
      - backend
    volumes:
      - redis_data:/data

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true

volumes:
  postgres_data:
  redis_data:
```

## Additional Best Practices


- For a deeper guide, see [Container Image Security Scanning with Trivy](/recipes/container-security-scanning/).

1. **Use network aliases instead of container names.** Aliases are decoupled from container identity:

```yaml
services:
  api:
    networks:
      backend:
        aliases:
          - api-v1
```

2. **Set `com.docker.network.bridge.enable_icc` for fine-grained control.** Disable inter-container communication on a specific bridge:

```bash
docker network create \
    --driver bridge \
    -o com.docker.network.bridge.enable_icc=false \
    isolated-net
```

3. **Use `--link-local-ip` for containers needing specific IPs.** Useful for legacy applications that hardcode IPs:

```bash
docker run -d --network backend-net --link-local-ip 172.20.0.10 my-app
```

## Additional Common Mistakes

1. **Not pruning unused networks.** Orphaned networks consume IP space and cause confusion:

```bash
# Clean up unused networks
docker network prune

# Remove specific network
docker network rm backend-net
```

2. **Exposing debug ports externally.** Debug tools like pgAdmin or Redis Commander should bind to localhost only:

```bash
# Bad: accessible from network
docker run -p 5050:80 pgadmin

# Good: localhost only
docker run -p 127.0.0.1:5050:80 pgadmin
```

3. **Not setting network priorities in Compose.** When a container joins multiple networks, DNS resolution order matters:

```yaml
services:
  api:
    networks:
      backend: {}    # Primary network
      frontend: {}   # Secondary
    # DNS resolves names on backend first
```

## Additional FAQ

### How do I limit network bandwidth for a container?

Use `--network-alias` with traffic shaping via `tc` or Docker's built-in rate limiting:

```bash
# Limit bandwidth to 1mbps using tc
docker exec api tc qdisc add dev eth0 root tbf rate 1mbit burst 32kbit latency 400ms
```

### How do I connect a Docker network to a host network?

Use `macvlan` driver or `--network host`:

```bash
# Macvlan: container appears as separate device on the physical network
docker network create -d macvlan --subnet 192.168.1.0/24 -o parent=eth0 pub-net

# Host network: container shares host's network stack (no isolation)
docker run -d --network host my-app
```

### How do I encrypt overlay network traffic?

Docker Swarm overlay networks support encryption:

```bash
# Create encrypted overlay network
docker network create --driver overlay --opt encrypted my-secure-net
```

Encryption adds CPU overhead but protects traffic between Swarm nodes.

## Performance Tips

1. **Use `host` network for maximum throughput.** Bypasses the Docker bridge entirely:

```bash
# No NAT overhead, but no isolation
docker run -d --network host my-app
```

Only use this for performance-critical workloads where isolation is handled at a different layer.

2. **Reduce DNS lookup overhead.** Docker's embedded DNS adds latency for each lookup:

```bash
# Add DNS cache in container
docker run -d --dns 127.0.0.11 --dns-opt "timeout:1" --dns-opt "attempts:1" my-app
```

3. **Use `--network-alias` for faster service discovery.** Avoids container name lookups:

```yaml
services:
  db:
    networks:
      backend:
        aliases:
          - db.internal
```
