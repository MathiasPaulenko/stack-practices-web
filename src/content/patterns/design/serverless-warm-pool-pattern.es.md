---
contentType: patterns
slug: serverless-warm-pool-pattern
title: "Patron Serverless Warm Pool"
description: "Mantén las funciones Lambda calientes enviando pings periodicos para reducir la latencia de cold start en workloads sensibles a latencia."
metaDescription: "Patron serverless warm pool: envia pings periodicos a Lambda para reducir latencia de cold start. Implementa con EventBridge Scheduler y Python."
difficulty: intermediate
topics:
  - serverless
  - design
tags:
  - serverless
  - warm-pool
  - cold-start
  - patron
  - lambda
  - eventbridge
  - performance
  - python
  - typescript
relatedResources:
  - /patterns/design/serverless-throttling-pattern
  - /patterns/design/serverless-function-composition-pattern
  - /recipes/serverless/aws-lambda-cold-start-optimization
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patron serverless warm pool: envia pings periodicos a Lambda para reducir latencia de cold start. Implementa con EventBridge Scheduler y Python."
  keywords:
    - serverless warm pool
    - lambda cold start
    - lambda warmup
    - eventbridge scheduler
    - provisioned concurrency
    - lambda ping keep warm
---

# Patron Serverless Warm Pool

## Descripcion general

Un cold start ocurre cuando Lambda crea un nuevo entorno de ejecucion para una funcion que no tiene instancias calientes. La inicializacion anade latencia: descargar codigo, iniciar el runtime, cargar dependencias. Los cold starts tipicamente anaden 500ms a 5s dependiendo del runtime y tamano del paquete.

El patron warm pool envia eventos ping periodicos para mantener los entornos de ejecucion vivos. Lambda reutiliza entornos calientes para invocaciones subsiguientes, evitando latencia de cold start. Esto es util para APIs sensibles a latencia donde un cold start de 2 segundos es inaceptable.

AWS tambien ofrece provisioned concurrency, que mantiene un numero pre-definido de entornos calientes. El patron warm pool es una alternativa mas ligera: usa pings programados en lugar de pagar por instancias siempre calientes.

## Cuando usarlo

- APIs sensibles a latencia donde el cold start degrada la experiencia del usuario
- Funciones con inicializacion pesada (dependencias grandes, pools de conexiones a DB)
- Quieres reducir cold starts sin pagar por provisioned concurrency
- El trafico es esporadico: bursts seguidos de periodos idle donde los entornos expirarian
- Necesitas tiempos de respuesta predecibles para cumplimiento de SLA

## Solucion

### Estrategia 1: EventBridge Scheduler Ping (Python CDK)

```python
from aws_cdk import (
    Stack,
    Duration,
    aws_lambda as lambda_,
    aws_events as events,
    aws_events_targets as targets,
)
from constructs import Construct

class WarmPoolStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # La funcion a mantener caliente
        api_function = lambda_.Function(self, "ApiFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="api.handler",
            code=lambda_.Code.from_asset("lambda/api"),
            timeout=Duration.seconds(30),
            reserved_concurrent_executions=5,  # Limitar tamano del warm pool
        )

        # Funcion warmup que envia pings
        warmup_function = lambda_.Function(self, "WarmupFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="warmup.handler",
            code=lambda_.Code.from_asset("lambda/warmup"),
            timeout=Duration.seconds(30),
        )

        # Conceder permiso a warmup para invocar la funcion API
        api_function.grant_invoke(warmup_function)

        # Programar warmup cada 5 minutos
        warmup_rule = events.Rule(self, "WarmupSchedule",
            schedule=events.Schedule.rate(Duration.minutes(5)),
        )
        warmup_rule.add_target(targets.LambdaFunction(warmup_function))

        # Pasar el nombre de la funcion API como variable de entorno
        warmup_function.add_environment("TARGET_FUNCTION", api_function.function_name)
        warmup_function.add_environment("WARM_COUNT", "5")
```

### Warmup Lambda Handler (Python)

```python
import boto3
import json
import os

lambda_client = boto3.client('lambda')
TARGET_FUNCTION = os.environ['TARGET_FUNCTION']
WARM_COUNT = int(os.environ.get('WARM_COUNT', '5'))

def handler(event, context):
    # Enviar invocaciones ping concurrentes para calentar multiples entornos
    import concurrent.futures

    def send_ping(instance_id: int) -> dict:
        response = lambda_client.invoke(
            FunctionName=TARGET_FUNCTION,
            InvocationType='Event',  # Invocacion async
            Payload=json.dumps({
                "source": "warmup.ping",
                "instanceId": instance_id,
                "isWarmup": True,
            }),
        )
        return {"instanceId": instance_id, "status": response['StatusCode']}

    with concurrent.futures.ThreadPoolExecutor(max_workers=WARM_COUNT) as executor:
        results = list(executor.map(send_ping, range(WARM_COUNT)))

    return {
        "warmedInstances": len(results),
        "targetFunction": TARGET_FUNCTION,
    }
```

### API Function con deteccion de warmup (Python)

```python
import json

def handler(event, context):
    # Detectar ping de warmup y devolver inmediatamente
    if isinstance(event, dict) and event.get("isWarmup"):
        return {"status": "warm", "instanceId": event.get("instanceId")}

    # Procesamiento de peticion real
    http_method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    # La inicializacion pesada ocurre aqui (cargada una vez, reutilizada para invocaciones calientes)
    # Dependencias, conexiones a DB, etc.

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Request processed", "path": path}),
    }
```

### Estrategia 2: Provisioned Concurrency (CDK)

```python
from aws_cdk import (
    Stack,
    Duration,
    aws_lambda as lambda_,
)
from constructs import Construct

class ProvisionedConcurrencyStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Lambda con alias y provisioned concurrency
        function = lambda_.Function(self, "ApiFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="api.handler",
            code=lambda_.Code.from_asset("lambda/api"),
            timeout=Duration.seconds(30),
        )

        # Crear un alias para la version actual
        alias = lambda_.Alias(self, "LiveAlias",
            alias_name="live",
            version=function.current_version,
            provisioned_concurrent_executions=10,  # Siempre 10 instancias calientes
        )
```

### TypeScript Warmup Handler

```typescript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const TARGET_FUNCTION = process.env.TARGET_FUNCTION!;
const WARM_COUNT = parseInt(process.env.WARM_COUNT || '5');

export const handler = async (): Promise<{ warmedInstances: number }> => {
  const promises = Array.from({ length: WARM_COUNT }, (_, i) =>
    lambdaClient.send(new InvokeCommand({
      FunctionName: TARGET_FUNCTION,
      InvocationType: 'Event',  // Async
      Payload: JSON.stringify({
        source: 'warmup.ping',
        instanceId: i,
        isWarmup: true,
      }),
    }))
  );

  const results = await Promise.all(promises);

  return {
    warmedInstances: results.length,
  };
};
```

### API Handler con check de warmup (TypeScript)

```typescript
interface WarmupEvent {
  source: string;
  instanceId: number;
  isWarmup: boolean;
}

interface ApiEvent {
  httpMethod: string;
  path: string;
  body?: string;
}

export const handler = async (event: WarmupEvent | ApiEvent): Promise<any> => {
  // Detectar ping de warmup
  if ('isWarmup' in event && event.isWarmup) {
    return { status: 'warm', instanceId: event.instanceId };
  }

  // Procesamiento de peticion real
  const { httpMethod, path } = event as ApiEvent;

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Request processed', path }),
  };
};
```

## Explicacion

Lambda reutiliza entornos de ejecucion entre invocaciones. Despues de que una invocacion completa, el entorno permanece caliente por unos minutos (tipicamente 5-15 minutos, varia). Si una nueva invocacion llega dentro de esa ventana, Lambda reutiliza el entorno caliente, saltando la inicializacion.

El patron warm pool explota esto enviando pings periodicos. Cada ping invoca la funcion con un payload especial (`isWarmup: true`). La funcion detecta el evento de warmup y devuelve inmediatamente sin hacer trabajo real. Esto mantiene el entorno vivo.

El numero de pings concurrentes determina el tamano del warm pool. Si envias 5 pings concurrentes, Lambda crea 5 entornos calientes. Las peticiones reales subsiguientes se distribuyen entre estos entornos calientes.

Provisioned concurrency es la alternativa gestionada. AWS mantiene un numero especificado de entornos siempre calientes, independientemente del trafico. Cuesta mas pero proporciona capacidad caliente garantizada sin necesidad de eventos ping.

## Variantes

| Enfoque | Mecanismo | Coste | Ideal para |
|---------|-----------|-------|------------|
| EventBridge ping | Lambda programado invoca target | Bajo (solo coste de invocacion) | Trafico esporadico, sensible a coste |
| Provisioned concurrency | Instancias calientes gestionadas por AWS | Mayor (pagas por reservado) | Trafico predecible, con SLA |
| CloudWatch alarm ping | Alarma dispara warmup en pico de trafico | Bajo | Warmup reactivo antes de burst |
| Self-ping (recursivo) | Funcion programa su siguiente ping | Bajo | Warmup de funcion unica |
| API Gateway warmup | Endpoint que dispara warmup en primera peticion | Bajo | Warmup on-demand |

## Buenas practicas

- **Establece el intervalo de ping a 3-5 minutos** — los entornos Lambda expiran tras 5-15 minutos de inactividad. Haz ping cada 5 minutos para mantener los entornos calientes. Pingear mas frecuentemente desperdicia invocaciones.
- **Usa invocaciones async para pings** — establece `InvocationType: 'Event'` para que la funcion warmup no espere a que el target responda. Esto reduce el tiempo de ejecucion y coste de la funcion warmup.
- **Detecta y salta eventos de warmup en el target** — comprueba `isWarmup: true` al inicio del handler y devuelve inmediatamente. No ejecutes logica de negocio para pings de warmup.
- **Matchea el warm count con la concurrencia esperada** — si tu API tipicamente maneja 10 peticiones concurrentes, calienta 10 instancias. Calentar mas de lo necesario desperdicia dinero; calentar menos deja cold starts.
- **Considera provisioned concurrency para produccion** — provisioned concurrency es mas fiable que pings. Si los cold starts son inaceptables, paga por provisioned concurrency y usa pings como fallback.

## Errores comunes

- **Pingear demasiado frecuente** — pingear cada minuto desperdicia invocaciones. Los entornos Lambda permanecen calientes por varios minutos. Haz ping cada 5 minutos.
- **No detectar eventos de warmup** — si la funcion target procesa pings de warmup como peticiones reales, puede disparar efectos secundarios (escrituras a DB, llamadas a API). Siempre comprueba `isWarmup` primero.
- **Calentar solo una instancia** — un solo ping mantiene un entorno caliente. Si el trafico requiere 10 instancias concurrentes, envia 10 pings concurrentes.
- **Usar warm pool para funciones de bajo trafico** — si la funcion raramente se invoca, el coste de warmup excede el coste de cold start. Solo calienta funciones con trafico frecuente y sensible a latencia.
- **Ignorar provisioned concurrency** — para APIs de produccion con SLAs estrictos, provisioned concurrency es mas fiable. Los pings pueden perder la ventana si el trafico llega entre pings.

## Preguntas frecuentes

### Cuanto tiempo permanece caliente un entorno Lambda?

Lambda no documenta la duracion exacta. Varia de 5 a 15 minutos dependiendo de region, runtime y capacidad de AWS. En la practica, pingear cada 5 minutos mantiene los entornos calientes de forma fiable.

### Cual es la diferencia entre warm pool y provisioned concurrency?

Warm pool envia pings periodicos para mantener los entornos vivos entre bursts de trafico. Provisioned concurrency mantiene un numero fijo de entornos siempre calientes, gestionados por AWS. Provisioned concurrency es mas fiable pero cuesta mas. Warm pool es mas barato pero no garantizado.

### Funciona el warming para todos los runtimes?

Si, pero el beneficio varia. Java y .NET tienen los cold starts mas largos (2-10 segundos) y se benefician mas. Python y Node.js tienen cold starts mas cortos (200-500ms) y se benefician menos. Para Java, considera provisioned concurrency en lugar de pings.

### Puedo eliminar los cold starts por completo?

No. Warm pool y provisioned concurrency reducen los cold starts pero no los eliminan. Si el trafico excede el tamano del warm pool, se crean nuevos entornos con cold starts. Escala el warm count o provisioned concurrency para matchear la concurrencia pico esperada.

### Cuanto cuesta el patron warm pool?

Cada ping es una invocacion Lambda. A intervalos de 5 minutos con 5 pings concurrentes, son 5 invocaciones cada 5 minutos = 1.440 invocaciones por dia. A $0.20 por millon de invocaciones, el coste es insignificante. El coste principal es el tiempo de compute de cada invocacion ping.
