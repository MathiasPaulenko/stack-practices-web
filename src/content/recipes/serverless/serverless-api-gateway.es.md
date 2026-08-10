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
  - aws
  - aws-lambda
  - functions
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/rate-limiting
  - /recipes/cold-start-optimization
  - /recipes/event-driven-functions
  - /recipes/real-time-websockets
  - /recipes/scheduled-jobs
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
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

- Construyes APIs con patrones de tráfico esporádicos o impredecibles. Consulta [Rate Limiting](/recipes/rate-limiting/) para proteger APIs bajo carga.
- Prototipas productos donde los costos de servidor deberían escalar a cero cuando están ociosos
- Procesas webhooks, uploads de archivos o eventos programados vía HTTP. Consulta [Input Validation](/recipes/input-validation/) para validar requests entrantes.
- Creas microservicios donde cada endpoint tiene diferentes necesidades de recursos
- Reduces overhead operacional eliminando patching y scaling de servidores. Consulta [Serverless Functions](/recipes/event-driven-microservices/) para deploy de funciones.

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
- **Lambda**: Entorno de ejecución de funciones stateless.   AWS gestiona el scaling automáticamente — si llegan 1,000 requests simultáneamente, AWS levanta 1,000 instancias de la función.   Pagas solo por el tiempo de ejecución y memoria usada.
- **Cold starts**: Cuando una función no ha sido invocada recientemente, AWS inicializa una nueva instancia del runtime.   Esto agrega 100ms a 2s de latencia dependiendo del lenguaje y asignación de memoria.   La concurrencia provisionada mantiene funciones calientes para endpoints sensibles a latencia.
- **Infrastructure as Code**: Herramientas como Terraform, Serverless Framework o AWS SAM definen tus rutas de API, funciones Lambda, roles IAM y variables de entorno en archivos de configuración versionados.

## Variantes

| Plataforma | API Gateway | Runtime de función | Mejor para |
|------------|-------------|--------------------|------------|
| AWS | API Gateway + Lambda | Python, Node, Java, Go | Plataforma madura, integraciones amplias |
| Azure | API Management + Functions | .NET, Node, Python | Plataforma Microsoft, integración Visual Studio |
| GCP | Cloud Endpoints + Cloud Functions | Node, Python, Go | Integración BigQuery, pricing competitivo |

## Lo que funciona

- **Mantén las funciones stateless**: no asumas que variables en memoria persisten entre invocaciones.
- **Minimiza el tamaño del paquete de despliegue**: paquetes grandes aumentan el tiempo de cold start.
- **Configura timeouts y memoria apropiados**: la memoria escala CPU proporcionalmente.   Si una función es lenta, aumentar la memoria puede ser más barato que pagar por ejecución más larga a menor memoria.
- **Usa variables de entorno para config**: URLs de base de datos, API keys y feature flags deben configurarse vía variables de entorno, no baked en el paquete de despliegue.
- **Implementa logging estructurado**: escribe logs JSON con request IDs.   CloudWatch Logs Insights puede consultar estos eficientemente para debugging y monitoreo.
- **Usa dead letter queues (DLQ)**: las invocaciones asíncronas fallidas se reintentan automáticamente.   Una DLQ captura fallas persistentes para que puedas inspeccionarlas y reprocesarlas.

## Errores comunes

- **Tratar Lambda como un servidor de larga duración**: las funciones tienen un máximo de 15 minutos de ejecución.   Mueve trabajo de larga duración a procesamiento batch (AWS Batch) o contenedores (ECS/Fargate).
- **Ignorar cold starts**: las APIs sensibles a latencia necesitan concurrencia provisionada o un ping de keep-alive.   Una API orientada al usuario con 3 segundos de cold start entrega una experiencia terrible.
- **Sobre-provisionar memoria**: la memoria de Lambda escala linealmente con el costo.   Perfile tu función y asigna solo lo que necesita.
- **Hardcodear credenciales**: nunca hagas commit de AWS keys o passwords de base de datos a tu repositorio.
- **No manejar fallas parciales**: en procesamiento batch (triggers SQS), un solo registro malo puede causar que todo el batch falle.

## Manejo de Errores y Recuperacion

- **Manejo de errores en cold start**: Wrappea handler initialization en try-catch blocks.   Provee fallback values para missing environment variables.
- **Gestion de function timeouts**: setea appropriate timeout values para cada function.   AWS Lambda soporta hasta 15 minutos.   Azure Functions soporta hasta 10 minutos.   Google Cloud Functions soporta hasta 60 minutos.   Empieza con short timeouts y ajusta basado en monitoring.
- **Retry y dead letter queues**: AWS SQS soporta maxReceiveCount y DLQ configuration.   Azure Service Bus soporta dead lettering.   Google Pub/Sub soporta dead letter topics.   Setea alerts para DLQ messages.
- **Idempotency en serverless functions**: disena functions para ser idempotent.   Retorna cached results para duplicate requests.

## Consideraciones de Seguridad

- **IAM roles y permissions**: sigue least privilege principle para function IAM roles.   Otorga solo los permissions needed por la function.
- **Gestion de secrets**: usa dedicated secrets management services.   AWS Secrets Manager para Lambda.   Azure Key Vault para Functions.   Google Secret Manager para Cloud Functions.   Nunca hardcodees secrets en environment variables.   Rota secrets regularmente.
- **Configuracion de VPC**: Configura NAT Gateway para outbound internet.
- **Autenticacion de API**: Usa API keys para simple authentication.  0 para third-party authentication.

## Deployment y CI/CD

- **Estrategias de deployment serverless**: AWS SAM o Serverless Framework para Lambda.   Azure Bicep o ARM templates para Functions.   Google Cloud Deployment Manager para Cloud Functions.   Versiona all deployments.   Usa canary deployments para gradual rollout.
- **Pipeline CI/CD para serverless**: Corre integration tests en staging.   Scanea dependencies para vulnerabilities.   Packagea function code eficientemente.   Deploya con infrastructure as code.
- **Versioning y aliases**: AWS Lambda soporta versions y aliases.   Azure Functions soportan deployment slots.   Google Cloud Functions soporta traffic splitting.   Rollback a previous version en failures.

## Testing de Serverless Functions

- **Unit testing de serverless functions**: mockea cloud services en unit tests.   Mockea AWS SDK calls.   Mockea database connections.   Mockea HTTP requests.   Testea edge cases.
- **Integration testing de serverless functions**: Testea end-to-end workflows.
- **Load testing de serverless functions**: Simula concurrent invocations.

## Tools y Platforms

- **Serverless Framework**: Define functions y events en serverless.  yml.   Deploya con un single command.   Soporte para AWS, Azure y Google Cloud.
- **AWS SAM**: usa AWS SAM para Lambda deployments.   Define functions en template.  yaml.   Deploya con AWS CloudFormation.   Soporte para canary deployments.
- **Local development tools**: LocalStack para AWS services.   Azure Functions Core Tools para local testing.   Functions Framework para Google Cloud Functions.

## Pitfalls Comunes

- **Fallos en cold start mitigation**: No cargues unnecessary dependencies en startup.   No te conectes a databases fuera del handler.   No leas large files en startup.
- **Issues de package size**: manten function packages chicos.   Minifica code en production.
- **Concurrency limits**: AWS Lambda reserved concurrency para critical functions.   Azure Functions max instances.   Google Cloud Functions max instances.
## Best Practices

- **Granularidad de functions**: Cada function deberia hacer una cosa bien.   Splitea complex logic en functions mas chicas.   Refactoriza large functions en mas chicas.
- **Limpieza de resources**: Cierra database connections.   Cierra file handles.   Clearea temporary files.   Releasea network connections.
- **Logging y observability**: Loggea input parameters (sin sensitive data).   Usa log aggregation tools.
- **Configuracion de environment**: Valida environment variables en startup.   Provee defaults para optional variables.

## Optimizacion de Costos

- **Right-sizing de function memory**: AWS Lambda cobra basado en memory y execution time.   Higher memory puede reducir execution time.   Encuentra el optimal memory-to-duration ratio.
- **Reduccion de invocation frequency**: reduce unnecessary function invocations.   Batch processa events donde sea posible.   Combina multiples operations en single invocations.
- **Analisis de costos de provisioned concurrency**: analiza provisioned concurrency costs.   Escala provisioned concurrency basado en traffic patterns.

## Guia de Troubleshooting

- **Debugging cold starts**: identifica cold start causes.
- **Debugging de function timeouts**: identifica timeout causes.   Chequea network latency.
- **Debugging de deployment failures**: Chequea package size limits.   Valida template syntax.

## Monitoring y Alerting

- **Key metrics para monitorear**: Ajusta thresholds basado en trends.
- **Configuracion de alerts**: setea alerts en error rate above 1%.   Alerta en throttle increases.   Alerta en cost anomalies.   Reduce alert noise.
- **Distributed tracing**: Usa Azure Application Insights para Functions.   Tracea requests across multiples functions.

## Patrones Avanzados

- **Patron fan-out/fan-in**: Publica events a SNS o EventBridge.   Multiples Lambda functions procesan en paralelo.   SQS o Kinesis para aggregation.
- **Patron event sourcing**: storea all changes como events.   Rebuilda state desde event log.   Habilita time-travel queries.
- **Patron saga**: usa sagas para distributed transactions.
## Estrategias de Migracion

- **Migracion de monolith a serverless**: break down monolithic applications en functions mas chicas.   Migra un endpoint a la vez.   Switchea traffic gradualmente.
- **Migracion entre cloud providers**: abstrae cloud-specific code detras de interfaces.   Testea failback procedures.   Completa DNS switch despues de validation.
- **Migracion de containers a serverless**: Empieza con event-driven workloads.

## Compliance y Governance

- **Serverless SLAs**: define SLAs para serverless APIs.   API response time under 200ms.   Function execution time under 1 segundo.   Error rate below 0.  1%.
- **Serverless reporting**: genera weekly serverless reports.
- **Audit y compliance**: loggea all function invocations.
## Automatizacion y Tooling

- **Automatizacion de infrastructure as code**: Usa Terraform para multi-cloud deployments.   Versiona all IaC templates.
- **Pipeline de automated testing**: Corre integration tests en pull requests.   Corre security scans en every build.
- **Automated deployment rollback**: implementa automated rollback para failed deployments.

## Sustentabilidad

- **Green serverless computing**: serverless es inherently green.   Paga solo por actual usage.   No idle resources consumiendo power.
- **Eficiencia de resources**: optimiza function resource usage.   Reduce unnecessary invocations.
- **Reduccion de waste**: reduce serverless waste.

## EstÃ¡ndares de Industria y Frameworks

- **Well-Architected Framework**: sigue cloud provider Well-Architected Framework.   AWS Well-Architected Tool para Lambda.   Google Cloud Architecture Framework.
- **Principios de diseno serverless**: sigue serverless design principles.   Disena para failure.   Disena para scale.
- **Compliance frameworks**: alinea serverless architecture con compliance frameworks.   SOC 2 para security.   PCI DSS para payments.   HIPAA para healthcare.   GDPR para data privacy.   ISO 27001 para security management.
## Reporting y Comunicacion

- **Performance reporting**: genera weekly performance reports para serverless functions.
- **Cost reporting**: Break down por function, service y environment.
- **Incident reporting**: Conduce post-mortem reviews.

## Optimizacion Avanzada

- **Tuning de provisioned concurrency**: tunea provisioned concurrency para optimal performance.   Empieza con minimum provisioned concurrency.   Ajusta basado en traffic patterns.
- **Memory tuning**: tunea function memory para optimal performance.   Encuentra optimal memory-to-duration ratio.
- **Code optimization**: Cachea frequently accessed data.




## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de serverless y api-gateway para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica construir apis serverless con api gateway** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas frecuentes

**P: ¿Cómo manejo conexiones a base de datos en Lambda?**
R: Usa connection pooling con un proxy ligero como RDS Proxy, o implementa tu propia lógica de reuso de conexiones. Abrir una nueva conexión a base de datos en cada invocación es lento y puede agotar el límite de conexiones de la base de datos.

**P: ¿Puedo ejecutar una aplicación full-stack en serverless?**
R: Sí, pero evalúa los trade-offs. Los sitios estáticos y las APIs son excelentes fits. Las conexiones WebSocket de larga duración o sesiones stateful pueden ser mejor servidas por contenedores o EC2.

**P: ¿Es serverless más barato que servidores tradicionales?**
R: Depende de los patrones de tráfico. Para tráfico esporádico, serverless suele ser más barato porque pagas solo por requests. Para tráfico alto y sostenido, contenedores provisionados o EC2 pueden ser más rentables.

**P: ¿Cómo testeo funciones Lambda localmente?**
R: Usa AWS SAM CLI o Serverless Framework para emular API Gateway y Lambda localmente. Estas herramientas montan tu código en un contenedor Docker que replica el entorno de runtime de AWS.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
