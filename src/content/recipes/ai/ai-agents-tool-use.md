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
relatedResources:
  - /recipes/ai-agents
  - /recipes/semantic-search
  - /recipes/slack-bot-openai
  - /recipes/chatbot-openai
  - /recipes/image-generation
lastUpdated: "2026-06-19"
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

## Frequently Asked Questions

**Q: What is the difference between RAG and an agent?**
A: [RAG](/recipes/ai/semantic-search) retrieves documents and answers once. Agents can take multiple actions, use tools, and iterate until a goal is met.

**Q: How many tools should an agent have?**
A: Start with 2-3. Research shows accuracy drops sharply beyond 5-7 tools.

**Q: Can agents run without OpenAI?**
A: Yes. Local models (Llama, Mistral) support tool calling via structured output formats like JSON mode.
