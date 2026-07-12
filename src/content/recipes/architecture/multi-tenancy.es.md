---


contentType: recipes
slug: multi-tenancy
title: "Arquitectura Multi-Tenancy"
description: "Diseña aplicaciones multi-tenant con bases de datos compartidas o aisladas, routing tenant-aware y estrategias de aislamiento de datos."
metaDescription: "Patrones de arquitectura multi-tenancy: base de datos compartida, schema aislado, instancia dedicada por tenant, routing y estrategias de aislamiento de datos para SaaS."
difficulty: advanced
topics:
  - architecture
tags:
  - multi-tenancy
  - architecture
  - databases
  - design
  - patterns
relatedResources:
  - /docs/adr-template
  - /docs/database-schema-documentation-template
  - /docs/engineering-handbook-template
  - /guides/rest-api-design-guide
  - /guides/domain-driven-design-guide
  - /recipes/api-gateway
  - /recipes/circuit-breaker-pattern-recipe
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Patrones de arquitectura multi-tenancy: base de datos compartida, schema aislado, instancia dedicada por tenant, routing y estrategias de aislamiento de datos para SaaS."
  keywords:
    - multi-tenancy
    - architecture
    - saas
    - databases


---
## Visión General

La multi-tenancy es una arquitectura donde una única instancia de software sirve a múltiples clientes (tenants) manteniendo sus datos y configuración aislados. El compromiso es entre simplicidad operativa (todo compartido) y aislamiento de datos (todo separado). Elegir el modelo correcto afecta la escalabilidad, seguridad y cumplimiento.

## Cuándo Usar

Usa este recurso cuando:
- Construyes aplicaciones SaaS que sirven a múltiples organizaciones
- Debes cumplir requisitos de compliance (SOC 2, HIPAA) que exigen segregación de datos. Consulta [Checklist de Seguridad de APIs](/guides/security/api-security-checklist-guide) para saber lo que funciona en compliance.
- Optimizas costos de infraestructura compartiendo compute entre tenants
- Escalas de cientos a miles de tenants con rendimiento predecible

## Solución

### Base de Datos Compartida con Tenant ID (PostgreSQL)

```sql
-- Row-Level Security asegura aislamiento de tenant
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL
);

-- Habilitar RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Política: tenants solo ven sus propios datos
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

### Middleware Tenant-Aware (Node.js)

```javascript
function tenantMiddleware(req, res, next) {
  const tenantId = req.headers['x-tenant-id'] || req.subdomain;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID requerido' });
  }
  
  // Establecer contexto de tenant para esta request
  req.tenantId = tenantId;
  
  // Aplicar a conexión de base de datos
  db.query("SET app.current_tenant = $1", [tenantId]);
  
  next();
}
```

### Migración Schema-por-Tenant

```python
from sqlalchemy import create_engine, MetaData

def migrate_tenant_schema(tenant_id: str):
    engine = create_engine("postgresql://user:pass@localhost/db")
    with engine.begin() as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS tenant_{}".format(tenant_id))
        # Ejecutar migraciones dentro del schema del tenant
        metadata = MetaData(schema="tenant_{}".format(tenant_id))
        metadata.create_all(conn)
```

## Explicación

**Tres modelos de multi-tenancy**:

| Modelo | Aislamiento | Costo | Complejidad |
|--------|-------------|-------|-------------|
| BD Compartida + Tenant ID | Bajo (requiere RLS) | Más bajo | Baja |
| Schema-por-tenant | Medio | Medio | Media |
| Base de datos por tenant | Alto | Más alto | Alta |

**Estrategias de resolución de tenant**:
- **Subdominio**: tenant1.app.com, tenant2.app.com
- **Path**: app.com/tenant1/, app.com/tenant2/
- **Header**: X-Tenant-ID en requests de API
- **JWT claim**: tenant embebido en token de auth

## Variantes

| Enfoque | Ideal Para | Compromiso |
|---------|------------|------------|
| Todo compartido | SaaS inicial | Más simple; aislamiento más débil |
| Compute compartido, storage aislado | SaaS mid-market | Balance de costo y compliance |
| Totalmente aislado | Enterprise/regulado | Mayor costo; aislamiento más fuerte |
| Cell-based | Escala global | Shards de tenants entre regiones |

## Lo que funciona

- **Nunca confíes en tenant ID del input del usuario**: Siempre resuélvelo desde el [contexto autenticado](/recipes/authentication/jwt-authentication)
- **Indexa tenant_id primero**: Cada query filtra por tenant; hazlo la columna líder
- **Usa [connection pooling](/recipes/performance/connection-pooling) con cuidado**: Schema-por-tenant requiere switching de schema en vivo
- **Backup por tenant**: Schema-por-tenant hace trivial pg_dump por schema
- **Cuotas de recursos**: Limita CPU, storage y [rate de API](/recipes/api/api-rate-limiting-redis) por tenant para prevenir vecinos ruidosos

## Errores Comunes

1. **Filtro de tenant faltante**: Un WHERE tenant_id = $1 olvidado expone todos los datos del cliente
2. **Caching sin scope de tenant**: Las cache keys compartidas filtran datos entre tenants
3. **Jobs en background sin contexto de tenant**: Las tareas programadas deben ejecutarse para cada tenant por separado
4. **Schemas hard-coded**: Mezclar datos de tenant en código de aplicación crea agujeros de seguridad
5. **Logging sin awareness de tenant**: Depurar problemas en producción requiere filtrar logs por tenant

## Preguntas Frecuentes

**P: ¿Puedo migrar de BD compartida a schema-por-tenant más tarde?**
R: Sí, pero requiere una migración mayor. Empieza con columnas tenant_id y RLS incluso si planeas dividir más tarde.

**P: ¿Cómo manejo customizaciones específicas por tenant?**
R: Usa feature flags por tenant, configuración white-label, o UI metadata-driven. Evita branches de código separadas.

**P: ¿El GDPR afecta el diseño de multi-tenancy?**
R: Sí. El derecho al olvido es más simple con schema-por-tenant (drop schema) que con tablas compartidas (borrar filas en muchas tablas).

### Base de Datos por Tenant con Connection Pool (TypeScript)

```typescript
import { Pool, PoolClient } from 'pg';

interface TenantDatabase {
  pool: Pool;
  schema: string;
}

class TenantConnectionManager {
  private pools: Map<string, TenantDatabase> = new Map();

  async getTenantConnection(tenantId: string): Promise<PoolClient> {
    let tenantDb = this.pools.get(tenantId);

    if (!tenantDb) {
      const pool = new Pool({
        host: process.env.DB_HOST,
        port: 5432,
        database: `tenant_${tenantId}`,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: 10,
        idleTimeoutMillis: 30000,
      });
      tenantDb = { pool, schema: 'public' };
      this.pools.set(tenantId, tenantDb);
    }

    const client = await tenantDb.pool.connect();
    await client.query('SET search_path TO public');
    return client;
  }

  async closeTenant(tenantId: string): Promise<void> {
    const tenantDb = this.pools.get(tenantId);
    if (tenantDb) {
      await tenantDb.pool.end();
      this.pools.delete(tenantId);
    }
  }

  async closeAll(): Promise<void> {
    const promises = Array.from(this.pools.values()).map(db => db.pool.end());
    await Promise.all(promises);
    this.pools.clear();
  }
}

// Uso — cada request obtiene una conexión a la base de datos del tenant
async function getOrder(tenantId: string, orderId: string) {
  const manager = new TenantConnectionManager();
  const client = await manager.getTenantConnection(tenantId);
  try {
    const result = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}
```

### Caching Tenant-Aware con Redis (Python)

```python
import redis
import json
from functools import wraps

class TenantCache:
    def __init__(self, redis_url: str = 'redis://localhost:6379'):
        self._redis = redis.from_url(redis_url)

    def _key(self, tenant_id: str, key: str) -> str:
        return f'tenant:{tenant_id}:{key}'

    def get(self, tenant_id: str, key: str):
        raw = self._redis.get(self._key(tenant_id, key))
        if raw:
            return json.loads(raw)
        return None

    def set(self, tenant_id: str, key: str, value, ttl: int = 300):
        self._redis.setex(
            self._key(tenant_id, key),
            ttl,
            json.dumps(value)
        )

    def delete(self, tenant_id: str, key: str):
        self._redis.delete(self._key(tenant_id, key))

    def invalidate_tenant(self, tenant_id: str):
        pattern = f'tenant:{tenant_id}:*'
        keys = self._redis.keys(pattern)
        if keys:
            self._redis.delete(*keys)

# Uso — cache con scope por tenant
cache = TenantCache()

def cached_query(tenant_id: str, cache_key: str, query_fn, ttl: int = 300):
    cached = cache.get(tenant_id, cache_key)
    if cached is not None:
        return cached
    result = query_fn()
    cache.set(tenant_id, cache_key, result, ttl)
    return result
```

### Pipeline de Onboarding de Tenant (TypeScript)

```typescript
class TenantOnboardingService {
  constructor(
    private db: Database,
    private cache: TenantCache,
    private config: TenantConfigService
  ) {}

  async onboard(tenantId: string, plan: string): Promise<void> {
    // 1. Crear schema o base de datos dedicada
    if (plan === 'enterprise') {
      await this.db.query(`CREATE DATABASE tenant_${tenantId}`);
      await this.db.query(`CREATE USER tenant_${tenantId} WITH PASSWORD $1`, [generatePassword()]);
    } else {
      await this.db.query(`CREATE SCHEMA IF NOT EXISTS tenant_${tenantId}`);
    }

    // 2. Ejecutar migraciones
    await this.runMigrations(tenantId);

    // 3. Seed de datos por defecto
    await this.seedDefaults(tenantId);

    // 4. Configurar feature flags
    await this.config.setFlags(tenantId, getDefaultFlags(plan));

    // 5. Establecer cuotas de recursos
    await this.config.setQuotas(tenantId, getQuotas(plan));

    // 6. Calentar cache
    await this.cache.set(tenantId, 'status', 'active', 3600);
  }

  async offboard(tenantId: string): Promise<void> {
    // 1. Marcar tenant como inactivo
    await this.db.query('UPDATE tenants SET status = $1 WHERE id = $2', ['inactive', tenantId]);

    // 2. Exportar datos del tenant (cumplimiento GDPR)
    await this.exportTenantData(tenantId);

    // 3. Eliminar schema o base de datos
    await this.db.query(`DROP SCHEMA IF EXISTS tenant_${tenantId} CASCADE`);

    // 4. Invalidar cache
    await this.cache.invalidate_tenant(tenantId);

    // 5. Remover configuración
    await this.config.removeAll(tenantId);
  }

  private async runMigrations(tenantId: string): Promise<void> {
    const migrations = await this.db.query('SELECT * FROM migrations ORDER BY version');
    for (const migration of migrations.rows) {
      await this.db.query(`SET search_path TO tenant_${tenantId}; ${migration.sql}`);
    }
  }

  private async seedDefaults(tenantId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO tenant_${tenantId}.settings (key, value) VALUES ('timezone', 'UTC'), ('locale', 'en-US')`
    );
  }
}
```

## Mejores Prácticas Adicionales

1. **Usa migraciones de base de datos tenant-aware.** Ejecuta migraciones por schema de tenant, no globalmente. Rastrea qué tenants tienen qué versiones de migración:

```sql
CREATE TABLE tenant_migrations (
  tenant_id UUID NOT NULL,
  migration_version INT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, migration_version)
);
```

2. **Implementa rate limiting específico por tenant.** Previene vecinos ruidosos enforceando cuotas por tenant en el API gateway:

```typescript
class TenantRateLimiter {
  private limits: Map<string, { count: number; resetAt: number }> = new Map();

  check(tenantId: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.limits.get(tenantId);
    if (!entry || now > entry.resetAt) {
      this.limits.set(tenantId, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  }
}
```

3. **Loggea con contexto de tenant.** Incluye tenant_id en cada entrada de log para debugging y audit trails:

```typescript
function tenantLogger(tenantId: string) {
  return {
    info: (msg: string, meta?: object) => console.log(JSON.stringify({ tenantId, level: 'info', msg, ...meta })),
    error: (msg: string, meta?: object) => console.error(JSON.stringify({ tenantId, level: 'error', msg, ...meta })),
  };
}
```

## Errores Comunes Adicionales

1. **Queries cross-tenant en analytics.** Queries de reporting que agregan a través de tenants sin filtrar exponen datos. Usa warehouses de analytics separados por tenant o enforcea filtros de tenant_id en cada query de BI.

2. **Secuencias compartidas y auto-increment.** Usar una primary key `SERIAL` compartida entre tenants en una base de datos compartida crea contención y filtra información de escala del tenant. Usa UUIDs:

```sql
-- Mal: secuencia compartida, contención
CREATE TABLE orders (id SERIAL PRIMARY KEY, tenant_id UUID, ...);

-- Bien: UUID, sin contención, sin fuga de información
CREATE TABLE orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID, ...);
```

3. **Ignorar el lifecycle del tenant en CI/CD.** Los deployments que ejecutan migraciones de schema deben manejar todos los schemas de tenant. Una migración que funciona para un tenant puede fallar para otro con diferente volumen de datos. Testea migraciones contra el tenant más grande primero.

## FAQ Adicional

### ¿Cómo manejo feature flags específicos por tenant?

Almacena feature flags en una tabla de configuración de tenant y evalúalos en runtime. Evita flags en compile-time o variables de entorno ya que diferentes tenants necesitan diferentes conjuntos de features:

```typescript
class FeatureFlagService {
  private flags: Map<string, Set<string>> = new Map();

  async loadFlags(tenantId: string): Promise<void> {
    const result = await this.db.query('SELECT flag_name FROM tenant_flags WHERE tenant_id = $1', [tenantId]);
    this.flags.set(tenantId, new Set(result.rows.map(r => r.flag_name)));
  }

  isEnabled(tenantId: string, flag: string): boolean {
    return this.flags.get(tenantId)?.has(flag) ?? false;
  }
}
```

### ¿Esta solución está lista para producción?

Sí. Row-Level Security con PostgreSQL es usado por plataformas SaaS en producción. El modelo de base de datos por tenant con connection pooling es estándar para tenants enterprise. El pipeline de onboarding de tenant refleja lo que plataformas como Heroku y Render hacen al provisionar nuevas bases de datos de clientes. La capa de caching con claves scoped por tenant previene fugas de datos cross-tenant en Redis.

### ¿Cuáles son las características de rendimiento?

Base de datos compartida con RLS añade un check de filtro por query — overhead despreciable con índices proper en `tenant_id`. Schema-por-tenant requiere `SET search_path` por conexión (sub-milisegundo). Base de datos por tenant usa pools de conexión separados — cada pool consume memoria (10 conexiones x 1000 tenants = 10,000 conexiones). Usa PgBouncer para multiplexar conexiones. Lookups de cache con claves scoped por tenant son O(1) en Redis. Onboarding de tenant con creación de schema toma 50-200ms; creación de base de datos toma 1-5 segundos.

### ¿Cómo depuro problemas con este enfoque?

Loggea tenant_id en cada request, query y operación de cache. Usa `current_setting('app.current_tenant')` de PostgreSQL para verificar el contexto de RLS en sesiones de debug. Para schema-por-tenant, loggea `search_path` antes de cada query. Para base de datos por tenant, loggea qué pool sirvió la request. Testea aislamiento de tenant consultando como tenant A y verificando cero filas del tenant B. Usa `EXPLAIN ANALYZE` para verificar que las políticas de RLS usan el índice de tenant_id.
