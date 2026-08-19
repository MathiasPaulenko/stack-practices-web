const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../../../..', 'src', 'content');

function walk(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) return files;
  for (const entry of fs.readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (entry.endsWith('.md')) files.push(full);
  }
  return files;
}

const allFiles = walk(dir);
const pairs = [];

for (const f of allFiles) {
  const base = f.replace(/\\/g, '/');
  if (base.endsWith('.es.md')) continue;
  const esFile = base.replace('.md', '.es.md');
  const hasEs = fs.existsSync(esFile);
  pairs.push({ en: base.replace(dir.replace(/\\/g, '/'), ''), hasEs: hasEs });
}

const missing = pairs.filter(p => !p.hasEs).map(p => p.en);
const withEs = pairs.filter(p => p.hasEs).length;

console.log('Total EN files:', pairs.length);
console.log('With ES pair:', withEs);
console.log('Missing ES translation:', missing.length);

if (missing.length > 0) {
  console.log('\nMissing ES translations:');
  missing.forEach(m => console.log('  ' + m));
  process.exit(1);
} else {
  console.log('\n✅ All EN files have ES translations.');
  process.exit(0);
}
