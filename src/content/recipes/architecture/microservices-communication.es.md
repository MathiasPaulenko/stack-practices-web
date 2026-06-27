---
contentType: recipes
slug: microservices-communication
title: "Patrones de Comunicación entre Microservicios"
description: "Elige entre patrones de comunicación síncronos y asíncronos para arquitecturas de microservicios resilientes."
metaDescription: "Patrones de comunicación en microservicios: REST, gRPC, messaging, event-driven, sagas y circuit breakers para sistemas distribuidos resilientes."
difficulty: advanced
topics:
  - architecture
tags:
  - microservicios
  - comunicación
  - sistemas-distribuidos
  - arquitectura
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/monolith-to-microservices-migration-guide
  - /guides/software-architecture-guide
  - /guides/system-design-interview-guide
  - /guides/cap-theorem-guide
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Patrones de comunicación en microservicios: REST, gRPC, messaging, event-driven, sagas y circuit breakers para sistemas distribuidos resilientes."
  keywords:
    - microservicios
    - comunicación
    - sistemas distribuidos
    - arquitectura
---

## Visión General

Los microservicios deben intercambiar datos para cumplir con las solicitudes de los usuarios, pero elegir el estilo de comunicación equivocado puede convertir un sistema distribuido en una red frágil y fuertemente acoplada. Cada interacción entre servicios es un punto potencial de fallo: picos de latencia, fallos parciales, particiones de red y errores en cascada pueden surgir de una sola dependencia lenta.

Esta receta compara los principales patrones de comunicación utilizados en microservicios productivos: llamadas síncronas REST y gRPC, mensajería asíncrona con brokers de mensajes, y arquitecturas orientadas a eventos. Aprenderás cuándo usar cada uno, cómo hacerlos resilientes con reintentos, timeouts, circuit breakers e idempotencia, y cómo coordinar transacciones de negocio de larga duración con sagas.

## Cuándo Usar

Usa este recurso cuando:
- Debas elegir entre comunicación síncrona ([REST](/recipes/api/call-rest-api), [gRPC](/recipes/api/grpc-api)) y asíncrona ([messaging](/recipes/messaging/kafka-event-streaming), [event-driven](/recipes/architecture/event-driven-architecture)).
- Diseñes comunicación resiliente con [circuit breakers](/recipes/circuit-breaker-pattern-recipe) y [reintentos](/recipes/architecture/retry-backoff).
- Coordines transacciones distribuidas con [sagas](/recipes/saga-pattern-recipe).

## Solución

### Llamada REST síncrona

```python
# Python con httpx
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def get_order(order_id: str) -> dict:
    with httpx.Client(timeout=5.0) as client:
        r = client.get(f"http://orders-service/orders/{order_id}")
        r.raise_for_status()
        return r.json()
```

```javascript
// JavaScript con fetch
async function getOrder(orderId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const res = await fetch(`http://orders-service/orders/${orderId}`, {
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

```java
// Java con RestTemplate
import org.springframework.web.client.RestTemplate;

RestTemplate rest = new RestTemplate();
Order order = rest.getForObject(
  "http://orders-service/orders/{id}", Order.class, orderId);
```

### Productor de mensajes asíncronos

```python
# Python con RabbitMQ (pika)
import pika, json

def publish_order_created(order: dict):
    conn = pika.BlockingConnection(pika.ConnectionParameters('rabbitmq'))
    ch = conn.channel()
    ch.queue_declare(queue='orders.created')
    ch.basic_publish(
        exchange='',
        routing_key='orders.created',
        body=json.dumps(order).encode()
    )
    conn.close()
```

```javascript
// Node.js con Kafka (kafkajs)
const { Kafka } = require('kafkajs');
const kafka = new Kafka({ brokers: ['kafka:9092'] });
const producer = kafka.producer();

async function publishOrderCreated(order) {
  await producer.connect();
  await producer.send({
    topic: 'orders.created',
    messages: [{ key: order.id, value: JSON.stringify(order) }],
  });
  await producer.disconnect();
}
```

## Explicación

La **comunicación síncrona** es el modelo mental más simple: el servicio A llama al servicio B y espera una respuesta. REST sobre HTTP es la opción predeterminada porque es ubicuo, independiente del lenguaje y fácil de depurar. gRPC es más adecuado cuando importan la baja latencia, los payloads binarios y los contratos fuertemente tipados. El costo de las llamadas síncronas es el acoplamiento temporal: si el servicio downstream es lento o está caído, el llamador también se ve afectado.

La **comunicación asíncrona** desacopla los servicios introduciendo un broker de mensajes. El productor envía un mensaje y continúa inmediatamente; el consumidor lo procesa a su propio ritmo. Esto mejora la resiliencia y el throughput, pero añade complejidad operativa (clustering del broker, dead-letter queues, ordenamiento de mensajes) y dificulta la depuración porque no hay una única stack trace.

Las **arquitecturas orientadas a eventos** extienden la mensajería haciendo que los cambios de estado sean observables como eventos de dominio. Los consumidores se suscriben a los eventos relevantes, permitiendo capacidades de negocio débilmente acopladas. Usa este patrón cuando múltiples servicios deban reaccionar al mismo hecho sin conocerse entre sí.

Los **patrones de resiliencia** son obligatorios en cualquier estilo. Agrega timeouts del lado del cliente para dejar de esperar a un peer lento, reintentos con backoff exponencial y jitter para recuperarte de fallos transitorios, circuit breakers para fallar rápido cuando un servicio está inestable, y claves de idempotencia para hacer que los reintentos sean seguros.

Las **sagas** reemplazan a las transacciones distribuidas. Una saga es una secuencia de transacciones locales, cada una seguida de un evento o mensaje. Si un paso falla, las acciones compensatorias deshacen los pasos anteriores. Esto mantiene los servicios autónomos mientras se preserva la consistencia de negocio.

## Variantes

| Estilo | Protocolo | Mejor Para | Compromisos |
|--------|-----------|------------|-------------|
| REST | HTTP/JSON | Uso general, clientes de navegador, APIs públicas | Mayor latencia, contratos flexibles |
| gRPC | HTTP/2 + Protobuf | Servicio a servicio interno, alto throughput | Requiere tooling, menos legible para humanos |
| Messaging | AMQP, SQS, Kafka | Jobs de fondo, nivelación de carga, desacoplamiento | Overhead del broker, consistencia eventual |
| Event-driven | Kafka, event bus | Múltiples consumidores, auditoría, flujos complejos | Evolución de esquemas de eventos, coordinación de consumidores |
| GraphQL | HTTP | Queries flexibles, clientes móviles | Complejidad del servidor, desafíos de caché |

## Mejores Prácticas

1. **Prefiere la comunicación asíncrona para operaciones de larga duración o no críticas.** Usa mensajería o eventos cuando el llamador no necesita un resultado inmediato.
2. **Configura timeouts agresivos y presupuestos de reintento pequeños.** Una tormenta de reintentos puede amplificar una interrupción parcial. Limita los reintentos a 3 intentos y usa backoff exponencial con jitter.
3. **Haz que las llamadas a downstream sean idempotentes.** Pasa un header `Idempotency-Key` para que las solicitudes duplicadas causadas por reintentos no produzcan efectos secundarios.
4. **Despliega circuit breakers alrededor de cada dependencia externa.** Abre el circuito tras un umbral de fallos y degrada gracefulmente en lugar de propagar el error.
5. **Mantén las compensaciones de sagas simples y reversibles.** Cada paso de una saga debe tener una acción compensatoria clara que pueda ejecutarse en segundo plano.

## Errores Comunes

1. **Encadenar llamadas síncronas a través de muchos servicios.** Cada salto añade latencia y superficie de fallo; los grafos profundos de llamadas se vuelven frágiles.
2. **Reintentar sin idempotencia.** Reintentar un POST puede crear pedidos, cargos o envíos duplicados.
3. **Ignorar el ordenamiento de mensajes.** Kafka con múltiples particiones puede reordenar mensajes; usa mensajes con clave o idempotencia si el orden importa.
4. **Compartir una base de datos entre servicios.** El acoplamiento directo a la base de datos anula el propósito de los microservicios y bloquea el despliegue independiente.
5. **Bloquear al llamador con un consumidor lento.** Si el consumidor no puede seguir el ritmo, las colas crecen y los productores eventualmente sufren back-pressure o caídas.

## Preguntas Frecuentes

**P: ¿Cuándo debo usar REST en lugar de gRPC?**
R: Usa REST para APIs públicas, clientes de navegador y equipos que valoran payloads legibles. Usa gRPC para llamadas internas de alto throughput y baja latencia donde los contratos Protobuf fuertemente tipados y el streaming son beneficiosos.

**P: ¿Cómo evito fallos en cascada en llamadas síncronas?**
R: Combina timeouts, reintentos con backoff exponencial, circuit breakers y bulkheads. Considera también cachear datos de solo lectura localmente para que tu servicio sobreviva a una caída downstream.

**P: ¿Cuál es la diferencia entre messaging y arquitectura orientada a eventos?**
R: El messaging es un patrón de transporte: un productor envía un mensaje a uno o más consumidores. La arquitectura orientada a eventos es un estilo de diseño donde los servicios publican hechos sobre cambios de estado y otros servicios se suscriben y reaccionan de forma independiente. El messaging es la tubería; el event-driven es la filosofía.

**P: ¿Puedo usar sagas con llamadas síncronas?**
R: Las sagas son más naturales con eventos o mensajes asíncronos porque cada paso se completa antes de que se dispare el siguiente. Puedes orquestar sagas de forma síncrona, pero eso reintroduce acoplamiento y los timeouts deben gestionarse cuidadosamente.

**P: ¿Cómo manejo la duplicación de mensajes desde un broker?**
R: Diseña consumidores idempotentes. Almacena los IDs de mensajes procesados en una tabla de deduplicación o usa las configuraciones de productor idempotente del broker cuando estén disponibles.
