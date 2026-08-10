import fs from 'fs';

const html = fs.readFileSync('dist/recipes/index.html', 'utf8');
const classMatches = html.match(/class="[^"]+"/g) || [];
const freq = {};
for (const c of classMatches) {
  freq[c] = (freq[c] || 0) + 1;
}
const sorted = Object.entries(freq)
  .filter(([c]) => c.length > 30)
  .sort((a, b) => (b[1] * b[0].length) - (a[1] * a[0].length))
  .slice(0, 15);
console.log('Top repeated classes in recipe listing:');
for (const [c, n] of sorted) {
  console.log(`  ${n}x ${c.length}ch = ${n * c.length}ch  ${c.slice(0, 100)}`);
}
