---





contentType: recipes
slug: cron-jobs
title: "Cron Jobs"
description: "Cómo programar y gestionar tareas recurrentes usando sintaxis cron en Linux, Python y Node.js."
metaDescription: "Ejemplos prácticos de cron jobs en Linux, Python (librería schedule) y Node.js (node-cron). Aprende sintaxis cron, patrones de scheduling y lo que funciona."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - automation
  - cron
  - ci-cd
  - deployment
relatedResources:
  - /recipes/docker-basics
  - /recipes/git-workflow
  - /patterns/observer-pattern
  - /recipes/python-schedule-periodic-tasks
  - /recipes/background-jobs
  - /recipes/cicd-pipeline-setup
  - /recipes/cli-tool-argument-parsing
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de cron jobs en Linux, Python (librería schedule) y Node.js (node-cron). Aprende sintaxis cron, patrones de scheduling y lo que funciona."
  keywords:
    - cron jobs
    - tareas programadas
    - automatización de tareas
    - sintaxis cron
    - python schedule
    - node-cron
    - linux cron
    - tareas recurrentes





---

## Visión general

Cron es el planificador de trabajos estándar de Unix para ejecutar comandos en intervalos específicos. Ya sea que necesites respaldar bases de datos, enviar emails, limpiar logs o obtener datos, cron proporciona un mecanismo confiable para la automatización recurrente.

Más allá del cron del sistema, la mayoría de los ecosistemas de programación ofrecen librerías de scheduling que traen funcionalidad tipo cron directamente a tu aplicación.

## Cuándo usarlo

Usa esta recipe cuando:

- Ejecutas tareas periódicas en un servidor (backups, limpiezas, reportes). Consulta [Background Jobs](/recipes/devops/background-jobs) para patrones de task queues.
- Programas trabajos en background dentro de una aplicación. Consulta [Scheduled Jobs](/recipes/devops/background-jobs) para cron serverless.
- Reemplazas procesos manuales con scripts automatizados. Consulta [Bash Scripting Automation](/recipes/devops/bash-scripting-automation) para automatización de scripts.
- Coordinas ejecución de trabajos distribuidos. Consulta [RabbitMQ Task Queue](/recipes/messaging/rabbitmq-task-queue) para coordinación de tareas distribuidas.

## Solución

### Linux (System Cron)

```bash
# Editar crontab
crontab -e

# Todos los días a las 3:00 AM
0 3 * * * /usr/local/bin/backup.sh

# Cada 15 minutos
*/15 * * * * /usr/local/bin/check-health.sh

# Cada lunes a las 9:00 AM
0 9 * * 1 /usr/local/bin/weekly-report.sh

# Primer día de cada mes a medianoche
0 0 1 * * /usr/local/bin/monthly-cleanup.sh
```

### Python

```python
import schedule
import time

def job():
    print("Running scheduled task...")

# Cada 10 minutos
schedule.every(10).minutes.do(job)

# Todos los días a las 9:30 AM
schedule.every().day.at("09:30").do(job)

# Cada lunes
schedule.every().monday.do(job)

while True:
    schedule.run_pending()
    time.sleep(1)
```

### JavaScript (Node.js)

```javascript
const cron = require('node-cron');

// Cada 15 minutos
cron.schedule('*/15 * * * *', () => {
  console.log('Running every 15 minutes');
});

// Todos los días a las 3:00 AM
cron.schedule('0 3 * * *', () => {
  console.log('Running daily backup');
});

// Cada lunes a las 9:00 AM
cron.schedule('0 9 * * 1', () => {
  console.log('Running weekly report');
});
```

## Explicación

Las expresiones cron usan 5 campos:

| Campo | Valores permitidos | Descripción |
|-------|-------------------|-------------|
| Minuto | 0-59 | Minuto de la hora |
| Hora | 0-23 | Hora del día |
| Día del mes | 1-31 | Día del mes |
| Mes | 1-12 | Mes del año |
| Día de la semana | 0-7 (0 y 7 = domingo) | Día de la semana |

Caracteres especiales:

- `*` — cualquier valor
- `,` — separador de lista de valores
| `-` — rango de valores |
| `*/n` — cada n pasos |

## Horarios comunes

| Expresión | Horario |
|-----------|---------|
| `*/5 * * * *` | Cada 5 minutos |
| `0 * * * *` | Cada hora |
| `0 0 * * *` | Todos los días a medianoche |
| `0 9 * * 1` | Cada lunes a las 9 AM |
| `0 0 1 * *` | Primer día de cada mes |
| `0 0 * * 0` | Cada domingo a medianoche |

## Lo que funciona

- **Usa rutas absolutas** para comandos y scripts en crontab
- **Redirecciona la salida** a un archivo de log o `/dev/null` para evitar spam de mail
- **Establece una zona horaria específica** si tus trabajos dependen de horarios laborales
- **Usa un process manager** (systemd, PM2) para schedulers a nivel de aplicación
- **Agrega manejo de errores** y alertas para tareas programadas fallidas
- **Testea expresiones** con validadores de cron online antes de deployar

## Errores comunes

- Olvidar hacer scripts ejecutables (`chmod +x`)
- Usar rutas relativas que fallan en el entorno mínimo de cron
- No manejar ejecuciones superpuestas de trabajos (usa locking)
- Ignorar cambios de horario de verano
- Ejecutar trabajos demasiado frecuentes sin rate limiting o backoff

## Preguntas frecuentes

**P: ¿Cómo veo qué cron jobs están corriendo?**
R: Usa `crontab -l` para el usuario actual, o `sudo cat /var/spool/cron/crontabs/` para trabajos del sistema.

**P: ¿Puedo ejecutar cron jobs dentro de un contenedor Docker?**
R: Sí, pero el contenedor debe permanecer corriendo. Considera usar el cron del host o un scheduler externo como Kubernetes CronJobs.

**P: ¿Qué pasa si un trabajo tarda más que su intervalo?**
R: Por defecto, los trabajos superpuestos se ejecutan concurrentemente. Usa file locks o una cola de trabajos para prevenir la superposición.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Java (Quartz Scheduler)

```java
import org.quartz.*;
import org.quartz.impl.StdSchedulerFactory;

public class CronScheduler {
    public static void main(String[] args) throws SchedulerException {
        Scheduler scheduler = StdSchedulerFactory.getDefaultScheduler();

        JobDetail job = JobBuilder.newJob(BackupJob.class)
            .withIdentity("backupJob", "group1")
            .build();

        // Todos los días a las 3:00 AM
        Trigger trigger = TriggerBuilder.newTrigger()
            .withIdentity("backupTrigger", "group1")
            .withSchedule(CronScheduleBuilder.cronSchedule("0 0 3 * * ?"))
            .build();

        scheduler.scheduleJob(job, trigger);
        scheduler.start();
    }

    public static class BackupJob implements Job {
        @Override
        public void execute(JobExecutionContext context) {
            System.out.println("Ejecutando backup: " + java.time.LocalDateTime.now());
        }
    }
}
```

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 3 * * *"  # Todos los días a las 3:00 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: backup-tool:v1.2
            command: ["/bin/sh", "-c"]
            args: ["pg_dump $DATABASE_URL > /backup/$(date +%Y%m%d).sql"]
            envFrom:
            - secretRef:
                name: db-credentials
          restartPolicy: OnFailure
          activeDeadlineSeconds: 3600  # Matar después de 1 hora
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  concurrencyPolicy: Forbid  # Prevenir ejecuciones superpuestas
```

### Go (robfig/cron)

```go
package main

import (
    "fmt"
    "github.com/robfig/cron/v3"
)

func main() {
    c := cron.New()

    // Cada 15 minutos
    c.AddFunc("*/15 * * * *", func() {
        fmt.Println("Health check ejecutando...")
    })

    // Todos los días a las 3:00 AM
    c.AddFunc("0 3 * * *", func() {
        fmt.Println("Backup diario ejecutando...")
    })

    c.Start()
    select {} // Bloquear para siempre
}
```

### systemd Timer (Alternativa a Cron)

```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Database Backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
User=backup
Environment=DATABASE_URL=postgres://localhost/mydb
```

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Run backup daily at 3:00 AM

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true  # Ejecutar jobs perdidos después del boot

[Install]
WantedBy=timers.target
```

```bash
# Habilitar e iniciar el timer
$ sudo systemctl enable backup.timer
$ sudo systemctl start backup.timer
$ systemctl list-timers --all
```

### Prevenir Ejecuciones Superpuestas con flock

```bash
# Entrada crontab con flock para prevenir superposición
0 3 * * * /usr/bin/flock -n /tmp/backup.lock /usr/local/bin/backup.sh

# -n: non-blocking, falla si el lock está tomado
# -w 60: esperar hasta 60 segundos por el lock
0 * * * * /usr/bin/flock -w 60 /tmp/cleanup.lock /usr/local/bin/cleanup.sh
```

### Variables de Entorno en Cron

```bash
# Cron tiene un PATH mínimo. Setéalo explícitamente en crontab:
PATH=/usr/local/bin:/usr/bin:/bin
SHELL=/bin/bash
MAILTO=alerts@example.com

# O sourcea un profile al inicio de cada job
0 3 * * * . /home/user/.bashrc && /usr/local/bin/backup.sh
```

### Python con APScheduler (Avanzado)

```python
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def backup_job():
    logger.info("Iniciando backup de base de datos...")
    # Lógica de backup aquí
    logger.info("Backup completado.")

scheduler = BackgroundScheduler(timezone="UTC")

# Todos los días a las 3:00 AM UTC
scheduler.add_job(
    backup_job,
    CronTrigger(hour=3, minute=0),
    id="backup",
    max_instances=1,  # Prevenir superposición
    coalesce=True,    # Fusionar ejecuciones perdidas
)

# Cada 15 minutos con jitter
scheduler.add_job(
    health_check,
    CronTrigger(minute="*/15"),
    id="health_check",
    max_instances=1,
    jitter=60,  # Delay aleatorio de hasta 60 segundos
)

scheduler.start()
```

## Mejores Prácticas Adicionales

7. **Usa `flock` o locks distribuidos.** Previene ejecuciones superpuestas de jobs:

```bash
# File lock para jobs en un solo servidor
/usr/bin/flock -n /tmp/job.lock /path/to/job.sh
```

```python
# Redis lock para jobs distribuidos
import redis

r = redis.Redis()
lock = r.lock("backup-job", timeout=3600, blocking_timeout=10)
if lock.acquire(blocking=False):
    try:
        run_backup()
    finally:
        lock.release()
else:
    print("Otra instancia está corriendo, saltando.")
```

8. **Loguea a formato estructurado.** Haz que los logs de cron sean parseables:

```bash
#!/bin/bash
# backup.sh
logger -t backup "iniciado a las $(date -Iseconds)"
pg_dump "$DATABASE_URL" > /backup/$(date +%Y%m%d).sql 2>&1
if [ $? -eq 0 ]; then
    logger -t backup "completado exitosamente"
else
    logger -t backup "FALLÓ con exit code $?"
    exit 1
fi
```

## Errores Comunes Adicionales

6. **No setear `MAILTO`**. Cron envía output por email por defecto. Setea `MAILTO=""` para deshabilitar o enruta a un sistema de alertas:

```bash
# Deshabilitar notificaciones por email
MAILTO=""
0 3 * * * /usr/local/bin/backup.sh > /dev/null 2>&1

# O enruta a una dirección de monitoreo
MAILTO=alerts@example.com
```

7. **Usar `%` en crontab sin escapar.** El carácter `%` es especial en crontab (convertido a newline):

```bash
# Incorrecto: % será interpretado como newline
0 3 * * * date +%Y%m%d > /tmp/date.txt

# Correcto: escapar % con backslash
0 3 * * * date +\%Y\%m\%d > /tmp/date.txt
```

## FAQ Adicional

### ¿Cómo manejo cron jobs específicos por zona horaria?

Setea la variable `CRON_TZ` o `TZ` en crontab:

```bash
# Ejecutar a las 9:00 AM hora de Nueva York
CRON_TZ=America/New_York
0 9 * * * /usr/local/bin/report.sh
```

Para Kubernetes CronJobs, usa `timeZone` en el spec:

```yaml
spec:
  schedule: "0 9 * * *"
  timeZone: "America/New_York"
```

### ¿Cómo monitoreo fallos de cron jobs?

Usa un patrón de dead man's switch. Cada job hace ping a un servicio de monitoreo al tener éxito. Si no llega el ping, el monitor alerta:

```bash
#!/bin/bash
# Al final de un job exitoso
curl -s https://healthchecks.io/ping/your-uuid-here

# En caso de fallo
curl -s https://healthchecks.io/ping/your-uuid-here/fail
```

## Tips de Rendimiento

1. **Escalona los schedules de jobs.** Evita ejecutar múltiples jobs pesados al mismo tiempo:

```bash
# Mal: todos a medianoche
0 0 * * * /usr/local/bin/backup.sh
0 0 * * * /usr/local/bin/cleanup.sh
0 0 * * * /usr/local/bin/report.sh

# Bien: escalar por 30 minutos
0 0 * * * /usr/local/bin/backup.sh
30 0 * * * /usr/local/bin/cleanup.sh
0 1 * * * /usr/local/bin/report.sh
```

2. **Usa jitter para jobs distribuidos.** Añade delay aleatorio para prevenir thundering herd:

```python
import random
import time

def run_with_jitter(max_delay=300):
    delay = random.randint(0, max_delay)
    time.sleep(delay)
    run_job()
```

3. **Setea timeouts.** Previene jobs desbocados que consuman recursos:

```bash
# Matar job después de 1 hora
0 3 * * * timeout 3600 /usr/local/bin/backup.sh
```

```yaml
# Kubernetes CronJob
spec:
  jobTemplate:
    spec:
      activeDeadlineSeconds: 3600
```

4. **Limpia artefactos antiguos de jobs.** Setea políticas de retención:

```bash
# Borrar backups mayores a 30 días
0 4 * * * find /backup -name "*.sql" -mtime +30 -delete
```

```yaml
# Kubernetes CronJob
spec:
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
```
