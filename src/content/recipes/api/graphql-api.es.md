---
contentType: recipes
slug: graphql-api
title: "Implementar una API GraphQL"
description: "Construye una API GraphQL lista para producción con schemas tipados, resolvers y optimización de queries en Python, JavaScript y Java."
metaDescription: "[ES] Build a GraphQL API in Python (Strawberry), JavaScript (Apollo), and Java. Type-safe schemas, resolvers, mutations, and subscriptions with practical examples."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - graphql
  - java
relatedResources:
  - /recipes/api-versioning
  - /recipes/call-rest-api
  - /recipes/handle-cors
  - /recipes/handle-errors
  - /recipes/idempotent-api-endpoints
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye una API GraphQL en Python (Strawberry), JavaScript (Apollo) y Java. Schemas tipados, resolvers, mutaciones y suscripciones con ejemplos prácticos."
  keywords:
    - graphql
    - api
    - apollo
    - strawberry
    - python
    - javascript
    - java
---
# Implementar una API GraphQL

## Visión General

GraphQL es un lenguaje de consultas y un runtime para APIs que permite a los clientes solicitar exactamente los datos que necesitan. A diferencia de REST, donde el servidor define la estructura de la respuesta, GraphQL pone al cliente en control — reduciendo el over-fetching y under-fetching mientras proporciona tipado fuerte a través de schemas.

Esta receta cubre la construcción de una API GraphQL lista para producción con schemas tipados, resolvers, mutaciones y suscripciones en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Tus clientes necesitan flexibilidad en la obtención de datos (apps móviles con ancho de banda limitado)
- Quieres contratos de API fuertemente tipados con documentación automática
- Necesitas agregar datos de múltiples microservicios
- Los consumidores de tu API solicitan combinaciones de campos frecuentemente diferentes

## Solución

### Python

```python
import strawberry
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

@strawberry.type
class Book:
    title: str
    author: str
    pages: int

@strawberry.type
class Query:
    @strawberry.field
    def books(self) -> list[Book]:
        return [
            Book(title="Clean Code", author="Robert C. Martin", pages=464),
            Book(title="The Pragmatic Programmer", author="Andy Hunt", pages=352),
        ]

schema = strawberry.Schema(query=Query)
app = FastAPI()
app.include_router(GraphQLRouter(schema), prefix="/graphql")
```

### JavaScript

```javascript
const { ApolloServer, gql } = require('apollo-server');

const typeDefs = gql`
  type Book {
    title: String!
    author: String!
    pages: Int!
  }

  type Query {
    books: [Book!]!
  }
`;

const resolvers = {
  Query: {
    books: () => [
      { title: 'Clean Code', author: 'Robert C. Martin', pages: 464 },
      { title: 'The Pragmatic Programmer', author: 'Andy Hunt', pages: 352 },
    ],
  },
};

const server = new ApolloServer({ typeDefs, resolvers });
server.listen().then(({ url }) => console.log(`Servidor listo en ${url}`));
```

### Java

```java
import com.coxautodev.graphql.tools.GraphQLQueryResolver;
import graphql.servlet.SimpleGraphQLHttpServlet;
import javax.servlet.annotation.WebServlet;

public class Book {
    private String title;
    private String author;
    private int pages;
    // getters y setters
}

public class QueryResolver implements GraphQLQueryResolver {
    public List<Book> books() {
        return Arrays.asList(
            new Book("Clean Code", "Robert C. Martin", 464),
            new Book("The Pragmatic Programmer", "Andy Hunt", 352)
        );
    }
}

@WebServlet(urlPatterns = "/graphql")
public class GraphQLEndpoint extends SimpleGraphQLHttpServlet {
    // Configurar schema y wiring de resolvers
}
```

## Explicación

Las APIs GraphQL consisten en tres componentes principales:
- **Schema**: Define tipos, queries, mutaciones y suscripciones usando SDL (Schema Definition Language)
- **Resolvers**: Funciones que devuelven datos para cada campo del schema
- **Servidor**: Maneja peticiones HTTP, parsea queries, valida contra el schema y ejecuta resolvers

Diferencias clave entre lenguajes:
- **Python (Strawberry)**: Definiciones basadas en decoradores con sintaxis de dataclass
- **JavaScript (Apollo)**: Schema-first con template literals `gql`
- **Java**: Code-first o schema-first con resolvers específicos de cada biblioteca

## Variantes

| Tecnología | Biblioteca | Enfoque | Notas |
|------------|------------|---------|-------|
| Python | Strawberry | Code-first | Decoradores de dataclass, integración con FastAPI |
| Python | Graphene | Code-first | Integración Django, ecosistema maduro |
| JavaScript | Apollo Server | Schema-first | Federación, suscripciones, caché |
| JavaScript | Nexus | Code-first | TypeScript-first, inferencia de tipos |
| Java | graphql-java | Schema-first | Bajo nivel, máximo control |
| Java | DGS Framework | Code-first | Open-source de Netflix, integración Spring |

## Mejores Prácticas

- **Usa DataLoader para queries N+1**: Batch y cachea peticiones a la base de datos entre resolvers
- **Implementa paginación**: Usa paginación basada en cursores para listas grandes (spec de Relay Connections)
- **Valida entrada temprano**: Usa directivas de schema y escalares personalizados para validación
- **Limita profundidad/complejidad de queries**: Previene queries costosos con análisis de profundidad y complejidad
- **Habilita query whitelisting en producción**: Usa persisted queries para prevenir ejecución arbitraria

## Errores Comunes

- **No manejar queries N+1**: Cada resolver que accede a la base de datos de forma independiente causa queries exponenciales
- **Exponer tipos internos**: Filtrar modelos de base de datos directamente al schema sin una capa de dominio
- **Falta de manejo de errores**: GraphQL retorna 200 OK incluso con errores — siempre verifica el array `errors`
- **Ignorar versionado de schema**: Aunque GraphQL evita versionado, la deprecación y el seguimiento de campos aún importan
- **Almacenar estado en resolvers**: Los resolvers deben ser stateless; usa context para datos del scope de la petición

## Preguntas Frecuentes

**P: ¿Debería migrar mi API REST a GraphQL?**
R: No necesariamente. GraphQL brilla cuando los clientes necesitan flexibilidad. Si tu API tiene consumidores simples y estables, REST puede ser más simple y cacheable.

**P: ¿Cómo manejo subida de archivos en GraphQL?**
R: Usa el spec de multipart request (Apollo lo soporta nativamente) o usa un endpoint REST separado para subidas y retorna la URL en GraphQL.

**P: ¿Qué es la federación de GraphQL?**
R: La federación permite que múltiples servicios GraphQL expongan un schema unificado. Cada servicio posee parte del schema, y un gateway los une. Ideal para microservicios.
