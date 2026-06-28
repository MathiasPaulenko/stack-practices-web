---
contentType: recipes
slug: bash-log-rotation-compression
title: "Rotación y Compresión de Logs"
description: "Rota y comprime logs de aplicaciones con Bash para evitar que el disco se llene y simplificar la retención."
metaDescription: "Rota y comprime logs de aplicaciones con Bash. Evita el agotamiento del disco archivando logs antiguos con gzip, timestamps y una política de retención clara."
difficulty: intermediate
topics:
  - file-handling
tags:
  - bash
  - logs
  - rotation
  - compression
  - gzip
relatedResources:
  - /recipes/compress-decompress-files
  - /recipes/bash-scripting-automation
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-loop-over-files
  - /recipes/bash-parallel-execution
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Rota y comprime logs de aplicaciones con Bash. Evita el agotamiento del disco archivando logs antiguos con gzip, timestamps y una política de retención clara."
  keywords:
    - bash
    - logs
    - rotación
    - compresión
    - gzip
---
## Visión General

Los logs de aplicaciones crecen continuamente. Sin rotación, un solo servicio verboso puede llenar el disco, colapsar el host y hacer imposible el análisis de logs. Un script de rotación de logs en Bash renombra logs activos, comprime los antiguos y elimina archivos más allá de una edad de retención. Esto mantiene los logs accesibles, buscables y delimitados en tamaño sin depender de un agente de gestión de logs pesado.

## Cuándo Usar

Usa este recurso cuando:
- Necesites rotar logs en un servidor sin logrotate instalado.
- Quieras reglas personalizadas de nomenclatura, compresión o retención.
- Rotes logs para un contenedor o entorno embebido.
- Necesites enviar logs comprimidos a almacenamiento frío.

## Solución

### Script de rotación de logs en Bash

```bash
#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="${1:-/var/log/app}"
RETENTION_DAYS="${2:-30}"
MAX_SIZE_MB="${3:-100}"

mkdir -p "$LOG_DIR/archive"

for log in "$LOG_DIR"/*.log; do
    [[ -f "$log" ]] || continue
    size_mb=$(du -m "$log" | cut -f1)

    if (( size_mb > MAX_SIZE_MB )); then
        base=$(basename "$log" .log)
        timestamp=$(date +%Y%m%d-%H%M%S)
        rotated="$LOG_DIR/archive/${base}-${timestamp}.log"

        mv "$log" "$rotated"
        gzip "$rotated"
        touch "$log"
    fi
done

# Eliminar logs comprimidos antiguos
find "$LOG_DIR/archive" -name '*.gz' -type f -mtime +$RETENTION_DAYS -delete

# Opcional: señalar a la app para reabrir logs
# kill -HUP "$APP_PID"

echo "Rotación de logs completada"
```

## Explicación

El script itera sobre archivos `*.log` en el directorio objetivo. Si un log excede `MAX_SIZE_MB`, renombra el archivo con un timestamp, lo comprime con `gzip` y crea un nuevo archivo de log vacío. Los archivos comprimidos antiguos se eliminan después de `RETENTION_DAYS`. El `kill -HUP` opcional indica a los demonios que esperan reapertura por señal que cierren el descriptor de archivo antiguo y comiencen a escribir en el archivo nuevo. Esto es común para servicios de larga ejecución como nginx o aplicaciones personalizadas.

## Variantes

| Variante | Compresión | Caso de uso |
|----------|------------|-------------|
| gzip | Por defecto | Buen equilibrio, ampliamente soportado |
| bzip2 | Más lento, más pequeño | Archivos a largo plazo |
| zstd | Rápido, moderno | Grandes volúmenes de logs |
| xz | Más pequeño, más lento | Archivos de cumplimiento |

## Mejores Prácticas

1. **Rota antes de que el disco se llene.** Monitorea el espacio libre y rota al 70-80% de uso, no al 99%.
2. **Usa copytruncate o señales cuando sea posible.** Mover un archivo de log abierto puede hacer que la app siga escribiendo en el antiguo inode.
3. **Mantén permisos restrictivos en archivos.** Los logs pueden contener datos sensibles; usa `chmod 640` en archivos.
4. **Prueba la rotación en una copia primero.** Un script malo puede borrar logs activos; valida contra un directorio no productivo.
5. **Centraliza logs después de la rotación.** Envía logs comprimidos a S3, Loki o Elasticsearch para retención y búsqueda.

## Errores Comunes

1. **Borrar logs antes de comprimirlos.** El paso de archivado puede fallar; conserva el original hasta que gzip tenga éxito.
2. **Rotar el mismo archivo dos veces.** Los nombres con timestamp evitan sobrescribir el mismo archivo.
3. **No manejar logs en subdirectorios.** Usa `find` con `-maxdepth` si los logs están anidados.
4. **Ejecutar como root innecesariamente.** Usa la cuenta de servicio que posee los archivos de log.
5. **Olvidar reabrir descriptores de archivo.** La app puede seguir escribiendo en el archivo movido; envía HUP o usa copytruncate.

## Preguntas Frecuentes

**P: ¿Cuándo debería usar logrotate en lugar de un script personalizado?**
R: Usa logrotate para servidores Linux estándar. Usa un script personalizado cuando necesites comportamiento que logrotate no pueda expresar, o cuando logrotate no esté disponible.

**P: ¿Cómo evito perder líneas de log durante la rotación?**
R: Usa copytruncate o envía HUP a la aplicación. Esto asegura que la app cierre el archivo antiguo y comience a escribir en el nuevo.

**P: ¿Puedo rotar logs por fecha en lugar de tamaño?**
R: Sí. Ejecuta el script desde cron diariamente y elimina la verificación de tamaño. El timestamp por fecha sigue archivando el día anterior.
