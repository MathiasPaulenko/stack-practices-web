import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.html')) files.push(full);
  }
}
walk('dist');

let totalCards = 0;
let count = 0;
let totalSize = 0;
let maxCards = 0;
let maxFile = '';
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const m = html.match(/<h2[^>]*\bid="related-heading"/);
  if (m) {
    const start = m.index;
    const next = html.indexOf('</section>', start);
    const section = html.slice(start, next === -1 ? html.length : next + 10);
    const cards = (section.match(/<a\s+href=/g) || []).length;
    totalCards += cards;
    totalSize += section.length;
    count++;
    if (cards > maxCards) {
      maxCards = cards;
      maxFile = f.replace(/^dist\\/, '').replace(/\\/g, '/');
    }
  }
}
console.log('Pages with related:', count);
console.log('Total related size:', (totalSize / 1024 / 1024).toFixed(2), 'MB');
console.log('Average cards:', count ? (totalCards / count).toFixed(1) : 'N/A');
console.log('Average size:', count ? (totalSize / count / 1024).toFixed(1) + ' KB' : 'N/A');
console.log('Max cards:', maxCards, 'in', maxFile);
