---
contentType: recipes
slug: chatbot-openai
title: "Create a Chatbot with OpenAI Assistants API"
description: "How to create an AI chatbot using the OpenAI Assistants API with function calling and file retrieval"
metaDescription: "Create an AI chatbot with OpenAI Assistants API. Handle conversations, function calling, file retrieval, and thread management with examples."
difficulty: beginner
topics:
  - ai
tags:
  - ai
  - chatbot
  - llm
  - machine-learning
  - neural-networks
relatedResources:
  - /recipes/rag-pipeline
  - /recipes/semantic-search
  - /recipes/llm-fine-tuning
  - /guides/software-architecture-guide
  - /guides/event-driven-architecture-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Create an AI chatbot with OpenAI Assistants API. Handle conversations, function calling, file retrieval, and thread management with examples."
  keywords:
    - chatbot
    - openai
    - assistants-api
    - llm
    - conversation
    - ai
---
## Overview

The OpenAI Assistants API lets you build conversational AI agents with persistent threads, built-in retrieval, code interpreter, and function calling. Unlike the Chat Completions API, Assistants manages conversation state, file handling, and tool execution automatically, so you do not need to maintain message history in your own database. For autonomous agents with tool use, see [AI Agents with Tool Use](/recipes/ai/ai-agents-tool-use).

This recipe covers creating an assistant, managing conversation threads, handling function calls, and retrieving files.

## When to Use

Use this resource when:
- You need persistent, multi-turn conversations without managing message history yourself
- You want built-in document retrieval and code execution
- You need the assistant to call external APIs via function calling
- You want stateful agents that remember context across sessions

## Solution

### Python

```python
from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")

# 1. Create an assistant with tools
assistant = client.beta.assistants.create(
    name="Support Bot",
    instructions="You are a helpful support agent. Use the knowledge base to answer questions.",
    model="gpt-4o-mini",
    tools=[
        {"type": "retrieval"},
        {"type": "code_interpreter"},
        {
            "type": "function",
            "function": {
                "name": "get_order_status",
                "description": "Get the status of a customer order",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "string"}
                    },
                    "required": ["order_id"]
                }
            }
        }
    ],
    file_ids=["file-abc123"]  # Uploaded knowledge base
)

# 2. Create a thread
thread = client.beta.threads.create()

# 3. Add a user message
client.beta.threads.messages.create(
    thread_id=thread.id,
    role="user",
    content="What is the status of order ORD-9981?"
)

# 4. Run the assistant
run = client.beta.threads.runs.create(
    thread_id=thread.id,
    assistant_id=assistant.id
)

# 5. Poll for completion and handle function calls
import time
while run.status in ["queued", "in_progress"]:
    time.sleep(1)
    run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)

    if run.status == "requires_action":
        for tool_call in run.required_action.submit_tool_outputs.tool_calls:
            if tool_call.function.name == "get_order_status":
                import json
                args = json.loads(tool_call.function.arguments)
                output = f"Order {args['order_id']} is shipped and arriving tomorrow."
                client.beta.threads.runs.submit_tool_outputs(
                    thread_id=thread.id,
                    run_id=run.id,
                    tool_outputs=[{"tool_call_id": tool_call.id, "output": output}]
                )

# 6. Retrieve assistant messages
messages = client.beta.threads.messages.list(thread_id=thread.id)
for msg in messages.data:
    if msg.role == "assistant":
        print(msg.content[0].text.value)
```

### JavaScript

```javascript
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function createAssistant() {
  // 1. Create assistant
  const assistant = await client.beta.assistants.create({
    name: 'Support Bot',
    instructions: 'You are a helpful support agent.',
    model: 'gpt-4o-mini',
    tools: [{ type: 'retrieval' }, { type: 'code_interpreter' }],
  });

  // 2. Create thread
  const thread = await client.beta.threads.create();

  // 3. Add user message
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: 'What is the status of order ORD-9981?',
  });

  // 4. Run and poll
  let run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id,
  });

  while (['queued', 'in_progress', 'requires_action'].includes(run.status)) {
    await new Promise(r => setTimeout(r, 1000));
    run = await client.beta.threads.runs.retrieve(thread.id, run.id);

    if (run.status === 'requires_action') {
      const outputs = run.required_action.submit_tool_outputs.tool_calls.map(tc => ({
        tool_call_id: tc.id,
        output: `Order status: shipped`,
      }));
      await client.beta.threads.runs.submitToolOutputs(thread.id, run.id, { tool_outputs: outputs });
    }
  }

  // 5. Get assistant response
  const messages = await client.beta.threads.messages.list(thread.id);
  const reply = messages.data.find(m => m.role === 'assistant');
  console.log(reply.content[0].text.value);
}

createAssistant();
```

### Java

```java
// Java with Spring AI's OpenAI integration (conceptual)
import org.springframework.ai.openai.OpenAiChatClient;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.AssistantMessage;

// Spring AI currently maps more closely to ChatCompletion.
// For Assistants API, use the OpenAI Java SDK directly:
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.assistants.*;

OpenAIClient client = OpenAIOkHttpClient.builder()
    .apiKey(System.getenv("OPENAI_API_KEY"))
    .build();

// Create assistant
Assistant assistant = client.beta().assistants().create(AssistantCreateParams.builder()
    .name("Support Bot")
    .instructions("You are a helpful support agent.")
    .model("gpt-4o-mini")
    .tools(List.of(
        AssistantCreateParams.Tool.ofRetrieval(AssistantCreateParams.Tool.Retrieval.builder().build()),
        AssistantCreateParams.Tool.ofFunction(AssistantCreateParams.Tool.Function.builder()
            .name("get_order_status").build())
    ))
    .build());

// Create thread and run (omitted for brevity — follow SDK docs)
```

## Explanation

The Assistants API separates three concerns: the **assistant** (configuration + tools), the **thread** (conversation state), and the **run** (execution of a single turn).

**Key concepts:**
- **Thread**: A conversation session. Messages persist across API calls.
- **Run**: One execution cycle. The assistant reads the thread, decides which tools to call, and generates a response.
- **Function calling**: The assistant can emit JSON tool calls. Your code executes them and returns results.
- **Retrieval**: Automatically indexes attached files and retrieves relevant passages at query time.
- **Code interpreter**: A sandboxed Python environment for math, data analysis, and file processing.

Unlike Chat Completions, you do not send the full message history on every request. The thread is stored server-side, making it ideal for long-lived conversations.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| OpenAI Assistants API | Stateful threads + built-in tools | Best for persistent conversations; managed by OpenAI |
| Chat Completions API | Stateless, manual history | More control, lower latency, but you manage context window |
| Azure OpenAI Assistants | Same API, enterprise compliance | SOC2, HIPAA, private networking; same SDK |
| [LangChain Agents](/recipes/ai/ai-agents-tool-use) | Framework-level abstraction | Swap models, add custom tools, but more boilerplate |
| Functionary / Local LLMs | Self-hosted function calling | Privacy-first, no API costs, but needs GPU |

## What Works

1. Store thread IDs in your database so users can resume conversations
2. Use `code_interpreter` for calculations and data manipulation instead of trusting LLM arithmetic
3. Validate and sanitize all function arguments before executing them
4. Set clear `instructions` to constrain the assistant's personality and scope
5. Monitor token usage per run; retrieval and code interpreter add considerable cost

## Common Mistakes

1. **Leaking thread IDs** — treat them like session tokens; scope them to authenticated users
2. **Ignoring `requires_action`** — runs hang forever if you do not submit tool outputs
3. **Overusing retrieval** — attaching massive files increases latency and cost; chunk and filter first
4. **Not handling run failures** — check `run.status` for `failed`, `expired`, or `cancelled`
5. **Assuming real-time** — runs are asynchronous; polling or streaming is required

## Frequently Asked Questions

### What is the difference between Assistants and Chat Completions?

Assistants manage thread state, built-in tools (retrieval, code interpreter), and function calling lifecycle for you. Chat Completions is stateless: you send the full message array every time and manage history, tool execution, and file handling yourself.

### Can I use my own LLM with the Assistants API?

No. The Assistants API is specific to OpenAI models. For custom models, use [LangChain agents](/recipes/ai/ai-agents-tool-use) or build a similar abstraction on top of Chat Completions with your own backend.

### How much does it cost?

You pay for the model's input/output tokens plus code interpreter sessions ($0.03 per session) and retrieval files ($0.20/GB per assistant per day). Always monitor usage in the OpenAI dashboard.
