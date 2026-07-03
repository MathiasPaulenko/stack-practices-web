---
contentType: patterns
slug: plugin-pattern
title: "Patrón Plugin"
description: "Habilita extensiones de terceros definiendo puntos de extensión en un sistema host que carga y ejecuta módulos externos en vivo."
metaDescription: "Aprende el Patrón Plugin para construir sistemas extensibles con carga en vivo de módulos. Ejemplos en Python, Java y JavaScript para puntos de extensión."
difficulty: intermediate
topics:
  - design
tags:
  - plugin
  - pattern
  - design-pattern
  - behavioral
  - extension
  - extensibility
  - dynamic-loading
relatedResources:
  - /patterns/design/registry-pattern
  - /patterns/design/module-pattern
  - /patterns/design/facade-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Plugin para construir sistemas extensibles con carga en vivo de módulos. Ejemplos en Python, Java y JavaScript para puntos de extensión."
  keywords:
    - plugin pattern
    - design pattern
    - extensibility
    - dynamic loading
    - extension point
---

# Patrón Plugin

## Descripción General

El Patrón Plugin habilita que un sistema host se extienda en runtime cargando y ejecutando módulos externos. El host define un contrato (una interface o protocolo) que los plugins deben implementar. Los plugins se registran y el host los invoca en puntos de extensión apropiados.

Este patrón es la base del software extensible: extensiones de VS Code, plugins de WordPress, plugins de Jenkins y extensiones de navegador siguen este modelo. El host permanece liviano mientras el ecosistema crece a su alrededor.

## Cuándo Usar

Usa el Patrón Plugin cuando:
- Quieres que desarrolladores de terceros extiendan tu aplicación
- Las capacidades son opcionales y no toda instalación las necesita
- Necesitas cargar o descargar funcionalidad sin reiniciar el host
- Diferentes deployments requieren diferentes capacidades

## Cuándo Evitar

- El sistema es pequeño y monolítico (inclusión directa de capacidades es más simple)
- El aislamiento de plugins es imposible y un plugin con bugs crashea el host
- Los requisitos de seguridad hacen que la carga en vivo de código sea inaceptable
- El overhead de descubrimiento y registro de plugins excede el beneficio

## Solución

### Python

```python
from abc import ABC, abstractmethod
from typing import List, Dict

class FormatterPlugin(ABC):
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def format(self, data: dict) -> str:
        pass


class PluginRegistry:
    def __init__(self):
        self._plugins: Dict[str, FormatterPlugin] = {}

    def register(self, plugin: FormatterPlugin):
        self._plugins[plugin.name()] = plugin

    def get(self, name: str) -> FormatterPlugin:
        return self._plugins[name]

    def list(self) -> List[str]:
        return list(self._plugins.keys())


class JsonFormatter(FormatterPlugin):
    def name(self): return "json"
    def format(self, data): return str(data)

class XmlFormatter(FormatterPlugin):
    def name(self): return "xml"
    def format(self, data): return f"<root>{data}</root>"


# Sistema host
class ReportEngine:
    def __init__(self):
        self.registry = PluginRegistry()
        self.registry.register(JsonFormatter())
        self.registry.register(XmlFormatter())

    def generate(self, data: dict, format_name: str):
        plugin = self.registry.get(format_name)
        return plugin.format(data)


# Uso
engine = ReportEngine()
print(engine.generate({"users": 42}, "json"))
print(engine.generate({"users": 42}, "xml"))
```

### Java

```java
import java.util.*;

public interface FormatterPlugin {
    String name();
    String format(Map<String, Object> data);
}

class PluginRegistry {
    private final Map<String, FormatterPlugin> plugins = new HashMap<>();

    public void register(FormatterPlugin plugin) {
        plugins.put(plugin.name(), plugin);
    }

    public FormatterPlugin get(String name) {
        return plugins.get(name);
    }

    public List<String> list() {
        return new ArrayList<>(plugins.keySet());
    }
}

class JsonFormatter implements FormatterPlugin {
    public String name() { return "json"; }
    public String format(Map<String, Object> data) { return data.toString(); }
}

class XmlFormatter implements FormatterPlugin {
    public String name() { return "xml"; }
    public String format(Map<String, Object> data) { return "<root>" + data + "</root>"; }
}

class ReportEngine {
    private final PluginRegistry registry = new PluginRegistry();

    public ReportEngine() {
        registry.register(new JsonFormatter());
        registry.register(new XmlFormatter());
    }

    public String generate(Map<String, Object> data, String formatName) {
        return registry.get(formatName).format(data);
    }
}

// Uso
ReportEngine engine = new ReportEngine();
System.out.println(engine.generate(Map.of("users", 42), "json"));
```

### JavaScript

```javascript
class FormatterPlugin {
  name() { throw new Error('No implementado'); }
  format(data) { throw new Error('No implementado'); }
}

class PluginRegistry {
  constructor() {
    this.plugins = new Map();
  }

  register(plugin) {
    this.plugins.set(plugin.name(), plugin);
  }

  get(name) {
    return this.plugins.get(name);
  }

  list() {
    return Array.from(this.plugins.keys());
  }
}

class JsonFormatter extends FormatterPlugin {
  name() { return 'json'; }
  format(data) { return JSON.stringify(data); }
}

class XmlFormatter extends FormatterPlugin {
  name() { return 'xml'; }
  format(data) { return `<root>${JSON.stringify(data)}</root>`; }
}

class ReportEngine {
  constructor() {
    this.registry = new PluginRegistry();
    this.registry.register(new JsonFormatter());
    this.registry.register(new XmlFormatter());
  }

  generate(data, formatName) {
    return this.registry.get(formatName).format(data);
  }
}

// Uso
const engine = new ReportEngine();
console.log(engine.generate({ users: 42 }, 'json'));
console.log(engine.generate({ users: 42 }, 'xml'));
```

## Explicación

El Patrón Plugin tiene tres participantes:

- **Host**: Define el punto de extensión (interface, protocolo, o hook) y maneja el ciclo de vida del plugin
- **Plugin**: Implementa el contrato del host para proveer funcionalidad adicional
- **Registry**: Descubre, registra y enruta invocaciones al plugin correcto

## Variantes

| Variante | Descubrimiento | Caso de Uso |
|----------|----------------|-------------|
| **Static registry** | Hardcodeado en fuente | Capacidades built-in que se distribuyen con el host |
| **Carga en vivo** | Escaneo de filesystem / classpath | Plugins de terceros instalados por usuarios |
| **Remote plugins** | Descargados desde una store | Extensiones de navegador, marketplace de VS Code |
| **Hook-based** | Callbacks nombrados (WordPress) | Puntos de extensión simples basados en eventos |

## Lo que funciona

- **Define contratos claros.** La interface del host es una API pública. Cambiarla rompe todos los plugins existentes.
- **Versiona tu contrato.** `FormatterPluginV2` te permite evolucionar sin romper plugins legacy.
- **Sandbox plugins.** Un plugin no debería crashear el host. Usa aislamiento de proceso o try-catch boundaries.
- **Lazy load plugins.** No inicialices todos los plugins al startup si no son necesarios inmediatamente.
- **Provee un development kit.** Un SDK bien documentado con ejemplos acelera la adopción por terceros.

## Errores Comunes

- **Acoplamiento fuerte a internals del host** hace los plugins frágiles. Expone solo APIs estables y documentadas.
- **Sin versionamiento** significa que cada actualización del host rompe plugins existentes.
- **Aislamiento de errores ausente** permite que un plugin defectuoso tire abajo todo el sistema.
- **Instalación compleja de plugins** reduce adopción. Apunta a simplicidad tipo "drop a file in a folder".
- **Over-engineering** del sistema de plugins para un problema que no lo necesita agrega complejidad innecesaria.

## Ejemplos del Mundo Real

### WordPress

Más de 60,000 plugins extienden WordPress vía hooks `add_action` y `add_filter`. El core define hooks; los plugins registran callbacks.

### VS Code Extensions

Las extensiones implementan la API de VS Code para agregar lenguajes, temas, debuggers y comandos. Se cargan en vivo desde el marketplace.

### Jenkins

Jenkins es esencialmente un framework de plugins. Pipelines CI, integraciones de source control y sistemas de notificación son todos plugins.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Plugin y Strategy?**
A: [Strategy](/patterns/design/strategy-pattern) selecciona un algoritmo en runtime. Plugin es un patrón arquitectónico más amplio para extensibilidad externa.

**Q: Cómo se descubren los plugins entre sí?**
A: Usualmente vía un registry: escaneo de filesystem, escaneo de classpath (Java), resolución de `require` (Node.js), o una store central.

**Q: Los plugins deberían estar en procesos separados?**
A: Si la seguridad o estabilidad es crítica, sí. Para performance, in-process es más simple. Encuentra el balance correcto para tu dominio.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
