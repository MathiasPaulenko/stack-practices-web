---
contentType: patterns
slug: agent-tool-selection-pattern
title: "Agent Tool Selection Pattern"
description: "Dynamically select which tools an LLM agent can use based on the task context. Reduce token usage and improve decision quality by narrowing the tool set."
metaDescription: "Dynamically select tools for LLM agents based on task context. Reduce token usage and improve agent decision quality by narrowing available tools per step."
difficulty: advanced
topics:
  - ai
tags:
  - agent-tool-selection
  - pattern
  - ai-pattern
  - llm-agent
  - tool-use
  - dynamic-routing
  - function-calling
relatedResources:
  - /patterns/ai/llm-router-pattern
  - /patterns/ai/prompt-chaining-pattern
  - /recipes/ai/python-agent-langgraph-state-machine
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Dynamically select tools for LLM agents based on task context. Reduce token usage and improve agent decision quality by narrowing available tools per step."
  keywords:
    - agent tool selection
    - dynamic tool routing
    - ai pattern
    - llm agent tools
    - function calling
    - tool use pattern
    - agent architecture
---

# Agent Tool Selection Pattern

## Overview

When an LLM agent has access to many tools (search, calculator, database query, API calls, file operations), passing all tool definitions in every prompt wastes tokens and degrades decision quality. The model has to reason over irrelevant options, increasing the chance of selecting the wrong tool.

The Agent Tool Selection Pattern narrows the tool set dynamically. Before each agent step, a selector determines which tools are relevant based on the current task, conversation history, and agent state. Only those tool definitions are included in the prompt. This reduces token consumption, improves tool selection accuracy, and lowers latency.

## When to Use

Use the Agent Tool Selection Pattern when:
- Your agent has access to more than 8-10 tools and token costs are significant
- Different phases of a task require different tool subsets (e.g., research phase vs. execution phase)
- The agent frequently picks wrong tools because too many options confuse it
- You want to enforce task workflows by restricting tools per phase
- Examples: coding agents with file/search/terminal/deploy tools, research agents with multiple search APIs, customer support agents with department-specific tools

## Solution

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

# Tool registry
TOOL_REGISTRY: Dict[str, Tool] = {
    "web_search": Tool(
        "web_search", "Search the web for information", "research",
        {"query": "string", "max_results": "int"}
    ),
    "code_search": Tool(
        "code_search", "Search the codebase for patterns", "research",
        {"pattern": "string", "language": "string"}
    ),
    "read_file": Tool(
        "read_file", "Read file contents", "file_ops",
        {"path": "string"}
    ),
    "write_file": Tool(
        "write_file", "Write content to a file", "file_ops",
        {"path": "string", "content": "string"}
    ),
    "run_tests": Tool(
        "run_tests", "Execute test suite", "execution",
        {"test_file": "string", "filter": "string"}
    ),
    "deploy": Tool(
        "deploy", "Deploy application to environment", "execution",
        {"environment": "string", "version": "string"}
    ),
    "calculator": Tool(
        "calculator", "Perform mathematical calculations", "utility",
        {"expression": "string"}
    ),
    "sql_query": Tool(
        "sql_query", "Execute SQL query on database", "data",
        {"query": "string", "database": "string"}
    ),
}

# Phase-based tool mapping
PHASE_TOOLS: Dict[str, List[str]] = {
    "planning": ["web_search", "code_search", "calculator"],
    "implementation": ["read_file", "write_file", "code_search"],
    "testing": ["read_file", "run_tests", "code_search"],
    "deployment": ["run_tests", "deploy", "read_file"],
    "analysis": ["sql_query", "calculator", "web_search"],
}

def select_tools_by_phase(state: AgentState) -> List[Tool]:
    """Select tools based on the current agent phase."""
    tool_names = PHASE_TOOLS.get(state.phase, [])
    return [TOOL_REGISTRY[name] for name in tool_names if name in TOOL_REGISTRY]

def select_tools_by_keywords(state: AgentState) -> List[Tool]:
    """Select tools based on keyword matching in the task."""
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
        """Format tool definitions for inclusion in LLM prompt."""
        lines = []
        for tool in tools:
            params = ", ".join(f"{k}: {v}" for k, v in tool.parameters.items())
            lines.append(f"- {tool.name}({params}): {tool.description}")
        return "\n".join(lines)

# Usage
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

// Usage
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

## Explanation

The pattern works in three stages:

1. **State assessment**: The agent maintains a state object tracking the current phase (planning, implementation, testing, deployment) and conversation history. This state drives tool selection.
2. **Tool filtering**: A selector function narrows the full tool registry to a relevant subset. Two common strategies: phase-based (static mapping from phase to tools) and keyword-based (regex matching on task + history text). More advanced approaches use embedding similarity or a small classifier.
3. **Prompt construction**: Only the selected tool definitions are included in the LLM prompt. This reduces token count and helps the model focus on relevant options.

The key insight is that tool definitions consume tokens. A tool with 5 parameters and a description can use 50-100 tokens. With 20 tools, that is 1000-2000 tokens per request. Narrowing to 4 relevant tools saves 75% of that budget.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Embedding-based selection** | Embed task text, compare to tool description embeddings | Semantic matching, handles paraphrased tasks |
| **Classifier-based selection** | Train a small model to predict tool relevance | Highest accuracy, requires labeled data |
| **Hierarchical selection** | First select a tool category, then tools within it | Very large tool sets (50+ tools) |
| **State machine selection** | Each state in the agent graph has a fixed tool set | LangGraph-style agents with explicit states |

## What Works

- **Start with phase-based selection** — it is simple, predictable, and covers most workflows
- **Combine phase + keyword** — use phase as the base set, then add or remove based on keywords
- **Log tool selection decisions** — track which tools were selected and whether the agent used them
- **Include a fallback tool** — always provide a "search" or "ask_user" tool so the agent can escalate
- **Update tool sets per iteration** — re-select tools after each agent step, not just at the start
- **Limit to 5-7 tools per step** — more than that and the model's selection accuracy drops

## Common Mistakes

- Passing all tools every time, negating the token savings and confusing the model
- Not updating the tool set as the task progresses through phases
- Selecting tools based only on the latest message, ignoring conversation history
- Forgetting to include a read/search tool in every phase, leaving the agent unable to gather information
- Making the selector too aggressive, removing tools the agent actually needs

## Frequently Asked Questions

**Q: How many tools should I limit to per step?**
A: Research shows LLM tool selection accuracy degrades beyond 7-10 tools. Aim for 4-6 relevant tools per step. If you need more, consider hierarchical selection.

**Q: Should I use embeddings or rules for tool selection?**
A: Start with rules (phase-based or keyword-based). They are free, fast, and debuggable. Move to embeddings if your tool descriptions are complex or users phrase tasks in varied ways.

**Q: What if the agent needs a tool that was not selected?**
A: Include a fallback mechanism. The agent can request additional tools, or you can detect when the agent tries to call an unavailable tool and re-select with broader criteria.

**Q: Does this pattern work with function calling APIs?**
A: Yes. OpenAI and Anthropic function calling APIs accept a list of tool definitions. Simply pass the filtered list instead of all tools. The API handles the rest.
