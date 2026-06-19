const fs = require('fs');
const path = require('path');

function findAllMdFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findAllMdFiles(fullPath, files);
    } else if (item.endsWith('.md') && !item.endsWith('.es.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

const contentDir = 'src/content';
const allFiles = findAllMdFiles(contentDir);

const warnings = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const parts = content.split('---');
  if (parts.length < 3) continue;
  
  const body = parts.slice(2).join('---').trim();
  const internalLinks = (body.match(/\]\(\/[^)]+\)/g) || []).length;
  
  if (internalLinks < 3) {
    warnings.push({file, internalLinks});
  }
}

// Sort by link count ascending
warnings.sort((a, b) => a.internalLinks - b.internalLinks);

console.log('========================================');
console.log('AUDIT: INTERNAL LINKS (ALL BATCHES)');
console.log('========================================');
console.log('Files with < 3 internal links:');
console.log();

for (const w of warnings) {
  const esFile = w.file.replace('.md', '.es.md');
  const hasEs = fs.existsSync(esFile);
  console.log(`  ${w.internalLinks} links: ${w.file}`);
  if (hasEs) {
    const esContent = fs.readFileSync(esFile, 'utf8');
    const esParts = esContent.split('---');
    const esBody = esParts.slice(2).join('---').trim();
    const esLinks = (esBody.match(/\]\(\/[^)]+\)/g) || []).length;
    console.log(`           ES: ${esLinks} links: ${esFile}`);
  }
}

console.log();
console.log(`Total files needing more links: ${warnings.length}`);
