---
contentType: guides
slug: read-replica-guide
title: "Réplicas de Lectura — Escala Lecturas Sin Cambiar la Lógica de Aplicación"
description: "Guía práctica sobre réplicas de lectura: configurar replicación, enrutar consultas de lectura, manejar lag de replicación, y escalar cargas de trabajo intensivas en lectura con PostgreSQL, MySQL y réplicas gestionadas en la nube."
metaDescription: "Aprende réplicas de lectura: configura replicación, enruta consultas, maneja lag y escala lecturas con PostgreSQL, MySQL y nube."
difficulty: intermediate
topics:
  - databases
  - performance
  - infrastructure
tags:
  - read-replicas
  - replication
  - postgresql
  - mysql
  - scaling
  - performance
  - guide
relatedResources:
  - /guides/data/database-sharding-implementation-guide
  - /guides/data/connection-pooling-deep-dive-guide
  - /guides/data/caching-strategies-guide
  - /guides/observability/metrics-and-dashboards-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende réplicas de lectura: configura replicación, enruta consultas, maneja lag y escala lecturas con PostgreSQL, MySQL y nube."
  keywords:
    - read-replicas
    - replication
    - postgresql
    - mysql
    - scaling
    - performance
    - guide
---

## Descripción General

Las réplicas de lectura son copias de tu base de datos primaria que manejan consultas de solo lectura. Son la forma más simple y costo-efectiva de escalar cargas de trabajo intensivas en lectura de base de datos. Al descargar las consultas SELECT a las réplicas, reduces la carga en el primario, mejoras los tiempos de respuesta y aumentas la disponibilidad.

Esta guía cubre configuración de replicación, enrutamiento de consultas, manejo de lag de replicación y lo que funciona operativamente.

## Cuándo Usar

- Las consultas de lectura exceden el 80% de la carga de trabajo de tu base de datos
- Consultas analíticas (reportes, agregaciones) ralentizan las escrituras transaccionales
- Necesitas escalado de lectura más allá de lo que una sola instancia puede proporcionar
- Quieres distribución geográfica de lectura (réplicas en múltiples regiones)
- Necesitas un hot standby para failover sin hardware de standby dedicado
- Tu working set cabe en memoria pero el volumen de consultas excede la capacidad de CPU

## Cuándo NO Usar

- Tu carga de trabajo es intensiva en escritura (>50% escrituras) — las réplicas no ayudan al escalado de escritura
- Requieres lecturas fuertemente consistentes inmediatamente después de escrituras — el lag de replicación puede violar esto
- Tus consultas ya están limitadas por CPU en la réplica — agregar más réplicas es mejor que hacerlas más grandes
- No has optimizado consultas e índices en el primario — arregla esos primero

## Conceptos Clave

| Concepto | Descripción |
|---------|-------------|
| **Primario (Master)** | La instancia de base de datos que acepta escrituras |
| **Réplica (Slave)** | Una instancia de base de datos que replica datos desde el primario |
| **Lag de Replicación** | Retraso entre una escritura en el primario y su aparición en la réplica |
| **Replicación Streaming** | Transferencia continua de WAL (PostgreSQL) o binlog (MySQL) |
| **Replicación Lógica** | Replicación a nivel de fila con filtrado (PostgreSQL 10+) |
| **Promoción** | Convertir una réplica en el nuevo primario durante failover |

## Arquitectura de Réplicas de Lectura

```
         Escrituras + Lecturas Críticas
              │
         ┌────▼────┐
         │ Primario │
         │  (R/W)  │
         └────┬────┘
              │ WAL / Binlog
      ┌───────┼───────┐
      │       │       │
   ┌──▼──┐ ┌─▼───┐ ┌─▼───┐
   │Repl │ │Repl │ │Repl │
   │  1  │ │  2  │ │  3  │
   └──┬──┘ └──┬──┘ └──┬──┘
      │       │       │
      └───────┼───────┘
              │
         Consultas de Lectura
```

## Implementación de Réplicas de Lectura Paso a Paso

### 1. Configura Replicación Streaming

Configura replicación física de streaming para copias casi en tiempo real:

```ini
# postgresql.conf (Primario)
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
hot_standby = on
```

```ini
# postgresql.conf (Réplica)
hot_standby = on
hot_standby_feedback = on
max_standby_streaming_delay = 30s
```

```bash
# pg_hba.conf (Primario): Permitir conexiones de replicación
host replication replicator 192.168.1.0/24 scram-sha-256
```

```bash
# Inicializar réplica con backup base
pg_basebackup -h primary-host -D /var/lib/postgresql/data -U replicator -P -v -R
```

```ini
# my.cnf (MySQL Primario)
[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW
expire_logs_days = 7
max_binlog_size = 500M
```

```ini
# my.cnf (MySQL Réplica)
[mysqld]
server-id = 2
relay_log = /var/log/mysql/mysql-relay-bin
log_bin = /var/log/mysql/mysql-bin
read_only = 1
```

```sql
-- MySQL: Configurar replicación en réplica
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST='primary-host',
    SOURCE_USER='replicator',
    SOURCE_PASSWORD='password',
    SOURCE_LOG_FILE='mysql-bin.000001',
    SOURCE_LOG_POS=0;

START REPLICA;
```

### 2. Enruta Lecturas a Réplicas

Dirige consultas de lectura a réplicas mientras mantienes escrituras en el primario:

```python
# Ejemplo: Python con división de lectura/escritura
import psycopg2
from contextlib import contextmanager

# Pools de conexiones
primary_pool = psycopg2.pool.ThreadedConnectionPool(1, 10, dsn="dbname=app primary")
replica_pool = psycopg2.pool.ThreadedConnectionPool(1, 10, dsn="dbname=app replica")

@contextmanager
def get_db_connection(read_only=False):
    """Obtener conexión: primario para escrituras, réplica para lecturas."""
    pool = replica_pool if read_only else primary_pool
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)

# Uso
def get_user(user_id):
    with get_db_connection(read_only=True) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cursor.fetchone()

def update_user(user_id, data):
    with get_db_connection(read_only=False) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET name = %s WHERE id = %s", (data['name'], user_id))
        conn.commit()
```

```java
// Ejemplo: Spring Boot con enrutamiento de lectura/escritura
@Configuration
public class DataSourceConfig {
    
    @Bean
    public DataSource routingDataSource(
            @Qualifier("primaryDataSource") DataSource primary,
            @Qualifier("replicaDataSource") DataSource replica) {
        
        ReplicationRoutingDataSource routing = new ReplicationRoutingDataSource();
        Map<Object, Object> targets = new HashMap<>();
        targets.put("primary", primary);
        targets.put("replica", replica);
        routing.setTargetDataSources(targets);
        routing.setDefaultTargetDataSource(primary);
        return routing;
    }
}

// La anotación Transactional determina el enrutamiento
@Service
public class UserService {
    
    @Transactional(readOnly = true)
    public User getUser(String id) {
        return userRepository.findById(id).orElseThrow();
    }
    
    @Transactional
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}
```

**Estrategias de enrutamiento:**

| Estrategia | Implementación | Mejor Para |
|------------|---------------|------------|
| **División de pool de conexiones** | Pools separados para primario y réplica | Aplicaciones simples |
| **Basado en proxy** | PgBouncer, ProxySQL, HAProxy | Cero cambios en aplicación |
| **Integración ORM** | Routers de base de datos Django, Spring AbstractRoutingDataSource | Apps basadas en frameworks |
| **Basado en DNS** | Endpoints separados (primary.db, replica.db) | Microservicios |

### 3. Maneja el Lag de Replicación

El lag de replicación es el principal desafío con réplicas de lectura:

```python
# Ejemplo: Enrutamiento consciente de lag
import time

class LagAwareRouter:
    def __init__(self, primary, replica, max_lag_seconds=5):
        self.primary = primary
        self.replica = replica
        self.max_lag = max_lag_seconds
    
    def get_replica_lag(self):
        """Verificar lag de replicación actual en segundos."""
        cursor = self.replica.cursor()
        cursor.execute("""
            SELECT 
                EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))
            AS lag_seconds
        """)
        return cursor.fetchone()[0] or 0
    
    def route_query(self, query, requires_freshness=False):
        """Enrutar a réplica si el lag es aceptable y no se requiere frescura."""
        if requires_freshness:
            return self.primary
        
        lag = self.get_replica_lag()
        if lag > self.max_lag:
            # Fallback a primario si la réplica está muy atrasada
            return self.primary
        
        return self.replica

# Uso: Forzar primario para datos modificados por usuario
user = router.route_query("SELECT * FROM users WHERE id = %s", 
                          requires_freshness=True)
```

```sql
-- PostgreSQL: Monitorear lag de replicación
SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) as lag
FROM pg_stat_replication;

-- MySQL: Monitorear lag de replicación
SHOW REPLICA STATUS\G
-- Buscar: Seconds_Behind_Source
```

**Estrategias para manejar lag:**

| Enfoque | Cómo Funciona | Trade-off |
|---------|---------------|-----------|
| **Stickiness de sesión** | Leer del primario después de una escritura en la misma sesión | Ligeramente más carga en primario |
| **Umbral de lag** | Enrutar al primario si el lag excede X segundos | Simple, pero puede generar picos de carga en primario |
| **Consistencia eventual** | Aceptar lecturas obsoletas, documentarlo | Mejor rendimiento, pero inconsistencia visible a usuarios |
| **Redirección post-escritura** | Rastrear claves recientemente modificadas, enrutar esas al primario | Complejo, requiere lógica de aplicación |
| **Consistencia causal** | Rastrear LSN por sesión, esperar que la réplica se ponga al día | PostgreSQL 14+ replicación lógica |

### 4. Configura Monitoreo y Alertas

Rastrea la salud de la réplica y el lag:

```yaml
# Ejemplo: Reglas de Prometheus para monitoreo de replicación
groups:
  - name: replication_alerts
    rules:
      - alert: HighReplicationLag
        expr: |
          pg_stat_replication_pg_wal_lsn_diff / 1024 / 1024 > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Lag de replicación excede 100MB"

      - alert: ReplicationStopped
        expr: |
          pg_stat_replication_state == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "La replicación se ha detenido"

      - alert: ReplicaLagSeconds
        expr: |
          mysql_slave_lag_seconds > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Lag de réplica MySQL > 10 segundos"
```

**Métricas clave para monitorear:**
- **Lag en bytes/segundos:** ¿Qué tan atrasada está la réplica?
- **Estado de replicación:** ¿Está corriendo, pausada o detenida?
- **Tendencia de lag:** ¿El lag está aumentando (indica que la réplica no puede mantenerse)?
- **Latencia de consulta en réplica:** ¿Las lecturas siguen siendo rápidas?
- **Conteo de conexiones:** ¿La réplica está en su límite de conexiones?

### 5. Planifica para Failover

Cuando el primario falla, promueve una réplica:

```bash
# PostgreSQL: Promoción manual
pg_ctl promote -D /var/lib/postgresql/data

# O usando repmgr (herramienta de failover automatizado)
repmgr standby promote
```

```bash
# MySQL: Promover réplica a primario
STOP REPLICA;
RESET REPLICA ALL;
SET GLOBAL read_only = OFF;
```

**Enfoques de failover:**

| Enfoque | RTO | Complejidad | Mejor Para |
|---------|-----|-------------|------------|
| **Promoción manual** | 5-30 min | Baja | Equipos pequeños, sistemas no críticos |
| **Herramientas automatizadas** | 30-120s | Media | repmgr, Patroni, orchestrator |
| **Servicio gestionado** | 0-60s | Ninguna | RDS Multi-AZ, Cloud SQL HA |
| **Replicación síncrona** | 0s (sin pérdida de datos) | Alta | Sistemas financieros (latencia por seguridad) |

## Lo que funciona

- **Empieza con una réplica.** Una réplica bien configurada resuelve el 80% de las necesidades de escalado de lectura.
- **Usa réplicas para reportes y analítica.** Aísla consultas costosas del primario.
- **Monitorea el lag sin descanso.** Lag que crece sin control indica que la réplica no puede mantenerse.
- **Prueba failover antes de necesitarlo.** Promueve una réplica en staging trimestralmente.
- **Mantén hardware de réplica igual al primario.** Una réplica más lenta crea lag durante carga pico.
- **Usa pooling de conexiones en réplicas también.** Las réplicas tienen los mismos límites de conexión que los primarios.

## Errores Comunes

- **Enrutar todas las lecturas a réplicas.** Estado de sesión, datos recientemente modificados, y lecturas críticas deberían quedarse en el primario.
- **Ignorar lag de replicación.** Los usuarios ven datos obsoletos y reportan "bugs" que en realidad son lag.
- **Una sola réplica sin plan de failover.** Si la réplica falla, tu capacidad de lectura cae a cero.
- **Ejecutar escrituras en réplicas.** Las escrituras accidentales rompen la replicación y requieren reinicialización.
- **Sin monitoreo de lag.** Solo descubres problemas de lag cuando los usuarios se quejan.
- **Usar réplicas para escalado de escritura.** Las réplicas solo escalan lecturas. Para escalado de escritura, considera sharding o particionamiento.

## Variantes

- **Replicación en cascada:** Réplica → Réplica → Réplica para distribución geográfica
- **Multi-primario (master-master):** Escrituras aceptadas en múltiples nodos — complejo, usar con cautela
- **Replicación lógica:** Replicación selectiva de tabla/columna (PostgreSQL 10+, filtrado de binlog MySQL)
- **Réplicas en diferentes regiones:** Réplicas gestionadas por proveedores cloud para reducción de latencia global
- **Réplica retrasada:** Réplica intencionalmente atrasada por horas para recuperación punto-en-tiempo

## FAQ

**P: ¿Cuánto lag es aceptable?**
Para la mayoría de aplicaciones, <1 segundo es ideal, <5 segundos es aceptable. Las cargas de trabajo analíticas pueden tolerar minutos. Los sistemas financieros pueden requerir replicación síncrona (lag cero).

**P: ¿Puedo escribir en una réplica de lectura?**
No — las réplicas son de solo lectura por diseño. Algunos sistemas (MySQL Group Replication, extensiones multi-master de PostgreSQL) permiten escrituras multi-master, pero añaden complejidad mayor.

**P: ¿Cuántas réplicas puedo tener?**
PostgreSQL soporta hasta ~10 réplicas de streaming antes de que el overhead de WAL sender se vuelva considerable. Para más, usa réplicas en cascada (réplica de una réplica) o replicación lógica.

**P: ¿Necesito réplicas si uso caché?**
Sí — la caché y las réplicas se complementan. La caché maneja datos calientes; las réplicas manejan misses de caché y consultas analíticas.

## Conclusión

Las réplicas de lectura son la forma más simple de escalar lecturas de base de datos. Al configurar replicación streaming, enrutar consultas inteligentemente y monitorear el lag, puedes manejar 10x crecimiento de lectura sin cambiar considerablemente tu modelo de datos o arquitectura de aplicación.

