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

## Soluciones Avanzadas

### Ejecucion automatizada de prueba de DR con Terraform y AWS

Aprovisiona el entorno de DR, restaura desde backup y ejecuta pruebas de validacion automaticamente:

```python
import boto3
import subprocess
import time
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime, timedelta

@dataclass
class DRTestResult:
    test_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    rto_seconds: Optional[int] = None
    rpo_seconds: Optional[int] = None
    steps_completed: List[str] = field(default_factory=list)
    steps_failed: List[str] = field(default_factory=list)
    data_integrity_ok: bool = False

class DRTestRunner:
    def __init__(self, region: str, dr_region: str):
        self.region = region
        self.dr_region = dr_region
        self.rds = boto3.client("rds", region_name=dr_region)
        self.ec2 = boto3.client("ec2", region_name=dr_region)
        self.s3 = boto3.client("s3", region_name=region)

    def restore_database_from_snapshot(
        self, snapshot_id: str, db_instance_id: str
    ) -> str:
        """Restore RDS instance from snapshot in DR region."""
        print(f"Restoring {db_instance_id} from snapshot {snapshot_id}...")
        response = self.rds.restore_db_instance_from_db_snapshot(
            DBInstanceIdentifier=db_instance_id,
            DBSnapshotIdentifier=snapshot_id,
            AvailabilityZone=f"{self.dr_region}a",
        )
        # Wait for instance to be available
        waiter = self.rds.get_waiter("db_instance_available")
        waiter.wait(DBInstanceIdentifier=db_instance_id)
        endpoint = response["DBInstance"]["Endpoint"]["Address"]
        print(f"Database available at: {endpoint}")
        return endpoint

    def run_smoke_tests(self, endpoint: str) -> bool:
        """Run smoke tests against the restored environment."""
        tests = [
            ("health_check", f"curl -sf http://{endpoint}/health"),
            ("write_test", f"curl -sf -X POST http://{endpoint}/api/test -d '{{\"test\":\"dr\"}}'"),
            ("read_test", f"curl -sf http://{endpoint}/api/test/dr"),
        ]
        all_passed = True
        for name, cmd in tests:
            result = subprocess.run(cmd, shell=True, capture_output=True, timeout=30)
            if result.returncode == 0:
                print(f"  PASS: {name}")
            else:
                print(f"  FAIL: {name}: {result.stderr.decode()}")
                all_passed = False
        return all_passed

    def verify_data_integrity(
        self, primary_conn: str, dr_conn: str
    ) -> bool:
        """Compare transaction counts between primary and DR."""
        primary_count = self._query_count(primary_conn)
        dr_count = self._query_count(dr_conn)
        match = primary_count == dr_count
        print(f"Primary: {primary_count} rows, DR: {dr_count} rows, Match: {match}")
        return match

    def _query_count(self, conn_str: str) -> int:
        """Execute a count query and return the result."""
        cmd = f'psql "{conn_str}" -t -c "SELECT COUNT(*) FROM orders;"'
        result = subprocess.run(cmd, shell=True, capture_output=True, timeout=60)
        return int(result.stdout.decode().strip()) if result.returncode == 0 else -1

    def execute_full_test(self, snapshot_id: str) -> DRTestResult:
        """Execute a full DR test and return results."""
        result = DRTestResult(
            test_name="full_region_failure",
            start_time=datetime.now(),
        )

        try:
            # Step 1: Restore database
            endpoint = self.restore_database_from_snapshot(
                snapshot_id, "dr-test-instance"
            )
            result.steps_completed.append("database_restore")

            # Step 2: Run smoke tests
            if self.run_smoke_tests(endpoint):
                result.steps_completed.append("smoke_tests")
            else:
                result.steps_failed.append("smoke_tests")

            # Step 3: Verify data integrity
            if self.verify_data_integrity(
                "postgresql://primary.db.internal/appdb",
                f"postgresql://{endpoint}/appdb",
            ):
                result.data_integrity_ok = True
                result.steps_completed.append("data_integrity")
            else:
                result.steps_failed.append("data_integrity")

        except Exception as e:
            print(f"Test failed: {e}")
            result.steps_failed.append(f"exception: {str(e)}")

        result.end_time = datetime.now()
        result.rto_seconds = int((result.end_time - result.start_time).total_seconds())
        return result

# Example usage
runner = DRTestRunner("us-east-1", "us-west-2")
result = runner.execute_full_test("rds-snapshot-2026-07-01")
print(f"\nRTO: {result.rto_seconds}s")
print(f"Steps completed: {result.steps_completed}")
print(f"Steps failed: {result.steps_failed}")
print(f"Data integrity: {result.data_integrity_ok}")
```

### Script de game day de chaos engineering

Inyecta fallas controladas para probar la preparacion de DR sin aviso previo:

```bash
#!/bin/bash
# game-day.sh - Chaos engineering DR test
# Usage: ./game-day.sh --scenario <network|disk|cpu|full>

set -euo pipefail

SCENARIO="${1:---scenario}"
shift || true

case "$SCENARIO" in
  --scenario) SCENARIO="$1" ;;
esac

NAMESPACE="production"
SERVICE="api"
LOG_FILE="/tmp/game-day-$(date +%s).log"

log() { echo "[$(date -u +%H:%M:%S)] $1" | tee -a "$LOG_FILE"; }

case "$SCENARIO" in
  network)
    log "Injecting network latency to ${SERVICE} pods..."
    kubectl exec -n "$NAMESPACE" deployment/"$SERVICE" -- \
      tc qdisc add dev eth0 root netem delay 500ms 2>/dev/null || true
    log "Monitoring for 5 minutes..."
    sleep 300
    kubectl exec -n "$NAMESPACE" deployment/"$SERVICE" -- \
      tc qdisc del dev eth0 root 2>/dev/null || true
    log "Network latency removed."
    ;;

  disk)
    log "Filling disk on ${SERVICE} pods to 90%..."
    kubectl exec -n "$NAMESPACE" deployment/"$SERVICE" -- \
      fallocate -l $(df --output=avail -BG / | tail -1 | tr -d 'G ')M /tmp/fill 2>/dev/null || true
    sleep 120
    kubectl exec -n "$NAMESPACE" deployment/"$SERVICE" -- rm -f /tmp/fill 2>/dev/null || true
    log "Disk space restored."
    ;;

  cpu)
    log "Spiking CPU on ${SERVICE} pods..."
    kubectl exec -n "$NAMESPACE" deployment/"$SERVICE" -- \
      sh -c 'yes > /dev/null & yes > /dev/null & yes > /dev/null &' 2>/dev/null || true
    sleep 120
    kubectl delete pod -n "$NAMESPACE" -l app="$SERVICE" --grace-period=0 --force 2>/dev/null || true
    log "CPU spike ended (pods restarted)."
    ;;

  full)
    log "Starting full region failure simulation..."
    log "1. Cordoning all nodes in primary region..."
    kubectl cordon --selector=topology.kubernetes.io/region=us-east-1
    log "2. Draining workloads..."
    kubectl drain --selector=topology.kubernetes.io/region=us-east-1 \
      --ignore-daemonsets --delete-emptydir-data --timeout=300s || true
    log "3. Waiting 5 minutes for failover..."
    sleep 300
    log "4. Checking DR region health..."
    kubectl get pods -n production --context=dr-cluster
    log "5. Uncordoning primary region..."
    kubectl uncordon --selector=topology.kubernetes.io/region=us-east-1
    log "Full region simulation complete."
    ;;

  *)
    echo "Usage: $0 --scenario <network|disk|cpu|full>"
    exit 1
    ;;
esac

log "Game day results saved to $LOG_FILE"
```

### Query de dashboard de monitoreo RTO/RPO

Rastrea metricas de RTO y RPO a lo largo del tiempo para identificar tendencias y degradacion:

```sql
-- Prometheus query for RPO tracking (replication lag over time)
-- Use in Grafana dashboard
SELECT
  date_trunc('day', timestamp) as day,
  avg(value) as avg_lag_seconds,
  max(value) as max_lag_seconds,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY value) as p99_lag_seconds
FROM prometheus_metrics
WHERE metric_name = 'pg_replication_lag_seconds'
  AND timestamp > now() - interval '90 days'
GROUP BY 1
ORDER BY 1;

-- DR test results over time
SELECT
  test_date,
  rto_target_seconds,
  rto_actual_seconds,
  rpo_target_seconds,
  rpo_actual_seconds,
  CASE
    WHEN rto_actual_seconds <= rto_target_seconds THEN 'PASS'
    ELSE 'FAIL'
  END as rto_status,
  CASE
    WHEN rpo_actual_seconds <= rpo_target_seconds THEN 'PASS'
    ELSE 'FAIL'
  END as rpo_status
FROM dr_test_results
ORDER BY test_date DESC
LIMIT 12;
```

## Mejores Practicas Adicionales

1. **Mantén un calendario de pruebas de DR con escenarios rotativos.** No pruebes el mismo escenario cada vez. Rota a traves de diferentes modos de falla para cubrir todas las rutas de recuperacion:

```markdown
## DR Test Calendar

| Quarter | Scenario | Owner | Target RTO | Last Tested |
|---------|----------|-------|------------|-------------|
| Q1 2026 | Primary region failure | Platform team | 4 hours | 2026-01-15 |
| Q2 2026 | Database corruption | DBA team | 2 hours | 2026-04-20 |
| Q3 2026 | Network partition | Network team | 1 hour | Pending |
| Q4 2026 | Full region + backup restore | SRE team | 8 hours | Pending |
```

2. **Incluye pruebas de dependencias de terceros.** Tu plan de DR depende de proveedores de DNS, CDNs y APIs externas. Prueba el failover para estos tambien:

```bash
# Test DNS failover
dig @8.8.8.8 app.example.com +short
# Should return DR region IP after cutover

# Test CDN failover
curl -sI https://app.example.com | grep "x-served-by"
# Should show DR cache node after cutover

# Test external API dependency circuit breaker
curl -X POST http://app.internal/admin/test-circuit-breaker \
  -d '{"dependency":"payment-gateway","action":"open"}'
```

## Errores Comunes Adicionales

1. **No probar el plan de comunicacion durante las pruebas de DR.** Los ingenieros se enfocan en la recuperacion tecnica y olvidan probar la notificacion a stakeholders. Durante un desastre real, las fallas de comunicacion causan tanto dano como las fallas tecnicas. Incluye pasos de comunicacion en la linea de tiempo de la prueba y mide cuanto toma notificar a todos los stakeholders.

2. **Usar el mismo backup para cada prueba.** Si siempre restauras desde el mismo snapshot, estas probando ese snapshot, no tu sistema de backup. Usa el backup mas reciente para cada prueba. Esto valida que tu pipeline de backup esta produciendo snapshots recuperables consistentemente.

## FAQs Adicionales

### Cual es la diferencia entre una prueba de DR y un game day de chaos engineering?

Una prueba de DR es un ejercicio planificado y anunciado que valida tus procedimientos de recuperacion contra escenarios especificos de falla. Sigue un runbook documentado y mide RTO/RPO. Un game day de chaos engineering es un ejercicio no anunciado o semi-anunciado que inyecta fallas aleatorias en produccion para probar la resiliencia del sistema y la respuesta de guardia. Las pruebas de DR validan tu plan; los game days validan tu preparacion. Ambos son necesarios.

### Como probamos DR para arquitecturas multi-region active-active?

En configuraciones active-active, una falla de region significa que la region superviviente absorbe todo el trafico. Prueba cordonando una region y verificando que el trafico se desplace, la capacidad escale y la consistencia de datos se mantenga. La metrica clave no es el RTO (el trafico deberia desplazarse automaticamente) sino si la region superviviente puede manejar la carga completa. Prueba el margen de capacidad simulando trafico de la region fallida contra la region superviviente.
