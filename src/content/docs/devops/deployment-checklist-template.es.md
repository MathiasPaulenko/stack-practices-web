---
contentType: docs
slug: deployment-checklist-template
title: "Plantilla de Checklist de Despliegue"
description: "Una checklist de verificación pre-release para despliegues seguros en producción."
metaDescription: "Usa esta plantilla de checklist de despliegue para verificar tests, rollbacks, monitoreo y comunicación antes de cada release en producción."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - deployment
  - checklist
  - release
  - verification
  - template
relatedResources:
  - /docs/post-deployment-checklist-template
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/capacity-planning-template
  - /docs/contributing-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de checklist de despliegue para verificar tests, rollbacks, monitoreo y comunicación antes de cada release en producción."
  keywords:
    - devops
    - despliegue
    - checklist
    - release
    - verificación
    - plantilla
---
## Visión General

Los despliegues en producción son momentos de alto riesgo. Un solo paso omitido puede causar caídas, pérdida de datos o exposiciones de seguridad. Esta plantilla de checklist asegura que cada release siga los mismos pasos de verificación, desde tests pre-merge hasta validación post-despliegue.

## Cuándo Usar

Usa este recurso cuando:
- Preparas cualquier despliegue a producción o staging
- Integras nuevos miembros del equipo al proceso de release
- Auditas el proceso de despliegue después de un incidente

## Solución

```markdown
# Checklist de Despliegue: `<Nombre del Release>`

## Metadatos del Release

| Campo | Valor |
|-------|-------|
| Servicio | `nombre` |
| Versión | `x.y.z` |
| Rama / Commit | `main@abc1234` |
| Desplegador | `@username` |
| Fecha | `YYYY-MM-DD HH:MM UTC` |
| Ticket / PR | `PROJ-123` |

## 1. Pre-Despliegue

### 1.1. Código y Tests

- [ ] Todos los checks de CI pasan (lint, tests unitarios, tests de integración)
- [ ] Code review aprobado por al menos un ingeniero senior
- [ ] Sin alertas de seguridad sin resolver (Snyk, Dependabot)
- [ ] Migraciones de base de datos revisadas para compatibilidad hacia atrás
- [ ] Feature flags configuradas y por defecto apagadas

### 1.2. Infraestructura

- [ ] Entorno staging desplegado y validado
- [ ] Capacidad de producción verificada (CPU, memoria, disco)
- [ ] Reglas de autoscaling revisadas (replicas mínimas / máximas)
- [ ] Artefacto de rollback construido y almacenado (imagen Docker, AMI)
- [ ] Plan de invalidación de caché CDN documentado (si aplica)

### 1.3. Comunicación

- [ ] Stakeholders notificados de la ventana de despliegue
- [ ] Ingeniero on-call disponible
- [ ] Página de estado actualizada a "Mantenimiento" (si hay downtime esperado)
- [ ] Equipos de atención al cliente informados de los cambios

## 2. Despliegue

### 2.1. Base de Datos (si aplica)

- [ ] Scripts de migración probados contra una copia de datos de producción
- [ ] Migración ejecutada con `ALTER TABLE ... ADD COLUMN` (no operaciones destructivas primero)
- [ ] Duración de la migración estimada y aprobada por el DBA
- [ ] Script de rollback preparado para cambios destructivos

### 2.2. Aplicación

- [ ] Desplegar usando estrategia blue/green o canary
- [ ] Monitorear tasa de error durante 5 minutos después de cada incremento de canary
- [ ] Verificar que health checks devuelven 200 OK
- [ ] Confirmar que nuevos pods/contenedores reciben tráfico

### 2.3. Verificación

- [ ] Smoke tests pasan contra endpoints de producción
- [ ] Flujos críticos de usuario probados (login, checkout, búsqueda)
- [ ] Logs no muestran errores o excepciones inesperadas
- [ ] Métricas dentro de la línea base (latencia p95, tasa de error, CPU)

## 3. Post-Despliegue

### 3.1. Validación

- [ ] Feature flags habilitadas incrementalmente (5% → 25% → 100%)
- [ ] Resultados de tests A/B monitoreados (si aplica)
- [ ] Soporte al cliente informado de nuevas capacidades o cambios
- [ ] Documentación actualizada (docs de API, runbooks, wiki)

### 3.2. Monitoreo

- [ ] Dashboards revisados por anomalías (tráfico, errores, latencia)
- [ ] Alertas disparándose como se espera (sin falsos positivos ni alertas silenciadas)
- [ ] Monitoreo sintético pasando (Pingdom, Datadog Synthetics)
- [ ] Seguimiento de errores revisado (Sentry, Rollbar) para nuevos issues

### 3.3. Limpieza

- [ ] Versiones antiguas escaladas hacia abajo después de confirmar estabilidad (30 min)
- [ ] Ramas de funcionalidad eliminadas
- [ ] Log de despliegue archivado para auditoría
- [ ] Página de estado actualizada a "Operacional"
```

## Explicación

El checklist está ordenado por **riesgo**: calidad de código primero, luego preparación de infraestructura, luego ejecución, luego validación. El artefacto de rollback es un requisito estricto porque no puedes desplegar de forma segura lo que no puedes revertir rápidamente. Los incrementos de canary con health checks detectan problemas antes de que afecten a todos los usuarios. El monitoreo post-despliegue se extiende más allá del momento del despliegue porque algunos problemas (fugas de memoria, calentamiento de caché) solo aparecen después de tráfico sostenido.

## Script de Despliegue Canary

```bash
#!/bin/bash
# Despliegue canary con health checks
set -euo pipefail

SERVICE="api"
NAMESPACE="production"
CANARY_PERCENT=10

echo "=== Despliegue Canary: $SERVICE ==="

# Paso 1: Desplegar canary
echo "[1/5] Desplegando pod canary..."
kubectl set image deployment/$service-canary $service=registry.example.com/$service:$BUILD_TAG -n $NAMESPACE
kubectl rollout status deployment/$service-canary -n $NAMESPACE --timeout=120s

# Paso 2: Enrutar 10% de trafico al canary
echo "[2/5] Enrutando $CANARY_PERCENT% de trafico al canary..."
kubectl patch virtualservice $service -n $NAMESPACE --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"'$service'","subset":"stable"},"weight":90},{"destination":{"host":"'$service'","subset":"canary"},"weight":'$CANARY_PERCENT'}]}]}}'

# Paso 3: Monitorear por 10 minutos
echo "[3/5] Monitoreando canary por 10 minutos..."
sleep 600

ERROR_RATE=$(kubectl exec -n $NAMESPACE deployment/$service-canary -- curl -s http://localhost:8080/metrics | grep error_rate | awk '{print $2}')
echo "  Tasa de error: $ERROR_RATE"

if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "  ERROR: Tasa de error muy alta, revirtiendo canary"
  kubectl patch virtualservice $service -n $NAMESPACE --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"'$service'","subset":"stable"},"weight":100}]}]}}'
  kubectl delete deployment $service-canary -n $NAMESPACE
  exit 1
fi

# Paso 4: Promover a rollout completo
echo "[4/5] Promoviendo canary a rollout completo..."
kubectl set image deployment/$service $service=registry.example.com/$service:$BUILD_TAG -n $NAMESPACE
kubectl rollout status deployment/$service -n $NAMESPACE --timeout=300s

# Paso 5: Limpiar recursos canary
echo "[5/5] Limpiando recursos canary..."
kubectl patch virtualservice $service -n $NAMESPACE --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"'$service'","subset":"stable"},"weight":100}]}]}}'
kubectl delete deployment $service-canary -n $NAMESPACE

echo "=== Despliegue Canary Completado ==="
```

## Plantilla de Comunicacion de Despliegue

```text
=== Comunicacion de Despliegue ===

Canal: #deployments
Responsable: alice@example.com
Fecha: 2026-07-11 14:00 UTC

Iniciando despliegue: API v2.3.1
  Nivel de riesgo: MEDIO
  Cambios: Bug fixes + mejoras de rendimiento
  Rollback: git revert + redeploy (est. 5 min)

14:00 - Desplegando a staging... DONE
14:05 - Smoke tests en staging... PASS
14:10 - Desplegando canary (10% trafico)...
14:20 - Metricas canary OK (tasa error: 0.02%)
14:25 - Promoviendo a rollout completo...
14:30 - Rollout completo. Monitoreando 30 min.
15:00 - Despliegue confirmado estable. Estado: OPERACIONAL.

Si se detectan problemas: contactar #on-call, ref CHG-2026-07-11-001
Comando rollback: ./scripts/rollback.sh API v2.3.0
```


## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Hotfix | Checklist abreviado | Omitir pasos no críticos, enfocarse en tests y rollback |
| Mantenimiento programado | Sección de comunicación extendida | Incluir ventana de mantenimiento, notificaciones a clientes |
| Cambio solo de base de datos | Sección de base de datos enfatizada | Requerir aprobación del DBA, período de estabilización más largo |

## Lo que funciona

1. Automatizar cada checkbox que se pueda automatizar (tests, smoke tests, health checks)
2. Ejecutar el checklist en un documento o herramienta compartida para que múltiples personas confirmen pasos
3. Nunca desplegar viernes por la tarde o antes de festivos salvo que sea un fix crítico
4. Mantener el checklist lo suficientemente corto para completarse en 15 minutos para despliegues rutinarios
5. Revisar y actualizar el checklist después de cada incidente que involucre un despliegue

## Errores Comunes

1. Omitir validación en staging porque "el cambio es pequeño"
2. Desplegar sin un plan de rollback probado
3. No monitorear después de que el despliegue está "completo"
4. Desplegar múltiples cambios no relacionados en el mismo release
5. Permitir que desplegadores trabajen solos sin un segundo par de ojos

## Preguntas Frecuentes

### ¿Debería usar este checklist completo para cada despliegue?

No. Para despliegues rutinarios sin cambios de infraestructura, un checklist abreviado (tests, deploy, smoke tests, monitor) es suficiente. Usa el checklist completo para releases con cambios de base de datos, nuevas dependencias o modificaciones arquitectónicas.

### ¿Quién debería ser dueño del checklist?

El ingeniero on-call o release lead es dueño del checklist para un despliegue específico. El equipo de plataforma o SRE es dueño de la plantilla y la actualiza basándose en lecciones de incidentes.

### ¿Cómo manejo hotfixes de emergencia?

Usa un checklist abreviado: verificar el fix en staging, construir el artefacto, desplegar con canary, ejecutar smoke tests, monitorear durante 15 minutos. Documenta el despliegue de emergencia en una revisión post-incidente para determinar si vacíos de proceso causaron la urgencia.


### Como manejamos migraciones de base de datos durante el despliegue?

Ejecuta migraciones de base de datos antes del despliegue de la aplicacion. Usa el patron expand-and-contract: primero agrega nuevas columnas/tablas (expand), despliega la aplicacion que usa ambos esquemas viejo y nuevo, luego elimina columnas viejas (contract) en un despliegue posterior. Nunca ejecutes migraciones destructivas (drop column, rename table) en el mismo despliegue que el cambio de aplicacion. Prueba migraciones en una copia de datos de produccion. Ten una migracion de rollback lista. Documenta la migracion en la checklist de despliegue con duracion esperada.

### Que es el despliegue blue-green y cuando deberiamos usarlo?

El despliegue blue-green mantiene dos entornos identicos: blue (actual) y green (nuevo). Despliega la nueva version a green, ejecuta pruebas, luego cambia el trafico de blue a green. Usalo para: requisitos de zero-downtime, rollback instantaneo (cambiar de vuelta a blue), y cuando puedes permitirte el costo de infraestructura de dos entornos. Evitalo para: cambios pesados de base de datos (ambos entornos comparten la base), workloads sensibles a costo, o cuando la infraestructura es demasiado compleja de duplicar.

### Como gestionamos despliegues durante trafico pico?

Evita despliegues durante horas de trafico pico. Define ventanas de bajo trafico (tipicamente 10am-2pm UTC en dias laborables para servicios globales, o manana temprano hora local para servicios regionales). Si un despliegue es urgente durante pico, usa despliegue canary con porcentaje inicial muy pequeno (1-5%) y ventanas de monitoreo mas largas. Ten personal extra de on-call disponible. Comunica a stakeholders que un despliegue en pico esta ocurriendo y por que. Documenta la decision de desplegar durante pico en la revision post-despliegue.

### Que es el despliegue con feature flags y en que se diferencia de canary?

Los feature flags desacoplan el despliegue del release. Despliegas el nuevo codigo a todas las instancias pero mantienes la feature deshabilitada. Luego la habilitas gradualmente (0%, 1%, 10%, 50%, 100%) sin un nuevo despliegue. El despliegue canary enruta un porcentaje de trafico a nuevas instancias. Los feature flags son mejores para: rollout gradual de features, A/B testing, y deshabilitacion instantanea sin rollback. Canary es mejor para: probar cambios de infraestructura, detectar problemas en runtime, y validar rendimiento bajo carga real.

### Como automatizamos la checklist de despliegue?

Convierte la checklist en un pipeline de CI/CD con gates: tests automatizados, scans de seguridad, despliegue a staging, smoke tests, despliegue canary, health checks, y rollout a produccion. Usa herramientas como Argo Rollouts, Flagger o Spinnaker para entrega progresiva. Almacena la checklist como codigo (YAML o JSON) para que pueda versionarse y revisarse. Los pasos manuales (notificacion a stakeholders, aprobacion de negocio) permanecen como gates de aprobacion en el pipeline. Genera un reporte de despliegue automaticamente despues de cada rollout.


### Como manejamos rollbacks para migraciones de base de datos?

Los rollbacks de migraciones de base de datos son riesgosos. Para migraciones aditivas (agregar columna, agregar tabla), rollback eliminando los nuevos objetos. Para migraciones destructivas (eliminar columna, renombrar tabla), rollback requiere restaurar desde backup o escribir una migracion forward que recree los datos. Siempre prueba la migracion de rollback en staging con una copia de datos de produccion. Documenta el procedimiento de rollback con comandos exactos. Establece un limite de tiempo: si el rollback no puede completarse en 15 minutos, escala a restauracion desde backup. Nunca intentes un rollback complejo bajo presion sin un procedimiento probado.

### Que es un runbook de despliegue y por que necesitamos uno?

Un runbook de despliegue es una guia paso a paso que complementa la checklist. Incluye: comandos exactos a ejecutar, salida esperada para cada paso, capturas de dashboards a revisar, informacion de contacto de dependencias, y arboles de decision para problemas comunes. El runbook debe ser ejecutable por cualquier miembro del equipo, no solo por quien lo escribio. Almacena el runbook en control de versiones junto al codigo de la aplicacion. Actualizalo despues de cada despliegue que revele un vacio. Prueba el runbook haciendo que un miembro nuevo del equipo lo siga para un despliegue en staging.

### Como gestionamos dependencias de despliegue entre servicios?

Documenta las dependencias de servicios en un catalogo de servicios. Antes de desplegar un servicio, verifica si los servicios downstream dependen del contrato de API actual. Si el despliegue incluye cambios rompedores, notifica y coordina con los equipos dependientes. Usa feature flags para desacoplar el despliegue del release para cambios rompedores. Despliega en orden de dependencia: infraestructura primero, luego bases de datos, luego servicios backend, luego frontend. Para microservicios, usa contract testing (Pact) para verificar compatibilidad antes del despliegue.

### Que es progressive delivery y como mejora los despliegues?

Progressive delivery es un enfoque donde los despliegues se rollout gradualmente con evaluacion automatizada en cada etapa. Incluye despliegues canary, despliegues blue-green, y rollouts con feature flags. Herramientas como Argo Rollouts, Flagger y LaunchDarkly automatizan la progresion. En cada etapa, el sistema evalua metricas de salud (tasa de error, latencia, saturacion) y automaticamente promueve, pausa o revierte. Esto reduce el blast radius, detecta problemas temprano y elimina el error humano de la decision de go/no-go. Comienza con canary manual, luego automatiza progresivamente.


Revisa y actualiza la checklist de despliegue despues de cada incidente que involucre un despliegue. Elimina pasos que no agregan valor, agrega pasos que habrian detectado el problema, y refina los gates de automatizacion. Manten la checklist concisa enough para completar en 15 minutos para despliegues rutinarios.









End of document. Review and update quarterly.