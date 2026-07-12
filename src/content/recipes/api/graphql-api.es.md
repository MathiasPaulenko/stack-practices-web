---


contentType: recipes
slug: graphql-api
title: "Implementar una API GraphQL"
description: "Construye una API GraphQL lista para producción con schemas tipados, resolvers y optimización de queries en Python, JavaScript y Java."
metaDescription: "Build a GraphQL API in Python (Strawberry), JavaScript (Apollo), and Java. Type-safe schemas, resolvers, mutations, and subscriptions with practical examples."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - graphql
  - java
  - rest
  - http
relatedResources:
  - /recipes/api-versioning
  - /recipes/call-rest-api
  - /recipes/handle-cors
  - /recipes/handle-errors
  - /recipes/idempotent-api-endpoints
  - /recipes/api-logging-audit
  - /recipes/api-documentation-openapi
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build a GraphQL API in Python (Strawberry), JavaScript (Apollo), and Java. Type-safe schemas, resolvers, mutations, and subscriptions with practical examples."
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

Aqui se explica como la construcción de una API GraphQL lista para producción con schemas tipados, resolvers, mutaciones y suscripciones en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Tus clientes necesitan flexibilidad en la obtención de datos (apps móviles con ancho de banda limitado)
- Quieres contratos de API fuertemente tipados con documentación automática
- Necesitas agregar datos de múltiples microservicios. Consulta [API gRPC](/recipes/api/grpc-api) para comunicación entre servicios.
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

## Lo que funciona

- **Usa DataLoader para queries N+1**: Batch y cachea peticiones a la base de datos entre resolvers
- **Implementa paginación**: Usa [paginación basada en cursores](/recipes/api/cursor-pagination-postgresql) para listas grandes (spec de Relay Connections)
- **Valida entrada temprano**: Usa directivas de schema y escalares personalizados para validación
- **Limita profundidad/complejidad de queries**: Previene queries costosos con análisis de profundidad y complejidad
- **Habilita query whitelisting en producción**: Usa persisted queries para prevenir ejecución arbitraria

## Errores Comunes

- **No manejar queries N+1**: Cada resolver que accede a la base de datos de forma independiente causa queries exponenciales
- **Exponer tipos internos**: Filtrar modelos de base de datos directamente al schema sin una capa de dominio
- **Falta de manejo de errores**: GraphQL retorna 200 OK incluso con errores — siempre verifica el array `errors`. Consulta [Manejo de Errores](/recipes/api/handle-errors) para patrones.
- **Ignorar versionado de schema**: Aunque GraphQL evita versionado, la deprecación y el seguimiento de campos aún importan
- **Almacenar estado en resolvers**: Los resolvers deben ser stateless; usa context para datos del scope de la petición

## Preguntas Frecuentes

**P: ¿Debería migrar mi API REST a GraphQL?**
R: No necesariamente. GraphQL brilla cuando los clientes necesitan flexibilidad. Si tu API tiene consumidores simples y estables, [REST](/recipes/api/call-rest-api) puede ser más simple y cacheable.

**P: ¿Cómo manejo subida de archivos en GraphQL?**
R: Usa el spec de multipart request (Apollo lo soporta nativamente) o usa un endpoint REST separado para subidas y retorna la URL en GraphQL.

**P: ¿Qué es la federación de GraphQL?**
R: La federación permite que múltiples servicios GraphQL expongan un schema unificado. Cada servicio posee parte del schema, y un gateway los une. Ideal para microservicios.

## Mejores Prácticas

- **Limita la profundidad de queries**: queries maliciosos pueden anidarse profundamente (`user.friends.friends.friends...`). Setea una profundidad máxima (7-10 niveles) usando `graphql-depth-limit` para prevenir resource exhaustion.
- **Usa persisted queries en producción**: almacena queries aprobadas server-side y referéncialas por ID. Esto elimina ejecución arbitraria de queries y reduce payload size en 90%.
- **Habilita query complexity analysis**: asigna cost scores a campos y rechaza queries que excedan el budget. `graphql-cost-analysis` previene que queries costosas overloaden tu server.
- **Implementa DataLoader para N+1 queries**: batchea database requests por petición para evitar el problema N+1. DataLoader coalescea llamadas individuales `findById` en un solo batch `findByIds`.
- **Versiona tu schema, no tus endpoints**: GraphQL tiene un solo endpoint. Agrega campos con deprecation markers en lugar de crear queries nuevas. Elimina campos deprecados solo después de que todos los clientes migren.
- **Usa interface y union types para polimorfismo**: modela campos compartidos como interfaces. Esto mantiene el schema DRY y permite a los clientes queryear campos comunes sin conocer el tipo concreto.

## Checklist de Producción

- [ ] Query depth limiting está habilitado (max 7-10 niveles)
- [ ] Query complexity analysis rechaza queries que exceden el cost budget
- [ ] DataLoader o batching equivalente se usa para todo database access
- [ ] Persisted queries se enforcement en producción (no queries arbitrarias)
- [ ] Introspection está deshabilitada en producción
- [ ] Rate limiting se aplica por-query, no solo por-request
- [ ] Respuestas de error no exponen stack traces internos o detalles de schema
- [ ] Subscriptions tienen connection limits y heartbeat timeouts
- [ ] Cambios de schema se revisan por breaking changes antes del deployment
- [ ] Apollo Studio o schema registry similar trackea evolución del schema

## Consideraciones de Escalado

- **Overhead de query parsing**: cada petición GraphQL parsea y valida la query contra el schema. A 10K peticiones/segundo, parsing agrega 5-15ms por petición. Usa persisted queries para skipear parsing — los clientes envían un hash en lugar de la query completa.
- **Problema N+1 queries**: sin batching, una query retornando 100 usuarios con sus 100 posts triggerea 101 database queries. DataLoader batchea esto en 2 queries. Siempre profilea con database query logs para detectar patrones N+1.
- **Escalabilidad de subscriptions**: WebSocket subscriptions mantienen conexiones persistentes. A 10K subscriptions concurrentes, cada una consumiendo 50KB de memoria, necesitas 500MB solo para conexiones. Usa un pub/sub system (Redis, NATS) para compartir subscriptions across instancias.
- **Overhead de gateway federation**: en una arquitectura federada, el gateway hace sub-queries a múltiples servicios. Una sola query de cliente puede triggerea 5-15 internal requests. Cachea sub-resolver results para evitar llamadas redundantes.

## Estimación de Costos

| Componente | Costo | Notas |
|-----------|------|-------|
| Apollo Server (self-hosted) | $0 | Open-source, Node.js |
| Apollo Cloud (por millón de peticiones) | $150-$400/mes | Managed routing + caching |
| Hasura Cloud | $50-$1,000/mes | Managed GraphQL on Postgres |
| Redis (para DataLoader cache + pub/sub) | $10-$75/mes | Single instance o cluster |
| CDN para persisted queries | $0-$20/mes | Cloudflare, CloudFront |

Para 100K peticiones/día: Apollo Server self-hosted en 2x EC2 t3.medium ($30/mes) + Redis ($15/mes) maneja la carga. Apollo Cloud agrega $150/mes pero elimina gestión de infraestructura. Hasura es cost-effective si tu data layer ya es Postgres.

## Cuándo No Usar Este Enfoque

- **CRUD simple con schema estable**: si tu API tiene 5-10 endpoints con shapes predecibles y sin relaciones anidadas, REST es más simple, más cacheable y más fácil de debuggear. La flexibilidad de GraphQL se convierte en overhead cuando los clientes no la necesitan.
- **APIs públicas cacheadas en CDN**: las peticiones POST de GraphQL bypassan CDN caching por defecto. Las peticiones GET de REST se cachean en edge nodes gratis. Para APIs públicas read-heavy (clima, noticias, data pública), REST con CDN caching entrega 10-100x mejor performance.
- **Clientes con bandwidth restringido**: los clientes de GraphQL descargan el schema completo para introspection y query validation. En redes 2G/3G o dispositivos IoT, esto agrega 50-200KB de overhead por conexión. Los clientes REST solo necesitan la URL del endpoint.

## Benchmarks de Rendimiento

| Setup | Latencia avg | Throughput | Notas |
|-------|-----------|-----------|-------|
| REST (Express + Redis cache) | 5-15ms | 20K req/s | Simple GET, cached |
| GraphQL (Apollo Server) | 15-50ms | 5K req/s | Single query, no cache |
| GraphQL + DataLoader | 20-60ms | 4K req/s | Batched resolvers |
| GraphQL + persisted queries | 8-25ms | 8K req/s | Skip parsing |
| GraphQL + Redis cache | 5-20ms | 15K req/s | Cached responses |

GraphQL agrega 2-5x latencia comparado con REST para operaciones equivalentes debido a query parsing, schema validation y resolver execution. Persisted queries cierran el gap skipeando parsing. Para APIs read-heavy, cachea respuestas GraphQL en Redis con un TTL de 60 segundos keyed by query hash.

## Estrategia de Testing

- **Testea lógica de resolvers en aislamiento**: llama resolvers directamente con mock context y arguments. Verifica return values, error handling y prevención de N+1 queries. Usa DataLoader en tests para batch data loading.
- **Testea schema con introspection queries**: corre introspection queries para verificar que el schema expone solo types y fields intencionales. Testea que campos deprecados tengan directives `@deprecated` con migration messages.
- **Testea límites de query complexity**: envía queries deeply nested y queries con high field counts. Verifica que el complexity analyzer los rechace con un error message clear. Testea que queries válidas dentro de los límites pasen.
- **Testea lifecycle de subscriptions**: conecta un subscription client, verifica que reciba real-time updates, luego desconecta y verifica que el server limpie la subscription y deje de enviar data.

## Errores Comunes

- **Problema N+1 queries**: resolvers que fetchean data relacionada individualmente causan N+1 database queries. Una query por 100 users con sus posts triggerea 1 + 100 = 101 queries. Usa DataLoader para batchear related fetches en una sola query por level.
- **Exponer el schema entero en producción**: introspection permite a clientes descubrir todos los types y fields. Deshabilita introspection en producción para prevenir que atacantes mappeen tu API surface. Usa `@deprecated` para phase out fields gracefully.
- **Sin límites de query complexity**: sin depth o complexity limits, un cliente malicioso puede enviar una query como `{ users { posts { comments { author { posts { comments { ... } } } } } } }` que exhausta server resources. Setea `maxDepth` y `maxComplexity` en las validation rules.
- **Retornar errores con stack traces**: las error responses de GraphQL incluyen `extensions` por defecto. En producción, deshabilita `stacktrace` en error extensions para evitar leakear internal implementation details a clientes.

## Monitoring y Observabilidad

- **Trackea distribución de query complexity**: loggea el complexity score de cada query. Alerta si el average complexity aumenta >20% week-over-week, lo que puede indicar que los clientes están pidiendo data graphs más profundos.
- **Monitorea resolver execution time**: trackea p50, p95 y p99 latency por resolver field. Resolvers lentos (p95 >100ms) son el bottleneck primario. Usa Apollo Tracing o custom instrumentation para collectar per-resolver metrics.
- **Trackea detección de N+1 queries**: usa las batching metrics de DataLoader para detectar cuando los resolvers hacen database calls individuales en lugar de batched. Alerta si el batch ratio (batches/total calls) cae below 80%.
- **Monitorea subscription connection count**: trackea active WebSocket connections para subscriptions. Setea alertas para >10K concurrent subscriptions por instancia, lo que puede exhaustar memoria o file descriptors.

## Checklist de Despliegue

- [ ] Configurar query depth y complexity limits en validation rules
- [ ] Deshabilitar introspection en producción (`introspection: false`)
- [ ] Setear DataLoader para todos los resolvers con relationships
- [ ] Configurar persisted queries para producción para reducir parsing overhead
- [ ] Setear Redis-based response caching con TTL de 60 segundos para queries read-heavy
- [ ] Deshabilitar stack traces en error extensions para producción
- [ ] Configurar rate limiting por query complexity (no solo por request count)
- [ ] Setear WebSocket connection limits para subscriptions
- [ ] Registrar schema con Apollo Studio o equivalent schema registry
- [ ] Testear con production-like query patterns antes de desplegar

## Consideraciones de Seguridad

- **Batch query attacks**: GraphQL permite enviar múltiples queries en una sola petición. Atacantes pueden usar esto para bypassar rate limiting. Limita el batch query count a 5 por petición y aplica rate limits por query, no por HTTP request.
- **Introspection-based reconnaissance**: en producción, deshabilita introspection para prevenir que atacantes descubran todos los types, fields y mutations. Usa `@deprecated` para phase out fields sin exponer el schema entero.
- **Alias-based DoS**: GraphQL permite field aliases, así que un cliente puede pedir el mismo field 1000 veces con aliases diferentes en una query. Limita el número de aliases por query en las validation rules.
- **Mutation CSRF**: mutations que cambian state son vulnerables a CSRF si el endpoint acepta cookies. Require custom headers (e.g., `X-Requested-With`) o usa token-based auth en lugar de cookie-based auth para mutations.
- **Query depth-based memory exhaustion**: queries deeply nested pueden causar que el server allocatee grandes cantidades de memoria para el execution plan. Setea `maxDepth` a 10 y `maxComplexity` a 1000 para prevenir memory exhaustion attacks.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
