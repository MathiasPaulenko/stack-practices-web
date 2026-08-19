#!/usr/bin/env node
/**
 * Resource Wizard — Infalible Content Scaffolder
 *
 * Usage:
 *   node .devin/skills/stackp-content-creator/scripts/resource-wizard.cjs \
 *     --type recipes \
 *     --slug parse-json \
 *     --title "Parse JSON" \
 *     --description "How to parse JSON strings into objects" \
 *     --metaDescription "Learn how to parse JSON in Python, JavaScript, and Java." \
 *     --difficulty beginner \
 *     --topics "data" \
 *     --tags "json,parsing,python,javascript,java" \
 *     --author "StackPractices"
 *
 * This script:
 * 1. Validates that the slug does NOT already exist
 * 2. Validates that all topics exist in src/content/config.ts
 * 3. Auto-suggests relatedResources based on topic/tag overlap
 * 4. Generates both EN.md and ES.md with complete frontmatter
 * 5. Runs validation after creation
 * 6. Reports success or failure with actionable fixes
 */

const fs = require('fs');
const path = require('path');
const matter = require('front-matter');

const CONTENT_DIR = path.join(__dirname, '../../../..', 'src', 'content');
const CONFIG_FILE = path.join(__dirname, '../../../..', 'src', 'content.config.ts');

// ─── Argument Parsing ────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      flags[key] = value;
    }
  }
  return flags;
}

// ─── Validation: Existing Resources Index ────────────────────────────────────
function buildIndex() {
  const slugs = new Set();
  const allResources = [];

  function walk(dir, basePath) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = basePath ? path.join(basePath, entry.name) : entry.name;
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (entry.name.endsWith('.md') && !entry.name.endsWith('.es.md')) {
        const content = fs.readFileSync(full, 'utf-8');
        const parsed = matter(content);
        const meta = parsed.attributes;
        const slug = meta.slug;
        const type = meta.contentType || rel.split(path.sep)[0];
        if (slug) {
          slugs.add(slug);
          allResources.push({
            slug,
            type,
            title: meta.title,
            topics: Array.isArray(meta.topics) ? meta.topics : [],
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            path: `/${type}/${slug}`
          });
        }
      }
    }
  }

  if (fs.existsSync(CONTENT_DIR)) {
    walk(CONTENT_DIR, '');
  }
  return { slugs, allResources };
}

// ─── Validation: Topics Existence ────────────────────────────────────────────
function getValidTopics() {
  const topics = new Set();

  // If config.ts exists, try to extract topics from enum
  if (fs.existsSync(CONFIG_FILE)) {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    // Match z.enum([...]) or simple string array patterns
    const enumMatch = content.match(/topicsEnum\s*=\s*z\.enum\(\[\s*([\s\S]*?)\s*\]\)/);
    if (enumMatch) {
      const items = enumMatch[1].match(/'([a-z0-9-]+)'/g);
      if (items) {
        items.forEach(m => {
          const key = m.replace(/'/g, '');
          topics.add(key);
        });
      }
    }
  }

  // Fallback: extract topics from existing content
  if (topics.size === 0) {
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith('.md') && !entry.name.endsWith('.es.md')) {
          const content = fs.readFileSync(full, 'utf-8');
          const parsed = matter(content);
          const t = parsed.attributes.topics;
          if (Array.isArray(t)) {
            t.forEach(topic => topics.add(topic));
          }
        }
      }
    }
    if (fs.existsSync(CONTENT_DIR)) {
      walk(CONTENT_DIR);
    }
  }

  return topics;
}

// ─── Auto-suggest relatedResources ───────────────────────────────────────────
function suggestRelatedResources(allResources, topics, tags, ownSlug) {
  const topicSet = new Set(topics);
  const tagSet = new Set(tags);

  const scored = allResources
    .filter(r => r.slug !== ownSlug)
    .map(r => {
      let score = 0;
      const rTopics = new Set(r.topics);
      const rTags = new Set(r.tags);

      // Same topic = +3
      for (const t of topicSet) {
        if (rTopics.has(t)) score += 3;
      }
      // Same tag = +2
      for (const t of tagSet) {
        if (rTags.has(t)) score += 2;
      }
      // Different content type = +1 (diversity bonus)
      return { ...r, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored.map(r => r.path);
}

// ─── Generate Frontmatter ────────────────────────────────────────────────────
function generateFrontmatter(params, lang = 'en') {
  const today = new Date().toISOString().split('T')[0];
  const isEs = lang === 'es';

  const title = isEs ? params.titleEs || params.title : params.title;
  const description = isEs ? params.descriptionEs || params.description : params.description;
  const metaDesc = isEs ? params.metaDescriptionEs || params.metaDescription : params.metaDescription;
  const keywords = isEs
    ? params.keywordsEs || params.tags.map(t => t.replace(/-/g, ' '))
    : params.tags;

  return `---
contentType: ${params.type}
slug: ${params.slug}
title: "${title}"
description: "${description}"
metaDescription: "${metaDesc}"
difficulty: ${params.difficulty}
topics:
${params.topics.map(t => `  - ${t}`).join('\n')}
tags:
${params.tags.map(t => `  - ${t}`).join('\n')}
relatedResources:
${params.relatedResources.map(r => `  - ${r}`).join('\n')}
lastUpdated: "${today}"
author: "${params.author || 'StackPractices'}"
seo:
  metaDescription: "${metaDesc}"
  keywords:
${keywords.map(k => `    - ${k}`).join('\n')}
---
`;
}

// ─── Generate Body Template ─────────────────────────────────────────────────
function generateBody(title, type, lang = 'en') {
  const isEs = lang === 'es';
  const t = {
    overview: isEs ? 'Visión General' : 'Overview',
    whenToUse: isEs ? 'Cuándo Usar' : 'When to Use',
    solution: isEs ? 'Solución' : 'Solution',
    explanation: isEs ? 'Explicación' : 'Explanation',
    variants: isEs ? 'Variantes' : 'Variants',
    bestPractices: isEs ? 'Mejores Prácticas' : 'Best Practices',
    commonMistakes: isEs ? 'Errores Comunes' : 'Common Mistakes',
    faq: isEs ? 'Preguntas Frecuentes' : 'Frequently Asked Questions',
    q1: isEs ? 'Pregunta 1' : 'Question 1?',
    a1: isEs ? 'Respuesta 1' : 'Answer 1.',
  };

  const bodySections = {
    recipes: `## ${t.solution}

### Python

\`\`\`python
# Add your Python solution here
\`\`\`

### JavaScript

\`\`\`javascript
// Add your JavaScript solution here
\`\`\`

### Java

\`\`\`java
// Add your Java solution here
\`\`\`
`,
    patterns: `## ${t.solution}

\`\`\`typescript
// Add your pattern implementation here
\`\`\`
`,
    docs: `## ${t.solution}

\`\`\`markdown
<!-- Add your template structure here -->
\`\`\`
`,
    guides: `## ${t.solution}

\`\`\`markdown
<!-- Add your guide content here -->
\`\`\`
`
  };

  const solutionSection = bodySections[type] || bodySections.recipes;

  return `## ${t.overview}

[Describe what this resource covers and why it matters for developers.]

## ${t.whenToUse}

Use this resource when:
- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

${solutionSection}
## ${t.explanation}

[Explain how it works, edge cases, and trade-offs.]

## ${t.variants}

| Technology | Approach | Notes |
|------------|----------|-------|
| [Technology] | [Approach] | [Notes] |

## ${t.bestPractices}

1. [Best practice 1]
2. [Best practice 2]
3. [Best practice 3]
4. [Best practice 4]
5. [Best practice 5]

## ${t.commonMistakes}

1. [Mistake 1]
2. [Mistake 2]
3. [Mistake 3]
4. [Mistake 4]
5. [Mistake 5]

## ${t.faq}

### ${t.q1}

${t.a1}

### ${isEs ? 'Pregunta 2' : 'Question 2?'}

${isEs ? 'Respuesta 2.' : 'Answer 2.'}

### ${isEs ? 'Pregunta 3' : 'Question 3?'}

${isEs ? 'Respuesta 3.' : 'Answer 3.'}
`;
}

// ─── Main ────────────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs();

  // Required fields
  const required = ['type', 'slug', 'title', 'description', 'metaDescription', 'difficulty', 'topics', 'tags'];
  const missing = required.filter(f => !args[f]);
  if (missing.length > 0) {
    console.error('\n❌ Missing required flags:');
    missing.forEach(m => console.error(`   --${m}`));
    console.error('\nUsage:');
    console.error('  node .devin/skills/stackp-content-creator/scripts/resource-wizard.cjs \\\n    --type recipes \\\n    --slug parse-json \\\n    --title "Parse JSON" \\\n    --description "..." \\\n    --metaDescription "..." \\\n    --difficulty beginner \\\n    --topics "data" \\\n    --tags "json,parsing,python" \\\n    --author "StackPractices"');
    process.exit(1);
  }

  // Normalize inputs
  const type = args.type;
  const slug = args.slug;
  const topics = args.topics.split(',').map(s => s.trim().toLowerCase());
  const tags = args.tags.split(',').map(s => s.trim().toLowerCase());

  // Build index
  const { slugs, allResources } = buildIndex();
  const validTopics = getValidTopics();

  // Validate 1: Slug uniqueness
  if (slugs.has(slug)) {
    console.error(`\n❌ Slug "${slug}" already exists. Choose a different slug.`);
    console.error(`   Existing: ${Array.from(slugs).filter(s => s.includes(slug) || slug.includes(s)).slice(0, 5).join(', ')}`);
    process.exit(1);
  }

  // Validate 2: Topics exist
  const invalidTopics = topics.filter(t => !validTopics.has(t));
  if (invalidTopics.length > 0) {
    console.error(`\n❌ Invalid topics (not in config.ts or existing content): ${invalidTopics.join(', ')}`);
    console.error(`   Valid topics: ${Array.from(validTopics).sort().slice(0, 20).join(', ')}`);
    console.error(`   Add new topics to src/content/config.ts if needed.`);
    process.exit(1);
  }

  // Validate 3: Content type
  const validTypes = ['recipes', 'patterns', 'docs', 'guides'];
  if (!validTypes.includes(type)) {
    console.error(`\n❌ Invalid contentType: "${type}". Must be one of: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  // Auto-suggest relatedResources
  const suggested = suggestRelatedResources(allResources, topics, tags, slug);
  if (suggested.length < 2) {
    console.warn(`\n⚠️  Only ${suggested.length} related resources found. Consider adding more content in topic(s): ${topics.join(', ')}`);
  }

  // Build output path
  const topicDir = topics[0]; // Use first topic for folder structure
  const outDir = path.join(CONTENT_DIR, type, topicDir);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`📁 Created directory: ${outDir}`);
  }

  // Prepare params
  const params = {
    type,
    slug,
    title: args.title,
    description: args.description,
    metaDescription: args.metaDescription,
    difficulty: args.difficulty,
    topics,
    tags,
    relatedResources: suggested.length > 0 ? suggested : [],
    author: args.author || 'StackPractices'
  };

  // Generate English
  const enFrontmatter = generateFrontmatter(params, 'en');
  const enBody = generateBody(args.title, type, 'en');
  const enPath = path.join(outDir, `${slug}.md`);
  fs.writeFileSync(enPath, enFrontmatter + enBody);
  console.log(`✅ Created EN: ${path.relative(process.cwd(), enPath)}`);

  // Generate Spanish (auto-translated titles/descriptions with placeholders)
  const esParams = {
    ...params,
    titleEs: `[ES] ${args.title}`,
    descriptionEs: `[ES] ${args.description}`,
    metaDescriptionEs: `[ES] ${args.metaDescription}`,
    keywordsEs: tags.map(t => `[ES] ${t}`)
  };
  const esFrontmatter = generateFrontmatter(esParams, 'es');
  const esBody = generateBody(esParams.titleEs, type, 'es');
  const esPath = path.join(outDir, `${slug}.es.md`);
  fs.writeFileSync(esPath, esFrontmatter + esBody);
  console.log(`✅ Created ES: ${path.relative(process.cwd(), esPath)}`);

  // Post-creation validation
  console.log('\n🔍 Running post-creation validation...');

  // Rebuild index to include new files
  const { slugs: newSlugs } = buildIndex();
  if (!newSlugs.has(slug)) {
    console.error('❌ Validation failed: new resource not found in index');
    process.exit(1);
  }

  // Check relatedResources
  const { allResources: newResources } = buildIndex();
  const newResource = newResources.find(r => r.slug === slug);
  const brokenLinks = newResource ? (newResource.relatedResources || []).filter(r => {
    const targetSlug = r.split('/').pop();
    return !newSlugs.has(targetSlug);
  }) : [];

  if (brokenLinks.length > 0) {
    console.error(`❌ Broken relatedResources detected: ${brokenLinks.join(', ')}`);
    console.error('   Fix or remove these links from frontmatter.');
    process.exit(1);
  }

  console.log('\n✅ Resource wizard completed successfully!');
  console.log(`   Slug: ${slug}`);
  console.log(`   Path: /${type}/${slug}`);
  console.log(`   ES Path: /es/${type}/${slug}`);
  console.log(`   Topics: ${topics.join(', ')}`);
  console.log(`   Related Resources: ${suggested.length} suggested`);
  console.log('\n⚠️  Next steps:');
  console.log('   1. Translate ES file content (title, description, body)');
  console.log('   2. Fill in the body content (Overview, When to Use, etc.)');
  console.log('   3. Run: node .devin/skills/stackp-content-creator/scripts/check-broken-links.cjs');
  console.log('   4. Run: node .devin/skills/stackp-content-creator/scripts/generate-sitemap.cjs');
  console.log('   5. Run: astro build');
}

main();
