const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/devops/blue-green-deployment.md',
    meta: 'Blue-green deployment strategy: zero-downtime releases, instant traffic switching, automated rollback, and environment management for production safety.'
  },
  {
    file: 'src/content/recipes/devops/blue-green-deployment.es.md',
    meta: 'Estrategia de despliegue blue-green: releases sin downtime, conmutación instantánea de tráfico, rollback automatizado y gestión de ambientes para seguridad en producción.'
  },
  {
    file: 'src/content/recipes/architecture/multi-tenancy.md',
    meta: 'Multi-tenancy architecture patterns: shared database, isolated schema, dedicated instance per tenant, routing, and data isolation strategies for SaaS.'
  },
  {
    file: 'src/content/recipes/architecture/multi-tenancy.es.md',
    meta: 'Patrones de arquitectura multi-tenancy: base de datos compartida, schema aislado, instancia dedicada por tenant, routing y estrategias de aislamiento de datos para SaaS.'
  },
  {
    file: 'src/content/recipes/devops/chaos-engineering.md',
    meta: 'Chaos engineering principles: fault injection, game days, automatic rollback, and building confidence in production systems through controlled experiments.'
  },
  {
    file: 'src/content/recipes/devops/chaos-engineering.es.md',
    meta: 'Principios de chaos engineering: inyección de fallas, game days, rollback automático y construcción de confianza en sistemas productivos mediante experimentos controlados.'
  },
  {
    file: 'src/content/recipes/observability/distributed-tracing.md',
    meta: 'Distributed tracing with OpenTelemetry, Jaeger, and Zipkin: trace requests across microservices, identify latency bottlenecks, and optimize performance.'
  },
  {
    file: 'src/content/recipes/observability/distributed-tracing.es.md',
    meta: 'Tracing distribuido con OpenTelemetry, Jaeger y Zipkin: tracea requests a través de microservicios, identifica cuellos de botella de latencia y optimiza performance.'
  },
  {
    file: 'src/content/recipes/security/data-privacy-gdpr.md',
    meta: 'GDPR compliance and data privacy: consent management, data anonymization, right to erasure, data portability, and privacy-by-design architecture patterns.'
  },
  {
    file: 'src/content/recipes/security/data-privacy-gdpr.es.md',
    meta: 'Cumplimiento GDPR y privacidad de datos: gestión de consentimientos, anonimización de datos, derecho al olvido, portabilidad de datos y patrones de privacy-by-design.'
  },
  {
    file: 'src/content/recipes/messaging/event-driven-microservices.md',
    meta: 'Event-driven microservices architecture: message brokers, event sourcing, CQRS, eventual consistency, saga patterns, and outbox pattern implementation.'
  },
  {
    file: 'src/content/recipes/messaging/event-driven-microservices.es.md',
    meta: 'Arquitectura de microservicios event-driven: message brokers, event sourcing, CQRS, consistencia eventual, patrones saga e implementación del outbox pattern.'
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

console.log('All batch 14 meta descriptions fixed.');
