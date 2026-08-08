---




contentType: recipes
slug: bash-scripting-automation
title: "Scripting en Bash para Automatizacion DevOps y Tareas de"
description: "Como escribir scripts Bash robustos para automatizar despliegues, monitoreo de sistemas, rotacion de logs y tareas de mantenimiento rutinarias"
metaDescription: "Scripting en Bash para automatizacion DevOps. Escribe scripts robustos para despliegues, monitoreo, rotacion de logs y mantenimiento con manejo de errores y logging."
difficulty: beginner
topics:
  - devops
  - file-handling
tags:
  - bash
  - automation
  - devops
  - ci-cd
  - deployment
relatedResources:
  - /recipes/read-write-file
  - /recipes/pre-commit-hooks
  - /guides/infrastructure-as-code-guide
  - /recipes/traffic-mirroring
  - /recipes/bash-backup-rotation
  - /recipes/bash-disk-usage-monitor
  - /recipes/bash-log-rotation
  - /recipes/bash-parallel-commands
  - /recipes/cicd-pipeline-setup
  - /recipes/bash-aws-cli-automation
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-iptables-firewall-rules
  - /recipes/bash-log-rotation-compression
  - /recipes/bash-monitoring-disk-usage
  - /recipes/bash-parallel-job-execution
  - /recipes/bash-ssh-key-management
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Scripting en Bash para automatizacion DevOps. Escribe scripts robustos para despliegues, monitoreo, rotacion de logs y mantenimiento con manejo de errores y logging."
  keywords:
    - bash scripting
    - devops automation
    - shell scripting
    - system administration
    - deployment scripts




---

Bash sigue siendo la lingua franca de administracion de sistemas y automatizacion DevOps. Un script bien estructurado con manejo de errores apropiado, logging y validacion puede automatizar despliegues, rotar logs, monitorear servicios y realizar mantenimiento rutinario en cualquier ambiente Unix-like sin dependencias externas.

## Cuando Usar Esto

- Necesitas automatizar tareas repetitivas de sistema o despliegue. Consulta [Docker Basics](/recipes/devops/docker-basics) para despliegue de contenedores.
- El ambiente es minimal (contenedores, runners de CI, VMs) sin Node/Python. Consulta [CLI Tool Argument Parsing](/recipes/devops/cli-tool-argument-parsing) para alternativas CLI tipadas.
- Quieres automatizacion auto-documentada que cualquier sysadmin pueda leer y modificar. Consulta [Git Workflow](/recipes/devops/git-workflow) para automatización versionada.

## Requisitos Previos

- Bash 4.0+ (verificar con `bash --version`)
- Familiaridad basica con comandos Unix y permisos de archivos

## Solucion

### 1. Template de Script Defensivo

```bash
#!/bin/bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="/var/log/myapp/deploy.log"
readonly BACKUP_DIR="/var/backups/myapp"

# Funciones de logging
log() {
  local level="$1"
  shift
  echo "$(date '+%Y-%m-%d %H:%M:%S') [$level] $*" | tee -a "$LOG_FILE"
}

error() {
  log "ERROR" "$@" >&2
  exit 1
}

# Asegurar que comandos requeridos existen
check_dependencies() {
  local deps=("docker" "curl" "jq")
  for cmd in "${deps[@]}"; do
    if ! command -v "$cmd" &>/dev/null; then
      error "Comando requerido faltante: $cmd"
    fi
  done
}

main() {
  check_dependencies
  log "INFO" "Iniciando despliegue..."
  
  # Tu logica de automatizacion aqui
  
  log "INFO" "Despliegue completado exitosamente"
}

main "$@"
```

### 2. Script de Automatizacion de Despliegue

```bash
#!/bin/bash
set -euo pipefail

deploy_app() {
  local version="${1:-latest}"
  local environment="${2:-staging}"
  
  echo "Desplegando version $version a $environment"
  
  # Pull nueva imagen
  docker pull "myapp:$version"
  
  # Crear backup del contenedor actual
  if docker ps | grep -q myapp; then
    docker rename myapp myapp-backup
    docker stop myapp-backup
  fi
  
  # Ejecutar nuevo contenedor con health check
  docker run -d \
    --name myapp \
    --restart unless-stopped \
    -p 8080:8080 \
    -e NODE_ENV="$environment" \
    --health-cmd="curl -f http://localhost:8080/health || exit 1" \
    --health-interval=30s \
    --health-retries=3 \
    "myapp:$version"
  
  # Esperar a que el health check pase
  sleep 5
  if ! docker ps | grep -q "myapp"; then
    echo "Nuevo contenedor fallo al iniciar. Haciendo rollback..."
    docker stop myapp || true
    docker rm myapp || true
    docker rename myapp-backup myapp
    docker start myapp
    exit 1
  fi
  
  # Limpiar backup
  docker rm myapp-backup || true
  echo "Despliegue exitoso"
}

deploy_app "$@"
```

### 3. Rotacion y Limpieza de Logs

```bash
#!/bin/bash
set -euo pipefail

readonly LOG_DIR="/var/log/myapp"
readonly MAX_DAYS=30
readonly MAX_SIZE_MB=100

rotate_logs() {
  local log_file="$1"
  local base_name="$(basename "$log_file")"
  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  
  if [[ -f "$log_file" ]]; then
    local size_mb
    size_mb=$(du -m "$log_file" | cut -f1)
    
    if [[ "$size_mb" -gt "$MAX_SIZE_MB" ]]; then
      mv "$log_file" "${LOG_DIR}/${base_name}.${timestamp}"
      gzip "${LOG_DIR}/${base_name}.${timestamp}"
      touch "$log_file"
      systemctl reload myapp || true
    fi
  fi
}

cleanup_old_logs() {
  find "$LOG_DIR" -name "*.gz" -mtime +"$MAX_DAYS" -delete
  log "INFO" "Logs mayores a $MAX_DAYS dias eliminados"
}

# Procesar todos los archivos de log
for logfile in "$LOG_DIR"/*.log; do
  [[ -e "$logfile" ]] || continue
  rotate_logs "$logfile"
done

cleanup_old_logs
```

### 4. Monitoreo de Salud de Servicios

```bash
#!/bin/bash
set -euo pipefail

readonly SERVICES=("nginx" "postgresql" "redis")
readonly ALERT_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

check_service() {
  local service="$1"
  
  if systemctl is-active --quiet "$service"; then
    echo "✓ $service esta ejecutando"
    return 0
  else
    echo "✗ $service esta CAIDO"
    send_alert "$service"
    
    # Intentar reinicio
    systemctl restart "$service"
    sleep 2
    
    if systemctl is-active --quiet "$service"; then
      echo "✓ $service reiniciado exitosamente"
    else
      echo "✗ $service fallo al reiniciar"
    fi
  fi
}

send_alert() {
  local service="$1"
  curl -s -X POST "$ALERT_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"ALERTA: Servicio $service caido en $(hostname)\"}" \
    > /dev/null || true
}

for service in "${SERVICES[@]}"; do
  check_service "$service"
done
```

## Como Funciona

1. **`set -euo pipefail`** hace que el script salga en error, variables indefinidas y fallos de pipeline
2. **`readonly`** previene mutacion accidental de variables
3. **Funciones** organizan codigo en bloques reusables y testeables
4. **Logging** proporciona un audit trail para troubleshooting

## Consideraciones de Produccion

- Usa **`#!/usr/bin/env bash`** para portabilidad entre distribuciones
- Agrega **`trap cleanup EXIT`** para asegurar que archivos temporales sean eliminados
- Valida todas las entradas de usuario con expansion de parametros (`${1:-default}`)
- Testea scripts con **`shellcheck`** antes del despliegue

## Errores Comunes

- Olvidar `set -e` y permitir que fallos parciales continuen silenciosamente
- No citar variables, causando word splitting en paths con espacios
- Hardcodear paths absolutos que difieren entre ambientes

## FAQ

**P: Deberia usar Bash o Python para automatizacion?**
R: Bash para tareas simples de sistema bajo 50 lineas. Python para logica compleja, parsing de datos, o cuando necesitas librerias.

**P: Como manejo secretos en scripts Bash?**
R: Usa variables de entorno o secret managers. Nunca hardcodees credenciales. Pasalos como argumentos o lee de archivos seguros.

**P: Puedo hacer scripts Bash idempotentes?**
R: Si. Revisa estado antes de actuar (`if ! systemctl is-active nginx; then ...`) y usa logica condicional para saltear pasos ya completados.

### ¿Esta solución está lista para producción?

Sí, con advertencias. El script de despliegue incluye lógica de rollback, pero deberías añadir un loop de health check apropiado en lugar de `sleep 5`. Prueba en staging primero y asegúrate de que tu Docker registry sea accesible desde el host destino.

### ¿Cuáles son las características de rendimiento?

Bash mismo añade un overhead negligible. Los cuellos de botella de rendimiento vienen de comandos externos (`docker`, `curl`, `systemctl`). Para checks de alta frecuencia, batchea operaciones y evita spawnear subshells en loops.

### ¿Cómo depuro problemas con este enfoque?

```bash
# Habilitar trace mode para ver cada comando antes de ejecutarse
bash -x deploy.sh

# O añadir set -x en puntos específicos
set -x
docker pull "myapp:$version"
set +x

# Usar shellcheck para análisis estático
shellcheck deploy.sh
```

### 5. Ejecución Paralela de Tareas

```bash
#!/bin/bash
set -euo pipefail

# Ejecutar health checks en múltiples hosts en paralelo
readonly HOSTS=("web1.prod" "web2.prod" "web3.prod" "api1.prod")
readonly MAX_PARALLEL=4
readonly RESULTS_DIR="/tmp/health-results"
mkdir -p "$RESULTS_DIR"

check_host() {
  local host="$1"
  local result_file="${RESULTS_DIR}/${host}.txt"
  if ssh -o ConnectTimeout=5 "$host" "systemctl is-active nginx" > /dev/null 2>&1; then
    echo "OK: $host" > "$result_file"
  else
    echo "FAIL: $host" > "$result_file"
  fi
}

# Lanzar jobs en background con límite de paralelismo
running=0
for host in "${HOSTS[@]}"; do
  check_host "$host" &
  ((running++))
  if [ "$running" -ge "$MAX_PARALLEL" ]; then
    wait -n  # Esperar a que cualquier job termine
    ((running--))
  fi
done
wait  # Esperar todos los jobs restantes

# Recolectar resultados
cat "$RESULTS_DIR"/*.txt
rm -rf "$RESULTS_DIR"
```

### 6. Cleanup con Trap

```bash
#!/bin/bash
set -euo pipefail

TMP_DIR=""
LOCK_FILE=""

cleanup() {
  echo "Limpiando..."
  [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ] && rm -rf "$TMP_DIR"
  [ -n "$LOCK_FILE" ] && [ -f "$LOCK_FILE" ] && rm -f "$LOCK_FILE"
}

trap cleanup EXIT INT TERM

# Crear recursos temporales
TMP_DIR=$(mktemp -d)
LOCK_FILE="/tmp/myapp.lock"

# Adquirir lock
if [ -f "$LOCK_FILE" ]; then
  echo "Otra instancia ya está corriendo"
  exit 1
fi
echo $$ > "$LOCK_FILE"

# Trabajo principal
echo "Trabajando en $TMP_DIR..."
# El cleanup ocurre automáticamente al salir
```

### 7. Parseo de Argumentos con getopts

```bash
#!/bin/bash
set -euo pipefail

# Uso: ./deploy.sh -v 1.2.3 -e staging -d
VERSION="latest"
ENVIRONMENT="staging"
DRY_RUN=false

usage() {
  echo "Uso: $0 [-v version] [-e ambiente] [-d]"
  echo "  -v  Versión a desplegar (default: latest)"
  echo "  -e  Ambiente (default: staging)"
  echo "  -d  Dry run (mostrar comandos sin ejecutar)"
  exit 1
}

while getopts ":v:e:dh" opt; do
  case $opt in
    v) VERSION="$OPTARG" ;;
    e) ENVIRONMENT="$OPTARG" ;;
    d) DRY_RUN=true ;;
    h) usage ;;
    \?) echo "Opción inválida: -$OPTARG" >&2; usage ;;
    :) echo "Opción -$OPTARG requiere un argumento" >&2; usage ;;
  esac
done

if [ "$DRY_RUN" = true ]; then
  echo "[DRY RUN] Desplegaría versión $VERSION a $ENVIRONMENT"
  echo "[DRY RUN] docker pull myapp:$VERSION"
  echo "[DRY RUN] docker run -d --name myapp -e NODE_ENV=$ENVIRONMENT myapp:$VERSION"
  exit 0
fi

echo "Desplegando versión $VERSION a $ENVIRONMENT"
docker pull "myapp:$VERSION"
docker run -d --name myapp -e NODE_ENV="$ENVIRONMENT" "myapp:$VERSION"
```

### 8. Source de Archivo de Configuración

```bash
#!/bin/bash
set -euo pipefail

# Cargar configuración desde archivo externo
CONFIG_FILE="${1:-/etc/myapp/deploy.conf}"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Archivo de configuración no encontrado: $CONFIG_FILE" >&2
  exit 1
fi

# Source config (define variables como APP_NAME, REGISTRY, PORTS)
source "$CONFIG_FILE"

# Validar configuración requerida
for var in APP_NAME REGISTRY PORTS; do
  if [ -z "${!var:-}" ]; then
    echo "Config requerida faltante: $var" >&2
    exit 1
  fi
done

echo "Desplegando $APP_NAME desde $REGISTRY"
```

```bash
# /etc/myapp/deploy.conf
APP_NAME="myapp"
REGISTRY="registry.example.com"
PORTS="8080:8080"
ENVIRONMENT="production"
HEALTH_CHECK_URL="http://localhost:8080/health"
```




## Tips de Rendimiento

1. **Evita subshells en loops.** Cada `$(...)` spawnea un nuevo proceso:

```bash
# Lento: spawnea un subshell por cada iteración
for file in *.log; do
  size=$(stat -c%s "$file")
  echo "$file: $size"
done

# Más rápido: usar builtins de bash cuando sea posible
for file in *.log; do
  echo "$file: $(wc -c < "$file")"
done
```

2. **Batchea comandos SSH en lugar de loopear.** Una conexión SSH es más rápida que muchas:

```bash
# Lento: 10 conexiones SSH
for host in "${HOSTS[@]}"; do
  ssh "$host" "uptime"
  ssh "$host" "df -h"
  ssh "$host" "free -m"
done

# Rápido: 1 conexión SSH por host
for host in "${HOSTS[@]}"; do
  ssh "$host" "uptime; df -h; free -m"
done
```

3. **Usa `xargs -P` para procesamiento paralelo por lotes.** Más rápido que jobs en background manuales:

```bash
# Procesar archivos en paralelo (4 a la vez)
find /var/log -name "*.gz" -mtime +30 | xargs -P4 -I{} rm {}

# Checks SSH en paralelo
printf '%s\n' "${HOSTS[@]}" | xargs -P4 -I{} ssh {} "uptime"
```
