---
contentType: recipes
slug: scheduled-jobs
title: "Ejecutar Jobs Programados con Funciones Serverless"
description: "Cómo reemplazar cron jobs con funciones serverless programadas para backups, reportes, limpieza y tareas de mantenimiento periódico."
metaDescription: "Aprende jobs programados serverless. Reemplaza cron con Lambda, Cloud Scheduler o Azure Timer Triggers para backups automatizados, reportes y tareas de mantenimiento."
difficulty: beginner
topics:
  - serverless
tags:
  - serverless
  - cron
relatedResources:
  - /recipes/serverless-api-gateway
  - /recipes/event-driven-functions
  - /recipes/cron-jobs
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende jobs programados serverless. Reemplaza cron con Lambda, Cloud Scheduler o Azure Timer Triggers para backups automatizados, reportes y tareas de mantenimiento."
  keywords:
    - jobs programados serverless
    - cron lambda
    - cloud scheduler
    - serverless automation
    - tareas periodicas
    - cron jobs cloud
---

## Visión general

Las tareas programadas — backups, generación de reportes, limpieza de caché — han tradicionalmente corrido en servidores dedicados con cron. Si el servidor reinicia o el daemon de cron falla, los jobs dejan de ejecutarse silenciosamente. La programación serverless reemplaza esto con funciones gestionadas disparadas por eventos temporizados que corren sin servidores que mantener.

AWS EventBridge rules disparan funciones Lambda en expresiones cron. Google Cloud Scheduler publica en Pub/Sub o endpoints HTTP. Azure Timer Triggers despierta Functions en horarios programados. Los tres garantizan ejecución, reintentan invocaciones fallidas, y loguean resultados sin ningún sistema operativo que gestionar.

## Cuándo usarlo

Usa esta receta cuando:

- Reemplazas jobs cron que corren en EC2 o máquinas virtuales. Consulta [Serverless Functions](/recipes/messaging/event-driven-microservices) para deployar código serverless.
- Generando reportes diarios, semanales o mensuales de datos de aplicación. Consulta [Parse JSON](/recipes/data/parse-json) para manejar formatos de datos de reportes.
- Limpiando logs viejos, archivos temporales o registros de base de datos expirados
- Calentando caches o pre-computando agregaciones antes del tráfico pico
- Enviando notificaciones, recordatorios o newsletters programados
- Ejecutando mantenimiento de base de datos (VACUUM, rebuilds de índices, actualizaciones de estadísticas). Consulta [PostgreSQL Query Optimization](/recipes/databases/postgres-query-optimization) para tuning de rendimiento de base de datos.

## Solución

### AWS Lambda + EventBridge (Python)

```python
import json
import boto3
from datetime import datetime, timedelta

def lambda_handler(event, context):
    # Corre todos los días a las 2 AM UTC
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')

    # Genera reporte diario
    report = generate_sales_report(yesterday)

    # Sube a S3
    s3 = boto3.client('s3')
    s3.put_object(
        Bucket='reports.example.com',
        Key=f'daily/{yesterday}.json',
        Body=json.dumps(report)
    )

    return {'statusCode': 200, 'body': f'Report {yesterday} generated'}
```

### EventBridge Rule (Terraform)

```hcl
resource "aws_cloudwatch_event_rule" "daily_report" {
  name                = "daily-report-trigger"
  description         = "Trigger report generator every day at 2 AM UTC"
  schedule_expression = "cron(0 2 * * ? *)"
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule = aws_cloudwatch_event_rule.daily_report.name
  arn  = aws_lambda_function.report_generator.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.report_generator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_report.arn
}
```

### Google Cloud Scheduler (YAML)

```yaml
job:
  name: daily-cleanup
  schedule: "0 2 * * *"
  timeZone: UTC
  httpTarget:
    uri: https://us-central1-project.cloudfunctions.net/cleanupFunction
    httpMethod: POST
    oidcToken:
      serviceAccountEmail: scheduler@project.iam.gserviceaccount.com
```

## Explicación

- **Expresiones cron**: La sintaxis `cron(0 2 * * ? *)` significa "a las 2:00 AM UTC todos los días". EventBridge soporta cron standard con un wildcard `?` para día-de-semana o día-de-mes.
- **Idempotencia**: Las funciones programadas pueden ejecutarse dos veces si un error ocurre durante la primera invocación y EventBridge reintenta. Diseña jobs que sean seguros de ejecutar múltiples veces (ej. usa UPSERT, no INSERT).
- **Timeouts**: Lambda tiene un máximo de 15 minutos de ejecución. Para jobs más largos, usa Step Functions para orquestar múltiples invocaciones de Lambda o cambia a AWS Batch.
- **Monitoreo**: CloudWatch Logs captura output de funciones. Configura alarmas en tasas de error y duración de ejecución. Usa CloudWatch Insights para consultar historial de jobs programados.

## Variantes

| Plataforma | Scheduler | Trigger | Mejor para |
|------------|-----------|---------|------------|
| AWS | EventBridge | Lambda | Integración profunda AWS, chaining con Step Functions |
| GCP | Cloud Scheduler | Cloud Functions / Pub/Sub | Pricing competitivo, integración BigQuery |
| Azure | Timer Trigger | Azure Functions | Ecosistema .NET, integración Visual Studio |

## Mejores prácticas

- **Mantén jobs stateless e idempotentes**: almacena progreso en DynamoDB o Redis, no en memoria. Si la función timeout y se reinicia, debería reanudar limpiamente.
- **Usa Step Functions para workflows multi-paso**: si un job programado tiene pasos secuenciales (extract, transform, load), orquéstralos con Step Functions en lugar de una Lambda masiva.
- **Programa durante horas de menor tráfico**: corre jobs CPU-intensivos cuando el tráfico de usuarios es más bajo para evitar contención de recursos.
- **Envía notificaciones en falla**: integra con SNS o webhooks de Slack para que el equipo sepa cuando un job programado crítico falla.
- **Archiva outputs viejos**: los reportes diarios se acumulan rápidamente. Mueve archivos viejos a Glacier o elimínalos después de un período de retención.

## Errores comunes

- **Ejecutar jobs largos en Lambda**: exceder el límite de 15 minutos causa fallas duras. Usa Batch, ECS o Step Functions para procesamiento de horas.
- **No manejar timezone correctamente**: los horarios cron están en UTC. Un job programado para "medianoche" puede ejecutarse a una hora local inesperada durante transiciones de horario de verano.
- **Faltar lógica de retry**: fallas transientes (timeouts de conexión a base de datos) deberían reintentar con backoff exponencial. Las dead letter queues capturan fallas persistentes.
- **Hardcodear fechas en tests**: tests que solo pasan el día que fueron escritos fallan en CI. Usa inyección de dependencias para la fecha/hora actual.

## Preguntas frecuentes

**P: ¿Cuál es la frecuencia máxima para funciones programadas serverless?**
R: AWS EventBridge soporta frecuencias de hasta 1 minuto. GCP Cloud Scheduler soporta 1 minuto. Para intervalos sub-minuto, usa CloudWatch Events con lógica custom o cambia a un proceso corriendo continuamente.

**P: ¿Pueden las funciones programadas acceder a recursos de VPC?**
R: Sí. Configura Lambda con networking de VPC para acceder a RDS privado, ElastiCache o instancias EC2. Esto agrega latencia de cold start porque los ENIs deben provisionarse.

**P: ¿Cómo debuggeo una función programada que falla intermitentemente?**
R: CloudWatch Logs muestra el error. Agrega logging estructurado JSON con request IDs. Para problemas de memoria o timeout, aumenta la memoria asignada a la función (que también aumenta CPU).

**P: ¿Es la programación serverless más barata que un VPS de $5/mes con cron?**
R: Para jobs muy infrecuentes (semanal o mensual), sí. Para jobs que corren cada minuto, un VPS pequeño puede ser más barato. Calcula basado en duración de ejecución y frecuencia.

