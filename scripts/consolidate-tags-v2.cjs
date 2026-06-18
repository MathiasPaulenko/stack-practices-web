/**
 * Tag consolidation script v2.
 * Strategy:
 * 1. Remove redundant / overly-specific tags that are covered by broader tags in the same article.
 * 2. Merge obvious synonyms.
 * 3. Keep each article to 3-5 highly relevant tags.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');

// Tags to DELETE from any article (too specific, redundant, or synonym of a broader tag)
const TAGS_TO_REMOVE = new Set([
  // --- Templates (docs) --- overly-specific variants
  'decision-records',    // covered by 'adr' or 'template'
  'rfc',                 // covered by 'adr' or 'template'
  'api-deprecation',     // covered by 'template', 'api'
  'sunset-policy',       // covered by 'template', 'api'
  'bug-report',          // covered by 'template', 'devops'
  'qa',                  // covered by 'template', 'devops'
  'defect',              // covered by 'template', 'devops'
  'code-of-conduct',     // covered by 'template', 'devops'
  'governance',          // covered by 'template', 'devops'
  'contributing',        // covered by 'template', 'open-source'
  'guidelines',          // covered by 'template', 'open-source'
  'data-retention',      // covered by 'template', 'compliance'
  'gdpr',                // covered by 'template', 'compliance'
  'privacy',             // covered by 'template', 'compliance'
  'database-migration',  // covered by 'template', 'databases'
  'schema-change',       // covered by 'template', 'databases'
  'dependency-audit',    // covered by 'template', 'security'
  'supply-chain',        // covered by 'template', 'security'
  'license-compliance',  // covered by 'template', 'security'
  'vulnerability-scanning', // covered by 'template', 'security'
  'disaster-recovery',   // covered by 'template', 'devops'
  'dr-plan',             // covered by 'template', 'devops'
  'rto',                 // too specific
  'rpo',                 // too specific
  'business-continuity', // covered by 'template', 'devops'
  'environment-setup',   // covered by 'template', 'devops'
  'local-development',   // covered by 'template', 'devops'
  'devcontainer',        // covered by 'template', 'devops'
  'feature-request',     // covered by 'template', 'product-management'
  'backlog',             // covered by 'template', 'product-management'
  'new-hire',            // covered by 'template', 'onboarding'
  'team',                // covered by 'template', 'onboarding'
  'penetration-test',    // covered by 'template', 'security'
  'pentest',             // covered by 'template', 'security'
  'security-assessment', // covered by 'template', 'security'
  'vulnerability-report',// covered by 'template', 'security'
  'post-deployment',     // covered by 'template', 'deployment'
  'verification',        // covered by 'template', 'deployment'
  'checklist',           // covered by 'template', 'deployment'
  'smoke-test',          // covered by 'template', 'deployment'
  'readme',              // covered by 'template', 'documentation'
  'security-incident',   // covered by 'template', 'security'
  'breach',              // covered by 'template', 'security'
  'forensics',           // covered by 'template', 'security'
  'slo',                 // covered by 'template', 'devops'
  'error-budget',        // covered by 'template', 'devops'
  'acceptance-criteria', // covered by 'template', 'design'
  'agile',               // covered by 'template', 'product-management'

  // --- Guides ---
  'design',              // REST API Design guide already has 'rest', 'api', 'architecture'
  'ddd',                 // synonym of 'domain-driven-design'
  'bounded-context',     // DDD sub-concept, too specific
  'aggregate',           // DDD sub-concept, too specific
  'entity',              // DDD sub-concept, too specific
  'value-object',        // DDD sub-concept, too specific
  'message-broker',      // covered by 'event-driven', 'messaging'
  'kafka',               // covered by 'event-driven', 'messaging'
  'rabbitmq',            // covered by 'event-driven', 'messaging'
  'decomposition',       // covered by 'microservices'
  'strangler-fig',       // covered by 'migration', 'microservices'
  'modernization',       // covered by 'migration', 'microservices'
  'layered-architecture',// covered by 'architecture'
  'software-design',     // covered by 'architecture'
  'system-design',       // covered by 'architecture'
  'interview',           // too specific for this context
  'async',               // covered by 'concurrency'
  'threading',           // covered by 'concurrency'
  'parallelism',         // covered by 'concurrency'
  'thread-pool',         // covered by 'concurrency'
  'semaphore',           // covered by 'concurrency'
  'mutex',               // covered by 'concurrency'
  'race-conditions',     // covered by 'concurrency'
  'cap-theorem',         // covered by 'distributed-systems'
  'consistency',         // covered by 'distributed-systems'
  'availability',        // covered by 'distributed-systems'
  'partition-tolerance', // covered by 'distributed-systems'
  'database-tradeoffs',  // covered by 'distributed-systems'
  'normalization',       // covered by 'database-design'
  'relational-databases',// covered by 'database-design'
  'schema-design',       // covered by 'database-design'
  'er-diagram',          // covered by 'database-design'
  'foreign-keys',        // covered by 'database-design'
  'partitioning',        // covered by 'sharding', 'scalability'
  'horizontal-scaling',  // covered by 'sharding', 'scalability'
  'database-performance',// covered by 'sharding', 'performance'
  'database-selection',  // covered by 'nosql'
  'query-optimization',  // covered by 'sql', 'performance'
  'explain-plan',        // covered by 'sql', 'performance'
  'readability',         // covered by 'clean-code', 'best-practices'
  'peer-review',         // covered by 'code-review'
  'quality',             // covered by 'code-review'
  'team-practices',      // covered by 'code-review'
  'object-oriented-design', // covered by 'solid'
  'principles',          // covered by 'solid'
  'cicd',                // covered by 'ci-cd', 'github-actions', 'pipeline'
  'blue-green',          // covered by 'deployment'
  'canary',              // covered by 'deployment'
  'dockerfile',          // covered by 'docker'
  'docker-compose',      // covered by 'docker'
  'development',         // covered by 'docker'
  'gitflow',             // covered by 'git'
  'github-flow',         // covered by 'git'
  'trunk-based-development', // covered by 'git'
  'version-control',     // covered by 'git'
  'infrastructure-as-code', // covered by 'infrastructure'
  'iac',                 // covered by 'infrastructure'
  'cloud',               // covered by 'infrastructure', 'devops'
  'orchestration',       // covered by 'kubernetes'
  'kubectl',             // covered by 'kubernetes'

  // --- Patterns ---
  'factory-family',      // covered by 'abstract-factory'
  'compatibility',       // covered by 'adapter'
  'client-side-proxy',   // covered by 'ambassador'
  'service-discovery',   // covered by 'ambassador'
  'abstraction',         // covered by 'bridge'
  'fluent-interface',    // covered by 'builder'
  'isolation',           // covered by 'bulkhead'
  'fault-containment',   // covered by 'bulkhead'
  'tree',                // covered by 'composite'
  'hierarchy',           // covered by 'composite'
  'read-model',          // covered by 'cqrs'
  'write-model',         // covered by 'cqrs'
  'composition',         // covered by 'decorator'
  'di',                  // synonym of 'dependency-injection'
  'ioc',                 // synonym of 'dependency-injection'
  'memory-optimization', // covered by 'flyweight'

  // --- Recipes ---
  'assistants-api',      // covered by 'openai', 'ai'
  'conversation',      // covered by 'openai', 'ai'
  'lora',                // covered by 'fine-tuning', 'ai'
  'qlora',               // covered by 'fine-tuning', 'ai'
  'hugging-face',        // covered by 'fine-tuning', 'ai'
  'code-generation',     // covered by 'fine-tuning', 'ai'
  'langchain',           // covered by 'rag', 'ai'
  'vector-database',     // covered by 'rag', 'ai'
  'vector-similarity',   // covered by 'embeddings', 'ai'
  'faiss',               // covered by 'embeddings', 'ai'
  'nlp',                 // covered by 'embeddings', 'ai'
  'redoc',               // covered by 'openapi', 'api'
  'audit-trail',         // covered by 'logging', 'api'
  'apollo',              // covered by 'graphql', 'api'
  'strawberry',          // covered by 'graphql', 'api'
  'grpc',                // covered by 'protobuf', 'api'
  'rpc',                 // covered by 'protobuf', 'api'
  'headers',             // covered by 'cors', 'api'
  'http-status',         // covered by 'error-handling', 'api'
  'safety',              // covered by 'idempotency', 'api'
  'screenshot-testing',  // covered by 'visual-regression', 'testing'
  'aes-256',             // covered by 'encryption', 'security'
  'kms',                 // covered by 'encryption', 'security'
  'csrf',                // covered by 'web-security', 'security'
  'security-headers',    // covered by 'web-security', 'security'
  'hsts',                // covered by 'web-security', 'security'
  'csp',                 // covered by 'web-security', 'security'
]);

// Tags to RENAME: old -> new (only if new already exists in multi-entry form)
const TAG_RENAMES = {
  'cicd': 'ci-cd',
  'k8s': 'kubernetes',
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

function updateTagsInFrontmatter(frontmatter) {
  const lines = frontmatter.split('\n');
  let inTags = false;
  const result = [];

  for (const line of lines) {
    // Detect start of tags block
    if (!inTags && line.trim() === 'tags:') {
      inTags = true;
      result.push(line);
      continue;
    }

    if (inTags) {
      // End of tags block
      if (line.trim() === '' || (!line.trim().startsWith('-') && line.trim() !== '')) {
        inTags = false;
        result.push(line);
        continue;
      }

      const tagMatch = line.match(/^(\s*)-\s*(.+)$/);
      if (tagMatch) {
        const indent = tagMatch[1];
        const tag = tagMatch[2].trim();

        if (TAGS_TO_REMOVE.has(tag)) {
          continue; // delete this tag
        }

        const renamed = TAG_RENAMES[tag];
        if (renamed) {
          result.push(`${indent}- ${renamed}`);
        } else {
          result.push(line);
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
  let totalRemoved = 0;
  let totalRenamed = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);
    if (!frontmatter) continue;

    const updatedFm = updateTagsInFrontmatter(frontmatter);
    if (updatedFm !== frontmatter) {
      const newContent = '---\n' + updatedFm + '\n---' + body;
      fs.writeFileSync(file, newContent, 'utf8');
      modifiedCount++;

      // Count changes
      const oldTags = frontmatter.match(/^\s*-\s+(.+)$/gm) || [];
      const newTags = updatedFm.match(/^\s*-\s+(.+)$/gm) || [];
      totalRemoved += oldTags.length - newTags.length;
    }
  }

  console.log(`Modified ${modifiedCount} files.`);
  console.log(`Approximate tags removed/renamed: ${totalRemoved}`);
}

main();
