---
contentType: guides
slug: data-migration-guide
title: "Migración de Datos: Estrategias Zero-Downtime que Funcionan"
description: "Guía práctica sobre migración de datos: planificación, patrones de doble escritura, estrategias de backfill, evolución de esquemas, validación y procedimientos de rollback para mover datos sin interrupción de servicio."
metaDescription: "Aprende migración de datos: patrones de doble escritura, backfill, evolución de esquemas, validación y rollback para mover datos sin interrupción de servicio."
difficulty: advanced
topics:
  - databases
  - data
  - devops
tags:
  - data-migration
  - zero-downtime
  - schema-evolution
  - backfill
  - database
  - guide
relatedResources:
  - /guides/data/database-sharding-implementation-guide
  - /guides/data/etl-pipeline-guide
  - /guides/blue-green-deployment-guide
  - /guides/planning/disaster-recovery-guide
  - /guides/testing/testing-strategy-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende migración de datos: patrones de doble escritura, backfill, evolución de esquemas, validación y rollback para mover datos sin interrupción de servicio."
  keywords:
    - data-migration
    - zero-downtime
    - schema-evolution
    - backfill
    - database
    - guide
---

## Descripción General

La migración de datos es el proceso de mover datos de un sistema, esquema o formato a otro. A diferencia de despliegues de código, las migraciones de datos son irreversibles: una vez que los datos se transforman o mueven, revertir requiere otra migración. Migraciones mal ejecutadas causan pérdida de datos, corrupción o downtime extendido.

A continuación: patrones probados para migrar datos de forma segura, incluyendo escrituras duales, backfills, evolución de esquemas y estrategias de validación.

## Cuándo Usar

- Te estás moviendo de una base de datos a otra (MySQL → PostgreSQL, on-prem → cloud)
- Estás reestructurando tablas o normalizando/desnormalizando datos
- Estás introduciendo un nuevo almacén de datos (agregando Elasticsearch, Redis o un data warehouse)
- Estás haciendo shard a una base de datos existente
- Estás migrando de un sistema legado a una plataforma moderna
- Necesitas dividir o fusionar servicios con sus propios datastores

## Conceptos Clave

| Concepto | Descripción |
|---------|-------------|
| **Doble Escritura** | Escribir a ambos sistemas viejo y nuevo simultáneamente |
| **Backfill** | Poblar un nuevo almacén de datos con datos históricos |
| **Lectura Sombra** | Leer del nuevo sistema y comparar con el viejo |
| **Cutover** | Cambiar lecturas y escrituras del viejo al nuevo sistema |
| **Ventana de Rollback** | El tiempo durante el cual puedes revertir sin pérdida de datos |
| **Idempotencia** | Ejecutar la misma migración dos veces produce el mismo resultado |

## Estrategias de Migración

Elige el enfoque correcto basado en tolerancia al riesgo y restricciones del sistema:

| Estrategia | Downtime | Riesgo | Mejor Para |
|------------|----------|--------|------------|
| **Doble escritura + backfill** | Ninguno | Bajo | Nuevo datastore, cambios de esquema |
| **Expandir-contraer (columna)** | Ninguno | Bajo | Agregar/eliminar columnas |
| **Snapshot + CDC** | Breve | Medio | Migraciones de motor de base de datos |
| **Blue/green con migración** | Breve | Medio | Reestructuras mayores de esquema |
| **Stop-the-world** | Horas | Alto | Bases de datos pequeñas, ventanas de mantenimiento |
| **Strangler fig** | Ninguno | Bajo | Migración gradual de sistema legado |

## Implementación Zero-Downtime Paso a Paso

### 1. Planifica la Migración

Documenta cada paso antes de tocar datos de producción:

```markdown
## Plan de Migración: Normalización de Tabla de Usuarios

**Objetivo:** Dividir tabla `users` en `users` + `user_profiles`
**Cronograma:** 3 semanas
**Ventana de rollback:** 48 horas después del cutover

### Fase 1: Cambios de Esquema (Semana 1)
- [ ] Agregar tabla `user_profiles`
- [ ] Agregar foreign key `users.profile_id`
- [ ] Desplegar código de aplicación que escribe doblemente a ambas tablas
- [ ] Verificar que las escrituras están funcionando en ambas tablas

### Fase 2: Backfill (Semana 1-2)
- [ ] Ejecutar script de backfill en lotes (1000 filas/lote)
- [ ] Monitorear progreso del script y tasa de error
- [ ] Verificar completitud del backfill con conteos y checksums

### Fase 3: Lecturas Sombra (Semana 2)
- [ ] Habilitar lectura de `user_profiles` en paralelo
- [ ] Comparar resultados: viejo vs nuevo (registrar discrepancias)
- [ ] Corregir discrepancias de datos

### Fase 4: Cutover (Semana 3)
- [ ] Cambiar lecturas a `user_profiles`
- [ ] Monitorear tasas de error por 24 horas
- [ ] Remover código de doble escritura
- [ ] Eliminar columnas viejas (después de ventana de rollback)

### Lista de Validación
- [ ] Conteo de filas coincide: `SELECT COUNT(*) FROM users` == `SELECT COUNT(*) FROM user_profiles`
- [ ] Comparación de muestra de datos: 100 usuarios aleatorios comparados campo por campo
- [ ] Tests de integración de aplicación pasan
- [ ] Tests de rendimiento pasan (nuevas consultas son suficientemente rápidas)

### Plan de Rollback
- [ ] Si problemas dentro de 48h: revertir ruta de lectura a esquema viejo
- [ ] Si problemas después de 48h: escribir migración de corrección (rollback no posible)
```

### 2. Implementa Doble Escritura

Escribe a ambos sistemas viejo y nuevo durante la transición:

```python
# Ejemplo: Doble escritura durante migración
class UserRepository:
    def __init__(self, old_db, new_db):
        self.old_db = old_db
        self.new_db = new_db
    
    def create_user(self, user_data):
        # Escribir en sistema viejo (fuente de verdad durante migración)
        user_id = self.old_db.users.insert(user_data)
        
        # Escribir en sistema nuevo (best effort, loguear fallos)
        try:
            self.new_db.user_profiles.insert({
                'user_id': user_id,
                'display_name': user_data['name'],
                'bio': user_data.get('bio', ''),
                'created_at': user_data['created_at']
            })
        except Exception as e:
            logger.error("Doble escritura falló", extra={
                'user_id': user_id,
                'error': str(e)
            })
            # NO fallar la petición — el sistema viejo aún es fuente de verdad
        
        return user_id
    
    def get_user(self, user_id):
        # Durante fase de lectura sombra: leer del nuevo, fallback al viejo
        try:
            profile = self.new_db.user_profiles.find_by_user_id(user_id)
            if profile:
                return self._convert_profile_to_user(profile)
        except Exception:
            pass
        
        return self.old_db.users.find_by_id(user_id)
```

```python
# Ejemplo: Script de backfill con lotes y resumibilidad
import time

class BackfillUsers:
    def __init__(self, old_db, new_db):
        self.old_db = old_db
        self.new_db = new_db
        self.batch_size = 1000
        self.checkpoint_table = 'migration_checkpoints'
    
    def run(self):
        last_id = self._get_checkpoint()
        
        while True:
            batch = self.old_db.users.find_after_id(last_id, limit=self.batch_size)
            if not batch:
                break
            
            for user in batch:
                self._migrate_user(user)
            
            last_id = batch[-1]['id']
            self._save_checkpoint(last_id)
            
            # Throttle para evitar abrumar la base de datos
            time.sleep(0.1)
    
    def _migrate_user(self, user):
        """Migración de usuario idempotente."""
        # Upsert asegura idempotencia
        self.new_db.user_profiles.upsert(
            {'user_id': user['id']},
            {
                'display_name': user['name'],
                'bio': user.get('bio', ''),
                'created_at': user['created_at']
            }
        )
    
    def _get_checkpoint(self):
        row = self.old_db.execute(
            f"SELECT last_id FROM {self.checkpoint_table} WHERE migration = 'users_to_profiles'"
        )
        return row['last_id'] if row else 0
    
    def _save_checkpoint(self, last_id):
        self.old_db.execute(f"""
            INSERT INTO {self.checkpoint_table} (migration, last_id)
            VALUES ('users_to_profiles', %s)
            ON CONFLICT (migration) DO UPDATE SET last_id = EXCLUDED.last_id
        """, (last_id,))
```

### 3. Valida Integridad de Datos

Nunca asumas que una migración tuvo éxito. Verifica todo:

```python
# Ejemplo: Validación después de backfill
class MigrationValidator:
    def __init__(self, old_db, new_db):
        self.old_db = old_db
        self.new_db = new_db
    
    def validate_counts(self):
        """Verificar que conteos de filas coincidan."""
        old_count = self.old_db.execute("SELECT COUNT(*) as c FROM users")['c']
        new_count = self.new_db.execute("SELECT COUNT(*) as c FROM user_profiles")['c']
        
        assert old_count == new_count, f"Conteo no coincide: {old_count} != {new_count}"
        print(f"Conteos de filas coinciden: {old_count}")
    
    def validate_sample(self, sample_size=1000):
        """Comparar muestras aleatorias campo por campo."""
        users = self.old_db.execute(f"""
            SELECT * FROM users 
            ORDER BY RANDOM() 
            LIMIT {sample_size}
        """)
        
        mismatches = 0
        for user in users:
            profile = self.new_db.user_profiles.find_by_user_id(user['id'])
            
            if not profile:
                print(f"Falta perfil para usuario {user['id']}")
                mismatches += 1
                continue
            
            # Comparación campo por campo
            if user['name'] != profile['display_name']:
                print(f"Nombre no coincide: usuario={user['id']}")
                mismatches += 1
        
        assert mismatches == 0, f"Encontrados {mismatches} no coincidencias en muestra"
        print(f"Validación de muestra pasó ({sample_size} filas)")
    
    def validate_checksums(self):
        """Comparar checksums agregados."""
        old_checksum = self.old_db.execute("""
            SELECT MD5(string_agg(name || bio, ',' ORDER BY id)) as checksum
            FROM users
        """)
        
        new_checksum = self.new_db.execute("""
            SELECT MD5(string_agg(display_name || bio, ',' ORDER BY user_id)) as checksum
            FROM user_profiles
        """)
        
        assert old_checksum == new_checksum, "Checksum no coincide!"
        print("Validación de checksum pasó")
```

### 4. Ejecuta el Cutover

Cambia tráfico del sistema viejo al nuevo:

```markdown
## Checklist de Cutover

### Antes del Cutover
- [ ] Backfill 100% completo
- [ ] Validación pasó (conteos, muestras, checksums)
- [ ] Lecturas sombra muestran <0.1% tasa de no coincidencia
- [ ] Rendimiento del sistema nuevo es aceptable bajo carga
- [ ] Procedimiento de rollback está documentado y probado
- [ ] Equipo está en standby durante ventana de cutover

### Durante el Cutover
1. **Pausar escrituras no críticas** (opcional, reduce riesgo)
2. **Habilitar feature flag** para enrutar lecturas a nuevo sistema
3. **Monitorear tasas de error por 15 minutos**
4. **Si errores aumentan:** deshabilitar feature flag (rollback instantáneo)
5. **Si estable:** proceder a cutover de escrituras
6. **Habilitar escrituras al sistema nuevo**
7. **Monitorear por 1 hora**

### Después del Cutover
- [ ] Tasas de error dentro de rango normal por 24 horas
- [ ] Sistema nuevo manejando 100% del tráfico
- [ ] Sistema viejo aún recibiendo doble escritura (por seguridad)
- [ ] Ventana de rollback iniciada (48 horas)
```

```python
# Ejemplo: Cutover basado en feature flag
class UserService:
    def __init__(self, config):
        self.use_new_schema = config.get('use_new_user_schema', False)
    
    def get_user(self, user_id):
        if self.use_new_schema:
            return self._get_from_new_schema(user_id)
        return self._get_from_old_schema(user_id)
    
    def create_user(self, user_data):
        # Siempre doble escribir durante migración
        old_id = self._create_in_old(user_data)
        self._create_in_new(user_data, old_id)
        return old_id
```

## Patrones de Evolución de Esquema

Evoluciona esquemas sin romper código existente:

### 1. Expandir-Contraer para Columnas

```sql
-- Paso 1: Agregar nueva columna (nullable)
ALTER TABLE users ADD COLUMN email_normalized VARCHAR(255);

-- Paso 2: Backfill nueva columna
UPDATE users SET email_normalized = LOWER(email) WHERE email_normalized IS NULL;

-- Paso 3: Desplegar código que escribe a ambas columnas
-- Código de aplicación: set email_normalized en cada insert/update

-- Paso 4: Hacer nueva columna no nullable, agregar constraint
ALTER TABLE users ALTER COLUMN email_normalized SET NOT NULL;

-- Paso 5: Desplegar código que lee de nueva columna

-- Paso 6: Eliminar columna vieja (después de ventana de rollback)
ALTER TABLE users DROP COLUMN email;
```

### 2. División de Tablas

```sql
-- Paso 1: Crear nueva tabla
CREATE TABLE user_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    bio TEXT,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Paso 2: Trigger de doble escritura
CREATE OR REPLACE FUNCTION sync_user_profile() RETURNS trigger AS $$
BEGIN
    INSERT INTO user_profiles (user_id, bio, preferences, created_at)
    VALUES (NEW.id, NEW.bio, NEW.preferences, NEW.created_at)
    ON CONFLICT (user_id) DO UPDATE SET
        bio = EXCLUDED.bio,
        preferences = EXCLUDED.preferences;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_profile_sync
    AFTER INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION sync_user_profile();

-- Paso 3: Backfill
INSERT INTO user_profiles (user_id, bio, preferences, created_at)
SELECT id, bio, preferences, created_at FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Paso 4: Cambiar lecturas a user_profiles
-- Paso 5: Eliminar columnas de users (después de ventana de rollback)
```

## Lo que funciona

- Siempre prueba migraciones en una copia de datos de producción. Los datos de staging raramente coinciden con volumen o casos edge de producción.
- Haz migraciones idempotentes. Si un script falla en la fila 500,000, reiniciarlo no debería crear duplicados.
- Throttle backfills. Correr a máxima velocidad priva a las consultas de producción. Usa rate limiting.
- Valida con más que conteos de filas. Compara checksums, muestra filas aleatorias, ejecuta tests de integración.
- Nunca elimines datos viejos inmediatamente. Mantén la ventana de rollback abierta (24-72 horas mínimo).
- Monitorea durante todo el proceso. Configura dashboards específicamente para la migración.
- Comunica ampliamente. Las migraciones de datos afectan a cada equipo que toca la base de datos.

## Errores Comunes

- Sin plan de rollback. Una vez que eliminas columnas viejas, revertir requiere otra migración compleja.
- Ejecutar migraciones en horas pico. Programa backfills durante ventanas de bajo tráfico.
- Olvidar foreign keys. Migrar una tabla padre sin actualizar referencias de tabla hija rompe constraints.
- Sin validación. Asumir que la migración funcionó porque terminó sin errores.
- Eliminar datos demasiado pronto. El patrón "expandir-contraer" existe porque los rollbacks son necesarios.
- Subestimar duración. Una migración que toma 2 horas en staging puede tomar 20 en producción.

## Variantes

- **Herramientas de cambio de esquema online:** `pt-online-schema-change` (Percona), `gh-ost` (GitHub) para MySQL; `pg_repack` para PostgreSQL
- **Migración basada en CDC:** Debezium captura cambios y los transmite al sistema nuevo en tiempo real
- **Dump y restore:** `pg_dump`/`pg_restore` para bases de datos más pequeñas con ventanas de mantenimiento
- **Servicios de migración cloud:** AWS DMS, Azure Database Migration Service, Google Database Migration Service

## FAQ

**P: ¿Cuánto tiempo debería mantener el esquema viejo después del cutover?**
Al menos 48 horas para migraciones de bajo riesgo, hasta 2 semanas para cambios de alto riesgo. Cuanto más larga la ventana, más seguro estás.

**P: ¿Qué pasa si mi migración falla a mitad de camino?**
Si la migración es idempotente, reiníciala. Si no, restaura desde backup y reintenta. Es por eso que checkpoints y lotes son críticos.

**P: ¿Cómo migro sin soporte de doble escritura?**
Usa Change Data Capture (Debezium) o sincronización de snapshot + incremental. Requieren más infraestructura pero funcionan sin cambios en aplicación.

**P: ¿Puedo migrar una base de datos mientras está bajo carga pesada?**
Sí, pero throttle el backfill. Usa `pg_sleep` entre lotes, corre durante horas de bajo tráfico, y monitorea el lag de replicación.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.

## Conclusión

La migración de datos no es un evento sino un proceso: planificar, doble escribir, backfill, validar, lectura sombra, cutover y limpieza. Al seguir patrones estructurados y nunca saltarse la validación, mueves datos de forma segura manteniendo los sistemas online.

