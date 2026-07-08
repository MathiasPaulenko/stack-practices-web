---
contentType: recipes
slug: workflow-engine
title: "Workflow Engines"
description: "Orquesta procesos de negocio complejos con workflow engines, state machines y coordinación de tareas de larga duración a través de servicios distribuidos."
metaDescription: "Workflow engines y state machines: Temporal, Camunda, patrones de state machine, saga orchestration y coordinación de tareas de larga duración."
difficulty: advanced
topics:
  - architecture
tags:
  - workflow-engine
  - architecture
  - distributed-systems
  - design
  - patterns
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/system-design-interview-guide
  - /guides/cap-theorem-guide
  - /recipes/microservices-communication
  - /docs/adr-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Workflow engines y state machines: Temporal, Camunda, patrones de state machine, saga orchestration y coordinación de tareas de larga duración."
  keywords:
    - workflow-engine
    - architecture
    - state-machines
    - distributed-systems
---
## Visión General

Los workflow engines orquestan procesos de negocio complejos de múltiples pasos que abarcan servicios, tiempo y dominios de falla. A diferencia de simples job queues que ejecutan tareas independientes, los workflows gestionan transiciones de estado, retries, timeouts y compensaciones a través de [sistemas distribuidos](/guides/architecture/microservices-architecture-guide). Ya sea procesando una orden de e-commerce, suscribiendo una póliza de seguro o aprobando un préstamo, los workflow engines aseguran que cada paso se ejecute en el orden correcto con manejo apropiado de errores.

## Cuándo Usar

Usa este recurso cuando:
- Los procesos de negocio tienen 5+ pasos secuenciales con requisitos de manejo de fallas
- Los pasos necesitan esperar aprobación humana o eventos externos (horas o días)
- Las fallas parciales requieren transacciones compensatorias ([patrón saga](/recipes/saga-pattern-recipe))
- Necesitas audit trails y visibilidad del estado de procesos de larga duración

## Solución

### Temporal Workflow (TypeScript)

```typescript
import { Workflow, Activity } from '@temporalio/workflow';

const { sendEmail, chargePayment, shipOrder } = proxyActivities<{
  sendEmail(email: string): Promise<void>;
  chargePayment(amount: number): Promise<string>;
  shipOrder(orderId: string): Promise<string>;
}>({
  startToCloseTimeout: '30 seconds',
  retry: { maximumAttempts: 3 }
});

export async function orderWorkflow(order: Order): Promise<void> {
  await sendEmail(order.customerEmail);

  const paymentId = await chargePayment(order.total);
  if (!paymentId) {
    await sendCompensationEmail(order);
    throw new Error('Payment failed');
  }

  try {
    await shipOrder(order.id);
  } catch (err) {
    await refundPayment(paymentId);
    throw err;
  }

  await sendEmail(order.customerEmail, 'Order shipped!');
}
```

### State Machine (Python + transitions)

```python
from transitions import Machine

class OrderWorkflow:
    states = ['pending', 'paid', 'shipped', 'cancelled']

    def __init__(self):
        self.machine = Machine(
            model=self,
            states=OrderWorkflow.states,
            initial='pending',
            transitions=[
                {'trigger': 'pay', 'source': 'pending', 'dest': 'paid'},
                {'trigger': 'ship', 'source': 'paid', 'dest': 'shipped'},
                {'trigger': 'cancel', 'source': ['pending', 'paid'], 'dest': 'cancelled',
                 'after': 'refund_payment'}
            ]
        )

    def refund_payment(self):
        print("Refunding payment...")

order = OrderWorkflow()
order.pay()      # pending -> paid
order.ship()     # paid -> shipped
```

### Camunda BPMN Process

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions>
  <bpmn:process id="OrderProcess" isExecutable="true">
    <bpmn:startEvent id="StartEvent" />
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent" targetRef="CheckInventory" />
    
    <bpmn:serviceTask id="CheckInventory" camunda:delegateExpression="${inventoryChecker}" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="CheckInventory" targetRef="Gateway_1" />
    
    <bpmn:exclusiveGateway id="Gateway_1" default="Flow_4">
      <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="ProcessPayment"
                         conditionExpression="${inventoryAvailable}" />
      <bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_1" targetRef="NotifyOutOfStock" />
    </bpmn:exclusiveGateway>
  </bpmn:process>
</bpmn:definitions>
```

## Explicación

**Conceptos core**:
- **Definición de workflow**: El blueprint que describe pasos, transiciones y condiciones
- **Activity**: Una única unidad de trabajo (llamada a API, update de base de datos, tarea humana)
- **Estado**: La posición actual en el workflow (persistido para durabilidad)
- **Compensación**: Revertir pasos ya completados cuando un paso posterior falla
- **Timer**: Retrasar ejecución o establecer deadlines para activities

**Cuándo usar workflow engines vs. código**:

| Complejidad | Enfoque | Ejemplo |
|-------------|---------|---------|
| 1-2 pasos | Direct function calls | Enviar email de bienvenida |
| 3-5 pasos | Código con retry logic | Procesamiento de orden con pago |
| 5+ pasos | Workflow engine | Aprobación de préstamo con 10+ departamentos |
| Tareas humanas | BPMN engine | Revisión de claim de seguro |

## Variantes

| Engine | Modelo | Ideal Para |
|--------|--------|------------|
| Temporal | Code-as-workflow | Centrado en developers; durable execution |
| Camunda | BPMN | Visibilidad de business analysts; tareas humanas |
| Apache Airflow | DAGs | Data pipelines; workflows programados |
| Netflix Conductor | JSON DSL | Orquestación de microservicios |
| AWS Step Functions | State machines | Serverless; integración AWS |

## Lo que funciona

- **Activities idempotentes**: Ejecutar la misma activity dos veces debería producir el mismo resultado. Consulta [idempotencia de mensajes](/recipes/messaging/rabbitmq-task-queue).
- **Claves de idempotencia**: Pasar keys únicas a APIs externas para prevenir double charges
- **Set timeouts en todo**: Timeout default de 10 minutos previene workflows stuck
- **Versiona definiciones de workflow**: Nuevos despliegues no deberían romper workflows en vuelo
- **Query estado de workflow**: Expón APIs para verificar progreso sin inspeccionar estado interno

## Errores Comunes

1. **Acoplamiento fuerte al orchestrator**: Lógica de negocio filtrándose en definiciones de workflow dificulta testing
2. **Sin paths de compensación**: Workflows fallados que ya cobraron al cliente necesitan refunds explícitos. Aprende más en [patrón saga](/recipes/saga-pattern-recipe).
3. **Polling en lugar de events**: Esperar 30 segundos para check de status desperdicia recursos; usa callbacks
4. **Ignorar historial de workflow**: Workflows completados viejos llenan storage; implementa retention policies
5. **No testear replay**: Temporal y similares hacen replay de historial; código no determinístico se rompe

## Preguntas Frecuentes

**P: ¿Cuándo debo usar un workflow engine en lugar de una message queue?**
R: Usa [message queues](/guides/architecture/event-driven-architecture-guide) para tareas independientes y paralelas. Usa workflow engines para procesos coordinados y secuenciales con estado.

**P: ¿Cómo manejan los workflow engines los crashes?**
R: Persisten estado después de cada activity. Al reiniciar, reanudan desde el último paso completado.

**P: ¿Los business analysts pueden modificar workflows sin developers?**
R: Los engines basados en BPMN (Camunda) permiten esto. Los engines basados en código (Temporal) requieren developers pero ofrecen más flexibilidad.

### AWS Step Functions State Machine (TypeScript)

```typescript
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({ region: 'us-east-1' });

const orderWorkflowDefinition = {
  StartAt: 'ValidateOrder',
  States: {
    ValidateOrder: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:validate-order',
      Next: 'CheckInventory',
      Retry: [
        {
          ErrorEquals: ['States.TaskFailed'],
          IntervalSeconds: 2,
          MaxAttempts: 3,
          BackoffRate: 2.0,
        },
      ],
    },
    CheckInventory: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:check-inventory',
      Next: 'InventoryChoice',
    },
    InventoryChoice: {
      Type: 'Choice',
      Choices: [
        {
          Variable: '$.inventoryAvailable',
          BooleanEquals: true,
          Next: 'ProcessPayment',
        },
      ],
      Default: 'NotifyOutOfStock',
    },
    ProcessPayment: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:process-payment',
      Next: 'ShipOrder',
      Catch: [
        {
          ErrorEquals: ['States.ALL'],
          Next: 'RefundAndNotify',
        },
      ],
    },
    ShipOrder: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:ship-order',
      End: true,
    },
    NotifyOutOfStock: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:notify-oos',
      End: true,
    },
    RefundAndNotify: {
      Type: 'Task',
      Resource: 'arn:aws:lambda:us-east-1:123:function:refund-notify',
      End: true,
    },
  },
};

async function startOrderWorkflow(order: Order): Promise<string> {
  const command = new StartExecutionCommand({
    stateMachineArn: 'arn:aws:states:us-east-1:123:stateMachine:OrderWorkflow',
    input: JSON.stringify(order),
    name: `order-${order.id}-${Date.now()}`,
  });
  const response = await sfnClient.send(command);
  return response.executionArn!;
}
```

### Human Task con Approval Timeout (Python + Camunda)

```python
from datetime import datetime, timedelta
from typing import Optional

class HumanTaskManager:
    def __init__(self, camunda_client):
        self.client = camunda_client

    def create_approval_task(
        self,
        process_id: str,
        assignee: str,
        approval_type: str,
        timeout_hours: int = 48
    ) -> str:
        task = self.client.task.create(
            process_instance_id=process_id,
            name=f'Approval: {approval_type}',
            assignee=assignee,
            due_date=(datetime.now() + timedelta(hours=timeout_hours)).isoformat(),
            follow_up_date=(datetime.now() + timedelta(hours=24)).isoformat(),
        )
        return task.id

    def complete_task(self, task_id: str, approved: bool, comment: str = '') -> None:
        variables = {'approved': approved, 'comment': comment}
        self.client.task.complete(task_id, variables=variables)

    def check_overdue_tasks(self) -> list:
        tasks = self.client.task.list(due_before=datetime.now().isoformat())
        return [t for t in tasks if t.due_date and t.due_date < datetime.now()]

    def auto_escalate_overdue(self) -> int:
        overdue = self.check_overdue_tasks()
        for task in overdue:
            manager = self._get_manager(task.assignee)
            self.client.task.update(
                task.id,
                assignee=manager,
                due_date=(datetime.now() + timedelta(hours=24)).isoformat(),
            )
        return len(overdue)
```

### Versionado y Migración de Workflows (TypeScript)

```typescript
interface WorkflowVersion {
  version: string;
  definition: any;
  migrationFn?: (oldState: any) => any;
}

class WorkflowRegistry {
  private versions: Map<string, WorkflowVersion> = new Map();

  register(version: WorkflowVersion): void {
    this.versions.set(version.version, version);
  }

  getLatest(): WorkflowVersion {
    const sorted = Array.from(this.versions.values())
      .sort((a, b) => b.version.localeCompare(a.version));
    return sorted[0];
  }

  getVersion(version: string): WorkflowVersion | undefined {
    return this.versions.get(version);
  }

  migrate(state: any, fromVersion: string, toVersion: string): any {
    let currentState = state;
    const versions = Array.from(this.versions.keys()).sort();
    const fromIdx = versions.indexOf(fromVersion);
    const toIdx = versions.indexOf(toVersion);

    for (let i = fromIdx; i < toIdx; i++) {
      const v = this.versions.get(versions[i + 1]);
      if (v?.migrationFn) {
        currentState = v.migrationFn(currentState);
      }
    }
    return currentState;
  }
}

// Registrar versiones
const registry = new WorkflowRegistry();
registry.register({
  version: '1.0.0',
  definition: orderWorkflowV1,
});
registry.register({
  version: '1.1.0',
  definition: orderWorkflowV1_1,
  migrationFn: (oldState) => ({
    ...oldState,
    shippingAddress: oldState.address || null,
  }),
});
```

## Mejores Prácticas Adicionales

1. **Usa child workflows para sub-procesos complejos.** Divide workflows grandes en child workflows más pequeños y reutilizables que pueden testearse independientemente:

```typescript
export async function orderWorkflow(order: Order): Promise<void> {
  await validateOrder(order);
  await executeChildWorkflow('paymentWorkflow', { orderId: order.id, amount: order.total });
  await executeChildWorkflow('shippingWorkflow', { orderId: order.id, items: order.items });
}
```

2. **Implementa signals de workflow para comunicación externa.** Los signals permiten que sistemas externos se comuniquen con workflows en ejecución sin bloquear:

```typescript
import { defineSignal, setHandler } from '@temporalio/workflow';

const cancelSignal = defineSignal('cancel');

export async function orderWorkflow(order: Order): Promise<void> {
  let cancelled = false;
  setHandler(cancelSignal, () => { cancelled = true; });

  for (const item of order.items) {
    if (cancelled) {
      await compensate(order);
      return;
    }
    await processItem(item);
  }
}
```

3. **Monitorea métricas de workflow.** Trackea tiempo de ejecución, tasas de fallo y workflows stuck:

```typescript
class WorkflowMetrics {
  recordExecution(workflowType: string, durationMs: number, success: boolean): void {
    metrics.histogram(`workflow.${workflowType}.duration`, durationMs);
    metrics.counter(`workflow.${workflowType}.${success ? 'success' : 'failure'}`).inc();
  }

  recordStuckWorkflows(count: number): void {
    metrics.gauge('workflow.stuck.count').set(count);
  }

  recordCompensation(workflowType: string): void {
    metrics.counter(`workflow.${workflowType}.compensation`).inc();
  }
}
```

## Errores Comunes Adicionales

1. **Código de workflow no determinístico.** Los workflow engines como Temporal hacen replay del historial. Usar `Date.now()`, `Math.random()`, o hacer llamadas a API directamente en el cuerpo del workflow rompe el replay. Usa las utilidades proporcionadas por el engine:

```typescript
// Mal: no determinístico
export async function orderWorkflow(order: Order): Promise<void> {
  const now = Date.now(); // diferente en replay!
  if (now > order.deadline) throw new Error('Expired');
}

// Bien: usa tiempo proporcionado por workflow
import { workflowInfo } from '@temporalio/workflow';
export async function orderWorkflow(order: Order): Promise<void> {
  const now = workflowInfo().currentTime; // determinístico en replay
  if (now > order.deadline) throw new Error('Expired');
}
```

2. **Almacenar payloads grandes en estado de workflow.** Los workflow engines persisten estado entre pasos. Almacenar objetos grandes (imágenes, documentos) infla el storage y ralentiza el replay. Almacena referencias:

```typescript
// Mal: almacenar documento completo
await workflow.setState({ document: largePdfBuffer });

// Bien: almacenar referencia
await workflow.setState({ documentUrl: 's3://bucket/order-123.pdf' });
```

3. **Sin dead letter queue para workflows fallidos.** Los workflows que agotan los retries desaparecen silenciosamente. Rutealos a una dead letter queue para inspección manual:

```typescript
export async function orderWorkflow(order: Order): Promise<void> {
  try {
    await processOrder(order);
  } catch (err) {
    await sendToDLQ('order-failed', { order, error: err.message });
    throw err;
  }
}
```

## FAQ Adicional

### ¿Cómo testeo workflow engines?

Para Temporal, usa TestWorkflowEnvironment que proporciona un test server in-memory. Mockea activities y verifica los outcomes del workflow. Para Camunda, usa la base de datos H2 in-memory con process engine tests. Para Step Functions, usa LocalStack para emular servicios AWS localmente. Testea replay ejecutando el workflow, grabando el historial, luego replayandolo contra el mismo código del workflow — el resultado debería ser idéntico.

### ¿Esta solución está lista para producción?

Sí. Temporal se usa en producción por Uber, Stripe y Snap. Camunda es usado por Allianz y Lufthansa. AWS Step Functions se usa en miles de workloads productivos de AWS. El patrón de state machine con la librería transitions de Python se usa en servicios más pequeños que necesitan tracking de estado sin un engine completo. El patrón de versionado y migración refleja lo que la API de versionado de Temporal hace internamente. La gestión de human tasks con escalación es estándar en sistemas basados en BPMN.

### ¿Cuáles son las características de rendimiento?

Temporal añade 5-15ms por invocación de activity para persistencia de estado. Camunda añade 10-30ms por service task debido a persistencia en base de datos. Step Functions añade 50-200ms por transición de estado debido al overhead de AWS API. El replay de workflow es O(n) en el número de eventos — mantén historiales bajo 10,000 eventos para replays rápidos. Los child workflows reducen el tamaño del historial por workflow. El costo de persistencia de estado escala con el tamaño del payload — mantén payloads bajo 50KB. Los delays basados en timers no tienen costo de CPU mientras esperan.

### ¿Cómo depuro problemas con este enfoque?

Para Temporal, usa `tctl workflow show --id <workflowId>` para ver el historial completo de eventos. Para Camunda, usa Cockpit (el dashboard web) para inspeccionar instancias de proceso y variables. Para Step Functions, usa el visualizador de ejecuciones de AWS Console. Loggea el workflow ID, nombre de activity y número de intento en cada paso. Configura alertas en tasa de fallo de workflow, duración promedio y conteo de workflows stuck. Para errores no determinísticos en Temporal, compara el historial de replay con el código actual del workflow para encontrar el punto de divergencia.
