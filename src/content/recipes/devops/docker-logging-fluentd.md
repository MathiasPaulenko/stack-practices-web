---
contentType: recipes
slug: docker-logging-fluentd
title: "Centralize Container Logs with Fluentd and Docker"
description: "Collect, filter, and forward Docker container logs to Elasticsearch, S3, or stdout using Fluentd as a logging driver or sidecar."
metaDescription: "Centralize Docker container logs with Fluentd logging driver. Configure fluentd.conf, filter logs, forward to Elasticsearch, S3, and structured JSON logging."
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
  - /guides/structured-logging
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Centralize Docker container logs with Fluentd logging driver. Configure fluentd.conf, filter logs, forward to Elasticsearch, S3, and structured JSON logging."
  keywords:
    - docker fluentd logging
    - docker log aggregation
    - fluentd docker driver
    - docker centralized logging
    - fluentd elasticsearch docker
    - container log management
---

## Overview

Docker containers generate logs on stdout and stderr. By default, these go to JSON files on the host. Fluentd is an open-source log collector that can intercept container logs, enrich them with metadata, filter them, and forward to destinations like Elasticsearch, S3, Kafka, or stdout. This recipe shows both the Docker Fluentd logging driver and the sidecar pattern.

## When to Use

- You need centralized log aggregation across multiple containers
- You want to enrich logs with container metadata (name, image, labels)
- You need to filter or transform logs before storing them
- You forward logs to Elasticsearch, S3, Kafka, or other destinations

## Solution

### Fluentd as Docker logging driver

```bash
# Start Fluentd first
docker run -d \
    --name fluentd \
    -p 24224:24224 \
    -p 24224:24224/udp \
    -v $(pwd)/fluentd.conf:/fluentd/etc/fluent.conf \
    fluent/fluentd:v1.16

# Run containers with fluentd log driver
docker run -d \
    --name api \
    --log-driver fluentd \
    --log-opt fluentd-address=localhost:24224 \
    --log-opt tag="docker.{{.Name}}" \
    my-api:latest
```

### Fluentd configuration file

```apache
# fluentd.conf

# Source: receive logs from Docker fluentd driver
<source>
    @type forward
    port 24224
    bind 0.0.0.0
</source>

# Filter: add container metadata
<filter docker.**>
    @type record_transformer
    <record>
        hostname ${hostname}
        timestamp ${time}
        source "docker"
    </record>
</filter>

# Filter: parse JSON logs from application
<filter docker.**>
    @type parser
    key_name log
    reserve_data true
    <parse>
        @type json
    </parse>
</filter>

# Match: send to Elasticsearch
<match docker.**>
    @type elasticsearch
    host elasticsearch
    port 9200
    index_name docker-logs
    type_name _doc
    flush_interval 5s
</match>

# Match: send errors to stdout for debugging
<match docker.**>
    @type stdout
</match>
```

### Docker Compose with Fluentd + Elasticsearch + Kibana

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

### Sidecar pattern for log file collection

```yaml
# docker-compose.yml — sidecar reads log files from shared volume
services:
    api:
        build: .
        volumes:
            - api-logs:/var/log/app
        # App writes logs to /var/log/app/app.log

    fluentd-sidecar:
        image: fluent/fluentd:v1.16
        volumes:
            - api-logs:/var/log/app
            - ./fluentd-sidecar.conf:/fluentd/etc/fluent.conf
        # Fluentd tails the log file

volumes:
    api-logs:
```

```apache
# fluentd-sidecar.conf — tail log files
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

### Forward to AWS S3

```apache
# fluentd.conf — S3 output
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

### Structured JSON logging from your app

```javascript
// Node.js — structured logging for Fluentd
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

## Explanation

Docker supports multiple logging drivers. The `fluentd` driver sends container stdout/stderr directly to a Fluentd instance via the Forward protocol.

Two patterns:

- **Logging driver**: Docker sends logs to Fluentd automatically. No app changes needed. Logs are intercepted at the Docker daemon level. Best for containerized apps that log to stdout.
- **Sidecar**: A Fluentd container runs alongside the app, reading log files from a shared volume. Best for apps that write to log files instead of stdout.

Fluentd pipeline: **source** (ingest) → **filter** (transform/enrich) → **match** (output). Sources include `forward` (Docker driver), `tail` (file following), `http` (HTTP endpoint). Filters include `record_transformer` (add fields), `parser` (parse formats), `grep` (filter by content). Outputs include `elasticsearch`, `s3`, `kafka`, `stdout`, `file`.

Key concepts:
- **tag**: Labels log streams for routing. Docker driver tags use `docker.{{.Name}}` pattern.
- **buffer**: Fluentd buffers logs before flushing to the destination. Prevents data loss during outages.
- **flush_interval**: How often buffered logs are sent. Lower values mean near-real-time but more requests.

## Variants

| Pattern | Log Source | Complexity | Use When |
|---------|-----------|------------|----------|
| Docker driver | stdout/stderr | Low | Apps log to stdout |
| Sidecar | Log files | Medium | Apps write to files |
| HTTP input | HTTP POST | Medium | Apps send logs via HTTP |
| Syslog input | syslog | Medium | Legacy syslog apps |

## Guidelines

- Use the Fluentd logging driver for apps that log to stdout/stderr.
- Use the sidecar pattern for apps that write to log files.
- Always parse logs as JSON for structured querying in Elasticsearch.
- Add metadata (hostname, service name, container name) with `record_transformer`.
- Use buffering to prevent log loss during destination outages.
- Set `flush_interval` to 5-30s depending on latency requirements.
- Use Docker Compose networks to isolate logging infrastructure.
- Monitor Fluentd itself — if it goes down, logs are lost.
- Use `--log-opt mode=non-blocking` to prevent container stalls when Fluentd is slow.

## Common Mistakes

- Not starting Fluentd before containers using the fluentd driver. Containers fail to start.
- Using blocking mode (default). If Fluentd is slow, containers stall. Use `mode=non-blocking`.
- Not parsing logs as JSON. Unstructured logs are hard to query in Elasticsearch.
- Not buffering output. If Elasticsearch is down, logs are lost. Always configure buffers.
- Sending all logs to one index. Use daily indices (`index_name docker-logs-%Y%m%d`) for easier management.
- Not setting memory limits on Fluentd. High log volume can cause OOM kills.
- Forgetting to rotate Fluentd buffer files. They can fill disk space over time.

## Frequently Asked Questions

### What happens if Fluentd is down when using the logging driver?

In blocking mode (default), Docker blocks the container's process until Fluentd recovers. In non-blocking mode (`mode=non-blocking`), Docker drops logs. Always use non-blocking mode in production with a `max-buffer-size` limit.

### Fluentd vs Fluent Bit — which should I use?

Fluent Bit is lighter (C-based, ~2MB) and ideal for edge collection (Kubernetes DaemonSet). Fluentd is richer (Ruby-based) with more plugins. Common pattern: Fluent Bit on nodes → Fluentd aggregator → destination.

### How do I test my Fluentd configuration?

```bash
# Send a test log
echo '{"key":"value"}' | fluent-cat docker.test -h localhost -p 24224

# Check Fluentd logs
docker logs fluentd
```

### Can I use Fluentd with Docker Swarm?

Yes. Deploy Fluentd as a global service (one per node). Configure containers with `--log-driver fluentd` pointing to the node's Fluentd instance. Use an overlay network for the aggregator tier.
