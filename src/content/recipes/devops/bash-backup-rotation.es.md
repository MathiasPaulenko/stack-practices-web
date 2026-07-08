---
contentType: recipes
slug: bash-backup-rotation
title: "Script de Rotación de Backups en Bash"
description: "Backups automatizados con políticas de retención usando bash y find."
metaDescription: "Crea un script de rotación de backups en bash con políticas de retención. Automatiza backups diarios, semanales y mensuales con find y tar."
difficulty: intermediate
topics:
  - devops
tags:
  - bash
  - backup
  - rotation
  - script
  - automation
  - devops
relatedResources:
  - /recipes/bash-scripting-automation
  - /docs/backup-and-restore-template
  - /guides/cicd-pipeline-guide
  - /recipes/ansible-playbook
  - /recipes/cicd-pipeline-setup
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Crea un script de rotación de backups en bash con políticas de retención. Automatiza backups diarios, semanales y mensuales con find y tar."
  keywords:
    - bash backup rotación
    - script backup linux
    - retención backups bash
    - tar gzip backup
    - find mtime delete
---
## Visión General

La rotación de backups mantiene una cantidad fija de backups y borra los viejos automáticamente. Este script usa `tar` para compresión y `find` para limpieza. Soporta políticas de retención diaria, semanal y mensual para que siempre tengas backups recientes e históricos sin llenar el disco.

## Cuándo Usar

- Necesitas backups automatizados para una web app o base de datos
- Quieres mantener backups diarios por 7 días, semanales por 4 semanas, mensuales por 6 meses
- Estás configurando un cron job para backups periódicos
- Quieres archivos comprimidos con limpieza automática

## Solución

### Backup básico con timestamp

```bash
#!/bin/bash

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

tar -czf "${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz" -C "${SOURCE_DIR}" .
echo "Backup created: backup_${TIMESTAMP}.tar.gz"
```

### Backup con política de retención

```bash
#!/bin/bash

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"

# Crear backup
tar -czf "${BACKUP_FILE}" -C "${SOURCE_DIR}" .

# Retención: mantener últimos 7 backups diarios
find "${BACKUP_DIR}" -name "backup_*.tar.gz" -type f -mtime +7 -delete

echo "Backup created: ${BACKUP_FILE}"
echo "Old backups cleaned (kept last 7 days)"
```

### Retención escalonada (diario, semanal, mensual)

```bash
#!/bin/bash

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1=Lunes, 7=Domingo
DAY_OF_MONTH=$(date +%d)

# Crear backup diario
tar -czf "${BACKUP_DIR}/daily_${TIMESTAMP}.tar.gz" -C "${SOURCE_DIR}" .

# Backup semanal los domingos
if [ "$DAY_OF_WEEK" = "7" ]; then
    cp "${BACKUP_DIR}/daily_${TIMESTAMP}.tar.gz" "${BACKUP_DIR}/weekly_${TIMESTAMP}.tar.gz"
fi

# Backup mensual el día 1
if [ "$DAY_OF_MONTH" = "01" ]; then
    cp "${BACKUP_DIR}/daily_${TIMESTAMP}.tar.gz" "${BACKUP_DIR}/monthly_${TIMESTAMP}.tar.gz"
fi

# Limpieza: 7 diarios, 4 semanales, 6 mensuales
find "${BACKUP_DIR}" -name "daily_*.tar.gz" -type f -mtime +7 -delete
find "${BACKUP_DIR}" -name "weekly_*.tar.gz" -type f -mtime +28 -delete
find "${BACKUP_DIR}" -name "monthly_*.tar.gz" -type f -mtime +180 -delete

echo "Backup completed with tiered retention"
```

### Backup de base de datos con rotación

```bash
#!/bin/bash

DB_NAME="myapp"
DB_USER="postgres"
BACKUP_DIR="/backups/db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}"

# Dump de la base de datos
pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"

# Mantener últimos 14 días
find "${BACKUP_DIR}" -name "db_*.sql.gz" -type f -mtime +14 -delete

echo "Database backup created: db_${TIMESTAMP}.sql.gz"
```

### Configuración con cron

```bash
# Ejecutar diario a las 2 AM
0 2 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1

# Ejecutar cada 6 horas
0 */6 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Backup con verificación de integridad

```bash
#!/bin/bash

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"

# Crear backup
tar -czf "${BACKUP_FILE}" -C "${SOURCE_DIR}" .

# Verificar integridad
if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    echo "OK: ${BACKUP_FILE} verified"
    find "${BACKUP_DIR}" -name "backup_*.tar.gz" -type f -mtime +7 -delete
else
    echo "ERROR: ${BACKUP_FILE} is corrupt"
    rm -f "${BACKUP_FILE}"
    exit 1
fi
```

## Explicación

El comando `find` con `-mtime +N` encuentra archivos más viejos que N días. `-delete` los elimina. Este es el mecanismo de retención más simple: cada vez que el script corre, crea un backup nuevo y limpia archivos más viejos que la ventana de retención.

La retención escalonada usa prefijos en los nombres de archivo (`daily_`, `weekly_`, `monthly_`) para aplicar diferentes períodos de retención. El backup semanal es una copia del backup diario del domingo. El mensual es una copia del día 1. Esto evita crear múltiples archives grandes el mismo día.

`gzip -t` prueba la integridad del archive sin extraerlo. Ejecútalo después de cada backup para detectar errores de disco o escrituras incompletas.

## Variantes

| Enfoque | Herramienta | Compresión | Usar Cuando |
|---------|------------|------------|-------------|
| tar + find | tar, gzip | gzip | Backups de filesystem |
| rsync + find | rsync | Ninguna (sync) | Backups incrementales |
| pg_dump + gzip | pg_dump | gzip | Backups de PostgreSQL |
| mysqldump + gzip | mysqldump | gzip | Backups de MySQL |
| restic | restic | Deduplicación | Backups a gran escala, encriptados |

## Pautas

- Siempre testea la restauración de backups. Un backup que no puedes restaurar no sirve.
- Usa `gzip -t` para verificar la integridad del archive después de crearlo.
- Guarda backups en un disco separado o servidor remoto. Un backup en el mismo disco falla cuando el disco falla.
- Define políticas de retención basadas en objetivos de punto de recuperación (RPO). 7 diarios + 4 semanales + 6 mensuales cubre la mayoría de las necesidades.
- Loguea las operaciones de backup. Redirige el output a un archivo de log vía cron.

## Errores Comunes

- No testear restauraciones. Ejecuta un drill de restauración mensual para verificar que los backups funcionan.
- Guardar backups en el mismo disco que la fuente. El fallo del disco pierde todo.
- Usar `rm` en vez de `find -delete`. `find -delete` es más seguro porque solo matchea el patrón.
- No setear `mkdir -p` para el directorio de backup. El script falla si el directorio no existe.
- Olvidar hacer el script ejecutable: `chmod +x backup.sh`.

## Preguntas Frecuentes

### ¿Cómo encripto backups en bash?

Usa `gpg` después de crear el archive: `gpg --symmetric --cipher-algo AES256 backup.tar.gz`. Esto produce `backup.tar.gz.gpg`. Desencripta con `gpg -d backup.tar.gz.gpg > backup.tar.gz`.

### ¿Cómo sincronizo backups a almacenamiento remoto?

Usa `rsync` o `rclone`:

```bash
rsync -avz /backups/ user@remote:/remote_backups/
```

O para almacenamiento compatible con S3:

```bash
rclone sync /backups remote:backup-bucket/
```

### ¿Cómo monitoreo fallos de backup?

Revisa el exit code en tu cron job y envía una alerta:

```bash
0 2 * * * /opt/scripts/backup.sh || echo "Backup failed" | mail -s "Backup Alert" admin@example.com
```

### ¿Cuál es la diferencia entre -mtime y -mmin?

`-mtime +7` encuentra archivos más viejos que 7 días. `-mmin +60` encuentra archivos más viejos que 60 minutos. Usa `-mmin` para políticas de retención sub-diarias.

### Backup Encriptado con GPG

```bash
#!/bin/bash
# encrypted-backup.sh

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups/encrypted"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz.gpg"
PASSPHRASE_FILE="/etc/backup/.gpg_passphrase"

mkdir -p "${BACKUP_DIR}"

# Crear y encriptar en un pipeline
tar -czf - -C "${SOURCE_DIR}" . | \
    gpg --batch --passphrase-file "${PASSPHRASE_FILE}" \
        --symmetric --cipher-algo AES256 \
        -o "${BACKUP_FILE}"

# Verificar
if gpg --batch --passphrase-file "${PASSPHRASE_FILE}" --verify "${BACKUP_FILE}" 2>/dev/null; then
    echo "OK: ${BACKUP_FILE} encriptado y verificado"
    find "${BACKUP_DIR}" -name "backup_*.tar.gz.gpg" -type f -mtime +30 -delete
else
    echo "ERROR: Encriptación falló para ${BACKUP_FILE}"
    rm -f "${BACKUP_FILE}"
    exit 1
fi
```

### Script de Restauración

```bash
#!/bin/bash
# restore-backup.sh

BACKUP_FILE="$1"
RESTORE_DIR="/tmp/restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

mkdir -p "${RESTORE_DIR}"

# Verificar si está encriptado
if [[ "$BACKUP_FILE" == *.gpg ]]; then
    gpg -d "${BACKUP_FILE}" | tar -xzf - -C "${RESTORE_DIR}"
else
    tar -xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}"
fi

echo "Restaurado a ${RESTORE_DIR}"
ls -la "${RESTORE_DIR}"
```

### Backup con Hooks Pre/Post

```bash
#!/bin/bash
# backup-with-hooks.sh

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"

# Hook pre-backup: flushear base de datos a disco
pre_backup() {
    if command -v mysql &> /dev/null; then
        mysql -u root -e "FLUSH TABLES WITH READ LOCK;"
    fi
    sync
}

# Hook post-backup: desbloquear y limpiar
post_backup() {
    if command -v mysql &> /dev/null; then
        mysql -u root -e "UNLOCK TABLES;"
    fi
    find "${BACKUP_DIR}" -name "backup_*.tar.gz" -type f -mtime +7 -delete
}

# Ejecutar
pre_backup
tar -czf "${BACKUP_FILE}" -C "${SOURCE_DIR}" .
post_backup

# Verificar
if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    echo "OK: ${BACKUP_FILE}"
else
    echo "ERROR: ${BACKUP_FILE} está corrupto"
    rm -f "${BACKUP_FILE}"
    exit 1
fi
```

### Verificación de Espacio en Disco Antes del Backup

```bash
#!/bin/bash
# backup-with-space-check.sh

BACKUP_DIR="/backups"
SOURCE_DIR="/var/www/myapp"
MIN_SPACE_GB=5

available_kb=$(df "${BACKUP_DIR}" | awk 'NR==2 {print $4}')
available_gb=$((available_kb / 1024 / 1024))

if [ "$available_gb" -lt "$MIN_SPACE_GB" ]; then
    echo "ERROR: Solo ${available_gb}GB libres en ${BACKUP_DIR}, necesitas ${MIN_SPACE_GB}GB"
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf "${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz" -C "${SOURCE_DIR}" .
echo "Backup creado con ${available_gb}GB libres"
```

## Mejores Prácticas Adicionales

1. **Usa backups incrementales con rsync.** Solo transfiere archivos cambiados para ahorrar ancho de banda:

```bash
#!/bin/bash
# incremental-backup.sh
rsync -avz --link-dest=/backups/yesterday /var/www/myapp/ /backups/today/
```

2. **Envía notificaciones en éxito y fallo.** Usa webhook para Slack/Discord:

```bash
notify() {
    local status="$1"
    local message="$2"
    curl -s -X POST "https://hooks.slack.com/services/T000/B000/XXX" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"Backup ${status}: ${message}\"}"
}

if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    notify "success" "${BACKUP_FILE}"
else
    notify "failure" "${BACKUP_FILE} está corrupto"
    exit 1
fi
```

3. **Taguea backups con metadata.** Guarda info del backup en un archivo manifest:

```bash
{
    echo "timestamp: ${TIMESTAMP}"
    echo "size: $(du -h ${BACKUP_FILE} | cut -f1)"
    echo "files: $(tar -tzf ${BACKUP_FILE} | wc -l)"
    echo "checksum: $(sha256sum ${BACKUP_FILE} | cut -d' ' -f1)"
} > "${BACKUP_FILE}.manifest"
```

## Errores Comunes Adicionales

1. **No verificar espacio en disco antes del backup.** Un disco lleno corrompe el archive:

```bash
# Siempre verificar espacio disponible
available=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
if [ "$available" -lt 1048576 ]; then
    echo "Espacio en disco insuficiente"
    exit 1
fi
```

2. **Hacer backup de bases de datos en ejecución sin un dump.** Backups a nivel de archivo de bases de datos activas pueden ser inconsistentes:

```bash
# Mal: tar un directorio de datos de PostgreSQL activo
tar -czf pg.tar.gz /var/lib/postgresql/

# Bien: usar pg_dump para snapshot consistente
pg_dump -U postgres myapp | gzip > db.sql.gz
```

3. **No rotar logs junto con los backups.** Los logs de backup crecen sin límite:

```bash
# Rotar logs de backup también
find /var/log -name "backup.log" -type f -mtime +30 -delete
```

## FAQ Adicional

### Como verifico todos los backups en un directorio?

```bash
#!/bin/bash
# verify-all-backups.sh

for backup in /backups/*.tar.gz; do
    if gzip -t "$backup" 2>/dev/null; then
        echo "OK: $backup"
    else
        echo "CORRUPT: $backup"
    fi
done
```

### Debo usar restic en vez de tar?

Para datasets grandes (>10GB) o cuando necesitas deduplicación, encriptación e incrementales integrados, `restic` es mejor que tar. Para apps pequeñas (<1GB), tar + find es más simple y no tiene dependencias.

### Como estimo el tamaño del backup antes de ejecutar?

```bash
# Estimar tamaño comprimido
du -sh "$SOURCE_DIR"
# Estimación aproximada: el tamaño comprimido es ~40-60% del original para archivos de texto
estimated=$(du -sb "$SOURCE_DIR" | cut -f1)
estimated_compressed=$((estimated * 50 / 100))
echo "Estimated compressed: $((estimated_compressed / 1024 / 1024)) MB"
```

## Tips de Rendimiento

1. **Usa compresión paralela.** `pigz` es un reemplazo multi-threaded de gzip:

```bash
# 4x más rápido en sistemas multi-core
tar -I pigz -cf "${BACKUP_FILE}" -C "${SOURCE_DIR}" .
```

2. **Excluye archivos innecesarios.** Omite caches, logs y archivos temporales:

```bash
tar -czf "${BACKUP_FILE}" \
    --exclude="*.log" \
    --exclude="*.tmp" \
    --exclude="cache/*" \
    --exclude="node_modules/*" \
    -C "${SOURCE_DIR}" .
```

3. **Usa `ionice` para I/O de baja prioridad.** No dejes que los backups ahoguen a producción:

```bash
ionice -c 3 tar -czf "${BACKUP_FILE}" -C "${SOURCE_DIR}" .
```
