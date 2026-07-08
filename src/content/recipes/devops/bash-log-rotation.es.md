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

### Rotación por Tamaño con logrotate

```bash
# /etc/logrotate.d/myapp-size
/var/log/myapp/*.log {
    size 50M
    rotate 10
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

### copytruncate para Procesos Sin Soporte de Señales

```bash
# /etc/logrotate.d/myapp-truncate
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    copytruncate
    missingok
    notifempty
}
```

### Compresión Paralela para Logs Grandes

```bash
#!/bin/bash
# rotate-parallel.sh

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
KEEP=14
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ ! -f "$LOG_FILE" ]; then
    exit 0
fi

CURRENT_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
MAX_SIZE=$((50 * 1024 * 1024))  # 50 MB

if [ "$CURRENT_SIZE" -lt "$MAX_SIZE" ]; then
    exit 0
fi

ROTATED="${LOG_DIR}/app_${TIMESTAMP}.log"
mv "$LOG_FILE" "$ROTATED"

# Usar pigz para compresión paralela (2x más rápido en multi-core)
if command -v pigz &> /dev/null; then
    pigz "$ROTATED"
else
    gzip "$ROTATED"
fi

find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +${KEEP} -delete

echo "Rotado y comprimido: ${ROTATED}.gz"
```

### Rotación de Logs con Monitoreo de Espacio en Disco

```bash
#!/bin/bash
# rotate-with-check.sh

set -euo pipefail

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
KEEP=14
MIN_DISK_PERCENT=10  # Porcentaje mínimo de espacio libre en disco

# Verificar espacio en disco antes de rotar
FREE_PERCENT=$(df "$LOG_DIR" | awk 'NR==2 {print int($5)}')
USED_PERCENT=100 - $FREE_PERCENT

if [ "$USED_PERCENT" -gt 90 ]; then
    echo "CRITICAL: Uso de disco al ${USED_PERCENT}%. Rotando agresivamente."
    KEEP=3  # Reducir retención con poco disco
fi

if [ ! -f "$LOG_FILE" ]; then
    exit 0
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROTATED="${LOG_DIR}/app_${TIMESTAMP}.log"

mv "$LOG_FILE" "$ROTATED" || { echo "Failed to move log"; exit 1; }
gzip "$ROTATED" || { echo "Failed to compress log"; exit 1; }

find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +${KEEP} -delete

# Alertar si el disco sigue crítico
FREE_PERCENT=$(df "$LOG_DIR" | awk 'NR==2 {print int($5)}')
if [ "$FREE_PERCENT" -gt 90 ]; then
    echo "WARNING: Disco todavía al ${FREE_PERCENT}% después de rotar"
fi

echo "Rotación completa: ${ROTATED}.gz"
```

### Logrotate con Notificaciones por Email

```bash
# /etc/logrotate.d/myapp-notify
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
        echo "Log rotado en $(hostname) el $(date)" | \
            mail -s "Rotación de log: myapp" ops@example.com
    endscript
}
```

## Mejores Prácticas Adicionales

1. **Usa `dateext` para nombres de archivo legibles.** Por defecto usa sufijos `.1`, `.2`:

```bash
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    dateext
    dateformat -%Y%m%d
    missingok
    notifempty
}
```

Esto produce `app.log-20260701.gz` en lugar de `app.log.1.gz`.

2. **Setea la directiva `su` para problemas de permisos.** Cuando los logs son owned por otro usuario:

```bash
/var/log/myapp/*.log {
    su myapp myapp
    daily
    rotate 14
    compress
    create 0644 myapp myapp
}
```

3. **Usa `olddir` para separar logs rotados.** Mantén logs activos y rotados en directorios diferentes:

```bash
/var/log/myapp/*.log {
    daily
    rotate 30
    compress
    olddir /var/log/myapp/archive
    create 0644 myapp myapp
}
```

## Errores Comunes Adicionales

1. **No testear la config de logrotate antes de desplegar.** Errores de sintaxis rompen la rotación silenciosamente:

```bash
# Siempre testear primero
logrotate -d /etc/logrotate.d/myapp
# -d = debug/dry run, no hace cambios
```

2. **Usar `size` sin `rotate`.** Los logs rotan pero los viejos nunca se borran:

```bash
# Mal: sin directiva rotate
/var/log/myapp/*.log {
    size 50M
    compress
}

# Bien: especificar retención
/var/log/myapp/*.log {
    size 50M
    rotate 10
    compress
}
```

3. **No manejar el state file de logrotate.** Si el state file se corrompe, la rotación se detiene:

```bash
# Verificar estado
cat /var/lib/logrotate/status

# Resetear estado si está corrupto
rm /var/lib/logrotate/status
logrotate -f /etc/logrotate.d/myapp
```

## FAQ Adicional

### Como roto logs por hora en lugar de diario?

Usa `hourly` con un cron job corriendo cada hora:

```bash
# /etc/logrotate.d/myapp-hourly
/var/log/myapp/*.log {
    hourly
    rotate 24
    compress
    missingok
    notifempty
}
```

```bash
# /etc/cron.d/logrotate-hourly
0 * * * * root /usr/sbin/logrotate /etc/logrotate.d/myapp-hourly
```

### Como comprimo logs rotados con zstd en lugar de gzip?

```bash
# /etc/logrotate.d/myapp-zstd
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    compresscmd /usr/bin/zstd
    compressoptions -19
    compressext .zst
    missingok
    notifempty
}
```

zstd ofrece descompresión 2-3x más rápida que gzip con ratios de compresión similares.

### Como monitoreo que la rotación de logs esté funcionando?

Añade un check a tu script de monitoreo:

```bash
#!/bin/bash
# check-rotation.sh
LOG_DIR="/var/log/myapp"
LATEST_ROTATED=$(find "$LOG_DIR" -name "app_*.log.gz" -type f -printf '%T@ %p\n' | sort -rn | head -1)

if [ -z "$LATEST_ROTATED" ]; then
    echo "WARNING: No se encontraron logs rotados. La rotación puede no estar corriendo."
    exit 1
fi

ROTATION_DATE=$(echo "$LATEST_ROTATED" | awk '{print $2}' | xargs stat -c%y)
DAYS_SINCE=$(( ($(date +%s) - $(date -d "$ROTATION_DATE" +%s)) / 86400 ))

if [ "$DAYS_SINCE" -gt 2 ]; then
    echo "WARNING: Última rotación fue hace $DAYS_SINCE días"
    exit 1
fi

echo "OK: Última rotación hace $DAYS_SINCE día(s)"
```

## Tips de Rendimiento

1. **Usa `pigz` en lugar de `gzip` para logs grandes.** Compresión paralela en sistemas multi-core:

```bash
# Instalar pigz
apt install pigz  # Debian/Ubuntu
yum install pigz  # RHEL/CentOS

# Usar en scripts custom
pigz -4 "$ROTATED"  # Nivel 4, buen balance velocidad/ratio
```

2. **Usa niveles de compresión más bajos para velocidad.** Nivel 1 es 5x más rápido que nivel 9:

```bash
# Rotación rápida con compresión mínima
gzip -1 "$ROTATED"

# O con logrotate
compressoptions -1
```

3. **Corre la rotación durante períodos de bajo tráfico.** Agenda cron para horas valle:

```bash
# Rotar a las 4 AM en lugar de medianoche
0 4 * * * /usr/sbin/logrotate /etc/logrotate.d/myapp
```
