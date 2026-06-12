---
contentType: patterns
slug: chain-of-responsibility-pattern
title: "Patrón Chain of Responsibility"
description: "Pasa solicitudes a lo largo de una cadena de manejadores hasta que uno la procese. Un patrón de comportamiento para desacoplar emisores y receptores."
metaDescription: "Aprende el Patrón Chain of Responsibility en Python, Java y JavaScript. Patrón de comportamiento para pipelines de manejo de solicitudes y cadenas de middleware."
difficulty: intermediate
topics:
  - design
tags:
  - chain-of-responsibility
  - patron
  - patron-de-diseno
  - comportamiento
  - middleware
  - pipeline
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/command-pattern
  - /patterns/design/decorator-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Chain of Responsibility en Python, Java y JavaScript. Patrón de comportamiento para pipelines de manejo de solicitudes y cadenas de middleware."
  keywords:
    - chain of responsibility
    - patron de diseno
    - patron de comportamiento
    - cadena de middleware
    - pipeline de peticiones
    - python chain
    - java chain
    - javascript middleware
---

# Patrón Chain of Responsibility

## Visión General

El Patrón Chain of Responsibility es un patrón de diseño de comportamiento que te permite pasar solicitudes a lo largo de una cadena de manejadores. Cada manejador decide si procesa la solicitud o la pasa al siguiente manejador en la cadena. Esto desacopla emisores de receptores y permite que múltiples objetos manejen una solicitud sin que el emisor sepa cuál lo hará.

## Cuándo Usarlo

Usa el Patrón Chain of Responsibility cuando:
- Más de un objeto puede manejar una solicitud, y el manejador no se conoce de antemano
- Quieres emitir una solicitud a uno de varios objetos sin especificar el receptor explícitamente
- El conjunto de objetos que pueden manejar una solicitud debe especificarse dinámicamente
- Necesitas un pipeline o middleware donde cada paso pueda procesar, transformar o detener una solicitud

## Solución

### Python

```python
from abc import ABC, abstractmethod
from typing import Optional

class Handler(ABC):
    def __init__(self):
        self._next: Optional['Handler'] = None

    def set_next(self, handler: 'Handler') -> 'Handler':
        self._next = handler
        return handler  # Habilita encadenamiento fluido

    @abstractmethod
    def handle(self, request: str) -> Optional[str]:
        pass

    def _pass_to_next(self, request: str) -> Optional[str]:
        if self._next:
            return self._next.handle(request)
        return None

class AuthHandler(Handler):
    def handle(self, request: str) -> Optional[str]:
        if not request.startswith("token:"):
            return "401 No Autorizado"
        return self._pass_to_next(request)

class RateLimitHandler(Handler):
    def __init__(self):
        super().__init__()
        self.requests = 0
        self.limit = 3

    def handle(self, request: str) -> Optional[str]:
        self.requests += 1
        if self.requests > self.limit:
            return "429 Demasiadas Solicitudes"
        return self._pass_to_next(request)

class DataHandler(Handler):
    def handle(self, request: str) -> Optional[str]:
        return f"Procesado: {request}"

# Construir la cadena
handler = AuthHandler()
handler.set_next(RateLimitHandler()).set_next(DataHandler())

print(handler.handle("token:abc123"))  # Procesado
print(handler.handle("bad-request"))    # 401 No Autorizado
```

### JavaScript

```javascript
class Handler {
  constructor() {
    this.nextHandler = null;
  }

  setNext(handler) {
    this.nextHandler = handler;
    return handler;
  }

  handle(request) {
    if (this.nextHandler) {
      return this.nextHandler.handle(request);
    }
    return null;
  }
}

class AuthHandler extends Handler {
  handle(request) {
    if (!request.startsWith("token:")) {
      return "401 No Autorizado";
    }
    return super.handle(request);
  }
}

class RateLimitHandler extends Handler {
  constructor() {
    super();
    this.requests = 0;
    this.limit = 3;
  }

  handle(request) {
    this.requests++;
    if (this.requests > this.limit) {
      return "429 Demasiadas Solicitudes";
    }
    return super.handle(request);
  }
}

class DataHandler extends Handler {
  handle(request) {
    return `Procesado: ${request}`;
  }
}

// Construir la cadena
const handler = new AuthHandler();
handler.setNext(new RateLimitHandler()).setNext(new DataHandler());

console.log(handler.handle("token:abc123")); // Procesado
console.log(handler.handle("bad-request"));     // 401
```

### Java

```java
public abstract class Handler {
    protected Handler next;

    public Handler setNext(Handler next) {
        this.next = next;
        return next;
    }

    public abstract String handle(String request);

    protected String passToNext(String request) {
        if (next != null) {
            return next.handle(request);
        }
        return null;
    }
}

public class AuthHandler extends Handler {
    @Override
    public String handle(String request) {
        if (!request.startsWith("token:")) {
            return "401 No Autorizado";
        }
        return passToNext(request);
    }
}

public class RateLimitHandler extends Handler {
    private int requests = 0;
    private final int limit = 3;

    @Override
    public String handle(String request) {
        requests++;
        if (requests > limit) {
            return "429 Demasiadas Solicitudes";
        }
        return passToNext(request);
    }
}

public class DataHandler extends Handler {
    @Override
    public String handle(String request) {
        return "Procesado: " + request;
    }
}

// Construir la cadena
Handler handler = new AuthHandler();
handler.setNext(new RateLimitHandler()).setNext(new DataHandler());

System.out.println(handler.handle("token:abc")); // Procesado
System.out.println(handler.handle("bad"));        // 401
```

## Explicación

El Patrón Chain of Responsibility tiene dos roles:

- **Interfaz de Manejador** — declara un método `handle()` y mantiene una referencia al siguiente manejador
- **Manejadores Concretos** — implementan lógica de procesamiento; cada uno decide si maneja la solicitud o la pasa adelante

El cliente construye el orden de la cadena. Cada manejador también puede elegir detener la cadena (cortocircuito) retornando temprano sin llamar al siguiente manejador.

## Variantes

| Variante | Estructura | Ideal Para |
|----------|------------|------------|
| **Cadena Lineal** | Lista enlazada de manejadores | Procesamiento secuencial simple |
| **Cadena en Árbol** | Manejadores organizados jerárquicamente | Árboles de decisión multinivel |
| **Pipeline de Middleware** | Array de funciones, cada una llama `next()` | Frameworks web (Express, Django middleware) |
| **Bus de Eventos** | Manejadores se registran para eventos específicos | Sistemas desacoplados orientados a eventos |

## Buenas Prácticas

- **Mantén los manejadores enfocados** — cada manejador debe hacer una sola cosa (auth, validación, logging, etc.)
- **Proporciona un manejador por defecto** al final de la cadena para evitar solicitudes no manejadas
- **Permite modificación de cadena en tiempo de ejecución** exponiendo métodos `setNext()` o `addHandler()`
- **Usa objetos de solicitud inmutables** para que los manejadores no modifiquen estado compartido accidentalmente
- **Considera el orden cuidadosamente** — los manejadores que cortocircuitan (auth, rate limiting) deben ir primero

## Errores Comunes

- Crear cadenas circulares donde un manejador eventualmente se llama a sí mismo, causando bucles infinitos
- Olvidar llamar al siguiente manejador, descartando silenciosamente solicitudes que deberían haberse procesado
- Colocar manejadores lentos o bloqueantes temprano en la cadena, causando latencia innecesaria para solicitudes rechazadas
- Almacenar estado mutable en manejadores que se reutilizan entre solicitudes, causando contaminación cruzada
- Construir cadenas excesivamente largas que se vuelven difíciles de depurar

## Preguntas Frecuentes

**P: ¿Es lo mismo que el middleware en frameworks web?**
R: Sí. El middleware de Express.js, Django y ASP.NET Core son implementaciones del Patrón Chain of Responsibility. Cada middleware decide si procesa la solicitud, la pasa adelante, o cortocircuita con una respuesta.

**P: ¿Qué pasa si ningún manejador procesa la solicitud?**
R: Por defecto, la solicitud cae a través de la cadena sin ser manejada. Deberías agregar un manejador comodín al final que retorne una respuesta por defecto o lance un error apropiado.

**P: ¿Los manejadores pueden modificar la solicitud antes de pasarla?**
R: Sí. A diferencia de una cadena pura de pasar-o-fallar, los manejadores pueden transformar, enriquecer o validar la solicitud antes de reenviarla. Esto es común en pipelines de middleware.
