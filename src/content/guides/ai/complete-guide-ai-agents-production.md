---





contentType: guides
slug: complete-guide-ai-agents-production
title: "Complete Guide to AI Agents in Production"
description: "Build production AI agents. Covers agent architectures, tool use, planning, memory, multi-agent systems, ReAct patterns, function calling, human-in-the-loop, safety, and deployment patterns for reliable autonomous agents."
metaDescription: "Build production AI agents. Covers architectures, tool use, planning, memory, multi-agent, ReAct, human-in-the-loop, safety."
difficulty: advanced
topics:
  - ai
  - architecture
  - testing
tags:
  - ai-agents
  - ai
  - guide
  - agents
  - react
  - multi-agent
  - planning
  - tools
relatedResources:
  - /guides/complete-guide-llm-application-architecture
  - /guides/complete-guide-langchain-production
  - /guides/complete-guide-llm-evaluation
  - /guides/complete-guide-vitest-react-testing
  - /docs/ai-agent-design-document-template
  - /guides/complete-guide-llm-security
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build production AI agents. Covers architectures, tool use, planning, memory, multi-agent, ReAct, human-in-the-loop, safety."
  keywords:
    - ai agents production
    - agent architecture
    - react pattern
    - multi-agent systems
    - agent planning
    - agent memory
    - human in the loop
    - agent safety





---

## Introduction

AI agents are systems that use LLMs to reason, plan, and take actions through tools. Unlike simple chatbots, agents decide what to do, call external APIs, process results, and iterate until they complete a task. Building agents in production requires careful design of architecture, tools, memory, planning, safety, and observability. Below is a practical guide to the full spectrum of production AI agents.

## Agent Architectures

```text
Agent Types:
1. ReAct Agent: Reason → Act → Observe → Repeat
2. Plan-and-Execute: Plan all steps first, then execute sequentially
3. Router Agent: Classify input, route to specialized handler
4. Multi-Agent: Multiple agents collaborate on complex tasks
5. Supervisor Agent: One agent delegates to sub-agents

Key Components:
- LLM: The reasoning engine
- Tools: Functions the agent can call
- Memory: Short-term (conversation) and long-term (knowledge base)
- Planner: Breaks down complex tasks into steps
- Executor: Runs each step
- Observer: Evaluates results and decides next action
```

## ReAct Pattern

### Basic ReAct Agent

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
                # No tool calls — agent is done
                return msg.content
        
        return "Max iterations reached without completion."

# Define tools
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

# Create agent
agent = ReActAgent(
    tools={"search_web": search_web, "write_file": write_file, "run_code": run_code}
)

result = agent.run("Search for Python best practices and write a summary to a file called 'best_practices.txt'")
print(result)
```

## Plan-and-Execute Pattern

```python
from openai import OpenAI
import json

client = OpenAI()

class PlanExecuteAgent:
    def __init__(self, tools: dict, model: str = "gpt-4o"):
        self.tools = tools
        self.model = model
    
    def plan(self, task: str) -> list[dict]:
        """Break down the task into steps."""
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
        """Execute a single step using tools if needed."""
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

## Multi-Agent Systems

### Supervisor Pattern

```python
from openai import OpenAI
import json

client = OpenAI()

class SupervisorAgent:
    def __init__(self, sub_agents: dict, model: str = "gpt-4o"):
        self.sub_agents = sub_agents
        self.model = model
    
    def delegate(self, task: str) -> dict:
        """Decide which sub-agent(s) to use for the task."""
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
        
        # In production, route to actual sub-agent implementation
        return f"Delegated to {agent_name}: {sub_task}"

# Define sub-agents
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

### Collaborative Agents

```python
class CollaborativeAgents:
    def __init__(self, agents: dict[str, str], model: str = "gpt-4o", max_rounds: int = 5):
        self.agents = agents  # name -> system_prompt
        self.model = model
        self.max_rounds = max_rounds
    
    def discuss(self, topic: str) -> list[dict]:
        """Multiple agents discuss a topic and reach consensus."""
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

# Example: Code review discussion
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

# Usage in agent
memory = LongTermMemory()

# Store important facts
memory.store("User prefers Python over JavaScript", {"type": "preference"})
memory.store("User's project uses FastAPI and PostgreSQL", {"type": "project_info"})

# Recall during agent execution
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
        """Propose an action for human approval."""
        action = {"tool": tool_name, "args": args, "status": "pending"}
        
        if tool_name in self.require_approval_for:
            self.pending_actions.append(action)
            return {"status": "needs_approval", "action": action}
        else:
            # Auto-approve safe tools
            result = self.tools[tool_name](**args)
            return {"status": "executed", "result": result}
    
    def approve_action(self, action_id: int, status: ApprovalStatus, modified_args: dict = None) -> dict:
        """Human approves, rejects, or modifies an action."""
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

# Usage
agent = HumanInTheLoopAgent(
    tools={"send_email": lambda **k: f"Email sent to {k.get('to')}", "search": lambda **k: "results"},
    require_approval_for=["send_email"]
)

# Agent proposes sending an email
result = agent.propose_action("send_email", {"to": "boss@company.com", "subject": "Report", "body": "Here is the report."})
print(result)  # {"status": "needs_approval", ...}

# Human approves
approval = agent.approve_action(0, ApprovalStatus.APPROVED)
print(approval)  # {"status": "executed", "result": "Email sent to boss@company.com"}
```

## Safety and Guardrails

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
        # Check for dangerous commands
        args_str = str(args)
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, args_str, re.IGNORECASE):
                return SafetyCheck(False, f"Dangerous pattern detected: {pattern}")
        
        # Check tool whitelist
        allowed_tools = ["search_web", "write_file", "run_code", "send_email"]
        if tool_name not in allowed_tools:
            return SafetyCheck(False, f"Tool '{tool_name}' not in whitelist")
        
        # Check rate limits per tool
        # (implementation depends on your tracking system)
        
        return SafetyCheck(True)
    
    def check_output(self, output: str) -> SafetyCheck:
        # Check for sensitive data leakage
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

# Check before executing tool
check = safety.check_action("run_code", {"code": "import os; os.system('rm -rf /')"})
if not check.passed:
    print(f"BLOCKED: {check.reason}")
```

## Observability

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

# Usage in agent
trace = AgentTrace()
trace.log_thought("I need to search for information about Python frameworks")
trace.log_action("search_web", {"query": "Python web frameworks"}, "Found: Django, Flask, FastAPI")
trace.log_thought("Now I'll compare them")
trace.log_action("write_file", {"filename": "comparison.txt"}, "File written")
print(trace.summary())
```

## FAQ

### What is the difference between an agent and a chain?

A chain follows a fixed sequence of steps. An agent dynamically decides which steps to take based on the task and intermediate results. Agents use tools, reason about results, and adapt their approach. Chains are predictable and fast. Agents are flexible but slower, more expensive, and harder to debug.

### How do I prevent agents from running forever?

Set a max iteration limit (5-20 depending on complexity). Track token usage and stop if it exceeds a budget. Implement a timeout for each tool call. Use a "completion detector" — ask the LLM if the task is done after each iteration. Log all actions for debugging when agents get stuck in loops.

### Should I use multi-agent or single-agent architecture?

Start with a single agent. Move to multi-agent when: the task has distinct phases (research, code, write), different expertise is needed, or you want parallel execution. Multi-agent adds complexity in coordination, state management, and debugging. Use a supervisor pattern where one agent delegates to specialized sub-agents.

### How do I test AI agents?

Test individual tools with unit tests. Test the agent's decision-making with mocked LLM responses. Create scenario-based tests where you verify the agent takes the expected sequence of actions. Use replay testing — record agent traces and replay them to verify consistency. Test edge cases: tool failures, invalid inputs, max iterations.

### What tools should I give my agent?

Give agents tools that are specific, well-documented, and have clear input/output schemas. Start with 3-5 tools. Too many tools confuse the agent and increase latency. Each tool should have a clear docstring describing what it does and when to use it. Use Pydantic schemas for tool parameters to help the agent call them correctly.

### How do I handle agent failures in production?

Implement retry logic for transient failures (API timeouts, rate limits). Log all agent actions and intermediate states for debugging. Set up alerts for agents that hit max iterations or exceed token budgets. Use fallback responses when agents fail. Implement circuit breakers for external tools. Consider human-in-the-loop for high-stakes actions.

## See Also

- [Complete Guide to LangChain in Production](/guides/complete-guide-langchain-production/)
- [Complete Guide to LLM Application Architecture](/guides/complete-guide-llm-application-architecture/)
- [Complete Guide to LLM Evaluation](/guides/complete-guide-llm-evaluation/)
- [Complete Guide to LLM Security](/guides/complete-guide-llm-security/)
- [Complete Guide to RAG in Production](/guides/complete-guide-rag-production/)

