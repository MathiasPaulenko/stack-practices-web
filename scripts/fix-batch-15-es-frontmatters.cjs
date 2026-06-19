const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/devops/immutable-infrastructure.es.md',
    title: 'Infraestructura Inmutable',
    description: 'Construye infraestructura inmutable con imágenes de máquina versionadas y containers para eliminar configuration drift y asegurar despliegues reproducibles.',
    meta: 'Infraestructura inmutable: imágenes de máquina versionadas, despliegues basados en containers, eliminación de configuration drift y infraestructura reproducible con Packer y Docker.',
    keywords: ['immutable-infrastructure','devops','docker','packer']
  },
  {
    file: 'src/content/recipes/architecture/service-discovery.es.md',
    title: 'Service Discovery',
    description: 'Implementa service discovery con health checks, resolución DNS-based y service registries para ambientes dinámicos de microservicios.',
    meta: 'Service discovery: Consul, etcd, Eureka, resolución DNS-based, health checks y registro dinámico de servicios para microservicios.',
    keywords: ['service-discovery','architecture','microservices','consul']
  },
  {
    file: 'src/content/recipes/security/security-headers.es.md',
    title: 'Security Headers',
    description: 'Fortalece aplicaciones web con HTTP security headers: CSP, HSTS, X-Frame-Options y una lista de verificación completa de headers de seguridad.',
    meta: 'HTTP security headers para aplicaciones web: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy e implementación de headers de seguridad.',
    keywords: ['security-headers','csp','hsts','web-security']
  },
  {
    file: 'src/content/recipes/frontend/server-side-rendering.es.md',
    title: 'Server-Side Rendering',
    description: 'Mejora performance y SEO con server-side rendering usando Next.js, Nuxt, Astro y otros frameworks con estrategias de hydration.',
    meta: 'Guía de server-side rendering: Next.js, Nuxt, Astro, hydration, streaming SSR, edge rendering y optimización de performance para SEO y Core Web Vitals.',
    keywords: ['server-side-rendering','frontend','nextjs','astro']
  },
  {
    file: 'src/content/recipes/architecture/workflow-engine.es.md',
    title: 'Workflow Engines',
    description: 'Orquesta procesos de negocio complejos con workflow engines, state machines y coordinación de tareas de larga duración a través de servicios distribuidos.',
    meta: 'Workflow engines y state machines: Temporal, Camunda, patrones de state machine, saga orchestration y coordinación de tareas de larga duración.',
    keywords: ['workflow-engine','architecture','state-machines','distributed-systems']
  },
  {
    file: 'src/content/recipes/observability/metrics-collection.es.md',
    title: 'Metrics Collection',
    description: 'Recolecta, agrega y expone métricas de aplicación e infraestructura con Prometheus, StatsD y OpenTelemetry para monitoreo y alertado.',
    meta: 'Recolección de métricas para aplicaciones e infraestructura: Prometheus, StatsD, OpenTelemetry, métricas custom, histograms, counters y dashboards de Grafana.',
    keywords: ['metrics-collection','observability','prometheus','grafana']
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

console.log('All batch 15 ES frontmatters fixed.');
