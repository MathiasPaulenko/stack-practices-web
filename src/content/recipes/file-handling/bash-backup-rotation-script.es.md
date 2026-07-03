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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
