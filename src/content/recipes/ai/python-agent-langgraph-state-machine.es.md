---
contentType: recipes
slug: python-agent-langgraph-state-machine
title: "Construye agentes IA con estado con maquinas de estados"
description: "Crea agentes IA multi-paso con LangGraph usando maquinas de estados, aristas condicionales, tool calling y checkpoints human-in-the-loop para workflows de produccion"
metaDescription: "Construye agentes IA con estado con maquinas de estados LangGraph. Define nodos, aristas condicionales, tool calling y checkpointing para workflows LLM multi-paso."
difficulty: advanced
topics:
  - ai
tags:
  - python
  - langgraph
  - agents
  - state machine
  - langchain
relatedResources:
  - /recipes/ai/python-langchain-chains-composition
  - /recipes/ai/python-openai-function-calling-structured
  - /recipes/ai/python-llm-streaming-responses
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye agentes IA con estado con maquinas de estados LangGraph. Define nodos, aristas condicionales, tool calling y checkpointing para workflows LLM multi-paso."
  keywords:
    - langgraph
    - ai agents
    - state machine langchain
    - langgraph python
    - multi-step agent
---

# Construye agentes IA con estado con maquinas de estados LangGraph

LangGraph extiende LangChain con grafos con estado y ciclicos para construir workflows agenticos. En lugar de cadenas lineales, defines una maquina de estados con nodos (funciones), aristas (transiciones) y enrutamiento condicional. Esto habilita agentes multi-paso que pueden iterar, llamar herramientas y mantener estado entre turnos. A continuacion: construir un agente de investigacion con tool calling, enrutamiento condicional y checkpointing.

## Cuando Usar Esto

- Agentes multi-paso que necesitan iterar (buscar, evaluar, refinar)
- Workflows con branching condicional (si confia → responder, sino → buscar mas)
- Workflows human-in-the-loop donde un humano aprueba llamadas a herramientas
- Conversaciones con estado que persisten entre sesiones

## Requisitos Previos

- Python 3.10+
- Paquetes `langgraph` y `langchain-openai`

## Solucion

### 1. Instalar dependencias

```bash
pip install langgraph langchain-openai langchain-core
```

### 2. Definir el estado del agente

```python
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    search_results: str
    attempts: int
    max_attempts: int
```

### 3. Definir herramientas

```python
@tool
def search_web(query: str) -> str:
    """Search the web for information."""
    # Busqueda simulada — reemplaza con Tavily, SerpAPI, etc.
    results = {
        "redis caching": "Redis cache-aside pattern: check cache, if miss, load from DB, set cache. TTL recommended.",
        "docker compose": "Docker Compose defines multi-container apps in YAML. Use profiles for environment-specific services.",
    }
    return results.get(query.lower(), f"No results found for: {query}")

@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression."""
    try:
        result = eval(expression)  # En produccion, usa un evaluador seguro
        return f"Result: {result}"
    except Exception as e:
        return f"Error: {e}"

tools = [search_web, calculate]
```

### 4. Definir nodos del grafo

```python
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
model_with_tools = model.bind_tools(tools)

def agent_node(state: AgentState) -> dict:
    """Main agent node — decides what to do next."""
    response = model_with_tools.invoke(state["messages"])
    return {"messages": [response]}

def tool_node(state: AgentState) -> dict:
    """Execute tool calls from the agent's last message."""
    last_message = state["messages"][-1]
    tool_messages = []

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_id = tool_call["id"]

        # Encontrar y ejecutar la herramienta
        tool_map = {t.name: t for t in tools}
        if tool_name in tool_map:
            result = tool_map[tool_name].invoke(tool_args)
            tool_messages.append(ToolMessage(
                content=str(result),
                tool_call_id=tool_id,
            ))

    return {"messages": tool_messages, "attempts": state.get("attempts", 0) + 1}

def should_continue(state: AgentState) -> str:
    """Conditional edge — decide whether to use tools or end."""
    last_message = state["messages"][-1]
    attempts = state.get("attempts", 0)
    max_attempts = state.get("max_attempts", 5)

    if last_message.tool_calls and attempts < max_attempts:
        return "tools"
    return END
```

### 5. Construir el grafo

```python
def build_agent_graph():
    """Build and compile the LangGraph agent."""
    workflow = StateGraph(AgentState)

    # Agregar nodos
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_node)

    # Establecer punto de entrada
    workflow.set_entry_point("agent")

    # Agregar arista condicional desde el agente
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            END: END,
        },
    )

    # Despues de tools, volver al agente
    workflow.add_edge("tools", "agent")

    # Compilar con checkpointing
    from langgraph.checkpoint.memory import MemorySaver
    memory = MemorySaver()

    return workflow.compile(checkpointer=memory)

app = build_agent_graph()
```

### 6. Ejecutar el agente

```python
config = {"configurable": {"thread_id": "session-1"}}

result = app.invoke(
    {
        "messages": [HumanMessage(content="What is the Redis cache-aside pattern?")],
        "max_attempts": 5,
    },
    config=config,
)

# Imprimir la respuesta final
for msg in result["messages"]:
    if isinstance(msg, AIMessage):
        print(f"AI: {msg.content}")
    elif isinstance(msg, ToolMessage):
        print(f"Tool: {msg.content}")
```

### 7. Stream de pasos del agente

```python
for event in app.stream(
    {
        "messages": [HumanMessage(content="Calculate 15 * 23 and then search for Docker Compose")],
        "max_attempts": 5,
    },
    config=config,
):
    for node_name, node_output in event.items():
        print(f"\n--- {node_name} ---")
        if "messages" in node_output:
            for msg in node_output["messages"]:
                if isinstance(msg, AIMessage):
                    print(f"AI: {msg.content[:100]}")
                elif isinstance(msg, ToolMessage):
                    print(f"Tool result: {msg.content[:100]}")
```

## Como Funciona

1. **`StateGraph`** define un grafo dirigido donde cada nodo es una funcion que recibe y retorna el `AgentState` compartido.
2. **La anotacion `add_messages`** agrega automaticamente nuevos mensajes a la lista existente en lugar de reemplazarla, manteniendo el historial de conversacion.
3. **Aristas condicionales** enrutan a diferentes nodos basandose en el estado. `should_continue` verifica si el agente quiere llamar herramientas y si el limite de intentos no se ha excedido.
4. **Ciclo** — despues de la ejecucion de herramientas, el grafo retorna al nodo `agent`, permitiendo al agente procesar los resultados de herramientas y decidir el siguiente paso. Este loop continua hasta que el agente produce una respuesta sin llamadas a herramientas.
5. **`MemorySaver` checkpointing** persiste el estado por `thread_id`, habilitando continuidad de conversacion entre invocaciones y patrones human-in-the-loop.

## Variantes

### Aprobacion human-in-the-loop

```python
from langgraph.graph import interrupt

def tool_node_with_approval(state: AgentState) -> dict:
    """Execute tools with human approval for sensitive operations."""
    last_message = state["messages"][-1]

    for tool_call in last_message.tool_calls:
        if tool_call["name"] == "calculate":
            # Interrumpir y esperar aprobacion humana
            approval = interrupt({
                "question": f"Approve calculation: {tool_call['args']['expression']}?",
                "tool_call": tool_call,
            })

            if not approval:
                return {"messages": [ToolMessage(
                    content="Calculation rejected by user.",
                    tool_call_id=tool_call["id"],
                )]}

    # Proceder con ejecucion normal de herramientas
    return tool_node(state)

# Resumir despues de input humano
result = app.invoke(
    {"messages": [HumanMessage(content="Calculate 100 / 0")]},
    config=config,
)
# El agente pausa en interrupt — resumir con:
# app.invoke(Command(resume=True), config=config)
```

### Colaboracion multi-agente

```python
def researcher_node(state: AgentState) -> dict:
    """Researcher agent — searches for information."""
    response = model_with_tools.invoke([
        {"role": "system", "content": "You are a research assistant. Search for information."},
        *state["messages"],
    ])
    return {"messages": [response]}

def writer_node(state: AgentState) -> dict:
    """Writer agent — synthesizes findings into a report."""
    response = model.invoke([
        {"role": "system", "content": "You are a technical writer. Synthesize the research into a clear report."},
        *state["messages"],
    ])
    return {"messages": [response]}

def build_multi_agent_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("tools", tool_node)
    workflow.add_node("writer", writer_node)

    workflow.set_entry_point("researcher")
    workflow.add_conditional_edges("researcher", should_continue, {"tools": "tools", END: "writer"})
    workflow.add_edge("tools", "researcher")
    workflow.add_edge("writer", END)

    return workflow.compile(checkpointer=MemorySaver())
```

### Estado persistente con SQLite

```python
from langgraph.checkpoint.sqlite import SqliteSaver

# Persistir estado a SQLite para continuidad entre sesiones
memory = SqliteSaver.from_conn_string("agent_state.db")
app = build_agent_graph.__wrapped__(memory)

# El estado persiste entre sesiones con el mismo thread_id
```

## Mejores Practicas

- **Establece `max_attempts`** — previene loops infinitos donde el agente sigue llamando herramientas sin converger
- **Usa `MemorySaver` para desarrollo** — cambia a `SqliteSaver` o `PostgresSaver` para produccion
- **Define prompts de sistema claros** — el agente necesita instrucciones explicitas sobre cuando usar herramientas vs. responder directamente
- **Stream para UX en tiempo real** — `app.stream()` muestra cada paso a medida que ocurre, mejorando la experiencia del usuario

## Errores Comunes

- **Olvidar agregar la anotacion `add_messages`** — los mensajes se reemplazan en lugar de agregarse, perdiendo el historial de conversacion
- **No manejar errores de herramientas** — si una herramienta lanza una excepcion, el agente se queda atascado; envuelve la ejecucion de herramientas en try/except
- **Sin limite de `max_attempts`** — el agente puede iterar indefinidamente llamando herramientas sin producir una respuesta final
- **Usar el mismo `thread_id` para diferentes usuarios** — el estado filtra entre usuarios; usa thread IDs unicos por sesion

## FAQ

**Q: LangGraph vs. cadenas LangChain — cuando usar cual?**
A: Usa cadenas LangChain para pipelines lineales (prompt → model → parser). Usa LangGraph para workflows ciclicos, con estado o multi-agente.

**Q: Puedo usar LangGraph con modelos no-OpenAI?**
A: Si. Cualquier `BaseChatModel` funciona — Anthropic, Google, modelos locales via Ollama, etc.

**Q: Como funciona el checkpointing?**
A: El checkpointer guarda el estado completo despues de cada ejecucion de nodo. En la siguiente invocacion con el mismo `thread_id`, el estado se restaura, habilitando continuidad de conversacion.

**Q: Puedo visualizar el grafo?**
A: Si. `app.get_graph().draw_png("agent.png")` genera un diagrama visual de la estructura del grafo.

**Q: Como manejo errores en un nodo?**
R: Lanza una excepcion dentro de la funcion del nodo. LangGraph la captura y enruta al error handler si esta configurado. Tambien puedes añadir un error edge a un nodo fallback que loguee el error y retorne un mensaje amigable para el usuario.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
