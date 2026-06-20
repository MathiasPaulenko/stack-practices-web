---
contentType: docs
slug: disaster-recovery-plan-template
templateType: disaster-recovery
title: "Plantilla de Plan de Recuperación ante Desastres"
description: "Plantilla de plan de recuperación ante desastres para documentar targets RTO/RPO, procedimientos de failover y runbooks de recuperación que minimizan downtime ante fallas catastróficas."
metaDescription: "Plantilla de plan de recuperación ante desastres: define targets RTO/RPO, procedimientos de failover y runbooks de recuperación para minimizar downtime."
difficulty: advanced
topics:
  - devops
tags:
  - devops
  - template
relatedResources:
  - /guides/devops/infrastructure-as-code-guide
  - /docs/templates/runbook-template
  - /guides/devops/monitoring-alerting-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de plan de recuperación ante desastres: define targets RTO/RPO, procedimientos de failover y runbooks de recuperación para minimizar downtime."
  keywords:
    - plan recuperacion desastres template
    - rto rpo plantilla
    - procedimientos failover template
    - plan continuidad negocio
    - runbook dr
---

# Plantilla de Plan de Recuperación ante Desastres

Usa esta plantilla para prepararte para fallas catastróficas y minimizar tiempo de recuperación. Complémentala con la [Plantilla de Runbook](/docs/templates/runbook-template) para procedimientos operacionales.

## Plantilla

```markdown
# Plan de Recuperación ante Desastres: [Servicio / Sistema]

## Overview
| Campo | Valor |
|-------|-------|
| **Dueño del plan** | [equipo o individuo] |
| **Última prueba** | [fecha] |
| **RTO** | [horas — máximo downtime aceptable] |
| **RPO** | [minutos — máxima pérdida de datos aceptable] |

## Escenarios de Riesgo

| Escenario | Probabilidad | Impacto | Mitigación |
|-----------|-----------|--------|------------|
| Caída de región | Media | Crítico | Despliegue multi-región |
| Corrupción de base de datos | Baja | Crítico | Restore point-in-time |
| Compromiso de credenciales | Media | Alto | Rotación de tokens + lockdown IAM |
| Caída de tercero | Alta | Medio | Circuit breakers + fallback |

## Procedimientos de Failover

### Escenario: Región Primaria No Disponible

1. **Detectar** — alerta de monitoreo confirma falla de health check regional
2. **Decidir** — comandante de incidente confirma failover (no flapping)
3. **Enrutar** — actualizar DNS / load balancer a región secundaria
4. **Verificar** — smoke tests pasan en región secundaria
5. **Comunicar** — actualizar página de estado y canales internos

### Escenario: Corrupción de Base de Datos

1. **Detener escrituras** — poner base de datos en read-only
2. **Identificar** — determinar alcance de corrupción y hora del evento
3. **Restaurar** — restaurar desde último backup limpio a nueva instancia
4. **Reproducir** — aplicar WAL / binlog hasta justo antes de la corrupción
5. **Validar** — ejecutar checks de integridad de datos
6. **Switch** — promover instancia restaurada a primaria

## Runbook de Recuperación

```bash
# 1. Verificar salud de región secundaria
kubectl --context=dr get nodes

# 2. Promover réplicas de lectura
gcloud sql instances promote-replica dr-replica

# 3. Actualizar DNS
aws route53 change-resource-record-sets --hosted-zone-id Z123 \
  --change-batch file://failover.json

# 4. Verificar
./smoke-tests.sh --env=dr
```

## Dependencias y Su Estado de DR

| Dependencia | Su RTO | Nuestro Fallback |
|------------|--------|-----------------|
| Procesador de pagos | 4 horas | Encolar transacciones, reintentar después |
| Proveedor de identidad | 1 hora | Validación JWT cacheada + login degradado |
| CDN | 0 minutos | Switch multi-CDN |

## Calendario de Pruebas

| Tipo de Prueba | Frecuencia | Última Completada | Resultado |
|---------------|-----------|-------------------|-----------|
| Ejercicio tabletop | Trimestral | [fecha] | [pass / gaps encontrados] |
| Drill de failover | Semestral | [fecha] | [pass / gaps encontrados] |
| Test de restore de backup | Mensual | [fecha] | [pass / gaps encontrados] |
| Ingeniería del caos | Mensual | [fecha] | [pass / gaps encontrados] |

## Plan de Comunicación

| Audiencia | Trigger | Mensaje | Canal |
|----------|---------|---------|-------|
| Ingeniería | Cualquier evento DR | Canal de incidentes | Slack #incidents |
| Liderazgo | RTO > 50% | Actualización de estado | Email + llamada |
| Clientes | RTO > 75% | Página de estado + tweet | Página de estado |
```

## RTO y RPO Explicados

| Métrica | Definición | Ejemplo |
|---------|-----------|---------|
| **RTO** (Recovery Time Objective) | Cuánto tiempo puedes estar caído | 4 horas |
| **RPO** (Recovery Point Objective) | Cuántos datos puedes perder | 15 minutos |

Si tus backups de base de datos corren cada hora y tu RPO es 15 minutos, tu estrategia de backup no cumple el objetivo.

## Mejores Prácticas

- **Testea recuperación trimestralmente** — un plan no probado es una fantasía. Consulta la [Guía de Infraestructura como Código](/guides/devops/infrastructure-as-code-guide) para aprovisionamiento automatizado de ambientes.
- **Automatiza failover donde sea posible** — failover impulsado por humanos toma 10x más tiempo
- **Documenta decisiones, no solo pasos** — por qué elegiste este RTO ayuda a futuros revisores
- **Mantén el plan accesible offline** — durante un desastre, tu wiki interna puede estar caída. Consulta la [Guía de Monitoreo y Alertas](/guides/devops/monitoring-alerting-guide) para triggers de detección.
- **Incluye dependencias de terceros** — tu DR es tan fuerte como tu vendor más débil

## Errores Comunes

- Backups no probados — un backup que nunca restauraste es un backup de Schrödinger
- Todo en una sola región — las regiones de AWS fallan; multi-región no es opcional para servicios críticos
- Sin rollback desde failover — volver al primario es más difícil que hacer failover
- Ignorar consistencia de datos durante failover — escrituras split-brain corrompen datos
- RTO/RPO definidos por managers sin input de ingeniería — si el target es físicamente imposible, el plan es teatro

## Preguntas Frecuentes

### ¿Qué tan frecuentemente debería testear recuperación ante desastres?

Ejercicios tabletop trimestrales, drills de failover semestrales, tests de restore de backup mensuales. Para configuración de monitoreo, consulta la [Guía de Monitoreo y Alertas](/guides/devops/monitoring-alerting-guide). Si nunca has hecho un drill, empieza con un tabletop esta semana.

### ¿Cuál es la diferencia entre backup y recuperación ante desastres?

Los backups son un componente de DR. DR incluye las personas, procesos y herramientas para recuperar operaciones. Backups sin un procedimiento de recuperación probado son solo archivos comprimidos.

### ¿Debería automatizar failover o usar aprobación humana?

Automatiza detección y preparación (pre-stage región secundaria), pero requiere aprobación humana para el switch real de tráfico. Los falsos positivos son costosos; failover automatizado a una región rota es peor que breve downtime.
