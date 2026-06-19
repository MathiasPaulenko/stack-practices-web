const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/performance/web-performance.es.md',
    title: 'Optimización de Performance Web',
    description: 'Mejora Core Web Vitals, reduce tamaños de bundle y optimiza performance frontend con lazy loading, code splitting y herramientas de build modernas.',
    meta: 'Guía de optimización de performance web: Core Web Vitals, lazy loading, code splitting, análisis de bundles, optimización de imágenes y herramientas modernas.',
    keywords: ['web-performance','performance','frontend','core-web-vitals']
  },
  {
    file: 'src/content/recipes/infrastructure/cost-optimization.es.md',
    title: 'Optimización de Costos Cloud',
    description: 'Reduce costos de infraestructura cloud con right-sizing, instancias reservadas, spot instances y scheduling automatizado en AWS, GCP y Azure.',
    meta: 'Estrategias de optimización de costos cloud: right-sizing, reserved instances, spot instances, políticas de auto-scaling y scheduling automatizado.',
    keywords: ['cost-optimization','infrastructure','aws','devops']
  },
  {
    file: 'src/content/recipes/databases/schema-evolution.es.md',
    title: 'Evolución de Schema de Base de Datos',
    description: 'Evoluciona schemas de base de datos de forma segura con cambios backward-compatible, migraciones versionadas y operaciones DDL online en ambientes de producción.',
    meta: 'Evolución de schema de base de datos: cambios backward-compatible, migraciones versionadas, DDL online, patrón expand-contract y cambios seguros en producción.',
    keywords: ['schema-evolution','databases','devops','migrations']
  },
  {
    file: 'src/content/recipes/security/container-security.es.md',
    title: 'Escaneo de Seguridad de Containers',
    description: 'Escanea imágenes de container para vulnerabilidades, misconfiguraciones y secrets con Trivy, Clair y Snyk antes de desplegar a producción.',
    meta: 'Escaneo de seguridad de containers: detección de vulnerabilidades con Trivy, Clair, Snyk, hardening de imágenes, detección de secrets y gates de seguridad en CI.',
    keywords: ['container-security','security','docker','devops']
  },
  {
    file: 'src/content/recipes/devops/traffic-mirroring.es.md',
    title: 'Traffic Mirroring',
    description: 'Replica tráfico de producción a ambientes de staging para testing realista, despliegues shadow y validación de performance sin impactar usuarios.',
    meta: 'Traffic mirroring para testing en producción: shadow deployments, load testing realista, validación de performance y replicación segura de ambientes sin impacto a usuarios.',
    keywords: ['traffic-mirroring','devops','testing','deployment']
  },
  {
    file: 'src/content/recipes/observability/real-user-monitoring.es.md',
    title: 'Monitoreo de Usuarios Reales (RUM)',
    description: 'Monitorea experiencias reales de usuarios con Core Web Vitals, session replay y análisis de performance para identificar cuellos de botella del mundo real.',
    meta: 'Monitoreo de usuarios reales RUM: Core Web Vitals, session replay, análisis de performance, tracking de errores JavaScript y optimización de experiencia de usuario.',
    keywords: ['real-user-monitoring','observability','performance','frontend']
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

console.log('All batch 17 ES frontmatters fixed.');
