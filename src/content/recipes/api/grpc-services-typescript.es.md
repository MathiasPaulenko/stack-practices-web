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
  - grpc
  - api
  - microservices
  - protocol-buffers
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /patterns/design/ambassador-pattern-services
  - /guides/api-design-guide
lastUpdated: "2026-06-18"
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

- Comunicacion de baja latencia y alto throughput entre microservicios internos
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
- Usar gRPC para APIs public-facing donde el soporte de browser es limitado

## FAQ

**P: En que se diferencia de REST?**
R: gRPC usa protobuf binario sobre HTTP/2, ofreciendo menor latencia y streaming built-in. REST usa JSON sobre HTTP/1.1 con soporte de cliente mas amplio.

**P: Los browsers pueden llamar gRPC directamente?**
R: No. Usa gRPC-Web para clientes de browser, o provee un gateway REST via grpc-gateway para APIs publicas.
