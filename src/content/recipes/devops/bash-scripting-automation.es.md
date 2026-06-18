---
contentType: recipes
slug: bash-scripting-automation
title: "Scripting en Bash para Automatizacion DevOps y Tareas de Sistema"
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
  - scripting
relatedResources:
  - /recipes/read-write-file
  - /recipes/pre-commit-hooks
  - /guides/infrastructure-as-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Scripting en Bash para automatizacion DevOps. Escribe scripts robustos para despliegues, monitoreo, rotacion de logs y mantenimiento con manejo de errores y logging."
  keywords:
    - bash scripting
    - devops automation
    - shell scripting
    - system administration
    - deployment scripts
---

# Scripting en Bash para Automatizacion DevOps y Tareas de Sistema

Bash sigue siendo la lingua franca de administracion de sistemas y automatizacion DevOps. Un script bien estructurado con manejo de errores apropiado, logging y validacion puede automatizar despliegues, rotar logs, monitorear servicios y realizar mantenimiento rutinario en cualquier ambiente Unix-like sin dependencias externas.

## Cuando Usar Esto

- Necesitas automatizar tareas repetitivas de sistema o despliegue
- El ambiente es minimal (contenedores, runners de CI, VMs) sin Node/Python
- Quieres automatizacion auto-documentada que cualquier sysadmin pueda leer y modificar

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
