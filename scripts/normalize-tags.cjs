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
  'dynamic-routing': ['enrutamiento-dinamico'],
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
  'error-handling': ['manejo-errores'],
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

function normalizeTags(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const match = content.match(/^(---\r?\n[\s\S]*?\r?\n---)/);
  if (!match) return { changed: false, content };

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
