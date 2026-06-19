---
contentType: recipes
slug: log-aggregation
title: "Agregación de Logs"
description: "Centraliza logs de servicios distribuidos con ELK, Fluentd y Loki para búsqueda, alertado y troubleshooting en producción."
metaDescription: "Agregación de logs para sistemas distribuidos: stack ELK, Fluentd, Grafana Loki, log shipping, parsing y troubleshooting centralizado a escala."
difficulty: intermediate
topics:
  - observability
tags:
  - log-aggregation
  - observability
  - devops
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /recipes/structured-logging
  - /recipes/distributed-tracing
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Agregación de logs para sistemas distribuidos: stack ELK, Fluentd, Grafana Loki, log shipping, parsing y troubleshooting centralizado a escala."
  keywords:
    - log-aggregation
    - observability
    - elk
    - devops
---
## Visión General

La agregación de logs centraliza registros de docenas o cientos de servicios en un único sistema searchable. En lugar de hacer SSH a servidores individuales, los equipos consultan un índice unificado para tracear requests a través de microservicios, investigar errores y detectar anomalías. Herramientas como el stack ELK, Fluentd y Grafana Loki han hecho el logging centralizado accesible para cualquier tamaño de equipo.

## Cuándo Usar

Usa este recurso cuando:
- El debugging requiere correlacionar logs de 5+ servicios para una única request de usuario
- Compliance manda retención de logs y storage a prueba de manipulación
- Necesitas alertado en tiempo real basado en patrones de log (spikes de error, eventos de seguridad)
- Los volúmenes de log exceden la capacidad de storage local en hosts individuales

## Solución

### Fluentd a Elasticsearch (Docker Compose)

```yaml
version: '3'
services:
  fluentd:
    image: fluent/fluentd:v1.16
    volumes:
      - ./fluent.conf:/fluentd/etc/fluent.conf
    ports:
      - "24224:24224"

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
```

```
# fluent.conf
<source>
  @type forward
  port 24224
</source>

<filter app.**>
  @type parser
  format json
  key_name log
</filter>

<match app.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix app
</match>
```

### Structured Logging con Correlation IDs (Node.js)

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

function logWithContext(req, message, meta = {}) {
  logger.info(message, {
    traceId: req.headers['x-trace-id'],
    userId: req.user?.id,
    service: 'order-service',
    ...meta
  });
}

// Uso
logWithContext(req, 'Order placed', { orderId: '123', amount: 99.99 });
```

### Loki Query (LogQL)

```bash
# Encontrar todos los error logs para un trace específico
{service="payment-service"} 
  |="error" 
  | json 
  | traceId="abc123"

# Rate de errores 500 por servicio
sum by (service) (
  rate(
    {level="error", status_code="500"}[5m]
  )
)
```

## Explicación

**Etapas del pipeline de logs**:
1. **Collection**: Fluent Bit, Promtail o Filebeat leen archivos de log locales
2. **Parsing**: Extraen campos estructurados de texto crudo (JSON, regex, grok)
3. **Enrichment**: Agregan metadata — labels de pods Kubernetes, IDs de instancias AWS, trace IDs
4. **Buffering**: Kafka o Redis absorben spikes antes de indexar
5. **Storage**: Elasticsearch, Loki o CloudWatch Logs indexan para búsqueda
6. **Query**: Kibana, Grafana o UIs custom para exploración

**Logs estructurados vs. no estructurados**:

| Tipo | Searchable? | Tamaño | Ejemplo |
|------|-------------|--------|---------|
| No estructurado | Solo regex | Grande | `ERROR: user login failed` |
| Estructurado | Filtros de campo | Compacto | `{"level":"error","event":"login_failed"}` |

## Variantes

| Stack | Componentes | Ideal Para |
|-------|-------------|------------|
| ELK | Elasticsearch, Logstash, Kibana | Full-text search; analytics complejos |
| EFK | Elasticsearch, Fluentd/Bit, Kibana | Kubernetes-native; agents livianos |
| PLG | Promtail, Loki, Grafana | Costo-eficiente; indexado basado en labels |
| Splunk | Universal Forwarder, Indexer | Enterprise; dashboards pre-construidos |
| CloudWatch | AWS Agent | AWS-native; integración IAM |

## Mejores Prácticas

- **Incluye correlation IDs**: Cada entrada de log debería tener un `traceId` vinculando el journey completo de la request
- **Loggea al nivel correcto**: DEBUG para desarrollo; INFO para operaciones normales; ERROR para issues accionables
- **No loggees secrets**: Enmascara PII, tokens y passwords antes de que lleguen al sistema de agregación
- **Setea políticas de retención**: 30 días de storage hot para troubleshooting; 1 año de archive cold para compliance
- **Alerta en patrones, no líneas individuales**: "5 ERRORs en 1 minuto" es más accionable que una línea de log

## Errores Comunes

1. **Loggear todo en INFO**: Crea ruido que oculta issues reales; usa DEBUG apropiadamente
2. **Sin estandarización de timezone**: Tiempos mixtos UTC y local hacen la correlación imposible
3. **Contexto de request faltante**: `ERROR: database connection failed` sin saber qué servicio o usuario es inútil
4. **Ignorar backpressure**: Agents de log que no pueden seguir el paso dropean logs silenciosamente durante spikes de tráfico
5. **Almacenar logs en la misma base de datos que datos de aplicación**: Compite por recursos; mantiene analysts fuera de producción

## Preguntas Frecuentes

**P: ¿Cómo manejo costos de alto volumen de logs?**
R: Samplea logs DEBUG, agrega métricas en el edge, y usa tiers de storage más baratos (S3, GCS) para logs viejos.

**P: ¿Debería agregar métricas o logs?**
R: Ambos. Métricas para dashboards y alertas. Logs para debugging y audit trails. No alertes solo con logs.

**P: ¿Cómo aseguro logs agregados?**
R: Acceso role-based, transporte encriptado (TLS), y storage encriptado (AES-256). Trata los logs como datos sensibles.
