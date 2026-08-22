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
lastUpdated: "2026-08-22"
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

Seguramente viste IDs como `550e8400-e29b-41d4-a716-446655440000`. Esos son UUIDs: etiquetas de 128
bits diseñadas para ser únicas en espacio y tiempo. Se usan para claves primarias en sistemas
distribuidos, tokens de sesión, nombres de archivos subidos y cualquier lugar donde un entero
auto-incremental no alcanza.

Hay un cambio silencioso hacia UUID v7 y ULID. Ambos son aproximadamente ordenados por tiempo, así
que las inserciones no se esparcen por todo el índice B-tree como pasa con v4. En tablas con mucha
escritura, eso se nota.

## Cuándo Usarlo

Los casos típicos son claves primarias en bases de datos distribuidas, tokens de sesión o API,
nombres de archivos o uploads, y fusionar datos de varias fuentes donde los IDs no deben chocar. La
generación del lado del cliente es otro caso común: el cliente puede crear un ID antes de llamar al
servidor.

## Cuándo NO Usarlo

No uses UUIDs en tablas pequeñas y de un solo nodo, donde los enteros auto-incrementales son más
simples y rápidos. Evitalos en rutas críticas de performance que no toleren el overhead de un
CSPRNG, y no los uses cuando necesitás slugs cortos y legibles para el público.

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

| Versión | Formato | Ordenable | Ideal para |
| --- | --- | --- | --- |
| v4 | Random | No | Uso general, tokens de sesión, mayor soporte |
| v7 | Ordenado por tiempo | Sí | Claves de BD, logs de eventos, mejor localidad de índice |
| v8 | Custom | Configurable | Extensiones específicas de vendor |
| ULID | Tiempo + random | Sí | IDs URL-safe, lexicográficamente sortables |

## Explicación

La razón de existir de los UUIDs es la coordinación: cada nodo puede generar su propio ID sin llamar
a un asignador central.

v4 se construye con aleatoriedad criptográficamente segura. Es impredecible, que es lo que querés
para secretos, pero no tiene orden.

v7 coloca un timestamp Unix en los bits más significativos y completa el resto con aleatoriedad.
Terminás con valores aproximadamente ordenados por tiempo y todavía únicos.

ULID hace lo mismo pero empaqueta el valor en un string de 26 caracteres en crockford-base32. Es más
corto que un UUID en string y seguro para URLs.

Como claves primarias, los IDs ordenables mantienen inserciones relacionadas cerca en los índices
B-tree. Eso mejora el throughput de escritura y la localidad de caché respecto a valores v4
puramente aleatorios.

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

Si necesitás IDs ordenables de 64 bits, mirá Twitter Snowflake. Depende de un coordinador central o
un machine ID para evitar colisiones.

## Buenas Prácticas

- Elegí v7 o ULID cuando el ID sea clave primaria de base de datos. El orden por tiempo evita que
    los índices B-tree se fragmenten.
- Almacená UUIDs como tipos nativos `UUID` o `BINARY(16)`, no como strings `CHAR(36)`. En MySQL,
    `BINARY(16)` ahorra mucho espacio.
- Generá IDs del lado del cliente solo cuando el cliente los necesite antes de que el servidor
    responda.
- Validá el formato UUID al parsear input externo.
- Mantené IDs secuenciales internos y exponé UUIDs para identificadores orientados al público.

## Errores Comunes

- Elegir UUID v4 como clave primaria sin darse cuenta de la penalización de inserciones aleatorias.
- Almacenar UUIDs como strings en vez de tipos binarios compactos, desperdiciando espacio y
    eficiencia de índice.
- Usar UUIDs en tablas pequeñas y no distribuidas donde los enteros auto-incrementales alcanzan.
- Generar UUIDs en un hot loop sin cachear la instancia del generador.
- Olvidar que UUID v1 filtra direcciones MAC y timestamps, así que no debería usarse para IDs
    públicos.

## Preguntas Frecuentes

### ¿Uso UUID v4 o v7 para proyectos nuevos?

Para claves de base de datos, andá con v7 o ULID. El orden por tiempo reduce la fragmentación de
índices. v4 todavía sirve para cosas como tokens de sesión que no necesitan ordenarse.

### ¿Son realmente únicos los UUIDs?

Para v4, la chance de colisión es aproximadamente 1 en 2^122. En la mayoría de cargas reales, podés
dejar de preocuparte.

### ¿Puedo usar UUIDs en URLs?

Sí. Los ULID son más cortos y URL-safe. Si usás v4 o v7, podés sacar los guiones para un string de
32 caracteres.

### ¿Afectan los UUIDs al performance de la base de datos?

UUID v4 causa inserciones aleatorias en B-tree, lo que perjudica el rendimiento de escritura en
tablas grandes. UUID v7 y ULID son ordenados por tiempo, así que su performance de escritura es
mucho más parecido al de enteros auto-incrementales.

### ¿Puedo combinar UUIDs con IDs auto-incrementales?

Sí. Un patrón común es un entero auto-incremental como clave primaria interna para el performance de
clustering, más un UUID como identificador externo para APIs y URLs.
