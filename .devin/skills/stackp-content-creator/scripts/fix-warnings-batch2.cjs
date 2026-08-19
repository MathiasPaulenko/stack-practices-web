#!/usr/bin/env node
/**
 * fix-warnings-batch2.cjs — Fix remaining 184 warnings:
 * 1. Tags < 5: add relevant tags based on content type and topic
 * 2. SEO keywords < 3: add keywords from tags
 * 3. relatedResources < 2: add more links from same category
 * 4. Title too long: shorten to <=80 chars
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

// Build slug -> file path map
const allFiles = walk(BASE);
const slugMap = new Map();
allFiles.forEach(f => {
  const c = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const m = c.match(/^slug:\s*(.+)$/m);
  if (m) slugMap.set(m[1].trim(), f);
});

// Common tags by topic
const topicTags = {
  api: ['api', 'rest', 'http', 'backend', 'web-services'],
  authentication: ['authentication', 'security', 'oauth', 'jwt', 'auth'],
  fileHandling: ['file-handling', 'io', 'streams', 'files', 'storage'],
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

let tagsFixed = 0;
let keywordsFixed = 0;
let relatedFixed = 0;
let titleFixed = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const isES = file.endsWith('.es.md');
  const relPath = path.relative(BASE, file).replace(/\\/g, '/');
  const contentType = relPath.split('/')[0];
  let changed = false;

  // Parse frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) continue;
  let fm = fmMatch[1];
  const body = content.substring(fmMatch[0].length);

  // 1. Fix tags < 5
  const tagsMatch = fm.match(/^tags:\n((?:  - .+\n)+)/m);
  if (tagsMatch) {
    const tags = tagsMatch[1].split('\n').filter(l => l.trim()).map(l => l.replace(/^  - /, '').trim());
    if (tags.length < 5) {
      // Get topics to suggest tags
      const topicsMatch = fm.match(/^topics:\n((?:  - .+\n)+)/m);
      const topics = topicsMatch ? topicsMatch[1].split('\n').filter(l => l.trim()).map(l => l.replace(/^  - /, '').trim()) : [];
      
      const additionalTags = [];
      for (const topic of topics) {
        const suggested = topicTags[topic] || [];
        for (const t of suggested) {
          if (!tags.includes(t) && !additionalTags.includes(t)) {
            additionalTags.push(t);
          }
          if (tags.length + additionalTags.length >= 5) break;
        }
        if (tags.length + additionalTags.length >= 5) break;
      }
      
      if (additionalTags.length > 0) {
        const newTags = [...tags, ...additionalTags].slice(0, 8);
        const newTagsStr = 'tags:\n' + newTags.map(t => `  - ${t}`).join('\n') + '\n';
        fm = fm.replace(tagsMatch[0], newTagsStr);
        changed = true;
        tagsFixed++;
      }
    }
  }

  // 2. Fix SEO keywords < 3
  const seoKeywordsMatch = fm.match(/seo:\n(?:.*\n)*?  keywords:\n((?:    - .+\n)+)/m);
  if (seoKeywordsMatch) {
    const keywords = seoKeywordsMatch[1].split('\n').filter(l => l.trim()).map(l => l.replace(/^    - /, '').trim());
    if (keywords.length < 3) {
      // Get tags to use as keywords
      const tagsMatch2 = fm.match(/^tags:\n((?:  - .+\n)+)/m);
      const tags = tagsMatch2 ? tagsMatch2[1].split('\n').filter(l => l.trim()).map(l => l.replace(/^  - /, '').trim()) : [];
      
      const additionalKeywords = [];
      for (const t of tags) {
        if (!keywords.includes(t) && !additionalKeywords.includes(t)) {
          additionalKeywords.push(t);
        }
        if (keywords.length + additionalKeywords.length >= 5) break;
      }
      
      if (additionalKeywords.length > 0) {
        const newKeywords = [...keywords, ...additionalKeywords].slice(0, 6);
        const newKeywordsStr = newKeywords.map(k => `    - ${k}`).join('\n') + '\n';
        fm = fm.replace(seoKeywordsMatch[1], newKeywordsStr);
        changed = true;
        keywordsFixed++;
      }
    }
  }

  // 3. Fix relatedResources < 2
  const relatedMatch = fm.match(/^relatedResources:\n((?:  - .+\n)+)/m);
  if (relatedMatch) {
    const links = relatedMatch[1].split('\n').filter(l => l.trim()).map(l => l.replace(/^  - /, '').trim());
    if (links.length < 2) {
      // Find another resource from same category
      const category = relPath.split('/')[1];
      const contentTypeDir = path.join(BASE, contentType, category || '');
      
      if (fs.existsSync(contentTypeDir)) {
        const siblingFiles = walk(contentTypeDir).filter(f => f !== file && f.endsWith('.md') && !f.endsWith('.es.md') === !isES);
        for (const sf of siblingFiles.slice(0, 10)) {
          const sfContent = fs.readFileSync(sf, 'utf8').replace(/\r\n/g, '\n');
          const sfSlug = sfContent.match(/^slug:\s*(.+)$/m);
          if (sfSlug) {
            const sfSlugVal = sfSlug[1].trim();
            const newLink = `/${contentType}/${category}/${sfSlugVal}`;
            if (!links.includes(newLink)) {
              links.push(newLink);
              break;
            }
          }
        }
        
        if (links.length >= 2) {
          const newRelatedStr = 'relatedResources:\n' + links.map(l => `  - ${l}`).join('\n') + '\n';
          fm = fm.replace(relatedMatch[0], newRelatedStr);
          changed = true;
          relatedFixed++;
        }
      }
    }
  }

  // 4. Fix title too long (>80 chars)
  const titleMatch = fm.match(/^title:\s*"(.+)"$/m);
  if (titleMatch && titleMatch[1].length > 80) {
    let shortTitle = titleMatch[1];
    // Try to shorten by removing [ES] prefix
    if (shortTitle.startsWith('[ES] ')) {
      shortTitle = shortTitle.substring(5);
    }
    // If still too long, truncate at last word boundary before 80
    if (shortTitle.length > 80) {
      shortTitle = shortTitle.substring(0, 77).replace(/\s+\S*$/, '') + '...';
    }
    fm = fm.replace(titleMatch[0], `title: "${shortTitle}"`);
    changed = true;
    titleFixed++;
  }

  if (changed) {
    const newContent = '---\n' + fm + '---\n' + body;
    fs.writeFileSync(file, newContent);
  }
}

console.log(`Tags fixed: ${tagsFixed}`);
console.log(`Keywords fixed: ${keywordsFixed}`);
console.log(`RelatedResources fixed: ${relatedFixed}`);
console.log(`Titles fixed: ${titleFixed}`);
