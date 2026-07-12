---



contentType: docs
slug: backup-and-restore-template
title: "Plantilla de Verificación de Backup y Restore"
description: "Una plantilla para documentar procedimientos de verificación de backups de bases de datos y archivos."
metaDescription: "Usa esta plantilla de backup y restore para verificar backups de bases de datos, snapshots de archivos y procedimientos de disaster recovery."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - backup
  - restore
  - database
  - disaster-recovery
  - template
relatedResources:
  - /docs/auto-scaling-policy-template
  - /docs/deployment-checklist-template
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/capacity-planning-template
  - /docs/network-security-template
  - /recipes/bash-backup-rotation
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de backup y restore para verificar backups de bases de datos, snapshots de archivos y procedimientos de disaster recovery."
  keywords:
    - devops
    - backup
    - restore
    - base-de-datos
    - disaster-recovery
    - plantilla



---
## Visión General

Los backups no valen nada si no puedes restaurar desde ellos. Muchos equipos lo descubren demasiado tarde: después de un ataque de ransomware, una corrupción de base de datos o una eliminación accidental. Esta plantilla asegura que tus procedimientos de backup estén documentados, probados y verificables antes de que ocurra un desastre.

## Cuándo Usar


- For alternatives, see [Cross-Region Failover Test Template](/es/docs/cross-region-failover-template/).

Usa este recurso cuando:
- Estés configurando políticas de backup para una nueva base de datos o almacenamiento de archivos
- Audites procedimientos de backup existentes después de un incidente o revisión de cumplimiento
- Te prepares para un drill de disaster recovery o auditoría SOC 2

## Solución

```markdown
# Verificación de Backup y Restore: `<Servicio>`

## 1. Metadatos del Servicio

| Campo | Valor |
|-------|-------|
| Servicio | `nombre` |
| Tipo de Datos | `Base de Datos / Archivos / Almacenamiento de Objetos / Disco de VM` |
| Criticidad | `P0 (crítico) / P1 (importante) / P2 (estándar)` |
| Equipo Responsable | `@equipo` |
| Última Prueba | `YYYY-MM-DD` |

## 2. Política de Backup

### 2.1. Programa

| Nivel | Frecuencia | Retención | Ventana | Almacenamiento |
|-------|-----------|-----------|---------|----------------|
| Completo | Semanal | 4 semanas | Domingo 02:00 UTC | Almacenamiento frío |
| Incremental | Diario | 7 días | 02:00 UTC | Almacenamiento tibio |
| Log de transacciones | Cada 15 min | 24 horas | Continuo | Almacenamiento caliente |
| Snapshot | Bajo demanda | 30 días | Pre-despliegue | Regional |

### 2.2. Verificación

- [ ] El backup se completa dentro de la ventana definida sin errores
- [ ] El tamaño del backup está dentro del 10% de la línea base esperada
- [ ] El checksum / hash del backup coincide con la fuente después de crearlo
- [ ] Los metadatos del backup (timestamp, fuente, tamaño) se registran en el sistema central
- [ ] Se dispara una alerta si el trabajo de backup falla o excede el umbral de duración

## 3. Pruebas de Restauración

### 3.1. Escenarios de Prueba

| Escenario | Frecuencia | RTO Objetivo | RPO Objetivo | Última Ejecución |
|-----------|-----------|-------------|-------------|-----------------|
| Restauración completa de base de datos | Mensual | 4 horas | 15 min | `YYYY-MM-DD` |
| Recuperación point-in-time | Trimestral | 1 hora | 15 min | `YYYY-MM-DD` |
| Recuperación a nivel de archivo | Trimestral | 30 min | 24 horas | `YYYY-MM-DD` |
| Restauración cross-region | Semestral | 8 horas | 1 hora | `YYYY-MM-DD` |

### 3.2. Checklist de Restauración

- [ ] Identificar la versión correcta del backup (no siempre es la última)
- [ ] Aprovisionar un entorno de restauración (aislado de producción)
- [ ] Ejecutar el procedimiento de restauración siguiendo los pasos documentados
- [ ] Verificar integridad de datos: conteo de filas, checksums, consultas de muestra
- [ ] Verificar conectividad de la aplicación y rendimiento de consultas
- [ ] Documentar el RTO y RPO real logrados
- [ ] Limpiar el entorno de restauración para evitar fugas de recursos

## 4. Playbook de Disaster Recovery

| Paso | Acción | Responsable | Límite de Tiempo |
|------|--------|-------------|-----------------|
| 1 | Acusar recibo del incidente y declarar pérdida de datos | On-call | 5 min |
| 2 | Identificar el último backup bueno conocido | DBA / SRE | 15 min |
| 3 | Aprovisionar infraestructura de recuperación | SRE | 30 min |
| 4 | Ejecutar procedimiento de restauración | DBA | Según objetivo RTO |
| 5 | Verificar integridad de datos | QA / DBA | 30 min |
| 6 | Redirigir tráfico al entorno recuperado | SRE | 10 min |
| 7 | Documentar línea de tiempo del incidente y causa raíz | Incident Commander | 24 horas |

## 5. Cumplimiento y Auditoría

| Requisito | Evidencia | Frecuencia |
|-----------|-----------|------------|
| Backup existe | Reporte automatizado de trabajos de backup | Diario |
| Restauración probada | Log de ejecución de pruebas con firmas | Mensual |
| RTO/RPO cumplido | Resultados de pruebas documentados | Trimestral |
| Cifrado en reposo | Logs de uso de claves KMS | Continuo |
```

## Explicación

La plantilla separa **backup** (crear copias) de **prueba de restauración** (demostrar que funcionan). Un backup sin una restauración probada es solo esperanza. El **RTO** (Recovery Time Objective) es qué tan rápido debes volver a estar en línea; el **RPO** (Recovery Point Objective) es cuánta pérdida de datos es aceptable. Los escenarios de restauración aseguran que pruebes todo el espectro: desde un único archivo eliminado hasta un desastre cross-region.

## Script de Verificación de Restauración para PostgreSQL

```bash
#!/bin/bash
set -euo pipefail

BACKUP_FILE=$1
RESTORE_DB="restore_test_$(date +%s)"
PG_HOST="localhost"
PG_USER="postgres"

echo "Creando base de datos de prueba: $RESTORE_DB"
createdb -h "$PG_HOST" -U "$PG_USER" "$RESTORE_DB"

echo "Restaurando desde: $BACKUP_FILE"
pg_restore -h "$PG_HOST" -U "$PG_USER" -d "$RESTORE_DB" -v "$BACKUP_FILE"

echo "Verificando conteo de filas..."
TABLES=$(psql -h "$PG_HOST" -U "$PG_USER" -d "$RESTORE_DB" -t -c \
  "SELECT tablename FROM pg_tables WHERE schemaname='public';")

for table in $TABLES; do
  count=$(psql -h "$PG_HOST" -U "$PG_USER" -d "$RESTORE_DB" -t -c \
    "SELECT COUNT(*) FROM $table;")
  echo "  $table: $count filas"
done

echo "Verificando checksums..."
psql -h "$PG_HOST" -U "$PG_USER" -d "$RESTORE_DB" -c \
  "SELECT 'users' as tabla, COUNT(*) as filas, MD5(string_agg(id::text, ',' ORDER BY id)) as checksum FROM users;"

echo "Limpiando base de datos de prueba..."
dropdb -h "$PG_HOST" -U "$PG_USER" "$RESTORE_DB"
echo "Verificación de restauración completa."
```

## Configuración de AWS Backup Vault Lock

Para backups inmutables que sobreviven ataques de ransomware:

```json
{
  "BackupVaultName": "production-backups",
  "BackupVaultLockSettings": {
    "MinRetentionDays": 30,
    "MaxRetentionDays": 365,
    "ChangeableForDays": 3
  }
}
```

Una vez activado el bloqueo, ningún usuario (incluyendo root) puede eliminar backups antes de que expire el período mínimo de retención. El parámetro `ChangeableForDays` da una ventana de enfriamiento para corregir configuraciones erróneas.

## Hoja de Cálculo de RTO y RPO

```text
Servicio: API de Procesamiento de Órdenes
Criticidad: P0

Cálculo de RPO:
  - Frecuencia de log de transacciones: Cada 15 minutos
  - Pérdida máxima aceptable de datos: 15 minutos de órdenes
  - Objetivo RPO: 15 minutos

Cálculo de RTO:
  - Tiempo de detección: 5 minutos (alerta automatizada)
  - Tiempo de acusar recibo: 5 minutos (SLA de guardia)
  - Aprovisionar entorno de restauración: 10 minutos
  - Ejecutar restauración: 45 minutos (base de datos 50GB)
  - Verificar integridad de datos: 15 minutos
  - Redirigir tráfico: 5 minutos
  - RTO total: 85 minutos (objetivo: 4 horas) PASS
```

## Monitoreo Automatizado de Backups con Prometheus

```yaml
groups:
  - name: backup_alerts
    rules:
      - alert: BackupJobFailed
        expr: backup_last_success_timestamp > 0 and time() - backup_last_success_timestamp > 86400
        for: 1h
        labels:
          severity: P1
        annotations:
          summary: "El trabajo de backup no ha tenido éxito en 24 horas"
          runbook: "/runbooks/backup-failure"

      - alert: BackupSizeAnomaly
        expr: |
          backup_size_bytes / backup_size_bytes offset 1d < 0.9
        for: 1h
        labels:
          severity: P2
        annotations:
          summary: "El tamaño del backup cayó > 10% comparado con ayer"
          runbook: "/runbooks/backup-size-anomaly"

      - alert: RestoreTestOverdue
        expr: time() - restore_test_last_run_timestamp > 2592000
        for: 1h
        labels:
          severity: P2
        annotations:
          summary: "La prueba mensual de restauración está atrasada"
          runbook: "/runbooks/restore-test"
```

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| PostgreSQL | pg_dump + archivado WAL | Usa `pg_verifybackup` para integridad |
| MySQL | Percona XtraBackup | No bloqueante para InnoDB |
| MongoDB | mongodump + ops manager | Considera replay de oplog para PITR |
| S3 / Almacenamiento de objetos | Replicación cross-region | Versionamiento + políticas de ciclo de vida |
| PVCs de Kubernetes | Velero + snapshots CSI | Incluye metadatos del cluster en el backup |
| Redis | Snapshots RDB + AOF | Probar rutas de restauración RDB y AOF |
| Elasticsearch | API de snapshot + restore | Usa plugins de repositorio para almacenamiento en nube |
| Kafka | Tiered storage + mirror maker | Respaldar configs de topics y offsets de consumidores por separado |

## Lo que funciona

1. Prueba restauraciones en un entorno diferente, no en la fuente, para evitar sobrescribir producción accidentalmente
2. Automatiza la verificación de backups tanto como sea posible; las verificaciones manuales se olvidan durante incidentes
3. Almacena backups en una región o proveedor de nube diferente al de los datos primarios
4. Cifra backups en reposo y en tránsito; rota las claves de cifrado independientemente
5. Documenta quién puede acceder a los backups; restringe a roles de emergencia únicamente
6. Usa backups inmutables (AWS Vault Lock, GCP Bucket Lock) para protección contra ransomware
7. Incluye esquema y archivos de migración en los backups; datos sin esquema son inútiles
8. Etiqueta recursos de backup con tags de asignación de costos para rastrear el gasto

## Errores Comunes

1. Hacer backup sin probar el camino de restauración; la mayoría de los fallos de backup se descubren durante el primer incidente real
2. Mantener backups solo en la misma región que los datos primarios
3. Ignorar el crecimiento del tamaño de backup hasta que los costos de almacenamiento exploten o los trabajos empiecen a fallar
4. No incluir el esquema/migraciones en los backups de base de datos (datos sin esquema son inútiles)
5. Permitir que las credenciales de backup permanezcan activas por más tiempo del necesario, creando un riesgo de movimiento lateral
6. No probar restauraciones bajo presión de tiempo; una restauración que funciona en 4 horas durante un drill puede tomar 8 durante un incidente
7. Olvidar respaldar archivos de configuración, secrets y políticas de IAM junto con los datos

## Preguntas Frecuentes

### ¿Con qué frecuencia debo probar restauraciones?

Como mínimo: restauración completa de base de datos mensual, recuperación point-in-time trimestral, restauración cross-region semestral. Aumenta la frecuencia para sistemas P0. La prueba no está completa hasta que el equipo de aplicación verifique que los datos son usables.

### ¿Debería cifrar los backups?

Sí. Cifra en reposo con una clave gestionada separadamente de los datos primarios. Si el ransomware cifra tus datos primarios, también puede cifrar backups accesibles con las mismas credenciales. Claves separadas e backups inmutables previenen esto.

### ¿Qué es la regla de backup 3-2-1?

3 copias de datos, en 2 medios diferentes, con 1 copia fuera del sitio. Para sistemas nativos de nube: 3 copias (primario + backup + cross-region), 2 formatos (snapshot + dump lógico), 1 fuera del sitio (región o proveedor diferente). Los backups inmutables agregan una capa extra contra la eliminación.

### ¿Cuál es la diferencia entre RTO y RPO?

RTO (Recovery Time Objective) es el downtime máximo aceptable: cuánto hasta volver a estar en línea. RPO (Recovery Point Objective) es la pérdida máxima aceptable de datos: cuántos datos puedes permitirte perder. Un backup de log de transacciones cada 15 minutos da un RPO de 15 minutos. Un proceso de restauración de 2 horas da un RTO de 2 horas.

### ¿Cómo manejo backups para workloads stateful de Kubernetes?

Usa Velero con snapshots CSI para volúmenes persistentes. Incluye metadatos del cluster (ConfigMaps, Secrets, Deployments) en el alcance del backup. Para bases de datos que corren en Kubernetes, usa la herramienta nativa de backup de la base de datos (pg_dump, mongodump) en lugar de snapshots de volumen, ya que los snapshots de volumen pueden capturar estado inconsistente.

### ¿Debería usar servicios de backup nativos de nube o herramientas auto-gestionadas?

Comienza con servicios nativos de nube (AWS Backup, GCP Backup) por simplicidad e integración. Pasa a herramientas auto-gestionadas (pg_dump + scripts personalizados, Velero) cuando necesites control más fino sobre retención, cifrado o portabilidad cross-cloud. El mejor enfoque suele ser híbrido: nativo de nube para snapshots, auto-gestionado para dumps lógicos.

### ¿Cómo verifico la integridad del backup sin una restauración completa?

Usa checksums: calcula SHA-256 del archivo de backup después de crearlo y compara al verificar. Para PostgreSQL, usa `pg_verifybackup` para verificar integridad del manifest. Para backups a nivel de archivo, compara conteos de archivos y tamaños totales contra la fuente. Una prueba de restauración completa sigue siendo necesaria periódicamente, pero los checksums detectan corrupción entre pruebas.


Para bases de datos grandes (>1TB), considera verificacion incremental: restaura solo bloques cambiados y verifica checksums en esos bloques para reducir el tiempo de prueba de horas a minutos.