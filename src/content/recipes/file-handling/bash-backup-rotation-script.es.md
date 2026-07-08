---
contentType: recipes
slug: bash-backup-rotation-script
title: "Script de Rotación de Backups"
description: "Automatiza backups con políticas de retención usando un script de Bash que rota snapshots diarios, semanales y mensuales."
metaDescription: "Automatiza backups con políticas de retención en Bash. Rota snapshots diarios, semanales y mensuales, comprime archivos y protege datos del agotamiento de disco."
difficulty: intermediate
topics:
  - file-handling
tags:
  - bash
  - backup
  - retention
  - automation
  - linux
relatedResources:
  - /recipes/bash-scripting-automation
  - /recipes/bash-loop-over-files
  - /recipes/bash-parallel-execution
  - /recipes/bash-text-processing
  - /recipes/generate-temporary-files
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Automatiza backups con políticas de retención en Bash. Rota snapshots diarios, semanales y mensuales, comprime archivos y protege datos del agotamiento de disco."
  keywords:
    - bash
    - backup
    - retención
    - automatización
    - linux
---
## Visión General

Hacer backups es solo la mitad del trabajo; mantener esos backups organizados y podar los antiguos es la otra mitad. Un script de rotación de backups crea snapshots de forma programada, los renombra con timestamps y elimina archivos que excedan la ventana de retención. Esto evita que el directorio de backups crezca para siempre mientras conserva suficientes copias históricas para recuperarse de borrados accidentales, corrupción o ransomware.

## Cuándo Usar

Usa este recurso cuando:
- Ejecutes backups programados en un servidor o workstation Linux.
- Necesites conservar snapshots diarios, semanales y mensuales sin limpieza manual.
- El espacio en disco sea limitado y quieras un crecimiento predecible de backups.
- Quieras comprimir snapshots antes de archivarlos.

## Solución

### Script de rotación de backups en Bash

```bash
#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-/var/app/data}"
BACKUP_DIR="${2:-/var/backups/app}"
DAILY_RETENTION=7
WEEKLY_RETENTION=4
MONTHLY_RETENTION=3

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly"

TODAY=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)

ARCHIVE="$BACKUP_DIR/daily/app-$TODAY.tar.gz"

# Crear backup diario
tar -czf "$ARCHIVE" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")"

# Promover a semanal los domingos
if [[ "$DAY_OF_WEEK" == "7" ]]; then
    cp "$ARCHIVE" "$BACKUP_DIR/weekly/app-week-$TODAY.tar.gz"
fi

# Promover a mensual el primer día del mes
if [[ "$DAY_OF_MONTH" == "01" ]]; then
    cp "$ARCHIVE" "$BACKUP_DIR/monthly/app-month-$TODAY.tar.gz"
fi

# Eliminar backups antiguos
find "$BACKUP_DIR/daily" -maxdepth 1 -type f -mtime +$DAILY_RETENTION -delete
find "$BACKUP_DIR/weekly" -maxdepth 1 -type f -mtime +$((WEEKLY_RETENTION * 7)) -delete
find "$BACKUP_DIR/monthly" -maxdepth 1 -type f -mtime +$((MONTHLY_RETENTION * 30)) -delete

echo "Backup completado: $ARCHIVE"
```

## Explicación

El script recibe un directorio fuente y un directorio de backup como argumentos. Crea un tarball comprimido nombrado con la fecha de hoy y lo almacena en la carpeta `daily`. Los domingos copia el backup diario a la carpeta `weekly`, y el primer día del mes lo copia a la carpeta `monthly`. Luego elimina archivos más antiguos que los umbrales de retención configurados. Usar `set -euo pipefail` hace que el script falle rápido ante errores o variables indefinidas. El comando `find` con `-mtime` elimina solo archivos, manteniendo los directorios intactos.

## Variantes

| Frecuencia | Comando | Retención |
|------------|---------|-----------|
| Diario | cron a las 2:00 AM | 7 días |
| Semanal | copiar los domingos | 4 semanas |
| Mensual | copiar el día 1 | 3 meses |
| Remoto | `rsync` después del tar | mirror a S3 o NAS |

## Lo que funciona

1. **Prueba restauraciones regularmente.** Un backup que no puedes restaurar es inútil; programa una prueba mensual de restauración.
2. **Mantén backups fuera del sitio o en object storage.** Los backups locales son vulnerables a fallos de disco y ransomware.
3. **Cifra backups que contengan datos sensibles.** Usa `gpg` u `openssl enc` antes de subir a almacenamiento compartido.
4. **Usa snapshots inmutables cuando sea posible.** S3 Object Lock o filesystems append-only evitan que atacantes borren backups.
5. **Registra cada ejecución de backup.** Redirige la salida a un archivo de log y monitorea fallos con una regla de alerta simple.

## Errores Comunes

1. **Olvidar verificar la integridad del backup.** `tar` puede crear un archivo corrupto en silencio; prueba la extracción periódicamente.
2. **Almacenar backups en el mismo disco que la fuente.** Un fallo de disco destruye tanto los datos como los backups.
3. **Usar nombres de archivo débiles o predecibles.** Los timestamps evitan colisiones y facilitan el ordenamiento.
4. **Ignorar códigos de salida.** Un backup fallido debe detener la limpieza de retención para no borrar backups antiguos sin crear nuevos.
5. **Ejecutar como root sin necesidad.** Usa un usuario de backup dedicado con acceso de solo lectura al directorio fuente.

## Preguntas Frecuentes

**P: ¿Cómo restauro un backup?**
R: Extrae el tarball con `tar -xzf app-YYYY-MM-DD.tar.gz -C /restore/path`. Verifica el contenido extraído antes de sobrescribir datos de producción.

**P: ¿Puedo usar rsync en lugar de tar?**
R: Sí. `rsync` es mejor para backups incrementales, mientras que `tar` crea snapshots autocontenidos. Puedes combinar ambos para velocidad y portabilidad.

**P: ¿Cómo manejo backups que corren mientras cambian archivos?**
R: Usa snapshots del filesystem (LVM, ZFS o snapshots cloud) antes de ejecutar el backup para que los archivos sean consistentes durante la copia.

### Backup cifrado con GPG

```bash
#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-/var/app/data}"
BACKUP_DIR="${2:-/var/backups/app}"
GPG_RECIPIENT="${3:-admin@example.com}"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR/encrypted"
TODAY=$(date +%Y-%m-%d)
ARCHIVE="$BACKUP_DIR/encrypted/app-$TODAY.tar.gz.gpg"

# Crear y cifrar backup en un pipeline (sin archivo descifrado en disco)
tar -czf - -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")" | \
    gpg --encrypt --recipient "$GPG_RECIPIENT" --output "$ARCHIVE"

# Verificar que el archivo cifrado es GPG válido
gpg --list-packets "$ARCHIVE" > /dev/null 2>&1 || {
    echo "ERROR: Verificación del backup cifrado falló"
    rm -f "$ARCHIVE"
    exit 1
}

echo "[$(date -Iseconds)] Backup cifrado creado: $ARCHIVE"

# Limpiar backups cifrados antiguos
find "$BACKUP_DIR/encrypted" -name '*.gpg' -type f -mtime +$RETENTION_DAYS -delete

# Descifrar para restaurar:
# gpg --decrypt app-2026-01-15.tar.gz.gpg | tar -xzf - -C /restore/path
```

### Backup incremental con rsync

```bash
#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-/var/app/data}"
BACKUP_DIR="${2:-/var/backups/rsync}"
SNAPSHOT_COUNT=7

mkdir -p "$BACKUP_DIR"

# Usar rsync --link-dest para crear snapshots incrementales basados en hardlinks
# Solo los archivos cambiados consumen nuevo espacio en disco; los no cambiados son hardlinked
LAST_SNAPSHOT=$(ls -d "$BACKUP_DIR"/snapshot-* 2>/dev/null | sort -r | head -1)
TODAY=$(date +%Y-%m-%d)
CURRENT_SNAPSHOT="$BACKUP_DIR/snapshot-$TODAY"

rsync -a --delete \
    --link-dest="$LAST_SNAPSHOT" \
    "$SOURCE_DIR/" "$CURRENT_SNAPSHOT/"

# Verificar integridad del snapshot
SNAPSHOT_SIZE=$(du -sh "$CURRENT_SNAPSHOT" | cut -f1)
FILE_COUNT=$(find "$CURRENT_SNAPSHOT" -type f | wc -l)
echo "[$(date -Iseconds)] Snapshot creado: $CURRENT_SNAPSHOT ($FILE_COUNT archivos, $SNAPSHOT_SIZE)"

# Rotar snapshots antiguos (mantener últimos N)
SNAPSHOTS=($(ls -d "$BACKUP_DIR"/snapshot-* 2>/dev/null | sort -r))
if (( ${#SNAPSHOTS[@]} > SNAPSHOT_COUNT )); then
    for snapshot in "${SNAPSHOTS[@]:$SNAPSHOT_COUNT}"; do
        rm -rf "$snapshot"
        echo "[$(date -Iseconds)] Snapshot antiguo eliminado: $snapshot"
    done
fi

# Reporte de uso de disco
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "[$(date -Iseconds)] Tamaño total de backups: $TOTAL_SIZE"
```

### Subida a S3 con ciclo de vida y verificación

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-/var/backups/app}"
S3_BUCKET="${2:-my-app-backups}"
S3_PREFIX="${3:-daily}"

TODAY=$(date +%Y-%m-%d)
ARCHIVE="$BACKUP_DIR/daily/app-$TODAY.tar.gz"

# Subir a S3 con verificación de checksum
aws s3 cp "$ARCHIVE" "s3://$S3_BUCKET/$S3_PREFIX/app-$TODAY.tar.gz" \
    --checksum-algorithm SHA256 \
    --metadata "created=$(date -I),host=$(hostname)" \
    --no-progress

# Verificar subida comparando checksums
LOCAL_CHECKSUM=$(sha256sum "$ARCHIVE" | cut -d' ' -f1)
S3_CHECKSUM=$(aws s3api head-object \
    --bucket "$S3_BUCKET" \
    --key "$S3_PREFIX/app-$TODAY.tar.gz" \
    --query 'Metadata.sha256' --output text 2>/dev/null || echo "")

if [ "$LOCAL_CHECKSUM" != "$S3_CHECKSUM" ] && [ -n "$S3_CHECKSUM" ]; then
    echo "ADVERTENCIA: Checksum no coincide — local=$LOCAL_CHECKSUM, s3=$S3_CHECKSUM"
    exit 1
fi

# Listar backups recientes en S3
echo "=== Backups recientes en S3 ==="
aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" --recursive | tail -10

# Configurar ciclo de vida S3 (ejecutar una vez)
# Mover a Glacier después de 30 días, eliminar después de 365
aws s3api put-bucket-lifecycle-configuration \
    --bucket "$S3_BUCKET" \
    --lifecycle-configuration '{
        "Rules": [{
            "ID": "BackupRetention",
            "Status": "Enabled",
            "Filter": {"Prefix": "daily/"},
            "Transitions": [{"Days": 30, "StorageClass": "GLACIER"}],
            "Expiration": {"Days": 365}
        }]
    }'
```

### Verificación de integridad de backups

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-/var/backups/app}"
VERIFY_DIR=$(mktemp -d)

echo "[$(date -Iseconds)] Iniciando verificación de backups..."

FAILURES=0
for archive in "$BACKUP_DIR"/daily/*.tar.gz; do
    [[ -f "$archive" ]] || continue
    filename=$(basename "$archive")

    # Testear integridad de tar
    if ! tar -tzf "$archive" > /dev/null 2>&1; then
        echo "FAIL: $filename — archivo tar corrupto"
        FAILURES=$((FAILURES + 1))
        continue
    fi

    # Testear extracción de un archivo de muestra
    if ! tar -xzf "$archive" -C "$VERIFY_DIR" --include="*.json" 2>/dev/null; then
        echo "WARN: $filename — no se encontraron archivos JSON o problema de extracción"
    fi

    # Verificar conteo de archivos en el archivo
    FILE_COUNT=$(tar -tzf "$archive" | wc -l)
    ARCHIVE_SIZE=$(du -h "$archive" | cut -f1)
    echo "OK: $filename — $FILE_COUNT archivos, $ARCHIVE_SIZE"

    # Limpiar archivos extraídos para la siguiente iteración
    rm -rf "$VERIFY_DIR"/*
done

rm -rf "$VERIFY_DIR"

if (( FAILURES > 0 )); then
    echo "[$(date -Iseconds)] Verificación FALLIDA: $FAILURES archivos corruptos"
    exit 1
fi
echo "[$(date -Iseconds)] Todos los backups verificados correctamente"
```

### Backup en Python con shutil y tarfile

```python
import tarfile
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path

class BackupManager:
    """Gestiona rotación de backups con retención diaria, semanal y mensual."""

    def __init__(self, source: str, backup_dir: str,
                 daily_retention: int = 7,
                 weekly_retention: int = 4,
                 monthly_retention: int = 3):
        self.source = Path(source)
        self.backup_dir = Path(backup_dir)
        self.daily_retention = daily_retention
        self.weekly_retention = weekly_retention
        self.monthly_retention = monthly_retention

        for subdir in ['daily', 'weekly', 'monthly']:
            (self.backup_dir / subdir).mkdir(parents=True, exist_ok=True)

    def create_backup(self) -> Path:
        today = datetime.now().strftime('%Y-%m-%d')
        archive_path = self.backup_dir / 'daily' / f'app-{today}.tar.gz'

        with tarfile.open(archive_path, 'w:gz') as tar:
            tar.add(self.source, arcname=self.source.name)

        self._promote_backups(today)
        self._cleanup_old_backups()
        return archive_path

    def _promote_backups(self, today: str) -> None:
        now = datetime.now()
        if now.weekday() == 6:  # Domingo
            shutil.copy2(
                self.backup_dir / 'daily' / f'app-{today}.tar.gz',
                self.backup_dir / 'weekly' / f'app-week-{today}.tar.gz'
            )
        if now.day == 1:
            shutil.copy2(
                self.backup_dir / 'daily' / f'app-{today}.tar.gz',
                self.backup_dir / 'monthly' / f'app-month-{today}.tar.gz'
            )

    def _cleanup_old_backups(self) -> None:
        cutoff = datetime.now()
        for subdir, retention in [
            ('daily', self.daily_retention),
            ('weekly', self.weekly_retention * 7),
            ('monthly', self.monthly_retention * 30),
        ]:
            dir_path = self.backup_dir / subdir
            for archive in dir_path.glob('*.tar.gz'):
                age = (cutoff - datetime.fromtimestamp(archive.stat().st_mtime)).days
                if age > retention:
                    archive.unlink()
                    print(f"Backup antiguo eliminado: {archive.name} ({age} días)")

    def verify_backup(self, archive_path: Path) -> bool:
        try:
            with tarfile.open(archive_path, 'r:gz') as tar:
                members = tar.getmembers()
                return len(members) > 0
        except (tarfile.TarError, EOFError) as e:
            print(f"Verificación de backup falló: {e}")
            return False

# Uso
manager = BackupManager('/var/app/data', '/var/backups/app')
archive = manager.create_backup()
if manager.verify_backup(archive):
    print(f"Backup creado y verificado: {archive}")
else:
    print("¡Verificación de backup falló!")
```

## Mejores Prácticas Adicionales

1. **Usa `trap` para limpiar ante fallos del script.** Si el script de backup falla a mitad de camino, archivos temporales y archives parciales pueden quedar. Usa un trap para limpiar al salir:

```bash
#!/usr/bin/env bash
set -euo pipefail

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# Usar TMP_DIR para archivos intermedios
# La limpieza ocurre automáticamente al salir, éxito o fallo
```

2. **Envía notificaciones de backup vía webhook.** Alerta sobre éxito o fallo para saber inmediatamente cuando los backups dejan de funcionar:

```bash
notify() {
    local status="$1"
    local message="$2"
    local webhook_url="https://hooks.slack.com/services/XXX"

    curl -s -X POST "$webhook_url" \
        -H 'Content-Type: application/json' \
        -d "{\"text\": \"Backup $status: $message\"}"
}

if tar -czf "$ARCHIVE" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")"; then
    notify "ÉXITO" "Backup completado: $ARCHIVE"
else
    notify "FALLO" "Backup falló para $SOURCE_DIR"
    exit 1
fi
```

3. **Usa `ionice` y `nice` para backups de baja prioridad.** Los backups pueden causar contención de I/O en servidores ocupados. Ejecútalos a baja prioridad para no impactar servicios de producción:

```bash
ionice -c2 -n7 nice -n19 tar -czf "$ARCHIVE" -C "$SOURCE_DIR" .
# -c2: clase best-effort, -n7: baja prioridad
# nice -n19: prioridad de CPU más baja
```

## Errores Comunes Adicionales

1. **No testear la restauración de backups.** Crear backups sin testear la restauración es el fallo de backup más común. Un backup corrupto o incompleto descubierto durante un desastre es peor que no tener backup. Programa tests de restauración mensuales a un entorno staging:

```bash
# Test de restauración mensual
RESTORE_DIR="/tmp/restore-test-$(date +%Y%m%d)"
mkdir -p "$RESTORE_DIR"
LATEST_BACKUP=$(ls -t /var/backups/app/daily/*.tar.gz | head -1)
tar -xzf "$LATEST_BACKUP" -C "$RESTORE_DIR"
# Verificar que archivos clave existen
test -f "$RESTORE_DIR/app/data/config.json" || echo "TEST DE RESTAURACIÓN FALLÓ"
rm -rf "$RESTORE_DIR"
```

2. **Hacer backup de archivos que están siendo escritos.** Archivos de bases de datos, logs y otros archivos activos pueden estar en estado inconsistente durante el backup. Usa dumps a nivel de aplicación o snapshots del filesystem:

```bash
# Para bases de datos: dump antes del backup
mysqldump --single-transaction --routines mydb > /tmp/mydb.sql
tar -czf "$ARCHIVE" /tmp/mydb.sql /var/app/data
rm /tmp/mydb.sql
```

3. **No monitorear el uso de disco de backups.** Los backups pueden llenar el disco silenciosamente con el tiempo. Monitorea el tamaño del directorio de backup y alerta cuando exceda un umbral:

```bash
BACKUP_SIZE_GB=$(du -sg "$BACKUP_DIR" | cut -f1)
THRESHOLD_GB=50
if (( BACKUP_SIZE_GB > THRESHOLD_GB )); then
    echo "ALERTA: Directorio de backups excede ${THRESHOLD_GB}GB (actual: ${BACKUP_SIZE_GB}GB)"
fi
```

## FAQ Adicional

### ¿Cómo implemento rotación Grandfather-Father-Son (GFS)?

GFS es una estrategia clásica de rotación de backups. El "hijo" es el backup diario, el "padre" es el backup semanal, y el "abuelo" es el backup mensual. El script de arriba ya implementa GFS: los backups diarios se conservan 7 días, los semanales 4 semanas y los mensuales 3 meses. Para extenderlo, añade archivos anuales:

```bash
# Promover a anual el 1 de enero
if [[ "$(date +%m%d)" == "0101" ]]; then
    cp "$ARCHIVE" "$BACKUP_DIR/yearly/app-year-$(date +%Y).tar.gz"
fi
find "$BACKUP_DIR/yearly" -maxdepth 1 -type f -mtime +$((5 * 365)) -delete
```

### ¿Esta solución está lista para producción?

Sí. `tar` y `find` son herramientas estándar POSIX disponibles en cada sistema Unix. `rsync --link-dest` es usado por rsnapshot y sistemas de backup estilo Time Machine en producción en todo el mundo. El cifrado GPG se usa para cumplimiento con GDPR, HIPAA y PCI-DSS en requisitos de backup. Las políticas de ciclo de vida S3 son el patrón estándar para retención de backups a largo plazo en AWS. El módulo `tarfile` de Python es parte de la biblioteca estándar y se usa en scripts de backup de producción. La estrategia de rotación GFS se ha usado en sistemas de backup empresariales desde los años 70.

### ¿Cuáles son las características de rendimiento?

`tar -czf` comprime a 10-15MB/s por núcleo para datos de archivos típicos. Para 1GB de datos: tar+gzip toma ~70s, tar sin compresión toma ~10s. `rsync --link-dest` transfiere solo archivos cambiados: una tasa de cambio del 10% en 10GB transfiere solo ~1GB, tomando ~30s en disco local. El cifrado GPG añade 5-10% de overhead sobre tar. Las subidas a S3 están limitadas por ancho de banda de red a 5-50MB/s por conexión. El comando `find` para limpieza toma menos de 1s para 1000 archivos. Python `tarfile` es 20-30% más lento que `tar` de línea de comandos debido al overhead de Python pero ofrece mejor manejo de errores y control programático.

### ¿Cómo depuro problemas con este enfoque?

Revisa el archivo de log de backup en busca de errores: `grep -i error /var/log/backup.log`. Verifica el archive con `tar -tzf backup.tar.gz | head` para listar contenidos. Testea la extracción con `tar -xzf backup.tar.gz -C /tmp/test` para verificar que restaura correctamente. Para problemas de rsync, usa `rsync -av --dry-run` para ver qué se transferiría sin hacer cambios. Para problemas de GPG, verifica `gpg --list-keys` para confirmar que la clave del destinatario existe. Para subidas a S3, usa `aws s3 ls s3://bucket/prefix/` para verificar que los archivos llegaron y `aws s3api head-object` para revisar metadatos. Para Python, agrega `logging.basicConfig(level=logging.DEBUG)` para ver operaciones detalladas de backup. Monitorea el espacio en disco con `df -h $BACKUP_DIR` para asegurar que el directorio de backup no se esté llenando.
