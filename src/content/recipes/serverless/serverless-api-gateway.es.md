---
contentType: recipes
slug: serverless-api-gateway
title: "Construir APIs Serverless con API Gateway"
description: "Cómo diseñar, desplegar y gestionar APIs HTTP serverless usando AWS API Gateway, Lambda y patrones de function-as-a-service."
metaDescription: "Aprende desarrollo de APIs serverless con API Gateway y Lambda. Diseña APIs REST, maneja routing, autenticación y despliegue con infrastructure as code."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - api-gateway
  - aws-lambda
  - faas
  - rest-api
  - infrastructure-as-code
  - aws
  - cloud
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/rate-limiting
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende desarrollo de APIs serverless con API Gateway y Lambda. Diseña APIs REST, maneja routing, autenticación y despliegue con infrastructure as code."
  keywords:
    - api serverless
    - api gateway
    - aws lambda
    - arquitectura serverless
    - faas
    - rest api serverless
    - lambda function
---

## Visión general

La computación serverless te permite ejecutar código sin provisionar o gestionar servidores. AWS Lambda ejecuta tus funciones en respuesta a eventos, y API Gateway provee la puerta de entrada HTTP que enruta requests a esas funciones. Juntas forman una plataforma de API que escala automáticamente y se paga por request, eliminando costos de servidores ociosos.

Esta arquitectura es ideal para APIs con tráfico variable o impredecible. Una startup podría servir cien requests por día en el lanzamiento y un millón por día seis meses después — serverless maneja ambos sin planificación de capacidad. El trade-off es la latencia de cold start (el retraso cuando una función se despierta después de estar inactiva) y herramientas específicas del vendor que pueden crear vendor lock-in.

## Cuándo usarlo

Usa esta receta cuando:

- Construyes APIs con patrones de tráfico esporádicos o impredecibles
- Prototipas productos donde los costos de servidor deberían escalar a cero cuando están ociosos
- Procesas webhooks, uploads de archivos o eventos programados vía HTTP
- Creas microservicios donde cada endpoint tiene diferentes necesidades de recursos
- Reduces overhead operacional eliminando patching y scaling de servidores

## Solución

### AWS Lambda Handler (Python)

```python
import json

def lambda_handler(event, context):
    # API Gateway pasa datos HTTP en el objeto event
    method = event['httpMethod']
    path = event['path']
    query = event.get('queryStringParameters', {})

    if method == 'GET' and path == '/users':
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'users': ['alice', 'bob']})
        }

    if method == 'POST' and path == '/users':
        body = json.loads(event['body'])
        return {
            'statusCode': 201,
            'body': json.dumps({'id': '123', 'name': body['name']})
        }

    return {'statusCode': 404, 'body': json.dumps({'error': 'Not found'})}
```

### AWS Lambda Handler (Node.js)

```javascript
exports.handler = async (event) => {
  const { httpMethod, path, body } = event;

  if (httpMethod === 'GET' && path === '/users') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: ['alice', 'bob'] })
    };
  }

  if (httpMethod === 'POST' && path === '/users') {
    const data = JSON.parse(body);
    return {
      statusCode: 201,
      body: JSON.stringify({ id: '123', name: data.name })
    };
  }

  return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
};
```

### Despliegue con Terraform

```hcl
resource "aws_api_gateway_rest_api" "api" {
  name = "users-api"
}

resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "users"
}

resource "aws_api_gateway_method" "get_users" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id     = aws_api_gateway_resource.users.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_lambda_function" "handler" {
  function_name = "users-handler"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = "function.zip"
  source_code_hash = filebase64sha256("function.zip")

  role = aws_iam_role.lambda_role.arn
}
```

## Explicación

- **API Gateway**: Recibe requests HTTP, maneja terminación TLS, throttling, caching y autenticación, luego invoca la función Lambda con los datos del request en un objeto event estructurado.
- **Lambda**: Entorno de ejecución de funciones stateless. AWS gestiona el scaling automáticamente — si llegan 1,000 requests simultáneamente, AWS levanta 1,000 instancias de la función. Pagas solo por el tiempo de ejecución y memoria usada.
- **Cold starts**: Cuando una función no ha sido invocada recientemente, AWS inicializa una nueva instancia del runtime. Esto agrega 100ms a 2s de latencia dependiendo del lenguaje y asignación de memoria. La concurrencia provisionada mantiene funciones calientes para endpoints sensibles a latencia.
- **Infrastructure as Code**: Herramientas como Terraform, Serverless Framework o AWS SAM definen tus rutas de API, funciones Lambda, roles IAM y variables de entorno en archivos de configuración versionados.

## Variantes

| Plataforma | API Gateway | Runtime de función | Mejor para |
|------------|-------------|--------------------|------------|
| AWS | API Gateway + Lambda | Python, Node, Java, Go | Ecosistema maduro, integraciones amplias |
| Azure | API Management + Functions | .NET, Node, Python | Ecosistema Microsoft, integración Visual Studio |
| GCP | Cloud Endpoints + Cloud Functions | Node, Python, Go | Integración BigQuery, pricing competitivo |

## Mejores prácticas

- **Mantén las funciones stateless**: no asumas que variables en memoria persisten entre invocaciones. Usa almacenamiento externo (DynamoDB, S3, Redis) para estado.
- **Minimiza el tamaño del paquete de despliegue**: paquetes grandes aumentan el tiempo de cold start. Usa Lambda layers para dependencias compartidas y tree-shake código no usado.
- **Configura timeouts y memoria apropiados**: la memoria escala CPU proporcionalmente. Si una función es lenta, aumentar la memoria puede ser más barato que pagar por ejecución más larga a menor memoria.
- **Usa variables de entorno para config**: URLs de base de datos, API keys y feature flags deben configurarse vía variables de entorno, no baked en el paquete de despliegue.
- **Implementa logging estructurado**: escribe logs JSON con request IDs. CloudWatch Logs Insights puede consultar estos eficientemente para debugging y monitoreo.
- **Usa dead letter queues (DLQ)**: las invocaciones asíncronas fallidas se reintentan automáticamente. Una DLQ captura fallas persistentes para que puedas inspeccionarlas y reprocesarlas.

## Errores comunes

- **Tratar Lambda como un servidor de larga duración**: las funciones tienen un máximo de 15 minutos de ejecución. Mueve trabajo de larga duración a procesamiento batch (AWS Batch) o contenedores (ECS/Fargate).
- **Ignorar cold starts**: las APIs sensibles a latencia necesitan concurrencia provisionada o un ping de keep-alive. Una API orientada al usuario con 3 segundos de cold start entrega una experiencia terrible.
- **Sobre-provisionar memoria**: la memoria de Lambda escala linealmente con el costo. Perfile tu función y asigna solo lo que necesita.
- **Hardcodear credenciales**: nunca hagas commit de AWS keys o passwords de base de datos a tu repositorio. Usa IAM roles y Secrets Manager.
- **No manejar fallas parciales**: en procesamiento batch (triggers SQS), un solo registro malo puede causar que todo el batch falle. Implementa manejo de errores por registro.

## Preguntas frecuentes

**P: ¿Cómo manejo conexiones a base de datos en Lambda?**
R: Usa connection pooling con un proxy ligero como RDS Proxy, o implementa tu propia lógica de reuso de conexiones. Abrir una nueva conexión a base de datos en cada invocación es lento y puede agotar el límite de conexiones de la base de datos.

**P: ¿Puedo ejecutar una aplicación full-stack en serverless?**
R: Sí, pero evalúa los trade-offs. Los sitios estáticos y las APIs son excelentes fits. Las conexiones WebSocket de larga duración o sesiones stateful pueden ser mejor servidas por contenedores o EC2.

**P: ¿Es serverless más barato que servidores tradicionales?**
R: Depende de los patrones de tráfico. Para tráfico esporádico, serverless suele ser más barato porque pagas solo por requests. Para tráfico alto y sostenido, contenedores provisionados o EC2 pueden ser más rentables.

**P: ¿Cómo testeo funciones Lambda localmente?**
R: Usa AWS SAM CLI o Serverless Framework para emular API Gateway y Lambda localmente. Estas herramientas montan tu código en un contenedor Docker que replica el entorno de runtime de AWS.

