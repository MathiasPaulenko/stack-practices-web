---
contentType: recipes
slug: docker-network-isolation
title: "Aislamiento de Red Docker y Seguridad Entre Contenedores"
description: "Asegura la comunicación entre contenedores con redes Docker personalizadas, segmentación de red y políticas de control de acceso."
metaDescription: "Asegura contenedores Docker con redes bridge, internas y overlay. Aísla servicios, bloquea tráfico no autorizado y asigna puertos de forma segura."
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
  metaDescription: "Asegura contenedores Docker con redes bridge, internas y overlay. Aísla servicios, bloquea tráfico no autorizado y asigna puertos de forma segura."
  keywords:
    - docker network isolation
    - docker container security
    - docker bridge network
    - docker internal network
    - docker network segmentation
    - inter-container communication
---

## Visión General

Por defecto, Docker pone los contenedores en la red bridge y les permite
comunicarse entre sí. Eso es un riesgo de seguridad: uno comprometido puede
sondear o atacar al resto en el mismo host. Esta receta muestra cómo aislar
servicios con redes personalizadas, redes internas y reglas de asignación de
puertos.

## Cuándo Usar

- Varias servicios corren en un host y querés limitar cómo se hablan entre sí.
- Un contenedor público (web) debe alcanzar una API, pero esa API también debe
  alcanzar una base de datos que debe permanecer privada.
- Querés segmentar servicios por nivel de confianza (frontend, backend, base de
  datos).
- Políticas de seguridad o compliance requieren segmentación de red.

### Cuándo evitarlo

- Solo hay un contenedor corriendo. Una red personalizada agrega complejidad sin
  una amenaza que mitigar.
- Ya usás Kubernetes o Docker Swarm con network policies que manejan la
  segmentación.
- Tu workload necesita la red del host para muy baja latencia y el aislamiento
  lo manejás en otro lugar.

## Solución

### Bridge por defecto vs bridge personalizado

```bash
# Bridge por defecto: los contenedores se comunican entre sí (inseguro)
docker run -d --name api --network bridge my-api
docker run -d --name db --network bridge my-db
# api puede alcanzar db y viceversa — sin aislamiento

# Bridge personalizado: los contenedores de esta red solo se hablan entre sí
docker network create --driver bridge frontend-net
docker network create --driver bridge backend-net

docker run -d --name api --network backend-net my-api
docker run -d --name db --network backend-net my-db
docker run -d --name web --network frontend-net my-web

# web no puede alcanzar db — red diferente
# api puede alcanzar db — misma red
```

### Red interna (sin acceso a internet)

```bash
# Crear una red interna — los contenedores no pueden alcanzar internet
docker network create --driver bridge --internal backend-internal

docker run -d --name db --network backend-internal my-db
# db no tiene acceso a internet, solo tráfico entre contenedores de esta red
```

### Contenedor multi-red

```bash
docker network create frontend-net
docker network create backend-net

# La API se une a ambas redes
docker run -d --name api --network frontend-net my-api
docker network connect backend-net api

docker run -d --name web --network frontend-net my-web
docker run -d --name db --network backend-net my-db

# web -> api (frontend-net) ✓
# api -> db (backend-net) ✓
# web -> db ✗ (redes diferentes)
```

### Docker Compose con aislamiento de red

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

### Asignar puertos a una interfaz específica

```bash
# Solo localhost — no accesible desde otras máquinas
docker run -d -p 127.0.0.1:5432:5432 --name db postgres:16-alpine

# Interfaz específica
docker run -d -p 10.0.0.5:80:80 --name web nginx:alpine

# Todas las interfaces — menos seguro, evitar para bases de datos
docker run -d -p 0.0.0.0:80:80 --name web nginx:alpine
```

### Inspeccionar y probar conectividad

```bash
# Listar redes
docker network ls

# Inspeccionar una red
docker network inspect backend-net

# Probar de un contenedor a otro
docker exec api ping db
docker exec api curl -f http://db:5432

# Quitar un contenedor de una red
docker network disconnect backend-net api
```

## Explicación

Las redes Docker aislan en la capa de enlace. Un contenedor en una red no puede
iniciar una conversación con otro en una red distinta. Docker tiene un DNS
embebido en las redes bridge personalizadas, así que los nombres solo se
resuelven ahí.

**Tipos de red**:

| Tipo | Alcance | Internet | Uso |
| --- | --- | --- | --- |
| **bridge** | Un host | Sí | Red por defecto/personalizada en un host |
| **internal** | Un host | No | Bases de datos y servicios privados |
| **overlay** | Multi-host | Sí | Docker Swarm entre hosts |
| **host** | Un host | Sí | Alto performance, sin aislamiento |
| **macvlan** | Un host | Sí | IP directa en la red física |

Usá aliases para darle varios nombres a un contenedor en la misma red:

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

Otros contenedores pueden alcanzarla como `database` o `postgres.internal`.

## Variantes

| Enfoque | Ideal para | Compromiso |
| --- | --- | --- |
| Bridge personalizado | Un host, varios servicios | Más seguro que el bridge por defecto |
| Bridge interno | Bases de datos, workers sin internet | Mayor aislamiento, sin salida |
| Multi-red | Reverse proxy / API gateway | Un contenedor une dos segmentos |
| Overlay | Docker Swarm multi-host | VXLAN cifrado entre hosts |
| Red host | Muy alto throughput | Sin aislamiento |
| Macvlan | Contenedor necesita IP propia | Complejo, requiere red física |

## Mejores Prácticas

- No uses la red bridge por defecto en producción. Creá redes personalizadas.
- Usá `internal: true` para redes backend con bases de datos o servicios
  privados.
- Conectá contenedores solo a las redes que necesiten.
- Asigná puertos de base de datos solo a `127.0.0.1`. Nunca expongas bases de
  datos en `0.0.0.0`.
- Definí la segmentación en `docker-compose.yml` para poder versionarla.
- Inspeccioná redes regularmente con `docker network inspect` y eliminá redes no
  usadas.
- Usá overlay para clusters Swarm multi-host.

## Errores Comunes

- Usar el bridge por defecto en producción, donde cada contenedor puede
  alcanzar a los demás.
- Exponer puertos de base de datos en `0.0.0.0`.
- Poner todos los contenedores en una sola red. Un contenedor comprometido puede
  atacar al resto.
- No usar `internal: true` en redes backend. Las bases de datos pueden hacer
  conexiones salientes.
- Olvidar que el DNS solo resuelve dentro de una misma red.
- Conectar un contenedor a demasiadas redes, aumentando la superficie de ataque.

## FAQ

### ¿Pueden comunicarse contenedores en redes Docker diferentes?

No. Los contenedores en redes diferentes no se alcanzan directamente. Podés
conectar un mismo contenedor a ambas redes, o poner un reverse proxy en el
borde.

### ¿Cómo funciona la resolución DNS?

Docker tiene un DNS embebido en las redes bridge personalizadas. Los nombres se
resuelven solo dentro de esa red. El bridge por defecto no resuelve nombres de
contenedores.

### ¿Cuál es la diferencia entre red interna y no interna?

Las redes internas (`--internal` o `internal: true`) cortan el acceso a
internet. Los contenedores solo hablan con otros de la misma red. Las redes no
internas permiten salida a internet.

### ¿Cómo depuro conectividad?

Metete dentro del contenedor con `docker exec <contenedor> sh` y probá `ping`,
`curl` o `nc`. Usá `docker network inspect <red>` para ver qué contenedores están
conectados.

### ¿Debería usar overlay o bridge?

Usá bridge cuando todo corre en un host. Usá overlay cuando tu Swarm se extiende
a más de un host. Overlay usa túneles VXLAN y soporta cifrado.

### ¿Cuándo es correcto usar la red host?

Casi nunca para servicios que manejen tráfico no confiable. Usala solo para
workloads de confianza críticos en performance donde no podés pagar el overhead
NAT del bridge.
