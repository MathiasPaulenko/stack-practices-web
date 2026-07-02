---
contentType: recipes
slug: docker-compose-dev-prod-split
title: "Docker Compose Dev/Prod: Separación de Entornos"
description: "Separa configs de Docker Compose para desarrollo y producción con overrides"
metaDescription: "Divide configs de Docker Compose para dev y prod con override files, profiles y variables de entorno. Configuración multi-entorno de contenedores."
difficulty: intermediate
topics:
  - devops
tags:
  - docker
  - docker-compose
  - dev-prod-split
  - environment
  - configuration
  - devops
relatedResources:
  - /recipes/docker-multi-stage-build-optimization
  - /recipes/docker-health-check-configuration
  - /guides/docker-best-practices
  - /patterns/multi-environment-pattern
  - /docs/docker-deployment-checklist
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Divide configs de Docker Compose para dev y prod con override files, profiles y variables de entorno. Configuración multi-entorno de contenedores."
  keywords:
    - docker compose dev prod
    - docker compose override
    - docker compose profiles
    - separate environments docker
    - docker compose multi environment
    - docker compose production config
---

## Visión General

Docker Compose soporta múltiples archivos y patrones de override para separar configuraciones de desarrollo y producción. Esta recipe muestra cómo usar un archivo base, un override de dev y un override de prod para ejecutar la misma app con diferentes settings (hot reload, puertos de debug, TLS, límites de recursos) sin duplicar definiciones de servicios.

## Cuándo Usar

- Necesitas diferentes configs para dev (hot reload, debug) y prod (TLS, límites de recursos)
- Quieres evitar mantener archivos compose separados con servicios duplicados
- Usas Docker Compose en CI/CD y necesitas overrides específicos por entorno
- Quieres defaults sensatos con la capacidad de overridear por entorno

## Solución

### Archivo compose base

```yaml
# docker-compose.yml (base — compartido por dev y prod)
services:
    api:
        build:
            context: .
            dockerfile: Dockerfile
        environment:
            - NODE_ENV=${NODE_ENV:-development}
            - DATABASE_URL=postgres://app:app@db:5432/app
        depends_on:
            db:
                condition: service_healthy
        ports:
            - "${API_PORT:-3000}:3000"

    db:
        image: postgres:16-alpine
        environment:
            POSTGRES_USER: app
            POSTGRES_PASSWORD: app
            POSTGRES_DB: app
        volumes:
            - db-data:/var/lib/postgresql/data
        healthcheck:
            test: ["CMD", "pg_isready", "-U", "app"]
            interval: 10s
            timeout: 5s
            retries: 5

volumes:
    db-data:
```

### Override de dev

```yaml
# docker-compose.dev.yml
services:
    api:
        build:
            target: builder
        environment:
            - NODE_ENV=development
            - DEBUG=app:*
        volumes:
            - .:/app
            - /app/node_modules
        command: npm run dev
        ports:
            - "3000:3000"
            - "9229:9229"  # Debugger de Node.js

    db:
        ports:
            - "5432:5432"
        volumes:
            - db-data-dev:/var/lib/postgresql/data

volumes:
    db-data-dev:
```

### Override de prod

```yaml
# docker-compose.prod.yml
services:
    api:
        build:
            target: production
        environment:
            - NODE_ENV=production
        deploy:
            replicas: 3
            resources:
                limits:
                    cpus: "1.0"
                    memory: 512M
                reservations:
                    cpus: "0.5"
                    memory: 256M
            restart_policy:
                condition: on-failure
                max_attempts: 3
        ports:
            - "80:3000"
        healthcheck:
            test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
            interval: 30s
            timeout: 5s
            retries: 3
            start_period: 10s

    db:
        environment:
            POSTGRES_PASSWORD: ${DB_PASSWORD}
        volumes:
            - db-data:/var/lib/postgresql/data
        deploy:
            resources:
                limits:
                    cpus: "2.0"
                    memory: 1G
```

### Ejecutando dev y prod

```bash
# Desarrollo (hot reload + debugger)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Producción (optimizado + límites de recursos)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Usando COMPOSE_FILE env var (sin flags -f)
export COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml
docker compose up
```

### Perfiles de Compose para servicios opcionales

```yaml
# docker-compose.yml
services:
    api:
        build: .
        ports:
            - "3000:3000"

    db:
        image: postgres:16-alpine
        profiles: ["dev", "prod"]

    redis:
        image: redis:7-alpine
        profiles: ["prod"]

    mailhog:
        image: mailhog/mailhog
        profiles: ["dev"]
        ports:
            - "8025:8025"
```

```bash
# Iniciar solo api (sin servicios de perfil)
docker compose up

# Iniciar con perfil dev (api + db + mailhog)
docker compose --profile dev up

# Iniciar con perfil prod (api + db + redis)
docker compose --profile prod up
```

### Archivo .env para variables de entorno

```bash
# .env.dev
NODE_ENV=development
API_PORT=3000
DB_PASSWORD=devpassword

# .env.prod
NODE_ENV=production
API_PORT=80
DB_PASSWORD=strong_prod_password
```

```bash
# Usar archivo env específico
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml up
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Explicación

Docker Compose fusiona múltiples archivos en orden. Los archivos posteriores overridean los anteriores. El archivo base define servicios compartidos, y los archivos de override añaden o modifican settings específicos de cada entorno.

Reglas de merge:

- **Escalares**: Los valores posteriores reemplazan los anteriores (ej., `NODE_ENV=production` overridea `NODE_ENV=development`).
- **Listas**: Las listas posteriores reemplazan las anteriores completamente (no se fusionan items de lista).
- **Mapas**: Fusionados clave por clave (ej., añadir una nueva variable de entorno mantiene las existentes).
- **Volúmenes**: Los nuevos volúmenes se añaden, no se reemplazan.

El flag `-f` especifica archivos en orden de merge. La env var `COMPOSE_FILE` hace lo mismo sin flags. Usa `--env-file` para cargar variables específicas del entorno.

Los perfiles permiten incluir servicios opcionales solo cuando se necesitan. Los servicios sin perfil siempre arrancan. Los servicios con perfil solo arrancan cuando se pasa `--profile <name>`.

## Variantes

| Patrón | Archivos | Usar Cuando |
|---------|-------|----------|
| Base + override | 3 archivos (base, dev, prod) | Split estándar dev/prod |
| Perfiles | 1 archivo con perfiles | Servicios opcionales por entorno |
| Múltiples .env | archivos env por entorno | Gestión de secretos sin cambios en compose |
| COMPOSE_FILE | env var | Evitar tipear flags -f |

## Pautas

- Mantener las definiciones de servicios compartidos en el archivo base. Solo overridear lo que difiere.
- Usar `target` en la sección build para seleccionar targets de multi-stage build por entorno.
- Montar código fuente como volúmenes en dev para hot reload. Nunca hacer esto en prod.
- Configurar límites de recursos y restart policies solo en prod.
- Exponer puertos de debug (9229 para Node.js, 5005 para Java) solo en dev.
- Usar `--env-file` para separar secretos por entorno.
- Usar perfiles para servicios opcionales (MailHog en dev, Redis en prod).
- Nombrar archivos de override claramente: `docker-compose.dev.yml`, `docker-compose.prod.yml`.
- Usar la env var `COMPOSE_FILE` en CI/CD para evitar flags -f largos.

## Errores Comunes

- Duplicar todos los servicios en archivos dev y prod en lugar de overridear solo diferencias.
- Montar código fuente en prod. Esto acopla el contenedor al filesystem del host y rompe reproducibilidad.
- No configurar límites de recursos en prod. Un solo contenedor puede consumir todos los recursos del host.
- Exponer puertos de debug en prod. Esto es un riesgo de seguridad.
- Usar la misma contraseña de base de datos para dev y prod. Los secretos de prod deben venir de env files o secret managers.
- Olvidar que las listas se reemplazan, no se fusionan. Añadir un puerto en el override elimina todos los puertos base.
- No usar `depends_on` con `condition: service_healthy` para orden de inicio.

## Preguntas Frecuentes

### ¿Cómo fusiona Docker Compose múltiples archivos?

Los archivos se fusionan en el orden en que aparecen en la línea de comandos. Para mapas (environment, labels), las claves se fusionan. Para listas (ports, volumes), la lista del archivo posterior reemplaza la anterior completamente. Los escalares se reemplazan.

### ¿Puedo usar Docker Compose para producción?

Sí, pero solo para deployments pequeños. Para producción a escala, usa Docker Swarm o Kubernetes. Compose está bien para deployments de un solo host, prototipado y CI/CD.

### ¿Cómo veo la configuración fusionada?

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

Esto genera la configuración final fusionada, útil para debuggear overrides.

### ¿Cuál es la diferencia entre perfiles y overrides?

Los perfiles controlan qué servicios arrancan. Los overrides controlan cómo se configuran los servicios. Usa perfiles para servicios opcionales (Redis, MailHog) y overrides para settings específicos del entorno (límites de recursos, env vars).
