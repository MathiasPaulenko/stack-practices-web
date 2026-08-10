---


contentType: recipes
slug: optimistic-locking
title: "Implementar optimistic locking con versionado"
description: "Cómo implementar optimistic locking con versionado para prevenir actualizaciones perdidas en acceso concurrente a base de datos"
metaDescription: "Implementa optimistic locking con versionado para prevenir actualizaciones perdidas. Usa versionado de filas en PostgreSQL, MySQL y JPA/Hibernate con ejemplos."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - concurrency
  - sql
  - postgresql
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/database-views-materialized
  - /recipes/sql-joins
  - /guides/sql-performance-tuning-guide
  - /recipes/deadlock-prevention-sql
  - /recipes/database-migrations-safely
  - /recipes/database-migrations
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Implementa optimistic locking con versionado para prevenir actualizaciones perdidas. Usa versionado de filas en PostgreSQL, MySQL y JPA/Hibernate con ejemplos."
  keywords:
    - optimistic-locking
    - concurrencia
    - versionado
    - base-datos
    - postgresql
    - mysql
    - jpa


---

## Visión General

El optimistic locking previene actualizaciones perdidas en entornos concurrentes verificando si un registro ha sido modificado desde su última lectura. Cada fila lleva un número de versión o timestamp. Al actualizar, la aplicación incluye la versión original en la cláusula `WHERE`; si la versión cambió, la actualización falla y la aplicación reintenta o reporta un conflicto. Esto evita el costo de rendimiento de mantener bloqueos de base de datos durante el tiempo de pensamiento del usuario.

Esta implementacion proporciona optimistic locking con versionado entero en PostgreSQL, MySQL y JPA/Hibernate.

## Cuándo Usar

Usa este recurso cuando:
- Múltiples usuarios o procesos pueden editar el mismo registro concurrentemente. Consulta [Database Transactions](/recipes/database-transactions/) para patrones ACID.
- Quieres evitar bloqueos pesimistas que dañan throughput y pueden causar deadlocks
- Tu aplicación tiene un patrón de lectura-modificación-escritura con gaps entre lectura y escritura
- Necesitas detección de conflictos en [APIs REST](/recipes/call-rest-api/), apps offline-first o sistemas distribuidos

## Solución

### Python

```python
import psycopg2
from psycopg2.extras import RealDictCursor

def update_user_email(conn, user_id: int, new_email: str, expected_version: int):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            UPDATE users
            SET email = %s, version = version + 1
            WHERE id = %s AND version = %s
            RETURNING id, version;
        """, (new_email, user_id, expected_version))

        updated = cur.fetchone()
        if not updated:
            raise ValueError(
                f"Conflicto: el usuario {user_id} fue modificado por otra transacción. "
                "Por favor refresca y reintenta."
            )
        conn.commit()
        return updated

# Uso
try:
    result = update_user_email(conn, user_id=42, new_email="nuevo@example.com", expected_version=3)
    print(f"Actualizado a versión {result['version']}")
except ValueError as e:
    print(e)  # Disparar lógica de reintento en la capa API
```

### JavaScript

```javascript
const { Pool } = require('pg');
const pool = new Pool({ /* config */ });

async function updateProductPrice(productId, newPrice, expectedVersion) {
  const result = await pool.query(
    `UPDATE products
     SET price = $1, version = version + 1, updated_at = NOW()
     WHERE id = $2 AND version = $3
     RETURNING id, version;`,
    [newPrice, productId, expectedVersion]
  );

  if (result.rowCount === 0) {
    const current = await pool.query('SELECT version FROM products WHERE id = $1', [productId]);
    throw new Error(
      `Conflicto de versión: esperada ${expectedVersion}, encontrada ${current.rows[0]?.version}. Por favor reintenta.`
    );
  }

  return result.rows[0];
}

// Ruta Express con reintento
app.put('/products/:id', async (req, res) => {
  try {
    const product = await updateProductPrice(req.params.id, req.body.price, req.body.version);
    res.json(product);
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});
```

### Java

```java
// JPA / Hibernate con @Version
import jakarta.persistence.*;

@Entity
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private BigDecimal price;

    @Version
    private Integer version;  // Auto-incrementado por Hibernate en cada flush

    // Getters y setters...
}

// Capa de servicio
@Service
@Transactional
public class ProductService {
    @Autowired
    private ProductRepository repo;

    public Product updatePrice(Long id, BigDecimal newPrice) {
        Product product = repo.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado"));
        product.setPrice(newPrice);
        return repo.save(product);  // Versión verificada automáticamente en flush
    }
}

// Capturar la excepción de optimistic lock
@ExceptionHandler(OptimisticLockingFailureException.class)
public ResponseEntity<Map<String, String>> handleConflict(OptimisticLockingFailureException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(Map.of("error", "Recurso modificado por otro usuario. Por favor refresca y reintenta."));
}
```

## Explicación

El optimistic locking funciona bajo la premisa de que los conflictos son raros. La base de datos no bloquea la fila durante la lectura. En su lugar, la actualización es condicional:

```sql
UPDATE table SET ... WHERE id = ? AND version = ?
```

Si `rowsAffected == 0`, la versión cambió entre lectura y escritura. La aplicación maneja el conflicto: reintenta con datos frescos, devuelve HTTP 409, o fusiona cambios.

**Compromisos:**
- **Optimista**: sin bloqueos durante lectura; rápido y listo para crecer; requiere lógica de reintento en conflicto
- **Pesimista**: `SELECT FOR UPDATE` bloquea la fila inmediatamente; lógica más simple pero serializa acceso y riesgos de deadlocks

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Versión entera | Columna `version` incrementada en cada actualización | Más común; funciona en todas las bases de datos relacionales |
| Timestamp | Columna `updated_at` comparada al escribir | Propenso a problemas de reloj; usa timestamps de base de datos, no de aplicación |
| Checksum / hash | Hash del contenido de fila almacenado y comparado | Detecta cualquier cambio, incluso si el versionado fue evadido |
| JPA `@Version` | Versionado entero automático | Hibernate maneja incremento y detección de conflictos transparentemente |
| DynamoDB | Escrituras condicionales con `Expected` | Sin versionado nativo; usa attribute_exists o comparaciones de valores |
| MongoDB | `findAndModify` con criterios de consulta | Incluye versión en filtro; reintenta si el documento fue modificado |

## Lo que funciona

1. Siempre devuelve la versión actual al cliente después de cada lectura para que pueda enviarla en la actualización
2. Implementa [reintento con backoff exponencial](/recipes/retry-backoff/) (1–3 intentos) para conflictos transitorios en procesos automatizados
3. Usa `version` entero sobre timestamps; los relojes son poco confiables entre nodos y zonas horarias
4. Mantén las transacciones cortas; el gap entre lectura y escritura es tu ventana de vulnerabilidad
5. Registra conflictos de versión a nivel `INFO` para monitorear hotspots de contención sin alarmar en cada reintento

## Errores Comunes

1. **No exponer la versión a consumidores de API** — los clientes no pueden enviarla si nunca la recibieron
2. **Bucles de reintento infinitos** — siempre limita reintentos y expone conflictos persistentes al usuario
3. **Actualizar la versión en código de aplicación** — deja que la base de datos u ORM la incremente atómicamente
4. **Usar bloqueo pesimista para todo** — mata el throughput; reserva `FOR UPDATE` para verdaderos escenarios de inventario o banca. Consulta [Locks and Mutexes](/recipes/locks-and-mutexes/) para patrones de bloqueo.
5. **Ignorar el conflicto en UI** — los usuarios necesitan retroalimentación clara de que sus datos están obsoletos y deben refrescarse

## Preguntas Frecuentes

### ¿Debo usar bloqueo optimista o pesimista?

Optimista para la mayoría de cargas de lectura intensiva con escrituras infrecuentes. Pesimista cuando la contención es alta y la lógica de reintento es impracticable (ej. reservas de asientos, asignación de inventario).

### ¿Qué status HTTP debo devolver en un conflicto?

`409 Conflict` es el estándar. Incluye el estado actual del recurso en el cuerpo de respuesta para que el cliente pueda fusionar o reintentar sin una segunda petición.

### ¿Cómo manejo optimistic locking en una arquitectura de microservicios?

Usa event sourcing o sagas donde cada servicio posee su agregado. Si se necesita consistencia cross-servicio, prefiere operaciones idempotentes con actualizaciones condicionales en lugar de bloqueos distribuidos. Las transacciones compensatorias (deshacer) suelen ser más seguras que los bloqueos distribuidos. Consulta [Circuit Breaker](/patterns/circuit-breaker-pattern/) para patrones de resiliencia.

### Lógica de Reintento con Exponential Backoff

```python
import random
import time
from functools import wraps

def retry_on_conflict(max_retries=3, base_delay=0.05):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except ValueError as e:
                    if "Conflict" not in str(e):
                        raise
                    if attempt == max_retries - 1:
                        raise
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.05)
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

@retry_on_conflict(max_retries=3)
def update_user_with_retry(conn, user_id, new_email, expected_version):
    return update_user_email(conn, user_id, new_email, expected_version)
```

```javascript
async function withRetry(fn, maxRetries = 3, baseDelay = 50) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!err.message.includes('Version conflict') || attempt === maxRetries - 1) {
        throw err;
      }
      const delay = baseDelay * (2 ** attempt) + Math.random() * 50;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Uso con refresh automático de versión
async function updateProductWithRetry(productId, updateFn) {
  let product = await getProduct(productId);
  for (let attempt = 0; attempt < 3; attempt++) {
    const updated = updateFn(product);
    try {
      return await pool.query(
        'UPDATE products SET price = $1, version = version + 1 WHERE id = $2 AND version = $3 RETURNING *',
        [updated.price, productId, product.version]
      );
    } catch (err) {
      if (attempt === 2) throw err;
      product = await getProduct(productId);
    }
  }
}
```

### Optimistic Locking en MongoDB con `findAndModify`

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGO_URI);

async function updateProductOptimistic(db, productId, newPrice, expectedVersion) {
  const result = await db.collection('products').findOneAndUpdate(
    { _id: productId, version: expectedVersion },
    {
      $set: { price: newPrice },
      $inc: { version: 1 },
    },
    { returnDocument: 'after' }
  );

  if (!result) {
    const current = await db.collection('products').findOne({ _id: productId });
    throw new Error(
      `Conflicto de versión: esperada ${expectedVersion}, encontrada ${current?.version}. Reintenta.`
    );
  }

  return result;
}

// Plugin de Mongoose para versionado automático
const optimisticLockPlugin = (schema) => {
  schema.add({ version: { type: Number, default: 0 } });

  schema.pre('findOneAndUpdate', function () {
    const filter = this.getFilter();
    const update = this.getUpdate();

    if (filter.version !== undefined && update.$inc) {
      update.$inc.version = (update.$inc.version || 0) + 1;
    } else if (filter.version !== undefined) {
      this.setUpdate({ ...update, $inc: { version: 1 } });
    }
  });
};

productSchema.plugin(optimisticLockPlugin);
```

### DynamoDB Conditional Writes

```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('products')

def update_price_optimistic(product_id, new_price, expected_version):
    response = table.put_item(
        Item={
            'product_id': product_id,
            'price': new_price,
            'version': expected_version + 1,
        },
        ConditionExpression='product_id = :pid AND version = :expected',
        ExpressionAttributeValues={
            ':pid': product_id,
            ':expected': expected_version,
        }
    )
    return response

# Manejar fallo de conditional check
from botocore.exceptions import ClientError

try:
    update_price_optimistic('prod-42', 99.99, 3)
except ClientError as e:
    if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
        print("Conflicto de versión: otro proceso modificó este item")
```

### ETag e If-Match para APIs HTTP

```javascript
// Middleware Express para optimistic locking basado en ETag
const crypto = require('crypto');

function generateETag(resource) {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(resource));
  return `"${hash.digest('hex')}"`;
}

app.put('/products/:id', async (req, res) => {
  const ifMatch = req.headers['if-match'];
  if (!ifMatch) {
    return res.status(428).json({ error: 'Header If-Match requerido' });
  }

  const product = await getProduct(req.params.id);
  const currentETag = generateETag(product);

  if (ifMatch !== currentETag) {
    return res.status(412).json({
      error: 'Precondition failed: el recurso fue modificado',
      currentETag,
    });
  }

  const updated = await updateProduct(req.params.id, req.body);
  res.set('ETag', generateETag(updated));
  res.json(updated);
});
```

### Batch Optimistic Locking

```python
def batch_update_with_versions(conn, updates):
    """Actualizar múltiples filas con optimistic locking en una sola transacción."""
    results = []
    with conn.cursor() as cur:
        for item in updates:
            cur.execute("""
                UPDATE products
                SET price = %s, version = version + 1
                WHERE id = %s AND version = %s
                RETURNING id, version;
            """, (item['new_price'], item['id'], item['expected_version']))

            updated = cur.fetchone()
            if not updated:
                conn.rollback()
                raise ValueError(
                    f"Conflicto en producto {item['id']}: "
                    f"versión esperada {item['expected_version']}"
                )
            results.append(updated)
    conn.commit()
    return results

# Uso
try:
    results = batch_update_with_versions(conn, [
        {'id': 1, 'new_price': 19.99, 'expected_version': 5},
        {'id': 2, 'new_price': 29.99, 'expected_version': 3},
        {'id': 3, 'new_price': 39.99, 'expected_version': 7},
    ])
except ValueError as e:
    print(f"Batch falló: {e}")
    # Todos los updates se revirtieron, el cliente debe refrescar y reintentar
```

### Estrategias de Resolución de Conflictos

```python
def merge_update(conn, user_id, client_changes, expected_version):
    """Merge three-way: versión base, versión actual, cambios del cliente."""
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        current = cur.fetchone()
        if not current:
            raise ValueError("Usuario no encontrado")

        if current['version'] == expected_version:
            # Sin conflicto: aplicar directamente
            cur.execute("""
                UPDATE users SET email = %s, name = %s, version = version + 1
                WHERE id = %s AND version = %s
            """, (client_changes['email'], client_changes['name'], user_id, expected_version))
            conn.commit()
            return cur.fetchone()

        # Conflicto: merge campos no superpuestos
        merged = {}
        for field in ['email', 'name']:
            if field in client_changes:
                merged[field] = client_changes[field]
            else:
                merged[field] = current[field]

        cur.execute("""
            UPDATE users SET email = %s, name = %s, version = version + 1
            WHERE id = %s
        """, (merged['email'], merged['name'], user_id))
        conn.commit()
        return cur.fetchone()
```




## Tips de Rendimiento

1. **Indexa la columna version.** La cláusula `WHERE id = ? AND version = ?` necesita un índice en ambas columnas:

```sql
CREATE INDEX idx_products_id_version ON products (id, version);
```

2. **Mantén corto el gap read-modify-write.** Cuanto más largo el gap, más probables los conflictos. Evita llamar APIs externas o hacer cómputo pesado entre read y write.

3. **Usa `RETURNING` para evitar una segunda consulta.** Obtén la versión actualizada en la misma sentencia:

```sql
UPDATE products SET price = $1, version = version + 1
WHERE id = $2 AND version = $3
RETURNING id, version;
```

4. **Monitorea tasas de conflicto con `pg_stat_database`.** Rastrea deadlocks y conflictos a nivel de base de datos:

```sql
SELECT datname, deadlocks, conflicts, temp_files
FROM pg_stat_database
WHERE datname = current_database();
```

5. **Considera `SERIALIZABLE` isolation en lugar de versionado manual.** PostgreSQL `SERIALIZABLE` maneja conflictos automáticamente usando SSI (Serializable Snapshot Isolation). Puede ser más simple que el versionado manual para transacciones complejas.
