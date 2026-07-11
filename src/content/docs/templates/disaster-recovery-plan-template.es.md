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
  - ci-cd
  - automation
  - deployment
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

## Lo que funciona

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


## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Startup | DR simplificado: backup + restore | RTO 8h, RPO 24h aceptable |
| Enterprise | DR multi-region activo-activo | RTO 15min, RPO 0 |
| E-commerce | DR con prioridad en catalogo y checkout | Restaurar en orden de impacto en ingresos |
| Fintech | DR con prioridad en integridad de transacciones | Cero perdida de datos tolerable |

## Ejemplo de DR Plan: Fallo de Region Primaria

```text
=== DR Plan: Fallo de Region us-east-1 ===

Escenario: Region us-east-1 no disponible
RTO Objetivo: 1 hora
RPO Objetivo: 15 minutos

Triage Inicial (0-5 min):
  1. Confirmar que us-east-1 esta caida (no es un falso positivo)
     - Verificar AWS Health Dashboard
     - Verificar status.aws.amazon.com
  2. Declarar incidente DR-SEV1
  3. Notificar a liderazgo y stakeholders
  4. Activar canal de DR (#dr-incident)

Ejecucion de Failover (5-45 min):
  Paso 1: Promover region secundaria (eu-west-1) a primaria
    - Actualizar DNS (Route 53) a apuntar a eu-west-1
    - Verificar que los health checks pasan en eu-west-1
    - Tiempo estimado: 5-10 min

  Paso 2: Escalar recursos en eu-west-1
    - Aumentar replicas para manejar el trafico completo
    - kubectl scale deployment app -n production --replicas=20
    - Tiempo estimado: 5-10 min

  Paso 3: Restaurar datos desde backup
    - Ultimo backup de RDS: hace 12 min (dentro de RPO)
    - Restaurar snapshot a nueva instancia en eu-west-1
    - Tiempo estimado: 15-20 min

  Paso 4: Verificar servicios
    - Health checks en todos los endpoints
    - Smoke tests en flujos criticos (login, pago, checkout)
    - Verificar que no hay datos perdidos (comparar conteos)
    - Tiempo estimado: 5-10 min

Comunicacion (paralelo a ejecucion):
  - Pagina de status: "Investigando interrupcion en us-east-1"
  - A los 15 min: "Failover a eu-west-1 en progreso"
  - A los 45 min: "Servicios restaurados en eu-west-1"
  - A los 60 min: "Incidente resuelto; investigando causa raiz"

Rollback (si failover falla):
  - Si eu-west-1 no puede manejar la carga: degradar a modo solo-lectura
  - Si datos no se pueden restaurar: usar ultimo backup valido (RPO mayor)
  - Si todo falla: activar plan de comunicacion de caida prolongada

Post-Recuperacion:
  - Monitorear estabilidad en eu-west-1 por 24 horas
  - Investigar causa raiz del fallo de us-east-1
  - Conducir postmortem dentro de 48 horas
  - Actualizar DR plan con learnings
  - Planificar migracion de vuelta a us-east-1 (o nueva region)
```

### Con que frecuencia debemos probar el DR plan?

Prueba el DR plan al menos anualmente para empresas, trimestralmente para servicios criticos. Tipos de prueba: walkthrough de mesa (paper exercise, 2 horas), simulacion parcial (failover de un servicio no critico, 4 horas), y failover completo (migrar todo el trafico, 8 horas). Documenta cada prueba: que funciono, que fallo, tiempo real vs RTO/RPO. Una prueba de DR que no falla nada no es una prueba real — busca puntos de fallo en un entorno controlado. Involucra a personas que no son los autores del plan — si solo el autor puede ejecutarlo, el plan no es resiliente.

### Cual es la diferencia entre RTO y RPO?

RTO (Recovery Time Objective) es cuanto tiempo tarda en restaurar el servicio — el tiempo desde la caida hasta que los usuarios pueden usar el sistema de nuevo. RPO (Recovery Point Objective) es cuanto datos puedes perder — el tiempo entre el ultimo backup valido y la caida. Un RTO de 1 hora significa que el servicio debe estar de vuelta en 1 hora. Un RPO de 15 minutos significa que puedes perder hasta 15 minutos de datos. RTO mide tiempo de recuperacion; RPO mide perdida de datos. Ambos son objetivos, no garantias — mide el tiempo real durante las pruebas de DR.

### Como calculamos el costo de un DR plan?

El costo de DR incluye: infraestructura de respaldo (region secundaria, instancias, storage), costos de replicacion (transferencia de datos entre regiones), costos de backup (snapshots, almacenamiento), costos de prueba (horas de ingenieria para game days), y costos de herramientas (DR orchestration, monitoring). Compara el costo de DR con el costo de caida: si una hora de caida cuesta $100K y el DR cuesta $50K/ano, el DR se paga solo en 30 minutos de caida evitada. Para servicios no criticos: un DR ligero (backup + restore manual) puede ser suficiente. Para servicios criticos: DR activo-activo es necesario a pesar del costo.































































End of document. Review and update quarterly.