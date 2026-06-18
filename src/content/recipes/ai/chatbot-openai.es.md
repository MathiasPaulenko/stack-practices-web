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
relatedResources:
  - /recipes/rag-pipeline
  - /recipes/semantic-search
  - /recipes/llm-fine-tuning
  - /guides/software-architecture-guide
  - /guides/system-design-interview-guide
lastUpdated: "2026-06-12"
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

Esta receta cubre la creación de un asistente, gestión de threads, invocación de funciones personalizadas e integración con archivos de conocimiento.

## Cuándo Usar

Usa este recurso cuando:
- Quieres un chatbot con memoria persistente sin gestionar historial manualmente
- Necesitas que el bot acceda a documentos internos o bases de conocimiento
- Quieres que el bot llame funciones de tu backend (consultar base de datos, reservar citas, etc.)
- Prefieres una solución gestionada en lugar de construir RAG y orquestación desde cero

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
| LangChain Agents | Orquestación multi-proveedor | Más flexible pero más código; funciona con cualquier LLM |
| RAG manual | Control total | Implementa tu propia recuperación de documentos y gestión de contexto |
| Claude / Gemini APIs | Alternativas de proveedor | APIs similares de Anthropic y Google; prueba múltiples modelos |

## Mejores Prácticas

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
