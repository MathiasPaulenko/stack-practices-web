---
contentType: patterns
slug: llm-fallback-pattern
title: "Patrón LLM Fallback"
description: "Recurre a proveedores o modelos LLM alternativos cuando el primario falla. Maneja rate limits, timeouts y errores con una cadena de proveedores."
metaDescription: "Recurre a proveedores LLM alternativos cuando el primario falla. Maneja rate limits, timeouts y errores con una cadena de proveedores para apps IA resilientes."
difficulty: intermediate
topics:
  - ai
tags:
  - llm-fallback
  - patron
  - patron-ai
  - manejo-errores
  - resiliencia
  - cadena-proveedores
  - rate-limit
relatedResources:
  - /patterns/ai/llm-router-pattern
  - /patterns/ai/llm-guardrails-pattern
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Recurre a proveedores LLM alternativos cuando el primario falla. Maneja rate limits, timeouts y errores con una cadena de proveedores para apps IA resilientes."
  keywords:
    - patron llm fallback
    - cadena de proveedores
    - resiliencia ia
    - manejo rate limit
    - fallback de modelo
    - manejo errores llm
    - llm multi proveedor
---

# Patrón LLM Fallback

## Descripción general

Las APIs LLM fallan. Rate limits, timeouts, ventanas de mantenimiento y errores inesperados son rutina. El patrón LLM Fallback encadena multiples proveedores para que cuando el primario falla, el request automaticamente reintenta en el siguiente proveedor. Si todos los proveedores fallan, se devuelve una respuesta static de fallback.

Cada proveedor en la cadena tiene su propio manejo de errores: reintento con backoff exponencial para errores transitorios (rate limits, timeouts), salto inmediato para errores permanentes (autenticacion, request invalido). La cadena se detiene en la primera respuesta exitosa.

## Cuándo usarlo

Usa el patrón LLM Fallback cuando:
- Tu aplicacion no puede tolerar downtime del LLM
- Golpeas rate limits en tu proveedor primario durante uso pico
- Quieres evitar vendor lock-in manteniendo capacidad multi-proveedor
- Diferentes proveedores ofrecen diferentes fortalezas (OpenAI para razonamiento, Anthropic para contexto largo)
- Ejemplos: chatbots en produccion, APIs potenciadas por IA, asistentes en tiempo real, pipelines de procesamiento batch

## Solución

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
    if provider == "openai" and "rate limit" in prompt.lower():
        raise LLMError(ErrorType.RATE_LIMIT, "Rate limit exceeded", provider)
    if provider == "anthropic" and "timeout" in prompt.lower():
        raise LLMError(ErrorType.TIMEOUT, "Request timed out", provider)
    if provider == "local" and "auth" in prompt.lower():
        raise LLMError(ErrorType.AUTH, "Invalid API key", provider)
    return f"[{provider}/{model}] Response to: {prompt[:40]}..."

class LLMFallbackChain:
    def __init__(self, providers: List[ProviderConfig],
                 static_fallback: str = "No puedo responder ahora. Intenta mas tarde."):
        self.providers = providers
        self.static_fallback = static_fallback

    def _call_with_retry(self, provider: ProviderConfig, prompt: str) -> str:
        for attempt in range(provider.max_retries + 1):
            try:
                start = time.time()
                result = mock_provider_call(provider.name, provider.model, prompt)
                return result
            except LLMError as e:
                if e.error_type not in RETRYABLE_ERRORS:
                    raise
                if attempt < provider.max_retries:
                    delay = exponential_backoff(attempt, provider.base_delay, provider.max_delay)
                    print(f"  [{provider.name}] {e.error_type.value}, reintentando en {delay:.1f}s...")
                    time.sleep(min(delay, 0.5))
                else:
                    raise

    def complete(self, prompt: str) -> LLMResponse:
        for i, provider in enumerate(self.providers):
            try:
                start = time.time()
                content = self._call_with_retry(provider, prompt)
                latency = (time.time() - start) * 1000
                return LLMResponse(provider.name, provider.model, content, latency, i > 0)
            except LLMError as e:
                print(f"  [{provider.name}] Fallo: {e.error_type.value} - {e.message}")
                continue
            except Exception as e:
                print(f"  [{provider.name}] Error inesperado: {e}")
                continue
        return LLMResponse("static", "none", self.static_fallback, 0, True)

# Uso
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
    print(f"  Provider: {response.provider}/{response.model}, Fallback: {response.from_fallback}")
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
    this.name = name; this.model = model;
    this.maxRetries = maxRetries; this.baseDelay = baseDelay; this.maxDelay = maxDelay;
  }
}

class LLMResponse {
  constructor(provider, model, content, latencyMs, fromFallback = false) {
    this.provider = provider; this.model = model;
    this.content = content; this.latencyMs = latencyMs; this.fromFallback = fromFallback;
  }
}

const RETRYABLE_ERRORS = new Set(["rate_limit", "timeout", "server_error"]);

function exponentialBackoff(attempt, base, maxDelay) {
  const delay = Math.min(base * Math.pow(2, attempt), maxDelay);
  return delay + Math.random() * 0.1 * delay;
}

function mockProviderCall(provider, model, prompt) {
  if (provider === "openai" && prompt.toLowerCase().includes("rate limit"))
    throw new LLMError("rate_limit", "Rate limit", provider);
  if (provider === "anthropic" && prompt.toLowerCase().includes("timeout"))
    throw new LLMError("timeout", "Timeout", provider);
  if (provider === "local" && prompt.toLowerCase().includes("auth"))
    throw new LLMError("auth", "Invalid key", provider);
  return `[${provider}/${model}] Response to: ${prompt.slice(0, 40)}...`;
}

class LLMFallbackChain {
  constructor(providers, staticFallback = "No puedo responder ahora.") {
    this.providers = providers;
    this.staticFallback = staticFallback;
  }

  async _callWithRetry(provider, prompt) {
    for (let attempt = 0; attempt <= provider.maxRetries; attempt++) {
      try {
        return mockProviderCall(provider.name, provider.model, prompt);
      } catch (e) {
        if (e instanceof LLMError) {
          if (!RETRYABLE_ERRORS.has(e.errorType)) throw e;
          if (attempt < provider.maxRetries) {
            const delay = exponentialBackoff(attempt, provider.baseDelay, provider.maxDelay);
            console.log(`  [${provider.name}] ${e.errorType}, reintentando en ${delay.toFixed(1)}s...`);
            await new Promise(r => setTimeout(r, Math.min(delay * 1000, 500)));
          } else throw e;
        } else throw e;
      }
    }
  }

  async complete(prompt) {
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      try {
        const content = await this._callWithRetry(provider, prompt);
        return new LLMResponse(provider.name, provider.model, content, 0, i > 0);
      } catch (e) {
        if (e instanceof LLMError)
          console.log(`  [${provider.name}] Fallo: ${e.errorType} - ${e.message}`);
        else
          console.log(`  [${provider.name}] Error: ${e.message}`);
        continue;
      }
    }
    return new LLMResponse("static", "none", this.staticFallback, 0, true);
  }
}

// Uso
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

public class LLMFallbackPattern {

    enum ErrorType { RATE_LIMIT, TIMEOUT, AUTH, INVALID_REQUEST, SERVER_ERROR, UNKNOWN }

    static final Set<ErrorType> RETRYABLE = Set.of(
        ErrorType.RATE_LIMIT, ErrorType.TIMEOUT, ErrorType.SERVER_ERROR
    );

    record ProviderConfig(String name, String model, int maxRetries,
                          double baseDelay, double maxDelay) {
        ProviderConfig(String name, String model) { this(name, model, 3, 1.0, 30.0); }
    }

    record LLMResponse(String provider, String model, String content,
                       long latencyMs, boolean fromFallback) {}

    static class LLMException extends RuntimeException {
        final ErrorType errorType; final String provider;
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
                    double delay = Math.min(provider.baseDelay() * Math.pow(2, attempt), provider.maxDelay());
                    System.out.printf("  [%s] %s, reintentando en %.1fs...%n", provider.name(), e.errorType, delay);
                    try { Thread.sleep(Math.min((long)(delay * 1000), 500)); }
                    catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                } else throw e;
            }
        }
        throw new LLMException(ErrorType.UNKNOWN, "Retries exhausted", provider.name());
    }

    static LLMResponse complete(List<ProviderConfig> providers, String prompt, String staticFallback) {
        for (int i = 0; i < providers.size(); i++) {
            try {
                String content = callWithRetry(providers.get(i), prompt);
                return new LLMResponse(providers.get(i).name(), providers.get(i).model(), content, 0, i > 0);
            } catch (LLMException e) {
                System.out.printf("  [%s] Fallo: %s - %s%n", providers.get(i).name(), e.errorType, e.getMessage());
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
            var response = complete(providers, prompt, "No puedo responder ahora.");
            System.out.printf("  Provider: %s/%s, Fallback: %s%n",
                response.provider(), response.model(), response.fromFallback());
            System.out.printf("  Content: %s...%n",
                response.content().substring(0, Math.min(60, response.content().length())));
        }
    }
}
```

## Explicación

La cadena de fallback procesa cada request a traves de una secuencia de proveedores:

1. **Llamada al proveedor primario**: El request va al primer proveedor de la cadena. Si tiene exito, la respuesta se devuelve inmediatamente.
2. **Reintento con backoff**: Si el error es transitorio (rate limit, timeout, server error), el proveedor reintenta con backoff exponencial. Errores no reintentables (auth, request invalido) saltan los reintentos y caen al siguiente proveedor inmediatamente.
3. **Fallback al siguiente proveedor**: Si el proveedor primario agota reintentos o devuelve un error no reintentable, el request pasa al siguiente proveedor de la cadena. Esto continua hasta que un proveedor tenga exito.
4. **Fallback static**: Si todos los proveedores fallan, se devuelve un mensaje static para que el usuario siempre reciba una respuesta.

La decision de diseño clave es distinguir errores reintentables de no reintentables. Reintentar un error de auth pierde tiempo; caer inmediatamente al siguiente proveedor es mas rapido.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Circuit breaker** | Saltar proveedores que han fallado recientemente | Previene fallos en cascada cuando un proveedor esta caido |
| **Round-robin ponderado** | Distribuir carga entre proveedores incluso cuando todos estan sanos | Optimizacion de costos entre proveedores |
| **Orden por calidad** | Probar el proveedor de mayor calidad primero, recurrir a los mas rapidos | Mejor calidad de output con resiliencia |
| **Carrera paralela** | Llamar a multiples proveedores simultaneamente, usar la primera respuesta | Menor latencia cuando todos los proveedores estan sanos |

## Buenas prácticas

- **Ordena proveedores por preferencia** — mejor calidad o mas barato primero, segun tu prioridad
- **Usa backoff exponencial** — previene golpear a un proveedor con rate limit
- **Distingue tipos de error** — no reintentes errores de auth o requests invalidos
- **Registra que proveedor sirvio cada request** — rastrea frecuencia de fallback para detectar problemas
- **Define timeouts por proveedor** — un proveedor colgado no deberia bloquear toda la cadena
- **Cachea respuestas de fallback static** — si todos los proveedores estan caidos, devuelve una respuesta cacheada si existe

## Errores comunes

- Reintentar errores no reintentables (auth, request invalido), perdiendo tiempo
- No definir timeouts, dejando que un proveedor colgado bloquee la cadena
- Usar el mismo modelo en todos los proveedores, perdiendo la oportunidad de usar diferentes fortalezas
- Sin backoff entre reintentos, empeorando problemas de rate limit
- No registrar eventos de fallback, haciendo imposible detectar degradacion de proveedores

## Preguntas frecuentes

**Q: Cuantos proveedores debo tener en la cadena?**
A: 2-3 es tipico. Uno primario, uno de fallback para resiliencia, y opcionalmente un modelo local como ultimo recurso. Mas de 3 anade complejidad sin mucho beneficio.

**Q: Debo usar el mismo modelo en todos los proveedores?**
A: No necesariamente. Puedes usar GPT-4o como primario y Claude como fallback. Diferentes modelos tienen diferentes modos de fallo, asi que usar diferentes proveedores mejora la resiliencia.

**Q: Como manejo diferentes formatos de respuesta de diferentes proveedores?**
A: Normaliza las respuestas a traves de una capa adaptadora. La respuesta de cada proveedor se mapea a un formato comun antes de devolverse. Esto desacopla tu aplicacion de formatos especificos de proveedor.

**Q: Que pasa con las diferencias de costo entre proveedores?**
A: La cadena prueba proveedores en orden, asi que el costo lo determina que proveedor tiene exito. Si quieres optimizacion de costos, usa el [Patrón LLM Router](/patterns/ai/llm-router-pattern) para seleccionar proveedores por complejidad de query, y usa la cadena de fallback solo para recuperacion de errores.
