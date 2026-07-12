---





contentType: patterns
slug: adapter-pattern
title: "Patrón Adapter"
description: "Convierte la interfaz de una clase en otra interfaz que los clientes esperan. Patrón de diseño estructural para compatibilidad de interfaces."
metaDescription: "Aprende el Patrón Adapter con ejemplos prácticos en Python, Java y JavaScript. Patrón estructural para hacer que interfaces incompatibles trabajen juntas."
difficulty: beginner
topics:
  - design
tags:
  - adapter
  - design-pattern
  - java
  - javascript
  - pattern
  - python
  - structural
relatedResources:
  - /patterns/decorator-pattern
  - /patterns/command-pattern
  - /recipes/call-rest-api
  - /patterns/bridge-pattern
  - /patterns/decorator-pattern-pipeline
  - /patterns/facade-pattern
  - /patterns/proxy-pattern-caching
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Adapter con ejemplos prácticos en Python, Java y JavaScript. Patrón estructural para hacer que interfaces incompatibles trabajen juntas."
  keywords:
    - adapter pattern
    - patrón de diseño
    - patrón estructural
    - compatibilidad de interfaces
    - wrapper
    - python adapter
    - java adapter
    - javascript adapter





---

# Patrón Adapter

## Visión general

El Patrón Adapter es un patrón de diseño estructural que permite que objetos con interfaces incompatibles colaboren. Envuelve una clase existente con una nueva interfaz para que sea compatible con las expectativas del cliente.

Es el equivalente software de un adaptador de corriente físico: convierte una interfaz en otra sin modificar el dispositivo original.

## Cuándo usarlo

Usa el Patrón Adapter cuando:
- Quieres usar una clase existente cuya interfaz es incompatible con el resto de tu código. Consulta [Strategy Pattern](/patterns/design/strategy-pattern) para selección de comportamiento en runtime.
- Necesitas reutilizar código legacy o de terceros que no coincide con tus interfaces. Consulta [Facade Pattern](/patterns/design/adapter-pattern) para simplificar APIs complejas.
- Quieres crear una interfaz unificada a través de varias clases con APIs diferentes
- No puedes o no deberías modificar el código fuente de la clase incompatible. Consulta [Decorator Pattern](/patterns/design/decorator-pattern) para extender comportamiento sin herencia.
- Necesitas traducir formatos de datos o convenciones de llamada entre sistemas

## Solución

### Python

```python
class OldPrinter:
    def old_print(self, text: str):
        print(f"OldPrinter: {text}")

class PrinterAdapter:
    def __init__(self, old_printer: OldPrinter):
        self._old = old_printer

    def print(self, text: str):
        self._old.old_print(text)

# Uso
adapter = PrinterAdapter(OldPrinter())
adapter.print("Hello World")  # OldPrinter: Hello World
```

### JavaScript

```javascript
class OldPrinter {
  oldPrint(text) {
    console.log(`OldPrinter: ${text}`);
  }
}

class PrinterAdapter {
  constructor(oldPrinter) {
    this.old = oldPrinter;
  }

  print(text) {
    this.old.oldPrint(text);
  }
}

// Uso
const adapter = new PrinterAdapter(new OldPrinter());
adapter.print("Hello World"); // OldPrinter: Hello World
```

### Java

```java
class OldPrinter {
    void oldPrint(String text) {
        System.out.println("OldPrinter: " + text);
    }
}

interface ModernPrinter {
    void print(String text);
}

class PrinterAdapter implements ModernPrinter {
    private final OldPrinter oldPrinter;

    PrinterAdapter(OldPrinter oldPrinter) {
        this.oldPrinter = oldPrinter;
    }

    public void print(String text) {
        oldPrinter.oldPrint(text);
    }
}

// Uso
ModernPrinter printer = new PrinterAdapter(new OldPrinter());
printer.print("Hello World"); // OldPrinter: Hello World
```

## Explicación

El Patrón Adapter consiste en:

- **Interfaz Target** (`ModernPrinter`): La interfaz que el cliente espera
- **Adaptee** (`OldPrinter`): La clase existente con la interfaz incompatible
- **Adapter** (`PrinterAdapter`): Envuelve el adaptee y expone la interfaz target

El adapter traduce llamadas desde la interfaz target a llamadas que el adaptee entiende. Ni el cliente ni el adaptee necesitan cambiar.

## Variantes

| Variante | Caso de uso | Compromiso |
|----------|-------------|------------|
| **Object Adapter** | Envuelve una instancia (composición) | Flexible, puede adaptar subclases |
| **Class Adapter** | Hereda del adaptee (herencia múltiple) | Menos flexible, no posible en todos los lenguajes |
| **Two-way Adapter** | Ambas interfaces son usables | Más complejo, pero bidireccional |

## Lo que funciona

- **Prefiere composición sobre herencia** para adapters (object adapter pattern)
- **Mantén el adapter delgado**: Debería traducir llamadas, no añadir lógica de negocio
- **Documenta el mapeo**: Explica cómo los métodos target se mapean a métodos del adaptee
- **Maneja nulls y excepciones** gracefulmente durante la traducción
- **Considera [caching](/recipes/performance/caching-strategies)**: Si la traducción involucra computación pesada, cachea resultados

## Técnicas Avanzadas

### Adapter bidireccional para compatibilidad bidireccional

Soporta ambas interfaces target y adaptee para máxima flexibilidad:

```python
# Python: Adapter bidireccional
class OldPrinter:
    def old_print(self, text: str):
        print(f"OldPrinter: {text}")

class ModernPrinter:
    def print(self, text: str):
        print(f"ModernPrinter: {text}")

class BiDirectionalPrinterAdapter:
    def __init__(self, old_printer: OldPrinter, new_printer: ModernPrinter):
        self._old = old_printer
        self._new = new_printer

    def print(self, text: str):
        # Interfaz target (ModernPrinter)
        self._old.old_print(text)

    def old_print(self, text: str):
        # Interfaz adaptee (OldPrinter)
        self._new.print(text)

# Uso con ambas interfaces
adapter = BiDirectionalPrinterAdapter(OldPrinter(), ModernPrinter())
adapter.print("Hello")  # Usa interfaz ModernPrinter, llama OldPrinter
adapter.old_print("World")  # Usa interfaz OldPrinter, llama ModernPrinter
```

### Adapter con transformación de datos

Transforma formatos de datos entre representaciones incompatibles:

```java
// Java: Adapter de transformación de datos
class LegacyData {
    String[] names;
    int[] ages;
}

class ModernPerson {
    String name;
    int age;
}

interface PersonRepository {
    List<ModernPerson> getAllPeople();
}

class LegacyDataAdapter implements PersonRepository {
    private final LegacyData legacyData;

    LegacyDataAdapter(LegacyData legacyData) {
        this.legacyData = legacyData;
    }

    public List<ModernPerson> getAllPeople() {
        List<ModernPerson> people = new ArrayList<>();
        for (int i = 0; i < legacyData.names.length; i++) {
            ModernPerson person = new ModernPerson();
            person.name = legacyData.names[i];
            person.age = legacyData.ages[i];
            people.add(person);
        }
        return people;
    }
}
```

### Adapter con cache para rendimiento

Añade cache a operaciones de traducción costosas:

```javascript
// JavaScript: Adapter con cache
class CachedAdapter {
  constructor(adaptee) {
    this.adaptee = adaptee;
    this.cache = new Map();
  }

  async getData(key) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const data = await this.adaptee.fetchLegacyData(key);
    const transformed = this.transform(data);
    this.cache.set(key, transformed);
    return transformed;
  }

  transform(data) {
    // Lógica de transformación costosa
    return data.map(item => ({
      id: item.legacyId,
      name: item.legacyName,
      value: item.legacyValue * 2
    }));
  }

  invalidate(key) {
    this.cache.delete(key);
  }
}
```

### Composición de adapter para múltiples adaptees

Envuelve múltiples adaptees para proporcionar una interfaz unificada:

```python
# Python: Adapter multi-adaptee
class DatabaseReader:
    def read_user(self, user_id: int) -> dict:
        return {"id": user_id, "name": "DB User"}

class CacheReader:
    def get_user(self, user_id: int) -> dict:
        return {"id": user_id, "name": "Cached User"}

class UnifiedUserAdapter:
    def __init__(self, db_reader: DatabaseReader, cache_reader: CacheReader):
        self.db = db_reader
        self.cache = cache_reader

    def get_user(self, user_id: int) -> dict:
        # Intenta cache primero, fallback a base de datos
        try:
            return self.cache.get_user(user_id)
        except KeyError:
            return self.db.read_user(user_id)

# Uso
adapter = UnifiedUserAdapter(DatabaseReader(), CacheReader())
user = adapter.get_user(123)
```

### Adapter con lógica de retry

Añade lógica de retry para adaptees no confiables:

```java
// Java: Adapter con retry
class RetryAdapter implements ModernPrinter {
    private final OldPrinter adaptee;
    private final int maxRetries;
    private final long retryDelayMs;

    RetryAdapter(OldPrinter adaptee, int maxRetries, long retryDelayMs) {
        this.adaptee = adaptee;
        this.maxRetries = maxRetries;
        this.retryDelayMs = retryDelayMs;
    }

    public void print(String text) {
        int attempts = 0;
        while (attempts <= maxRetries) {
            try {
                adaptee.oldPrint(text);
                return;
            } catch (Exception e) {
                attempts++;
                if (attempts <= maxRetries) {
                    try {
                        Thread.sleep(retryDelayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Interrumpido durante retry", ie);
                    }
                }
            }
        }
        throw new RuntimeException("Falló después de " + maxRetries + " retries");
    }
}
```

### Adapter con logging y monitoreo

Añade observabilidad a operaciones de adapter:

```javascript
// JavaScript: Adapter con logging
class LoggingAdapter {
  constructor(adaptee, logger) {
    this.adaptee = adaptee;
    this.logger = logger;
  }

  print(text) {
    const startTime = Date.now();
    this.logger.info('Adapter: Llamando adaptee con texto', { text });

    try {
      this.adaptee.oldPrint(text);
      const duration = Date.now() - startTime;
      this.logger.info('Adapter: Llamada exitosa', { duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Adapter: Llamada fallida', { error: error.message, duration });
      throw error;
    }
  }
}
```

## Mejores Prácticas

1. **Prefiere composición sobre herencia.** Usa adapters de objeto (composición) en lugar de adapters de clase (herencia) para mayor flexibilidad.
2. **Mantén los adapters delgados.** Los adapters deberían solo traducir interfaces, no añadir lógica de negocio o comportamiento complejo.
3. **Documenta el mapeo.** Documenta claramente cómo los métodos target se mapean a métodos del adaptee para ayudar al mantenimiento futuro.
4. **Maneja excepciones gracefulmente.** Traduce excepciones del adaptee a excepciones target apropiadas o manéjalas apropiadamente.
5. **Considera cache.** Si la traducción involucra computación costosa, cachea resultados para mejorar rendimiento.
6. **Usa interfaces para targets.** Define interfaces target claras para hacer los adapters intercambiables y testeables.
7. **Evita adapters en cascada.** Encadenar múltiples adapters crea indirección y hace el debugging difícil.
8. **Prueba adapters exhaustivamente.** Escribe unit tests para la lógica de traducción e integration tests con adaptees reales.
9. **Monitorea rendimiento de adapter.** Rastrea métricas de latencia de llamadas de adapter, tasas de error y tasas de cache hit.
10. **Versiona adapters cuando sea necesario.** Si la interfaz del adaptee cambia, versiona tus adapters para soportar múltiples versiones simultáneamente.

## Errores Comunes

1. **Adapters gordos.** Añadir lógica de negocio en lugar de solo traducción de interfaz. Mantén los adapters enfocados solo en traducción.
2. **Adapters filtrados.** Exponer métodos del adaptee a través de la interfaz del adapter, rompiendo la abstracción.
3. **Adapters en cascada.** Encadenar múltiples adapters crea un infierno de indirección y hace el mantenimiento difícil.
4. **Ignorar excepciones.** No traducir o manejar errores del adaptee apropiadamente, llevando a manejo de errores inconsistente.
5. **Modificar el adaptee.** Todo el punto del patrón adapter es dejar la clase original intacta.
6. **Sobre-ingeniería de casos simples.** Usar adapters cuando una función wrapper simple sería suficiente.
7. **Acoplamiento tight al adaptee.** Hacer el adapter demasiado dependiente de detalles de implementación específicos del adaptee.
8. **Olvidar checks de null.** No manejar valores null o undefined del adaptee, causando errores en runtime.
9. **Saltar documentación.** Fallar en documentar la lógica de traducción hace el mantenimiento futuro difícil.
10. **Mezclar concerns.** Combinar lógica de adapter con otros concerns como logging, cache o lógica de retry en una sola clase.

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Adapter y Facade?**
R: Adapter hace compatible una interfaz incompatible. [Facade](/patterns/design/facade-pattern) simplifica un subsistema complejo proporcionando una única interfaz unificada a múltiples clases.

**P: ¿Puedo adaptar múltiples clases a la vez?**
R: Sí. Un único adapter puede envolver múltiples adaptees y coordinarlos para proporcionar una interfaz unificada.

**P: ¿Es Adapter un workaround para mal diseño?**
R: A veces, pero a menudo es un puente pragmático cuando integras código externo o legacy que no puedes modificar.

**P: ¿Cómo se diferencia Adapter de Decorator?**
R: Adapter cambia la interfaz de un objeto. [Decorator](/patterns/design/decorator-pattern) añade comportamiento sin cambiar la interfaz.

**P: ¿Debería usar Adapter o Strategy para selección de comportamiento en runtime?**
R: Usa [Strategy](/patterns/design/strategy-pattern) cuando necesitas intercambiar algoritmos en runtime. Usa Adapter cuando necesitas hacer que interfaces incompatibles trabajen juntas.

**P: ¿Pueden los adapters anidarse?**
R: Aunque técnicamente posible, anidar adapters (cascada) generalmente se desaconseja ya que crea indirección y hace el código difícil de entender y debuggear.

**P: ¿Cómo pruebo un adapter?**
R: Escribe unit tests con adaptees mock para probar la lógica de traducción. Escribe integration tests con adaptees reales para verificar comportamiento end-to-end.

**P: ¿Deberían los adapters manejar autenticación?**
R: No. La autenticación debería manejarse separadamente, típicamente por un cliente HTTP o interceptor. Los adapters deberían enfocarse solo en traducción de interfaz.

**P: ¿Puedo usar Adapter para conversión de formato de datos?**
R: Sí. Los adapters se usan comúnmente para transformar formatos de datos entre diferentes representaciones (ej. XML a JSON, formatos legacy a formatos modernos).

**P: ¿Es este patrón adecuado para proyectos pequeños?**
R: Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

**P: ¿Cómo se compara este patrón con alternativas?**
R: Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

**P: ¿Puedo aplicar este patrón parcialmente?**
R: Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
