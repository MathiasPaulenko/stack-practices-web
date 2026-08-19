#!/usr/bin/env node
/**
 * fix-warnings-safe.cjs — Safely fix warnings without corrupting frontmatter.
 * Only modifies specific YAML blocks using targeted regex replacements.
 * Does NOT rewrite the entire frontmatter.
 */

const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../../../..', 'src', 'content');

function walk(dir) {
  const results = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) results.push(...walk(p));
    else if (f.name.endsWith('.md')) results.push(p);
  }
  return results;
}

const topicTags = {
  api: ['api', 'rest', 'http', 'backend', 'web-services'],
  authentication: ['authentication', 'security', 'oauth', 'jwt', 'auth'],
  'file-handling': ['file-handling', 'io', 'streams', 'files', 'storage'],
  performance: ['performance', 'optimization', 'profiling', 'latency', 'throughput'],
  testing: ['testing', 'unit-tests', 'integration', 'tdd', 'quality'],
  architecture: ['architecture', 'design', 'patterns', 'scalability', 'systems'],
  design: ['design-patterns', 'patterns', 'oop', 'solid', 'structure'],
  devops: ['devops', 'ci-cd', 'automation', 'deployment', 'infrastructure'],
  databases: ['databases', 'sql', 'postgresql', 'mysql', 'queries'],
  concurrency: ['concurrency', 'async', 'threads', 'parallel', 'locks'],
  security: ['security', 'vulnerabilities', 'encryption', 'owasp', 'hardening'],
  ai: ['ai', 'machine-learning', 'llm', 'neural-networks', 'nlp'],
  frontend: ['frontend', 'ui', 'css', 'javascript', 'components'],
  infrastructure: ['infrastructure', 'cloud', 'aws', 'terraform', 'scaling'],
  messaging: ['messaging', 'kafka', 'rabbitmq', 'events', 'queues'],
  observability: ['observability', 'monitoring', 'logging', 'metrics', 'tracing'],
  graphql: ['graphql', 'api', 'schemas', 'resolvers', 'federation'],
  serverless: ['serverless', 'aws-lambda', 'functions', 'faas', 'cloud'],
  caching: ['caching', 'redis', 'performance', 'cache', 'memoization'],
  data: ['data', 'parsing', 'json', 'csv', 'processing'],
};

const allFiles = walk(BASE);
let tagsFixed = 0;
let relatedFixed = 0;
let titleFixed = 0;
let keywordsFixed = 0;

for (const file of allFiles) {
  const raw = fs.readFileSync(file, 'utf8');
  // Normalize CRLF for processing but write back with original line endings
  const content = raw.replace(/\r\n/g, '\n');
  const isES = file.endsWith('.es.md');
  const relPath = path.relative(BASE, file).replace(/\\/g, '/');

  // Extract frontmatter block (between first --- and second ---)
  const fmStart = content.indexOf('---\n');
  if (fmStart === -1) continue;
  const fmEnd = content.indexOf('\n---\n', fmStart + 4);
  if (fmEnd === -1) continue;
  
  const fm = content.substring(fmStart + 4, fmEnd);
  const body = content.substring(fmEnd + 5);
  let newFm = fm;
  let changed = false;

  // 1. Fix tags < 5: find tags block and append more tags
  const tagsBlockMatch = newFm.match(/^(tags:\n(?:  - .+\n)+)/m);
  if (tagsBlockMatch) {
    const tagsBlock = tagsBlockMatch[1];
    const tags = tagsBlock.split('\n').filter(l => l.trim().startsWith('- ')).map(l => l.replace(/^  - /, '').trim());
    if (tags.length < 5) {
      // Get topics
      const topicsMatch = newFm.match(/^topics:\n((?:  - .+\n)+)/m);
      const topics = topicsMatch ? topicsMatch[1].split('\n').filter(l => l.trim().startsWith('- ')).map(l => l.replace(/^  - /, '').trim()) : [];
      
      const additional = [];
      for (const topic of topics) {
        const suggested = topicTags[topic] || [];
        for (const t of suggested) {
          if (!tags.includes(t) && !additional.includes(t)) additional.push(t);
          if (tags.length + additional.length >= 5) break;
        }
        if (tags.length + additional.length >= 5) break;
      }
      
      if (additional.length > 0) {
        const newTags = [...tags, ...additional].slice(0, 8);
        const newTagsBlock = 'tags:\n' + newTags.map(t => `  - ${t}`).join('\n') + '\n';
        newFm = newFm.replace(tagsBlockMatch[0], newTagsBlock);
        changed = true;
        tagsFixed++;
      }
    }
  }

  // 2. Fix SEO keywords < 3: find keywords block under seo: and append from tags
  const seoKeywordsMatch = newFm.match(/(seo:\n(?:  .+\n)*?  keywords:\n(?:    - .+\n?)+)/m);
  if (seoKeywordsMatch) {
    const seoBlock = seoKeywordsMatch[1];
    const kwBlock = seoBlock.match(/keywords:\n((?:    - .+\n?)+)/);
    if (kwBlock) {
      const keywords = kwBlock[1].split('\n').filter(l => l.trim().startsWith('- ')).map(l => l.replace(/^    - /, '').trim());
      if (keywords.length < 3) {
        // Get tags to use as keywords
        const tagsMatch2 = newFm.match(/^tags:\n((?:  - .+\n)+)/m);
        const tags = tagsMatch2 ? tagsMatch2[1].split('\n').filter(l => l.trim().startsWith('- ')).map(l => l.replace(/^  - /, '').trim()) : [];
        
        const additional = [];
        for (const t of tags) {
          if (!keywords.includes(t) && !additional.includes(t)) additional.push(t);
          if (keywords.length + additional.length >= 5) break;
        }
        
        if (additional.length > 0) {
          const newKeywords = [...keywords, ...additional].slice(0, 6);
          const newKwContent = 'keywords:\n' + newKeywords.map(k => `    - ${k}`).join('\n');
          // Replace old keywords block. The old block may or may not have trailing newline.
          // The new content must end with newline so it doesn't merge with ---
          const oldKw = kwBlock[0];
          if (oldKw.endsWith('\n')) {
            newFm = newFm.replace(oldKw, newKwContent + '\n');
          } else {
            newFm = newFm.replace(oldKw, newKwContent + '\n');
          }
          changed = true;
          keywordsFixed++;
        }
      }
    }
  }

  // 3. Fix relatedResources < 2: find relatedResources block and append sibling links
  const relatedMatch = newFm.match(/^(relatedResources:\n(?:  - .+\n)+)/m);
  if (relatedMatch) {
    const relatedBlock = relatedMatch[1];
    const links = relatedBlock.split('\n').filter(l => l.trim().startsWith('- ')).map(l => l.replace(/^  - /, '').trim());
    if (links.length < 2) {
      // Find a sibling file from same category
      const parts = relPath.split('/');
      const contentType = parts[0];
      const category = parts[1];
      const categoryDir = path.join(BASE, contentType, category);
      
      if (fs.existsSync(categoryDir)) {
        const siblings = walk(categoryDir).filter(f => f !== file && (f.endsWith('.es.md') === isES));
        for (const sf of siblings.slice(0, 10)) {
          const sfContent = fs.readFileSync(sf, 'utf8').replace(/\r\n/g, '\n');
          const sfSlugMatch = sfContent.match(/^slug:\s*(.+)$/m);
          if (sfSlugMatch) {
            const sfSlug = sfSlugMatch[1].trim();
            const newLink = `/${contentType}/${category}/${sfSlug}`;
            if (!links.includes(newLink)) {
              links.push(newLink);
              break;
            }
          }
        }
        
        if (links.length >= 2) {
          const newRelatedBlock = 'relatedResources:\n' + links.map(l => `  - ${l}`).join('\n') + '\n';
          newFm = newFm.replace(relatedMatch[0], newRelatedBlock);
          changed = true;
          relatedFixed++;
        }
      }
    }
  }

  // 4. Fix title > 80 chars
  const titleMatch = newFm.match(/^title:\s*"(.+)"$/m);
  if (titleMatch && titleMatch[1].length > 80) {
    let shortTitle = titleMatch[1];
    if (shortTitle.startsWith('[ES] ')) shortTitle = shortTitle.substring(5);
    if (shortTitle.length > 80) {
      shortTitle = shortTitle.substring(0, 77).replace(/\s+\S*$/, '') + '...';
    }
    newFm = newFm.replace(titleMatch[0], `title: "${shortTitle}"`);
    changed = true;
    titleFixed++;
  }

  if (changed) {
    const newContent = '---\n' + newFm + '\n---\n' + body;
    // Write back with CRLF if original had CRLF
    const output = raw.includes('\r\n') ? newContent.replace(/\n/g, '\r\n') : newContent;
    fs.writeFileSync(file, output);
  }
}

console.log(`Tags fixed: ${tagsFixed}`);
console.log(`Keywords fixed: ${keywordsFixed}`);
console.log(`RelatedResources fixed: ${relatedFixed}`);
console.log(`Titles fixed: ${titleFixed}`);
