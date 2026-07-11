---
contentType: guides
slug: serverless-architecture-guide
title: "Arquitectura Serverless — Patrones y Anti-Patrones"
description: "Guía práctica de arquitectura serverless: diseño de funciones, cold starts, patrones event-driven, gestión de estado y errores comunes con AWS Lambda, Azure Functions y GCP Cloud Functions."
metaDescription: "Aprende arquitectura serverless: diseño de funciones, cold starts, patrones event-driven, gestión de estado. Guía práctica con AWS Lambda, Azure y GCP."
difficulty: intermediate
topics:
  - architecture
  - serverless
tags:
  - serverless
  - faas
  - lambda
  - azure-functions
  - cloud-functions
  - cold-start
  - event-driven
  - guia
relatedResources:
  - /guides/aws-basics-guide
  - /guides/azure-basics-guide
  - /guides/gcp-basics-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende arquitectura serverless: diseño de funciones, cold starts, patrones event-driven, gestión de estado. Guía práctica con AWS Lambda, Azure y GCP."
  keywords:
    - serverless
    - faas
    - lambda
    - azure-functions
    - cloud-functions
    - cold-start
    - event-driven
    - guia
---

## Overview

La arquitectura serverless te permite ejecutar código sin aprovisionar ni gestionar servidores. El proveedor cloud se encarga de infraestructura, escalado y parcheo; tú proporcionas funciones que se ejecutan en respuesta a eventos. Aunque serverless elimina la gestión de servidores, introduce nuevas restricciones: límites de tiempo de ejecución, cold starts, falta de estado y debugging distribuido. Esta guía cubre patrones que funcionan y anti-patrones que causan problemas.

## Cuándo Usar

- Tráfico variable o impredecible (pago por ejecución ahorra dinero)
- Flujos de trabajo event-driven (subidas de archivo, cambios en BD, tareas programadas)
- Microservicios con ciclos de despliegue independientes
- Prototipos y MVPs donde la velocidad importa más que la optimización
- Pipelines de procesamiento que pueden dividirse en pasos discretos

## Patrones Principales

| Patrón | Caso de Uso | Ejemplo |
|--------|------------|---------|
| **Función por endpoint HTTP** | APIs REST | API Gateway → Lambda |
| **Función event-driven** | Procesamiento asíncrono | Subida S3 → Lambda generador de thumbnails |
| **Función programada** | Jobs cron | CloudWatch Events → Lambda de reporte nocturno |
| **Función triggered por cola** | Cargas de trabajo desacopladas | SQS → Lambda procesador de órdenes |
| **Función triggered por stream** | Datos en tiempo real | DynamoDB Streams → Lambda actualizador de caché |

## Diseño de Funciones — Lo que funciona

```python
# AWS Lambda handler — mantener inicialización fuera del handler para reutilizar
import boto3
import json

# Inicializado una vez por ciclo de vida del contenedor
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('ProcessedFiles')

def lambda_handler(event, context):
    # Handler se ejecuta en cada invocación
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']
    
    # Procesar el archivo
    response = s3_client.get_object(Bucket=bucket, Key=key)
    content = response['Body'].read()
    
    # Guardar metadata
    table.put_item(Item={
        'fileId': key,
        'bucket': bucket,
        'size': len(content),
        'processedAt': context.aws_request_id
    })
    
    return {'statusCode': 200, 'body': json.dumps({'processed': key})}
```

```javascript
// Azure Function con trigger HTTP e inyección de dependencias
const { app } = require('@azure/functions');

class OrderService {
    async createOrder(orderData) {
        // Lógica de negocio aquí
        return { id: crypto.randomUUID(), ...orderData };
    }
}

app.http('createOrder', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const orderData = await request.json();
        const service = new OrderService();
        const order = await service.createOrder(orderData);
        return { jsonBody: order, status: 201 };
    }
});
```

## Manejando Cold Starts

| Estrategia | Impacto | Implementación |
|------------|---------|----------------|
| **Keep-alive (ping)** | Elimina cold start | Cron de CloudWatch cada 5 minutos |
| **Concurrencia provisionada** | Instancias precalentadas | Concurrencia provisionada de Lambda |
| **Minimizar dependencias** | Inicialización más rápida | Eliminar paquetes no usados, tree-shake |
| **Usar lenguajes compilados** | Inicio más rápido | Go, Rust, o compilación AOT de .NET |
| **Pool de conexiones** | Reutilizar conexiones a BD | Inicializar clientes globalmente |

## Gestión de Estado

Las funciones serverless son stateless. Persiste estado externamente:

```yaml
# AWS Step Functions — orquesta flujos de trabajo con estado
Comment: Flujo de Procesamiento de Órdenes
StartAt: ValidateOrder
States:
  ValidateOrder:
    Type: Task
    Resource: arn:aws:lambda:...:validate-order
    Next: ProcessPayment
  ProcessPayment:
    Type: Task
    Resource: arn:aws:lambda:...:process-payment
    Catch:
      - ErrorEquals: ["PaymentFailed"]
        ResultPath: "$.error"
        Next: NotifyFailure
    Next: NotifySuccess
```

## Errores Comunes

- **Lambda monolítica** — poner toda una aplicación en una función; dividir en funciones de propósito único
- **Espera síncrona** — llamar servicios lentos sincrónicamente dentro de una función; usar patrones async
- **Ignorar límites de timeout** — Lambda tiene máximo 15 minutos; jobs largos necesitan ECS o Batch
- **Tratar funciones como servidores** — almacenar estado en memoria o disco local
- **Sin estrategia de reintentos** — fallas transitorias deben manejarse con colas de mensajes muertos
- **Memoria sobreaprovisionada** — la memoria controla CPU; testear para encontrar el punto óptimo

## FAQ

**Es serverless más barato que contenedores?**
Para cargas de trabajo intermitentes o variables, generalmente sí. Para cargas de trabajo estables y de alto throughput, contenedores o EC2 suelen ser más rentables.

**Cómo debuggeo funciones serverless localmente?**
Usa SAM CLI (AWS), Azure Functions Core Tools, o Functions Framework (GCP). Cada uno provee un runtime local que imita el entorno cloud.

**Puede serverless manejar tareas de larga duración?**
Las funciones estándar tienen límites de tiempo (15 min Lambda, 10 min Azure). Para tareas más largas, usa step functions, jobs containerizados, o divide el trabajo en chunks.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: Pipeline de Procesamiento de Imagenes

```text
Arquitectura: S3 upload -> Lambda -> SQS -> Lambda -> DynamoDB
Plataforma: AWS
Volumen: 10k imagenes/dia

Paso 1: Subida de imagen
  Usuario sube imagen a S3 bucket: uploads/originals/
  Evento S3:ObjectCreated dispara Lambda resize-function

Paso 2: Lambda resize-function
  - Lee imagen desde S3
  - Genera 3 tamanos: thumbnail (100x100), medium (500x500), large (1200x1200)
  - Sube versiones a S3: uploads/resized/
  - Publica mensaje a SQS: image-processed-queue
    Mensaje: { "originalKey": "...", "thumbnailKey": "...", "mediumKey": "...", "largeKey": "..." }
  - Timeout: 30s (resize de imagen grande puede tomar 10-15s)
  - Memoria: 1024MB (necesario para procesamiento de imagen)

Paso 3: SQS -> Lambda metadata-function
  - Lee mensaje de SQS
  - Extrae metadata: dimensiones, formato, tamanho, hash
  - Almacena en DynamoDB tabla: ImageMetadata
    PK: imageId (uuid generado), SK: version (thumbnail|medium|large)
  - Elimina mensaje de SQS (procesamiento exitoso)
  - Si falla 3 veces -> DLQ: image-processed-dlq

Configuracion IaC (Terraform):
  resource "aws_lambda_function" "resize" {
    function_name = "image-resize"
    handler       = "handler.lambda_handler"
    runtime       = "python3.11"
    memory_size   = 1024
    timeout       = 30
    reserved_concurrent_executions = 50
    environment {
      variables = {
        OUTPUT_BUCKET = "uploads-resized"
        QUEUE_URL     = aws_sqs_queue.image_processed.id
      }
    }
  }

  resource "aws_sqs_queue" "image_processed" {
    name              = "image-processed-queue"
    visibility_timeout = 60  # > lambda timeout
    redrive_policy = jsonencode({
      deadLetterTargetArn = aws_sqs_queue.dlq.arn
      maxReceiveCount     = 3
    })
  }

Monitoreo:
  - CloudWatch Alarms: errores > 1%, duracion p95 > 20s
  - DLQ alert: mensaje en DLQ -> SNS -> Slack
  - X-Ray tracing para ver latencia por paso

Costo estimado (10k imagenes/dia):
  Lambda: ~$15/mes (1.5M invocaciones)
  S3: ~$2/mes (storage)
  SQS: ~$0.40/mes
  DynamoDB: ~$1.25/mes (on-demand)
  Total: ~$19/mes
```

### Como manejo transacciones distribuidas en serverless?

No uses transacciones ACID distribuidas. Usa el patron saga: cada funcion hace su parte y publica un evento. Si un paso falla, una funcion compensatoria deshace el trabajo anterior. En AWS, Step Functions coordina las sagas con estados de compensacion. Alternativamente, usa el patron outbox: la funcion escribe en la BD y publica el evento en la misma transaccion. Un proceso separado lee el outbox y publica los eventos.

### Como testeo funciones serverless localmente?

Usa SAM CLI para AWS Lambda: `sam local invoke -e event.json`. Para Azure, Azure Functions Core Tools: `func start`. Crea eventos de prueba en JSON que imiten los eventos reales (S3, SQS, API Gateway). Para testeo de integracion, usa LocalStack que emula servicios de AWS localmente. Para CI, ejecuta los tests en GitHub Actions con SAM CLI instalado. Manten los tests de handler separados de los tests de logica de negocio.













































End of document. Review and update quarterly.