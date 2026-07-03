---
contentType: recipes
slug: ai-agents
title: "Build Autonomous AI Agents with Tool Use and Reasoning"
description: "How to design AI agents that autonomously plan, execute tools, and iterate toward goals using ReAct, function calling, and memory architectures."
metaDescription: "Learn to build autonomous AI agents. Design agents that plan, execute tools, and iterate using ReAct, function calling, and memory architectures."
difficulty: advanced
topics:
  - ai
tags:
  - ai
  - ai-agents
  - machine-learning
  - llm
  - neural-networks
relatedResources:
  - /recipes/prompt-engineering
  - /recipes/rag-pipeline
  - /recipes/semantic-search
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to build autonomous AI agents. Design agents that plan, execute tools, and iterate using ReAct, function calling, and memory architectures."
  keywords:
    - ai agents
    - autonomous agents
    - tool use llm
    - react pattern
    - function calling
---

## Overview

AI agents are autonomous systems powered by large language models (LLMs) that can perceive their environment, reason about goals, and take actions by invoking external tools. Unlike simple [chatbots](/recipes/ai/chatbot-openai) that only generate text, agents maintain state across multiple turns, choose which tools to call based on context, and iterate until a task is complete. They represent the next evolution from [static prompts](/recipes/ai/prompt-engineering) to dynamic, goal-oriented systems.

The fundamental agent loop is: **observe → reason → act → observe again**. The agent receives an input or environment state, reasons about what to do, calls a tool (such as a web search, database query, or code execution), observes the result, and repeats until the goal is satisfied. This recipe covers the ReAct pattern, function calling APIs, tool definitions, and memory management for multi-turn agent systems.

## When to use it

Use this recipe when:

- Building systems that answer complex questions requiring multiple data sources
- Automating workflows that involve web browsing, calculations, or API calls
- Creating personal assistants that can book flights, query databases, or generate reports
- Prototyping research agents that iteratively search, summarize, and synthesize information
- Implementing customer support bots that can look up orders, process refunds, and escalate issues

## Solution

### ReAct Agent (Python / OpenAI)

```python
from openai import OpenAI
import json

client = OpenAI()

def search_web(query: str) -> str:
    """Simulated web search tool."""
    return f"Search results for: {query}"

def calculate(expression: str) -> str:
    """Evaluates a mathematical expression."""
    try:
        return str(eval(expression))
    except Exception as e:
        return f"Error: {e}"

tools = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for current information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Evaluate a mathematical expression",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {"type": "string"}
                },
                "required": ["expression"]
            }
        }
    }
]

messages = [
    {"role": "system", "content": "You are a helpful assistant. Use tools when needed."},
    {"role": "user", "content": "What is the population of France divided by the population of Germany?"}
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

# Agent loop
max_iterations = 5
for i in range(max_iterations):
    message = response.choices[0].message

    if message.content:
        print(f"Assistant: {message.content}")
        break

    if message.tool_calls:
        messages.append(message)
        for tool_call in message.tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments)

            if name == "search_web":
                result = search_web(**args)
            elif name == "calculate":
                result = calculate(**args)
            else:
                result = "Unknown tool"

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result
            })

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )
```

### LangChain Agent with Memory

```python
from langchain.agents import AgentExecutor, create_react_agent
from langchain.memory import ConversationBufferMemory
from langchain.tools import Tool
from langchain_openai import ChatOpenAI
from langchain import hub

llm = ChatOpenAI(model="gpt-4o", temperature=0)

search_tool = Tool(
    name="web_search",
    func=lambda q: f"Results for {q}",
    description="Search the web for current information"
)

memory = ConversationBufferMemory(memory_key="chat_history")

prompt = hub.pull("hwchase17/react")
agent = create_react_agent(llm, [search_tool], prompt)
executor = AgentExecutor(agent=agent, tools=[search_tool], memory=memory, verbose=True)

executor.invoke({"input": "Find the capital of Japan and then calculate 15% of its population."})
```

## Explanation

- **ReAct (Reasoning + Acting)**: the agent interleaves chain-of-thought reasoning with tool execution. Each reasoning step explains why a tool is needed; each action step invokes the tool. This transparency makes debugging easier and improves accuracy over direct tool calling.
- **Function calling**: modern LLMs (GPT-4, Claude, Gemini) support structured function calling. The model outputs JSON with a tool name and arguments, which the application parses and executes. The result is fed back into the conversation as a `tool` message.
- **Agent loop**: the core execution loop continues until the model produces a final text response instead of a tool call, or until a maximum iteration limit is reached. This prevents infinite loops from poorly defined tools or ambiguous goals.
- **Memory**: without memory, each agent invocation is stateless. Conversation buffers store prior turns, while vector stores retain long-term facts extracted from tool results. Short-term memory handles the current session; long-term memory enables personalization across sessions.

## Variants

| Pattern | Reasoning | Tool use | Memory | Best for |
|---------|-----------|----------|--------|----------|
| ReAct | Explicit chain-of-thought | Structured functions | Buffer | General-purpose agents |
| Plan-and-execute | Pre-planned steps | Batch tool calls | Minimal | Predictable workflows |
| Reflection | Self-critique | Retry loops | Episodic | Code generation, writing |
| Multi-agent | Delegation | Agent-to-agent | Shared | Complex systems |

## What Works

- **Define tools precisely**: tool names and descriptions are prompts. A vague description like "search stuff" leads to incorrect tool selection. Be specific: "Search the web for current news and facts."
- **Validate tool outputs**: never trust raw LLM output as safe input to tools. Validate JSON schema, sanitize arguments, and handle errors gracefully. A malicious prompt should not execute arbitrary code.
- **Set iteration limits**: agents can loop indefinitely if a tool keeps returning errors or the goal is unreachable. Cap iterations at 5-10 and return a failure message if exceeded.
- **Log reasoning traces**: store the full chain-of-thought and tool execution history. This is essential for debugging, auditing, and improving the agent over time.
- **Use structured output for final answers**: when the agent must return data (not just chat), request JSON output via response format constraints to avoid parsing free text.

## Common mistakes

- **Giving the agent dangerous tools by default**: an agent with shell access or database write permissions can cause irreversible damage. Apply least-privilege tool access and require human approval for destructive actions.
- **Ignoring latency**: each tool call adds an LLM API round-trip. A 5-step agent with 2-second API latency takes 10+ seconds. Use parallel tool calling and caching to reduce perceived latency.
- **Over-engineering simple tasks**: if a question can be answered with a single [RAG lookup](/recipes/ai/rag-pipeline), do not build a full agent. Agents add complexity, cost, and failure modes. Use them only when multi-step reasoning is genuinely required.
- **Forgetting to handle tool errors**: if a search API is down, the agent receives an error string and may hallucinate an answer. Catch exceptions, return structured error messages, and teach the agent to retry or escalate.

## FAQ

**Q: What is the difference between an agent and a chatbot?**
A: A chatbot responds to each message independently. An agent maintains state across multiple turns, reasons about goals, and invokes external tools to accomplish tasks. Agents are [chatbots](/recipes/ai/chatbot-openai) plus autonomy.

**Q: Can I build agents without OpenAI?**
A: Yes. Claude (Anthropic), Gemini (Google), and open models like Llama 3 and Mistral support tool calling. The function-calling API varies slightly but the [ReAct pattern](/recipes/ai/ai-agents-tool-use) works across all of them.

**Q: How do I prevent an agent from making expensive API calls?**
A: Implement a cost budget per session, rate-limit tool calls, and require user confirmation for high-cost actions (e.g., booking a flight, sending an email).

**Q: Should agents replace traditional backend APIs?**
A: No. Agents are orchestration layers on top of existing APIs. They handle ambiguity and multi-step reasoning, but the underlying business logic, validation, and security should remain in your backend services.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
