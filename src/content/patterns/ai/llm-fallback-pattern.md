---
contentType: patterns
slug: llm-fallback-pattern
title: "LLM Fallback Pattern"
description: "Fall back to alternative LLM providers or models when the primary fails. Handle rate limits, timeouts, and errors gracefully with a provider chain."
metaDescription: "Fall back to alternative LLM providers when the primary fails. Handle rate limits, timeouts, and errors with a provider chain for resilient AI apps."
difficulty: intermediate
topics:
  - ai
tags:
  - llm-fallback
  - pattern
  - ai-pattern
  - error-handling
  - resilience
  - provider-chain
  - rate-limit
relatedResources:
  - /patterns/ai/llm-router-pattern
  - /patterns/ai/llm-guardrails-pattern
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Fall back to alternative LLM providers when the primary fails. Handle rate limits, timeouts, and errors with a provider chain for resilient AI apps."
  keywords:
    - llm fallback pattern
    - provider chain
    - ai resilience
    - rate limit handling
    - model fallback
    - error handling llm
    - multi provider llm
---

# LLM Fallback Pattern

## Overview

LLM APIs fail. Rate limits, timeouts, maintenance windows, and unexpected errors are routine. The LLM Fallback Pattern chains multiple providers so that when the primary fails, the request automatically retries on the next provider. If all providers fail, a static fallback response is returned.

Each provider in the chain has its own error handling: retry with exponential backoff for transient errors (rate limits, timeouts), skip immediately for permanent errors (authentication, invalid request). The chain stops at the first successful response.

## When to Use

Use the LLM Fallback Pattern when:
- Your application cannot tolerate LLM downtime
- You hit rate limits on your primary provider during peak usage
- You want to avoid vendor lock-in by maintaining multi-provider capability
- Different providers offer different strengths (OpenAI for reasoning, Anthropic for long context)
- Examples: production chatbots, AI-powered APIs, real-time assistants, batch processing pipelines

## Solution

### Python

```python
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Any
from enum import Enum
import time
import random

class ErrorType(Enum):
    RATE_LIMIT = "rate_limit"
    TIMEOUT = "timeout"
    AUTH = "auth"
    INVALID_REQUEST = "invalid_request"
    SERVER_ERROR = "server_error"
    UNKNOWN = "unknown"

@dataclass
class LLMError(Exception):
    error_type: ErrorType
    message: str
    provider: str

@dataclass
class ProviderConfig:
    name: str
    model: str
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 30.0

@dataclass
class LLMResponse:
    provider: str
    model: str
    content: str
    latency_ms: float
    from_fallback: bool = False

RETRYABLE_ERRORS = {ErrorType.RATE_LIMIT, ErrorType.TIMEOUT, ErrorType.SERVER_ERROR}

def exponential_backoff(attempt: int, base: float, max_delay: float) -> float:
    delay = min(base * (2 ** attempt), max_delay)
    return delay + random.uniform(0, 0.1 * delay)

def mock_provider_call(provider: str, model: str, prompt: str) -> str:
    """Simulate provider calls with configurable failures."""
    if provider == "openai" and "rate limit" in prompt.lower():
        raise LLMError(ErrorType.RATE_LIMIT, "Rate limit exceeded", provider)
    if provider == "anthropic" and "timeout" in prompt.lower():
        raise LLMError(ErrorType.TIMEOUT, "Request timed out", provider)
    if provider == "local" and "auth" in prompt.lower():
        raise LLMError(ErrorType.AUTH, "Invalid API key", provider)
    return f"[{provider}/{model}] Response to: {prompt[:40]}..."

class LLMFallbackChain:
    def __init__(self, providers: List[ProviderConfig],
                 static_fallback: str = "I'm unable to respond right now. Please try again later."):
        self.providers = providers
        self.static_fallback = static_fallback

    def _call_with_retry(self, provider: ProviderConfig, prompt: str) -> str:
        for attempt in range(provider.max_retries + 1):
            try:
                start = time.time()
                result = mock_provider_call(provider.name, provider.model, prompt)
                latency = (time.time() - start) * 1000
                return result
            except LLMError as e:
                if e.error_type not in RETRYABLE_ERRORS:
                    raise
                if attempt < provider.max_retries:
                    delay = exponential_backoff(attempt, provider.base_delay, provider.max_delay)
                    print(f"  [{provider.name}] {e.error_type.value}, retrying in {delay:.1f}s...")
                    time.sleep(min(delay, 0.5))
                else:
                    raise

    def complete(self, prompt: str) -> LLMResponse:
        for i, provider in enumerate(self.providers):
            try:
                start = time.time()
                content = self._call_with_retry(provider, prompt)
                latency = (time.time() - start) * 1000
                return LLMResponse(
                    provider=provider.name,
                    model=provider.model,
                    content=content,
                    latency_ms=latency,
                    from_fallback=i > 0,
                )
            except LLMError as e:
                print(f"  [{provider.name}] Failed: {e.error_type.value} - {e.message}")
                continue
            except Exception as e:
                print(f"  [{provider.name}] Unexpected error: {e}")
                continue

        return LLMResponse(
            provider="static",
            model="none",
            content=self.static_fallback,
            latency_ms=0,
            from_fallback=True,
        )

# Usage
chain = LLMFallbackChain([
    ProviderConfig("openai", "gpt-4o", max_retries=2, base_delay=1.0),
    ProviderConfig("anthropic", "claude-3.5-sonnet", max_retries=1, base_delay=2.0),
    ProviderConfig("local", "llama-3-70b", max_retries=1, base_delay=0.5),
])

test_prompts = [
    "What is machine learning?",
    "This prompt will trigger rate limit on OpenAI",
    "This prompt will trigger timeout on Anthropic too",
    "This prompt will trigger auth error on local provider",
]

for prompt in test_prompts:
    print(f"\nPrompt: {prompt}")
    response = chain.complete(prompt)
    print(f"  Provider: {response.provider}/{response.model}")
    print(f"  Fallback: {response.from_fallback}")
    print(f"  Content: {response.content[:60]}...")
```

### JavaScript

```javascript
class LLMError extends Error {
  constructor(errorType, message, provider) {
    super(message);
    this.errorType = errorType;
    this.provider = provider;
  }
}

class ProviderConfig {
  constructor(name, model, maxRetries = 3, baseDelay = 1.0, maxDelay = 30.0) {
    this.name = name;
    this.model = model;
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }
}

class LLMResponse {
  constructor(provider, model, content, latencyMs, fromFallback = false) {
    this.provider = provider;
    this.model = model;
    this.content = content;
    this.latencyMs = latencyMs;
    this.fromFallback = fromFallback;
  }
}

const RETRYABLE_ERRORS = new Set(["rate_limit", "timeout", "server_error"]);

function exponentialBackoff(attempt, base, maxDelay) {
  const delay = Math.min(base * Math.pow(2, attempt), maxDelay);
  return delay + Math.random() * 0.1 * delay;
}

function mockProviderCall(provider, model, prompt) {
  if (provider === "openai" && prompt.toLowerCase().includes("rate limit"))
    throw new LLMError("rate_limit", "Rate limit exceeded", provider);
  if (provider === "anthropic" && prompt.toLowerCase().includes("timeout"))
    throw new LLMError("timeout", "Request timed out", provider);
  if (provider === "local" && prompt.toLowerCase().includes("auth"))
    throw new LLMError("auth", "Invalid API key", provider);
  return `[${provider}/${model}] Response to: ${prompt.slice(0, 40)}...`;
}

class LLMFallbackChain {
  constructor(providers, staticFallback = "I'm unable to respond right now.") {
    this.providers = providers;
    this.staticFallback = staticFallback;
  }

  async _callWithRetry(provider, prompt) {
    for (let attempt = 0; attempt <= provider.maxRetries; attempt++) {
      try {
        const start = Date.now();
        const result = mockProviderCall(provider.name, provider.model, prompt);
        return { content: result, latency: Date.now() - start };
      } catch (e) {
        if (e instanceof LLMError) {
          if (!RETRYABLE_ERRORS.has(e.errorType)) throw e;
          if (attempt < provider.maxRetries) {
            const delay = exponentialBackoff(attempt, provider.baseDelay, provider.maxDelay);
            console.log(`  [${provider.name}] ${e.errorType}, retrying in ${delay.toFixed(1)}s...`);
            await new Promise(r => setTimeout(r, Math.min(delay * 1000, 500)));
          } else {
            throw e;
          }
        } else {
          throw e;
        }
      }
    }
  }

  async complete(prompt) {
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      try {
        const { content, latency } = await this._callWithRetry(provider, prompt);
        return new LLMResponse(provider.name, provider.model, content, latency, i > 0);
      } catch (e) {
        if (e instanceof LLMError) {
          console.log(`  [${provider.name}] Failed: ${e.errorType} - ${e.message}`);
        } else {
          console.log(`  [${provider.name}] Unexpected: ${e.message}`);
        }
        continue;
      }
    }
    return new LLMResponse("static", "none", this.staticFallback, 0, true);
  }
}

// Usage
const chain = new LLMFallbackChain([
  new ProviderConfig("openai", "gpt-4o", 2, 1.0),
  new ProviderConfig("anthropic", "claude-3.5-sonnet", 1, 2.0),
  new ProviderConfig("local", "llama-3-70b", 1, 0.5),
]);

const testPrompts = [
  "What is machine learning?",
  "This prompt will trigger rate limit on OpenAI",
  "This prompt will trigger timeout on Anthropic too",
  "This prompt will trigger auth error on local provider",
];

(async () => {
  for (const prompt of testPrompts) {
    console.log(`\nPrompt: ${prompt}`);
    const response = await chain.complete(prompt);
    console.log(`  Provider: ${response.provider}/${response.model}, Fallback: ${response.fromFallback}`);
    console.log(`  Content: ${response.content.slice(0, 60)}...`);
  }
})();
```

### Java

```java
import java.util.*;
import java.util.concurrent.TimeUnit;

public class LLMFallbackPattern {

    enum ErrorType { RATE_LIMIT, TIMEOUT, AUTH, INVALID_REQUEST, SERVER_ERROR, UNKNOWN }

    static final Set<ErrorType> RETRYABLE = Set.of(
        ErrorType.RATE_LIMIT, ErrorType.TIMEOUT, ErrorType.SERVER_ERROR
    );

    record ProviderConfig(String name, String model, int maxRetries,
                          double baseDelay, double maxDelay) {
        ProviderConfig(String name, String model) {
            this(name, model, 3, 1.0, 30.0);
        }
    }

    record LLMResponse(String provider, String model, String content,
                       long latencyMs, boolean fromFallback) {}

    static class LLMException extends RuntimeException {
        final ErrorType errorType;
        final String provider;
        LLMException(ErrorType type, String msg, String provider) {
            super(msg); this.errorType = type; this.provider = provider;
        }
    }

    static String mockProviderCall(String provider, String model, String prompt) {
        String lower = prompt.toLowerCase();
        if (provider.equals("openai") && lower.contains("rate limit"))
            throw new LLMException(ErrorType.RATE_LIMIT, "Rate limit", provider);
        if (provider.equals("anthropic") && lower.contains("timeout"))
            throw new LLMException(ErrorType.TIMEOUT, "Timeout", provider);
        if (provider.equals("local") && lower.contains("auth"))
            throw new LLMException(ErrorType.AUTH, "Invalid key", provider);
        return "[" + provider + "/" + model + "] Response to: " +
            prompt.substring(0, Math.min(40, prompt.length())) + "...";
    }

    static String callWithRetry(ProviderConfig provider, String prompt) {
        for (int attempt = 0; attempt <= provider.maxRetries(); attempt++) {
            try {
                return mockProviderCall(provider.name(), provider.model(), prompt);
            } catch (LLMException e) {
                if (!RETRYABLE.contains(e.errorType)) throw e;
                if (attempt < provider.maxRetries()) {
                    double delay = Math.min(
                        provider.baseDelay() * Math.pow(2, attempt), provider.maxDelay()
                    );
                    System.out.printf("  [%s] %s, retrying in %.1fs...%n",
                        provider.name(), e.errorType, delay);
                    try { Thread.sleep(Math.min((long)(delay * 1000), 500)); }
                    catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                } else {
                    throw e;
                }
            }
        }
        throw new LLMException(ErrorType.UNKNOWN, "Exhausted retries", provider.name());
    }

    static LLMResponse complete(List<ProviderConfig> providers, String prompt,
                                 String staticFallback) {
        for (int i = 0; i < providers.size(); i++) {
            ProviderConfig provider = providers.get(i);
            try {
                long start = System.currentTimeMillis();
                String content = callWithRetry(provider, prompt);
                long latency = System.currentTimeMillis() - start;
                return new LLMResponse(provider.name(), provider.model(),
                    content, latency, i > 0);
            } catch (LLMException e) {
                System.out.printf("  [%s] Failed: %s - %s%n",
                    provider.name(), e.errorType, e.getMessage());
            }
        }
        return new LLMResponse("static", "none", staticFallback, 0, true);
    }

    public static void main(String[] args) {
        var providers = List.of(
            new ProviderConfig("openai", "gpt-4o", 2, 1.0, 30.0),
            new ProviderConfig("anthropic", "claude-3.5-sonnet", 1, 2.0, 30.0),
            new ProviderConfig("local", "llama-3-70b", 1, 0.5, 30.0)
        );

        var testPrompts = List.of(
            "What is machine learning?",
            "This prompt will trigger rate limit on OpenAI",
            "This prompt will trigger timeout on Anthropic too",
            "This prompt will trigger auth error on local provider"
        );

        for (String prompt : testPrompts) {
            System.out.println("\nPrompt: " + prompt);
            var response = complete(providers, prompt,
                "I'm unable to respond right now. Please try again later.");
            System.out.printf("  Provider: %s/%s, Fallback: %s%n",
                response.provider(), response.model(), response.fromFallback());
            System.out.printf("  Content: %s...%n",
                response.content().substring(0, Math.min(60, response.content().length())));
        }
    }
}
```

## Explanation

The fallback chain processes each request through a sequence of providers:

1. **Primary provider call**: The request goes to the first provider in the chain. If it succeeds, the response is returned immediately.
2. **Retry with backoff**: If the error is transient (rate limit, timeout, server error), the provider retries with exponential backoff. Non-retryable errors (auth, invalid request) skip retries and fall through immediately.
3. **Fallback to next provider**: If the primary provider exhausts retries or returns a non-retryable error, the request moves to the next provider in the chain. This continues until a provider succeeds.
4. **Static fallback**: If all providers fail, a static message is returned so the user always gets a response.

The key design decision is distinguishing retryable from non-retryable errors. Retrying an auth error wastes time; falling through immediately to the next provider is faster.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Circuit breaker** | Skip providers that have failed recently | Prevents cascading failures when a provider is down |
| **Weighted round-robin** | Distribute load across providers even when all are healthy | Cost optimization across providers |
| **Quality-based ordering** | Try highest-quality provider first, fall back to faster ones | Best output quality with resilience |
| **Parallel race** | Call multiple providers simultaneously, use first response | Lowest latency when all providers are healthy |

## What Works

- **Order providers by preference** — best quality or cheapest first, depending on your priority
- **Use exponential backoff** — prevents hammering a rate-limited provider
- **Distinguish error types** — do not retry auth errors or invalid requests
- **Log which provider served each request** — track fallback frequency to identify provider issues
- **Set per-provider timeouts** — a hanging provider should not block the entire chain
- **Cache static fallback responses** — if all providers are down, return a cached response if available

## Common Mistakes

- Retrying non-retryable errors (auth, invalid request), wasting time
- Not setting timeouts, letting a hanging provider block the chain
- Using the same model on all providers, missing the chance to use different strengths
- No backoff between retries, worsening rate limit issues
- Not logging fallback events, making it impossible to detect provider degradation

## Frequently Asked Questions

**Q: How many providers should I have in the chain?**
A: 2-3 is typical. One primary, one fallback for resilience, and optionally a local model as a last resort. More than 3 adds complexity without much benefit.

**Q: Should I use the same model across all providers?**
A: Not necessarily. You might use GPT-4o as primary and Claude as fallback. Different models have different failure modes, so using different providers improves resilience.

**Q: How do I handle different response formats from different providers?**
A: Normalize responses through an adapter layer. Each provider's response is mapped to a common format before returning. This decouples your application from provider-specific formats.

**Q: What about cost differences between providers?**
A: The chain tries providers in order, so cost is determined by which provider succeeds. If you want cost optimization, use the [LLM Router Pattern](/patterns/ai/llm-router-pattern) to select providers by query complexity, and use the fallback chain only for error recovery.
