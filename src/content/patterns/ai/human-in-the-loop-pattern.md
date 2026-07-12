---


contentType: patterns
slug: human-in-the-loop-pattern
title: "Human-in-the-Loop Pattern"
description: "Pause LLM agent execution for human approval before high-impact actions. Route decisions to a reviewer when confidence is low or stakes are high."
metaDescription: "Pause LLM agents for human approval before high-impact actions. Route to a reviewer when confidence is low or stakes are high to prevent errors."
difficulty: intermediate
topics:
  - ai
tags:
  - human-in-the-loop
  - pattern
  - ai-pattern
  - agent-approval
  - human-review
  - safety
  - decision-gating
relatedResources:
  - /patterns/llm-guardrails-pattern
  - /patterns/agent-tool-selection-pattern
  - /recipes/python-agent-langgraph-state-machine
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Pause LLM agents for human approval before high-impact actions. Route to a reviewer when confidence is low or stakes are high to prevent errors."
  keywords:
    - human in the loop pattern
    - ai agent approval
    - human review ai
    - decision gating
    - ai safety pattern
    - agent pause
    - confidence threshold


---

# Human-in-the-Loop Pattern

## Overview

Autonomous LLM agents can take actions that have real consequences: sending emails, deploying code, modifying databases, making purchases. The Human-in-the-Loop Pattern inserts a checkpoint where a human reviews and approves the agent's proposed action before it executes. The agent pauses, presents its plan, and waits for approval, rejection, or modification.

Not every step needs human review. The pattern uses a **confidence threshold** and **action risk level** to decide which steps require approval. Low-risk actions (reading a file, searching the web) proceed automatically. High-risk actions (deploying to production, sending external communications) always pause for review.

## When to Use


- For alternatives, see [Agent Tool Selection Pattern](/patterns/agent-tool-selection-pattern/).

Use the Human-in-the-Loop Pattern when:
- The agent can take irreversible actions (deleting data, sending communications, deploying)
- The cost of a wrong action exceeds the cost of waiting for human review
- Regulatory or compliance requirements mandate human oversight
- The agent operates in an unfamiliar environment where confidence is low
- Examples: deployment agents, email drafting agents, database migration agents, financial transaction agents

## Solution

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
    agent_state: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ApprovalResponse:
    status: ApprovalStatus
    modified_parameters: Optional[Dict[str, Any]] = None
    feedback: str = ""

class HumanInTheLoop:
    def __init__(
        self,
        confidence_threshold: float = 0.7,
        auto_approve_low_risk: bool = True,
        reviewer: Optional[Callable[[ApprovalRequest], ApprovalResponse]] = None,
    ):
        self.confidence_threshold = confidence_threshold
        self.auto_approve_low_risk = auto_approve_low_risk
        self.reviewer = reviewer or self._default_reviewer

    def _default_reviewer(self, request: ApprovalRequest) -> ApprovalResponse:
        print(f"\n--- APPROVAL REQUIRED ---")
        print(f"Action: {request.action.name}")
        print(f"Description: {request.action.description}")
        print(f"Risk: {request.action.risk.value}")
        print(f"Confidence: {request.action.confidence:.0%}")
        print(f"Parameters: {request.action.parameters}")
        print(f"Reason: {request.reason}")
        print(f"-------------------------")

        choice = input("Approve? (y/n/m=modify): ").strip().lower()
        if choice == "y":
            return ApprovalResponse(status=ApprovalStatus.APPROVED)
        elif choice == "m":
            new_params = dict(request.action.parameters)
            key = input("Parameter to modify (or empty to skip): ").strip()
            if key and key in new_params:
                new_params[key] = input(f"New value for {key}: ").strip()
            return ApprovalResponse(
                status=ApprovalStatus.MODIFIED,
                modified_parameters=new_params,
            )
        return ApprovalResponse(status=ApprovalStatus.REJECTED, feedback="Rejected by reviewer")

    def needs_approval(self, action: AgentAction) -> bool:
        if action.risk == RiskLevel.HIGH:
            return True
        if action.risk == RiskLevel.MEDIUM and action.confidence < self.confidence_threshold:
            return True
        if action.risk == RiskLevel.LOW and not self.auto_approve_low_risk:
            return True
        return False

    def execute_with_approval(
        self,
        action: AgentAction,
        execute_fn: Callable[[AgentAction], str],
        reason: str = "",
    ) -> str:
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

# Usage
def mock_execute(action: AgentAction) -> str:
    return f"Executed {action.name} with {action.parameters}"

hitl = HumanInTheLoop(confidence_threshold=0.8)

actions = [
    AgentAction("read_file", "Read config file", RiskLevel.LOW, {"path": "/etc/config.yml"}, 0.95),
    AgentAction("run_tests", "Execute test suite", RiskLevel.LOW, {"suite": "unit"}, 0.9),
    AgentAction("send_email", "Send notification to client", RiskLevel.HIGH, {"to": "client@example.com", "subject": "Update"}, 0.85),
    AgentAction("deploy", "Deploy to production", RiskLevel.HIGH, {"env": "prod", "version": "v2.1.0"}, 0.6),
    AgentAction("delete_records", "Delete stale records", RiskLevel.MEDIUM, {"table": "logs", "older_than": "30d"}, 0.5),
]

for action in actions:
    result = hitl.execute_with_approval(action, mock_execute, reason="Agent workflow step")
    print(f"  Result: {result}\n")
```

### JavaScript

```javascript
const RiskLevel = { LOW: "low", MEDIUM: "medium", HIGH: "high" };
const ApprovalStatus = { APPROVED: "approved", REJECTED: "rejected", MODIFIED: "modified" };

class AgentAction {
  constructor(name, description, risk, parameters = {}, confidence = 1.0) {
    this.name = name;
    this.description = description;
    this.risk = risk;
    this.parameters = parameters;
    this.confidence = confidence;
  }
}

class ApprovalResponse {
  constructor(status, modifiedParameters = null, feedback = "") {
    this.status = status;
    this.modifiedParameters = modifiedParameters;
    this.feedback = feedback;
  }
}

class HumanInTheLoop {
  constructor(options = {}) {
    this.confidenceThreshold = options.confidenceThreshold ?? 0.7;
    this.autoApproveLowRisk = options.autoApproveLowRisk ?? true;
    this.reviewer = options.reviewer || ((req) => {
      console.log(`\n--- APPROVAL REQUIRED ---`);
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

    if (response.status === ApprovalStatus.REJECTED) {
      return `[REJECTED] ${action.name}: ${response.feedback}`;
    }

    if (response.status === ApprovalStatus.MODIFIED && response.modifiedParameters) {
      action.parameters = response.modifiedParameters;
    }

    console.log(`[APPROVED] Executing: ${action.name}`);
    return executeFn(action);
  }
}

// Usage
function mockExecute(action) {
  return `Executed ${action.name} with ${JSON.stringify(action.parameters)}`;
}

const hitl = new HumanInTheLoop({ confidenceThreshold: 0.8 });

const actions = [
  new AgentAction("read_file", "Read config", RiskLevel.LOW, { path: "/etc/config.yml" }, 0.95),
  new AgentAction("send_email", "Notify client", RiskLevel.HIGH, { to: "client@example.com" }, 0.85),
  new AgentAction("deploy", "Deploy to prod", RiskLevel.HIGH, { env: "prod" }, 0.6),
  new AgentAction("delete_records", "Delete stale logs", RiskLevel.MEDIUM, { table: "logs" }, 0.5),
];

for (const action of actions) {
  const result = hitl.executeWithApproval(action, mockExecute, "Agent step");
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

    public HumanInTheLoop(double confidenceThreshold, boolean autoApproveLowRisk,
                          java.util.function.Function<ApprovalRequest, ApprovalResponse> reviewer) {
        this.confidenceThreshold = confidenceThreshold;
        this.autoApproveLowRisk = autoApproveLowRisk;
        this.reviewer = reviewer != null ? reviewer : req -> {
            System.out.printf("%n--- APPROVAL REQUIRED ---%n");
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
                                       java.util.function.Function<AgentAction, String> executeFn,
                                       String reason) {
        if (!needsApproval(action)) {
            System.out.println("[AUTO] Executing: " + action.name());
            return executeFn.apply(action);
        }

        var response = reviewer.apply(new ApprovalRequest(action, reason));

        if (response.status() == ApprovalStatus.REJECTED) {
            return "[REJECTED] " + action.name() + ": " + response.feedback();
        }

        System.out.println("[APPROVED] Executing: " + action.name());
        return executeFn.apply(action);
    }

    public static void main(String[] args) {
        var hitl = new HumanInTheLoop(0.8, true, null);

        var actions = List.of(
            new AgentAction("read_file", "Read config", RiskLevel.LOW, Map.of("path", "/etc/config.yml"), 0.95),
            new AgentAction("send_email", "Notify client", RiskLevel.HIGH, Map.of("to", "client@example.com"), 0.85),
            new AgentAction("deploy", "Deploy to prod", RiskLevel.HIGH, Map.of("env", "prod"), 0.6),
            new AgentAction("delete_records", "Delete stale logs", RiskLevel.MEDIUM, Map.of("table", "logs"), 0.5)
        );

        for (var action : actions) {
            String result = hitl.executeWithApproval(action,
                a -> "Executed " + a.name() + " with " + a.parameters(),
                "Agent step");
            System.out.println("  Result: " + result + "\n");
        }
    }
}
```

## Explanation

The pattern gates execution behind three checks:

1. **Risk classification**: Each action is tagged as low, medium, or high risk. High-risk actions always require approval. Medium-risk actions require approval only when confidence is below the threshold. Low-risk actions auto-execute unless explicitly configured otherwise.
2. **Approval flow**: When approval is needed, the agent pauses and presents the action details (name, parameters, confidence, reason) to a reviewer. The reviewer can approve, reject, or modify the parameters.
3. **Execution or abort**: If approved (or modified and approved), the action executes. If rejected, the agent receives feedback and can adjust its plan.

The reviewer can be a human via CLI, a web UI, a Slack approval button, or even an automated secondary model for less critical decisions.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Async approval** | Agent pauses and resumes when approval arrives via webhook | Production agents with web UIs |
| **Batch approval** | Present multiple actions at once for a single review | Reduces reviewer fatigue for routine workflows |
| **Escalation chain** | Route to senior reviewer if first reviewer rejects | Tiered oversight for sensitive operations |
| **Timeout auto-reject** | If no approval within N minutes, reject by default | Prevents agents from hanging indefinitely |

## What Works

- **Classify risk conservatively** — when unsure, mark as high risk
- **Include context in approval requests** — show the agent's reasoning, not just the action
- **Set timeouts** — prevent agents from waiting forever for human input
- **Log all approval decisions** — audit trail for compliance and improvement
- **Let reviewers modify parameters** — sometimes the action is right but details need adjustment
- **Gradually reduce approval requirements** — as the agent proves reliable, lower the confidence threshold

## Common Mistakes

- Requiring approval for every step, causing reviewer fatigue and slow execution
- Not providing enough context for the reviewer to make an informed decision
- No timeout, leaving agents stuck waiting for unresponsive reviewers
- Not logging approvals, making audits impossible
- Treating rejections as failures instead of feedback for the agent to adjust

## Frequently Asked Questions

**Q: How do I determine the risk level of an action?**
A: Ask: is this action reversible? Does it affect external systems? Does it cost money? If yes to any, classify as high risk. Read-only operations are low risk. Internal state changes with no external effect are medium risk.

**Q: Can I use an LLM as the reviewer instead of a human?**
A: Yes, for medium-risk actions. A second LLM with a different prompt can review the first agent's plan. Use this for speed when full human review is too slow. Keep humans for high-risk actions.

**Q: What happens if the reviewer modifies the action?**
A: The agent receives the modified parameters and executes with them. The agent should log the modification and adjust its subsequent plan accordingly. Some implementations feed the modification back as a learning signal.

**Q: How do I implement async approval in a web app?**
A: Pause the agent by persisting its state. Send a notification (email, Slack, webhook) with an approval link. When the reviewer clicks approve/reject, resume the agent from its saved state with the decision.
