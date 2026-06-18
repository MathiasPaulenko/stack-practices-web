---
contentType: recipes
slug: ai-agents
title: "Construir Agentes de IA Autónomos con Uso de Herramientas y Razonamiento"
description: "Cómo diseñar agentes de IA que autónomamente planifiquen, ejecuten herramientas e iteren hacia objetivos usando ReAct, function calling y arquitecturas de memoria."
metaDescription: "Aprende a construir agentes de IA autónomos. Diseña agentes que planifiquen, ejecuten herramientas e iteren usando ReAct, function calling y arquitecturas de memoria."
difficulty: advanced
topics:
  - ai
tags:
  - ai
  - ai-agents
  - autonomous-agents
  - function-calling
  - llm
  - memory
  - react-pattern
  - reasoning
  - tool-use
relatedResources:
  - /recipes/prompt-engineering
  - /recipes/rag-pipeline
  - /recipes/semantic-search
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a construir agentes de IA autónomos. Diseña agentes que planifiquen, ejecuten herramientas e iteren usando ReAct, function calling y arquitecturas de memoria."
  keywords:
    - agentes ia
    - agentes autonomos
    - tool use llm
    - patron react
    - function calling
---

## Visión general

Los agentes de IA son sistemas autónomos potenciados por large language models (LLMs) que pueden percibir su entorno, razonar sobre objetivos y tomar acciones invocando herramientas externas. A diferencia de chatbots simples que solo generan texto, los agentes mantienen estado a través de múltiples turnos, eligen qué herramientas llamar basándose en contexto e iteran hasta que una tarea se completa. Representan la siguiente evolución desde prompts estáticos hasta sistemas orientados a objetivos dinámicos.

El ciclo fundamental de agente es: **observar → razonar → actuar → observar de nuevo**. El agente recibe un input o estado de entorno, razona sobre qué hacer, llama una herramienta (como búsqueda web, query de base de datos o ejecución de código), observa el resultado y repite hasta que el objetivo se satisface. Esta receta cubre el patrón ReAct, APIs de function calling, definiciones de herramientas y gestión de memoria para sistemas de agentes multi-turno.

## Cuándo usarlo

Usa esta receta cuando:

- Construyendo sistemas que responden preguntas complejas requiriendo múltiples fuentes de datos
- Automatizando flujos de trabajo que involucran navegación web, cálculos o llamadas a API
- Creando asistentes personales que pueden reservar vuelos, consultar bases de datos o generar reportes
- Prototipando agentes de investigación que iterativamente buscan, resumen y sintetizan información
- Implementando bots de soporte al cliente que pueden buscar órdenes, procesar reembolsos y escalar issues

## Solución

### Agente ReAct (Python / OpenAI)

```python
from openai import OpenAI
import json

client = OpenAI()

def search_web(query: str) -> str:
    """Herramienta de búsqueda web simulada."""
    return f"Search results for: {query}"

def calculate(expression: str) -> str:
    """Evalúa una expresión matemática."""
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

# Ciclo de agente
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

### Agente LangChain con Memoria

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

## Explicación

- **ReAct (Reasoning + Acting)**: el agente intercala razonamiento chain-of-thought con ejecución de herramientas. Cada paso de razonamiento explica por qué se necesita una herramienta; cada paso de acción invoca la herramienta. Esta transparencia facilita el debugging y mejora la precisión sobre el llamado directo de herramientas.
- **Function calling**: los LLMs modernos (GPT-4, Claude, Gemini) soportan function calling estructurado. El modelo genera JSON con nombre de herramienta y argumentos, que la aplicación parsea y ejecuta. El resultado se alimenta de vuelta a la conversación como un mensaje `tool`.
- **Ciclo de agente**: el bucle de ejecución central continúa hasta que el modelo produce una respuesta de texto final en lugar de una llamada a herramienta, o hasta que se alcanza un límite máximo de iteraciones. Esto previene bucles infinitos de herramientas mal definidas o objetivos ambiguos.
- **Memoria**: sin memoria, cada invocación de agente es stateless. Los buffers de conversación almacenan turnos previos, mientras que los vector stores retienen hechos de largo plazo extraídos de resultados de herramientas. La memoria a corto plazo maneja la sesión actual; la memoria a largo plazo habilita personalización a través de sesiones.

## Variantes

| Patrón | Razonamiento | Uso de herramientas | Memoria | Mejor para |
|--------|------------|---------------------|---------|------------|
| ReAct | Chain-of-thought explícito | Funciones estructuradas | Buffer | Agentes de propósito general |
| Plan-and-execute | Pasos pre-planificados | Llamadas de herramientas batch | Mínima | Flujos de trabajo predecibles |
| Reflection | Autocrítica | Loops de reintento | Episódica | Generación de código, escritura |
| Multi-agent | Delegación | Agente-a-agente | Compartida | Sistemas complejos |

## Mejores prácticas

- **Define herramientas con precisión**: los nombres y descripciones de herramientas son prompts. Una descripción vaga como "buscar cosas" conduce a selección incorrecta de herramientas. Sé específico: "Search the web for current news and facts."
- **Valida salidas de herramientas**: nunca confíes en la salida cruda del LLM como entrada segura para herramientas. Valida el schema JSON, sanitiza argumentos y maneja errores gracefulmente. Un prompt malicioso no debería ejecutar código arbitrario.
- **Establece límites de iteración**: los agentes pueden iterar indefinidamente si una herramienta sigue retornando errores o el objetivo es inalcanzable. Limita las iteraciones a 5-10 y retorna un mensaje de fallo si se excede.
- **Registra trazas de razonamiento**: almacena el historial completo de chain-of-thought y ejecución de herramientas. Esto es esencial para debugging, auditoría y mejora del agente a lo largo del tiempo.
- **Usa salida estructurada para respuestas finales**: cuando el agente debe retornar datos (no solo chatear), solicita salida JSON vía constraints de formato de respuesta para evitar parsear texto libre.

## Errores comunes

- **Dar al agente herramientas peligrosas por defecto**: un agente con acceso a shell o permisos de escritura en base de datos puede causar daño irreversible. Aplica acceso least-privilege a herramientas y requiere aprobación humana para acciones destructivas.
- **Ignorar latencia**: cada llamada a herramienta agrega una ronda de API del LLM. Un agente de 5 pasos con latencia de API de 2 segundos toma 10+ segundos. Usa llamadas de herramientas paralelas y caching para reducir la latencia percibida.
- **Over-engineering de tareas simples**: si una pregunta puede responderse con una sola búsqueda RAG, no construyas un agente completo. Los agentes agregan complejidad, costo y modos de fallo. Úsalos solo cuando el razonamiento multi-paso sea genuinamente requerido.
- **Olvidar manejar errores de herramientas**: si una API de búsqueda está caída, el agente recibe un string de error y puede alucinar una respuesta. Captura excepciones, retorna mensajes de error estructurados y enseña al agente a reintentar o escalar.

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre un agente y un chatbot?**
R: Un chatbot responde a cada mensaje independientemente. Un agente mantiene estado a través de múltiples turnos, razona sobre objetivos e invoca herramientas externas para completar tareas. Los agentes son chatbots más autonomía.

**P: ¿Puedo construir agentes sin OpenAI?**
R: Sí. Claude (Anthropic), Gemini (Google) y modelos abiertos como Llama 3 y Mistral soportan tool calling. La API de function calling varía ligeramente pero el patrón ReAct funciona a través de todos ellos.

**P: ¿Cómo evito que un agente haga llamadas a API caras?**
R: Implementa un presupuesto de costo por sesión, limita la tasa de llamadas a herramientas y requiere confirmación de usuario para acciones de alto costo (por ejemplo, reservar un vuelo, enviar un email).

**P: ¿Los agentes deberían reemplazar APIs backend tradicionales?**
R: No. Los agentes son capas de orquestación sobre APIs existentes. Manejan ambigüedad y razonamiento multi-paso, pero la lógica de negocio subyacente, validación y seguridad deberían permanecer en tus servicios backend.

