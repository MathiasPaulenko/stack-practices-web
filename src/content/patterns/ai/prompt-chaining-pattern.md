---

contentType: patterns
slug: prompt-chaining-pattern
title: "Prompt Chaining Pattern"
description: "Chain multiple LLM calls where each step's output feeds the next step's input. Break complex tasks into smaller, verifiable prompts for better results."
metaDescription: "Chain multiple LLM calls sequentially where each output feeds the next input. Break complex tasks into smaller verifiable prompts for better LLM results."
difficulty: intermediate
topics:
  - ai
tags:
  - prompt-chaining
  - pattern
  - ai-pattern
  - llm
  - multi-step
  - pipeline
  - task-decomposition
relatedResources:
  - /patterns/llm-router-pattern
  - /patterns/agent-tool-selection-pattern
  - /recipes/python-langchain-chains-composition
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Chain multiple LLM calls sequentially where each output feeds the next input. Break complex tasks into smaller verifiable prompts for better LLM results."
  keywords:
    - prompt chaining pattern
    - llm pipeline
    - multi-step llm
    - ai pattern
    - task decomposition
    - chain of prompts
    - llm workflow

---

# Prompt Chaining Pattern

## Overview

Prompt chaining breaks a complex task into a sequence of smaller LLM calls. Each call receives the output of the previous one as input, plus its own focused prompt. Instead of asking a model to "research, analyze, summarize, and format a report" in one giant prompt, you chain four separate calls: one to research, one to analyze, one to summarize, one to format.

Each step in the chain has a single, clear objective. This improves output quality because the model can focus on one task at a time. It also enables validation between steps — if step 2 produces garbage, you can retry just that step instead of the entire pipeline.

## When to Use

Use the Prompt Chaining Pattern when:
- A single prompt produces inconsistent or low-quality results for a complex task
- You need intermediate validation or human review between steps
- Different steps benefit from different models or parameters (temperature, max tokens)
- The task has a natural sequential structure (research then write, extract then transform)
- Examples: report generation, code review pipelines, data extraction and formatting, multi-language translation with review

## Solution

### Python

```python
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Any

@dataclass
class ChainStep:
    name: str
    prompt_template: str
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_retries: int = 2
    validator: Optional[Callable[[str], bool]] = None

@dataclass
class ChainResult:
    step_name: str
    input: str
    output: str
    success: bool
    retries: int

def mock_llm_call(prompt: str, model: str, temperature: float) -> str:
    """Simulate an LLM API call."""
    return f"[{model}] Processed: {prompt[:60]}..."

class PromptChain:
    def __init__(self, steps: List[ChainStep]):
        self.steps = steps

    def run(self, initial_input: str) -> List[ChainResult]:
        results: List[ChainResult] = []
        current_input = initial_input

        for step in self.steps:
            prompt = step.prompt_template.format(input=current_input)
            success = False
            output = ""
            retries = 0

            for attempt in range(step.max_retries + 1):
                output = mock_llm_call(prompt, step.model, step.temperature)
                retries = attempt

                if step.validator and not step.validator(output):
                    print(f"  Step '{step.name}' validation failed (attempt {attempt + 1})")
                    continue

                success = True
                break

            results.append(ChainResult(
                step_name=step.name,
                input=current_input,
                output=output,
                success=success,
                retries=retries,
            ))

            if not success:
                print(f"Chain stopped at step '{step.name}' after {retries + 1} attempts")
                break

            current_input = output
            print(f"Step '{step.name}' completed")

        return results

# Usage
def validate_non_empty(text: str) -> bool:
    return len(text.strip()) > 10

def validate_has_code(text: str) -> bool:
    return "```" in text or "def " in text or "function " in text

chain = PromptChain([
    ChainStep(
        name="extract_requirements",
        prompt_template="Extract key requirements from this text:\n{input}\n\nList each requirement as a bullet point.",
        model="gpt-4o",
        temperature=0.2,
        validator=validate_non_empty,
    ),
    ChainStep(
        name="generate_code",
        prompt_template="Based on these requirements, generate code:\n{input}\n\nProvide working code with comments.",
        model="gpt-4o",
        temperature=0.3,
        validator=validate_has_code,
    ),
    ChainStep(
        name="review_code",
        prompt_template="Review this code for bugs and improvements:\n{input}\n\nList issues found.",
        model="gpt-4o",
        temperature=0.5,
        validator=validate_non_empty,
    ),
    ChainStep(
        name="format_report",
        prompt_template="Create a summary report from this review:\n{input}\n\nFormat as markdown with sections.",
        model="gpt-4o-mini",
        temperature=0.7,
    ),
])

results = chain.run("Build a REST API endpoint that accepts JSON, validates input, and returns 201 on success")

print(f"\nChain completed: {len(results)}/{len(chain.steps)} steps")
for r in results:
    status = "OK" if r.success else "FAILED"
    print(f"  {r.step_name}: {status} (retries: {r.retries})")
```

### JavaScript

```javascript
class ChainStep {
  constructor(name, promptTemplate, options = {}) {
    this.name = name;
    this.promptTemplate = promptTemplate;
    this.model = options.model || "gpt-4o";
    this.temperature = options.temperature ?? 0.7;
    this.maxRetries = options.maxRetries ?? 2;
    this.validator = options.validator || null;
  }
}

function mockLlmCall(prompt, model, temperature) {
  return `[${model}] Processed: ${prompt.slice(0, 60)}...`;
}

class PromptChain {
  constructor(steps) {
    this.steps = steps;
  }

  async run(initialInput) {
    const results = [];
    let currentInput = initialInput;

    for (const step of this.steps) {
      const prompt = step.promptTemplate.replace("{input}", currentInput);
      let success = false;
      let output = "";
      let retries = 0;

      for (let attempt = 0; attempt <= step.maxRetries; attempt++) {
        output = mockLlmCall(prompt, step.model, step.temperature);
        retries = attempt;

        if (step.validator && !step.validator(output)) {
          console.log(`  Step '${step.name}' validation failed (attempt ${attempt + 1})`);
          continue;
        }

        success = true;
        break;
      }

      results.push({ stepName: step.name, input: currentInput, output, success, retries });

      if (!success) {
        console.log(`Chain stopped at step '${step.name}' after ${retries + 1} attempts`);
        break;
      }

      currentInput = output;
      console.log(`Step '${step.name}' completed`);
    }

    return results;
  }
}

// Usage
function validateNonEmpty(text) {
  return text.trim().length > 10;
}

function validateHasCode(text) {
  return text.includes("```") || text.includes("function ") || text.includes("const ");
}

const chain = new PromptChain([
  new ChainStep("extract_requirements", "Extract key requirements from:\n{input}\n\nList as bullet points.", { temperature: 0.2, validator: validateNonEmpty }),
  new ChainStep("generate_code", "Generate code from these requirements:\n{input}\n\nProvide working code.", { temperature: 0.3, validator: validateHasCode }),
  new ChainStep("review_code", "Review this code for bugs:\n{input}\n\nList issues found.", { temperature: 0.5, validator: validateNonEmpty }),
  new ChainStep("format_report", "Create a summary report:\n{input}\n\nFormat as markdown.", { model: "gpt-4o-mini", temperature: 0.7 }),
]);

chain.run("Build a REST API endpoint that accepts JSON, validates input, and returns 201 on success").then(results => {
  console.log(`\nChain completed: ${results.length}/${chain.steps.length} steps`);
  results.forEach(r => {
    const status = r.success ? "OK" : "FAILED";
    console.log(`  ${r.stepName}: ${status} (retries: ${r.retries})`);
  });
});
```

### Java

```java
import java.util.*;
import java.util.function.Predicate;

public class PromptChaining {

    record ChainStep(String name, String promptTemplate, String model,
                     double temperature, int maxRetries, Predicate<String> validator) {}

    record ChainResult(String stepName, String input, String output, boolean success, int retries) {}

    static String mockLlmCall(String prompt, String model, double temperature) {
        return "[" + model + "] Processed: " + prompt.substring(0, Math.min(60, prompt.length())) + "...";
    }

    static List<ChainResult> runChain(List<ChainStep> steps, String initialInput) {
        List<ChainResult> results = new ArrayList<>();
        String currentInput = initialInput;

        for (ChainStep step : steps) {
            String prompt = step.promptTemplate().replace("{input}", currentInput);
            boolean success = false;
            String output = "";
            int retries = 0;

            for (int attempt = 0; attempt <= step.maxRetries(); attempt++) {
                output = mockLlmCall(prompt, step.model(), step.temperature());
                retries = attempt;

                if (step.validator() != null && !step.validator().test(output)) {
                    System.out.printf("  Step '%s' validation failed (attempt %d)%n", step.name(), attempt + 1);
                    continue;
                }

                success = true;
                break;
            }

            results.add(new ChainResult(step.name(), currentInput, output, success, retries));

            if (!success) {
                System.out.printf("Chain stopped at '%s' after %d attempts%n", step.name(), retries + 1);
                break;
            }

            currentInput = output;
            System.out.printf("Step '%s' completed%n", step.name());
        }

        return results;
    }

    public static void main(String[] args) {
        Predicate<String> nonEmpty = s -> s.trim().length() > 10;
        Predicate<String> hasCode = s -> s.contains("```") || s.contains("void ") || s.contains("public ");

        var steps = List.of(
            new ChainStep("extract_requirements",
                "Extract key requirements from:\n{input}\n\nList as bullet points.",
                "gpt-4o", 0.2, 2, nonEmpty),
            new ChainStep("generate_code",
                "Generate code from these requirements:\n{input}\n\nProvide working code.",
                "gpt-4o", 0.3, 2, hasCode),
            new ChainStep("review_code",
                "Review this code for bugs:\n{input}\n\nList issues found.",
                "gpt-4o", 0.5, 2, nonEmpty),
            new ChainStep("format_report",
                "Create a summary report:\n{input}\n\nFormat as markdown.",
                "gpt-4o-mini", 0.7, 2, null)
        );

        var results = runChain(steps,
            "Build a REST API endpoint that accepts JSON, validates input, and returns 201 on success");

        System.out.printf("%nChain completed: %d/%d steps%n", results.size(), steps.size());
        for (ChainResult r : results) {
            String status = r.success() ? "OK" : "FAILED";
            System.out.printf("  %s: %s (retries: %d)%n", r.stepName(), status, r.retries());
        }
    }
}
```

## Explanation

The chain executes steps sequentially:

1. **Input propagation**: The initial input enters the first step. Each subsequent step receives the previous step's output as its input.
2. **Step execution**: Each step formats its prompt template with the current input, calls the LLM with step-specific parameters (model, temperature), and produces output.
3. **Validation**: If a step has a validator function, the output is checked. If validation fails, the step retries up to `max_retries` times. If all retries fail, the chain stops.
4. **Result collection**: Each step's result (input, output, success, retries) is recorded for debugging and auditing.

The pattern trades latency for quality. A 4-step chain takes 4x the latency of a single call but produces more reliable output because each step focuses on one task and can be validated independently.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Parallel fan-out** | Run multiple steps in parallel, then merge | Independent subtasks (e.g., translate to 3 languages) |
| **Conditional branching** | Next step depends on previous output | Dynamic workflows (e.g., if code has bugs, go to fix step) |
| **Loop with exit condition** | Repeat a step until a condition is met | Iterative refinement (e.g., improve until score > threshold) |
| **Map-reduce** | Map over items in parallel, reduce results | Batch processing (e.g., summarize 100 documents) |

## What Works

- **Keep prompts short and focused** — each step should have one clear objective
- **Use low temperature for extraction** — 0.1-0.3 for factual steps, higher for creative steps
- **Validate between steps** — catch bad output early before it propagates
- **Cache intermediate results** — if step 3 fails, you do not need to re-run steps 1 and 2
- **Use cheaper models for simple steps** — formatting and summarization can use small models
- **Log every step** — inputs, outputs, model, and parameters for debugging

## Common Mistakes

- Making chains too long (10+ steps), causing excessive latency and error accumulation
- Not validating between steps, letting bad output corrupt downstream steps
- Using the same model and temperature for every step regardless of task type
- Not handling partial failures — if step 3 fails, the user gets no output instead of partial results
- Passing raw output without cleaning or formatting between steps

## Frequently Asked Questions

**Q: How many steps should a chain have?**
A: 3-6 steps works best. Beyond that, latency and failure probability compound. If you need more steps, consider breaking into sub-chains or using an agent loop.

**Q: Should I use the same model for all steps?**
A: No. Extraction and classification steps benefit from low temperature and focused models. Creative steps like writing or formatting can use different parameters. Use the [LLM Router Pattern](/patterns/ai/llm-router-pattern) to select models per step.

**Q: How do I handle a step that fails after all retries?**
A: Return partial results with a clear status. Let the caller decide whether to retry the failed step, skip it, or abort. Never silently swallow failures.

**Q: Can I parallelize steps in a chain?**
A: Only if steps are independent. If step B depends on step A's output, they must be sequential. For independent subtasks, use the parallel fan-out variant and merge results after.
