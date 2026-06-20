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
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/full-text-search
  - /recipes/sql-joins
  - /docs/database-migration-runbook-template
  - /guides/cap-theorem-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
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
# Configurar read replicas de base de datos para escalado

## Visión General

Las read replicas son copias de tu base de datos principal que manejan tráfico solo de lectura, aliviando la instancia principal. Son la estrategia de escalado más común para workloads intensivos en lectura — dashboards analíticos, búsquedas y lecturas de API pueden dirigirse a réplicas mientras las escrituras van a la primaria.

Esta receta cubre la configuración de read replicas, implementación de split de lectura/escritura, monitoreo de replication lag y manejo de lecturas stale en PostgreSQL, MySQL y bases de datos administradas en la nube.

## Cuándo Usar

Usa este recurso cuando:
- La CPU o I/O de tu base de datos principal está saturada por queries de lectura. Consulta [Query Optimization](/recipes/databases/postgres-query-optimization) para ajustar lecturas.
- Necesitas ejecutar reportes analíticos sin impactar escrituras de producción. Consulta [Logging](/recipes/api/logging) para observabilidad.
- Quieres localidad geográfica de lecturas colocando réplicas cerca de usuarios. Consulta [Caching](/recipes/data/caching) para rendimiento en edge.
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
- **Replicación física**: Copia bloques de WAL (Write-Ahead Log) directamente. Rápida pero replica todo.
- **Replicación lógica**: Replica cambios a nivel de fila. Selectiva pero con más overhead.

**Replication lag** es el retraso entre una escritura en la primaria y su aparición en la réplica. Las causas incluyen latencia de red, carga de la réplica y transacciones grandes. Las aplicaciones deben manejar lecturas stale o enrutar queries críticas de consistencia a la primaria.

## Variantes

| Base de datos | Tipo de replicación | Monitoreo de lag | Enrutado de lecturas |
|---------------|--------------------|--------------------|----------------------|
| PostgreSQL | Streaming / Lógica | `pg_stat_replication` | PgBouncer, proxy custom |
| MySQL | Binlog (async/semi-sync) | `SHOW SLAVE STATUS` | ProxySQL, MaxScale |
| Cloud RDS | Streaming administrado | CloudWatch/Cloud Monitoring | RDS Proxy, custom |
| CockroachDB | Multi-active (Raft) | Built-in | Automático |

## Mejores Prácticas

- **Monitorea el replication lag**: Alerta cuando el lag excede 1–5 segundos dependiendo del caso de uso
- **Enruta lecturas sensibles al tiempo a la primaria**: Lecturas de perfil de usuario después de editar deben ir a la primaria
- **Usa connection pooling por réplica**: No crees conexiones directamente; usa PgBouncer o ProxySQL. Consulta [Connection Pooling](/recipes/databases/database-connection-pooling) para configuración.
- **Distribuye réplicas entre zonas de disponibilidad**: Protege contra fallos de zona
- **Prueba procedimientos de failover**: Las réplicas pueden promoverse a primaria durante outages. Consulta [Retry Logic](/recipes/architecture/retry-backoff) para patrones de resiliencia.

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
