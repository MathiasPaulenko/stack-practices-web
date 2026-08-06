const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');
const CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];

// Map canonical tag -> array of variants to merge into it.
// Applied to both EN and ES content.
const TAG_MERGE_MAP = {
  pattern: ['patterns', 'patron', 'patrones'],
  'design-pattern': ['design-patterns', 'patron-de-diseno', 'patron-diseno'],
  'ai-pattern': ['patron-ai'],
  'architecture-pattern': ['patron-arquitectural'],
  'llm-agent': ['agente-llm'],
  'tool-use': ['uso-herramientas', 'agente-herramientas'],
  'agent-approval': ['aprobacion-agente'],
  'human-review': ['revision-humana'],
  'decision-gating': ['gating-decisiones', 'decisiones-gating'],
  'output-filtering': ['filtrado-salida'],
  'model-selection': ['seleccion-modelo'],
  'multi-step': ['multi-paso'],
  'task-decomposition': ['descomposicion-tareas'],
  'risk-reduction': ['reduccion-riesgo'],
  'fault-tolerance': ['tolerancia-a-fallos', 'tolerancia-fallos'],
  rings: ['anillos'],
  audit: ['auditoria'],
  'distributed-systems': ['sistemas-distribuidos'],
  architecture: ['arquitectura'],
  database: ['databases', 'base-de-datos'],
  images: ['imagenes'],
  'real-time': ['tiempo-real'],
  'agent-tool-selection': ['seleccion-herramientas-agente'],
  'cost-optimization': ['optimizacion-costos'],
  'vector-search': ['busqueda-vectorial'],
  security: ['seguridad'],
  'error-handling': ['manejo-errores', 'manejo-de-errores'],
  resilience: ['resiliencia'],
  'provider-chain': ['cadena-proveedores'],
  'llm-security': ['seguridad-llm'],
  'input-validation': ['validacion-entrada'],
  routing: ['enrutamiento'],
  recovery: ['recuperacion'],
  structural: ['estructural'],
  decoupling: ['desacoplamiento'],
  abstraction: ['abstraccion'],
  performance: ['rendimiento'],
  behavioral: ['comportamiento'],
  scalability: ['escalabilidad'],
  'progressive-rollout': ['rollout-progresivo', 'despliegue-progresivo'],
  creational: ['creacional'],
  microservices: ['microservicios'],
  cloud: ['nube'],
  queue: ['cola'],
  'database-design': ['diseno-base-datos'],
  'cap-theorem': ['teorema-cap'],
  'eventual-consistency': ['consistencia-eventual'],
  'consistency-models': ['modelos-consistencia'],
  'read-performance': ['rendimiento-lectura'],
  'data-redundancy': ['redundancia-datos'],
  'materialized-view': ['vista-materializada'],
  'double-dispatch': ['doble-despacho'],
  community: ['comunidad'],
  'partial-failure': ['fallo-parcial'],
  'idempotent-consumer': ['consumidor-idempotente'],
  'distributed-transactions': ['transacciones-distribuidas'],
  'sequential-convoy': ['convoy-secuencial'],
  ordering: ['ordenamiento'],
  sequence: ['secuencia'],
  growth: ['crecimiento'],
  'overload-protection': ['proteccion-sobrecarga'],
  'load-testing': ['pruebas-carga'],
  'data-partitioning': ['particionamiento-datos'],
  'database-sharding': ['sharding'],
  'secrets-management': ['gestion-secretos'],
  runbook: ['runbooks'],
  pipeline: ['pipelines'],
  containers: ['container'],
  'cold-start': ['cold-starts'],
  agents: ['agent'],
  workflow: ['workflows'],
  websockets: ['websocket'],
  'health-check': ['health-checks'],
  benchmarks: ['benchmark'],
  'pull-request': ['pull-requests'],
  configmap: ['configmaps'],
  'consumer-group': ['consumer-groups'],
  stub: ['stubs'],
  saga: ['sagas'],
  algorithm: ['algorithms'],
  executor: ['executors'],
  timeout: ['timeouts'],
  connection: ['connections'],
  mutation: ['mutations'],
  'correlation-id': ['correlation-ids'],
  dashboard: ['dashboards'],
  'test-case': ['test-cases'],
  comunicacion: ['comunicación'],
  documentacion: ['documentación'],
  'socket-io': ['socket.io'],
  'n-plus-one': ['n+1'],
  guide: ['guia'],
  template: ['plantilla'],
  documentation: ['documentacion'],
  metrics: ['metricas'],
  observability: ['observabilidad'],
  messaging: ['mensajeria'],
  databases: ['bases-de-datos'],
  communication: ['comunicacion'],
  concurrency: ['concurrencia'],
  'access-control': ['control-de-acceso'],
  partitioning: ['particionamiento'],
  operations: ['operaciones'],
  migration: ['migracion'],
  availability: ['disponibilidad'],
  'best-practices': ['mejores-practicas'],
  monolith: ['monolito'],
  indexing: ['indexacion'],
  'query-optimization': ['optimizacion-de-consultas', 'optimizacion-consultas'],
  maintainability: ['mantenibilidad'],
  'horizontal-scaling': ['escalado-horizontal', 'escala-horizontal'],
  readability: ['legibilidad'],
  'read-model': ['modelo-lectura'],
  'write-model': ['modelo-escritura'],
  tree: ['arbol'],
  hierarchy: ['jerarquia'],
  'database-indexing': ['indexacion-base-datos'],
  'database-normalization': ['normalizacion', 'normalizacion-base-datos'],
  'data-denormalization': ['desnormalizacion'],
  'materialized-views': ['vistas-materializadas'],
  'database-replication': ['replicacion-base-datos'],
  'high-availability': ['alta-disponibilidad'],
  'graph-database': ['base-datos-grafos', 'grafo-propiedades'],
  'recommendation-engine': ['motor-recomendacion'],
  'vector-database': ['base-datos-vectorial'],
  'time-series': ['series-temporales'],
  'window-functions': ['funciones-ventana'],
  'common-table-expression': ['expresion-tabla-comun'],
  'recursive-cte': ['cte-recursiva'],
  'dependency-scanning': ['escaneo-dependencias'],
  'zero-downtime': ['cero-downtime'],
  'disaster-recovery': ['recuperacion-desastres'],
  'incident-response': ['respuesta-a-incidentes'],
  'api-security': ['seguridad-api'],
  'web-security': ['seguridad-web'],
  'test-driven-development': ['desarrollo-guiado-por-pruebas'],
  'unit-testing': ['pruebas-unitarias'],
  'version-control': ['control-de-versiones'],
  'capacity-planning': ['planificacion-capacidad'],
  'auto-scaling': ['auto-escalado'],
  'load-balancing': ['nivelacion-de-carga'],
  'queue-based-load-leveling': ['nivelacion-de-carga-basada-en-colas'],
  'transient-failures': ['fallas-transitorias'],
  'exponential-backoff': ['backoff-exponencial'],
  compensation: ['compensacion'],
  'job-management': ['gestion-de-trabajos'],
  'state-snapshot': ['instantanea-de-estado'],
  'priority-queue': ['cola-de-prioridad'],
  'finite-state-machine': ['maquina-de-estados'],
  'static-content-hosting': ['hosting-de-contenido-estatico'],
  'object-storage': ['almacenamiento-de-objetos'],
  'cloud-costs': ['costos-cloud'],
  'right-sizing': ['dimensionamiento'],
  'reserved-instances': ['instancias-reservadas'],
  'spot-instances': ['instancias-spot'],
  tagging: ['etiquetado'],
  'traffic-management': ['gestion-trafico'],
  'error-budget': ['presupuesto-error'],
  'on-call': ['guardia'],
  'knowledge-management': ['gestion-del-conocimiento'],
  'technical-writing': ['escritura-tecnica'],
  modules: ['modulos'],
  'remote-state': ['estado-remoto'],
  forecasting: ['pronostico'],
  patching: ['parches'],
  compliance: ['cumplimiento'],
  'risk-assessment': ['evaluacion-de-riesgos'],
  'vulnerability-management': ['gestion-de-vulnerabilidades'],
  deduplication: ['deduplicacion'],
  idempotency: ['idempotencia'],
  grammar: ['gramatica'],
  traversal: ['recorrido'],
  collection: ['coleccion'],
  coordination: ['coordinacion'],
  undo: ['deshacer'],
  algorithm: ['algoritmo'],
  inheritance: ['herencia'],
  'hanging-operations': ['operaciones-colgadas'],
  matrix: ['matriz'],
  evaluation: ['evaluacion'],
  versioning: ['versionado'],
  deprecation: ['deprecacion'],
  policy: ['politica'],
  'service-level-agreement': ['acuerdo-de-nivel-de-servicio'],
  production: ['produccion'],
  design: ['diseno'],
  decomposition: ['descomposicion'],
  modernization: ['modernizacion'],
  refactoring: ['refactorizacion'],
  interview: ['entrevista'],
  parallelism: ['paralelismo'],
  semaphore: ['semaforo'],
  consistency: ['consistencia'],
  'partition-tolerance': ['tolerancia-a-particiones'],
  'data-embedding': ['embebido'],
  referencing: ['referenciado'],
  'query-organization': ['organizacion-consultas'],
  analytics: ['analitica'],
  'retention-policy': ['politica-retencion'],
  'similarity-search': ['busqueda-similitud'],
  'object-oriented-design': ['diseno-orientado-a-objetos'],
  principles: ['principios'],
  'team-practices': ['practicas-equipo'],
  quality: ['calidad'],
  development: ['desarrollo'],
  orchestration: ['orquestacion'],
  alerts: ['alertas'],
  monitoring: ['monitoreo'],
  instrumentation: ['instrumentacion'],
  workflow: ['flujo-de-trabajo'],
  'deployment-strategy': ['estrategia-despliegue'],
  'memory-optimization': ['optimizacion-de-memoria'],
  scheduling: ['programacion'],
  'scheduler-agent-supervisor': ['programador-agente-supervisor'],
  duplication: ['duplicacion'],
  guidelines: ['guideline'],
  transactions: ['transacciones'],
  'database-tradeoffs': ['tradeoffs-base-de-datos'],
  'database-performance': ['rendimiento-base-datos'],
  'database-selection': ['seleccion-base-de-datos'],
  'data-modeling': ['modelado-datos'],
  'database-indexing': ['indexacion-base-datos'],
  // --- Round 4: singular/plural and technical compound merges ---
  vulnerabilities: ['vulnerability'],
  http: ['https'],
  'cloud-costs': ['cloud-cost'],
  environments: ['environment'],
  backup: ['backups'],
  certificates: ['certificate'],
  edge: ['edges'],
  embeddings: ['embedding'],
  extensions: ['extension'],
  migration: ['migrations'],
  'read-model': ['read-models'],
  report: ['reports'],
  'vector-database': ['vector-databases'],
  acid: ['acid-transactions'],
  adapter: ['adapter-pattern'],
  airflow: ['apache-airflow'],
  mocking: ['api-mocking'],
  versioning: ['api-versioning'],
  apollo: ['apollo-client', 'apollo-federation'],
  async: ['async-await', 'async-generator', 'async-iteration', 'async-processing', 'async-stream'],
  audit: ['audit-log', 'audit-logging', 'audit-trail', 'security-audit'],
  serverless: ['aurora-serverless'],
  aws: ['aws-step-functions'],
  azure: ['azure-blob', 'azure-sql'],
  backend: ['backend-for-frontend'],
  compatibility: ['backward-compatibility'],
  'blue-green': ['blue-green-deployment'],
  browser: ['browser-cache', 'browser-support', 'cross-browser'],
  caching: ['caching-pattern', 'cache-annotations', 'cache-api', 'cache-consistency', 'cache-control', 'cache-keys', 'cache-miss', 'cache-rules', 'cache-strategy', 'cache-warmup', 'database-cache', 'declarative-caching', 'edge-caching'],
  canary: ['canary-release'],
  governance: ['cloud-governance', 'gobernanza'],
  storage: ['cloud-storage'],
  composite: ['composite-entity', 'composite-index'],
  composition: ['composition-api'],
  validation: ['continuous-validation'],
  partitioning: ['data-partitioning'],
  pipeline: ['data-pipeline'],
  optimization: ['database-optimization'],
  deployment: ['deployment-ring'],
  environment: ['dev-environment'],
  hardening: ['device-hardening'],
  docker: ['docker-swarm'],
  isolation: ['data-isolation'],
  extraction: ['data-extraction'],
  events: ['domain-events'],
  tokens: ['design-tokens'],
  matrix: ['decision-matrix'],
  conversion: ['conversion-optimization'],
  cost: ['cost-analysis', 'cost-estimation', 'cost-tracking'],
  contract: ['contract-testing'],
  integration: ['continuous-integration'],
  management: ['change-management', 'cluster-management', 'alert-management', 'api-management'],
};

function normalizeTag(tag) {
  return tag
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

const variantToCanonical = new Map();
for (const [canonical, variants] of Object.entries(TAG_MERGE_MAP)) {
  for (const v of variants) {
    variantToCanonical.set(v, canonical);
  }
}

function findFiles(dir, files = []) {
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    if (fs.statSync(p).isDirectory()) {
      findFiles(p, files);
    } else if (item.endsWith('.md')) {
      files.push(p);
    }
  }
  return files;
}

function stripBom(content) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

function normalizeTags(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const content = stripBom(raw);
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const match = content.match(/^(---\r?\n[\s\S]*?\r?\n---)/);
  if (!match) return { changed: false, content: raw };

  const frontmatter = match[1];
  const tagsMatch = frontmatter.match(/tags:\r?\n([\s\S]*?)(?=\r?\n[a-zA-Z]|\r?\n---)/);
  if (!tagsMatch) return { changed: false, content };

  const tagsBlock = tagsMatch[0];
  const lines = tagsBlock.split(/\r?\n/);
  const header = lines[0]; // "tags:"
  const tagLines = lines.slice(1);

  const originalTags = tagLines
    .map((line) => line.trim().replace(/^- /, ''))
    .filter(Boolean);

  const seen = new Set();
  const newTags = [];
  for (const tag of originalTags) {
    let canonical = variantToCanonical.get(tag) || tag;
    canonical = normalizeTag(canonical);
    // If a canonical merge target has its own variant, prefer the mapped canonical.
    canonical = variantToCanonical.get(canonical) || canonical;
    if (!seen.has(canonical)) {
      seen.add(canonical);
      newTags.push(canonical);
    }
  }

  if (newTags.length !== originalTags.length || newTags.some((t, i) => t !== originalTags[i])) {
    const newTagsBlock = [header, ...newTags.map((t) => `  - ${t}`)].join('\n');
    // Restore CRLF if the file uses it.
    const newTagsBlockEol = eol === '\r\n' ? newTagsBlock.replace(/\n/g, '\r\n') : newTagsBlock;
    const newFrontmatter = frontmatter.replace(tagsBlock, newTagsBlockEol);
    const newContent = content.replace(frontmatter, newFrontmatter);
    return { changed: true, content: newContent, originalTags, newTags };
  }

  return { changed: false, content };
}

function main() {
  let updated = 0;
  const stats = {};

  for (const type of CONTENT_TYPES) {
    const dir = path.join(CONTENT_DIR, type);
    if (!fs.existsSync(dir)) continue;
    for (const file of findFiles(dir)) {
      const { changed, content, originalTags, newTags } = normalizeTags(file);
      if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        updated++;
        const key = originalTags.filter((t, i) => t !== newTags[i]).join(',') || 'deduped';
        stats[key] = (stats[key] || 0) + 1;
      }
    }
  }

  console.log(`Updated ${updated} files.`);
  if (Object.keys(stats).length > 0) {
    console.log('Sample changes:', Object.entries(stats).slice(0, 20));
  }
}

main();
