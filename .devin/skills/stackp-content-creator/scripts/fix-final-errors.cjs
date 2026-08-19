#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../../../..', 'src', 'content');

function fixFile(relPath, oldStr, newStr) {
  const filePath = path.join(BASE, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr);
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${relPath}`);
  } else {
    console.warn(`WARN: Pattern not found in ${relPath}`);
  }
}

// 1. Fix broken relatedResources links
// mediator-pattern-components: react-component-state -> backend-for-frontend-pattern
fixFile('patterns/design/mediator-pattern-components.md',
  '/recipes/frontend/react-component-state',
  '/patterns/design/backend-for-frontend-pattern');
fixFile('patterns/design/mediator-pattern-components.es.md',
  '/recipes/frontend/react-component-state',
  '/patterns/design/backend-for-frontend-pattern');

// race-condition-prevention: producer-consumer-pattern -> idempotent-consumer-pattern
fixFile('recipes/data/race-condition-prevention.md',
  '/patterns/concurrency/producer-consumer-pattern',
  '/patterns/messaging/idempotent-consumer-pattern');
fixFile('recipes/data/race-condition-prevention.es.md',
  '/patterns/concurrency/producer-consumer-pattern',
  '/patterns/messaging/idempotent-consumer-pattern');

// container-security-scanning: docker-multi-stage-builds -> docker-multi-stage-build-optimization
fixFile('recipes/devops/container-security-scanning.md',
  '/recipes/devops/docker-multi-stage-builds',
  '/recipes/devops/docker-multi-stage-build-optimization');
fixFile('recipes/devops/container-security-scanning.es.md',
  '/recipes/devops/docker-multi-stage-builds',
  '/recipes/devops/docker-multi-stage-build-optimization');

// container-security-scanning: complete-guide-docker-production -> docker-for-developers-guide
fixFile('recipes/devops/container-security-scanning.md',
  '/guides/devops/complete-guide-docker-production',
  '/guides/devops/docker-for-developers-guide');
fixFile('recipes/devops/container-security-scanning.es.md',
  '/guides/devops/complete-guide-docker-production',
  '/guides/devops/docker-for-developers-guide');

// 2. Fix rust-tokio ES seo.metaDescription mismatch (still has "select" in seo block)
const rustEsPath = path.join(BASE, 'recipes/concurrency/rust-tokio-async-runtime.es.md');
let rustEs = fs.readFileSync(rustEsPath, 'utf8');
// The seo block still has the old text with "select" — replace it
rustEs = rustEs.replace(
  /seo:\s*\n\s+metaDescription:\s*".+"/m,
  'seo:\n  metaDescription: "Construye sistemas async en Rust con Tokio. Usa tasks, channels, mutexes, graceful shutdown y concurrencia estructurada para networking de alto rendimiento."'
);
fs.writeFileSync(rustEsPath, rustEs);
console.log('Fixed: rust-tokio-async-runtime.es.md seo.metaDescription');

console.log('\nDone!');
