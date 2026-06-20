const fs = require('fs');
const path = require('path');

function findAllEsMd(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findAllEsMd(fullPath, files);
    } else if (item.endsWith('.es.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = findAllEsMd('src/content/patterns');
const warnings = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const parts = content.split('---');
  if (parts.length < 3) continue;
  const body = parts.slice(2).join('---').trim();
  const internalLinks = (body.match(/\]\(\/[^)]+\)/g) || []).length;
  if (internalLinks < 3) {
    warnings.push({ file, internalLinks });
  }
}

console.log('Patterns ES with < 3 internal links:');
for (const w of warnings) {
  console.log(`  ${w.internalLinks} links: ${w.file}`);
}
console.log(`Total: ${warnings.length}`);
