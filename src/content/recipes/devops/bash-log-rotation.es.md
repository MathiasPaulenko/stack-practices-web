---
contentType: recipes
slug: bash-log-rotation
title: "Rotación y Compresión de Logs en Bash"
description: "Rota y comprime logs de aplicación automáticamente con scripts bash."
metaDescription: "Rota y comprime logs de aplicación en bash con logrotate y scripts custom. Automatiza limpieza de logs, compresión gzip y políticas de retención."
difficulty: intermediate
topics:
  - devops
tags:
  - bash
  - log-rotation
  - compression
  - logrotate
  - automation
relatedResources:
  - /recipes/bash-backup-rotation
  - /recipes/bash-scripting-automation
  - /guides/cicd-pipeline-guide
  - /guides/performance-optimization-guide
  - /recipes/ansible-playbook
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Rota y comprime logs de aplicación en bash con logrotate y scripts custom. Automatiza limpieza de logs, compresión gzip y políticas de retención."
  keywords:
    - bash rotación logs
    - logrotate linux
    - comprimir logs gzip
    - rotación logs bash
    - limpieza logs automática
---
## Visión General

Los archivos de log crecen sin límite. Sin rotación, un solo archivo de log puede llenar el disco y tirar la aplicación. Esta recipe cubre dos enfoques: usar `logrotate` (el estándar de Linux) y escribir un script bash custom para entornos donde `logrotate` no está disponible.

## Cuándo Usar

- Tienes un servidor web o aplicación que escribe a archivos de log continuamente
- Necesitas mantener logs comprimidos para ahorrar espacio en disco
- Quieres limpieza automática de logs viejos
- Estás configurando gestión de logs en un servidor nuevo

## Solución

### Usar logrotate

```bash
# /etc/logrotate.d/myapp

/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 myapp myapp
    postrotate
        systemctl reload myapp
    endscript
}
```

Probar la configuración:

```bash
# Dry run
logrotate -d /etc/logrotate.d/myapp

# Forzar rotación
logrotate -f /etc/logrotate.d/myapp
```

### Script custom de rotación de logs

```bash
#!/bin/bash

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
MAX_SIZE=$((10 * 1024 * 1024))  # 10 MB
KEEP=14

# Verificar si necesita rotación
if [ ! -f "$LOG_FILE" ]; then
    exit 0
fi

CURRENT_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)

if [ "$CURRENT_SIZE" -lt "$MAX_SIZE" ]; then
    exit 0
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROTATED="${LOG_DIR}/app_${TIMESTAMP}.log"

mv "$LOG_FILE" "$ROTATED"
gzip "$ROTATED"

# Limpiar logs rotados viejos
find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +${KEEP} -delete

echo "Rotated: ${ROTATED}.gz"
```

### Rotación por tiempo con cron

```bash
#!/bin/bash

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
TIMESTAMP=$(date +%Y%m%d)

mv "$LOG_FILE" "${LOG_DIR}/app_${TIMESTAMP}.log"
gzip "${LOG_DIR}/app_${TIMESTAMP}.log"
touch "$LOG_FILE"

# Mantener 30 días
find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +30 -delete
```

Entrada de cron:

```bash
# Rotar diario a medianoche
0 0 * * * /opt/scripts/log-rotate.sh >> /var/log/rotate.log 2>&1
```

### Rotación basada en señales (para procesos en ejecución)

```bash
#!/bin/bash

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
PID_FILE="/var/run/myapp.pid"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Mover log actual
mv "$LOG_FILE" "${LOG_DIR}/app_${TIMESTAMP}.log"

# Enviar señal HUP para reabrir archivo de log
if [ -f "$PID_FILE" ]; then
    kill -HUP $(cat "$PID_FILE")
fi

# Comprimir log viejo después de un delay
sleep 60
gzip "${LOG_DIR}/app_${TIMESTAMP}.log"

# Limpieza
find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +14 -delete
```

### Rotación de logs con manejo de errores

```bash
#!/bin/bash

set -euo pipefail

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
KEEP=14

mkdir -p "$LOG_DIR"

if [ ! -f "$LOG_FILE" ]; then
    echo "No log file to rotate"
    exit 0
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROTATED="${LOG_DIR}/app_${TIMESTAMP}.log"

mv "$LOG_FILE" "$ROTATED" || { echo "Failed to move log"; exit 1; }
gzip "$ROTATED" || { echo "Failed to compress log"; exit 1; }

find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +${KEEP} -delete

echo "Rotation complete: ${ROTATED}.gz"
```

## Explicación

`logrotate` es la herramienta estándar de Linux para gestión de logs. Corre diario vía cron (`/etc/cron.daily/logrotate`) y procesa todas las configs en `/etc/logrotate.d/`. Directivas clave:

- **`daily`/`weekly`/`monthly`**: Frecuencia de rotación.
- **`rotate N`**: Mantener N archivos rotados antes de borrar.
- **`compress`/`delaycompress`**: Comprimir logs rotados. `delaycompress` espera un ciclo de rotación antes de comprimir (útil para procesos que aún escriben al archivo viejo).
- **`missingok`**: No dar error si el archivo de log no existe.
- **`postrotate`/`endscript`**: Ejecutar comandos después de rotar (e.g., reload de la app para reabrir logs).

El script custom usa `stat` para verificar el tamaño del archivo y `mv` + `gzip` para rotar. Funciona en contenedores o sistemas mínimos sin `logrotate` instalado.

## Variantes

| Enfoque | Herramienta | Compresión | Usar Cuando |
|---------|------------|------------|-------------|
| logrotate | logrotate | gzip | Servidores Linux estándar |
| Custom por tamaño | bash + stat | gzip | Contenedores, sistemas mínimos |
| Por tiempo con cron | bash + cron | gzip | Setups simples, schedules predecibles |
| Basado en señales | bash + kill | gzip | Procesos long-running con soporte HUP |
| logrotate con copytruncate | logrotate | gzip | Procesos que no soportan señales |

## Pautas

- Usa `logrotate` cuando esté disponible. Maneja edge cases, permisos y envío de señales.
- Usa `delaycompress` con `postrotate` si tu proceso sigue escribiendo al file handle viejo.
- Setea `missingok` para evitar errores cuando el log no existe aún.
- Testea con `logrotate -d` (dry run) antes de aplicar a producción.
- Monitorea el espacio en disco después de rotar. Un pico significa que la rotación no está corriendo.

## Errores Comunes

- No enviar señal después de rotar. El proceso sigue escribiendo al file handle borrado y los logs desaparecen.
- Olvidar `delaycompress`. El proceso puede tener el archivo viejo abierto cuando gzip intenta comprimirlo.
- No setear `missingok`. El script da error en la primera ejecución cuando no existe el log.
- Usar `copytruncate` sin entender que copia todo el archivo primero, duplicando el uso de disco brevemente.
- Rotar muy frecuentemente para logs pequeños. Diario es suficiente para la mayoría de las aplicaciones.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre postrotate y prerotate?

`prerotate` corre antes de que el log se rote. `postrotate` corre después. Usa `prerotate` para detener un servicio y `postrotate` para reiniciarlo. Ambos usan `endscript` para cerrar el bloque.

### ¿Cómo roto logs en un contenedor Docker?

Monta el directorio de logs como volumen y ejecuta `logrotate` en el host:

```bash
docker run -v /var/log/myapp:/logs myapp
# En el host: config de logrotate apunta a /var/log/myapp/*.log
```

O usa un script custom dentro del contenedor con cron instalado.

### ¿Cómo manejo múltiples logs con políticas diferentes?

Crea configs separadas de logrotate en `/etc/logrotate.d/`:

```bash
# /etc/logrotate.d/myapp-access
/var/log/myapp/access.log {
    daily
    rotate 7
    compress
}

# /etc/logrotate.d/myapp-error
/var/log/myapp/error.log {
    weekly
    rotate 52
    compress
}
```

### ¿Qué hace copytruncate?

`copytruncate` copia el log actual a un archivo rotado, luego trunca el original a cero. Es útil para procesos que no soportan señales para reabrir logs. La contrapartida es una ventana breve donde se pueden perder entradas de log durante la copia.
