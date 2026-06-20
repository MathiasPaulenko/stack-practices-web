---
contentType: recipes
slug: cold-start-optimization
title: "Minimizar la Latencia de Cold Start en Funciones Serverless"
description: "Cómo reducir tiempos de cold start en AWS Lambda, Azure Functions y Cloud Run usando concurrencia provisionada, lazy loading, tuning de runtime y optimización de dependencias."
metaDescription: "Aprende optimización de cold starts para funciones serverless. Reduce latencia en Lambda, Azure Functions y Cloud Run usando concurrencia provisionada."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - lambda
relatedResources:
  - /recipes/serverless-functions
  - /recipes/serverless-api-gateway
  - /recipes/lazy-loading
  - /recipes/query-optimization
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende optimización de cold starts para funciones serverless. Reduce latencia en Lambda, Azure Functions y Cloud Run usando concurrencia provisionada."
  keywords:
    - optimizacion cold start
    - cold start lambda
    - latencia serverless
    - concurrencia provisionada
    - reducir tiempo inicio
---

## Visión general

Las funciones serverless se ejecutan en contenedores efímeros creados bajo demanda. Cuando llega un request y no existe un contenedor cálido, el proveedor de cloud inicializa un nuevo runtime, carga tu código, importa dependencias y ejecuta el handler. Esta fase de inicialización — el cold start — agrega latencia que va desde 100ms hasta varios segundos dependiendo del runtime, asignación de memoria y tamaño de dependencias. Para APIs orientadas al usuario, los cold starts se traducen directamente en mala experiencia de usuario.

Los cold starts no son un bug; son un trade-off. El pricing serverless es por-request sin costo idle. Si quieres costo idle cero, debes aceptar overhead de inicialización ocasional. El objetivo no es eliminar cold starts por completo — eso requiere instancias always-on — sino minimizar su frecuencia y duración. Esta receta cubre concurrencia provisionada, selección de runtime, recorte de dependencias, inicialización lazy y caching en tiempo de inicialización en AWS Lambda, Azure Functions y Google Cloud Run.

## Cuándo usarlo

Usa esta receta cuando:

- Construyendo APIs sensibles a latencia en plataformas serverless (sub-200ms p99). Consulta [Serverless API Gateway](/recipes/api/nginx-reverse-proxy) para construir APIs HTTP con baja latencia.
- Experimentando quejas de usuarios sobre requests lentos después de períodos de inactividad. Consulta [Serverless Functions](/recipes/messaging/event-driven-microservices) para mejores prácticas de diseño de funciones.
- Migrando de servidores provisionados a serverless y necesitando latencia comparable
- Optimizando funciones Java, .NET o Ruby que sufren cold starts de varios segundos
- Ejecutando inferencia de machine learning o inicialización pesada en ambientes serverless. Consulta [Connection Pooling](/recipes/databases/database-connection-pooling) para gestionar conexiones a base de datos en serverless.

## Solución

### Concurrencia Provisionada (AWS Lambda / Terraform)

```hcl
resource "aws_lambda_function" "api" {
  function_name = "user-api"
  runtime       = "provided.al2"
  handler       = "bootstrap"
  memory_size   = 512
  timeout       = 10

  provisioned_concurrent_executions = 10
}

resource "aws_lambda_provisioned_concurrency_config" "api_warm" {
  function_name                     = aws_lambda_function.api.function_name
  qualifier                         = aws_lambda_function.api.version
  provisioned_concurrent_executions = 10
}
```

### Patrón de Inicialización Lazy (Python)

```python
import json
import boto3

_dynamodb = None
_s3 = None

def get_dynamodb():
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource('dynamodb')
    return _dynamodb

def get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client('s3')
    return _s3

def handler(event, context):
    if event['path'] == '/users':
        table = get_dynamodb().Table('users')
        return table.scan()
    elif event['path'].startswith('/files/'):
        return get_s3().get_object(Bucket='assets', Key=event['path'])
```

### SnapStart para Java (AWS Lambda)

```java
public class OrderHandler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {
    private static final OrderService orderService = initializeOrderService();

    private static OrderService initializeOrderService() {
        return new OrderService(
            DynamoDbClient.builder().build(),
            new ObjectMapper(),
            loadConfiguration()
        );
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent event, Context context) {
        return orderService.process(event);
    }
}
```

### Cloud Run Minimum Instances (gcloud)

```bash
gcloud run deploy api-service \
  --image gcr.io/project/api:latest \
  --min-instances 2 \
  --max-instances 100 \
  --region us-central1 \
  --platform managed
```

## Explicación

- **Fases de cold start**: un cold start consiste en tres fases — creación de ambiente (VPC, contenedor), inicialización de runtime (JVM, intérprete Python) e inicialización de código (importar módulos, crear clients). Las mayores ganancias vienen de optimizar las últimas dos fases, ya que la creación de ambiente está controlada por el proveedor.
- **Concurrencia provisionada**: AWS Lambda Provisioned Concurrency pre-inicializa un número fijo de ambientes de ejecución. Estos ambientes están cálidos y listos para responder inmediatamente. Pagas por la capacidad provisionada sin importar el volumen de requests. Úsala para endpoints de alto tráfico predecible, no para cargas de trabajo esporádicas.
- **SnapStart**: AWS Lambda SnapStart para Java toma un snapshot de una función completamente inicializada después de la fase init. Los cold starts subsecuentes restauran desde este snapshot en lugar de re-ejecutar la inicialización. Esto reduce cold starts de Java de 3-6 segundos a menos de 200ms.
- **Lazy loading**: inicializa recursos pesados solo cuando se necesitan. Si una función maneja 10 endpoints diferentes pero cada invocación solo usa uno, cargar las 10 dependencias upfront desperdicia tiempo de inicialización. Usa singletons lazy que crean clients en primer acceso.

## Variantes

| Estrategia | Impacto en costo | Reducción de cold start | Complejidad | Mejor para |
|------------|-----------------|------------------------|-------------|------------|
| Concurrencia provisionada | Alto (always-on) | Casi cero | Baja | APIs críticas |
| SnapStart (Java) | Ninguno | 80-90% | Baja | Funciones Java |
| Min instances (Cloud Run) | Medio | Casi cero | Baja | Workloads de contenedores |
| Inicialización lazy | Ninguno | 30-50% | Media | Funciones multi-propósito |
| Recorte de dependencias | Ninguno | 20-40% | Media | Todos los runtimes |

## Mejores prácticas

- **Elige el runtime correcto**: lenguajes compilados (Go, Rust) inician en milisegundos. Java y .NET inician en segundos a menos que uses SnapStart o Native AOT. Python y Node.js están en el medio. Para rutas críticas de latencia, prefiere runtimes compilados.
- **Mantén paquetes de deployment pequeños**: cada dependencia agrega tiempo de inicialización. Audita tus `node_modules` o `requirements.txt`. Remueve dev dependencies, features no usadas del SDK y bibliotecas infladas. Un paquete de 50MB inicializa más rápido que uno de 250MB.
- **Mueve inicialización fuera del handler**: el código a nivel top de tu módulo se ejecuta una vez por cold start. El código dentro del handler se ejecuta en cada invocación. Inicializa bases de datos, clients y configuración a nivel de módulo. Usa el handler solo para lógica específica del request.
- **Usa reúso de ambiente de ejecución**: después de un cold start, los contenedores de Lambda son reutilizados para invocaciones cálidas subsecuentes. Cachea conexiones, regexes compiladas y configuración parseada en scope global. Este cache gratis persiste a través de cientos de invocaciones cálidas.
- **Ping funciones para mantenerlas cálidas**: para funciones que no pueden usar concurrencia provisionada, programa una regla de CloudWatch EventBridge o Cloud Scheduler para hacer ping a la función cada 5 minutos. Esto es una solución rudimentaria pero efectiva para endpoints de bajo tráfico.

## Errores comunes

- **Inicializar dentro del handler**: crear una nueva conexión de base de datos en cada invocación destruye el performance. Un pool de conexiones creado dentro del handler se descarta después de cada invocación cálida. Mueve la inicialización del client a nivel de módulo.
- **Sobre-provisionar para eliminar todos los cold starts**: la concurrencia provisionada es cara. Si tu tráfico es bursty o de bajo volumen, el costo de mantener ambientes cálidos excede el valor de eliminar cold starts. Úsala selectivamente para tus top 3-5 endpoints críticos de latencia.
- **Ignorar cold starts de VPC**: las funciones dentro de un VPC deben inicializar una Elastic Network Interface (ENI), agregando 5-15 segundos a los cold starts. Usa VPC Lattice, PrivateLink o mueve la función fuera del VPC si no necesita acceso directo a base de datos.
- **Dependencias infladas**: importar el AWS SDK completo para una sola llamada a S3 carga cientos de módulos innecesarios. Usa SDKs modulares (`@aws-sdk/client-s3` en lugar de `aws-sdk`) o clientes HTTP con requests hand-crafted.

## Preguntas frecuentes

**P: ¿Puedo eliminar completamente los cold starts?**
R: Solo con instancias always-on (concurrencia provisionada, minimum instances). El pricing serverless true pay-per-request inherentemente incluye cold starts como trade-off. Para cold start realmente cero, usa contenedores con mínimo de réplicas o servidores dedicados.

**P: ¿Por qué Java tiene peores cold starts que Python?**
R: Java debe inicializar la JVM, cargar clases y compilar bytecode JIT. Python carga e interpreta archivos fuente secuencialmente. El inicio de JVM es inherentemente más pesado, aunque GraalVM Native Image y Lambda SnapStart cierran la brecha significativamente.

**P: ¿El tamaño de memoria afecta el tiempo de cold start?**
R: Sí. Lambda asigna CPU proporcionalmente a la memoria. Una función de 3GB obtiene 3x la CPU de una de 1GB. La inicialización (carga de módulos, creación de clients) corre más rápido con más memoria. Incrementar memoria de 128MB a 512MB frecuentemente reduce la latencia de cold start en un 50%.

**P: ¿Debería usar SnapStart o concurrencia provisionada para Java?**
R: SnapStart es más barato y suficiente para la mayoría de casos de uso Java. La concurrencia provisionada es para requisitos sub-100ms donde incluso los 100-200ms de SnapStart son inaceptables. Empieza con SnapStart, actualiza a concurrencia provisionada solo si los SLAs de latencia lo requieren.

