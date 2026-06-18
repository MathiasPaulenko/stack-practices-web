const fs = require('fs');

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

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Extract metaDescription from frontmatter
  const metaMatch = content.match(/metaDescription:\s*["'](.+?)["']/);
  const metaDesc = metaMatch ? metaMatch[1] : '';
  
  // Add seo section before the closing ---
  const seoBlock = `seo:\n  metaDescription: "${metaDesc}"\n  keywords:\n    - template\n`;
  
  const newContent = content.replace(/^(---)\r?\n/m, seoBlock + '---\n');
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Added seo to: ' + file);
}
