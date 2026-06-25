---
contentType: guides
slug: disaster-recovery-guide
title: "Recuperación ante Desastres — RTO, RPO y Runbooks de Recuperación Resilientes"
description: "Guía práctica para la planificación de recuperación ante desastres: definición de RTO y RPO, estrategias de backup, failover multi-región y construcción de runbooks de recuperación que minimizan downtime."
metaDescription: "Aprende planificación de recuperación ante desastres: RTO, RPO, estrategias de backup, runbooks y failover multi-región para infraestructura resiliente."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - security
tags:
  - recuperacion-desastres
  - rto
  - rpo
  - backup
  - failover
  - multi-region
  - runbook
  - resiliencia
  - guia
relatedResources:
  - /guides/devops/sre-practices-guide
  - /guides/devops/chaos-engineering-guide
  - /guides/devops/multi-cloud-guide
  - /guides/security/zero-trust-architecture-guide
  - /guides/planning/capacity-planning-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende planificación de recuperación ante desastres: RTO, RPO, estrategias de backup, runbooks y failover multi-región para infraestructura resiliente."
  keywords:
    - recuperacion-desastres
    - rto
    - rpo
    - backup
    - failover
    - multi-region
    - runbook
    - resiliencia
    - guia
---

## Overview

La recuperación ante desastres (DR) es el conjunto de políticas, herramientas y procedimientos que permiten la recuperación o continuación de infraestructura tecnológica crítica después de un desastre natural o inducido por humanos. Protege contra pérdida de datos y minimiza downtime cuando ocurre lo inesperado.

Esta guía cubre la definición de objetivos de recuperación, estrategias de backup, arquitecturas multi-región y runbooks accionables.

## When to Use

- Operas un servicio crítico para el negocio donde downtime es inaceptable
- Necesitas cumplir con requerimientos regulatorios de protección de datos
- Quieres protegerte contra caídas de proveedor cloud, fallas de región o corrupción de datos
- Estás diseñando o revisando tu estrategia de backup y recuperación
- Necesitas definir objetivos RTO y RPO para tu organización

## Core Concepts

| Concepto | Descripción | Valores Típicos |
|----------|-------------|-----------------|
| **RTO (Recovery Time Objective)** | Downtime máximo aceptable después de un desastre | Minutos a 24 horas |
| **RPO (Recovery Point Objective)** | Pérdida máxima de datos aceptable (tiempo desde último backup) | Cero a 24 horas |
| **MTTR (Mean Time to Recovery)** | Tiempo promedio para restaurar servicio después de falla | Medido en minutos/horas |
| **MTBF (Mean Time Between Failures)** | Tiempo promedio entre fallas del sistema | Medido en días/meses |
| **Failover** | Cambio a sistema standby cuando el primario falla | Automático o manual |
| **Failback** | Retorno al sistema primario después de recuperación | Planificado y probado |

## Disaster Recovery Strategies

| Estrategia | RTO | RPO | Costo | Descripción |
|------------|-----|-----|-------|-------------|
| **Backup y Restauración** | Horas a días | Horas a días | Bajo | Backups periódicos restaurados en nueva infraestructura |
| **Pilot Light** | 10-60 minutos | Minutos | Medio | Sistemas core siempre ejecutando; escalar bajo demanda |
| **Warm Standby** | Minutos | Casi cero | Medio-Alto | Réplica reducida lista para escalar |
| **Hot Standby / Activo-Activo** | Casi cero | Casi cero | Alto | Réplica completa sirviendo tráfico activamente |
| **Multi-Región Activo-Activo** | Casi cero | Cero | Muy Alto | Todas las regiones sirven tráfico simultáneamente |

## Step-by-Step DR Planning

### 1. Definir Objetivos de Recuperación

Establece RTO y RPO para cada sistema crítico:

```yaml
# Ejemplo: Objetivos de recuperación por nivel de servicio
tiers:
  - name: tier_1_critico
    examples: [payment-processing, user-authentication]
    rto: "5 minutos"
    rpo: "0 minutos"
    strategy: "activo-activo"
  - name: tier_2_importante
    examples: [reporting, analytics]
    rto: "4 horas"
    rpo: "1 hora"
    strategy: "warm-standby"
  - name: tier_3_estandar
    examples: [internal-tools, staging]
    rto: "24 horas"
    rpo: "24 horas"
    strategy: "backup-restore"
```

### 2. Mapear Dependencias y Rutas Críticas

Entiende qué debe recuperarse y en qué orden:

```bash
# Ejemplo: Grafo de dependencias de servicios para orden de recuperación
# La recuperación debe suceder en orden de dependencias:
# 1. DNS / CDN
# 2. Balanceadores / API gateways
# 3. Bases de datos (primaria primero)
# 4. Capas de caché
# 5. Servicios de aplicación
# 6. Workers en segundo plano
# 7. Analytics / jobs por lotes
```

**Checklist de mapeo de dependencias:**
- Identificar puntos únicos de falla
- Mapear topologías de replicación de bases de datos
- Documentar dependencias de APIs externas
- Anotar servicios críticos de terceros
- Verificar que sistemas de backup sean independientes del primario

### 3. Diseñar Estrategia de Backup

Coincidir frecuencia de backup y retención con requerimientos de RPO:

| Tipo de Datos | Frecuencia de Backup | Retención | Almacenamiento |
|---------------|---------------------|-----------|----------------|
| Base de datos transaccional | Continuo o por hora | 30 días + anual | Región cruzada + frío |
| Archivos/almacenamiento de objetos | Sincronización diaria | 90 días | Región cruzada |
| Configuración/IaC | Cada cambio (Git) | Para siempre | Git + almacén de artefactos |
| Logs | Streaming en tiempo real | 30-90 días | Hot + frío |

```bash
# Ejemplo: Estrategia de backup PostgreSQL
# Archivado continuo (WAL) para recuperación point-in-time
cat <<EOF >> postgresql.conf
archive_mode = on
archive_command = 'aws s3 cp %p s3://my-backups/wal/%f'
wal_level = replica
EOF

# Backup base diario
pg_basebackup -D /backups/$(date +%Y%m%d) -Ft -z -P
```

### 4. Implementar Arquitectura Multi-Región

Diseñar para falla regional desde el inicio:

```yaml
# Ejemplo: Kubernetes activo-pasivo multi-región
# Región primaria: us-east-1
# Región secundaria: us-west-2

apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: api-service
                topologyKey: topology.kubernetes.io/zone
```

**Patrones multi-región:**
- **Réplicas de lectura:** Región primaria escribe; regiones secundarias leen réplicas
- **Activo-pasivo:** Primaria activa; secundaria en standby (pilot light o warm)
- **Activo-activo:** Ambas regiones sirven tráfico (requiere sincronización de datos)
- **Basado en celdas:** Arquitectura sharded con celdas en múltiples regiones

### 5. Crear Runbooks de Recuperación

Documentar procedimientos de recuperación paso a paso:

```markdown
# Runbook: Failover de Base de Datos a Región Secundaria

## Trigger
- Health check de base de datos en región primaria falla por >2 minutos
- Alerta automática dispara: `database-primary-down`

## Steps

1. **Verificar interrupción** (1 min)
   - Revisar dashboard de monitoreo
   - Confirmar problema a nivel de región (no instancia aislada)

2. **Iniciar failover** (2 min)
   - Ejecutar: `kubectl exec failover-script -- promote-replica`
   - Verificar: nueva primaria acepta escrituras

3. **Actualizar DNS** (2 min)
   - Cambiar CNAME de base de datos a región secundaria
   - TTL: 60 segundos (pre-configurado)

4. **Verificar salud de aplicación** (3 min)
   - Revisar tasas de error de aplicación
   - Verificar flujos críticos de usuarios

5. **Comunicar** (5 min)
   - Actualizar página de estado
   - Notificar stakeholders

## Rollback
- Cuando la primaria se recupera, planificar failback durante ventana de mantenimiento
- Validar consistencia de datos antes de failback
```

### 6. Probar Recuperación Regularmente

Los planes de DR no probados son solo deseos:

| Tipo de Prueba | Frecuencia | Alcance |
|----------------|------------|---------|
| **Ejercicio de mesa** | Trimestral | Caminar runbooks sin ejecutar |
| **Prueba de restauración de backup** | Mensual | Restaurar base de datos desde backup para verificar integridad |
| **Drill de failover** | Trimestral | Promover réplica, actualizar DNS, verificar servicio |
| **Ingeniería del caos** | Mensual | Inyectar fallas (ej. terminar base de datos primaria) |
| **Simulación completa de DR** | Anual | Simular falla completa de región y recuperación |

```python
# Ejemplo: Verificación automatizada de integridad de backup
import subprocess

def test_backup_restore():
    latest_backup = get_latest_backup()
    temp_instance = create_temp_database()
    
    restore_result = subprocess.run([
        'pg_restore',
        '--dbname', temp_instance.connection_string,
        latest_backup.path
    ], capture_output=True)
    
    if restore_result.returncode != 0:
        alert_oncall("Prueba de restauración de backup falló!")
        return False
    
    # Verificar que conteos de filas coincidan con valores esperados
    rows = temp_instance.query("SELECT count(*) FROM critical_table")
    assert rows[0][0] > 0, "Base de datos restaurada parece vacía"
    
    cleanup(temp_instance)
    return True
```

## Best Practices

- **Automatiza donde sea posible.** El failover manual a las 3 AM es propenso a errores.
- **Mantén runbooks simples.** Una persona debería poder ejecutarlos bajo presión.
- **Prueba backups restaurándolos.** Un backup que no puedes restaurar no es un backup.
- **Monitorea lag de replicación.** Si el lag excede el RPO, alerta inmediatamente.
- **Documenta suposiciones.** ¿Qué pasa si DNS está caído? ¿Qué pasa si el autor del runbook no está disponible?
- **Separa infraestructura de DR.** Los sistemas de DR no deberían depender de recursos de la región primaria.

## Common Mistakes

- **Backups no probados.** Muchas organizaciones descubren backups corruptos solo durante un desastre real.
- **Sobre-ingeniería para sistemas de bajo nivel.** Coincidir estrategia de DR con criticidad de negocio.
- **Olvidar consistencia de datos.** La replicación asíncrona puede perder transacciones durante failover.
- **Ignorar mantenimiento de runbooks.** Runbooks obsoletos con comandos desactualizados causan confusión.
- **Sin plan de comunicación.** Durante una interrupción, los stakeholders necesitan actualizaciones oportunas.

## Variants

- **DR cloud-native:** Usar servicios administrados con replicación integrada (RDS Multi-AZ, Azure Site Recovery, réplicas Cloud SQL).
- **DR on-premise:** Enfocarse en backups off-site en cinta, sitios warm y ciclos de adquisición de hardware.
- **DR híbrido:** DR basado en cloud para cargas on-premise (pilot light inverso).

## FAQ

**Q: ¿Cómo elijo entre objetivos RTO/RPO?**
Equilibra costo contra impacto de negocio. Una plataforma de trading necesita segundos; una wiki interna tolera horas.

**Q: ¿Cuál es la estrategia mínima viable de DR?**
Como mínimo: backups diarios automatizados, restauraciones mensuales probadas y un procedimiento de recuperación documentado.

**Q: ¿Cómo manejo failback de base de datos después de recuperación?**
Planifica failback durante ventanas de bajo tráfico. Valida consistencia de datos y reproduce transacciones perdidas.

**Q: ¿Debería usar el mismo proveedor cloud para DR?**
DR multi-cloud provee la mayor resiliencia pero añade complejidad. Empieza con multi-región, mismo proveedor.

## Conclusion

La recuperación ante desastres es un seguro para tu infraestructura. Define objetivos claros, diseña estrategias apropiadas, documenta runbooks y prueba regularmente. El momento de descubrir un problema con tu plan de DR es durante un drill, no durante un desastre real.

## Related Resources

- [Prácticas SRE](/guides/devops/sre-practices-guide)
- [Ingeniería del Caos](/guides/devops/chaos-engineering-guide)
- [Estrategias Multi-Cloud](/guides/devops/multi-cloud-guide)
- [Arquitectura Zero Trust](/guides/security/zero-trust-architecture-guide)
- [Planificación de Capacidad](/guides/planning/capacity-planning-guide)
