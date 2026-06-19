const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/frontend/javascript-event-loop.md',
    meta: 'Deep dive into the JavaScript event loop: call stack, task queue, microtasks, and how to write efficient async code for better web app performance.'
  },
  {
    file: 'src/content/recipes/frontend/javascript-event-loop.es.md',
    meta: 'Guía profunda del event loop de JavaScript: call stack, cola de tareas, microtareas y código async eficiente para mejorar el rendimiento de aplicaciones web.'
  },
  {
    file: 'src/content/recipes/ai/ai-agents-tool-use.md',
    meta: 'Learn how to build autonomous AI agents with tool use, ReAct pattern, and reasoning for complex multi-step task completion and workflow automation.'
  },
  {
    file: 'src/content/recipes/ai/ai-agents-tool-use.es.md',
    meta: 'Aprende a construir agentes de IA autónomos con uso de herramientas, patrón ReAct y razonamiento para completar tareas complejas y automatizar workflows.'
  },
  {
    file: 'src/content/recipes/security/password-hashing-production.md',
    meta: 'Production-grade password hashing guide with bcrypt, scrypt, and Argon2. Best practices for secure credential storage in web applications and backend APIs.'
  },
  {
    file: 'src/content/recipes/security/password-hashing-production.es.md',
    meta: 'Guía de hashing de contraseñas para producción con bcrypt, scrypt y Argon2. Mejores prácticas para almacenamiento seguro de credenciales en apps web.'
  },
  {
    file: 'src/content/recipes/data/batch-processing-patterns.md',
    meta: 'Batch processing patterns for large datasets: robust pipeline design, retry logic, idempotency, and observability best practices for ETL and reporting workflows.'
  },
  {
    file: 'src/content/recipes/data/batch-processing-patterns.es.md',
    meta: 'Patrones de procesamiento por lotes para grandes datasets: diseño robusto de pipelines, retry, idempotencia y mejores prácticas de observabilidad para ETL.'
  },
  {
    file: 'src/content/recipes/observability/prometheus-api-monitoring.md',
    meta: 'Set up Prometheus monitoring for REST and gRPC APIs with custom metrics, collectors, alerting rules, and Grafana dashboards for production observability.'
  },
  {
    file: 'src/content/recipes/observability/prometheus-api-monitoring.es.md',
    meta: 'Configura monitoreo Prometheus para APIs REST y gRPC con métricas personalizadas, collectors, reglas de alertamiento y dashboards de Grafana.'
  },
  {
    file: 'src/content/recipes/security/hmac-request-signing.md',
    meta: 'Implement HMAC-SHA256 request signing for secure API authentication. Protect message integrity and prevent replay attacks in service-to-service communication.'
  },
  {
    file: 'src/content/recipes/security/hmac-request-signing.es.md',
    meta: 'Implementa firma de requests HMAC-SHA256 para autenticación segura de APIs. Protege integridad de mensajes y previene ataques de replay entre servicios.'
  }
];

for (const fix of fixes) {
  let content = fs.readFileSync(fix.file, 'utf8');

  // Replace top-level metaDescription (first occurrence)
  const metaRegex = /metaDescription: ".+?"/;
  content = content.replace(metaRegex, `metaDescription: "${fix.meta}"`);

  // Replace seo.metaDescription (second occurrence)
  const seoMetaRegex = /(seo:\s+metaDescription: )(".+?")/;
  content = content.replace(seoMetaRegex, `$1"${fix.meta}"`);

  fs.writeFileSync(fix.file, content, 'utf8');
  console.log('Fixed meta:', fix.file);
}

console.log('All meta descriptions fixed.');
