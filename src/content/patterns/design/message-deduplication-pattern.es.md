---



contentType: patterns
slug: message-deduplication-pattern
title: "Patrón Message Deduplication"
description: "Prevenir procesamiento duplicado rastreando IDs de mensaje con claves de idempotencia. Los consumidores verifican un almacen antes de procesar para saltar mensajes ya manejados."
metaDescription: "Prevenir procesamiento duplicado con claves de idempotencia. Rastrear IDs de mensaje en un almacen y saltar mensajes ya procesados en los consumidores."
difficulty: intermediate
topics:
  - messaging
  - architecture
tags:
  - message-deduplication
  - patron
  - patron-diseno
  - idempotency
  - exactly-once
  - deduplication
  - message-queue
relatedResources:
  - /patterns/message-queue-load-leveling-pattern
  - /patterns/dead-letter-channel-pattern
  - /patterns/publish-subscribe-pattern
  - /patterns/message-deferral-pattern
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Prevenir procesamiento duplicado con claves de idempotencia. Rastrear IDs de mensaje en un almacen y saltar mensajes ya procesados en los consumidores."
  keywords:
    - patron message deduplication
    - clave idempotencia
    - procesamiento exactly once
    - patron diseno



---

## Descripción General

Los brokers de mensajes garantizan entrega at-least-once, lo que significa que los consumidores pueden recibir el mismo mensaje mas de una vez. Reintentos de red, caidas del consumidor durante el procesamiento y reentregas del broker causan duplicados. Sin deduplicacion, un pago puede procesarse dos veces o una notificacion enviarse multiples veces.

El patron Message Deduplication rastrea IDs de mensaje en un almacen. Antes de procesar, el consumidor verifica si el ID ya fue manejado. Si si, salta el procesamiento. Si no, procesa el mensaje y registra el ID.

## Cuándo Usar


- For alternatives, see [Idempotent Consumer Pattern](/es/patterns/idempotent-consumer-pattern/).

- Tu broker de mensajes proporciona entrega at-least-once (la mayoria: SQS, RabbitMQ, Kafka)
- Procesar un mensaje dos veces causa efectos secundarios (pagos, emails, cambios de inventario)
- Necesitas semantica exactly-once sin un broker que la soporte nativamente
- Los consumidores caen y los mensajes se reentregan
- Procesas webhooks de servicios de terceros que pueden reintentar en fallos de red
- Consumes de multiples colas y necesitas deduplicacion cross-queue

## Cuándo Evitar

- **Tu broker proporciona exactly-once nativamente.** Las transacciones de Kafka y SQS FIFO con dedup basada en contenido ya manejan esto. Anadir dedup a nivel aplicacion es redundante.
- **Los mensajes son idempotentes por naturaleza.** Si procesar dos veces no tiene efectos secundarios (ej., actualizar un timestamp de ultima vista), dedup anade overhead sin valor.
- **El throughput es critico y cada milisegundo cuenta.** Dedup con Redis anade ~0.5ms por mensaje. Para sistemas de ultra-baja-latencia, confia en las garantias del broker.
- **No puedes permitirte una dependencia de almacen de dedup.** Si el downtime de Redis es inaceptable y no puedes caer a procesamiento idempotente, reconsidera la arquitectura.
- **Los mensajes no tienen ID unico natural.** Generar hashes de contenido para cada mensaje anade overhead de CPU y puede dedup incorrectamente para casos mismo-payload-diferente-intencion.

## Solución

### Python (Redis + SQS)

```python
import redis
import json
import hashlib

r = redis.Redis(host="localhost", port=6379, db=0)
DEDUP_TTL = 86400  # 24 horas

def process_message(message_id, payload):
    # Verificar si ya fue procesado
    dedup_key = f"dedup:{message_id}"
    if r.exists(dedup_key):
        print(f"Skipping duplicate message {message_id}")
        return

    # Procesar el mensaje
    result = handle_order(payload)

    # Marcar como procesado con TTL
    r.setex(dedup_key, DEDUP_TTL, "1")
    print(f"Processed message {message_id}")

def handle_order(payload):
    order = json.loads(payload)
    print(f"Charging payment for order {order['order_id']}")
    return {"status": "charged"}

# Simular entrega duplicada
process_message("msg-001", '{"order_id": 42}')
process_message("msg-001", '{"order_id": 42}')  # Saltado
```

### JavaScript (Redis + BullMQ)

```javascript
import Redis from "ioredis";
import { Worker } from "bullmq";

const redis = new Redis({ host: "localhost", port: 6379 });
const DEDUP_TTL = 86400; // 24 horas

async function isDuplicate(messageId) {
  const key = `dedup:${messageId}`;
  const result = await redis.set(key, "1", "EX", DEDUP_TTL, "NX");
  // result es "OK" si la clave fue establecida (primera vez), null si ya existia
  return result === null;
}

const worker = new Worker(
  "orders",
  async (job) => {
    const messageId = job.data.messageId;
    const payload = job.data.payload;

    if (await isDuplicate(messageId)) {
      console.log(`Skipping duplicate message ${messageId}`);
      return { status: "skipped" };
    }

    // Procesar el mensaje
    console.log(`Charging payment for order ${payload.orderId}`);
    return { status: "processed" };
  },
  { connection: { host: "localhost", port: 6379 } }
);
```

### Java (Redis + Spring)

```java
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import java.util.concurrent.TimeUnit;

@Component
public class DeduplicatingConsumer {

    private final StringRedisTemplate redis;
    private static final int DEDUP_TTL = 86400; // 24 horas

    public DeduplicatingConsumer(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void processMessage(String messageId, String payload) {
        String dedupKey = "dedup:" + messageId;

        // Check-and-set atomico: retorna true si la clave fue establecida (primera vez)
        Boolean wasSet = redis.opsForValue()
            .setIfAbsent(dedupKey, "1", DEDUP_TTL, TimeUnit.SECONDS);

        if (Boolean.FALSE.equals(wasSet)) {
            System.out.println("Skipping duplicate message " + messageId);
            return;
        }

        // Procesar el mensaje
        System.out.println("Processing message " + messageId + ": " + payload);
        handleOrder(payload);
    }

    private void handleOrder(String payload) {
        // Logica de negocio aqui
    }
}
```

## Explicación

El patron usa una operacion atomica check-and-set (Redis `SET NX EX`) para determinar si un mensaje fue procesado. La operacion es atomica: solo un consumidor puede establecer la clave, por lo que consumidores concurrentes procesando el mismo mensaje no procederan ambos.

El TTL en la clave de deduplicacion evita que el almacen crezca indefinidamente. Tras expirar el TTL, el mismo ID de mensaje podria procesarse de nuevo. Elige un TTL mayor que tu ventana maxima de reentrega (tipicamente 24 horas para SQS, o el periodo de retencion de la cola).

Para que la deduplicacion funcione, cada mensaje debe llevar un identificador unico. Puede ser un hash de contenido (para deduplicacion basada en payload) o un ID asignado por el productor (para deduplicacion basada en identidad).

## Variantes

| Variante | Almacen | Caso de Uso | Compromiso |
|----------|---------|-------------|------------|
| **Redis SET NX** | Redis | Rapido, compartido entre consumidores | Dependencia externa, expiracion por TTL |
| **Restriccion Unica DB** | SQL DB | Durable, transaccional | Mas lento, anade carga a DB |
| **Hash de Contenido** | Cualquier almacen | Dedup por contenido de payload | Mismo payload siempre se dedup, incluso si diferente intencion |
| **Nativo del Broker** | SQS FIFO | Dedup integrado | Solo colas FIFO, throughput limitado |
| **Set en Memoria** | Memoria del proceso | Consumidor unico, rapido | Se pierde al reiniciar, no compartido entre instancias |

## Qué Funciona

- Usa check-and-set atomico (Redis `SET NX EX`) para evitar race conditions entre consumidores concurrentes
- Establece TTL mayor que la ventana de reentrega del broker
- Usa hashes de contenido cuando los mensajes carecen de IDs explicitos
- Haz consumidores idempotentes como segunda capa de defensa: incluso si dedup falla, procesar dos veces no debe causar dano
- Registra duplicados saltados para debugging y monitoreo
- Usa colas FIFO con deduplicacion basada en contenido cuando el broker lo soporta (SQS FIFO)

## Errores Comunes

- **Check-then-set sin atomicidad**: Dos consumidores verifican simultaneamente, ambos ven que no hay clave, ambos procesan. Siempre usa `SET NX` atomico.
- **TTL demasiado corto**: Si el TTL expira antes de que el broker deje de reentregar, los duplicados pasan. Establece TTL al menos 2x la ventana de reentrega.
- **Usar memoria del proceso para dedup**: Se pierde al reiniciar, no se comparte entre instancias. Usa un almacen externo.
- **No manejar fallos del almacen de dedup**: Si Redis cae, dedup falla. Decide si procesar (riesgo de duplicados) o rechazar (perder mensajes).
- **Clave de dedup basada en campos mutables**: Si la clave incluye campos que cambian, el mismo mensaje logico obtiene claves diferentes y se procesa dos veces.

## Como Funciona

1. **El mensaje llega con ID unico**: Cada mensaje lleva una clave de deduplicacion — ya sea un UUID asignado por el productor o un hash de contenido. El consumidor extrae esta clave antes de procesar.
2. **Check-and-set atomico**: El consumidor intenta `SET NX EX` en la clave de dedup en un almacen compartido (Redis). Si la clave no existe, el consumidor la establece y procede. Si existe, el mensaje ya fue procesado — saltalo.
3. **Procesa el mensaje**: Solo el consumidor que establecio la clave exitosamente procesa el mensaje. Consumidores concurrentes con el mismo ID de mensaje fallan el `SET NX` y saltan.
4. **Expiracion TTL**: Tras el TTL configurado, la clave expira. Esto previene que el almacen crezca indefinidamente. El TTL debe exceder la ventana maxima de reentrega del broker.

La atomicidad de `SET NX` es critica: sin ella, dos consumidores podrian verificar, ambos ver que no hay clave, y ambos procesar el mismo mensaje.

## Mejores Practicas

- **Usa IDs asignados por el productor sobre hashes de contenido.** Los hashes dedup payloads identicos, lo cual puede ser incorrecto si el mismo payload representa operaciones logicas diferentes. Los IDs del productor dedup por identidad, no contenido.
- **Loggea duplicados saltados.** Cuando un consumidor salta un duplicado, loggea el ID del mensaje y timestamp. Ayuda a debuggear problemas de reentrega y medir tasas de duplicados.
- **Monitorea la tasa de hits de dedup.** Si 50% de mensajes son duplicados, algo esta mal upstream — el productor esta reintentando demasiado agresivamente o el consumidor es muy lento para acusar recibo.
- **Usa colas FIFO cuando esten disponibles.** SQS FIFO y partition keys de Kafka proporcionan ordenamiento y dedup a nivel del broker, reduciendo la necesidad de dedup a nivel aplicacion.
- **Degradacion elegante ante fallo del almacen de dedup.** Si Redis cae, decide entre procesar con idempotencia o rechazar. Documenta la eleccion y alerta sobre ello.

## Ejemplos del Mundo Real

### Webhooks de Pago de Stripe

Stripe envia webhooks para eventos de pago. Fallos de red causan que Stripe reintente, entregando el mismo webhook multiples veces. Stripe recomienda usar IDs de evento para deduplicacion: verifica el ID de evento en un almacen antes de procesar. Sin dedup, un solo pago podria disparar multiples fulfillments de pedido.

### SQS + Lambda para Procesamiento de Pedidos

Una plataforma de e-commerce usa SQS para disparar Lambda para procesamiento de pedidos. SQS puede reentregar mensajes si Lambda no acusa recibo a tiempo. La plataforma usa Redis `SET NX` con el ID del pedido como clave de dedup. Entregas duplicadas se saltan, previniendo doble cobro o doble envio.

### Consumidor Kafka con Dedup en Redis

Un pipeline de streaming consume eventos de Kafka y escribe a una base de datos. La entrega at-least-once de Kafka significa que el mismo evento puede consumirse dos veces. El consumidor verifica Redis antes de escribir a la base de datos. Esto proporciona semantica exactly-once sin transacciones de Kafka.

## Preguntas Frecuentes

**P: La deduplicacion es lo mismo que idempotencia?**
R: No. La deduplicacion previene que un mensaje se procese dos veces. La idempotencia significa que procesar un mensaje dos veces tiene el mismo efecto que una vez. Ambas son necesarias: deduplicacion como primera linea, idempotencia como red de seguridad.

**P: Deberia usar hash de contenido o IDs asignados por el productor?**
R: IDs asignados por el productor son mejores cuando el mismo mensaje logico siempre debe dedup. El hash de contenido dedup payloads identicos, lo cual puede ser incorrecto si el mismo payload se envia para operaciones logicas diferentes.

**P: Que pasa si Redis se cae?**
R: Tu consumidor no puede verificar duplicados. Opciones: (1) fallar rapido y reintentar despues, (2) procesar de todos modos y confiar en idempotencia, (3) usar un almacen de respaldo. La mayoria elige opcion 2 con consumidores idempotentes.

**P: Kafka soporta deduplicacion nativamente?**
R: Kafka soporta productores idempotentes (previene mensajes duplicados a nivel productor) y transacciones (semantica exactly-once dentro de Kafka). Para exactly-once entre sistemas, sigue necesitando deduplicacion del lado del consumidor.

**P: Como elijo el TTL correcto para claves de dedup?**
R: Establece TTL al menos 2x la ventana maxima de reentrega del broker. SQS retiene mensajes hasta 14 dias, usa 172800 segundos (48 horas). Para RabbitMQ, verifica el message TTL de la cola y establece el dedup TTL mayor.

**P: Puedo usar una base de datos en lugar de Redis para dedup?**
R: Si. Usa una tabla con restriccion unica en el ID del mensaje. Inserta antes de procesar; si la insercion falla con clave duplicada, salta el mensaje. Es durable y transaccional pero mas lento que Redis y anade carga a la base de datos.

**P: Como manejo dedup con multiples instancias de consumidor?**
R: Usa un almacen compartido (Redis, base de datos) para que todas las instancias verifiquen las mismas claves de dedup. Sets en memoria por instancia no funcionan — cada instancia tiene su propio set y no puede ver lo que otras han procesado.

**P: Cual es el impacto en rendimiento de dedup?**
R: Redis `SET NX EX` es sub-milisegundo. El overhead es insignificante comparado con el procesamiento de mensajes. Dedup basado en base de datos es 5-10ms por verificacion. Para sistemas de alto throughput, Redis es la opcion estandar.

**P: Como testeo deduplicacion?**
R: Envia el mismo ID de mensaje dos veces y verifica que solo uno se procesa. Envia mensajes con IDs diferentes y verifica que ambos se procesan. Testea consumidores concurrentes con el mismo ID de mensaje. Testea failover de Redis para verificar tu estrategia de respaldo.

**P: Deberia dedup antes o despues de procesar?**
R: Antes. Verifica la clave de dedup, luego procesa, luego confirma la clave. Si procesas primero y el consumidor cae antes de establecer la clave, el mensaje se reentrega y se procesa dos veces. Usa `SET NX` atomico antes de procesar para la garantia mas fuerte.

**P: Que hay de dedup en event sourcing?**
R: Event sourcing maneja dedup a nivel del agregado. Cada evento tiene un ID unico. El agregado rechaza eventos con IDs duplicados durante replay. Esto esta integrado en el event store, por lo que no necesitas un almacen de dedup separado.

**P: Puedo usar SQS FIFO dedup en lugar de Redis?**
R: Si. Las colas FIFO de SQS soportan deduplicacion basada en contenido automaticamente. Si produces mensajes con `MessageDeduplicationId`, SQS dedup dentro de una ventana de 5 minutos. Esto elimina la necesidad de Redis pero limita el throughput a 300 TPS.

**P: Como manejo dedup con consumer groups de Kafka?**
R: Los consumer groups de Kafka rebalancean particiones cuando consumidores se unen o salen. Durante rebalancing, un consumidor puede reprocesar mensajes desde el ultimo offset commiteado. Usa dedup con Redis con topic-partition-offset como clave, o usa transacciones de Kafka para exactly-once dentro de Kafka.

**P: Cual es la relacion entre dedup y semantica exactly-once?**
R: Exactly-once requiere tres componentes: (1) productores idempotentes (no mensajes duplicados en la fuente), (2) procesamiento atomico del consumidor (procesar + commitear offset en una transaccion), (3) dedup como red de seguridad. Dedup solo no garantiza exactly-once — es una capa en el stack.

**P: Como limpio claves de dedup expiradas?**
R: El TTL de Redis maneja esto automaticamente — las claves expiran tras el tiempo configurado. Para dedup basado en base de datos, ejecuta un job de limpieza periodico que borre filas mas antiguas que la ventana de reentrega. No borres claves manualmente — deja que TTL o jobs programados lo manejen.

**P: Puedo usar dedup con consumidores batch?**
R: Si. Verifica todos los IDs de mensaje en el lote antes de procesar cualquiera. Usa `MSETNX` de Redis para check multi-key atomico. Procesa solo mensajes que no eran duplicados. Acusa recibo del lote entero solo despues de que todos los mensajes no duplicados se procesen.

**P: Como manejo dedup entre diferentes entornos (dev/staging/prod)?**
R: Usa namespaces o databases separados de Redis para cada entorno. Una clave de dedup en dev no deberia bloquear procesamiento en prod. Prefija claves con el nombre del entorno: `dedup:prod:msg-001` vs `dedup:dev:msg-001`.

**P: Cual es el costo de dedup a escala?**
R: Redis en una instancia c5.large maneja ~100,000 operaciones SET NX por segundo. Para 10,000 mensajes/s, el overhead de dedup es insignificante. Uso de memoria: cada clave es ~50 bytes + overhead. 1M claves de dedup por dia = ~50MB. Establece TTL a 48 horas para limitar memoria a ~100MB.

**P: Deberia usar dedup para comunicacion interna entre servicios?**
R: Si ambos servicios estan bajo tu control y usan transporte confiable (gRPC con reintentos, Kafka), dedup puede ser innecesario. Usalo cuando el productor es externo (webhooks, APIs de terceros) o cuando el broker no garantiza exactly-once.

**P: Como manejo dedup con AWS Lambda?**
R: Lambda puede invocar multiples veces para el mismo mensaje SQS si la funcion timeouta o falla. Usa Redis `SET NX` con el ID de mensaje SQS como clave de dedup. Alternativamente, usa SQS FIFO con dedup basada en contenido para que AWS lo maneje. Para dedup basada en DynamoDB, usa conditional writes con `attribute_not_exists(messageId)`.

**P: Cual es la diferencia entre entrega at-least-once y at-most-once?**
R: At-least-once significa que cada mensaje se entrega al menos una vez, pero puede entregarse multiples veces (requiere dedup). At-most-once significa que cada mensaje se entrega cero o una veces (mensajes pueden perderse). Exactly-once significa que cada mensaje se entrega exactamente una vez (lo mas dificil de lograr). La mayoria de brokers proporcionan at-least-once.

**P: Como manejo dedup con idempotency keys HTTP?**
R: Usa el header HTTP `Idempotency-Key` como clave de dedup. Almacenalo en Redis antes de procesar el request. Si un reintento llega con la misma clave, retorna la respuesta cacheada en lugar de reprocesar. Stripe usa este patron para APIs de pago. El TTL debe coincidir con la ventana de reintentos del cliente.
