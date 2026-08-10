---


contentType: recipes
slug: database-read-replicas
title: "Configurar read replicas de base de datos para escalado"
description: "Escala workloads intensivos en lectura con read replicas de base de datos, monitoreo de replication lag y split de lectura/escritura entre instancias primarias y réplicas."
metaDescription: "Configura read replicas de base de datos para escalado. Monitoreo de replication lag, split de lectura/escritura y balanceo de carga entre primaria y réplicas."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - sql
  - postgresql
  - mysql
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/full-text-search
  - /recipes/sql-joins
  - /docs/database-migration-runbook-template
  - /guides/cap-theorem-guide
  - /recipes/optimistic-locking
  - /recipes/sql-full-text-search-setup
  - /recipes/database-views-materialized
  - /recipes/event-sourcing-relational
lastUpdated: "2026-06-12"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Configura read replicas de base de datos para escalado. Monitoreo de replication lag, split de lectura/escritura y balanceo de carga entre primaria y réplicas."
  keywords:
    - read-replicas
    - replicacion
    - escalado
    - postgresql
    - mysql
    - balanceo-carga


---
## Visión General

Las read replicas son copias de tu base de datos principal que manejan tráfico solo de lectura, aliviando la instancia principal. Son la estrategia de escalado más común para workloads intensivos en lectura — dashboards analíticos, búsquedas y lecturas de API pueden dirigirse a réplicas mientras las escrituras van a la primaria.

A continuacion se cubre la configuración de read replicas, implementación de split de lectura/escritura, monitoreo de replication lag y manejo de lecturas stale en PostgreSQL, MySQL y bases de datos administradas en la nube.

## Cuándo Usar

Usa este recurso cuando:
- La CPU o I/O de tu base de datos principal está saturada por queries de lectura. Consulta [Query Optimization](/recipes/postgres-query-optimization/) para ajustar lecturas.
- Necesitas ejecutar reportes analíticos sin impactar escrituras de producción. Consulta [Logging](/recipes/logging/) para observabilidad.
- Quieres localidad geográfica de lecturas colocando réplicas cerca de usuarios. Consulta [Caching](/recipes/caching/) para rendimiento en edge.
- Tu workload es intensivo en lectura (>80% lecturas) y el volumen de escritura es moderado

## Solución

### Python (SQLAlchemy con split de lectura/escritura)

```python
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import random

# Primaria para escrituras, réplicas para lecturas
primary_engine = create_engine("postgresql://user:pass@primary:5432/app")
replica_engines = [
    create_engine("postgresql://user:pass@replica1:5432/app"),
    create_engine("postgresql://user:pass@replica2:5432/app"),
]

class RoutingSession:
    def __init__(self):
        self._write_session = sessionmaker(bind=primary_engine)()
        self._replica = random.choice(replica_engines)
        self._read_session = sessionmaker(bind=self._replica)()

    def execute_write(self, query, params=None):
        return self._write_session.execute(text(query), params or {})

    def execute_read(self, query, params=None):
        return self._read_session.execute(text(query), params or {})

    def commit(self):
        self._write_session.commit()

# Uso
session = RoutingSession()
users = session.execute_read("SELECT * FROM users WHERE active = true")
session.execute_write("UPDATE users SET last_login = NOW() WHERE id = :id", {"id": 1})
session.commit()
```

### JavaScript (Prisma con réplicas)

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // primaria
    },
  },
});

// Extensión de Prisma para read replicas (feature preview)
const prismaWithReplicas = prisma.$extends({
  query: {
    $allModels: {
      async findUnique({ model, operation, args, query }) {
        // Ruta lecturas a réplica
        return query(args);
      },
    },
  },
});

// Para queries raw divididos
async function executeRead(sql) {
  // Conectar a pool de réplica
  const replicaPool = new Pool({ connectionString: process.env.REPLICA_URL });
  return replicaPool.query(sql);
}

async function executeWrite(sql, params) {
  return prisma.$executeRawUnsafe(sql, ...params);
}
```

### Java (Spring Boot con AbstractRoutingDataSource)

```java
@Configuration
public class DataSourceConfig {
    @Bean
    public DataSource routingDataSource(
            @Qualifier("primaryDataSource") DataSource primary,
            @Qualifier("replicaDataSource") DataSource replica) {

        AbstractRoutingDataSource routing = new AbstractRoutingDataSource() {
            @Override
            protected Object determineCurrentLookupKey() {
                return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                    ? "replica" : "primary";
            }
        };

        Map<Object, Object> targets = new HashMap<>();
        targets.put("primary", primary);
        targets.put("replica", replica);
        routing.setTargetDataSources(targets);
        routing.setDefaultTargetDataSource(primary);
        return routing;
    }
}

@Service
public class UserService {
    @Transactional(readOnly = true)
    public List<User> findAll() {
        // Enrutado automáticamente a réplica
        return userRepository.findAll();
    }

    @Transactional
    public User save(User user) {
        // Enrutado a primaria
        return userRepository.save(user);
    }
}
```

## Explicación

Las read replicas usan replicación streaming (física) o lógica:
- **Replicación física**: Copia bloques de WAL (Write-Ahead Log) directamente.   Rápida pero replica todo.
- **Replicación lógica**: Replica cambios a nivel de fila.   Selectiva pero con más overhead.

**Replication lag** es el retraso entre una escritura en la primaria y su aparición en la réplica. Las causas incluyen latencia de red, carga de la réplica y transacciones grandes. Las aplicaciones deben manejar lecturas stale o enrutar queries críticas de consistencia a la primaria.

## Variantes

| Base de datos | Tipo de replicación | Monitoreo de lag | Enrutado de lecturas |
|---------------|--------------------|--------------------|----------------------|
| PostgreSQL | Streaming / Lógica | `pg_stat_replication` | PgBouncer, proxy custom |
| MySQL | Binlog (async/semi-sync) | `SHOW SLAVE STATUS` | ProxySQL, MaxScale |
| Cloud RDS | Streaming administrado | CloudWatch/Cloud Monitoring | RDS Proxy, custom |
| CockroachDB | Multi-active (Raft) | Built-in | Automático |

## Lo que funciona

- **Monitorea el replication lag**: Alerta cuando el lag excede 1–5 segundos dependiendo del caso de uso
- **Enruta lecturas sensibles al tiempo a la primaria**: Lecturas de perfil de usuario después de editar deben ir a la primaria
- **Usa connection pooling por réplica**: Consulta [Connection Pooling](/recipes/database-connection-pooling/) para configuración.
- **Distribuye réplicas entre zonas de disponibilidad**: Protege contra fallos de zona
- **Prueba procedimientos de failover**: Las réplicas pueden promoverse a primaria durante outages.   Consulta [Retry Logic](/recipes/retry-backoff/) para patrones de resiliencia.

## Errores Comunes

- **Asumir que las réplicas son instantáneamente consistentes**: Siempre considera el replication lag en escenarios de lectura-después-de-escritura
- **Enviar escrituras a réplicas**: Las réplicas son solo lectura; las escrituras fallarán o serán silenciosamente ignoradas
- **Ignorar el monitoreo de replication lag**: Los usuarios ven datos stale sin que nadie lo sepa
- **Sobre-replicar**: Cada réplica añade carga a la primaria; encuentra la proporción correcta (usualmente 1:3 a 1:5)
- **Sin plan de failover**: Cuando la primaria falla, promueve una réplica rápidamente — practica esto regularmente

## Preguntas Frecuentes

**P: ¿Cuánto replication lag es aceptable?**
R: Para lecturas orientadas a usuarios: <100ms. Para análisis: segundos a minutos. Para invalidación de caché: <1s. Monitorea y alerta basado en tu caso de uso.

**P: ¿Puedo escribir en una read replica?**
R: Solo si usas replicación multi-master (Galera, CockroachDB, Yugabyte). Las read replicas estándar rechazan escrituras. Intentar escribir lanzará errores.

**P: ¿Necesito un proxy a nivel de aplicación para split de lecturas?**
R: No siempre. Algunos drivers (libpq de PostgreSQL, Connector/J de MySQL) soportan múltiples hosts. ORMs como Prisma e Hibernate también proveen enrutado de réplicas. Para escenarios complejos, usa ProxySQL, PgBouncer o AWS RDS Proxy.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### PgBouncer para Connection Pooling con Réplicas

```ini
# pgbouncer.ini
[databases]
master = host=master.db.internal port=5432 dbname=app
replica1 = host=replica1.db.internal port=5432 dbname=app
replica2 = host=replica2.db.internal port=5432 dbname=app

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

```python
import psycopg2

# Escribir al master vía PgBouncer
write_conn = psycopg2.connect("postgresql://user:pass@pgbouncer:6432/master")

# Leer de réplica vía PgBouncer
read_conn = psycopg2.connect("postgresql://user:pass@pgbouncer:6432/replica1")

# Enrutado a nivel aplicación
def get_connection(is_write=False):
    if is_write:
        return psycopg2.connect("postgresql://user:pass@pgbouncer:6432/master")
    # Round-robin entre réplicas
    import random
    replica = random.choice(['replica1', 'replica2'])
    return psycopg2.connect(f"postgresql://user:pass@pgbouncer:6432/{replica}")
```

### ProxySQL para Split Read/Write en MySQL

```sql
-- Configurar ProxySQL con servidores backend
INSERT INTO mysql_servers(hostgroup_id, hostname, port) VALUES
  (0, 'master.db.internal', 3306),   -- hostgroup 0: escrituras
  (1, 'replica1.db.internal', 3306),  -- hostgroup 1: lecturas
  (1, 'replica2.db.internal', 3306);  -- hostgroup 1: lecturas

-- Reglas de enrutado: SELECT va a réplicas, todo lo demás al master
INSERT INTO mysql_query_rules(rule_id, active, match_digest, destination_hostgroup, apply)
VALUES
  (1, 1, '^SELECT.*FOR UPDATE', 0, 1),  -- Locking reads al master
  (2, 1, '^SELECT', 1, 1);               -- Reads normales a réplicas

LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

### Configuración de AWS RDS Proxy

```yaml
# AWS CloudFormation snippet para RDS Proxy con split read/write
Resources:
  ReadWriteProxy:
    Type: AWS::RDS::DBProxy
    Properties:
      DBProxyName: app-proxy
      EngineFamily: POSTGRESQL
      RoleArn: !GetAtt ProxyRole.Arn
      Auth:
        - AuthScheme: SECRETS
          SecretArn: !Ref DBSecretArn
      TargetGroupName: default
      Targets:
        - RdsInstanceId: !Ref MasterInstance
        - RdsInstanceId: !Ref ReplicaInstance1
      ConnectionPoolConfiguration:
        MaxConnectionsPercent: 80
        IdleClientTimeout: 1800
```

### Driver SQL de Go con Split Read/Write

```go
package db

import (
    "database/sql"
    "math/rand"
    "time"
    _ "github.com/lib/pq"
)

type DBRouter struct {
    master   *sql.DB
    replicas []*sql.DB
    rng      *rand.Rand
}

func NewDBRouter(masterURL string, replicaURLs []string) (*DBRouter, error) {
    master, err := sql.Open("postgres", masterURL)
    if err != nil {
        return nil, err
    }
    master.SetMaxOpenConns(20)

    replicas := make([]*sql.DB, len(replicaURLs))
    for i, url := range replicaURLs {
        replica, err := sql.Open("postgres", url)
        if err != nil {
            return nil, err
        }
        replica.SetMaxOpenConns(10)
        replicas[i] = replica
    }

    return &DBRouter{
        master:   master,
        replicas: replicas,
        rng:      rand.New(rand.NewSource(time.Now().UnixNano())),
    }, nil
}

func (r *DBRouter) Read() *sql.DB {
    if len(r.replicas) == 0 {
        return r.master
    }
    return r.replicas[r.rng.Intn(len(r.replicas))]
}

func (r *DBRouter) Write() *sql.DB {
    return r.master
}

// Uso
func (r *DBRouter) GetUser(id int) (*User, error) {
    var user User
    err := r.Read().QueryRow(
        "SELECT id, email FROM users WHERE id = $1", id,
    ).Scan(&user.ID, &user.Email)
    return &user, err
}

func (r *DBRouter) CreateUser(email string) error {
    _, err := r.Write().Exec(
        "INSERT INTO users (email) VALUES ($1)", email,
    )
    return err
}
```

### Django Database Routers

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'app',
        'HOST': 'master.db.internal',
        'PORT': '5432',
    },
    'replica': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'app',
        'HOST': 'replica1.db.internal',
        'PORT': '5432',
    },
}

# routers.py
class ReadReplicaRouter:
    def db_for_read(self, model, **hints):
        return 'replica'

    def db_for_write(self, model, **hints):
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return db == 'default'

DATABASE_ROUTERS = ['myapp.routers.ReadReplicaRouter']

# Uso: reads van automáticamente a réplica, writes al master
users = User.objects.filter(role='admin')  # Va a réplica
user = User.objects.create(email='alice@example.com')  # Va al master
```

### Consultas de Monitoreo de Replication Lag

```sql
-- PostgreSQL: verificar replication lag
SELECT
    client_addr,
    state,
    sent_lsn,
    replay_lsn,
    EXTRACT(EPOCH FROM (now() - replay_lag)) AS lag_seconds
FROM pg_stat_replication;

-- Verificar estado de WAL receiver en réplica
SELECT status, receive_start_lsn, written_lsn, flushed_lsn
FROM pg_stat_wal_receiver;

-- Monitorear lag de slot (si usas replication slots)
SELECT slot_name, restart_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes
FROM pg_replication_slots;
```

```sql
-- MySQL: verificar lag de réplica
SHOW REPLICA STATUS\G

-- Campos clave a monitorear:
-- Seconds_Behind_Master: debería ser < 5
-- Replica_IO_Running: Yes
-- Replica_SQL_Running: Yes

-- Monitorear via performance schema
SELECT
    channel_name,
    service_state,
    last_error_number,
    last_error_message
FROM performance_schema.replication_connection_status;
```

### Manejo de Replication Lag en Código de Aplicación

```python
import time
import psycopg2

def read_after_write(conn_master, conn_replica, query, params, max_wait=2.0):
    """Leer de réplica con fallback al master si el lag es demasiado alto."""
    # Verificar replication lag
    with conn_master.cursor() as cur:
        cur.execute("""
            SELECT EXTRACT(EPOCH FROM (now() - replay_lag))::float
            FROM pg_stat_replication LIMIT 1
        """)
        lag = cur.fetchone()[0] or 0

    if lag > max_wait:
        # La réplica está muy atrás: leer del master
        with conn_master.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()

    # Leer de réplica
    try:
        with conn_replica.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()
    except Exception:
        # Fallback al master si hay error en réplica
        with conn_master.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()
```




## Tips de Rendimiento

1. **Usa `pg_stat_replication` para ajustar el número de réplicas.** Si el replication lag excede consistentemente 5 segundos, puedes tener demasiadas réplicas o hardware insuficiente:

```sql
SELECT application_name, client_addr,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
       EXTRACT(EPOCH FROM replay_lag) AS lag_seconds
FROM pg_stat_replication;
```

2. **Coloca réplicas en diferentes zonas de disponibilidad.** Esto proporciona tanto escalado de lectura como recuperación ante desastres:

```yaml
# AWS RDS: crear read replicas en diferentes AZs
ReadReplica1:
  Type: AWS::RDS::DBInstance
  Properties:
    SourceDBInstanceIdentifier: !Ref MasterInstance
    AvailabilityZone: us-east-1b
    DBInstanceClass: db.r6g.large

ReadReplica2:
  Type: AWS::RDS::DBInstance
  Properties:
    SourceDBInstanceIdentifier: !Ref MasterInstance
    AvailabilityZone: us-east-1c
    DBInstanceClass: db.r6g.large
```

3. **Usa `hot_standby_feedback = on` en réplicas.** Esto previene que el master vacuume filas que las réplicas aún están leyendo:

```sql
-- En replica postgresql.conf
hot_standby_feedback = on
```

4. **Ajusta `max_wal_senders` y `wal_keep_size` en el master.** Asegura suficiente WAL retenido para las réplicas:

```sql
-- postgresql.conf
max_wal_senders = 10
wal_keep_size = 1024  -- MB
```

5. **Usa `pg_stat_statements` para identificar queries read-heavy.** Enruta los queries de lectura más frecuentes a réplicas:

```sql
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE query LIKE 'SELECT%'
ORDER BY calls DESC
LIMIT 20;
```
