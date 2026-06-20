---
contentType: recipes
slug: blue-green-deployment
title: "Despliegue Blue-Green"
description: "Despliega con zero downtime usando ambientes blue-green, conmutación instantánea de tráfico y capacidades de rollback automatizado."
metaDescription: "Estrategia de despliegue blue-green: releases sin downtime, conmutación instantánea de tráfico, rollback automatizado y gestión de ambientes para seguridad en producción."
difficulty: intermediate
topics:
  - devops
tags:
  - blue-green
  - deployment
  - zero-downtime
  - devops
relatedResources:
  - /guides/deployment-strategies-guide
  - /docs/post-deployment-checklist-template
  - /guides/cicd-pipeline-guide
  - /recipes/graceful-shutdown
  - /recipes/istio-canary-deployment
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Estrategia de despliegue blue-green: releases sin downtime, conmutación instantánea de tráfico, rollback automatizado y gestión de ambientes para seguridad en producción."
  keywords:
    - blue-green
    - deployment
    - zero-downtime
    - devops
---
## Visión General

El despliegue blue-green es una estrategia de release que mantiene dos ambientes de producción idénticos: uno activo (blue) y otro inactivo (green). Las nuevas versiones se despliegan en el ambiente inactivo, se validan con smoke tests, y luego el tráfico se conmuta instantáneamente. Si surgen problemas, el rollback es una simple conmutación de tráfico, tomando segundos en lugar de horas.

## Cuándo Usar

Usa este recurso cuando:
- El downtime durante despliegues es inaceptable (SLA > 99.9%). Consulta [Health Check Endpoint](/recipes/devops/health-check-endpoint) para verificación de readiness.
- Necesitas capacidad de rollback instantáneo sin redeployar. Consulta [Feature Flags](/recipes/devops/feature-flags) para toggles instantáneos.
- Ejecutas migraciones de base de datos que deben ser retrocompatibles. Consulta [Docker Compose Local Dev](/recipes/devops/docker-compose-local-dev) para testing local de migraciones.
- Validas nuevos releases contra tráfico real de producción vía canary routing. Consulta [Istio Canary Deployment](/recipes/devops/istio-canary-deployment) para shifting progresivo de tráfico.

## Solución

### Conmutación de Tráfico con Nginx (Bash)

```bash
#!/bin/bash
# Conmuta tráfico de blue a green

BLUE_IP="10.0.1.10"
GREEN_IP="10.0.1.11"
NGINX_CONF="/etc/nginx/sites-enabled/app"

# Actualizar upstream para apuntar a green
sed -i "s/server $BLUE_IP:8080/server $GREEN_IP:8080/" $NGINX_CONF
nginx -s reload

# Health check en green
if ! curl -sf http://$GREEN_IP:8080/health; then
  # Rollback instantáneo
  sed -i "s/server $GREEN_IP:8080/server $BLUE_IP:8080/" $NGINX_CONF
  nginx -s reload
  echo "Rollback completado"
  exit 1
fi
```

### Kubernetes Deployment con Service Switch

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-active
spec:
  selector:
    version: blue  # Cambiar a "green" para conmutar
  ports:
    - port: 80
      targetPort: 8080

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
      version: green
  template:
    metadata:
      labels:
        app: web
        version: green
    spec:
      containers:
        - name: app
          image: myapp:v2.0.0
```

### AWS Route 53 Weighted Routing

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "green",
        "Weight": 100,
        "TTL": 60,
        "ResourceRecords": [{"Value": "1.2.3.4"}]
      }
    }]
  }'
```

## Explicación

**Cómo funciona**:
1. **Ambiente blue** sirve todo el tráfico de producción
2. **Ambiente green** recibe el nuevo despliegue
3. **Smoke tests** validan green (health checks, transacciones sintéticas)
4. **Conmutación de tráfico** dirige a todos los usuarios hacia green
5. **Blue permanece caliente** como target de rollback instantáneo
6. **Próximo deploy** va a blue, los roles se intercambian

**Compatibilidad de base de datos**:
- Las migraciones deben ser retrocompatibles (agregar columnas, nunca eliminar)
- Blue debe tolerar el schema de green; green debe tolerar el schema de blue
- Usa feature flags para ocultar nuevas columnas de blue

## Variantes

| Estrategia | Downtime | Velocidad de Rollback | Costo |
|------------|----------|----------------------|-------|
| Blue-Green | Cero | Instantáneo (segundos) | 2x infraestructura |
| Rolling | Cero | Lento (minutos) | 1x + surge |
| Canary | Cero | Medio (minutos) | 1x + pequeño surge |
| Recreate | Alto | N/A | 1x |

## Mejores Prácticas

- **Mantén blue caliente por un ciclo de deploy**: No desmantelar hasta que el próximo despliegue tenga éxito
- **Automatiza la conmutación**: Las actualizaciones manuales de DNS son propensas a errores; usa pipelines CI/CD
- **Monitorea durante la conmutación**: Observa tasas de error, latencia y métricas de negocio por 5-10 minutos post-conmutación
- **Usa sticky sessions con cuidado**: Conmutar durante una sesión puede interrumpir conexiones stateful
- **Comparte estado vía stores externos**: Ambos ambientes deben acceder a las mismas bases de datos, caches y colas

## Errores Comunes

1. **Blue/green stateful**: Las sesiones almacenadas en memoria se pierden durante conmutaciones; usa Redis o JWT
2. **Configs diferentes**: Blue y green deben tener variables de entorno idénticas excepto la versión
3. **Olvidar testear rollback**: Un despliegue que no puede hacer rollback de forma segura no está listo para producción
4. **Conflictos de schema de base de datos**: Cambios de schema breaking desplegados antes de que ambas apps sean compatibles
5. **Dejar ambientes viejos corriendo**: Los ambientes no utilizados generan costos en la nube; automatiza la limpieza

## Preguntas Frecuentes

**P: ¿Cuánto cuesta blue-green?**
R: Aproximadamente el doble durante las ventanas de deploy. Puedes reducir blue a instancias mínimas entre deploys.

**P: ¿Puedo usar blue-green con serverless?**
R: Sí. Los alias de AWS Lambda, las etapas canary de API Gateway y los despliegues production/preview de Vercel lo soportan.

**P: ¿Cuál es la diferencia entre blue-green y canary?**
R: Blue-green conmuta el 100% del tráfico de una vez. Canary dirige un pequeño porcentaje primero, luego aumenta gradualmente.
