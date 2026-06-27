---
contentType: guides
slug: graph-database-guide
title: "Bases de Datos de Grafos — Neo4j y Modelado de Grafos de Propiedades"
description: "Guia practica de bases de datos de grafos: modelo de grafo de propiedades, lenguaje Cypher, patrones de modelado y cuando elegir Neo4j sobre bases relacionales."
metaDescription: "Aprende bases de datos de grafos: modelo de grafo de propiedades, consultas Cypher, patrones de modelado. Cuando elegir Neo4j sobre relacional para datos conectados."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - base-datos-grafos
  - neo4j
  - cypher
  - grafo-propiedades
  - relaciones
  - datos-conectados
  - motor-recomendacion
  - guia
relatedResources:
  - /guides/nosql-patterns-guide
  - /guides/vector-database-guide
  - /guides/database-design-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende bases de datos de grafos: modelo de grafo de propiedades, consultas Cypher, patrones de modelado. Cuando elegir Neo4j sobre relacional para datos conectados."
  keywords:
    - base-datos-grafos
    - neo4j
    - cypher
    - grafo-propiedades
    - datos-conectados
    - guia
---

## Overview

Las bases de datos de grafos almacenan datos como nodos (entidades) y aristas (relaciones), haciendolas ideales para problemas donde las conexiones entre puntos de datos son tan importantes como los datos mismos. Redes sociales, deteccion de fraude, motores de recomendacion y grafos de conocimiento se benefician del almacenamiento nativo de grafos. Neo4j, la principal base de datos de grafos de propiedades, usa el lenguaje de consulta Cypher y logra recorridos de tiempo constante independientemente de la profundidad del grafo — algo con lo que las bases relacionales luchan debido a la explosion de joins.

## When to Use

- Las relaciones son la principal preocupacion de consulta, no solo atributos
- Necesitas recorrer muchos saltos eficientemente (amigo-de-amigo, cadena de suministro)
- El esquema es fluido y emergen nuevos tipos de relacion frecuentemente
- Se requiere busqueda de caminos, centralidad o deteccion de comunidades
- Un modelo relacional requeriria excessive self-joins o tablas de union

## Modelo de Grafo de Propiedades

| Elemento | Descripcion | Ejemplo |
|----------|-------------|---------|
| **Nodo** | Entidad con etiquetas y propiedades | `(p:Person {name: "Alice", age: 30})` |
| **Relacion** | Conexion tipada, dirigida con propiedades | `[:FRIENDS {since: 2020}]` |
| **Etiqueta** | Categoriza nodos | `:Person`, `:Product`, `:Order` |
| **Propiedad** | Atributo clave-valor en nodo o relacion | `name`, `since`, `amount` |

## Cypher Basico

```cypher
-- Crear nodos y una relacion
CREATE (alice:Person {name: 'Alice', city: 'NYC'})
CREATE (bob:Person {name: 'Bob', city: 'LA'})
CREATE (alice)-[:FRIENDS {since: 2020}]->(bob);

-- Encontrar amigos de amigos
MATCH (alice:Person {name: 'Alice'})-[:FRIENDS*2]->(fof:Person)
WHERE fof <> alice
RETURN DISTINCT fof.name;

-- Camino mas corto entre dos personas
MATCH p=shortestPath(
    (a:Person {name: 'Alice'})-[:FRIENDS|COLLEAGUE*]-(b:Person {name: 'Zoe'})
)
RETURN p;
```

## Patrones del Mundo Real

### Motor de Recomendacion

```cypher
-- Filtrado colaborativo: personas que compraron X tambien compraron Y
MATCH (u:User)-[:BOUGHT]->(p:Product {name: 'Widget'})
MATCH (u)-[:BOUGHT]->(other:Product)
WHERE other <> p
RETURN other.name, count(*) as popularity
ORDER BY popularity DESC
LIMIT 5;
```

### Deteccion de Fraude

```cypher
-- Detectar transferencias circulares de dinero (layering)
MATCH path=(a:Account)-[:TRANSFERRED_TO*3..5]->(a)
RETURN path;
```

### Control de Acceso

```cypher
-- Verificar si un usuario tiene acceso a traves de membresia en grupo
MATCH (u:User {id: 123})-[:MEMBER_OF*0..]->(g:Group)-[:CAN_ACCESS]->(r:Resource {id: 'doc-1'})
RETURN count(r) > 0 as has_access;
```

## Grafo vs Relacional

| Tipo de consulta | Relacional | Grafo |
|------------------|------------|-------|
| Busqueda 1-salto | JOIN | Recorrido directo de arista |
| Recorrido 3+ saltos | Multiples JOINs, lento | Tiempo constante por salto |
| Busqueda de caminos | CTE recursivo, complejo | shortestPath nativo |
| Evolucion de esquema | ALTER TABLE | Agregar etiquetas/relaciones dinamicamente |

## Common Mistakes

- **Modelar todo como grafo** — datos tabulares simples suelen ser mejores en una base relacional
- **Ignorar direccion** — las relaciones tienen direccion en grafos de propiedades; disenar consultas en consecuencia
- **Faltar indices** — crear indices en propiedades que se buscan frecuentemente (ej. `CREATE INDEX ON :Person(email)`)
- **Recorridos profundos sin limites** — caminos de longitud variable sin restricciones pueden consumir recursos excesivos
- **Almacenar propiedades grandes en relaciones** — mantener propiedades de relacion pequenas; usar nodos para datos ricos

## FAQ

**Cuando NO debo usar una base de datos de grafos?**
Cuando las relaciones son superficiales (1-2 saltos), los datos son altamente estructurados y estaticos, o necesitas transacciones ACID fuertes a traves de todo el grafo. Las bases relacionales manejan esto bien.

**Puedo ejecutar consultas de grafo en PostgreSQL?**
Si, con extensiones como Apache AGE o CTEs recursivos, pero el rendimiento se degrada con la profundidad del grafo. Para recorridos profundos, una base de datos de grafos nativa es mejor.

**Que es RDF vs grafo de propiedades?**
RDF es un estandar W3C para grafos semanticos (tripletas). Los grafos de propiedades (Neo4j, Amazon Neptune) son mas amigables para desarrolladores con nodos etiquetados, relaciones tipadas y propiedades en ambos.
