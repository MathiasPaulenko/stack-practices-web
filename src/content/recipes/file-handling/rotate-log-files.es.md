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
  - /recipes/file-handling/generate-temporary-files
  - /recipes/observability/structured-logging
  - /guides/devops/scaling-guide
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

La rotación de logs previene que un solo archivo de log crezca sin límite y agote el espacio en disco. Una estrategia adecuada de rotación comprime logs antiguos, mantiene un número configurable de backups y opcionalmente elimina archivos que exceden una edad de retención. Esta receta muestra rotación basada en tamaño y tiempo en Python, Node.js, Java y Linux.

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

## Mejores Prácticas

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

## Recursos Relacionados

- [Generar Archivos Temporales](/recipes/file-handling/generate-temporary-files)
- [Logging Estructurado](/recipes/observability/structured-logging)
- [Escalado](/guides/devops/scaling-guide)
