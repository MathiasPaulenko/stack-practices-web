---
contentType: recipes
slug: serverless-orchestration
title: "Orquestar Workflows Serverless con Step Functions y Máquinas de Estados"
description: "Cómo coordinar procesos serverless complejos usando AWS Step Functions, Temporal y Durable Functions para gestionar estado, reintentos y manejo de errores entre funciones distribuidas."
metaDescription: "Aprende orquestación serverless con Step Functions y máquinas de estados. Coordina workflows, gestiona estado, reintentos y errores entre funciones distribuidas."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
relatedResources:
  - /recipes/cold-start-optimization
  - /recipes/event-driven-architecture
  - /recipes/saga-pattern
  - /recipes/api-gateway
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende orquestación serverless con Step Functions y máquinas de estados. Coordina workflows, gestiona estado, reintentos y errores entre funciones distribuidas."
  keywords:
    - orquestacion serverless
    - AWS Step Functions
    - maquina estados workflow
    - funciones distribuidas
    - workflows serverless
---

## Visión general

Una sola función AWS Lambda puede procesar una petición HTTP, redimensionar una imagen o validar un formulario. Pero los workflows del mundo real raramente son tan simples. Un pedido de e-commerce implica validar inventario, cobrar pago, enviar confirmación, actualizar analytics y programar envío. Cada paso es una función; el workflow es la lógica de coordinación que decide qué llamar a continuación, qué hacer ante fallas y cómo reintentar errores transitorios.

Escribir esta coordinación dentro de funciones Lambda crea código spaghetti: la función A llama a B, que llama a C, que llama a D. Si D falla, C debe manejar la compensación, que también puede fallar, requiriendo más manejo de errores. La lógica de negocio se entrelaza con networking, reintentos, timeouts y persistencia de estado. Las herramientas de orquestación de workflows — AWS Step Functions, Azure Durable Functions, Temporal — externalizan esta coordinación en máquinas de estados. Las funciones se convierten en lógica pura de negocio; el orquestador maneja el flujo de ejecución, estado, reintentos y recuperación. Esta receta cubre diseño de máquinas de estados, patrones de orquestación e implementación práctica.

## Cuándo usarlo

Usa esta receta cuando:

- Un proceso serverless tiene más de dos pasos dependientes
- Los pasos deben reintentarse con backoff ante fallas transitorias
- El estado del workflow debe sobrevivir a timeouts o crashes de funciones
- Se requieren esperas de aprobación humana o eventos externos a mitad del workflow
- Múltiples funciones deben coordinarse con ramas paralelas y puntos de join

## Solución

### AWS Step Functions (ASL — Amazon States Language)

```json
{
  "Comment": "Order Processing Workflow",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:validateOrder",
      "Next": "CheckInventory",
      "Catch": [
        {
          "ErrorEquals": ["ValidationException"],
          "Next": "NotifyCustomerInvalid"
        }
      ]
    },
    "CheckInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:checkInventory",
      "Next": "ProcessPayment",
      "Retry": [
        {
          "ErrorEquals": ["ServiceUnavailable"],
          "IntervalSeconds": 2,
          "MaxAttempts": 3,
          "BackoffRate": 2
        }
      ]
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:processPayment",
      "Next": "ParallelTasks",
      "Catch": [
        {
          "ErrorEquals": ["PaymentFailed"],
          "Next": "ReleaseInventory"
        }
      ]
    },
    "ParallelTasks": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "SendEmail",
          "States": {
            "SendEmail": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789:function:sendEmail",
              "End": true
            }
          }
        },
        {
          "StartAt": "UpdateAnalytics",
          "States": {
            "UpdateAnalytics": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789:function:updateAnalytics",
              "End": true
            }
          }
        }
      ],
      "Next": "ScheduleShipment"
    },
    "ScheduleShipment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:scheduleShipment",
      "End": true
    },
    "ReleaseInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:releaseInventory",
      "Next": "NotifyCustomerFailed"
    },
    "NotifyCustomerInvalid": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:notifyCustomer",
      "End": true
    },
    "NotifyCustomerFailed": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:notifyCustomer",
      "End": true
    }
  }
}
```

### Temporal Workflow (TypeScript SDK)

```typescript
import { workflow, activity } from '@temporalio/workflow';

const validateOrder = activity('validateOrder');
const checkInventory = activity('checkInventory');
const processPayment = activity('processPayment');
const sendEmail = activity('sendEmail');
const updateAnalytics = activity('updateAnalytics');
const scheduleShipment = activity('scheduleShipment');
const releaseInventory = activity('releaseInventory');

export async function orderWorkflow(order: OrderInput): Promise<OrderResult> {
  try {
    await validateOrder(order);
    await checkInventory(order.items);
    await processPayment({ orderId: order.id, amount: order.total });

    await Promise.all([
      sendEmail({ orderId: order.id, template: 'confirmation' }),
      updateAnalytics({ event: 'order_placed', orderId: order.id }),
    ]);

    await scheduleShipment({ orderId: order.id, address: order.address });
    return { status: 'completed', orderId: order.id };
  } catch (error) {
    if (error.type === 'PaymentFailed') {
      await releaseInventory({ orderId: order.id });
    }
    throw error;
  }
}
```

### Azure Durable Functions (Python)

```python
import azure.functions as func
import azure.durable_functions as df

myApp = df.DFApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@myApp.route(route="orchestrators/{functionName}")
@myApp.durable_client_input(client_name="client")
async def http_start(req: func.HttpRequest, client):
    instance_id = await client.start_new(req.route_params["functionName"], None, None)
    return client.create_check_status_response(req, instance_id)

@myApp.orchestration_trigger(context_name="context")
def order_orchestrator(context: df.DurableOrchestrationContext):
    order = context.get_input()

    try:
        yield context.call_activity("validate_order", order)
        yield context.call_activity("check_inventory", order["items"])
        yield context.call_activity("process_payment", order)

        tasks = [
            context.call_activity("send_email", order),
            context.call_activity("update_analytics", order),
        ]
        yield context.task_all(tasks)

        yield context.call_activity("schedule_shipment", order)
        return {"status": "completed"}

    except Exception as e:
        if "PaymentFailed" in str(e):
            yield context.call_activity("release_inventory", order)
        raise
```

## Explicación

- **Máquinas de estados**: Step Functions representa workflows como máquinas de estados JSON. Cada estado es un paso (Task, Choice, Parallel, Wait, Pass). Las transiciones definen el flujo. La máquina de estados misma es persistida por AWS, así que si una Lambda se agota de tiempo, Step Functions la reintenta según la política configurada sin perder el contexto del workflow.
- **Ejecución durable (Temporal)**: los workflows de Temporal son código, no JSON. Una función de workflow corre como un replay determinista de eventos — cada ejecución de actividad se registra como un evento. Si el worker se cae, otro worker reproduce el workflow desde el último evento registrado, saltando actividades ya completadas. Esto hace los workflows durable sin gestión de estado explícita.
- **Fan-out / fan-in**: las ramas paralelas (enviar email y actualizar analytics simultáneamente) reducen la duración total del workflow. En Step Functions, usa un estado `Parallel`. En Temporal, usa `Promise.all()`. En Durable Functions, usa `task.all()`. El orquestador espera a que todas las ramas completen antes de continuar.
- **Eventos externos**: los workflows pueden esperar señales externas. Un workflow puede pausar en "Esperar aprobación manual" por horas o días. Step Functions soporta callbacks y tareas wait-for-callback. Temporal soporta señales — mensajes externos que un workflow puede esperar. Durable Functions soporta eventos externos vía `wait_for_external_event()`.

## Variantes

| Orquestador | Formato | Vendor | Mejor para | Modelo de costo |
|-------------|---------|--------|------------|-----------------|
| Step Functions | JSON ASL | AWS | Nativo AWS, diseño visual | Por transición de estado |
| Temporal | Código (cualquier lenguaje) | Open-source | Lógica compleja, portabilidad | Self-hosted / Cloud |
| Durable Functions | Código (.NET/JS/Python) | Azure | Usuarios de Azure Functions | Ejecución + storage |
| Camunda | BPMN | Open-source | Modelado de procesos de negocio | Self-hosted / SaaS |

## Mejores prácticas

- **Mantén las funciones Lambda stateless e idempotentes**: el orquestador maneja el estado; las funciones deben ser puras. Si una función es reintentada, debe producir el mismo resultado sin efectos secundarios. Usa claves de idempotencia pasadas desde el orquestador para deduplicar operaciones en sistemas downstream.
- **Usa backoff exponencial con jitter para reintentos**: reintentar cada 1 segundo crea thundering herds. Configura `BackoffRate: 2` con un intervalo máximo. Agrega jitter aleatorio para dispersar los reintentos. Step Functions soporta esto nativamente; en Temporal, configura políticas de retry en actividades.
- **Configura timeouts en cada actividad**: una espera ilimitada por una API externa puede estancar un workflow para siempre. Configura timeouts por actividad (ej. 30 segundos para procesamiento de pago, 5 minutos para aprobación humana). Distingue entre reintentables (timeout, 5xx) y no reintentables (4xx, validación).
- **Almacena payloads grandes en S3**: Step Functions tiene un límite de payload de 256KB. Si tu workflow pasa archivos grandes o datasets, almacénalos en S3 y pasa URIs a través de la máquina de estados. Temporal tiene un límite gRPC de 2MB; usa blob storage similarmente para datos grandes.
- **Monitorea métricas de ejecución de workflows**: rastrea tasa de éxito, duración promedio, conteo de reintentos por actividad y costo de transición de estado. Alerta sobre workflows atascados en un estado por más tiempo del esperado. Usa AWS CloudWatch, Temporal Web UI o Azure Application Insights.

## Errores comunes

- **Poner lógica de negocio en la máquina de estados**: el JSON de Step Functions es para coordinación, no para reglas de negocio. Las condicionales complejas y transformaciones pertenecen a funciones Lambda. Una máquina de estados con docenas de estados `Choice` es inmantenible — refactoriza la lógica a las funciones.
- **Pasar secretos a través del estado del workflow**: el estado del workflow se loguea y es visible en la consola del orquestador. Nunca pases API keys, tokens o PII en payloads de estado. Pasa referencias (ej. order ID) y deja que las funciones retiren secretos de AWS Secrets Manager o Azure Key Vault.
- **Ignorar idempotencia en reintentos de actividades**: Step Functions puede reintentar una Lambda que parcialmente tuvo éxito (ej. cobró al cliente pero se agotó antes de retornar). El retry cobra al cliente de nuevo. Diseña siempre las actividades para chequear claves de idempotencia antes de mutar estado.
- **No versionar máquinas de estados**: cambiar la definición de una máquina de estados en vivo afecta ejecuciones en curso. Usa versiones y aliases de Step Functions (o versionado de workflows de Temporal) para deployar cambios sin romper workflows en ejecución. Prueba nuevas versiones con canary antes de rollout completo.

## Preguntas frecuentes

**P: ¿Debería usar Step Functions o Temporal?**
R: Step Functions es más simple para workflows centrados en AWS con monitoreo visual. Temporal es más poderoso para lógica compleja, portabilidad multi-cloud y workflows de larga duración con código arbitrario. Si necesitas ejecutar workflows on-premise o multi-cloud, Temporal es la mejor opción.

**P: ¿Cómo manejo esperas largas (horas o días) en un workflow?**
R: Usa estados de espera con callbacks. Step Functions soporta estados `Wait` con timestamps. Los workflows de Temporal pueden dormir por días — el worker no corre activamente durante el sleep; el orquestador programa un evento de despertar. Durable Functions soporta timers durable.

**P: ¿Cuál es el costo de Step Functions?**
R: Los workflows Standard cobran por transición de estado. Un workflow de 10 estados ejecutado 1,000,000 de veces cuesta ~$25. Los workflows Express cobran por ejecución y duración, optimizados para workflows de alto volumen y corta duración (menos de 5 minutos). Elige Express para alto throughput, Standard para workflows de larga duración.

**P: ¿Puedo testear workflows localmente?**
R: Step Functions Local (Docker) corre máquinas de estados localmente. Temporal provee un servidor de dev local (`temporal server start-dev`). Durable Functions tiene un runtime local integrado con Azure Functions Core Tools. Siempre testea workflows localmente antes de deployar.

