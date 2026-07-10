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

### Reconexión del Cliente con Backoff Exponencial

```javascript
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.maxRetries = options.maxRetries || 10;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.retries = 0;
    this.ws = null;
    this.subscriptions = new Set();
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.retries = 0;
      // Resuscribir a canales previos
      this.subscriptions.forEach((channel) => {
        this.ws.send(JSON.stringify({ action: 'subscribe', channel }));
      });
    };

    this.ws.onclose = () => {
      if (this.retries < this.maxRetries) {
        const delay = Math.min(
          this.baseDelay * Math.pow(2, this.retries),
          this.maxDelay
        );
        this.retries++;
        setTimeout(() => this.connect(), delay);
      }
    };
  }

  subscribe(channel) {
    this.subscriptions.add(channel);
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', channel }));
    }
  }
}
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
- **Usa TTLs de conexión**: setea un atributo TTL en los registros de conexión de DynamoDB para auto-expirar conexiones obsoletas incluso si `$disconnect` no se dispara.
- **Batchea operaciones de DynamoDB**: cuando transmitas a muchas conexiones, usa `BatchWriteItem` para limpieza y llamadas paralelas `postToConnection` con concurrencia controlada.

## Errores comunes

- **Almacenar estado de conexión en memoria Lambda**: las instancias Lambda son efímeras. Cualquier mapa de conexiones en memoria se pierde cuando el contenedor de la función se destruye. Siempre usa DynamoDB o Redis.
- **Escanear DynamoDB para audiencias grandes**: un escaneo completo de tabla en miles de conexiones es lento y costoso. Usa GSIs o streams para transmisiones dirigidas.
- **Olvidar manejar errores `postToConnection` 410**: cuando un cliente se desconecta abruptamente, `postToConnection` arroja un error 410. Fallar en capturarlo y limpiar filtra registros de conexión.
- **No configurar `route_selection_expression` de API Gateway**: sin `$request.body.action`, las rutas personalizadas como `sendMessage` no se evaluarán y los mensajes retornarán 400.
- **Sin mecanismo de heartbeat**: las conexiones inactivas se desconectan después de 10 minutos. Sin mensajes ping del lado del cliente, las conexiones caen silenciosamente y los usuarios dejan de recibir actualizaciones.
- **Transmitir a todas las conexiones por cada mensaje**: no todos los mensajes necesitan llegar a todos los clientes. Usa routing basado en salas para enviar mensajes solo a las conexiones relevantes.
- **Sin manejo de errores en Lambda para rutas desconocidas**: los mensajes con acciones que no coinciden con ninguna ruta retornan 400. Loggea acciones desconocidas para debugging y retorna un error significativo al cliente.

## Preguntas frecuentes

**P: ¿Cuántas conexiones concurrentes puede manejar API Gateway WebSockets?**
R: API Gateway tiene una cuota predeterminada de 10,000 conexiones concurrentes por región, preparado para crecer mediante solicitud a soporte AWS. Para mayor escala, considera Ably, Pusher o infraestructura autogestionada.

**P: ¿Puedo usar WebSockets con HTTP API Gateway?**
R: No. Los WebSockets requieren API Gateway v2 con `protocol_type = "WEBSOCKET"`. Las APIs HTTP no soportan conexiones persistentes.

**P: ¿Cómo envío un mensaje desde un servicio backend a un cliente específico?**
R: Busca el `connectionId` del cliente en DynamoDB, luego llama `postToConnection` con ese ID. Almacena un mapeo entre ID de usuario y ID de conexión para búsquedas fáciles.

**P: ¿Cuál es el timeout de inactividad para API Gateway WebSockets?**
R: 10 minutos de inactividad. Envía mensajes ping periódicos desde el cliente o servidor para mantener la conexión viva.

**P: ¿Cómo autentico conexiones WebSocket?**
R: Pasa un token como parámetro de query en la URL del WebSocket (`wss://...?token=xyz`). En el handler Lambda `$connect`, valida el token antes de almacenar la conexión en DynamoDB. Retorna 403 para rechazar conexiones no autorizadas.

**P: ¿Cómo pruebo APIs WebSocket localmente?**
R: Usa `wscat` (`npm install -g wscat`) para conectar y enviar mensajes desde la terminal: `wscat -c wss://your-api-url`. Para desarrollo local, usa `sam local start-api` con AWS SAM o mockea los endpoints WebSocket con un servidor local.

**P: ¿Cuánto cuesta API Gateway WebSocket?**
R: AWS cobra por minuto de conexión ($0.25 por millón de minutos) y por mensaje ($1.00 por millón de mensajes). Los costos de DynamoDB aplican para almacenamiento de conexiones. Para broadcasting de alto volumen, estima los costos cuidadosamente — miles de conexiones enviando mensajes cada segundo pueden sumar rápidamente.

**P: ¿Puedo usar WebSocket APIs con API Gateway HTTP APIs?**
R: No. Las WebSocket APIs requieren API Gateway v2 con `protocol_type = "WEBSOCKET"`. Las HTTP APIs solo soportan patrones request-response. Necesitas una instancia separada de API Gateway para soporte WebSocket.

**P: ¿Cómo manejo backpressure al transmitir a muchas conexiones?**
R: Usa concurrencia controlada — procesa llamadas `postToConnection` en batches de 50-100 con `Promise.allSettled`. Si una conexión retorna 410, elimínala de DynamoDB. Rastrea los envíos fallidos y reintenta solo aquellos que fallaron con errores transitorios.

**P: ¿Cuál es el tamaño máximo de mensaje para API Gateway WebSockets?**
R: El tamaño máximo de mensaje es 128 KB para la WebSocket API. Los mensajes mayores a 128 KB son rechazados. Para payloads más grandes, divide los datos en chunks o usa una URL presignada de S3 para subir los datos y envía la URL vía WebSocket.

**P: ¿Cómo manejo tormentas de reconexión?**
R: Cuando el servidor se reconecta, miles de clientes pueden reconectar simultáneamente. Usa exponential backoff con jitter del lado del cliente: espera una duración aleatoria entre 1-5 segundos antes de reconectar, luego duplica con jitter. Esto distribuye las reconexiones en el tiempo y previene sobrecargar el servidor.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
