---
contentType: patterns
slug: facade-pattern
title: "Patrón Facade"
description: "Provee una interfaz simplificada a un subsistema complejo. Un patrón estructural que oculta detalles de implementación detrás de una API limpia."
metaDescription: "Aprende el Patrón Facade para simplificar subsistemas complejos. Ejemplos en Python, Java y JavaScript para APIs más limpias y menor acoplamiento."
difficulty: beginner
topics:
  - design
tags:
  - facade
  - pattern
  - design-pattern
  - structural
  - api
  - abstraction
relatedResources:
  - /patterns/design/adapter-pattern
  - /patterns/design/proxy-pattern
  - /patterns/design/mediator-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Facade para simplificar subsistemas complejos. Ejemplos en Python, Java y JavaScript para APIs más limpias y menor acoplamiento."
  keywords:
    - facade pattern
    - design pattern
    - structural pattern
    - api simplification
    - subsystem
---

# Patrón Facade

## Descripción General

El Patrón Facade provee una interfaz simplificada y unificada a un subsistema complejo. En lugar de forzar a los clientes a interactuar con docenas de clases interdependientes, un facade expone solo las operaciones que necesitan. Esto reduce el acoplamiento, mejora la legibilidad y hace que el subsistema sea más fácil de evolucionar.

Considera una librería de conversión de video. Sin un facade, los clientes deben configurar manualmente codecs, calculadores de bit rate, splitters de archivo y mixers de audio. Con un facade, llaman `convert("movie.mp4", "output.avi")` y el facade orquesta todo internamente.

## Cuándo Usar

Usa el Patrón Facade cuando:
- Un subsistema es complejo y tiene muchos componentes interdependientes
- Quieres proveer un punto de entrada simple para operaciones comunes
- Necesitas desacoplar el código cliente de los detalles de implementación del subsistema
- Múltiples subsistemas deben ser coordinados para una sola tarea
- Quieres capas en tu arquitectura (ej., capa de servicio sobre repositorios)

## Cuándo Evitar

- El subsistema ya es simple; agregar un facade es indirección innecesaria
- Cada cliente necesita control de bajo nivel; un facade ocultaría demasiado
- Estás intentando arreglar un subsistema mal diseñado en lugar de refactorizarlo

## Solución

### Python

```python
class VideoDecoder:
    def decode(self, file):
        return f"Decoded {file}"

class VideoEncoder:
    def encode(self, stream, format):
        return f"Encoded to {format}"

class BitRateCalculator:
    def calculate(self, source):
        return 1024

class AudioMixer:
    def mix(self, stream):
        return f"Mixed audio for {stream}"


class VideoConverter:
    """Facade que oculta la complejidad de conversión de video."""

    def __init__(self):
        self._decoder = VideoDecoder()
        self._encoder = VideoEncoder()
        self._bitrate = BitRateCalculator()
        self._audio = AudioMixer()

    def convert(self, source_file, destination_format):
        decoded = self._decoder.decode(source_file)
        bitrate = self._bitrate.calculate(decoded)
        mixed = self._audio.mix(decoded)
        return self._encoder.encode(mixed, destination_format)


# Código cliente
converter = VideoConverter()
result = converter.convert("movie.mp4", "avi")
print(result)
```

### Java

```java
class VideoDecoder {
    String decode(String file) { return "Decoded " + file; }
}

class VideoEncoder {
    String encode(String stream, String format) {
        return "Encoded to " + format;
    }
}

class BitRateCalculator {
    int calculate(String source) { return 1024; }
}

class AudioMixer {
    String mix(String stream) { return "Mixed " + stream; }
}

class VideoConverter {
    private final VideoDecoder decoder = new VideoDecoder();
    private final VideoEncoder encoder = new VideoEncoder();
    private final BitRateCalculator bitrate = new BitRateCalculator();
    private final AudioMixer audio = new AudioMixer();

    public String convert(String sourceFile, String destinationFormat) {
        String decoded = decoder.decode(sourceFile);
        int rate = bitrate.calculate(decoded);
        String mixed = audio.mix(decoded);
        return encoder.encode(mixed, destinationFormat);
    }
}

// Código cliente
VideoConverter converter = new VideoConverter();
System.out.println(converter.convert("movie.mp4", "avi"));
```

### JavaScript

```javascript
class VideoDecoder {
  decode(file) { return `Decoded ${file}`; }
}

class VideoEncoder {
  encode(stream, format) { return `Encoded to ${format}`; }
}

class BitRateCalculator {
  calculate(source) { return 1024; }
}

class AudioMixer {
  mix(stream) { return `Mixed ${stream}`; }
}

class VideoConverter {
  constructor() {
    this.decoder = new VideoDecoder();
    this.encoder = new VideoEncoder();
    this.bitrate = new BitRateCalculator();
    this.audio = new AudioMixer();
  }

  convert(sourceFile, destinationFormat) {
    const decoded = this.decoder.decode(sourceFile);
    const rate = this.bitrate.calculate(decoded);
    const mixed = this.audio.mix(decoded);
    return this.encoder.encode(mixed, destinationFormat);
  }
}

// Código cliente
const converter = new VideoConverter();
console.log(converter.convert('movie.mp4', 'avi'));
```

## Explicación

El Patrón Facade tiene tres participantes:

- **Facade** (`VideoConverter`): La interfaz simplificada con la que interactúan los clientes
- **Clases del subsistema** (`VideoDecoder`, `VideoEncoder`, etc.): Los componentes complejos que el facade coordina
- **Cliente**: Código que usa el facade en lugar de las clases del subsistema directamente

El facade no agrega nueva funcionalidad; compone operaciones existentes del subsistema en flujos de trabajo de más alto nivel.

## Variantes

| Variante | Caso de Uso |
|----------|-------------|
| **Class Facade** | Métodos estáticos para operaciones sin estado |
| **Service Facade** | Dependencia inyectada que envuelve repositorios y APIs externas |
| **API Gateway** | Facade a nivel HTTP que agrega múltiples microservicios |
| **Module Facade** | API pública de módulo que oculta la estructura interna de archivos |

## Lo que funciona

- **Mantén el facade delgado.** Debería orquestar, no implementar. La lógica de negocio pertenece al subsistema o a una capa de servicio separada.
- **Permite acceso directo al subsistema.** Los clientes avanzados deberían poder saltear el facade para control de grano fino.
- **Usa inyección de dependencias.** Inyecta componentes del subsistema en el facade para testeabilidad en lugar de hardcodear constructores.
- **Documenta lo que el facade oculta.** Un facade que silenciosamente reintenta requests HTTP fallidos debería documentar este comportamiento para no sorprender a los clientes.
- **Un facade por subsistema.** No crees un mega-facade para sistemas no relacionados; se convierte en un God Object.

## Errores Comunes

- **Poner lógica de negocio en el facade** lo convierte en una capa media inmantenible. Los facades delegan; no deciden.
- **Ocultar demasiado** fuerza a cada cliente a solicitar cambios al facade para necesidades especializadas. Expón una segunda interfaz "avanzada" si es necesario.
- **Crear un facade para un subsistema trivial** añade indirección sin valor. Un facade sobre tres clases simples es innecesario.
- **No actualizar el facade** cuando el subsistema cambia hace que el facade se convierta en una abstracción rota.
- **Múltiples facades con responsabilidades superpuestas** confunden a los clientes sobre cuál usar. Consolida o separa claramente las preocupaciones.

## Ejemplos del Mundo Real

### ORM Session

La `Session` de SQLAlchemy es un facade sobre pools de conexiones, gestión de transacciones y tracking de unit-of-work. Los desarrolladores llaman `session.commit()` sin gestionar inserts y updates individuales.

### Framework Router

Express.js `app.get('/users', handler)` es un facade sobre parsing HTTP, cadenas de middleware, routing de requests y serialización de respuestas.

### Cloud SDK

AWS S3 `upload_file(bucket, key, path)` oculta multipart uploads, lógica de retry, validación de checksum y refresh de credenciales detrás de una llamada a método.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Facade y Adapter?**
A: [Adapter](/patterns/design/adapter-pattern) cambia una interfaz para coincidir con lo que un cliente espera. Facade simplifica una interfaz compleja sin cambiar sus contratos.

**Q: Un facade puede exponer métodos del subsistema directamente?**
A: Sí, esto se llama un "facade opcional." Los clientes pueden usar los métodos simples del facade o acceder a las clases del subsistema para casos de uso avanzados.

**Q: Un REST API Gateway es un Facade?**
A: Sí. Un API Gateway es un facade a nivel de red, agregando llamadas a múltiples microservicios en un solo endpoint orientado al cliente.
