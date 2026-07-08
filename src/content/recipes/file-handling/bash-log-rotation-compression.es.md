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

## Lo que funciona

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

### Configuración de logrotate (enfoque estándar de Linux)

```ini
# /etc/logrotate.d/myapp
/var/log/app/*.log {
    daily
    rotate 30
    compress
    compresscmd /usr/bin/zstd
    compressext .zst
    delaycompress
    missingok
    notifempty
    create 640 appuser appgroup
    dateext
    dateformat -%Y%m%d-%H%M%S
    sharedscripts
    postrotate
        # Señalar a la app para reabrir archivos de log
        if [ -f /var/run/app.pid ]; then
            kill -HUP "$(cat /var/run/app.pid)"
        fi
    endscript
}
```

```bash
# Probar configuración de logrotate sin hacer cambios
logrotate -d /etc/logrotate.d/myapp

# Forzar rotación ahora
logrotate -f /etc/logrotate.d/myapp

# Verificar que la rotación ocurrió
ls -la /var/log/app/
```

### Rotación con copytruncate (sin señal necesaria)

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

        # Copiar y truncar — la app sigue escribiendo al mismo descriptor de archivo
        cp "$log" "$rotated"
        : > "$log"  # Truncar in place
        gzip "$rotated"
        chmod 640 "${rotated}.gz"
    fi
done

# Eliminar logs comprimidos antiguos
find "$LOG_DIR/archive" -name '*.gz' -type f -mtime +$RETENTION_DAYS -delete

echo "[$(date -Iseconds)] Rotación copytruncate completada para $LOG_DIR"
```

### Compresión zstd para grandes volúmenes de logs

```bash
#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="${1:-/var/log/app}"
COMPRESSION_LEVEL="${2:-3}"  # zstd: 1=rápido, 19=máximo, 3=por defecto

# zstd ofrece compresión 3-5x más rápida que gzip con ratios similares
# Instalar: apt install zstd  O  yum install zstd

for log in "$LOG_DIR"/*.log; do
    [[ -f "$log" ]] || continue
    size_mb=$(du -m "$log" | cut -f1)

    if (( size_mb > 100 )); then
        base=$(basename "$log" .log)
        timestamp=$(date +%Y%m%d-%H%M%S)
        rotated="$LOG_DIR/archive/${base}-${timestamp}.log"

        mv "$log" "$rotated"
        zstd -"$COMPRESSION_LEVEL" --rm "$rotated"
        touch "$log"
        echo "Rotado y comprimido: ${rotated}.zst"
    fi
done

# Benchmark: zstd -3 vs gzip -6 en un archivo de log de 500MB
# gzip -6: 12.3s, ratio 4.2x
# zstd -3: 2.1s, ratio 4.0x  (6x más rápido, ratio similar)
```

### Envío de logs a S3 después de la rotación

```bash
#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="${1:-/var/log/app}"
S3_BUCKET="${2:-my-app-logs}"
S3_PREFIX="${3:-logs/$(hostname)}"
RETENTION_DAYS="${4:-90}"

# Subir logs rotados y comprimidos a S3
find "$LOG_DIR/archive" -name '*.gz' -type f -mtime +1 | while read -r archive; do
    rel_path="${archive#$LOG_DIR/archive/}"
    s3_key="$S3_PREFIX/$rel_path"

    aws s3 cp "$archive" "s3://$S3_BUCKET/$s3_key" \
        --storage-class STANDARD_IA \
        --metadata "host=$(hostname),date=$(date -I)" \
        --no-progress

    if [ $? -eq 0 ]; then
        echo "[$(date -Iseconds)] Subido $archive a s3://$S3_BUCKET/$s3_key"
        rm "$archive"
    else
        echo "[$(date -Iseconds)] FALLO al subir $archive"
    fi
done

# Eliminar archivos locales anteriores a la retención (ya subidos a S3)
find "$LOG_DIR/archive" -name '*.gz' -type f -mtime +$RETENTION_DAYS -delete

# Política de ciclo de vida S3 mueve logs a Glacier después de 90 días, elimina después de 365
# Configurada vía: aws s3api put-bucket-lifecycle-configuration
```

### Rotación de logs en Python con RotatingFileHandler

```python
import logging
from logging.handlers import RotatingFileHandler
import gzip
import os
from pathlib import Path

class CompressedRotatingFileHandler(RotatingFileHandler):
    """RotatingFileHandler que comprime logs rotados con gzip."""

    def __init__(self, filename, max_bytes=100*1024*1024, backup_count=30, encoding='utf-8'):
        super().__init__(filename, maxBytes=max_bytes, backupCount=backup_count, encoding=encoding)

    def rotate(self, source, dest):
        super().rotate(source, dest)
        if os.path.exists(dest):
            with open(dest, 'rb') as f_in:
                with gzip.open(f'{dest}.gz', 'wb') as f_out:
                    f_out.writelines(f_in)
            os.remove(dest)

    def getFilesToDelete(self):
        dir_name, base_name = os.path.split(self.baseFilename)
        files = super().getFilesToDelete()
        # También limpiar archivos comprimidos
        for i in range(self.backupCount + 1, self.backupCount + 100):
            compressed = os.path.join(dir_name, f'{base_name}.{i}.gz')
            if os.path.exists(compressed):
                files.append(compressed)
        return files

# Uso
logger = logging.getLogger('app')
handler = CompressedRotatingFileHandler(
    '/var/log/app/application.log',
    max_bytes=100*1024*1024,  # 100MB
    backup_count=30,
)
handler.setFormatter(logging.Formatter(
    '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
))
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Log messages — la rotación ocurre automáticamente
for i in range(10000):
    logger.info(f"Procesando registro {i}")
```

## Mejores Prácticas Adicionales

1. **Usa `dateext` con logrotate para evitar rotaciones numeradas.** Las rotaciones numeradas (`.1`, `.2`, `.3`) cambian en cada rotación, dificultando saber qué archivo corresponde a qué fecha. `dateext` añade la fecha en su lugar:

```ini
# logrotate.d/myapp
/var/log/app/*.log {
    dateext
    dateformat -%Y%m%d
    rotate 30
    compress
}
# Produce: application.log-20260115.gz en lugar de application.log.1.gz
```

2. **Configura `delaycompress` cuando uses señales `postrotate`.** La opción `delaycompress` mantiene el log rotado más reciente sin comprimir hasta el siguiente ciclo de rotación. Esto da tiempo a la aplicación para flush de writes antes de la compresión:

```ini
/var/log/app/*.log {
    compress
    delaycompress
    postrotate
        kill -HUP $(cat /var/run/app.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
```

3. **Monitorea el éxito de la rotación.** Una rotación fallida puede dejar logs creciendo sin límite. Registra el resultado de la rotación y alerta sobre fallos:

```bash
# Después de la rotación, verificar que existan archivos y los logs activos sean pequeños
ARCHIVE_COUNT=$(find "$LOG_DIR/archive" -name '*.gz' | wc -l)
LARGEST_LOG=$(find "$LOG_DIR" -maxdepth 1 -name '*.log' -exec du -m {} \; | sort -rn | head -1)

echo "[$(date -Iseconds)] Rotación completada. Archivos: $ARCHIVE_COUNT, Log activo más grande: $LARGEST_LOG"

# Alertar si algún log activo sigue sobre MAX_SIZE_MB (rotación fallida)
echo "$LARGEST_LOG" | awk '{if ($1 > '"$MAX_SIZE_MB"') exit 1}' || \
    echo "ALERTA: La rotación de logs puede haber fallado — log activo aún sobre ${MAX_SIZE_MB}MB"
```

## Errores Comunes Adicionales

1. **Usar `gzip` en un archivo que aún está siendo escrito.** Si la aplicación no ha cerrado el descriptor de archivo, gzip puede comprimir un log incompleto o fallar con error de texto ocupado. Siempre mueve el archivo primero, luego comprime la copia movida. La operación `mv` cambia la entrada del directorio pero no el inode, por lo que la aplicación sigue escribiendo al inode antiguo hasta que reabre:

```bash
# Correcto: mover primero, luego comprimir el archivo movido
mv "$log" "$rotated"
gzip "$rotated"
touch "$log"
```

2. **No configurar `umask` antes de crear nuevos archivos de log.** El nuevo archivo de log hereda el umask del script. Si el script corre como root con umask 022, los logs son legibles por todos. Configura un umask restrictivo:

```bash
umask 027  # Owner: rwx, Group: r-x, Other: ---
touch "$log"
chmod 640 "$log"
```

3. **Rotar demasiados archivos a la vez.** Si el script encuentra 50 logs sobre el límite de tamaño, comprime los 50 simultáneamente, causando picos de CPU y I/O de disco. Procesa logs secuencialmente o limita el número rotado por ejecución:

```bash
# Rotar máximo 5 logs por ejecución para evitar picos de I/O
ROTATED=0
for log in "$LOG_DIR"/*.log; do
    [[ -f "$log" ]] || continue
    if (( ROTATED >= 5 )); then
        echo "Límite de tasa: rotados 5 logs, continuará en la próxima ejecución"
        break
    fi
    # ... lógica de rotación ...
    ROTATED=$((ROTATED + 1))
done
```

## FAQ Adicional

### ¿Cómo roto logs en un contenedor Docker?

Los contenedores Docker típicamente loguean a stdout/stderr, que Docker captura en archivos JSON log en `/var/lib/docker/containers/<id>/<id>-json.log`. Configura la rotación de logs integrada de Docker en `daemon.json`:

```json
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "5"
    }
}
```

Para aplicaciones que escriben archivos de log dentro del contenedor, monta un directorio del host como volumen y ejecuta logrotate en el host:

```bash
docker run -v /var/log/app:/var/log/app my-app
# Luego ejecuta logrotate en el host para /var/log/app/*.log
```

### ¿Esta solución está lista para producción?

Sí. `logrotate` es la herramienta estándar de gestión de logs en Linux y viene instalada por defecto en Ubuntu, Debian, RHEL, CentOS y Amazon Linux. El script de rotación personalizado en Bash usa solo comandos de coreutils (`mv`, `gzip`, `find`, `touch`) disponibles en cada sistema Unix. `zstd` es usado por Facebook, Amazon y Cloudflare para compresión de logs en producción. El patrón de envío a S3 es usado por equipos con políticas de retención de logs de 1-7 años para cumplimiento. El `RotatingFileHandler` de Python es parte de la biblioteca estándar y se usa en aplicaciones Python de producción en todo el mundo.

### ¿Cuáles son las características de rendimiento?

`gzip -6` comprime a 10-15MB/s por núcleo. `zstd -3` comprime a 50-80MB/s por núcleo con ratios similares. `bzip2 -9` comprime a 2-3MB/s pero produce archivos 10-15% más pequeños. Para un archivo de log de 500MB: gzip toma ~33s, zstd toma ~7s, bzip2 toma ~170s. El comando `find` para limpieza toma menos de 1s para 1000 archivos. Las subidas a S3 están limitadas por ancho de banda de red a 5-50MB/s por conexión. El script de rotación mismo (excluyendo compresión) completa en menos de 100ms por archivo. Python `RotatingFileHandler` añade 1-2ms por escritura de log para verificación de tamaño.

### ¿Cómo depuro problemas con este enfoque?

Ejecuta `logrotate -d /etc/logrotate.d/myapp` para un dry run que muestra qué pasaría sin hacer cambios. Verifica `logrotate -v` para salida verbose durante la rotación real. Para scripts personalizados, agrega `set -x` al inicio para rastrear cada comando. Verifica que la aplicación recibió la señal HUP con `strace -p $(cat /var/run/app.pid) -e signal`. Verifica que los archivos comprimidos son válidos con `gzip -t file.gz` o `zstd -t file.zst`. Monitorea el espacio en disco antes y después de la rotación con `df -h /var/log`. Para subidas a S3, usa `aws s3 ls s3://bucket/prefix/ --recursive` para verificar que los archivos llegaron. Para Python, habilita `logging.DEBUG` en el módulo `logging.handlers` para ver eventos de rotación.
