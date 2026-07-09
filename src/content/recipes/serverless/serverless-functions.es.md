---
contentType: recipes
slug: serverless-functions
title: "Construir funciones serverless"
description: "Crea y despliega funciones serverless con AWS Lambda, Google Cloud Functions y Azure Functions para computación event-driven y pago por uso."
metaDescription: "Construye funciones serverless con AWS Lambda, Cloud Functions y Azure. Triggers event-driven, optimización de cold start y estrategias de despliegue con ejemplos."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - lambda
  - aws-lambda
  - functions
  - faas
relatedResources:
  - /guides/event-driven-architecture-guide
  - /guides/software-architecture-guide
  - /patterns/observer-pattern
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye funciones serverless con AWS Lambda, Cloud Functions y Azure. Triggers event-driven, optimización de cold start y estrategias de despliegue con ejemplos."
  keywords:
    - serverless
    - aws-lambda
    - cloud-functions
    - azure-functions
    - faas
    - event-driven
---
# Construir funciones serverless

## Visión General

La computación serverless te permite ejecutar código sin aprovisionar ni gestionar servidores. Escribes funciones, las subes a un proveedor de nube y la plataforma se encarga del escalado, parches y disponibilidad automáticamente. Pagas solo por el tiempo de ejecución, lo que la hace ideal para cargas de trabajo esporádicas y arquitecturas event-driven.

Lo siguiente cubre la creación y despliegue de funciones serverless con AWS Lambda, Google Cloud Functions y Azure Functions.

## Cuándo Usar

Usa este recurso cuando:
- Tienes cargas de trabajo event-driven (webhooks, procesamiento de archivos, jobs programados). Consulta [Event-Driven Functions](/recipes/messaging/event-driven-microservices) para patrones event-driven.
- Quieres escalado automático de cero a miles de peticiones. Consulta [Cold Start Optimization](/recipes/performance/connection-pooling) para minimizar latencia de inicio.
- Necesitas evitar el mantenimiento de servidores y la sobrecarga de infraestructura
- Tu tráfico es esporádico y aprovisionar servidores sería un desperdicio. Consulta [Serverless API Gateway](/recipes/api/nginx-reverse-proxy) para construir APIs pay-per-use.

## Solución

### Python (AWS Lambda)

```python
import json
import boto3

def handler(event, context):
    # Extraer parámetro de query
    name = event.get("queryStringParameters", {}).get("name", "World")

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"message": f"Hello, {name}!"})
    }
```

### JavaScript (Google Cloud Functions)

```javascript
const functions = require('@google-cloud/functions-framework');

functions.http('helloHttp', (req, res) => {
  const name = req.query.name || 'World';
  res.json({ message: `Hello, ${name}!` });
});
```

### Java (Azure Functions)

```java
import com.microsoft.azure.functions.*;
import java.util.Optional;

public class HelloFunction {
    @FunctionName("hello")
    public HttpResponseMessage run(
        @HttpTrigger(name = "req", methods = {HttpMethod.GET}, authLevel = AuthorizationLevel.ANONYMOUS)
        HttpRequestMessage<Optional<String>> request,
        final ExecutionContext context) {

        String name = request.getQueryParameters().getOrDefault("name", "World");
        return request.createResponseBuilder(HttpStatus.OK)
            .body("Hello, " + name + "!")
            .build();
    }
}
```

## Explicación

Las plataformas serverless abstraen la gestión de infraestructura:
- **Triggers de eventos**: Peticiones HTTP, subidas de archivos, cambios en base de datos, timers
- **Escalado automático**: Cada invocación corre en un contenedor fresco; las plataformas escalan contenedores arriba y abajo
- **Pago por uso**: Se factura por milisegundos de ejecución y número de invocaciones

Los cold starts ocurren cuando una función no ha sido invocada recientemente. La plataforma debe inicializar un nuevo contenedor, añadiendo latencia (100ms–3s dependiendo del runtime y asignación de memoria).

## Variantes

| Plataforma | Runtime | Tipos de trigger | Cold Start |
|------------|---------|-----------------|------------|
| AWS Lambda | Python, Node, Java, Go, Ruby | HTTP, S3, SNS, SQS, EventBridge, Cron | 100ms–1s |
| Cloud Functions | Node, Python, Go, Java | HTTP, Pub/Sub, Storage, Firestore, Cron | 200ms–2s |
| Azure Functions | Node, Python, Java, C# | HTTP, Blob, Queue, Event Grid, Timer | 200ms–3s |

## Lo que funciona

- **Mantén las funciones pequeñas y enfocadas**: Una función por responsabilidad; compón workflows complejos con step functions
- **Minimiza el tamaño del paquete de despliegue**: Elimina dependencias innecesarias para reducir el cold start
- **Usa concurrencia provisionada para cargas sensibles a latencia**: Precalienta contenedores para rutas críticas
- **Almacena estado externamente**: Las funciones son stateless; usa DynamoDB, Redis o Cloud Firestore para persistencia
- **Configura límites de memoria y timeout apropiadamente**: Memoria insuficiente causa OOM; excesiva desperdicia dinero

## Errores Comunes

- **Almacenar estado en el contenedor de la función**: Las variables locales se pierden entre invocaciones; los contenedores pueden reutilizarse, pero nunca dependas de ello
- **Ignorar cold starts**: Las APIs síncronas orientadas a usuarios sufren latencia de cold start
- **Sobreaprovisionar memoria**: Lambda asigna CPU proporcionalmente a la memoria; encuentra el punto óptimo
- **No manejar fallos parciales**: El procesamiento por lotes debe manejar reintentos sin duplicar trabajo
- **Acoplamiento fuerte a un vendor**: Usa capas de abstracción (Serverless Framework, SAM) para portabilidad

## Avanzado: Mitigación de Cold Start

```python
# AWS Lambda: inicializa fuera del handler para reutilizar conexiones
import json
import boto3

# Estos corren solo en cold start — se reutilizan entre invocaciones
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('users')
http_session = requests.Session()

def handler(event, context):
    # El handler se mantiene delgado — las conexiones ya están calientes
    user_id = event['pathParameters']['id']
    response = table.get_item(Key={'id': user_id})
    return {
        'statusCode': 200,
        'body': json.dumps(response.get('Item', {}))
    }
```

Inicializa conexiones de base de datos, clientes HTTP e imports pesados fuera de la función handler. La plataforma reutiliza el contenedor entre invocaciones, por lo que estas inicializaciones corren una vez en cold start y persisten. Mantén el body del handler mínimo — solo procesa el evento y devuelve.

## Avanzado: Orquestación con Step Functions

```json
{
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:ValidateOrder",
      "Next": "CheckInventory"
    },
    "CheckInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:CheckInventory",
      "Next": "ProcessPayment"
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:ProcessPayment",
      "End": true
    }
  }
}
```

Step Functions encadena invocaciones Lambda con reintentos built-in, manejo de errores y gestión de estado. Cada paso es independiente y reintentable. Usa Choice states para branching condicional, Parallel states para ejecución concurrente y Map states para patrones fan-out.

## Avanzado: Concurrencia Provisionada

```bash
# AWS CLI: configurar concurrencia provisionada
aws lambda put-provisioned-concurrency-config \
  --function-name my-api \
  --qualifier production \
  --provisioned-concurrent-executions 10
```

La concurrencia provisionada mantiene entornos de ejecución calientes y listos para responder. Configúrala para endpoints sensibles a latencia donde los cold starts son inaceptables. Monitorea la utilización — si la capacidad provisionada está idle, redúcela. Para tráfico con picos, combina concurrencia provisionada con escalado on-demand.

## Avanzado: Arquitectura Event-Driven

```python
import json
import boto3

s3 = boto3.client('s3')
sns = boto3.client('sns')

def handler(event, context):
    # Triggered por upload a S3
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        # Procesar archivo subido
        response = s3.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read().decode('utf-8')

        # Publicar resultado a SNS
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123:processing-complete',
            Message=json.dumps({
                'file': key,
                'size': len(content),
                'lines': content.count('\n')
            })
        )

    return {'statusCode': 200, 'body': json.dumps({'processed': len(event['Records'])})}
```

Las funciones event-driven responden a cloud events: uploads a S3, DynamoDB streams, mensajes SQS, notificaciones SNS o schedules EventBridge. Cada evento contiene records que tu handler procesa independientemente. Diseña handlers idempotentes porque las fuentes de eventos pueden entregar duplicados. Usa partial batch responses (Lambda) para reportar qué records tuvieron éxito y cuáles deben reintentarse.

## Avanzado: Desarrollo Local

```yaml
# template.yaml — AWS SAM desarrollo local
Resources:
  ProcessUpload:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      Runtime: python3.11
      Events:
        Upload:
          Type: S3
          Properties:
            Bucket: uploads
            Events: s3:ObjectCreated:*

# Ejecutar localmente:
# sam local start-api
# sam local invoke ProcessUpload --event events/s3-upload.json
# sam local generate-event s3 --bucket uploads --key data.csv > events/s3-upload.json
```

AWS SAM CLI, Azure Functions Core Tools y Google Cloud Functions Emulator proporcionan entornos de ejecución locales. Genera eventos de ejemplo con `sam local generate-event` para testear la lógica del handler sin desplegar. Usa `sam local start-api` para testear funciones HTTP-triggered con curl o Postman. Siempre ejecuta un test de integración final en la nube — los emuladores locales no replican todos los comportamientos de la plataforma.

## Cuándo Evitar

- **Computaciones de larga duración**: Tareas que exceden 15 minutos (Lambda) necesitan compute basado en contenedores (ECS, Cloud Run, EKS)
- **Aplicaciones stateful**: Juegos en tiempo real, servidores WebSocket o servicios de streaming necesitan conexiones persistentes
- **Invocaciones de alta frecuencia**: Si tu función corre 1000+ veces por segundo, un servidor always-on puede ser más barato
- **Dependencias complejas**: Librerías nativas grandes o runtimes custom aumentan cold start y complejidad de despliegue

## Preguntas Frecuentes

**P: ¿Cómo reduzco la latencia de cold start?**
R: Usa runtimes más pequeños (Node.js, Python) en lugar de Java. Reduce el tamaño del paquete. Usa concurrencia provisionada. Mantén conexiones (base de datos, HTTP) calientes inicializando fuera del handler.

**P: ¿Las funciones serverless pueden manejar tareas de larga duración?**
R: AWS Lambda máximo 15 minutos, Cloud Functions 60 minutos, Azure Functions configurable. Para tareas más largas, usa step functions para orquestar múltiples funciones cortas o muevete a computación basada en contenedores (ECS, Cloud Run).

**P: ¿Cómo debuggeo funciones serverless localmente?**
R: AWS SAM CLI, Azure Functions Core Tools y Functions Framework para Node.js proporcionan emuladores locales. Prueba localmente, pero siempre valida en la nube ya que el comportamiento puede diferir.

### ¿Cómo monitoreo funciones serverless en producción?

Usa logging estructurado JSON (CloudWatch Logs, Stackdriver). Rastrea conteo de invocaciones, duración, tasa de errores y porcentaje de cold start. Configura alarmas en tasa de errores y duración p99. Usa distributed tracing (AWS X-Ray, Cloud Trace) para visualizar el flujo de requests entre funciones y servicios downstream.

### ¿Cómo manejo reintentos e idempotencia?

Diseña handlers idempotentes — procesar el mismo evento dos veces debería producir el mismo resultado. Usa claves de idempotencia (e.g., event ID + timestamp) para deduplicar. Configura DLQs (Dead Letter Queues) para eventos que fallan después de reintentos máximos. Para Lambda, configura `MaximumRetryAttempts` y `DestinationConfig` para invocaciones fallidas.

### ¿Cuál es el modelo de costos de serverless?

AWS Lambda cobra por invocación ($0.20/millón) y por GB-segundo de tiempo de ejecución. Cloud Functions y Azure Functions siguen modelos similares. Considera asignación de memoria, duración de ejecución y conteo de invocaciones. Para tráfico constante alto, serverless puede costar más que servidores always-on — benchmark ambos.

### ¿Cómo manejo tareas de larga duración en serverless?

Usa Step Functions o un patrón basado en colas: Lambda escribe la tarea a SQS, un worker Lambda la procesa en chunks dentro del timeout, y escribe progreso a DynamoDB. Para tareas de más de 15 minutos, usa Fargate o Cloud Run en lugar de Lambda. Divide el trabajo en batches y procésalos en paralelo con Lambda fan-out vía SNS o EventBridge.

### ¿Cuál es la diferencia entre Lambda layers y containers?

Lambda layers son paquetes de código compartido (hasta 5 por función) que reducen el tamaño del deployment package. Las container images (hasta 10GB) empaquetan todo incluyendo el runtime. Usa layers para dependencias compartidas entre funciones. Usa container images cuando tu deployment package excede 250MB o necesitas runtimes custom.

### ¿Cómo comparto código entre funciones serverless?

Usa Lambda layers para librerías y utilidades compartidas. Alternativamente, publica un paquete npm o Python compartido e inclúyelo en el deployment de cada función. Para patrones comunes como error handling y logging, extráelos en una layer que todas las funciones importan. Mantén las layers delgadas — layers grandes aumentan el cold start time.

### ¿Debo usar API Gateway o invocación directa de Lambda?

Usa API Gateway para endpoints HTTP que necesitan autenticación, rate limiting, validación de requests o dominios custom. Usa invocación directa (EventBridge, SQS, SNS) para comunicación interna servicio-a-servicio donde controlas ambos lados. API Gateway añade costo ($3.50/millón de requests) y latencia (~10-30ms), omítelo para llamadas internas de alto throughput.

### ¿Cómo manejo variables de entorno entre stages?

Usa archivos de configuración separados por stage (`serverless.dev.yml`, `serverless.prod.yml`) y referéncialos en tu comando de deployment. Nunca hardcodees secrets — usa AWS Systems Manager Parameter Store o Secrets Manager. Lambda lee estos en runtime vía el execution role de la función. Para configs no sensibles como URLs de API, usa variables de entorno seteadas en la configuración de la función.
