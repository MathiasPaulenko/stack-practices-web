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
relatedResources:
  - /recipes/chatbot-openai
  - /recipes/llm-fine-tuning
  - /guides/software-architecture-guide
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

A Slack bot powered by a large language model can answer questions, summarize threads, and execute commands through natural language. This recipe shows how to build one using the Slack Bolt framework and OpenAI's GPT-4 API.

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

- **Replace in-memory store with Redis** for multi-instance deployments
- **Add rate limiting** to prevent API cost surprises
- **Implement function calling** to let the bot execute actions (create tickets, query databases)
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
