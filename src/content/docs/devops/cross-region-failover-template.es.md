---
contentType: docs
slug: cross-region-failover-template
title: "Plantilla de Prueba de Failover Cross-Region"
description: "Una plantilla para documentar procedimientos de prueba de disaster recovery multi-región."
metaDescription: "Usa esta plantilla de failover cross-region para planificar y ejecutar pruebas de disaster recovery en múltiples regiones de AWS, GCP o Azure."
difficulty: advanced
topics:
  - devops
tags:
  - devops
  - disaster-recovery
  - failover
  - multi-region
  - availability
  - template
relatedResources:
  - /docs/backup-and-restore-template
  - /docs/auto-scaling-policy-template
  - /docs/cloud-cost-allocation-template
  - /docs/deployment-checklist-template
  - /docs/api-status-page-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de failover cross-region para planificar y ejecutar pruebas de disaster recovery en múltiples regiones de AWS, GCP o Azure."
  keywords:
    - devops
    - disaster-recovery
    - failover
    - multi-region
    - disponibilidad
    - plantilla
---
## Visión General

Los desastres no respetan tu horario de oficina. Cortes regionales, cortes de fibra óptica y eventos climáticos pueden dejar toda una región de nube indisponible. Un plan de failover cross-region que existe solo en papel fallará cuando más lo necesites. Esta plantilla estructura un procedimiento de DR realista y testeable que tu equipo puede ejecutar bajo presión.

## Cuándo Usar

Usa este recurso cuando:
- Tu SLA requiere > 99.9% de disponibilidad y una sola región es un punto único de fallo
- Cumplimiento o seguro requieren procedimientos documentados de disaster recovery
- Estás lanzando un servicio en una segunda región y necesitas un runbook para failover

## Solución

```markdown
# Prueba de Failover Cross-Region: `<Servicio>`

## 1. Metadatos del Servicio

| Campo | Valor |
|-------|-------|
| Servicio | `nombre` |
| Región Primaria | `us-east-1` |
| Región Secundaria | `us-west-2` |
| RTO Objetivo | `15 minutos` |
| RPO Objetivo | `5 minutos` |
| Replicación de Datos | `Async / Sync` |
| Última Fecha de Prueba | `YYYY-MM-DD` |
| Responsable de Prueba | `@equipo` |

## 2. Checklist Pre-Prueba

- [ ] Notificar a stakeholders de la ventana de prueba planificada
- [ ] Verificar que los recursos de la región secundaria estén aprovisionados y saludables
- [ ] Confirmar que el lag de replicación de datos está dentro del objetivo RPO
- [ ] Confirmar que el TTL de DNS está lo suficientemente bajo para cutover rápido (≤ 60s recomendado)
- [ ] Deshabilitar alertas automatizadas que dispararán durante la prueba
- [ ] Abrir un bridge / war room para coordinación en tiempo real

## 3. Procedimiento de Failover

### 3.1. Detectar Falla de Región Primaria

| Paso | Acción | Verificación | Tiempo |
|------|--------|-------------|--------|
| 1 | Confirmar health checks fallando en región primaria | Load balancer / probe sintético | 1 min |
| 2 | Escalar a incident commander | Page + bridge | 2 min |
| 3 | Verificar que la falla es regional, no de aplicación | Dashboard de estado regional | 3 min |

### 3.2. Promover Región Secundaria

| Paso | Acción | Verificación | Tiempo |
|------|--------|-------------|--------|
| 4 | Promover réplica de base de datos a primaria | Comando `promote-replica` + test de conectividad | 5 min |
| 5 | Escalar cómputo secundario a capacidad de producción | Autoscaling group / desired count | 5 min |
| 6 | Redirigir DNS / CDN a región secundaria | `dig`, `curl` desde host externo | 2 min |
| 7 | Verificar tráfico fluyendo a secundaria | Logs de ALB, transacciones sintéticas | 2 min |
| 8 | Notificar a stakeholders de failover activo | Actualización de status page + Slack | 1 min |

### 3.3. Verificación Post-Failover

| Check | Método | Resultado Aceptable |
|-------|--------|---------------------|
| Transacciones sintéticas | Probe cada 30s | 100% éxito por 5 min |
| Tasa de error | Dashboard | < 0.1% por 10 min |
| Latencia | APM / sintético | P95 < 2x baseline |
| Estado de replicación | Consola de admin de base de datos | N/A (ahora primaria) |
| Integridad de datos | Spot-check de registros clave | Sin anomalías |

## 4. Procedimiento de Failback

| Paso | Acción | Verificación |
|------|--------|-------------|
| 1 | Confirmar que región primaria está totalmente operacional | Dashboard de estado regional |
| 2 | Re-establecer replicación de secundaria a primaria | Lag de replicación < 5s |
| 3 | Programar ventana de mantenimiento para failback | Aprobación de stakeholders |
| 4 | Degradar secundaria a estado de réplica | Consola de base de datos confirma |
| 5 | Redirigir DNS de vuelta a primaria | Probe externo confirma |
| 6 | Escalar secundaria a capacidad de standby | Cantidad de recursos |
| 7 | Verificar salud completa de replicación round-trip | Lag + checksum |

## 5. Escenarios de Prueba

| Escenario | Disparador | Resultado Esperado |
|-----------|-----------|-------------------|
| Falla regional simulada | Blackhole ALB primario | Failover completa dentro del RTO |
| Lag de réplica de base de datos | Pausar replicación | Failover bloqueado hasta lag < RPO |
| Retraso de propagación DNS | TTL alto | Documentar tiempo real de propagación |
| Degradación parcial | Throttle región primaria | Decisión: failover o esperar |
| Inconsistencia de datos | Inyectar gap de 1 minuto de datos | Verificar detección + plan de reconciliación |

## 6. Reporte Post-Prueba

| Métrica | Objetivo | Real | Aprobado / Fallido |
|---------|---------|------|-------------------|
| Tiempo de detección | < 2 min | `X min` | |
| Tiempo de failover | < 15 min | `X min` | |
| Tiempo de failback | < 30 min | `X min` | |
| Pérdida de datos | < 5 min | `X min` | |
| Tasa de error durante switch | < 0.5% | `X%` | |
| Observaciones | | | |
| Acciones pendientes | | | |
```

## Explicación

La plantilla fuerza a **probar todo el ciclo**: detectar → failover → verificar → failback. Muchos equipos prueban failover pero nunca failback, descubriendo demasiado tarde que no pueden volver a la región primaria sin pérdida de datos. El **RPO** determina cuántos datos puedes permitirte perder (basado en lag de replicación), mientras que el **RTO** determina cuánto tiempo el servicio puede estar caído. El TTL de DNS es un problema común: si tu TTL es de 1 hora, el failover tomará una hora independientemente de qué tan rápida sea tu infraestructura.

## Variantes

| Arquitectura | Enfoque | Notas |
|--------------|---------|-------|
| Activo-pasivo | Secundaria está fría; promover en falla | Menor costo, mayor RTO |
| Activo-activo | Ambas regiones sirven tráfico; cambiar en falla | Mayor costo, RTO cercano a cero |
| Blue-green | Región secundaria es un espejo; cambiar DNS | Bueno para bases de datos con streaming replication |
| Cell-based | Usuarios asignados a una celda; mover celdas | Usado por Netflix, requiere diseño stateless |

## Mejores Prácticas

1. Ejecuta pruebas de failover trimestralmente en producción, no solo en staging
2. Documenta cada comando; no confíes en la memoria durante un incidente
3. Prueba failback tan exhaustivamente como failover; el camino de retorno es donde la mayoría de los planes fallan
4. Mantén la infraestructura de la región secundaria aprovisionada pero escalada hacia abajo; lanzar desde cero es demasiado lento
5. Monitorea el lag de replicación continuamente; failover durante lag alto garantiza pérdida de datos

## Errores Comunes

1. Probar solo en staging, donde la carga y volumen de datos no coinciden con producción
2. Olvidar actualizar registros DNS o TTL antes de la prueba
3. No probar la decisión de failover versus esperar durante degradación parcial
4. Pasar por alto que cargas de escritura intensa crean mayor lag de replicación que cargas de solo lectura
5. No verificar integridad de datos después de failover; la consistencia importa más que la velocidad

## Preguntas Frecuentes

### ¿Con qué frecuencia debo ejecutar una prueba de failover cross-region?

Trimestralmente como mínimo. Para servicios financieros o de salud críticos, mensualmente. La prueba debe incluir tráfico de producción o una carga sintética realista. Una prueba en frío (sin tráfico) no prueba nada.

### ¿Debería automatizar failover o requerir aprobación humana?

Automatiza detección y alertas, pero requiere aprobación humana para el failover real a menos que tu sistema sea verdaderamente stateless y tu RTO sea menor a 2 minutos. Los falsos positivos (failover por un glitch de monitoreo) pueden causar más daño que el problema original.

### ¿Qué pasa si mi base de datos no soporta replicación cross-region?

Usa una base de datos que sí lo haga (Amazon Aurora Global, CockroachDB, Spanner, YugabyteDB). Si no puedes cambiar de base de datos, usa escrituras duales a nivel de aplicación o un pipeline CDC (Debezium, AWS DMS) para replicar cambios. Acepta que tu RPO será mayor.
