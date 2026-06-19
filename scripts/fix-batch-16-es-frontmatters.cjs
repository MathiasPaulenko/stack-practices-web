const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/testing/api-mocking.es.md',
    title: 'API Mocking para Testing',
    description: 'Construye tests confiables mockeando APIs externas con WireMock, MockServer y MSW para eliminar flakiness y testear casos edge.',
    meta: 'Estrategias de API mocking para testing: WireMock, MockServer, MSW, definiciones de stubs, response templating y testing de casos edge sin dependencias reales.',
    keywords: ['api-mocking','testing','mocking','automation']
  },
  {
    file: 'src/content/recipes/databases/database-replication.es.md',
    title: 'Replicación de Bases de Datos',
    description: 'Configura y gestiona replicación de bases de datos para alta disponibilidad, escalado de lecturas y disaster recovery con arquitecturas primaria-réplica.',
    meta: 'Configuración de replicación de bases de datos: primaria-réplica, multi-primaria, replicación síncrona y asíncrona, failover y escalado de lecturas para alta disponibilidad.',
    keywords: ['database-replication','databases','high-availability','performance']
  },
  {
    file: 'src/content/recipes/observability/log-aggregation.es.md',
    title: 'Agregación de Logs',
    description: 'Centraliza logs de servicios distribuidos con ELK, Fluentd y Loki para búsqueda, alertado y troubleshooting en producción.',
    meta: 'Agregación de logs para sistemas distribuidos: stack ELK, Fluentd, Grafana Loki, log shipping, parsing y troubleshooting centralizado a escala.',
    keywords: ['log-aggregation','observability','elk','devops']
  },
  {
    file: 'src/content/recipes/architecture/retry-backoff.es.md',
    title: 'Retry con Exponential Backoff',
    description: 'Implementa estrategias de retry resilientes con exponential backoff, jitter e integración de circuit breaker para recuperación de fallas transitorias.',
    meta: 'Patrones de retry con exponential backoff y jitter: implementa clientes HTTP resilientes, evita thundering herds e integra con circuit breakers.',
    keywords: ['retry-backoff','resilience','architecture','distributed-systems']
  },
  {
    file: 'src/content/recipes/messaging/dead-letter-queue.es.md',
    title: 'Dead Letter Queues',
    description: 'Maneja mensajes fallidos gracefulmente con dead letter queues, políticas de retry y detección de poison pills en arquitecturas message-driven.',
    meta: 'Patrones de dead letter queue: detección de poison pills, límites de retry, replay de mensajes, alertado en profundidad de DLQ y estrategias de recuperación para sistemas async.',
    keywords: ['dead-letter-queue','messaging','resilience','error-handling']
  },
  {
    file: 'src/content/recipes/messaging/message-idempotency.es.md',
    title: 'Idempotencia en Procesamiento de Mensajes',
    description: 'Diseña procesadores de mensajes idempotentes que manejan entregas duplicadas de forma segura sin side effects en sistemas async y event-driven.',
    meta: 'Procesamiento de mensajes idempotente: estrategias de deduplicación, idempotency keys, semántica exactly-once y manejo seguro de entregas duplicadas.',
    keywords: ['message-idempotency','messaging','distributed-systems','architecture']
  }
];

for (const fix of fixes) {
  let content = fs.readFileSync(fix.file, 'utf8');

  content = content.replace(
    /title: "\[ES\] .+?"/,
    `title: "${fix.title}"`
  );

  content = content.replace(
    /description: "\[ES\] .+?"/,
    `description: "${fix.description}"`
  );

  content = content.replace(
    /metaDescription: "\[ES\] .+?"/,
    `metaDescription: "${fix.meta}"`
  );

  const keywordsBlock = fix.keywords.map(k => `    - ${k}`).join('\n');
  content = content.replace(
    /  keywords:\n((    - \[ES\] .+\n)+)/,
    `  keywords:\n${keywordsBlock}\n`
  );

  fs.writeFileSync(fix.file, content, 'utf8');
  console.log('Fixed ES frontmatter:', fix.file);
}

console.log('All batch 16 ES frontmatters fixed.');
