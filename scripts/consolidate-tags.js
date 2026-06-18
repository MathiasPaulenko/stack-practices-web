/**
 * Tag consolidation script.
 * Reads all content markdown files, applies tag merge rules,
 * and writes back the updated frontmatter.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');

/**
 * Map of tags to REMOVE.
 * If a tag maps to null/undefined, it is simply deleted.
 * If it maps to a string, it is replaced with that string.
 */
const TAG_MERGE_MAP = {
  // --- Docs / Templates ---
  'adr': 'architecture-decision-record',
  'decision-records': 'architecture-decision-record',
  'rfc': 'architecture-decision-record',
  'api-deprecation': 'api-versioning',
  'sunset-policy': 'api-versioning',
  'bug-report': 'issue-tracking',
  'qa': 'issue-tracking',
  'defect': 'issue-tracking',
  'code-of-conduct': 'governance',
  'contributing': 'governance',
  'guidelines': 'governance',
  'data-retention': 'compliance',
  'gdpr': 'compliance',
  'privacy': 'compliance',
  'database-migration': 'database-migrations',
  'schema-change': 'database-migrations',
  'dependency-audit': 'security-audit',
  'supply-chain': 'security-audit',
  'license-compliance': 'security-audit',
  'vulnerability-scanning': 'security-audit',
  'disaster-recovery': 'business-continuity',
  'dr-plan': 'business-continuity',
  'rto': null,
  'rpo': null,
  'environment-setup': 'developer-experience',
  'local-development': 'developer-experience',
  'devcontainer': 'developer-experience',
  'feature-request': 'product-management',
  'backlog': 'product-management',
  'new-hire': 'onboarding',
  'team': 'onboarding',
  'penetration-test': 'security-testing',
  'pentest': 'security-testing',
  'security-assessment': 'security-testing',
  'vulnerability-report': 'security-testing',
  'post-deployment': 'deployment',
  'verification': 'deployment',
  'checklist': 'deployment',
  'smoke-test': 'deployment',
  'readme': 'documentation',
  'security-incident': 'incident-response',
  'breach': 'incident-response',
  'forensics': 'incident-response',
  'slo': 'reliability-engineering',
  'error-budget': 'reliability-engineering',
  'acceptance-criteria': 'user-story',
  'agile': 'product-management',

  // --- Guides ---
  'design': null, // covered by rest, api, architecture
  'ddd': 'domain-driven-design',
  'bounded-context': 'domain-driven-design',
  'aggregate': 'domain-driven-design',
  'entity': 'domain-driven-design',
  'value-object': 'domain-driven-design',
  'message-broker': 'messaging',
  'decomposition': 'microservices',
  'strangler-fig': 'migration',
  'modernization': 'migration',
  'layered-architecture': 'architecture',
  'software-design': 'architecture',
  'system-design': 'architecture',
  'interview': null,
  'async': 'concurrency',
  'threading': 'concurrency',
  'parallelism': 'concurrency',
  'thread-pool': 'concurrency',
  'semaphore': 'concurrency',
  'mutex': 'concurrency',
  'race-conditions': 'concurrency',
  'cap-theorem': 'distributed-systems',
  'consistency': 'distributed-systems',
  'availability': 'distributed-systems',
  'partition-tolerance': 'distributed-systems',
  'database-tradeoffs': 'distributed-systems',
  'normalization': 'database-design',
  'relational-databases': 'database-design',
  'schema-design': 'database-design',
  'er-diagram': 'database-design',
  'foreign-keys': 'database-design',
  'partitioning': 'sharding',
  'horizontal-scaling': 'sharding',
  'database-performance': 'sharding',
  'database-selection': 'nosql',
  'query-optimization': 'sql',
  'explain-plan': 'sql',
  'readability': 'clean-code',
  'peer-review': 'code-review',
  'quality': 'code-review',
  'team-practices': 'code-review',
  'object-oriented-design': 'solid',
  'principles': 'solid',
  'cicd': 'ci-cd',
  'blue-green': 'deployment',
  'canary': 'deployment',
  'dockerfile': 'docker',
  'docker-compose': 'docker',
  'development': 'docker',
  'gitflow': 'git',
  'github-flow': 'git',
  'trunk-based-development': 'git',
  'version-control': 'git',
  'infrastructure-as-code': 'infrastructure',
  'iac': 'infrastructure',
  'cloud': 'infrastructure',
  'orchestration': 'kubernetes',
  'kubectl': 'kubernetes',

  // --- Patterns ---
  'factory-family': 'abstract-factory',
  'compatibility': 'adapter',
  'client-side-proxy': 'ambassador',
  'service-discovery': 'ambassador',
  'abstraction': 'bridge',
  'fluent-interface': 'builder',
  'isolation': 'bulkhead',
  'fault-containment': 'bulkhead',
  'tree': 'composite',
  'hierarchy': 'composite',
  'read-model': 'cqrs',
  'write-model': 'cqrs',
  'composition': 'decorator',
  'di': 'dependency-injection',
  'ioc': 'dependency-injection',
  'memory-optimization': 'flyweight',
  'lazy-loading': 'proxy', // proxy already exists
  'memory-cache': 'cache', // if exists

  // --- Recipes ---
  'assistants-api': 'openai',
  'conversation': 'openai',
  'lora': 'fine-tuning',
  'qlora': 'fine-tuning',
  'hugging-face': 'fine-tuning',
  'code-generation': 'fine-tuning',
  'langchain': 'rag',
  'vector-database': 'rag',
  'vector-similarity': 'embeddings',
  'faiss': 'embeddings',
  'nlp': 'embeddings',
  'redoc': 'openapi',
  'audit-trail': 'logging',
  'apollo': 'graphql',
  'strawberry': 'graphql',
  'grpc': 'protobuf',
  'rpc': 'protobuf',
  'headers': 'cors',
  'http-status': 'error-handling',
  'safety': 'idempotency',
  'screenshot-testing': 'visual-regression',
  'aes-256': 'encryption',
  'kms': 'encryption',
  'csrf': 'web-security',
  'security-headers': 'web-security',
  'hsts': 'web-security',
  'csp': 'web-security',
  'base-de-datos': 'database',
  'seguridad': 'security',
  'imagenes': 'images',
  'componentes': 'components',
  'tiempo-real': 'real-time',
  'immutable-events': 'event-sourcing',
};

/**
 * Tags to DELETE entirely (not replaced by anything).
 * These are too specific, redundant, or covered by other tags in the same article.
 */
const TAGS_TO_DELETE = new Set([
  'rto',
  'rpo',
  'interview',
]);

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

function updateTagsInFrontmatter(frontmatter) {
  const lines = frontmatter.split('\n');
  let inTags = false;
  let tagIndent = '';
  const result = [];
  let skipUntil = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (skipUntil > i) continue;

    // Detect start of tags block
    if (!inTags && line.trim() === 'tags:') {
      inTags = true;
      tagIndent = '';
      result.push(line);
      continue;
    }

    // End of tags block (new key or blank line before new key)
    if (inTags) {
      if (line.trim() === '') {
        inTags = false;
        result.push(line);
        continue;
      }
      if (!line.trim().startsWith('-')) {
        // It's a new key, not a tag item
        inTags = false;
        result.push(line);
        continue;
      }

      // It's a tag line: "  - tag-name"
      const tagMatch = line.match(/^(\s*)-\s*(.+)$/);
      if (tagMatch) {
        const indent = tagMatch[1];
        const tag = tagMatch[2].trim();
        tagIndent = indent;

        if (TAGS_TO_DELETE.has(tag)) {
          continue; // skip this tag
        }

        const replacement = TAG_MERGE_MAP[tag];
        if (replacement === null) {
          continue; // skip this tag
        }
        if (replacement) {
          result.push(`${indent}- ${replacement}`);
        } else {
          result.push(line); // keep as-is
        }
      } else {
        result.push(line);
      }
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

function main() {
  const files = findMarkdownFiles(CONTENT_DIR);
  let modifiedCount = 0;
  const stats = { removed: 0, replaced: 0, kept: 0 };

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);
    if (!frontmatter) continue;

    const updatedFm = updateTagsInFrontmatter(frontmatter);
    if (updatedFm !== frontmatter) {
      const newContent = '---\n' + updatedFm + '\n---' + body;
      fs.writeFileSync(file, newContent, 'utf8');
      modifiedCount++;
    }
  }

  console.log(`Modified ${modifiedCount} files.`);
}

main();
