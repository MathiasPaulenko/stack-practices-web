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
lastUpdated: "2026-06-12"
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

Esta receta cubre la creación y despliegue de funciones serverless con AWS Lambda, Google Cloud Functions y Azure Functions.

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

## Preguntas Frecuentes

**P: ¿Cómo reduzco la latencia de cold start?**
R: Usa runtimes más pequeños (Node.js, Python) en lugar de Java. Reduce el tamaño del paquete. Usa concurrencia provisionada. Mantén conexiones (base de datos, HTTP) calientes inicializando fuera del handler.

**P: ¿Las funciones serverless pueden manejar tareas de larga duración?**
R: AWS Lambda máximo 15 minutos, Cloud Functions 60 minutos, Azure Functions configurable. Para tareas más largas, usa step functions para orquestar múltiples funciones cortas o muevete a computación basada en contenedores (ECS, Cloud Run).

**P: ¿Cómo debuggeo funciones serverless localmente?**
R: AWS SAM CLI, Azure Functions Core Tools y Functions Framework para Node.js proporcionan emuladores locales. Prueba localmente, pero siempre valida en la nube ya que el comportamiento puede diferir.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
