---
contentType: patterns
slug: inbox-pattern
title: "Patrón Inbox"
description: "Usa una tabla o cola dedicada de inbox para registrar eventos o requests entrantes, asegurando entrega confiable, deduplicación y procesamiento idempotente incluso cuando sistemas downstream fallan."
metaDescription: "Aprende el Patrón Inbox para procesamiento idempotente de eventos. Ejemplos en Python, Java y JavaScript con tablas de inbox, deduplicación y entrega at-least-once."
difficulty: intermediate
topics:
  - design
  - messaging
  - architecture
tags:
  - inbox
  - pattern
  - design-pattern
  - messaging
  - idempotency
  - reliability
  - event-driven
relatedResources:
  - /patterns/design/outbox-pattern
  - /patterns/design/saga-pattern
  - /patterns/design/event-sourcing-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Inbox para procesamiento idempotente de eventos. Ejemplos en Python, Java y JavaScript con tablas de inbox, deduplicación y entrega at-least-once."
  keywords:
    - inbox pattern
    - design pattern
    - idempotency
    - reliability
    - event driven
---

# Patrón Inbox

## Descripción General

El Patrón Inbox usa una tabla o cola dedicada de inbox para registrar eventos, webhooks o requests entrantes antes de procesarlos. En lugar de manejar un mensaje directamente al recibirlo, el consumidor primero lo persiste en un inbox con un identificador único, luego lo procesa en un job en background. Si el procesamiento falla, el mensaje permanece en el inbox para retry; si el mismo mensaje llega dos veces, la deduplicación previene el doble procesamiento.

Este patrón es la contraparte del lado del consumidor al Patrón Outbox. Mientras Outbox asegura publicación confiable, Inbox asegura consumo confiable. Juntos proveen semánticas de procesamiento exactly-once end-to-end en sistemas distribuidos.

Casos de uso comunes incluyen procesar webhooks de pago, manejar streams de eventos externos e integrar con APIs de terceros que pueden re-entregar mensajes.

## Cuándo Usar

Usa el Patrón Inbox cuando:
- Necesitas procesar eventos externos de manera confiable con garantías de entrega at-least-once
- La entrega duplicada de mensajes es posible y debe ser prevenida
- Procesar un mensaje involucra múltiples pasos que deberían ser atómicos
- Necesitas visibilidad sobre mensajes pendientes, fallidos y procesados

## Cuándo Evitar

- El volumen de mensajes es extremadamente alto y un write a base de datos por mensaje es muy costoso
- El broker de mensajes ya provee semánticas exactly-once nativamente
- El consumidor es un servicio simple stateless sin requerimientos de durabilidad
- Agregar una dependencia de base de datos introduce latencia inaceptable

## Solución

### Python

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
import hashlib
import json
import sqlite3

@dataclass
class InboxMessage:
    id: int
    message_id: str
    payload: str
    status: str  # 'pending', 'processing', 'completed', 'failed'
    created_at: datetime
    processed_at: Optional[datetime] = None
    retry_count: int = 0

class InboxProcessor:
    """Implementación del patrón Inbox con SQLite"""
    def __init__(self, db_path: str = "inbox.db"):
        self.conn = sqlite3.connect(db_path)
        self._create_table()

    def _create_table(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS inbox (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT UNIQUE NOT NULL,
                payload TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP,
                retry_count INTEGER DEFAULT 0
            )
        """)
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON inbox(status)")
        self.conn.commit()

    def receive(self, raw_payload: dict) -> bool:
        """Almacena mensaje entrante en inbox; retorna False si es duplicado"""
        message_id = self._generate_message_id(raw_payload)
        payload_json = json.dumps(raw_payload)

        try:
            self.conn.execute(
                "INSERT INTO inbox (message_id, payload) VALUES (?, ?)",
                (message_id, payload_json)
            )
            self.conn.commit()
            return True
        except sqlite3.IntegrityError:
            # message_id duplicado — ya procesado o pendiente
            return False

    def _generate_message_id(self, payload: dict) -> str:
        """Genera ID de mensaje determinístico desde payload + ID de fuente"""
        content = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def process_pending(self, processor_func):
        """Busca y procesa mensajes pendientes con retries"""
        cursor = self.conn.execute(
            "SELECT id, message_id, payload, retry_count FROM inbox WHERE status = 'pending'"
        )
        rows = cursor.fetchall()

        for row in rows:
            msg_id, message_id, payload, retries = row
            self.conn.execute(
                "UPDATE inbox SET status = 'processing' WHERE id = ?", (msg_id,)
            )
            self.conn.commit()

            try:
                result = processor_func(json.loads(payload))
                self.conn.execute(
                    """UPDATE inbox SET status = 'completed', processed_at = CURRENT_TIMESTAMP
                       WHERE id = ?""", (msg_id,)
                )
                self.conn.commit()
                print(f"Procesado {message_id}: {result}")
            except Exception as e:
                new_retries = retries + 1
                status = 'failed' if new_retries >= 3 else 'pending'
                self.conn.execute(
                    """UPDATE inbox SET status = ?, retry_count = ? WHERE id = ?""",
                    (status, new_retries, msg_id)
                )
                self.conn.commit()
                print(f"Falló {message_id} (retry {new_retries}): {e}")

    def get_stats(self) -> dict:
        cursor = self.conn.execute(
            "SELECT status, COUNT(*) FROM inbox GROUP BY status"
        )
        return {row[0]: row[1] for row in cursor.fetchall()}


# Uso
def process_payment(payload: dict) -> str:
    order_id = payload["order_id"]
    amount = payload["amount"]
    # Procesar pago...
    return f"Pago de ${amount} para orden {order_id} procesado"

inbox = InboxProcessor()

# Simular recepción de webhook
event1 = {"order_id": "ORD-001", "amount": 99.99, "event": "payment.received"}
event2 = {"order_id": "ORD-001", "amount": 99.99, "event": "payment.received"}  # duplicado

print(f"Recibido event1: {inbox.receive(event1)}")  # True
print(f"Recibido event2: {inbox.receive(event2)}")  # False (duplicado)

# Procesar mensajes pendientes
inbox.process_pending(process_payment)
print(inbox.get_stats())
```

### Java

```java
import java.sql.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;

public class InboxProcessor {
    private final Connection conn;
    private final ObjectMapper mapper = new ObjectMapper();

    public InboxProcessor(String dbUrl) throws SQLException {
        this.conn = DriverManager.getConnection(dbUrl);
        createTable();
    }

    private void createTable() throws SQLException {
        conn.prepareStatement("""
            CREATE TABLE IF NOT EXISTS inbox (
                id SERIAL PRIMARY KEY,
                message_id VARCHAR(32) UNIQUE NOT NULL,
                payload TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP,
                retry_count INT DEFAULT 0
            )
        """).execute();
        conn.prepareStatement("CREATE INDEX IF NOT EXISTS idx_status ON inbox(status)").execute();
    }

    public boolean receive(Map<String, Object> payload) throws SQLException {
        String messageId = generateMessageId(payload);
        String payloadJson;
        try {
            payloadJson = mapper.writeValueAsString(payload);
        } catch (Exception e) { throw new RuntimeException(e); }

        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO inbox (message_id, payload) VALUES (?, ?)")) {
            ps.setString(1, messageId);
            ps.setString(2, payloadJson);
            ps.executeUpdate();
            return true;
        } catch (SQLIntegrityConstraintViolationException e) {
            return false; // Duplicado
        }
    }

    private String generateMessageId(Map<String, Object> payload) {
        // Simplificado: usar un hash de JSON ordenado en producción
        return UUID.nameUUIDFromBytes(payload.toString().getBytes()).toString().substring(0, 16);
    }

    public void processPending(MessageProcessor processor) throws SQLException {
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                 "SELECT id, message_id, payload, retry_count FROM inbox WHERE status = 'pending'")) {

            while (rs.next()) {
                int id = rs.getInt("id");
                String messageId = rs.getString("message_id");
                String payload = rs.getString("payload");
                int retries = rs.getInt("retry_count");

                markProcessing(id);
                try {
                    Map<String, Object> data = mapper.readValue(payload, Map.class);
                    String result = processor.process(data);
                    markCompleted(id);
                    System.out.println("Procesado " + messageId + ": " + result);
                } catch (Exception e) {
                    int newRetries = retries + 1;
                    String status = newRetries >= 3 ? "failed" : "pending";
                    markFailed(id, status, newRetries);
                    System.out.println("Falló " + messageId + " (retry " + newRetries + "): " + e.getMessage());
                }
            }
        }
    }

    private void markProcessing(int id) throws SQLException {
        var ps = conn.prepareStatement("UPDATE inbox SET status = 'processing' WHERE id = ?");
        ps.setInt(1, id); ps.executeUpdate();
    }

    private void markCompleted(int id) throws SQLException {
        var ps = conn.prepareStatement(
            "UPDATE inbox SET status = 'completed', processed_at = CURRENT_TIMESTAMP WHERE id = ?");
        ps.setInt(1, id); ps.executeUpdate();
    }

    private void markFailed(int id, String status, int retries) throws SQLException {
        var ps = conn.prepareStatement("UPDATE inbox SET status = ?, retry_count = ? WHERE id = ?");
        ps.setString(1, status); ps.setInt(2, retries); ps.setInt(3, id); ps.executeUpdate();
    }
}

interface MessageProcessor {
    String process(Map<String, Object> payload);
}
```

### JavaScript

```javascript
const crypto = require('crypto');

class InboxProcessor {
  constructor(db) {
    this.db = db; // Asume un wrapper SQLite/PostgreSQL con métodos async
  }

  async init() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS inbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        retry_count INTEGER DEFAULT 0
      )
    `);
    await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_status ON inbox(status)`);
  }

  generateMessageId(payload) {
    const content = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  async receive(payload) {
    const messageId = this.generateMessageId(payload);
    const payloadJson = JSON.stringify(payload);

    try {
      await this.db.run(
        'INSERT INTO inbox (message_id, payload) VALUES (?, ?)',
        [messageId, payloadJson]
      );
      return true;
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return false; // Duplicado
      }
      throw err;
    }
  }

  async processPending(processorFunc) {
    const rows = await this.db.all(
      "SELECT id, message_id, payload, retry_count FROM inbox WHERE status = 'pending'"
    );

    for (const row of rows) {
      await this.db.run("UPDATE inbox SET status = 'processing' WHERE id = ?", [row.id]);

      try {
        const payload = JSON.parse(row.payload);
        const result = await processorFunc(payload);
        await this.db.run(
          "UPDATE inbox SET status = 'completed', processed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [row.id]
        );
        console.log(`Procesado ${row.message_id}: ${result}`);
      } catch (err) {
        const newRetries = row.retry_count + 1;
        const status = newRetries >= 3 ? 'failed' : 'pending';
        await this.db.run(
          'UPDATE inbox SET status = ?, retry_count = ? WHERE id = ?',
          [status, newRetries, row.id]
        );
        console.log(`Falló ${row.message_id} (retry ${newRetries}): ${err.message}`);
      }
    }
  }

  async getStats() {
    const rows = await this.db.all('SELECT status, COUNT(*) as count FROM inbox GROUP BY status');
    return Object.fromEntries(rows.map(r => [r.status, r.count]));
  }
}

// Uso
async function main() {
  const sqlite3 = require('sqlite3').verbose();
  const { open } = require('sqlite');
  const db = await open({ filename: 'inbox.db', driver: sqlite3.Database });

  const inbox = new InboxProcessor(db);
  await inbox.init();

  const event1 = { order_id: 'ORD-001', amount: 99.99, event: 'payment.received' };
  const event2 = { order_id: 'ORD-001', amount: 99.99, event: 'payment.received' };

  console.log('Recibido event1:', await inbox.receive(event1)); // true
  console.log('Recibido event2:', await inbox.receive(event2)); // false

  await inbox.processPending(async (payload) => {
    return `Pago de $${payload.amount} para orden ${payload.order_id} procesado`;
  });

  console.log(await inbox.getStats());
}

main().catch(console.error);
```

## Explicación

El Patrón Inbox funciona en tres etapas:

1. **Recibir**: Los mensajes entrantes se persisten inmediatamente en el inbox con un `message_id` determinístico. Esto hace la recepción idempotente — los duplicados son rechazados por la restricción unique.
2. **Procesar**: Un worker en background hace polling de mensajes `pending`, los marca como `processing` e invoca la lógica de negocio. Si el procesamiento tiene éxito, el mensaje pasa a `completed`; si falla, retorna a `pending` para retry.
3. **Monitorear**: La tabla de inbox funciona como log de auditoría y dashboard de operaciones, mostrando conteos de mensajes pendientes, fallidos y completados.

## Variantes

| Variante | Almacenamiento | Características |
|----------|---------------|-----------------|
| **Database Inbox** | Tabla SQL | Garantías ACID, fácil querying, mayor latencia |
| **Redis Inbox** | Sorted set / stream | Menor latencia, durabilidad limitada, bueno para alto throughput |
| **Message Queue** | SQS, RabbitMQ | Redelivery nativa, puede necesitar deduplicación externa |
| **File-based** | Log append-only | Simple, sin dependencia de DB, más difícil de consultar |

## Lo que funciona

- **Usa IDs de mensaje determinísticos.** Hashea el payload + identificador de fuente para que los duplicados sean naturalmente deduplicados.
- **Mantén el procesamiento idempotente.** Incluso con deduplicación, diseña la lógica de negocio para manejar retries de forma segura.
- **Implementa backoff exponencial.** Los mensajes fallidos no deberían reintentar inmediatamente; agrega una columna `next_retry_at`.
- **Archiva mensajes viejos.** Mueve mensajes completados a una tabla de historial para mantener el inbox pequeño y rápido.
- **Monitorea mensajes muertos.** Los mensajes que agotan retries deberían alertar a operadores, no desaparecer silenciosamente.

## Errores Comunes

- **Procesar antes de persistir.** Si el consumidor se cae después de manejar el mensaje pero antes de ack, el mensaje se pierde.
- **IDs de mensaje no determinísticos.** UUIDs aleatorios por entrega previenen la deduplicación de mensajes re-entregados.
- **Loops infinitos de retry.** Sin un límite de retries máximo, un mensaje poison bloquea la cola para siempre.
- **Sin visibility timeout.** Múltiples workers pueden tomar el mismo mensaje `processing` simultáneamente.
- **Payloads grandes en el inbox.** Almacena referencias a blob storage para payloads > 1KB; mantén la tabla de inbox lean.

## Ejemplos del Mundo Real

### Procesamiento de Webhooks de Pago

Los webhooks de Stripe y PayPal pueden ser entregados múltiples veces. El patrón inbox almacena cada evento de webhook, deduplica por event ID y procesa la confirmación de pago exactamente una vez.

### Consumidores de Eventos CQRS

En arquitecturas CQRS, los read models consumen eventos de dominio desde un bus. Un inbox asegura que los eventos se apliquen confiablemente incluso si la base de datos del read model está temporalmente no disponible.

### Integración con APIs de Terceros

Al hacer polling de APIs externas por cambios, un inbox almacena la respuesta cruda de la API antes de la transformación. Esto desacopla el fetching del procesamiento y provee un log de replay para debugging.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Inbox y Outbox?**
A: Inbox maneja mensajes entrantes de manera confiable. Outbox maneja mensajes salientes de manera confiable. Inbox previene consumo duplicado; Outbox previene publicaciones perdidas.

**Q: Puedo usar una cola de mensajes en lugar de un inbox de base de datos?**
A: Las colas de mensajes manejan entrega pero no deduplicación nativamente (a menos que soporte exactly-once). Un inbox agrega la capa de deduplicación y auditoría sobre entrega at-least-once.

**Q: Cómo manejo el ordenamiento de mensajes?**
A: El inbox preserva el orden de inserción si los mensajes se procesan secuencialmente por ID. Para ordenamiento estricto, usa un único worker por partición y procesa en secuencia.

**Q: Qué pasa con throughput muy alto?**
A: Para >10K msg/s, considera Redis Streams o Kafka con consumidores idempotentes. Los inboxes de base de datos sobresalen en volúmenes moderados donde queryability y ACID importan.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
