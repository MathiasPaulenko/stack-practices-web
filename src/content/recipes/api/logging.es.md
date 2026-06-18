---
contentType: recipes
slug: logging
title: "Logging"
description: "Cómo implementar logging estructurado basado en niveles en Python, JavaScript y Java con mejores prácticas para observabilidad en producción."
metaDescription: "Ejemplos prácticos de logging en Python, JavaScript y Java. Aprende structured logging, niveles de log, rotación y patrones de observabilidad en producción."
difficulty: beginner
topics:
  - api
tags:
  - api
  - java
  - javascript
  - logging
  - loguru
  - observability
  - python
  - slf4j
  - structured-logging
  - winston
relatedResources:
  - /recipes/handle-errors
  - /recipes/middleware
  - /recipes/environment-variables
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de logging en Python, JavaScript y Java. Aprende structured logging, niveles de log, rotación y patrones de observabilidad en producción."
  keywords:
    - logging
    - structured logging
    - niveles de log
    - python logging
    - winston
    - slf4j
    - loguru
    - observabilidad
    - rotación de logs
    - logging en producción
---

## Visión general

El logging es la práctica de registrar eventos de aplicación, errores y estado para debugging, monitoreo y auditoría. Un buen logging es estructurado, basado en niveles e incluye metadata contextual (timestamps, request IDs, user IDs) sin exponer datos sensibles.

En producción, los logs son tu fuente primaria de verdad cuando las cosas fallan. Invierte en logging desde el principio.

## Cuándo usarlo

Usa esta recipe cuando:

- Debuggeas comportamiento de aplicación en producción
- Monitoreas errores, rendimiento y eventos de negocio
- Auditas acciones de usuarios para compliance o seguridad
- Construyes dashboards y alertas desde datos de log
- Traces requests a través de servicios distribuidos

## Solución

### Python (Loguru)

```python
from loguru import logger
import sys

# Configurar logging estructurado JSON para producción
logger.remove()
logger.add(sys.stdout, format="{time} {level} {message}", level="INFO")
logger.add("app.log", rotation="10 MB", retention="7 days", level="DEBUG")

# Uso
logger.debug("Processing user {}", user_id)
logger.info("User {} logged in", user_id)
logger.warning("Rate limit approaching for API key {}", api_key[:4])
logger.error("Database connection failed: {}", exc_info=True)

# Logging estructurado
logger.bind(request_id="abc-123").info("Request completed", extra={"duration_ms": 45})
```

### JavaScript (Winston)

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log', maxsize: 10_000_000, maxFiles: 5 }),
  ],
});

// Uso
logger.debug('Processing user %s', userId);
logger.info('User logged in', { userId });
logger.warn('Rate limit approaching', { apiKey: apiKey.slice(0, 4) });
logger.error('Database connection failed', { error });
```

### Java (SLF4J + Logback)

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    
    public void login(String userId) {
        logger.debug("Processing user {}", userId);
        logger.info("User {} logged in", userId);
        
        try {
            // ...
        } catch (Exception e) {
            logger.error("Database connection failed", e);
        }
    }
}
```

## Niveles de Log

| Nivel | Cuándo usar | Ejemplo |
|-------|-------------|---------|
| **DEBUG** | Info diagnóstica detallada | Valores de variables, iteraciones de loops |
| **INFO** | Eventos normales de la aplicación | Requests procesados, trabajos completados |
| **WARN** | Problemas recuperables | Uso de API deprecada, límite de rate cercano |
| **ERROR** | Operaciones fallidas | Timeout de base de datos, archivo no encontrado |
| **FATAL/CRITICAL** | Sistema inusable | Out of memory, disco lleno |

## Mejores prácticas

- **Usa logs estructurados JSON** en producción para parsing fácil por agregadores de logs (ELK, Datadog, CloudWatch)
- **Incluye correlation IDs**: Pasa un `request_id` a través de todos los logs en una cadena de request
- **Nunca loguees secretos**: Enmascara API keys, tokens y PII antes de loguear
- **Loguea al nivel correcto**: Usa DEBUG para dev, INFO para ops normales, WARN para anomalías, ERROR para fallos
- **Habilita rotación de logs**: Previene agotamiento de disco con rotación basada en tamaño o tiempo
- **Loguea excepciones con stack traces**: Siempre incluye el objeto de excepción, no solo el mensaje

## Errores comunes

- Loguear demasiado en nivel INFO, ahogando la señal en ruido
- Usar `print` o `console.log` en producción en lugar de un framework de logging
- Incluir contraseñas en bruto, tokens o PII en la salida de logs
- No configurar rotación de logs, llenando discos de servidor
- Tragar excepciones sin loguear el stack trace completo

## Agregación de logs y monitoreo

En producción, los archivos de log en bruto rara vez se leen directamente. En su lugar, los logs se envían a plataformas de agregación:

| Plataforma | Ideal para | Método de envío |
|------------|------------|-----------------|
| **ELK Stack** | Self-hosted, control total | Filebeat / Logstash |
| **Datadog** | SaaS, integración APM | Datadog Agent |
| **AWS CloudWatch** | Infraestructura AWS nativa | CloudWatch Agent |
| **Grafana Loki** | Kubernetes, stack Prometheus | Promtail |
| **Splunk** | Compliance empresarial | Universal Forwarder |

### Reglas de alertas

Configura alertas basadas en patrones de log:

- **Tasa de ERROR > 1%** en ventana de 5 minutos → PagerDuty / Slack
- **Log FATAL detectado** → Alerta inmediata al on-call
- **Uso de disco por logs > 80%** → Notificación al equipo de infraestructura
- **Sin logs del servicio por 10 minutos** → Alerta de health check (fallo silencioso)

### Dashboards

Construye dashboards que respondan estas preguntas:
- ¿Cuántos requests por minuto? (rate)
- ¿Cuál es el percentil 95 del tiempo de respuesta? (latencia)
- ¿Qué endpoints producen más errores? (desglose por ruta)
- ¿Cuál es la tendencia de errores en las últimas 24 horas?

## Preguntas frecuentes

**P: ¿Debería loguear cada request de API?**
R: Sí, en nivel INFO con método, path, status code y duración. Usa middleware para logging automático de requests.

**P: ¿Qué es structured logging y por qué usarlo?**
R: El structured logging genera JSON o pares clave-valor en lugar de texto plano. Habilita filtrado, agregación y alertas en sistemas de gestión de logs.

**P: ¿Cómo correlaciono logs entre microservicios?**
R: Genera un `trace_id` en el punto de entrada y propágalo a través de headers HTTP o metadata de mensajes. Inclúyelo en cada statement de log.

**P: ¿Cuánto tiempo debería retener logs de producción?**
R: Retén logs ERROR/FATAL por al menos 90 días para debugging. Logs INFO por 7-30 días dependiendo del volumen y coste. Archiva a almacenamiento frío (S3 Glacier) para compliance si es necesario.

**P: ¿Debería loguear en desarrollo de la misma forma que en producción?**
R: Usa la misma configuración de logger pero cambia el formato de salida: texto plano legible para local dev, JSON estructurado para producción. Esto previene sorpresas de "funciona en mi máquina" causadas por comportamiento de logging diferente.
