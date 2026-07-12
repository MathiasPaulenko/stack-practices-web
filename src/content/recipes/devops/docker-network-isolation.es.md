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

### Network Aliases para Service Discovery

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
# Otros contenedores pueden alcanzar api por cualquier alias
docker exec web curl http://api-service:3000
docker exec web curl http://api.internal:3000
docker exec api curl http://database:5432
```

### Configuración de Red IPv6

```bash
# Crear red con soporte IPv6
docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 2001:db8:1::/64 \
    --gateway 2001:db8:1::1 \
    ipv6-net

# Ejecutar contenedor con IPv6
docker run -d --network ipv6-net --name api my-api
```

```yaml
# docker-compose.yml con IPv6
networks:
  frontend:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 2001:db8:2::/64
          gateway: 2001:db8:2::1
```

### Red Macvlan para Acceso Directo a la Red del Host

```bash
# Crear red macvlan (el contenedor obtiene su propio IP en la red física)
docker network create \
    --driver macvlan \
    --subnet 192.168.1.0/24 \
    --gateway 192.168.1.1 \
    -o parent=eth0 \
    macvlan-net

# Ejecutar contenedor con su propia MAC address e IP
docker run -d --network macvlan-net --name api my-api
```

### Integración de Firewall con iptables

```bash
# Bloquear contenedor de acceder a IPs externas específicas
iptables -I DOCKER-USER -d 10.0.0.0/8 -j DROP

# Permitir solo contenedores específicos a la base de datos
iptables -I DOCKER-USER -s 172.20.0.2 -d 172.20.0.3 -p tcp --dport 5432 -j ACCEPT
iptables -I DOCKER-USER -d 172.20.0.3 -p tcp --dport 5432 -j DROP

# Loggear tráfico dropeado para debugging
iptables -I DOCKER-USER -j LOG --log-prefix "DOCKER-DROP: " --log-level 4
```

### Toolkit de Troubleshooting de Red

```bash
#!/bin/bash
# net-debug.sh — Debug connectivity de red Docker

CONTAINER=${1:-api}
TARGET=${2:-db}
PORT=${3:-5432}

echo "=== Network check: $CONTAINER -> $TARGET:$PORT ==="

# Verificar si los contenedores existen
docker inspect "$CONTAINER" > /dev/null 2>&1 || { echo "Container $CONTAINER not found"; exit 1; }
docker inspect "$TARGET" > /dev/null 2>&1 || { echo "Container $TARGET not found"; exit 1; }

# Verificar redes compartidas
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
  echo "FAIL: Sin redes compartidas. Los contenedores no pueden comunicarse."
  exit 1
fi

echo "Redes compartidas:$SHARED"

# Testear resolución DNS
echo "=== Resolución DNS ==="
docker exec "$CONTAINER" getent hosts "$TARGET" 2>/dev/null || \
  echo "Resolución DNS falló para $TARGET"

# Testear conectividad TCP
echo "=== Conectividad TCP ==="
docker exec "$CONTAINER" timeout 3 bash -c "echo > /dev/tcp/$TARGET/$PORT" 2>/dev/null && \
  echo "OK: Puerto $PORT alcanzable" || \
  echo "FAIL: Puerto $PORT no alcanzable"

# Mostrar detalles de red
echo "=== Detalles de red ==="
for net in $SHARED; do
  echo "--- $net ---"
  docker network inspect "$net" --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
done
```

### Segmentación de Red Three-Tier con Compose

```yaml
# docker-compose.yml — Arquitectura three-tier
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

## Mejores Prácticas Adicionales


- For a deeper guide, see [Container Image Security Scanning with Trivy](/es/recipes/container-security-scanning/).

1. **Usa network aliases en lugar de nombres de contenedor.** Los aliases están desacoplados de la identidad del contenedor:

```yaml
services:
  api:
    networks:
      backend:
        aliases:
          - api-v1
```

2. **Setea `com.docker.network.bridge.enable_icc` para control fino.** Deshabilita comunicación inter-container en un bridge específico:

```bash
docker network create \
    --driver bridge \
    -o com.docker.network.bridge.enable_icc=false \
    isolated-net
```

3. **Usa `--link-local-ip` para contenedores que necesitan IPs específicos.** Útil para aplicaciones legacy que tienen IPs hardcodeados:

```bash
docker run -d --network backend-net --link-local-ip 172.20.0.10 my-app
```

## Errores Comunes Adicionales

1. **No limpiar redes no usadas.** Las redes huérfanas consumen espacio de IP y causan confusión:

```bash
# Limpiar redes no usadas
docker network prune

# Remover red específica
docker network rm backend-net
```

2. **Exponer puertos de debug externamente.** Herramientas de debug como pgAdmin o Redis Commander deben bind solo a localhost:

```bash
# Mal: accesible desde la red
docker run -p 5050:80 pgadmin

# Bien: solo localhost
docker run -p 127.0.0.1:5050:80 pgadmin
```

3. **No setear prioridades de red en Compose.** Cuando un contenedor se une a múltiples redes, el orden de resolución DNS importa:

```yaml
services:
  api:
    networks:
      backend: {}    # Red primaria
      frontend: {}   # Secundaria
    # DNS resuelve nombres en backend primero
```

## FAQ Adicional

### Como limito el ancho de banda de red para un contenedor?

Usa `--network-alias` con traffic shaping via `tc` o rate limiting integrado de Docker:

```bash
# Limitar ancho de banda a 1mbps usando tc
docker exec api tc qdisc add dev eth0 root tbf rate 1mbit burst 32kbit latency 400ms
```

### Como conecto una red Docker a una red del host?

Usa el driver `macvlan` o `--network host`:

```bash
# Macvlan: el contenedor aparece como dispositivo separado en la red física
docker network create -d macvlan --subnet 192.168.1.0/24 -o parent=eth0 pub-net

# Host network: el contenedor comparte el stack de red del host (sin aislamiento)
docker run -d --network host my-app
```

### Como encripto el tráfico de red overlay?

Las redes overlay de Docker Swarm soportan encriptación:

```bash
# Crear red overlay encriptada
docker network create --driver overlay --opt encrypted my-secure-net
```

La encriptación añade overhead de CPU pero protege el tráfico entre nodos Swarm.

## Tips de Rendimiento

1. **Usa red `host` para máximo throughput.** Evita el bridge de Docker por completo:

```bash
# Sin overhead de NAT, pero sin aislamiento
docker run -d --network host my-app
```

Solo usar para workloads críticos de rendimiento donde el aislamiento se maneja en otra capa.

2. **Reduce el overhead de DNS lookup.** El DNS embebido de Docker añade latencia por cada lookup:

```bash
# Añadir cache DNS en el contenedor
docker run -d --dns 127.0.0.11 --dns-opt "timeout:1" --dns-opt "attempts:1" my-app
```

3. **Usa `--network-alias` para service discovery más rápido.** Evita lookups por nombre de contenedor:

```yaml
services:
  db:
    networks:
      backend:
        aliases:
          - db.internal
```
