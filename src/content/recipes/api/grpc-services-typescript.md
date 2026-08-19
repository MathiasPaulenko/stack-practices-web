---
contentType: recipes
slug: grpc-services-typescript
title: "Build gRPC Services in TypeScript with Protocol Buffers"
description: "Build gRPC services in TypeScript with Protocol Buffers. Covers unary, server streaming, bidirectional streaming, interceptors, and health checks."
metaDescription: "Build gRPC services in TypeScript with Protocol Buffers. Step-by-step examples for unary, streaming, interceptors, and production-ready health checks."
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
  metaDescription: "Build gRPC services in TypeScript with Protocol Buffers. Step-by-step examples for unary, streaming, interceptors, and production-ready health checks."
  keywords:
    - grpc
    - protocol buffers
    - typescript
    - streaming api
    - microservices
    - protobuf
---

## Overview

REST with JSON is easy to debug, but it pays for that convenience in payload size
and parsing time. gRPC moves the contract into a `.proto` file, compiles it into
typed TypeScript, and ships messages as compact binary over a single HTTP/2
connection. You get lower latency, less bandwidth, and streaming built in from
the start.

This recipe shows how to define a service in Protocol Buffers, generate code for
Node.js, and implement a server and client that cover all four gRPC call types.

## When to Use

- You need fast, high-volume traffic between internal
  [microservices](/patterns/ambassador-pattern-services/). See
  [REST API Design](/recipes/rest-api-design/) if you're still choosing a
  protocol.
- You want typed contracts and don't want to write client and server stubs by
  hand.
- You need to move logs, events, file chunks, or chat messages as a stream.
- You're running [gRPC APIs](/recipes/grpc-api/) behind a gateway or service mesh.

### When to avoid

- The API is public-facing and must be called directly from browsers. Use
  gRPC-Web or a REST gateway instead.
- You need human-readable payloads that you can debug or share with third
  parties. JSON
  over HTTP is still the safer default there.
- Your stack lacks good gRPC tooling in the language you need.

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

Add a script to `package.json`:

```bash
"proto:generate": "grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:./generated \
  --grpc_out=grpc_js:./generated \
  --ts_out=grpc_js:./generated \
  --proto_path=./proto \
  ./proto/*.proto"
```

Run `npm run proto:generate` to create the typed server and client stubs.

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
import * as grpc from '@grpc/grpc-js';
import { UserServiceClient } from './generated/user_grpc_pb';
import { GetUserRequest, ListUsersRequest, ChatMessage } from './generated/user_pb';

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

### 5. Interceptor for Metadata and Deadlines

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

## Explanation

- **Unary calls** send one request and wait for one response. They map cleanly
  to a traditional request/response API. They map cleanly to
  a traditional request/response API.
- **Server streaming** starts with one request; the server then keeps sending
  messages. The client reads until the server closes the stream with `end()`.
- **Client streaming** sends many messages from the client; the server responds
  once after the stream ends. Use it for uploads or batch inserts.
- **Bidirectional streaming** lets client and server write and read at the same
  time. It works well for chat, real-time games, or event pipelines.
- All of these ride over a single TCP connection with HTTP/2, so concurrent
  calls share the same overhead.
- **Code generation** removes hand-written JSON parsing. The `.proto` file is the
  source of truth; TypeScript types stay in sync automatically.

## Variants

Each call type fits a different shape of work, summarized in the table.

| Call type | Use case | Key API |
| --- | --- | --- |
| Unary | Single request/response | `client.getUser(req, callback)` |
| Server streaming | Logs, events, search results | `stream.on('data', ...)` |
| Client streaming | File uploads, batch inserts | `stream.write(req)` then `stream.end()` |
| Bidirectional streaming | Chat, real-time collaboration | `call.on('data')` and `call.write()` |

## Best Practices

- Use TLS for inter-service gRPC in production. Only use `createInsecure()` on
  your own machine.
- Set an absolute deadline on every call. Propagate them through metadata so downstream
  services don't waste time on expired work.
- Keep the `.proto` file in a shared repository or package so clients and servers
  always generate from the same contract.
- Use `reserved` for removed fields so old field numbers aren't accidentally
  reused.
- Add the gRPC Health Checking Protocol so orchestration tools can run liveness
  and readiness probes.
- Run `buf breaking` in CI to catch wire-incompatible `.proto` changes before they
  merge.

## Common Mistakes

- Changing a field number or type in a `.proto` file after it's shipped. That
  breaks wire compatibility for existing clients.
- Forgetting to handle `error`, `end`, and `cancelled` events on streams. A
  dropped connection can crash the process or leak memory.
- Calling gRPC straight from a browser. Browsers can't read HTTP/2 trailers, so
  use gRPC-Web or a REST gateway instead.
- Creating a fresh client for each request. Reuse the same client so HTTP/2
  carries several calls at once.
- Returning plain exceptions from handlers. Always convert them to gRPC status
  codes so clients can react consistently.

## FAQ

### How is this different from REST?

REST sends JSON over HTTP/1.1 and is easy to read in the browser. gRPC uses
binary protobuf over HTTP/2, which is smaller, faster to parse, and supports
streaming out of the box. For a public API, REST is still the safer default.

### Can browsers call gRPC directly?

No. Browsers can't read gRPC's HTTP/2 trailers. Use gRPC-Web with Envoy, or add
a REST gateway with `grpc-gateway` for browser clients.

### How do I handle errors and status codes?

Return a gRPC status code such as `NOT_FOUND`, `INVALID_ARGUMENT`, or
`UNAVAILABLE`. Don't throw raw exceptions; wrap them in a gRPC status before
sending the callback.

### How do I implement deadlines and timeouts?

Set an absolute deadline on the client: `client.getUser(req, { deadline: Date.now() + 5000 }, callback)`.
Propagate it through metadata and check it on the server. Cancel long-running
work before the deadline runs out.

### How do I version protobuf schemas?

Once a field number is in use, leave it alone. Add new fields with the next
available number. Mark removed fields with `reserved` so old numbers can't be
reused.
For breaking changes, create a new package or service, such as `users.v2`.

### How do I test gRPC services?

Use the in-process channel from `@grpc/grpc-js` to call handlers without a real
TCP socket. For integration tests, start the server on an open port and test it with a real
client. For manual checks, `grpcurl` is the fastest way to fire a
request.
