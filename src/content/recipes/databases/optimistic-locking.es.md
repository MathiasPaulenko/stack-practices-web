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
  - optimistic-locking
  - concurrency
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/database-views-materialized
  - /recipes/sql-joins
  - /guides/sql-performance-tuning-guide
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

Esta receta implementa optimistic locking con versionado entero en PostgreSQL, MySQL y JPA/Hibernate.

## Cuándo Usar

Usa este recurso cuando:
- Múltiples usuarios o procesos pueden editar el mismo registro concurrentemente
- Quieres evitar bloqueos pesimistas que dañan throughput y pueden causar deadlocks
- Tu aplicación tiene un patrón de lectura-modificación-escritura con gaps entre lectura y escritura
- Necesitas detección de conflictos en APIs REST, apps offline-first o sistemas distribuidos

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
- **Optimista**: sin bloqueos durante lectura; rápido y escalable; requiere lógica de reintento en conflicto
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

## Mejores Prácticas

1. Siempre devuelve la versión actual al cliente después de cada lectura para que pueda enviarla en la actualización
2. Implementa reintento con backoff exponencial (1–3 intentos) para conflictos transitorios en procesos automatizados
3. Usa `version` entero sobre timestamps; los relojes son poco confiables entre nodos y zonas horarias
4. Mantén las transacciones cortas; el gap entre lectura y escritura es tu ventana de vulnerabilidad
5. Registra conflictos de versión a nivel `INFO` para monitorear hotspots de contención sin alarmar en cada reintento

## Errores Comunes

1. **No exponer la versión a consumidores de API** — los clientes no pueden enviarla si nunca la recibieron
2. **Bucles de reintento infinitos** — siempre limita reintentos y expone conflictos persistentes al usuario
3. **Actualizar la versión en código de aplicación** — deja que la base de datos u ORM la incremente atómicamente
4. **Usar bloqueo pesimista para todo** — mata el throughput; reserva `FOR UPDATE` para verdaderos escenarios de inventario o banca
5. **Ignorar el conflicto en UI** — los usuarios necesitan retroalimentación clara de que sus datos están obsoletos y deben refrescarse

## Preguntas Frecuentes

### ¿Debo usar bloqueo optimista o pesimista?

Optimista para la mayoría de cargas de lectura intensiva con escrituras infrecuentes. Pesimista cuando la contención es alta y la lógica de reintento es impracticable (ej. reservas de asientos, asignación de inventario).

### ¿Qué status HTTP debo devolver en un conflicto?

`409 Conflict` es el estándar. Incluye el estado actual del recurso en el cuerpo de respuesta para que el cliente pueda fusionar o reintentar sin una segunda petición.

### ¿Cómo manejo optimistic locking en una arquitectura de microservicios?

Usa event sourcing o sagas donde cada servicio posee su agregado. Si se necesita consistencia cross-servicio, prefiere operaciones idempotentes con actualizaciones condicionales en lugar de bloqueos distribuidos. Las transacciones compensatorias (deshacer) suelen ser más seguras que los bloqueos distribuidos.
