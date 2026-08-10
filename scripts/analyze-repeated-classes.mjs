import fs from 'fs';

const html = fs.readFileSync('dist/recipes/scheduled-jobs/index.html', 'utf8');
const classMatches = html.match(/class="[^"]+"/g) || [];
const freq = {};
for (const c of classMatches) {
  freq[c] = (freq[c] || 0) + 1;
}
const sorted = Object.entries(freq)
  .sort((a, b) => (b[1] * b[0].length) - (a[1] * a[0].length))
  .slice(0, 25);
console.log('Top repeated class strings (freq × len = total chars):');
for (const [c, n] of sorted) {
  const total = n * c.length;
  console.log(`  ${n}x ${c.length}ch = ${total}ch  ${c.slice(0, 80)}`);
}
