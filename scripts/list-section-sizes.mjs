import fs from 'fs';
import path from 'path';

const section = process.argv[2] || 'additional-frequently-asked-questions';
const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.html')) files.push(full);
  }
}
walk('dist');

const re = new RegExp(`<h2 id="${section.replace(/-/g, '\\-')}">`);
const sizes = [];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const m = html.match(re);
  if (m) {
    const start = m.index;
    const next = html.indexOf('<h2', start + 10);
    const size = (next === -1 ? html.length : next) - start;
    sizes.push({ file: f.replace(/^dist\\/, '').replace(/\\/g, '/'), size });
  }
}
sizes.sort((a, b) => b.size - a.size);
console.log('Count:', sizes.length, 'Average:', (sizes.reduce((a, s) => a + s.size, 0) / sizes.length / 1024).toFixed(1) + ' KB');
for (const s of sizes.slice(0, 10)) {
  console.log((s.size / 1024).toFixed(1) + ' KB', s.file);
}
