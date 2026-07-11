---
contentType: guides
slug: complete-guide-kubernetes-ingress
title: "Guía Completa de Kubernetes Ingress"
description: "Configura y soluciona problemas de controladores Ingress de Kubernetes. Cubre NGINX Ingress, TLS, enrutamiento por path, anotaciones, IngressClass y errores comunes."
metaDescription: "Guía completa de Kubernetes Ingress. Configura NGINX Ingress controller, terminación TLS, enrutamiento por path, anotaciones, IngressClass y troubleshooting."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - kubernetes
  - ingress
  - nginx
  - networking
  - guide
  - tls
  - routing
  - load-balancing
relatedResources:
  - /guides/devops/kubernetes-basics-guide
  - /guides/devops/kubernetes-advanced-guide
  - /guides/devops/deployment-strategies-guide
  - /patterns/architecture/gateway-routing-pattern
  - /patterns/design/sidecar-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Guía completa de Kubernetes Ingress. Configura NGINX Ingress controller, terminación TLS, enrutamiento por path, anotaciones, IngressClass y troubleshooting."
  keywords:
    - kubernetes ingress
    - nginx ingress controller
    - kubernetes tls
    - ingress routing
    - ingressclass
    - kubernetes networking
    - path-based routing k8s
---

# Guía Completa de Kubernetes Ingress

## Introducción

Kubernetes Ingress expone rutas HTTP y HTTPS desde fuera del cluster hacia servicios dentro del cluster. Provee virtual hosting basado en nombres, enrutamiento por path, terminación TLS y otras features de Layer 7 que un Service plain (Layer 4) no puede. A continuación: instalar un Ingress controller, configurar reglas de enrutamiento, habilitar TLS, usar anotaciones y solucionar problemas comunes.

## ¿Qué es Ingress?

Ingress es un tipo de recurso de Kubernetes que gestiona el acceso externo a servicios del cluster. No es un controller en sí mismo — define reglas, y un Ingress controller las implementa.

- **Ingress Resource**: Un conjunto de reglas de enrutamiento (host, path, backend service).
- **Ingress Controller**: Un daemon que watcha Ingress resources y configura un proxy (NGINX, Traefik, HAProxy, Envoy) para enforce las reglas.
- **IngressClass**: Un recurso cluster-scoped que linkea Ingress resources a un controller específico.

Sin un Ingress controller, los Ingress resources no tienen efecto.

## Instalar un Ingress Controller

### NGINX Ingress Controller (más común)

```bash
# Instalar con Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Verificar instalación
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

### Verificar el IngressClass

```bash
# Chequear el IngressClass creado por el controller
kubectl get ingressclass

# Output:
# NAME    CONTROLLER                     PARAMETERS   AGE
# nginx   k8s.io/ingress-nginx           <none>       2m
```

## Ingress Resource Básico

### Enrutamiento de un solo servicio

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    ingressClassName: nginx
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

### Enrutamiento por path (múltiples servicios)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-service-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
          - path: /web
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: default-service
                port:
                  number: 80
```

### Virtual hosting basado en nombres

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vhost-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
    - host: blog.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: blog-service
                port:
                  number: 80
```

## Terminación TLS

### Instalar cert-manager para TLS automático

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

### ClusterIssuer para Let's Encrypt

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

### Ingress con TLS

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls-secret
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

### TLS passthrough (sin terminación)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: passthrough-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: secure.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: secure-service
                port:
                  number: 443
```

## Anotaciones Comunes

### Rewrite target

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: api-service
                port:
                  number: 8080
```

### CORS

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://frontend.example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization"
```

### Rate limiting

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-burst: "20"
```

### Autenticación básica

```bash
# Crear htpasswd secret
htpasswd -c auth admin
kubectl create secret generic basic-auth --from-file=auth -n my-namespace
```

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
```

### Timeouts personalizados

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
```

### Soporte WebSocket

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
```

### Session affinity (sticky sessions)

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "route"
    nginx.ingress.kubernetes.io/session-cookie-hash: "sha1"
```

## Configuraciones Avanzadas

### Default backend (404 personalizado)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: default-backend-ingress
spec:
  ingressClassName: nginx
  defaultBackend:
    service:
      name: custom-404-service
      port:
        number: 80
```

### Canary deployments

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: canary-ingress
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: canary-service
                port:
                  number: 80
```

### Múltiples Ingress resources para el mismo host

Múltiples Ingress resources que matchean el mismo host son merged por el controller. Usar esto para dividir reglas de enrutamiento entre equipos o namespaces.

## Troubleshooting

### Chequear estado del Ingress

```bash
# Listar todos los Ingress resources
kubectl get ingress -A

# Describir un Ingress específico
kubectl describe ingress my-app-ingress -n my-namespace

# Chequear logs del Ingress controller
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Verificar si el Ingress controller está corriendo
kubectl get pods -n ingress-nginx
```

### Problemas comunes

**404 Not Found**:
- El backend service no existe o no tiene pods ready
- El path no matchea ninguna regla
- El IngressClass no está seteado o no coincide

**502 Bad Gateway**:
- El puerto del backend service es incorrecto
- Los pods del backend están crasheando
- El backend no está escuchando en el puerto esperado

**503 Service Unavailable**:
- No hay pods healthy en el backend service
- El selector del service no matchea ningún pod

**Certificado TLS no funciona**:
- cert-manager no está instalado o el ClusterIssuer no está ready
- El TLS secret no está en el mismo namespace que el Ingress
- El dominio no apunta a la IP externa del Ingress controller

### Verificar resolución DNS

```bash
# Obtener la IP externa del Ingress controller
kubectl get svc -n ingress-nginx

# Chequear DNS
dig app.example.com
nslookup app.example.com

# Test local con curl
curl -H "Host: app.example.com" http://<ingress-controller-ip>
```

### Debug con kubectl

```bash
# Chequear eventos del Ingress
kubectl get events -n my-namespace --field-selector reason=Sync

# Chequear certificados de cert-manager
kubectl get certificate -A
kubectl describe certificate app-tls-secret -n my-namespace

# Chequear IngressClass
kubectl get ingressclass
kubectl describe ingressclass nginx
```

## Ingress vs Gateway API

Kubernetes Gateway API es el sucesor de Ingress. Provee enrutamiento más expresivo (basado en headers, pesos) y mejor soporte multi-tenant.

| Feature | Ingress | Gateway API |
|---------|---------|-------------|
| Layer | L7 solo | L4 y L7 |
| Routing | Host + path | Host, path, header, weight |
| TLS | Per-Ingress | Per-listener |
| Multi-tenant | Limitado | Nativo (Route namespaces) |
| Status | Stable | GA (desde K8s 1.25) |

## Pautas

- **Siempre setear ingressClassName** — sin esto, el Ingress puede no ser picked up por ningún controller
- **Usar cert-manager para TLS** — la gestión manual de certificados no escala
- **Setear resource limits en el controller** — el Ingress controller es infraestructura crítica
- **Monitorear el controller** — trackear rates de 4xx/5xx, latencia, conexiones activas
- **Usar pathType: Prefix** para la mayoría de casos — `ImplementationSpecific` es controller-dependent
- **Namespacear tus Ingress resources** — mantenerlos en el mismo namespace que los backend services
- **Usar anotaciones con moderación** — son controller-specific y reducen portabilidad
- **Testear con curl -H "Host:"** — verificar enrutamiento antes de apuntar DNS
- **Mantener el controller actualizado** — security patches y bug fixes
- **Correr múltiples réplicas** — un solo Ingress controller es un single point of failure

## Preguntas Frecuentes

### ¿Necesito un Ingress controller?

Sí. Los Ingress resources son solo reglas. Sin un controller watchando e implementándolas, no tienen efecto. Instalar NGINX Ingress Controller, Traefik u otro controller.

### ¿Puedo usar Ingress para TCP/UDP?

No con el Ingress resource estándar. Ingress es solo HTTP/HTTPS. Para TCP/UDP, usar un Service de tipo LoadBalancer o la configuración de TCP/UDP passthrough del controller (NGINX lo soporta vía ConfigMap).

### ¿Cómo ruteo a un servicio en otro namespace?

No puedes directamente. Los Ingress resources deben referenciar servicios en el mismo namespace. Usar un Service de tipo ExternalName o un re-export Service en el namespace del Ingress.

### ¿Cuál es la diferencia entre Ingress y LoadBalancer?

Un LoadBalancer Service te da un solo cloud load balancer apuntando a un solo servicio. Ingress te da un entry point con reglas de enrutamiento a muchos servicios — virtual hosting basado en nombres, enrutamiento por path y terminación TLS.
