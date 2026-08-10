import fs from 'fs';

const html = fs.readFileSync('dist/recipes/scheduled-jobs/index.html', 'utf8');
console.log('Total:', html.length, 'chars');

// Find main content boundaries
const mainStart = html.indexOf('<main');
const mainEnd = html.indexOf('</main>') + 7;
const main = html.slice(mainStart, mainEnd);
console.log('Main:', main.length, 'chars');

// Find article prose
const proseStart = html.indexOf('article-prose article-prose--main');
const proseEnd = html.indexOf('</article>') + 10;
const prose = html.slice(proseStart, proseEnd);
console.log('Article prose:', prose.length, 'chars');

// Count all H2 sections
const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
console.log('\nH2 sections:', h2s.length);

// Measure each section
for (let i = 0; i < h2s.length; i++) {
  const start = h2s[i].index;
  const end = i + 1 < h2s.length ? h2s[i + 1].index : html.length;
  const title = h2s[i][1].replace(/<[^>]+>/g, '').trim();
  const size = end - start;
  if (size > 500) console.log(`  ${size.toString().padStart(6)}  ${title}`);
}

// Count code blocks and their total size
const preBlocks = [...html.matchAll(/<pre[^>]*>[\s\S]*?<\/pre>/g)];
const codeTotal = preBlocks.reduce((a, m) => a + m[0].length, 0);
console.log('\nCode blocks:', preBlocks.length, 'total:', codeTotal, 'chars');

// Count JSON-LD blocks
const jsonldBlocks = [...html.matchAll(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g)];
const jsonldTotal = jsonldBlocks.reduce((a, m) => a + m[0].length, 0);
console.log('JSON-LD blocks:', jsonldBlocks.length, 'total:', jsonldTotal, 'chars');

// Count inline code
const inlineCode = [...html.matchAll(/<code>[\s\S]*?<\/code>/g)];
const inlineTotal = inlineCode.reduce((a, m) => a + m[0].length, 0);
console.log('Inline code:', inlineCode.length, 'total:', inlineTotal, 'chars');

// Count class attributes total size
const classAttrs = [...html.matchAll(/class="[^"]*"/g)];
const classTotal = classAttrs.reduce((a, m) => a + m[0].length, 0);
console.log('Class attrs:', classAttrs.length, 'total:', classTotal, 'chars');

// Count data attributes
const dataAttrs = [...html.matchAll(/data-[a-z]+="[^"]*"/g)];
const dataTotal = dataAttrs.reduce((a, m) => a + m[0].length, 0);
console.log('Data attrs:', dataAttrs.length, 'total:', dataTotal, 'chars');

// Check for repeated long class strings
const classFreq = {};
for (const m of classAttrs) {
  const c = m[0];
  classFreq[c] = (classFreq[c] || 0) + 1;
}
const sortedClasses = Object.entries(classFreq)
  .filter(([c, n]) => c.length > 20 && n > 1)
  .sort((a, b) => (b[1] * b[0].length) - (a[1] * a[0].length))
  .slice(0, 10);
console.log('\nTop repeated classes:');
for (const [c, n] of sortedClasses) {
  console.log(`  ${n}x ${c.length}ch = ${n * c.length}ch  ${c.slice(0, 80)}`);
}
