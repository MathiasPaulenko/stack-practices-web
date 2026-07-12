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
  - /recipes/ai-agents-tool-use
  - /recipes/image-generation
lastUpdated: "2026-07-09"
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

Below is a practical approach to creating an assistant, managing conversation threads, handling function calls, and retrieving files.

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

### How do I handle function call errors gracefully?

When your function throws an error, catch it and return a JSON object with `error` and `message` fields to the Assistants API via the `submit_tool_outputs` endpoint. The LLM reads the error message and can retry, ask the user for clarification, or try an alternative approach. Never return a raw exception string — sanitize it to avoid leaking internal details. Set a maximum retry count (e.g., 3) to prevent infinite loops where the LLM keeps calling the same failing function.

### How do I stream responses from the Assistants API?

Use the `stream` parameter when creating a run: `POST /v1/threads/{thread_id}/runs` with `"stream": true`. The API returns Server-Sent Events with `thread.run.step.delta` events containing incremental text. Parse the SSE stream and forward chunks to the client via WebSocket or SSE. Handle `thread.run.completed` to signal the end of the stream. Implement client-side buffering to handle partial JSON deltas.

### How do I implement rate limiting for my chatbot?

Track requests per user in Redis with a sliding window counter. Set limits based on your plan (e.g., 20 messages/minute for free tier, 100 for paid). Return HTTP 429 with a `Retry-After` header when the limit is hit. On the OpenAI side, monitor your organization's token usage rate limit. Implement exponential backoff when the OpenAI API returns 429. Queue requests during traffic spikes and process them asynchronously.

### How do I test an Assistants API integration?

Mock the OpenAI client with `vi.mock()` or `unittest.mock.patch`. Test function calling by returning predefined tool outputs and asserting the LLM receives them. For end-to-end tests, use a separate OpenAI assistant with a cheaper model (e.g., GPT-4o-mini) to reduce test costs. Record API responses with tools like VCR.py or Polly.js and replay them in CI to avoid real API calls. Test thread lifecycle: create, add messages, run, and verify the response.

### How do I handle long conversations that exceed the context window?

The Assistants API automatically truncates older messages when the thread exceeds the model's context window. To preserve important context, periodically summarize the conversation and add the summary as a system message. Implement a custom truncation strategy: keep the last N messages and the first message (which often contains instructions). For knowledge-intensive chats, store key facts in a vector database and retrieve them with `file_search` instead of relying on the full thread history.

### How do I implement multi-tenant isolation with the Assistants API?

Create a separate assistant per tenant with tenant-specific instructions and file uploads. Use tenant-scoped thread IDs and validate that a user only accesses threads belonging to their tenant before processing. Store the tenant-to-assistant mapping in your database. For shared assistants, include the tenant context in the system message and use function calling to scope all database queries by tenant ID. Never share file_search across tenants — upload files to each tenant's assistant separately.

### How do I handle Assistants API deprecations?

OpenAI periodically deprecates model versions and API features. Pin your model version in code (e.g., `gpt-4o-2024-08-06`) rather than using aliases like `gpt-4o` to avoid silent behavior changes. Subscribe to OpenAI's changelog and deprecation notices. When a model is deprecated, test the replacement model with your existing test suite before switching. Maintain a model compatibility matrix in your config so you can swap models without code changes.

### How do I implement conversation persistence across sessions?

Store thread IDs in your database keyed by user ID. When a user returns, retrieve their active thread ID and add new messages to it. Implement thread archival after a period of inactivity (e.g., 30 days) to reduce context bloat. For multi-device support, create a new thread per device session and merge conversation summaries periodically. Store message metadata (timestamps, function call results) alongside thread IDs for audit trails.

### How do I handle hallucinations in function calling responses?

Validate function outputs against a schema before returning them to the LLM. If the LLM hallucinates function parameters (e.g., calls `get_user(email="not-a-real-email")`), validate inputs with a Zod or Pydantic schema and return an error message if validation fails. The LLM will retry with corrected parameters. Log all function calls and their results for post-hoc analysis. Set a system prompt instruction: "Only call functions with parameters you extracted from the user's message or previous tool outputs."

### How do I implement fallback when the OpenAI API is down?

Implement a circuit breaker that trips after N consecutive failures (e.g., 5). When open, return cached responses or a graceful "service temporarily unavailable" message. Use a queue (e.g., BullMQ, Celery) to persist user messages during outages and process them when the API recovers. Configure a fallback model provider (e.g., Anthropic, local LLM) for critical paths. Monitor OpenAI status page and alert on elevated error rates.
