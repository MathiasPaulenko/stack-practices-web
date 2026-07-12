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
  metaDescription: "Build gRPC services with Protocol Buffers in TypeScript. Implement unary, server streaming, client streaming, and bidirectional streaming for high-performance APIs."
  keywords:
    - grpc
    - protocol buffers
    - streaming api
    - typescript
    - high performance




---

# gRPC Services with Protocol Buffers in TypeScript

Build high-performance, language-agnostic APIs using gRPC with Protocol Buffers. The following demonstrates how to service definitions in protobuf, code generation with TypeScript, unary calls, streaming patterns, interceptors for cross-cutting concerns, and health checking for production services.

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

### How is this different from REST?

gRPC uses binary protobuf over HTTP/2, offering lower latency and built-in streaming. [REST](/recipes/api/call-rest-api) uses JSON over HTTP/1.1 with broader client support. gRPC payloads are typically 3-10x smaller than JSON and parsing is faster because protobuf uses binary encoding with field tags. HTTP/2 multiplexing eliminates head-of-line blocking, allowing multiple concurrent requests on a single TCP connection.

### Can browsers call gRPC directly?

No. Browsers do not expose HTTP/2 trailers or the raw gRPC framing. Use gRPC-Web (via `grpc-web` or `connect-web`) which translates between browser HTTP/1.1 and server HTTP/2. Alternatively, provide a [REST gateway](/recipes/api/go-rest-api-gin) via `grpc-gateway` for public APIs. gRPC-Web requires an Envoy proxy or a custom handler on the server to translate the encoding.

### How do I handle errors in gRPC?

gRPC uses status codes: `OK (0)`, `CANCELLED (1)`, `UNKNOWN (2)`, `INVALID_ARGUMENT (3)`, `NOT_FOUND (5)`, `ALREADY_EXISTS (6)`, `PERMISSION_DENIED (7)`, `RESOURCE_EXHAUSTED (8)`, `FAILED_PRECONDITION (9)`, `ABORTED (10)`, `UNAVAILABLE (14)`, `UNAUTHENTICATED (16)`. Return the appropriate status code with `callback({ code: grpc.status.NOT_FOUND, message: 'User not found' })`. Include structured error details using `google.rpc.Status` with `details` for machine-readable error metadata.

### How do I implement deadlines and timeouts?

Set deadlines on the client: `call.setTimeout(5000)` or use `grpc.Client` with `deadline` option. On the server, check `call.request.getDeadline()` and abort long-running operations before the deadline expires. Propagate deadlines through metadata so downstream services receive the remaining time. Use interceptors to enforce a default deadline if the client does not set one. A 5-second default is reasonable for most internal calls.

### How do I version protobuf schemas?

Never reuse or rename field numbers — this breaks wire compatibility. To add a field, use the next available field number. Mark deprecated fields with `reserved` to prevent reuse: `reserved 3, 4; reserved "old_field_name";`. For breaking changes, create a new service (e.g., `UserServiceV2`) or use `oneof` for optional field migration. Generate client stubs for each version and run both services during migration.

### How do I test gRPC services?

Use `grpcurl` for manual testing: `grpcurl -plaintext -d '{"id":"1"}' localhost:50051 users.UserService/GetUser`. For automated tests, use `grpc-js` in-process channel to test handlers without a real TCP connection. Mock the generated stubs with Jest or Vitest. For integration tests, start the server on a random port and use a real client. Test streaming methods by collecting all emitted messages and asserting on the full list.

### How do I implement authentication in gRPC?

Use interceptors to validate JWT tokens from metadata: `metadata.get('authorization')`. For mTLS, configure `grpc.ServerCredentials.createSsl()` with CA certificates. For service-to-service auth, use token-based authentication with short-lived tokens issued by an identity provider. Do not pass credentials in message payloads — use metadata headers so interceptors can validate before deserialization.

### How do I monitor gRPC services?

Use the gRPC Health Checking Protocol (`grpc.health.v1.Health`) for liveness probes. Export metrics with Prometheus using `grpc-prometheus` middleware: track request count, duration histogram, and error rate by method. Distributed tracing with OpenTelemetry adds spans for each gRPC call with metadata propagation. Log method name, duration, status code, and peer address for each request.

### How do I handle file uploads and downloads with gRPC?

Use client streaming for uploads: the client sends chunks as a stream of messages, and the server assembles them. Define a message with a `bytes` field for chunk data and metadata in the first message. For downloads, use server streaming: the server sends chunks back. For large files (>4MB), increase the max message size: `grpc.ServerCredentials.createSsl(null, null, null, { 'grpc.max_receive_message_length': 100 * 1024 * 1024 })`. Consider using HTTP/2 flow control to avoid memory pressure — the server should process chunks as they arrive, not buffer the entire file. For very large files, use a chunked transfer pattern with a separate RPC per chunk.

### How do I version protobuf schemas without breaking clients?

Use Protobuf edition 3 features: reserve field numbers for removed fields (`reserved 5, 6;`) to prevent reuse. Add new fields with sensible defaults — old clients ignore unknown fields. Never change field numbers or types of existing fields. For breaking changes (renaming fields, changing types), create a new service or package: `package myservice.v2;`. Use a versioned package name and route clients to the new service via a gateway. Run `buf breaking` in CI to detect breaking changes before merge. Document migration paths for clients upgrading to new versions.

### How do I handle connection pooling and keepalive in gRPC?

gRPC uses HTTP/2 multiplexed connections — a single TCP connection handles multiple concurrent RPCs. Configure keepalive to detect dead connections: `grpc.keepalive_time_ms = 30000` (ping every 30s), `grpc.keepalive_timeout_ms = 10000` (wait 10s for pong). On the server, set `grpc.keepalive_permit_without_calls = 1` to allow pings when no RPCs are active. For client-side connection pooling, reuse the same `Client` instance across requests — do not create a new client per RPC. In Node.js, set `grpc.max_connection_idle_ms` to close idle connections. Monitor active connections with `grpc.channel.getConnectivityState()`.

### How do I handle errors and status codes in gRPC?

Use gRPC status codes: `OK` (0), `CANCELLED` (1), `INVALID_ARGUMENT` (3), `NOT_FOUND` (5), `ALREADY_EXISTS` (6), `PERMISSION_DENIED` (7), `RESOURCE_EXHAUSTED` (8), `FAILED_PRECONDITION` (9), `UNAVAILABLE` (14). Return `Status` objects with code, description, and metadata: `new Status(Code.NOT_FOUND, 'user not found', metadata)`. Do not throw exceptions in handlers — catch them and convert to gRPC status codes. Use `RicherError` in Node.js to include structured error details via `google.rpc.ErrorInfo`. Map HTTP status codes to gRPC codes at the gateway level: 200→OK, 400→INVALID_ARGUMENT, 404→NOT_FOUND, 409→ALREADY_EXISTS, 429→RESOURCE_EXHAUSTED, 500→INTERNAL.

### How do I implement bidirectional streaming in TypeScript?

Bidirectional streaming allows both client and server to send messages simultaneously. Define the RPC method with `stream` on both request and response: `rpc Chat (stream ChatMessage) returns (stream ChatMessage)`. In the server handler, listen to `call.on('data')` for incoming messages and `call.write()` to send messages back. Use `call.on('end')` to detect when the client closes the stream. For chat applications, maintain a map of active streams keyed by user ID. Broadcast messages to all connected clients by iterating the map and calling `write()` on each stream. Handle backpressure with `call.write()` return value — if it returns `false`, wait for the `drain` event before writing more.

### How do I use gRPC with Envoy proxy and grpc-web?

Envoy proxies gRPC traffic and translates HTTP/1.1 requests from browsers into gRPC calls via grpc-web. Configure Envoy with a gRPC filter: `envoy.filters.http.grpc_web`. Set the CORS policy in Envoy to allow browser origins. On the client side, use `@grpc/grpc-web` instead of `@grpc/grpc-js`. The proto generation step uses `grpc-web` plugin: `protoc --grpc-web_out=import_style=typescript,mode=grpcwebtext`. Handle binary data with `mode=grpcwebtext` (base64-encoded) for browsers that do not support HTTP/2 trailers. For production, terminate TLS at Envoy and use mTLS between Envoy and backend gRPC services.

### How do I handle deadlines and timeouts in gRPC?

Set deadlines on every RPC call: `client.GetUser(req, { deadline: Date.now() + 5000 })`. A deadline is an absolute timestamp, not a duration. Propagate deadlines through interceptor chains so downstream calls respect the caller's timeout. On the server, check `call.getDeadline()` and cancel long-running operations if the deadline is exceeded. Use `context.abort(StatusCode.DEADLINE_EXCEEDED, 'deadline exceeded')` to return an error. For streaming RPCs, set a deadline on the entire stream, not per message. In TypeScript, use `AbortController` to cancel in-flight RPCs: `controller.abort()` triggers `call.cancel()`. Monitor deadline-exceeded errors to identify slow methods that need optimization.

### How do I test gRPC services in TypeScript?

Use `grpc-js` in-process channel for unit tests: create a server on an ephemeral port and connect a client directly. For integration tests, use `grpcurl` to send requests from the command line: `grpcurl -plaintext -d '{"id":"123"}' localhost:50051 mypackage.MyService/GetUser`. Mock the gRPC client in consumer tests using `jest.mock()` or create a fake server with `createInsecureServer()`. Test all four RPC types: unary, server streaming, client streaming, and bidirectional streaming. Verify error handling by returning specific status codes. Use `buf beta conformance` for protocol conformance testing. Generate test fixtures from proto definitions using `ts-proto` and `@faker-js/faker`.
