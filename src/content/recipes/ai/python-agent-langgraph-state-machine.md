---
contentType: recipes
slug: python-agent-langgraph-state-machine
title: "Build Stateful AI Agents with LangGraph State Machines"
description: "Create multi-step AI agents with LangGraph using state machines, conditional edges, tool calling, and human-in-the-loop checkpoints for production workflows"
metaDescription: "Build stateful AI agents with LangGraph state machines. Define nodes, conditional edges, tool calling, and checkpointing for complex multi-step LLM workflows."
difficulty: advanced
topics:
  - ai
tags:
  - python
  - langgraph
  - agents
  - state machine
  - langchain
relatedResources:
  - /recipes/ai/python-langchain-chains-composition
  - /recipes/ai/python-openai-function-calling-structured
  - /recipes/ai/python-llm-streaming-responses
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build stateful AI agents with LangGraph state machines. Define nodes, conditional edges, tool calling, and checkpointing for complex multi-step LLM workflows."
  keywords:
    - langgraph
    - ai agents
    - state machine langchain
    - langgraph python
    - multi-step agent
---

# Build Stateful AI Agents with LangGraph State Machines

LangGraph extends LangChain with stateful, cyclic graphs for building agentic workflows. Instead of linear chains, you define a state machine with nodes (functions), edges (transitions), and conditional routing. This enables multi-step agents that can loop, call tools, and maintain state across turns. This recipe covers building a research agent with tool calling, conditional routing, and checkpointing.

## When to Use This

- Multi-step agents that need to loop (search, evaluate, refine)
- Workflows with conditional branching (if confident → answer, else → search more)
- Human-in-the-loop workflows where a human approves tool calls
- Stateful conversations that persist across sessions

## Prerequisites

- Python 3.10+
- `langgraph` and `langchain-openai` packages

## Solution

### 1. Install Dependencies

```bash
pip install langgraph langchain-openai langchain-core
```

### 2. Define the Agent State

```python
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    search_results: str
    attempts: int
    max_attempts: int
```

### 3. Define Tools

```python
@tool
def search_web(query: str) -> str:
    """Search the web for information."""
    # Simulated search — replace with Tavily, SerpAPI, etc.
    results = {
        "redis caching": "Redis cache-aside pattern: check cache, if miss, load from DB, set cache. TTL recommended.",
        "docker compose": "Docker Compose defines multi-container apps in YAML. Use profiles for environment-specific services.",
    }
    return results.get(query.lower(), f"No results found for: {query}")

@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression."""
    try:
        result = eval(expression)  # In production, use a safe evaluator
        return f"Result: {result}"
    except Exception as e:
        return f"Error: {e}"

tools = [search_web, calculate]
```

### 4. Define Graph Nodes

```python
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
model_with_tools = model.bind_tools(tools)

def agent_node(state: AgentState) -> dict:
    """Main agent node — decides what to do next."""
    response = model_with_tools.invoke(state["messages"])
    return {"messages": [response]}

def tool_node(state: AgentState) -> dict:
    """Execute tool calls from the agent's last message."""
    last_message = state["messages"][-1]
    tool_messages = []

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_id = tool_call["id"]

        # Find and execute the tool
        tool_map = {t.name: t for t in tools}
        if tool_name in tool_map:
            result = tool_map[tool_name].invoke(tool_args)
            tool_messages.append(ToolMessage(
                content=str(result),
                tool_call_id=tool_id,
            ))

    return {"messages": tool_messages, "attempts": state.get("attempts", 0) + 1}

def should_continue(state: AgentState) -> str:
    """Conditional edge — decide whether to use tools or end."""
    last_message = state["messages"][-1]
    attempts = state.get("attempts", 0)
    max_attempts = state.get("max_attempts", 5)

    if last_message.tool_calls and attempts < max_attempts:
        return "tools"
    return END
```

### 5. Build the Graph

```python
def build_agent_graph():
    """Build and compile the LangGraph agent."""
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_node)

    # Set entry point
    workflow.set_entry_point("agent")

    # Add conditional edge from agent
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            END: END,
        },
    )

    # After tools, go back to agent
    workflow.add_edge("tools", "agent")

    # Compile with checkpointing
    from langgraph.checkpoint.memory import MemorySaver
    memory = MemorySaver()

    return workflow.compile(checkpointer=memory)

app = build_agent_graph()
```

### 6. Run the Agent

```python
config = {"configurable": {"thread_id": "session-1"}}

result = app.invoke(
    {
        "messages": [HumanMessage(content="What is the Redis cache-aside pattern?")],
        "max_attempts": 5,
    },
    config=config,
)

# Print the final response
for msg in result["messages"]:
    if isinstance(msg, AIMessage):
        print(f"AI: {msg.content}")
    elif isinstance(msg, ToolMessage):
        print(f"Tool: {msg.content}")
```

### 7. Stream Agent Steps

```python
for event in app.stream(
    {
        "messages": [HumanMessage(content="Calculate 15 * 23 and then search for Docker Compose")],
        "max_attempts": 5,
    },
    config=config,
):
    for node_name, node_output in event.items():
        print(f"\n--- {node_name} ---")
        if "messages" in node_output:
            for msg in node_output["messages"]:
                if isinstance(msg, AIMessage):
                    print(f"AI: {msg.content[:100]}")
                elif isinstance(msg, ToolMessage):
                    print(f"Tool result: {msg.content[:100]}")
```

## How It Works

1. **`StateGraph`** defines a directed graph where each node is a function that receives and returns the shared `AgentState`.
2. **`add_messages` annotation** automatically appends new messages to the existing list instead of replacing it, maintaining conversation history.
3. **Conditional edges** route to different nodes based on state. `should_continue` checks if the agent wants to call tools and if the attempt limit hasn't been exceeded.
4. **Cycle** — after tool execution, the graph returns to the `agent` node, allowing the agent to process tool results and decide the next step. This loop continues until the agent produces a response without tool calls.
5. **`MemorySaver` checkpointing** persists state per `thread_id`, enabling conversation continuity across invocations and human-in-the-loop patterns.

## Variants

### Human-in-the-Loop Approval

```python
from langgraph.graph import interrupt

def tool_node_with_approval(state: AgentState) -> dict:
    """Execute tools with human approval for sensitive operations."""
    last_message = state["messages"][-1]

    for tool_call in last_message.tool_calls:
        if tool_call["name"] == "calculate":
            # Interrupt and wait for human approval
            approval = interrupt({
                "question": f"Approve calculation: {tool_call['args']['expression']}?",
                "tool_call": tool_call,
            })

            if not approval:
                return {"messages": [ToolMessage(
                    content="Calculation rejected by user.",
                    tool_call_id=tool_call["id"],
                )]}

    # Proceed with normal tool execution
    return tool_node(state)

# Resume after human input
result = app.invoke(
    {"messages": [HumanMessage(content="Calculate 100 / 0")]},
    config=config,
)
# Agent pauses at interrupt — resume with:
# app.invoke(Command(resume=True), config=config)
```

### Multi-Agent Collaboration

```python
def researcher_node(state: AgentState) -> dict:
    """Researcher agent — searches for information."""
    response = model_with_tools.invoke([
        {"role": "system", "content": "You are a research assistant. Search for information."},
        *state["messages"],
    ])
    return {"messages": [response]}

def writer_node(state: AgentState) -> dict:
    """Writer agent — synthesizes findings into a report."""
    response = model.invoke([
        {"role": "system", "content": "You are a technical writer. Synthesize the research into a clear report."},
        *state["messages"],
    ])
    return {"messages": [response]}

def build_multi_agent_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("tools", tool_node)
    workflow.add_node("writer", writer_node)

    workflow.set_entry_point("researcher")
    workflow.add_conditional_edges("researcher", should_continue, {"tools": "tools", END: "writer"})
    workflow.add_edge("tools", "researcher")
    workflow.add_edge("writer", END)

    return workflow.compile(checkpointer=MemorySaver())
```

### Persistent State with SQLite

```python
from langgraph.checkpoint.sqlite import SqliteSaver

# Persist state to SQLite for cross-session continuity
memory = SqliteSaver.from_conn_string("agent_state.db")
app = build_agent_graph.__wrapped__(memory)

# State persists across sessions with the same thread_id
```

## Best Practices

- **Set `max_attempts`** — prevents infinite loops where the agent keeps calling tools without converging
- **Use `MemorySaver` for development** — switch to `SqliteSaver` or `PostgresSaver` for production
- **Define clear system prompts** — the agent needs explicit instructions about when to use tools vs. answer directly
- **Stream for real-time UX** — `app.stream()` shows each step as it happens, improving user experience

## Common Mistakes

- **Forgetting to add `add_messages` annotation** — messages get replaced instead of appended, losing conversation history
- **Not handling tool errors** — if a tool raises an exception, the agent gets stuck; wrap tool execution in try/except
- **No `max_attempts` limit** — the agent can loop indefinitely calling tools without producing a final answer
- **Using the same `thread_id` for different users** — state leaks between users; use unique thread IDs per session

## FAQ

**Q: LangGraph vs. LangChain chains — when to use which?**
A: Use LangChain chains for linear pipelines (prompt → model → parser). Use LangGraph for cyclic, stateful, or multi-agent workflows.

**Q: Can I use LangGraph with non-OpenAI models?**
A: Yes. Any `BaseChatModel` works — Anthropic, Google, local models via Ollama, etc.

**Q: How does checkpointing work?**
A: The checkpointer saves the full state after each node execution. On the next invocation with the same `thread_id`, the state is restored, enabling conversation continuity.

**Q: Can I visualize the graph?**
A: Yes. `app.get_graph().draw_png("agent.png")` generates a visual diagram of the graph structure.
