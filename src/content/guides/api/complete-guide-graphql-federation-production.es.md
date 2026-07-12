---






contentType: guides
slug: complete-guide-graphql-federation-production
title: "GraphQL Federation en Producción"
description: "Ejecutar GraphQL federado en produccion con confianza. Cubre composicion de subgrafos, deployment de gateway, resolucion de entidades, coordinacion de esquemas, observabilidad y manejo de fallos."
metaDescription: "GraphQL federation en produccion. Aprende composicion de subgrafos, deployment de gateway, resolucion de entidades, coordinacion de esquemas y observabilidad."
difficulty: advanced
topics:
  - graphql
  - api
  - architecture
tags:
  - graphql
  - federation
  - apollo
  - produccion
  - guia
  - supergraph
  - subgraph
  - gateway
relatedResources:
  - /guides/complete-guide-graphql-schema-design
  - /guides/complete-guide-graphql-federation
  - /guides/microservices-architecture-guide
  - /guides/complete-guide-graphql-testing
  - /recipes/graphql-mocking-apollo-server
  - /docs/graphql-federation-onboarding-template
  - /recipes/graphql-federation-gateway-setup
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "GraphQL federation en produccion. Aprende composicion de subgrafos, deployment de gateway, resolucion de entidades, coordinacion de esquemas y observabilidad."
  keywords:
    - graphql federation produccion
    - apollo federation
    - supergraph gateway
    - composicion subgrafos
    - resolucion entidades
    - graphql observabilidad






---

## Introducción

GraphQL Federation divide una API GraphQL monolitica en multiples subgrafos propiedad de diferentes equipos. Un gateway los compone en una sola API supergraph. Ejecutar federation en produccion introduce desafios que los tutoriales basicos no cubren: coordinacion de esquemas entre equipos, confiabilidad del gateway, rendimiento de resolucion de entidades, observabilidad, y manejo de fallos de subgrafos. Esta guia aborda cada uno.

## Repaso de Arquitectura de Federation

```text
Cliente → Gateway (Esquema Supergraph)
            ↓
    ┌───────┼───────┐
    ↓       ↓       ↓
  Users   Orders   Products
  (subgrafo A) (B)  (C)
```

- **Subgrafo**: Un servicio GraphQL propiedad de un equipo, que define parte del esquema
- **Supergraph**: El esquema compuesto de todos los subgrafos
- **Gateway**: El punto de entrada que rutea queries a subgrafos y une resultados
- **Entidad**: Un tipo compartido con un campo `@key` que multiples subgrafos pueden referenciar y extender

## Diseño de Subgrafos

### Propiedad de Entidades

Cada entidad tiene un subgrafo propietario que define su `@key` y campos base. Otros subgrafos extienden la entidad con campos adicionales. Esto previene conflictos y mantiene la propiedad clara.

```graphql
# Subgrafo Users (dueno de la entidad User)
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

# Subgrafo Orders (extiende User)
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}

type Order @key(fields: "id") {
  id: ID!
  userId: ID!
  total: Float!
  user: User!
}
```

### Reference Resolver

Cuando el gateway necesita resolver una entidad User desde el subgrafo Orders, llama al resolver `__resolveReference`. Este resolver recibe los campos key y retorna el objeto completo.

```javascript
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { gql, ApolloServer } = require("@apollo/server");

const typeDefs = gql`
  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    user(id: ID!): User
  }
`;

const resolvers = {
  User: {
    __resolveReference: (reference, context) => {
      // Gateway envia { id: "123", __typename: "User" }
      return context.dataSources.users.getById(reference.id);
    },
  },
  Query: {
    user: (_root, { id }, context) => context.dataSources.users.getById(id),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});
```

### Extender Entidades

Cuando un subgrafo extiende una entidad, debe marcar el campo key como `@external` y puede usar `@requires` para declarar dependencias en campos propiedad de otros subgrafos.

```graphql
# Subgrafo Products extiende Order
extend type Order @key(fields: "id") {
  id: ID! @external
  total: Float! @external
  items: [OrderItem!]!
  taxAmount: Float! @requires(fields: "total")
}
```

```javascript
const resolvers = {
  Order: {
    __resolveReference: (reference, context) => {
      return context.dataSources.orders.getById(reference.id);
    },
    taxAmount: (order) => order.total * 0.21,
  },
};
```

## Deployment del Gateway

### Federation Gestionada (Apollo Studio)

Apollo Studio hospeda el esquema supergraph. Los subgrafos publican sus esquemas a Studio. El gateway hace poll a Studio por el ultimo esquema supergraph. Esto desacopla la composicion del deployment.

```yaml
# gateway docker-compose.yml
services:
  gateway:
    image: ghcr.io/apollographql/router:v1.40.0
    environment:
      - APOLLO_SCHEMA_CONFIG_DELIVERY_ENDPOINT=https://uplink.api.apollographql.com/
      - APOLLO_KEY=service:my-graph:YOUR_KEY
      - APOLLO_GRAPH_REF=my-graph@production
    ports:
      - "4000:4000"
```

Ventajas: Sin composicion manual. El gateway detecta cambios de esquema automaticamente. Studio proporciona historial de esquema, validacion, y analiticas.

Desventajas: Depende de infraestructura de Apollo. Requiere una cuenta de organizacion de Apollo para features de produccion.

### Composición Self-Hosted

Compones el esquema supergraph tu mismo y se lo proporcionas al gateway. Esto funciona cuando no puedes depender de servicios externos.

```bash
# Componer supergraph desde esquemas de subgrafos
npx rover supergraph compose --config supergraph.yaml > supergraph.graphql
```

```yaml
# supergraph.yaml
federation_version: =2.8.0
subgraphs:
  users:
    routing_url: http://users-service:4001/graphql
    schema:
      subgraph_url: http://users-service:4001/graphql
  orders:
    routing_url: http://orders-service:4002/graphql
    schema:
      subgraph_url: http://orders-service:4002/graphql
  products:
    routing_url: http://products-service:4003/graphql
    schema:
      subgraph_url: http://products-service:4003/graphql
```

```bash
# Ejecutar gateway con esquema compuesto
npx @apollo/gateway start --supergraph supergraph.graphql --port 4000
```

Ventajas: Sin dependencia externa. Control total sobre composicion y deployment.

Desventajas: Gestionas el pipeline de composicion. Las actualizaciones de esquema requieren redeployment o un mecanismo de polling.

### Alta Disponibilidad del Gateway

Ejecuta multiples instancias del gateway detras de un load balancer. El gateway es stateless: rutea queries a subgrafos y une resultados. Cualquier instancia puede servir cualquier request.

```yaml
# kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: graphql-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: graphql-gateway
  template:
    spec:
      containers:
        - name: gateway
          image: ghcr.io/apollographql/router:v1.40.0
          env:
            - name: APOLLO_KEY
              valueFrom:
                secretKeyRef:
                  name: apollo-secrets
                  key: key
            - name: APOLLO_GRAPH_REF
              value: my-graph@production
          ports:
            - containerPort: 4000
          livenessProbe:
            httpGet:
              path: /.well-known/apollo/server-health
              port: 4000
          readinessProbe:
            httpGet:
              path: /.well-known/apollo/server-health
              port: 4000
```

## Query Planning

El gateway construye un query plan para cada query entrante. El plan especifica a que subgrafos llamar, en que orden, y como unir resultados.

### Plan Secuencial

Para una query como `user { orders { product { name } } }`, el gateway:

1. Llama al subgrafo Users para el usuario
2. Llama al subgrafo Orders para las ordenes del usuario (usando el user ID como entity key)
3. Llama al subgrafo Products para el producto de cada orden (usando product ID como entity key)

### Plan Paralelo

Para una query como `user { name orders { total } reviews { rating } }`, el gateway puede llamar a Orders y Reviews en paralelo ya que ambos dependen solo de la entidad User.

### Inspección del Query Plan

Apollo Router puede loggear query plans para debugging:

```yaml
# router.yaml
telemetry:
  instrumentation:
    spans:
      mode: spec_compliant
supergraph:
  query_plans:
    log: info
```

Esto loggea el query plan para cada query, mostrando a que subgrafos se llama y en que orden. Util para debugging de problemas de rendimiento.

## Manejo de Fallos de Subgrafos

### Fallos Parciales

Cuando un subgrafo falla, el gateway nullifica los campos que posee y continua resolviendo el resto. El array `errors` contiene los detalles del fallo.

```json
{
  "data": {
    "user": {
      "id": "123",
      "name": "Alice",
      "orders": null
    }
  },
  "errors": [
    {
      "message": "Orders subgraph unavailable",
      "path": ["user", "orders"],
      "extensions": { "code": "SUBGRAPH_ERROR" }
    }
  ]
}
```

### Circuit Breaker

Configura el gateway para dejar de enviar trafico a un subgrafo que falla. Esto previene fallos en cascada.

```javascript
const { ApolloGateway } = require("@apollo/gateway");

const gateway = new ApolloGateway({
  serviceList: [
    { name: "users", url: "http://users-service:4001/graphql" },
    { name: "orders", url: "http://orders-service:4002/graphql" },
  ],
  debug: true,
});
```

Para produccion, usa un service mesh (Istio, Linkerd) o API gateway (Kong, Envoy) para manejar circuit breaking, retries, y timeouts a nivel de red.

### Configuración de Timeouts

Setea timeouts a nivel de gateway para prevenir que subgrafos lentos bloqueen la query entera.

```yaml
# router.yaml
traffic_shaping:
  router:
    timeout: 30s
  all:
    timeout: 10s
    deduplicate_query: false
```

## Observabilidad

### Distributed Tracing

Usa OpenTelemetry para trazar queries a traves del gateway y los subgrafos. Cada llamada a subgrafo obtiene un span, y el gateway los correlaciona en un trace.

```javascript
// instrumentacion de subgrafo
const { trace } = require("@opentelemetry/api");

const resolvers = {
  Query: {
    user: (root, args, context) => {
      const span = trace.getSpan(context.tracing);
      span.setAttribute("user.id", args.id);
      return context.dataSources.users.getById(args.id);
    },
  },
};
```

```yaml
# router.yaml - export OpenTelemetry
telemetry:
  exporters:
    tracing:
      otlp:
        endpoint: http://otel-collector:4317
        protocol: grpc
```

### Métricas a Rastrear

- **Latencia de query**: p50, p95, p99 por operacion
- **Latencia de subgrafo**: p50, p95, p99 por subgrafo
- **Tasa de error**: por subgrafo y por operacion
- **Cache hit rate**: a nivel gateway y subgrafo
- **Complejidad de query**: promedio y maximo
- **Queries concurrentes**: gauge para monitoreo de carga

### Alertas de Cambios de Esquema

Configura Apollo Studio o tu pipeline CI para alertar sobre breaking changes de esquema. Cuando un subgrafo publica un esquema que rompe el supergraph, bloquea el deployment.

```bash
# Paso CI: check breaking changes
npx rover subgraph check my-graph@production \
  --name users \
  --schema ./schema.graphql \
  --routing-url http://users-service:4001/graphql
```

## Coordinación de Esquemas Entre Equipos

### Documentación de Propiedad

Documenta que equipo es dueno de cada tipo y campo. Esto previene que dos equipos definan accidentalmente el mismo tipo.

```yaml
# schema-ownership.yaml
types:
  User:
    owner: team-identity
    fields:
      id: team-identity
      name: team-identity
      email: team-identity
      orders: team-commerce
  Order:
    owner: team-commerce
    fields:
      id: team-commerce
      total: team-commerce
      user: team-commerce
  Product:
    owner: team-catalog
```

### Proceso de Review de Esquema

1. El equipo del subgrafo abre un PR con cambios de esquema
2. CI ejecuta `rover subgraph check` para detectar breaking changes
3. Review de arquitectura para tipos nuevos o cambios de entidades
4. El equipo publica el esquema a Studio despues del merge
5. El gateway detecta el nuevo esquema supergraph automaticamente

### Versionado de Esquemas de Subgrafos

Etiqueta esquemas de subgrafos con versiones en tu pipeline CI. Esto permite hacer rollback de un subgrafo a un esquema anterior si el nuevo causa problemas.

```bash
# Publicar con tag de version
npx rover subgraph publish my-graph@production \
  --name users \
  --schema ./schema.graphql \
  --routing-url http://users-service:4001/graphql
```

## Checklist de Producción

Antes de deployar federation a produccion:

- [ ] El gateway ejecuta detras de un load balancer con multiples replicas
- [ ] Health checks configurados para gateway y todos los subgrafos
- [ ] Timeouts seteados a nivel de gateway y subgrafo
- [ ] OpenTelemetry tracing exportado a un collector
- [ ] Dashboard de metricas para latencia de query, tasa de error, y cache hit rate
- [ ] Propiedad de esquema documentada
- [ ] Pipeline CI checkea breaking changes antes de publicar
- [ ] Fallo de subgrafo testeado: verificar que se retornan datos parciales
- [ ] El gateway puede servir queries cuando un subgrafo esta caido
- [ ] Tiempo de composicion de esquema medido y dentro del presupuesto

## Preguntas Frecuentes

### ¿Cuántos subgrafos debería tener?

Empieza con 2-3 subgrafos alineados a los limites de equipo. Cada subgrafo deberia ser dueno de un dominio coherente (users, orders, products). Demasiados subgrafos aumentan la complejidad del query plan y el overhead de red. Muy pocos subgrafos derrotan el proposito de federation.

### ¿Puedo mezclar versiones de federation (v1 y v2)?

Si, Apollo Federation v2 es retrocompatible con subgrafos v1. Puedes migrar subgrafos de uno en uno. Setea `federation_version: =2.x.x` en tu config de supergraph y actualiza subgrafos incrementalmente.

### ¿Qué pasa si el gateway no puede alcanzar un subgrafo?

El gateway retorna datos parciales. Los campos propiedad del subgrafo inalcanzable se nullifican. El array `errors` contiene el fallo. Si el subgrafo es dueno de un campo non-null, el error se propaga al padre nullable mas cercano.

### ¿Cómo testeo federation localmente?

Usa `rover dev` para ejecutar un gateway local que compone subgrafos desde tus servicios locales. Esto te permite testear el query plan completo sin deployar a un entorno compartido.

```bash
npx rover dev --name users --url http://localhost:4001/graphql
# En otra terminal
npx rover dev --name orders --url http://localhost:4002/graphql
```

Rover inicia un gateway en el puerto 4000 que compone ambos subgrafos.

### ¿Debería usar Apollo Router o el JS Gateway?

Apollo Router (basado en Rust) es recomendado para produccion. Es mas rapido, usa menos memoria, y soporta OpenTelemetry nativo. El JS Gateway (`@apollo/gateway`) es util para desarrollo y deployments basados en Node.js donde necesitas plugins de JavaScript custom.

## See Also

- [Complete Guide to GraphQL Federation](/es/guides/complete-guide-graphql-federation/)
- [Set Up a GraphQL Federation Gateway with Apollo](/es/recipes/graphql-federation-gateway-setup/)
- [Complete Guide to GraphQL Schema Design](/es/guides/complete-guide-graphql-schema-design/)
- [GraphQL Error Extension Pattern](/es/patterns/graphql-error-extension-pattern/)
- [GraphQL Interface Polymorphism Pattern](/es/patterns/graphql-interface-polymorphism-pattern/)

