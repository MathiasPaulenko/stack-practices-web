#!/usr/bin/env node
/**
 * fix-remaining-errors.cjs — Fix remaining quality validator errors:
 * 1. Add missing relatedResources to 4 files (EN+ES)
 * 2. Fix seo.metaDescription mismatches in ES files (remove [ES] prefix)
 * 3. Fix rust-tokio metaDescription mismatch (EN+ES)
 * 4. Fix seed-database.es.md leading space in metaDescription
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '../../../..', 'src', 'content');

function fixFile(relPath, fixes) {
  const filePath = path.join(BASE, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [old, neu] of fixes) {
    if (content.includes(old)) {
      content = content.replace(old, neu);
    } else {
      console.warn(`WARN: Pattern not found in ${relPath}: ${old.substring(0, 60)}...`);
    }
  }
  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${relPath}`);
}

// 1. Add relatedResources to files missing them
const relatedResourcesMap = {
  'patterns/design/dependency-injection-typescript.md': [
    '  - /patterns/design/singleton-pattern',
    '  - /patterns/design/factory-pattern',
    '  - /recipes/testing/unit-testing-mocking',
  ],
  'patterns/design/dependency-injection-typescript.es.md': [
    '  - /patterns/design/singleton-pattern',
    '  - /patterns/design/factory-pattern',
    '  - /recipes/testing/unit-testing-mocking',
  ],
  'patterns/design/mediator-pattern-components.md': [
    '  - /patterns/design/observer-pattern',
    '  - /patterns/design/facade-pattern',
    '  - /recipes/frontend/react-component-state',
  ],
  'patterns/design/mediator-pattern-components.es.md': [
    '  - /patterns/design/observer-pattern',
    '  - /patterns/design/facade-pattern',
    '  - /recipes/frontend/react-component-state',
  ],
  'recipes/data/race-condition-prevention.md': [
    '  - /recipes/concurrency/python-thread-pool-executor',
    '  - /recipes/concurrency/python-asyncio-gather-task-groups',
    '  - /patterns/concurrency/producer-consumer-pattern',
  ],
  'recipes/data/race-condition-prevention.es.md': [
    '  - /recipes/concurrency/python-thread-pool-executor',
    '  - /recipes/concurrency/python-asyncio-gather-task-groups',
    '  - /patterns/concurrency/producer-consumer-pattern',
  ],
  'recipes/devops/container-security-scanning.md': [
    '  - /recipes/devops/docker-multi-stage-builds',
    '  - /recipes/security/sql-injection-prevention',
    '  - /guides/devops/complete-guide-docker-production',
  ],
  'recipes/devops/container-security-scanning.es.md': [
    '  - /recipes/devops/docker-multi-stage-builds',
    '  - /recipes/security/sql-injection-prevention',
    '  - /guides/devops/complete-guide-docker-production',
  ],
};

for (const [relPath, links] of Object.entries(relatedResourcesMap)) {
  const filePath = path.join(BASE, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Insert relatedResources before lastUpdated
  const relatedSection = 'relatedResources:\n' + links.join('\n') + '\n';
  
  if (content.includes('relatedResources:')) {
    console.log(`SKIP (already has relatedResources): ${relPath}`);
    continue;
  }
  
  // Insert before lastUpdated line
  content = content.replace(/lastUpdated:/, relatedSection + 'lastUpdated:');
  fs.writeFileSync(filePath, content);
  console.log(`Added relatedResources: ${relPath}`);
}

// 2. Fix seo.metaDescription mismatches — ES files with [ES] prefix in top-level but not in seo block
const esMismatchFiles = [
  'recipes/api/graphql-api.es.md',
  'recipes/databases/connect-to-mysql.es.md',
  'recipes/databases/connect-to-redis.es.md',
  'recipes/databases/execute-raw-sql.es.md',
  'recipes/databases/use-orm-crud.es.md',
];

for (const relPath of esMismatchFiles) {
  const filePath = path.join(BASE, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Get top-level metaDescription
  const topMatch = content.match(/^metaDescription:\s*"(.+)"$/m);
  if (!topMatch) {
    console.warn(`WARN: No top-level metaDescription in ${relPath}`);
    continue;
  }
  let topDesc = topMatch[1];
  
  // Remove [ES] prefix if present
  if (topDesc.startsWith('[ES] ')) {
    topDesc = topDesc.substring(5);
    content = content.replace(
      /^metaDescription:\s*"\[ES\] .+"$/m,
      `metaDescription: "${topDesc}"`
    );
  }
  
  // Now fix seo.metaDescription to match
  const seoMatch = content.match(/seo:\s*\n\s+metaDescription:\s*"(.+)"/m);
  if (seoMatch && seoMatch[1] !== topDesc) {
    content = content.replace(
      /(\bseo:\s*\n\s+metaDescription:\s*").+(")/m,
      `$1${topDesc}$2`
    );
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed metaDescription mismatch: ${relPath}`);
}

// 3. Fix seed-database.es.md — leading space in metaDescription
fixFile('recipes/databases/seed-database.es.md', [
  ['metaDescription: " Siembra', 'metaDescription: "Siembra'],
]);

// 4. Fix rust-tokio-async-runtime.md — top-level has "select" but seo doesn't
fixFile('recipes/concurrency/rust-tokio-async-runtime.md', [
  [
    'metaDescription: "Build async systems in Rust with Tokio runtime. Use tasks, channels, select, mutexes, graceful shutdown, and structured concurrency for high-performance networking."',
    'metaDescription: "Build async systems in Rust with Tokio runtime. Use tasks, channels, mutexes, graceful shutdown, and structured concurrency for high-performance networking."'
  ],
]);

// 5. Fix rust-tokio-async-runtime.es.md — same issue
fixFile('recipes/concurrency/rust-tokio-async-runtime.es.md', [
  [
    'metaDescription: "Construye sistemas async en Rust con Tokio. Usa tasks, channels, select, mutexes, graceful shutdown y concurrencia estructurada para networking de alto rendimiento."',
    'metaDescription: "Construye sistemas async en Rust con Tokio. Usa tasks, channels, mutexes, graceful shutdown y concurrencia estructurada para networking de alto rendimiento."'
  ],
]);

console.log('\nDone!');
