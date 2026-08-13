---
contentType: recipes
slug: chatbot-openai
title: "Crear un chatbot con la OpenAI Assistants API"
description: "Cómo crear un chatbot de IA usando la OpenAI Assistants API con function calling y file search."
metaDescription: "Crea un chatbot de IA con la OpenAI Assistants API. Maneja conversaciones, function calling, file search y gestión de threads con ejemplos."
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
  - /recipes/ai-agents-tool-use
  - /recipes/rag-pipeline
  - /recipes/semantic-search
  - /recipes/prompt-engineering
  - /recipes/slack-bot-openai
  - /recipes/llm-fine-tuning
lastUpdated: "2026-08-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Crea un chatbot de IA con la OpenAI Assistants API. Maneja conversaciones, function calling, file search y gestión de threads con ejemplos."
  keywords:
    - chatbot
    - openai
    - assistants-api
    - llm
    - conversación
    - ia
---

## Visión General

La OpenAI Assistants API permite crear chatbots con estado sin que tú escribas el historial de la conversación, la recuperación de archivos ni el bucle de ejecución de herramientas. Definas un asistente una vez, luego creas un `thread` para cada conversación y dejas que la API maneje el orden de mensajes, las llamadas a herramientas integradas y el `function calling`.

> **Aviso de deprecación:** OpenAI deprecó la Assistants API en agosto de 2025. Cerrará el **26 de agosto de 2026**. OpenAI recomienda la [Responses API](https://platform.openai.com/docs/api-reference/responses) o el [Agents SDK](https://platform.openai.com/docs/guides/agents-sdk) para proyectos nuevos. Usa esta receta para mantener integraciones existentes o comparar enfoques; no inicies chatbots nuevos en producción con la Assistants API sin un plan de migración.

## Cuándo Usar

Usa la OpenAI Assistants API cuando:

- Necesitas un chatbot con memoria persistente entre turnos y sesiones. Para una alternativa sin estado, consulta [Prompt Engineering](/recipes/prompt-engineering/).
- Quieres `file_search` o `code_interpreter` integrados sin montar un pipeline RAG aparte. Para un RAG a medida, consulta [RAG Pipeline](/recipes/rag-pipeline/).
- Quieres que el asistente llame funciones de tu backend para obtener datos, reservar citas o activar flujos de trabajo. Para más patrones de agentes, consulta [AI Agents Tool Use](/recipes/ai-agents-tool-use/).
- Ya estás en el ecosistema OpenAI y aceptas una API gestionada, con proveedor único y una ruta de migración explícita.

**No** la uses cuando:

- Necesitas respuestas de baja latencia en tiempo real. Los `run` de Assistants son asíncronos y normalmente requieren polling o streaming.
- Quieres evitar el lock-in con OpenAI. Revisa [LangChain Agents](/recipes/ai-agents-tool-use/) o las variantes de modelos locales más abajo.
- Construyes un proyecto nuevo desde mediados de 2025 en adelante. Prefiere la [Responses API](https://platform.openai.com/docs/api-reference/responses).

## Solución

Los siguientes ejemplos construyen el mismo bot de soporte en tres lenguajes. El bot puede buscar en archivos subidos y llamar a la función `get_order_status`.

### Python

```python
import json
import time
from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")

assistant = client.beta.assistants.create(
    name="Support Bot",
    instructions="""You are a support agent. Answer questions from the user's knowledge base.
If you need order data, call get_order_status. Use only the data provided.""",
    model="gpt-4o-mini",
    tools=[
        {"type": "file_search"},
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
    tool_resources={
        "file_search": {"vector_store_ids": ["vs_..."]}
    }
)

thread = client.beta.threads.create()
client.beta.threads.messages.create(
    thread_id=thread.id,
    role="user",
    content="What is the status of order ORD-9981?"
)

run = client.beta.threads.runs.create(
    thread_id=thread.id,
    assistant_id=assistant.id
)

while run.status in ("queued", "in_progress", "requires_action"):
    time.sleep(1)
    run = client.beta.threads.runs.retrieve(
        thread_id=thread.id,
        run_id=run.id
    )

    if run.status == "requires_action":
        outputs = []
        for tool_call in run.required_action.submit_tool_outputs.tool_calls:
            if tool_call.function.name == "get_order_status":
                args = json.loads(tool_call.function.arguments)
                result = f"Order {args['order_id']} is shipped and arriving tomorrow."
                outputs.append({"tool_call_id": tool_call.id, "output": result})

        client.beta.threads.runs.submit_tool_outputs(
            thread_id=thread.id,
            run_id=run.id,
            tool_outputs=outputs
        )

messages = client.beta.threads.messages.list(
    thread_id=thread.id,
    order="desc",
    limit=1
)
print(messages.data[0].content[0].text.value)
```

### JavaScript

```javascript
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function runChatbot() {
  const assistant = await client.beta.assistants.create({
    name: 'Support Bot',
    instructions: 'You are a support agent. Answer from the knowledge base. If you need order data, call get_order_status.',
    model: 'gpt-4o-mini',
    tools: [
      { type: 'file_search' },
      {
        type: 'function',
        function: {
          name: 'get_order_status',
          description: 'Get the status of a customer order',
          parameters: {
            type: 'object',
            properties: { order_id: { type: 'string' } },
            required: ['order_id']
          }
        }
      }
    ],
    tool_resources: {
      file_search: { vector_store_ids: ['vs_...'] }
    }
  });

  const thread = await client.beta.threads.create();
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: 'What is the status of order ORD-9981?'
  });

  let run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id
  });

  while (['queued', 'in_progress', 'requires_action'].includes(run.status)) {
    await new Promise(r => setTimeout(r, 1000));
    run = await client.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });

    if (run.status === 'requires_action') {
      const outputs = run.required_action.submit_tool_outputs.tool_calls.map(tc => {
        if (tc.function.name === 'get_order_status') {
          const args = JSON.parse(tc.function.arguments);
          return {
            tool_call_id: tc.id,
            output: `Order ${args.order_id} is shipped and arriving tomorrow.`
          };
        }
        return { tool_call_id: tc.id, output: '{}' };
      });

      run = await client.beta.threads.runs.submitToolOutputs(run.id, {
        thread_id: thread.id,
        tool_outputs: outputs
      });
    }
  }

  const messages = await client.beta.threads.messages.list(thread.id, {
    limit: 1,
    order: 'desc'
  });
  console.log(messages.data[0].content[0].text.value);
}

runChatbot().catch(console.error);
```

### Java

```java
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.core.JsonValue;
import com.openai.models.FunctionDefinition;
import com.openai.models.FunctionParameters;
import com.openai.models.beta.assistants.AssistantCreateParams;
import com.openai.models.beta.assistants.FileSearchTool;
import com.openai.models.beta.assistants.FunctionTool;

public class SupportAssistant {
    public static void main(String[] args) {
        OpenAIClient client = OpenAIOkHttpClient.fromEnv();

        FunctionDefinition getOrderStatus = FunctionDefinition.builder()
            .name("get_order_status")
            .description("Get the status of a customer order")
            .parameters(FunctionParameters.builder()
                .putAllAdditionalProperties(Map.of(
                    "type", JsonValue.from("object"),
                    "properties", JsonValue.from(Map.of(
                        "order_id", Map.of("type", "string")
                    )),
                    "required", JsonValue.from(List.of("order_id"))
                ))
                .build())
            .build();

        AssistantCreateParams params = AssistantCreateParams.builder()
            .name("Support Bot")
            .instructions("You are a support agent. Answer from the knowledge base. " +
                          "If you need order data, call get_order_status.")
            .model("gpt-4o-mini")
            .addTool(FileSearchTool.builder().build())
            .addTool(FunctionTool.builder().function(getOrderStatus).build())
            .toolResources(AssistantCreateParams.ToolResources.builder()
                .fileSearch(AssistantCreateParams.ToolResources.FileSearch.builder()
                    .vectorStoreIds(List.of("vs_..."))
                    .build())
                .build())
            .build();

        client.beta().assistants().create(params);
        // Thread, message, run, and tool-output submission follow the same pattern
        // using ThreadCreateParams, MessageCreateParams, RunCreateParams, etc.
    }
}
```

## Explicación

La Assistants API abstrae tres piezas de complejidad:

- **Asistente:** una configuración persistente de modelo, instrucciones y herramientas. Lo creas una vez y lo reutilizas para cada conversación.
- **Thread:** un contenedor de conversación. OpenAI almacena el historial de mensajes, por lo que no necesitas una base de datos para el log de chat.
- **Run:** una pasada de ejecución. El modelo decide si responde directamente, llama una función o invoca una herramienta integrada. Tu código ejecuta la función y envía el resultado.

Cuando `run.status` es `requires_action`, el `run` se pausa hasta que se envíen los `tool outputs` solicitados. Después de llamar `submit_tool_outputs` (Python) o `submitToolOutputs` (Node), el `run` se reanuda y el asistente produce un mensaje final.

### Compromisos

- **Conveniencia vs. control:** Assistants gestiona estado y llamadas a herramientas, pero pierdes control sobre la construcción exacta del prompt y el uso de la ventana de contexto.
- **Latencia:** cada `run` es asíncrono. Requiere polling o streaming, lo que añade idas y vueltas respecto a una sola llamada a Chat Completions.
- **Costo:** pagas tokens de entrada/salida más el uso de herramientas. `file_search` y `code_interpreter` añaden overhead.
- **Lock-in y deprecación:** la API es específica de OpenAI y está deprecada. Los proyectos nuevos deberían evaluar la [Responses API](https://platform.openai.com/docs/api-reference/responses).

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| OpenAI Assistants API | Threads con estado + herramientas integradas | Útil para integraciones gestionadas existentes; deprecada para proyectos nuevos |
| OpenAI Chat Completions API | Sin estado, historial manual | Menor latencia, más control, pero tú gestionas contexto y herramientas |
| OpenAI Responses API | Conversaciones unificadas y bucle de herramientas | Camino recomendado por OpenAI para nuevos agentes |
| Azure OpenAI Assistants | Misma API, cumplimiento empresarial | Útil para redes privadas y requisitos regionales de datos |
| [LangChain Agents](/recipes/ai-agents-tool-use/) | Abstracción a nivel de framework | Cambiar modelos, añadir herramientas propias, pero más boilerplate |
| Functionary / LLMs locales | Function calling autoalojado | Privacidad, sin costos de API, pero requiere GPU |

## Lo que Funciona

1. Almacena los IDs de `thread` en tu base de datos, claveados por usuario, para que puedan retomar conversaciones.
2. Usa `file_search` y `code_interpreter` a través de `tool_resources`, no con el `file_ids` heredado a nivel superior.
3. Valida y sanitiza cada argumento de función antes de ejecutarlo.
4. Define `instructions` estrictas para limitar el tono, el alcance y cuándo llamar funciones.
5. Monitorea el uso de tokens por `run`; `file_search` y `code_interpreter` aumentan el costo rápidamente.

## Errores Comunes

1. **Filtrar IDs de thread** — trátalos como tokens de sesión; limita su acceso a usuarios autenticados.
2. **Ignorar `requires_action`** — los `run` se quedan pausados para siempre si no envías los `tool outputs`.
3. **Abusar de `file_search`** — adjuntar vector stores muy grandes aumenta latencia y costo.
4. **No manejar fallos de `run`** — revisa `run.status` por `failed`, `expired` o `cancelled`.
5. **Asumir respuestas en tiempo real** — los `run` son asíncronos; se requiere polling o streaming.

## Solución de Problemas

- **El asistente no llama a la función:** ajusta la `description` de la función y asegúrate de que la intención del usuario sea clara en las `instructions`.
- **El `run` se queda `in_progress` mucho tiempo:** implementa un timeout y un mensaje de fallback; no hagas polling infinito.
- **Las salidas del modelo son inconsistentes:** usa `temperature` 0 para tareas deterministas y fija una versión de modelo.
- **Prompt injection filtra contexto:** mantén la entrada del usuario separada de las `instructions` y valida los argumentos de las herramientas.
- **Costos altos de tokens:** cachea resultados de búsqueda, resume contexto largo y usa modelos más pequeños para tareas simples.
- **File search devuelve chunks irrelevantes:** ajusta tamaño de chunk, overlap y filtros de metadata.

## Lectura Adicional

- [Documentación de la OpenAI Assistants API](https://platform.openai.com/docs/api-reference/assistants) y [guía de migración](https://platform.openai.com/docs/assistants/migration)
- [Referencia de la OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [Guía del OpenAI Agents SDK](https://platform.openai.com/docs/guides/agents-sdk)
- [RAG Pipeline](/recipes/rag-pipeline/) para retrieval a medida
- [AI Agents Tool Use](/recipes/ai-agents-tool-use/) para agentes al estilo LangChain

## Notas de Producción

- **Fija una versión de modelo** como `gpt-4o-2024-08-06` en lugar de alias, para evitar cambios de comportamiento silenciosos.
- **Suscríbete al changelog de OpenAI** para seguir hitos de deprecación de Assistants y paridad de funciones en Responses.
- **Despliega de forma gradual** con canary o blue-green para atrapar regresiones en llamadas a herramientas.
- **Configura alertas** para tasa de errores, latencia p99 y tasa de fallos de `run` antes de activar en producción.
- **Documenta el rollback** en tu runbook y pruébalo en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar una request desde tu backend hasta el `run` de OpenAI.

## Puntos Clave

- La Assistants API evita gestionar el estado de la conversación y las llamadas a herramientas, pero está deprecada y tiene fecha de cierre.
- Usa `file_search`, `code_interpreter` y `function` a través de la estructura v2 actual de `tool_resources`.
- Valida cada argumento de función, limita los `thread` a usuarios y maneja siempre `requires_action`.
- Para chatbots nuevos en 2026, evalúa la Responses API o el Agents SDK antes de comprometerte con Assistants.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre Assistants y Chat Completions?

Assistants gestiona el estado del thread, herramientas integradas como `file_search` y `code_interpreter`, y el ciclo de `function calling`. Chat Completions es sin estado: envías el array completo de mensajes cada vez y tú gestionas historial, ejecución de herramientas y manejo de archivos.

### ¿Puedo usar mi propio LLM con la Assistants API?

No. La Assistants API solo funciona con modelos de OpenAI. Si necesitas un modelo personalizado, usa [LangChain agents](/recipes/ai-agents-tool-use/) o construye una abstracción similar sobre Chat Completions con tu propio backend.

### ¿Cuánto cuesta?

Pagas tokens de entrada y salida del modelo, más el uso de cualquier herramienta. `file_search` y `code_interpreter` añaden costo por consulta o sesión. Monitorea siempre el uso en el dashboard de OpenAI.

### ¿Cómo manejo errores de function call de forma graceful?

Captura la excepción en tu función y devuelve un objeto JSON con campos `error` y `message` a la Assistants API vía `submit_tool_outputs`. El asistente lee el error y puede reintentar, pedir aclaración al usuario o intentar otro enfoque. Sanitiza el mensaje para evitar filtrar detalles internos y establece un máximo de reintentos para prevenir bucles infinitos.

### ¿Cómo streameo respuestas desde la Assistants API?

Pasa `stream: true` al crear un `run`. La API retorna Server-Sent Events con eventos `thread.run.step.delta` que contienen texto incremental. Parsea el stream SSE y reenvía los chunks al cliente. Maneja `thread.run.completed` para señalar el final del stream.

### ¿Cómo implemento rate limiting para mi chatbot?

Rastrea requests por usuario con una ventana deslizante en Redis. Define límites según tu plan, retorna HTTP 429 con header `Retry-After` cuando se alcance el límite e implementa backoff exponencial ante 429 de OpenAI. Encola picos de tráfico para procesarlos asincrónicamente.

### ¿Cómo testeo una integración de Assistants API?

Mockea el cliente de OpenAI con `vi.mock()` o `unittest.mock.patch`. Testea `function calling` devolviendo `tool outputs` predefinidos y aserciones de que el asistente los recibe. Para tests end-to-end, usa un asistente aparte con un modelo más barato como `gpt-4o-mini`, y graba respuestas con VCR.py o Polly.js para reproducirlas en CI.

### ¿Cómo manejo conversaciones largas que exceden la ventana de contexto?

La Assistants API trunca mensajes antiguos automáticamente. Para preservar contexto importante, resume periódicamente la conversación y almacena el resumen. Para chats con mucho conocimiento, guarda hechos clave en un vector store y recupéralos con `file_search` en lugar de depender del historial completo del thread.

### ¿Cómo implemento aislamiento multi-tenant con la Assistants API?

Crea un asistente por tenant o incluye el contexto del tenant en las `instructions`. Scopea los IDs de thread por tenant y valida que un usuario solo acceda a sus propios threads. Nunca compartas vector stores de `file_search` entre tenants.

### ¿Cómo implemento fallback cuando la API de OpenAI cae?

Implementa un circuit breaker que se abra tras un umbral de fallos. Cuando esté abierto, devuelve una respuesta cacheada o un mensaje de "servicio temporalmente no disponible". Encola mensajes del usuario con BullMQ o Celery y procésalos cuando la API se recupere. Para caminos críticos, configura un proveedor de modelos fallback.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos como el ID del asistente o la versión del modelo en lugar de usar configuración por entorno.
- Olvidar logging y monitoreo en cada paso del ciclo de `run`.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar reintentos, circuit breakers o rate limiting.
- No documentar qué versión de modelo y configuración de herramientas se usan en producción.
- Dejar la receta sin cambios cuando evolucionan dependencias, escala o fechas de deprecación.
