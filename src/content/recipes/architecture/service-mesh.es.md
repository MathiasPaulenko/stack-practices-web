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

Un service mesh resuelve estos problemas insertando un proxy — un sidecar container — al lado de cada pod de aplicación. Todo el tráfico entrante o saliente del pod fluye a través del sidecar. El sidecar maneja mTLS mutuo, enrutamiento de tráfico, retries, timeouts, métricas y políticas de acceso. El código de aplicación permanece completamente inconsciente. Esta receta cubre conceptos de service mesh, despliegue de Istio, políticas de tráfico y observabilidad.

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
```

## Explicación

- **Sidecar proxy**: Envoy corre como sidecar en cada pod. Intercepta todo el tráfico de red vía reglas de iptables. Las aplicaciones aún hablan a `localhost:8080`, pero Envoy enruta, encripta y loguea el request real. El código de aplicación no requiere cambios.
- **Mutual TLS (mTLS)**: el sidecar presenta un certificado para probar su identidad y valida el certificado del peer. El tráfico está encriptado en tránsito y autenticado en ambos extremos. Incluso dentro del mismo cluster, los servicios no pueden impersonarse entre sí sin robar un certificado.
- **Gestión de tráfico**: VirtualService define reglas de enrutamiento — despliegues canary, retries, timeouts, inyección de fallos. DestinationRule configura load balancing, connection pools y outlier detection (circuit breaker). Las políticas de tráfico son declarativas y versionadas en Git.

## Variantes

| Feature | Istio | Linkerd | Consul Connect | Cilium Service Mesh |
|---------|-------|---------|----------------|---------------------|
| Complejidad | Alta | Baja | Media | Media |
| Performance | Buena | Excelente | Buena | Excelente (eBPF) |
| mTLS | Sí | Sí | Sí | Sí |
| Enrutamiento de tráfico | Completo | Básico | Básico | Básico |

## Lo que funciona

- **Empieza con mTLS permisivo, luego enforce estricto**: comienza con modo `PERMISSIVE` para asegurar que todos los sidecars están inyectados y funcionando. Después de validar flujos de tráfico, cambia a `STRICT` para rechazar conexiones no encriptadas.
- **Define service accounts por workload**: las cuentas de servicio de Kubernetes se mapean a identidades de Istio. Usa cuentas de servicio distintas para cada deployment, no la cuenta `default`. Esto habilita políticas de autorización granulares.
- **Configura retry budgets, no solo retries**: retries ingenuos pueden amplificar fallos. Usa retry budgets de Istio (ej. retry solo si el ratio de error está debajo del 10%) o configura máximo de reintentos con backoff exponencial.
- **Usa [circuit breakers](/recipes/circuit-breaker-pattern-recipe) en cada llamada saliente**: configura `outlierDetection` en DestinationRules. Si un servicio downstream retorna 5xx en el 50% de requests durante 30 segundos, échalo durante 30 segundos. Esto previene fallos en cascada.

## Errores comunes

- **Olvidar inyección de sidecar**: un pod sin sidecar bypassa el mesh completamente. Su tráfico no está encriptado, no es observado y no tiene restricciones. Siempre verifica la inyección con `kubectl get pod -o yaml | grep istio-proxy`.
- **Políticas de autorización demasiado permisivas**: una política `ALLOW *` por defecto derrota el propósito. Empieza con `DENY all` explícito, luego agrega reglas `ALLOW` para paths legítimos. Zero-trust significa denegar por defecto.
- **Ignorar ordering de startup**: durante rolling updates, pods antiguos sin sidecar pueden hablar con pods nuevos con mTLS estricto. Usa Helm o Argo Rollouts para manejar waves de actualización.

## Preguntas frecuentes

**P: ¿Un service mesh reemplaza un [API gateway](/recipes/architecture/api-gateway)?**
R: No. El gateway maneja north-south (externo al cluster). El mesh maneja east-west (servicio-a-servicio). Úsalos ambos. Algunos meshes incluyen un ingress gateway, pero complementa, no reemplaza, tu gateway primario.

**P: ¿Cuál es el overhead de performance de un service mesh?**
R: Espera 1-5ms de latencia por hop y 10-20% de overhead de CPU para el sidecar. Linkerd está optimizado para overhead mínimo. Istio ofrece más capacidades a mayor costo. Para paths sensibles a latencia, haz benchmarking antes de desplegar.

