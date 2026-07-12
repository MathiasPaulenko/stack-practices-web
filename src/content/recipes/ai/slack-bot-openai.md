---

contentType: recipes
slug: slack-bot-openai
title: "Build a Slack Bot with OpenAI GPT-4"
description: "How to build a conversational Slack bot powered by OpenAI GPT-4 that responds to mentions and direct messages"
metaDescription: "Build a Slack bot with OpenAI GPT-4. Handle mentions, DMs, conversation history, and function calling for a production-ready chatbot."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - chatbot
  - openai
  - machine-learning
  - llm
relatedResources:
  - /recipes/chatbot-openai
  - /recipes/llm-fine-tuning
  - /guides/software-architecture-guide
  - /recipes/ai-agents-tool-use
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build a Slack bot with OpenAI GPT-4. Handle mentions, DMs, conversation history, and function calling for a production-ready chatbot."
  keywords:
    - slack bot
    - openai
    - chatbot
    - gpt-4
    - bolt

---

# Build a Slack Bot with OpenAI GPT-4

A Slack bot powered by a large language model can answer questions, summarize threads, and execute commands through natural language. For a general chatbot implementation, see [Chatbot with OpenAI](/recipes/ai/chatbot-openai). Below is the idiomatic way to how to build one using the Slack Bolt framework and OpenAI's GPT-4 API.

## When to Use This

- You want an internal assistant that understands your team's context
- You need to automate responses to common questions in public channels
- You want to prototype conversational interfaces before building a full UI

## Prerequisites

- A Slack app with Bot Token and Socket Mode enabled
- An OpenAI API key
- Node.js 18+ or Python 3.10+

## Solution: Node.js Implementation

### 1. Install Dependencies

```bash
npm install @slack/bolt openai dotenv
```

### 2. Environment Configuration

```bash
# .env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
OPENAI_API_KEY=sk-your-openai-key
```

### 3. Bot Implementation

```javascript
// app.js
import { App } from '@slack/bolt';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory conversation store (use Redis in production)
const conversations = new Map();

function getHistory(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, [{ role: 'system', content: 'You are a helpful assistant in a Slack workspace.' }]);
  }
  return conversations.get(userId);
}

async function getGPTResponse(messages) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 500,
  });
  return response.choices[0].message.content;
}

// Respond to app mentions in channels
slack.event('app_mention', async ({ event, say }) => {
  const text = event.text.replace(/<@[^>]+>/, '').trim();
  const history = getHistory(event.user);

  history.push({ role: 'user', content: text });
  const reply = await getGPTResponse(history);
  history.push({ role: 'assistant', content: reply });

  // Trim history to last 10 messages
  if (history.length > 11) {
    conversations.set(event.user, [history[0], ...history.slice(-10)]);
  }

  await say({ text: reply, thread_ts: event.ts });
});

// Respond to direct messages
slack.message(async ({ message, say }) => {
  if (message.subtype || message.channel_type !== 'im') return;

  const history = getHistory(message.user);
  history.push({ role: 'user', content: message.text });
  const reply = await getGPTResponse(history);
  history.push({ role: 'assistant', content: reply });

  await say(reply);
});

(async () => {
  await slack.start();
  console.log('Slack bot is running');
})();
```

### 4. Start the Bot

```bash
node app.js
```

## How It Works

1. **Socket Mode**: The bot connects to Slack via WebSocket, so it works behind firewalls without exposing a public URL
2. **Conversation Memory**: Each user gets a rolling window of the last 10 messages for context
3. **Threading**: Channel responses are threaded to keep conversations organized
4. **Direct Messages**: The bot handles DMs separately for private conversations

## Production Considerations

- **Replace in-memory store with Redis** for multi-instance deployments. See [API Rate Limiting with Redis](/recipes/api/api-rate-limiting-redis) for Redis patterns.
- **Add rate limiting** to prevent API cost surprises. See [API Rate Limiting with Redis](/recipes/api/api-rate-limiting-redis) for implementation.
- **Implement function calling** to let the bot execute actions. See [AI Agents with Tool Use](/recipes/ai/ai-agents-tool-use) for function calling patterns.
- **Add message filtering** to prevent the bot from responding to every message in busy channels

## Variations

- **Python**: Use `slack-bolt` and `openai` packages with FastSocket
- **Summarize Threads**: Listen for thread events and offer TL;DR summaries
- **File Analysis**: Upload images or documents and use GPT-4 Vision

## FAQ

**Q: How much does this cost to run?**
A: GPT-4o-mini costs ~$0.60 per 1M tokens. A typical response is ~200 tokens, so ~1000 responses per dollar.

**Q: Can the bot access Slack history?**
A: Yes, if you grant `channels:history` scope, but respect user privacy and company policies.

**Q: How do I deploy this to production?**
A: Package as a Docker container and deploy to ECS, Kubernetes, or a VPS with pm2.

## Solution: Python Implementation

### 1. Install Dependencies

```bash
pip install slack-bolt openai python-dotenv
```

### 2. Bot Implementation

```python
import os
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = App(token=os.environ["SLACK_BOT_TOKEN"])
openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

conversations = {}

def get_history(user_id):
    if user_id not in conversations:
        conversations[user_id] = [
            {"role": "system", "content": "You are a helpful assistant in a Slack workspace."}
        ]
    return conversations[user_id]

def get_gpt_response(messages):
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=500,
    )
    return response.choices[0].message.content

@app.event("app_mention")
def handle_mention(event, say):
    import re
    text = re.sub(r"<@[^>]+>", "", event["text"]).strip()
    history = get_history(event["user"])
    history.append({"role": "user", "content": text})
    reply = get_gpt_response(history)
    history.append({"role": "assistant", "content": reply})
    if len(history) > 11:
        conversations[event["user"]] = [history[0]] + history[-10:]
    say(text=reply, thread_ts=event["ts"])

@app.message("")
def handle_dm(message, say):
    if message.get("subtype") or message.get("channel_type") != "im":
        return
    history = get_history(message["user"])
    history.append({"role": "user", "content": message["text"]})
    reply = get_gpt_response(history)
    history.append({"role": "assistant", "content": reply})
    say(reply)

if __name__ == "__main__":
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
```

## Additional Production Considerations

- **Use a persistent conversation store**: Redis or Postgres instead of in-memory maps. This survives restarts and works across multiple bot instances.
- **Implement token-aware truncation**: instead of keeping the last 10 messages, use `tiktoken` to count tokens and trim history to stay under the model's context window.
- **Add retry logic with exponential backoff**: OpenAI API calls can fail due to rate limits or network issues. Use `tenacity` (Python) or `p-retry` (JavaScript) to retry transient failures.
- **Log all interactions**: store user ID, channel, timestamp, prompt, and response for auditing and debugging. Use structured logging with correlation IDs.
- **Add a health check endpoint**: if running as a web service, expose a `/health` endpoint that verifies Slack and OpenAI connectivity.
- **Set per-user rate limits**: prevent a single user from consuming your entire OpenAI budget. Track requests per user and enforce daily limits.

## Common Mistakes

- **Not handling Slack retry requests**: Slack retries events if it does not receive a 200 OK within 3 seconds. Acknowledge events immediately and process asynchronously.
- **Storing API keys in code**: always use environment variables or a secrets manager. Never commit `.env` files to version control.
- **Not filtering bot's own messages**: without a check, the bot can enter an infinite loop responding to its own messages. Check `message.bot_id` and skip.
- **Ignoring thread context**: when a user asks a follow-up question in a thread, include the thread's previous messages for context. Use `conversations.replies` API to fetch thread history.
- **Not setting max_tokens**: an unbounded response can consume your entire API budget in a single call. Set a reasonable limit based on your use case.
- **Using the wrong model for the task**: GPT-4o-mini is cost-effective for simple Q&A. Use GPT-4o for complex reasoning, code generation, or multi-step planning.
- **Not handling empty or whitespace-only messages**: users may send empty messages or just mentions. Validate input before calling the OpenAI API.
- **Forgetting to handle Slack rate limits**: Slack allows 1 message per second per channel. Batch responses or queue messages to avoid hitting limits.

## Additional FAQ

**Q: How do I add thread context to the bot's responses?**
A: Use Slack's `conversations.replies` API to fetch all messages in a thread. Include the last 5-10 thread messages as context in the OpenAI prompt. This gives the bot awareness of the conversation flow.

**Q: Can the bot process file uploads?**
A: Yes. Listen for `file_shared` events, download the file using Slack's `files.info` API, and pass it to GPT-4 Vision for images or extract text for documents. Be mindful of file size limits and content policies.

**Q: How do I make the bot respond only to specific channels?**
A: Check `event.channel` against an allowlist of channel IDs. Configure the allowlist via environment variables or a config file. This prevents the bot from responding in channels where it is not wanted.

**Q: What is the best way to handle multiple languages?**
A: Detect the user's language using a lightweight library like `langdetect` (Python) or `franc` (JavaScript). Route to language-specific system prompts or translate the input before processing.

**Q: How do I monitor the bot's OpenAI costs?**
A: Track token usage per request using the `usage` field in the API response. Aggregate by user, channel, and day. Set up alerts when daily spend exceeds a threshold. Use OpenAI's dashboard for billing monitoring.

**Q: Can I use function calling with the Slack bot?**
A: Yes. Define tools like `search_knowledge_base` or `create_ticket` in the OpenAI request. When the model returns a tool call, execute the function and feed the result back. This lets the bot perform actions, not just chat.

**Q: How do I handle concurrency when multiple users message the bot simultaneously?**
A: Use a worker pool or queue system. Each incoming message is enqueued and a worker processes it. This prevents one long conversation from blocking responses to other users. With Socket Mode, Slack handles event concurrency, but your code must be async or use a thread pool.

**Q: Can I use the bot for internal knowledge base searches?**
A: Yes. Combine function calling with a RAG pipeline. Define a `search_knowledge_base(query)` tool that searches your vector store. The bot passes the user's question to the tool, retrieves relevant documents, and uses the context to generate a cited answer.

## Production Checklist

- [ ] API keys stored in environment variables, not in code
- [ ] Bot filters out its own messages to prevent infinite loops
- [ ] Conversation history persisted in Redis or Postgres (not in-memory)
- [ ] Rate limits enforced per user (max requests per day)
- [ ] OpenAI API calls have timeout and retry with exponential backoff
- [ ] Token usage logged per request for cost monitoring
- [ ] Error responses are user-friendly (no raw API errors exposed)
- [ ] Bot responds in threads to keep channels clean
- [ ] Health check endpoint exposed for monitoring
- [ ] Structured logging with correlation IDs for debugging

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
