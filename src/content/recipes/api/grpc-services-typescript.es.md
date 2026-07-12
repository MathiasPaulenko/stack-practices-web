---




contentType: recipes
slug: grpc-services-typescript
title: "Servicios gRPC con Protocol Buffers en TypeScript"
description: "Construye servicios de alto rendimiento y fuertemente tipados usando gRPC con Protocol Buffers, cubriendo llamadas unarias, server streaming, client streaming y bidirectional streaming"
metaDescription: "Construye servicios gRPC con Protocol Buffers en TypeScript. Implementa llamadas unarias y streaming bidireccional para APIs de alto rendimiento."
difficulty: intermediate
topics:
  - api
  - devops
tags:
  - api
  - microservices
  - rest
  - http
  - backend
relatedResources:
  - /recipes/go-rest-api-gin
  - /patterns/ambassador-pattern-services
  - /recipes/grpc-api
  - /recipes/rest-api-design
  - /recipes/api-versioning
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye servicios gRPC con Protocol Buffers en TypeScript. Implementa llamadas unarias y streaming bidireccional para APIs de alto rendimiento."
  keywords:
    - grpc
    - protocol buffers
    - streaming api
    - typescript
    - high performance




---

# Servicios gRPC con Protocol Buffers en TypeScript

Construye APIs de alto rendimiento e independientes de lenguaje usando gRPC con Protocol Buffers. Esta recipe cubre definiciones de servicios en protobuf, generacion de codigo con TypeScript, llamadas unarias, patrones de streaming, interceptors para cross-cutting concerns y health checking para servicios de produccion.

## Cuando Usar Esto

- Comunicacion de baja latencia y alto throughput entre [microservicios](/patterns/design/ambassador-pattern-services) internos
- Necesitas contratos fuertemente tipados con generacion de codigo automatica
- Datos streaming (logs, eventos, file uploads) deben manejarse eficientemente

## Solucion

### 1. Definicion de Protocol Buffer

```protobuf
// proto/user.proto
syntax = "proto3";

package users;

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (stream User);
  rpc CreateUsers (stream CreateUserRequest) returns (UserList);
  rpc Chat (stream ChatMessage) returns (stream ChatMessage);
}

message GetUserRequest {
  string id = 1;
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}

message ListUsersRequest {
  int32 page = 1;
  int32 page_size = 2;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message UserList {
  repeated User users = 1;
}

message ChatMessage {
  string user_id = 1;
  string content = 2;
  int64 timestamp = 3;
}
```

### 2. Generacion de Codigo

```bash
# script de package.json
"proto:generate": "grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:./generated \
  --grpc_out=grpc_js:./generated \
  --ts_out=grpc_js:./generated \
  --proto_path=./proto \
  ./proto/*.proto"
```

### 3. Implementacion de Servidor

```typescript
// grpc/server.ts
import * as grpc from '@grpc/grpc-js';
import { UserServiceService, IUserServiceServer } from './generated/user_grpc_pb';
import { GetUserRequest, User, ListUsersRequest, CreateUserRequest, UserList, ChatMessage } from './generated/user_pb';

const server = new grpc.Server();

const userService: IUserServiceServer = {
  getUser: (call, callback) => {
    const user = new User();
    user.setId(call.request.getId());
    user.setName('Alice');
    user.setEmail('alice@example.com');
    callback(null, user);
  },

  listUsers: (call) => {
    for (let i = 1; i <= 3; i++) {
      const user = new User();
      user.setId(String(i));
      user.setName(`User ${i}`);
      call.write(user);
    }
    call.end();
  },

  createUsers: (call, callback) => {
    const users: User[] = [];
    call.on('data', (req: CreateUserRequest) => {
      const user = new User();
      user.setId(String(users.length + 1));
      user.setName(req.getName());
      users.push(user);
    });
    call.on('end', () => {
      const list = new UserList();
      list.setUsersList(users);
      callback(null, list);
    });
  },

  chat: (call) => {
    call.on('data', (msg: ChatMessage) => {
      const reply = new ChatMessage();
      reply.setUserId('server');
      reply.setContent(`Echo: ${msg.getContent()}`);
      reply.setTimestamp(Date.now());
      call.write(reply);
    });
    call.on('end', () => call.end());
  },
};

server.addService(UserServiceService, userService);
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  server.start();
  console.log('gRPC server running on port 50051');
});
```

### 4. Implementacion de Cliente

```typescript
// grpc/client.ts
import { UserServiceClient } from './generated/user_grpc_pb';

const client = new UserServiceClient('localhost:50051', grpc.credentials.createInsecure());

// Llamada unaria
function getUser(id: string): Promise<User> {
  const request = new GetUserRequest();
  request.setId(id);

  return new Promise((resolve, reject) => {
    client.getUser(request, (err, response) => {
      if (err) reject(err);
      else resolve(response!);
    });
  });
}

// Server streaming
function listUsers(): Promise<User[]> {
  return new Promise((resolve) => {
    const users: User[] = [];
    const stream = client.listUsers(new ListUsersRequest());
    stream.on('data', (user: User) => users.push(user));
    stream.on('end', () => resolve(users));
  });
}
```

### 5. [Interceptor](/patterns/design/chain-of-responsibility-middleware) para Metadata y Deadlines

```typescript
// grpc/interceptor.ts
function authInterceptor(options: grpc.InterceptorOptions, nextCall: grpc.NextCall): grpc.InterceptingCall {
  const requester = new grpc.RequesterBuilder()
    .withStart((metadata, _listener, next) => {
      metadata.add('authorization', 'Bearer token123');
      next(metadata, _listener);
    })
    .build();

  return new grpc.InterceptingCall(nextCall(options), requester);
}

const client = new UserServiceClient('localhost:50051', grpc.credentials.createInsecure(), {
  interceptors: [authInterceptor],
});
```

## Como Funciona

- **Protobuf** define contratos de servicios y schemas de mensajes
- **Generacion de codigo** crea stubs tipados de servidor y cliente desde archivos `.proto`
- **Llamadas unarias** envian un request y reciben un response
- **Server streaming** envia un stream de responses para un unico request
- **Bidirectional streaming** intercambia streams de mensajes en tiempo real
- **HTTP/2** multiplexa requests sobre una unica conexion para eficiencia

## Consideraciones de Produccion

- Usa certificados TLS para comunicacion inter-servicio en produccion
- Implementa health checks con el gRPC Health Checking Protocol
- Usa un service mesh (Istio, Linkerd) para load balancing y mTLS

## Errores Comunes

- Cambiar campos de protobuf sin actualizar todos los clientes de servicio
- No manejar errores de stream y drops de conexion gracefulmente
- Usar gRPC para APIs public-facing donde el soporte de browser es limitado. Consulta [API gRPC](/recipes/api/grpc-api) para alternativas de APIs públicas.

## FAQ

### ¿En qué se diferencia de REST?

gRPC usa protobuf binario sobre HTTP/2, ofreciendo menor latencia y streaming built-in. [REST](/recipes/api/call-rest-api) usa JSON sobre HTTP/1.1 con soporte de cliente más amplio. Los payloads de gRPC son típicamente 3-10x más pequeños que JSON y el parsing es más rápido porque protobuf usa binary encoding con field tags. La multiplexación de HTTP/2 elimina head-of-line blocking, permitiendo múltiples requests concurrentes sobre una única conexión TCP.

### ¿Los browsers pueden llamar gRPC directamente?

No. Los browsers no exponen HTTP/2 trailers ni el framing raw de gRPC. Usa gRPC-Web (via `grpc-web` o `connect-web`) que traduce entre HTTP/1.1 del browser y HTTP/2 del servidor. Alternativamente, provee un [gateway REST](/recipes/api/go-rest-api-gin) via `grpc-gateway` para APIs públicas. gRPC-Web requiere un Envoy proxy o un handler custom en el servidor para traducir el encoding.

### ¿Cómo manejo errores en gRPC?

gRPC usa status codes: `OK (0)`, `CANCELLED (1)`, `UNKNOWN (2)`, `INVALID_ARGUMENT (3)`, `NOT_FOUND (5)`, `ALREADY_EXISTS (6)`, `PERMISSION_DENIED (7)`, `RESOURCE_EXHAUSTED (8)`, `FAILED_PRECONDITION (9)`, `ABORTED (10)`, `UNAVAILABLE (14)`, `UNAUTHENTICATED (16)`. Retorna el status code apropiado con `callback({ code: grpc.status.NOT_FOUND, message: 'User not found' })`. Incluye detalles de error estructurados usando `google.rpc.Status` con `details` para metadata de error machine-readable.

### ¿Cómo implemento deadlines y timeouts?

Setea deadlines en el cliente: `call.setTimeout(5000)` o usa `grpc.Client` con la opción `deadline`. En el servidor, chequea `call.request.getDeadline()` y aborta operaciones long-running antes de que el deadline expire. Propaga deadlines a través de metadata para que los servicios downstream reciban el tiempo restante. Usa interceptors para enforcear un deadline default si el cliente no setea uno. Un default de 5 segundos es razonable para la mayoría de calls internos.

### ¿Cómo versiono schemas de protobuf?

Nunca reuses o renombres field numbers — esto rompe wire compatibility. Para agregar un campo, usa el siguiente field number disponible. Marca campos deprecados con `reserved` para prevenir reuse: `reserved 3, 4; reserved "old_field_name";`. Para breaking changes, crea un nuevo servicio (ej., `UserServiceV2`) o usa `oneof` para migración de campos opcional. Genera client stubs para cada versión y corre ambos servicios durante la migración.

### ¿Cómo testeo servicios gRPC?

Usa `grpcurl` para testing manual: `grpcurl -plaintext -d '{"id":"1"}' localhost:50051 users.UserService/GetUser`. Para tests automatizados, usa `grpc-js` in-process channel para testear handlers sin una conexión TCP real. Mockea los stubs generados con Jest o Vitest. Para tests de integración, startea el servidor en un puerto random y usa un cliente real. Testea métodos de streaming colectando todos los mensajes emitidos y asertando sobre la lista completa.

### ¿Cómo implemento autenticación en gRPC?

Usa interceptors para validar JWT tokens desde metadata: `metadata.get('authorization')`. Para mTLS, configura `grpc.ServerCredentials.createSsl()` con certificados CA. Para auth service-to-service, usa autenticación token-based con tokens de corta duración emitidos por un identity provider. No pases credenciales en message payloads — usa metadata headers para que los interceptors puedan validar antes de la deserialización.

### ¿Cómo monitoreo servicios gRPC?

Usa el gRPC Health Checking Protocol (`grpc.health.v1.Health`) para liveness probes. Exporta métricas con Prometheus usando middleware `grpc-prometheus`: trackea request count, duration histogram, y error rate por método. Distributed tracing con OpenTelemetry agrega spans para cada gRPC call con propagación de metadata. Logea method name, duration, status code, y peer address para cada request.

### ¿Cómo manejo file uploads y downloads con gRPC?

Usa client streaming para uploads: el cliente envía chunks como un stream de mensajes, y el servidor los ensambla. Define un message con un campo `bytes` para chunk data y metadata en el primer mensaje. Para downloads, usa server streaming: el servidor envía chunks de vuelta. Para archivos grandes (>4MB), incrementa el max message size: `grpc.ServerCredentials.createSsl(null, null, null, { 'grpc.max_receive_message_length': 100 * 1024 * 1024 })`. Considera usar HTTP/2 flow control para evitar memory pressure — el servidor debería procesar chunks a medida que llegan, no bufferear el archivo entero. Para archivos muy grandes, usa un chunked transfer pattern con un RPC separado por chunk.

### ¿Cómo versiono schemas de protobuf sin romper clientes?

Usa features de Protobuf edition 3: reserva field numbers para campos removidos (`reserved 5, 6;`) para prevenir reuso. Agrega nuevos campos con defaults sensibles — los clientes viejos ignoran campos desconocidos. Nunca cambies field numbers o types de campos existentes. Para breaking changes (renombrar campos, cambiar types), crea un nuevo servicio o package: `package myservice.v2;`. Usa un nombre de package versionado y rutear clientes al nuevo servicio via gateway. Corre `buf breaking` en CI para detectar breaking changes antes del merge. Documenta migration paths para clientes que actualizan a nuevas versiones.

### ¿Cómo manejo connection pooling y keepalive en gRPC?

gRPC usa conexiones HTTP/2 multiplexed — una sola conexión TCP maneja múltiples RPCs concurrentes. Configura keepalive para detectar conexiones muertas: `grpc.keepalive_time_ms = 30000` (ping cada 30s), `grpc.keepalive_timeout_ms = 10000` (espera 10s para pong). En el servidor, setea `grpc.keepalive_permit_without_calls = 1` para permitir pings cuando no hay RPCs activos. Para connection pooling del lado del cliente, reusa la misma instancia `Client` across requests — no crees un nuevo client por RPC. En Node.js, setea `grpc.max_connection_idle_ms` para cerrar conexiones idle. Monitorea conexiones activas con `grpc.channel.getConnectivityState()`.

### ¿Cómo manejo errors y status codes en gRPC?

Usa gRPC status codes: `OK` (0), `CANCELLED` (1), `INVALID_ARGUMENT` (3), `NOT_FOUND` (5), `ALREADY_EXISTS` (6), `PERMISSION_DENIED` (7), `RESOURCE_EXHAUSTED` (8), `FAILED_PRECONDITION` (9), `UNAVAILABLE` (14). Retorna objetos `Status` con code, description, y metadata: `new Status(Code.NOT_FOUND, 'user not found', metadata)`. No throwes exceptions en handlers — catchéalos y convertilos a gRPC status codes. Usa `RicherError` en Node.js para incluir structured error details via `google.rpc.ErrorInfo`. Mapea HTTP status codes a gRPC codes a nivel del gateway: 200→OK, 400→INVALID_ARGUMENT, 404→NOT_FOUND, 409→ALREADY_EXISTS, 429→RESOURCE_EXHAUSTED, 500→INTERNAL.

### ¿Cómo implemento bidirectional streaming en TypeScript?

Bidirectional streaming permite tanto al cliente como al servidor enviar mensajes simultáneamente. Define el método RPC con `stream` en ambos request y response: `rpc Chat (stream ChatMessage) returns (stream ChatMessage)`. En el server handler, escucha `call.on('data')` para mensajes entrantes y `call.write()` para enviar mensajes de vuelta. Usa `call.on('end')` para detectar cuando el cliente cierra el stream. Para aplicaciones de chat, mantén un map de streams activos keyeado por user ID. Broadcastea mensajes a todos los clientes conectados iterando el map y llamando `write()` en cada stream. Maneja backpressure con el return value de `call.write()` — si retorna `false`, espera el evento `drain` antes de escribir más.

### ¿Cómo uso gRPC con Envoy proxy y grpc-web?

Envoy proxya tráfico gRPC y traduce requests HTTP/1.1 desde navegadores en gRPC calls via grpc-web. Configura Envoy con un gRPC filter: `envoy.filters.http.grpc_web`. Setea la CORS policy en Envoy para permitir orígenes del navegador. Del lado del cliente, usa `@grpc/grpc-web` en lugar de `@grpc/grpc-js`. El step de generación proto usa el plugin `grpc-web`: `protoc --grpc-web_out=import_style=typescript,mode=grpcwebtext`. Maneja binary data con `mode=grpcwebtext` (base64-encoded) para navegadores que no soportan HTTP/2 trailers. Para producción, termina TLS en Envoy y usa mTLS entre Envoy y los backend gRPC services.

### ¿Cómo manejo deadlines y timeouts en gRPC?

Setea deadlines en cada RPC call: `client.GetUser(req, { deadline: Date.now() + 5000 })`. Un deadline es un timestamp absoluto, no una duración. Propaga deadlines a través de interceptor chains para que los downstream calls respeten el timeout del caller. En el servidor, checkea `call.getDeadline()` y cancela operaciones long-running si el deadline se excede. Usa `context.abort(StatusCode.DEADLINE_EXCEEDED, 'deadline exceeded')` para retornar un error. Para streaming RPCs, setea un deadline en el stream entero, no por mensaje. En TypeScript, usa `AbortController` para cancelar RPCs in-flight: `controller.abort()` triggerea `call.cancel()`. Monitorea deadline-exceeded errors para identificar métodos lentos que necesitan optimización.

### ¿Cómo testeo gRPC services en TypeScript?

Usa `grpc-js` in-process channel para unit tests: crea un server en un ephemeral port y conecta un client directamente. Para integration tests, usa `grpcurl` para enviar requests desde la línea de comandos: `grpcurl -plaintext -d '{"id":"123"}' localhost:50051 mypackage.MyService/GetUser`. Mockea el gRPC client en consumer tests usando `jest.mock()` o crea un fake server con `createInsecureServer()`. Testea los cuatro RPC types: unary, server streaming, client streaming, y bidirectional streaming. Verifica error handling retornando status codes específicos. Usa `buf beta conformance` para protocol conformance testing. Genera test fixtures desde proto definitions usando `ts-proto` y `@faker-js/faker`.
