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

let max = 0;
let file = '';
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const re = new RegExp(`<h2 id="${section.replace(/-/g, '\\-')}">`);
  const m = html.match(re);
  if (m) {
    const start = m.index;
    const next = html.indexOf('<h2', start + 10);
    const size = (next === -1 ? html.length : next) - start;
    if (size > max) {
      max = size;
      file = f;
    }
  }
}
console.log('Largest', section, 'section:', (max / 1024).toFixed(1) + ' KB in', file.replace(/^dist\\/, '').replace(/\\/g, '/'));
