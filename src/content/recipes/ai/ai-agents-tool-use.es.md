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
relatedResources:
  - /recipes/ai-agents
  - /recipes/semantic-search
  - /recipes/slack-bot-openai
  - /recipes/chatbot-openai
  - /recipes/image-generation
lastUpdated: "2026-06-19"
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

Los agentes de IA son sistemas autónomos que utilizan modelos de lenguaje para razonar, planificar y ejecutar tareas llamando herramientas externas. A diferencia de simples chatbots, los agentes pueden buscar en la web, consultar bases de datos, ejecutar código e interactuar con APIs para cumplir objetivos complejos de múltiples pasos.

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
| LangChain | ReAct, Plan-and-Execute | Prototipado rápido |
| AutoGen | Conversación multi-agente | Tareas colaborativas |
| CrewAI | Agentes basados en roles | Flujos de trabajo de negocio |
| Custom | ReAct con registro de herramientas | Sistemas de producción |

## Mejores Prácticas

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

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre RAG y un agente?**
R: RAG recupera documentos y responde una vez. Los agentes pueden tomar múltiples acciones, usar herramientas e iterar hasta cumplir una meta.

**P: ¿Cuántas herramientas debería tener un agente?**
R: Comienza con 2-3. La investigación muestra que la precisión cae significativamente más allá de 5-7 herramientas.

**P: ¿Los agentes pueden funcionar sin OpenAI?**
R: Sí. Modelos locales (Llama, Mistral) soportan llamado de herramientas vía formatos de salida estructurada como JSON mode.
