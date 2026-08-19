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
const esOnly = [];

for (const f of allFiles) {
  const base = f.replace(/\\/g, '/');
  if (!base.endsWith('.es.md')) continue;
  const enFile = base.replace('.es.md', '.md');
  const hasEn = fs.existsSync(enFile);
  if (!hasEn) esOnly.push(base.replace(dir.replace(/\\/g, '/'), ''));
}

console.log('ES files without EN pair:', esOnly.length);

if (esOnly.length > 0) {
  console.log('\nES-only files:');
  esOnly.forEach(m => console.log('  ' + m));
  process.exit(1);
} else {
  console.log('\n✅ No orphan ES translations.');
  process.exit(0);
}
