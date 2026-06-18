const fs = require('fs');
const fm = require('front-matter');

const files = [
  'src/content/docs/templates/api-status-page-template.es.md',
  'src/content/docs/templates/api-status-page-template.md',
  'src/content/docs/templates/capacity-planning-template.es.md',
  'src/content/docs/templates/capacity-planning-template.md',
  'src/content/docs/templates/database-schema-documentation-template.es.md',
  'src/content/docs/templates/database-schema-documentation-template.md',
  'src/content/docs/templates/engineering-handbook-template.es.md',
  'src/content/docs/templates/engineering-handbook-template.md',
];

// Load metadata from the content index
const indexData = JSON.parse(fs.readFileSync('public/assets/content/index-en.json', 'utf8'));
const esIndexData = JSON.parse(fs.readFileSync('public/assets/content/index-es.json', 'utf8'));

function getMetadata(slug, isEs) {
  const data = isEs ? esIndexData : indexData;
  for (const e of data.entries) {
    if (e.metadata.slug === slug) return e.metadata;
  }
  return null;
}

function buildFrontmatter(meta) {
  const lines = ['---'];
  lines.push(`contentType: ${meta.contentType}`);
  lines.push(`slug: ${meta.slug}`);
  if (meta.templateType) lines.push(`templateType: ${meta.templateType}`);
  lines.push(`title: "${meta.title}"`);
  lines.push(`description: "${meta.description}"`);
  lines.push(`metaDescription: "${meta.metaDescription}"`);
  lines.push(`difficulty: ${meta.difficulty}`);
  lines.push('topics:');
  for (const t of meta.topics) lines.push(`  - ${t}`);
  lines.push('tags:');
  for (const t of meta.tags) lines.push(`  - ${t}`);
  if (meta.relatedResources && meta.relatedResources.length > 0) {
    lines.push('relatedResources:');
    for (const r of meta.relatedResources) lines.push(`  - ${r}`);
  }
  lines.push(`lastUpdated: "${meta.lastUpdated}"`);
  lines.push(`author: "${meta.author}"`);
  if (meta.seo) {
    lines.push('seo:');
    lines.push(`  metaDescription: "${meta.seo.metaDescription || meta.metaDescription}"`);
    if (meta.seo.keywords && meta.seo.keywords.length > 0) {
      lines.push('  keywords:');
      for (const k of meta.seo.keywords) lines.push(`    - ${k}`);
    } else {
      lines.push('  keywords:');
      lines.push('    - template');
    }
  } else {
    lines.push('seo:');
    lines.push(`  metaDescription: "${meta.metaDescription}"`);
    lines.push('  keywords:');
    lines.push('    - template');
  }
  lines.push('---');
  return lines.join('\n');
}

function extractBody(content) {
  // Try to find the body after the last ---
  const parts = content.split(/---\r?\n/);
  if (parts.length >= 2) {
    // The body is after the last ---
    return parts[parts.length - 1];
  }
  return content;
}

for (const file of files) {
  const slug = file.replace(/^.*\//, '').replace(/\.es\.md$/, '').replace(/\.md$/, '');
  const isEs = file.endsWith('.es.md');
  
  const meta = getMetadata(slug, isEs);
  if (!meta) {
    console.log('No metadata found for: ' + file);
    continue;
  }
  
  const currentContent = fs.readFileSync(file, 'utf8');
  const body = extractBody(currentContent);
  
  const frontmatter = buildFrontmatter(meta);
  const newContent = frontmatter + '\n' + body;
  
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Restored: ' + file);
}
