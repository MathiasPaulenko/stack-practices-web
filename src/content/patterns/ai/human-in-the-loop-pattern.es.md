---
contentType: patterns
slug: human-in-the-loop-pattern
title: "Patrón Human-in-the-Loop"
description: "Pausa la ejecucion del agente LLM para aprobacion humana antes de acciones de alto impacto. Enruta decisiones a un revisor cuando la confianza es baja."
metaDescription: "Pausa agentes LLM para aprobacion humana antes de acciones de alto impacto. Enruta a un revisor cuando la confianza es baja o los riesgos son altos."
difficulty: intermediate
topics:
  - ai
tags:
  - human-in-the-loop
  - patron
  - patron-ai
  - aprobacion-agente
  - revision-humana
  - seguridad
  - gating-decisiones
relatedResources:
  - /patterns/ai/llm-guardrails-pattern
  - /patterns/ai/agent-tool-selection-pattern
  - /recipes/ai/python-agent-langgraph-state-machine
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Pausa agentes LLM para aprobacion humana antes de acciones de alto impacto. Enruta a un revisor cuando la confianza es baja o los riesgos son altos."
  keywords:
    - patron human in the loop
    - aprobacion agente ia
    - revision humana ia
    - gating de decisiones
    - patron seguridad ia
    - pausa agente
    - umbral confianza
---

# Patrón Human-in-the-Loop

## Descripción general

Los agentes LLM autonomos pueden tomar acciones con consecuencias reales: enviar emails, desplegar codigo, modificar bases de datos, hacer compras. El patrón Human-in-the-Loop inserta un checkpoint donde un humano revisa y aprueba la accion propuesta del agente antes de que se ejecute. El agente se pausa, presenta su plan y espera aprobacion, rechazo o modificacion.

No cada paso necesita revision humana. El patrón usa un **umbral de confianza** y un **nivel de riesgo de la accion** para decidir que pasos requieren aprobacion. Acciones de bajo riesgo (leer un archivo, buscar en la web) proceden automaticamente. Acciones de alto riesgo (desplegar a produccion, enviar comunicaciones externas) siempre se pausan para revision.

## Cuándo usarlo

Usa el patrón Human-in-the-Loop cuando:
- El agente puede tomar acciones irreversibles (borrar datos, enviar comunicaciones, desplegar)
- El costo de una accion equivocada excede el costo de esperar revision humana
- Requisitos regulatorios o de compliance exigen supervision humana
- El agente opera en un entorno desconocido donde la confianza es baja
- Ejemplos: agentes de deployment, agentes de redaccion de emails, agentes de migracion de base de datos, agentes de transacciones financieras

## Solución

### Python

```python
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Any
from enum import Enum

class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ApprovalStatus(Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"

@dataclass
class AgentAction:
    name: str
    description: str
    risk: RiskLevel
    parameters: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 1.0

@dataclass
class ApprovalRequest:
    action: AgentAction
    reason: str

@dataclass
class ApprovalResponse:
    status: ApprovalStatus
    modified_parameters: Optional[Dict[str, Any]] = None
    feedback: str = ""

class HumanInTheLoop:
    def __init__(self, confidence_threshold: float = 0.7,
                 auto_approve_low_risk: bool = True,
                 reviewer: Optional[Callable] = None):
        self.confidence_threshold = confidence_threshold
        self.auto_approve_low_risk = auto_approve_low_risk
        self.reviewer = reviewer or self._default_reviewer

    def _default_reviewer(self, request: ApprovalRequest) -> ApprovalResponse:
        print(f"\n--- APROBACION REQUERIDA ---")
        print(f"Action: {request.action.name}")
        print(f"Risk: {request.action.risk.value}, Confidence: {request.action.confidence:.0%}")
        print(f"Parameters: {request.action.parameters}")
        return ApprovalResponse(status=ApprovalStatus.APPROVED)

    def needs_approval(self, action: AgentAction) -> bool:
        if action.risk == RiskLevel.HIGH:
            return True
        if action.risk == RiskLevel.MEDIUM and action.confidence < self.confidence_threshold:
            return True
        if action.risk == RiskLevel.LOW and not self.auto_approve_low_risk:
            return True
        return False

    def execute_with_approval(self, action: AgentAction, execute_fn: Callable, reason: str = "") -> str:
        if not self.needs_approval(action):
            print(f"[AUTO] Executing: {action.name}")
            return execute_fn(action)

        request = ApprovalRequest(action=action, reason=reason)
        response = self.reviewer(request)

        if response.status == ApprovalStatus.REJECTED:
            return f"[REJECTED] {action.name}: {response.feedback}"

        if response.status == ApprovalStatus.MODIFIED and response.modified_parameters:
            action.parameters = response.modified_parameters

        print(f"[APPROVED] Executing: {action.name}")
        return execute_fn(action)

# Uso
def mock_execute(action: AgentAction) -> str:
    return f"Executed {action.name} with {action.parameters}"

hitl = HumanInTheLoop(confidence_threshold=0.8)

actions = [
    AgentAction("read_file", "Read config", RiskLevel.LOW, {"path": "/etc/config.yml"}, 0.95),
    AgentAction("send_email", "Notify client", RiskLevel.HIGH, {"to": "client@example.com"}, 0.85),
    AgentAction("deploy", "Deploy to prod", RiskLevel.HIGH, {"env": "prod"}, 0.6),
    AgentAction("delete_records", "Delete stale logs", RiskLevel.MEDIUM, {"table": "logs"}, 0.5),
]

for action in actions:
    result = hitl.execute_with_approval(action, mock_execute, "Agent step")
    print(f"  Result: {result}\n")
```

### JavaScript

```javascript
const RiskLevel = { LOW: "low", MEDIUM: "medium", HIGH: "high" };
const ApprovalStatus = { APPROVED: "approved", REJECTED: "rejected", MODIFIED: "modified" };

class AgentAction {
  constructor(name, description, risk, parameters = {}, confidence = 1.0) {
    this.name = name; this.description = description;
    this.risk = risk; this.parameters = parameters; this.confidence = confidence;
  }
}

class ApprovalResponse {
  constructor(status, modifiedParameters = null, feedback = "") {
    this.status = status; this.modifiedParameters = modifiedParameters; this.feedback = feedback;
  }
}

class HumanInTheLoop {
  constructor(options = {}) {
    this.confidenceThreshold = options.confidenceThreshold ?? 0.7;
    this.autoApproveLowRisk = options.autoApproveLowRisk ?? true;
    this.reviewer = options.reviewer || ((req) => {
      console.log(`\n--- APROBACION REQUERIDA ---`);
      console.log(`Action: ${req.action.name}, Risk: ${req.action.risk}, Confidence: ${(req.action.confidence * 100).toFixed(0)}%`);
      return new ApprovalResponse(ApprovalStatus.APPROVED);
    });
  }

  needsApproval(action) {
    if (action.risk === RiskLevel.HIGH) return true;
    if (action.risk === RiskLevel.MEDIUM && action.confidence < this.confidenceThreshold) return true;
    if (action.risk === RiskLevel.LOW && !this.autoApproveLowRisk) return true;
    return false;
  }

  executeWithApproval(action, executeFn, reason = "") {
    if (!this.needsApproval(action)) {
      console.log(`[AUTO] Executing: ${action.name}`);
      return executeFn(action);
    }
    const response = this.reviewer({ action, reason });
    if (response.status === ApprovalStatus.REJECTED) return `[REJECTED] ${action.name}: ${response.feedback}`;
    if (response.status === ApprovalStatus.MODIFIED && response.modifiedParameters) action.parameters = response.modifiedParameters;
    console.log(`[APPROVED] Executing: ${action.name}`);
    return executeFn(action);
  }
}

// Uso
const hitl = new HumanInTheLoop({ confidenceThreshold: 0.8 });
const actions = [
  new AgentAction("read_file", "Read config", RiskLevel.LOW, { path: "/etc/config.yml" }, 0.95),
  new AgentAction("send_email", "Notify client", RiskLevel.HIGH, { to: "client@example.com" }, 0.85),
  new AgentAction("deploy", "Deploy to prod", RiskLevel.HIGH, { env: "prod" }, 0.6),
];
for (const action of actions) {
  const result = hitl.executeWithApproval(action, a => `Executed ${a.name}`, "Agent step");
  console.log(`  Result: ${result}\n`);
}
```

### Java

```java
import java.util.*;

public class HumanInTheLoop {

    enum RiskLevel { LOW, MEDIUM, HIGH }
    enum ApprovalStatus { APPROVED, REJECTED, MODIFIED }

    record AgentAction(String name, String description, RiskLevel risk,
                       Map<String, Object> parameters, double confidence) {}
    record ApprovalResponse(ApprovalStatus status, Map<String, Object> modifiedParams, String feedback) {}
    record ApprovalRequest(AgentAction action, String reason) {}

    private final double confidenceThreshold;
    private final boolean autoApproveLowRisk;
    private final java.util.function.Function<ApprovalRequest, ApprovalResponse> reviewer;

    public HumanInTheLoop(double threshold, boolean autoApproveLow,
                          java.util.function.Function<ApprovalRequest, ApprovalResponse> reviewer) {
        this.confidenceThreshold = threshold;
        this.autoApproveLowRisk = autoApproveLow;
        this.reviewer = reviewer != null ? reviewer : req -> {
            System.out.printf("%n--- APROBACION REQUERIDA ---%n");
            System.out.printf("Action: %s, Risk: %s, Confidence: %.0f%%%n",
                req.action().name(), req.action().risk(), req.action().confidence() * 100);
            return new ApprovalResponse(ApprovalStatus.APPROVED, null, "");
        };
    }

    boolean needsApproval(AgentAction action) {
        if (action.risk() == RiskLevel.HIGH) return true;
        if (action.risk() == RiskLevel.MEDIUM && action.confidence() < confidenceThreshold) return true;
        if (action.risk() == RiskLevel.LOW && !autoApproveLowRisk) return true;
        return false;
    }

    public String executeWithApproval(AgentAction action,
                                       java.util.function.Function<AgentAction, String> executeFn, String reason) {
        if (!needsApproval(action)) {
            System.out.println("[AUTO] Executing: " + action.name());
            return executeFn.apply(action);
        }
        var response = reviewer.apply(new ApprovalRequest(action, reason));
        if (response.status() == ApprovalStatus.REJECTED)
            return "[REJECTED] " + action.name() + ": " + response.feedback();
        System.out.println("[APPROVED] Executing: " + action.name());
        return executeFn.apply(action);
    }

    public static void main(String[] args) {
        var hitl = new HumanInTheLoop(0.8, true, null);
        var actions = List.of(
            new AgentAction("read_file", "Read config", RiskLevel.LOW, Map.of("path", "/etc/config.yml"), 0.95),
            new AgentAction("send_email", "Notify client", RiskLevel.HIGH, Map.of("to", "client@example.com"), 0.85),
            new AgentAction("deploy", "Deploy to prod", RiskLevel.HIGH, Map.of("env", "prod"), 0.6)
        );
        for (var action : actions) {
            String result = hitl.executeWithApproval(action, a -> "Executed " + a.name(), "Agent step");
            System.out.println("  Result: " + result + "\n");
        }
    }
}
```

## Explicación

El patrón controla la ejecucion detras de tres verificaciones:

1. **Clasificacion de riesgo**: Cada accion se etiqueta como riesgo bajo, medio o alto. Las de alto riesgo siempre requieren aprobacion. Las de medio riesgo requieren aprobacion solo cuando la confianza esta bajo el umbral. Las de bajo riesgo se auto-ejecutan a menos que se configure lo contrario.
2. **Flujo de aprobacion**: Cuando se necesita aprobacion, el agente se pausa y presenta los detalles de la accion (nombre, parametros, confianza, razon) a un revisor. El revisor puede aprobar, rechazar o modificar los parametros.
3. **Ejecucion o abort**: Si se aprueba (o se modifica y aprueba), la accion se ejecuta. Si se rechaza, el agente recibe feedback y puede ajustar su plan.

El revisor puede ser un humano via CLI, una UI web, un boton de aprobacion en Slack, o incluso un modelo secundario automatico para decisiones menos criticas.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Aprobacion asincrona** | El agente pausa y resume cuando llega la aprobacion via webhook | Agentes en produccion con UIs web |
| **Aprobacion en lote** | Presentar multiples acciones a la vez para una sola revision | Reduce fatiga del revisor en workflows rutinarios |
| **Cadena de escalado** | Enrutar a revisor senior si el primero rechaza | Supervision en niveles para operaciones sensibles |
| **Auto-rechazo por timeout** | Si no hay aprobacion en N minutos, rechazar por defecto | Previene que agentes cuelguen indefinidamente |

## Buenas prácticas

- **Clasifica el riesgo de forma conservativa** — cuando dudes, marca como alto riesgo
- **Incluye contexto en las solicitudes** — muestra el razonamiento del agente, no solo la accion
- **Define timeouts** — previene que agentes esperen indefinidamente por input humano
- **Registra todas las decisiones de aprobacion** — auditoria para compliance y mejora
- **Permite a los revisores modificar parametros** — a veces la accion es correcta pero los detalles necesitan ajuste
- **Reduce gradualmente los requisitos** — conforme el agente demuestra confiabilidad, baja el umbral de confianza

## Errores comunes

- Requerir aprobacion para cada paso, causando fatiga del revisor y ejecucion lenta
- No proporcionar suficiente contexto para que el revisor tome una decision informada
- Sin timeout, dejando agentes atascados esperando revisores que no responden
- No registrar aprobaciones, haciendo imposible las auditorias
- Tratar rechazos como fallos en lugar de feedback para que el agente se ajuste

## Preguntas frecuentes

**Q: Como determino el nivel de riesgo de una accion?**
A: Preguntate: es reversible esta accion? Afecta sistemas externos? Cuesta dinero? Si si a alguna, clasificala como alto riesgo. Operaciones de solo lectura son bajo riesgo. Cambios de estado interno sin efecto externo son riesgo medio.

**Q: Puedo usar un LLM como revisor en lugar de un humano?**
A: Si, para acciones de medio riesgo. Un segundo LLM con un prompt diferente puede revisar el plan del primer agente. Usa esto para velocidad cuando la revision humana completa es muy lenta. Manten humanos para acciones de alto riesgo.

**Q: Que pasa si el revisor modifica la accion?**
A: El agente recibe los parametros modificados y los ejecuta. El agente deberia registrar la modificacion y ajustar su plan subsiguiente. Algunas implementaciones alimentan la modificacion como seal de aprendizaje.

**Q: Como implemento aprobacion asincrona en una web app?**
A: Pausa el agente persistiendo su estado. Envia una notificacion (email, Slack, webhook) con un link de aprobacion. Cuando el revisor clickea aprobar/rechazar, resume el agente desde su estado guardado con la decision.
