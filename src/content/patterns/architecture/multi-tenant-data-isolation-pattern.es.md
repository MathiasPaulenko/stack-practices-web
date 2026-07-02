---
contentType: patterns
slug: multi-tenant-data-isolation-pattern
title: "Patrón Multi-Tenant Data Isolation"
description: "Aisla datos de tenants en infraestructura compartida usando row-level security, schema-per-tenant o database-per-tenant. Un patrón para aplicaciones SaaS."
metaDescription: "Aprende el patrón Multi-Tenant Data Isolation en Python, Java y JavaScript. Compara row-level, schema-per-tenant y database-per-tenant."
difficulty: advanced
topics:
  - architecture
  - databases
  - security
tags:
  - multi-tenant
  - data-isolation
  - pattern
  - design-pattern
  - saas
  - row-level-security
  - tenant
  - python
  - javascript
  - java
relatedResources:
  - /patterns/authentication/federated-identity-pattern
  - /patterns/authentication/voucher-pattern
  - /patterns/design/sidecar-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Aprende el patrón Multi-Tenant Data Isolation en Python, Java y JavaScript. Compara row-level, schema-per-tenant y database-per-tenant."
  keywords:
    - multi-tenant data isolation
    - design pattern
    - saas pattern
    - row level security
    - tenant isolation
    - python multi-tenant
    - java multi-tenant
    - javascript multi-tenant
---

# Patrón Multi-Tenant Data Isolation

## Visión General

El patrón [Multi-Tenant Data Isolation](/patterns/architecture/multi-tenant-data-isolation-pattern) asegura que cada tenant en una aplicación SaaS solo pueda acceder a sus propios datos. Existen tres estrategias principales: **database-per-tenant** (aislamiento más fuerte), **schema-per-tenant** (buen aislamiento, base de datos compartida), y **row-level security** (schema compartido, columna tenant + RLS). Cada estrategia balancea fuerza de aislamiento contra costo operativo y complejidad.

## Cuándo Usar

Usar el patrón Multi-Tenant Data Isolation cuando:
- Estás construyendo una aplicación SaaS que sirve a múltiples organizaciones
- Los tenants nunca deben ver los datos de otros
- Necesitas balancear aislamiento, costo y complejidad operativa
- Requisitos de compliance (GDPR, HIPAA, SOC2) exigen aislamiento de datos
- Necesitas capacidades de backup, migración o deletion per-tenant

## Solución

### Estrategia 1: Row-Level Security (Schema Compartido)

```python
from sqlalchemy import create_engine, Column, String, Integer, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from contextlib import contextmanager

Base = declarative_base()

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(String)

engine = create_engine("postgresql://user:pass@localhost/saas_db")

# Habilitar RLS a nivel base de datos
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE documents ENABLE ROW LEVEL SECURITY"))
    conn.execute(text("""
        CREATE POLICY tenant_isolation ON documents
        USING (tenant_id = current_setting('app.tenant_id')::int)
    """))
    conn.commit()

@contextmanager
def tenant_session(tenant_id: int):
    session = Session(engine)
    try:
        session.execute(text(f"SET app.tenant_id = {tenant_id}"))
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# Uso — tenant 1 solo puede ver sus documentos
with tenant_session(tenant_id=1) as session:
    docs = session.query(Document).all()  # RLS filtra automáticamente
    print(f"Tenant 1 has {len(docs)} documents")

# Tenant 2 obtiene un conjunto diferente
with tenant_session(tenant_id=2) as session:
    docs = session.query(Document).all()
    print(f"Tenant 2 has {len(docs)} documents")
```

### Estrategia 2: Schema-Per-Tenant

```python
from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.orm import declarative_base, sessionmaker
import schema_manager

Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(String)

engine = create_engine("postgresql://user:pass@localhost/saas_db")

def provision_tenant(tenant_name: str):
    schema = f"tenant_{tenant_name.lower().replace('-', '_')}"
    with engine.connect() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
        conn.execute(text(f"SET search_path TO {schema}"))
        Base.metadata.create_all(engine)
        conn.commit()

def get_tenant_engine(tenant_name: str):
    schema = f"tenant_{tenant_name.lower().replace('-', '_')}"
    return create_engine(
        f"postgresql://user:pass@localhost/saas_db",
        connect_args={"options": f"-csearch_path={schema}"},
    )

# Uso — cada tenant obtiene schema aislado
provision_tenant("acme")
provision_tenant("globex")

acme_engine = get_tenant_engine("acme")
AcmeSession = sessionmaker(bind=acme_engine)
session = AcmeSession()
docs = session.query(Document).all()
```

### Estrategia 3: Database-Per-Tenant

```javascript
const { Pool } = require("pg");

const tenantPools = new Map();

function getTenantPool(tenantId) {
    if (!tenantPools.has(tenantId)) {
        const pool = new Pool({
            host: "localhost",
            port: 5432,
            user: "saas_app",
            password: process.env.DB_PASSWORD,
            database: `tenant_${tenantId}`,
            max: 10,
        });
        tenantPools.set(tenantId, pool);
    }
    return tenantPools.get(tenantId);
}

async function getDocuments(tenantId) {
    const pool = getTenantPool(tenantId);
    const result = await pool.query(
        "SELECT id, title, content FROM documents ORDER BY id"
    );
    return result.rows;
}

async function createDocument(tenantId, title, content) {
    const pool = getTenantPool(tenantId);
    const result = await pool.query(
        "INSERT INTO documents (title, content) VALUES ($1, $2) RETURNING id",
        [title, content]
    );
    return result.rows[0];
}

// Uso
async function main() {
    const acmeDocs = await getDocuments("acme");
    console.log("Acme docs:", acmeDocs.length);

    const doc = await createDocument("globex", "Q3 Report", "Confidential");
    console.log("Created doc:", doc.id);
}

main();
```

### Middleware de Resolución de Tenant (Java)

```java
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class TenantInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
            HttpServletResponse response, Object handler) {
        String tenantId = request.getHeader("X-Tenant-ID");
        if (tenantId == null || tenantId.isBlank()) {
            response.setStatus(401);
            return false;
        }
        TenantContext.setTenantId(tenantId);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
            HttpServletResponse response, Object handler, Exception ex) {
        TenantContext.clear();
    }
}

// ThreadLocal tenant context
public class TenantContext {
    private static final ThreadLocal<String> CONTEXT = new ThreadLocal<>();

    public static void setTenantId(String tenantId) {
        CONTEXT.set(tenantId);
    }

    public static String getTenantId() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}

// Repository con filtro automático de tenant
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;

@Repository
public class DocumentRepository {

    private final JdbcTemplate jdbc;

    public DocumentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findAll() {
        String tenant = TenantContext.getTenantId();
        return jdbc.queryForList(
            "SELECT id, title, content FROM tenant_" + tenant + ".documents"
        );
    }
}
```

## Explicación

Tres estrategias balancean aislamiento contra costo:

- **Row-Level Security (RLS)**: Todos los tenants comparten un schema. Una columna `tenant_id` en cada tabla. Las políticas RLS de PostgreSQL filtran queries automáticamente. La más barata, más escalable, pero aislamiento más débil — un bug en la política RLS filtra datos.
- **Schema-Per-Tenant**: Cada tenant obtiene un schema dedicado en una base de datos compartida. Buen aislamiento a nivel schema. Necesita migraciones per-tenant. Costo moderado.
- **Database-Per-Tenant**: Cada tenant obtiene una base de datos dedicada. Aislamiento más fuerte. Backup, migración y deletion per-tenant son triviales. Mayor costo y overhead operativo.

Conceptos clave:

- **Tenant Context**: Una variable thread-local o request-scoped que contiene el tenant ID actual. La setea el middleware desde JWT, API key o header.
- **Tenant Resolution**: Extraer el tenant ID de la petición (JWT claim, subdomain, header). Validar que el tenant existe y el usuario pertenece a él.
- **Cross-Tenant Queries**: Operaciones de admin que abarcan tenants. Deben bypass RLS o queryar todos los schemas/bases de datos explícitamente.
- **Per-Tenant Migrations**: Schema-per-tenant y database-per-tenant requieren correr migraciones para cada tenant. Automatizar con un migration runner.

## Variantes

| Estrategia | Aislamiento | Costo | Migración | Backup | Usar Cuando |
|----------|-----------|------|-----------|--------|----------|
| **Row-Level Security** | Débil (bug policy = leak) | Bajo | Única | Compartido | Muchos tenants pequeños, costo sensible |
| **Schema-Per-Tenant** | Medio (boundary schema) | Medio | Per-tenant | Per-schema | Tenants medianos, aislamiento moderado |
| **Database-Per-Tenant** | Fuerte (boundary DB completo) | Alto | Per-tenant | Per-DB | Tenants grandes, compliance, enterprise |

## Pautas

- **Usar RLS para eficiencia de costo** — miles de tenants en una base de datos, overhead minimal
- **Usar schema-per-tenant para SaaS mid-size** — buen balance de aislamiento y costo
- **Usar database-per-tenant para enterprise** — aislamiento más fuerte, SLA per-tenant
- **Siempre setear tenant context en middleware** — nunca depender de código de aplicación para filtrar
- **Validar membresía de tenant** — chequear que el usuario pertenece al tenant en cada petición
- **Indexar la columna tenant_id** — RLS filtra por tenant_id en cada query
- **Automatizar migraciones per-tenant** — escribir un migration runner que itere sobre todos los tenants
- **Proveer APIs de provisioning/deletion de tenant** — automatizar onboarding y offboarding
- **Monitorear queries cross-tenant** — queries de admin que bypass aislamiento deben ser auditados

## Errores Comunes

- Olvidar setear tenant context en un background job — el job corre sin aislamiento
- Depender de filtrado a nivel aplicación en lugar de RLS — un `WHERE tenant_id = ?` omitido filtra datos
- No indexar tenant_id — cada query hace un full table scan filtrado por RLS
- Correr una sola migración en lugar de migraciones per-tenant — algunos tenants tienen schemas stale
- No testear aislamiento — escribir integration tests que verifiquen que tenant A no puede leer datos de tenant B
- Compartir connection pools across tenants en database-per-tenant — connection leaks al DB equivocado
- No limpiar datos de tenant al offboardear — datos de tenants eliminados persisten en tablas compartidas
- Usar tenant_id en URLs sin validación — tenant ID spoofing permite acceso cross-tenant

## Preguntas Frecuentes

**P: ¿Qué estrategia debo elegir?**
R: Comenzar con row-level security si tienes muchos tenants pequeños y el costo es una preocupación. Usar schema-per-tenant para SaaS mid-size con necesidades de aislamiento moderado. Usar database-per-tenant para clientes enterprise con requisitos de compliance estrictos o SLAs per-tenant.

**P: ¿Cómo manejo migraciones per-tenant?**
R: Escribir un migration runner que itere sobre todos los tenants. Para schema-per-tenant, correr la migración en cada schema. Para database-per-tenant, conectarse a cada base de datos y correr la migración. Trackear versiones de migración per-tenant para manejar fallos gracefully.

**P: ¿Puedo mezclar estrategias?**
R: Sí. Comenzar con RLS para tenants pequeños en una base de datos compartida. Promover tenants grandes a su propia base de datos cuando superen la instancia compartida. Rutear peticiones basado en configuración de tenant. Esto se llama el enfoque híbrido o tiered.
