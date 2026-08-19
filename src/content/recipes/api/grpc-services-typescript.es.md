---
contentType: recipes
slug: grpc-services-typescript
title: "Construye servicios gRPC en TypeScript con Protocol Buffers"
description: "Construye servicios gRPC en TypeScript con Protocol Buffers. Cubre llamadas unarias, streaming, streaming bidireccional, interceptors y health checks."
metaDescription: "Construye servicios gRPC en TypeScript con Protocol Buffers. Ejemplos paso a paso para llamadas unarias, streaming, interceptors y health checks en producción."
difficulty: intermediate
topics:
  - api
  - devops
tags:
  - api
  - grpc
  - protocol-buffers
  - typescript
  - microservices
  - streaming
relatedResources:
  - /recipes/go-rest-api-gin
  - /recipes/grpc-api
  - /recipes/rest-api-design
  - /recipes/api-versioning
  - /patterns/chain-of-responsibility-middleware
  - /patterns/ambassador-pattern-services
lastUpdated: "2026-08-19"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Construye servicios gRPC en TypeScript con Protocol Buffers. Ejemplos paso a paso para llamadas unarias, streaming, interceptors y health checks en producción."
  keywords:
    - grpc
    - protocol buffers
    - typescript
    - streaming api
    - microservices
    - protobuf
---

## Overview

REST con JSON es fácil de debuggear, pero paga ese precio en tamaño de payload y
tiempo de parseo. gRPC mueve el contrato a un archivo `.proto`, lo compila a
TypeScript tipado y envía mensajes binarios compactos por una única conexión
HTTP/2. El resultado es menor latencia, menos ancho de banda y streaming incluido
desde el principio.

Esta receta muestra cómo definir un servicio en Protocol Buffers, generar código
para Node.js e implementar un servidor y cliente que cubren los cuatro tipos de
llamadas gRPC.

## Cuándo Usar

- Necesitás comunicación de baja latencia y alto throughput entre
  [microservicios](/patterns/ambassador-pattern-services/) internos. Si todavía
  estás eligiendo protocolo, mirá [REST API Design](/recipes/rest-api-design/).
- Querés contratos fuertemente tipados con generación automática de código de
  cliente y servidor.
- Estás construyendo APIs de streaming para logs, eventos, uploads de archivos o
  chat.
- Estás corriendo [APIs gRPC](/recipes/grpc-api/) detrás de un gateway o service
  mesh.

### Cuándo evitarlo

- La API es pública y debe ser llamada directamente desde navegadores. Usá
  gRPC-Web o un gateway REST en su lugar.
- Necesitás payloads legibles para humanos para debugging o integración de
  terceros. JSON sobre HTTP sigue siendo el default más seguro.
- Tu stack no tiene buenas herramientas de gRPC en el lenguaje que necesitás.

## Solución

### 1. Definición de Protocol Buffer

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

### 2. Generación de Código

Agregá un script a `package.json`:

```bash
"proto:generate": "grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:./generated \
  --grpc_out=grpc_js:./generated \
  --ts_out=grpc_js:./generated \
  --proto_path=./proto \
  ./proto/*.proto"
```

Ejecutá `npm run proto:generate` para crear los stubs tipados de servidor y
cliente.

### 3. Implementación del Servidor

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

### 4. Implementación del Cliente

```typescript
// grpc/client.ts
import * as grpc from '@grpc/grpc-js';
import { UserServiceClient } from './generated/user_grpc_pb';
import { GetUserRequest, ListUsersRequest, ChatMessage } from './generated/user_pb';

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

// Client streaming
function createUsers(names: string[]): Promise<UserList> {
  return new Promise((resolve, reject) => {
    const stream = client.createUsers((err, list) => {
      if (err) reject(err);
      else resolve(list!);
    });
    names.forEach((name) => {
      const req = new CreateUserRequest();
      req.setName(name);
      stream.write(req);
    });
    stream.end();
  });
}

// Bidirectional streaming
function chat() {
  const stream = client.chat();
  stream.on('data', (msg: ChatMessage) => console.log(msg.getContent()));

  const message = new ChatMessage();
  message.setUserId('client');
  message.setContent('Hello');
  message.setTimestamp(Date.now());
  stream.write(message);
}
```

### 5. Interceptor para Metadata y Deadlines

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

## Explicación

- Las **llamadas unarias** envían un request y esperan un response. Se mapean
  limpiamente a una API request/response tradicional.
- El **server streaming** devuelve un stream de mensajes para un único request.
  El cliente lee hasta que el servidor llama `end()`.
- El **client streaming** envía muchos mensajes desde el cliente; el servidor
  responde una vez que termina el stream. Usalo para uploads o inserts en batch.
- El **streaming bidireccional** mantiene a ambos lados escribiendo y leyendo al
  mismo tiempo. Es el ajuste correcto para chat, juegos en tiempo real o
  pipelines de eventos.
- **HTTP/2** transporta todo esto sobre una única conexión TCP, así que las
  llamadas en paralelo comparten el mismo overhead.
- La **generación de código** elimina el parseo de JSON a mano. El archivo
  `.proto` es la fuente de verdad; los tipos de TypeScript se mantienen
  sincronizados automáticamente.

## Variantes

La tabla empareja cada tipo de llamada con un caso de uso común.

| Tipo de llamada | Caso de uso | API clave |
| --- | --- | --- |
| Unaria | Request/response simple | `client.getUser(req, callback)` |
| Server streaming | Logs, eventos, resultados de búsqueda | `stream.on('data', ...)` |
| Client streaming | Uploads de archivos, inserts en batch | `stream.write(req)` y `stream.end()` |
| Bidireccional | Chat, colaboración en tiempo real | `call.on('data')` y `call.write()` |

## Mejores Prácticas

- Usá TLS para gRPC entre servicios en producción. `createInsecure()` es solo
  para desarrollo local.
- Seteá deadlines en cada llamada. Propagalos a través de metadata para que los
  servicios downstream no desperdicien tiempo en trabajo expirado.
- Guardá el archivo `.proto` en un repositorio o paquete compartido para que
  clientes y servidores generen desde el mismo contrato.
- Usá `reserved` para campos removidos y evitar reusar viejos field numbers.
- Implementá el gRPC Health Checking Protocol para liveness y readiness probes.
- Corré `buf breaking` en CI para detectar cambios wire-incompatibles en `.proto`
  antes del merge.

## Errores Comunes

- Cambiar un field number o tipo en un `.proto` después de publicarlo. Eso rompe
  la compatibilidad de wire para clientes existentes.
- Olvidarse de manejar los eventos `error`, `end` y `cancelled` en streams. Una
  conexión caída puede crashear el proceso o generar memory leaks.
- Usar gRPC directamente desde un navegador. Los navegadores no pueden leer
  trailers de HTTP/2, así que usá gRPC-Web o un gateway REST.
- Crear un cliente nuevo por cada request. Reusá el mismo cliente así HTTP/2
  lleva varias llamadas a la vez.
- Devolver excepciones planas desde los handlers. Convertilas siempre a status
  codes de gRPC para que los clientes reaccionen de forma consistente.

## FAQ

### ¿En qué se diferencia de REST?

REST usa JSON sobre HTTP/1.1 y es fácil de inspeccionar. gRPC usa protobuf
binario sobre HTTP/2, que es más pequeño, más rápido de parsear y soporta
streaming de fábrica. Para una API pública, REST sigue siendo el default más
seguro.

### ¿Los navegadores pueden llamar gRPC directamente?

No. Los navegadores no pueden leer los trailers de HTTP/2 de gRPC. Usá gRPC-Web
con un proxy como Envoy, o agregá un gateway REST con `grpc-gateway` para
clientes browser.

### ¿Cómo manejo errores y status codes?

Devolvé uno de los status codes de gRPC, como `NOT_FOUND`,
`INVALID_ARGUMENT` o `UNAVAILABLE`. No tires excepciones crudas; envolvelas en un
status de gRPC antes de enviar el callback.

### ¿Cómo implemento deadlines y timeouts?

Seteá un deadline absoluto en el cliente:
`client.getUser(req, { deadline: Date.now() + 5000 }, callback)`.
Propagalo a través de metadata y controlalo en el servidor. Cancelá trabajo
largo antes de que expire el deadline.

### ¿Cómo versiono schemas de protobuf?

Nunca cambies field numbers o tipos existentes. Agregá nuevos campos con el
próximo número disponible. Marcá campos removidos con `reserved` para evitar
reusarlos. Para breaking changes, creá un nuevo package o servicio, como
`users.v2`.

### ¿Cómo testeo servicios gRPC?

Usá el in-process channel de `@grpc/grpc-js` para llamar handlers sin un socket
TCP real. Para tests de integración, levantá el servidor en un puerto random y
usá un cliente real. Para pruebas manuales, `grpcurl` es la forma más rápida de
enviar un request.
