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
  const lines = content.split(/\r?\n/);
  
  // Find the first --- that closes the stray seo block (should be line 4 or 5)
  let firstFrontmatterStart = -1; // The --- after the stray seo block
  let secondFrontmatterStart = -1; // The --- that starts the real frontmatter
  let frontmatterEnd = -1; // The --- that ends the real frontmatter
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (firstFrontmatterStart === -1) {
        firstFrontmatterStart = i;
      } else if (secondFrontmatterStart === -1) {
        secondFrontmatterStart = i;
      } else if (frontmatterEnd === -1) {
        frontmatterEnd = i;
        break;
      }
    }
  }
  
  if (firstFrontmatterStart === -1 || secondFrontmatterStart === -1 || frontmatterEnd === -1) {
    console.log('Could not find markers in: ' + file);
    continue;
  }
  
  // Extract the real frontmatter lines (between secondFrontmatterStart and frontmatterEnd)
  const fmLines = lines.slice(secondFrontmatterStart + 1, frontmatterEnd);
  
  // Extract the body lines (after frontmatterEnd)
  const bodyLines = lines.slice(frontmatterEnd + 1);
  
  // Extract metaDescription from frontmatter
  const metaMatch = fmLines.join('\n').match(/metaDescription:\s*["'](.+?)["']/);
  const metaDesc = metaMatch ? metaMatch[1] : '';
  
  // Build correct frontmatter
  const correctFm = [
    '---',
    ...fmLines,
    'seo:',
    '  metaDescription: "' + metaDesc + '"',
    '  keywords:',
    '    - template',
    '---',
  ];
  
  const newContent = correctFm.join('\n') + '\n' + bodyLines.join('\n');
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Rebuilt: ' + file);
}
