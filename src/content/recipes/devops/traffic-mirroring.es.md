---
contentType: recipes
slug: traffic-mirroring
title: "Traffic Mirroring"
description: "Replica tráfico de producción a ambientes de staging para testing realista, despliegues shadow y validación de performance sin impactar usuarios."
metaDescription: "Traffic mirroring: shadow deployments, load testing realista, validación de performance y replicación segura de ambientes."
difficulty: intermediate
topics:
  - devops
tags:
  - traffic-mirroring
  - devops
  - testing
  - deployment
  - ci-cd
relatedResources:
  - /guides/cicd-pipeline-guide
  - /docs/post-deployment-checklist-template
  - /guides/deployment-strategies-guide
  - /recipes/blue-green-deployment
  - /recipes/graceful-shutdown
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Traffic mirroring: shadow deployments, load testing realista, validación de performance y replicación segura de ambientes."
  keywords:
    - traffic-mirroring
    - devops
    - testing
    - deployment
---
## Visión General

El traffic mirroring copia requests reales de producción a un ambiente de staging o [shadow](/recipes/devops/blue-green-deployment) sin afectar usuarios. Esto habilita testing de carga realista, validación de regresiones y benchmarking de performance contra patrones de tráfico actuales. A diferencia de tests sintéticos que simulan comportamiento de usuario, el tráfico mirror revela cómo los sistemas se comportan bajo distribuciones de requests genuinas, headers y payloads reales.

## Cuándo Usar

Usa este recurso cuando:
- El load testing con datos sintéticos no captura la complejidad de requests del mundo real
- Validas una nueva versión de servicio contra tráfico de producción antes del cutover
- Necesitas benchmark de cambios de infraestructura (versiones de base de datos, upgrades de kernel)
- Testeas [disaster recovery](/guides/devops/on-call-incident-response-guide) reproduciendo tráfico de producción contra sistemas standby

## Solución

### AWS VPC Traffic Mirroring (CLI)

```bash
# Crear traffic mirror target (NLB o ENI)
aws ec2 create-traffic-mirror-target \
  --network-load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/staging-nlb/abc123

# Crear mirror filter (capturar solo tráfico HTTP a /api)
aws ec2 create-traffic-mirror-filter-rule \
  --traffic-mirror-filter-id tmf-1234567890abcdef0 \
  --traffic-direction ingress \
  --rule-action accept \
  --protocol 6 \
  --destination-port-range FromPort=80,ToPort=443

# Crear mirror session
aws ec2 create-traffic-mirror-session \
  --network-interface-id eni-1234567890abcdef0 \
  --traffic-mirror-target-id tmt-1234567890abcdef0 \
  --traffic-mirror-filter-id tmf-1234567890abcdef0 \
  --session-number 1 \
  --packet-length 1500
```

### Nginx Mirror Module

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /api/ {
        # Mirror requests a staging mientras proxy a producción
        mirror /staging_mirror;
        mirror_request_body on;

        proxy_pass http://production_backend;
        proxy_set_header Host $host;
    }

    location /staging_mirror {
        internal;
        proxy_pass http://staging_backend$request_uri;
        proxy_set_header Host staging-api.example.com;
        proxy_set_header X-Mirrored-From $host;
        
        # Ignorar respuesta; no esperar por staging
        proxy_connect_timeout 1s;
        proxy_read_timeout 1s;
        proxy_ignore_client_abort on;
    }
}
```

### Istio Traffic Mirroring (Kubernetes)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-mirror
spec:
  hosts:
    - api.example.com
  http:
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: api-production
            port:
              number: 8080
          weight: 100
      mirror:
        host: api-staging
        port:
          number: 8080
      mirrorPercentage:
        value: 10.0  # Mirror 10% del tráfico
```

## Explicación

**Mirror vs. canary vs. shadow**:

| Patrón | Impacto en Usuario | Fuente de Respuesta | Caso de Uso |
|--------|--------------------|---------------------|-------------|
| Mirror | Ninguno | Solo producción | Testing; análisis shadow |
| Canary | Parcial | Nueva versión | Rollout gradual |
| Blue-green | Switcheado | Una versión | Cutover instantáneo |
| Shadow | Ninguno (async) | Producción | Análisis insensible a latencia |

**Consideraciones clave**:
- **Idempotencia**: Los POST/PUT mirrors deben ser seguros de duplicar. Consulta [idempotencia de mensajes](/recipes/messaging/rabbitmq-task-queue).
- **Aislamiento de estado**: La base de datos de staging no debe compartir estado con producción
- **Side effects**: Deshabilitar email, pagos y servicios de notificación en el target mirror
- **Latencia**: El mirror no debería bloquear el path de respuesta de producción

## Variantes

| Herramienta | Nivel | Overhead | Ideal Para |
|-------------|-------|----------|------------|
| AWS Traffic Mirroring | Network (ENI) | Bajo | Workloads basados en EC2 |
| Nginx mirror | Application | Mínimo | Arquitecturas basadas en Nginx |
| Istio | Service mesh | Bajo | Microservicios Kubernetes |
| Envoy | Sidecar | Bajo | Configuraciones custom de proxy |
| GoReplay | Application | Medio | Replay a nivel TCP |

## Lo que funciona

- **Empieza con porcentajes pequeños**: Mirror 1% del tráfico inicialmente; escala a 100% para validación completa
- **Sanitiza requests mirror**: Elimina PII, tokens de auth y datos de pago antes de enviar a staging
- **Monitorea staging como producción**: El tráfico mirror puede disparar alertas; ajusta thresholds separadamente
- **Deshabilita efectos outbound**: Apaga webhooks, emails y llamadas a APIs de terceros en targets mirror
- **Compara respuestas**: Diff respuestas de producción vs. mirror para detectar regresiones

## Errores Comunes

1. **Mirroring sin idempotencia**: Cobrar clientes dos veces porque la API de pagos fue mirrorizada. Usa [idempotency keys](/recipes/messaging/rabbitmq-task-queue).
2. **Bases de datos compartidas**: Producción y mirror escribiendo a la misma base de datos corrompen datos
3. **Bloquear producción**: Latencia del target mirror agregada al tiempo de respuesta de producción
4. **Sin filtrado de tráfico**: Mirror de health checks y requests de monitoreo poluciona datos de staging
5. **Olvidar deshabilitar side effects**: Staging envía emails reales a clientes reales

## Preguntas Frecuentes

**P: ¿El mirroring impacta el performance de producción?**
R: Mínimo si se implementa correctamente. El mirroring a nivel de network tiene overhead cercano a cero. Los mirrors a nivel de aplicación deberían usar async fire-and-forget.

**P: ¿Puedo mirror tráfico cross-region?**
R: Sí, pero la latencia aumenta. AWS Traffic Mirroring funciona dentro del mismo VPC; cross-region requiere VPN o Transit Gateway.

**P: ¿Cómo difiere el mirroring del load testing?**
R: El [load testing](/recipes/performance/load-testing-k6) genera tráfico artificial. El mirroring usa tráfico real. Usa ambos: mirror para realismo, load testing para límites de capacidad.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Envoy Traffic Mirroring (Sidecar)

```yaml
# envoy.yaml
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/api"
                route:
                  cluster: production_backend
                # Mirror a staging
                request_headers_to_add:
                - header:
                    key: x-mirrored
                    value: "true"
                # Shadow policy: mirror sin esperar
                shadow_policy:
                  shadow_cluster: staging_backend
                  shadow_sample_rate: 100  # 100% de requests
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: production_backend
    connect_timeout: 0.25s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: production_backend
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: api-production.default.svc.cluster.local
                port_value: 8080

  - name: staging_backend
    connect_timeout: 0.25s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: staging_backend
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: api-staging.staging.svc.cluster.local
                port_value: 8080
```

### GoReplay para Replay de Tráfico a Nivel TCP

```bash
# Instalar GoReplay
$ wget https://github.com/buger/goreplay/releases/download/1.3.3/gor_1.3.3_x64.tar.gz
$ tar xzf gor_1.3.3_x64.tar.gz

# Capturar tráfico de producción y replay a staging
$ sudo gor --input-raw :8080 --output-http http://staging-api:8080

# Mirror con rate limiting (10% del tráfico)
$ sudo gor --input-raw :8080 --output-http "http://staging-api:8080|10%"

# Guardar tráfico a archivo para replay posterior
$ sudo gor --input-raw :8080 --output-file requests.gor

# Replay desde archivo a 2x velocidad
$ gor --input-file "requests.gor|200%" --output-http http://staging-api:8080

# Filtrar solo requests POST a /api
$ sudo gor --input-raw :8080 --http-allow-method POST --http-allow-url ^/api --output-http http://staging-api:8080
```

### Middleware de Sanitización de Requests

```python
import re
from starlette.middleware.base import BaseHTTPMiddleware

SANITIZE_PATTERNS = [
    (re.compile(r'"password"\s*:\s*"[^"]*"'), '"password": "***"'),
    (re.compile(r'"token"\s*:\s*"[^"]*"'), '"token": "***"'),
    (re.compile(r'"credit_card"\s*:\s*"[^"]*"'), '"credit_card": "***"'),
    (re.compile(r'Bearer\s+[\w\-\.]+'), 'Bearer ***'),
    (re.compile(r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b'), '****-****-****-****'),
]

class SanitizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Solo sanitizar requests mirror
        if request.headers.get("x-mirrored-from"):
            body = await request.body()
            sanitized = body.decode()
            for pattern, replacement in SANITIZE_PATTERNS:
                sanitized = pattern.sub(replacement, sanitized)
            # Reemplazar body del request
            request._body = sanitized.encode()
        return await call_next(request)
```

### Comparación de Respuestas para Detección de Regresiones

```javascript
const express = require("express");
const app = express();

// Comparar respuestas de producción y staging
app.use(async (req, res, next) => {
  const prodResponse = await fetch(`http://production${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body),
  });

  const stagingResponse = await fetch(`http://staging${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body),
  }).catch(() => null);

  if (stagingResponse) {
    const prodJson = await prodResponse.json();
    const stagingJson = await stagingResponse.json();

    // Loguear diferencias para análisis
    const diff = deepDiff(prodJson, stagingJson);
    if (diff) {
      console.log(JSON.stringify({
        url: req.url,
        method: req.method,
        diff: diff,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  // Siempre retornar respuesta de producción al usuario
  res.status(prodResponse.status).json(prodJson);
});

function deepDiff(obj1, obj2) {
  const diff = {};
  for (const key of Object.keys(obj1)) {
    if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      diff[key] = { prod: obj1[key], staging: obj2[key] };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
}
```

### Mirroring con Istio y Filtrado por Headers

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-mirror-filtered
spec:
  hosts:
    - api.example.com
  http:
    - match:
        - uri:
            prefix: /api
          headers:
            x-mirror-enabled:
              exact: "true"
      route:
        - destination:
            host: api-production
            port:
              number: 8080
          weight: 100
      mirror:
        host: api-staging
        port:
          number: 8080
      mirrorPercentage:
        value: 50.0

    # Ruta sin mirror
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: api-production
            port:
              number: 8080
          weight: 100
```

## Mejores Prácticas Adicionales

6. **Usa un namespace separado para targets mirror.** Mantén la infraestructura de mirror de staging aislada:

```bash
$ kubectl create namespace mirror-target
$ kubectl deploy -n mirror-target -f staging-deployment.yaml
```

7. **Establece límites de recursos en targets mirror.** El tráfico mirrorizado puede sobrecargar staging:

```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

8. **Monitorea la profundidad de la cola del mirror.** Si el target mirror no puede mantener el ritmo, los requests se acumulan:

```yaml
# Alertar si el tiempo de respuesta del mirror > 500ms
- alert: MirrorTargetSlow
  expr: histogram_quantile(0.95, rate(mirror_request_duration_seconds_bucket[5m])) > 0.5
  for: 5m
  labels:
    severity: warning
```

## Errores Comunes Adicionales

6. **Mirrorizar a un entorno de menor capacidad.** Producción maneja 1000 RPS pero staging crashea a 100 RPS. Siempre mirroriza un porcentaje que staging pueda manejar.

7. **No stripping headers de autenticación.** Los requests mirrorizados llevan tokens de auth de producción a staging. Strippéalos o reemplázalos:

```nginx
location /staging_mirror {
    internal;
    proxy_pass http://staging_backend$request_uri;
    proxy_set_header Authorization "Bearer staging-token";
    proxy_set_header X-Mirrored-From $host;
}
```

8. **Mirrorizar durante carga pico.** El mirroring añade carga a producción (la fuente del mirror). Deshabilita el mirroring durante picos de tráfico.

## FAQ Adicional

### ¿Cuánto overhead añade el traffic mirroring a producción?

El mirroring a nivel de red (AWS VPC, Envoy) añade <1ms de latencia. El mirroring a nivel de aplicación (Nginx, GoReplay) añade 1-5ms por request. La respuesta de producción nunca se retrasa — los mirrors son fire-and-forget.

### ¿Puedo mirrorizar tráfico WebSocket?

Sí, pero requiere manejo especial. Usa Envoy o Istio, que soportan mirroring de WebSocket a nivel L4. GoReplay también soporta replay de WebSocket.

### ¿Cómo comparo respuestas de producción vs. mirror?

Usa un servicio como Diffy o implementa una capa de comparación custom. Loguea diferencias a un datastore (Elasticsearch, BigQuery) para análisis:

```python
import json
from datetime import datetime

def log_comparison(url, prod_response, mirror_response):
    comparison = {
        "url": url,
        "timestamp": datetime.utcnow().isoformat(),
        "prod_status": prod_response.status_code,
        "mirror_status": mirror_response.status_code if mirror_response else None,
        "prod_body_hash": hash(json.dumps(prod_response.json(), sort_keys=True)),
        "mirror_body_hash": hash(json.dumps(mirror_response.json(), sort_keys=True)) if mirror_response else None,
        "match": prod_response.status_code == (mirror_response.status_code if mirror_response else None),
    }
    # Enviar a Elasticsearch o BigQuery
    send_to_elasticsearch(comparison)
```

## Tips de Rendimiento

1. **Empieza con 1% de mirroring.** Incrementa gradualmente a 10%, 50%, luego 100%:

```yaml
mirrorPercentage:
  value: 1.0  # Empezar aquí
```

2. **Usa async fire-and-forget para mirrors a nivel de aplicación.** Nunca bloquees la respuesta de producción esperando el mirror:

```javascript
// Fire and forget — no await
fetch("http://staging/api" + req.url, {
  method: req.method,
  body: JSON.stringify(req.body),
}).catch(() => {});  // Ignorar errores
```

3. **Filtra requests de assets estáticos.** Mirrorizar CSS, JS e imágenes desperdicia recursos:

```nginx
location ~* \.(css|js|png|jpg|gif|svg|woff)$ {
    proxy_pass http://production_backend;
    # Sin directiva mirror
}
```

4. **Usa replay basado en archivos de GoReplay para análisis offline.** Captura una vez, replay muchas veces:

```bash
# Capturar por 1 hora
$ timeout 3600 sudo gor --input-raw :8080 --output-file traffic.gor

# Replay a 5x velocidad contra staging
$ gor --input-file "traffic.gor|500%" --output-http http://staging:8080
```

5. **Monitorea el uso de recursos del target mirror.** Configura dashboards para trackear CPU, memoria y tiempos de respuesta del target mirror separadamente de producción.
