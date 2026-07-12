---


contentType: patterns
slug: serverless-event-sourcing-pattern
title: "Patron Serverless Event Sourcing"
description: "Almacena el estado de funciones como un log de eventos append-only para que los workflows puedan ser reproducidos, auditados y recuperados sin DB persistente."
metaDescription: "Serverless event sourcing: almacena estado como eventos append-only. Reproduce, audita y recupera workflows serverless con DynamoDB y EventBridge."
difficulty: advanced
topics:
  - serverless
  - design
tags:
  - serverless
  - event-sourcing
  - patron
  - eventbridge
  - dynamodb
  - audit-log
  - python
  - typescript
relatedResources:
  - /patterns/serverless-function-composition-pattern
  - /patterns/serverless-fanout-pattern
  - /recipes/serverless-dynamodb-single-table
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Serverless event sourcing: almacena estado como eventos append-only. Reproduce, audita y recupera workflows serverless con DynamoDB y EventBridge."
  keywords:
    - serverless event sourcing
    - event log serverless
    - dynamodb event store
    - eventbridge event sourcing
    - serverless audit log
    - event replay lambda


---

# Patron Serverless Event Sourcing

## Descripcion general

Event sourcing almacena el estado de la aplicacion como una secuencia de eventos inmutables. En lugar de actualizar un registro de estado actual, anades cada cambio de estado como un evento a un log. El estado actual se deriva reproduciendo el log de eventos. En serverless, esto encaja naturalmente: los eventos fluyen a traves de EventBridge o SNS, y DynamoDB o S3 almacena el log de eventos.

Este patron proporciona una pista de auditoria completa, habilita la reproduccion para recuperacion y desacopla los cambios de estado de los consumidores downstream. Cada invocacion Lambda anade un evento y opcionalmente proyecta el estado actual a un read model.

## Cuando usarlo


- For alternatives, see [Serverless Fanout Pattern](/es/patterns/serverless-fanout-pattern/).

- Necesitas una pista de auditoria completa de todos los cambios de estado (transacciones financieras, compliance)
- La recuperacion requiere reproducir eventos para reconstruir estado despues de un fallo
- Multiples consumidores necesitan reaccionar al mismo cambio de estado independientemente
- Quieres desacoplar la logica de escritura de los read models (CQRS)
- Se necesitan consultas temporales (cual era el estado en el momento T?)

## Solucion

### Python con DynamoDB como event store

```python
import boto3
import json
import time
import uuid
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
event_table = dynamodb.Table('event_store')
projection_table = dynamodb.Table('order_projection')

class EventStore:
    def __init__(self, table):
        self.table = table

    def append(self, aggregate_id: str, event_type: str, data: dict, expected_version: int = None):
        event = {
            "aggregateId": aggregate_id,
            "eventId": str(uuid.uuid4()),
            "eventType": event_type,
            "data": json.dumps(data),
            "timestamp": int(time.time() * 1000),
            "version": self._get_next_version(aggregate_id),
        }

        # Control de concurrencia optimista
        if expected_version is not None:
            response = self.table.put_item(
                Item=event,
                ConditionExpression="attribute_not_exists(aggregateId) OR version = :expected",
                ExpressionAttributeValues={":expected": expected_version}
            )
        else:
            self.table.put_item(Item=event)

        return event

    def get_events(self, aggregate_id: str, from_version: int = 0) -> list[dict]:
        response = self.table.query(
            KeyConditionExpression=Key("aggregateId").eq(aggregate_id) & Key("version").gte(from_version),
            ScanIndexForward=True  # Orden ascendente
        )
        return response.get("Items", [])

    def _get_next_version(self, aggregate_id: str) -> int:
        response = self.table.query(
            KeyConditionExpression=Key("aggregateId").eq(aggregate_id),
            ScanIndexForward=False,
            Limit=1
        )
        items = response.get("Items", [])
        return (int(items[0]["version"]) + 1) if items else 1


event_store = EventStore(event_table)

# Anadir eventos
def create_order(order_id: str, customer_id: str, items: list):
    event_store.append(order_id, "OrderCreated", {
        "customerId": customer_id,
        "items": items,
        "status": "PENDING"
    })

def confirm_order(order_id: str):
    events = event_store.get_events(order_id)
    current_version = max(int(e["version"]) for e in events)
    event_store.append(order_id, "OrderConfirmed", {
        "status": "CONFIRMED"
    }, expected_version=current_version)

# Reproducir eventos para reconstruir estado
def get_order_state(order_id: str) -> dict:
    events = event_store.get_events(order_id)
    state = {}
    for event in events:
        data = json.loads(event["data"])
        state.update(data)
        state["version"] = int(event["version"])
    return state
```

### Proyectar a un read model

```python
def project_order_state(order_id: str):
    state = get_order_state(order_id)

    projection_table.put_item(Item={
        "orderId": order_id,
        "customerId": state.get("customerId"),
        "status": state.get("status"),
        "items": state.get("items", []),
        "version": state.get("version", 0),
        "updatedAt": int(time.time() * 1000),
    })

# Lambda handler disparado por DynamoDB stream
def projection_handler(event, context):
    for record in event["Records"]:
        if record["eventName"] == "INSERT":
            new_image = record["dynamodb"]["NewImage"]
            aggregate_id = new_image["aggregateId"]["S"]
            project_order_state(aggregate_id)
```

### TypeScript con EventBridge

```typescript
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const eventBridge = new EventBridgeClient({ region: 'us-east-1' });

interface DomainEvent {
  aggregateId: string;
  eventId: string;
  eventType: string;
  data: Record<string, any>;
  timestamp: number;
  version: number;
}

class EventStore {
  private tableName = 'event_store';

  async append(aggregateId: string, eventType: string, data: Record<string, any>): Promise<DomainEvent> {
    const version = await this.getNextVersion(aggregateId);
    const event: DomainEvent = {
      aggregateId,
      eventId: crypto.randomUUID(),
      eventType,
      data,
      timestamp: Date.now(),
      version,
    };

    // Almacenar evento
    await ddb.send(new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(event),
    }));

    // Publicar a EventBridge para consumidores downstream
    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        EventBusName: 'default',
        Source: 'order.service',
        DetailType: eventType,
        Detail: JSON.stringify(event),
      }],
    }));

    return event;
  }

  async getEvents(aggregateId: string, fromVersion = 0): Promise<DomainEvent[]> {
    const response = await ddb.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'aggregateId = :id AND version >= :v',
      ExpressionAttributeValues: marshall({ ':id': aggregateId, ':v': fromVersion }),
      ScanIndexForward: true,
    }));

    return (response.Items || []).map(item => unmarshall(item) as DomainEvent);
  }

  private async getNextVersion(aggregateId: string): Promise<number> {
    const response = await ddb.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'aggregateId = :id',
      ExpressionAttributeValues: marshall({ ':id': aggregateId }),
      ScanIndexForward: false,
      Limit: 1,
    }));

    const items = response.Items || [];
    return items.length > 0 ? unmarshall(items[0]).version + 1 : 1;
  }
}

const store = new EventStore();

// Reconstruir estado desde eventos
function replayEvents(events: DomainEvent[]): Record<string, any> {
  return events.reduce((state, event) => ({
    ...state,
    ...event.data,
    version: event.version,
  }), {});
}
```

## Explicacion

Event sourcing invierte el modelo de estado tradicional:

1. **Anadir eventos** — cada cambio de estado se registra como un evento inmutable. Los eventos nunca se modifican ni eliminan. El log de eventos es la fuente de verdad.

2. **Derivar estado** — el estado actual se computa reproduciendo todos los eventos de un agregado. Cada evento actualiza el estado incrementalmente. Este es el paso de "proyeccion".

3. **Proyectar a read models** — para rendimiento de consulta, proyecta el estado derivado a una tabla optimizada para lectura (DynamoDB, Elasticsearch). El read model es desechable: siempre se puede reconstruir desde el log de eventos.

4. **Publicar eventos** — cuando se anade un evento, publicalo a EventBridge o SNS. Los consumidores downstream reaccionan independientemente sin acoplamiento al lado de escritura.

## Variantes

| Enfoque | Event Store | Ideal para |
|---------|-------------|------------|
| DynamoDB event store | DynamoDB con sort key = version | Nativo AWS, volumen moderado de eventos |
| S3 event log | Objetos S3 por evento | Alto volumen, bajo coste, append-only |
| EventBridge + DynamoDB | EventBridge para routing, DynamoDB para storage | Consumidores desacoplados |
| Aurora event store | Tabla SQL con log de eventos | Ecosistema SQL, garantias ACID |
| Kafka event store | Topic Kafka como log de eventos | Alto throughput, consumidores streaming |

## Buenas practicas

- **Los eventos son inmutables** — nunca modifiques ni elimines un evento. Si se cometio un error, anade un evento compensatorio. Esto preserva la pista de auditoria.
- **Usa concurrencia optimista** — comprueba la version esperada antes de anadir. Si otro evento se anadio concurrentemente, rechaza la escritura. Esto previene actualizaciones perdidas.
- **Mantén los eventos pequenos** — los eventos deben contener solo los datos que cambiaron, no el agregado completo. Eventos grandes aumentan coste de storage y tiempo de replay.
- **Versiona los eventos** — usa un campo version como sort key. Esto habilita consultar eventos en orden y detectar modificaciones concurrentes.
- **Separa write y read models** — el log de eventos esta optimizado para appends. Los read models estan optimizados para consultas. No consultes el log de eventos para estado actual en produccion; usa una proyeccion.

## Errores comunes

- **Actualizar eventos** — modificar un evento rompe la pista de auditoria y hace el replay no-determinista. Siempre anade eventos compensatorios.
- **Consultar el log de eventos para lecturas** — escanear el log de eventos para obtener estado actual es lento. Proyecta a un read model y consulta ese.
- **Sin versionado** — sin concurrencia optimista basada en version, escrituras concurrentes pueden perder eventos. Siempre incluye un check de version.
- **Eventos grandes** — almacenar el agregado completo en cada evento desperdicia espacio. Almacena solo el delta (campos cambiados).
- **No manejar evolucion de schema** — los schemas de eventos cambian con el tiempo. Usa upcasters o event types versionados para manejar eventos antiguos durante el replay.

## Preguntas frecuentes

### Que es un agregado en event sourcing?

Un agregado es un cluster de objetos de dominio tratados como una sola unidad para cambios de datos. Todos los eventos de un agregado comparten el mismo aggregate ID. Por ejemplo, una orden y sus line items forman un agregado. Los eventos se anaden por agregado.

### Como manejo cambios de schema en eventos?

Usa versionado de eventos: incluye un campo `schemaVersion` en cada evento. Al reproducir, aplica upcasters que transforman eventos con formato antiguo al nuevo formato. Esto permite evolucionar el schema sin romper el replay.

### Cual es la diferencia entre event sourcing y CQRS?

Event sourcing trata sobre como se almacena el estado (como eventos). CQRS trata sobre separar read y write models. Se usan juntos frecuentemente: los eventos son el write model, las proyecciones son el read model. Puedes usar CQRS sin event sourcing y viceversa.

### Como reconstruyo un read model desde el log de eventos?

Escanea todos los eventos del agregado, reproducelos para computar el estado actual y escribe el resultado a la tabla del read model. En serverless, usa una Lambda que procese el log de eventos en lotes y actualice la proyeccion. Disparala manualmente o via DynamoDB stream.
