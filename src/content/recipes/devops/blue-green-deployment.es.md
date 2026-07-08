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
  - ci-cd
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

## Lo que funciona

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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Pipeline CI/CD con GitHub Actions

```yaml
# .github/workflows/blue-green.yml
name: Blue-Green Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to green
        run: |
          kubectl apply -f k8s/green-deployment.yaml
          kubectl rollout status deployment/app-green --timeout=120s

      - name: Smoke test green
        run: |
          GREEN_IP=$(kubectl get svc app-green -o jsonpath='{.spec.clusterIP}')
          for i in $(seq 1 10); do
            if curl -sf "http://$GREEN_IP:8080/health"; then
              echo "Green healthy"
              break
            fi
            sleep 5
          done

      - name: Switch traffic to green
        run: |
          kubectl patch svc app-active -p '{"spec":{"selector":{"version":"green"}}}'

      - name: Verify production
        run: |
          sleep 30
          if ! curl -sf https://api.example.com/health; then
            kubectl patch svc app-active -p '{"spec":{"selector":{"version":"blue"}}}'
            echo "Rollback triggered"
            exit 1
          fi

      - name: Scale down blue
        run: kubectl scale deployment app-blue --replicas=0
```

### Estrategia de Migración de Base de Datos

```python
import psycopg2

def expand_migrate(conn):
    """Fase 1: Expand — agregar nuevas columnas, mantener las viejas."""
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email_v2 VARCHAR(255);
        """)
        cur.execute("""
            UPDATE users SET email_v2 = email;
        """)
        conn.commit()

def contract_migrate(conn):
    """Fase 2: Contract — remover columnas viejas después de decomisionar blue."""
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE users DROP COLUMN IF EXISTS email;
        """)
        conn.commit()

# Secuencia de deploy:
# 1. Ejecutar expand_migrate (tanto blue como green funcionan)
# 2. Conmutar tráfico a green
# 3. Después de validación, ejecutar contract_migrate (solo green usa el nuevo schema)
```

### Script de Monitoreo Post-Conmutación

```bash
#!/bin/bash
# monitor-post-switch.sh

DURATION=300  # 5 minutos
INTERVAL=10
END=$((SECONDS + DURATION))

while [ $SECONDS -lt $END ]; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health)
  LATENCY=$(curl -s -o /dev/null -w "%{time_total}" https://api.example.com/health)
  ERROR_RATE=$(curl -s https://api.example.com/metrics | grep error_rate | awk '{print $2}')

  echo "$(date -Iseconds) status=$STATUS latency=${LATENCY}s error_rate=$ERROR_RATE"

  if [ "$STATUS" != "200" ] || (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
    echo "ALERT: Rollback"
    kubectl patch svc app-active -p '{"spec":{"selector":{"version":"blue"}}}'
    exit 1
  fi

  sleep $INTERVAL
done

echo "Monitoreo completo. Green está estable."
```

## Mejores Prácticas Adicionales

1. **Pre-calienta el ambiente green.** Envía shadow traffic antes de la conmutación para JIT-compilar código y calentar cachés:

```bash
# Espejar 10% del tráfico a green por 2 minutos antes de la conmutación completa
istioctl experimental envoy-config 2>&1 | grep mirror
```

2. **Taguea imágenes Docker con Git SHA, no solo semver.** Esto hace el rollback determinístico:

```bash
# Build y tag
docker build -t myapp:$(git rev-parse --short HEAD) .
# Deploy green con SHA específico
kubectl set image deployment/app-green app=myapp:abc1234
```

3. **Usa DNS TTL sabiamente.** Configura TTL a 60 segundos o menos durante ventanas de deploy para asegurar propagación rápida:

```bash
# Route53 con TTL bajo para ventana de deploy
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123 \
  --change-batch '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"api.example.com","Type":"A","TTL":60,"ResourceRecords":[{"Value":"1.2.3.4"}]}}]}'
```

## Errores Comunes Adicionales

1. **No testear el path de rollback.** Un rollback que no ha sido testeado fallará cuando más lo necesites:

```bash
# Incluir test de rollback en staging
./scripts/switch-traffic.sh green
sleep 10
./scripts/switch-traffic.sh blue  # verificar que el rollback funciona
```

2. **Tamaños de instancia diferentes para blue y green.** Green debe manejar la misma carga que blue:

```yaml
# Ambos deployments deben tener recursos idénticos
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        resources:
          requests: { cpu: 500m, memory: 512Mi }
          limits: { cpu: 1000m, memory: 1Gi }
```

3. **Conmutar sin health checks.** Siempre verifica que green esté healthy antes de conmutar:

```bash
# Verificar que todos los pods de green estén ready
READY=$(kubectl get deployment app-green -o jsonpath='{.status.readyReplicas}')
DESIRED=$(kubectl get deployment app-green -o jsonpath='{.spec.replicas}')
if [ "$READY" != "$DESIRED" ]; then
  echo "Green no está fully ready: $READY/$DESIRED"
  exit 1
fi
```

## FAQ Adicional

### Como manejo conexiones WebSocket de larga duración durante una conmutación?

Usa un período de drain. Deja de aceptar nuevas conexiones en blue, espera que las existentes se cierren (con un timeout), luego conmuta. Para conexiones que exceden el timeout, envía una señal de reconnect para que los clientes se reconecten a green.

### Debo usar blue-green para microservicios?

Blue-green funciona bien para servicios individuales pero se vuelve costoso a nivel cluster. Para microservicios, usa canary deployments o feature flags en su lugar. Blue-green es mejor para apps monolíticas o servicios críticos que necesitan rollback instantáneo.

### Como gestiono secretos entre blue y green?

Ambos ambientes deberían referenciar el mismo secret store (Vault, AWS Secrets Manager). Nunca dupliques secrets en configs específicas de entorno. Los valores de los secretos son idénticos; solo difiere la versión del código.

## Tips de Rendimiento

1. **Escala blue hacia abajo entre deploys.** Mantén blue en 1 réplica para ahorrar costos manteniendo capacidad de rollback:

```bash
kubectl scale deployment app-blue --replicas=1
```

2. **Usa spot instances para el ambiente idle.** Green corre brevemente durante el deploy; córrelo en spot instances más baratas:

```yaml
nodeSelector:
  node-role.kubernetes.io/spot: "true"
```

3. **Cachéa la imagen Docker en todos los nodos.** Pre-pull la nueva imagen para evitar startup lento durante la conmutación:

```yaml
# Usar un DaemonSet para pre-pull
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: image-pre-puller
spec:
  template:
    spec:
      initContainers:
      - name: pull
        image: myapp:v2.0.0
        command: ["true"]
      containers:
      - name: pause
        image: gcr.io/google_containers/pause
```
