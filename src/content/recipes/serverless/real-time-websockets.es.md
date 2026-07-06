---
contentType: recipes
slug: real-time-websockets
title: "Construir APIs en Tiempo Real con WebSockets en Serverless"
description: "Cómo implementar comunicación bidireccional en tiempo real usando WebSockets con AWS API Gateway, Lambda, DynamoDB y lo que funciona en gestión de conexiones."
metaDescription: "Aprende a construir APIs en tiempo real con WebSockets en serverless. Implementa comunicación bidireccional con API Gateway, Lambda, DynamoDB y gestión de conexiones."
difficulty: advanced
topics:
  - serverless
tags:
  - serverless
  - websockets
  - tiempo-real
  - aws-lambda
  - functions
relatedResources:
  - /recipes/serverless-api-gateway
  - /recipes/event-driven-functions
  - /recipes/scheduled-jobs
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a construir APIs en tiempo real con WebSockets en serverless. Implementa comunicación bidireccional con API Gateway, Lambda, DynamoDB y gestión de conexiones."
  keywords:
    - websockets serverless
    - api tiempo real
    - api gateway websockets
    - lambda websockets
    - comunicacion bidireccional
---

## Visión general

Los ciclos tradicionales de petición-respuesta HTTP son insuficientes para aplicaciones que requieren actualizaciones en vivo — salas de chat, dashboards en tiempo real, juegos multijugador, tickers de acciones y edición colaborativa. Los WebSockets proporcionan una conexión TCP persistente y bidireccional entre cliente y servidor, permitiendo que los mensajes fluyan en ambas direcciones sin la sobrecarga de handshakes repetidos.

En arquitecturas serverless, los WebSockets requieren gestión de estado de conexión porque las funciones Lambda son efímeras. AWS API Gateway WebSocket API maneja la capa de protocolo WebSocket, mientras que una tabla DynamoDB rastrea las conexiones activas. Las funciones Lambda procesan `$connect`, `$disconnect` y rutas personalizadas, transmitiendo mensajes a los IDs de conexión destino. A continuacion se cubre la implementación completa desde la infraestructura hasta el código cliente.

## Cuándo usarlo

Usa esta receta cuando:

- Construyas aplicaciones de chat, notificaciones en vivo o feeds en tiempo real. Consulta [Serverless API Gateway](/recipes/api/nginx-reverse-proxy) para patrones de endpoints HTTP.
- Transmitas datos en vivo a dashboards o herramientas de monitoreo. Consulta [Event-Driven Functions](/recipes/messaging/event-driven-microservices) para streaming de datos event-driven.
- Implementes edición colaborativa o estado de juegos multijugador
- Reemplaces polling largo o SSE con una conexión persistente más eficiente
- Transmitas eventos desde servicios backend a clientes conectados. Consulta [Scheduled Jobs](/recipes/devops/background-jobs) para push de datos periódico.

## Solución

### Infraestructura AWS (Terraform)

```hcl
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "realtime-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.websocket.invoke_arn
}

resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "sendmessage" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "sendMessage"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
```

### Handler Lambda (Node.js)

```javascript
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const apigw = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ENDPOINT
});

exports.handler = async (event) => {
  const { routeKey, connectionId, domainName, stage } = event.requestContext;

  switch (routeKey) {
    case '$connect':
      await dynamo.put({
        TableName: process.env.CONNECTIONS_TABLE,
        Item: {
          connectionId,
          domainName,
          stage,
          connectedAt: Date.now(),
        }
      }).promise();
      return { statusCode: 200 };

    case '$disconnect':
      await dynamo.delete({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { connectionId }
      }).promise();
      return { statusCode: 200 };

    case 'sendMessage':
      const body = JSON.parse(event.body);
      const connections = await dynamo.scan({
        TableName: process.env.CONNECTIONS_TABLE
      }).promise();

      const sendPromises = connections.Items.map(async (conn) => {
        try {
          await apigw.postToConnection({
            ConnectionId: conn.connectionId,
            Data: JSON.stringify({
              message: body.message,
              sender: connectionId,
              timestamp: Date.now()
            })
          }).promise();
        } catch (e) {
          if (e.statusCode === 410) {
            await dynamo.delete({
              TableName: process.env.CONNECTIONS_TABLE,
              Key: { connectionId: conn.connectionId }
            }).promise();
          }
        }
      });

      await Promise.all(sendPromises);
      return { statusCode: 200 };

    default:
      return { statusCode: 400 };
  }
};
```

### Cliente (Navegador)

```javascript
const ws = new WebSocket('wss://your-api-id.execute-api.us-east-1.amazonaws.com/production');

ws.onopen = () => {
  ws.send(JSON.stringify({ action: 'sendMessage', message: 'Hello world!' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data.message);
};

ws.onerror = (error) => console.error('WebSocket error:', error);
ws.onclose = () => console.log('Connection closed');
```

## Explicación

- **WebSocket API Gateway**: gestiona el handshake WebSocket, mantiene las conexiones abiertas y enruta los mensajes entrantes a Lambda basándose en la `route_selection_expression`. Las rutas `$connect` y `$disconnect` son gestionadas por el sistema.
- **Persistencia de conexiones**: DynamoDB almacena `connectionId`, `domainName` y `stage` para cada cliente conectado. Esto es necesario porque las funciones Lambda son stateless — no pueden mantener referencias de conexión en memoria.
- **Broadcasting**: para enviar un mensaje a todos los clientes, escanea la tabla de conexiones y llama `postToConnection` para cada `connectionId`. Maneja errores `410 Gone` eliminando conexiones obsoletas.
- **Consideraciones de escalado**: el escaneo de DynamoDB para broadcasting es aceptable para audiencias pequeñas. Para miles de conexiones, usa DynamoDB streams, fan-out vía SNS/SQS, o particiona conexiones por sala/tema.

## Variantes

| Plataforma | Servicio WebSocket | Almacenamiento de conexiones | Mejor para |
|------------|-------------------|------------------------------|------------|
| AWS | API Gateway v2 | DynamoDB | Stack serverless completo |
| Azure | Azure Web PubSub | Redis / integrado | Ecosistemas .NET |
| GCP | Cloud Run + Socket.io | Firestore | Tiempo real basado en contenedores |
| Pusher | Pusher Channels | Gestionado | Prototipado rápido |
| Ably | Ably Platform | Gestionado | Escala empresarial |

## Lo que funciona

- **Usa salas o canales**: en lugar de transmitir a todas las conexiones, agrúpalas por tema, sala o usuario. Consulta solo las conexiones relevantes para reducir costos de DynamoDB y latencia.
- **Maneja conexiones obsoletas**: las conexiones pueden caer sin disparar `$disconnect`. Escanea y limpia conexiones periódicamente más antiguas que un umbral de heartbeat.
- **Habilita logging de CloudWatch**: registra `$connect`, `$disconnect` e invocaciones de rutas personalizadas para debugging y monitoreo de salud de conexiones.
- **Asegura la conexión**: valida tokens de autenticación en la ruta `$connect` usando authorizers Lambda o lógica personalizada antes de permitir que el handshake WebSocket se complete.
- **Implementa lógica de reconexión**: los clientes deberían reconectarse automáticamente con backoff exponencial si la conexión cae, resuscribiéndose a canales previos al reconectar.

## Errores comunes

- **Almacenar estado de conexión en memoria Lambda**: las instancias Lambda son efímeras. Cualquier mapa de conexiones en memoria se pierde cuando el contenedor de la función se destruye. Siempre usa DynamoDB o Redis.
- **Escanear DynamoDB para audiencias grandes**: un escaneo completo de tabla en miles de conexiones es lento y costoso. Usa GSIs o streams para transmisiones dirigidas.
- **Olvidar manejar errores `postToConnection` 410**: cuando un cliente se desconecta abruptamente, `postToConnection` arroja un error 410. Fallar en capturarlo y limpiar filtra registros de conexión.
- **No configurar `route_selection_expression` de API Gateway**: sin `$request.body.action`, las rutas personalizadas como `sendMessage` no se evaluarán y los mensajes retornarán 400.

## Preguntas frecuentes

**P: ¿Cuántas conexiones concurrentes puede manejar API Gateway WebSockets?**
R: API Gateway tiene una cuota predeterminada de 10,000 conexiones concurrentes por región, preparado para crecer mediante solicitud a soporte AWS. Para mayor escala, considera Ably, Pusher o infraestructura autogestionada.

**P: ¿Puedo usar WebSockets con HTTP API Gateway?**
R: No. Los WebSockets requieren API Gateway v2 con `protocol_type = "WEBSOCKET"`. Las APIs HTTP no soportan conexiones persistentes.

**P: ¿Cómo envío un mensaje desde un servicio backend a un cliente específico?**
R: Busca el `connectionId` del cliente en DynamoDB, luego llama `postToConnection` con ese ID. Almacena un mapeo entre ID de usuario y ID de conexión para búsquedas fáciles.

**P: ¿Cuál es el timeout de inactividad para API Gateway WebSockets?**
R: 10 minutos de inactividad. Envía mensajes ping periódicos desde el cliente o servidor para mantener la conexión viva.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
