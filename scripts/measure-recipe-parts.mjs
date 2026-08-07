import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('index.html')) files.push(full);
  }
}
walk('dist/recipes');

const patterns = [
  { name: 'recipe_header', re: /<header class="border-b border-slate-200 bg-slate-50">[\s\S]*?<\/header>/ },
  { name: 'breadcrumb', re: /<nav aria-label="Breadcrumb"[\s\S]*?<\/nav>/ },
  { name: 'difficulty_badge', re: /<span class="inline-flex items-center gap-1\.5 rounded-full[\s\S]*?<\/span>/ },
  { name: 'author_line', re: /<a\s+href="[^"]*\/authors\/"[\s\S]*?<\/a>/ },
  { name: 'tags_pills', re: /<div class="mt-4 flex flex-wrap gap-2">[\s\S]*?<\/div>/ },
  { name: 'topics_line', re: /<div class="mt-3 flex flex-wrap items-center gap-2 text-xs">[\s\S]*?<\/div>/ },
  { name: 'toc', re: /<nav id="toc-nav"[\s\S]*?<\/nav>/ },
  { name: 'locale_note', re: /<section class="bg-white">[\s\S]*?<\/section>/ },
  { name: 'prose', re: /<!-- Main content --> <section class="bg-white">[\s\S]*?<!-- Related resources -->/ },
];

const totals = {};
for (const p of patterns) totals[p.name] = { total: 0, count: 0 };

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  for (const p of patterns) {
    const m = html.match(p.re);
    if (m) {
      totals[p.name].total += m[0].length;
      totals[p.name].count++;
    }
  }
}

let total = 0;
for (const f of files) total += fs.statSync(f).size;
console.log('Total recipes:', (total / 1024 / 1024).toFixed(2), 'MB count', files.length);
for (const [k, { total, count }] of Object.entries(totals).sort((a, b) => b[1].total - a[1].total)) {
  if (count === 0) continue;
  console.log(k, ':', (total / 1024 / 1024).toFixed(2), 'MB avg', (total / count / 1024).toFixed(1), 'KB count', count);
}
