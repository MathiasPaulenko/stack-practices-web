const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/architecture/dependency-injection.md',
    meta: 'Dependency injection patterns in TypeScript, Python, Java, and C#. Write testable, decoupled, maintainable code with DI containers and manual injection.'
  },
  {
    file: 'src/content/recipes/architecture/dependency-injection.es.md',
    meta: 'Patrones de inyección de dependencias en TypeScript, Python, Java y C#. Escribe código testeable y desacoplado con contenedores DI e inyección manual.'
  },
  {
    file: 'src/content/recipes/api/rest-api-design.md',
    meta: 'REST API design best practices: HTTP methods, status codes, versioning, pagination, HATEOAS, and resource naming conventions for scalable backends.'
  },
  {
    file: 'src/content/recipes/api/rest-api-design.es.md',
    meta: 'Mejores prácticas para diseñar APIs REST: métodos HTTP, códigos de estado, versionado, paginación, HATEOAS y convenciones de nomenclatura de recursos.'
  },
  {
    file: 'src/content/recipes/frontend/websockets-realtime.md',
    meta: 'WebSocket real-time communication: connection management, reconnection strategies, fallbacks to SSE/long-polling, and scaling WebSocket servers.'
  },
  {
    file: 'src/content/recipes/frontend/websockets-realtime.es.md',
    meta: 'Comunicación en tiempo real con WebSockets: gestión de conexiones, estrategias de reconexión, fallbacks a SSE/long-polling y escalado de servidores WebSocket.'
  },
  {
    file: 'src/content/recipes/performance/caching-strategies.md',
    meta: 'Caching strategies for web applications: Redis, CDN, browser cache, cache invalidation, stale-while-revalidate, and cache stampede prevention.'
  },
  {
    file: 'src/content/recipes/performance/caching-strategies.es.md',
    meta: 'Estrategias de caching para aplicaciones web: Redis, CDN, cache de navegador, invalidación de cache, stale-while-revalidate y prevención de stampede.'
  },
  {
    file: 'src/content/recipes/devops/cicd-pipeline-setup.md',
    meta: 'CI/CD pipeline setup with GitHub Actions: automated testing, building, deployment, environment management, and pipeline security best practices.'
  },
  {
    file: 'src/content/recipes/devops/cicd-pipeline-setup.es.md',
    meta: 'Configuración de pipelines CI/CD con GitHub Actions: testing automatizado, building, deployment, gestión de ambientes y mejores prácticas de seguridad.'
  },
  {
    file: 'src/content/recipes/observability/structured-logging.md',
    meta: 'Structured logging best practices: JSON format, correlation IDs, log levels, aggregation with ELK/Loki, and distributed tracing integration.'
  },
  {
    file: 'src/content/recipes/observability/structured-logging.es.md',
    meta: 'Mejores prácticas de logging estructurado: formato JSON, correlation IDs, niveles de log, agregación con ELK/Loki e integración con trazas distribuidas.'
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

console.log('All batch 13 meta descriptions fixed.');
