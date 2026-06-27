---
contentType: recipes
slug: grpc-services-typescript
title: "gRPC Services with Protocol Buffers in TypeScript"
description: "Build high-performance, strongly-typed services using gRPC with Protocol Buffers, covering unary calls, server streaming, client streaming, and bidirectional streaming"
metaDescription: "Build gRPC services with Protocol Buffers in TypeScript. Implement unary, server streaming, client streaming, and bidirectional streaming for high-performance APIs."
difficulty: intermediate
topics:
  - api
  - devops
tags:
  - api
  - microservices
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /patterns/design/ambassador-pattern-services
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build gRPC services with Protocol Buffers in TypeScript. Implement unary, server streaming, client streaming, and bidirectional streaming for high-performance APIs."
  keywords:
    - grpc
    - protocol buffers
    - streaming api
    - typescript
    - high performance
---

# gRPC Services with Protocol Buffers in TypeScript

Build high-performance, language-agnostic APIs using gRPC with Protocol Buffers. This recipe covers service definitions in protobuf, code generation with TypeScript, unary calls, streaming patterns, interceptors for cross-cutting concerns, and health checking for production services.

## When to Use This

- Low-latency, high-throughput communication between internal [microservices](/patterns/design/ambassador-pattern-services)
- You need strongly-typed contracts with automatic code generation
- Streaming data (logs, events, file uploads) must be handled efficiently

## Solution

### 1. Protocol Buffer Definition

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

### 2. Code Generation

```bash
# package.json script
"proto:generate": "grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:./generated \
  --grpc_out=grpc_js:./generated \
  --ts_out=grpc_js:./generated \
  --proto_path=./proto \
  ./proto/*.proto"
```

### 3. Server Implementation

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

### 4. Client Implementation

```typescript
// grpc/client.ts
import { UserServiceClient } from './generated/user_grpc_pb';

const client = new UserServiceClient('localhost:50051', grpc.credentials.createInsecure());

// Unary call
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

### 5. [Interceptor](/patterns/design/chain-of-responsibility-middleware) for Metadata and Deadlines

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

## How It Works

- **Protobuf** defines service contracts and message schemas
- **Code generation** creates typed server and client stubs from `.proto` files
- **Unary calls** send one request and receive one response
- **Server streaming** sends a stream of responses for a single request
- **Bidirectional streaming** exchanges streams of messages in real time
- **HTTP/2** multiplexes requests over a single connection for efficiency

## Production Considerations

- Use TLS certificates for inter-service communication in production
- Implement health checks with the gRPC Health Checking Protocol
- Use a service mesh (Istio, Linkerd) for load balancing and mTLS

## Common Mistakes

- Changing protobuf fields without updating all service clients
- Not handling stream errors and connection drops gracefully
- Using gRPC for public-facing APIs where browser support is limited. See [gRPC API](/recipes/api/grpc-api) for public API alternatives.

## FAQ

**Q: How is this different from REST?**
A: gRPC uses binary protobuf over HTTP/2, offering lower latency and built-in streaming. [REST](/recipes/api/call-rest-api) uses JSON over HTTP/1.1 with broader client support.

**Q: Can browsers call gRPC directly?**
A: No. Use gRPC-Web for browser clients, or provide a [REST gateway](/recipes/api/go-rest-api-gin) via grpc-gateway for public APIs.
