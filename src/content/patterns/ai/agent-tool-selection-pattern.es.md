---
contentType: patterns
slug: agent-tool-selection-pattern
title: "Patrón Agent Tool Selection"
description: "Selecciona dinamicamente que herramientas puede usar un agente LLM segun el contexto de la tarea. Reduce tokens y mejora la calidad de decisiones."
metaDescription: "Selecciona dinamicamente herramientas para agentes LLM segun contexto. Reduce uso de tokens y mejora la calidad de decisiones del agente por paso."
difficulty: advanced
topics:
  - ai
tags:
  - seleccion-herramientas-agente
  - patron
  - patron-ai
  - agente-llm
  - uso-herramientas
  - enrutamiento-dinamico
  - function-calling
relatedResources:
  - /patterns/ai/llm-router-pattern
  - /patterns/ai/prompt-chaining-pattern
  - /recipes/ai/python-agent-langgraph-state-machine
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Selecciona dinamicamente herramientas para agentes LLM segun contexto. Reduce uso de tokens y mejora la calidad de decisiones del agente por paso."
  keywords:
    - seleccion herramientas agente
    - enrutamiento dinamico herramientas
    - patron ia
    - agente llm herramientas
    - function calling
    - patron uso herramientas
    - arquitectura agente
---

# Patrón Agent Tool Selection

## Descripción general

Cuando un agente LLM tiene acceso a muchas herramientas (busqueda, calculadora, consulta a base de datos, llamadas a API, operaciones de archivos), pasar todas las definiciones de herramientas en cada prompt desperdicia tokens y degrada la calidad de las decisiones. El modelo tiene que razonar sobre opciones irrelevantes, aumentando la probabilidad de seleccionar la herramienta equivocada.

El patrón Agent Tool Selection reduce el conjunto de herramientas dinamicamente. Antes de cada paso del agente, un selector determina que herramientas son relevantes basandose en la tarea actual, el historial de conversacion y el estado del agente. Solo esas definiciones de herramientas se incluyen en el prompt. Esto reduce el consumo de tokens, mejora la precision de seleccion de herramientas y disminuye la latencia.

## Cuándo usarlo

Usa el patrón Agent Tool Selection cuando:
- Tu agente tiene acceso a mas de 8-10 herramientas y los costos de tokens son significativos
- Diferentes fases de una tarea requieren diferentes subconjuntos de herramientas (ej. fase de investigacion vs. ejecucion)
- El agente frecuentemente elige herramientas equivocadas porque demasiadas opciones lo confunden
- Quieres imponer flujos de tarea restringiendo herramientas por fase
- Ejemplos: agentes de codigo con herramientas de archivo/busqueda/terminal/deploy, agentes de investigacion con multiples APIs de busqueda, agentes de soporte con herramientas por departamento

## Solución

### Python

```python
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Any
import re

@dataclass
class Tool:
    name: str
    description: str
    category: str
    parameters: Dict[str, str] = field(default_factory=dict)

@dataclass
class AgentState:
    task: str
    phase: str = "planning"
    history: List[str] = field(default_factory=list)
    available_tools: List[str] = field(default_factory=list)

TOOL_REGISTRY: Dict[str, Tool] = {
    "web_search": Tool("web_search", "Search the web for information", "research", {"query": "string", "max_results": "int"}),
    "code_search": Tool("code_search", "Search the codebase for patterns", "research", {"pattern": "string", "language": "string"}),
    "read_file": Tool("read_file", "Read file contents", "file_ops", {"path": "string"}),
    "write_file": Tool("write_file", "Write content to a file", "file_ops", {"path": "string", "content": "string"}),
    "run_tests": Tool("run_tests", "Execute test suite", "execution", {"test_file": "string", "filter": "string"}),
    "deploy": Tool("deploy", "Deploy application to environment", "execution", {"environment": "string", "version": "string"}),
    "calculator": Tool("calculator", "Perform mathematical calculations", "utility", {"expression": "string"}),
    "sql_query": Tool("sql_query", "Execute SQL query on database", "data", {"query": "string", "database": "string"}),
}

PHASE_TOOLS: Dict[str, List[str]] = {
    "planning": ["web_search", "code_search", "calculator"],
    "implementation": ["read_file", "write_file", "code_search"],
    "testing": ["read_file", "run_tests", "code_search"],
    "deployment": ["run_tests", "deploy", "read_file"],
    "analysis": ["sql_query", "calculator", "web_search"],
}

def select_tools_by_phase(state: AgentState) -> List[Tool]:
    tool_names = PHASE_TOOLS.get(state.phase, [])
    return [TOOL_REGISTRY[name] for name in tool_names if name in TOOL_REGISTRY]

def select_tools_by_keywords(state: AgentState) -> List[Tool]:
    text = (state.task + " " + " ".join(state.history)).lower()

    keyword_map = {
        "search|find|look up|research": ["web_search", "code_search"],
        "read|open|view|inspect": ["read_file"],
        "write|create|modify|update|edit": ["write_file", "read_file"],
        "test|spec|assert|validate": ["run_tests", "read_file"],
        "deploy|release|publish|ship": ["deploy", "run_tests"],
        "calculate|compute|math|sum|average": ["calculator"],
        "query|database|sql|select|join": ["sql_query"],
    }

    selected: set = set()
    for pattern, tools in keyword_map.items():
        if re.search(pattern, text):
            selected.update(tools)

    if not selected:
        selected.update(PHASE_TOOLS.get(state.phase, ["web_search"]))

    return [TOOL_REGISTRY[name] for name in selected if name in TOOL_REGISTRY]

class ToolSelector:
    def __init__(self, strategy: str = "phase"):
        self.strategy = strategy

    def select(self, state: AgentState) -> List[Tool]:
        if self.strategy == "phase":
            return select_tools_by_phase(state)
        elif self.strategy == "keyword":
            return select_tools_by_keywords(state)
        else:
            return list(TOOL_REGISTRY.values())

    def format_tools_for_prompt(self, tools: List[Tool]) -> str:
        lines = []
        for tool in tools:
            params = ", ".join(f"{k}: {v}" for k, v in tool.parameters.items())
            lines.append(f"- {tool.name}({params}): {tool.description}")
        return "\n".join(lines)

# Uso
state = AgentState(
    task="Find all Python files with SQL injection vulnerabilities and fix them",
    phase="implementation",
    history=["Found 3 files with raw SQL queries"],
)

selector = ToolSelector(strategy="keyword")
tools = selector.select(state)

print(f"Selected {len(tools)} tools:")
for t in tools:
    print(f"  {t.name}: {t.description}")

print("\nFormatted for prompt:")
print(selector.format_tools_for_prompt(tools))
```

### JavaScript

```javascript
class Tool {
  constructor(name, description, category, parameters = {}) {
    this.name = name;
    this.description = description;
    this.category = category;
    this.parameters = parameters;
  }
}

const TOOL_REGISTRY = {
  web_search: new Tool("web_search", "Search the web", "research", { query: "string", maxResults: "int" }),
  code_search: new Tool("code_search", "Search codebase", "research", { pattern: "string", language: "string" }),
  read_file: new Tool("read_file", "Read file contents", "file_ops", { path: "string" }),
  write_file: new Tool("write_file", "Write to file", "file_ops", { path: "string", content: "string" }),
  run_tests: new Tool("run_tests", "Execute tests", "execution", { testFile: "string", filter: "string" }),
  deploy: new Tool("deploy", "Deploy app", "execution", { environment: "string", version: "string" }),
  calculator: new Tool("calculator", "Math calculations", "utility", { expression: "string" }),
  sql_query: new Tool("sql_query", "Execute SQL", "data", { query: "string", database: "string" }),
};

const PHASE_TOOLS = {
  planning: ["web_search", "code_search", "calculator"],
  implementation: ["read_file", "write_file", "code_search"],
  testing: ["read_file", "run_tests", "code_search"],
  deployment: ["run_tests", "deploy", "read_file"],
  analysis: ["sql_query", "calculator", "web_search"],
};

function selectToolsByPhase(state) {
  const names = PHASE_TOOLS[state.phase] || [];
  return names.map(n => TOOL_REGISTRY[n]).filter(Boolean);
}

function selectToolsByKeywords(state) {
  const text = (state.task + " " + state.history.join(" ")).toLowerCase();

  const keywordMap = {
    "search|find|look up|research": ["web_search", "code_search"],
    "read|open|view|inspect": ["read_file"],
    "write|create|modify|update|edit": ["write_file", "read_file"],
    "test|spec|assert|validate": ["run_tests", "read_file"],
    "deploy|release|publish|ship": ["deploy", "run_tests"],
    "calculate|compute|math|sum|average": ["calculator"],
    "query|database|sql|select|join": ["sql_query"],
  };

  const selected = new Set();
  for (const [pattern, tools] of Object.entries(keywordMap)) {
    if (new RegExp(pattern).test(text)) {
      tools.forEach(t => selected.add(t));
    }
  }

  if (selected.size === 0) {
    (PHASE_TOOLS[state.phase] || ["web_search"]).forEach(t => selected.add(t));
  }

  return [...selected].map(n => TOOL_REGISTRY[n]).filter(Boolean);
}

class ToolSelector {
  constructor(strategy = "phase") {
    this.strategy = strategy;
  }

  select(state) {
    if (this.strategy === "phase") return selectToolsByPhase(state);
    if (this.strategy === "keyword") return selectToolsByKeywords(state);
    return Object.values(TOOL_REGISTRY);
  }

  formatToolsForPrompt(tools) {
    return tools
      .map(t => {
        const params = Object.entries(t.parameters)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        return `- ${t.name}(${params}): ${t.description}`;
      })
      .join("\n");
  }
}

// Uso
const state = {
  task: "Find all Python files with SQL injection vulnerabilities and fix them",
  phase: "implementation",
  history: ["Found 3 files with raw SQL queries"],
};

const selector = new ToolSelector("keyword");
const tools = selector.select(state);

console.log(`Selected ${tools.length} tools:`);
tools.forEach(t => console.log(`  ${t.name}: ${t.description}`));

console.log("\nFormatted for prompt:");
console.log(selector.formatToolsForPrompt(tools));
```

### Java

```java
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class AgentToolSelection {

    record Tool(String name, String description, String category, Map<String, String> parameters) {}

    static final Map<String, Tool> TOOL_REGISTRY = Map.of(
        "web_search", new Tool("web_search", "Search the web", "research", Map.of("query", "string")),
        "code_search", new Tool("code_search", "Search codebase", "research", Map.of("pattern", "string")),
        "read_file", new Tool("read_file", "Read file", "file_ops", Map.of("path", "string")),
        "write_file", new Tool("write_file", "Write file", "file_ops", Map.of("path", "string", "content", "string")),
        "run_tests", new Tool("run_tests", "Execute tests", "execution", Map.of("testFile", "string")),
        "deploy", new Tool("deploy", "Deploy app", "execution", Map.of("environment", "string")),
        "calculator", new Tool("calculator", "Math calculations", "utility", Map.of("expression", "string")),
        "sql_query", new Tool("sql_query", "Execute SQL", "data", Map.of("query", "string"))
    );

    static final Map<String, List<String>> PHASE_TOOLS = Map.of(
        "planning", List.of("web_search", "code_search", "calculator"),
        "implementation", List.of("read_file", "write_file", "code_search"),
        "testing", List.of("read_file", "run_tests", "code_search"),
        "deployment", List.of("run_tests", "deploy", "read_file"),
        "analysis", List.of("sql_query", "calculator", "web_search")
    );

    record AgentState(String task, String phase, List<String> history) {}

    static List<Tool> selectToolsByPhase(AgentState state) {
        return PHASE_TOOLS.getOrDefault(state.phase(), List.of())
            .stream()
            .map(TOOL_REGISTRY::get)
            .filter(Objects::nonNull)
            .toList();
    }

    static List<Tool> selectToolsByKeywords(AgentState state) {
        String text = (state.task() + " " + String.join(" ", state.history())).toLowerCase();
        Map<String, List<String>> keywordMap = Map.of(
            "search|find|look up|research", List.of("web_search", "code_search"),
            "read|open|view|inspect", List.of("read_file"),
            "write|create|modify|update|edit", List.of("write_file", "read_file"),
            "test|spec|assert|validate", List.of("run_tests", "read_file"),
            "deploy|release|publish|ship", List.of("deploy", "run_tests"),
            "calculate|compute|math|sum|average", List.of("calculator"),
            "query|database|sql|select|join", List.of("sql_query")
        );

        Set<String> selected = new LinkedHashSet<>();
        for (var entry : keywordMap.entrySet()) {
            if (Pattern.compile(entry.getKey()).matcher(text).find()) {
                selected.addAll(entry.getValue());
            }
        }

        if (selected.isEmpty()) {
            selected.addAll(PHASE_TOOLS.getOrDefault(state.phase(), List.of("web_search")));
        }

        return selected.stream()
            .map(TOOL_REGISTRY::get)
            .filter(Objects::nonNull)
            .toList();
    }

    static String formatToolsForPrompt(List<Tool> tools) {
        return tools.stream()
            .map(t -> {
                String params = t.parameters().entrySet().stream()
                    .map(e -> e.getKey() + ": " + e.getValue())
                    .collect(Collectors.joining(", "));
                return "- " + t.name() + "(" + params + "): " + t.description();
            })
            .collect(Collectors.joining("\n"));
    }

    public static void main(String[] args) {
        var state = new AgentState(
            "Find all Python files with SQL injection vulnerabilities and fix them",
            "implementation",
            List.of("Found 3 files with raw SQL queries")
        );

        var tools = selectToolsByKeywords(state);
        System.out.println("Selected " + tools.size() + " tools:");
        tools.forEach(t -> System.out.println("  " + t.name() + ": " + t.description()));
        System.out.println("\nFormatted for prompt:");
        System.out.println(formatToolsForPrompt(tools));
    }
}
```

## Explicación

El patrón funciona en tres etapas:

1. **Evaluacion de estado**: El agente mantiene un objeto de estado que rastrea la fase actual (planificacion, implementacion, testing, deployment) y el historial de conversacion. Este estado dirige la seleccion de herramientas.
2. **Filtrado de herramientas**: Una funcion selectora reduce el registro completo de herramientas a un subconjunto relevante. Dos estrategias comunes: basada en fase (mapeo estatico de fase a herramientas) y basada en palabras clave (coincidencia regex en texto de tarea + historial). Enfoques mas avanzados usan similitud de embeddings o un clasificador pequeno.
3. **Construccion del prompt**: Solo las definiciones de herramientas seleccionadas se incluyen en el prompt del LLM. Esto reduce el conteo de tokens y ayuda al modelo a enfocarse en opciones relevantes.

La idea clave es que las definiciones de herramientas consumen tokens. Una herramienta con 5 parametros y una descripcion puede usar 50-100 tokens. Con 20 herramientas, eso son 1000-2000 tokens por request. Reducir a 4 herramientas relevantes ahorra 75% de ese presupuesto.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Seleccion por embeddings** | Embeddel texto de la tarea, compara con embeddings de descripciones de herramientas | Matching semantico, maneja tareas parafraseadas |
| **Seleccion por clasificador** | Entrenar un modelo pequeno para predecir relevancia de herramientas | Maxima precision, requiere datos etiquetados |
| **Seleccion jerarquica** | Primero selecciona categoria de herramienta, luego herramientas dentro de ella | Conjuntos muy grandes (50+ herramientas) |
| **Seleccion por maquina de estados** | Cada estado en el grafo del agente tiene un conjunto fijo de herramientas | Agentes estilo LangGraph con estados explicitos |

## Buenas prácticas

- **Empieza con seleccion por fase** — es simple, predecible y cubre la mayoria de los flujos
- **Combina fase + palabras clave** — usa fase como conjunto base, luego agrega o elimina basado en palabras clave
- **Registra decisiones de seleccion** — rastrea que herramientas se seleccionaron y si el agente las uso
- **Incluye una herramienta de fallback** — siempre proporciona "search" o "ask_user" para que el agente pueda escalar
- **Actualiza el conjunto por iteracion** — re-selecciona herramientas despues de cada paso, no solo al inicio
- **Limita a 5-7 herramientas por paso** — mas que eso y la precision de seleccion del modelo cae

## Errores comunes

- Pasar todas las herramientas cada vez, anulando el ahorro de tokens y confundiendo al modelo
- No actualizar el conjunto de herramientas conforme la tarea progresa por fases
- Seleccionar herramientas basandose solo en el ultimo mensaje, ignorando el historial
- Olvidar incluir una herramienta de lectura/busqueda en cada fase, dejando al agente sin poder recopilar informacion
- Hacer el selector demasiado agresivo, eliminando herramientas que el agente realmente necesita

## Preguntas frecuentes

**Q: Cuantas herramientas debo limitar por paso?**
A: Investigaciones muestran que la precision de seleccion de herramientas de los LLMs degrada mas alla de 7-10 herramientas. Apunta a 4-6 herramientas relevantes por paso. Si necesitas mas, considera seleccion jerarquica.

**Q: Debo usar embeddings o reglas para seleccion de herramientas?**
A: Empieza con reglas (basadas en fase o palabras clave). Son gratuitas, rapidas y depurables. Pasa a embeddings si tus descripciones de herramientas son complejas o los usuarios formulan tareas de maneras variadas.

**Q: Que pasa si el agente necesita una herramienta que no fue seleccionada?**
A: Incluye un mecanismo de fallback. El agente puede solicitar herramientas adicionales, o puedes detectar cuando el agente intenta llamar una herramienta no disponible y re-seleccionar con criterios mas amplios.

**Q: Funciona este patrón con APIs de function calling?**
A: Si. Las APIs de function calling de OpenAI y Anthropic aceptan una lista de definiciones de herramientas. Simplemente pasa la lista filtrada en lugar de todas las herramientas. La API maneja el resto.
