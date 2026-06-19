---
contentType: recipes
slug: slack-bot-openai
title: "Construir un Bot de Slack con OpenAI GPT-4"
description: "Como construir un bot conversacional de Slack potenciado por OpenAI GPT-4 que responde a menciones y mensajes directos"
metaDescription: "Construye un bot de Slack con OpenAI GPT-4. Maneja menciones, mensajes directos, historial de conversaciones y llamadas a funciones para un chatbot listo para produccion."
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
  metaDescription: "Construye un bot de Slack con OpenAI GPT-4. Maneja menciones, mensajes directos, historial de conversaciones y llamadas a funciones para un chatbot listo para produccion."
  keywords:
    - slack bot
    - openai
    - chatbot
    - gpt-4
    - bolt
---

# Construir un Bot de Slack con OpenAI GPT-4

Un bot de Slack potenciado por un gran modelo de lenguaje puede responder preguntas, resumir hilos y ejecutar comandos a traves de lenguaje natural. Esta receta muestra como construir uno usando el framework Slack Bolt y la API de GPT-4 de OpenAI.

## Cuando Usar Esto

- Quieres un asistente interno que entienda el contexto de tu equipo
- Necesitas automatizar respuestas a preguntas comunes en canales publicos
- Quieres prototipar interfaces conversacionales antes de construir una UI completa

## Requisitos Previos

- Una app de Slack con Bot Token y Socket Mode habilitado
- Una API key de OpenAI
- Node.js 18+ o Python 3.10+

## Solucion: Implementacion en Node.js

### 1. Instalar Dependencias

```bash
npm install @slack/bolt openai dotenv
```

### 2. Configuracion de Entorno

```bash
# .env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
OPENAI_API_KEY=sk-your-openai-key
```

### 3. Implementacion del Bot

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

// Almacenamiento de conversaciones en memoria (usa Redis en produccion)
const conversations = new Map();

function getHistory(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, [{ role: 'system', content: 'Eres un asistente util en un workspace de Slack.' }]);
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

// Responder a menciones en canales
slack.event('app_mention', async ({ event, say }) => {
  const text = event.text.replace(/<@[^>]+>/, '').trim();
  const history = getHistory(event.user);

  history.push({ role: 'user', content: text });
  const reply = await getGPTResponse(history);
  history.push({ role: 'assistant', content: reply });

  // Limitar historial a las ultimas 10 mensajes
  if (history.length > 11) {
    conversations.set(event.user, [history[0], ...history.slice(-10)]);
  }

  await say({ text: reply, thread_ts: event.ts });
});

// Responder a mensajes directos
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
  console.log('Bot de Slack en ejecucion');
})();
```

### 4. Iniciar el Bot

```bash
node app.js
```

## Como Funciona

1. **Socket Mode**: El bot se conecta a Slack via WebSocket, funcionando detras de firewalls sin exponer una URL publica
2. **Memoria de Conversacion**: Cada usuario obtiene una ventana de los ultimos 10 mensajes para contexto
3. **Hilos**: Las respuestas en canales se colocan en hilos para mantener las conversaciones organizadas
4. **Mensajes Directos**: El bot maneja los DMs por separado para conversaciones privadas

## Consideraciones de Produccion

- **Reemplaza el almacenamiento en memoria con Redis** para despliegues multi-instancia
- **Agrega rate limiting** para prevenir sorpresas de costos en la API
- **Implementa function calling** para permitir que el bot ejecute acciones (crear tickets, consultar bases de datos)
- **Agrega filtrado de mensajes** para evitar que el bot responda a cada mensaje en canales ocupados

## Variaciones

- **Python**: Usa los paquetes `slack-bolt` y `openai` con FastSocket
- **Resumir Hilos**: Escucha eventos de hilos y ofrece resumenes TL;DR
- **Analisis de Archivos**: Sube imagenes o documentos y usa GPT-4 Vision

## FAQ

**P: Cuanto cuesta ejecutar esto?**
R: GPT-4o-mini cuesta ~$0.60 por 1M de tokens. Una respuesta tipica es de ~200 tokens, asi que ~1000 respuestas por dolar.

**P: El bot puede acceder al historial de Slack?**
R: Si, si otorgas el scope `channels:history`, pero respeta la privacidad de los usuarios y las politicas de la empresa.

**P: Como despliego esto en produccion?**
R: Empaqueta como un contenedor Docker y despliega en ECS, Kubernetes o un VPS con pm2.
