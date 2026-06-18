---
contentType: recipes
slug: cron-jobs
title: "Cron Jobs"
description: "Cómo programar y gestionar tareas recurrentes usando sintaxis cron en Linux, Python y Node.js."
metaDescription: "Ejemplos prácticos de cron jobs en Linux, Python (librería schedule) y Node.js (node-cron). Aprende sintaxis cron, patrones de scheduling y mejores prácticas."
difficulty: beginner
topics:
  - devops
tags:
  - automation
  - cron
  - devops
  - javascript
  - linux
  - nodejs
  - python
  - scheduling
relatedResources:
  - /recipes/docker-basics
  - /recipes/git-workflow
  - /patterns/design/observer-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de cron jobs en Linux, Python (librería schedule) y Node.js (node-cron). Aprende sintaxis cron, patrones de scheduling y mejores prácticas."
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

- Ejecutas tareas periódicas en un servidor (backups, limpiezas, reportes)
- Programas trabajos en background dentro de una aplicación
- Reemplazas procesos manuales con scripts automatizados
- Coordinas ejecución de trabajos distribuidos

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

## Mejores prácticas

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
