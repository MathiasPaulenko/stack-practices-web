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

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| PostgreSQL | pg_dump + archivado WAL | Usa `pg_verifybackup` para integridad |
| MySQL | Percona XtraBackup | No bloqueante para InnoDB |
| MongoDB | mongodump + ops manager | Considera replay de oplog para PITR |
| S3 / Almacenamiento de objetos | Replicación cross-region | Versionamiento + políticas de ciclo de vida |
| PVCs de Kubernetes | Velero + snapshots CSI | Incluye metadatos del cluster en el backup |

## Lo que funciona

1. Prueba restauraciones en un entorno diferente, no en la fuente, para evitar sobrescribir producción accidentalmente
2. Automatiza la verificación de backups tanto como sea posible; las verificaciones manuales se olvidan durante incidentes
3. Almacena backups en una región o proveedor de nube diferente al de los datos primarios
4. Cifra backups en reposo y en tránsito; rota las claves de cifrado independientemente
5. Documenta quién puede acceder a los backups; restringe a roles de emergencia únicamente

## Errores Comunes

1. Hacer backup sin probar el camino de restauración; la mayoría de los fallos de backup se descubren durante el primer incidente real
2. Mantener backups solo en la misma región que los datos primarios
3. Ignorar el crecimiento del tamaño de backup hasta que los costos de almacenamiento exploten o los trabajos empiecen a fallar
4. No incluir el esquema/migraciones en los backups de base de datos (datos sin esquema son inútiles)
5. Permitir que las credenciales de backup permanezcan activas por más tiempo del necesario, creando un riesgo de movimiento lateral

## Preguntas Frecuentes

### ¿Con qué frecuencia debo probar restauraciones?

Como mínimo: restauración completa de base de datos mensual, recuperación point-in-time trimestral, restauración cross-region semestral. Aumenta la frecuencia para sistemas P0. La prueba no está completa hasta que el equipo de aplicación verifique que los datos son usables.

### ¿Debería cifrar los backups?

Sí. Cifra en reposo con una clave gestionada separadamente de los datos primarios. Si el ransomware cifra tus datos primarios, también puede cifrar backups accesibles con las mismas credenciales. Claves separadas e backups inmutables previenen esto.

### ¿Qué es la regla de backup 3-2-1?

3 copias de datos, en 2 medios diferentes, con 1 copia fuera del sitio. Para sistemas nativos de nube: 3 copias (primario + backup + cross-region), 2 formatos (snapshot + dump lógico), 1 fuera del sitio (región o proveedor diferente). Los backups inmutables agregan una capa extra contra la eliminación.
