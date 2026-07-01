---
contentType: guides
slug: log-aggregation-guide
title: "Agregación de Logs — Centraliza, Busca y Analiza Logs a Escala"
description: "Guía práctica sobre agregación de logs: logs estructurados, estrategias de envío, políticas de retención y construcción de pipelines de logs consultables con ELK, Loki y soluciones nativas de la nube."
metaDescription: "Aprende agregación de logs: logs estructurados, estrategias de envío, políticas de retención y pipelines consultables con ELK, Loki y soluciones nativas."
difficulty: intermediate
topics:
  - observability
  - devops
  - infrastructure
tags:
  - log-aggregation
  - elk
  - loki
  - structured-logging
  - elasticsearch
  - splunk
  - guide
relatedResources:
  - /guides/observability/distributed-tracing-guide
  - /guides/observability/metrics-and-dashboards-guide
  - /guides/observability/alert-management-guide
  - /guides/devops/observability-guide
  - /guides/devops/opentelemetry-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende agregación de logs: logs estructurados, estrategias de envío, políticas de retención y pipelines consultables con ELK, Loki y soluciones nativas."
  keywords:
    - log-aggregation
    - elk
    - loki
    - structured-logging
    - elasticsearch
    - splunk
    - guide
---

## Descripción General

La agregación de logs recolecta logs de todos los servicios, sistemas e infraestructura en una plataforma centralizada y consultable. Transforma archivos de texto dispersos en una señal de observabilidad consultable, permitiendo depuración rápida, auditoría de seguridad y visibilidad operativa en sistemas distribuidos.

Esta guía cubre logging estructurado, estrategias de envío, optimización de almacenamiento y selección de plataformas.

## Cuándo Usar

- Operas más de 5 servicios y necesitas correlacionar logs entre ellos
- Depurar requiere buscar a través de múltiples servidores o contenedores
- Necesitas alertas basadas en logs para errores y anomalías
- Seguridad o cumplimiento requiere logs de auditoría centralizados
- Tu logging actual es ad-hoc e inconsistente entre equipos

## Conceptos Clave

| Concepto | Descripción |
|---------|-------------|
| **Logging Estructurado** | Emitir logs como JSON o pares clave-valor en lugar de texto libre |
| **Log Shipper** | Agente que lee logs locales y los reenvía a un almacén central |
| **Índice** | Partición de almacenamiento consultable organizada por tiempo o fuente |
| **Política de Retención** | Reglas que determinan cuánto tiempo se conservan los logs antes de eliminarse |
| **Parsing de Logs** | Extraer campos de líneas de log en bruto al ingerir o consultar |
| **Almacenamiento Hot/Warm/Cold** | Almacenamiento por niveles basado en frecuencia de acceso y antigüedad |

## Arquitecturas de Agregación de Logs

```
┌──────────┐   ┌──────────┐   ┌──────────┐
│  App 1   │   │  App 2   │   │  App N   │
│ (stdout) │   │ (stdout) │   │ (stdout) │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
           ┌────────▼────────┐
           │  Log Shipper    │  (Filebeat, Fluent Bit, Vector)
           │  (Parse + Enrich)│
           └────────┬────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
   ┌─────▼─────┐        ┌─────▼─────┐
   │  Indexer  │        │  Object   │
   │(Elasticsearch│      │  Storage  │
   │   Loki)    │        │  (S3/GCS) │
   └─────┬─────┘        └───────────┘
         │
   ┌─────▼─────┐
   │ Dashboard │
   │(Kibana/Grafana)
   └───────────┘
```

## Configuración de Agregación de Logs Paso a Paso

### 1. Adopta Logging Estructurado

Haz que los logs sean parseables por máquinas desde la fuente:

```python
# Ejemplo: Logging estructurado en Python con structlog
import structlog
import logging
import sys

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Log estructurado
logger.info(
    "payment_processed",
    payment_id="pay-123",
    amount=99.99,
    currency="USD",
    user_id="user-456",
    duration_ms=145
)
# Salida: {"event": "payment_processed", "payment_id": "pay-123", "amount": 99.99, ...}
```

```javascript
// Ejemplo: Logging estructurado en Node.js con pino
const pino = require('pino');
const logger = pino({ level: 'info' });

logger.info({
  msg: 'payment_processed',
  paymentId: 'pay-123',
  amount: 99.99,
  currency: 'USD',
  userId: 'user-456',
  durationMs: 145
});
```

**Lo que funciona para logging estructurado:**
- Siempre loguea como JSON en producción
- Usa nombres de campo consistentes (snake_case recomendado)
- Incluye trace_id, span_id y request_id en cada log
- Añade campos contextuales (user_id, tenant_id, request_path) al inicio de la petición
- Nunca loguees PII o secretos

### 2. Envía Logs al Almacén Central

Elige y configura un log shipper:

| Shipper | Mejor Para | Pros | Contras |
|---------|------------|------|---------|
| **Filebeat** | Stack ELK | Maduro, módulos ricos | Consumo de recursos elevado |
| **Fluent Bit** | Kubernetes, embebido | Ligero, rápido | Menos maduro que Fluentd |
| **Vector** | Alto rendimiento | Basado en Rust, performante | Ecosistema más pequeño |
| **Promtail** | Loki | Integración nativa con Loki | Solo Loki |

```yaml
# Ejemplo: Configuración de Fluent Bit para Kubernetes
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*.log
        Parser            docker
        DB                /var/log/flb_kube.db

    [FILTER]
        Name              kubernetes
        Match             kube.*
        Merge_Log         On
        Keep_Log          Off

    [OUTPUT]
        Name              loki
        Match             kube.*
        Host              loki.monitoring.svc
        Labels            job=fluentbit
```

```yaml
# Ejemplo: Configuración de Filebeat para Elasticsearch
filebeat.inputs:
  - type: log
    paths:
      - /var/log/myapp/*.log
    fields:
      service: myapp
      environment: production
    fields_under_root: true
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["https://elasticsearch:9200"]
  index: "myapp-logs-%{+yyyy.MM.dd}"
```

**Lo que funciona para el envío:**
- Usa shippers conscientes de backpressure que no fallen el host
- Añade metadatos (host, servicio, entorno) a nivel del shipper
- Almacena en buffer local para sobrevivir cortes de red temporales
- Usa TLS para todo el transporte de logs

### 3. Diseña Retención y Almacenamiento

Equilibra costo con capacidad de consulta:

| Nivel de Almacenamiento | Retención | Velocidad de Consulta | Costo |
|------------------------|-----------|----------------------|-------|
| **Hot** | 1-7 días | Instantánea | Alto |
| **Warm** | 7-30 días | Segundos | Medio |
| **Cold** (S3/GCS) | 30-365 días | Minutos | Bajo |
| **Archivo** | 1-7 años | Solo batch | Muy bajo |

```yaml
# Ejemplo: Política ILM de Elasticsearch
PUT _ilm/policy/logs_policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {},
          "allocate": { "require": { "data": "cold" } }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

**Reglas de retención:**
- Logs de error: Conservar más tiempo (90+ días) que logs de acceso (30 días)
- Logs de seguridad/auditoría: Conservar 1-7 años según requisitos de cumplimiento
- Logs de debug: Conservar solo en almacenamiento hot (1-3 días)
- Archiva a almacenamiento de objetos antes de eliminar para cumplimiento

### 4. Consulta y Analiza Logs

Haz que tus logs agregados sean útiles:

```kibana
# Ejemplo: KQL (Lenguaje de Consulta de Kibana)

# Encuentra errores en un servicio específico
service.name:orders-service and level:error

# Encuentra peticiones lentas (>1s)
duration_ms > 1000

# Encuentra peticiones para un usuario específico
user_id:user-123

# Cuenta errores por servicio
service.name:* and level:error | stats count() by service.name

# Encuentra excepciones en rango de tiempo
@timestamp:[now-1h TO now] and exception.class:*
```

```logql
# Ejemplo: LogQL (Grafana Loki)

# Busca errores en un servicio
{job="orders-service"} |= "ERROR"

# Cuenta errores por minuto
sum(rate({job="orders-service"} |= "ERROR" [1m]))

# Encuentra consultas lentas a base de datos
{job="orders-service"} |= "duration_ms" | json | duration_ms > 500

# Extrae y grafica montos de pagos
{job="payment-service"} |= "payment_processed" | json | line_format "{{.amount}}"
```

**Lo que funciona para consultar:**
- Aprende el lenguaje de consulta de tu plataforma elegida (KQL, LogQL, SPL)
- Guarda consultas comunes como dashboards o alertas
- Usa métricas basadas en logs para dashboards (más rápido que consultas de logs en bruto)
- Correlaciona logs con trazas usando campos trace_id

### 5. Construye Alertas Basadas en Logs

Detecta problemas desde patrones de logs:

```yaml
# Ejemplo: Regla de alerta de Grafana para tasa de error
apiVersion: 1
groups:
  - name: log_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({job=~".*"} |= "ERROR" [5m])) by (job)
          /
          sum(rate({job=~".*"} [5m])) by (job)
          > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: SlowPayments
        expr: |
          avg_over_time(
            {job="payment-service"} |= "payment_processed" | json | duration_ms [10m]
          ) > 500
        labels:
          severity: warning
```

**Patrones de alerta:**
- Pico en tasa de error: `% de logs de error / total de logs > umbral`
- Nuevo patrón de error: `Cantidad de tipos únicos de excepción aumentó`
- Logs faltantes: `Volumen de logs cayó por debajo de la línea base esperada`
- Evento de seguridad: `Coincidencia de patrones conocidos de ataque`

## Lo que funciona

- **Estandariza niveles de log.** Usa ERROR, WARN, INFO, DEBUG consistentemente en todos los servicios.
- **Incluye IDs de correlación.** Cada log debe tener trace_id, span_id o request_id para depuración entre servicios.
- **Evita loguear en bucles ajustados.** Agrupa o saltea logs de bucle para prevenir inundación de logs.
- **Muestrea logs de alto volumen.** No cada petición necesita logging debug completo.
- **Monitoriza el pipeline.** Alerta si el envío de logs se retrasa o el almacenamiento se llena.
- **Documenta tu esquema.** Los equipos necesitan saber qué campos están disponibles para consultas.

## Errores Comunes

- **Logs no estructurados en todas partes.** Parsear logs de texto al ingerir es frágil y lento.
- **Sin estrategia de retención.** Los costos de almacenamiento crecen exponencialmente sin políticas de ciclo de vida.
- **Sobre-logueo.** Logs de nivel debug en producción abruman el pipeline y ocultan problemas reales.
- **Contexto faltante.** Logs sin nombre de servicio, entorno o trace IDs son casi inútiles.
- **Ignorar backpressure.** Log shippers que fallan bajo carga crean puntos ciegos.

## Variantes

- **Nativo de nube:** AWS CloudWatch Logs, Google Cloud Logging, Azure Monitor Logs (gestionado, pero específico de proveedor)
- **Stack open-source:** ELK (Elasticsearch, Logstash, Kibana) o PLG (Promtail, Loki, Grafana)
- **Empresarial:** Splunk, Datadog, Sumo Logic (amplias capacidades, mayor costo)
- **Agregación edge:** Agregación de logs local antes del envío central (reduce costo de red)

## FAQ

**P: ¿Debería usar ELK o Loki?**
ELK es más maduro y capaz. Loki es más simple, más barato a escala y se integra nativamente con Grafana. Elige ELK para búsquedas complejas; Loki para observabilidad eficiente en costo.

**P: ¿Cómo manejo logs multi-línea (stack traces)?**
Usa log shippers con parsing multilínea (Filebeat `multiline.pattern`, Fluent Bit `multiline.parser`) o loguea directamente como JSON con el stack trace como un campo único.

**P: ¿Cuánto cuesta la agregación de logs?**
A gran escala, el almacenamiento de logs suele ser tu mayor costo de observabilidad. Usa muestreo, políticas de retención agresivas y almacenamiento por niveles para controlar costos.

**P: ¿Puedo usar logs para métricas?**
Sí — la mayoría de plataformas soportan métricas basadas en logs (contar líneas de log en el tiempo, extraer campos numéricos). Esto evita doble instrumentación pero es menos eficiente que métricas dedicadas.

## Conclusión

La agregación de logs transforma la salida dispersa de aplicaciones en una plataforma unificada de depuración y auditoría. Al adoptar logging estructurado, elegir la estrategia de envío correcta y diseñar políticas de retención inteligentes, construyes una base de observabilidad que escala con tu infraestructura.
