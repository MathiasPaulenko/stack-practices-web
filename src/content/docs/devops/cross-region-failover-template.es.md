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

## Script de Ejecucion de Failover

```bash
#!/bin/bash
# Ejecucion de failover cross-region
set -euo pipefail

PRIMARY_REGION="us-east-1"
SECONDARY_REGION="eu-west-1"
SERVICE="api-gateway"
DNS_FAILOVER_RECORD="api.example.com"

echo "=== Ejecucion de Failover Cross-Region ==="
echo "Primaria: $PRIMARY_REGION"
echo "Secundaria: $SECONDARY_REGION"
echo "Servicio: $SERVICE"
echo "Hora: $(date -u)"
echo ""

# Paso 1: Verificar salud de region secundaria
echo "[1/6] Verificando salud de region secundaria..."
SECONDARY_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://$SECONDARY_REGION.$SERVICE.internal/health")
if [ "$SECONDARY_HEALTH" != "200" ]; then
  echo "FAIL: Region secundaria no saludable (HTTP $SECONDARY_HEALTH)"
  exit 1
fi
echo "  Region secundaria: SALUDABLE"

# Paso 2: Verificar lag de replicacion
echo "[2/6] Verificando lag de replicacion de base de datos..."
echo "  Estado de replicacion: verificando..."

# Paso 3: Promover base de datos secundaria
echo "[3/6] Promoviendo base de datos secundaria..."
echo "  Base de datos promovida"

# Paso 4: Actualizar DNS a secundaria
echo "[4/6] Actualizando registro DNS failover..."
echo "  DNS actualizado a region secundaria"

# Paso 5: Escalar region secundaria
echo "[5/6] Escalando region secundaria..."
echo "  Secundaria escalada a 10 instancias"

# Paso 6: Verificar enrutamiento de trafico
echo "[6/6] Verificando enrutamiento de trafico..."
sleep 30
TRAFFIC_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "https://$DNS_FAILOVER_RECORD/health")
if [ "$TRAFFIC_CHECK" == "200" ]; then
  echo "  Trafico enrutado a secundaria: EXITO"
else
  echo "  Enrutamiento de trafico: FAIL (HTTP $TRAFFIC_CHECK)"
fi

echo ""
echo "=== Failover Completado ==="
echo "Monitorear por 30 minutos antes de declarar estable."
```

## Checklist de Prueba de Failover

```text
=== Checklist de Prueba de Failover Cross-Region ===

Pre-Prueba:
  [ ] Notificar a stakeholders ventana de prueba
  [ ] Verificar region secundaria aprovisionada y saludable
  [ ] Confirmar lag de replicacion dentro de RPO
  [ ] Documentar objetivos RTO y RPO esperados
  [ ] Preparar plan de rollback (procedimiento failback)
  [ ] Configurar dashboard de monitoreo para ambas regiones

Durante Prueba:
  [ ] T+0: Iniciar failover (ejecutar script)
  [ ] T+1: Verificar alerta de deteccion disparada
  [ ] T+5: Verificar DNS actualizado
  [ ] T+10: Verificar trafico enrutado a secundaria
  [ ] T+15: Verificar tests funcionales de aplicacion pasan
  [ ] T+30: Verificar consistencia de datos (conteos, checksums)

Post-Prueba:
  [ ] Documentar RTO y RPO reales
  [ ] Verificar sin perdida de datos mas alla de RPO
  [ ] Iniciar procedimiento failback
  [ ] Verificar failback completado exitosamente
  [ ] Documentar problemas encontrados y remediacion
  [ ] Programar fecha de proxima prueba
```


## Variantes

| Arquitectura | Enfoque | Notas |
|--------------|---------|-------|
| Activo-pasivo | Secundaria está fría; promover en falla | Menor costo, mayor RTO |
| Activo-activo | Ambas regiones sirven tráfico; cambiar en falla | Mayor costo, RTO cercano a cero |
| Blue-green | Región secundaria es un espejo; cambiar DNS | Bueno para bases de datos con streaming replication |
| Cell-based | Usuarios asignados a una celda; mover celdas | Usado por Netflix, requiere diseño stateless |

## Lo que funciona

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


### Como manejamos la propagacion DNS durante failover?

Usa un TTL bajo (60 segundos o menos) en el registro DNS de failover. Usa health checks de Route53 con politica de enrutamiento DNS failover para deteccion automatica. Para audiencias globales, considera enrutamiento basado en latencia o geolocalizacion para dirigir usuarios a la region saludable mas cercana. Prueba la propagacion DNS desde multiples ubicaciones geograficas usando herramientas como DNSChecker.org. Documenta el tiempo real de propagacion observado durante pruebas, ya que puede diferir del TTL.

### Que es split-brain y como lo prevenimos?

Split-brain ocurre cuando ambas regiones primaria y secundaria aceptan escrituras simultaneamente, causando conflictos de datos. Previenelo: usando arquitectura de base de datos single-writer (solo una region acepta escrituras a la vez), aislando la region primaria antes de promover la secundaria (apagar base de datos primaria, bloquear acceso de red), y usando consenso distribuido (Raft, Paxos) para coordinacion de escrituras. Si split-brain ocurre, documenta el procedimiento de resolucion de conflictos y pruebalo antes del proximo failover.

### Como probamos failback?

Failback es el proceso de devolver el trafico a la region primaria despues de que el problema se resuelve. Prueba failback: re-estableciendo replicacion desde secundaria hacia primaria, esperando a que el lag de replicacion llegue a cero, promoviendo la base de datos primaria, actualizando DNS de vuelta a primaria, y verificando trafico. Prueba failback en cada prueba de failover — es donde mas planes fallan. Documenta el procedimiento de failback separadamente del procedimiento de failover.

### Que monitoreo necesitamos para replicacion cross-region?

Monitorea: lag de replicacion en segundos (alerta si > RPO), estado de replicacion (conectado, desconectado, error), salud de region secundaria (disponibilidad de endpoint, tiempo de respuesta), consistencia de datos (comparacion de conteos de filas, comparacion de checksums), y resolucion DNS desde multiples regiones. Configura alertas para lag de replicacion que exceda 50% del RPO. Prueba que las alertas se disparen cuando la replicacion se pausa intencionalmente. Revisa metricas de replicacion semanalmente durante la revision operativa.

### Como manejamos servicios con estado durante failover?

Los servicios con estado (bases de datos, colas de mensajes, caches) son los mas dificiles de failover. Para bases de datos, usa replicacion cross-region (Aurora Global, CockroachDB, Spanner). Para colas de mensajes, usa replicacion cross-region (Amazon MQ, Kafka MirrorMaker). Para caches, acepta perdida de cache en failover y reconstruye desde la base de datos. Documenta el procedimiento de failover para cada servicio con estado separadamente. Prueba que la aplicacion maneje la perdida de cache elegantemente (rendimiento de cold start).



Revisa y actualiza el procedimiento de failover trimestralmente. Prueba en produccion con carga realista. Documenta cada problema encontrado y rastrea la remediacion hasta completarla.




End of document. Revisar trimestralmente.

End of document. Review and update quarterly.