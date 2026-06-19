const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/frontend/javascript-event-loop.es.md',
    title: 'Event Loop de JavaScript',
    description: 'Comprende cómo funciona el event loop de JavaScript y cómo escribir código no bloqueante.',
    meta: 'Guía profunda del event loop de JavaScript: call stack, cola de tareas, microtareas y código async eficiente.',
    keywords: ['event-loop', 'async', 'javascript', 'performance']
  },
  {
    file: 'src/content/recipes/ai/ai-agents-tool-use.es.md',
    title: 'Agentes de IA con Uso de Herramientas',
    description: 'Construye agentes de IA autónomos que pueden usar herramientas y APIs externas para completar tareas complejas.',
    meta: 'Aprende a construir agentes de IA con uso de herramientas, patrón ReAct y razonamiento autónomo para tareas complejas.',
    keywords: ['ai-agents', 'ai', 'openai', 'architecture']
  },
  {
    file: 'src/content/recipes/security/password-hashing-production.es.md',
    title: 'Hashing de Contraseñas en Producción',
    description: 'Hashea y verifica contraseñas de forma segura usando bcrypt, scrypt y Argon2 con mejores prácticas.',
    meta: 'Hashing de contraseñas para producción con bcrypt, scrypt y Argon2. Mejores prácticas para almacenamiento seguro de credenciales.',
    keywords: ['bcrypt', 'security', 'authentication', 'nodejs']
  },
  {
    file: 'src/content/recipes/data/batch-processing-patterns.es.md',
    title: 'Patrones de Procesamiento por Lotes',
    description: 'Diseña pipelines robustos de procesamiento por lotes para grandes datasets con retry, idempotencia y observabilidad.',
    meta: 'Patrones de procesamiento por lotes para grandes datasets: diseño de pipelines, retry, idempotencia y mejores prácticas de observabilidad.',
    keywords: ['batch-processing', 'data', 'performance', 'architecture']
  },
  {
    file: 'src/content/recipes/observability/prometheus-api-monitoring.es.md',
    title: 'Monitoreo de APIs con Prometheus',
    description: 'Monitorea rendimiento y salud de APIs con métricas Prometheus, collectors personalizados y reglas de alertamiento.',
    meta: 'Configura monitoreo Prometheus para APIs: métricas personalizadas, collectors, reglas de alertamiento y dashboards de Grafana.',
    keywords: ['prometheus', 'observability', 'api', 'devops']
  },
  {
    file: 'src/content/recipes/security/hmac-request-signing.es.md',
    title: 'Firma de Requests con HMAC',
    description: 'Asegura requests de APIs con firmas HMAC-SHA256 para garantizar integridad y autenticidad.',
    meta: 'Implementa firma de requests HMAC-SHA256 para autenticación de APIs. Protege integridad de mensajes y previene ataques de replay.',
    keywords: ['hmac', 'security', 'api', 'authentication']
  }
];

for (const fix of fixes) {
  let content = fs.readFileSync(fix.file, 'utf8');

  // Replace title
  content = content.replace(
    /title: "\[ES\] .+?"/,
    `title: "${fix.title}"`
  );

  // Replace description
  content = content.replace(
    /description: "\[ES\] .+?"/,
    `description: "${fix.description}"`
  );

  // Replace metaDescription (top-level)
  content = content.replace(
    /metaDescription: "\[ES\] .+?"/,
    `metaDescription: "${fix.meta}"`
  );

  // Replace seo.metaDescription
  content = content.replace(
    /metaDescription: "\[ES\] .+?"/,
    `metaDescription: "${fix.meta}"`
  );

  // Replace seo keywords
  const keywordsBlock = fix.keywords.map(k => `    - ${k}`).join('\n');
  content = content.replace(
    /  keywords:\n((    - \[ES\] .+\n)+)/,
    `  keywords:\n${keywordsBlock}\n`
  );

  fs.writeFileSync(fix.file, content, 'utf8');
  console.log('Fixed:', fix.file);
}

console.log('All ES frontmatters fixed.');
