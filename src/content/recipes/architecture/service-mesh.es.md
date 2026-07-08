---
contentType: recipes
slug: service-mesh
title: "Asegurar y Observar Microservicios con un Service Mesh"
description: "Cómo desplegar Istio o Linkerd para agregar mTLS, gestión de tráfico, observabilidad y enforcement de políticas a microservicios sin cambiar código de aplicación."
metaDescription: "Aprende service mesh para microservicios. Despliega Istio o Linkerd para agregar mTLS, gestión de tráfico, observabilidad y políticas sin cambiar código."
difficulty: advanced
topics:
  - architecture
tags:
  - architecture
  - istio
  - kubernetes
  - design
  - patterns
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/api-gateway
  - /recipes/load-balancing
  - /recipes/secret-management
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende service mesh para microservicios. Despliega Istio o Linkerd para agregar mTLS, gestión de tráfico, observabilidad y políticas sin cambiar código."
  keywords:
    - service mesh
    - istio microservicios
    - linkerd
    - encriptacion mtls
    - gestion trafico k8s
---

## Visión general

Los microservicios se comunican a través de la red, y la red no es confiable. Cada llamada inter-servicio cruza límites de pod, límites de nodo y potencialmente límites de cluster. Sin encriptación, atacantes con acceso a la red pueden leer o modificar tráfico. Sin identidad, cualquier servicio comprometido puede impersonar a otro. Sin observabilidad, debuggear un request que atraviesa 10 servicios es casi imposible.

Un service mesh resuelve estos problemas insertando un proxy — un sidecar container — al lado de cada pod de aplicación. Todo el tráfico entrante o saliente del pod fluye a través del sidecar. El sidecar maneja mTLS mutuo, enrutamiento de tráfico, retries, timeouts, métricas y políticas de acceso. El código de aplicación permanece completamente inconsciente. Aqui se explica como conceptos de service mesh, despliegue de Istio, políticas de tráfico y observabilidad.

## Cuándo usarlo

Usa esta receta cuando:

- Ejecutando 10+ [microservicios](/guides/architecture/microservices-architecture-guide) en Kubernetes con comunicación inter-servicio compleja
- Requiriendo encriptación para todo el tráfico servicio-a-servicio sin modificar aplicaciones
- Implementando [despliegues canary](/recipes/architecture/load-balancing), A/B testing o mirroring de tráfico entre versiones de servicios
- Necesitando observabilidad unificada (métricas, logs, traces) a través de todos los microservicios
- Haciendo enforcement de políticas de acceso (ej. "el servicio de pagos solo puede hablar con billing y fraud detection")

## Solución

### Instalación de Istio (istioctl)

```bash
istioctl install --set profile=default -y

kubectl label namespace default istio-injection=enabled

kubectl rollout restart deployment -n default
```

### Enrutamiento de Tráfico con VirtualService

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service-route
spec:
  hosts:
    - user-service
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: user-service
            subset: v2
          weight: 100
    - route:
        - destination:
            host: user-service
            subset: v1
          weight: 90
        - destination:
            host: user-service
            subset: v2
          weight: 10

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service-dr
spec:
  host: user-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

### mTLS con PeerAuthentication

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT

---
# Permitir solo servicios específicos a acceder payment-service
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/order-service"
              - "cluster.local/ns/default/sa/billing-service"
```

## Explicación

- **Sidecar proxy**: Envoy corre como sidecar en cada pod. Intercepta todo el tráfico de red vía reglas de iptables. Las aplicaciones aún hablan a `localhost:8080`, pero Envoy enruta, encripta y loguea el request real. El código de aplicación no requiere cambios.
- **Mutual TLS (mTLS)**: el sidecar proporciona un certificado para probar su identidad y valida el certificado del peer. El tráfico está encriptado en tránsito y autenticado en ambos extremos. Incluso dentro del mismo cluster, los servicios no pueden impersonarse entre sí sin robar un certificado.
- **Gestión de tráfico**: VirtualService define reglas de enrutamiento — despliegues canary, retries, timeouts, inyección de fallos. DestinationRule configura load balancing, connection pools y outlier detection (circuit breaker). Las políticas de tráfico son declarativas y versionadas en Git.
- **Observabilidad**: Envoy genera métricas (conteo de requests, latencia, errores), access logs y distributed traces. Istio agrega esto en Kiali (topología), Grafana (métricas) y Jaeger (traces). Ves el grafo completo de servicios sin agregar instrumentación a las aplicaciones.

## Variantes

| Feature | Istio | Linkerd | Consul Connect | Cilium Service Mesh |
|---------|-------|---------|----------------|---------------------|
| Complejidad | Alta | Baja | Media | Media |
| Performance | Buena | Excelente | Buena | Excelente (eBPF) |
| mTLS | Sí | Sí | Sí | Sí |
| Enrutamiento de tráfico | Completo | Básico | Básico | Básico |
| Uso de recursos | Mayor | Menor | Media | Bajo |

## Lo que funciona

- **Empieza con mTLS permisivo, luego enforce estricto**: comienza con modo `PERMISSIVE` para asegurar que todos los sidecars están inyectados y funcionando. Después de validar flujos de tráfico, cambia a `STRICT` para rechazar conexiones no encriptadas. El modo estricto repentino puede romper servicios que no tienen sidecars.
- **Define service accounts por workload**: las cuentas de servicio de Kubernetes se mapean a identidades de Istio. Usa cuentas de servicio distintas para cada deployment, no la cuenta `default`. Esto habilita políticas de autorización granulares.
- **Configura retry budgets, no solo retries**: retries ingenuos pueden amplificar fallos. Usa retry budgets de Istio (ej. retry solo si el ratio de error está debajo del 10%) o configura máximo de reintentos con backoff exponencial. Retries ilimitados crean retry storms.
- **Usa [circuit breakers](/recipes/circuit-breaker-pattern-recipe) en cada llamada saliente**: configura `outlierDetection` en DestinationRules. Si un servicio downstream retorna 5xx en el 50% de requests durante 30 segundos, échalo durante 30 segundos. Esto previene fallos en cascada.
- **Monitorea el uso de recursos del sidecar**: Envoy consume CPU y memoria. Setea resource requests/limits en el sidecar. En servicios de alto throughput, el sidecar puede convertirse en el bottleneck antes que la aplicación. Profilea y tunea la concurrencia del proxy.

## Errores comunes

- **Olvidar inyección de sidecar**: un pod sin sidecar bypassa el mesh completamente. Su tráfico no está encriptado, no es observado y no tiene restricciones. Siempre verifica la inyección con `kubectl get pod -o yaml | grep istio-proxy`.
- **Políticas de autorización demasiado permisivas**: una política `ALLOW *` por defecto derrota el propósito. Empieza con `DENY all` explícito, luego agrega reglas `ALLOW` para paths legítimos. Zero-trust significa denegar por defecto.
- **Ignorar ordering de startup**: durante rolling updates, pods antiguos sin sidecar pueden hablar con pods nuevos con mTLS estricto. Usa Helm o Argo Rollouts para manejar waves de actualización, o mantén `PERMISSIVE` durante la ventana de transición.
- **Sin control de egress**: por defecto, el tráfico mesh-internal está controlado pero el egress (APIs externas, bases de datos) no. Configura recursos `ServiceEntry` para permitir explícitamente destinos externos, previniendo exfiltración de datos.

## Preguntas frecuentes

**P: ¿Un service mesh reemplaza un [API gateway](/recipes/architecture/api-gateway)?**
R: No. El gateway maneja north-south (externo al cluster). El mesh maneja east-west (servicio-a-servicio). Úsalos ambos. Algunos meshes incluyen un ingress gateway, pero complementa, no reemplaza, tu gateway primario.

**P: ¿Cuál es el overhead de performance de un service mesh?**
R: Espera 1-5ms de latencia por hop y 10-20% de overhead de CPU para el sidecar. Linkerd está optimizado para overhead mínimo. Istio ofrece más capacidades a mayor costo. Para paths sensibles a latencia, haz benchmarking antes de desplegar.

**P: ¿Puedo usar un service mesh sin Kubernetes?**
R: Istio y Linkerd son Kubernetes-native. Consul Connect soporta VMs. Para entornos no-K8s, usa mTLS a nivel de aplicación (ej. AWS App Mesh con ECS) o librerías específicas del lenguaje.

**P: ¿Cómo debuggeo un 503 en el mesh?**
R: Verifica tres cosas: (1) ¿el pod de destino está healthy? (2) ¿el sidecar proxy está healthy? (logs del container `istio-proxy`). (3) ¿hay una política de autorización o destination rule bloqueando tráfico? Usa `istioctl proxy-config` para inspeccionar la configuración de Envoy.

### Instalación de Linkerd (CLI)

```bash
# Instalar control plane de Linkerd
linkerd install --crd-only | kubectl apply -f -
linkerd install | kubectl apply -f -

# Verificar instalación
linkerd check

# Agregar mesh a un namespace
kubectl annotate namespace default linkerd.io/inject=enabled

# Reiniciar deployments
kubectl rollout restart deployment -n default
```

### Traffic Mirroring para Shadow Testing

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-mirror
spec:
  hosts:
    - payment-service
  http:
    - route:
        - destination:
            host: payment-service
            subset: v1
          weight: 100
      mirror:
        host: payment-service
        subset: v2
      mirrorPercentage:
        value: 100.0
```

### Fault Injection para Resilience Testing

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-fault-injection
spec:
  hosts:
    - order-service
  http:
    - match:
        - headers:
            x-test-fault:
              exact: "true"
      fault:
        delay:
          percentage:
            value: 50
          fixedDelay: 5s
        abort:
          percentage:
            value: 10
          httpStatus: 503
      route:
        - destination:
            host: order-service
            subset: v1
```

### Observabilidad con Kiali y Prometheus

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-metrics
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: mesh
  endpoints:
    - port: http-monitoring
      interval: 15s
      path: /stats/prometheus
---
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-observability
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 10.0
  metrics:
    - providers:
        - name: prometheus
```

### Egress Gateway para Control de APIs Externas

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.stripe.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: egress-stripe
spec:
  hosts:
    - api.stripe.com
  http:
    - route:
        - destination:
            host: api.stripe.com
            port:
              number: 443
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: 5xx,reset,connect-failure
```

## Mejores Prácticas Adicionales

1. **Usa despliegues canary con weighted routing.** Shiftea gradualmente tráfico a la nueva versión basado en tasas de error y métricas de latencia:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: canary-deployment
spec:
  hosts:
    - user-service
  http:
    - route:
        - destination:
            host: user-service
            subset: stable
          weight: 95
        - destination:
            host: user-service
            subset: canary
          weight: 5
      retries:
        attempts: 2
        retryOn: 5xx
        perTryTimeout: 2s
```

2. **Setea resource limits en sidecars.** Los proxies Envoy consumen CPU y memoria. Sin limits, pueden starvar al container de aplicación:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-server
  annotations:
    sidecar.istio.io/proxyCPU: "500m"
    sidecar.istio.io/proxyMemory: "256Mi"
    sidecar.istio.io/proxyCPULimit: "1000m"
    sidecar.istio.io/proxyMemoryLimit: "512Mi"
spec:
  containers:
    - name: api-server
      image: myapp:latest
      resources:
        requests:
          cpu: 250m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi
```

3. **Usa locality-aware load balancing.** Rutea tráfico a la instancia disponible más cercana para reducir latencia:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: locality-lb
spec:
  host: user-service
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
          - from: us-east-1a/*
            to:
              us-east-1a/*: 80
              us-east-1b/*: 20
    outlierDetection:
      consecutiveErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

## Errores Comunes Adicionales

1. **Starvation de recursos del sidecar.** El proxy Envoy compite con el container de aplicación por CPU y memoria. En escenarios de alto throughput, el sidecar puede consumir 50%+ de los recursos del pod. Siempre setea resource requests y limits explícitos en el sidecar:

```yaml
# Sin limits, Envoy puede OOM-killear la aplicación
annotations:
  sidecar.istio.io/proxyCPU: "1000m"
  sidecar.istio.io/proxyMemory: "512Mi"
```

2. **Romper mTLS durante migraciones.** Al actualizar de permissive a strict mTLS, los servicios sin sidecars son rechazados. Usa una ventana de migración con modo permissive, verifica que todos los pods tengan sidecars, luego enforce strict:

```bash
# Revisar qué pods no tienen sidecars
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{" "}{.spec.containers[*].name}{"\n"}{end}' | grep -v istio-proxy

# Solo cambia a strict cuando ningún pod esté missing sidecar
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT
EOF
```

3. **Sin monitoreo de tráfico egress.** Por defecto, los servicios pueden llamar a cualquier endpoint externo. Sin control de egress, un servicio comprometido puede exfiltrar datos. Usa ServiceEntry y egress gateways para restringir y monitorear tráfico saliente:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: allow-database
spec:
  hosts:
    - db.internal.stackpractices.com
  ports:
    - number: 5432
      name: tcp
      protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

## FAQ Adicional

### ¿Cómo testeo la configuración de service mesh?

Usa `istioctl analyze` para validar la configuración antes de aplicar. Atrapa errores comunes como DestinationRules faltantes, VirtualServices conflictivas y referencias inválidas. Para testing de tráfico, usa fault injection para simular fallos y verificar el comportamiento de retry/timeout. Para mTLS, usa `istioctl authn tls-check` para verificar el estado de encriptación entre servicios. Para políticas de autorización, testea con `istioctl authz check` para ver qué políticas aplican a un pod.

### ¿Esta solución está lista para producción?

Sí. Istio se usa en producción por Google Cloud, IBM y Airbnb. Linkerd se usa en producción por Buoyant, Nordstrom y Hepsiburada. Consul Connect es usado por clientes de HashiCorp en entornos híbridos K8s/VM. Cilium Service Mesh es usado por clientes de Google GKE y AWS EKS con eBPF. El patrón de traffic mirroring es usado por Netflix para shadow traffic testing. Fault injection es práctica estándar en chaos engineering con service meshes.

### ¿Cuáles son las características de rendimiento?

Istio añade 1-5ms de latencia por hop y 10-20% de overhead de CPU para el sidecar Envoy. Linkerd añade 0.5-2ms de latencia y 5-10% de overhead de CPU debido a su proxy basado en Rust. Cilium Service Mesh con eBPF añade latencia casi cero para tráfico L3/L4. El overhead de memoria es 50-100MB por sidecar. El overhead del control plane es 500MB-1GB para Istio, 200-400MB para Linkerd. Locality-aware load balancing no añade overhead — usa labels de topología de Kubernetes. Traffic mirroring duplica la carga en el servicio mirrorado. Fault injection añade delay configurable sin overhead baseline.

### ¿Cómo depuro problemas con este enfoque?

Usa `istioctl proxy-config <pod>` para inspeccionar la configuración de Envoy aplicada a un pod. Usa `istioctl proxy-status` para ver si todos los proxies están en sync con el control plane. Para errores 503, revisa `istioctl proxy-config cluster <pod>` para verificar los upstream clusters. Para issues de mTLS, usa `istioctl authn tls-check <source-pod> <destination-service>`. Para denegaciones de autorización, revisa `istioctl authz check <pod>`. Usa Kiali para una vista visual de la topología del mesh. Usa Jaeger para tracear requests a través del mesh e identificar qué hop falló.
