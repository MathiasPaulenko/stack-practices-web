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

const sections = [
  { name: 'head', re: /^[\s\S]*?<\/head>/ },
  { name: 'header', re: /<header[\s\S]*?<\/header>/ },
  { name: 'footer', re: /<footer[\s\S]*?<\/footer>/ },
  { name: 'hero', re: /<section[^>]*class="[^"]*hero/ },
  { name: 'prose', re: /<div[^>]*class="[^"]*prose[^"]*"[\s\S]*?<!-- Main content -->|<section class="bg-white">[\s\S]*?<!-- Related resources -->/ },
  { name: 'after_body', re: /<\/footer>[\s\S]*$/ },
];

const totals = {};
for (const s of sections) totals[s.name] = { total: 0, count: 0 };
let total = 0;

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  total += html.length;
  for (const s of sections) {
    const m = html.match(s.re);
    if (m) {
      totals[s.name].total += m[0].length;
      totals[s.name].count++;
    }
  }
}

console.log('Total HTML:', (total / 1024 / 1024).toFixed(2), 'MB');
for (const [name, { total, count }] of Object.entries(totals)) {
  if (count === 0) continue;
  console.log(name, ':', (total / 1024 / 1024).toFixed(2), 'MB avg', (total / count / 1024).toFixed(1), 'KB count', count);
}
