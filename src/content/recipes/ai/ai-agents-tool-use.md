---

contentType: recipes
slug: ai-agents-tool-use
title: "AI Agents with Tool Use"
description: "Build autonomous AI agents that can use external tools and APIs to accomplish complex tasks."
metaDescription: "Learn how to build autonomous AI agents with tool use, ReAct pattern, and reasoning for complex multi-step task completion and workflow automation."
difficulty: advanced
topics:
  - ai
tags:
  - ai-agents
  - ai
  - openai
  - architecture
  - machine-learning
relatedResources:
  - /recipes/ai-agents
  - /recipes/semantic-search
  - /recipes/slack-bot-openai
  - /recipes/chatbot-openai
  - /recipes/image-generation
  - /recipes/python-sentiment-analysis-nltk
lastUpdated: "2026-07-09"
author: "StackPractices"
seo:
  metaDescription: "Learn how to build autonomous AI agents with tool use, ReAct pattern, and reasoning for complex multi-step task completion and workflow automation."
  keywords:
    - ai-agents
    - ai
    - openai
    - architecture

---
## Overview

AI agents are autonomous systems that use large language models to reason, plan, and execute tasks by calling external tools. Unlike simple [chatbots](/recipes/ai/chatbot-openai), agents can search the web, query databases, run code, and interact with APIs to accomplish complex, multi-step objectives.

## When to Use

Use this resource when:
- Building autonomous assistants that need real-time data
- Creating workflows that require multiple API calls chained together
- Implementing reasoning over external knowledge sources
- Designing self-correcting systems that can retry failed operations

## Solution

### ReAct Pattern Agent (Python)

```python
import openai
import json
from typing import Callable

def agent_react(query: str, tools: dict[str, Callable]) -> str:
    messages = [
        {"role": "system", "content": "You are a helpful assistant. Use tools when needed."},
        {"role": "user", "content": query}
    ]

    for _ in range(5):  # Max iterations
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=messages,
            tools=[
                {"type": "function", "function": {"name": n, "parameters": {}}}
                for n in tools.keys()
            ]
        )

        msg = response.choices[0].message
        if not msg.tool_calls:
            return msg.content

        messages.append(msg)
        for call in msg.tool_calls:
            result = tools[call.function.name](**json.loads(call.function.arguments))
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": str(result)
            })

    return "Max iterations reached"
```

### Tool Definition Example

```python
def search_wikipedia(query: str) -> str:
    """Search Wikipedia for a topic."""
    # Implementation omitted
    return f"Results for {query}"

tools = {"search_wikipedia": search_wikipedia}
result = agent_react("Who won the 2022 FIFA World Cup?", tools)
```

## Explanation

The ReAct (Reasoning + Acting) pattern alternates between:

1. **Thought**: The LLM reasons about what to do next
2. **Action**: The LLM calls a tool with structured arguments
3. **Observation**: The tool result is fed back as context
4. **Repeat**: Until the task is complete

Key design decisions:
- **Tool schemas**: Use OpenAI's function calling format for type safety
- **Iteration limits**: Prevent infinite loops with a max step count
- **Error handling**: Tools should return errors gracefully, not crash
- **Context window**: Summarize long tool outputs to fit token limits

## Variants

| Framework | Pattern | Best For |
|-----------|---------|----------|
| [LangChain Agents](/recipes/ai/ai-agents-tool-use) | ReAct, Plan-and-Execute | Rapid prototyping |
| AutoGen | Multi-agent conversation | Collaborative tasks |
| CrewAI | Role-based agents | Business workflows |
| Custom | ReAct with tool registry | Production systems |

## What Works

- **Define clear tool interfaces**: Each tool needs a name, description, and JSON schema
- **Limit tool count**: 3-5 well-designed tools outperform 20 vague ones
- **Add validation**: Verify tool arguments before execution
- **Log all steps**: Agent reasoning is opaque; logging aids debugging
- **Implement timeouts**: External tools can hang; set generous timeouts

## Common Mistakes

1. **Giving agents too many tools**: Increases confusion and error rates
2. **Missing error handling**: A failed tool call without recovery crashes the loop
3. **Ignoring token limits**: Long observation histories exhaust the context window
4. **Not validating outputs**: Agents can hallucinate tool arguments
5. **Skipping human review**: Autonomous agents should have kill switches

## Advanced: Plan-and-Execute Pattern

```python
import openai
import json

def plan_and_execute(query: str, tools: dict) -> str:
    # Step 1: Generate a plan
    plan_response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Break the task into steps. Return a JSON array of steps."},
            {"role": "user", "content": query}
        ],
        response_format={"type": "json_object"}
    )
    steps = json.loads(plan_response.choices[0].message.content)["steps"]

    # Step 2: Execute each step
    results = []
    for step in steps:
        result = agent_react(step, tools)
        results.append(result)

    # Step 3: Synthesize
    final = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Synthesize the results into a final answer."},
            {"role": "user", "content": f"Query: {query}\nResults: {json.dumps(results)}"}
        ]
    )
    return final.choices[0].message.content
```

Plan-and-Execute separates planning from execution. The planner breaks the task into steps, each step runs through a ReAct loop, and a final call synthesizes results. This reduces token consumption because each step has a smaller context window. It also enables parallel execution of independent steps.

## Advanced: Tool Schema with JSON Schema

```python
tool_schemas = [
    {
        "type": "function",
        "function": {
            "name": "search_database",
            "description": "Search the product database by name or category",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search term"
                    },
                    "category": {
                        "type": "string",
                        "enum": ["electronics", "books", "clothing"],
                        "description": "Product category filter"
                    },
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 100,
                        "default": 10
                    }
                },
                "required": ["query"]
            }
        }
    }
]
```

Detailed tool schemas improve agent accuracy. Include `description` for every parameter — the LLM reads these to decide when and how to call the tool. Use `enum` for constrained values, `minimum`/`maximum` for numeric ranges, and `required` for mandatory fields. The more precise the schema, the fewer hallucinated arguments.

## Advanced: Context Window Management

```python
def summarize_observations(messages: list, max_tokens: int = 4000) -> list:
    """Summarize tool outputs when context grows too large."""
    total = sum(len(str(m.get("content", ""))) for m in messages)
    if total < max_tokens:
        return messages

    # Keep system + first user message, summarize the rest
    system = messages[0]
    user_query = messages[1]
    history = messages[2:]

    summary = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Summarize the tool calls and results concisely."},
            {"role": "user", "content": json.dumps([{"role": m["role"], "content": m["content"][:500]} for m in history])}
        ]
    ).choices[0].message.content

    return [system, user_query, {"role": "system", "content": f"Previous context: {summary}"}]
```

Long agent runs accumulate large observation histories that exhaust the context window. Summarize periodically by keeping the system prompt and original query, then compressing tool outputs into a summary. Alternatively, use sliding-window truncation or retrieval-augmented context selection to keep only relevant observations.

## Advanced: Multi-Agent Orchestration

```python
def multi_agent_orchestrate(query: str) -> str:
    agents = {
        'researcher': {
            'system': 'You are a research agent. Find information using search tools.',
            'tools': ['web_search', 'read_file']
        },
        'coder': {
            'system': 'You are a coding agent. Write and execute code.',
            'tools': ['run_python', 'write_file']
        },
        'reviewer': {
            'system': 'You are a review agent. Check code quality and correctness.',
            'tools': ['read_file', 'run_tests']
        }
    }

    # Route to researcher first
    research = run_agent(agents['researcher'], query)

    # Pass research to coder
    code = run_agent(agents['coder'], f"Based on: {research}\nImplement the solution.")

    # Review the code
    review = run_agent(agents['reviewer'], f"Review this code:\n{code}")

    if 'APPROVE' in review:
        return code
    else:
        # Re-route to coder with feedback
        return run_agent(agents['coder'], f"Fix issues:\n{review}\nOriginal:\n{code}")
```

Multi-agent orchestration assigns specialized roles to different agents. Each agent has its own system prompt and tool set. A coordinator routes tasks between agents based on the current state. This pattern works well for complex workflows: research → implement → review → deploy. Keep agent communication structured — pass context as formatted strings or JSON, not raw message histories.

## When to Avoid

- **Simple Q&A**: If a single LLM call answers the question, agents add unnecessary latency and cost
- **High-stakes decisions**: Medical diagnosis, legal advice, financial trading — agents can hallucinate tool arguments
- **Real-time systems**: Agent loops with multiple LLM calls add 5-30 seconds of latency
- **Cost-sensitive workloads**: Each iteration is a full LLM call; 5 iterations can cost $0.10+ per query

## Frequently Asked Questions

**Q: What is the difference between RAG and an agent?**
A: [RAG](/recipes/ai/semantic-search) retrieves documents and answers once. Agents can take multiple actions, use tools, and iterate until a goal is met.

**Q: How many tools should an agent have?**
A: Start with 2-3. Research shows accuracy drops sharply beyond 5-7 tools.

**Q: Can agents run without OpenAI?**
A: Yes. Local models (Llama, Mistral) support tool calling via structured output formats like JSON mode.

### How do I handle tool call failures?

Wrap each tool execution in a try/except. Return error messages as tool results so the agent can reason about the failure and retry or try an alternative. Set a max retry count to prevent infinite loops. Log the full error for debugging while giving the agent a concise error description.

### What is the cost of running an agent loop?

Each iteration is one LLM call. With GPT-4, a 5-iteration loop with 2000 tokens per call costs roughly $0.60. With GPT-4o-mini, the same loop costs under $0.01. Use cheaper models for simple tool-routing tasks and reserve GPT-4 for complex reasoning. Cache tool results to avoid redundant calls.

### How do I test agent behavior?

Mock the LLM responses and tool calls in unit tests. For integration tests, use a controlled environment with stubbed tools that return predictable results. Record production traces and replay them to test changes. Avoid testing against live APIs — flaky external services make tests unreliable.

### When should I use multi-agent orchestration?

Use multi-agent when a task has distinct phases (research, implement, review) that require different system prompts or tool sets. For simple tasks, a single agent with multiple tools is more efficient and predictable. Multi-agent orchestration adds coordination overhead and cost — use it only when roles are clearly separable.
