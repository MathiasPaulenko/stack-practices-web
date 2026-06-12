---
contentType: patterns
slug: proxy-pattern
title: "Patrón Proxy"
description: "Proporciona un sustituto o marcador de posición para otro objeto para controlar el acceso a él. Un patrón estructural para control de acceso, carga perezosa y logging."
metaDescription: "Aprende el Patrón Proxy con ejemplos prácticos en Python, Java y JavaScript. Patrón estructural para control de acceso, caching y carga perezosa."
difficulty: intermediate
topics:
  - design
tags:
  - proxy
  - patron
  - patron-de-diseno
  - estructural
  - control-de-acceso
  - caching
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/decorator-pattern
  - /patterns/design/adapter-pattern
  - /patterns/design/factory-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Proxy con ejemplos prácticos en Python, Java y JavaScript. Patrón estructural para control de acceso, caching y carga perezosa."
  keywords:
    - patron proxy
    - patron de diseno
    - patron estructural
    - control de acceso
    - carga perezosa
    - proxy de cache
    - python proxy
    - java proxy
    - javascript proxy
---

# Patrón Proxy

## Visión General

El Patrón Proxy es un patrón de diseño estructural que proporciona un sustituto o marcador de posición para otro objeto. El proxy controla el acceso al sujeto real, agregando una capa de indirección que puede usarse para carga perezosa, control de acceso, caching, logging o monitoreo — sin cambiar el código del sujeto.

## Cuándo Usarlo

Usa el Patrón Proxy cuando:
- Necesitas inicialización perezosa para objetos costosos (crear en primer uso)
- Quieres controlar derechos de acceso a un objeto (autenticación, autorización)
- Necesitas cachear resultados de operaciones costosas
- Quieres registrar o monitorear llamadas a un objeto transparentemente
- El objeto real es remoto y necesitas un representante local

## Solución

### Python

```python
from abc import ABC, abstractmethod

class Image(ABC):
    @abstractmethod
    def display(self):
        pass

class RealImage(Image):
    def __init__(self, filename: str):
        self.filename = filename
        self._load_from_disk()

    def _load_from_disk(self):
        print(f"Cargando imagen: {self.filename}")

    def display(self):
        print(f"Mostrando imagen: {self.filename}")

class ImageProxy(Image):
    def __init__(self, filename: str):
        self.filename = filename
        self._real_image = None

    def display(self):
        if self._real_image is None:
            self._real_image = RealImage(self.filename)
        self._real_image.display()

# Uso: el objeto costoso no se carga hasta que se necesita
proxy = ImageProxy("foto.jpg")  # Sin carga
proxy.display()                  # Carga y muestra
proxy.display()                  # Usa el RealImage cacheado
```

### JavaScript

```javascript
class RealImage {
  constructor(filename) {
    this.filename = filename;
    this.loadFromDisk();
  }

  loadFromDisk() {
    console.log(`Cargando imagen: ${this.filename}`);
  }

  display() {
    console.log(`Mostrando imagen: ${this.filename}`);
  }
}

class ImageProxy {
  constructor(filename) {
    this.filename = filename;
    this.realImage = null;
  }

  display() {
    if (!this.realImage) {
      this.realImage = new RealImage(this.filename);
    }
    this.realImage.display();
  }
}

// Uso
const proxy = new ImageProxy("foto.jpg");
proxy.display(); // Carga perezosa
proxy.display(); // Usa instancia cacheada
```

### Java

```java
public interface Image {
    void display();
}

public class RealImage implements Image {
    private final String filename;

    public RealImage(String filename) {
        this.filename = filename;
        loadFromDisk();
    }

    private void loadFromDisk() {
        System.out.println("Cargando imagen: " + filename);
    }

    @Override
    public void display() {
        System.out.println("Mostrando imagen: " + filename);
    }
}

public class ImageProxy implements Image {
    private final String filename;
    private RealImage realImage;

    public ImageProxy(String filename) {
        this.filename = filename;
    }

    @Override
    public void display() {
        if (realImage == null) {
            realImage = new RealImage(filename);
        }
        realImage.display();
    }
}

// Uso
Image proxy = new ImageProxy("foto.jpg");
proxy.display(); // Carga perezosa
proxy.display(); // Reutiliza RealImage cacheado
```

## Explicación

El Patrón Proxy involucra tres roles:

- **Interfaz del Sujeto** (`Image`): La interfaz común compartida por el objeto real y el proxy
- **Sujeto Real** (`RealImage`): El objeto real que realiza el trabajo
- **Proxy** (`ImageProxy`): Controla el acceso al sujeto real, agregando comportamiento antes o después de reenviar peticiones

El proxy puede interceptar operaciones para agregar caching, logging, control de acceso o inicialización perezosa transparentemente.

## Variantes

| Variante | Propósito | Ejemplo |
|----------|-----------|---------|
| **Proxy Virtual** | Inicialización perezosa | Cargar imágenes grandes bajo demanda |
| **Proxy de Protección** | Control de acceso | Verificar permisos antes de ejecutar métodos |
| **Proxy de Cache** | Memoización | Cachear respuestas de API o resultados computados |
| **Proxy Remoto** | Transparencia de red | Stub local para un servicio remoto |
| **Referencia Inteligente** | Conteo de referencias | Rastrear uso de objetos para limpieza |

## Buenas Prácticas

- **Mantén la interfaz del proxy idéntica al sujeto real** — los clientes no deben saber que usan un proxy
- **Usa inicialización perezosa solo cuando el objeto real es costoso** — de lo contrario, el proxy agrega complejidad innecesaria
- **Maneja la seguridad de hilos** en proxies de cache cuando múltiples clientes pueden acceder datos cacheados compartidos
- **Implementa conteo de referencias** en proxies inteligentes para gestionar el ciclo de vida de recursos costosos
- **Documenta el comportamiento del proxy** para que los llamadores entiendan las características de rendimiento

## Errores Comunes

- Exponer el estado interno del proxy o permitir que los clientes lo eviten para acceder directamente al sujeto real
- Usar un proxy cuando un simple decorator o referencia directa sería suficiente, agregando indirección innecesaria
- Olvidar manejar excepciones en el proxy, dejando que los fallos eviten silenciosamente el logging o la lógica de limpieza
- Implementar proxies de cache sin invalidación de cache, llevando a datos obsoletos
- No sincronizar el acceso en entornos multihilo, causando condiciones de carrera en la inicialización perezosa

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre Proxy y Decorator?**
R: Ambos envuelven objetos y agregan comportamiento. Proxy controla el acceso al objeto envuelto (frecuentemente por razones estructurales como carga perezosa o acceso remoto). Decorator agrega responsabilidades dinámicamente, generalmente para mejora funcional. La intención difiere aunque la estructura parezca similar.

**P: ¿Puede un proxy envolver otro proxy?**
R: Sí. Puedes apilar proxies — por ejemplo, un proxy de cache envolviendo un proxy remoto. Cada capa agrega su propio comportamiento. Mantén la pila superficial para evitar stack traces confusos y overhead de rendimiento.

**P: ¿Cuándo debería usar un Proxy en lugar de un Factory?**
R: Usa Factory cuando quieras controlar qué clase se instancia. Usa Proxy cuando quieras controlar el acceso a un objeto ya instanciado o retrasar su creación.
