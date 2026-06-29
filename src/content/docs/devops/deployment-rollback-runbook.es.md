---
contentType: docs
slug: deployment-rollback-runbook
title: "Runbook de Rollback de Despliegue"
description: "Un runbook para revertir despliegues fallidos de forma segura en Kubernetes, Docker e infraestructura basada en VMs con tiempo de inactividad minimo."
metaDescription: "Revierte despliegues fallidos de forma segura con este runbook. Cubre rollbacks de Kubernetes, cambios blue-green, migraciones de base de datos y verificaciones."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - runbook
  - rollback
  - kubernetes
  - deployment
  - docker
  - ci-cd
relatedResources:
  - /docs/devops/zero-downtime-deployment-checklist
  - /docs/devops/runbook-database-failover
  - /docs/devops/incident-communication-template
  - /docs/devops/downtime-communication-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Revierte despliegues fallidos de forma segura con este runbook. Cubre rollbacks de Kubernetes, cambios blue-green, migraciones de base de datos y verificaciones."
  keywords:
    - rollback despliegue
    - rollback kubernetes
    - despliegue blue green
    - falla de despliegue
    - revertir despliegue
---

## Overview

Los despliegues fallidos son la fuente mas comun de incidentes en produccion. Un despliegue que funciono en staging falla en produccion debido a diferencias de entorno, secretos faltantes o estados de base de datos incompatibles. Este runbook proporciona procedimientos de rollback para Kubernetes, Docker e infraestructura basada en VMs, incluyendo como manejar rollbacks de esquema de base de datos de forma segura.

## When to Use

Usa este runbook cuando:
- Las tasas de error aumentan inmediatamente despues de un despliegue
- Las nuevas capacidades no operan como se espera en produccion
- El rendimiento se degrada despues de un cambio de codigo
- Se descubre un error critico despues del despliegue

## Prerequisites

Antes de comenzar:
- [ ] Identificar la ultima version de despliegue conocida como buena (tag de imagen, commit SHA)
- [ ] Confirmar que la falla esta relacionada con el despliegue, no con la infraestructura
- [ ] Notificar al equipo en el canal de incidente
- [ ] Verificar si migraciones de base de datos fueron parte del despliegue

## Solution

```markdown
# Runbook de Rollback de Despliegue: `<Nombre del Servicio>`

## 1. Evaluar la Falla (2 minutos)

### Verificar Tasa de Error
```bash
# Tasa de error de la aplicacion
curl -s http://app.internal/metrics | grep error_rate

# Estado de pods de Kubernetes
kubectl get pods -l app=myapp
kubectl logs -l app=myapp --tail=100 | grep ERROR
```

| Verificacion | Umbral | Accion si se Excede |
|--------------|--------|---------------------|
| Tasa de error | > 1% | Proceder al rollback |
| Latencia p95 | > 2x baseline | Proceder al rollback |
| Reinicios de pods | > 3 en 5 min | Proceder al rollback |
| Readiness fallido | > 50% de pods | Proceder al rollback |

### Identificar la Version Mala
```bash
# Kubernetes
git log --oneline -n 5
kubectl get deployment myapp -o jsonpath='{.spec.template.spec.containers[0].image}'

# Docker Swarm
docker service inspect myapp --format='{{.Spec.TaskTemplate.ContainerSpec.Image}}'
```

### Verificar Migraciones de Base de Datos
```bash
# Si se uso flyway o liquibase
# Verificar tabla de migraciones para la ultima migracion aplicada
kubectl logs deployment/myapp --container=init-migrate | tail -20
```

**Puerta de Decision:** Si se ejecutaron migraciones de base de datos, proceder a la seccion de rollback de base de datos antes del rollback de aplicacion.

## 2. Detener el Despliegue (30 segundos)

```bash
# Kubernetes: pausar rollout
kubectl rollout pause deployment/myapp

# Docker Swarm: escalar a cero temporalmente
docker service update --replicas=0 myapp

# VM: detener servicio systemd
sudo systemctl stop myapp
```

## 3. Revertir Aplicacion (1-3 minutos)

### Kubernetes
```bash
# Revertir a revision anterior
kubectl rollout undo deployment/myapp

# O revertir a revision especifica
kubectl rollout undo deployment/myapp --to-revision=3

# Verificar
kubectl rollout status deployment/myapp
kubectl get pods -l app=myapp
```

### Docker / Docker Swarm
```bash
# Actualizar servicio a tag de imagen anterior
docker service update \
  --image myapp:v1.2.3 \
  --update-delay 10s \
  myapp

# O manualmente con docker-compose
docker-compose pull && docker-compose up -d
```

### VM / Systemd
```bash
# Restaurar binario/paquete anterior
sudo dpkg -i myapp_1.2.3_amd64.deb
# o
cp /opt/myapp/backup/v1.2.3/myapp /usr/local/bin/myapp
sudo systemctl restart myapp
```

### Cambio Blue-Green (si se usa blue-green)
```bash
# Cambiar balanceador de carga a entorno green
# No se necesita reinicio de aplicacion
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:...:green-tg
```

## 4. Revertir Base de Datos (si es necesario, 5-15 minutos)

### Si la Migracion fue Reversible
```bash
# Flyway
flyway undo

# Django
python manage.py migrate app 0003_previous_migration

# Rails
rails db:rollback STEP=1
```

### Si la Migracion fue Destructiva
```bash
# Restaurar desde snapshot pre-despliegue
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier myapp-db-rolled-back \
  --db-snapshot-identifier pre-deploy-snapshot-2026-06-26

# O usar point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier myapp-db \
  --target-db-instance-identifier myapp-db-rolled-back \
  --restore-time 2026-06-26T09:00:00Z
```

**ADVERTENCIA:** Los rollbacks de base de datos causan tiempo de inactividad. Coordinar con stakeholders antes de proceder.

## 5. Verificar Exito del Rollback (3 minutos)

```bash
# Health checks
curl -f http://app.internal/health

# Smoke tests
./scripts/smoke-test.sh

# Tasa de error de vuelta al baseline
curl -s http://app.internal/metrics | grep error_rate
```

| Verificacion | Estado | Tiempo |
|--------------|--------|--------|
| Todos los pods saludables | [ ] | ___ |
| Health checks pasando | [ ] | ___ |
| Tasa de error < baseline | [ ] | ___ |
| Latencia p95 normal | [ ] | ___ |
| Flujos criticos de usuario funcionando | [ ] | ___ |

## 6. Acciones Post-Rollback

- [ ] Etiquetar el despliegue malo en CI/CD como `DO_NOT_DEPLOY`
- [ ] Crear linea de tiempo de incidente con tiempos de despliegue y rollback
- [ ] Documentar causa raiz en canal de incidente
- [ ] Programar postmortem dentro de 24 horas
- [ ] Actualizar checklist de despliegue para prevenir recurrencia
- [ ] Eliminar imagen mala del registry o marcar como obsoleta
```

## Explanation

El runbook ordena las operaciones por **riesgo**: evaluar primero (no revertir un problema no relacionado con el despliegue), detener la hemorragia (pausar despliegue), restaurar el servicio (rollback), luego limpiar (base de datos, verificacion). La idea critica es que los rollbacks de base de datos son mas peligrosos que los de aplicacion — pueden causar perdida de datos y requerir restauraciones desde snapshot. Siempre verificar si se ejecutaron migraciones antes de revertir solo la aplicacion.

## Variants

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Kubernetes | `kubectl rollout undo` | Mas rapido, historial de revisiones integrado |
| Docker Swarm | `docker service update --image` | Requiere imagen anterior disponible |
| Blue-Green | Cambio de balanceador de carga | Instante, pero requiere entorno green pre-construido |
| VMs con systemd | Reemplazo de binario + reinicio | Mas lento, requiere gestion de paquetes/binarios |

## Lo que funciona

1. **Mantener siempre la version N-1** en tu registry de contenedores para rollback instantaneo
2. **Tomar snapshots de base de datos antes de migraciones** — la restauracion es tu unica opcion para cambios destructivos
3. **Automatizar health checks** en CI/CD para detectar fallas antes del despliegue completo
4. **Usar feature flags** para cambios riesgosos — desactivar sin redeployar
5. **Practicar rollbacks mensualmente** en staging con los mismos procedimientos

## Common Mistakes

1. **Revertir la aplicacion sin revertir migraciones de base de datos** — mismatch de esquema causa crashes
2. **No pausar el rollout primero** — rollback lucha contra un despliegue en curso
3. **Olvidar verificar despues del rollback** — asume que el rollback funciono sin revisar metricas
4. **Eliminar el despliegue fallido demasiado rapido** — pierde logs necesarios para analisis de causa raiz
5. **Revertir sin entender la falla** — puede re-introducir el problema en el proximo despliegue

## Frequently Asked Questions

### Como se a que revision revertir?

Verifica `kubectl rollout history deployment/myapp` para numeros de revision. La ultima revision conocida como buena suele ser N-1. Cruza referencia con timestamps de despliegue en tu pipeline de CI/CD.

### Puedo revertir una migracion de base de datos que borro datos?

No. Si una migracion elimino columnas, borro filas o altero datos, `flyway undo` o `rails db:rollback` no pueden recuperarlos. Debes restaurar desde un snapshot o backup pre-despliegue.

### Que pasa si el rollback tambien falla?

Si `kubectl rollout undo` falla (por ejemplo, imagen faltante), configura manualmente el despliegue al tag anterior: `kubectl set image deployment/myapp myapp=registry/app:v1.2.3`. Si eso tambien falla, escala el despliegue a cero e investiga — puede ser necesario reconstruir la version anterior desde el codigo fuente.
