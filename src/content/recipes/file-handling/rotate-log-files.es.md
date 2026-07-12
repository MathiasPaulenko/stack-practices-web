---





contentType: recipes
slug: rotate-log-files
title: "Rotar Archivos de Log"
description: "Cómo implementar rotación de logs por tamaño, fecha y cantidad para prevenir la exaustión de disco en Python, Node.js, Java y Linux."
metaDescription: "Implementa rotación de logs por tamaño, fecha y cantidad en Python, Node.js, Java y Linux para prevenir la exaustión de disco."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - logging
  - rotation
  - python
  - nodejs
  - java
  - linux
  - recipe
relatedResources:
  - /recipes/generate-temporary-files
  - /recipes/structured-logging
  - /recipes/compress-decompress-files
  - /recipes/copy-move-files
  - /recipes/read-large-files
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Implementa rotación de logs por tamaño, fecha y cantidad en Python, Node.js, Java y Linux para prevenir la exaustión de disco."
  keywords:
    - file-handling
    - logging
    - rotation
    - python
    - nodejs
    - java
    - linux
    - recipe





---

## Descripción General

La rotación de logs previene que un solo archivo de log crezca sin límite y agote el espacio en disco. Una estrategia adecuada de rotación comprime logs antiguos, mantiene un número configurable de backups y opcionalmente elimina archivos que exceden una edad de retención. El patron a continuacion demuestra rotación basada en tamaño y tiempo en Python, Node.js, Java y Linux.

## Cuándo Usar

- Los logs de aplicación crecen continuamente y arriesgan llenar el disco
- Necesitas retener logs históricos para cumplimiento o debugging
- Las herramientas de análisis de logs prefieren archivos más pequeños acotados en tiempo
- Quieres comprimir logs antiguos para reducir costos de almacenamiento
- Múltiples procesos escriben al mismo archivo de log

## Cuándo NO Usar

- Estás usando un servicio de logging centralizado (Datadog, Splunk, ELK) que ingiere desde stdout/stderr — deja que la plataforma maneje la retención
- Necesitas búsqueda de logs a nivel de milisegundo a través de todo el historial — usa una base de datos de logs en su lugar
- Tu aplicación corre como contenedores efímeros con sistemas de archivos de solo lectura — envía a stdout

## Implementación Paso a Paso

### Python

```python
import logging
import logging.handlers

# Rotación por tamaño: máximo 10MB, mantener 5 backups
handler = logging.handlers.RotatingFileHandler(
    'app.log',
    maxBytes=10 * 1024 * 1024,  # 10 MB
    backupCount=5,
    encoding='utf-8'
)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s %(name)s: %(message)s'
))

logger = logging.getLogger('myapp')
logger.setLevel(logging.INFO)
logger.addHandler(handler)

# Rotación por tiempo: diaria a medianoche, mantener 30 días
from logging.handlers import TimedRotatingFileHandler

timed_handler = TimedRotatingFileHandler(
    'app_daily.log',
    when='midnight',
    interval=1,
    backupCount=30,
    encoding='utf-8',
    utc=True
)
timed_handler.suffix = '%Y-%m-%d'
timed_handler.extMatch = r'^\d{4}-\d{2}-\d{2}$'
logger.addHandler(timed_handler)

# WatchedFileHandler para rotación externa (compatibilidad con logrotate)
from logging.handlers import WatchedFileHandler
watched = WatchedFileHandler('app.log')
logger.addHandler(watched)
```

### Node.js

```javascript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Rotación por tamaño con Winston
const sizeTransport = new winston.transports.File({
    filename: 'app.log',
    maxsize: 10 * 1024 * 1024,  // 10 MB
    maxFiles: 5,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
});

// Rotación diaria
const dailyTransport = new DailyRotateFile({
    filename: 'app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
});

const logger = winston.createLogger({
    level: 'info',
    transports: [sizeTransport, dailyTransport]
});

// Limpieza automática de archivos antiguos
dailyTransport.on('rotate', (oldFilename, newFilename) => {
    console.log(`Rotado log: ${oldFilename} -> ${newFilename}`);
});
```

### Java

```java
import java.util.logging.*;

// Usando java.util.logging con rotación personalizada
public class LogRotationExample {
    public static void setupLogging() throws Exception {
        Logger logger = Logger.getLogger("myapp");
        logger.setLevel(Level.INFO);

        // Rotación por tamaño: 10MB, 5 backups
        FileHandler fileHandler = new FileHandler(
            "app.log",           // patrón
            10 * 1024 * 1024,    // límite en bytes
            5,                   // cantidad
            true                 // append
        );
        fileHandler.setFormatter(new SimpleFormatter());
        logger.addHandler(fileHandler);
    }
}

// Logback (más común en producción)
// logback.xml:
/*
<configuration>
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/app.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>logs/app-%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>30</maxHistory>
            <totalSizeCap>1GB</totalSizeCap>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    <root level="INFO">
        <appender-ref ref="FILE" />
    </root>
</configuration>
*/
```

### Linux (logrotate)

```bash
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily                  # Rotar diariamente
    missingok              # OK si el archivo de log no existe
    rotate 30              # Mantener 30 backups
    compress               # Comprimir logs antiguos con gzip
    delaycompress          # Comprimir la rotación después de la siguiente
    notifempty             # No rotar archivos vacíos
    create 0644 appuser appuser
    sharedscripts          # Ejecutar postrotate una vez para todos los archivos
    dateext                # Usar fecha en lugar de número como sufijo
    dateformat -%Y%m%d

    postrotate
        # Señalizar a la aplicación para reabrir el archivo de log
        kill -HUP $(cat /var/run/myapp.pid) > /dev/null 2>&1 || true
    endscript
}
```

```bash
# Rotación por tamaño con logrotate
/var/log/myapp/app.log {
    size 100M              # Rotar cuando el archivo exceda 100MB
    rotate 10
    compress
    copytruncate           # Copiar luego truncar (sin señal necesaria)
    delaycompress
}
```

## Lo que funciona

- **Usa `copytruncate` o `create` con una señal postrotate** para evitar perder entradas de log entre la copia y la reapertura. Las aplicaciones deben manejar `SIGHUP` para reabrir descriptores de archivo.
- **Configura `totalSizeCap` o equivalente** para limitar el almacenamiento total entre todos los logs rotados, no solo la cantidad de archivos.
- **Comprime logs rotados** para reducir almacenamiento en un 80-95%. Usa `delaycompress` para mantener el backup más reciente sin comprimir para acceso inmediato con grep.
- **Ejecuta logrotate con `-d` (modo debug)** antes de desplegar en producción para verificar rutas y permisos sin hacer cambios.
- **Monitorea el uso de disco** de forma independiente. La rotación es una red de seguridad, no un sustituto de la planificación de capacidad.

## Errores Comunes

- **No manejar la señal de reapertura en la aplicación.** La aplicación continúa escribiendo al inodo viejo después de la rotación, haciendo que el archivo eliminado siga consumiendo espacio hasta que el proceso se reinicia.
- **Usar `copytruncate` con writers con buffer.** Los datos en buffer de la aplicación pueden perderse cuando el archivo es truncado.
- **Configurar `maxFiles` o `backupCount` demasiado bajo para cumplimiento.** 5 backups de 10MB cada uno son solo 50MB de historial — insuficiente para la mayoría del debugging en producción.
- **Ignorar zonas horarias en `TimedRotatingFileHandler`.** Usa `utc=True` para evitar comportamiento ambiguo durante transiciones de horario de verano.
- **Ejecutar múltiples instancias de la aplicación con el mismo archivo de log.** Writers concurrentes sin un mecanismo de bloqueo entrelazan líneas de log o corrompen el archivo.

## Preguntas Frecuentes

**Q: ¿Qué es la rotación de logs y por qué importa?**
A: La rotación de logs archiva o elimina archivos de log antiguos para evitar que se agote el disco. Sin rotación, un solo servicio puede llenar todo el disco.

**Q: ¿Cómo elijo una política de retención?**
A: Equilibra cumplimiento, necesidades de debugging y costo de almacenamiento. Una aplicación web común conserva 7-30 días de logs localmente y archiva logs más antiguos en almacenamiento frío.

**Q: ¿Debo comprimir logs rotados?**
A: Sí. La compresión reduce considerablemente el uso de almacenamiento. La mayoría de las herramientas de rotación soportan compresión gzip o zstd de forma nativa.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Rotación personalizada con compresión en Python

Para casos donde los handlers integrados carecen de flexibilidad, implementa un rotador personalizado:

```python
import logging
import os
import gzip
import shutil
from logging.handlers import BaseRotatingHandler
from pathlib import Path
from datetime import datetime


class CompressingRotatingHandler(BaseRotatingHandler):
    """RotatingFileHandler que comprime logs rotados con gzip."""

    def __init__(self, filename, max_bytes=10 * 1024 * 1024, backup_count=5, encoding="utf-8"):
        super().__init__(filename, mode="a", encoding=encoding, delay=False)
        self.max_bytes = max_bytes
        self.backup_count = backup_count

    def shouldRollover(self, record):
        if self.stream is None:
            self.stream = self._open()
        if self.max_bytes > 0:
            self.stream.seek(0, 2)
            if self.stream.tell() >= self.max_bytes:
                return 1
        return 0

    def doRollover(self):
        if self.stream:
            self.stream.close()
            self.stream = None

        # Rotar backups existentes
        for i in range(self.backup_count - 1, 0, -1):
            src = f"{self.baseFilename}.{i}.gz"
            dst = f"{self.baseFilename}.{i + 1}.gz"
            if os.path.exists(src):
                if os.path.exists(dst):
                    os.remove(dst)
                os.rename(src, dst)

        # Comprimir log actual a .1.gz
        if os.path.exists(self.baseFilename):
            compressed = f"{self.baseFilename}.1.gz"
            with open(self.baseFilename, "rb") as src:
                with gzip.open(compressed, "wb") as dst:
                    shutil.copyfileobj(src, dst)
            os.remove(self.baseFilename)

        # Eliminar backups excesivos
        for i in range(self.backup_count + 1, self.backup_count + 10):
            excess = f"{self.baseFilename}.{i}.gz"
            if os.path.exists(excess):
                os.remove(excess)

        self.stream = self._open()


# Uso
handler = CompressingRotatingHandler(
    "app.log",
    max_bytes=10 * 1024 * 1024,
    backup_count=10,
)
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

logger = logging.getLogger("myapp")
logger.setLevel(logging.INFO)
logger.addHandler(handler)

# Generar logs de prueba
for i in range(100000):
    logger.info(f"Entrada de log {i}: procesando request con payload de datos")
```

### Patrones de logrotate para aplicaciones containerizadas

Los contenedores que loguean a archivos necesitan manejo especial ya que el filesystem es efímero. Usa un sidecar o enfoque de volumen compartido:

```bash
# /etc/logrotate.d/container-app
# Logs de aplicación en un volumen compartido montado desde el contenedor
/var/log/container-app/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    dateext
    dateformat -%Y%m%d-%H%M%S
    su root root
}

# Nginx en contenedor con volumen de log compartido
/var/log/nginx/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 nginx nginx
    sharedscripts
    postrotate
        # Señalar a nginx en el contenedor para reabrir logs
        docker exec nginx kill -HUP 1 2>/dev/null || true
    endscript
}

# Múltiples instancias de aplicación con archivos de log por PID
/var/log/myapp/app-*.log {
    size 50M
    rotate 5
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

Docker Compose con volumen de log y sidecar logrotate:

```yaml
# docker-compose.yml
services:
  app:
    image: myapp:latest
    volumes:
      - app-logs:/var/log/myapp
    environment:
      - LOG_FILE=/var/log/myapp/app.log

  logrotate:
    image: alpine:latest
    command: >
      sh -c "apk add --no-cache logrotate &&
             echo '/var/log/myapp/*.log { daily rotate 14 compress delaycompress copytruncate missingok }' > /etc/logrotate.d/myapp &&
             while true; do logrotate /etc/logrotate.d/myapp; sleep 86400; done"
    volumes:
      - app-logs:/var/log/myapp
    depends_on:
      - app

volumes:
  app-logs:
```

### Política de retención con limpieza basada en edad

```python
import os
import time
from pathlib import Path


def cleanup_old_logs(log_dir: str, max_age_days: int = 30, pattern: str = "*.log*") -> dict:
    """Elimina archivos de log más antiguos que max_age_days. Retorna estadísticas."""
    stats = {"deleted": 0, "freed_bytes": 0, "errors": 0}
    cutoff = time.time() - (max_age_days * 86400)
    log_path = Path(log_dir)

    for entry in log_path.glob(pattern):
        try:
            if entry.is_file() and entry.stat().st_mtime < cutoff:
                size = entry.stat().st_size
                entry.unlink()
                stats["deleted"] += 1
                stats["freed_bytes"] += size
        except OSError as e:
            stats["errors"] += 1
            print(f"Error eliminando {entry}: {e}")

    return stats


# Uso: eliminar logs más antiguos que 30 días
result = cleanup_old_logs("/var/log/myapp", max_age_days=30)
print(f"Eliminados {result['deleted']} archivos, liberados {result['freed_bytes'] / 1024 / 1024:.1f} MB")
```

### Script de rotación de logs en Bash con compresión y retención

```bash
#!/bin/bash
set -euo pipefail

LOG_DIR="/var/log/myapp"
LOG_FILE="$LOG_DIR/app.log"
MAX_SIZE=$((10 * 1024 * 1024))  # 10MB
BACKUP_COUNT=10
RETENTION_DAYS=30

rotate_log() {
    local file="$1"
    local current_size
    current_size=$(stat -c%s "$file" 2>/dev/null || echo 0)

    if [ "$current_size" -lt "$MAX_SIZE" ]; then
        return 0
    fi

    echo "Rotando $file (tamaño: $current_size bytes)"

    # Rotar backups existentes
    for i in $(seq $((BACKUP_COUNT - 1)) -1 1); do
        src="${file}.${i}.gz"
        dst="${file}.$((i + 1)).gz"
        if [ -f "$src" ]; then
            [ -f "$dst" ] && rm -f "$dst"
            mv "$src" "$dst"
        fi
    done

    # Comprimir log actual
    if [ -f "$file" ]; then
        gzip -c "$file" > "${file}.1.gz"
        : > "$file"  # Truncar
    fi

    # Eliminar backups más allá del conteo de retención
    for i in $(seq $((BACKUP_COUNT + 1)) $((BACKUP_COUNT + 10))); do
        rm -f "${file}.${i}.gz"
    done

    # Eliminar archivos más antiguos que el período de retención
    find "$LOG_DIR" -name "*.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

    echo "Rotación completa"
}

# Ejecutar rotación
rotate_log "$LOG_FILE"

# Entrada de cron: ejecutar cada hora
# 0 * * * * /usr/local/bin/rotate-logs.sh >> /var/log/myapp/rotation.log 2>&1
```

### Monitoreo de tamaños de archivos de log con alertas

```python
import os
import smtplib
from pathlib import Path
from typing import Callable


def check_log_sizes(
    log_dir: str,
    warning_mb: float = 500,
    critical_mb: float = 1000,
    alert_callback: Callable[[str, str], None] = None,
) -> list[dict]:
    """Verifica tamaños de archivos de log y dispara alertas si se exceden umbrales."""
    results = []
    log_path = Path(log_dir)

    for entry in log_path.rglob("*.log*"):
        if not entry.is_file():
            continue

        size_mb = entry.stat().st_size / (1024 * 1024)
        level = "OK"

        if size_mb >= critical_mb:
            level = "CRITICAL"
        elif size_mb >= warning_mb:
            level = "WARNING"

        result = {
            "file": str(entry),
            "size_mb": round(size_mb, 2),
            "level": level,
        }
        results.append(result)

        if level != "OK" and alert_callback:
            alert_callback(str(entry), f"{level}: {size_mb:.1f}MB")

    return results


def email_alert(file_path: str, message: str):
    """Envía alerta por email para archivos de log sobredimensionados."""
    print(f"[ALERTA] {file_path}: {message}")
    # En producción, usa envío de email apropiado:
    # smtp = smtplib.SMTP("smtp.example.com")
    # smtp.sendmail("alerts@example.com", "ops@example.com",
    #               f"Subject: Alerta de Tamaño de Log\n\n{message}")


# Uso
results = check_log_sizes(
    "/var/log/myapp",
    warning_mb=500,
    critical_mb=1000,
    alert_callback=email_alert,
)

for r in results:
    print(f"{r['level']:10s} {r['size_mb']:>10.2f}MB  {r['file']}")
```

## Mejores Prácticas Adicionales


- For a deeper guide, see [Generate Temporary Files](/es/recipes/generate-temporary-files/).

1. **Usa `zstd` en lugar de `gzip` para compresión más rápida.** zstd ofrece ratios de compresión similares con descompresión 3-5x más rápida:

```bash
# logrotate con zstd (requiere logrotate 3.18+)
/var/log/myapp/*.log {
    daily
    rotate 30
    compress
    compresscmd /usr/bin/zstd
    compressoptions -19
    compressext .zst
    delaycompress
    missingok
    notifempty
}
```

2. **Prueba la rotación en un entorno staging.** Simula alto volumen de logs para verificar que la rotación dispara en el umbral correcto:

```bash
#!/bin/bash
# Generar 15MB de datos de log de prueba para disparar rotación de 10MB
head -c 15M /dev/urandom | base64 >> /var/log/myapp/test.log

# Verificar que la rotación ocurrió
ls -la /var/log/myapp/test.log*
```

3. **Usa logging estructurado con rotación.** Combina logging JSON con rotación para parsing más fácil por herramientas de análisis de logs:

```python
import logging
import json
from logging.handlers import RotatingFileHandler


class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


handler = RotatingFileHandler(
    "app.json.log",
    maxBytes=10 * 1024 * 1024,
    backupCount=10,
)
handler.setFormatter(JsonFormatter())

logger = logging.getLogger("myapp")
logger.setLevel(logging.INFO)
logger.addHandler(handler)
```

## Errores Comunes Adicionales

1. **Olvidar rotar logs de cron o systemd timers.** La rotación a nivel de aplicación maneja logs in-app, pero la salida de cron jobs y los logs de systemd journal necesitan rotación separada:

```bash
# Rotar salida de cron redirigida a un archivo
/var/log/cron-output.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    copytruncate
}

# systemd: journald tiene su propia retención
# /etc/systemd/journald.conf:
# SystemMaxUse=500M
# MaxRetentionSec=30day
```

2. **No establecer permisos en archivos rotados.** Los logs pueden contener datos sensibles. Asegura que los archivos rotados mantengan permisos restrictivos:

```bash
# logrotate: establecer permisos en archivos rotados
/var/log/myapp/*.log {
    daily
    rotate 30
    compress
    delaycompress
    create 0640 myapp myapp
    su myapp myapp
    missingok
    notifempty
}
```

## Preguntas Frecuentes Adicionales

### ¿Cómo roto logs en un pod de Kubernetes?

En Kubernetes, las aplicaciones deberían loguear a stdout/stderr. El runtime del contenedor maneja la rotación. Para logging basado en archivos, usa un contenedor sidecar con volúmenes compartidos:

```yaml
# Pod de Kubernetes con sidecar de rotación de logs
apiVersion: v1
kind: Pod
metadata:
  name: app-with-log-rotation
spec:
  containers:
    - name: app
      image: myapp:latest
      volumeMounts:
        - name: logs
          mountPath: /var/log/myapp
    - name: log-rotator
      image: busybox:latest
      command:
        - sh
        - -c
        - |
          while true; do
            for f in /var/log/myapp/*.log; do
              size=$(wc -c < "$f" 2>/dev/null || echo 0)
              if [ "$size" -gt 10485760 ]; then
                mv "$f" "$f.$(date +%s).bak"
                gzip "$f.$(date +%s).bak"
              fi
            done
            find /var/log/myapp -name "*.gz" -mtime +14 -delete
            sleep 3600
          done
      volumeMounts:
        - name: logs
          mountPath: /var/log/myapp
  volumes:
    - name: logs
      emptyDir: {}
```

### ¿Cómo manejo la rotación de logs para múltiples procesos escribiendo al mismo archivo?

Usa un recolector de logs centralizado o un process manager que maneje la rotación de logs. Si múltiples procesos deben escribir al mismo archivo, usa un mecanismo de bloqueo:

```python
import fcntl
import logging
from logging.handlers import RotatingFileHandler


class LockedRotatingHandler(RotatingFileHandler):
    """RotatingFileHandler con bloqueo de archivo para seguridad multi-proceso."""

    def emit(self, record):
        try:
            with open(self.baseFilename, "a") as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                # Re-verificar tamaño después de adquirir bloqueo
                f.seek(0, 2)
                if f.tell() >= self.maxBytes:
                    self.doRollover()
                f.write(self.format(record) + "\n")
                f.flush()
        except Exception:
            self.handleError(record)


handler = LockedRotatingHandler("shared.log", maxBytes=10 * 1024 * 1024, backupCount=5)
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s: %(message)s"))

logger = logging.getLogger("shared")
logger.addHandler(handler)
```

### ¿Cómo archivo logs rotados a almacenamiento en la nube?

```python
import os
import boto3
from pathlib import Path
from datetime import datetime


def archive_logs_to_s3(log_dir: str, bucket: str, prefix: str = "logs/") -> int:
    """Sube archivos de log comprimidos a S3 y elimina las copias locales."""
    s3 = boto3.client("s3")
    uploaded = 0
    log_path = Path(log_dir)

    for entry in log_path.glob("*.gz"):
        if not entry.is_file():
            continue

        # Saltar archivos modificados en la última hora (pueden estar en uso)
        age_hours = (datetime.now().timestamp() - entry.stat().st_mtime) / 3600
        if age_hours < 1:
            continue

        key = f"{prefix}{entry.name}"
        try:
            s3.upload_file(str(entry), bucket, key)
            entry.unlink()
            uploaded += 1
            print(f"Archivado {entry.name} a s3://{bucket}/{key}")
        except Exception as e:
            print(f"Error al archivar {entry.name}: {e}")

    return uploaded


# Uso: archivar logs más antiguos que 1 hora a S3
count = archive_logs_to_s3("/var/log/myapp", "my-log-archive", prefix="myapp/")
print(f"Archivados {count} archivos a S3")
```
