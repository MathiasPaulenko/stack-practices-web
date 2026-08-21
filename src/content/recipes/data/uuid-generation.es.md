---
contentType: recipes
slug: uuid-generation
title: "Generación de UUID en Python, JavaScript y Java"
description: "Generá identificadores únicos universales (UUIDs) para claves de base de datos, tokens de sesión y nombrado de recursos en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de generación de UUID en Python, JavaScript y Java. Aprendé UUID v4, v7, ULID y cuándo usar cada uno."
difficulty: beginner
topics:
  - data
  - databases
tags:
  - data
  - database
  - uuid
  - guid
  - primary-keys
  - distributed-systems
  - python
  - javascript
  - java
relatedResources:
  - /recipes/database-connection-pooling
  - /recipes/parse-json
  - /recipes/data-validation
  - /recipes/caching
  - /recipes/merge-json-files
  - /patterns/singleton-pattern
lastUpdated: "2026-08-19"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Ejemplos prácticos de generación de UUID en Python, JavaScript y Java. Aprendé UUID v4, v7, ULID y cuándo usar cada uno."
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

## Resumen

Los UUIDs (Universally Unique Identifiers) son valores de 128 bits diseñados para ser únicos en
espacio y tiempo. Son el estándar para claves primarias en sistemas distribuidos, tokens de
sesión, nombres de archivos y cualquier escenario donde los enteros auto-incrementales no
alcanzan.

Los sistemas modernos prefieren UUID v7 o ULID sobre v4 porque son ordenables por tiempo, lo que
mejora el rendimiento de los índices de base de datos.

## Cuándo Usarlo

- Generar claves primarias en bases de datos distribuidas.
- Crear tokens de sesión o API.
- Nombrar archivos, imágenes o uploads para evitar colisiones.
- Fusionar datos de varias fuentes donde los IDs no deben chocar.
- Construir sistemas donde el cliente genera IDs antes de enviarlos al servidor.

## Cuándo NO Usarlo

- Tablas pequeñas y de un solo nodo donde los enteros auto-incrementales son más simples y
  rápidos.
- Rutas críticas de performance que no toleran el overhead de un CSPRNG.
- IDs públicos donde se prefieren slugs cortos y legibles por humanos.

## Solución

### Python

```python
import uuid
import ulid

# UUID v4 (random) — el más común
id_v4 = uuid.uuid4()
print(id_v4)  # 550e8400-e29b-41d4-a716-446655440000

# UUID v7 (ordenado por tiempo) — mejor para índices de DB
id_v7 = uuid.uuid7()  # Python 3.13+
print(id_v7)

# ULID (ordenado por tiempo, lexicográficamente sortable)
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

// UUID v7 (ordenado por tiempo) — requiere uuid@10+
console.log(v7()); // 018f3d7e-8... (empieza con timestamp)

// ULID (ordenado por tiempo, lexicográficamente sortable)
console.log(ulid()); // 01ARZ3NDEKTSV4RRFFQ69G5FAV

// UUID random nativo (Node 19+ y navegadores modernos)
console.log(crypto.randomUUID());
```

### Java

```java
import java.util.UUID;

// UUID v4 (random)
UUID idV4 = UUID.randomUUID();
System.out.println(idV4); // 550e8400-e29b-41d4-a716-446655440000

// UUID v7 (ordenado por tiempo) — usá java-uuid-generator o JDK 23+
// Para JDKs más viejos, agregá la librería java-uuid-generator.

// ULID vía librería externa como ulid-java
// String id = Ulid.generate();
```

## Versiones de UUID Comparadas

|Versión|Formato|Ordenable|Ideal para|
|-------|-------|---------|----------|
|v4|Random|No|Uso general, tokens de sesión, mayor soporte|
|v7|Ordenado por tiempo|Sí|Claves de BD, logs de eventos, mejor localidad de índice|
|v8|Custom|Configurable|Extensiones específicas de vendor|
|ULID|Tiempo + random|Sí|IDs URL-safe, lexicográficamente sortables|

## Explicación

Los UUIDs resuelven el problema de coordinación: cada nodo puede generar un ID sin hablar con un
asignador central. v4 usa aleatoriedad de una fuente criptográficamente segura, por lo que es
impredecible pero no ordenable. v7 codifica un timestamp Unix en los bits más significativos, lo
que da valores aproximadamente ordenados por tiempo manteniendo aleatoriedad en el resto. ULID es
similar pero usa un string de 26 caracteres en crockford-base32, más corto y seguro para URLs.

Cuando se usan como claves primarias, los IDs ordenables mantienen inserciones relacionadas
juntas en los índices B-tree, lo que mejora el throughput de escritura y la localidad de caché
respecto a valores v4 puramente aleatorios.

## Variantes

### UUID como almacenamiento binario

```python
import uuid

# Convertí un UUID a su representación de 16 bytes para almacenamiento compacto
uid = uuid.uuid7()
binary = uid.bytes  # 16 bytes
uid_back = uuid.UUID(bytes=binary)
```

### ULID string para URLs

```javascript
import { ulid } from 'ulid';

// 26 caracteres, URL-safe, lexicográficamente sortable
const id = ulid();
console.log(`https://api.example.com/items/${id}`);
```

### IDs estilo Snowflake

Para sistemas que necesitan IDs ordenables de 64 bits, considerá Twitter Snowflake, que usa un
coordinador central o un machine ID para evitar colisiones.

## Buenas Prácticas

- Preferí UUID v7 o ULID para claves de base de datos para mejorar el rendimiento de índices
  B-tree.
- Almacená UUIDs como tipos nativos `UUID` o `BINARY(16)` en vez de strings `CHAR(36)`.
- Usá `BINARY(16)` en MySQL para ahorrar espacio respecto a `CHAR(36)`.
- Generá IDs del lado del cliente solo cuando el cliente los necesita antes de que el servidor
  responda.
- Validá el formato UUID al parsear input externo.
- Evitá exponer IDs secuenciales públicamente; usá UUIDs para identificadores orientados al
  exterior.

## Errores Comunes

- Usar UUID v4 como clave primaria sin entender la penalización de inserciones aleatorias.
- Almacenar UUIDs como strings en vez de tipos binarios nativos, desperdiciando espacio y
  eficiencia de índice.
- Usar UUIDs en tablas pequeñas y no distribuidas donde los enteros auto-incrementales alcanzan.
- Generar UUIDs en un hot loop sin cachear la instancia del generador.
- Olvidar que UUID v1 filtra direcciones MAC y timestamps — evitalo para IDs públicos.

## Preguntas Frecuentes

### ¿Uso UUID v4 o v7 para proyectos nuevos?

Usá v7 o ULID para claves de base de datos. Son ordenados por tiempo y reducen la fragmentación
de índices. Usá v4 para identificadores no ordenables, como tokens de sesión.

### ¿Son realmente únicos los UUIDs?

La probabilidad de colisión para v4 es astronómicamente baja (1 en 2^122). Para fines prácticos,
son lo suficientemente únicos salvo en escalas extremas.

### ¿Puedo usar UUIDs en URLs?

Sí. Los ULID son más cortos y URL-safe. Si usás v4 o v7, eliminá los guiones para un string de 32
 caracteres.

### ¿Afectan los UUIDs al performance de la base de datos?

UUID v4 causa inserciones aleatorias en B-tree, lo que perjudica el rendimiento de escritura en
tablas grandes. UUID v7 y ULID son ordenados por tiempo, dando un performance similar al de
enteros auto-incrementales.

### ¿Puedo combinar UUIDs con IDs auto-incrementales?

Sí. Usá un entero auto-incremental como clave primaria interna para el performance de clustering
y un UUID como identificador externo para APIs y URLs.
