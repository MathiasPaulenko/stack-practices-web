---
contentType: recipes
slug: traffic-mirroring
title: "Traffic Mirroring para Testing en Producción y Shadow Deployments"
description: "Replica tráfico de producción a ambientes de staging para testing realista, despliegues shadow y validación de performance sin impactar usuarios."
metaDescription: "Traffic mirroring: shadow deployments, load testing realista, validación de performance y replicación segura de ambientes usando Nginx, Istio y AWS."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - testing
  - deployment
  - ci-cd
  - nginx
  - istio
  - aws
  - kubernetes
relatedResources:
  - /guides/deployment-strategies-guide
  - /recipes/blue-green-deployment
  - /guides/canary-deployment-guide
  - /recipes/load-testing-k6
  - /recipes/idempotent-api-endpoints
  - /recipes/graceful-shutdown
lastUpdated: "2026-08-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Traffic mirroring: shadow deployments, load testing realista, validación de performance y replicación segura de ambientes usando Nginx, Istio y AWS."
  keywords:
    - traffic-mirroring
    - devops
    - testing
    - deployment
    - shadow
    - nginx
    - istio
---

## Visión General

Traffic mirroring copia requests reales de producción a un ambiente de staging o
shadow sin afectar usuarios. Esto habilita load testing realista, validación de
regresiones y benchmarking de performance contra patrones de tráfico actuales. A
diferencia de tests sintéticos, el tráfico mirror muestra cómo se comportan los
sistemas bajo distribuciones de requests, headers y payloads reales.

## Cuándo Usar

- El load testing con datos sintéticos no captura la complejidad de requests del
  mundo real.
- Validás una nueva versión de servicio contra tráfico de producción antes del
  cutover.
- Hacés benchmark de cambios de infraestructura como versiones de base de datos
  o upgrades de kernel.
- Testeás disaster recovery reproduciendo tráfico de producción contra sistemas
  standby.

### Cuándo evitarlo

- La aplicación no puede manejar requests duplicados de forma segura. Mirror de
  POSTs o pagos no idempotentes puede causar side effects reales.
- Staging comparte bases de datos o cuentas de terceros con producción. Escritas
  del tráfico mirror corrompen el estado de producción.
- No podés aislar side effects. El tráfico mirror no debería enviar emails reales,
  cobrar pagos ni disparar webhooks.

## Solución

### AWS VPC Traffic Mirroring

```bash
# Crear un traffic mirror target (NLB o ENI)
aws ec2 create-traffic-mirror-target \
  --network-load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/staging-nlb/abc123

# Crear un mirror filter para tráfico HTTP/HTTPS
aws ec2 create-traffic-mirror-filter-rule \
  --traffic-mirror-filter-id tmf-1234567890abcdef0 \
  --traffic-direction ingress \
  --rule-action accept \
  --protocol 6 \
  --destination-port-range FromPort=80,ToPort=443

# Crear la mirror session
aws ec2 create-traffic-mirror-session \
  --network-interface-id eni-1234567890abcdef0 \
  --traffic-mirror-target-id tmt-1234567890abcdef0 \
  --traffic-mirror-filter-id tmf-1234567890abcdef0 \
  --session-number 1 \
  --packet-length 1500
```

### Nginx mirror module

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /api/ {
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

        # No bloquear producción esperando a staging
        proxy_connect_timeout 1s;
        proxy_read_timeout 1s;
        proxy_ignore_client_abort on;
    }
}
```

### Istio traffic mirroring (Kubernetes)

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
        value: 10.0
```

### Envoy traffic mirroring

```yaml
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
                          request_mirror_policy:
                            cluster: staging_backend
                            runtime_fraction:
                              default_value:
                                numerator: 10
                                denominator: HUNDRED
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

### GoReplay para replay a nivel TCP

```bash
# Capturar y replayar tráfico en vivo
gor --input-raw :8080 --output-http http://staging-api:8080

# Mirror 10% del tráfico
gor --input-raw :8080 --output-http "http://staging-api:8080|10%"

# Guardar a archivo para replay posterior
gor --input-raw :8080 --output-file requests.gor

# Replay a 2x velocidad
gor --input-file "requests.gor|200%" --output-http http://staging-api:8080

# Filtrar POSTs a /api
gor --input-raw :8080 --http-allow-method POST --http-allow-url ^/api --output-http http://staging-api:8080
```

### Comparación de respuestas

```javascript
const express = require("express");
const app = express();

app.use(async (req, res, next) => {
  const prodResponse = await fetch(`http://production${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body),
  });

  const prodJson = await prodResponse.json();

  const stagingResponse = await fetch(`http://staging${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body),
  }).catch(() => null);

  if (stagingResponse) {
    const stagingJson = await stagingResponse.json();
    const diff = deepDiff(prodJson, stagingJson);
    if (diff) {
      console.log(JSON.stringify({
        url: req.url,
        method: req.method,
        diff,
        timestamp: new Date().toISOString(),
      }));
    }
  }

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

## Explicación

**Mirror vs. canary vs. shadow**:

| Patrón | Impacto usuario | Fuente de respuesta | Caso de uso |
| --- | --- | --- | --- |
| Mirror | Ninguno | Producción | Testing y análisis shadow |
| Canary | Parcial | Nueva versión | Rollout gradual |
| Blue-green | Switch | Una versión | Cutover instantáneo |
| Shadow | Ninguno (async) | Producción | Análisis sin latencia crítica |

El tráfico mirror es un duplicado. Llega al mirror target además del backend de
producción, así que el response path de producción debe seguir independiente. El
mirroring a nivel red copia paquetes, mientras que el de aplicación envía HTTP
requests. Las configs a nivel aplicación permiten filtrar por URL, método y
headers fácilmente.

Consideraciones clave:

- **Idempotencia**: los POST/PUT mirror deben ser seguros de repetir. Consultá
  [idempotent API endpoints](/recipes/idempotent-api-endpoints/).
- **Aislamiento de estado**: la base de staging no debe compartir estado con
  producción.
- **Side effects**: desactivá email, pagos y notificaciones en el mirror target.
- **Latencia**: el mirror nunca debería bloquear la respuesta de producción.

## Variantes

| Herramienta | Nivel | Overhead | Ideal para |
| --- | --- | --- | --- |
| AWS Traffic Mirroring | Red (ENI) | Bajo | Workloads en EC2 |
| Nginx mirror | Aplicación | Mínimo | Arquitecturas basadas en Nginx |
| Istio | Service mesh | Bajo | Microservicios en Kubernetes |
| Envoy | Sidecar | Bajo | Configs de proxy custom |
| GoReplay | Aplicación | Medio | Replay y captura a nivel TCP |

## Mejores Prácticas

- Empezá con 1% de tráfico y aumentá gradualmente. No arranques con 100%.
- Sanitizá requests mirror. Quitá PII, tokens de auth y datos de pago antes de
  enviar a staging.
- Desactivá efectos salientes en el target: webhooks, emails, APIs de terceros y
  push notifications.
- Monitoreá el mirror target por separado. El tráfico mirror puede disparar
  alertas, así que usá umbrales y dashboards separados.
- Filtrá health checks y requests de monitoreo para no contaminar datos de
  staging.
- Filtrá assets estáticos. Mirror de CSS, JS e imágenes desperdicia recursos y
  distorsiona métricas.
- Usá async fire-and-forget para mirrors a nivel aplicación. Nunca hagás `await`
  de la respuesta del mirror.
- Compará respuestas de producción y mirror para detectar regresiones en shape,
  latencia y códigos de estado.

## Errores Comunes

- Mirror sin idempotencia. Cobrar dos veces a un cliente porque se mirroró el
  pago es un riesgo real. Usá idempotency keys para endpoints mutables.
- Compartir bases de datos entre producción y mirror target. Las escrituras del
  mirror corrompen datos de producción.
- Bloquear producción con latencia del mirror target. Siempre seteá timeouts
  cortos e ignorá errores del mirror.
- Mirror de health checks y requests de monitoreo. Agrega ruido a las analíticas
  de staging.
- Olvidar desactivar side effects. Staging no debería enviar emails reales a
  clientes reales.
- Mirror de tráfico a un endpoint de staging público sin autenticación. Puede
  filtrar datos de producción y credenciales.

## FAQ

### ¿El mirroring impacta la performance de producción?

Mínimo si se hace bien. El mirroring a nivel red agrega overhead cercano a cero.
Los mirrors a nivel aplicación deberían ser async fire-and-forget con timeouts
cortos.

### ¿Puedo mirrorar tráfico entre regiones?

Sí, pero aumenta la latencia. AWS Traffic Mirroring funciona dentro del mismo
VPC. Cross-region requiere VPN, Transit Gateway o un mirror a nivel aplicación.

### ¿En qué se diferencia mirroring de load testing?

Load testing genera tráfico artificial para encontrar límites de capacidad. El
mirroring usa tráfico real para realismo. Usá ambos: mirror para validación de
regresiones realista, load testing para capacidad y estrés.

### ¿Cómo evito data leakage en tráfico mirror?

Sanitizá headers y body antes de que salgan de producción. Quitá tokens de auth,
PII y datos de pago. Usá un ambiente de staging dedicado y aislado.

### ¿Debería mirrorar 100% del tráfico?

Solo después de validar idempotencia, aislar estado, desactivar side effects y
confirmar que el target soporta la carga. Empezá con 1%.

### ¿Cómo comparo respuestas de producción y mirror?

Logueá status code, response time y un diff de campos seleccionados. El diff
automatizado detecta regresiones antes de un canary o cutover completo.
