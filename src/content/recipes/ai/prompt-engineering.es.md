---
contentType: recipes
slug: prompt-engineering
title: "Aplicar lo que funciona en Prompt Engineering"
description: "Cómo escribir prompts útiles para LLMs usando asignación de roles, few-shot examples, razonamiento chain-of-thought y formato de salida estructurada."
metaDescription: "Aprende prompt engineering para LLMs. Escribe prompts útiles con asignación de roles, few-shot examples, chain-of-thought reasoning y formatos de salida estructurados."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - machine-learning
  - llm
  - neural-networks
  - nlp
relatedResources:
  - /recipes/chatbot-openai
  - /recipes/rag-pipeline
  - /recipes/semantic-search
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende prompt engineering para LLMs. Escribe prompts útiles con asignación de roles, few-shot examples, chain-of-thought reasoning y formatos de salida estructurados."
  keywords:
    - prompt engineering
    - llm prompts
    - few shot prompting
    - chain of thought
    - structured output
    - openai prompts
---

## Visión general

Los Large Language Models (LLMs) son motores de razonamiento de propósito general, pero la calidad de sus outputs depende fuertemente de cómo formules la pregunta. El prompt engineering es la práctica de estructurar inputs para guiar el modelo hacia respuestas precisas, relevantes y bien formateadas. Cambios pequeños en la redacción pueden significar la diferencia entre un párrafo vago y un objeto JSON preciso.

La solucion a continuacion cubre las técnicas más confiables: asignación de rol, few-shot examples, razonamiento chain-of-thought, y restricción de formato de salida. Estas técnicas funcionan en GPT-4, Claude, Gemini y modelos open-source como Llama.

## Cuándo usarlo

Usa esta receta cuando:

- Construyes aplicaciones que llaman APIs de LLM para clasificación, extracción o generación
- Debuggeas outputs inconsistentes o alucinados del modelo
- Diseñas [chatbots](/recipes/ai/chatbot-openai), copilotos o [asistentes impulsados por IA](/recipes/ai/ai-agents)
- Implementando pipelines automatizados de moderación de contenido, resumen o traducción
- Evaluando versiones de prompts con frameworks de [testing A/B](/recipes/performance/load-testing-k6)

## Solución

### Asignación de Rol (System Prompt)

```python
import openai

response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "Eres un revisor senior de código Python. Sé conciso, enfócate en problemas de seguridad y rendimiento."},
        {"role": "user", "content": "Revisa esta función: def login(email, password): ..."}
    ]
)
```

### Few-Shot Examples

```python
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "Clasifica la intención del usuario en: SEARCH, SUPPORT, BILLING u OTHER."},
        {"role": "user", "content": "¿Cómo reseteo mi contraseña?"},
        {"role": "assistant", "content": "SUPPORT"},
        {"role": "user", "content": "Encuéntrame zapatillas rojas bajo $100"},
        {"role": "assistant", "content": "SEARCH"},
        {"role": "user", "content": "Me cobraron dos veces el mes pasado"},
        {"role": "assistant", "content": "BILLING"},
        {"role": "user", "content": user_input},
    ]
)
```

### Chain-of-Thought Reasoning

```python
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "Resuelve problemas de matemáticas paso a paso. Muestra tu razonamiento, luego da la respuesta final en la última línea con prefijo RESPUESTA:"},
        {"role": "user", "content": "Si un tren viaja 120 km en 2 horas, ¿qué distancia recorrerá en 5 horas a la misma velocidad?"}
    ]
)
```

### Salida JSON Estructurada

```python
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "Extrae entidades del texto. Responde SOLO con JSON válido que coincida con este schema: {\"person\": string, \"organization\": string, \"location\": string}"},
        {"role": "user", "content": "Elon Musk anunció que Tesla construirá una nueva fábrica en México."}
    ],
    response_format={"type": "json_object"}
)
```

## Explicación

- **Asignación de rol**: Los LLMs adaptan tono, profundidad y formato basado en la persona que asignas. Un "experto legal" da diferente consejo que un "tutor amigable" para la misma pregunta.
- **Few-shot learning**: Proporcionar ejemplos de input/output en el context enseña al modelo tu formato esperado sin fine-tuning. Tres a cinco ejemplos usualmente bastan.
- **Chain-of-thought**: Pedir explícitamente al modelo que razone paso a paso mejora dramáticamente la precisión en tareas complejas (matemáticas, lógica, planificación multi-paso). También facilita el debugging porque puedes ver dónde falló el razonamiento.
- **Salida estructurada**: Restringir respuestas a JSON, XML o formatos específicos elimina errores de parsing y hace que el procesamiento downstream sea confiable.

## Variantes

| Técnica | Caso de uso | Impacto en costo |
|---------|-------------|------------------|
| Zero-shot | Clasificación simple, Q&A | Bajo tokens |
| Few-shot | Extracción específica de formato | Tokens medio |
| Chain-of-thought | Razonamiento complejo, matemáticas | Más tokens |
| Function calling | Uso de herramientas, integración API | Tokens medio |

## Lo que funciona

- **Sé específico y explícito**: los prompts vagos producen respuestas vagas. En lugar de "resume esto," di "resume en 3 bullets enfocándote en impacto financiero."
- **Usa delimitadores para inputs largos**: envuelve el contenido del usuario en tags XML (`<article>...</article>`) o triples backticks para que el modelo distinga instrucciones de datos.
- **Configura temperatura apropiadamente**: usa `temperature=0` para tareas determinísticas (clasificación, extracción). Usa `temperature=0.7+` para generación creativa.
- **Valida y sanitiza outputs**: los LLMs pueden alucinar, producir JSON inválido o ignorar instrucciones. Siempre parsea defensivamente y ten lógica de fallback.
- **Versiona y trackea prompts**: almacena prompts en control de versiones. Un cambio pequeño de redacción puede alterar drásticamente la calidad del output, y necesitas poder hacer rollback.

## Errores comunes

- **Sobrecargar context**: enviar 50 ejemplos desperdicia tokens y puede confundir al modelo. Curate los ejemplos más relevantes.
- **Confiar en outputs sin validación**: los LLMs generan información incorrecta con confianza. Siempre verifica hechos, especialmente en dominios de alto riesgo como medicina o finanzas.
- **Ignorar límites de tokens**: un prompt con 10,000 tokens deja poco espacio para la respuesta. Monitorea uso de tokens y trunca inputs cuando sea necesario.
- **No manejar rechazos**: algunas queries disparan filtros de seguridad. Tu aplicación debería manejar graciosamente rechazos y respuestas parciales.

## Preguntas frecuentes

**P: ¿Cuántos few-shot examples debería incluir?**
R: Tres a cinco ejemplos de alta calidad usualmente superan a diez mediocres. Incluye casos edge y redacciones diversas.

**P: ¿El prompt engineering reemplaza el fine-tuning?**
R: No. El [prompt engineering](/recipes/ai/prompt-engineering) es más rápido de iterar y no requiere preparación de datos. El [fine-tuning](/recipes/ai/llm-fine-tuning) es mejor cuando necesitas comportamiento consistente en un dominio especializado y quieres reducir costos por request.

**P: ¿Puedo forzar a un LLM a siempre outputar JSON válido?**
R: El formato `json_object` de OpenAI y el [function calling](/recipes/ai/ai-agents-tool-use) enforces estructura JSON, pero el modelo aún puede producir valores semánticamente incorrectos o alucinados. Valida el schema server-side.

**P: ¿Cuál es la diferencia entre temperature y top-p?**
R: La temperature controla la aleatoriedad (0 = determinístico, 1 = creativo). El top-p (nucleus sampling) controla la diversidad limitando la selección de tokens al conjunto más probable que sume p. Usa temperature para la mayoría de aplicaciones.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
