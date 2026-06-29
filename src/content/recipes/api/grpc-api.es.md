---
contentType: recipes
slug: grpc-api
title: "Implementar una API gRPC con Protocol Buffers"
description: "Cómo implementar una API gRPC usando Protocol Buffers para comunicación de alto rendimiento entre servicios"
metaDescription: "Implementa una API gRPC con Protocol Buffers. Construye servicios de alto rendimiento en Python, Node.js y Java con streaming e interceptores."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - microservices
relatedResources:
  - /recipes/server-sent-events
  - /docs/api-documentation
  - /guides/rest-api-design-guide
  - /recipes/api-versioning
  - /recipes/call-rest-api
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa una API gRPC con Protocol Buffers. Construye servicios de alto rendimiento en Python, Node.js y Java con streaming e interceptores."
  keywords:
    - grpc
    - protobuf
    - api
    - rpc
    - microservicios
    - streaming
    - interceptor
---
## Visión General

gRPC es un framework RPC de alto rendimiento que usa Protocol Buffers para serialización y HTTP/2 para transporte. Es significativamente más rápido que REST para comunicación entre servicios, soporta streaming bidireccional y genera stubs de cliente/servidor desde una sola definición de esquema. Esta receta cubre definir un archivo `.proto`, implementar servicios unarios y de streaming, y agregar interceptores para preocupaciones transversales.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas comunicación de baja latencia y fuertemente tipada entre servicios
- Tu arquitectura depende de streaming (push del servidor, push del cliente o bidireccional)
- Quieres generación automática de bibliotecas cliente en múltiples lenguajes
- Estás construyendo [microservicios](/patterns/design/ambassador-pattern-services) donde el overhead de parsing JSON es un cuello de botella

## Solución

### Python

```python
# service.proto
# syntax = "proto3";
# message HelloRequest { string name = 1; }
# message HelloResponse { string message = 1; }
# service Greeter {
#   rpc SayHello (HelloRequest) returns (HelloResponse);
# }

import grpc
from concurrent import futures
import service_pb2
import service_pb2_grpc

class GreeterServicer(service_pb2_grpc.GreeterServicer):
    def SayHello(self, request, context):
        return service_pb2.HelloResponse(
            message=f"Hello, {request.name}!"
        )

    def StreamGreetings(self, request_iterator, context):
        for req in request_iterator:
            yield service_pb2.HelloResponse(message=f"Streamed: {req.name}")

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    service_pb2_grpc.add_GreeterServicer_to_server(GreeterServicer(), server)
    server.add_insecure_port("[::]:50051")
    server.start()
    server.wait_for_termination()

# Cliente
channel = grpc.insecure_channel("localhost:50051")
stub = service_pb2_grpc.GreeterStub(channel)
response = stub.SayHello(service_pb2.HelloRequest(name="World"))
print(response.message)
```

### JavaScript

```javascript
// Servidor (Node.js con @grpc/grpc-js)
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync('service.proto');
const proto = grpc.loadPackageDefinition(packageDefinition).greeter;

function sayHello(call, callback) {
  callback(null, { message: `Hello, ${call.request.name}` });
}

function streamGreetings(call) {
  call.on('data', (req) => {
    call.write({ message: `Streamed: ${req.name}` });
  });
  call.on('end', () => call.end());
}

const server = new grpc.Server();
server.addService(proto.Greeter.service, { sayHello, streamGreetings });
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  server.start();
});

// Cliente
const client = new proto.Greeter('localhost:50051', grpc.credentials.createInsecure());
client.sayHello({ name: 'World' }, (err, response) => {
  console.log(response.message);
});
```

### Java

```java
// Definición de servicio + servidor
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.stub.StreamObserver;

public class GreeterServer {
    public static void main(String[] args) throws Exception {
        Server server = ServerBuilder.forPort(50051)
            .addService(new GreeterImpl())
            .build()
            .start();
        server.awaitTermination();
    }

    static class GreeterImpl extends GreeterGrpc.GreeterImplBase {
        @Override
        public void sayHello(HelloRequest req, StreamObserver<HelloResponse> responseObserver) {
            HelloResponse reply = HelloResponse.newBuilder()
                .setMessage("Hello, " + req.getName())
                .build();
            responseObserver.onNext(reply);
            responseObserver.onCompleted();
        }
    }
}

// Cliente
ManagedChannel channel = ManagedChannelBuilder.forAddress("localhost", 50051)
    .usePlaintext()
    .build();
GreeterGrpc.GreeterBlockingStub stub = GreeterGrpc.newBlockingStub(channel);
HelloResponse response = stub.sayHello(HelloRequest.newBuilder().setName("World").build());
System.out.println(response.getMessage());
channel.shutdown();
```

## Explicación

Los flujos de trabajo gRPC son contract-first: defines un esquema `.proto`, luego generas código para cualquier lenguaje soportado. El código generado maneja serialización (formato binario Protocol Buffers), transporte por cable (HTTP/2) y stubs de cliente/servidor.

**RPC unario**: una petición, una respuesta. Modo más simple; equivalente a un POST REST.
**Streaming del servidor**: una petición, muchas respuestas. Útil para feeds en vivo o resultados paginados.
**Streaming del cliente**: muchas peticiones, una respuesta. Útil para cargas por lotes.
**Streaming bidireccional**: ambos lados transmiten independientemente. Ideal para chat o colaboración en tiempo real.

**Compromisos:**
- gRPC es más rápido que REST pero requiere soporte HTTP/2 y herramientas `.proto`
- Clientes de navegador necesitan un proxy gRPC-Web (Envoy, grpcwebproxy)
- Depurar es más difícil que JSON porque los payloads son binarios

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Python | `grpcio` + `grpcio-tools` | Maduro, servidor con threads; soporte asyncio vía `grpc.aio` |
| Node.js | `@grpc/grpc-js` | JavaScript puro, sin dependencias nativas; soporta todos los modos de streaming |
| Java | `io.grpc` (transporte Netty) | Alto rendimiento; se integra con Spring Boot vía `grpc-spring-boot-starter` |
| Go | `google.golang.org/grpc` | Soporte de primera clase; rendimiento más rápido en benchmarks |
| Rust | `tonic` | Primero async con Tokio; excelente rendimiento |

## Lo que Funciona

1. Versiona tus archivos `.proto` y nunca elimines o renumeroes campos existentes
2. Usa interceptores ([middleware](/patterns/design/chain-of-responsibility-middleware)) para preocupaciones transversales: auth, logging, reintentos
3. Establece deadlines/timeouts en cada llamada RPC para prevenir bloqueos en cascada
4. Usa health checks `grpc.health.v1` para probes de readiness de Kubernetes
5. Mantén los mensajes pequeños (<1 MB); usa streaming o almacenes de objetos separados para payloads grandes

## Errores Comunes

1. **Cambiar números de campo** — esto rompe compatibilidad binaria; siempre agrega nuevos campos con nuevos números
2. **Sin timeouts** — las llamadas gRPC por defecto esperan para siempre; siempre establece un deadline
3. **Bloquear el event loop** — en Node.js, los callbacks gRPC no deben bloquear; usa patrones async
4. **Ignorar flow control de HTTP/2** — transmitir demasiado rápido puede bloquear; el backpressure es tu amigo
5. **Sin balanceo de carga** — las conexiones gRPC son persistentes; usa LB del lado del cliente o un service mesh

## Preguntas Frecuentes

### ¿Puedo usar gRPC desde un navegador?

No directamente. Los navegadores no pueden hablar HTTP/2 gRPC en crudo. Usa gRPC-Web con un proxy (Envoy) o cambia a Connect-RPC, que soporta tanto gRPC como HTTP/1.1 JSON estándar.

### ¿Debería reemplazar todas mis APIs REST con gRPC?

No. gRPC sobresale en microservicios internos. Para APIs públicas y clientes de navegador, [REST](/recipes/api/call-rest-api) o [GraphQL](/recipes/api/graphql-api) suelen ser mejores opciones debido a herramientas más amplias y depuración más fácil.

### ¿Cómo manejo autenticación?

Los metadatos gRPC (headers) transportan tokens. Adjunta un interceptor en el cliente para inyectar metadatos `authorization`, y en el servidor para validarlos. Consulta [Checklist de Seguridad de APIs](/guides/security/api-security-checklist-guide) para patrones de autenticación. Los patrones estándar de JWT o API key funcionan sin cambios.
