/**
 * Combined tag consolidation + general tag addition script.
 * 1. Removes redundant / overly-specific tags.
 * 2. Adds general tags based on topics.
 *
 * Uses regex on normalized frontmatter to precisely target the tags block.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');

// === Tags to REMOVE (redundant, too specific, or synonyms) ===
const TAGS_TO_REMOVE = new Set([
  // Docs / Templates
  'decision-records', 'rfc',
  'api-deprecation', 'sunset-policy',
  'bug-report', 'qa', 'defect',
  'code-of-conduct', 'governance',
  'contributing', 'guidelines',
  'data-retention', 'gdpr', 'privacy',
  'database-migration', 'schema-change',
  'dependency-audit', 'supply-chain', 'license-compliance', 'vulnerability-scanning',
  'disaster-recovery', 'dr-plan', 'rto', 'rpo', 'business-continuity',
  'environment-setup', 'local-development', 'devcontainer',
  'feature-request', 'backlog',
  'new-hire', 'team',
  'penetration-test', 'pentest', 'security-assessment', 'vulnerability-report',
  'post-deployment', 'verification', 'checklist', 'smoke-test',
  'readme',
  'security-incident', 'breach', 'forensics',
  'slo', 'error-budget',
  'acceptance-criteria', 'agile',

  // Guides
  'design',
  'ddd', 'bounded-context', 'aggregate', 'entity', 'value-object',
  'message-broker', 'kafka', 'rabbitmq',
  'decomposition',
  'strangler-fig', 'modernization',
  'layered-architecture', 'software-design',
  'system-design', 'interview',
  'async', 'threading', 'parallelism', 'thread-pool', 'semaphore', 'mutex', 'race-conditions',
  'cap-theorem', 'consistency', 'availability', 'partition-tolerance', 'database-tradeoffs',
  'normalization', 'relational-databases', 'schema-design', 'er-diagram', 'foreign-keys',
  'partitioning', 'horizontal-scaling', 'database-performance',
  'database-selection',
  'query-optimization', 'explain-plan',
  'readability',
  'peer-review', 'quality', 'team-practices',
  'object-oriented-design', 'principles',
  'cicd',
  'blue-green', 'canary',
  'dockerfile', 'docker-compose', 'development',
  'gitflow', 'github-flow', 'trunk-based-development', 'version-control',
  'infrastructure-as-code', 'iac', 'cloud',
  'orchestration', 'kubectl',

  // Patterns
  'factory-family',
  'compatibility',
  'client-side-proxy', 'service-discovery',
  'abstraction',
  'fluent-interface',
  'isolation', 'fault-containment',
  'tree', 'hierarchy',
  'read-model', 'write-model',
  'composition',
  'di', 'ioc',
  'memory-optimization',

  // Recipes
  'assistants-api', 'conversation',
  'lora', 'qlora', 'hugging-face', 'code-generation',
  'langchain', 'vector-database',
  'vector-similarity', 'faiss', 'nlp',
  'redoc',
  'audit-trail',
  'apollo', 'strawberry',
  'grpc', 'rpc',
  'headers',
  'http-status',
  'safety',
  'screenshot-testing',
  'aes-256', 'kms',
  'csrf', 'security-headers', 'hsts', 'csp',
]);

// === Tags to RENAME: old -> new ===
const TAG_RENAMES = {
  'cicd': 'ci-cd',
  'k8s': 'kubernetes',
};

// === General tags to add based on topics ===
const TOPIC_TO_TAG = {
  'ai': 'ai',
  'security': 'security',
  'performance': 'performance',
  'databases': 'database',
  'testing': 'testing',
  'devops': 'devops',
  'api': 'api',
  'frontend': 'frontend',
  'serverless': 'serverless',
  'caching': 'caching',
  'concurrency': 'concurrency',
  'messaging': 'messaging',
  'observability': 'observability',
  'infrastructure': 'infrastructure',
  'graphql': 'graphql',
  'architecture': 'architecture',
  'design': 'design',
  'file-handling': 'file-handling',
  'data': 'data',
  'authentication': 'authentication',
};

function findMarkdownFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMarkdownFiles(fullPath, files);
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { frontmatter: null, body: content };
  const end = content.indexOf('---', 3);
  if (end === -1) return { frontmatter: null, body: content };
  return {
    frontmatter: content.slice(3, end).trim(),
    body: content.slice(end + 3),
  };
}

function getTopics(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  let inTopics = false;
  const topics = [];
  for (const line of lines) {
    if (!inTopics && line.trim() === 'topics:') {
      inTopics = true;
      continue;
    }
    if (inTopics) {
      if (line.trim() === '' || (!line.trim().startsWith('-') && line.trim() !== '')) {
        break;
      }
      const match = line.match(/^\s*-\s*(.+)$/);
      if (match) topics.push(match[1].trim());
    }
  }
  return topics;
}

function processFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const { frontmatter, body } = parseFrontmatter(content);
  if (!frontmatter) return { changed: false };

  // Normalize line endings for processing
  const normalizedFm = frontmatter.replace(/\r\n/g, '\n');

  // === Step 1: Extract and modify tags ===
  const tagsRegex = /^(tags:\n((?:[ \t]*-[^\n]*\n)+))/m;
  const match = normalizedFm.match(tagsRegex);
  if (!match) return { changed: false };

  const tagsBlock = match[1];
  const tagLines = tagsBlock.split('\n').filter(line => line.trim().startsWith('-'));
  const tags = tagLines.map(line => {
    const m = line.match(/^\s*-\s*(.+)$/);
    return m ? m[1].trim() : null;
  }).filter(Boolean);

  // Remove redundant tags
  let newTags = tags.filter(tag => !TAGS_TO_REMOVE.has(tag));

  // Apply renames
  newTags = newTags.map(tag => TAG_RENAMES[tag] || tag);

  // Remove duplicates
  newTags = [...new Set(newTags)];

  // === Step 2: Add general tags based on topics ===
  const topics = getTopics(normalizedFm);
  const generalTagsToAdd = [];
  for (const topic of topics) {
    const generalTag = TOPIC_TO_TAG[topic];
    if (generalTag && !newTags.includes(generalTag) && !TAGS_TO_REMOVE.has(generalTag)) {
      generalTagsToAdd.push(generalTag);
    }
  }
  newTags = newTags.concat(generalTagsToAdd);

  // If nothing changed, skip
  const originalTagsStr = tags.sort().join(',');
  const newTagsStr = newTags.sort().join(',');
  if (originalTagsStr === newTagsStr) return { changed: false };

  // === Step 3: Rebuild tags block ===
  const newTagsBlock = 'tags:\n' + newTags.map(t => `  - ${t}`).join('\n') + '\n';
  const updatedFm = normalizedFm.replace(tagsRegex, newTagsBlock);

  // Preserve original line endings for the output
  const usesCRLF = content.includes('\r\n');
  const finalFm = usesCRLF ? updatedFm.replace(/\n/g, '\r\n') : updatedFm;

  const newContent = '---\n' + finalFm + '\n---' + body;
  fs.writeFileSync(file, newContent, 'utf8');

  return {
    changed: true,
    removed: tags.length - newTags.length + generalTagsToAdd.length,
    added: generalTagsToAdd.length,
    newTags,
  };
}

function main() {
  const files = findMarkdownFiles(CONTENT_DIR);
  let modifiedCount = 0;
  let totalRemoved = 0;
  let totalAdded = 0;

  for (const file of files) {
    const result = processFile(file);
    if (result.changed) {
      modifiedCount++;
      totalRemoved += result.removed;
      totalAdded += result.added;
    }
  }

  console.log(`Modified ${modifiedCount} files.`);
  console.log(`Tags added: ${totalAdded}`);
  console.log(`Net change (removed - added): ${totalRemoved}`);
}

main();
