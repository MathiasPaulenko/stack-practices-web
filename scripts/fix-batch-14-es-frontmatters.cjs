const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/devops/blue-green-deployment.es.md',
    title: 'Despliegue Blue-Green',
    description: 'Despliega con zero downtime usando ambientes blue-green, conmutación instantánea de tráfico y capacidades de rollback automatizado.',
    meta: 'Estrategia de despliegue blue-green: releases sin downtime, conmutación instantánea de tráfico, rollback automatizado y gestión de ambientes para seguridad en producción.',
    keywords: ['blue-green','deployment','zero-downtime','devops']
  },
  {
    file: 'src/content/recipes/architecture/multi-tenancy.es.md',
    title: 'Arquitectura Multi-Tenancy',
    description: 'Diseña aplicaciones multi-tenant con bases de datos compartidas o aisladas, routing tenant-aware y estrategias de aislamiento de datos.',
    meta: 'Patrones de arquitectura multi-tenancy: base de datos compartida, schema aislado, instancia dedicada por tenant, routing y estrategias de aislamiento de datos para SaaS.',
    keywords: ['multi-tenancy','architecture','saas','databases']
  },
  {
    file: 'src/content/recipes/devops/chaos-engineering.es.md',
    title: 'Chaos Engineering',
    description: 'Construye sistemas resilientes inyectando fallas intencionalmente y observando cómo responden y se recuperan tus servicios distribuidos.',
    meta: 'Principios de chaos engineering: inyección de fallas, game days, rollback automático y construcción de confianza en sistemas productivos mediante experimentos controlados.',
    keywords: ['chaos-engineering','resilience','testing','distributed-systems']
  },
  {
    file: 'src/content/recipes/observability/distributed-tracing.es.md',
    title: 'Tracing Distribuido',
    description: 'Tracea requests a través de microservicios distribuidos con OpenTelemetry, Jaeger y Zipkin para debuguear latencia y optimizar performance.',
    meta: 'Tracing distribuido con OpenTelemetry, Jaeger y Zipkin: tracea requests a través de microservicios, identifica cuellos de botella de latencia y optimiza performance.',
    keywords: ['distributed-tracing','observability','opentelemetry','microservices']
  },
  {
    file: 'src/content/recipes/security/data-privacy-gdpr.es.md',
    title: 'Privacidad de Datos y Cumplimiento GDPR',
    description: 'Implementa controles de privacidad de datos, gestión de consentimientos, anonimización y manejo GDPR-compliant en aplicaciones web.',
    meta: 'Cumplimiento GDPR y privacidad de datos: gestión de consentimientos, anonimización de datos, derecho al olvido, portabilidad de datos y patrones de privacy-by-design.',
    keywords: ['gdpr','privacy','compliance','data-protection']
  },
  {
    file: 'src/content/recipes/messaging/event-driven-microservices.es.md',
    title: 'Microservicios Event-Driven',
    description: 'Diseña microservicios event-driven con message brokers, event sourcing, CQRS y patrones de consistencia eventual.',
    meta: 'Arquitectura de microservicios event-driven: message brokers, event sourcing, CQRS, consistencia eventual, patrones saga e implementación del outbox pattern.',
    keywords: ['event-driven','microservices','messaging','architecture']
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

console.log('All batch 14 ES frontmatters fixed.');
