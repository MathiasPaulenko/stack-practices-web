---
contentType: recipes
slug: real-time-websockets
title: "Build Real-Time APIs with WebSockets on Serverless"
description: "How to implement bidirectional real-time communication using WebSockets with AWS API Gateway, Lambda, DynamoDB, and what works in connection management."
metaDescription: "Learn to build real-time APIs with WebSockets on serverless. Implement bidirectional communication with API Gateway, Lambda, DynamoDB, and connection management."
difficulty: advanced
topics:
  - serverless
tags:
  - serverless
  - websockets
  - real-time
  - aws-lambda
  - functions
relatedResources:
  - /recipes/serverless-api-gateway
  - /recipes/event-driven-functions
  - /recipes/scheduled-jobs
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to build real-time APIs with WebSockets on serverless. Implement bidirectional communication with API Gateway, Lambda, DynamoDB, and connection management."
  keywords:
    - websockets serverless
    - real-time api
    - api gateway websockets
    - lambda websockets
    - bidirectional communication
---

## Overview

Traditional HTTP request-response cycles are insufficient for applications that require live updates — chat rooms, live dashboards, multiplayer games, stock tickers, and collaborative editing. WebSockets provide a persistent, bidirectional TCP connection between client and server, enabling messages to flow in both directions without the overhead of repeated handshakes.

On serverless architectures, WebSockets require connection state management because Lambda functions are ephemeral. AWS API Gateway WebSocket API handles the WebSocket protocol layer, while a DynamoDB table tracks active connections. Lambda functions process `$connect`, `$disconnect`, and custom routes, broadcasting messages to targeted connection IDs. Here is how to the full implementation from infrastructure to client code.

## When to use it

Use this recipe when:

- Building chat applications, live notifications, or real-time feeds. See [Serverless API Gateway](/recipes/api/nginx-reverse-proxy) for HTTP endpoint patterns.
- Streaming live data to dashboards or monitoring tools. See [Event-Driven Functions](/recipes/messaging/event-driven-microservices) for event-driven data streaming.
- Implementing collaborative editing or multiplayer game state
- Replacing long-polling or SSE with a more efficient persistent connection
- Broadcasting events from backend services to connected clients. See [Scheduled Jobs](/recipes/devops/background-jobs) for periodic data push.

## Solution

### AWS Infrastructure (Terraform)

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

### Lambda Handler (Node.js)

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

### Client (Browser)

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

### Client Reconnection with Exponential Backoff

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
      // Resubscribe to previous channels
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

## Explanation

- **WebSocket API Gateway**: Manages the WebSocket handshake, keeps connections open, and routes incoming messages to Lambda based on the `route_selection_expression`. The `$connect` and `$disconnect` routes are system-managed.
- **Connection persistence**: DynamoDB stores `connectionId`, `domainName`, and `stage` for each connected client. This is necessary because Lambda functions are stateless — they cannot hold connection references in memory.
- **Broadcasting**: To send a message to all clients, scan the connections table and call `postToConnection` for each `connectionId`. Handle `410 Gone` errors by removing stale connections.
- **Scaling considerations**: DynamoDB scan for broadcasting is fine for small audiences. For thousands of connections, use DynamoDB streams, fan-out via SNS/SQS, or partition connections by room/topic.

## Variants

| Platform | WebSocket Service | Connection Store | Best for |
|----------|-------------------|-------------------|----------|
| AWS | API Gateway v2 | DynamoDB | Full serverless stack |
| Azure | Azure Web PubSub | Redis / built-in | .NET ecosystems |
| GCP | Cloud Run + Socket.io | Firestore | Container-based real-time |
| Pusher | Pusher Channels | Managed | Rapid prototyping |
| Ably | Ably Platform | Managed | Enterprise scale |

## What works

- **Use rooms or channels**: instead of broadcasting to all connections, group connections by topic, room, or user. Query only relevant connections to reduce DynamoDB costs and latency.
- **Handle stale connections**: connections may drop without triggering `$disconnect`. Periodically scan and clean up connections older than a heartbeat threshold.
- **Enable CloudWatch logging**: log `$connect`, `$disconnect`, and custom route invocations for debugging and monitoring connection health.
- **Secure the connection**: validate authentication tokens in the `$connect` route using Lambda authorizers or custom logic before allowing the WebSocket handshake to complete.
- **Implement reconnection logic**: clients should automatically reconnect with exponential backoff if the connection drops, resubscribing to previous channels on reconnection.
- **Use connection TTLs**: set a TTL attribute on DynamoDB connection records to auto-expire stale connections even if `$disconnect` fails to fire.
- **Batch DynamoDB operations**: when broadcasting to many connections, use `BatchWriteItem` for cleanup and parallel `postToConnection` calls with controlled concurrency.

## Common mistakes

- **Storing connection state in Lambda memory**: Lambda instances are ephemeral. Any connection map in memory is lost when the function container is destroyed. Always use DynamoDB or Redis.
- **Scanning DynamoDB for large audiences**: a full table scan on thousands of connections is slow and expensive. Use GSIs or streams for targeted broadcasts.
- **Forgetting to handle `postToConnection` 410 errors**: when a client disconnects abruptly, `postToConnection` throws a 410 error. Failing to catch and clean up leaks connection records.
- **Not setting API Gateway `route_selection_expression`**: without `$request.body.action`, custom routes like `sendMessage` will not be evaluated and messages will return 400.
- **No heartbeat mechanism**: idle connections time out after 10 minutes. Without client-side ping messages, connections silently drop and users stop receiving updates.
- **Broadcasting to all connections for every message**: not all messages need to reach all clients. Use room-based routing to send messages only to relevant connections.
- **No error handling in Lambda for unknown routes**: messages with actions that don't match any route return 400. Log unknown actions for debugging and return a meaningful error to the client.

## FAQ

**Q: How many concurrent connections can API Gateway WebSockets handle?**
A: API Gateway has a default quota of 10,000 concurrent connections per region, growth-ready via AWS support request. For higher scale, consider Ably, Pusher, or self-managed infrastructure.

**Q: Can I use WebSockets with HTTP API Gateway?**
A: No. WebSockets require API Gateway v2 with `protocol_type = "WEBSOCKET"`. HTTP APIs do not support persistent connections.

**Q: How do I send a message from a backend service to a specific client?**
A: Look up the client's `connectionId` in DynamoDB, then call `postToConnection` with that ID. Store a mapping between user ID and connection ID for easy lookups.

**Q: What is the idle timeout for API Gateway WebSockets?**
A: 10 minutes of inactivity. Send periodic ping messages from the client or server to keep the connection alive.

**Q: How do I authenticate WebSocket connections?**
A: Pass a token as a query parameter in the WebSocket URL (`wss://...?token=xyz`). In the `$connect` Lambda handler, validate the token before storing the connection in DynamoDB. Return 403 to reject unauthorized connections.

**Q: How do I test WebSocket APIs locally?**
A: Use `wscat` (`npm install -g wscat`) to connect and send messages from the terminal: `wscat -c wss://your-api-url`. For local development, use `sam local start-api` with AWS SAM or mock the WebSocket endpoints with a local server.

**Q: How much does API Gateway WebSocket cost?**
A: AWS charges per connection minute ($0.25 per million minutes) and per message ($1.00 per million messages). DynamoDB costs apply for connection storage. For high-volume broadcasting, estimate costs carefully — thousands of connections sending messages every second can add up quickly.

**Q: Can I use WebSocket APIs with API Gateway HTTP APIs?**
A: No. WebSocket APIs require API Gateway v2 with `protocol_type = "WEBSOCKET"`. HTTP APIs only support request-response patterns. You need a separate API Gateway instance for WebSocket support.

**Q: How do I handle backpressure when broadcasting to many connections?**
A: Use controlled concurrency — process `postToConnection` calls in batches of 50-100 with `Promise.allSettled`. If a connection returns 410, delete it from DynamoDB. Track failed sends and retry only those that failed with transient errors.

**Q: What is the maximum message size for API Gateway WebSockets?**
A: The maximum message size is 128 KB for the WebSocket API. Messages larger than 128 KB are rejected. For larger payloads, split the data into chunks or use a presigned S3 URL to upload the data and send the URL via WebSocket.

**Q: How do I handle reconnection storms?**
A: When the server reconnects, thousands of clients may reconnect simultaneously. Use jittered exponential backoff on the client side: wait a random duration between 1-5 seconds before reconnecting, then double with jitter. This spreads reconnections over time and prevents overwhelming the server.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### How do I test locally before deploying?

Use `sam local start-api` with AWS SAM to emulate API Gateway WebSockets locally. For DynamoDB, run DynamoDB Local in Docker. Create a test client in JavaScript that connects to the local endpoint and sends messages. Verify that the `$connect` callback registers the connection in DynamoDB and that `$default` processes messages correctly. For load testing, use Artillery with the WebSocket engine to simulate hundreds of concurrent connections.
