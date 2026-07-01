---
contentType: docs
slug: disaster-recovery-test-plan
title: "Plan de Prueba de Recuperacion ante Desastres"
description: "Una plantilla para planificar y ejecutar pruebas de recuperacion ante desastres incluyendo validacion de failover, verificacion de integridad de datos y medicion de tiempo de recuperacion."
metaDescription: "Planifica y ejecuta pruebas de DR con esta plantilla. Cubre validacion de failover, verificacion de integridad de datos, medicion de RTO/RPO y reportes post-prueba."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - security
tags:
  - disaster-recovery
  - test-plan
  - rto
  - rpo
  - failover
  - runbook
  - compliance
relatedResources:
  - /docs/devops/runbook-database-failover
  - /docs/devops/deployment-rollback-runbook
  - /docs/devops/data-migration-runbook-template
  - /docs/devops/incident-communication-template
  - /docs/data-breach-response-playbook
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Planifica y ejecuta pruebas de DR con esta plantilla. Cubre validacion de failover, verificacion de integridad de datos, medicion de RTO/RPO y reportes post-prueba."
  keywords:
    - recuperacion ante desastres
    - prueba dr
    - rto rpo
    - prueba de failover
    - continuidad de negocio
    - plan de recuperacion
---

## Overview

Los planes de recuperacion ante desastres que nunca se han probado son meros deseos. Un desastre real expone vacios en la documentacion, dependencias faltantes y suposiciones poco realistas sobre los tiempos de recuperacion. Esta plantilla de prueba proporciona un enfoque estructurado para validar tus procedimientos de DR a traves de ejercicios controlados de failover, verificacion de integridad de datos y medicion de RTO/RPO.

## When to Use

Usa este recurso cuando:
- Los requisitos de cumplimiento anuales exigen pruebas de DR (SOC2, ISO 27001)
- Has cambiado recientemente la infraestructura o los procedimientos de recuperacion ante desastres
- Un incidente previo revelo brechas en tus capacidades de DR
- Necesitas validar compromisos de RTO y RPO con stakeholders

## Prerequisites

Antes de comenzar:
- [ ] Runbooks de DR revisados y actualizados en los ultimos 90 dias
- [ ] Entorno de prueba disponible (aislado de produccion)
- [ ] Snapshots de backup confirmados como recuperables en los ultimos 7 dias
- [ ] Stakeholders notificados de la ventana de prueba e impacto esperado
- [ ] Plan de rollback documentado en caso de que la prueba salga mal

## Solution

```markdown
# Plan de Prueba de Recuperacion ante Desastres: `<Nombre del Servicio>`

## 1. Objetivos de la Prueba

| Objetivo | Meta | Medicion |
|----------|------|----------|
| Recovery Time Objective (RTO) | < 4 horas | Tiempo desde declaracion de desastre hasta disponibilidad del servicio |
| Recovery Point Objective (RPO) | < 15 minutos | Perdida maxima de datos aceptable en recuperacion |
| Integridad de Datos | 100% | Todas las transacciones verificadas contra la fuente |
| Comunicacion | < 30 minutos | Todos los stakeholders notificados del inicio de la prueba |

## 2. Alcance y Suposiciones

### En Alcance
- Failover de base de datos y restauracion desde backup
- Re-despliegue de aplicacion a region de DR
- Cambio de DNS y enrutamiento de trafico
- Validacion de smoke test de flujos criticos de usuario

### Fuera de Alcance
- Dependencias de servicios de terceros (asumidos disponibles)
- Fallas completas de centro de datos fisico (prueba basada en cloud)
- Escenarios de aislamiento completo de red

### Suposiciones
- El ultimo snapshot de backup es valido y completo
- La region de DR tiene capacidad suficiente
- La conectividad de red entre regiones es funcional
- Los miembros del equipo estan disponibles durante la ventana de prueba

## 3. Escenarios de Prueba

### Escenario A: Falla Completa de Region Primaria

**Disparador:** Simulacion de indisponibilidad completa de la region primaria de AWS.

**Pasos:**
1. **Declarar desastre** (0:00) — Ingeniero lider anuncia prueba de DR en canal de incidente
2. **Restaurar base de datos** (0:30) — Restaurar desde ultimo snapshot en region de DR
3. **Desplegar aplicaciones** (1:00) — Desplegar stack de aplicacion a cluster de DR
4. **Actualizar DNS** (1:30) — Cambiar trafico a balanceador de carga de DR
5. **Validar** (2:00) — Ejecutar smoke tests y verificar integridad de datos
6. **Medir RTO** — Registrar tiempo desde declaracion hasta validacion exitosa

### Escenario B: Corrupcion de Base de Datos

**Disparador:** Base de datos primaria tiene datos corruptos requiriendo recuperacion point-in-time.

**Pasos:**
1. Identificar punto de corrupcion desde alertas de monitoreo
2. Restaurar base de datos a 5 minutos antes del timestamp de corrupcion
3. Verificar integridad transaccional con consultas de checksum
4. Promover instancia restaurada a primaria
5. Redirigir trafico de aplicacion

## 4. Ejecucion de la Prueba

### Checklist Pre-Prueba

| Item | Estado | Responsable |
|------|--------|-------------|
| Snapshot de backup creado | [ ] | DBA |
| Entorno de DR aprovisionado | [ ] | Plataforma |
| Runbooks impresos / accesibles offline | [ ] | SRE |
| Stakeholders notificados | [ ] | Lider de Incidente |
| Plan de rollback confirmado | [ ] | SRE |
| Dashboards de monitoreo listos | [ ] | Observabilidad |

### Linea de Tiempo de Ejecucion

| Tiempo | Actividad | Resultado Esperado |
|--------|-----------|-------------------|
| T+0:00 | Declarar inicio de prueba | Canal de incidente notificado |
| T+0:05 | Iniciar restauracion de base de datos | Trabajo de restauracion RDS iniciado |
| T+1:00 | Base de datos disponible | Prueba de conexion exitosa |
| T+1:30 | Desplegar aplicacion | Todos los pods saludables |
| T+2:00 | Cambio de DNS | Trafico llegando a region de DR |
| T+2:30 | Smoke tests | 100% tasa de exito |
| T+3:00 | Verificacion de integridad de datos | Conteo de transacciones coincide con fuente |
| T+4:00 | Medicion de RTO | Registrar actual vs meta |

### Procedimiento de Rollback

Si cualquier paso critico falla:
1. Pausar prueba inmediatamente
2. Revertir DNS a region primaria
3. NO eliminar recursos de DR hasta revision post-prueba
4. Escalar a gerente de ingenieria
5. Programar prueba de seguimiento despues de correcciones

## 5. Verificacion de Integridad de Datos

```sql
-- Comparacion de conteo de transacciones
SELECT 'primary' as source, COUNT(*) as tx_count FROM orders
UNION ALL
SELECT 'dr', COUNT(*) FROM dr_orders;

-- Comparacion de checksums
SELECT 'primary', SUM(CHECKSUM(*)) FROM payments
UNION ALL
SELECT 'dr', SUM(CHECKSUM(*)) FROM dr_payments;

-- Ultimo timestamp de transaccion
SELECT MAX(created_at) FROM orders;
```

| Verificacion | Primario | DR | Coincide |
|--------------|----------|-----|----------|
| Conteo de transacciones | ______ | ______ | [ ] |
| Checksum a nivel de fila | ______ | ______ | [ ] |
| Ultimo timestamp | ______ | ______ | [ ] |

## 6. Reporte Post-Prueba

### Resumen de Resultados

| Metrica | Meta | Actual | Estado |
|---------|------|--------|--------|
| RTO | < 4 horas | ______ | Aprobado / Fallido |
| RPO | < 15 minutos | ______ | Aprobado / Fallido |
| Integridad de datos | 100% | ______ | Aprobado / Fallido |
| Smoke tests | 100% | ______ | Aprobado / Fallido |

### Problemas Encontrados

| Problema | Severidad | Responsable | Fecha Limite de Correccion |
|----------|-----------|-------------|---------------------------|
| ______ | Critica / Alta / Media / Baja | ______ | ______ |

### Lecciones Aprendidas

- Lo que funciono bien:
- Lo que tomo mas tiempo de lo esperado:
- Lo que fallo inesperadamente:
- Lo que deberia automatizarse:

### Aprobacion

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| Lider de Prueba | ______ | ______ | ______ |
| Gerente de Ingenieria | ______ | ______ | ______ |
| Compliance (si aplica) | ______ | ______ | ______ |
```

## Explanation

La plantilla estructura las pruebas de DR en **objetivos declarados** (metas de RTO/RPO), **escenarios controlados** (modos especificos de falla) y **resultados medibles** (criterios de aprobado/fallido). El checklist pre-prueba evita que las pruebas fallen debido a prerequisitos faltantes en lugar de brechas reales de DR. El procedimiento de rollback reconoce que las pruebas pueden fallar y protege la produccion de interrupciones inducidas por pruebas.

## Variants

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Prueba de cumplimiento anual | Escenario completo con auditores | Documentar todo, mantener firmas |
| Ejercicio interno trimestral | Escenario abreviado, sin auditor | Enfocarse en coordinacion del equipo y tiempos |
| Despues de cambio de infraestructura | Escenario dirigido al componente cambiado | Validar solo lo que cambio |
| Game day / chaos engineering | Prueba no anunciada | Mas realista, requiere automatizacion madura |

## Lo que funciona

1. **Programar pruebas durante horario laboral** — las personas que necesitan aprender deben participar
2. **Medir, no estimar** — el RTO real casi siempre es mayor que la estimacion documentada
3. **Probar desde backup, no solo desde replicacion** — la replicacion puede estar saludable mientras los backups estan corruptos
4. **Documentar toda desviacion** — incluso diferencias menores de tiempo indican brechas de proceso
5. **Automatizar smoke tests** — la verificacion manual es demasiado lenta durante un desastre real

## Common Mistakes

1. **Probar solo failover, no restauracion desde backup** — la replicacion puede estar saludable mientras los backups estan corruptos
2. **No probar con volumenes de datos realistas** — restaurar 1TB toma mas que restaurar 1GB
3. **Saltar la prueba del procedimiento de rollback** — descubres que el rollback no funciona cuando mas lo necesitas
4. **Probar solo durante periodos de bajo trafico** — no valida las suposiciones de capacidad
5. **No actualizar los runbooks despues de los hallazgos** — las mismas brechas aparecen en la prueba del proximo ano

## Frequently Asked Questions

### Con que frecuencia deberiamos ejecutar pruebas de DR?

Minimo: anual para cumplimiento, trimestral para validacion interna. Despues de cada cambio de infraestructura que afecte las rutas de recuperacion. Las organizaciones maduras prueban mensualmente con chaos engineering automatizado.

### Que pasa si la prueba de DR falla catastroficamente?

Esa es informacion valiosa. La prueba ha revelado que tu plan de DR no funciona — mejor descubrirlo en una prueba controlada que durante un desastre real. Pausa la prueba, restaura produccion, corrige los problemas y reprograma.

### Necesitamos notificar a clientes sobre pruebas de DR?

Solo si la prueba impacta servicios orientados al cliente. Las pruebas internas no necesitan notificacion externa. Las pruebas que impactan clientes deben programarse durante ventanas de mantenimiento con aviso previo.
