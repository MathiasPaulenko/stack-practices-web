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
  - architecture
  - distributed-systems
  - design
  - pattern
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/system-design-interview-guide
  - /guides/cap-theorem-guide
  - /recipes/microservices-communication
  - /docs/adr-template
  - /recipes/retry-backoff
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Workflow engines y state machines: Temporal, Camunda, patrones de state machine, saga orchestration y coordinación de tareas de larga duración."
  keywords:
    - workflow-engine
    - architecture
    - state-machines
    - distributed-systems

---
## Visión General

Los workflow engines orquestan procesos de negocio complejos de múltiples pasos que abarcan servicios, tiempo y dominios de falla. A diferencia de simples job queues que ejecutan tareas independientes, los workflows gestionan transiciones de estado, retries, timeouts y compensaciones a través de [sistemas distribuidos](/guides/microservices-architecture-guide/). Ya sea procesando una orden de e-commerce, suscribiendo una póliza de seguro o aprobando un préstamo, los workflow engines aseguran que cada paso se ejecute en el orden correcto con manejo apropiado de errores.

## Cuándo Usar

Usa este recurso cuando:
- Los procesos de negocio tienen 5+ pasos secuenciales con requisitos de manejo de fallas
- Los pasos necesitan esperar aprobación humana o eventos externos (horas o días)
- Las fallas parciales requieren transacciones compensatorias ([patrón saga](/recipes/saga-pattern/))
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

- **Activities idempotentes**: Ejecutar la misma activity dos veces debería producir el mismo resultado. Consulta [idempotencia de mensajes](/recipes/rabbitmq-task-queue/).
- **Claves de idempotencia**: Pasar keys únicas a APIs externas para prevenir double charges
- **Set timeouts en todo**: Timeout default de 10 minutos previene workflows stuck
- **Versiona definiciones de workflow**: Nuevos despliegues no deberían romper workflows en vuelo
- **Query estado de workflow**: Expón APIs para verificar progreso sin inspeccionar estado interno

## Errores Comunes

1. **Acoplamiento fuerte al orchestrator**: Lógica de negocio filtrándose en definiciones de workflow dificulta testing
2. **Sin paths de compensación**: Workflows fallados que ya cobraron al cliente necesitan refunds explícitos. Aprende más en [patrón saga](/recipes/saga-pattern/).
3. **Polling en lugar de events**: Esperar 30 segundos para check de status desperdicia recursos; usa callbacks
4. **Ignorar historial de workflow**: Workflows completados viejos llenan storage; implementa retention policies
5. **No testear replay**: Temporal y similares hacen replay de historial; código no determinístico se rompe

## Preguntas Frecuentes

**P: ¿Cuándo debo usar un workflow engine en lugar de una message queue?**
R: Usa [message queues](/guides/event-driven-architecture-guide/) para tareas independientes y paralelas. Usa workflow engines para procesos coordinados y secuenciales con estado.

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



