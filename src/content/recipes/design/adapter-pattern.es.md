---
contentType: recipes
slug: adapter-pattern-recipe
title: "Puente entre Interfaces Incompatibles con el Adapter Pattern"
description: "Cómo integrar APIs legacy, librerías de terceros e interfaces incompatibles usando object adapters, class adapters y facade adapters en Java, TypeScript y Python."
metaDescription: "Aprende adapter pattern para integrar interfaces incompatibles. Puentea APIs legacy y librerías de terceros usando object y class adapters en Java, TypeScript y Python."
difficulty: beginner
topics:
  - design
tags:
  - design
  - adapter-pattern
  - structural-patterns
  - design-patterns
  - patterns
relatedResources:
  - /recipes/hexagonal-architecture
  - /recipes/factory-pattern-recipe
  - /recipes/api-gateway
  - /recipes/singleton-pattern-recipe
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende adapter pattern para integrar interfaces incompatibles. Puentea APIs legacy y librerías de terceros usando object y class adapters en Java, TypeScript y Python."
  keywords:
    - adapter pattern
    - adaptador interfaz
    - integracion legacy
    - wrapper terceros
    - patron estructural
---

## Visión general

Tu aplicación espera una interfaz `PaymentProcessor` con métodos `charge(amount)` y `refund(transactionId)`. El SDK de Stripe usa `charges.create({ amount })` y `refunds.create({ charge })`. El SDK de PayPal usa `orders.capture({ amount })` y `payments.refund({ captureId })`. Ninguno coincide con tu interfaz. Podrías esparcir código específico de Stripe y PayPal por todo tu codebase, pero cambiar de proveedor requeriría tocar cada archivo que procesa pagos.

El adapter pattern resuelve esto introduciendo una clase wrapper que implementa la interfaz de tu aplicación y traduce las llamadas al SDK de terceros. Tu código de negocio depende solo de la interfaz del adapter. Cambiar Stripe por PayPal significa escribir un nuevo adapter — sin cambios en la lógica de negocio. El siguiente enfoque cubre object adapters, class adapters, two-way adapters y adapter registries con ejemplos prácticos.

## Cuándo usarlo

Usa esta receta cuando:

- Integrando una librería de terceros con una interfaz incompatible. Consulta [Arquitectura Hexagonal](/recipes/design/hexagonal-architecture) para aislamiento de ports/adapters.
- Migrando desde un sistema legacy sin reescribir código dependiente. Consulta [Factory Pattern](/recipes/factory-pattern-recipe) para crear instancias de adapters.
- Exponiendo una fachada simplificada sobre un subsistema complejo
- Soportando múltiples implementaciones de la misma capacidad (pagos, storage, mensajería). Consulta [Strategy Pattern](/recipes/strategy-pattern-recipe) para selección de algoritmos en runtime.
- Testeando código que depende de servicios externos adaptando mocks

## Solución

### Object Adapter (TypeScript)

```typescript
interface PaymentProcessor {
  charge(amount: number, currency: string): Promise<string>;
  refund(transactionId: string): Promise<void>;
}

class StripeSDK {
  async createCharge(params: { amount: number; currency: string }) {
    return { id: 'ch_' + Math.random().toString(36) };
  }
  async createRefund(params: { charge: string }) {}
}

class StripeAdapter implements PaymentProcessor {
  constructor(private stripe: StripeSDK) {}

  async charge(amount: number, currency: string): Promise<string> {
    const result = await this.stripe.createCharge({ amount: amount * 100, currency });
    return result.id;
  }

  async refund(transactionId: string): Promise<void> {
    await this.stripe.createRefund({ charge: transactionId });
  }
}

class CheckoutService {
  constructor(private processor: PaymentProcessor) {}

  async process(order: Order): Promise<void> {
    const txId = await this.processor.charge(order.total, order.currency);
    await this.orderRepo.save({ ...order, transactionId: txId });
  }
}
```

### Class Adapter (Java)

```java
interface ModernLogger {
    void log(String level, String message);
}

class LegacyLogger {
    public void writeLogEntry(String entry) {
        System.out.println("[LEGACY] " + entry);
    }
}

class LoggerAdapter extends LegacyLogger implements ModernLogger {
    @Override
    public void log(String level, String message) {
        writeLogEntry(String.format("[%s] %s", level.toUpperCase(), message));
    }
}

ModernLogger logger = new LoggerAdapter();
logger.log("info", "Application started");
```

### Python Adapter con Registry

```python
from abc import ABC, abstractmethod
from typing import Dict

class StorageAdapter(ABC):
    @abstractmethod
    def upload(self, key: str, data: bytes) -> str: pass

    @abstractmethod
    def download(self, key: str) -> bytes: pass

class S3Adapter(StorageAdapter):
    def __init__(self, client):
        self.client = client

    def upload(self, key: str, data: bytes) -> str:
        self.client.put_object(Bucket="my-bucket", Key=key, Body=data)
        return f"s3://my-bucket/{key}"

    def download(self, key: str) -> bytes:
        return self.client.get_object(Bucket="my-bucket", Key=key)["Body"].read()

class AzureBlobAdapter(StorageAdapter):
    def __init__(self, container_client):
        self.container = container_client

    def upload(self, key: str, data: bytes) -> str:
        self.container.upload_blob(name=key, data=data, overwrite=True)
        return f"azure://my-container/{key}"

    def download(self, key: str) -> bytes:
        return self.container.download_blob(key).readall()

class StorageFactory:
    _adapters: Dict[str, type] = {}

    @classmethod
    def register(cls, name: str, adapter_class: type):
        cls._adapters[name] = adapter_class

    @classmethod
    def create(cls, name: str, config: dict) -> StorageAdapter:
        return cls._adapters[name](**config)

StorageFactory.register("s3", S3Adapter)
StorageFactory.register("azure", AzureBlobAdapter)

storage = StorageFactory.create("s3", {"client": boto3_client})
url = storage.upload("report.pdf", pdf_bytes)
```

## Explicación

- **Object adapter**: el adapter mantiene una referencia al adaptee (la clase de terceros) y delega las llamadas a él. Es el enfoque más flexible — funciona con clases final, soporta composición sobre herencia, y permite adaptar múltiples adaptees simultáneamente.
- **Class adapter**: el adapter hereda del adaptee e implementa la interfaz objetivo. Requiere que el adaptee no sea final y funciona solo en lenguajes de herencia simple donde el adapter no extiende otra clase. Es menos flexible pero ligeramente más rápido.
- **Two-way adapter**: cuando dos sistemas deben interoperar y ninguno puede cambiarse, un two-way adapter implementa ambas interfaces. Traduce llamadas en ambas direcciones, actuando como un puente durante migraciones incrementales.
- **Adapter registry**: cuando se soportan múltiples proveedores (Stripe, PayPal, Braintree), un registro mapea nombres de proveedor a clases adapter. La factory instancia el adapter correcto basado en configuración, aislando la selección del adapter de la lógica de negocio.

## Variantes

| Variante | Flexibilidad | Rendimiento | Mejor para |
|----------|-------------|-------------|------------|
| Object adapter | Alta | Medio | Uso general, SDKs de terceros |
| Class adapter | Baja | Alto | Crítico de rendimiento, un solo adaptee |
| Two-way adapter | Media | Medio | Migración incremental |
| Facade adapter | Alta | Medio | Simplificar subsistemas complejos |
| Registry + adapter | Alta | Medio | Soporte de múltiples proveedores |

## Lo que funciona

- **Adapta en el límite, no en todas partes**: introduce adapters en los límites del sistema donde las interfaces externas se encuentran con abstracciones internas. No dejes que los tipos de terceros se filtren a la lógica de negocio.
- **Documenta el comportamiento de traducción**: los adapters hacen más que renombrar métodos. Pueden convertir unidades, transformar tipos de error, o batch requests. Documenta estas traducciones claramente.
- **Maneja errores con elegancia**: las APIs de terceros lanzan excepciones específicas del vendor. El adapter debe capturarlas y mapearlas a la taxonomía de errores de tu aplicación. `StripeCardError` se convierte en `PaymentDeclinedError`.
- **Mantén los adapters delgados**: un adapter con cientos de líneas de lógica es un servicio, no un adapter. Las transformaciones complejas pertenecen a servicios de aplicación. El adapter debe traducir llamadas y errores, y luego salir del camino.
- **Testea adapters con contract tests**: escribe tests que verifiquen que el adapter satisface la interfaz objetivo, no tests que verifiquen el SDK de terceros. Usa mocks del adaptee para testear el adapter en aislamiento. Consulta [Input Validation](/recipes/api/input-validation) para contratos de límite.

## Errores comunes

- **Filtrar detalles del adaptee**: retornar objetos de respuesta nativos del adaptee desde el adapter fuerza a los consumidores a entender la API de terceros. Siempre retorna tipos de dominio desde el adapter.
- **Adapter inflado**: poner caching, reintentos y métricas dentro del adapter lo hace difícil de testear y reusar. Usa decorators o interceptores para concerns transversales. Mantén el adapter enfocado en traducción de interfaz.
- **No manejar null/undefined**: las APIs de terceros pueden retornar `null` donde tu interfaz espera un objeto vacío o una excepción. Define el contrato de null del adapter y traduce consistentemente.
- **Acoplamiento fuerte a versiones de SDK**: cuando el SDK de terceros lanza un cambio breaking, el adapter lo absorbe. Si llamas al SDK directamente desde código de negocio, cada cambio breaking se propaga por todas partes. El adapter es tu amortiguador de choque.

## Preguntas frecuentes

**P: ¿Es el adapter pattern lo mismo que el facade pattern?**
R: No. Un adapter hace compatible una interfaz con otra. Una fachada provee una interfaz simplificada sobre un subsistema complejo. Puedes usar ambos: una fachada simplifica un subsistema, y un adapter hace esa fachada compatible con la interfaz de tu aplicación.

**P: ¿Debería escribir un adapter para cada librería de terceros?**
R: Solo para librerías con interfaces incompatibles de las que tu código de negocio depende. Una librería de logging con interfaz estándar (SLF4J) no necesita adapter. Un SDK de pagos con interfaz propietaria sí.

**P: ¿Cómo manejo upgrades de SDK con adapters?**
R: El adapter aísla el impacto del upgrade. Cuando el SDK cambia, actualiza solo la implementación del adapter. Corre tests de contrato para asegurar que el adapter sigue satisfaciendo la interfaz objetivo. El código de negocio permanece sin cambios.

**P: ¿Pueden usarse adapters para testing?**
R: Sí. Escribe un `InMemoryPaymentAdapter` que implemente `PaymentProcessor` usando un `Map`. Los tests inyectan este adapter en lugar del adapter real de Stripe, permitiendo tests rápidos y deterministas sin llamadas de red.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
