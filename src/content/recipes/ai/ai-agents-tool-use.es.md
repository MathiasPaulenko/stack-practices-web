---

contentType: recipes
slug: ai-agents-tool-use
title: "Agentes de IA con Uso de Herramientas"
description: "Construye agentes de IA autónomos que pueden usar herramientas y APIs externas para completar tareas complejas."
metaDescription: "Aprende a construir agentes de IA autónomos con uso de herramientas, patrón ReAct y razonamiento para completar tareas complejas y automatizar workflows."
difficulty: advanced
topics:
  - ai
tags:
  - ai-agents
  - ai
  - openai
  - architecture
  - machine-learning
relatedResources:
  - /recipes/ai-agents
  - /recipes/semantic-search
  - /recipes/slack-bot-openai
  - /recipes/chatbot-openai
  - /recipes/image-generation
  - /recipes/python-sentiment-analysis-nltk
lastUpdated: "2026-07-09"
author: "StackPractices"
seo:
  metaDescription: "Aprende a construir agentes de IA autónomos con uso de herramientas, patrón ReAct y razonamiento para completar tareas complejas y automatizar workflows."
  keywords:
    - ai-agents
    - ai
    - openai
    - architecture

---
## Visión General

Los agentes de IA son sistemas autónomos que utilizan modelos de lenguaje para razonar, planificar y ejecutar tareas llamando herramientas externas. A diferencia de simples [chatbots](/recipes/ai/chatbot-openai), los agentes pueden buscar en la web, consultar bases de datos, ejecutar código e interactuar con APIs para cumplir objetivos complejos de múltiples pasos.

## Cuándo Usar

Usa este recurso cuando:
- Construyes asistentes autónomos que necesitan datos en tiempo real
- Creas flujos de trabajo que requieren múltiples llamadas a APIs encadenadas
- Implementas razonamiento sobre fuentes de conocimiento externas
- Diseñas sistemas autocorrectivos que pueden reintentar operaciones fallidas

## Solución

### Agente con Patrón ReAct (Python)

```python
import openai
import json
from typing import Callable

def agente_react(query: str, tools: dict[str, Callable]) -> str:
    messages = [
        {"role": "system", "content": "Eres un asistente útil. Usa herramientas cuando sea necesario."},
        {"role": "user", "content": query}
    ]

    for _ in range(5):  # Máximo de iteraciones
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=messages,
            tools=[
                {"type": "function", "function": {"name": n, "parameters": {}}}
                for n in tools.keys()
            ]
        )

        msg = response.choices[0].message
        if not msg.tool_calls:
            return msg.content

        messages.append(msg)
        for call in msg.tool_calls:
            result = tools[call.function.name](**json.loads(call.function.arguments))
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": str(result)
            })

    return "Máximo de iteraciones alcanzado"
```

### Ejemplo de Definición de Herramienta

```python
def buscar_wikipedia(query: str) -> str:
    """Buscar en Wikipedia por un tema."""
    # Implementación omitida
    return f"Resultados para {query}"

tools = {"buscar_wikipedia": buscar_wikipedia}
resultado = agente_react("¿Quién ganó el Mundial de FIFA 2022?", tools)
```

## Explicación

El patrón ReAct (Razonamiento + Acción) alterna entre:

1. **Pensamiento**: El LLM razona sobre qué hacer a continuación
2. **Acción**: El LLM llama una herramienta con argumentos estructurados
3. **Observación**: El resultado de la herramienta se devuelve como contexto
4. **Repetir**: Hasta que la tarea esté completa

Decisiones clave de diseño:
- **Esquemas de herramientas**: Usa el formato de function calling de OpenAI para seguridad de tipos
- **Límites de iteración**: Previene bucles infinitos con un conteo máximo de pasos
- **Manejo de errores**: Las herramientas deben devolver errores gracefully, no crashear
- **Ventana de contexto**: Resume salidas largas de herramientas para ajustarse a los límites de tokens

## Variantes

| Framework | Patrón | Ideal Para |
|-----------|--------|------------|
| [LangChain Agents](/recipes/ai/ai-agents-tool-use) | ReAct, Plan-and-Execute | Prototipado rápido |
| AutoGen | Conversación multi-agente | Tareas colaborativas |
| CrewAI | Agentes basados en roles | Flujos de trabajo de negocio |
| Custom | ReAct con registro de herramientas | Sistemas de producción |

## Lo que Funciona

- **Define interfaces claras de herramientas**: Cada herramienta necesita nombre, descripción y esquema JSON
- **Limita la cantidad de herramientas**: 3-5 herramientas bien diseñadas superan a 20 vagas
- **Agrega validación**: Verifica argumentos de herramientas antes de ejecutar
- **Registra todos los pasos**: El razonamiento del agente es opaco; el logging ayuda a depurar
- **Implementa timeouts**: Las herramientas externas pueden colgarse; establece timeouts generosos

## Errores Comunes

1. **Dar demasiadas herramientas a un agente**: Aumenta confusión y tasa de errores
2. **Faltar manejo de errores**: Una llamada a herramienta fallida sin recuperación crashea el loop
3. **Ignorar límites de tokens**: Historiales largos de observaciones agotan la ventana de contexto
4. **No validar salidas**: Los agentes pueden alucinar argumentos de herramientas
5. **Omitir revisión humana**: Los agentes autónomos deben tener interruptores de emergencia

## Avanzado: Patrón Plan-and-Execute

```python
import openai
import json

def plan_and_execute(query: str, tools: dict) -> str:
    # Paso 1: Generar un plan
    plan_response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Divide la tarea en pasos. Devuelve un array JSON de pasos."},
            {"role": "user", "content": query}
        ],
        response_format={"type": "json_object"}
    )
    steps = json.loads(plan_response.choices[0].message.content)["steps"]

    # Paso 2: Ejecutar cada paso
    results = []
    for step in steps:
        result = agente_react(step, tools)
        results.append(result)

    # Paso 3: Sintetizar
    final = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Sintetiza los resultados en una respuesta final."},
            {"role": "user", "content": f"Query: {query}\nResults: {json.dumps(results)}"}
        ]
    )
    return final.choices[0].message.content
```

Plan-and-Execute separa la planificación de la ejecución. El planner divide la tarea en pasos, cada paso corre por un loop ReAct, y una llamada final sintetiza los resultados. Esto reduce el consumo de tokens porque cada paso tiene una ventana de contexto más pequeña. También habilita ejecución paralela de pasos independientes.

## Avanzado: Schema de Herramientas con JSON Schema

```python
tool_schemas = [
    {
        "type": "function",
        "function": {
            "name": "search_database",
            "description": "Buscar en la base de datos de productos por nombre o categoría",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Término de búsqueda"
                    },
                    "category": {
                        "type": "string",
                        "enum": ["electronics", "books", "clothing"],
                        "description": "Filtro de categoría de producto"
                    },
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 100,
                        "default": 10
                    }
                },
                "required": ["query"]
            }
        }
    }
]
```

Los schemas detallados de herramientas mejoran la precisión del agente. Incluye `description` para cada parámetro — el LLM lee estos para decidir cuándo y cómo llamar la herramienta. Usa `enum` para valores restringidos, `minimum`/`maximum` para rangos numéricos, y `required` para campos obligatorios. Cuanto más preciso el schema, menos argumentos alucinados.

## Avanzado: Gestión de Ventana de Contexto

```python
def summarize_observations(messages: list, max_tokens: int = 4000) -> list:
    """Resume las salidas de herramientas cuando el contexto crece demasiado."""
    total = sum(len(str(m.get("content", ""))) for m in messages)
    if total < max_tokens:
        return messages

    # Mantener system + primer mensaje user, resumir el resto
    system = messages[0]
    user_query = messages[1]
    history = messages[2:]

    summary = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Resume las llamadas a herramientas y resultados concisamente."},
            {"role": "user", "content": json.dumps([{"role": m["role"], "content": m["content"][:500]} for m in history])}
        ]
    ).choices[0].message.content

    return [system, user_query, {"role": "system", "content": f"Contexto previo: {summary}"}]
```

Las ejecuciones largas de agentes acumulan historiales grandes de observaciones que agotan la ventana de contexto. Resume periódicamente manteniendo el system prompt y la query original, luego comprime las salidas de herramientas en un resumen. Alternativamente, usa truncación sliding-window o selección de contexto retrieval-augmented para mantener solo observaciones relevantes.

## Avanzado: Orquestación Multi-Agente

```python
def multi_agent_orchestrate(query: str) -> str:
    agents = {
        'researcher': {
            'system': 'You are a research agent. Find information using search tools.',
            'tools': ['web_search', 'read_file']
        },
        'coder': {
            'system': 'You are a coding agent. Write and execute code.',
            'tools': ['run_python', 'write_file']
        },
        'reviewer': {
            'system': 'You are a review agent. Check code quality and correctness.',
            'tools': ['read_file', 'run_tests']
        }
    }

    # Ruta al researcher primero
    research = run_agent(agents['researcher'], query)

    # Pasa research al coder
    code = run_agent(agents['coder'], f"Based on: {research}\nImplement the solution.")

    # Review del código
    review = run_agent(agents['reviewer'], f"Review this code:\n{code}")

    if 'APPROVE' in review:
        return code
    else:
        # Re-ruta al coder con feedback
        return run_agent(agents['coder'], f"Fix issues:\n{review}\nOriginal:\n{code}")
```

La orquestación multi-agente asigna roles especializados a diferentes agentes. Cada agente tiene su propio system prompt y set de herramientas. Un coordinador rutea tareas entre agentes basado en el estado actual. Este patrón funciona bien para workflows complejos: investigar → implementar → revisar → desplegar. Mantén la comunicación entre agentes estructurada — pasa contexto como strings formateados o JSON, no historiales raw de mensajes.

## Cuándo Evitar

- **Q&A simple**: Si una sola llamada al LLM responde la pregunta, los agentes añaden latencia y costo innecesarios
- **Decisiones de alto riesgo**: Diagnóstico médico, asesoría legal, trading financiero — los agentes pueden alucinar argumentos de herramientas
- **Sistemas en tiempo real**: Los loops de agentes con múltiples llamadas LLM añaden 5-30 segundos de latencia
- **Workloads sensibles a costo**: Cada iteración es una llamada completa al LLM; 5 iteraciones pueden costar $0.10+ por query

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre RAG y un agente?**
R: [RAG](/recipes/ai/semantic-search) recupera documentos y responde una vez. Los agentes pueden tomar múltiples acciones, usar herramientas e iterar hasta cumplir una meta.

**P: ¿Cuántas herramientas debería tener un agente?**
R: Comienza con 2-3. La investigación muestra que la precisión cae bruscamente más allá de 5-7 herramientas.

**P: ¿Los agentes pueden funcionar sin OpenAI?**
R: Sí. Modelos locales (Llama, Mistral) soportan llamado de herramientas vía formatos de salida estructurada como JSON mode.

### ¿Cómo manejo fallos en llamadas a herramientas?

Envuelve cada ejecución de herramienta en un try/except. Devuelve mensajes de error como resultados de herramientas para que el agente pueda razonar sobre el fallo y reintentar o intentar una alternativa. Configura un conteo máximo de reintentos para prevenir loops infinitos. Registra el error completo para debugging mientras le das al agente una descripción concisa del error.

### ¿Cuál es el costo de correr un loop de agente?

Cada iteración es una llamada al LLM. Con GPT-4, un loop de 5 iteraciones con 2000 tokens por llamada cuesta aproximadamente $0.60. Con GPT-4o-mini, el mismo loop cuesta menos de $0.01. Usa modelos más baratos para tareas simples de tool-routing y reserva GPT-4 para razonamiento complejo. Cachea resultados de herramientas para evitar llamadas redundantes.

### ¿Cómo testeo el comportamiento del agente?

Mockea las respuestas del LLM y llamadas a herramientas en tests unitarios. Para tests de integración, usa un entorno controlado con herramientas stub que devuelven resultados predecibles. Graba traces de producción y replícalas para testear cambios. Evita testear contra APIs en vivo — servicios externos flaky hacen los tests poco confiables.

### ¿Cuándo debo usar orquestación multi-agente?

Usa multi-agente cuando una tarea tiene fases distintas (investigar, implementar, revisar) que requieren diferentes instrucciones de sistema o sets de herramientas. Para tareas simples, un solo agente con múltiples herramientas es más eficiente y predecible. La orquestación multi-agente añade overhead de coordinación y costo — úsala solo cuando los roles son claramente separables.
