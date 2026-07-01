---
contentType: recipes
slug: event-driven-functions
title: "Construir Arquitecturas Serverless Event-Driven"
description: "Cómo diseñar sistemas débilmente acoplados usando funciones serverless disparadas por eventos de colas de mensajes, bases de datos y webhooks."
metaDescription: "Aprende arquitectura serverless event-driven. Diseña sistemas débilmente acoplados con Lambda, SQS, EventBridge y triggers webhook para procesamiento async escalable."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - event-driven
  - lambda
relatedResources:
  - /recipes/serverless-api-gateway
  - /recipes/webhooks
  - /recipes/middleware
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende arquitectura serverless event-driven. Diseña sistemas débilmente acoplados con Lambda, SQS, EventBridge y triggers webhook para procesamiento async escalable."
  keywords:
    - event driven serverless
    - lambda sqs
    - eventbridge
    - async processing
    - serverless architecture
    - event driven microservices
---

## Visión general

La arquitectura event-driven desacopla servicios haciendo que se comuniquen a través de eventos en lugar de llamadas HTTP directas. Cuando un usuario sube una imagen, un evento `ImageUploaded` se publica. Un generador de thumbnails escucha ese evento y crea una versión redimensionada. Un extractor de metadata también escucha y actualiza el índice de búsqueda. Ningún servicio conoce al otro — solo conocen el evento.

Las funciones serverless son una opción natural para sistemas event-driven porque escalan a cero cuando están inactivas y se escalan automáticamente cuando los eventos llegan en ráfagas. AWS Lambda, SQS, EventBridge y SNS forman la columna vertebral de la mayoría de plataformas serverless event-driven.

## Cuándo usarlo

Usa esta receta cuando:

- Procesas cargas de trabajo asíncronas que no necesitan respuestas inmediatas (procesamiento de imágenes, generación de reportes, envío de emails). Consulta [Scheduled Jobs](/recipes/devops/background-jobs) para automatización de tareas recurrentes.
- Desacoplas microservicios para que puedan deployarse, escalar y fallar independientemente. Consulta [Serverless Orchestration](/recipes/devops/background-jobs) para coordinar workflows complejos.
- Construyes sistemas que deben manejar picos de tráfico sin provisionar capacidad por adelantado
- Reaccionas a cambios en datos (CDC de base de datos) o sistemas externos (webhooks, uploads de archivos). Consulta [Event Sourcing](/patterns/design/event-sourcing-pattern) para patrones de eventos inmutables.
- Reemplazas cron jobs con funciones disparadas por eventos para timing más preciso

## Solución

### Lambda disparada por SQS (Python)

```python
import json
import boto3

def lambda_handler(event, context):
    for record in event['Records']:
        body = json.loads(record['body'])
        order_id = body['orderId']

        # Procesa la orden asíncronamente
        process_order(order_id)

        # El mensaje SQS se elimina automáticamente al completar exitosamente
    return {'statusCode': 200}

def process_order(order_id):
    # Lógica de negocio: validar, cobrar, notificar
    print(f"Processing order {order_id}")
```

### EventBridge Rule (Infrastructure as Code)

```yaml
OrderPlacedRule:
  Type: AWS::Events::Rule
  Properties:
    EventBusName: default
    EventPattern:
      source:
        - order-service
      detail-type:
        - OrderPlaced
    Targets:
      - Arn: !GetAtt PaymentFunction.Arn
        Id: payment-target
      - Arn: !GetAtt NotificationFunction.Arn
        Id: notification-target
```

### Publicando Eventos (Node.js)

```javascript
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const eb = new EventBridgeClient({ region: 'us-east-1' });

async function publishOrderPlaced(order) {
  await eb.send(new PutEventsCommand({
    Entries: [{
      Source: 'order-service',
      DetailType: 'OrderPlaced',
      Detail: JSON.stringify({
        orderId: order.id,
        amount: order.total,
        customerEmail: order.email,
      }),
    }],
  }));
}
```

## Explicación

- **Eventos**: Registros inmutables de algo que ocurrió en el pasado (`OrderPlaced`, `ImageUploaded`, `PaymentReceived`). Los eventos llevan estado pero no dictan qué deben hacer los consumidores.
- **Productores de eventos**: Servicios que emiten eventos cuando algo notable ocurre. Un productor no sabe ni le importa cuántos consumidores existen.
- **Consumidores de eventos**: Funciones o servicios que se suscriben a tipos de eventos específicos. Múltiples consumidores pueden procesar el mismo evento independientemente.
- **Event buses (EventBridge)**: Routers centrales que filtran eventos basados en reglas y los entregan a targets. Desacoplan productores de consumidores y habilitan patrones de event sourcing.

## Variantes

| Patrón | Acoplamiento | Durabilidad | Mejor para |
|--------|--------------|-------------|------------|
| Invocación directa | Fuerte | Ninguna | Workflows simples, sincrónicos |
| Colas SQS | Débil | Alta | Procesamiento async confiable, retries |
| EventBridge | Débil | Alta | Routing multi-consumidor, filtrado |
| SNS topics | Débil | Media | Broadcast, notificaciones fan-out |
| Kinesis streams | Débil | Alta | Analytics en tiempo real, procesamiento ordenado |

## Lo que funciona

- **Diseña eventos alrededor de hechos de negocio**: `OrderPlaced` es mejor que `ProcessOrder` porque describe lo que ocurrió, no qué hacer. Esto da a los consumidores libertad para reaccionar de diferentes maneras.
- **Haz eventos inmutables y auto-contenidos**: incluye suficiente contexto (order ID, email de cliente, monto) para que los consumidores no necesiten consultar al productor.
- **Maneja eventos duplicados**: la entrega at-least-once es el default para la mayoría de colas de mensajes. Los consumidores deben ser idempotentes o deduplicar usando IDs de eventos.
- **Configura dead letter queues (DLQ)**: después de un número configurado de reintentos, los mensajes fallidos deberían moverse a una DLQ para inspección en lugar de reintentar forever.
- **Monitorea latencia y antigüedad de eventos**: mensajes viejos indican un cuello de botella de procesamiento. Configura alarmas en `ApproximateAgeOfOldestMessage` en SQS.

## Errores comunes

- **Tratar eventos como comandos**: `ProcessPayment` es un comando que espera acción. `PaymentRequested` es un evento que describe un hecho. Los comandos crean acoplamiento fuerte; los eventos promueven acoplamiento débil.
- **Omitir versionamiento de schema**: cuando un schema de evento cambia (nuevo campo agregado), consumidores no actualizados pueden fallar. Versiona tus eventos (`OrderPlaced-v2`).
- **No manejar fallas parciales de batch**: Lambda con batch sizes de SQS mayores a 1 puede fallar todo el batch por un solo mensaje malo. Implementa manejo de errores por registro.
- **Ignorar ordenamiento de mensajes**: las colas SQS standard no garantizan orden. Usa FIFO queues o Kinesis cuando la secuencia importa.

## Preguntas frecuentes

**P: ¿Cómo se diferencia event-driven de request-response?**
R: Request-response (HTTP REST) es sincrónico: el caller espera un resultado. Event-driven es asincrónico: el productor dispara un evento y sigue adelante. Los consumidores procesan cuando están listos.

**P: ¿Puedo usar arquitectura event-driven con proveedores no-AWS?**
R: Sí. Azure Functions con Event Grid, Google Cloud Functions con Pub/Sub, y Apache Kafka en cualquier cloud soportan patrones event-driven.

**P: ¿Cómo trazo un request a través de múltiples funciones event-driven?**
R: Usa correlation IDs. Genera un ID único en el punto de entrada y propágalo a través de cada evento. CloudWatch, X-Ray o OpenTelemetry pueden entonces trazar la cadena completa.

**P: ¿Cuál es el tamaño máximo de evento?**
R: Los mensajes SQS están limitados a 256 KB. Los eventos de EventBridge están limitados a 256 KB. Para payloads más grandes, almacena los datos en S3 e incluye una referencia en el evento.

