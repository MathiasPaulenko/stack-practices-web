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
relatedResources:
  - /docs/adr-template
  - /docs/database-schema-documentation-template
  - /docs/engineering-handbook-template
  - /guides/rest-api-design-guide
  - /guides/domain-driven-design-guide
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
- Debes cumplir requisitos de compliance (SOC 2, HIPAA) que exigen segregación de datos. Consulta [Checklist de Seguridad de APIs](/guides/security/api-security-checklist-guide) para mejores prácticas de compliance.
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

## Mejores Prácticas

- **Nunca confíes en tenant ID del input del usuario**: Siempre resuélvelo desde el [contexto autenticado](/recipes/authentication/jwt-authentication)
- **Indexa tenant_id primero**: Cada query filtra por tenant; hazlo la columna líder
- **Usa [connection pooling](/recipes/performance/connection-pooling) con cuidado**: Schema-por-tenant requiere switching de schema dinámico
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
R: Sí, pero requiere una migración significativa. Empieza con columnas tenant_id y RLS incluso si planeas dividir más tarde.

**P: ¿Cómo manejo customizaciones específicas por tenant?**
R: Usa feature flags por tenant, configuración white-label, o UI metadata-driven. Evita branches de código separadas.

**P: ¿El GDPR afecta el diseño de multi-tenancy?**
R: Sí. El derecho al olvido es más simple con schema-por-tenant (drop schema) que con tablas compartidas (borrar filas en muchas tablas).
