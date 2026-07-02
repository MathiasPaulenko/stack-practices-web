---
contentType: recipes
slug: docker-logging-fluentd
title: "Centraliza Logs de Contenedores con Fluentd y Docker"
description: "Recolecta, filtra y reenvía logs de contenedores Docker a Elasticsearch, S3 o stdout usando Fluentd como driver de logging o sidecar."
metaDescription: "Centraliza logs de contenedores Docker con el driver Fluentd. Configura fluentd.conf, filtra logs, reenvía a Elasticsearch, S3 y logging JSON estructurado."
difficulty: intermediate
topics:
  - devops
  - observability
tags:
  - docker
  - fluentd
  - logging
  - elasticsearch
  - log-aggregation
  - observability
relatedResources:
  - /recipes/devops/docker-network-isolation
  - /recipes/devops/docker-health-check-configuration
  - /recipes/devops/docker-compose-dev-prod-split
  - /guides/observability-guide
  - /guides/structured-logging-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Centraliza logs de contenedores Docker con el driver Fluentd. Configura fluentd.conf, filtra logs, reenvía a Elasticsearch, S3 y logging JSON estructurado."
  keywords:
    - docker fluentd logging
    - docker log aggregation
    - fluentd docker driver
    - docker centralized logging
    - fluentd elasticsearch docker
    - container log management
---

## Visión General

Los contenedores Docker generan logs en stdout y stderr. Por defecto, estos van a archivos JSON en el host. Fluentd es un recolector de logs open-source que puede interceptar logs de contenedores, enriquecerlos con metadatos, filtrarlos y reenviarlos a destinos como Elasticsearch, S3, Kafka o stdout. Esta recipe muestra tanto el driver de logging Fluentd de Docker como el patrón sidecar.

## Cuándo Usar

- Necesitas agregación centralizada de logs entre múltiples contenedores
- Quieres enriquecer logs con metadatos de contenedor (nombre, imagen, labels)
- Necesitas filtrar o transformar logs antes de almacenarlos
- Reenvías logs a Elasticsearch, S3, Kafka u otros destinos

## Solución

### Fluentd como driver de logging de Docker

```bash
# Iniciar Fluentd primero
docker run -d \
    --name fluentd \
    -p 24224:24224 \
    -p 24224:24224/udp \
    -v $(pwd)/fluentd.conf:/fluentd/etc/fluent.conf \
    fluent/fluentd:v1.16

# Ejecutar contenedores con driver fluentd
docker run -d \
    --name api \
    --log-driver fluentd \
    --log-opt fluentd-address=localhost:24224 \
    --log-opt tag="docker.{{.Name}}" \
    my-api:latest
```

### Archivo de configuración de Fluentd

```apache
# fluentd.conf

# Source: recibir logs del driver fluentd de Docker
<source>
    @type forward
    port 24224
    bind 0.0.0.0
</source>

# Filter: añadir metadatos de contenedor
<filter docker.**>
    @type record_transformer
    <record>
        hostname ${hostname}
        timestamp ${time}
        source "docker"
    </record>
</filter>

# Filter: parsear logs JSON de la aplicación
<filter docker.**>
    @type parser
    key_name log
    reserve_data true
    <parse>
        @type json
    </parse>
</filter>

# Match: enviar a Elasticsearch
<match docker.**>
    @type elasticsearch
    host elasticsearch
    port 9200
    index_name docker-logs
    type_name _doc
    flush_interval 5s
</match>

# Match: enviar errores a stdout para debugging
<match docker.**>
    @type stdout
</match>
```

### Docker Compose con Fluentd + Elasticsearch + Kibana

```yaml
# docker-compose.yml
services:
    fluentd:
        image: fluent/fluentd:v1.16
        ports:
            - "24224:24224"
            - "24224:24224/udp"
        volumes:
            - ./fluentd.conf:/fluentd/etc/fluent.conf
        depends_on:
            - elasticsearch
        networks:
            - logging

    elasticsearch:
        image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
        environment:
            - discovery.type=single-node
            - xpack.security.enabled=false
        ports:
            - "9200:9200"
        networks:
            - logging

    kibana:
        image: docker.elastic.co/kibana/kibana:8.13.0
        ports:
            - "5601:5601"
        environment:
            - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
        depends_on:
            - elasticsearch
        networks:
            - logging

    api:
        build: .
        logging:
            driver: fluentd
            options:
                fluentd-address: localhost:24224
                tag: docker.api
        depends_on:
            - fluentd
        networks:
            - logging

networks:
    logging:
        driver: bridge
```

### Patrón sidecar para recolección de archivos de log

```yaml
# docker-compose.yml — sidecar lee archivos de log desde volumen compartido
services:
    api:
        build: .
        volumes:
            - api-logs:/var/log/app
        # La app escribe logs a /var/log/app/app.log

    fluentd-sidecar:
        image: fluent/fluentd:v1.16
        volumes:
            - api-logs:/var/log/app
            - ./fluentd-sidecar.conf:/fluentd/etc/fluent.conf
        # Fluentd hace tail del archivo de log

volumes:
    api-logs:
```

```apache
# fluentd-sidecar.conf — tail de archivos de log
<source>
    @type tail
    path /var/log/app/app.log
    pos_file /var/log/app/app.log.pos
    tag app.api
    <parse>
        @type json
        time_key timestamp
        time_format %Y-%m-%dT%H:%M:%S.%LZ
    </parse>
</source>

<match app.**>
    @type elasticsearch
    host elasticsearch
    port 9200
    index_name app-logs
    flush_interval 5s
</match>
```

### Reenviar a AWS S3

```apache
# fluentd.conf — output a S3
<match docker.**>
    @type s3
    aws_key_id "#{ENV['AWS_ACCESS_KEY_ID']}"
    aws_sec_key "#{ENV['AWS_SECRET_ACCESS_KEY']}"
    s3_bucket my-log-bucket
    s3_region us-east-1
    path logs/
    buffer_path /var/log/fluent/s3
    time_slice_format %Y%m%d
    time_slice_wait 10m
    flush_interval 30s
</match>
```

### Logging JSON estructurado desde tu app

```javascript
// Node.js — logging estructurado para Fluentd
const logger = {
    info(message, meta = {}) {
        console.log(JSON.stringify({
            level: "info",
            message,
            timestamp: new Date().toISOString(),
            service: "api",
            ...meta
        }));
    },
    error(message, meta = {}) {
        console.error(JSON.stringify({
            level: "error",
            message,
            timestamp: new Date().toISOString(),
            service: "api",
            ...meta
        }));
    }
};

logger.info("Request received", { method: "GET", path: "/users", duration: 12 });
```

```python
import json
import logging

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "level": record.levelname.lower(),
            "message": record.getMessage(),
            "timestamp": self.formatTime(record),
            "service": "api",
        }
        return json.dumps(log_data)

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler])
```

## Explicación

Docker soporta múltiples drivers de logging. El driver `fluentd` envía stdout/stderr del contenedor directamente a una instancia de Fluentd vía el protocolo Forward.

Dos patrones:

- **Driver de logging**: Docker envía logs a Fluentd automáticamente. Sin cambios en la app. Los logs se interceptan a nivel del daemon de Docker. Mejor para apps containerizadas que loguean a stdout.
- **Sidecar**: Un contenedor Fluentd corre junto a la app, leyendo archivos de log desde un volumen compartido. Mejor para apps que escriben a archivos de log en lugar de stdout.

Pipeline de Fluentd: **source** (ingesta) → **filter** (transformar/enriquecer) → **match** (output). Los sources incluyen `forward` (driver Docker), `tail` (seguir archivos), `http` (endpoint HTTP). Los filters incluyen `record_transformer` (añadir campos), `parser` (parsear formatos), `grep` (filtrar por contenido). Los outputs incluyen `elasticsearch`, `s3`, `kafka`, `stdout`, `file`.

Conceptos clave:
- **tag**: Etiqueta flujos de log para enrutamiento. Los tags del driver Docker usan el patrón `docker.{{.Name}}`.
- **buffer**: Fluentd almacena logs en buffer antes de hacer flush al destino. Previene pérdida de datos durante outages.
- **flush_interval**: Cada cuánto se envían los logs en buffer. Valores más bajos significan casi tiempo real pero más peticiones.

## Variantes

| Patrón | Origen de Log | Complejidad | Usar Cuando |
|---------|-----------|------------|----------|
| Driver Docker | stdout/stderr | Baja | Apps loguean a stdout |
| Sidecar | Archivos de log | Media | Apps escriben a archivos |
| Input HTTP | HTTP POST | Media | Apps envían logs vía HTTP |
| Input syslog | syslog | Media | Apps syslog legacy |

## Pautas

- Usar el driver de logging Fluentd para apps que loguean a stdout/stderr.
- Usar el patrón sidecar para apps que escriben a archivos de log.
- Siempre parsear logs como JSON para queries estructuradas en Elasticsearch.
- Añadir metadatos (hostname, nombre de servicio, nombre de contenedor) con `record_transformer`.
- Usar buffering para prevenir pérdida de logs durante outages del destino.
- Configurar `flush_interval` a 5-30s según requisitos de latencia.
- Usar redes de Docker Compose para aislar la infraestructura de logging.
- Monitorear Fluentd mismo — si cae, los logs se pierden.
- Usar `--log-opt mode=non-blocking` para prevenir stalls de contenedores cuando Fluentd es lento.

## Errores Comunes

- No iniciar Fluentd antes que los contenedores que usan el driver fluentd. Los contenedores fallan al arrancar.
- Usar modo bloqueante (por defecto). Si Fluentd es lento, los contenedores se stallan. Usar `mode=non-blocking`.
- No parsear logs como JSON. Logs no estructurados son difíciles de query en Elasticsearch.
- No usar buffer en output. Si Elasticsearch está caído, los logs se pierden. Siempre configurar buffers.
- Enviar todos los logs a un solo índice. Usar índices diarios (`index_name docker-logs-%Y%m%d`) para gestión más fácil.
- No configurar límites de memoria en Fluentd. Volumen alto de logs puede causar OOM kills.
- Olvidar rotar archivos de buffer de Fluentd. Pueden llenar el disco con el tiempo.

## Preguntas Frecuentes

### ¿Qué pasa si Fluentd está caído cuando se usa el driver de logging?

En modo bloqueante (por defecto), Docker bloquea el proceso del contenedor hasta que Fluentd se recupera. En modo non-blocking (`mode=non-blocking`), Docker descarta logs. Siempre usar modo non-blocking en producción con un límite `max-buffer-size`.

### Fluentd vs Fluent Bit — ¿cuál debo usar?

Fluent Bit es más ligero (basado en C, ~2MB) e ideal para recolección en el edge (Kubernetes DaemonSet). Fluentd es más rico (basado en Ruby) con más plugins. Patrón común: Fluent Bit en nodos → Fluentd agregador → destino.

### ¿Cómo testeo mi configuración de Fluentd?

```bash
# Enviar un log de test
echo '{"key":"value"}' | fluent-cat docker.test -h localhost -p 24224

# Verificar logs de Fluentd
docker logs fluentd
```

### ¿Puedo usar Fluentd con Docker Swarm?

Sí. Despliega Fluentd como servicio global (uno por nodo). Configura contenedores con `--log-driver fluentd` apuntando a la instancia de Fluentd del nodo. Usa una red overlay para el tier agregador.
