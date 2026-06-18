---
contentType: recipes
slug: uuid-generation
title: "Generación de UUID"
description: "Cómo generar identificadores únicos universales (UUIDs) para claves de base de datos, tokens de sesión y nombrado de recursos en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de generación de UUID en Python, JavaScript y Java. Aprende UUID v4, v7, ULID y cuándo usar cada uno."
difficulty: beginner
topics:
  - data
tags:
  - data
  - database
  - guid
  - identifiers
  - java
  - javascript
  - python
  - ulid
  - uuid
relatedResources:
  - /recipes/parse-json
  - /recipes/caching
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de generación de UUID en Python, JavaScript y Java. Aprende UUID v4, v7, ULID y cuándo usar cada uno."
  keywords:
    - generación de uuid
    - guid
    - uuid v4
    - uuid v7
    - ulid
    - identificadores únicos
    - claves primarias de base de datos
    - python uuid
    - javascript uuid
    - java uuid
---

## Visión general

Los UUIDs (Universally Unique Identifiers) son valores de 128 bits diseñados para ser únicos tanto en espacio como en tiempo. Son el estándar para claves primarias de base de datos en sistemas distribuidos, tokens de sesión, nombres de archivos y cualquier escenario donde los enteros auto-incrementales son insuficientes.

Los sistemas modernos prefieren cada vez más UUID v7 o ULID sobre v4 porque son ordenables por tiempo, mejorando el rendimiento de índices de base de datos.

## Cuándo usarlo

Usa esta recipe cuando:

- Generas claves primarias en bases de datos distribuidas
- Creas tokens de sesión o API
- Nombras archivos, imágenes o uploads para prevenir colisiones
- Fusionas datos de múltiples fuentes donde los IDs no deben chocar
- Construyes sistemas donde los clientes generan IDs antes de enviarlos al servidor

## Solución

### Python

```python
import uuid
import ulid

# UUID v4 (random) — más común
id_v4 = uuid.uuid4()
print(id_v4)  # ej., 550e8400-e29b-41d4-a716-446655440000

# UUID v7 (time-ordered) — ordenable, mejor para índices de DB
id_v7 = uuid.uuid7()  # Python 3.13+
print(id_v7)

# ULID (time-ordered, lexicográficamente ordenable)
id_ulid = ulid.new()
print(id_ulid)  # 01ARZ3NDEKTSV4RRFFQ69G5FAV

# Como string para JSON o DB
str_id = str(uuid.uuid4())
```

### JavaScript

```javascript
import { v4, v7 } from 'uuid';
import { ulid } from 'ulid';

// UUID v4 (random)
console.log(v4()); // 550e8400-e29b-41d4-a716-446655440000

// UUID v7 (time-ordered) — requiere uuid@10+
console.log(v7()); // 018f3d7e-8... (empieza con timestamp)

// ULID (time-ordered, lexicográficamente ordenable)
console.log(ulid()); // 01ARZ3NDEKTSV4RRFFQ69G5FAV

// Crypto random UUID (nativo del browser)
console.log(crypto.randomUUID()); // Disponible en Node 19+ y browsers modernos
```

### Java

```java
import java.util.UUID;

// UUID v4 (random)
UUID idV4 = UUID.randomUUID();
System.out.println(idV4); // 550e8400-e29b-41d4-a716-446655440000

// UUID v7 (time-ordered) — usa java-uuid-generator o JDK 23+
// Para JDKs antiguos, usa una librería como java-uuid-generator

// ULID vía librería externa (ej., ulid-java)
// String ulid = Ulid.generate();
```

## Comparación de Versiones de UUID

| Versión | Formato | Ordenable | Caso de uso |
| ------- | ------- | --------- | ----------- |
| **v4** | Random | No | Uso general, más ampliamente soportado |
| **v7** | Time-ordered | Sí | Claves de base de datos, logs de eventos (mejor localidad de índice) |
| **v8** | Custom | Configurable | Extensiones específicas de vendor |
| **ULID** | Time + random | Sí | URL-safe, lexicográficamente ordenable |

## Mejores prácticas

- **Prefiere UUID v7 o ULID para claves de base de datos**: IDs ordenados por tiempo mejoran el rendimiento de índices B-tree
- **Almacena como tipo `UUID` en bases de datos** cuando esté disponible (PostgreSQL, SQL Server) en lugar de strings
- **Usa `BINARY(16)` en MySQL** para ahorrar espacio comparado con `CHAR(36)`
- **Genera IDs client-side** para patrones offline-first o UI optimista
- **No expongas IDs secuenciales** a usuarios por seguridad (usa UUIDs en lugar de auto-increment)
- **Valida el formato UUID** al parsear input externo

## Errores comunes

- Usar UUID v4 como clave primaria de base de datos sin entender la penalización de inserción random
- Almacenar UUIDs como strings en lugar de tipos binarios nativos, desperdiciando espacio y eficiencia de índice
- Usar UUIDs para tablas pequeñas no distribuidas donde enteros auto-incrementales son suficientes
- No indexar apropiadamente columnas UUID en bases de datos
- Generar UUIDs en un hot loop sin cachear la instancia del generador

## Migración de auto-incremento a UUID

Cambiar una tabla existente de enteros auto-incrementales a UUIDs requiere planificación:

### Paso 1: Añadir columna UUID

```sql
-- PostgreSQL
ALTER TABLE users ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX idx_users_uuid ON users(uuid);
```

### Paso 2: Rellenar filas existentes

Ejecuta un script de migración única para generar UUIDs para registros existentes:

```python
import uuid
for user in User.query.filter(User.uuid.is_(None)):
    user.uuid = uuid.uuid7()
    db.session.commit()
```

### Paso 3: Actualizar código de aplicación

Modifica tus modelos ORM y endpoints de API para leer/escribir la columna UUID en lugar del ID entero.

### Paso 4: Actualizar claves foráneas

Si otras tablas referencian `users.id`, añade una columna `user_uuid` a esas tablas y migra las relaciones.

### Paso 5: Deprecar el ID entero

Después de confirmar que todo funciona, marca la columna `id` entera como deprecada. No la elimines inmediatamente — dáte un camino de rollback.

## UUIDs en sistemas distribuidos

En microservicios o arquitecturas orientadas a eventos, los UUIDs destacan porque pueden generarse independientemente por cualquier nodo:

- **Event sourcing**: Cada evento obtiene un UUID, habilitando consumidores idempotentes
- **Apps offline-first**: El cliente genera el UUID antes de sincronizar con el servidor
- **Sharding de base de datos**: No se necesita un allocator central de IDs; cada shard genera sus propias claves
- **CQRS**: Los modelos de lectura y escritura pueden generar IDs sin coordinación

| Enfoque | Pros | Contras |
|---------|------|---------|
| **Auto-incremento** | Simple, compacto, ordenado | Cuello de botella central, difícil de shard |
| **UUID v4** | Descentralizado, estándar | Penalización de inserción random, no ordenable |
| **UUID v7** | Descentralizado, ordenable | Requiere versiones más nuevas de lenguaje/librería |
| **Snowflake IDs** | Ordenable, compacto (64-bit) | Requiere coordinador central |

## Preguntas frecuentes

**P: ¿Debería usar UUID v4 o v7 para proyectos nuevos?**
R: Usa v7 (o ULID) para claves de base de datos. Son ordenados por tiempo, reduciendo la fragmentación de índices. Usa v4 solo para identificadores no ordenables como tokens de sesión.

**P: ¿Son los UUIDs verdaderamente únicos?**
R: La probabilidad de colisión es astronómicamente baja (1 en 2^122 para v4). Para propósitos prácticos, son únicos suficientes para todo excepto la escala más extrema.

**P: ¿Puedo usar UUIDs en URLs?**
R: Sí, pero los ULIDs son más cortos y URL-safe. Si usas v4/v7, encodéalos sin guiones (32 chars) para URLs más cortas.

**P: ¿Los UUIDs afectan el rendimiento de la base de datos?**
R: UUID v4 causa inserciones random en B-tree, lo que perjudica el rendimiento de escritura en tablas grandes. UUID v7 y ULID son ordenados por tiempo, dando rendimiento similar a los enteros auto-incrementales.

**P: ¿Puedo combinar UUIDs con IDs auto-incrementales?**
R: Sí. Usa un entero auto-incremental como clave primaria interna (para clustering/rendimiento) y un UUID como identificador externo (para APIs y URLs). Esto te da lo mejor de ambos mundos.
