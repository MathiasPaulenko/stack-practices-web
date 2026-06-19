const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/devops/immutable-infrastructure.md',
    meta: 'Immutable infrastructure: versioned machine images, container-based deployments, configuration drift elimination, and reproducible infrastructure with Packer and Docker.'
  },
  {
    file: 'src/content/recipes/devops/immutable-infrastructure.es.md',
    meta: 'Infraestructura inmutable: imágenes de máquina versionadas, despliegues basados en containers, eliminación de configuration drift y infraestructura reproducible con Packer y Docker.'
  },
  {
    file: 'src/content/recipes/architecture/service-discovery.md',
    meta: 'Service discovery patterns: Consul, etcd, Eureka, DNS-based resolution, health checks, and dynamic service registration for microservices.'
  },
  {
    file: 'src/content/recipes/architecture/service-discovery.es.md',
    meta: 'Service discovery: Consul, etcd, Eureka, resolución DNS-based, health checks y registro dinámico de servicios para microservicios.'
  },
  {
    file: 'src/content/recipes/security/security-headers.md',
    meta: 'HTTP security headers for web applications: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and security header implementation guide.'
  },
  {
    file: 'src/content/recipes/security/security-headers.es.md',
    meta: 'HTTP security headers para aplicaciones web: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy e implementación de headers de seguridad.'
  },
  {
    file: 'src/content/recipes/frontend/server-side-rendering.md',
    meta: 'Server-side rendering guide: Next.js, Nuxt, Astro, hydration, streaming SSR, edge rendering, and performance optimization for SEO and Core Web Vitals.'
  },
  {
    file: 'src/content/recipes/frontend/server-side-rendering.es.md',
    meta: 'Guía de server-side rendering: Next.js, Nuxt, Astro, hydration, streaming SSR, edge rendering y optimización de performance para SEO y Core Web Vitals.'
  },
  {
    file: 'src/content/recipes/architecture/workflow-engine.md',
    meta: 'Workflow engines and state machines: Temporal, Camunda, state machine patterns, saga orchestration, and long-running task coordination for business processes.'
  },
  {
    file: 'src/content/recipes/architecture/workflow-engine.es.md',
    meta: 'Workflow engines y state machines: Temporal, Camunda, patrones de state machine, saga orchestration y coordinación de tareas de larga duración.'
  },
  {
    file: 'src/content/recipes/observability/metrics-collection.md',
    meta: 'Metrics collection for applications and infrastructure: Prometheus, StatsD, OpenTelemetry, custom metrics, histograms, counters, and Grafana dashboards.'
  },
  {
    file: 'src/content/recipes/observability/metrics-collection.es.md',
    meta: 'Recolección de métricas para aplicaciones e infraestructura: Prometheus, StatsD, OpenTelemetry, métricas custom, histograms, counters y dashboards de Grafana.'
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

console.log('All batch 15 meta descriptions fixed.');
