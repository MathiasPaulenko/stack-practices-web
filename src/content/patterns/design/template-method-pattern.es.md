---
contentType: patterns
slug: template-method-pattern
title: "Patrón Template Method"
description: "Define el esqueleto de un algoritmo en una clase base, permitiendo que las subclases sobreescriban pasos específicos sin cambiar la estructura del algoritmo. Un patrón de diseño de comportamiento."
metaDescription: "Aprende el Patrón Template Method en Python, Java y JavaScript. Patrón de comportamiento para esqueletos de algoritmos con pasos personalizables."
difficulty: beginner
topics:
  - design
tags:
  - template-method
  - patron
  - patron-de-diseno
  - comportamiento
  - algoritmo
  - herencia
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/strategy-pattern
  - /patterns/design/decorator-pattern
  - /patterns/design/factory-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Template Method en Python, Java y JavaScript. Patrón de comportamiento para esqueletos de algoritmos con pasos personalizables."
  keywords:
    - patron template method
    - patron de diseno
    - patron de comportamiento
    - esqueleto de algoritmo
    - python template method
    - java template method
    - javascript template method
---

# Patrón Template Method

## Resumen

El Patrón Template Method es un patrón de diseño de comportamiento que define el esqueleto de un algoritmo en una clase base, permitiendo que las subclases sobreescriban pasos específicos sin cambiar la estructura general del algoritmo. Promueve la reutilización de código extrayendo comportamiento común en una plantilla mientras permite la personalización de pasos individuales.

## Cuándo usarlo

Usa el Patrón Template Method cuando:
- Múltiples clases comparten un algoritmo similar con variaciones menores en pasos específicos
- Quieras evitar duplicación de código extrayendo el esqueleto del algoritmo común
- Las subclases deberían poder personalizar ciertos pasos sin cambiar el flujo general
- Necesites asegurar una secuencia específica de operaciones
- Ejemplos: parsers de datos, generadores de reportes, game loops, pipelines ETL

## Solución

### Python

```python
from abc import ABC, abstractmethod

class DataImporter(ABC):
    def import_data(self, source: str):
        """El método template que define el esqueleto del algoritmo."""
        raw = self._fetch(source)
        parsed = self._parse(raw)
        validated = self._validate(parsed)
        self._save(validated)
        self._notify()

    @abstractmethod
    def _fetch(self, source: str) -> str:
        pass

    @abstractmethod
    def _parse(self, raw: str) -> dict:
        pass

    def _validate(self, data: dict) -> dict:
        """Paso por defecto; puede ser sobreescrito."""
        if "id" not in data:
            raise ValueError("Missing required field: id")
        return data

    def _save(self, data: dict):
        """Paso por defecto; puede ser sobreescrito."""
        print(f"Saving: {data}")

    def _notify(self):
        """Método hook — las subclases pueden sobreescribir o ignorar."""
        pass

class CSVImporter(DataImporter):
    def _fetch(self, source: str) -> str:
        return f"CSV content from {source}"

    def _parse(self, raw: str) -> dict:
        return {"id": 1, "format": "csv", "content": raw}

class JSONImporter(DataImporter):
    def _fetch(self, source: str) -> str:
        return f"JSON content from {source}"

    def _parse(self, raw: str) -> dict:
        return {"id": 2, "format": "json", "content": raw}

    def _notify(self):
        print("JSON import completed!")

# Uso
CSVImporter().import_data("users.csv")
JSONImporter().import_data("users.json")
```

### JavaScript

```javascript
class DataImporter {
  importData(source) {
    const raw = this.fetch(source);
    const parsed = this.parse(raw);
    const validated = this.validate(parsed);
    this.save(validated);
    this.notify();
  }

  fetch(source) {
    throw new Error("Las subclases deben implementar fetch()");
  }

  parse(raw) {
    throw new Error("Las subclases deben implementar parse()");
  }

  validate(data) {
    if (!data.id) throw new Error("Missing required field: id");
    return data;
  }

  save(data) {
    console.log("Saving:", data);
  }

  notify() {
    // Hook — las subclases pueden sobreescribir
  }
}

class CSVImporter extends DataImporter {
  fetch(source) {
    return `CSV content from ${source}`;
  }

  parse(raw) {
    return { id: 1, format: "csv", content: raw };
  }
}

class JSONImporter extends DataImporter {
  fetch(source) {
    return `JSON content from ${source}`;
  }

  parse(raw) {
    return { id: 2, format: "json", content: raw };
  }

  notify() {
    console.log("JSON import completed!");
  }
}

// Uso
new CSVImporter().importData("users.csv");
new JSONImporter().importData("users.json");
```

### Java

```java
public abstract class DataImporter {
    public final void importData(String source) {
        String raw = fetch(source);
        Map<String, Object> parsed = parse(raw);
        Map<String, Object> validated = validate(parsed);
        save(validated);
        notify();
    }

    protected abstract String fetch(String source);
    protected abstract Map<String, Object> parse(String raw);

    protected Map<String, Object> validate(Map<String, Object> data) {
        if (!data.containsKey("id")) {
            throw new IllegalArgumentException("Missing required field: id");
        }
        return data;
    }

    protected void save(Map<String, Object> data) {
        System.out.println("Saving: " + data);
    }

    protected void notify() {
        // Hook — las subclases pueden sobreescribir
    }
}

public class CSVImporter extends DataImporter {
    protected String fetch(String source) {
        return "CSV content from " + source;
    }

    protected Map<String, Object> parse(String raw) {
        return Map.of("id", 1, "format", "csv", "content", raw);
    }
}

public class JSONImporter extends DataImporter {
    protected String fetch(String source) {
        return "JSON content from " + source;
    }

    protected Map<String, Object> parse(String raw) {
        return Map.of("id", 2, "format", "json", "content", raw);
    }

    protected void notify() {
        System.out.println("JSON import completed!");
    }
}

// Uso
new CSVImporter().importData("users.csv");
new JSONImporter().importData("users.json");
```

## Explicación

El Patrón Template Method tiene dos tipos de métodos en la clase base:

- **Método Template** (`import_data`): El método público que define el esqueleto del algoritmo. Debe ser `final` cuando sea posible para prevenir la sobreescritura accidental.
- **Métodos Abstractos/Primitivos** (`fetch`, `parse`): Pasos que deben ser implementados por las subclases
- **Métodos Concretos** (`validate`, `save`): Pasos con implementaciones por defecto que las subclases pueden heredar
- **Métodos Hook** (`notify`): Pasos opcionales que las subclases pueden sobreescribir pero no están obligadas a hacerlo

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **Clásica** | Basada en herencia con métodos abstractos | Frameworks, parsers |
| **Basada en Strategy** | Composición con objetos strategy inyectados | Cuando necesitas flexibilidad en tiempo de ejecución |
| **Basada en Callbacks** | Funciones pasadas como argumentos | Streams Node.js |

## Lo que funciona

- **Haz el método template `final`** para prevenir que las subclases rompan el flujo del algoritmo
- **Mantén los hooks opcionales** — documenta claramente qué métodos son requeridos vs. opcionales
- **Minimiza el número de métodos abstractos** — demasiados hacen las subclases complejas
- **Documenta los pasos del algoritmo** y sus invariantes
- **Considera la composición ([Strategy](/patterns/design/strategy-pattern))** cuando las subclases necesitarían sobreescribir muchos métodos

## Errores comunes

- Olvidar marcar el método template como `final`, permitiendo que las subclases rompan el algoritmo
- Hacer cada paso abstracto, forzando a las subclases a implementar métodos que no necesitan
- Usar Template Method cuando la composición (Strategy) sería más flexible
- Introducir jerarquías de herencia profundas solo para variar un solo paso
- Sobreescribir métodos concretos en subclases cuando los hooks serían suficientes

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Template Method y Strategy?**
R: Template Method usa herencia para variar partes de un algoritmo. [Strategy](/patterns/design/strategy-pattern) usa composición para intercambiar algoritmos completos. Prefiere Strategy cuando necesites flexibilidad en tiempo de ejecución o muchas variaciones.

**P: ¿Puedo combinar Template Method con Factory Method?**
R: Sí — muy común. El método template puede llamar a un [Factory](/patterns/design/factory-pattern) Method para crear objetos en pasos específicos, permitiendo que las subclases personalicen qué clases se instancian.
