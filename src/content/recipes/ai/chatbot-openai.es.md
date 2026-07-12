---


contentType: recipes
slug: chatbot-openai
title: "Crear un chatbot con la OpenAI Assistants API"
description: "Cómo crear un chatbot de IA usando la OpenAI Assistants API con function calling y recuperación de archivos"
metaDescription: "Crea un chatbot de IA con la OpenAI Assistants API. Maneja conversaciones, function calling, recuperación de archivos y gestión de threads con ejemplos."
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
  - /guides/system-design-interview-guide
  - /recipes/ai-agents-tool-use
  - /recipes/image-generation
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Crea un chatbot de IA con la OpenAI Assistants API. Maneja conversaciones, function calling, recuperación de archivos y gestión de threads con ejemplos."
  keywords:
    - chatbot
    - openai
    - assistants-api
    - llm
    - conversación
    - ia


---

## Visión General

La OpenAI Assistants API simplifica la construcción de chatbots inteligentes manejando el estado de la conversación, la recuperación de archivos y el function calling automáticamente. En lugar de gestionar memoria de contexto, embeber documentos y formatear herramientas manualmente, defines un asistente con instrucciones y capacidades, y la API se encarga del resto.

Lo siguiente cubre la creación de un asistente, gestión de threads, invocación de funciones personalizadas e integración con archivos de conocimiento.

## Cuándo Usar

Usa este recurso cuando:
- Quieres un chatbot con memoria persistente sin gestionar historial manualmente. Consulta [AI Agents Tool Use](/recipes/ai/ai-agents-tool-use) para agentes con memoria.
- Necesitas que el bot acceda a documentos internos o bases de conocimiento. Consulta [RAG Pipeline](/recipes/ai/rag-pipeline) para recuperación de conocimiento.
- Quieres que el bot llame funciones de tu backend (consultar base de datos, reservar citas, etc.). Consulta [Call REST API](/recipes/api/call-rest-api) para integración de funciones.
- Prefieres una solución gestionada en lugar de construir [RAG](/recipes/ai/semantic-search) y orquestación desde cero

## Solución

### Python

```python
import json
import time
from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")

# 1. Crear asistente con herramientas
assistant = client.beta.assistants.create(
    name="Soporte Técnico",
    instructions="""Eres un agente de soporte. Responde preguntas del usuario.
Si necesitas datos del usuario, llama a get_user_profile.
Usa solo los datos proporcionados.""",
    model="gpt-4o-mini",
    tools=[
        {
            "type": "function",
            "function": {
                "name": "get_user_profile",
                "description": "Obtiene el perfil del usuario por email",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "email": {"type": "string", "description": "Email del usuario"}
                    },
                    "required": ["email"]
                }
            }
        },
        {"type": "file_search"}
    ]
)

# 2. Crear thread y enviar mensaje
thread = client.beta.threads.create()
message = client.beta.threads.messages.create(
    thread_id=thread.id,
    role="user",
    content="¿Cuál es mi plan actual? Mi email es ana@example.com"
)

# 3. Ejecutar run y manejar tool calls
run = client.beta.threads.runs.create(
    thread_id=thread.id,
    assistant_id=assistant.id
)

while run.status in ["queued", "in_progress", "requires_action"]:
    time.sleep(1)
    run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)

    if run.status == "requires_action":
        tool_outputs = []
        for tool in run.required_action.submit_tool_outputs.tool_calls:
            if tool.function.name == "get_user_profile":
                args = json.loads(tool.function.arguments)
                result = {"plan": "Pro", "email": args["email"]}
                tool_outputs.append({"tool_call_id": tool.id, "output": json.dumps(result)})
        run = client.beta.threads.runs.submit_tool_outputs(
            thread_id=thread.id,
            run_id=run.id,
            tool_outputs=tool_outputs
        )

# 4. Obtener respuesta final
messages = client.beta.threads.messages.list(thread_id=thread.id)
print(messages.data[0].content[0].text.value)
```

### JavaScript

```javascript
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function createAssistant() {
  const assistant = await client.beta.assistants.create({
    name: 'Soporte Técnico',
    instructions: 'Eres un agente de soporte. Responde preguntas del usuario.',
    model: 'gpt-4o-mini',
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_user_profile',
          description: 'Obtiene el perfil del usuario por email',
          parameters: {
            type: 'object',
            properties: {
              email: { type: 'string' },
            },
            required: ['email'],
          },
        },
      },
    ],
  });

  const thread = await client.beta.threads.create();
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: '¿Cuál es mi plan actual? ana@example.com',
  });

  let run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id,
  });

  while (['queued', 'in_progress', 'requires_action'].includes(run.status)) {
    await new Promise(r => setTimeout(r, 1000));
    run = await client.beta.threads.runs.retrieve(thread.id, run.id);

    if (run.status === 'requires_action') {
      const outputs = run.required_action.submit_tool_outputs.tool_calls.map(tool => {
        if (tool.function.name === 'get_user_profile') {
          const args = JSON.parse(tool.function.arguments);
          return { tool_call_id: tool.id, output: JSON.stringify({ plan: 'Pro', email: args.email }) };
        }
        return { tool_call_id: tool.id, output: '{}' };
      });
      run = await client.beta.threads.runs.submitToolOutputs(thread.id, run.id, { tool_outputs: outputs });
    }
  }

  const messages = await client.beta.threads.messages.list(thread.id);
  console.log(messages.data[0].content[0].text.value);
}

createAssistant();
```

### Java

```java
// Java usa la REST API directamente o un SDK de terceros
// Ejemplo con HttpClient (Java 11+)
import java.net.http.*;
import java.net.URI;
import java.time.Duration;

public class OpenAIChatbot {
    private static final String API_KEY = System.getenv("OPENAI_API_KEY");
    private static final HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    public static String chat(String message) throws Exception {
        String body = "{\"model\":\"gpt-4o-mini\",\"messages\":[{\"role\":\"user\",\"content\":\"" + message + "\"}]}";
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.openai.com/v1/chat/completions"))
            .header("Authorization", "Bearer " + API_KEY)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
    }
}
```

## Explicación

La OpenAI Assistants API abstrae la complejidad de los chatbots:

- **Asistente**: Configuración persistente (instrucciones, modelo, herramientas). Se crea una vez y se reutiliza.
- **Thread**: Un objeto de conversación que almacena automáticamente el historial de mensajes. Los threads persisten en la infraestructura de OpenAI, por lo que no necesitas base de datos para el historial.
- **Run**: Un ciclo de procesamiento donde el asistente lee el thread, toma decisiones y genera respuestas. Puede requerir acciones externas (tool calls).
- **Tool Calling**: Si el asistente decide que necesita datos, emite una llamada a función. Tu código ejecuta la función y devuelve el resultado. El asistente continúa hasta generar la respuesta final.

**Compromisos:**
- Conveniente pero vendor-locked a OpenAI
- Más lento que API de chat directo debido a la gestión de estado
- Costo por token de entrada/salida más overhead de tool calls

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Assistants API | Gestión de estado y herramientas | Mejor para aplicaciones de chat persistentes; sin gestión de historial manual |
| Chat Completions API | Sin estado | Más rápido y barato; tu código gestiona memoria e historial |
| [LangChain Agents](/recipes/ai/ai-agents-tool-use) | Orquestación multi-proveedor | Más flexible pero más código; funciona con cualquier LLM |
| RAG manual | Control total | Implementa tu propia recuperación de documentos y gestión de contexto |
| Claude / Gemini APIs | Alternativas de proveedor | APIs similares de Anthropic y Google; prueba múltiples modelos |

## Lo que Funciona

1. Diseña funciones claras con nombres descriptivos y esquemas JSON estrictos
2. Siempre valida los argumentos de tool calls antes de ejecutar funciones del backend
3. Implementa límites de rate limiting y timeouts en las funciones externas para evitar bloqueos
4. Usa threads para aislar conversaciones de usuarios; nunca mezcles historial entre usuarios
5. Guarda IDs de threads en tu base de datos para recuperar conversaciones entre sesiones

## Errores Comunes

1. **Llamadas a funciones sin validar** — ejecutar tool calls con datos de usuario sin sanitizar es un riesgo de seguridad
2. **Bucles infinitos** — un asistente mal diseñado puede llamar repetidamente la misma función; establece límites de iteraciones
3. **Threads expuestos** — los IDs de thread actúan como tokens de sesión; asegúrate de que los usuarios solo accedan a sus propios threads
4. **Ignorar errores de tool call** — si tu función falla, devuelve un error claro para que el LLM lo maneje adecuadamente
5. **Sin límites de contexto** — threads largos eventualmente exceden la ventana de contexto; resume o trunca periódicamente

## Preguntas Frecuentes

### ¿Puedo usar Assistants API sin function calling?

Sí. Puedes crear asistentes con solo `file_search` o simplemente con instrucciones. El function calling es opcional pero potente para acceder a datos privados.

### ¿Cómo protejo los datos del usuario?

Nunca incluyas PII directamente en los mensajes si no es necesario. Usa IDs anónimos y haz que tus funciones realicen las búsquedas. Revisa la retención de datos de OpenAI y considera la API de Azure OpenAI para cumplimiento regional.

### ¿Puedo migrar de Chat Completions a Assistants?

Sí, pero requiere refactorización. La lógica de historial y gestión de contexto se externaliza a la API de Assistants. Evalúa si el aumento de latencia y costo vale la conveniencia de la gestión de estado.

### ¿Cómo manejo errores de function call de forma graceful?

Cuando tu función lanza un error, captúralo y retorna un objeto JSON con campos `error` y `message` a la Assistants API vía el endpoint `submit_tool_outputs`. El LLM lee el mensaje de error y puede reintentar, pedir aclaración al usuario, o intentar un enfoque alternativo. Nunca retornes un string de excepción raw — sanitízalo para evitar filtrar detalles internos. Setea un máximo de reintentos (ej., 3) para prevenir loops infinitos donde el LLM sigue llamando la misma función que falla.

### ¿Cómo streameo respuestas desde la Assistants API?

Usa el parámetro `stream` al crear un run: `POST /v1/threads/{thread_id}/runs` con `"stream": true`. La API retorna Server-Sent Events con eventos `thread.run.step.delta` conteniendo texto incremental. Parsea el stream SSE y reenvía chunks al cliente vía WebSocket o SSE. Maneja `thread.run.completed` para señalizar el fin del stream. Implementa buffering client-side para manejar deltas JSON parciales.

### ¿Cómo implemento rate limiting para mi chatbot?

Rastrea requests por usuario en Redis con un contador de sliding window. Setea límites basados en tu plan (ej., 20 mensajes/minuto para free tier, 100 para paid). Retorna HTTP 429 con header `Retry-After` cuando se alcanza el límite. En el lado de OpenAI, monitorea el rate limit de token usage de tu organización. Implementa exponential backoff cuando la API de OpenAI retorna 429. Encola requests durante picos de tráfico y procésalos asincrónicamente.

### ¿Cómo testeo una integración de Assistants API?

Mockea el cliente de OpenAI con `vi.mock()` o `unittest.mock.patch`. Testea function calling retornando tool outputs predefinidos y asertando que el LLM los reciba. Para tests end-to-end, usa un assistant separado de OpenAI con un modelo más barato (ej., GPT-4o-mini) para reducir costos de test. Graba respuestas de la API con tools como VCR.py o Polly.js y replayealas en CI para evitar llamadas reales a la API. Testea el lifecycle del thread: crear, agregar mensajes, ejecutar y verificar la respuesta.

### ¿Cómo manejo conversaciones largas que exceden la ventana de contexto?

La Assistants API trunca automáticamente los mensajes más antiguos cuando el thread excede la ventana de contexto del modelo. Para preservar contexto importante, resume periódicamente la conversación y agrega el resumen como mensaje de sistema. Implementa una estrategia de truncación custom: mantén los últimos N mensajes y el primer mensaje (que suele contener instrucciones). Para chats knowledge-intensive, almacena hechos clave en una vector database y recupéralos con `file_search` en lugar de depender del historial completo del thread.

### ¿Cómo implemento aislamiento multi-tenant con la Assistants API?

Crea un assistant separado por tenant con instrucciones y uploads de archivos tenant-specific. Usa thread IDs scoped por tenant y valida que un usuario solo acceda a threads pertenecientes a su tenant antes de procesar. Almacena el mapeo tenant-to-assistant en tu database. Para assistants compartidos, incluye el contexto del tenant en el mensaje de sistema y usa function calling para scopear todas las queries de database por tenant ID. Nunca compartas file_search entre tenants — sube archivos a cada assistant de tenant separadamente.

### ¿Cómo manejo deprecaciones de la Assistants API?

OpenAI periódicamente depreca versiones de modelos y features de la API. Pinea tu versión de modelo en código (ej., `gpt-4o-2024-08-06`) en lugar de usar aliases como `gpt-4o` para evitar cambios silenciosos de comportamiento. Suscríbete al changelog y avisos de deprecación de OpenAI. Cuando un modelo es deprecado, testea el modelo de reemplazo con tu suite de tests existente antes de cambiar. Mantén una matriz de compatibilidad de modelos en tu config para poder swappear modelos sin cambios de código.

### ¿Cómo implemento persistencia de conversación entre sesiones?

Almacena thread IDs en tu database keyed por user ID. Cuando un usuario retorna, recupera su thread ID activo y agrega nuevos mensajes a él. Implementa archival de threads después de un período de inactividad (ej., 30 días) para reducir context bloat. Para soporte multi-device, crea un nuevo thread por sesión de device y mergea resúmenes de conversación periódicamente. Almacena metadata de mensajes (timestamps, resultados de function calls) junto a los thread IDs para audit trails.

### ¿Cómo manejo alucinaciones en respuestas de function calling?

Valida outputs de funciones contra un schema antes de retornarlos al LLM. Si el LLM alucina parámetros de función (ej., llama `get_user(email="not-a-real-email")`), valida inputs con un schema Zod o Pydantic y retorna un mensaje de error si la validación falla. El LLM reintentará con parámetros corregidos. Loggea todos los function calls y sus resultados para análisis post-hoc. Setea una instrucción en el system prompt: "Solo llama funciones con parámetros que extrajiste del mensaje del usuario o de outputs de tools anteriores."
