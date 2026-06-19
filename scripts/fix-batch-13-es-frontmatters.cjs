const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/architecture/dependency-injection.es.md',
    title: 'Inyección de Dependencias',
    description: 'Implementa inyección de dependencias para escribir código testeable, desacoplado y mantenible en múltiples lenguajes y frameworks.',
    meta: 'Patrones de inyección de dependencias en TypeScript, Python, Java y C#. Escribe código testeable y desacoplado con contenedores DI e inyección manual.',
    keywords: ['dependency-injection','architecture','typescript','java','python']
  },
  {
    file: 'src/content/recipes/api/rest-api-design.es.md',
    title: 'Diseño de APIs REST: Mejores Prácticas',
    description: 'Diseña APIs REST robustas y escalables con métodos HTTP adecuados, códigos de estado, versionado y estrategias de paginación.',
    meta: 'Mejores prácticas para diseñar APIs REST: métodos HTTP, códigos de estado, versionado, paginación, HATEOAS y convenciones de nomenclatura de recursos.',
    keywords: ['rest-api','api-design','http','backend']
  },
  {
    file: 'src/content/recipes/frontend/websockets-realtime.es.md',
    title: 'WebSockets para Comunicación en Tiempo Real',
    description: 'Construye comunicación bidireccional en tiempo real con WebSockets, manejando gestión de conexiones, reconexión y fallbacks.',
    meta: 'Comunicación en tiempo real con WebSockets: gestión de conexiones, estrategias de reconexión, fallbacks a SSE/long-polling y escalado de servidores WebSocket.',
    keywords: ['websocket','real-time','nodejs','frontend']
  },
  {
    file: 'src/content/recipes/performance/caching-strategies.es.md',
    title: 'Estrategias de Caching',
    description: 'Implementa estrategias de caching efectivas para bases de datos, APIs y frontends usando Redis, CDNs y caches de navegador.',
    meta: 'Estrategias de caching para aplicaciones web: Redis, CDN, cache de navegador, invalidación de cache, stale-while-revalidate y prevención de stampede.',
    keywords: ['caching','performance','redis','cdn']
  },
  {
    file: 'src/content/recipes/devops/cicd-pipeline-setup.es.md',
    title: 'Configuración de Pipelines CI/CD',
    description: 'Configura pipelines CI/CD automatizados para testing, building y deployment de aplicaciones con GitHub Actions y mejores prácticas.',
    meta: 'Configuración de pipelines CI/CD con GitHub Actions: testing automatizado, building, deployment, gestión de ambientes y mejores prácticas de seguridad.',
    keywords: ['ci-cd','devops','github-actions','automation']
  },
  {
    file: 'src/content/recipes/observability/structured-logging.es.md',
    title: 'Logging Estructurado',
    description: 'Implementa logging estructurado con salida JSON, correlation IDs y agregación de logs para observabilidad en producción.',
    meta: 'Mejores prácticas de logging estructurado: formato JSON, correlation IDs, niveles de log, agregación con ELK/Loki e integración con trazas distribuidas.',
    keywords: ['logging','observability','elk','devops']
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
  console.log('Fixed:', fix.file);
}

console.log('All batch 13 ES frontmatters fixed.');
