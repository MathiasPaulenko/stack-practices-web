---
contentType: recipes
slug: docker-network-isolation
title: "Aislamiento de Red Docker y Seguridad Entre Contenedores"
description: "Asegura la comunicación entre contenedores con redes Docker personalizadas, segmentación de red y políticas de control de acceso."
metaDescription: "Asegura contenedores Docker con aislamiento de red, redes bridge personalizadas e internas. Previene comunicación no autorizada entre contenedores."
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
  - /guides/docker-security-guide
  - /patterns/sidecar-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Asegura contenedores Docker con aislamiento de red, redes bridge personalizadas e internas. Previene comunicación no autorizada entre contenedores."
  keywords:
    - docker network isolation
    - docker container security
    - docker bridge network
    - docker internal network
    - docker network segmentation
    - inter-container communication security
---

## Visión General

Por defecto, los contenedores Docker en la red bridge por defecto pueden comunicarse entre sí. Esto es un riesgo de seguridad: un contenedor comprometido puede sondear o atacar otros contenedores en el mismo host. Esta recipe muestra cómo aislar contenedores usando redes personalizadas, redes internas y control de acceso para limitar qué contenedores pueden comunicarse.

## Cuándo Usar

- Ejecutas múltiples servicios en el mismo host y necesitas restringir la comunicación entre contenedores
- Tienes un contenedor público (API) y uno privado (base de datos) que no debería ser accesible desde fuera
- Quieres segmentar servicios por nivel de confianza (frontend, backend, base de datos)
- Necesitas cumplir con políticas de seguridad que requieren segmentación de red

## Solución

### Bridge por defecto vs bridge personalizado

```bash
# Bridge por defecto: los contenedores pueden comunicarse entre sí (inseguro)
docker run -d --name api --network bridge my-api
docker run -d --name db --network bridge my-db
# api puede alcanzar db y viceversa — sin aislamiento

# Bridge personalizado: los contenedores solo pueden hablar con contenedores en la misma red
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
# db no tiene acceso a internet, solo comunicación entre contenedores en esta red
```

### Contenedor multi-red (API se conecta a frontend y backend)

```bash
docker network create frontend-net
docker network create backend-net

# Contenedor API se une a ambas redes
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
        internal: true   # Sin acceso a internet para backend
```

### Red con rango IP y subred

```bash
docker network create \
    --driver bridge \
    --subnet 172.20.0.0/16 \
    --ip-range 172.20.0.0/24 \
    --gateway 172.20.0.1 \
    backend-net
```

### Restringir puertos publicados con binding de IP

```bash
# Bind solo a localhost — no accesible desde otras máquinas
docker run -d -p 127.0.0.1:5432:5432 --name db postgres:16-alpine

# Bind a una interfaz específica
docker run -d -p 10.0.0.5:80:80 --name web nginx:alpine

# Bind a todas las interfaces (por defecto — menos seguro)
docker run -d -p 0.0.0.0:80:80 --name web nginx:alpine
```

### Red overlay para Docker Swarm

```bash
# Crear una red overlay (requiere Swarm mode)
docker network create --driver overlay --attachable my-overlay-net

# Servicios en diferentes hosts pueden comunicarse de forma segura
docker service create --name api --network my-overlay-net my-api
docker service create --name db --network my-overlay-net my-db
```

### Inspeccionar conectividad de red

```bash
# Listar todas las redes
docker network ls

# Inspeccionar una red para ver contenedores conectados
docker network inspect backend-net

# Testear conectividad de un contenedor a otro
docker exec api ping db
docker exec api curl -f http://db:5432

# Remover un contenedor de una red
docker network disconnect backend-net api
```

## Explicación

Las redes Docker proporcionan aislamiento en la capa de enlace de datos. Los contenedores en redes diferentes no pueden comunicarse directamente.

Tipos de red:

- **bridge**: El driver por defecto para networking de un solo host. Crea un bridge ethernet virtual en el host. Las redes bridge personalizadas proporcionan resolución DNS (los nombres de contenedor resuelven a IPs) y aislamiento.
- **internal**: Una red bridge con flag `--internal`. Los contenedores en esta red no tienen acceso a internet externo. Útil para bases de datos que solo deben ser alcanzables por contenedores de aplicación.
- **overlay**: Para networking multi-host con Docker Swarm. Usa túneles VXLAN entre hosts. Los contenedores en la misma red overlay pueden comunicarse a través de hosts.
- **host**: Sin aislamiento — el contenedor usa el stack de red del host directamente. Usar solo para escenarios críticos de rendimiento.

Principios de seguridad:

- **Menor privilegio**: Cada contenedor debería estar solo en las redes que necesita. Una base de datos no necesita acceso a internet.
- **Segmentación**: Separar servicios públicos (web) de servicios internos (base de datos) usando redes diferentes.
- **Redes internas**: Usar `internal: true` para redes que no deberían tener acceso a internet.
- **Binding de puertos**: Bind a `127.0.0.1` para servicios que solo deberían ser accesibles desde el host, no desde la red.

## Variantes

| Tipo de Red | Scope | Acceso Internet | Usar Cuando |
|-------------|-------|-----------------|----------|
| Bridge por defecto | Un host | Sí | Solo desarrollo |
| Bridge personalizado | Un host | Sí | Producción un host |
| Bridge interno | Un host | No | Bases de datos, servicios privados |
| Overlay | Multi-host (Swarm) | Sí | Clústeres Swarm |
| Host | Un host | Sí | Máximo rendimiento |

## Pautas

- Nunca usar la red bridge por defecto en producción. Crear redes personalizadas.
- Usar `internal: true` para redes de backend que contienen bases de datos y servicios privados.
- Conectar contenedores solo a las redes que necesitan. Un contenedor web no debería estar en la red de backend.
- Hacer bind de puertos de base de datos a `127.0.0.1` solo. Nunca exponer bases de datos a interfaces externas.
- Usar redes de Docker Compose para definir segmentación declarativamente.
- Usar redes overlay para comunicación multi-host en Swarm.
- Inspeccionar redes regularmente con `docker network inspect` para verificar conectividad.
- Eliminar redes no usadas con `docker network prune`.

## Errores Comunes

- Usar la red bridge por defecto en producción. Todos los contenedores pueden alcanzarse entre sí.
- Exponer puertos de base de datos a `0.0.0.0`. Cualquiera en la red puede conectarse.
- Poner todos los contenedores en una sola red. Sin segmentación, un contenedor comprometido puede atacar todo.
- No usar `internal: true` para redes de backend. Las bases de datos pueden hacer conexiones salientes a internet.
- Olvidar que los contenedores en redes diferentes no pueden resolver los nombres de los demás. DNS solo funciona dentro de la misma red.
- Conectar un contenedor a demasiadas redes. Esto aumenta la superficie de ataque.

## Preguntas Frecuentes

### ¿Pueden comunicarse contenedores en redes diferentes?

No. Los contenedores en redes Docker diferentes no pueden comunicarse directamente. Necesitas un contenedor conectado a ambas redes para actuar como puente, o usar un reverse proxy.

### ¿Cómo funciona la resolución DNS en redes personalizadas?

Docker incrusta un servidor DNS en cada red bridge personalizada. Los nombres de contenedor resuelven a sus direcciones IP dentro de esa red. La red bridge por defecto no tiene resolución DNS.

### ¿Cuál es la diferencia entre redes internas y no internas?

Las redes internas (flag `--internal`) bloquean todo el acceso a internet. Los contenedores solo pueden comunicarse con otros contenedores en la misma red. Las redes no internas permiten a los contenedores alcanzar internet.

### ¿Cómo depuro problemas de conectividad de red?

Usa `docker exec -it <container> sh` y prueba con `ping`, `curl`, o `nc`. Verifica `docker network inspect <network>` para ver qué contenedores están conectados. Confirma que los contenedores estén en la misma red si necesitan comunicarse.
