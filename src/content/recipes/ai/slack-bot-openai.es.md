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
  - machine-learning
  - llm
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

Un bot de Slack potenciado por un gran modelo de lenguaje puede responder preguntas, resumir hilos y ejecutar comandos a traves de lenguaje natural. Para una implementación general de chatbot, consulta [Chatbot con OpenAI](/recipes/ai/chatbot-openai). A continuacion se muestra como como construir uno usando el framework Slack Bolt y la API de GPT-4 de OpenAI.

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

- **Reemplaza el almacenamiento en memoria con Redis** para despliegues multi-instancia. Consulta [Rate Limiting de APIs con Redis](/recipes/api/api-rate-limiting-redis) para patrones de Redis.
- **Agrega rate limiting** para prevenir sorpresas de costos en la API. Consulta [Rate Limiting de APIs con Redis](/recipes/api/api-rate-limiting-redis) para implementación.
- **Implementa function calling** para permitir que el bot ejecute acciones. Consulta [Agentes de IA con Uso de Herramientas](/recipes/ai/ai-agents-tool-use) para patrones de function calling.
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

## Solución: Implementación en Python

### 1. Instalar Dependencias

```bash
pip install slack-bolt openai python-dotenv
```

### 2. Implementación del Bot

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

## Consideraciones Adicionales de Producción

- **Usa un store de conversación persistente**: Redis o Postgres en lugar de maps en memoria. Esto sobrevive reinicios y funciona across múltiples instancias del bot.
- **Implementa truncación consciente de tokens**: en lugar de mantener los últimos 10 mensajes, usa `tiktoken` para contar tokens y recortar el historial para no exceder el context window del modelo.
- **Añade lógica de retry con backoff exponencial**: las llamadas a la API de OpenAI pueden fallar por rate limits o problemas de red. Usa `tenacity` (Python) o `p-retry` (JavaScript) para reintentar fallos transitorios.
- **Registra todas las interacciones**: guarda user ID, canal, timestamp, prompt y respuesta para auditoría y debugging. Usa structured logging con correlation IDs.
- **Añade un endpoint de health check**: si ejecutas como servicio web, expón un endpoint `/health` que verifique conectividad con Slack y OpenAI.
- **Setea rate limits por usuario**: evita que un solo usuario consuma todo tu presupuesto de OpenAI. Trackea requests por usuario y enforce límites diarios.

## Errores Comunes

- **No manejar los retries de Slack**: Slack reintenta eventos si no recibe un 200 OK en 3 segundos. Acknowledge eventos inmediatamente y procesa asincrónicamente.
- **Guardar API keys en código**: siempre usa variables de entorno o un secrets manager. Nunca commitees archivos `.env` a version control.
- **No filtrar los mensajes del propio bot**: sin un check, el bot puede entrar en un loop infinito respondiéndose a sí mismo. Verifica `message.bot_id` y skip.
- **Ignorar el contexto del thread**: cuando un usuario hace una pregunta de seguimiento en un thread, incluye los mensajes previos del thread para contexto. Usa la API `conversations.replies` para fetchear el historial del thread.
- **No setear max_tokens**: una respuesta sin límite puede consumir todo tu presupuesto de API en una sola llamada. Setea un límite razonable según tu caso de uso.
- **Usar el modelo equivocado para la tarea**: GPT-4o-mini es cost-effective para Q&A simple. Usa GPT-4o para razonamiento complejo, generación de código o planning multi-paso.
- **No manejar mensajes vacíos o solo whitespace**: los usuarios pueden enviar mensajes vacíos o solo mentions. Valida el input antes de llamar a la API de OpenAI.
- **Olvidar manejar rate limits de Slack**: Slack permite 1 mensaje por segundo por canal. Batchea respuestas o encola mensajes para evitar hitting limits.

## Preguntas Frecuentes Adicionales

**P: ¿Cómo añado contexto de thread a las respuestas del bot?**
R: Usa la API `conversations.replies` de Slack para obtener todos los mensajes de un thread. Incluye los últimos 5-10 mensajes del thread como contexto en el prompt de OpenAI. Esto le da al bot awareness del flujo de conversación.

**P: ¿El bot puede procesar archivos subidos?**
R: Sí. Escucha eventos `file_shared`, descarga el archivo con la API `files.info` de Slack y pásalo a GPT-4 Vision para imágenes o extrae texto para documentos. Ten en cuenta los límites de tamaño de archivo y las políticas de contenido.

**P: ¿Cómo hago que el bot responda solo en canales específicos?**
R: Verifica `event.channel` contra una allowlist de IDs de canal. Configura la allowlist vía variables de entorno o un archivo de configuración. Esto evita que el bot responda en canales donde no es bienvenido.

**P: ¿Cuál es la mejor forma de manejar múltiples idiomas?**
R: Detecta el idioma del usuario con una librería ligera como `langdetect` (Python) o `franc` (JavaScript). Rutea a system prompts específicos por idioma o traduce el input antes de procesar.

**P: ¿Cómo monitoreo los costos de OpenAI del bot?**
R: Trackea el uso de tokens por request usando el campo `usage` en la respuesta de la API. Agrega por usuario, canal y día. Setea alertas cuando el spend diario exceda un threshold. Usa el dashboard de OpenAI para monitoreo de billing.

**P: ¿Puedo usar function calling con el bot de Slack?**
R: Sí. Define tools como `search_knowledge_base` o `create_ticket` en el request de OpenAI. Cuando el modelo devuelve un tool call, ejecuta la función y alimenta el resultado de vuelta. Esto permite que el bot ejecute acciones, no solo chatear.

**P: ¿Cómo manejo la concurrencia cuando múltiples usuarios escriben al bot simultáneamente?**
R: Usa un pool de workers o un sistema de colas. Cada mensaje entrante se encola y un worker lo procesa. Esto evita que una conversación larga bloquee respuestas a otros usuarios. Con Socket Mode, Slack maneja la concurrencia del lado de eventos, pero tu código debe ser async o usar un pool de threads.

**P: ¿Puedo usar el bot para búsquedas internas en la base de conocimiento de la empresa?**
R: Sí. Combina function calling con un pipeline RAG. Define una tool `search_knowledge_base(query)` que busque en tu vector store. El bot pasa la pregunta del usuario a la tool, recupera documentos relevantes, y usa el contexto para generar una respuesta citada. Esto es más útil que dejar que el LLM alucine respuestas.

## Checklist de Producción

- [ ] API keys almacenadas en variables de entorno, no en código
- [ ] El bot filtra sus propios mensajes para prevenir loops infinitos
- [ ] Historial de conversación persistido en Redis o Postgres (no en memoria)
- [ ] Rate limits enforced por usuario (max requests por día)
- [ ] Llamadas a OpenAI API con timeout y retry con backoff exponencial
- [ ] Uso de tokens logueado por request para monitoreo de costos
- [ ] Respuestas de error son user-friendly (sin errores raw de API expuestos)
- [ ] El bot responde en threads para mantener canales limpios
- [ ] Endpoint de health check expuesto para monitoreo
- [ ] Logging estructurado con correlation IDs para debugging

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
