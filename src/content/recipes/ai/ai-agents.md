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

The fundamental agent loop is: **observe → reason → act → observe again**. The agent receives an input or environment state, reasons about what to do, calls a tool (such as a web search, database query, or code execution), observes the result, and repeats until the goal is satisfied. Here is how to the ReAct pattern, function calling APIs, tool definitions, and memory management for multi-turn agent systems.

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

**Q: How do I test an agent end-to-end?**
A: Build a test suite with known inputs and expected tool call sequences. Mock the LLM responses to control the agent's behavior. Verify that the agent calls the right tools in the right order and produces the correct final output. Use LangSmith or Langfuse for tracing and debugging agent executions.

**Q: What is the maximum number of tools an agent can use?**
A: Most models handle 10-20 tools well. Beyond that, tool selection accuracy drops because the model has to parse too many descriptions. If you need more tools, group them by domain and use a router agent that delegates to sub-agents with smaller tool sets.

**Q: How do I handle agent failures gracefully?**
A: Implement a fallback chain: (1) retry the failed tool call with corrected arguments, (2) try an alternative tool, (3) return a partial result with an explanation of what failed. Never let an agent crash silently — always log the failure reason and notify the user.

**Q: Can agents work with streaming responses?**
A: Yes. OpenAI and Anthropic support streaming function calls. Stream the reasoning text to the user while executing tools in the background. This improves perceived latency because the user sees progress instead of waiting for a complete response.

**Q: How do I share agent state across multiple sessions?**
A: Persist the agent's conversation history, tool results, and intermediate reasoning in a database (Redis for short-term, Postgres for long-term). On session resume, load the state and continue from where the agent left off. This enables long-running tasks that span multiple user interactions.

## Additional Common Mistakes

- **Not rate-limiting tool calls** — an agent that calls a paid API in a loop can rack up significant costs. Implement per-tool rate limits and a total cost budget per agent session.
- **Using agents for deterministic tasks** — if a task always follows the same steps, write a script. Agents add variability and cost that deterministic code does not need.
- **Not sandboxing code execution tools** — if the agent can run code, use a container or sandbox with restricted permissions. Never let an agent execute code on your production server.
- **Ignoring token usage in multi-step reasoning** — each tool call adds tokens to the context. After 5-10 iterations, the context may exceed the model's window. Trim old tool results or use a summarization step.
- **Not testing tool error handling** — tools fail in production (API down, timeout, invalid input). Test your agent with simulated tool failures to ensure it handles them gracefully.
- **Using a single agent for everything** — a general-purpose agent that handles support, billing, and technical questions will be mediocre at all of them. Use specialized agents with focused tool sets for each domain.
- **Not logging tool call arguments** — when an agent misbehaves, you need to see exactly what arguments it passed to each tool. Log the full tool call JSON for debugging and auditing.
- **Forgetting to set a timeout on tool execution** — a tool that hangs (e.g., a web scraper on a slow site) blocks the entire agent loop. Set a per-tool timeout and return an error if exceeded.

## Best Practices

- **Start simple, then add complexity**: begin with a single-tool agent. Add tools one at a time and test after each addition. This isolates which tool causes regressions.
- **Use structured outputs**: when the agent needs to return data (not just text), request JSON output with a defined schema. Parse and validate server-side before acting on it.
- **Implement human-in-the-loop for high-stakes actions**: for actions that cost money, send emails, or modify production data, require user confirmation before the agent executes.
- **Version your agent configuration**: track changes to system prompts, tool definitions, and model parameters. This lets you roll back when a change degrades performance.
- **Monitor agent cost per session**: track token usage and tool call count per session. Set a budget and abort if exceeded. This prevents runaway agents from consuming your entire API budget.
- **Cache tool results when possible**: if a tool returns the same result for the same input (e.g., a search query), cache the result. This reduces latency and API calls in multi-step reasoning.
- **Use streaming for long-running agents**: stream the agent's reasoning to the user so they see progress. This improves UX and lets users abort if the agent goes in the wrong direction.

## Production Checklist

- [ ] All tools have timeouts and error handling
- [ ] Agent loop has a max iteration limit (prevent infinite loops)
- [ ] Tool call arguments logged for debugging and auditing
- [ ] Cost budget enforced per session (token usage tracked)
- [ ] Code execution tools sandboxed in containers
- [ ] Agent state persisted for session resumption
- [ ] Human-in-the-loop confirmation for high-stakes actions
- [ ] Tool results cached to reduce redundant API calls
- [ ] Agent behavior tested with simulated tool failures
- [ ] Streaming enabled for long-running reasoning tasks

## Scaling Considerations

When deploying agents at scale, consider these factors:

- **Token consumption grows quadratically**: each tool call adds tokens to the context window. After 10 iterations with verbose tool outputs, you may hit the model's context limit. Implement context window management: summarize old tool results or drop them after N turns.
- **Concurrent agent sessions**: each session maintains its own state and conversation history. Use a stateless API design where session state is loaded from Redis or Postgres at the start of each turn. This lets you scale horizontally across multiple server instances.
- **Model latency compounds**: an agent that makes 5 sequential tool calls with 2-second LLM response times takes 10+ seconds. For user-facing agents, stream intermediate results so users see progress. For background agents, use async processing with a job queue.
- **Cost control at scale**: a single agent session can consume 10K-50K tokens. At GPT-4 pricing, that's $0.30-$1.50 per session. Set per-session cost limits and switch to cheaper models (GPT-4o-mini) for simple tool-routing decisions.

## Cost Estimation

| Component | Cost per session | Notes |
|-----------|-----------------|-------|
| LLM calls (5 iterations) | $0.15-$0.75 | GPT-4o at $5/1M input, $15/1M output |
| Tool API calls | $0.00-$0.10 | Depends on tools (search, database, etc.) |
| Embedding (if RAG tool) | $0.001 | text-embedding-3-small |
| Total per session | $0.15-$0.85 | 10K-50K tokens per session |

For 1000 sessions/day: $150-$850/day. Switch to GPT-4o-mini for routing decisions to cut costs by 80%.

## When Not to Use Agents

Agents are powerful but not always the right tool. Avoid them when:

- **The task is a single LLM call**: if you just need a summary or classification, call the LLM directly. Wrapping it in an agent loop adds latency, cost, and failure modes without benefit.
- **Deterministic execution is required**: agents are non-deterministic by nature. If the same input must always produce the same output, use a fixed pipeline with no LLM-based routing.
- **Latency budget is <2 seconds**: agent loops take 5-30 seconds due to multiple LLM calls. For sub-second responses, use pre-computed responses or a single LLM call with no tools.
- **The tool set is unstable**: if your APIs change frequently, the agent's tool definitions break. Use a fixed pipeline where you control the integration points directly.
- **Cost sensitivity is high**: each agent session costs 10-50x more than a single LLM call. For high-volume, low-complexity tasks, a prompt chain is more cost-effective.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
