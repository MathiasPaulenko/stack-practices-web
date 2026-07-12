---




contentType: patterns
slug: claim-check-pattern
title: "Patrón Claim Check"
description: "Almacena payloads grandes en storage externo y pasa solo un token de referencia ligero a través del bus de mensajes, reduciendo carga del broker y previniendo que se excedan límites de tamaño de mensaje."
metaDescription: "Aprende el Patrón Claim Check para pasar payloads grandes via referencias ligeras. Ejemplos en Python, Java y JavaScript con blob storage y brokers de mensajes."
difficulty: intermediate
topics:
  - design
  - architecture
  - messaging
tags:
  - claim-check
  - pattern
  - design-pattern
  - messaging
  - storage
  - blob
  - large-payload
  - async
relatedResources:
  - /patterns/queue-based-load-leveling-pattern
  - /patterns/event-carried-state-transfer-pattern
  - /patterns/outbox-pattern
  - /patterns/compensating-transaction-pattern
  - /patterns/sequential-convoy-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Claim Check para pasar payloads grandes via referencias ligeras. Ejemplos en Python, Java y JavaScript con blob storage y brokers de mensajes."
  keywords:
    - claim check
    - design pattern
    - messaging
    - storage
    - blob
    - large payload




---

# Patrón Claim Check

## Descripción General

El Patrón Claim Check almacena payloads grandes en almacenamiento externo y pasa solo un token de referencia ligero a través de la infraestructura de mensajería. Cuando un consumidor recibe el mensaje, usa el token para recuperar el payload completo del storage. Esto previene que los brokers de mensajes sean abrumados por mensajes grandes, evita violaciones de límites de tamaño, y mantiene el tráfico de mensajes ligero y rápido.

Los brokers de mensajes (RabbitMQ, Kafka, SQS) típicamente tienen límites de tamaño de mensaje (1MB para Kafka, 256KB para SQS). Cuando los payloads exceden estos límites — imágenes grandes, archivos de video, exportaciones de datos masivos, o generaciones de reportes complejas — el Patrón Claim Check provee una alternativa limpia a incrementar los límites del broker o dividir mensajes.

## Cuándo Usar


- For alternatives, see [Idempotent Consumer Pattern](/es/patterns/idempotent-consumer-pattern/).

Usa el Patrón Claim Check cuando:
- Los payloads de mensajes exceden los límites de tamaño del broker
- Payloads grandes ralentizan el broker de mensajes o consumen memoria excesiva
- Múltiples consumidores necesitan acceso al mismo payload grande
- Los payloads se generan asíncronamente y no deberían bloquear el pipeline de mensajes

## Cuándo Evitar
- Todos los payloads caben cómodamente dentro de los límites del broker
- El overhead de almacenamiento externo (latencia, costo, limpieza) excede el beneficio
- Se requiere consistencia fuerte entre el mensaje y el payload almacenado (difícil de garantizar)
- El sistema carece de un servicio de almacenamiento externo confiable (S3, Azure Blob, GCS)

## Solución

### Python

```python
import uuid
import json
from typing import Optional
from datetime import datetime, timedelta

# ============================================================================
# ALMACENAMIENTO EXTERNO (simulando S3 / Azure Blob / GCS)
# ============================================================================

class BlobStorage:
    """Almacén de blobs en memoria para demostración"""
    def __init__(self):
        self._store = {}

    def upload(self, data: bytes, content_type: str = "application/json") -> str:
        token = str(uuid.uuid4())
        self._store[token] = {
            "data": data,
            "content_type": content_type,
            "created_at": datetime.now()
        }
        return token

    def download(self, token: str) -> Optional[bytes]:
        entry = self._store.get(token)
        return entry["data"] if entry else None

    def delete(self, token: str):
        self._store.pop(token, None)

# ============================================================================
# BROKER DE MENSAJES (simulando RabbitMQ / Kafka / SQS)
# ============================================================================

class MessageBroker:
    def __init__(self):
        self._queues = {}

    def publish(self, queue: str, message: dict):
        self._queues.setdefault(queue, []).append(message)

    def consume(self, queue: str) -> Optional[dict]:
        messages = self._queues.get(queue, [])
        return messages.pop(0) if messages else None

# ============================================================================
# IMPLEMENTACIÓN DE CLAIM CHECK
# ============================================================================

class ClaimCheckProducer:
    """Publica mensajes con tokens de claim check en lugar de payloads grandes"""
    def __init__(self, broker: MessageBroker, storage: BlobStorage):
        self.broker = broker
        self.storage = storage

    def publish_large_message(self, queue: str, payload: dict, metadata: dict = None):
        # Almacenar payload en storage externo
        payload_bytes = json.dumps(payload).encode("utf-8")
        token = self.storage.upload(payload_bytes, "application/json")

        # Publicar mensaje ligero con referencia de claim check
        message = {
            "claim_check": token,
            "metadata": metadata or {},
            "payload_size": len(payload_bytes),
            "timestamp": datetime.now().isoformat()
        }
        self.broker.publish(queue, message)
        print(f"Publicado claim check: {token} ({len(payload_bytes)} bytes)")
        return token

class ClaimCheckConsumer:
    """Consume mensajes y recupera payloads completos via claim check"""
    def __init__(self, broker: MessageBroker, storage: BlobStorage):
        self.broker = broker
        self.storage = storage

    def process_next(self, queue: str):
        message = self.broker.consume(queue)
        if not message:
            return None

        token = message["claim_check"]
        payload_bytes = self.storage.download(token)

        if payload_bytes is None:
            print(f"ERROR: Claim check {token} no encontrado en storage")
            return None

        payload = json.loads(payload_bytes.decode("utf-8"))

        # Procesar el payload completo
        print(f"Payload recuperado ({message['payload_size']} bytes): {payload['report_id']}")

        # Limpiar payload almacenado después de procesar
        self.storage.delete(token)
        print(f"Claim check eliminado: {token}")

        return payload


# ============================================================================
# USO
# ============================================================================

storage = BlobStorage()
broker = MessageBroker()

producer = ClaimCheckProducer(broker, storage)
consumer = ClaimCheckConsumer(broker, storage)

# Payload grande: un reporte detallado que excedería los límites típicos del broker
large_report = {
    "report_id": "RPT-2024-Q1",
    "generated_at": datetime.now().isoformat(),
    "records": [
        {"id": i, "data": "x" * 1000} for i in range(1000)  # Payload de 1MB+
    ],
    "summary": {"total": 1000, "revenue": 500000.00}
}

producer.publish_large_message("reports.queue", large_report, {"priority": "high"})
consumer.process_next("reports.queue")
```

### Java

```java
import java.util.*;
import java.util.concurrent.*;

// Abstracción de blob storage
interface BlobStorage {
    String upload(byte[] data, String contentType);
    byte[] download(String token);
    void delete(String token);
}

class InMemoryBlobStorage implements BlobStorage {
    private final Map<String, byte[]> store = new ConcurrentHashMap<>();

    public String upload(byte[] data, String contentType) {
        String token = UUID.randomUUID().toString();
        store.put(token, data);
        return token;
    }

    public byte[] download(String token) {
        return store.get(token);
    }

    public void delete(String token) {
        store.remove(token);
    }
}

// Message broker
class MessageBroker {
    private final Map<String, Queue<Map<String, Object>>> queues = new ConcurrentHashMap<>();

    public void publish(String queue, Map<String, Object> message) {
        queues.computeIfAbsent(queue, k -> new ConcurrentLinkedQueue<>()).offer(message);
    }

    public Map<String, Object> consume(String queue) {
        Queue<Map<String, Object>> q = queues.get(queue);
        return q != null ? q.poll() : null;
    }
}

// Claim Check Producer
class ClaimCheckProducer {
    private final MessageBroker broker;
    private final BlobStorage storage;

    public ClaimCheckProducer(MessageBroker broker, BlobStorage storage) {
        this.broker = broker; this.storage = storage;
    }

    public String publishLargeMessage(String queue, String payloadJson, Map<String, Object> metadata) {
        byte[] data = payloadJson.getBytes();
        String token = storage.upload(data, "application/json");

        Map<String, Object> message = new HashMap<>();
        message.put("claimCheck", token);
        message.put("metadata", metadata);
        message.put("payloadSize", data.length);
        message.put("timestamp", new Date().toInstant().toString());

        broker.publish(queue, message);
        System.out.println("Publicado claim check: " + token + " (" + data.length + " bytes)");
        return token;
    }
}

// Claim Check Consumer
class ClaimCheckConsumer {
    private final MessageBroker broker;
    private final BlobStorage storage;

    public ClaimCheckConsumer(MessageBroker broker, BlobStorage storage) {
        this.broker = broker; this.storage = storage;
    }

    public String processNext(String queue) {
        Map<String, Object> message = broker.consume(queue);
        if (message == null) return null;

        String token = (String) message.get("claimCheck");
        byte[] data = storage.download(token);

        if (data == null) {
            System.err.println("ERROR: Claim check no encontrado: " + token);
            return null;
        }

        String payload = new String(data);
        System.out.println("Payload recuperado (" + message.get("payloadSize") + " bytes)");
        storage.delete(token);
        System.out.println("Claim check eliminado: " + token);
        return payload;
    }
}

// Uso
BlobStorage storage = new InMemoryBlobStorage();
MessageBroker broker = new MessageBroker();
ClaimCheckProducer producer = new ClaimCheckProducer(broker, storage);
ClaimCheckConsumer consumer = new ClaimCheckConsumer(broker, storage);

String largePayload = "{\"report_id\":\"RPT-001\",\"data\":\"" + "x".repeat(10000) + "\"}";
producer.publishLargeMessage("reports", largePayload, Map.of("priority", "high"));
consumer.processNext("reports");
```

### JavaScript

```javascript
const crypto = require('crypto');

// Blob storage
class InMemoryBlobStorage {
  constructor() {
    this.store = new Map();
  }

  upload(data, contentType) {
    const token = crypto.randomUUID();
    this.store.set(token, { data, contentType, createdAt: new Date() });
    return token;
  }

  download(token) {
    const entry = this.store.get(token);
    return entry ? entry.data : null;
  }

  delete(token) {
    this.store.delete(token);
  }
}

// Message broker
class MessageBroker {
  constructor() {
    this.queues = new Map();
  }

  publish(queue, message) {
    if (!this.queues.has(queue)) this.queues.set(queue, []);
    this.queues.get(queue).push(message);
  }

  consume(queue) {
    const messages = this.queues.get(queue);
    return messages && messages.length > 0 ? messages.shift() : null;
  }
}

// Claim Check Producer
class ClaimCheckProducer {
  constructor(broker, storage) {
    this.broker = broker;
    this.storage = storage;
  }

  publishLargeMessage(queue, payload, metadata = {}) {
    const payloadBytes = Buffer.from(JSON.stringify(payload));
    const token = this.storage.upload(payloadBytes, 'application/json');

    const message = {
      claimCheck: token,
      metadata,
      payloadSize: payloadBytes.length,
      timestamp: new Date().toISOString()
    };

    this.broker.publish(queue, message);
    console.log(`Publicado claim check: ${token} (${payloadBytes.length} bytes)`);
    return token;
  }
}

// Claim Check Consumer
class ClaimCheckConsumer {
  constructor(broker, storage) {
    this.broker = broker;
    this.storage = storage;
  }

  processNext(queue) {
    const message = this.broker.consume(queue);
    if (!message) return null;

    const payloadBytes = this.storage.download(message.claimCheck);
    if (!payloadBytes) {
      console.error(`ERROR: Claim check no encontrado: ${message.claimCheck}`);
      return null;
    }

    const payload = JSON.parse(payloadBytes.toString());
    console.log(`Payload recuperado (${message.payloadSize} bytes)`);

    this.storage.delete(message.claimCheck);
    console.log(`Claim check eliminado: ${message.claimCheck}`);

    return payload;
  }
}

// Uso
const storage = new InMemoryBlobStorage();
const broker = new MessageBroker();
const producer = new ClaimCheckProducer(broker, storage);
const consumer = new ClaimCheckConsumer(broker, storage);

const largePayload = {
  reportId: 'RPT-001',
  records: Array.from({ length: 1000 }, (_, i) => ({ id: i, data: 'x'.repeat(1000) }))
};

producer.publishLargeMessage('reports', largePayload, { priority: 'high' });
consumer.processNext('reports');
```

## Explicación

El Patrón Claim Check separa el enrutamiento de mensajes del transporte de payloads:

1. **Almacenar**: El productor sube el payload grande a blob storage, recibiendo un token único
2. **Referenciar**: El productor envía un mensaje pequeño conteniendo solo el token y metadata
3. **Recuperar**: El consumidor recibe el mensaje, usa el token para obtener el payload
4. **Limpiar**: Después de procesar, el consumidor elimina el payload almacenado para gestionar costos de storage

Esto mantiene el broker de mensajes ligero mientras se aprovecha el almacenamiento de objetos barato y preparado para crecimiento para los datos reales.

## Variantes

| Variante | Almacenamiento | Caso de Uso |
|----------|---------------|-------------|
| **S3 Claim Check** | Amazon S3 / pre-signed URLs | Cross-region, durable, cost-effective |
| **Shared Volume** | NFS / EFS / SMB | On-premise, baja latencia, misma red |
| **Database BLOB** | PostgreSQL BYTEA / MySQL BLOB | Cuando se necesitan transacciones con metadata |
| **CDN** | CloudFront / Cloudflare | Contenido público que los consumidores descargan directamente |
| **Streaming** | S3 + byte-range requests | Video/audio donde los consumidores buscan posiciones |

## Lo que funciona

- **Usa URLs pre-firmadas para seguridad.** En lugar de exponer el storage directamente, el mensaje incluye una URL de tiempo limitado.
- **Establece TTL en payloads almacenados.** Las reglas de ciclo de vida de object storage deberían auto-eliminar claim checks viejos.
- **Incluye hash de payload para integridad.** El mensaje debería contener un checksum para que los consumidores verifiquen la descarga.
- **Maneja fallas de storage gracefulmente.** Si el claim check falta, loggea y potencialmente reintenta o envía a dead-letter.
- **Comprime payloads antes de almacenar.** Gzip o Brotli reducen tanto el costo de storage como el tiempo de descarga.

## Errores Comunes

- **Olvidar la limpieza.** Los claim checks se acumulan indefinidamente sin eliminación, incrementando costos de storage.
- **Almacenar datos sensibles sin encriptación.** Encripta en reposo y usa HTTPS para recuperación.
- **URLs pre-firmadas sin expiración.** URLs que nunca expiran son un riesgo de seguridad.
- **Asumir que el payload existe.** El storage puede perder datos; el consumidor debe manejar claim checks faltantes.
- **Bloquear al consumidor en descargas lentas.** Recupera payloads de forma asíncrona cuando sea posible.

## Ejemplos del Mundo Real

### AWS SQS + S3

AWS SQS tiene un límite de mensaje de 256KB. La documentación de AWS recomienda el Patrón Claim Check: almacenar el payload en S3, enviar la clave del objeto S3 en el mensaje SQS. Esto se denomina oficialmente "Extended Client Library".

### Azure Service Bus

Azure Service Bus soporta mensajes hasta 256KB (Standard) o 1MB (Premium). Para mensajes más grandes, Azure recomienda almacenar en Blob Storage y pasar el URI del blob.

### Kafka Large Messages

El límite de mensaje por defecto de Kafka es 1MB. Las organizaciones que necesitan mensajes más grandes usan el Patrón Claim Check con S3/HDFS para storage, manteniendo los topics de Kafka ligeros y rápidos.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Claim Check y Event Sourcing?**
A: Event Sourcing almacena todos los eventos como fuente de verdad. Claim Check almacena un snapshot/referencia a datos demasiado grandes para el bus de mensajes. Son complementarios, no competidores.

**Q: Cómo aseguro la consistencia entre el mensaje y el payload almacenado?**
A: No puedes garantizar consistencia fuerte a través de dos sistemas. Usa entrega at-least-once, consumidores idempotentes, y checksums. El mensaje puede procesarse incluso si el payload está temporalmente no disponible.

**Q: El productor o el consumidor debería eliminar el payload almacenado?**
A: Típicamente el consumidor elimina después de procesar exitosamente. Para fan-out (múltiples consumidores), usa reference counting o limpieza basada en TTL en lugar de eliminación inmediata.

**Q: Puedo usar Claim Check para datos de streaming?**
A: Sí, pero con modificaciones. Almacena chunks en object storage e incluye información de byte-range en el mensaje para consumidores que necesitan buscar dentro de archivos grandes.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
