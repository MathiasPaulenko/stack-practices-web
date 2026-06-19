const fs = require('fs');

const fixes = [
  {
    file: 'src/content/recipes/performance/web-performance.md',
    meta: 'Web performance optimization guide: Core Web Vitals, lazy loading, code splitting, bundle analysis, image optimization, and modern build tools for faster websites.'
  },
  {
    file: 'src/content/recipes/performance/web-performance.es.md',
    meta: 'Guía de optimización de performance web: Core Web Vitals, lazy loading, code splitting, análisis de bundles, optimización de imágenes y herramientas modernas.'
  },
  {
    file: 'src/content/recipes/infrastructure/cost-optimization.md',
    meta: 'Cloud cost optimization strategies: right-sizing, reserved instances, spot instances, auto-scaling policies, and automated resource scheduling for AWS, GCP, and Azure.'
  },
  {
    file: 'src/content/recipes/infrastructure/cost-optimization.es.md',
    meta: 'Estrategias de optimización de costos cloud: right-sizing, reserved instances, spot instances, políticas de auto-scaling y scheduling automatizado.'
  },
  {
    file: 'src/content/recipes/databases/schema-evolution.md',
    meta: 'Database schema evolution: backward-compatible changes, versioned migrations, online DDL, expand-contract pattern, and safe schema changes in production.'
  },
  {
    file: 'src/content/recipes/databases/schema-evolution.es.md',
    meta: 'Evolución de schema de base de datos: cambios backward-compatible, migraciones versionadas, DDL online, patrón expand-contract y cambios seguros en producción.'
  },
  {
    file: 'src/content/recipes/security/container-security.md',
    meta: 'Container security scanning: vulnerability detection with Trivy, Clair, Snyk, image hardening, secret detection, and CI-integrated security gates.'
  },
  {
    file: 'src/content/recipes/security/container-security.es.md',
    meta: 'Escaneo de seguridad de containers: detección de vulnerabilidades con Trivy, Clair, Snyk, hardening de imágenes, detección de secrets y gates de seguridad en CI.'
  },
  {
    file: 'src/content/recipes/devops/traffic-mirroring.md',
    meta: 'Traffic mirroring for production testing: shadow deployments, realistic load testing, performance validation, and safe environment replication without user impact.'
  },
  {
    file: 'src/content/recipes/devops/traffic-mirroring.es.md',
    meta: 'Traffic mirroring para testing en producción: shadow deployments, load testing realista, validación de performance y replicación segura de ambientes sin impacto a usuarios.'
  },
  {
    file: 'src/content/recipes/observability/real-user-monitoring.md',
    meta: 'Real user monitoring RUM: Core Web Vitals, session replay, performance analytics, JavaScript error tracking, and user experience optimization.'
  },
  {
    file: 'src/content/recipes/observability/real-user-monitoring.es.md',
    meta: 'Monitoreo de usuarios reales RUM: Core Web Vitals, session replay, análisis de performance, tracking de errores JavaScript y optimización de experiencia de usuario.'
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

console.log('All batch 17 meta descriptions fixed.');
