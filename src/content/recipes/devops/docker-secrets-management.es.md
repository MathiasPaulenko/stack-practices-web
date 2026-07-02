---
contentType: recipes
slug: docker-secrets-management
title: "Gestión de Secretos Docker Sin Hardcodear Credenciales"
description: "Inyecta secretos en contenedores usando Docker secrets, archivos env y gestores externos sin hardcodearlos en imágenes."
metaDescription: "Gestiona secretos Docker de forma segura con Docker Swarm secrets, .env files, gestores externos. Evita hardcodear credenciales en imágenes y compose files."
difficulty: intermediate
topics:
  - devops
  - security
tags:
  - docker
  - secrets
  - security
  - credentials
  - docker-swarm
  - env-files
relatedResources:
  - /recipes/devops/docker-network-isolation
  - /recipes/devops/docker-health-check-configuration
  - /recipes/devops/docker-compose-dev-prod-split
  - /guides/docker-security-guide
  - /patterns/sidecar-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Gestiona secretos Docker de forma segura con Docker Swarm secrets, .env files, gestores externos. Evita hardcodear credenciales en imágenes y compose files."
  keywords:
    - docker secrets management
    - docker swarm secrets
    - docker env file secrets
    - docker credentials security
    - docker secret injection
    - avoid hardcoding secrets docker
---

## Visión General

Hardcodear secretos (contraseñas, API keys, tokens) en imágenes Docker o archivos Compose es un riesgo crítico de seguridad. Las imágenes se comparten, cachean e inspeccionan — cualquiera con acceso a la imagen puede extraer los secretos. Esta recipe muestra patrones seguros para inyectar secretos en contenedores en tiempo de ejecución.

## Cuándo Usar

- Necesitas pasar contraseñas de base de datos, API keys o certificados TLS a contenedores
- Quieres evitar commitear secretos al control de versiones
- Usas Docker Swarm o Compose en producción
- Necesitas rotar secretos sin reconstruir imágenes

## Solución

### Docker Swarm secrets (más seguro)

```bash
# Crear un secret desde un archivo
echo "my-super-secret-password" | docker secret create db_password -

# Crear un secret desde stdin
printf "AKIAIOSFODNN7EXAMPLE" | docker secret create aws_access_key -

# Listar secrets
docker secret ls

# Usar en un servicio Swarm
docker service create \
    --name api \
    --secret db_password \
    --secret aws_access_key \
    -e DB_PASSWORD_FILE=/run/secrets/db_password \
    -e AWS_KEY_FILE=/run/secrets/aws_access_key \
    my-api:latest
```

Docker monta los secretos como archivos en `/run/secrets/<secret_name>`. Nunca se exponen como variables de entorno y se encriptan en tránsito.

### Leer secretos desde archivos en tu app

```python
import os

def get_secret(name: str) -> str:
    """Leer un secret desde un archivo (patrón Docker Swarm)."""
    file_path = os.environ.get(f"{name}_FILE")
    if file_path:
        with open(file_path, "r") as f:
            return f.read().strip()
    # Fallback a env var para dev local
    return os.environ.get(name, "")
```

```javascript
const fs = require("fs");

function getSecret(name) {
    const filePath = process.env[`${name}_FILE`];
    if (filePath) {
        return fs.readFileSync(filePath, "utf8").trim();
    }
    return process.env[name] || "";
}
```

### Docker Compose con secrets

```yaml
# docker-compose.yml
services:
    api:
        build: .
        secrets:
            - db_password
            - api_key
        environment:
            - DB_PASSWORD_FILE=/run/secrets/db_password
            - API_KEY_FILE=/run/secrets/api_key

    db:
        image: postgres:16-alpine
        environment:
            POSTGRES_PASSWORD_FILE: /run/secrets/db_password
        secrets:
            - db_password

secrets:
    db_password:
        file: ./secrets/db_password.txt
    api_key:
        file: ./secrets/api_key.txt
```

### .env file (solo desarrollo)

```bash
# .env (NUNCA commitear esto — añadir a .gitignore)
DB_PASSWORD=my-dev-password
API_KEY=dev-api-key-12345
JWT_SECRET=dev-jwt-secret
```

```yaml
# docker-compose.dev.yml
services:
    api:
        build: .
        env_file:
            - .env
        environment:
            - NODE_ENV=development
```

```bash
# .gitignore
.env
.env.*
secrets/
```

### Gestor de secretos externo (HashiCorp Vault)

```yaml
# docker-compose.yml
services:
    api:
        build: .
        environment:
            - VAULT_ADDR=https://vault.internal:8200
            - VAULT_TOKEN_FILE=/run/secrets/vault_token
        secrets:
            - vault_token
        command: ["./wait-for-vault.sh", "node", "server.js"]

    vault:
        image: hashicorp/vault:1.15
        ports:
            - "8200:8200"
        environment:
            VAULT_DEV_ROOT_TOKEN_ID: root
        cap_add:
            - IPC_LOCK

secrets:
    vault_token:
        file: ./secrets/vault_token.txt
```

```python
import hvac

def get_vault_secret(path: str) -> dict:
    """Obtener un secret desde HashiCorp Vault."""
    client = hvac.Client(
        url=os.environ["VAULT_ADDR"],
        token=get_secret("VAULT_TOKEN")
    )
    result = client.secrets.kv.v2.read_secret_version(path=path)
    return result["data"]["data"]
```

### Secretos en build-time con BuildKit

```dockerfile
# Dockerfile
# syntax=docker/dockerfile:1.6

FROM node:20-alpine

# Montar secret durante build solo — no se almacena en capas de imagen
RUN --mount=type=secret,id=npm_token \
    npm config set //registry.npmjs.org/:_authToken=$(cat /run/secrets/npm_token) && \
    npm ci --omit=dev && \
    npm config delete //registry.npmjs.org/:_authToken
```

```bash
# Build con secret de BuildKit
docker build --secret id=npm_token,source=$HOME/.npmrc -t my-api .
```

### Secretos en runtime con variables de entorno (menos seguro)

```yaml
# docker-compose.prod.yml
services:
    api:
        build: .
        environment:
            - DB_PASSWORD=${DB_PASSWORD}  # Desde --env-file o shell
```

```bash
# Pasar vía shell (no visible en docker inspect después de Compose v2)
export DB_PASSWORD=strong-prod-password
docker compose --env-file .env.prod up -d
```

## Explicación

Patrones de gestión de secretos ordenados por seguridad:

- **Docker Swarm secrets**: Los secretos se encriptan en reposo y en tránsito. Se montan como archivos de solo lectura en `/run/secrets/`. Nunca aparecen en variables de entorno ni en `docker inspect`. Mejor para deployments Swarm.
- **BuildKit mount secrets**: Los secretos están disponibles durante el build pero no se almacenan en capas de imagen. El archivo de secret se monta temporalmente y se elimina después del comando RUN. Mejor para registros privados npm/pip.
- **Gestores de secretos externos (Vault, AWS Secrets Manager)**: Los secretos se obtienen en runtime desde una bóveda central. Soporta rotación, audit logging y control de acceso granular. Mejor para producción enterprise.
- **.env files**: Simple pero riesgoso. Los secretos están en texto plano en disco. Usar solo para desarrollo. Nunca commitear al control de versiones.
- **Variables de entorno**: Visibles en `docker inspect` y `docker exec env`. Menos seguro para producción. Usar solo para configuración no sensible.

Principios clave:
- Los secretos nunca deben estar en capas de imagen. Los valores `ENV` y `ARG` son visibles en el historial de imagen.
- La convención del sufijo `_FILE` le dice a tu app que lea el secret desde una ruta de archivo en lugar de un valor de variable de entorno.
- Rota los secretos actualizándolos en el gestor, no reconstruyendo imágenes.

## Variantes

| Método | Seguridad | Complejidad | Usar Cuando |
|--------|----------|------------|----------|
| Swarm secrets | Alta | Baja | Docker Swarm producción |
| BuildKit mount | Alta | Media | Registros privados durante build |
| Vault / Secrets Manager | Alta | Alta | Enterprise, rotación necesaria |
| .env file | Baja | Baja | Solo desarrollo |
| Variables de entorno | Baja | Baja | Config no sensible |

## Pautas

- Nunca hardcodear secretos en Dockerfiles (`ENV`, `ARG`) o archivos Compose.
- Usar Docker Swarm secrets para deployments Swarm.
- Usar BuildKit `--mount=type=secret` para credenciales de build (npm, pip, apt).
- Leer secretos desde archivos usando la convención del sufijo `_FILE`.
- Añadir `.env` y `secrets/` a `.gitignore`.
- Usar gestores de secretos externos (Vault, AWS Secrets Manager) para producción enterprise.
- Rotar secretos regularmente sin reconstruir imágenes.
- Limitar acceso a secretos solo a servicios que los necesitan.
- Auditar acceso a secretos con `docker secret ls` y logs de auditoría de Vault.

## Errores Comunes

- Usar `ENV` en Dockerfiles para secretos. Son visibles en `docker history` e inspección de imagen.
- Commitear archivos `.env` a Git. Siempre añadir a `.gitignore`.
- Pasar secretos como argumentos de línea de comandos. Aparecen en `docker inspect` y listados de procesos.
- No usar la convención del sufijo `_FILE`. Las apps que solo leen env vars no pueden usar Swarm secrets.
- Dar a cada servicio acceso a todos los secretos. Seguir el principio de menor privilegio.
- No rotar secretos. Los secretos comprometidos deben ser reemplazables sin downtime.
- Usar el mismo secret entre entornos. Dev, staging y prod deben tener secretos diferentes.

## Preguntas Frecuentes

### ¿Son los Docker Compose secrets tan seguros como los Swarm secrets?

No. Los Compose secrets se montan como archivos desde el filesystem del host. No están encriptados en reposo. Los Swarm secrets están encriptados y gestionados por el Swarm manager. Usar Compose secrets para desarrollo y Swarm secrets para producción.

### ¿Puedo usar Docker secrets sin Swarm?

Docker Compose soporta secrets vía la clave `secrets` con origen `file:`. Esto monta el archivo en el contenedor. Es menos seguro que Swarm secrets pero mejor que variables de entorno.

### ¿Cómo roto secretos sin downtime?

En Swarm, actualiza el secret y luego actualiza el servicio: `docker service update --secret-rm db_password --secret-add db_password=db_password_v2 api`. El servicio se reinicia con el nuevo secret. Para zero-downtime, usar rolling updates.

### ¿Por qué debo evitar variables de entorno para secretos?

Las variables de entorno son visibles en `docker inspect`, `docker exec env`, y `/proc/<pid>/environ` en el host. Pueden filtrarse a logs y crash dumps. Los secretos basados en archivos son más seguros porque solo son legibles por el proceso del contenedor.
