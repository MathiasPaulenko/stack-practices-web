const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/testing/api-mocking.md',
    meta: 'API mocking strategies for testing: WireMock, MockServer, MSW, stub definitions, response templating, and testing edge cases without real dependencies.'
  },
  {
    file: 'src/content/recipes/testing/api-mocking.es.md',
    meta: 'Estrategias de API mocking para testing: WireMock, MockServer, MSW, definiciones de stubs, response templating y testing de casos edge sin dependencias reales.'
  },
  {
    file: 'src/content/recipes/databases/database-replication.md',
    meta: 'Database replication setup: primary-replica, multi-primary, synchronous and asynchronous replication, failover, and read scaling for high availability.'
  },
  {
    file: 'src/content/recipes/databases/database-replication.es.md',
    meta: 'Configuración de replicación de bases de datos: primaria-réplica, multi-primaria, replicación síncrona y asíncrona, failover y escalado de lecturas para alta disponibilidad.'
  },
  {
    file: 'src/content/recipes/observability/log-aggregation.md',
    meta: 'Log aggregation for distributed systems: ELK stack, Fluentd, Grafana Loki, log shipping, parsing, and centralized troubleshooting at scale.'
  },
  {
    file: 'src/content/recipes/observability/log-aggregation.es.md',
    meta: 'Agregación de logs para sistemas distribuidos: stack ELK, Fluentd, Grafana Loki, log shipping, parsing y troubleshooting centralizado a escala.'
  },
  {
    file: 'src/content/recipes/architecture/retry-backoff.md',
    meta: 'Retry patterns with exponential backoff and jitter: implement resilient HTTP clients, avoid thundering herds, and integrate with circuit breakers.'
  },
  {
    file: 'src/content/recipes/architecture/retry-backoff.es.md',
    meta: 'Patrones de retry con exponential backoff y jitter: implementa clientes HTTP resilientes, evita thundering herds e integra con circuit breakers.'
  },
  {
    file: 'src/content/recipes/messaging/dead-letter-queue.md',
    meta: 'Dead letter queue patterns: poison pill detection, retry limits, message replay, alerting on DLQ depth, and recovery strategies for async systems.'
  },
  {
    file: 'src/content/recipes/messaging/dead-letter-queue.es.md',
    meta: 'Patrones de dead letter queue: detección de poison pills, límites de retry, replay de mensajes, alertado en profundidad de DLQ y estrategias de recuperación para sistemas async.'
  },
  {
    file: 'src/content/recipes/messaging/message-idempotency.md',
    meta: 'Idempotent message processing: deduplication strategies, idempotency keys, exactly-once semantics, and safe handling of duplicate deliveries.'
  },
  {
    file: 'src/content/recipes/messaging/message-idempotency.es.md',
    meta: 'Procesamiento de mensajes idempotente: estrategias de deduplicación, idempotency keys, semántica exactly-once y manejo seguro de entregas duplicadas.'
  }
];

for (const fix of fixes) {
  let content = fs.readFileSync(fix.file, 'utf8');
  const metaRegex = /metaDescription: ".+?"/;
  content = content.replace(metaRegex, `metaDescription: "${fix.meta}"`);
  const seoMetaRegex = /(seo:\s+metaDescription: )(".+?")/;
  content = content.replace(seoMetaRegex, `$1"${fix.meta}"`);
  fs.writeFileSync(fix.file, content, 'utf8');
  console.log('Fixed meta:', fix.file);
}

console.log('All batch 16 meta descriptions fixed.');
