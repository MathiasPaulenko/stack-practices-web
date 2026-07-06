---
contentType: guides
slug: complete-guide-ai-agents-production
title: "Guía Completa de AI Agents en Producción"
description: "Construir AI agents en produccion. Cubre arquitecturas de agents, tool use, planning, memory, multi-agent systems, patrones ReAct, function calling, human-in-the-loop, safety y deployment para agents autonomos confiables."
metaDescription: "Construir AI agents en produccion. Cubre arquitecturas, tool use, planning, memory, multi-agent, ReAct, human-in-the-loop, safety."
difficulty: advanced
topics:
  - ai
  - architecture
  - testing
tags:
  - ai-agents
  - ai
  - guia
  - agents
  - react
  - multi-agent
  - planning
  - tools
relatedResources:
  - /guides/ai/complete-guide-llm-application-architecture
  - /guides/ai/complete-guide-langchain-production
  - /guides/ai/complete-guide-llm-evaluation
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construir AI agents en produccion. Cubre arquitecturas, tool use, planning, memory, multi-agent, ReAct, human-in-the-loop, safety."
  keywords:
    - ai agents produccion
    - agent architecture
    - react pattern
    - multi-agent systems
    - agent planning
    - agent memory
    - human in the loop
    - agent safety
---

## Introducción

Los AI agents son sistemas que usan LLMs para reason, plan, y tomar acciones a traves de tools. A diferencia de chatbots simples, los agents deciden que hacer, llaman external APIs, procesan results, e iteran hasta completar un task. Construir agents en produccion requiere diseno cuidadoso de arquitectura, tools, memory, planning, safety, y observabilidad. A continuacion se cubre el espectro completo de production AI agents.

## Arquitecturas de Agent

```text
Tipos de Agent:
1. ReAct Agent: Reason → Act → Observe → Repeat
2. Plan-and-Execute: Plannear todos los steps primero, luego execute secuencialmente
3. Router Agent: Clasificar input, routear a handler especializado
4. Multi-Agent: Multiples agents colaboran en tasks complejos
5. Supervisor Agent: Un agent delega a sub-agents

Componentes Clave:
- LLM: El reasoning engine
- Tools: Functions que el agent puede llamar
- Memory: Short-term (conversation) y long-term (knowledge base)
- Planner: Breaks down tasks complejos en steps
- Executor: Run cada step
- Observer: Evalua results y decide next action
```

## Patron ReAct

### ReAct Agent Basico

```python
from openai import OpenAI
import json
from typing import Callable

client = OpenAI()

class ReActAgent:
    def __init__(self, tools: dict[str, Callable], model: str = "gpt-4o", max_iterations: int = 10):
        self.tools = tools
        self.model = model
        self.max_iterations = max_iterations
        self.tool_schemas = self._build_tool_schemas()
    
    def _build_tool_schemas(self) -> list[dict]:
        schemas = []
        for name, func in self.tools.items():
            schemas.append({
                "type": "function",
                "function": {
                    "name": name,
                    "description": func.__doc__ or f"Tool: {name}",
                    "parameters": getattr(func, "params", {"type": "object", "properties": {}})
                }
            })
        return schemas
    
    def run(self, task: str) -> str:
        messages = [
            {
                "role": "system",
                "content": "You are an autonomous agent. Use tools to complete the task. "
                           "Think step by step. If a tool fails, try a different approach."
            },
            {"role": "user", "content": task}
        ]
        
        for i in range(self.max_iterations):
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self.tool_schemas,
                tool_choice="auto"
            )
            
            msg = response.choices[0].message
            messages.append(msg)
            
            if msg.tool_calls:
                for call in msg.tool_calls:
                    func_name = call.function.name
                    func_args = json.loads(call.function.arguments)
                    
                    # Execute tool
                    try:
                        result = self.tools[func_name](**func_args)
                    except Exception as e:
                        result = f"Error: {e}"
                    
                    messages.append({
                        "role": "tool",
                        "tool_call_id": call.id,
                        "content": str(result)
                    })
            else:
                # No tool calls — agent termino
                return msg.content
        
        return "Max iterations reached without completion."

# Definir tools
def search_web(query: str) -> str:
    """Search the web for information."""
    return f"Search results for '{query}': Result 1, Result 2, Result 3"

def write_file(filename: str, content: str) -> str:
    """Write content to a file."""
    return f"File '{filename}' written successfully ({len(content)} bytes)"

def run_code(code: str) -> str:
    """Execute Python code and return the output."""
    try:
        exec_globals = {}
        exec(code, exec_globals)
        return "Code executed successfully"
    except Exception as e:
        return f"Execution error: {e}"

# Crear agent
agent = ReActAgent(
    tools={"search_web": search_web, "write_file": write_file, "run_code": run_code}
)

result = agent.run("Search for Python best practices and write a summary to a file called 'best_practices.txt'")
print(result)
```

## Patron Plan-and-Execute

```python
from openai import OpenAI
import json

client = OpenAI()

class PlanExecuteAgent:
    def __init__(self, tools: dict, model: str = "gpt-4o"):
        self.tools = tools
        self.model = model
    
    def plan(self, task: str) -> list[dict]:
        """Break down el task en steps."""
        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "Break down the task into concrete steps. Return JSON array of steps."},
                {"role": "user", "content": f"Task: {task}"}
            ],
            response_format={"type": "json_object"}
        )
        
        data = json.loads(response.choices[0].message.content)
        return data.get("steps", [])
    
    def execute_step(self, step: str, context: str = "") -> str:
        """Execute un single step usando tools si needed."""
        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": f"Execute this step. Previous results: {context}"},
                {"role": "user", "content": f"Step: {step}"}
            ]
        )
        return response.choices[0].message.content
    
    def run(self, task: str) -> dict:
        # Phase 1: Plan
        steps = self.plan(task)
        
        # Phase 2: Execute
        results = []
        context = ""
        
        for i, step in enumerate(steps):
            step_desc = step.get("description", str(step))
            result = self.execute_step(step_desc, context)
            results.append({"step": step_desc, "result": result})
            context += f"\nStep {i+1}: {step_desc}\nResult: {result}"
        
        return {"plan": steps, "results": results}

agent = PlanExecuteAgent(tools={})
result = agent.run("Research Python web frameworks, compare them, and write a recommendation report")
```

## Sistemas Multi-Agent

### Patron Supervisor

```python
from openai import OpenAI
import json

client = OpenAI()

class SupervisorAgent:
    def __init__(self, sub_agents: dict, model: str = "gpt-4o"):
        self.sub_agents = sub_agents
        self.model = model
    
    def delegate(self, task: str) -> dict:
        """Decidir cual sub-agent(s) usar para el task."""
        agent_descriptions = "\n".join(
            f"- {name}: {desc}" for name, desc in self.sub_agents.items()
        )
        
        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": f"You are a supervisor. Delegate tasks to the appropriate agent.\n\nAvailable agents:\n{agent_descriptions}\n\nReturn JSON: {{\"agent\": \"name\", \"task\": \"specific task for the agent\"}}"
                },
                {"role": "user", "content": task}
            ],
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)
    
    def run(self, task: str) -> str:
        delegation = self.delegate(task)
        agent_name = delegation["agent"]
        sub_task = delegation["task"]
        
        # En produccion, routear a actual sub-agent implementation
        return f"Delegated to {agent_name}: {sub_task}"

# Definir sub-agents
sub_agents = {
    "research_agent": "Searches the web and gathers information",
    "code_agent": "Writes, tests, and debugs code",
    "writer_agent": "Writes reports, documentation, and content",
    "data_agent": "Analyzes data and creates visualizations"
}

supervisor = SupervisorAgent(sub_agents)
result = supervisor.run("Write a Python script to analyze sales data and create a report")
print(result)
```

### Agents Colaborativos

```python
class CollaborativeAgents:
    def __init__(self, agents: dict[str, str], model: str = "gpt-4o", max_rounds: int = 5):
        self.agents = agents  # name -> system_prompt
        self.model = model
        self.max_rounds = max_rounds
    
    def discuss(self, topic: str) -> list[dict]:
        """Multiples agents discuten un topic y reach consensus."""
        conversation = [{"role": "user", "content": f"Topic for discussion: {topic}"}]
        messages_log = []
        
        for round_num in range(self.max_rounds):
            for agent_name, system_prompt in self.agents.items():
                messages = [
                    {"role": "system", "content": system_prompt},
                    *conversation
                ]
                
                response = client.chat.completions.create(
                    model=self.model,
                    messages=messages
                )
                
                reply = response.choices[0].message.content
                conversation.append({"role": "assistant", "content": f"[{agent_name}]: {reply}"})
                messages_log.append({"round": round_num + 1, "agent": agent_name, "message": reply})
        
        return messages_log

# Ejemplo: Code review discussion
agents = {
    "security_reviewer": "You are a security expert. Review code for vulnerabilities.",
    "performance_reviewer": "You are a performance expert. Review code for bottlenecks.",
    "style_reviewer": "You are a code style expert. Review code for readability and conventions."
}

collab = CollaborativeAgents(agents)
discussion = collab.discuss("Review this code: def process(data): return [d*2 for d in data if d > 0]")
for msg in discussion:
    print(f"[Round {msg['round']}] {msg['agent']}: {msg['message'][:100]}...")
```

## Agent Memory

### Short-Term Memory (Conversation)

```python
from dataclasses import dataclass, field

@dataclass
class AgentMemory:
    max_messages: int = 20
    messages: list = field(default_factory=list)
    
    def add(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        if len(self.messages) > self.max_messages:
            # Keep system message + recent messages
            system = [m for m in self.messages if m["role"] == "system"]
            non_system = [m for m in self.messages if m["role"] != "system"]
            self.messages = system + non_system[-(self.max_messages - len(system)):]
    
    def get_messages(self) -> list:
        return self.messages
    
    def clear(self):
        system = [m for m in self.messages if m["role"] == "system"]
        self.messages = system
```

### Long-Term Memory (Vector Store)

```python
import chromadb
from openai import OpenAI

client = OpenAI()

class LongTermMemory:
    def __init__(self, collection_name: str = "agent_memory"):
        self.db = chromadb.PersistentClient(path="./agent_memory")
        self.collection = self.db.get_or_create_collection(collection_name)
    
    def store(self, content: str, metadata: dict = None):
        embedding = client.embeddings.create(
            model="text-embedding-3-small",
            input=content
        ).data[0].embedding
        
        import hashlib
        doc_id = hashlib.md5(content.encode()).hexdigest()
        
        self.collection.add(
            ids=[doc_id],
            documents=[content],
            embeddings=[embedding],
            metadatas=[metadata or {}]
        )
    
    def recall(self, query: str, n_results: int = 5) -> list[str]:
        query_embedding = client.embeddings.create(
            model="text-embedding-3-small",
            input=query
        ).data[0].embedding
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        
        return results["documents"][0]
    
    def get_context(self, query: str) -> str:
        memories = self.recall(query)
        if memories:
            return "Previous relevant context:\n" + "\n".join(f"- {m}" for m in memories)
        return ""

# Uso en agent
memory = LongTermMemory()

# Storear important facts
memory.store("User prefers Python over JavaScript", {"type": "preference"})
memory.store("User's project uses FastAPI and PostgreSQL", {"type": "project_info"})

# Recall durante agent execution
context = memory.get_context("What language should I use?")
# Returns stored preferences
```

## Human-in-the-Loop

```python
from enum import Enum
from typing import Optional

class ApprovalStatus(Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"

class HumanInTheLoopAgent:
    def __init__(self, tools: dict, require_approval_for: list[str]):
        self.tools = tools
        self.require_approval_for = require_approval_for
        self.pending_actions: list[dict] = []
    
    def propose_action(self, tool_name: str, args: dict) -> dict:
        """Proponer un action para human approval."""
        action = {"tool": tool_name, "args": args, "status": "pending"}
        
        if tool_name in self.require_approval_for:
            self.pending_actions.append(action)
            return {"status": "needs_approval", "action": action}
        else:
            # Auto-approve safe tools
            result = self.tools[tool_name](**args)
            return {"status": "executed", "result": result}
    
    def approve_action(self, action_id: int, status: ApprovalStatus, modified_args: dict = None) -> dict:
        """Human approves, rejects, o modifies un action."""
        action = self.pending_actions[action_id]
        
        if status == ApprovalStatus.REJECTED:
            action["status"] = "rejected"
            return {"status": "rejected"}
        
        args = modified_args or action["args"]
        result = self.tools[action["tool"]](**args)
        action["status"] = "executed"
        action["result"] = result
        return {"status": "executed", "result": result}
    
    def get_pending(self) -> list[dict]:
        return [a for a in self.pending_actions if a["status"] == "pending"]

# Uso
agent = HumanInTheLoopAgent(
    tools={"send_email": lambda **k: f"Email sent to {k.get('to')}", "search": lambda **k: "results"},
    require_approval_for=["send_email"]
)

# Agent propone sending un email
result = agent.propose_action("send_email", {"to": "boss@company.com", "subject": "Report", "body": "Here is the report."})
print(result)  # {"status": "needs_approval", ...}

# Human approves
approval = agent.approve_action(0, ApprovalStatus.APPROVED)
print(approval)  # {"status": "executed", "result": "Email sent to boss@company.com"}
```

## Safety y Guardrails

### Agent Safety Layer

```python
import re
from dataclasses import dataclass

@dataclass
class SafetyCheck:
    passed: bool
    reason: str = ""

class AgentSafetyLayer:
    DANGEROUS_PATTERNS = [
        r"rm\s+-rf",
        r"DROP\s+TABLE",
        r"DELETE\s+FROM",
        r"format\s+C:",
        r"sudo\s+",
        r"chmod\s+777",
    ]
    
    def check_action(self, tool_name: str, args: dict) -> SafetyCheck:
        # Checkear dangerous commands
        args_str = str(args)
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, args_str, re.IGNORECASE):
                return SafetyCheck(False, f"Dangerous pattern detected: {pattern}")
        
        # Checkear tool whitelist
        allowed_tools = ["search_web", "write_file", "run_code", "send_email"]
        if tool_name not in allowed_tools:
            return SafetyCheck(False, f"Tool '{tool_name}' not in whitelist")
        
        # Checkear rate limits per tool
        # (implementation depende de tu tracking system)
        
        return SafetyCheck(True)
    
    def check_output(self, output: str) -> SafetyCheck:
        # Checkear sensitive data leakage
        sensitive_patterns = [
            (r'\b\d{3}-\d{2}-\d{4}\b', 'SSN detected'),
            (r'\b\d{16}\b', 'Credit card number detected'),
            (r'password\s*[:=]\s*\S+', 'Password in output'),
        ]
        
        for pattern, reason in sensitive_patterns:
            if re.search(pattern, output, re.IGNORECASE):
                return SafetyCheck(False, f"Sensitive data in output: {reason}")
        
        return SafetyCheck(True)

safety = AgentSafetyLayer()

# Checkear antes de executing tool
check = safety.check_action("run_code", {"code": "import os; os.system('rm -rf /')"})
if not check.passed:
    print(f"BLOCKED: {check.reason}")
```

## Observabilidad

### Agent Tracing

```python
import time
import json
from uuid import uuid4
from dataclasses import dataclass, field
from typing import Any

@dataclass
class AgentTrace:
    trace_id: str = field(default_factory=lambda: str(uuid4()))
    events: list = field(default_factory=list)
    
    def log(self, event_type: str, **kwargs):
        self.events.append({
            "timestamp": time.time(),
            "type": event_type,
            **kwargs
        })
    
    def log_thought(self, thought: str):
        self.log("thought", content=thought)
    
    def log_action(self, tool: str, args: dict, result: Any):
        self.log("action", tool=tool, args=args, result=str(result)[:500])
    
    def log_error(self, error: str):
        self.log("error", error=error)
    
    def summary(self) -> dict:
        actions = [e for e in self.events if e["type"] == "action"]
        errors = [e for e in self.events if e["type"] == "error"]
        thoughts = [e for e in self.events if e["type"] == "thought"]
        
        duration = 0
        if len(self.events) >= 2:
            duration = self.events[-1]["timestamp"] - self.events[0]["timestamp"]
        
        return {
            "trace_id": self.trace_id,
            "total_events": len(self.events),
            "thoughts": len(thoughts),
            "actions": len(actions),
            "errors": len(errors),
            "duration_seconds": duration,
            "tools_used": list(set(e["tool"] for e in actions)),
        }
    
    def export(self) -> str:
        return json.dumps(self.events, indent=2)

# Uso en agent
trace = AgentTrace()
trace.log_thought("I need to search for information about Python frameworks")
trace.log_action("search_web", {"query": "Python web frameworks"}, "Found: Django, Flask, FastAPI")
trace.log_thought("Now I'll compare them")
trace.log_action("write_file", {"filename": "comparison.txt"}, "File written")
print(trace.summary())
```

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre un agent y un chain?

Un chain sigue una secuencia fija de steps. Un agent dinamicamente decide cuales steps tomar basado en el task y intermediate results. Los agents usan tools, reason sobre results, y adaptan su approach. Los chains son predecibles y rapidos. Los agents son flexibles pero mas lentos, mas caros, y mas dificiles de debuggear.

### ¿Cómo prevengo que agents corran forever?

Setea un max iteration limit (5-20 dependiendo de complejidad). Trackea token usage y stop si excede un budget. Implementa un timeout para cada tool call. Usa un "completion detector" — pide al LLM si el task esta done despues de cada iteration. Loggea todas las actions para debugging cuando agents se stuck en loops.

### ¿Debería usar multi-agent o single-agent architecture?

Empieza con un single agent. Muevete a multi-agent cuando: el task tiene phases distintas (research, code, write), se necesita diferente expertise, o quieres parallel execution. Multi-agent agrega complejidad en coordination, state management, y debugging. Usa un supervisor pattern donde un agent delega a sub-agents especializados.

### ¿Cómo testeo AI agents?

Testea individual tools con unit tests. Testea el agent's decision-making con mocked LLM responses. Crea scenario-based tests donde verificas que el agent toma la expected sequence de actions. Usa replay testing — record agent traces y replayalas para verificar consistency. Testea edge cases: tool failures, invalid inputs, max iterations.

### ¿Qué tools debería darle a mi agent?

Dale a los agents tools que son specific, well-documented, y con clear input/output schemas. Empieza con 3-5 tools. Demasiados tools confunden al agent y aumentan latency. Cada tool deberia tener un clear docstring describiendo que hace y cuando usarlo. Usa Pydantic schemas para tool parameters para ayudar al agent a llamarlas correctamente.

### ¿Cómo manejo agent failures en produccion?

Implementa retry logic para transient failures (API timeouts, rate limits). Loggea todas las agent actions e intermediate states para debugging. Setea alerts para agents que hit max iterations o exceden token budgets. Usa fallback responses cuando agents fallan. Implementa circuit breakers para external tools. Considera human-in-the-loop para high-stakes actions.
