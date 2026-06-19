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

El traffic mirroring copia requests reales de producción a un ambiente de staging o [shadow](/recipes/blue-green-deployment) sin afectar usuarios. Esto habilita testing de carga realista, validación de regresiones y benchmarking de performance contra patrones de tráfico actuales. A diferencia de tests sintéticos que simulan comportamiento de usuario, el tráfico mirror revela cómo los sistemas se comportan bajo distribuciones de requests genuinas, headers y payloads reales.

## Cuándo Usar

Usa este recurso cuando:
- El load testing con datos sintéticos no captura la complejidad de requests del mundo real
- Validas una nueva versión de servicio contra tráfico de producción antes del cutover
- Necesitas benchmark de cambios de infraestructura (versiones de base de datos, upgrades de kernel)
- Testeas [disaster recovery](/docs/disaster-recovery-plan-template) reproduciendo tráfico de producción contra sistemas standby

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
- **Idempotencia**: Los POST/PUT mirrors deben ser seguros de duplicar. Consulta [idempotencia de mensajes](/recipes/message-idempotency).
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

## Mejores Prácticas

- **Empieza con porcentajes pequeños**: Mirror 1% del tráfico inicialmente; escala a 100% para validación completa
- **Sanitiza requests mirror**: Elimina PII, tokens de auth y datos de pago antes de enviar a staging
- **Monitorea staging como producción**: El tráfico mirror puede disparar alertas; ajusta thresholds separadamente
- **Deshabilita efectos outbound**: Apaga webhooks, emails y llamadas a APIs de terceros en targets mirror
- **Compara respuestas**: Diff respuestas de producción vs. mirror para detectar regresiones

## Errores Comunes

1. **Mirroring sin idempotencia**: Cobrar clientes dos veces porque la API de pagos fue mirrorizada. Usa [idempotency keys](/recipes/message-idempotency).
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
R: El [load testing](/recipes/load-testing-k6) genera tráfico artificial. El mirroring usa tráfico real. Usa ambos: mirror para realismo, load testing para límites de capacidad.
