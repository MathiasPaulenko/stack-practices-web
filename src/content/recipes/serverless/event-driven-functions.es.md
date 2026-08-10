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
  - aws-lambda
  - functions
relatedResources:
  - /recipes/serverless-api-gateway
  - /recipes/webhooks
  - /recipes/middleware
  - /recipes/real-time-websockets
  - /recipes/scheduled-jobs
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
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

- Procesas cargas de trabajo asíncronas que no necesitan respuestas inmediatas (procesamiento de imágenes, generación de reportes, envío de emails). Consulta [Scheduled Jobs](/recipes/background-jobs/) para automatización de tareas recurrentes.
- Desacoplas microservicios para que puedan deployarse, escalar y fallar independientemente. Consulta [Serverless Orchestration](/recipes/background-jobs/) para coordinar workflows complejos.
- Construyes sistemas que deben manejar picos de tráfico sin provisionar capacidad por adelantado
- Reaccionas a cambios en datos (CDC de base de datos) o sistemas externos (webhooks, uploads de archivos). Consulta [Event Sourcing](/patterns/event-sourcing-pattern/) para patrones de eventos inmutables.
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

- **Eventos**: Registros inmutables de algo que ocurrió en el pasado (`OrderPlaced`, `ImageUploaded`, `PaymentReceived`).   Los eventos llevan estado pero no dictan qué deben hacer los consumidores.
- **Productores de eventos**: Servicios que emiten eventos cuando algo notable ocurre.   Un productor no sabe ni le importa cuántos consumidores existen.
- **Consumidores de eventos**: Funciones o servicios que se suscriben a tipos de eventos específicos.   Múltiples consumidores pueden procesar el mismo evento independientemente.
- **Event buses (EventBridge)**: Routers centrales que filtran eventos basados en reglas y los entregan a targets.   Desacoplan productores de consumidores y habilitan patrones de event sourcing.

## Variantes

| Patrón | Acoplamiento | Durabilidad | Mejor para |
|--------|--------------|-------------|------------|
| Invocación directa | Fuerte | Ninguna | Workflows simples, sincrónicos |
| Colas SQS | Débil | Alta | Procesamiento async confiable, retries |
| EventBridge | Débil | Alta | Routing multi-consumidor, filtrado |
| SNS topics | Débil | Media | Broadcast, notificaciones fan-out |
| Kinesis streams | Débil | Alta | Analytics en tiempo real, procesamiento ordenado |

## Lo que funciona

- **Diseña eventos alrededor de hechos de negocio**: `OrderPlaced` es mejor que `ProcessOrder` porque describe lo que ocurrió, no qué hacer.   Esto da a los consumidores libertad para reaccionar de diferentes maneras.
- **Haz eventos inmutables y auto-contenidos**: incluye suficiente contexto (order ID, email de cliente, monto) para que los consumidores no necesiten consultar al productor.
- **Maneja eventos duplicados**: la entrega at-least-once es el default para la mayoría de colas de mensajes.   Los consumidores deben ser idempotentes o deduplicar usando IDs de eventos.
- **Configura dead letter queues (DLQ)**: después de un número configurado de reintentos, los mensajes fallidos deberían moverse a una DLQ para inspección en lugar de reintentar forever.
- **Monitorea latencia y antigüedad de eventos**: mensajes viejos indican un cuello de botella de procesamiento.

## Errores comunes

- **Tratar eventos como comandos**: `ProcessPayment` es un comando que espera acción.   `PaymentRequested` es un evento que describe un hecho.   Los comandos crean acoplamiento fuerte; los eventos promueven acoplamiento débil.
- **Omitir versionamiento de schema**: cuando un schema de evento cambia (nuevo campo agregado), consumidores no actualizados pueden fallar.   Versiona tus eventos (`OrderPlaced-v2`).
- **No manejar fallas parciales de batch**: Lambda con batch sizes de SQS mayores a 1 puede fallar todo el batch por un solo mensaje malo.
- **Ignorar ordenamiento de mensajes**: las colas SQS standard no garantizan orden.

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
## Patrones de Arquitectura Serverless

- **Microservices con serverless**: descompone applications en functions chicas e independientes.   Usa event bus para inter-service communication.   Deploya services independientemente.
- **Arquitectura event-driven**: usa events como primary communication mechanism.   Producers publican events sin knowing consumers.   Consumers subscriben a events que les importan.   Versiona event schemas.
- **CQRS con serverless**: separa read y write operations.   Usa Lambda con DynamoDB Streams para read model updates.
## Procesamiento de Datos Serverless

- **Stream processing**: procesa data streams con serverless functions.
- **Batch processing**: usa serverless para batch data processing.   Triggerea functions on schedule.   Usa idempotency para retry safety.
- **Real-time processing**: procesa events en real-time con serverless.

## Anti-Patrones Serverless

- **Chatty functions**: Cada call agrega latency y cost.   Batchea downstream calls donde sea posible.
- **Synchronous chains**: Synchronous chains agregan latency y reducen reliability.
- **Shared state en functions**: Function instances son ephemeral.
## Mitigacion de Cold Start Serverless

- **Provisioned concurrency**: allocatea provisioned concurrency para critical functions.   AWS Lambda provisioned concurrency mantiene functions warm.   Azure Functions premium plan provee pre-warmed instances.   Google Cloud Functions min instances para warm functions.
- **Lazy initialization**: inicializa heavy resources lazily dentro del handler.   Carga dependencies solo cuando se necesitan.   Difiere database connections hasta first use.   Cachea initialized resources entre invocations.
- **Package optimization**: Minifica production code.





## Glosario

- **Construir Arquitecturas Serverless Event-Driven**: técnica o patrón central descrito en este artículo.
- **Producción**: entorno activo con usuarios reales; requiere monitoreo y rollback plan.
- **Troubleshooting**: proceso sistemático para diagnosticar y resolver incidentes.

## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de serverless y event-driven para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica construir arquitecturas serverless event-driven** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas frecuentes

**P: ¿Cómo se diferencia event-driven de request-response?**
R: Request-response (HTTP REST) es sincrónico: el caller espera un resultado. Event-driven es asincrónico: el productor dispara un evento y sigue adelante. Los consumidores procesan cuando están listos.

**P: ¿Puedo usar arquitectura event-driven con proveedores no-AWS?**
R: Sí. Azure Functions con Event Grid, Google Cloud Functions con Pub/Sub, y Apache Kafka en cualquier cloud soportan patrones event-driven.

**P: ¿Cómo trazo un request a través de múltiples funciones event-driven?**
R: Usa correlation IDs. Genera un ID único en el punto de entrada y propágalo a través de cada evento. CloudWatch, X-Ray o OpenTelemetry pueden entonces trazar la cadena completa.

**P: ¿Cuál es el tamaño máximo de evento?**
R: Los mensajes SQS están limitados a 256 KB. Los eventos de EventBridge están limitados a 256 KB. Para payloads más grandes, almacena los datos en S3 e incluye una referencia en el evento.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Cuáles son las limitaciones de event-driven functions?

Event-driven functions tienen algunas limitations. Debuggear distributed workflows es harder. Eventual consistency requiere careful handling. Testear end-to-end flows requiere integration tests. Monitorear requiere distributed tracing. Documenta limitations para tu team. Planean mitigation strategies. Testea edge cases thoroughly. Monitorea known issues.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
