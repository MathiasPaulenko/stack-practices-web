---
contentType: recipes
slug: bash-disk-usage-monitor
title: "Monitorear Uso de Disco con Bash"
description: "Alerta cuando el espacio en disco cruza umbrales con scripts bash."
metaDescription: "Monitorea el uso de disco en bash. Configura alertas por umbral, envía notificaciones por email y automatiza limpieza cuando el espacio se agota en servidores Linux."
difficulty: intermediate
topics:
  - devops
tags:
  - bash
  - disk-usage
  - monitoring
  - alerts
  - automation
relatedResources:
  - /recipes/bash-backup-rotation
  - /recipes/bash-log-rotation
  - /recipes/bash-scripting-automation
  - /recipes/bash-monitoring-disk-usage
  - /docs/logging-standards-document
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Monitorea el uso de disco en bash. Configura alertas por umbral, envía notificaciones por email y automatiza limpieza cuando el espacio se agota en servidores Linux."
  keywords:
    - bash monitorear disco
    - alerta espacio disco
    - uso disco linux
    - limpieza automática disco
    - df bash script
---
## Visión General

Los problemas de espacio en disco causan crashes de aplicación, writes fallidos y bases de datos corruptas. Un script de monitoreo que verifica el uso de disco y alerta antes de que se llene previene estos problemas. Esta recipe cubre alertas basadas en umbrales, notificaciones por email y limpieza automática de consumidores comunes de espacio.

## Cuándo Usar

- Administras servidores Linux y necesitas alertas proactivas de espacio en disco
- Quieres automatizar la limpieza de logs viejos, archivos temp o caches de paquetes
- Necesitas umbrales de alerta diferentes para distintas particiones
- Estás configurando una solución de monitoreo ligera sin herramientas externas

## Solución

### Verificación básica de uso de disco

```bash
#!/bin/bash

THRESHOLD=80
ALERT_EMAIL="admin@example.com"

df -H | grep -vE '^Filesystem|tmpfs|cdrom' | while read -r line; do
    usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    partition=$(echo "$line" | awk '{print $6}')

    if [ "$usage" -ge "$THRESHOLD" ]; then
        echo "WARNING: Partition $partition is at ${usage}% capacity"
    fi
done
```

### Alerta por email con detalles

```bash
#!/bin/bash

THRESHOLD=80
ALERT_EMAIL="admin@example.com"
HOSTNAME=$(hostname)

df -H | grep -vE '^Filesystem|tmpfs|cdrom' | while read -r line; do
    usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    partition=$(echo "$line" | awk '{print $6}')
    size=$(echo "$line" | awk '{print $2}')
    used=$(echo "$line" | awk '{print $3}')
    avail=$(echo "$line" | awk '{print $4}')

    if [ "$usage" -ge "$THRESHOLD" ]; then
        SUBJECT="[ALERT] Disk space on ${HOSTNAME}: ${partition} at ${usage}%"
        BODY="Disk space alert on ${HOSTNAME}

Partition: ${partition}
Usage: ${usage}%
Size: ${size}
Used: ${used}
Available: ${avail}

Action required: free up space on this partition."

        echo "$BODY" | mail -s "$SUBJECT" "$ALERT_EMAIL"
        echo "Alert sent for $partition"
    fi
done
```

### Umbrales por partición

```bash
#!/bin/bash

# Formato: "mountpoint:threshold"
PARTITIONS=(
    "/:80"
    "/var:90"
    "/home:75"
    "/tmp:85"
)

ALERT_EMAIL="admin@example.com"

for entry in "${PARTITIONS[@]}"; do
    partition="${entry%%:*}"
    threshold="${entry##*:}"

    usage=$(df -H "$partition" | tail -1 | awk '{print $5}' | sed 's/%//')

    if [ "$usage" -ge "$threshold" ]; then
        echo "ALERT: $partition at ${usage}% (threshold: ${threshold}%)"
        echo "Partition $partition at ${usage}%" | \
            mail -s "Disk alert: $partition" "$ALERT_EMAIL"
    fi
done
```

### Limpieza automática con uso alto

```bash
#!/bin/bash

THRESHOLD=85
LOG_DIR="/var/log"
TMP_DIR="/tmp"
CACHE_DIR="/var/cache/apt/archives"

# Obtener uso de partición root
usage=$(df -H / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$usage" -lt "$THRESHOLD" ]; then
    exit 0
fi

echo "Disk usage at ${usage}%. Starting cleanup..."

# Limpiar logs comprimidos viejos (mantener 7 días)
find "$LOG_DIR" -name "*.gz" -type f -mtime +7 -delete
echo "Cleaned old compressed logs"

# Limpiar archivos tmp viejos de 7 días
find "$TMP_DIR" -type f -mtime +7 -delete
echo "Cleaned /tmp"

# Limpiar apt cache
if [ -d "$CACHE_DIR" ]; then
    apt-get clean
    echo "Cleaned apt cache"
fi

# Verificar uso después de limpieza
new_usage=$(df -H / | tail -1 | awk '{print $5}' | sed 's/%//')
echo "Disk usage after cleanup: ${new_usage}%"
```

### Encontrar archivos y directorios más grandes

```bash
#!/bin/bash

echo "=== Top 10 largest directories ==="
du -sh /* 2>/dev/null | sort -rh | head -10

echo ""
echo "=== Top 10 largest files ==="
find / -type f -exec du -h {} + 2>/dev/null | sort -rh | head -10

echo ""
echo "=== Disk usage by partition ==="
df -h
```

### Configuración cron para monitoreo continuo

```bash
# Agregar a crontab

# Verificar cada hora
0 * * * * /opt/scripts/disk-monitor.sh >> /var/log/disk-monitor.log 2>&1

# Limpieza diaria a las 3 AM
0 3 * * * /opt/scripts/disk-cleanup.sh
```

### Alerta por webhook de Slack

```bash
#!/bin/bash

THRESHOLD=80
SLACK_WEBHOOK="https://hooks.slack.com/services/XXX/YYY/ZZZ"
HOSTNAME=$(hostname)

df -H | grep -vE '^Filesystem|tmpfs|cdrom' | while read -r line; do
    usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    partition=$(echo "$line" | awk '{print $6}')

    if [ "$usage" -ge "$THRESHOLD" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Disk alert on ${HOSTNAME}: ${partition} at ${usage}%\"}" \
            "$SLACK_WEBHOOK"
    fi
done
```

## Explicación

`df -H` reporta el uso de disco en formato legible (potencias de 1000). El script filtra filesystems virtuales (`tmpfs`, `cdrom`) y verifica cada partición restante contra el umbral.

El script de limpieza ataca consumidores comunes de espacio: logs comprimidos viejos, archivos temp stale y caches de paquetes. Solo corre cuando el uso supera el umbral, evitando trabajo innecesario.

Los umbrales por partición te permiten ser más flexible con `/var` (los logs se espera que crezcan) y más estricto con `/` (que la partición root se llene es crítico).

## Variantes

| Enfoque | Método de Alerta | Limpieza | Usar Cuando |
|---------|-----------------|----------|-------------|
| Verificación básica | Consola | No | Chequeos manuales rápidos |
| Alerta por email | comando mail | No | Servidores con mail configurado |
| Por partición | Email | No | Tamaños mixtos de particiones |
| Limpieza auto | Consola | Sí | Servidores self-healing |
| Webhook Slack | HTTP POST | No | Equipos que usan Slack |

## Pautas

- Setea umbrales realistas. 80% warning, 90% crítico es un patrón común.
- Excluye filesystems virtuales (`tmpfs`, `devtmpfs`, `cdrom`) del monitoreo.
- Testea scripts de limpieza en un entorno no productivo primero.
- Loguea todas las acciones de limpieza para auditoría.
- Monitorea el uso de inodos por separado. Un disco puede tener espacio libre pero sin inodos.

## Errores Comunes

- Setear el umbral muy bajo (50%) y recibir alertas falsas constantes.
- No excluir `tmpfs` y filesystems virtuales. Estos reportan 100% de uso pero no son discos reales.
- Ejecutar limpieza sin verificar qué se va a borrar. `find -delete` es irreversible.
- Olvidar configurar cron. El script corre una vez y nunca se vuelve a verificar.
- Monitorear solo la partición root. `/var` o `/home` pueden llenarse independientemente.

## Preguntas Frecuentes

### ¿Cómo monitoreo el uso de inodos en vez de espacio en disco?

```bash
df -i | grep -vE '^Filesystem|tmpfs' | while read -r line; do
    iuse=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    partition=$(echo "$line" | awk '{print $6}')
    if [ "$iuse" -ge 80 ]; then
        echo "Inode alert: $partition at ${iuse}%"
    fi
done
```

### ¿Cómo encuentro qué está consumiendo espacio en disco?

Usa `du` para encontrar directorios grandes y `find` para localizar archivos grandes:

```bash
# Directorios más grandes
du -sh /var/* 2>/dev/null | sort -rh | head -10

# Archivos más grandes
find /var -type f -size +100M -exec ls -lh {} +
```

### ¿Puedo usar esto con contenedores Docker?

Sí. Monitorea el directorio de datos de Docker (`/var/lib/docker`) y ejecuta `docker system prune` en el script de limpieza:

```bash
if [ "$usage" -ge "$THRESHOLD" ]; then
    docker system prune -af --volumes
fi
```

### ¿Cómo evito la fatiga de alertas?

Usa un archivo de estado para trackear qué particiones ya fueron alertadas:

```bash
STATE_FILE="/tmp/disk-alert-state"

# Solo alertar si no está ya en estado
if [ "$usage" -ge "$THRESHOLD" ] && ! grep -q "$partition" "$STATE_FILE" 2>/dev/null; then
    # Enviar alerta
    echo "$partition" >> "$STATE_FILE"
fi

# Limpiar estado cuando el uso baja
if [ "$usage" -lt "$THRESHOLD" ]; then
    sed -i "/$partition/d" "$STATE_FILE"
fi
```
