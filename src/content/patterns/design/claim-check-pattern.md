---
contentType: patterns
slug: claim-check-pattern
title: "Claim Check Pattern"
description: "Store large payloads in external storage and pass only a lightweight reference token through the message bus, reducing broker load and preventing message size limits from being exceeded."
metaDescription: "Learn the Claim Check Pattern for passing large payloads via lightweight references. Examples in Python, Java, and JavaScript with blob storage and message brokers."
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
  - /patterns/design/queue-based-load-leveling-pattern
  - /patterns/design/event-carried-state-transfer-pattern
  - /patterns/design/outbox-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Claim Check Pattern for passing large payloads via lightweight references. Examples in Python, Java, and JavaScript with blob storage and message brokers."
  keywords:
    - claim check
    - design pattern
    - messaging
    - storage
    - blob
    - large payload
---

# Claim Check Pattern

## Overview

The Claim Check Pattern stores large payloads in external storage and passes only a lightweight reference token through the messaging infrastructure. When a consumer receives the message, it uses the token to retrieve the full payload from storage. This prevents message brokers from being overwhelmed by large messages, avoids size limit violations, and keeps message traffic lean and fast.

Message brokers (RabbitMQ, Kafka, SQS) typically have message size limits (1MB for Kafka, 256KB for SQS). When payloads exceed these limits — large images, video files, bulk data exports, or complex report generations — the Claim Check Pattern provides a clean alternative to increasing broker limits or splitting messages.

## When to Use

Use the Claim Check Pattern when:
- Message payloads exceed broker size limits
- Large payloads slow down the message broker or consume excessive memory
- Multiple consumers need access to the same large payload
- Payloads are generated asynchronously and should not block the message pipeline

## When to Avoid

- All payloads fit comfortably within broker limits
- The overhead of external storage (latency, cost, cleanup) exceeds the benefit
- Strong consistency between the message and the stored payload is required (hard to guarantee)
- The system lacks a reliable external storage service (S3, Azure Blob, GCS)

## Solution

### Python

```python
import uuid
import json
from typing import Optional
from datetime import datetime, timedelta

# ============================================================================
# EXTERNAL STORAGE (simulating S3 / Azure Blob / GCS)
# ============================================================================

class BlobStorage:
    """In-memory blob store for demonstration"""
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
# MESSAGE BROKER (simulating RabbitMQ / Kafka / SQS)
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
# CLAIM CHECK IMPLEMENTATION
# ============================================================================

class ClaimCheckProducer:
    """Publishes messages with claim check tokens instead of large payloads"""
    def __init__(self, broker: MessageBroker, storage: BlobStorage):
        self.broker = broker
        self.storage = storage

    def publish_large_message(self, queue: str, payload: dict, metadata: dict = None):
        # Store payload in external storage
        payload_bytes = json.dumps(payload).encode("utf-8")
        token = self.storage.upload(payload_bytes, "application/json")

        # Publish lightweight message with claim check reference
        message = {
            "claim_check": token,
            "metadata": metadata or {},
            "payload_size": len(payload_bytes),
            "timestamp": datetime.now().isoformat()
        }
        self.broker.publish(queue, message)
        print(f"Published claim check: {token} ({len(payload_bytes)} bytes)")
        return token

class ClaimCheckConsumer:
    """Consumes messages and retrieves full payloads via claim check"""
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
            print(f"ERROR: Claim check {token} not found in storage")
            return None

        payload = json.loads(payload_bytes.decode("utf-8"))

        # Process the full payload
        print(f"Retrieved payload ({message['payload_size']} bytes): {payload['report_id']}")

        # Clean up stored payload after processing
        self.storage.delete(token)
        print(f"Deleted claim check: {token}")

        return payload


# ============================================================================
# USAGE
# ============================================================================

storage = BlobStorage()
broker = MessageBroker()

producer = ClaimCheckProducer(broker, storage)
consumer = ClaimCheckConsumer(broker, storage)

# Large payload: a detailed report that would exceed typical broker limits
large_report = {
    "report_id": "RPT-2024-Q1",
    "generated_at": datetime.now().isoformat(),
    "records": [
        {"id": i, "data": "x" * 1000} for i in range(1000)  # 1MB+ payload
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

// Blob storage abstraction
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
        System.out.println("Published claim check: " + token + " (" + data.length + " bytes)");
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
            System.err.println("ERROR: Claim check not found: " + token);
            return null;
        }

        String payload = new String(data);
        System.out.println("Retrieved payload (" + message.get("payloadSize") + " bytes)");
        storage.delete(token);
        System.out.println("Deleted claim check: " + token);
        return payload;
    }
}

// Usage
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
    console.log(`Published claim check: ${token} (${payloadBytes.length} bytes)`);
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
      console.error(`ERROR: Claim check not found: ${message.claimCheck}`);
      return null;
    }

    const payload = JSON.parse(payloadBytes.toString());
    console.log(`Retrieved payload (${message.payloadSize} bytes)`);

    this.storage.delete(message.claimCheck);
    console.log(`Deleted claim check: ${message.claimCheck}`);

    return payload;
  }
}

// Usage
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

## Explanation

The Claim Check Pattern separates message routing from payload transport:

1. **Store**: The producer uploads the large payload to blob storage, receiving a unique token
2. **Reference**: The producer sends a small message containing only the token and metadata
3. **Retrieve**: The consumer receives the message, uses the token to fetch the payload
4. **Cleanup**: After processing, the consumer deletes the stored payload to manage storage costs

This keeps the message broker lean while leveraging cheap, growth-ready object storage for the actual data.

## Variants

| Variant | Storage | Use Case |
|---------|---------|----------|
| **S3 Claim Check** | Amazon S3 / pre-signed URLs | Cross-region, durable, cost-effective |
| **Shared Volume** | NFS / EFS / SMB | On-premise, low-latency, same network |
| **Database BLOB** | PostgreSQL BYTEA / MySQL BLOB | When transactions with metadata are needed |
| **CDN** | CloudFront / Cloudflare | Public content that consumers download directly |
| **Streaming** | S3 + byte-range requests | Video/audio where consumers seek to positions |

## What Works

- **Use pre-signed URLs for security.** Instead of exposing storage directly, the message includes a time-limited URL.
- **Set TTL on stored payloads.** Object storage lifecycle rules should auto-delete old claim checks.
- **Include payload hash for integrity.** The message should contain a checksum so consumers verify the download.
- **Handle storage failures gracefully.** If the claim check is missing, log and potentially retry or dead-letter.
- **Compress payloads before storage.** Gzip or Brotli reduces both storage cost and download time.

## Common Mistakes

- **Forgetting cleanup.** Claim checks accumulate indefinitely without deletion, driving storage costs.
- **Storing sensitive data without encryption.** Encrypt at rest and use HTTPS for retrieval.
- **No expiration on pre-signed URLs.** URLs that never expire are a security risk.
- **Assuming the payload exists.** Storage can lose data; the consumer must handle missing claim checks.
- **Blocking the consumer on slow downloads.** Retrieve payloads asynchronously if possible.

## Real-World Examples

### AWS SQS + S3

AWS SQS has a 256KB message limit. The AWS documentation recommends the Claim Check Pattern: store the payload in S3, send the S3 object key in the SQS message. This is officially called the "Extended Client Library" pattern.

### Azure Service Bus

Azure Service Bus supports messages up to 256KB (Standard) or 1MB (Premium). For larger messages, Azure recommends storing in Blob Storage and passing the blob URI.

### Kafka Large Messages

Kafka's default message limit is 1MB. Organizations that need larger messages use the Claim Check Pattern with S3/HDFS for storage, keeping Kafka topics lean and fast.

## Frequently Asked Questions

**Q: What is the difference between Claim Check and Event Sourcing?**
A: Event Sourcing stores all events as the source of truth. Claim Check stores a snapshot/reference to data that is too large for the message bus. They are complementary, not competing.

**Q: How do I ensure the message and the stored payload are consistent?**
A: You cannot guarantee strong consistency across two systems. Use at-least-once delivery, idempotent consumers, and checksums. The message can be processed even if the payload is temporarily unavailable.

**Q: Should the producer or consumer delete the stored payload?**
A: Typically the consumer deletes after successful processing. For fan-out (multiple consumers), use reference counting or TTL-based cleanup instead of immediate deletion.

**Q: Can I use Claim Check for streaming data?**
A: Yes, but with modifications. Store chunks in object storage and include byte-range information in the message for consumers that need to seek within large files.
